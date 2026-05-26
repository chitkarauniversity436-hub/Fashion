# Implementation Plan

## Overview

This plan converts the StyleSync design into incremental coding tasks for a FastAPI/Python backend
with a React/Vite frontend. Tasks build on the existing `ai-wardrobe` backend (products, clothing,
recommendations, outfit_score, tryon routers) and add: user auth, cart/checkout, order management,
seller management, notifications, payment gateway integration, and property-based tests for all 18
correctness properties defined in the design.

Implementation language: **Python** (backend, tests) + **TypeScript/React** (frontend).

---

## Tasks

- [ ] 1. Set up testing infrastructure and shared utilities
  - Install `pytest`, `pytest-asyncio`, `httpx`, `hypothesis` into `ai-wardrobe/backend/requirements.txt`
  - Create `ai-wardrobe/backend/tests/__init__.py` and `ai-wardrobe/backend/tests/integration/__init__.py`
  - Create `ai-wardrobe/backend/tests/conftest.py` with a shared `TestClient` fixture and a
    `mock_supabase` fixture using `unittest.mock.patch`
  - Create `ai-wardrobe/backend/tests/integration/conftest.py` with live-client fixtures
  - _Requirements: 12.1, 12.4, 12.5_

- [ ] 2. Extend Pydantic schemas and Supabase table definitions for new domain objects
  - [ ] 2.1 Add new Pydantic schemas to `models/schemas.py`
    - Add `CartItemCreate`, `CartItemUpdate`, `CartItemResponse`
    - Add `OrderCreate`, `OrderResponse`, `OrderStatusUpdate`
    - Add `SellerProductCreate`, `SellerProductUpdate`
    - Add `NotificationPreferences`, `InAppNotification`
    - Add `CheckoutRequest`, `CheckoutResponse`
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 9.2, 10.1_
  - [ ] 2.2 Create `ai-wardrobe/backend/db/migrations.sql` with `CREATE TABLE IF NOT EXISTS`
    statements for: `users`, `sellers`, `cart_items`, `orders`, `order_items`,
    `notification_preferences`, `in_app_notifications`
    - _Requirements: 1.1, 7.1, 8.5, 9.1, 10.2_

- [ ] 3. Implement User Authentication (Auth_Service)
  - [ ] 3.1 Create `ai-wardrobe/backend/services/auth_service.py`
    - Implement `register_user(email, password, display_name)` using Supabase Auth
    - Implement `login_user(email, password)` returning a 24-hour JWT
    - Implement `request_password_reset(email)` triggering Supabase reset email
    - Implement `get_current_user(token)` dependency for protected routes
    - Implement `oauth_google_login(code)` for Google OAuth 2.0 flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [ ] 3.2 Create `ai-wardrobe/backend/routers/auth.py`
    - `POST /api/auth/register` → calls `auth_service.register_user`
    - `POST /api/auth/login` → calls `auth_service.login_user`
    - `POST /api/auth/password-reset` → calls `auth_service.request_password_reset`
    - `GET  /api/auth/google` and `GET /api/auth/google/callback` for OAuth
    - Register router in `main.py`
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7, 1.8, 1.9_
  - [ ]* 3.3 Write unit tests for auth service in `tests/test_auth.py`
    - Test duplicate email returns error (Req 1.3)
    - Test invalid credentials return HTTP 401 without revealing which field failed (Req 1.5)
    - Test JWT expiry is 24 hours (Req 1.4)
    - Test password reset email dispatched within 60 s (Req 1.6)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [ ] 4. Extend product catalog and search endpoints
  - [ ] 4.1 Update `routers/products.py` to support pagination, filtering, and search
    - Add `page` and `page_size` (default 20) query params to `GET /api/products`
    - Add `q`, `category`, `gender`, `subcategory`, `price_min`, `price_max` filter params
    - Implement multi-filter conjunction logic in `supabase_service.get_products`
    - Blend RapidAPI results with Supabase results and de-duplicate by `(id, title)`
    - Return HTTP 404 for `GET /api/products/{id}` when product not found
    - _Requirements: 2.1, 2.2, 2.3, 2.7, 2.9, 12.2_
  - [ ]* 4.2 Write property test P1 (search filter inclusion) in `tests/test_products.py`
    - **Property 1: Search filter inclusion**
    - **Validates: Requirements 2.2**
  - [ ]* 4.3 Write property test P2 (multi-filter conjunction) in `tests/test_products.py`
    - **Property 2: Multi-filter conjunction**
    - **Validates: Requirements 2.3**
  - [ ]* 4.4 Write property test P4 (product de-duplication invariant) in `tests/test_products.py`
    - **Property 4: Product de-duplication invariant**
    - **Validates: Requirements 2.9**
  - [ ]* 4.5 Write unit tests for product endpoints in `tests/test_products.py`
    - Test `GET /api/products` with no filters returns ≤ 20 products
    - Test `GET /api/products/{id}` for non-existent ID returns HTTP 404
    - Test RapidAPI timeout falls back to Supabase-only results (Req 12.3)
    - _Requirements: 2.1, 2.7, 12.2, 12.3_

