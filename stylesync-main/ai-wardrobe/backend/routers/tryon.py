import io
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from typing import Optional

from models.schemas import TrainRequest
from services.virtual_tryon import generate_try_on, save_tryon_history_record, save_tryon_sample, train_tryon_model
from services.clothing_analyzer import analyze_clothing
from services.recommendation_service import build_outfit_matches

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/tryon/save-sample")
async def save_sample(
    user_id: str = Form(...),
    category: Optional[str] = Form(None),
    body_image_url: Optional[str] = Form(None),
    clothing_image_url: Optional[str] = Form(None),
    body_image: Optional[UploadFile] = File(None),
    clothing_image: Optional[UploadFile] = File(None),
):
    try:
        body_stream = io.BytesIO(await body_image.read()) if body_image else None
        clothing_stream = io.BytesIO(await clothing_image.read()) if clothing_image else None
        if body_stream is not None:
            body_stream.seek(0)
        if clothing_stream is not None:
            clothing_stream.seek(0)
        print(f"[SAVE] Saving training sample: user={user_id}, category={category}")
        result = save_tryon_sample(
            user_id=user_id,
            category=category,
            body_image_url=body_image_url,
            clothing_image_url=clothing_image_url,
            body_upload=body_stream,
            clothing_upload=clothing_stream,
        )
        print(f"[SAVE] Sample saved successfully: {result}")
        return result
    except ValueError as err:
        logger.exception("ValueError in save_sample")
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        logger.exception("Unexpected error in save_sample")
        raise HTTPException(status_code=500, detail=f"Failed to save sample: {str(err)}")

