"""
Advanced Virtual Try-On Service using Diffusers, IP-Adapter, and Segformer.
This provides realistic, high-definition try-on capabilities.
"""

import logging
import torch
import numpy as np
from PIL import Image, ImageOps, ImageFilter
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Model cache directory
MODELS_CACHE_DIR = Path.home() / ".cache" / "vton_models"
MODELS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class AdvancedVTONPipeline:
    """
    State-of-the-art Virtual Try-On Pipeline using IP-Adapter for garment feature
    extraction and Segformer for accurate human parsing and masking.
    """

    def __init__(self, device: Optional[str] = None, use_fp16: bool = True):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.use_fp16 = use_fp16 and self.device == "cuda"
        self.dtype = torch.float16 if self.use_fp16 else torch.float32

        # Components
        self.segmentation_processor = None
        self.segmentation_model = None
        self.pipeline = None

        logger.info(f"AdvancedVTON initialized with device: {self.device}, fp16: {self.use_fp16}")

    def _check_imports(self) -> bool:
        try:
            import diffusers
            import transformers
            import peft
            return True
        except ImportError as e:
            logger.error(f"Missing required packages for AdvancedVTON: {e}")
            return False

    def load_models(self) -> bool:
        """Loads all required models (Segformer, Inpainting, IP-Adapter)."""
        if self.pipeline is not None and self.segmentation_model is not None:
            return True

        try:
            from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
            from diffusers import StableDiffusionInpaintPipeline, DDIMScheduler

            logger.info("Loading Segformer for human parsing...")
            # Clothing segmentation model
            seg_model_id = "mattmdjaga/segformer_b2_clothes"
            self.segmentation_processor = SegformerImageProcessor.from_pretrained(
                seg_model_id, cache_dir=str(MODELS_CACHE_DIR)
            )
            self.segmentation_model = SegformerForSemanticSegmentation.from_pretrained(
                seg_model_id, cache_dir=str(MODELS_CACHE_DIR)
            )
            self.segmentation_model.to(self.device)

            logger.info("Loading Stable Diffusion Inpainting pipeline...")
            # Base inpainting model
            pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                "runwayml/stable-diffusion-inpainting",
                torch_dtype=self.dtype,
                cache_dir=str(MODELS_CACHE_DIR),
            )
            
            # Configure scheduler for better quality
            pipeline.scheduler = DDIMScheduler.from_config(pipeline.scheduler.config)

            logger.info("Loading IP-Adapter weights for garment preservation...")
            # Load IP-Adapter
            try:
                pipeline.load_ip_adapter(
                    "h94/IP-Adapter",
                    subfolder="models",
                    weight_name="ip-adapter_sd15.bin",
                    cache_dir=str(MODELS_CACHE_DIR)
                )
                pipeline.set_ip_adapter_scale(1.0)
            except Exception as e:
                logger.warning(f"Failed to load IP-Adapter directly: {e}. Will attempt generation without it if needed, or check diffusers version.")

            # Optimizations for VRAM
            if self.device == "cuda":
                try:
                    # Sequential CPU offload is crucial for low VRAM GPUs (like 4GB RTX 3050)
                    pipeline.enable_sequential_cpu_offload()
                except Exception:
                    pipeline.enable_model_cpu_offload()
                
                pipeline.enable_attention_slicing()
                
                if self.use_fp16:
                    try:
                        pipeline.enable_xformers_memory_efficient_attention()
                    except Exception:
                        pass

            self.pipeline = pipeline
            logger.info("AdvancedVTON models loaded successfully.")
            return True

        except Exception as e:
            logger.error(f"Failed to load AdvancedVTON models: {e}")
            return False

    def _preprocess_image(self, image: Image.Image, size: Tuple[int, int] = (512, 768)) -> Image.Image:
        """Resizes and pads image to target size."""
        image = image.convert("RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)
        
        background = Image.new("RGB", size, (255, 255, 255))
        offset = ((size[0] - image.width) // 2, (size[1] - image.height) // 2)
        background.paste(image, offset)
        return background

    def _generate_agnostic_mask(self, person_image: Image.Image) -> Image.Image:
        """
        Generates a mask hiding the upper body clothing using Segformer.
        White areas = to be inpainted (clothing). Black areas = to keep (face, pants, background).
        """
        import torch.nn.functional as F
        
        inputs = self.segmentation_processor(images=person_image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.segmentation_model(**inputs)
            
        logits = outputs.logits.cpu()
        
        # Resize logits to original image size
        upsampled_logits = F.interpolate(
            logits,
            size=person_image.size[::-1],
            mode="bilinear",
            align_corners=False,
        )
        
        pred_seg = upsampled_logits.argmax(dim=1)[0].numpy()
        
        # mattmdjaga/segformer_b2_clothes labels:
        # 0: Background, 1: Hat, 2: Hair, 3: Sunglasses, 4: Upper-clothes, 5: Skirt, 6: Pants, 
        # 7: Dress, 8: Belt, 9: Left-shoe, 10: Right-shoe, 11: Face, 12: Left-leg, 13: Right-leg, 
        # 14: Left-arm, 15: Right-arm, 16: Bag, 17: Scarf
        
        # We want to mask out upper-clothes (4) and potentially dress (7)
        mask = np.isin(pred_seg, [4, 7]).astype(np.uint8) * 255
        
        mask_img = Image.fromarray(mask, mode="L")
        
        # Slightly dilate the mask to ensure edges are covered smoothly
        mask_img = mask_img.filter(ImageFilter.MaxFilter(5))
        
        return mask_img

    def infer(
        self,
        person_image: Image.Image,
        garment_image: Image.Image,
        num_inference_steps: int = 30,
        guidance_scale: float = 7.5,
    ) -> Image.Image:
        """Runs the virtual try-on inference."""
        if not self._check_imports():
            raise ImportError("AdvancedVTON dependencies not installed.")

        if not self.load_models():
            raise RuntimeError("Failed to load AdvancedVTON models.")

        try:
            # 1. Preprocess images
            # Target 512x768 for stable diffusion 1.5 base models to avoid distortions
            # We will upscale the result back if needed
            target_size = (512, 768)
            person = self._preprocess_image(person_image, size=target_size)
            garment = self._preprocess_image(garment_image, size=target_size)

            # 2. Generate agnostic mask
            logger.info("Generating agnostic mask...")
            mask = self._generate_agnostic_mask(person)

            # 3. Inference
            logger.info(f"Running Inpainting + IP-Adapter inference ({num_inference_steps} steps)...")
            prompt = "A high quality photograph of a person wearing the exact same garment, highly detailed, highly realistic, 4k"
            negative_prompt = "blurry, distorted, deformed, text, watermark, bad anatomy, bad hands, missing fingers"

            with torch.no_grad():
                result = self.pipeline(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    image=person,
                    mask_image=mask,
                    ip_adapter_image=garment,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                )

            output_img = result.images[0]
            
            # Upscale back to 768x1024 (HD) if needed
            hd_output = output_img.resize((768, 1024), Image.Resampling.LANCZOS)
            
            # 4. Sharpen slightly to ensure high crispness
            hd_output = hd_output.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

            return hd_output

        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise
        finally:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()


# Global singleton instance
_advanced_vton_instance = None


def get_advanced_vton_model() -> Optional[AdvancedVTONPipeline]:
    global _advanced_vton_instance
    if _advanced_vton_instance is None:
        try:
            _advanced_vton_instance = AdvancedVTONPipeline()
        except Exception as e:
            logger.error(f"Failed to initialize AdvancedVTON pipeline: {e}")
            return None
    return _advanced_vton_instance


def generate_tryon_with_advanced_pipeline(
    person_image: Image.Image,
    garment_image: Image.Image,
) -> Optional[Image.Image]:
    """Public wrapper to generate try-on using the advanced pipeline."""
    try:
        model = get_advanced_vton_model()
        if model is None:
            return None
        return model.infer(person_image, garment_image)
    except Exception as e:
        logger.error(f"Advanced pipeline generation failed: {e}")
        return None