- [ ] 5. Implement and test image proxy
  - [ ] 5.1 Harden `routers/products.py` image proxy handler
    - Validate upstream Content-Type is an image; return HTTP 502 if not
    - Serve stale cache when upstream is unreachable but cache exists
    - Name cached files using SHA-256 hex digest of the source URL
    - Store files under `backend/static/image_cache/`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ]* 5.2 Write property test P3 (image proxy cache round-trip) in `tests/test_image_proxy.py`
    - **Property 3: Image proxy cache round-trip**
    - **Validates: Requirements 11.2, 11.4**
  - [ ]* 5.3 Write property test P14 (SHA-256 cache naming) in `tests/test_image_proxy.py`
    - **Property 14: Image proxy SHA-256 cache naming**
    - **Validates: Requirements 11.5**
  - [ ]* 5.4 Write property test P13 (Amazon URL suffix stripping) in `tests/test_image_proxy.py`
    - **Property 13: Amazon URL suffix stripping**
    - **Validates: Requirements 2.9** (clean_amazon_image_url in supabase_service)
  - [ ]* 5.5 Write unit tests for image proxy in `tests/test_image_proxy.py`
    - Test bad upstream URL returns HTTP 502
    - Test non-image Content-Type returns HTTP 502
    - _Requirements: 11.3_

- [ ] 6. Implement and test outfit recommendations
  - [ ] 6.1 Harden `services/recommendation_service.py` scoring and strategy logic
    - Ensure `_score_item` applies additive rules: +30 complementary category, +20 occasion,
      +15 color, up to +24 tag overlap (8 pts/tag, capped at 3 tags)
    - Ensure `build_outfit_matches` selects `wardrobe_first` when any score ≥ 40, else
      `external_fallback`
    - Exclude source item by `exclude_item_id` and exclude same-category wardrobe items
    - Clamp all scores to [0, 100] and sort results descending by score
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_
  - [ ]* 6.2 Write property test P5 (compatibility score additive rules) in `tests/test_recommendation.py`
    - **Property 5: Compatibility score additive rules**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  - [ ]* 6.3 Write property test P6 (recommendation strategy selection) in `tests/test_recommendation.py`
    - **Property 6: Recommendation strategy selection**
    - **Validates: Requirements 3.3, 3.4**
  - [ ]* 6.4 Write property test P9 (self-exclusion and category-exclusion) in `tests/test_recommendation.py`
    - **Property 9: Recommendation self-exclusion and category-exclusion invariants**
    - **Validates: Requirements 3.6, 3.7**
  - [ ]* 6.5 Write property test P10 (compatibility score range and ordering) in `tests/test_recommendation.py`
    - **Property 10: Compatibility score range invariant**
    - **Validates: Requirements 3.1, 3.5**
  - [ ]* 6.6 Write unit tests for recommendation service in `tests/test_recommendation.py`
    - Test OpenAI recommendation passes wardrobe + context (Req 3.5)
    - Test complementary category map (topwear ↔ bottomwear/footwear/accessories) (Req 3.7)
    - _Requirements: 3.5, 3.7_

