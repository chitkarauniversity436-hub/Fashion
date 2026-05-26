# Try On Feature - Complete Implementation Guide

## Overview
The Try On feature combines AI clothing analysis, virtual try-on visualization, and intelligent product matching to help users find clothes that match their uploaded items.

## Architecture

### Frontend (React/TypeScript)
- **Location**: `src/pages/TryOn.tsx`
- **Flow**:
  1. User uploads body image and clothing image
  2. Selects occasion (casual, formal, party, business, etc.)
  3. Clicks "Generate Try-On"
  4. Results display:
     - Virtual try-on visualization
     - Detected clothing analysis
     - Matching products with shopping links

### Backend (FastAPI/Python)

#### 1. **Clothing Analyzer** (`backend/services/clothing_analyzer.py`)
- **Method**: Uses OpenAI GPT-4 Vision API
- **Input**: Image URL or uploaded file
- **Output**: Detailed clothing analysis
  ```json
  {
    "category": "shirt",
    "colors": ["blue", "white"],
    "primary_color": "blue",
    "occasion": ["casual", "business"],
    "season": ["summer", "spring"],
    "tags": ["cotton", "slim-fit", "casual"],
    "style": "casual business wear",
    "description": "Blue cotton button-up shirt",
    "analysis_method": "gpt-4-vision"
  }
  ```

#### 2. **Virtual Try-On** (`backend/services/virtual_tryon.py`)
- **Fallback Method**: Simple image composition when ML model unavailable
- **ML Method**: PyTorch-based try-on model (if trained)
- **Output**: Base64-encoded PNG of clothing on body

#### 3. **Recommendation Engine** (`backend/services/recommendation_service.py`)
- **Scoring Algorithm**:
  - Category match: +20 points
  - Occasion match: +40 points
  - Color match: +10 points
  - Tag overlap: +8 points per tag (max 24)