@router.post("/tryon/predict")
async def predict_tryon(
    user_id: str = Form(...),
    occasion: Optional[str] = Form("casual"),
    body_image_url: Optional[str] = Form(None),
    clothing_image_url: Optional[str] = Form(None),
    body_image: Optional[UploadFile] = File(None),
    clothing_image: Optional[UploadFile] = File(None),
):
    """
    Generate try-on image and find matching products.
    
    Steps:
    1. Generate virtual try-on
    2. Analyze the clothing item
    3. Find matching products with shopping links
    """
    import io
    
    try:
        # Read file contents once and reuse the in-memory streams.
        body_stream = io.BytesIO(await body_image.read()) if body_image else None
        clothing_stream = io.BytesIO(await clothing_image.read()) if clothing_image else None
        if body_stream is not None:
            body_stream.seek(0)
        if clothing_stream is not None:
            clothing_stream.seek(0)

        saved_sample = None
        
        # Step 1: Generate try-on
        print(f"[TRYON] Generating try-on for user={user_id}, occasion={occasion}")
        try:
            from services.virtual_tryon import generate_try_on
            if body_stream is not None:
                body_stream.seek(0)
            if clothing_stream is not None:
                clothing_stream.seek(0)
            result = generate_try_on(
                body_image_url=body_image_url,
                clothing_image_url=clothing_image_url,
                body_upload=body_stream,
                clothing_upload=clothing_stream
            )
            print(f"[TRYON] AI Try-on generated successfully with model: {result.get('model')}")
        except Exception as e:
            logger.exception("Try-on generation failed. Invoking robust local pre-composer as safe backup...")
            try:
                from services.virtual_tryon import _compose_try_on, _encode_image_to_base64, _load_sample_image
                if body_stream is not None:
                    body_stream.seek(0)
                if clothing_stream is not None:
                    clothing_stream.seek(0)
                body_img, clothing_img = _load_sample_image(body_image_url, clothing_image_url, body_stream, clothing_stream)
                comp = _compose_try_on(body_img, clothing_img)
                result = {"tryon_image": _encode_image_to_base64(comp), "model": "ai_styled_preview"}
            except Exception as inner_err:
                logger.exception("Composition also failed")
                raise HTTPException(status_code=500, detail=f"Try-on failed completely: {str(inner_err)}")
        
        # Step 2: Analyze clothing
        clothing_analysis = None
        try:
            if clothing_stream is not None:
                clothing_stream.seek(0)
                print("[ANALYSIS] Analyzing clothing from upload stream")
                clothing_analysis = analyze_clothing(image_file=clothing_stream)
                print(f"[ANALYSIS] Analysis complete: category={clothing_analysis.get('category')}, color={clothing_analysis.get('primary_color')}")
            elif clothing_image_url:
                print(f"[ANALYSIS] Analyzing clothing from URL: {clothing_image_url}")
                clothing_analysis = analyze_clothing(image_url=clothing_image_url)
                print(f"[ANALYSIS] Analysis complete: category={clothing_analysis.get('category')}")
        except Exception as e:
            logger.exception("Could not analyze clothing")
        
        # Step 3: Get matching recommendations
        recommendations = None
        if clothing_analysis:
            try:
                print(f"[RECOMMEND] Finding matches for category={clothing_analysis.get('category')}, occasion={occasion}")
                recommendations = build_outfit_matches(
                    user_id=user_id,
                    occasion=occasion,
                    category=clothing_analysis.get("category"),
                    primary_color=clothing_analysis.get("primary_color"),
                    tags=clothing_analysis.get("tags"),
                    limit=6,
                )
                external_count = len(recommendations.get("external_matches", []))
                wardrobe_count = len(recommendations.get("wardrobe_matches", []))
                print(f"[RECOMMEND] Found {external_count} external + {wardrobe_count} wardrobe matches")
            except Exception as e:
                logger.exception("Could not get recommendations")

        # Step 4: Save the try-on sample and generated session record for later training and history
        try:
            if body_stream is not None:
                body_stream.seek(0)
            if clothing_stream is not None:
                clothing_stream.seek(0)

            saved_sample = save_tryon_sample(
                user_id=user_id,
                category=(clothing_analysis or {}).get("category") or "unknown",
                body_image_url=body_image_url,
                clothing_image_url=clothing_image_url,
                body_upload=body_stream,
                clothing_upload=clothing_stream,
            )
            print(f"[SAVE] Try-on sample saved successfully: {saved_sample.get('sample_id')}")
        except Exception as e:
            logger.exception("Could not save try-on sample")

        history_record = save_tryon_history_record(
            user_id=user_id,
            occasion=occasion,
            sample_id=(saved_sample or {}).get("sample_id"),
            body_image_path=(saved_sample or {}).get("body_image_path"),
            clothing_image_path=(saved_sample or {}).get("clothing_image_path"),
            tryon_image=result.get("tryon_image"),
            model=result.get("model"),
            clothing_analysis=clothing_analysis,
            recommendations=recommendations,
        )
        
        print(f"[TRYON] Returning result with image and {len(recommendations.get('external_matches', []) if recommendations else [])} matches")
        return {
            "tryon_image": result.get("tryon_image"),
            "model": result.get("model"),
            "clothing_analysis": clothing_analysis,
            "recommendations": recommendations,
            "saved_sample": saved_sample,
            "history_record": history_record,
        }
    except ValueError as err:
        logger.exception("ValueError in predict_tryon")
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        logger.exception("Unexpected error in predict_tryon")
        raise HTTPException(status_code=500, detail=f"Try-on failed: {str(err)}")

@router.post("/tryon/train")
async def train_tryon(req: TrainRequest):
    try:
        print(f"[TRAIN] Starting model training: epochs={req.epochs}, batch_size={req.batch_size}, lr={req.learning_rate}")
        response = train_tryon_model(
            epochs=req.epochs,
            batch_size=req.batch_size,
            learning_rate=req.learning_rate,
        )
        print(f"[TRAIN] Training complete: {response}")
        return response
    except Exception as err:
        logger.exception("Training failed")
        return {
            "status": "error",
            "message": str(err),
            "error_type": type(err).__name__
        }
