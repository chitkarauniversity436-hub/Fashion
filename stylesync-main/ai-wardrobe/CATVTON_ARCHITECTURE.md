# CatVTON Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         StyleSync Frontend                      │
│                    (React + TypeScript)                         │
│                                                                 │
│  ┌──────────────────────┐           ┌──────────────────────┐  │
│  │   Upload Component   │           │   Display Results    │  │
│  │                      │           │                      │  │
│  │ Person Image    ────────────────→ Try-On Image       │  │
│  │ Clothing Image  ────────────────→ Clothing Analysis  │  │
│  │                      │           │ Recommendations    │  │
│  └──────────────────────┘           └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                    │                                △
                    │                                │
                    │ HTTP POST                      │ JSON Response
                    │ multipart/form-data            │
                    ▼                                │
┌─────────────────────────────────────────────────────────────────┐
│                     StyleSync Backend                           │
│                    (FastAPI + Python)                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Route: POST /tryon/predict                            │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  virtual_tryon.generate_try_on()                  │ │ │
│  │  │                                                    │ │ │
│  │  │  1. Load Images                                   │ │ │
│  │  │     ├─ From upload (multipart file)              │ │ │
│  │  │     └─ From URL (external source)                │ │ │
│  │  │                                                    │ │ │
│  │  │  2. Try Models (in order)                         │ │ │
│  │  │     │                                              │ │ │
│  │  │     ├─→ CatVTON (Primary) ──────────┐            │ │ │
│  │  │     │   ✅ Success: Return result   │            │ │ │
│  │  │     │   ❌ Unavailable: Try next    │            │ │ │
│  │  │     │                               │            │ │ │
│  │  │     ├─→ Trained Model (Fallback 1)  │            │ │ │
│  │  │     │   ✅ Success: Return result   │            │ │ │
│  │  │     │   ❌ Not found: Try next      │            │ │ │
│  │  │     │                               │            │ │ │
│  │  │     └─→ Simple Composition (Fallback 2) ─┐      │ │ │
│  │  │         ✅ Always works              │            │ │ │
│  │  │                                       │            │ │ │
│  │  │  3. Encode Result                     │            │ │ │
│  │  │     └─ To Base64 PNG                  │            │ │ │
│  │  │                                       │            │ │ │
│  │  │  4. Analyze Clothing (parallel)       │            │ │ │
│  │  │     └─ Category, color, patterns      │            │ │ │
│  │  │                                       │            │ │ │
│  │  │  5. Find Matches                      │            │ │ │
│  │  │     └─ Product recommendations        │            │ │ │
│  │  │                                       ├──→ Result  │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │            CatVTON Service Integration                  │ │
│  │  (catvton_service.py)                                  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  CatVTONModel Class                             │  │ │
│  │  │                                                 │  │ │
│  │  │  1. Load Model (once per process)              │  │ │
│  │  │     ├─ Download from HuggingFace               │  │ │
│  │  │     ├─ Cache at ~/.cache/catvton_models/       │  │ │
│  │  │     └─ Load to device (GPU/CPU)                │  │ │
│  │  │                                                 │  │ │
│  │  │  2. Preprocess Images                          │  │ │
│  │  │     ├─ Resize (768×1024)                       │  │ │
│  │  │     ├─ Normalize                               │  │ │
│  │  │     └─ Pad with white background               │  │ │
│  │  │                                                 │  │ │
│  │  │  3. Generate Mask                              │  │ │
│  │  │     ├─ Detect clothing area                    │  │ │
│  │  │     └─ Create inpainting mask                  │  │ │
│  │  │                                                 │  │ │
│  │  │  4. Run Inference                              │  │ │
│  │  │     ├─ Stable Diffusion Inpainting             │  │ │
│  │  │     ├─ CatVTON LoRA weights                    │  │ │
│  │  │     ├─ N diffusion steps (default: 20)         │  │ │
│  │  │     └─ Guidance scale (default: 7.5)           │  │ │
│  │  │                                                 │  │ │
│  │  │  5. Return Result Image                        │  │ │
│  │  │                                                 │  │ │
│  │  │  Global Instance: get_catvton_model()          │  │ │
│  │  │  (Reused across all requests)                  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  Model Pipeline:                                       │ │
│  │  Input Images                                          │ │
│  │       ↓                                                 │ │
│  │  Text Encoder (CLIP)                                  │ │
│  │       ↓                                                 │ │
│  │  UNet (Diffusion) + CatVTON LoRA                       │ │
│  │       ↓                                                 │ │
│  │  VAE Decoder                                           │ │
│  │       ↓                                                 │ │
│  │  Output Image                                          │ │
│  │                                                         │ │
│  │  Device: GPU (CUDA) or CPU (auto-detected)            │ │
│  │  Precision: FP16 (default) or FP32                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Additional Services                                   │ │
│  │  ├─ clothing_analyzer.py  (Category detection)        │ │
│  │  ├─ recommendation_service.py  (Product matches)      │ │
│  │  ├─ supabase_service.py  (Store results)              │ │
│  │  └─ external_api_service.py  (Myntra/Amazon links)   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    △                                │
                    │                                │
                    │ JSON Response                  │ Store
                    │ with Base64 Image              │ Results
                    │                                │
        ┌───────────────────────┐         ┌──────────────────────┐
        │   Response Format     │         │  Supabase (Optional) │
        │                       │         │                      │
        │ {                     │         │ - Try-on results     │
        │   tryon_image: "...", │         │ - User history       │
        │   model: "catvton",   │         │ - Analytics          │
        │   clothing_analysis,  │         │                      │
        │   matches: [...]      │         │                      │
        │ }                     │         └──────────────────────┘
        └───────────────────────┘
