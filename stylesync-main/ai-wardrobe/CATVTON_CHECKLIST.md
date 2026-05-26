# CatVTON Implementation Checklist

## ✅ Pre-Implementation

- [ ] Review [CATVTON_INTEGRATION.md](CATVTON_INTEGRATION.md)
- [ ] Check GPU availability: `nvidia-smi`
- [ ] Verify Python version: `python --version` (need 3.9+)
- [ ] Internet connection ready (for model download)
- [ ] ~5GB disk space available

## ✅ Installation Phase

- [ ] **Install dependencies**
  ```bash
  cd backend
  pip install -r requirements.txt
  ```
  - Duration: 3-5 minutes
  - Watch for `Successfully installed` messages
  - Note: If torch download fails, install separately: `pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118`

- [ ] **Verify installation**
  ```bash
  python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
  ```
  - Should show PyTorch version and `True` or `False` for CUDA availability

- [ ] **Verify CatVTON imports**
  ```bash
  python -c "from diffusers import StableDiffusionInpaintPipeline; print('✓ Diffusers OK')"
  python -c "from transformers import CLIPTokenizer; print('✓ Transformers OK')"
  ```

## ✅ Configuration Phase

- [ ] **Review files modified:**
  - [ ] `backend/requirements.txt` - Added CatVTON dependencies ✓
  - [ ] `backend/services/catvton_service.py` - New CatVTON wrapper ✓
  - [ ] `backend/services/virtual_tryon.py` - Updated generate_try_on() ✓

- [ ] **Check model cache location**
  ```bash
  ls ~/.cache/catvton_models/
  # (Should be empty initially, will populate on first run)
  ```

- [ ] **Optional: Set CUDA device** (if multi-GPU)
  ```bash
  # Windows PowerShell
  $env:CUDA_VISIBLE_DEVICES = "0"
  
  # Linux/Mac
  export CUDA_VISIBLE_DEVICES=0
  ```

## ✅ Testing Phase

### Step 1: Start Backend
- [ ] **Run backend server**
  ```bash
  cd backend
  python main.py
  ```
  - Watch for `Uvicorn running on http://127.0.0.1:8000`
  - Leave running in terminal/window

### Step 2: First Try-On Test
- [ ] **Prepare test images**
  - Person image: `person.jpg` (full body, standing)
  - Clothing image: `clothing.jpg` (flat lay or product image)
  - Place in a known directory

