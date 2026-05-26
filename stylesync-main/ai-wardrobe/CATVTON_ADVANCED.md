# CatVTON Advanced Configuration

## 🎛️ Fine-Tuning Parameters

### Inference Quality Settings

Modify `catvton_service.py` in the `infer()` method:

```python
def infer(
    self,
    person_image: Image.Image,
    clothing_image: Image.Image,
    num_inference_steps: int = 20,      # Quality vs Speed tradeoff
    guidance_scale: float = 7.5,         # Adherence to prompt
) -> Image.Image:
```

#### `num_inference_steps`
- **Range:** 10-50
- **Default:** 20
- **Recommendation:** 15-25
- **Effect:**
  - 10-15: Fast (~15-30s), lower quality
  - 20-25: Balanced (~30-60s), good quality ⭐
  - 30-40: High quality (~60-120s), slower
  - 50+: Maximum quality (~2+ min), very slow

```python
# Fast mode (for real-time preview)
result = model.infer(person, clothing, num_inference_steps=15)

# Balanced (recommended)
result = model.infer(person, clothing, num_inference_steps=20)

# High quality (for final output)
result = model.infer(person, clothing, num_inference_steps=30)
```

#### `guidance_scale`
- **Range:** 0-20
- **Default:** 7.5
- **Recommendation:** 5-10
- **Effect:**
  - Low (3-5): More creative, less faithful to clothing
  - Medium (7.5): Balanced ⭐
  - High (10-15): Strict adherence to clothing
  - Very high (15+): May produce artifacts

```python
# More faithful to clothing details
result = model.infer(person, clothing, guidance_scale=10.0)

# More creative interpretation
result = model.infer(person, clothing, guidance_scale=5.0)
```

---

## 💾 Memory Optimization

### 1. Enable Memory-Efficient Attention
Already enabled for FP16 mode. For additional optimization:

```python
# In catvton_service.py, in load_model():
if self.use_fp16:
    pipeline.enable_attention_slicing()
    pipeline.enable_vae_slicing()  # Additional VAE optimization
```

### 2. Reduce Batch Size
For multi-image processing:

```python
# Process one image at a time to minimize memory
for person, clothing in image_pairs:
    result = model.infer(person, clothing)  # Process individually
    # Instead of batch processing
```

### 3. Use 8-bit Quantization (Experimental)
For even tighter memory constraints:

```python
# In catvton_service.py, modify load_model():
from diffusers import StableDiffusionInpaintPipeline

pipeline = StableDiffusionInpaintPipeline.from_pretrained(
    "runwayml/stable-diffusion-inpainting",
    torch_dtype=torch.float16 if self.use_fp16 else torch.float32,
    cache_dir=str(MODELS_CACHE_DIR),
    revision="fp16",  # Use FP16 revision
)

# Optional: Load weights in 8-bit (requires bitsandbytes)
# More complex - only if memory is critical
```

---

## 🎨 Preprocessing & Postprocessing

### Custom Image Preprocessing

Modify `_preprocess_image()` in `catvton_service.py`:

```python
def _preprocess_image(self, image: Image.Image, size: Tuple[int, int] = (768, 1024)) -> Image.Image:
    """Custom preprocessing logic"""
    image = image.convert("RGB")
    
    # Option 1: Crop to face/upper body (useful for torso clothing)
    # image = image.crop((0, 50, image.width, int(image.height * 0.8)))
    
    # Option 2: Stretch to fill (for bottom wear)
    # image = image.resize(size, Image.Resampling.LANCZOS)
    
    # Option 3: Maintain aspect ratio with padding (default)
    image.thumbnail(size, Image.Resampling.LANCZOS)
    background = Image.new("RGB", size, (255, 255, 255))
    offset = ((size[0] - image.width) // 2, (size[1] - image.height) // 2)
    background.paste(image, offset)
    
    return background
```

### Custom Mask Generation

Improve clothing detection with advanced masking:

```python
def _generate_mask_advanced(self, image: Image.Image) -> Image.Image:
    """
    Generate mask using edge detection for better precision
    """
    import cv2
    import numpy as np
    
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    
    # Canny edge detection
    edges = cv2.Canny(img_cv, 100, 200)
    
    # Dilate edges to create mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.dilate(edges, kernel, iterations=2)
    
    # Fill interior
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    mask = np.zeros_like(mask)
    cv2.drawContours(mask, contours, -1, 255, -1)
    
    return Image.fromarray(mask)
```

### Postprocessing Enhancement

```python
def _enhance_result(self, result_image: Image.Image) -> Image.Image:
    """
    Enhance result image with sharpening and contrast adjustment
    """
    from PIL import ImageEnhance
    
    # Sharpen
    enhancer = ImageEnhance.Sharpness(result_image)
    result_image = enhancer.enhance(1.2)  # 20% more sharp
    
    # Increase contrast
    enhancer = ImageEnhance.Contrast(result_image)
    result_image = enhancer.enhance(1.1)  # 10% more contrast
    
    return result_image
```

