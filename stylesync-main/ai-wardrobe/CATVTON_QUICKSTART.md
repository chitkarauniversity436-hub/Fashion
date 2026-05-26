# CatVTON Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Start Backend
```bash
python main.py
```

### Step 3: Test Try-On
```bash
# Using curl with local images
curl -X POST "http://localhost:8000/tryon/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "user_id=user123" \
  -F "occasion=casual" \
  -F "body_image=@path/to/person.jpg" \
  -F "clothing_image=@path/to/clothing.jpg"
```

Or **using Python**:
```python
import requests
from pathlib import Path

url = "http://localhost:8000/tryon/predict"
files = {
    "body_image": open("person.jpg", "rb"),
    "clothing_image": open("clothing.jpg", "rb"),
}
data = {
    "user_id": "user123",
    "occasion": "casual"
}

response = requests.post(url, files=files, data=data)
result = response.json()

# result["model"] will be "catvton", "trained", or "fallback"
print(f"Try-on generated with model: {result['model']}")
```

---

## 📋 What You Need

- **GPU:** 8GB VRAM recommended (can work with 6GB)
- **Internet:** Required for first run (model download ~4GB)
- **Disk Space:** ~5GB for models cache

---

## ✨ Key Features

| Feature | Details |
|---------|---------|
| 🎯 **Auto Fallback** | CatVTON → Trained Model → Simple Composition |
| 🔄 **Format Support** | JPG, PNG, WebP uploads or URLs |
| 📊 **Analysis Included** | Clothing category, color, pattern detection |
| 🛍️ **Shopping Links** | Integrated product recommendations |
| 💾 **Model Caching** | Auto-cached at `~/.cache/catvton_models/` |

---

## 🎬 First Run

**⏱️ Expected Time:**
- Download models: 2-5 minutes (one-time)
- First inference: 1-2 minutes
- Subsequent requests: 30-60 seconds

**Behind the scenes:**
1. Stable Diffusion v1.5 Inpainting model (~4GB)
2. CatVTON LoRA weights (~100MB)
3. Model initialization on GPU

---

## 🔧 Common Tasks

### Performance Optimization
```python
# In catvton_service.py, adjust for speed vs quality:
result = model.infer(
    person_image,
    clothing_image,
    num_inference_steps=15  # Faster (15-20 sec)
    # num_inference_steps=25  # Better quality (45-60 sec)
)
```

### Monitor GPU Usage
```bash
# Terminal 1: Run backend
python main.py

# Terminal 2: Monitor GPU
nvidia-smi -l 1
```

### Save Try-On for Training
```bash
curl -X POST "http://localhost:8000/tryon/save-sample" \
  -F "user_id=user123" \
  -F "category=dress" \
  -F "body_image=@person.jpg" \
  -F "clothing_image=@clothing.jpg"
```

---

## 📈 Response Format

```json
{
  "tryon_image": "data:image/png;base64,iVBORw0K...",
  "model": "catvton",
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
      "url": "https://amazon.com/..."
    }
  ]
}
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: diffusers` | `pip install -r requirements.txt` |
| `CUDA out of memory` | Reduce steps to 15 or use CPU mode |
| `Model download timeout` | Check internet, may need 5+ mins |
| `Model not found` | Wait for auto-download on first run |

---

## 📚 Full Documentation

See [CATVTON_INTEGRATION.md](CATVTON_INTEGRATION.md) for:
- Detailed configuration
- Advanced usage
- Performance tuning
- Custom model setup

---

## 🎯 Next: Test UI

Once backend is working, test the frontend:

1. Start frontend: `npm run dev`
2. Go to `http://localhost:5173/tryOn`
3. Upload person & clothing images
4. Watch the magic happen! ✨

---

## 💡 Tips

✅ **GPU enabled?** Check `nvidia-smi` - should show `python` process  
✅ **First run slow?** Normal - models downloading  
✅ **Want faster results?** Reduce `num_inference_steps` to 15  
✅ **Consistent results?** Same seed parameter produces similar outputs
