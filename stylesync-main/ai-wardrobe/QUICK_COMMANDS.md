# QUICK REFERENCE: ALL TRAINING COMMANDS

## Working Directory
All commands run from: c:\stylesync\ai-wardrobe\backend

---

## COMMAND 1: Setup Environment
```powershell
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& c:\stylesync\.venv\Scripts\Activate.ps1)
```

---

## COMMAND 2: Install Dependencies
```powershell
cd c:\stylesync\ai-wardrobe\backend
pip install -r requirements.txt
```

---

## COMMAND 3: Start Backend Server
```powershell
cd c:\stylesync\ai-wardrobe\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Output: `Uvicorn running on http://0.0.0.0:8000`

---

## COMMAND 4: Save Training Sample (using URLs)
```powershell
$body = @{
    user_id = "user1"
    category = "top"
    body_image_url = "https://example.com/body.jpg"
    clothing_image_url = "https://example.com/shirt.jpg"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/save-sample" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```
**Repeat 10-50 times with different sample IDs**

---

## COMMAND 5: Save Training Sample (using local files)
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

---

## COMMAND 6A: Train Model (Using Script - DEFAULT)
```powershell
cd c:\stylesync\ai-wardrobe\backend
python train_tryon.py
```
Uses default: epochs=5, batch_size=2, learning_rate=0.001

---

## COMMAND 6B: Train Model (Using Script - CUSTOM)
```powershell
cd c:\stylesync\ai-wardrobe\backend
# Edit train_tryon.py manually to change epochs, batch_size, learning_rate

# OR use the PowerShell wrapper:
& c:\stylesync\ai-wardrobe\backend\train_model.ps1 -Epochs 30 -BatchSize 4 -LearningRate 0.0005
```

---

## COMMAND 6C: Train Model (Using API)
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

---

## COMMAND 7: Check if Model Trained Successfully
```powershell
Test-Path "c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth"
```
Returns: True/False

---

## COMMAND 8: Test Trained Model with Prediction
```powershell
$predictionForm = @{
    user_id = "user1"
    body_image_url = "https://example.com/body.jpg"
    clothing_image_url = "https://example.com/shirt.jpg"
}

$response = Invoke-WebRequest -Uri "http://localhost:8000/api/tryon/predict" `
    -Method POST `
    -Form $predictionForm

$response.Content | ConvertFrom-Json
```
Look for: `"model": "trained"` in response

---

## COMMAND 9: Check Training Dataset
```powershell
Get-Content "c:\stylesync\ai-wardrobe\backend\tryon_dataset\samples.json" | ConvertFrom-Json | Measure-Object
```
Shows count of collected samples

---

## COMMAND 10: View Training Samples
```powershell
Get-ChildItem "c:\stylesync\ai-wardrobe\backend\tryon_dataset\images\" -Recurse
```
Lists all collected sample images

---

## RECOMMENDED HYPERPARAMETERS

### Quick Test (5 minutes)
```
epochs: 5
batch_size: 2
learning_rate: 0.001
```

### Good Results (30 minutes)
```
epochs: 30
batch_size: 4
learning_rate: 0.0005
```

### Best Results (60+ minutes)
```
epochs: 50
batch_size: 4
learning_rate: 0.0005
```

---

## COMPLETE WORKFLOW

### Terminal 1:
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\.venv\Scripts\Activate.ps1)
cd c:\stylesync\ai-wardrobe\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2:
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\.venv\Scripts\Activate.ps1)
cd c:\stylesync\ai-wardrobe\backend
pip install -r requirements.txt

# Collect 20-50 samples using COMMAND 4 or 5

# Train model
& c:\stylesync\ai-wardrobe\backend\train_model.ps1 -Epochs 30 -BatchSize 4 -LearningRate 0.0005

# Verify with COMMAND 8
```

---

## ERROR SOLUTIONS

### Error: "No try-on dataset found"
→ Run COMMAND 4 or 5 to save samples first

### Error: "torch not installed"  
→ Run: `pip install torch torchvision`

### Error: "Port 8000 already in use"
→ Run: `uvicorn main:app --reload --host 0.0.0.0 --port 8001`

### Error: Model showing "fallback" instead of "trained"
→ Check: `Test-Path c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth`
→ If not found, re-run training
→ Restart backend server
