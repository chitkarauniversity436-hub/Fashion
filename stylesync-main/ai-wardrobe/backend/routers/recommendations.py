from fastapi import APIRouter, HTTPException, Query

from models.schemas import OpenAIRecommendationRequest, OutfitMatchRequest, WardrobeUploadRequest, WishlistRequest
from services.openai_service import get_outfit_recommendation
from services.recommendation_service import build_outfit_matches
from services.supabase_service import (
    add_wardrobe_item,
    get_wardrobe,
    delete_wardrobe_item,
    get_wishlist,
    add_to_wishlist,
    remove_from_wishlist,
)

router = APIRouter()


@router.post("/wardrobe/items")
async def create_wardrobe_item(req: WardrobeUploadRequest):
    try:
        item = add_wardrobe_item(req.model_dump())
        return {"status": "saved", "item": item}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/wardrobe/items")
async def list_wardrobe_items(user_id: str = Query(...)):
    try:
        items = get_wardrobe(user_id)
        return {"items": items}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.delete("/wardrobe/items/{item_id}")
async def remove_wardrobe_item(item_id: str, user_id: str = Query(...)):
    try:
        success = delete_wardrobe_item(item_id, user_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to delete wardrobe item")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/recommendations/outfit")
async def recommend_outfit(req: OutfitMatchRequest):
    try:
        result = build_outfit_matches(
            user_id=req.user_id,
            occasion=req.occasion,
            category=req.category,
            gender=req.gender,
            primary_color=req.primary_color,
            tags=req.tags,
            limit=req.limit,
            exclude_item_id=req.exclude_item_id,
        )
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/recommendations/openai")
async def recommend_outfit_openai(req: OpenAIRecommendationRequest):
    try:
        result = get_outfit_recommendation(
            wardrobe=req.wardrobe,
            query=req.query,
            occasion=req.occasion,
            gender=req.gender,
            style=req.style,
            weather=req.weather,
            product_metadata=req.product_metadata,
            limit=req.limit,
        )
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/wishlist")
async def list_wishlist(user_id: str = Query(...)):
    try:
        products = get_wishlist(user_id)
        return {"products": products}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/wishlist")
async def create_wishlist_item(req: WishlistRequest):
    try:
        item = add_to_wishlist(req.user_id, req.product_id)
        return {"status": "saved", "item": item}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.delete("/wishlist/{product_id}")
async def remove_wishlist_item(product_id: str, user_id: str = Query(...)):
    try:
        success = remove_from_wishlist(user_id, product_id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to remove from wishlist")
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
