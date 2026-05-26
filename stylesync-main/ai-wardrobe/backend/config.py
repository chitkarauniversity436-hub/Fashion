import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_KEY")
    or os.getenv("VITE_SUPABASE_ANON_KEY")
)

# Other APIs
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
API_CLIENT_ID = os.getenv("API_CLIENT_ID")
API_CLIENT_SECRET = os.getenv("API_CLIENT_SECRET")
API_BASE64_HEADER = os.getenv("API_BASE64_HEADER")

# RapidAPI
EXTERNAL_API_BASE_URL = os.getenv("EXTERNAL_API_BASE_URL")
RAPID_API_KEY = os.getenv("RAPID_API_KEY")
# Toggle to force using external API data instead of local DB/sample products.
# Set to "true" to prefer external sources.
USE_EXTERNAL_ONLY = os.getenv("USE_EXTERNAL_ONLY", "false").lower() == "true"

# Hugging Face Inference API Token
HF_TOKEN = os.getenv("HF_TOKEN")