import base64
import re
import requests
from typing import Dict, List, Optional

from config import (
    RAPID_API_KEY,
    EXTERNAL_API_BASE_URL,
    API_BASE64_HEADER,
    API_CLIENT_ID,
    API_CLIENT_SECRET
)

# def fetch_products_rapidapi(search="fashion"):
#     url = f"{EXTERNAL_API_BASE_URL}/search"

#     headers = {
#         "X-RapidAPI-Key": RAPID_API_KEY,
#         "X-RapidAPI-Host": "real-time-product-search.p.rapidapi.com"
#     }

#     params = {
#         "q": search,
#         "country": "us",
#         "language": "en"
#     }

#     try:
#         response = requests.get(url, headers=headers, params=params, timeout=10)
#         response.raise_for_status()
#         data = response.json()
#         print("RAW API RESPONSE:", data)
#     except Exception as e:
#         print("RapidAPI error:", e)   # 👈 see error in terminal
#         return []                     # 👈 don't block your API

#     products = []
#     for item in data.get("data", []):
#         products.append({
#             "id": item.get("product_id"),
#             "name": item.get("product_title"),
#             "price": item.get("product_price"),
#             "image": item.get("product_photo"),
#             "url": item.get("product_url"),
#             "source": "rapidapi"
#         })

#     return products
def fetch_products_rapidapi(search="fashion"):
    url = f"{EXTERNAL_API_BASE_URL}/search-v2"

    headers = {
        "X-RapidAPI-Key": RAPID_API_KEY,
        "X-RapidAPI-Host": "real-time-product-search.p.rapidapi.com"
    }

    params = {
        "q": search or "shoes",
        "country": "us",
        "language": "en",
        "limit": "20"
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=20)
        response.raise_for_status()

        print("STATUS:", response.status_code)
        print("RAW TEXT:", response.text[:300])

        data = response.json()

    except Exception as e:
        print("RapidAPI error:", e)
        return []

    items = data.get("data", {}).get("products", [])

    products = []

    for item in items:
        if not isinstance(item, dict):
            continue

        offer = item.get("offer") if isinstance(item.get("offer"), dict) else {}
        photos = item.get("product_photos") if isinstance(item.get("product_photos"), list) else []

        # Image handling with fallback
        image = None
        if photos:
            first_photo = photos[0]
            if isinstance(first_photo, str):
                image = first_photo
            elif isinstance(first_photo, dict):
                image = first_photo.get("url") or first_photo.get("src") or first_photo.get("image")
        
        # Add placeholder if no image
        if not image:
            image = f"https://via.placeholder.com/400x500?text={search or 'Product'}"

        raw_price = offer.get("price") or item.get("product_price")
        if isinstance(raw_price, str):
            match = re.search(r"\d+(?:\.\d+)?", raw_price.replace(",", ""))
            price = float(match.group(0)) if match else 0
        elif isinstance(raw_price, (int, float)):
            price = raw_price
        else:
            price = 0

        raw_rating = item.get("product_rating") or offer.get("store_rating")
        if isinstance(raw_rating, str):
            match = re.search(r"\d+(?:\.\d+)?", raw_rating)
            rating = float(match.group(0)) if match else 4.0
        elif isinstance(raw_rating, (int, float)):
            rating = raw_rating
        else:
            rating = 4.0

        reviews = item.get("product_num_reviews") or offer.get("store_review_count") or 0

        # Generate shopping URLs
        product_page_url = item.get("product_page_url") or offer.get("offer_page_url")
        store_name = offer.get("store_name") or item.get("product_store") or "Online"
        
        # Create affiliate-style URL if direct URL not available
        if not product_page_url:
            product_title = item.get("product_title") or "product"
            # Generate search URL for the product on popular stores
            product_page_url = f"https://www.google.com/search?q={product_title.replace(' ', '+')}+buy"

        products.append({
            "id": item.get("product_id") or offer.get("offer_id") or item.get("product_page_url"),
            "name": item.get("product_title") or offer.get("offer_title") or "Unnamed product",
            "title": item.get("product_title") or offer.get("offer_title") or "Unnamed product",
            "product_name": item.get("product_title") or offer.get("offer_title") or "Unnamed product",
            "price": price or 0,
            "image": image,
            "image_url": image,
            "url": product_page_url,
            "affiliate_link": product_page_url,
            "brand": store_name,
            "platform": store_name,
            "rating": rating,
            "reviews": reviews,
            "badge": offer.get("offer_badge"),
            "description": item.get("product_description") or item.get("product_title") or "",
            "source": "rapidapi",
            "colors": _extract_colors_from_title(item.get("product_title", "")),
        })

    return products


