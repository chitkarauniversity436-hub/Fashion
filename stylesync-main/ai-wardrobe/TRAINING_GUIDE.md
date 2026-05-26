# ML Model Training Guide for AI Wardrobe

## Overview
This guide shows you how to train the virtual try-on model for the AI Wardrobe project.

---

## Where to Run Commands

All commands should be run from: **`c:\stylesync\ai-wardrobe\backend`**

---

## Step-by-Step Commands

### 1. Setup Python Environment (Run from: `c:\stylesync\ai-wardrobe`)

```powershell
# Activate virtual environment
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& c:\stylesync\.venv\Scripts\Activate.ps1)
```

### 2. Install Backend Dependencies (Run from: `c:\stylesync\ai-wardrobe\backend`)

```powershell
pip install -r requirements.txt
```

**What gets installed:**
- fastapi, uvicorn (API framework)
- torch, torchvision (deep learning)
- Pillow (image processing)
- requests, python-dotenv, pydantic

---

### 3. Start Backend Server (Run from: `c:\stylesync\ai-wardrobe\backend`)

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Output should show:**
```
Uvicorn running on http://0.0.0.0:8000
```

---

### 4. Collect Training Samples

Before training, you need sample data. Use the API endpoint:

**Endpoint:** `POST http://localhost:8000/api/tryon/save-sample`

**Example using curl (in a new terminal):**

```powershell
# Sample 1: With image URLs
$body = @{
    user_id = "user1"
    category = "top"
    body_image_url = "https://example.com/body1.jpg"
    clothing_image_url = "https://example.com/shirt1.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/save-sample" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Or with file uploads (multipart form):**

```powershell
$form = @{
    user_id = "user1"
    category = "top"
    body_image = Get-Item "C:\path\to\body.jpg"
    clothing_image = Get-Item "C:\path\to\shirt.jpg"
}

Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/save-sample" `
    -Method POST `
    -Form $form
```

**Repeat this 10-50 times to collect diverse samples.**

Samples are saved to: `c:\stylesync\ai-wardrobe\backend\tryon_dataset\`

---

### 5. Train the Model

#### Option A: Using Python Script (Recommended for beginners)

```powershell
# Make sure you're in the backend directory
cd c:\stylesync\ai-wardrobe\backend

# Run the training script
python train_tryon.py
```

**Default hyperparameters:**
- Epochs: 5
- Batch size: 2
- Learning rate: 0.001

---

#### Option B: Using API Endpoint (For custom hyperparameters)

```powershell
$trainingConfig = @{
    epochs = 30
    batch_size = 4
    learning_rate = 0.0005
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/train" `
    -Method POST `
    -Body $trainingConfig `
    -ContentType "application/json"
```

**Recommended hyperparameters for better results:**
- epochs: 30-50
- batch_size: 4 (or 2 if GPU memory is low)
- learning_rate: 0.0005

---

### 6. Verify Trained Model

```powershell
# Check if model file exists
Test-Path "c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth"

# If True = model trained successfully
```

**Test the model with prediction:**

```powershell
$predictionForm = @{
    user_id = "user1"
    body_image_url = "https://example.com/body.jpg"
    clothing_image_url = "https://example.com/shirt.jpg"
}

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/predict" `
    -Method POST `
    -Form $predictionForm

# Check the response
$response.Content
```

**Look for in response:** `"model": "trained"` (instead of `"fallback"`)

---

## Complete Quick Start Command Sequence

Run these commands in order (in separate terminals):

**Terminal 1 - Activate environment:**
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\.venv\Scripts\Activate.ps1)
```

**Terminal 1 - Start backend:**
```powershell
cd c:\stylesync\ai-wardrobe\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Install dependencies (if needed):**
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSecurity) ; (& .\.venv\Scripts\Activate.ps1)
cd c:\stylesync\ai-wardrobe\backend
pip install -r requirements.txt
```

**Terminal 2 - Collect samples:**
```powershell
# Use curl commands from Step 4 above
```

**Terminal 2 - Train model:**
```powershell
cd c:\stylesync\ai-wardrobe\backend
python train_tryon.py
```

**Terminal 2 - Verify training:**
```powershell
# Use verification commands from Step 6
```

---

## Important Files & Locations

| Item | Location |
|------|----------|
| Training script | `c:\stylesync\ai-wardrobe\backend\train_tryon.py` |
| Training logic | `c:\stylesync\ai-wardrobe\backend\services\virtual_tryon.py` |
| Collected samples | `c:\stylesync\ai-wardrobe\backend\tryon_dataset\samples.json` |
| Sample images | `c:\stylesync\ai-wardrobe\backend\tryon_dataset\images\` |
| Trained model | `c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth` |
| Backend API | `c:\stylesync\ai-wardrobe\backend\main.py` |

---

## Troubleshooting

### Error: "No try-on dataset found"
**Solution:** You need to save samples first using the `/api/tryon/save-sample` endpoint

### Error: "torch not installed"
**Solution:** Run `pip install torch torchvision` in the backend folder

### Model not being used (getting "fallback")
**Solution:** 
1. Check if `tryon_model.pth` exists in `tryon_dataset/`
2. Verify training completed without errors
3. Restart the backend server

### Port 8000 already in use
**Solution:** Kill the process or use a different port:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

---

## Model Architecture

The model is a simple CNN autoencoder:
- **Input:** 6 channels (3 for body image + 3 for clothing image), 256×256 resolution
- **Encoder:** 3 convolutional layers (32→64→128 filters)
- **Decoder:** 3 transposed convolutional layers (128→64→32→3)
- **Output:** Composite try-on image (3 channels, 256×256)

---

## Next Steps

1. Collect at least 30 diverse training samples
2. Train with epochs=30, batch_size=4 for better results
3. Evaluate model on test images
4. If not satisfactory, collect more samples and retrain
