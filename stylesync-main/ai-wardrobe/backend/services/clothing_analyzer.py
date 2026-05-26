import base64
import logging
import requests
import json
from pathlib import Path
from config import OPENAI_API_KEY, GEMINI_API_KEY

logger = logging.getLogger(__name__)

def _encode_image_to_base64(image_source):
    """Convert image URL or file to base64."""
    if isinstance(image_source, str) and image_source.startswith(('http://', 'https://')):
        # Download from URL
        response = requests.get(image_source, timeout=10)
        response.raise_for_status()
        image_data = response.content
    else:
        # Read from file path or file object
        if hasattr(image_source, 'read'):
            image_data = image_source.read()
        else:
            with open(image_source, 'rb') as f:
                image_data = f.read()
    
    return base64.standard_b64encode(image_data).decode('utf-8')


def _safe_fallback_analysis(reason: str = None):
    if reason:
        logger.warning("Falling back to heuristic clothing analysis: %s", reason)
    return _get_fallback_analysis()


def analyze_clothing_with_gpt(image_url=None, image_file=None):
    """Use OpenAI Vision to analyze clothing images."""
    if not OPENAI_API_KEY:
        return _safe_fallback_analysis("OPENAI_API_KEY not set")
    
    try:
        # Encode image to base64
        if image_file:
            image_base64 = _encode_image_to_base64(image_file)
            media_type = "image/png"  # Assume PNG from upload
        elif image_url:
            image_base64 = _encode_image_to_base64(image_url)
            # Detect media type from URL
            if image_url.lower().endswith('.jpg') or image_url.lower().endswith('.jpeg'):
                media_type = "image/jpeg"
            elif image_url.lower().endswith('.png'):
                media_type = "image/png"
            elif image_url.lower().endswith('.webp'):
                media_type = "image/webp"
            elif image_url.lower().endswith('.gif'):
                media_type = "image/gif"
            else:
                media_type = "image/jpeg"  # Default
        else:
            return _get_fallback_analysis()
        
        # Call OpenAI Vision API
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4-turbo",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{media_type};base64,{image_base64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": """Analyze this clothing item and return a JSON object with exactly these fields:
{
    "category": "category_name",
    "colors": ["color1", "color2"],
    "primary_color": "dominant_color",
    "occasion": ["occasion1", "occasion2"],
    "season": ["season1"],
    "tags": ["tag1", "tag2", "tag3"],
    "style": "style_description",
    "brand_hint": "brand_if_visible_or_null",
    "description": "brief_description"
}

Categories: tops, shirts, t-shirts, dresses, pants, jeans, skirts, jackets, coats, hoodies, sweaters, blazers, suits, shoes, boots, sandals, accessories
Occasions: casual, formal, business, party, evening, sports, outdoor, beach, gym, everyday
Seasons: summer, winter, spring, autumn, all-season

Return only valid JSON, no other text."""
                            }
                        ]
                    }
                ],
                "max_tokens": 500
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return _safe_fallback_analysis(f"OpenAI Vision API error {response.status_code}")
        
        response_data = response.json()
        
        # Extract JSON from response
        content = response_data['choices'][0]['message']['content']
        
        # Parse JSON from response
        try:
            # Try to find JSON in the response
            if '{' in content and '}' in content:
                json_str = content[content.find('{'):content.rfind('}')+1]
                result = json.loads(json_str)
            else:
                result = json.loads(content)
        except json.JSONDecodeError:
            return _safe_fallback_analysis("Could not parse OpenAI JSON response")
        
        # Validate and normalize response
        return {
            "category": result.get("category", "clothing").lower(),
            "colors": result.get("colors", ["unknown"]),
            "primary_color": result.get("primary_color", result.get("colors", ["gray"])[0]).lower(),
            "occasion": result.get("occasion", ["casual"]),
            "season": result.get("season", ["all-season"]),
            "tags": result.get("tags", []),
            "style": result.get("style", ""),
            "brand_hint": result.get("brand_hint"),
            "description": result.get("description", ""),
            "analysis_method": "gpt-4-vision"
        }
        
    except Exception as e:
        return _safe_fallback_analysis(str(e))


def _get_fallback_analysis():
    """Return fallback analysis when GPT is not available."""
    return {
        "category": "clothing",
        "colors": ["unknown"],
        "primary_color": "gray",
        "occasion": ["casual"],
        "season": ["all-season"],
        "tags": ["clothing"],
        "style": "casual",
        "brand_hint": None,
        "description": "Clothing item",
        "analysis_method": "fallback"
    }


def analyze_clothing_with_gemini(image_base64: str, media_type: str):
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not set")

    prompt = """Analyze this clothing item and return a JSON object with exactly these fields:
{
    "category": "category_name",
    "colors": ["color1", "color2"],
    "primary_color": "dominant_color",
    "occasion": ["occasion1", "occasion2"],
    "season": ["season1"],
    "tags": ["tag1", "tag2", "tag3"],
    "style": "style_description",
    "brand_hint": "brand_if_visible_or_null",
    "description": "brief_description"
}

Categories: tops, shirts, t-shirts, dresses, pants, jeans, skirts, jackets, coats, hoodies, sweaters, blazers, suits, shoes, boots, sandals, accessories
Occasions: casual, formal, business, party, evening, sports, outdoor, beach, gym, everyday
Seasons: summer, winter, spring, autumn, all-season

Return only valid JSON, no other text."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": media_type,
                            "data": image_base64
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4,
            "maxOutputTokens": 500
        }
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)
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

    result = json.loads(content_clean)
    return {
        "category": result.get("category", "clothing").lower(),
        "colors": result.get("colors", ["unknown"]),
        "primary_color": result.get("primary_color", result.get("colors", ["gray"])[0]).lower(),
        "occasion": result.get("occasion", ["casual"]),
        "season": result.get("season", ["all-season"]),
        "tags": result.get("tags", []),
        "style": result.get("style", ""),
        "brand_hint": result.get("brand_hint"),
        "description": result.get("description", ""),
        "analysis_method": "gemini-1.5-flash"
    }


def analyze_clothing(image_url=None, image_file=None):
    """Main function to analyze clothing. Tries Gemini first, then GPT/OpenAI, falls back if needed."""
    if GEMINI_API_KEY:
        try:
            logger.info("Attempting Gemini API for clothing analysis...")
            if image_file:
                image_base64 = _encode_image_to_base64(image_file)
                media_type = "image/png"  # Assume PNG from upload
            elif image_url:
                image_base64 = _encode_image_to_base64(image_url)
                # Detect media type from URL
                if image_url.lower().endswith('.jpg') or image_url.lower().endswith('.jpeg'):
                    media_type = "image/jpeg"
                elif image_url.lower().endswith('.png'):
                    media_type = "image/png"
                elif image_url.lower().endswith('.webp'):
                    media_type = "image/webp"
                elif image_url.lower().endswith('.gif'):
                    media_type = "image/gif"
                else:
                    media_type = "image/jpeg"  # Default
            else:
                return _get_fallback_analysis()
            
            return analyze_clothing_with_gemini(image_base64, media_type)
        except Exception as e:
            logger.error("Gemini clothing analysis failed: %s. Falling back to OpenAI...", e)

    return analyze_clothing_with_gpt(image_url, image_file)