import json
from pathlib import Path

from services.virtual_tryon import train_tryon_model, _load_sample_records

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_FILE = BASE_DIR / "tryon_dataset" / "samples.json"


def _load_samples() -> list:
    return _load_sample_records()

if __name__ == "__main__":
    if not _load_samples():
        print("No try-on samples found in Supabase yet. Open the Try On page and generate a try-on once.")
        exit(0)

    print("Starting virtual try-on training...")
    result = train_tryon_model(epochs=5, batch_size=2, learning_rate=1e-3)

    if result.get("status") == "trained":
        print(f"Training completed: {result}")
    else:
        print(f"Training failed: {result}")
