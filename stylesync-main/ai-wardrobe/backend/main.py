import sys
import huggingface_hub
# Mock cached_download in huggingface_hub to prevent import errors in older diffusers versions
if not hasattr(huggingface_hub, "cached_download"):
    try:
        import huggingface_hub.file_download
        huggingface_hub.cached_download = huggingface_hub.file_download.hf_hub_download
        sys.modules["huggingface_hub"].cached_download = huggingface_hub.file_download.hf_hub_download
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers.clothing import router as clothing_router
from routers.outfit_score import router as outfit_score_router
from routers.products import router as products_router
from routers.recommendations import router as recommendations_router
from routers.tryon import router as tryon_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://localhost:8083",
        "http://127.0.0.1:8083",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clothing_router, prefix="/api")
app.include_router(outfit_score_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(tryon_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "AI Wardrobe Backend Running"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-wardrobe-backend"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)