def _extract_colors_from_title(title: str) -> List[str]:
    """Extract color names from product title."""
    common_colors = {
        "black": "#000000",
        "white": "#FFFFFF",
        "red": "#FF0000",
        "blue": "#0000FF",
        "green": "#008000",
        "yellow": "#FFFF00",
        "pink": "#FFC0CB",
        "purple": "#800080",
        "orange": "#FFA500",
        "brown": "#A52A2A",
        "gray": "#808080",
        "grey": "#808080",
        "navy": "#000080",
        "gold": "#FFD700",
        "silver": "#C0C0C0",
    }
    
    colors = []
    title_lower = title.lower()
    
    for color_name, color_hex in common_colors.items():
        if color_name in title_lower:
            colors.append(color_hex)
    
    # Default colors if none found
    if not colors:
        colors = ["#000000", "#FFFFFF", "#C0C0C0"]
    
    return colors[:3]  # Limit to 3 colors

def _get_auth_headers() -> Dict[str, str]:
    headers: Dict[str, str] = {}
    if API_BASE64_HEADER:
        headers["Authorization"] = f"Basic {API_BASE64_HEADER}"
    elif API_CLIENT_ID and API_CLIENT_SECRET:
        encoded = base64.b64encode(f"{API_CLIENT_ID}:{API_CLIENT_SECRET}".encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"
    return headers


def _all_base_urls() -> List[str]:
    if EXTERNAL_API_BASE_URL:
        return [EXTERNAL_API_BASE_URL]
    return []


def _build_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def has_external_sources() -> bool:
    return len(_all_base_urls()) > 0


def fetch_products(search: Optional[str] = None, category: Optional[str] = None, gender: Optional[str] = None, limit: int = 20):
    base_urls = _all_base_urls()
    if not base_urls:
        raise ValueError("No external API base URLs are configured")

    params = {}
    if search:
        params["search"] = search
    if category:
        params["category"] = category
    if gender:
        params["gender"] = gender
    if limit:
        params["limit"] = limit

    last_error = None
    for base_url in base_urls:
        url = _build_url(base_url, "products")
        try:
            response = requests.get(url, headers=_get_auth_headers(), params=params, timeout=20)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                payload.setdefault("source", base_url)
            return payload
        except Exception as err:
            last_error = err

    if last_error:
        raise last_error

    raise ValueError("Unable to fetch products from external sources")


def fetch_products_from_all_sources(
    search: Optional[str] = None,
    category: Optional[str] = None,
    gender: Optional[str] = None,
    limit: int = 20,
):
    base_urls = _all_base_urls()
    if not base_urls:
        return []

    params = {}
    if search:
        params["search"] = search
    if category:
        params["category"] = category
    if gender:
        params["gender"] = gender
    if limit:
        params["limit"] = limit

    aggregated = []
    for base_url in base_urls:
        url = _build_url(base_url, "products")
        try:
            response = requests.get(url, headers=_get_auth_headers(), params=params, timeout=20)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                source_items = payload
            elif isinstance(payload, dict):
                source_items = (
                    payload.get("items")
                    or payload.get("data")
                    or payload.get("results")
                    or payload.get("products")
                    or []
                )
            else:
                source_items = []

            for item in source_items:
                if isinstance(item, dict):
                    tagged_item = dict(item)
                    tagged_item.setdefault("source", base_url)
                    aggregated.append(tagged_item)
        except Exception:
            continue

    return aggregated[:limit]


def fetch_product_by_id(product_id: str):
    base_urls = _all_base_urls()
    if not base_urls:
        raise ValueError("No external API base URLs are configured")

    last_error = None
    for base_url in base_urls:
        url = _build_url(base_url, f"products/{product_id}")
        try:
            response = requests.get(url, headers=_get_auth_headers(), timeout=20)
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                payload.setdefault("source", base_url)
            return payload
        except Exception as err:
            last_error = err

    if last_error:
        raise last_error

    raise ValueError("Unable to fetch product from external sources")