```

## Request-Response Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: USER INITIATES REQUEST                                  │
└──────────────────────────────────────────────────────────────────┘

Frontend:
  Person Image Upload ──→ File (multipart)
  Clothing Image Upload ──→ File (multipart)
  User ID ──→ Form field
  Occasion ──→ Form field

        │
        ├────────→ HTTP POST /tryon/predict
        │
        ▼
Backend:
  Receives request
  Extracts: user_id, occasion, body_image, clothing_image


┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: LOAD & PREPROCESS IMAGES                               │
└──────────────────────────────────────────────────────────────────┘

_load_sample_image():
  ┌─ body_image (from upload or URL)
  │  └─ Loaded with _load_image_from_upload() or _load_image_from_url()
  │     └─ Convert to RGBA
  │     └─ Apply EXIF rotation
  │
  └─ clothing_image (from upload or URL)
     └─ Loaded with _load_image_from_upload() or _load_image_from_url()
        └─ Convert to RGBA
        └─ Apply EXIF rotation


┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: ATTEMPT CATVTON INFERENCE (PRIMARY)                     │
└──────────────────────────────────────────────────────────────────┘

Try:
  ├─ get_catvton_model()
  │  └─ Global instance (lazy-loaded on first use)
  │     └─ Downloads models from HuggingFace (~4GB, first time only)
  │     └─ Loads to GPU or CPU
  │     └─ Caches at ~/.cache/catvton_models/
  │
  ├─ CatVTONModel.infer(person_image, clothing_image)
  │  │
  │  ├─ Preprocess:
  │  │  ├─ Resize to 768×1024
  │  │  └─ Pad with white background
  │  │
  │  ├─ Generate mask:
  │  │  ├─ HSV color detection
  │  │  ├─ Morphological operations
  │  │  └─ Clothing area mask
  │  │
  │  ├─ Run diffusion:
  │  │  ├─ num_inference_steps=20 (default)
  │  │  ├─ guidance_scale=7.5 (default)
  │  │  ├─ Device: GPU (FP16 default) or CPU (FP32)
  │  │  └─ Time: 30-60 seconds
  │  │
  │  └─ Return: PIL Image
  │
  └─ Success? 
     └─ YES: Return with model="catvton" ✓
     └─ NO: Continue to fallback 2...


┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: FALLBACK 1 - TRAINED MODEL                              │
└──────────────────────────────────────────────────────────────────┘

If CatVTON unavailable:
  Try:
  ├─ Load trained model from tryon_dataset/tryon_model.pth
  │
  ├─ PredictwithModel(model, body_image, clothing_image)
  │  ├─ Resize images to 256×256
  │  ├─ Convert to tensors
  │  ├─ Concatenate [body, clothing]
  │  ├─ Forward pass through simple CNN
  │  └─ Return: PIL Image
  │
  └─ Success?
     └─ YES: Return with model="trained" ✓
     └─ NO: Continue to fallback 2...


┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: FALLBACK 2 - SIMPLE COMPOSITION                         │
└──────────────────────────────────────────────────────────────────┘

If trained model unavailable:
  _compose_try_on(body_image, clothing_image)
  ├─ Scale clothing to fit body
  ├─ Overlay on body (centered, upper area)
  ├─ Alpha blending for transparency
  └─ Return: PIL Image

  Always succeeds!
  └─ Return with model="fallback"


┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: PARALLEL PROCESSING                                      │
└──────────────────────────────────────────────────────────────────┘

While generating try-on image:

Task 1: Analyze Clothing (parallel)
  clothing_analyzer.analyze_clothing()
  ├─ Category (dress, shirt, pants, etc.)
  ├─ Primary color
  └─ Detected patterns


Task 2: Find Matching Products (parallel)
  recommendation_service.build_outfit_matches()
  ├─ Query product database
  ├─ Find similar clothing
  ├─ Get shopping links (Myntra/Amazon)
  └─ Return: [{ product_id, name, price, url }, ...]


┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: ENCODE & RESPOND                                         │
└──────────────────────────────────────────────────────────────────┘

_encode_image_to_base64(result_image)
└─ PNG format
└─ Base64 encoded
└─ Result: data:image/png;base64,iVBORw0K...

Response JSON:
{
  "tryon_image": "data:image/png;base64,iVBORw0K...",
  "model": "catvton",                              ← Indicates which model was used
  "clothing_analysis": {
    "category": "dress",
    "primary_color": "blue",
    "detected_patterns": ["solid"]
  },
  "matches": [
    {
      "product_id": "amazon_123",
      "name": "Blue Cotton Dress",
      "price": "$45.99",
      "url": "https://..."
    }
  ]
}
        │
        ├────────→ HTTP 200 OK
        │
        ▼
Frontend:
  Receives JSON response
  Decodes Base64 image
  Displays try-on result
  Shows analysis & recommendations
  User sees: Person wearing the selected clothing ✨
```

