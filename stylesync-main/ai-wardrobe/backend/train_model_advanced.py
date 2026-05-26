#!/usr/bin/env python3
"""
Advanced Model Training Script for AI Wardrobe
Usage: python train_model_advanced.py --epochs 30 --batch-size 4 --learning-rate 0.0005
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from services.virtual_tryon import train_tryon_model


def create_logger(log_dir: Path):
    """Create a simple logger that writes to both console and file"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    class Logger:
        def __init__(self, filepath):
            self.filepath = filepath
            
        def log(self, message: str, level: str = "INFO"):
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            formatted = f"[{timestamp}] [{level}] {message}"
            print(formatted)
            with open(self.filepath, "a") as f:
                f.write(formatted + "\n")
                
        def info(self, message: str):
            self.log(message, "INFO")
            
        def success(self, message: str):
            self.log(message, "SUCCESS")
            
        def error(self, message: str):
            self.log(message, "ERROR")
            
        def warning(self, message: str):
            self.log(message, "WARNING")
    
    return Logger(log_file)


def validate_dataset(samples_file: Path, logger):
    """Validate that training dataset exists and has samples from Supabase"""
    logger.info("Validating dataset records from Supabase...")
    
    try:
        from services.virtual_tryon import _load_sample_records
        samples = _load_sample_records()
        
        sample_count = len(samples)
        if sample_count == 0:
            logger.error("No training samples found in Supabase. Open the Try On page and generate a try-on once.")
            return False, 0
        
        logger.success(f"Dataset validated. Found {sample_count} samples in Supabase")
        
        # Show sample distribution by category
        categories = {}
        for sample in samples:
            cat = sample.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        logger.info("Sample distribution by category:")
        for cat, count in categories.items():
            logger.info(f"  - {cat}: {count}")
        
        return True, sample_count
    
    except Exception as e:
        logger.error(f"Error validating dataset: {e}")
        return False, 0


def check_dependencies(logger):
    """Check if all required packages are installed"""
    logger.info("Checking dependencies...")
    
    dependencies = {
        "torch": "PyTorch",
        "torchvision": "TorchVision",
        "PIL": "Pillow",
        "numpy": "NumPy"
    }
    
    missing = []
    for package, name in dependencies.items():
        try:
            __import__(package)
            logger.info(f"  ✓ {name} installed")
        except ImportError:
            logger.warning(f"  ✗ {name} NOT installed")
            missing.append(package)
    
    if missing:
        logger.error(f"Missing packages: {', '.join(missing)}")
        logger.info(f"Install with: pip install {' '.join(missing)}")
        return False
    
    logger.success("All dependencies are installed")
    return True


def train_model(epochs: int, batch_size: int, learning_rate: float, logger):
    """Train the model with specified hyperparameters"""
    logger.info(f"Starting model training...")
    logger.info(f"  - Epochs: {epochs}")
    logger.info(f"  - Batch Size: {batch_size}")
    logger.info(f"  - Learning Rate: {learning_rate}")
    logger.info("")
    
    try:
        result = train_tryon_model(
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate
        )
        
        if result.get("status") == "trained":
            logger.success("✓ Model training completed successfully!")
            logger.info(f"  - Epochs completed: {result.get('epochs')}")
            logger.info(f"  - Samples used: {result.get('samples')}")
            logger.info(f"  - Model saved to: {result.get('model_path')}")
            return True
        else:
            logger.error(f"Training failed: {result.get('message', 'Unknown error')}")
            return False
    
    except Exception as e:
        logger.error(f"Exception during training: {e}")
        return False


def verify_model(model_path: Path, logger):
    """Verify that the model file was created"""
    logger.info("Verifying trained model...")
    
    if not model_path.exists():
        logger.error(f"Model file not found: {model_path}")
        return False
    
    try:
        import torch
        state_dict = torch.load(model_path, map_location="cpu")
        logger.success(f"✓ Model file is valid")
        logger.info(f"  - File size: {model_path.stat().st_size / (1024*1024):.2f} MB")
        logger.info(f"  - Parameters: {len(state_dict)} layer groups")
        return True
    except Exception as e:
        logger.error(f"Model file is corrupted: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Train the virtual try-on model for AI Wardrobe",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python train_model_advanced.py
  python train_model_advanced.py --epochs 50 --batch-size 8 --learning-rate 0.0001
  python train_model_advanced.py --epochs 30 --batch-size 4
        """
    )
    
    parser.add_argument(
        "--epochs",
        type=int,
        default=30,
        help="Number of training epochs (default: 30)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=4,
        help="Batch size for training (default: 4)"
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.0005,
        help="Learning rate for optimizer (default: 0.0005)"
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip dataset validation before training"
    )
    parser.add_argument(
        "--log-dir",
        type=Path,
        default=BACKEND_DIR / "logs",
        help="Directory to save training logs (default: ./logs)"
    )
    
    args = parser.parse_args()
    
    # Setup logger
    logger = create_logger(args.log_dir)
    
    logger.info("=" * 60)
    logger.info("AI Wardrobe Model Training")
    logger.info("=" * 60)
    
    # Check dependencies
    if not check_dependencies(logger):
        logger.error("Cannot proceed without dependencies")
        return 1
    
    logger.info("")
    
    # Validate dataset
    samples_file = BACKEND_DIR / "tryon_dataset" / "samples.json"
    if not args.skip_validation:
        is_valid, sample_count = validate_dataset(samples_file, logger)
        if not is_valid:
            logger.error("Dataset validation failed")
            return 1
        logger.info("")
    else:
        logger.warning("Skipping dataset validation")
        logger.info("")
    
    # Train model
    success = train_model(args.epochs, args.batch_size, args.learning_rate, logger)
    if not success:
        logger.error("Training failed")
        return 1
    
    logger.info("")
    
    # Verify model
    model_path = BACKEND_DIR / "tryon_dataset" / "tryon_model.pth"
    if verify_model(model_path, logger):
        logger.success("Training pipeline completed successfully!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Start the backend server:")
        logger.info("   uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        logger.info("2. Test with a prediction request to /api/tryon/predict")
        logger.info("3. Verify response includes: \"model\": \"trained\"")
        logger.info("")
        logger.info(f"Training log saved to: {args.log_dir}")
        return 0
    else:
        logger.error("Model verification failed")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error: {e}", file=sys.stderr)
        sys.exit(1)