- [ ] 7. Implement and test digital wardrobe management
  - [ ] 7.1 Harden `services/supabase_service.py` wardrobe CRUD
    - Validate `user_id` as UUID before every DB operation
    - Enforce user isolation: `get_wardrobe_items` filters by `user_id`
    - `delete_wardrobe_item` returns 404 if item not found, 400 if user mismatch
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  - [ ]* 7.2 Write property test P7 (wardrobe item round-trip) in `tests/test_wardrobe.py`
    - **Property 7: Wardrobe item round-trip**
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 7.3 Write property test P8 (wardrobe item delete inverse) in `tests/test_wardrobe.py`
    - **Property 8: Wardrobe item delete inverse**
    - **Validates: Requirements 4.5**
  - [ ]* 7.4 Write unit tests for wardrobe endpoints in `tests/test_wardrobe.py`
    - Test delete with wrong user ID returns HTTP 400
    - Test delete with non-existent item ID returns HTTP 404
    - Test clothing analyzer fallback chain (Gemini → GPT-4 → heuristic) (Req 4.2)
    - _Requirements: 4.2, 4.5, 4.6_

- [ ] 8. Implement and test wishlist management
  - [ ] 8.1 Harden `services/supabase_service.py` wishlist operations
    - `add_to_wishlist` returns existing entry without creating a duplicate (idempotent)
    - `remove_from_wishlist` returns HTTP 400 if product not in wishlist
    - `get_wishlist` returns all and only products added and not yet removed for the user
    - _Requirements: 7.4, 7.5, 7.6_
  - [ ]* 8.2 Write property test P11 (wishlist idempotent add and round-trip) in `tests/test_wishlist.py`
    - **Property 11: Wishlist idempotent add and round-trip**
    - **Validates: Requirements 7.4, 7.5**
  - [ ]* 8.3 Write property test P12 (wishlist remove inverse) in `tests/test_wishlist.py`
    - **Property 12: Wishlist remove inverse**
    - **Validates: Requirements 7.6**
  - [ ]* 8.4 Write unit tests for wishlist endpoints in `tests/test_wishlist.py`
    - Test remove non-existent item returns HTTP 400
    - Test invalid UUID user ID returns HTTP 422
    - Test move-to-cart action (Req 7.7)
    - _Requirements: 7.6, 7.7_

- [ ] 9. Implement outfit scoring endpoint
  - [ ] 9.1 Harden `routers/outfit_score.py`
    - Validate image URL is reachable before calling AI; return HTTP 400 if not
    - Return HTTP 503 if AI scoring service is unavailable
    - Associate scoring request with authenticated `user_id` and persist to `outfit_scores`
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 9.2 Write property test P16 (outfit score range and feedback invariant) in `tests/test_outfit_score.py`
    - **Property 16: Outfit score range and feedback invariant**
    - **Validates: Requirements 6.1**
  - [ ]* 9.3 Write unit tests for outfit scoring in `tests/test_outfit_score.py`
    - Test unreachable image URL returns HTTP 400
    - Test AI service unavailable returns HTTP 503
    - _Requirements: 6.1, 6.2_

- [ ] 10. Implement virtual try-on endpoint
  - [ ] 10.1 Harden `routers/tryon.py` and `services/virtual_tryon.py`
    - Ensure pipeline order: HF Kontext-LoRA → Advanced VTON → CatVTON → PIL → CNN → failed
    - On success: auto-analyze clothing, auto-recommend (≤ 6 items), save history record
    - On total failure: return HTTP 500 with descriptive message; do NOT save history record
    - Validate body image ≤ 10 MB; accept JPEG, PNG, WebP only
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [ ]* 10.2 Write property test P17 (try-on base64 PNG output) in `tests/test_tryon.py`
    - **Property 17: Virtual try-on base64 PNG output**
    - **Validates: Requirements 5.1, 5.4**
  - [ ]* 10.3 Write property test P18 (try-on response completeness) in `tests/test_tryon.py`
    - **Property 18: Try-on response completeness**
    - **Validates: Requirements 5.3, 5.4**
  - [ ]* 10.4 Write unit tests for try-on in `tests/test_tryon.py`
    - Test all pipeline models fail → `{tryon_image:"", model:"failed"}`
    - Test pipeline model attempt order
    - Test missing body or clothing image returns HTTP 422
    - Test training with no samples returns HTTP 400
    - _Requirements: 5.6_

