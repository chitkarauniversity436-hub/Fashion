from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

class ClothingRequest(BaseModel):
    image_url: str
    user_id: str

class OutfitRequest(BaseModel):
    image_url: str
    user_id: str

class TrainRequest(BaseModel):
    epochs: int = 5
    batch_size: int = 2
    learning_rate: float = 1e-3


class WardrobeUploadRequest(BaseModel):
    user_id: str
    image_url: str
    category: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_colors: List[str] = Field(default_factory=list)
    occasion: List[str] = Field(default_factory=list)
    season: List[str] = Field(default_factory=list)
    detected_tags: List[str] = Field(default_factory=list)


class OutfitMatchRequest(BaseModel):
    user_id: str
    occasion: str
    category: Optional[str] = None
    gender: Optional[str] = None
    primary_color: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    limit: int = Field(default=10, ge=1, le=50)
    exclude_item_id: Optional[str] = None


class OpenAIRecommendationRequest(BaseModel):
    user_id: str
    wardrobe: List[Dict[str, Any]] = Field(default_factory=list)
    query: str
    occasion: Optional[str] = None
    gender: Optional[str] = None
    style: Optional[str] = None
    weather: Optional[str] = None
    product_metadata: Dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(default=6, ge=1, le=20)


class WishlistRequest(BaseModel):
    user_id: str
    product_id: str

