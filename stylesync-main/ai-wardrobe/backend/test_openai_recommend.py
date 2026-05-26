import os
import sys

sys.path.append(r"c:\Users\singl\OneDrive\Desktop(1)\stylesync (3)\stylesync\ai-wardrobe\backend")

from services.openai_service import get_outfit_recommendation

def test_recommendation():
    mock_wardrobe = [
        {"name": "Blue Denim Jacket", "category": "topwear", "primary_color": "Blue"},
        {"name": "Black Leather Boots", "category": "footwear", "primary_color": "Black"}
    ]
    query = "White T-Shirt"
    try:
        res = get_outfit_recommendation(
            wardrobe=mock_wardrobe,
            query=query,
            occasion="casual"
        )
        print("Success! OpenAI response:")
        print(res.get("parsed_recommendation"))
    except Exception as e:
        print("Error during OpenAI recommendation:", e)

if __name__ == "__main__":
    test_recommendation()
