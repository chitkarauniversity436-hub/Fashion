# OpenAI Outfit Recommendation Integration

This file documents how OpenAI is used in StyleSync for intelligent outfit recommendations.

## What is included

- `backend/services/openai_service.py` — OpenAI prompt-building and API call logic
- `backend/routers/recommendations.py` — New route `POST /api/recommendations/openai`
- `src/lib/api.js` — Frontend helper `getOpenAIRecommendations`
- `src/pages/Wardrobe.tsx` — Optional AI styling advice button and UI display

## Setup

### Ensure OpenAI API key is set

In `backend/.env`:

```env
OPENAI_API_KEY=sk-xxxxx
```

The backend loads this value from `config.py` using `python-dotenv`.

### Install dependencies

OpenAI support is already included in `backend/requirements.txt`:
- `openai`

Run:

```bash
cd backend
pip install -r requirements.txt
```

## Backend API

### Endpoint

`POST /api/recommendations/openai`

### Request body

```json
{
  "user_id": "demo-user-1",
  "wardrobe": [
    { "name": "Black Jeans", "category": "bottomwear", "color": "black" },
    { "name": "White Sneakers", "category": "footwear", "color": "white" }
  ],
  "query": "What should I wear for a date?",
  "occasion": "date",
  "gender": "unisex",
  "style": "smart casual",
  "weather": "cool evening",
  "product_metadata": {
    "preferred_brands": ["Nike", "Zara"]
  },
  "limit": 3
}
```

### Response

The response contains the raw OpenAI recommendation text plus optional parsed JSON if the model returns JSON.

```json
{
  "model": "gpt-4.1-mini",
  "recommendation": "Wear the black jeans with the white sneakers and add a beige knit sweater for a smart casual date look.",
  "parsed_recommendation": null,
  "request": { ... }
}
```

## Frontend usage

A new helper was added in `src/lib/api.js`:

```js
getOpenAIRecommendations: async (payload) => {
  const res = await fetch(`${BASE_URL}/api/recommendations/openai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
},
```

`Wardrobe.tsx` now includes an `AI Style Advice` button that sends wardrobe details and selected item context to the OpenAI endpoint.

## Prompt design

OpenAI is asked to:

- consider the user's wardrobe
- respect occasion, style, weather, and gender
- explain why the recommendation works
- provide a compatibility score between 1 and 100

This structured prompt encourages consistent, useful fashion advice.

## Notes

- The implementation uses `gpt-4.1-mini` for balanced cost and quality.
- If the API returns JSON, the service attempts to parse it and stores it in `parsed_recommendation`.
- If the OpenAI client fails, the route returns a 500 error with the failure message.
