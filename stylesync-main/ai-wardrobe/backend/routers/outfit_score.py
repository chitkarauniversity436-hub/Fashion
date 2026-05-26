from fastapi import APIRouter
from models.schemas import OutfitRequest

router = APIRouter()

@router.post("/score-outfit")
def score_outfit(req: OutfitRequest):
    return {
        "score": 82,
        "feedback": "Nice color combination, improve fitting"
    }