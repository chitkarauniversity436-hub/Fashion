import os
import sys

sys.path.append(r"c:\Users\singl\OneDrive\Desktop(1)\stylesync (3)\stylesync\ai-wardrobe\backend")

from services.openai_service import get_gemini_recommendation

def test_gemini():
    mock_wardrobe = [
        {"name": "Blue Denim Jacket", "category": "topwear", "primary_color": "Blue"},
        {"name": "Black Leather Boots", "category": "footwear", "primary_color": "Black"}
    ]
    query = "White T-Shirt"
    try:
        print("Testing Gemini recommendation...")
        res = get_gemini_recommendation(
            wardrobe=mock_wardrobe,
            query=query,
            occasion="casual"
        )
        print("Success! Gemini response:")
        print(res.get("parsed_recommendation"))
    except Exception as e:
        print("Error during Gemini recommendation:", e)

if __name__ == "__main__":
    test_gemini()
