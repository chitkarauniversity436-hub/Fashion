from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator 

# //not require


class ClothingRequest(BaseModel):
    image_url: HttpUrl
    user_id: str


class OutfitRequest(BaseModel):
    image_url: HttpUrl
    user_id: str


class TrainRequest(BaseModel):
    epochs: int = Field(default=5, ge=1, le=100)
    batch_size: int = Field(default=2, ge=1, le=128)
    learning_rate: float = Field(default=1e-3, gt=0)


class WardrobeUploadRequest(BaseModel):
    user_id: str
    image_url: HttpUrl
    category: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_colors: List[str] = Field(default_factory=list)
    occasion: List[str] = Field(default_factory=list)
    season: List[str] = Field(default_factory=list)
    detected_tags: List[str] = Field(default_factory=list)
    brand: Optional[str] = None
    fabric: Optional[str] = None

    @field_validator("secondary_colors", "occasion", "season", "detected_tags")
    @classmethod
    def remove_duplicates(cls, value: List[str]) -> List[str]:
        return list(set(value))


class OutfitMatchRequest(BaseModel):
    user_id: str
    occasion: str
    category: Optional[str] = None
    gender: Optional[Literal["male", "female", "unisex"]] = None
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
    budget: Optional[float] = Field(default=None, gt=0)


class WishlistRequest(BaseModel):
    user_id: str
    product_id: str
    notes: Optional[str] = None