- [ ] 11. Checkpoint — core backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement shopping cart backend
  - [ ] 12.1 Create `ai-wardrobe/backend/services/cart_service.py`
    - `add_to_cart(user_id, product_id, quantity)` → persists to `cart_items` in Supabase
    - `get_cart(user_id)` → returns all cart items with product title, image, price, quantity
    - `update_cart_item(user_id, product_id, quantity)` → removes item when quantity = 0
    - `merge_guest_cart(user_id, guest_items)` → merges local-storage cart on login
    - _Requirements: 7.1, 7.2, 7.3, 7.8_
  - [ ] 12.2 Create `ai-wardrobe/backend/routers/cart.py`
    - `GET  /api/cart` (auth required)
    - `POST /api/cart` (auth required)
    - `PUT  /api/cart/{product_id}` (auth required)
    - `DEL  /api/cart/{product_id}` (auth required)
    - `POST /api/cart/merge` (auth required, merges guest cart)
    - Register router in `main.py`
    - _Requirements: 7.1, 7.2, 7.3, 7.8_
  - [ ]* 12.3 Write unit tests for cart in `tests/test_cart.py`
    - Test quantity update to 0 removes item
    - Test guest cart merge deduplicates items
    - _Requirements: 7.3, 7.8_

- [ ] 13. Implement notification service
  - [ ] 13.1 Create `ai-wardrobe/backend/services/notification_service.py`
    - `send_email(user_id, event_type, context)` → dispatches transactional email via
      Supabase Edge Functions or SMTP within 60 s; respects opt-out preference
    - `create_in_app_notification(user_id, message, order_id)` → inserts into
      `in_app_notifications` table
    - `get_in_app_notifications(user_id)` → returns unread notifications for active session
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 13.2 Create `ai-wardrobe/backend/routers/notifications.py`
    - `GET  /api/notifications` (auth required) → in-app notifications
    - `PUT  /api/notifications/preferences` (auth required) → update email opt-out
    - Register router in `main.py`
    - _Requirements: 10.2, 10.3_
  - [ ]* 13.3 Write unit tests for notification service in `tests/test_notifications.py`
    - Test email suppressed when user has opted out (Req 10.3)
    - Test in-app notification still delivered when email opted out (Req 10.3)
    - Test registration event triggers email within 60 s (Req 10.1)
    - _Requirements: 10.1, 10.3_

- [ ] 14. Implement payment gateway integration and checkout
  - [ ] 14.1 Create `ai-wardrobe/backend/services/payment_service.py`
    - `create_payment_intent(amount, currency, user_id)` → calls Payment_Gateway API
    - `confirm_payment(payment_intent_id)` → awaits gateway confirmation ≤ 10 s
    - Returns structured result: `{success, transaction_id, error_message}`
    - _Requirements: 8.3, 8.4_
  - [ ] 14.2 Create `ai-wardrobe/backend/services/order_service.py`
    - `create_order(user_id, cart_items, shipping_address, payment_result)` → inserts into
      `orders` and `order_items`; clears cart; triggers order confirmation notification
    - `get_orders(user_id)` → returns list with order ID, date, status, total
    - `get_order_detail(user_id, order_id)` → returns full order with items, address, status
    - `update_order_status(order_id, new_status)` → validates status transition; triggers
      status-change notification
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9_
  - [ ] 14.3 Create `ai-wardrobe/backend/routers/checkout.py`
    - `POST /api/checkout` (auth required) → validates shipping address, calls payment_service,
      calls order_service; returns order summary on success
    - `GET  /api/orders` (auth required)
    - `GET  /api/orders/{order_id}` (auth required)
    - Register router in `main.py`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [ ]* 14.4 Write unit tests for checkout and orders in `tests/test_checkout.py`
    - Test payment failure does not create order record (Req 8.4)
    - Test successful payment creates order with status "confirmed" and clears cart (Req 8.5)
    - Test missing shipping address field returns validation error (Req 8.2)
    - Test all five order status values are accepted (Req 8.8)
    - _Requirements: 8.2, 8.4, 8.5, 8.8_