## Model Selection Logic

```
Is CatVTON installed? (dependencies + weights)
├─ YES
│   ├─ CatVTON available on system?
│   │   ├─ YES → Load model instance
│   │   │   └─ Run inference
│   │   │       ├─ SUCCESS → Return ("catvton", image)
│   │   │       └─ FAILURE → Fallback 1
│   │   └─ NO → Download from HuggingFace
│   │       └─ (First run only, ~2-5 min)
│   │       └─ Cache and load
│   │       └─ Run inference
│   │           ├─ SUCCESS → Return ("catvton", image)
│   │           └─ FAILURE → Fallback 1
│
└─ NO
    └─ Skip CatVTON
    └─ Try Fallback 1

Fallback 1: Trained Model
├─ Does tryon_model.pth exist?
│   ├─ YES → Load model
│   │   ├─ Run inference
│   │   │   ├─ SUCCESS → Return ("trained", image)
│   │   │   └─ FAILURE → Fallback 2
│   └─ NO → Skip to Fallback 2
└─ Exception → Fallback 2

Fallback 2: Simple Composition
├─ Always available
└─ Return ("fallback", image)
```

## File Structure & Dependencies

```
backend/
│
├── requirements.txt
│   ├── torch, torchvision (ML framework)
│   ├── diffusers (Diffusion models)          ← CatVTON dependency
│   ├── transformers (CLIP tokenizer)         ← CatVTON dependency
│   ├── accelerate (Multi-GPU support)        ← CatVTON dependency
│   ├── xformers (Memory optimization)        ← CatVTON dependency
│   ├── huggingface_hub (Model downloads)     ← CatVTON dependency
│   └── ... (other dependencies)
│
├── services/
│   │
│   ├── catvton_service.py (NEW)
│   │   ├── CatVTONModel class
│   │   │   ├── __init__(device, use_fp16)
│   │   │   ├── load_model()
│   │   │   ├── infer()
│   │   │   ├── _preprocess_image()
│   │   │   └── _generate_mask()
│   │   │
│   │   ├── get_catvton_model()    ← Singleton
│   │   └── generate_tryon_with_catvton()
│   │
│   ├── virtual_tryon.py (UPDATED)
│   │   ├── generate_try_on()
│   │   │   ├─ Try CatVTON ✨
│   │   │   ├─ Fallback to trained model
│   │   │   └─ Fallback to composition
│   │   │
│   │   ├── save_tryon_sample()
│   │   ├── train_tryon_model()
│   │   └── ... (helper functions)
│   │
│   ├── clothing_analyzer.py
│   │   └── analyze_clothing()
│   │
│   └── recommendation_service.py
│       └── build_outfit_matches()
│
├── routers/
│   └── tryon.py
│       ├── POST /tryon/predict
│       ├── POST /tryon/save-sample
│       └── POST /tryon/train
│
└── main.py
    └── FastAPI app setup

~/.cache/
└── catvton_models/
    ├── sd-v1-5-inpainting/          (Stable Diffusion, ~4GB)
    ├── CatVTON/                      (LoRA weights, ~100MB)
    └── (Other cached models)
```

## Performance Characteristics

```
REQUEST TIMELINE:

T0 = 0s:   Request received
           ├─ Image validation: ~0.1s
           └─ Load images: ~0.1s

T1 = 0.2s: Model check
           ├─ CatVTON available? 
           └─ First run: Download models (~2-5 min) ⏳
           └─ Subsequent: Load cached model (~1-2s)

T2 = 1-2s: Preprocess images (~0.2s)
           ├─ Resize
           ├─ Normalize
           └─ Generate mask (~0.1s)

T3 = 2s:   Start diffusion inference
           ├─ 20 diffusion steps
           ├─ ~1.5-2s per step
           └─ Total inference: ~30-40s ⏳

T4 = 35s:  Parallel tasks (while inference running)
           ├─ Clothing analysis: ~1s
           └─ Product recommendations: ~2-3s

T5 = 40s:  Encode result (~0.5s)
           ├─ PIL → PNG
           └─ PNG → Base64

T6 = 45s:  Send response (~0.1s)
           └─ JSON + Base64 image

TOTAL:    ~45-50 seconds (subsequent requests)
          ~3-7 minutes (first run, including download)
```

---

**Diagram Generated:** 2026-05-10  
**Status:** Complete ✅
