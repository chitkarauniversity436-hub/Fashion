from fastapi import APIRouter, HTTPException, File, UploadFile
from typing import Optional
from models.schemas import ClothingRequest
from services.clothing_analyzer import analyze_clothing

router = APIRouter()


@router.post("/analyze-clothing")
def analyze(req: ClothingRequest):
    """Analyze clothing from URL."""
    try:
        result = analyze_clothing(image_url=req.image_url)
        return {
            "category": result.get("category"),
            "colors": result.get("colors"),
            "primary_color": result.get("primary_color"),
            "occasion": result.get("occasion"),
            "season": result.get("season"),
            "tags": result.get("tags"),
            "style": result.get("style"),
            "description": result.get("description"),
            "analysis_method": result.get("analysis_method")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-clothing-upload")
async def analyze_upload(file: UploadFile = File(...)):
    """Analyze clothing from uploaded image."""
    try:
        # Read file content
        content = await file.read()
        
        # Save temporarily
        import tempfile
        import os
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            result = analyze_clothing(image_file=tmp_path)
            return {
                "category": result.get("category"),
                "colors": result.get("colors"),
                "primary_color": result.get("primary_color"),
                "occasion": result.get("occasion"),
                "season": result.get("season"),
                "tags": result.get("tags"),
                "style": result.get("style"),
                "description": result.get("description"),
                "analysis_method": result.get("analysis_method")
            }
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))