- [ ] 15. Implement seller product management
  - [ ] 15.1 Create `ai-wardrobe/backend/services/seller_service.py`
    - `create_product(seller_id, payload)` → inserts product into Supabase `products` table;
      makes it visible in catalog within 60 s
    - `update_product(seller_id, product_id, payload)` → validates ownership; returns HTTP 403
      if seller does not own the product
    - `deactivate_product(seller_id, product_id)` → marks product inactive; does NOT remove
      from existing orders
    - `get_seller_dashboard(seller_id)` → returns active listings, total sales, pending orders
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ] 15.2 Create `ai-wardrobe/backend/routers/seller.py`
    - `POST /api/seller/products` (seller auth required)
    - `PUT  /api/seller/products/{product_id}` (seller auth required)
    - `DEL  /api/seller/products/{product_id}` (seller auth required)
    - `GET  /api/seller/dashboard` (seller auth required)
    - Register router in `main.py`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ]* 15.3 Write unit tests for seller management in `tests/test_seller.py`
    - Test seller cannot update/delete another seller's product (HTTP 403) (Req 9.4)
    - Test deleted product remains in existing orders (Req 9.5)
    - Test new product appears in catalog within 60 s (Req 9.2)
    - _Requirements: 9.2, 9.4, 9.5_

- [ ] 16. Implement CORS, health, and API reliability hardening
  - [ ] 16.1 Update `main.py` CORS middleware and health endpoint
    - Ensure all 8 configured origins are in the allowlist
    - Ensure `Access-Control-Allow-Methods` includes GET, POST, PUT, DELETE, OPTIONS
    - Ensure `Access-Control-Allow-Headers` includes Content-Type and Authorization
    - Ensure `/health` returns HTTP 200 `{"status": "ok"}` (already present; add test coverage)
    - Add global exception handler returning HTTP 500 `{"detail": "<message>"}` for unhandled
      exceptions
    - _Requirements: 12.1, 12.4, 12.5_
  - [ ]* 16.2 Write property test P15 (CORS origin allowlist) in `tests/test_cors.py`
    - **Property 15: CORS origin allowlist**
    - **Validates: Requirements 12.4**
  - [ ]* 16.3 Write unit tests for health and error handling in `tests/test_health.py`
    - Test `GET /health` returns HTTP 200 with exact JSON body
    - Test `GET /` returns HTTP 200 with exact JSON body
    - Test unhandled exception returns HTTP 500 with `detail` field
    - _Requirements: 12.1, 12.5_

- [ ] 17. Checkpoint — full backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Build React/Vite frontend storefront
  - [ ] 18.1 Scaffold frontend project structure in `ai-wardrobe/frontend/`
    - Initialize Vite + React + TypeScript project
    - Install and configure React Router, Axios (or fetch wrapper), and a UI component library
    - Set up environment variable for `VITE_API_BASE_URL`
    - Create shared API client module with auth token injection
    - _Requirements: 2.1, 2.4, 2.5_
  - [ ] 18.2 Implement product catalog and search UI
    - `ProductListPage`: paginated grid (20/page), search bar, category/gender/price filters
    - `ProductDetailPage`: all images, description, price, size options, stock status,
      "Out of Stock" state disabling add-to-cart (Req 2.6, 2.7)
    - Filter changes update listing without full page reload (Req 2.4)
    - Images served via `/api/image-proxy` (Req 2.5)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ] 18.3 Implement authentication UI
    - `LoginPage`, `RegisterPage`, `PasswordResetPage`
    - Google OAuth button wired to `/api/auth/google`
    - Redirect to intended destination after login (Req 1.9)
    - Store JWT in `localStorage`; attach to all API requests
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 1.9_
  - [ ] 18.4 Implement cart and wishlist UI
    - `CartPage`: item list with quantity controls, remove button, subtotal
    - Guest cart stored in `localStorage`; merged on login (Req 7.8)
    - `WishlistPage`: saved items with move-to-cart action (Req 7.7)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7, 7.8_
  - [ ] 18.5 Implement checkout and order history UI
    - `CheckoutPage`: order summary, shipping address form with validation, payment form
    - `OrderListPage`: past orders with ID, date, status, total
    - `OrderDetailPage`: full order detail with items, address, fulfillment status
    - _Requirements: 8.1, 8.2, 8.6, 8.7_
  - [ ] 18.6 Implement AI feature pages
    - `WardrobePage`: upload clothing image, view/delete wardrobe items
    - `RecommendationsPage`: occasion input, display ranked wardrobe + external matches
    - `TryOnPage`: upload body + clothing images, display try-on result + recommendations
    - `OutfitScorerPage`: upload outfit image, display score and feedback
    - _Requirements: 3.1, 4.1, 4.4, 5.1, 5.2, 6.1_
  - [ ] 18.7 Implement in-app notification display
    - Poll or subscribe to `GET /api/notifications` while session is active
    - Display notification badge and dropdown for order status changes
    - _Requirements: 10.2_

