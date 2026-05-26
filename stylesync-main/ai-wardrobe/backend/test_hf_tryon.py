import sys
import io
import os
import traceback
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

# 8. Load environment variables
load_dotenv(override=True)
hf_token = os.getenv("HF_TOKEN")

print("=" * 60)
print("HF Try-On Inference Test Suite")
print("=" * 60)
print("7. HF TOKEN FOUND:", "Yes" if hf_token and not hf_token.startswith("your_") else "No")
print(f"Token: {hf_token[:10]}..." if hf_token else "Token: None")

# Pick first body and clothing images from tryon_dataset/images (filtering for real high-res images > 100KB)
images_dir = Path("tryon_dataset/images")
bodies = [b for b in images_dir.glob("body_*.png") if b.stat().st_size > 100000]
cloths = [c for c in images_dir.glob("clothing_*.png") if c.stat().st_size > 100000]

if not bodies or not cloths:
    print("FAIL: No high-resolution test images found in tryon_dataset/images.")
    sys.exit(1)

body_path = bodies[0]
cloth_path = cloths[0]

# Try to find matching pair if possible
for b in bodies:
    suffix = b.name.replace("body_", "")
    matching_cloth = images_dir / f"clothing_{suffix}"
    if matching_cloth.exists() and matching_cloth in cloths:
        body_path = b
        cloth_path = matching_cloth
        break

print(f"Using human image: {body_path} ({body_path.stat().st_size // 1024} KB)")
print(f"Using clothing image: {cloth_path} ({cloth_path.stat().st_size // 1024} KB)")

try:
    body_img = Image.open(body_path).convert("RGBA")
    cloth_img = Image.open(cloth_path).convert("RGBA")
    
    from services.virtual_tryon import _compose_try_on, generate_tryon_via_hf_api, generate_try_on
    
    # 5. Compose the images using improved overlay method
    print("7. COMPOSING IMAGES...")
    composed = _compose_try_on(body_img, cloth_img)
    composed.save("test_composed_pre_hf.png")
    print("Saved local composite overlay to 'test_composed_pre_hf.png'")
    
    # 9. Perform Cloud Inference if token is set
    if hf_token and not hf_token.startswith("your_"):
        print("STAGE: Running cloud inference test via virtual_tryon service...")
        result_image = generate_tryon_via_hf_api(body_img, cloth_img)
        
        # 6. Validate response and save output
        if result_image is not None:
            result_image.save("test_hf_result.png")
            print("SUCCESS: Saved try-on result to 'test_hf_result.png'")
        else:
            print("FAIL: HF cloud inference returned None. Check the backend stage logs above for details.")
    else:
        print("INFO: HF_TOKEN is unset or default, skipping cloud request test.")
        print("Running complete generate_try_on orchestration pipeline...")
        res = generate_try_on(body_upload=body_img, clothing_upload=cloth_img)
        print(f"Result pipeline model used: {res.get('model')}")
        if res.get("tryon_image"):
            print("SUCCESS: Composed output received successfully.")
        
except Exception as e:
    # 2. Print full exception traceback instead of swallowing
    print("7. STAGE ROUTING: Error in try-on pipeline")
    traceback.print_exc()

print("=" * 60)