- **Data Sources**:
  - Wardrobe items (user's uploaded clothes)
  - Local Supabase products
  - External RapidAPI products
- **Output**: Ranked list of matching products with links

#### 4. **External API Integration** (`backend/services/external_api_service.py`)
- **Source**: RapidAPI Real-Time Product Search
- **Image Handling**: 
  - Fetches product images from API
  - Falls back to placeholder if unavailable
  - Extracts colors from product titles
- **URL Generation**:
  - Direct links when available
  - Google search fallback for offline results

## API Endpoints

### 1. Analyze Clothing (URL)
```
POST /api/analyze-clothing
Content-Type: application/json

{
  "image_url": "https://example.com/shirt.jpg"
}
```

### 2. Analyze Clothing (Upload)
```
POST /api/analyze-clothing-upload
Content-Type: multipart/form-data

file: <binary image data>
```

### 3. Generate Try-On with Recommendations
```
POST /api/tryon/predict
Content-Type: multipart/form-data

user_id: "guest"
occasion: "casual"
body_image: <binary image>
clothing_image: <binary image>
```

**Response**:
```json
{
  "tryon_image": "iVBORw0KGgoAAAANS...",
  "model": "fallback",
  "clothing_analysis": {
    "category": "shirt",
    "colors": ["blue"],
    "primary_color": "blue",
    "occasion": ["casual"],
    "season": ["summer"],
    "tags": ["shirt", "casual"]
  },
  "recommendations": {
    "strategy": "external_fallback",
    "occasion": "casual",
    "wardrobe_matches": [],
    "external_matches": [
      {
        "id": "prod_123",
        "name": "Blue Casual Shirt",
        "brand": "Myntra",
        "price": 1299,
        "image": "https://...",
        "url": "https://myntra.com/...",
        "rating": 4.5,
        "match_score": 45
      }
    ]
  }
}
```

## Image Loading & Issues

### Problem: Images Not Loading
**Causes**:
1. CORS restrictions from image URLs
2. Images blocked by security policies (ORB - Opaque Response Blocking)
3. External APIs returning invalid image URLs

**Solutions**:
1. **Placeholder Fallback**: If image fails, use placeholder
   ```javascript
   onError={(e) => {
     e.currentTarget.src = "https://via.placeholder.com/400x500?text=No+Image";
   }}
   ```

2. **Image Proxy** (Optional): Route images through backend
   ```
   GET /api/image-proxy?url=<encoded-image-url>
   ```

3. **Color Extraction**: Extract colors from product title if image unavailable
   ```python
   _extract_colors_from_title("Blue Cotton Shirt")
   # Returns: ["#0000FF", "#FFFFFF", "#C0C0C0"]
   ```

## Shopping Links

### How Links are Generated

1. **Direct URLs**: Use product page URLs from API
   ```python
   product_page_url = item.get("product_page_url")
   ```

2. **Google Search Fallback**: If no direct URL
   ```python
   product_page_url = f"https://www.google.com/search?q={product_title.replace(' ', '+')}+buy"
   ```

3. **Affiliate Integration** (Future):
   ```python
   affiliate_link = f"https://affiliate.myntra.com/p/{product_id}?ref=stylesync"
   ```

### Displaying Shopping Links in UI

```typescript
{product.url && (
  <a
    href={product.url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-white bg-primary px-3 py-1 rounded-lg hover:bg-primary/90 transition"
  >
    🔗 Buy Now
  </a>
)}
```

## Model Training (Optional)

### Prepare Dataset
1. Upload body and clothing samples via Try-On page
2. Click "Save Sample for Training"
3. Data stored in `backend/tryon_dataset/images/`

### Train Model
1. Collect 100+ samples
2. Click "Start Training"
3. Model saves to `backend/tryon_dataset/tryon_model.pth`
4. Next try-ons use trained model (faster, more accurate)

## Environment Configuration

### Required (.env file)
```
OPENAI_API_KEY=sk-proj-xxx...
RAPID_API_KEY=xxx...
VITE_BACKEND_URL=http://localhost:8000
```

### Optional
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx...
```

## Performance Tips

1. **Clothing Analysis**:
   - First request: ~2-3 seconds (GPT-4 Vision API)
   - Falls back to dummy data if timeout
   - Cache results for same image

2. **Recommendations**:
   - Wardrobe search: <100ms
   - Product scoring: <500ms
   - Total: ~1-2 seconds

3. **Image Loading**:
   - Use compression/resizing for faster uploads
   - Limit to 5MB per image
   - PNG/JPEG formats only

## Troubleshooting

### Issue: Images Not Showing
**Solution**:
```javascript
// Add error handler to img tags
onError={(e) => {
  e.currentTarget.src = "https://via.placeholder.com/400x500?text=No+Image";
}}
```

### Issue: No Recommendations
**Check**:
1. Clothing analysis succeeded (check clothing_analysis field)
2. Wardrobe has items or products table has data
3. Occasion filter not too restrictive

### Issue: Slow API Response
**Check**:
1. RapidAPI timeout occurring (uses local products only)
2. OpenAI API slow (falls back to dummy analysis)
3. Recommendation scoring too complex

## Future Enhancements

1. **Advanced ML Model**:
   - Train on fashion dataset
   - Support multiple garment positions
   - Style transfer for realistic try-ons

2. **Better Image Handling**:
   - Image proxy service
   - CDN caching
   - WebP format support

3. **Enhanced Matching**:
   - Size compatibility
   - Price range filtering
   - Brand preferences

4. **Social Features**:
   - Share try-on results
   - Community styling tips
   - User reviews of products

## Code Examples

### Using Try On API in Frontend
```typescript
const generateTryOn = async () => {
  const formData = new FormData();
  formData.append("user_id", "guest");
  formData.append("occasion", "casual");
  formData.append("body_image", bodyFile);
  formData.append("clothing_image", clothingFile);
  
  const result = await fetch(
    "http://localhost:8000/api/tryon/predict",
    { method: "POST", body: formData }
  ).then(r => r.json());
  
  // Display results
  setTryonResult(`data:image/png;base64,${result.tryon_image}`);
  setRecommendations(result.recommendations.external_matches);
};
```

### Running Backend with Try-On Support
```bash
cd backend
python main.py
# Uvicorn running on http://0.0.0.0:8000
```

### Testing Clothing Analysis
```bash
curl -X POST http://localhost:8000/api/analyze-clothing \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/shirt.jpg"}'
```

## Support & Debugging

- Check backend logs for analysis failures
- Enable debug mode in frontend for API calls
- Use network tab in DevTools to see API responses
- Verify OpenAI API key is valid and has quota