- [ ] **Test with cURL** (or use Python script below)
  ```bash
  # On Windows PowerShell:
  $body = @{
      user_id = "test_user"
      occasion = "casual"
  }
  $files = @{
      body_image = "C:\path\to\person.jpg"
      clothing_image = "C:\path\to\clothing.jpg"
  }
  Invoke-WebRequest -Uri "http://localhost:8000/tryon/predict" `
      -Method POST -Form $body -Form $files
  ```

- [ ] **Test with Python** (recommended)
  ```python
  import requests
  from pathlib import Path
  
  # Test image paths
  person_img = Path("person.jpg")
  clothing_img = Path("clothing.jpg")
  
  # Make request
  response = requests.post(
      "http://localhost:8000/tryon/predict",
      files={
          "body_image": open(person_img, "rb"),
          "clothing_image": open(clothing_img, "rb"),
      },
      data={
          "user_id": "test_user",
          "occasion": "casual"
      }
  )
  
  result = response.json()
  
  # Check response
  print(f"Status: {response.status_code}")
  print(f"Model used: {result.get('model')}")
  print(f"Response keys: {list(result.keys())}")
  
  # First run will download models (~2-5 minutes)
  # Subsequent requests will be faster (30-60 seconds)
  ```

### Step 3: First Run - Model Download
- [ ] **Wait for model download** (first inference only)
  - Duration: 2-5 minutes depending on internet
  - Status: Watch terminal for "Loading CatVTON model"
  - Models cached automatically: `~/.cache/catvton_models/`
  
- [ ] **Monitor resource usage** (in new terminal)
  ```bash
  nvidia-smi -l 1  # Watch GPU (if available)
  ```

### Step 4: Verify Success
- [ ] **Response should include:**
  ```json
  {
    "tryon_image": "data:image/png;base64,...",
    "model": "catvton",
    "clothing_analysis": {...}
  }
  ```

- [ ] **Check `"model"` field:**
  - `"catvton"` - ✅ CatVTON worked perfectly!
  - `"trained"` - Fallback to trained model (CatVTON not available)
  - `"fallback"` - Simple composition (dependencies missing)

- [ ] **Save output for inspection**
  ```python
  import base64
  from pathlib import Path
  
  result = response.json()
  img_b64 = result['tryon_image'].split(',')[1]
  img_bytes = base64.b64decode(img_b64)
  
  Path("output_tryon.png").write_bytes(img_bytes)
  print("✓ Saved to output_tryon.png")
  ```

## ✅ Performance Tuning

- [ ] **Run multiple tests to establish baseline**
  ```bash
  for i in {1..3}; do
    curl -X POST "http://localhost:8000/tryon/predict" \
      -H "Content-Type: multipart/form-data" \
      -F "user_id=perf_test" \
      -F "body_image=@person.jpg" \
      -F "clothing_image=@clothing.jpg"
  done
  ```

- [ ] **Document baseline performance**
  - First run: _______ seconds
  - Second run: _______ seconds
  - Third run: _______ seconds
  - GPU memory: _______ GB
  - Result quality: Good / Excellent / Needs improvement

- [ ] **If performance is slow (>60 seconds):**
  - [ ] Check `nvidia-smi` for GPU utilization
  - [ ] Reduce steps: `num_inference_steps=15` in `catvton_service.py`
  - [ ] Try CPU mode: `export CUDA_VISIBLE_DEVICES=-1`
  - [ ] See [CATVTON_ADVANCED.md](CATVTON_ADVANCED.md) for tuning

## ✅ Integration Phase

- [ ] **Test with Frontend**
  - [ ] Start frontend: `npm run dev`
  - [ ] Navigate to Try-On page
  - [ ] Upload test images
  - [ ] Verify response displays correctly
  - [ ] Check loading state and error handling

- [ ] **Test File Upload Endpoints**
  ```bash
  # Save a sample for training
  curl -X POST "http://localhost:8000/tryon/save-sample" \
    -F "user_id=test_user" \
    -F "category=dress" \
    -F "body_image=@person.jpg" \
    -F "clothing_image=@clothing.jpg"
  ```

- [ ] **Test with URLs**
  ```bash
  curl -X POST "http://localhost:8000/tryon/predict" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "user_id=test&body_image_url=https://...&clothing_image_url=https://..."
  ```

## ✅ Production Preparation

- [ ] **Environment Variables**
  ```bash
  # .env or environment setup
  CUDA_VISIBLE_DEVICES=0
  HF_HOME=~/.cache/huggingface
  PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
  ```

- [ ] **Error Handling**
  - [ ] Test with invalid image (should gracefully fallback)
  - [ ] Test with corrupted file
  - [ ] Test without GPU (CPU fallback)
  - [ ] Test with limited VRAM

- [ ] **Documentation**
  - [ ] Share [CATVTON_QUICKSTART.md](CATVTON_QUICKSTART.md) with team
  - [ ] Share [CATVTON_INTEGRATION.md](CATVTON_INTEGRATION.md) for reference
  - [ ] Share [CATVTON_ADVANCED.md](CATVTON_ADVANCED.md) for configuration

- [ ] **Monitoring Setup**
  ```python
  # Add to main.py for monitoring
  import logging
  logging.basicConfig(level=logging.INFO)
  
  # Or use external monitoring:
  # - GPU temperature
  # - Memory usage
  # - Response time
  # - Error rates
  ```

## ✅ Troubleshooting Checklist

### Issue: ImportError
- [ ] Dependencies installed? `pip install -r requirements.txt`
- [ ] Check virtual environment: `python -m venv venv && source venv/bin/activate`
- [ ] Verify package: `pip show diffusers`

### Issue: CUDA Out of Memory
- [ ] Reduce steps: `num_inference_steps=15`
- [ ] Enable FP16 (default): Already done ✓
- [ ] Use CPU: `export CUDA_VISIBLE_DEVICES=-1`
- [ ] Reduce image size in preprocessing

### Issue: Slow Performance
- [ ] GPU in use? Run `nvidia-smi` during inference
- [ ] First run? Models downloading (2-5 min expected)
- [ ] Too many steps? Reduce to 15-20
- [ ] Check disk I/O and system load

### Issue: Poor Quality Results
- [ ] Increase steps: `num_inference_steps=30`
- [ ] Adjust guidance: `guidance_scale=10.0`
- [ ] Try different input images
- [ ] Check image resolution and quality

## ✅ Final Sign-Off

- [ ] **All tests passing**: _____ (Date/Time)
- [ ] **Performance acceptable**: _____ (Y/N)
- [ ] **Team trained**: _____ (Y/N)
- [ ] **Documentation shared**: _____ (Y/N)
- [ ] **Deployed to staging**: _____ (Y/N)
- [ ] **Ready for production**: _____ (Y/N)

---

## 📞 Support Resources

- **CatVTON GitHub:** https://github.com/Zheng-Chong/CatVTON
- **HuggingFace Demo:** https://huggingface.co/spaces/zhengchong/CatVTON
- **Diffusers Docs:** https://huggingface.co/docs/diffusers
- **Local Docs:**
  - Quick Start: [CATVTON_QUICKSTART.md](CATVTON_QUICKSTART.md)
  - Full Setup: [CATVTON_INTEGRATION.md](CATVTON_INTEGRATION.md)
  - Advanced: [CATVTON_ADVANCED.md](CATVTON_ADVANCED.md)

---

## 🎯 Success Criteria

✅ Backend returns `"model": "catvton"` in response  
✅ Try-on images look realistic with proper clothing fit  
✅ Performance is acceptable (< 90 seconds per image)  
✅ GPU memory usage is reasonable (< 8GB)  
✅ Graceful fallback works when CatVTON unavailable  
✅ Frontend displays results correctly  
✅ Team understands configuration and troubleshooting  

---

**Status:** Ready to implement! 🚀
