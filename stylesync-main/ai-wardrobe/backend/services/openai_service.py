"""OpenAI/Gemini recommendation service for StyleSync.
"""

import json
import logging
import random
from typing import Any, Dict, List, Optional

import requests
from config import OPENAI_API_KEY, GEMINI_API_KEY
from services.recommendation_service import get_complementary_categories
from services.supabase_service import get_products
from services.external_api_service import fetch_products_rapidapi

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    OPENAI_CLIENT = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    OPENAI_CLIENT = None


def _build_openai_prompt(
    wardrobe: List[Dict[str, Any]],
    query: str,
    occasion: Optional[str] = None,
    gender: Optional[str] = None,
    style: Optional[str] = None,
    weather: Optional[str] = None,
    product_metadata: Optional[Dict[str, Any]] = None,
    ai_candidates: Optional[List[Dict[str, Any]]] = None,
) -> str:
    wardrobe_lines = []
    for item in wardrobe:
        name = item.get("name") or item.get("title") or "unknown item"
        category = item.get("category") or item.get("subcategory") or "unknown category"
        color = item.get("primary_color") or item.get("color") or "unknown color"
        tags = item.get("tags") or item.get("detected_tags") or []
        tags_text = ", ".join(tags) if tags else ""
        wardrobe_lines.append(f"- {name} ({category}, {color}{f', tags: {tags_text}' if tags_text else ''})")

    metadata_lines = []
    if product_metadata:
        for key, value in product_metadata.items():
            metadata_lines.append(f"- {key}: {value}")

    prompt_parts = [
        "You are a professional fashion stylist assistant.",
        "Based on the user's wardrobe, suggest how they can pair their existing wardrobe items with the item or category they are searching for.",
        "To keep styling advice fresh and diverse, pick a distinct styling theme (e.g. streetwear, chic, minimalist, bold contrast, bohemian, or elegant) based on the occasion and season, and write a unique recommendation. Avoid generic or repetitive phrasing.",
        "",
        "You must return your output in JSON format only with the following keys:",
        "  - score: a compatibility score from 1 to 100",
        "  - recommendation: a detailed and user-friendly explanation of why this pairing works and styling advice.",
        "  - pairings: list of names of wardrobe items that you selected from the user's wardrobe list to pair with this query.",
        "  - products: list of JSON objects of products you selected from the 'Available products to shop' list. Each object must have fields 'id', 'title', 'score' (relevance score 1-100), and 'reason' (brief sentence on why this product fits). Only select up to 4 products that are the best match.",
        "",
        "Do not write markdown formatting in your response (no ```json code blocks), just return the raw JSON object.",
        "",
        "User wardrobe:",
    ]

    if wardrobe_lines:
        prompt_parts.extend(wardrobe_lines)
    else:
        prompt_parts.append("- No wardrobe items provided.")

    if ai_candidates:
        prompt_parts.append("")
        prompt_parts.append("Available products to shop:")
        for prod in ai_candidates:
            p_id = prod.get("id")
            p_title = prod.get("title") or prod.get("name") or "Product"
            p_cat = prod.get("category") or "clothing"
            p_price = prod.get("price") or 0.0
            p_desc = prod.get("description") or ""
            p_desc_short = p_desc[:100] + "..." if len(p_desc) > 100 else p_desc
            prompt_parts.append(f"- ID: {p_id} | Title: {p_title} | Category: {p_cat} | Price: ${p_price} | Info: {p_desc_short}")

    prompt_parts.append("")
    prompt_parts.append(f"User is searching for: {query}")
    if occasion:
        prompt_parts.append(f"Occasion: {occasion}")
    if gender:
        prompt_parts.append(f"Gender: {gender}")
    if style:
        prompt_parts.append(f"Style: {style}")
    if weather:
        prompt_parts.append(f"Weather: {weather}")
    if metadata_lines:
        prompt_parts.append("")
        prompt_parts.append("Product metadata:")
        prompt_parts.extend(metadata_lines)

    return "\n".join(prompt_parts)


