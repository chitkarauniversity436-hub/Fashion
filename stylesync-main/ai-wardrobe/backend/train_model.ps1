# AI Wardrobe Model Training Script
# This script automates the training process for the virtual try-on model

param(
    [int]$Epochs = 30,
    [int]$BatchSize = 4,
    [double]$LearningRate = 0.0005,
    [switch]$SkipDependencies = $false
)

function Write-Header {
    param([string]$Message)
    Write-Host "`n================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Set working directory
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Error "Backend directory not found: $BackendDir"
    exit 1
}

Write-Header "AI Wardrobe Model Training Script"
Write-Host "Epochs: $Epochs" -ForegroundColor White
Write-Host "Batch Size: $BatchSize" -ForegroundColor White
Write-Host "Learning Rate: $LearningRate" -ForegroundColor White

# Step 1: Activate virtual environment
Write-Header "Step 1: Activating Python Virtual Environment"
try {
    (Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -ErrorAction SilentlyContinue) | Out-Null
    & "$($env:USERPROFILE)\.venv\Scripts\Activate.ps1" 2>$null
    Write-Success "Virtual environment activated"
} catch {
    Write-Warning "Could not activate virtual environment: $_"
}

# Step 2: Install dependencies (optional)
if (-not $SkipDependencies) {
    Write-Header "Step 2: Installing Dependencies"
    Push-Location $BackendDir
    try {
        pip install -q -r requirements.txt
        Write-Success "Dependencies installed"
    } catch {
        Write-Error "Failed to install dependencies: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Step 3: Check for samples
Write-Header "Step 3: Checking Training Dataset"
$SamplesFile = "$BackendDir\tryon_dataset\samples.json"
if (-not (Test-Path $SamplesFile)) {
    Write-Error "No training samples found!"
    Write-Warning "Please collect samples first using the /api/tryon/save-sample endpoint"
    Write-Host "Expected location: $SamplesFile"
    exit 1
}

try {
    $SamplesData = Get-Content $SamplesFile | ConvertFrom-Json
    $SampleCount = $SamplesData.Count
    if ($SampleCount -eq 0) {
        Write-Error "No samples in dataset!"
        exit 1
    }
    Write-Success "Found $SampleCount training samples"
} catch {
    Write-Error "Failed to read samples.json: $_"
    exit 1
}

# Step 4: Train model
Write-Header "Step 4: Training Virtual Try-On Model"
Write-Host "Starting training..." -ForegroundColor Gray

Push-Location $BackendDir

$TrainingScript = @"
import sys
import json
from services.virtual_tryon import train_tryon_model

print("Starting model training...")
result = train_tryon_model(
    epochs=$Epochs,
    batch_size=$BatchSize,
    learning_rate=$LearningRate
)

if result.get("status") == "trained":
    print(f"✓ Training completed successfully!")
    print(f"  Epochs: {result['epochs']}")
    print(f"  Samples: {result['samples']}")
    print(f"  Model saved: {result['model_path']}")
    sys.exit(0)
else:
    print(f"✗ Training failed: {result.get('message', 'Unknown error')}")
    sys.exit(1)
"@

$TrainingScript | python
$TrainingExitCode = $LASTEXITCODE

Pop-Location

if ($TrainingExitCode -eq 0) {
    Write-Success "Model training completed successfully!"
} else {
    Write-Error "Model training failed"
    exit 1
}

# Step 5: Verify model
Write-Header "Step 5: Verifying Trained Model"
$ModelPath = "$BackendDir\tryon_dataset\tryon_model.pth"
if (Test-Path $ModelPath) {
    $ModelSize = (Get-Item $ModelPath).Length / 1MB
    Write-Success "Model file exists"
    Write-Host "Model size: $([Math]::Round($ModelSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Error "Model file not found: $ModelPath"
    exit 1
}

# Summary
Write-Header "Training Complete!"
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start the backend server:" -ForegroundColor White
Write-Host "   cd $BackendDir" -ForegroundColor Gray
Write-Host "   uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "2. Test the model with predictions:" -ForegroundColor White
Write-Host "   POST http://localhost:8000/api/tryon/predict" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "3. Check that response includes: 'model': 'trained'" -ForegroundColor White

Write-Success "All done!"
