import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
user_uuid = "d91d959f-ada8-462f-b64e-0a1e6ff9e6a1"

try:
    print("Testing wardrobe_items insert with 'name'...")
    res = supabase.table("wardrobe_items").insert({
        "user_id": user_uuid,
        "image_url": "https://example.com/test.jpg",
        "category": "topwear",
        "primary_color": "blue"
    }).execute()
    print("SUCCESS:", res.data)
except Exception as e:
    print("FAILED:", e)
