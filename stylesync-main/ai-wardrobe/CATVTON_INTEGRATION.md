# CatVTON Integration Guide

## Overview

[CatVTON](https://github.com/Zheng-Chong/CatVTON) has been successfully integrated into StyleSync for high-quality image-based virtual try-on. CatVTON uses Diffusion Models for realistic clothing try-on generation.

**Key Features:**
- ⭐ **High-Quality Results** - Realistic clothing try-on with proper draping and fit
- 💾 **Lightweight** - Only 899M parameters with 49.57M trainable parameters
- ⚡ **Efficient** - Requires < 8GB VRAM for 1024×768 resolution
- 🎯 **Automatic** - No manual masking needed (mask-free version available)
- 🚀 **Easy Integration** - Works with existing upload/URL-based workflow

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The following packages have been added:
- `diffusers>=0.29.2` - Diffusion model pipelines
- `transformers>=4.27.3` - CLIP tokenizer and text encoder
- `accelerate>=0.31.0` - Multi-GPU/mixed precision support
- `xformers>=0.0.23` - Memory optimization (optional but recommended)
- `safetensors` - Safe model loading
- `opencv-python>=4.10.0` - Image processing
- `scikit-image>=0.24.0` - Image utilities
- `huggingface-hub>=0.23.0` - Model downloading

### 2. Environment Requirements

**Minimum Requirements:**
- GPU: 8GB VRAM (recommended: 12GB+)
- Python: 3.9+
- CUDA: 11.8+ (for GPU acceleration)
- PyTorch: 2.0+

**For CPU-Only (slow):**
```bash
# Set before running
set CUDA_VISIBLE_DEVICES=-1
```

### 3. First Run Setup

On first use, CatVTON will automatically download:
1. Stable Diffusion v1.5 Inpainting model (~4GB)
2. CatVTON LoRA weights (~100MB)

Models are cached at: `~/.cache/catvton_models/`

⚠️ **First inference may take 2-5 minutes** while models download. Subsequent calls will be faster (~30-60 seconds).

---

## Usage

### Basic Try-On Request

**Endpoint:** `POST /tryon/predict`

```bash
curl -X POST "http://localhost:8000/tryon/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "user_id=user123" \
  -F "body_image=@person.jpg" \
  -F "clothing_image=@clothing.jpg"
```

**Response:**
```json
{
  "tryon_image": "data:image/png;base64,iVBORw0K...",
  "model": "catvton",
  "clothing_analysis": {
    "category": "dress",
    "primary_color": "blue",
    "detected_patterns": ["solid"]
  }
}
```

### Model Priority (Automatic Fallback)

The system tries models in this order:

1. **CatVTON** (if dependencies installed) ✅ Recommended
2. **Trained Model** (if model exists at `tryon_dataset/tryon_model.pth`)
3. **Fallback Composition** (simple image overlay)

Response includes `"model"` field indicating which was used.

---

## API Reference

### CatVTON Service Functions

#### `get_catvton_model()`
Get or create global CatVTON model instance (lazy-loaded).

```python
from services.catvton_service import get_catvton_model

model = get_catvton_model()
if model:
    print("CatVTON ready")
```

#### `generate_tryon_with_catvton(person_image, clothing_image, use_fp16=True)`
Generate try-on with CatVTON.

```python
from PIL import Image
from services.catvton_service import generate_tryon_with_catvton

person = Image.open("person.jpg")
clothing = Image.open("clothing.jpg")

result = generate_tryon_with_catvton(person, clothing)
if result:
    result.save("try_on.png")
```

**Parameters:**
- `person_image` (PIL.Image): Person wearing base outfit
- `clothing_image` (PIL.Image): Clothing to try on
- `use_fp16` (bool): Use half-precision for memory efficiency

**Returns:**
- PIL.Image: Generated try-on result
- None: If inference failed

---

## Configuration

### Memory Optimization

For devices with limited VRAM, modify `catvton_service.py`:

```python
class CatVTONModel:
    def __init__(self, device: Optional[str] = None, use_fp16: bool = True):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = use_fp16  # Set to False for full precision
```

### Inference Parameters

Adjust quality vs speed in `catvton_service.py` `infer()` method:

```python
result = model.infer(
    person_image,
    clothing_image,
    num_inference_steps=20,      # 20 = balanced, 30+ = higher quality
    guidance_scale=7.5           # 5-15 = default range
)
```

---

## Performance Tips

### GPU Acceleration
✅ **Recommended:** Use GPU with CUDA

```python
# Automatically detected - runs on CUDA if available
model = CatVTONModel()  # Uses GPU automatically
```

### Memory Management

1. **Enable FP16 (half precision)** - Reduces memory by ~50%
   ```python
   model = CatVTONModel(use_fp16=True)  # Default
   ```

2. **Reduce inference steps** - Faster but slightly lower quality
   ```python
   # Default: 20 steps (~30-60 sec)
   # Faster: 15 steps (~20-30 sec)
   result = model.infer(person, clothing, num_inference_steps=15)
   ```

3. **Use attention slicing** - Reduces peak memory usage
   - Already enabled in `catvton_service.py` for FP16 mode

### Batch Processing

For multiple try-ons, reuse the model instance:

```python
from services.catvton_service import get_catvton_model
from PIL import Image

model = get_catvton_model()  # Load once

for person_path, clothing_path in pairs:
    person = Image.open(person_path)
    clothing = Image.open(clothing_path)
    result = model.infer(person, clothing)
    result.save(f"output_{clothing_path.stem}.png")
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'diffusers'"
**Solution:** Install dependencies
```bash
pip install -r requirements.txt
```

### "CUDA out of memory"
**Solutions:**
1. Enable FP16 (already default)
2. Reduce `num_inference_steps` to 15
3. Use CPU: `CUDA_VISIBLE_DEVICES=-1 python main.py`

### "Model download timeout"
**Solution:** Manually download to cache
```bash
huggingface-cli download zhengchong/CatVTON --cache-dir ~/.cache/catvton_models
```

### Slow inference (30+ seconds per image)
**Likely causes:**
1. First run - downloading models (expected)
2. CPU mode - use GPU if available
3. High step count - reduce `num_inference_steps`

---

## Advanced Usage

### Custom Device Assignment

```python
from services.catvton_service import CatVTONModel

# Force CPU
model = CatVTONModel(device='cpu')

# Force specific GPU
model = CatVTONModel(device='cuda:0')

# Use full precision (more VRAM)
model = CatVTONModel(use_fp16=False)
```

### Model Caching

CatVTON automatically caches downloaded models:
- **Location:** `~/.cache/catvton_models/`
- **Size:** ~4GB for Stable Diffusion + ~100MB for CatVTON LoRA
- **Cleanup:** Safe to delete cache to free space (will re-download on next use)

---

## Comparison: Models in StyleSync

| Aspect | CatVTON | Trained Model | Fallback |
|--------|---------|---------------|----------|
| Quality | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Basic | ⭐ Poor |
| Speed | 30-60s | 5-10s | <1s |
| VRAM | 6-8GB | <2GB | <1GB |
| Realism | Very high | Low | Overlay |
| Default | ✅ Yes | Fallback | Final |

---

## References

- **CatVTON GitHub:** https://github.com/Zheng-Chong/CatVTON
- **CatVTON Paper:** https://arxiv.org/abs/2407.15886
- **HuggingFace Models:** https://huggingface.co/zhengchong/CatVTON
- **Diffusers Docs:** https://huggingface.co/docs/diffusers
- **Online Demo:** https://huggingface.co/spaces/zhengchong/CatVTON

---

## Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Restart backend server
3. ✅ Test endpoint: `POST /tryon/predict`
4. 📊 Monitor performance and adjust parameters
5. 🔧 Optional: Train custom model with `POST /tryon/save-sample` and `/tryon/train`

---

## License

CatVTON is licensed under [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

For commercial use, ensure compliance with the license terms.
