"""
CatVTON Virtual Try-On Service
Integrates CatVTON model for high-quality image-based virtual try-on
Reference: https://github.com/Zheng-Chong/CatVTON
"""

import torch
import cv2
import numpy as np
from pathlib import Path
from PIL import Image
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Model cache directory
MODELS_CACHE_DIR = Path.home() / ".cache" / "catvton_models"
MODELS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class CatVTONModel:
    """
    Wrapper for CatVTON model inference.
    Handles model loading, preprocessing, and inference.
    """

    def __init__(self, device: Optional[str] = None, use_fp16: bool = True):
        """
        Initialize CatVTON model.

        Args:
            device: torch device ('cuda', 'cpu', or None for auto-detection)
            use_fp16: Use half precision (fp16) for memory efficiency
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = use_fp16 and torch.cuda.is_available()
        self.model = None
        self.unet = None
        self.vae = None
        self.text_encoder = None
        self.tokenizer = None
        self.scheduler = None
        logger.info(f"CatVTON initialized with device: {self.device}, fp16: {self.use_fp16}")

    def _check_imports(self):
        """Check if required packages are available."""
        try:
            from diffusers import StableDiffusionInpaintPipeline, DDIMScheduler
            from transformers import CLIPTokenizer, CLIPTextModel
            return True
        except ImportError as e:
            logger.error(f"Missing required packages for CatVTON: {e}")
            return False

    def load_model(self):
        """Load CatVTON model from HuggingFace."""
        try:
            from diffusers import StableDiffusionInpaintPipeline, DDIMScheduler

            model_id = "zhengchong/CatVTON"
            logger.info(f"Loading CatVTON model from {model_id}...")

            # Load base inpainting model
            pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                "runwayml/stable-diffusion-inpainting",
                torch_dtype=torch.float16 if self.use_fp16 else torch.float32,
                cache_dir=str(MODELS_CACHE_DIR),
            )

            # Load CatVTON weights
            logger.info("Loading CatVTON weights...")
            from huggingface_hub import hf_hub_download
            catvton_path = hf_hub_download(
                repo_id=model_id,
                filename="catvton_unet.safetensors",
                cache_dir=str(MODELS_CACHE_DIR),
            )

            # Load into pipeline
            from safetensors.torch import load_file
            state_dict = load_file(catvton_path)

            # Load the CatVTON weights into the UNet model
            pipeline.unet.load_state_dict(state_dict, strict=False)
            pipeline.to(self.device)

            if self.use_fp16:
                pipeline.enable_attention_slicing()

            self.model = pipeline
            logger.info("CatVTON model loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load CatVTON model: {e}")
            return False

    def _preprocess_image(self, image: Image.Image, size: Tuple[int, int] = (768, 1024)) -> Image.Image:
        """
        Preprocess image for model input.

        Args:
            image: PIL Image
            size: Target size (width, height)

        Returns:
            Preprocessed PIL Image
        """
        # Resize maintaining aspect ratio
        image = image.convert("RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)

        # Create white background
        background = Image.new("RGB", size, (255, 255, 255))
        offset = ((size[0] - image.width) // 2, (size[1] - image.height) // 2)
        background.paste(image, offset)

        return background

    def _generate_mask(self, image: Image.Image) -> Image.Image:
        """
        Generate clothing mask using simple heuristics.
        For production, consider using SCHP or DensePose.

        Args:
            image: PIL Image of clothing

        Returns:
            Mask image
        """
        try:
            import cv2
            import numpy as np

            # Convert to HSV for better color detection
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2HSV)

            # Create mask by detecting non-white areas (clothing)
            lower_white = np.array([0, 0, 200])
            upper_white = np.array([180, 30, 255])
            mask = cv2.inRange(img_cv, lower_white, upper_white)

            # Invert (white areas become black, clothing becomes white)
            mask = 255 - mask

            # Morphological operations to clean up
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

            return Image.fromarray(mask)

        except Exception as e:
            logger.warning(f"Failed to generate mask: {e}, using white mask")
            return Image.new("L", image.size, 255)

    def infer(
        self,
        person_image: Image.Image,
        clothing_image: Image.Image,
        num_inference_steps: int = 20,
        guidance_scale: float = 7.5,
    ) -> Image.Image:
        """
        Run CatVTON inference.

        Args:
            person_image: PIL Image of person
            clothing_image: PIL Image of clothing
            num_inference_steps: Number of diffusion steps
            guidance_scale: Classifier-free guidance scale

        Returns:
            Generated try-on image
        """
        if not self._check_imports():
            raise ImportError("CatVTON dependencies not installed. Run: pip install -r requirements.txt")

        if self.model is None:
            self.load_model()

        try:
            # Preprocess images
            person = self._preprocess_image(person_image, size=(768, 1024))
            clothing = self._preprocess_image(clothing_image, size=(768, 1024))

            # Generate mask for clothing
            mask = self._generate_mask(clothing)

            logger.info(f"Running CatVTON inference with {num_inference_steps} steps...")

            # Run inference
            with torch.no_grad():
                result = self.model(
                    prompt="a person wearing the clothing",
                    image=person,
                    mask_image=mask,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                )

            return result.images[0]

        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise


def create_catvton_model(device: Optional[str] = None, use_fp16: bool = True) -> CatVTONModel:
    """
    Factory function to create and load CatVTON model.

    Args:
        device: torch device
        use_fp16: Use half precision

    Returns:
        Loaded CatVTONModel instance
    """
    model = CatVTONModel(device=device, use_fp16=use_fp16)
    model.load_model()
    return model


# Global model instance (lazy-loaded)
_catvton_instance = None


def get_catvton_model() -> Optional[CatVTONModel]:
    """Get or create global CatVTON model instance."""
    global _catvton_instance

    if _catvton_instance is None:
        try:
            _catvton_instance = create_catvton_model()
        except Exception as e:
            logger.error(f"Failed to initialize CatVTON model: {e}")
            return None

    return _catvton_instance


def generate_tryon_with_catvton(
    person_image: Image.Image,
    clothing_image: Image.Image,
    use_fp16: bool = True,
) -> Optional[Image.Image]:
    """
    Generate virtual try-on using CatVTON model.

    Args:
        person_image: PIL Image of person
        clothing_image: PIL Image of clothing
        use_fp16: Use half precision

    Returns:
        Generated try-on image or None if failed
    """
    try:
        model = get_catvton_model()
        if model is None:
            logger.error("CatVTON model not available")
            return None

        result = model.infer(person_image, clothing_image)
        return result

    except Exception as e:
        logger.error(f"CatVTON generation failed: {e}")
        return None
