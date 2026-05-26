from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, FileResponse
from pathlib import Path
import hashlib
import mimetypes
from urllib.parse import urlparse
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import requests
import urllib3

# Suppress InsecureRequestWarning when verify=False is used
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from services.supabase_service import seed_products, get_products, get_product_by_id, clean_amazon_image_url
from services.external_api_service import fetch_products_rapidapi, fetch_products_from_all_sources, has_external_sources
from config import USE_EXTERNAL_ONLY

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=2)


def _map_product_image(item):
    if isinstance(item, dict):
        # Extract the image URL safely
        img_url = item.get("image_url") or item.get("image") or ""
        if img_url:
            cleaned = clean_amazon_image_url(img_url)
            item["image"] = cleaned
            item["image_url"] = cleaned
    return item


@router.get("/image-proxy")
def image_proxy(url: str = Query(...)):
    # Simple disk cache for proxied images.
    # Cache key: SHA256(url). Files are stored under backend/static/image_cache.
    try:
        # Debug info about external-only mode
        try:
            print(f"USE_EXTERNAL_ONLY={USE_EXTERNAL_ONLY}, has_external_sources={has_external_sources()}")
        except Exception:
            pass
        CACHE_DIR = Path(__file__).resolve().parent.parent / "static" / "image_cache"
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        # Hash the URL to produce a safe filename
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()

        # Try to preserve extension from URL or content-type
        parsed = urlparse(url)
        url_path = Path(parsed.path)
        ext = url_path.suffix or ""
        if not ext:
            # fallback mapping
            guessed, _ = mimetypes.guess_type(url)
            if guessed and "/" in guessed:
                ext = "." + guessed.split("/")[-1]

        cache_path = CACHE_DIR / f"{key}{ext}"

        # If cached file exists, serve it immediately
        if cache_path.exists():
            return FileResponse(path=str(cache_path), media_type=mimetypes.guess_type(str(cache_path))[0] or "image/jpeg")

        # Fetch upstream and save to cache
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=20, stream=True, verify=False)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "image/jpeg")
        if not content_type.startswith("image"):
            # Not an image; return 502
            raise HTTPException(status_code=502, detail=f"Upstream did not return an image: {content_type}")

        # Determine extension from content-type if missing
        if not ext:
            main_type = content_type.split("/")[-1].split(";")[0]
            ext = f".{main_type}" if main_type else ""
            cache_path = CACHE_DIR / f"{key}{ext}"

        tmp_path = cache_path.with_suffix(cache_path.suffix + ".tmp")
        with tmp_path.open("wb") as fh:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    fh.write(chunk)

        # Move temp file to final cache file
        tmp_path.replace(cache_path)

        return FileResponse(path=str(cache_path), media_type=content_type)

    except Exception as err:
        # If upstream failed but we have a stale cached file, serve it
        try:
            if 'cache_path' in locals() and cache_path.exists():
                return FileResponse(path=str(cache_path), media_type=mimetypes.guess_type(str(cache_path))[0] or "image/jpeg")
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Failed to proxy image: {err}")


def _normalize(value):
    return str(value or "").strip().lower()


def _matches_query(item, query: Optional[str]) -> bool:
    if not query:
        return True
    q = _normalize(query)
    text_fields = [
        item.get("title"),
        item.get("name"),
        item.get("description"),
        item.get("category"),
        item.get("subcategory"),
        item.get("gender"),
    ]
    haystack = " ".join(_normalize(field) for field in text_fields)
    return q in haystack


def _matches_filters(item, search: Optional[str], category: Optional[str], gender: Optional[str], subcategory: Optional[str]) -> bool:
    if not _matches_query(item, search):
        return False

    item_gender = _normalize(item.get("gender"))
    item_category = _normalize(item.get("category"))
    item_subcategory = _normalize(item.get("subcategory"))

    if gender and item_gender and item_gender != _normalize(gender):
        return False

    if category and item_category and item_category != _normalize(category):
        return False

    if subcategory:
        sub = _normalize(subcategory)
        if item_category and item_category != sub and item_subcategory != sub:
            return False

    return True


@router.get("/products")
async def products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    try:
        # If configured, bypass local database and use external API products only.
        if USE_EXTERNAL_ONLY and has_external_sources():
            try:
                external_items = fetch_products_from_all_sources(
                    search=search,
                    category=category,
                    gender=gender,
                    limit=limit,
                )

                # Ensure image mapping is applied to external items
                external_items = [
                    _map_product_image(item) for item in external_items if isinstance(item, dict)
                ]

                # If the aggregated external sources returned nothing, try the RapidAPI search endpoint as a fallback.
                if not external_items:
                    try:
                        def fetch_rapid():
                            return fetch_products_rapidapi(search or "fashion")

                        rapid_products = await asyncio.get_event_loop().run_in_executor(executor, fetch_rapid)
                        external_items = [
                            _map_product_image(item) for item in (rapid_products or []) if isinstance(item, dict)
                        ]
                    except Exception:
                        external_items = []

                filtered_external = [
                    item for item in external_items if _matches_filters(item, search, category, gender, subcategory)
                ]

                return {"products": filtered_external[:limit]}
            except Exception as e:
                print("External-only fetch error:", e)
                return {"products": []}

        # ✅ Get DB products from Supabase
        db_response = get_products(
            search=search,
            category=category,
            gender=gender,
            subcategory=subcategory,
            limit=limit
        )

        # Extract list safely
        if isinstance(db_response, dict):
            db_products = db_response.get("products", [])
        else:
            db_products = db_response if isinstance(db_response, list) else []

        db_products = [_map_product_image(item) for item in db_products if isinstance(item, dict)]

        print("Supabase products count:", len(db_products))

        # Only blend RapidAPI for general search pages when search is active.
        # For structured filters (gender/category/subcategory), keep results strict to DB.
        should_fetch_rapid = bool(search) and not any([category, gender, subcategory])

        rapid_products = []
        if should_fetch_rapid:
            try:
                def fetch_rapid():
                    return fetch_products_rapidapi(search or "fashion")

                rapid_products = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(executor, fetch_rapid),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                print("RapidAPI timeout - using only Supabase products")
            except Exception as e:
                print("RapidAPI error:", e)

        print("Rapid products count:", len(rapid_products) if rapid_products else 0)

        filtered_rapid = [
            item for item in (rapid_products or [])
            if isinstance(item, dict) and _matches_filters(item, search, category, gender, subcategory)
        ]

        # Merge, de-duplicate by id/title, and respect requested limit.
        seen = set()
        all_products = []
        for item in db_products + filtered_rapid:
            key = _normalize(item.get("id")) or _normalize(item.get("title"))
            if key in seen:
                continue
            seen.add(key)
            all_products.append(item)
            if len(all_products) >= limit:
                break

        return {"products": all_products}

    except Exception as err:
        print("Error in products endpoint:", err)
        return {"products": []}


@router.get("/products/{product_id}")
async def product_detail(product_id: str):
    try:
        product = get_product_by_id(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return _map_product_image(product)
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/products/seed")
async def products_seed():
    try:
        result = seed_products()
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
