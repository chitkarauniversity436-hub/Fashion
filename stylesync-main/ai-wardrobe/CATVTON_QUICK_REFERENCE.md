# CatVTON Quick Reference Card

## ⚡ 60-Second Setup

```bash
# 1. Install
cd backend && pip install -r requirements.txt

# 2. Run
python main.py

# 3. Test
curl -X POST http://localhost:8000/tryon/predict \
  -F "user_id=test" \
  -F "body_image=@person.jpg" \
  -F "clothing_image=@clothing.jpg"
```

## 🎯 Key Commands

### Backend Control
```bash
# Start backend (watch for "Uvicorn running on...")
python main.py

# With GPU selection
export CUDA_VISIBLE_DEVICES=0
python main.py

# CPU only (slow)
export CUDA_VISIBLE_DEVICES=-1
python main.py
```

### Python Usage
```python
# Generate try-on
from services.catvton_service import generate_tryon_with_catvton
from PIL import Image

person = Image.open("person.jpg")
clothing = Image.open("clothing.jpg")

result = generate_tryon_with_catvton(person, clothing)
result.save("output.png")

# Check available GPU
import torch
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))
```

### API Requests
```bash
# With files
curl -X POST http://localhost:8000/tryon/predict \
  -F "user_id=user123" \
  -F "body_image=@person.jpg" \
  -F "clothing_image=@clothing.jpg"

# With URLs
curl -X POST http://localhost:8000/tryon/predict \
  -d "user_id=user123" \
  -d "body_image_url=https://..." \
  -d "clothing_image_url=https://..."

# Save for training
curl -X POST http://localhost:8000/tryon/save-sample \
  -F "user_id=user123" \
  -F "category=dress" \
  -F "body_image=@person.jpg" \
  -F "clothing_image=@clothing.jpg"
```

## 🔧 Common Configuration

### In `catvton_service.py`

```python
# Adjust quality/speed
def infer(self, person_image, clothing_image, 
          num_inference_steps=20,      # 15-30 (default 20)
          guidance_scale=7.5):         # 5-15 (default 7.5)

# Use CPU
model = CatVTONModel(device='cpu')

# Use specific GPU
model = CatVTONModel(device='cuda:0')

# Full precision (more memory)
model = CatVTONModel(use_fp16=False)
```

## 📊 Performance Targets

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Inference | 30-60s | < 90s |
| Memory | 6-7GB | < 8GB |
| Quality | Excellent | Good |
| Reliability | 99%+ | 95%+ |

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: diffusers` | `pip install -r requirements.txt` |
| `CUDA out of memory` | `num_inference_steps=15` or `CUDA_VISIBLE_DEVICES=-1` |
| Response: `"model": "fallback"` | Check logs, restart backend |
| Slow on first run | Normal - models downloading |
| GPU not detected | `python -c "import torch; print(torch.cuda.is_available())"` |

## 📁 Important Files

| File | Purpose | Modified |
|------|---------|----------|
| `backend/requirements.txt` | Dependencies | ✏️ |
| `backend/services/catvton_service.py` | CatVTON integration | 📄 NEW |
| `backend/services/virtual_tryon.py` | Try-on generation | ✏️ |
| `backend/routers/tryon.py` | API endpoints | ✅ Works |

## 📖 Documentation

```
Just starting?           → CATVTON_QUICKSTART.md
Need full setup?         → CATVTON_INTEGRATION.md
Want to tune it?         → CATVTON_ADVANCED.md
Implementing steps?      → CATVTON_CHECKLIST.md
Technical overview?      → CATVTON_IMPLEMENTATION_SUMMARY.md
Quick lookup?            → This file!
```

## 🔄 Model Priority

When `generate_try_on()` is called:
```
1. Try CatVTON        (High quality, ~45s)
   ↓ If unavailable
2. Try Trained Model  (Medium quality, ~10s)
   ↓ If unavailable
3. Use Fallback       (Simple composition, <1s)
```

Response includes `"model"` field showing which was used.

## 💡 Pro Tips

✅ **First run slow?** Expected - models downloading (~2-5 min)  
✅ **Want faster?** Reduce steps: `num_inference_steps=15`  
✅ **Want better?** Increase steps: `num_inference_steps=30`  
✅ **Memory issues?** Already FP16 optimized  
✅ **Multi-GPU?** Set `CUDA_VISIBLE_DEVICES=0,1`  
✅ **Batch processing?** Reuse model instance for each image  

## 🎓 Key Classes/Functions

```python
# From catvton_service.py

CatVTONModel(device, use_fp16)    # Main model wrapper
get_catvton_model()               # Get singleton instance
generate_tryon_with_catvton()     # One-line interface
```

## ⏱️ Expected Timings

```
First run:        2-5 minutes (model download)
First inference:  1-2 minutes (initialization)
Subsequent:       30-60 seconds (inference only)
CPU mode:         5-10 minutes (not recommended)
```

## 🎯 Success Checklist

- [ ] Dependencies installed
- [ ] Backend starts without errors
- [ ] GPU detected (if available)
- [ ] First inference completes
- [ ] Response includes `"model": "catvton"`
- [ ] Image quality looks good
- [ ] Frontend displays result
- [ ] Performance acceptable

---

**Version:** 1.0  
**Updated:** 2026-05-10  
**Status:** Production Ready ✅