def get_local_recommendation_fallback(
    wardrobe: List[Dict[str, Any]],
    query: str,
    occasion: Optional[str] = None,
    gender: Optional[str] = None,
    style: Optional[str] = None,
    weather: Optional[str] = None,
    product_metadata: Optional[Dict[str, Any]] = None,
    ai_candidates: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    # A simple but smart local rule-based stylist
    category = (product_metadata or {}).get("category") or ""
    if not category and wardrobe:
        # Try to infer category from query matching wardrobe item name
        for item in wardrobe:
            if item.get("name", "").lower() in query.lower():
                category = item.get("category")
                break
    
    # Defaults
    if not category:
        category = "topwear"
        
    occasion = occasion or "casual"
    
    # Select complementary items from user wardrobe
    comp_cats = get_complementary_categories(category)
    pairings = []
    for item in wardrobe:
        item_cat = item.get("category") or ""
        if item_cat in comp_cats and item.get("name") not in pairings:
            pairings.append(item.get("name"))
            if len(pairings) >= 3:
                break
                
    # Generate styling advice text
    if category == "topwear":
        advice = f"Pair this stylish topwear with comfortable bottomwear like dark denim or tailored trousers. For a {occasion} look, style it with minimal accessories and clean footwear. The primary colors sync nicely, creating a balanced and cohesive outfit."
    elif category == "bottomwear":
        advice = f"This bottomwear serves as a versatile foundation. Try styling it with a contrasting topwear. For a {occasion} vibe, layer with a jacket and complete the look with classic footwear."
    elif category == "footwear":
        advice = f"Your footwear anchors the entire outfit. Pair these shoes with well-fitted bottomwear and a complementary top. Perfect for {occasion} settings."
    elif category == "ethnic":
        advice = f"This elegant ethnic piece stands out beautifully. Complement it with traditional or contemporary footwear and subtle accessories to keep the focus on the main garment."
    else:
        advice = f"Complete your outfit by pairing this accessory. It adds a touch of personality and helps elevate a simple {occasion} ensemble."
        
    if pairings:
        advice += f" Specifically, try pairing it with items from your wardrobe like {', '.join(pairings[:-1]) + ' or ' + pairings[-1] if len(pairings) > 1 else pairings[0]}."
    else:
        advice += " Add complementary categories like bottomwear or footwear to your wardrobe to get automated pairing recommendations!"

    candidates = ai_candidates or []
    enriched_products = []
    for i, prod in enumerate(candidates[:4]):
        merged = dict(prod)
        merged["match_score"] = 90 - i * 5
        merged["ai_reason"] = f"Highly recommended option to complete your {occasion} look."
        enriched_products.append(merged)

    parsed = {
        "score": 85,
        "recommendation": advice,
        "pairings": pairings,
        "products": enriched_products
    }

    return {
        "model": "local-rules-engine",
        "recommendation": advice,
        "parsed_recommendation": parsed,
        "request": {
            "wardrobe": wardrobe,
            "query": query,
            "occasion": occasion,
            "gender": gender,
            "style": style,
            "weather": weather,
            "product_metadata": product_metadata,
        },
    }


def get_gemini_recommendation(
    wardrobe: List[Dict[str, Any]],
    query: str,
    occasion: Optional[str] = None,
    gender: Optional[str] = None,
    style: Optional[str] = None,
    weather: Optional[str] = None,
    product_metadata: Optional[Dict[str, Any]] = None,
    limit: int = 6,
    ai_candidates: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    prompt = _build_openai_prompt(
        wardrobe=wardrobe,
        query=query,
        occasion=occasion,
        gender=gender,
        style=style,
        weather=weather,
        product_metadata=product_metadata,
        ai_candidates=ai_candidates,
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.85,
            "maxOutputTokens": 1000
        }
    }

    response = requests.post(url, headers=headers, json=payload, timeout=20)
    response.raise_for_status()
    resp_json = response.json()
    
    try:
        content = resp_json["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise ValueError(f"Failed to parse Gemini response: {resp_json}") from e

    content_clean = content.strip()
    if content_clean.startswith("```"):
        lines = content_clean.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content_clean = "\n".join(lines).strip()

    parsed = json.loads(content_clean)
    
    # Enrich the returned products with full database metadata
    if parsed.get("products") and ai_candidates:
        candidates_by_id = {str(prod.get("id")): prod for prod in ai_candidates}
        enriched_products = []
        for p_item in parsed["products"]:
            p_id = str(p_item.get("id"))
            orig_prod = candidates_by_id.get(p_id)
            if orig_prod:
                merged = dict(orig_prod)
                merged["match_score"] = p_item.get("score", 85)
                merged["ai_reason"] = p_item.get("reason", "")
                enriched_products.append(merged)
        parsed["products"] = enriched_products

    return {
        "model": "gemini-1.5-flash",
        "recommendation": parsed.get("recommendation", content),
        "parsed_recommendation": parsed,
        "request": {
            "wardrobe": wardrobe,
            "query": query,
            "occasion": occasion,
            "gender": gender,
            "style": style,
            "weather": weather,
            "product_metadata": product_metadata,
            "limit": limit,
        },
    }


def get_outfit_recommendation(
    wardrobe: List[Dict[str, Any]],
    query: str,
    occasion: Optional[str] = None,
    gender: Optional[str] = None,
    style: Optional[str] = None,
    weather: Optional[str] = None,
    product_metadata: Optional[Dict[str, Any]] = None,
    limit: int = 6,
) -> Dict[str, Any]:
    # 1. Identify selected wardrobe item and category
    selected_item = None
    if wardrobe:
        for item in wardrobe:
            if item.get("name", "").lower() in query.lower():
                selected_item = item
                break
        if not selected_item:
            selected_item = wardrobe[0]
            
    selected_category = selected_item.get("category") if selected_item else "topwear"
    comp_cats = get_complementary_categories(selected_category)
    
    # 2. Fetch candidate products of complementary categories
    candidate_products = []
    if comp_cats:
        for comp_cat in comp_cats:
            prods = get_products(category=comp_cat, gender=gender, limit=12) or []
            candidate_products.extend(prods)
    else:
        candidate_products = get_products(category=selected_category, gender=gender, limit=24) or []
        
    # Fallback to general products if catalog is small
    if len(candidate_products) < 6:
        candidate_products.extend(get_products(limit=30) or [])
        
    # RapidAPI fetch if configured
    try:
        rapid_items = fetch_products_rapidapi(occasion or "fashion")
        if rapid_items:
            candidate_products.extend(rapid_items)
    except Exception:
        pass

    # 3. Shuffle pool and deduplicate to ensure variety and keep answers fresh
    random.shuffle(candidate_products)
    seen_ids = set()
    deduped_candidates = []
    for prod in candidate_products:
        p_id = str(prod.get("id"))
        if p_id and p_id not in seen_ids:
            seen_ids.add(p_id)
            deduped_candidates.append(prod)
            
    ai_candidates = deduped_candidates[:12]

    # 4. Attempt Gemini
    if GEMINI_API_KEY:
        try:
            logger.info("Attempting Gemini API for outfit recommendation...")
            return get_gemini_recommendation(
                wardrobe=wardrobe,
                query=query,
                occasion=occasion,
                gender=gender,
                style=style,
                weather=weather,
                product_metadata=product_metadata,
                limit=limit,
                ai_candidates=ai_candidates,
            )
        except Exception as e:
            logger.error("Gemini recommendation failed: %s. Falling back to OpenAI...", e)

    # 5. Fallback/Primary to OpenAI
    if not OPENAI_API_KEY or OPENAI_CLIENT is None:
        logger.warning("OpenAI API key missing or client uninitialized. Using local stylist fallback.")
        return get_local_recommendation_fallback(
            wardrobe=wardrobe,
            query=query,
            occasion=occasion,
            gender=gender,
            style=style,
            weather=weather,
            product_metadata=product_metadata,
            ai_candidates=ai_candidates,
        )

    prompt = _build_openai_prompt(
        wardrobe=wardrobe,
        query=query,
        occasion=occasion,
        gender=gender,
        style=style,
        weather=weather,
        product_metadata=product_metadata,
        ai_candidates=ai_candidates,
    )

    messages = [
        {"role": "system", "content": "You are a helpful fashion stylist assistant."},
        {"role": "user", "content": prompt},
    ]

    try:
        response = OPENAI_CLIENT.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.85,
            max_tokens=1000,
        )
        content = response.choices[0].message.content
    except Exception as err:
        logger.warning("OpenAI chat completion failed, trying fallback conversation API: %s", err)
        try:
            import openai as openai_fallback

            openai_fallback.api_key = OPENAI_API_KEY
            response = openai_fallback.ChatCompletion.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.85,
                max_tokens=1000,
            )
            content = response.choices[0].message.content
        except Exception as err2:
            logger.error("OpenAI service completely unavailable, using local stylist fallback. Error: %s", err2)
            return get_local_recommendation_fallback(
                wardrobe=wardrobe,
                query=query,
                occasion=occasion,
                gender=gender,
                style=style,
                weather=weather,
                product_metadata=product_metadata,
                ai_candidates=ai_candidates,
            )

    # Strip markdown block ticks if present
    content_clean = content.strip()
    if content_clean.startswith("```"):
        lines = content_clean.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content_clean = "\n".join(lines).strip()

    parsed: Optional[Dict[str, Any]] = None
    try:
        parsed = json.loads(content_clean)
        
        # Enrich LLM-selected products
        if parsed.get("products") and ai_candidates:
            candidates_by_id = {str(prod.get("id")): prod for prod in ai_candidates}
            enriched_products = []
            for p_item in parsed["products"]:
                p_id = str(p_item.get("id"))
                orig_prod = candidates_by_id.get(p_id)
                if orig_prod:
                    merged = dict(orig_prod)
                    merged["match_score"] = p_item.get("score", 85)
                    merged["ai_reason"] = p_item.get("reason", "")
                    enriched_products.append(merged)
            parsed["products"] = enriched_products
            
    except Exception as parse_err:
        logger.error("Failed to parse LLM JSON response: %s", parse_err)
        # Fallback dictionary if not parsable
        parsed = {
            "score": 85,
            "recommendation": content,
            "pairings": [],
            "products": []
        }

    return {
        "model": "gpt-4o-mini",
        "recommendation": parsed.get("recommendation", content),
        "parsed_recommendation": parsed,
        "request": {
            "wardrobe": wardrobe,
            "query": query,
            "occasion": occasion,
            "gender": gender,
            "style": style,
            "weather": weather,
            "product_metadata": product_metadata,
            "limit": limit,
        },
    }