- [ ] 19. Implement seller dashboard UI
  - [ ] 19.1 Build `SellerDashboardPage` in the frontend
    - Display active listings, total sales, pending orders
    - Forms for creating and editing product listings (title, description, price, images,
      stock quantity, category, gender)
    - Delete (deactivate) product with confirmation dialog
    - _Requirements: 9.2, 9.3, 9.5, 9.6_

- [ ] 20. Write integration tests
  - [ ]* 20.1 Write integration tests in `tests/integration/test_supabase.py`
    - Smoke test: Supabase `products` table contains Amazon/Myntra/Flipkart rows
    - Smoke test: wardrobe CRUD round-trip against live Supabase
    - _Requirements: 4.3, 4.4, 4.5_
  - [ ]* 20.2 Write integration tests in `tests/integration/test_external_apis.py`
    - RapidAPI product search returns results (requires `RAPID_API_KEY`)
    - Gemini API clothing analysis end-to-end (requires `GEMINI_API_KEY`)
    - OpenAI recommendation end-to-end (requires `OPENAI_API_KEY`)
    - HF Kontext-LoRA try-on end-to-end (requires `HF_TOKEN`)
    - _Requirements: 3.5, 4.1, 4.2, 5.1_

- [ ] 21. Final checkpoint — all tests pass
  - Ensure all unit, property-based, and integration tests pass, ask the user if questions arise.


---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 11, 17, 21) ensure incremental validation at major milestones.
- Property tests use `hypothesis` with `@settings(max_examples=100)` and are tagged with
  `# Feature: fashion-ecommerce-platform, Property N: <property_text>`.
- Tests for P7, P8, P11, P12 mock `supabase_service.supabase` via `unittest.mock.patch`.
- Tests for P3, P14 use a `tmp_path` fixture for the disk cache directory.
- Tests for P17, P18 mock HF API and local model calls to avoid GPU dependency in CI.
- The frontend (task 18) is a new Vite + React + TypeScript project under `ai-wardrobe/frontend/`.
- All 18 correctness properties from the design document are covered by property-based test
  sub-tasks: P1 (4.2), P2 (4.3), P3 (5.2), P4 (4.4), P5 (6.2), P6 (6.3), P7 (7.2), P8 (7.3),
  P9 (6.4), P10 (6.5), P11 (8.2), P12 (8.3), P13 (5.4), P14 (5.3), P15 (16.2), P16 (9.2),
  P17 (10.2), P18 (10.3).

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["2.1", "2.2"]
    },
    {
      "id": 1,
      "tasks": ["3.1", "4.1", "5.1", "6.1", "7.1", "8.1", "9.1", "10.1"]
    },
    {
      "id": 2,
      "tasks": ["3.2", "4.2", "4.3", "4.4", "5.2", "5.3", "5.4", "6.2", "6.3", "6.4", "6.5", "7.2", "7.3", "8.2", "8.3", "9.2", "10.2", "10.3"]
    },
    {
      "id": 3,
      "tasks": ["3.3", "4.5", "5.5", "6.6", "7.4", "8.4", "9.3", "10.4", "12.1", "13.1", "14.1", "15.1", "16.1"]
    },
    {
      "id": 4,
      "tasks": ["12.2", "13.2", "14.2", "15.2", "16.2", "16.3"]
    },
    {
      "id": 5,
      "tasks": ["12.3", "13.3", "14.3", "15.3"]
    },
    {
      "id": 6,
      "tasks": ["14.4", "18.1"]
    },
    {
      "id": 7,
      "tasks": ["18.2", "18.3", "18.4", "18.5", "18.6", "18.7", "19.1"]
    },
    {
      "id": 8,
      "tasks": ["20.1", "20.2"]
    }
  ]
}
```