---

## 🖥️ Device & Precision Configuration

### Multi-GPU Setup

```python
from services.catvton_service import CatVTONModel

# Use specific GPU
model = CatVTONModel(device='cuda:1')  # GPU 1 instead of default GPU 0

# Distribute across GPUs (requires model modification)
import torch
device_ids = [0, 1]  # Use GPU 0 and 1
# model.model = torch.nn.DataParallel(model.model, device_ids=device_ids)
```

### Mixed Precision Training (Future: Custom Fine-tuning)

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

with autocast():
    output = model(input)
    loss = criterion(output, target)

scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()
```

---

## 📊 Performance Profiling

### Monitor Memory Usage

```python
import torch

def profile_inference(model, person_image, clothing_image):
    """Profile memory and time"""
    import time
    
    # Memory before
    torch.cuda.reset_peak_memory_stats()
    
    start_time = time.time()
    result = model.infer(person_image, clothing_image)
    elapsed = time.time() - start_time
    
    # Memory after
    peak_memory = torch.cuda.max_memory_allocated() / 1024**3  # GB
    
    print(f"⏱️  Time: {elapsed:.2f}s")
    print(f"💾 Peak Memory: {peak_memory:.2f}GB")
    print(f"📊 Result shape: {result.size}")
    
    return result

# Usage
result = profile_inference(model, person_img, clothing_img)
```

### Benchmark Different Settings

```python
import time
from PIL import Image

person = Image.open("person.jpg")
clothing = Image.open("clothing.jpg")

settings = [
    (15, 5.0),   # Fast + creative
    (15, 10.0),  # Fast + strict
    (20, 7.5),   # Balanced (default)
    (30, 7.5),   # High quality
]

for steps, guidance in settings:
    start = time.time()
    result = model.infer(person, clothing, 
                        num_inference_steps=steps,
                        guidance_scale=guidance)
    elapsed = time.time() - start
    print(f"Steps={steps}, Guidance={guidance}: {elapsed:.1f}s")
```

---

## 🔌 Custom Model Weights

### Use Different Base Model

Currently uses Stable Diffusion v1.5 Inpainting. To use alternative bases:

```python
# In catvton_service.py, load_model():

# Option 1: Stable Diffusion 2.0 Inpainting
pipeline = StableDiffusionInpaintPipeline.from_pretrained(
    "stabilityai/stable-diffusion-2-inpainting",
    torch_dtype=torch.float16 if self.use_fp16 else torch.float32,
)

# Option 2: Custom fine-tuned model
pipeline = StableDiffusionInpaintPipeline.from_pretrained(
    "path/to/your/custom/model",
)
```

---

## 🚀 Production Deployment

### Docker Configuration

```dockerfile
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV CUDA_VISIBLE_DEVICES=0
ENV TORCH_HOME=/app/models

CMD ["python", "main.py"]
```

**Build and run:**
```bash
docker build -t stylesync-catvton .
docker run --gpus all -p 8000:8000 stylesync-catvton
```

### Environment Variables

```bash
# Model cache location
export HF_HOME=~/.cache/huggingface
export TORCH_HOME=~/.cache/torch

# GPU selection
export CUDA_VISIBLE_DEVICES=0,1  # Use GPU 0 and 1

# Inference settings
export CATVTON_STEPS=20
export CATVTON_GUIDANCE=7.5

# Memory settings
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
```

---

## 🔍 Debugging

### Enable Verbose Logging

```python
import logging

# Set debug level
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("catvton_service")
logger.setLevel(logging.DEBUG)

# Now get detailed logs
model = get_catvton_model()
result = model.infer(person, clothing)
```

### Check Model Architecture

```python
from services.catvton_service import get_catvton_model

model = get_catvton_model()
print(model.model)  # Print full model architecture

# Count parameters
total_params = sum(p.numel() for p in model.model.parameters())
print(f"Total parameters: {total_params:,}")
```

---

## 📈 Expected Performance

| Setting | Speed | Quality | VRAM |
|---------|-------|---------|------|
| Fast (15 steps, guidance 5) | 15-20s | Good | 5.5GB |
| Balanced (20 steps, guidance 7.5) | 30-45s | Excellent | 6.5GB |
| High (30 steps, guidance 10) | 60-90s | Very High | 7.5GB |
| CPU Mode | 5-10 min | Good | <1GB |

---

## 🎯 Recommendations

- **Development:** 20 steps, guidance 7.5 (default)
- **Production:** 20-25 steps, guidance 7.5
- **Fast Preview:** 15 steps, guidance 5
- **High Quality:** 30 steps, guidance 10 (GPU only)

See [CATVTON_INTEGRATION.md](CATVTON_INTEGRATION.md) for complete documentation.
