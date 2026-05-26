# MODEL TRAINING - COMPLETE SETUP SUMMARY

Created 4 comprehensive training resources for your AI Wardrobe project.

---

## 📍 WHERE TO FIND EVERYTHING

All files are in your project root: `c:\stylesync\ai-wardrobe\`

| File | Purpose | Location |
|------|---------|----------|
| **TRAINING_GUIDE.md** | Complete step-by-step guide with explanations | `ai-wardrobe/TRAINING_GUIDE.md` |
| **QUICK_COMMANDS.md** | Copy-paste ready commands (easiest to use) | `ai-wardrobe/QUICK_COMMANDS.md` |
| **train_model.ps1** | Automated PowerShell script | `ai-wardrobe/backend/train_model.ps1` |
| **train_model_advanced.py** | Advanced Python script with CLI args & logging | `ai-wardrobe/backend/train_model_advanced.py` |

---

## 🚀 EASIEST WAY TO TRAIN (Copy-paste these exactly)

### Terminal 1 - Start Backend Server
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\.venv\Scripts\Activate.ps1)
cd c:\stylesync\ai-wardrobe\backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
(Leave this running)

### Terminal 2 - Collect Samples & Train
```powershell
cd c:\stylesync
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\.venv\Scripts\Activate.ps1)
cd c:\stylesync\ai-wardrobe\backend

# Collect 20 samples using QUICK_COMMANDS.md COMMAND 4
# Then train:

python train_model_advanced.py --epochs 30 --batch-size 4 --learning-rate 0.0005
```

---

## 📋 ALL AVAILABLE COMMANDS

See **QUICK_COMMANDS.md** for copy-paste versions of:

1. **Setup environment** - Activate Python venv
2. **Install dependencies** - pip install torch, fastapi, etc.
3. **Start backend** - uvicorn server on port 8000
4. **Save sample (URLs)** - Collect training data from URLs
5. **Save sample (files)** - Collect training data from local files
6. **Train (Script)** - Simple python train_tryon.py
7. **Train (API)** - POST endpoint for training
8. **Check model** - Verify tryon_model.pth exists
9. **Test model** - Call /api/tryon/predict to verify training worked
10. **View dataset** - Check collected samples

---

## 🛠️ THREE WAYS TO TRAIN

### Option 1: Simple Script (Beginner)
```powershell
cd c:\stylesync\ai-wardrobe\backend
python train_tryon.py  # Uses defaults: 5 epochs, batch 2, lr 0.001
```

### Option 2: PowerShell Wrapper (Intermediate)
```powershell
cd c:\stylesync\ai-wardrobe\backend
& c:\stylesync\ai-wardrobe\backend\train_model.ps1 -Epochs 30 -BatchSize 4 -LearningRate 0.0005
```

### Option 3: Advanced Python CLI (Best)
```powershell
cd c:\stylesync\ai-wardrobe\backend
python train_model_advanced.py --epochs 50 --batch-size 4 --learning-rate 0.0005 --log-dir ./logs
```
✓ Best logging & validation
✓ Saves training logs to file
✓ CLI argument support
✓ Dataset validation

---

## 📊 RECOMMENDED HYPERPARAMETERS

Based on your hardware, use these settings:

### Low GPU Memory (2-4GB)
```
epochs: 20
batch_size: 2
learning_rate: 0.001
```

### Medium GPU Memory (6-8GB)
```
epochs: 30
batch_size: 4
learning_rate: 0.0005
```

### High GPU Memory (10GB+)
```
epochs: 50
batch_size: 8
learning_rate: 0.0005
```

---

## 🔄 COMPLETE WORKFLOW

```
1. Terminal 1: Start backend server (see above)
   ↓
2. Terminal 2: Collect 20+ training samples
   - Use QUICK_COMMANDS.md COMMAND 4 or 5
   - Save samples to: backend/tryon_dataset/samples.json
   ↓
3. Terminal 2: Train model
   - Run one of the three training options above
   - Takes 5-120 minutes depending on settings
   ✓ Creates: backend/tryon_dataset/tryon_model.pth
   ↓
4. Terminal 2: Verify training worked
   - Use QUICK_COMMANDS.md COMMAND 8
   - Look for: "model": "trained" in response
   ↓
5. Done! Model is now being used for predictions
```

---

## ✅ HOW TO VERIFY TRAINING WORKED

### Check 1: Model file exists
```powershell
Test-Path "c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth"
# Should return: True
```

### Check 2: Model file has content
```powershell
(Get-Item "c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth").Length
# Should be > 1000000 bytes (1MB+)
```

### Check 3: Model is actually being used
```powershell
# Call POST /api/tryon/predict with any body+clothing images
# Response should include: "model": "trained"
# (instead of "model": "fallback")
```

---

## 🐛 TROUBLESHOOTING

### Problem: "No try-on dataset found"
→ Solution: Collect samples first using QUICK_COMMANDS.md COMMAND 4

### Problem: "torch not installed"
→ Solution: Run `pip install torch torchvision` in backend folder

### Problem: Model not being used (getting "fallback")
→ Solution:
1. Check model file exists: `Test-Path c:\stylesync\ai-wardrobe\backend\tryon_dataset\tryon_model.pth`
2. Re-run training if not found
3. Restart the backend server

### Problem: "Port 8000 already in use"
→ Solution: Run on different port: `uvicorn main:app --reload --host 0.0.0.0 --port 8001`

### Problem: Training is very slow
→ Check: Do you have GPU support?
→ For CPU only: Reduce batch_size to 2, epochs to 10

---

## 📁 FILES CREATED BY TRAINING

```
c:\stylesync\ai-wardrobe\backend\
├── tryon_dataset/
│   ├── samples.json           ← Training metadata
│   ├── tryon_model.pth        ← Trained model (created after training)
│   └── images/
│       ├── body_xxxxx.png     ← Sample body images
│       └── clothing_xxxxx.png ← Sample clothing images
├── train_tryon.py             ← Original simple script
├── train_model.ps1            ← New PowerShell wrapper
├── train_model_advanced.py    ← New advanced Python script
└── logs/                       ← Training logs (created by advanced.py)
    └── training_YYYYMMDD_HHMMSS.log
```

---

## 🎯 NEXT STEPS

1. **Read TRAINING_GUIDE.md** for detailed explanations
2. **Open QUICK_COMMANDS.md** and start collecting samples
3. **Run training** using one of the 3 options above
4. **Test predictions** to verify model is working
5. **Iterate**: Collect more samples → retrain for better results

---

## 📞 QUICK REFERENCE

- **Backend location**: `c:\stylesync\ai-wardrobe\backend\`
- **API server**: `http://localhost:8000`
- **API docs**: `http://localhost:8000/docs` (when running)
- **Model training time**: 5-120 minutes (depends on epochs & samples)
- **Min samples to train**: 10
- **Recommended samples**: 30-50
- **Expected model size**: 2-10 MB

---

Good luck with training! 🚀
