# Requirements Document

## Introduction

This document defines the requirements for the **Fashion E-Commerce Platform** — a full shopping experience built on top of the existing `ai-wardrobe` FastAPI backend. The platform extends the current AI-powered wardrobe, outfit scoring, virtual try-on, and recommendation capabilities into a cohesive consumer-facing e-commerce product. Users can browse and purchase fashion products, manage a personal digital wardrobe, receive AI-driven outfit recommendations, virtually try on garments, and complete purchases through a streamlined checkout flow.

The backend already provides:
- Product catalog with Supabase storage and RapidAPI blending (`/api/products`)
- Clothing analysis via Gemini/GPT-4 Vision (`/api/analyze-clothing`)
- Outfit scoring (`/api/score-outfit`)
- AI outfit recommendations (`/api/recommendations/outfit`, `/api/recommendations/openai`)
- Virtual try-on via CatVTON (`/api/tryon/predict`)
- Wardrobe management (`/api/wardrobe/items`)
- Wishlist management (`/api/wishlist`)

The new platform adds: user authentication, a frontend storefront, cart and checkout, order management, seller/product management, and enhanced AI features.

---

## Glossary

- **Platform**: The full fashion e-commerce system described in this document.
- **User**: An authenticated shopper using the Platform.
- **Guest**: An unauthenticated visitor browsing the Platform.
- **Seller**: A registered merchant who lists products on the Platform.
- **Product**: A fashion item available for purchase, stored in Supabase and/or sourced from external APIs.
- **Wardrobe**: A User's personal digital collection of clothing items stored in Supabase.
- **Cart**: A temporary collection of Products a User intends to purchase.
- **Order**: A confirmed purchase transaction containing one or more Products.
- **Wishlist**: A saved list of Products a User wants to purchase later.
- **Virtual_Try_On**: The AI-powered feature that composites a clothing item onto a User's body image using CatVTON.
- **Outfit_Recommender**: The service that suggests complementary clothing items based on occasion, category, color, and wardrobe context.
- **Clothing_Analyzer**: The AI service (Gemini/GPT-4 Vision) that extracts category, color, occasion, season, and tags from a clothing image.
- **Outfit_Scorer**: The service that evaluates an outfit combination and returns a numeric score with feedback.
- **Auth_Service**: The authentication and authorization service managing User and Seller identities.
- **Storefront**: The frontend web application through which Users and Guests interact with the Platform.
- **Search_Engine**: The component responsible for filtering and ranking Products by query, category, gender, and subcategory.
- **Payment_Gateway**: The third-party service that processes payment transactions.
- **Notification_Service**: The component that sends transactional emails and in-app notifications to Users.
- **Image_Proxy**: The backend service that fetches, caches, and serves product images.

---

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a shopper, I want to create an account and log in securely, so that I can access my wardrobe, orders, and personalized recommendations across sessions.

#### Acceptance Criteria

1. THE Auth_Service SHALL support account registration with email address, password, and display name.
2. WHEN a User submits a registration form with a valid email and a password of at least 8 characters, THE Auth_Service SHALL create an account and issue a session token within 3 seconds.
3. IF a User submits a registration form with an email address already associated with an existing account, THEN THE Auth_Service SHALL return an error message indicating the email is already in use.
4. WHEN a User submits valid login credentials, THE Auth_Service SHALL issue a JWT session token with an expiry of 24 hours.
5. IF a User submits invalid login credentials, THEN THE Auth_Service SHALL return an HTTP 401 response and SHALL NOT reveal whether the email or password was incorrect.
6. WHEN a User requests a password reset, THE Auth_Service SHALL send a reset link to the registered email address within 60 seconds.
7. THE Auth_Service SHALL support OAuth 2.0 login via Google.
8. WHILE a User session token is valid, THE Platform SHALL allow the User to access protected resources without re-authentication.
9. WHEN a session token expires, THE Platform SHALL redirect the User to the login page and preserve the intended destination URL.

---

### Requirement 2: Product Catalog and Search

**User Story:** As a shopper, I want to browse and search for fashion products, so that I can discover items that match my style and needs.

#### Acceptance Criteria

1. THE Storefront SHALL display a paginated product catalog with a default page size of 20 items.
2. WHEN a User or Guest submits a search query, THE Search_Engine SHALL return matching Products filtered by title, description, category, subcategory, and gender within 2 seconds.
3. THE Search_Engine SHALL support filtering by category, gender, subcategory, and price range simultaneously.
4. WHEN a User or Guest applies filters, THE Storefront SHALL update the product listing without a full page reload.
5. THE Storefront SHALL display each Product with its image (served via the Image_Proxy), title, price, category, and gender.
6. WHEN a User or Guest selects a Product, THE Storefront SHALL display a product detail page including all available images, full description, price, size options, and stock availability.
7. IF a Product has no available stock, THEN THE Storefront SHALL display the Product as "Out of Stock" and SHALL disable the add-to-cart action.
8. THE Image_Proxy SHALL cache product images on disk and serve cached versions for subsequent requests to reduce upstream load.
9. WHERE a Product is sourced from an external API, THE Platform SHALL blend external results with Supabase catalog results and de-duplicate by product ID or title.

---

### Requirement 3: AI-Powered Outfit Recommendations

**User Story:** As a shopper, I want to receive personalized outfit recommendations based on my wardrobe and the occasion, so that I can discover complete looks and find products that complement what I already own.

#### Acceptance Criteria

1. WHEN a User requests outfit recommendations for a given occasion, THE Outfit_Recommender SHALL return up to 10 ranked wardrobe matches and up to 10 ranked external product matches within 5 seconds.
2. THE Outfit_Recommender SHALL rank items by occasion match (weight 40), complementary category match (weight 20), primary color match (weight 10), and shared tag overlap (weight up to 24).
3. WHEN a User's wardrobe contains items with a match score of 40 or above, THE Outfit_Recommender SHALL use the "wardrobe_first" strategy and prioritize wardrobe items in the response.
4. IF no wardrobe items meet the 40-point threshold, THEN THE Outfit_Recommender SHALL use the "external_fallback" strategy and return ranked external products.
5. WHEN a User requests OpenAI-powered recommendations, THE Platform SHALL pass the User's wardrobe, query, occasion, gender, style, and weather context to the Outfit_Recommender and return up to 20 suggestions.
6. THE Outfit_Recommender SHALL exclude the source item from recommendations when an `exclude_item_id` is provided.
7. THE Outfit_Recommender SHALL return complementary categories: topwear complements bottomwear, footwear, and accessories; bottomwear complements topwear, footwear, and accessories.

---

### Requirement 4: Digital Wardrobe Management

**User Story:** As a shopper, I want to manage a digital wardrobe of my clothing items, so that I can track what I own and receive better outfit recommendations.

#### Acceptance Criteria

1. WHEN a User uploads a clothing image, THE Clothing_Analyzer SHALL analyze it and return category, primary color, secondary colors, occasion, season, style, and descriptive tags within 10 seconds.
2. THE Clothing_Analyzer SHALL attempt Gemini analysis first and fall back to GPT-4 Vision if Gemini is unavailable, and SHALL fall back to a default heuristic response if both AI services are unavailable.
3. WHEN a User saves a clothing item to the Wardrobe, THE Platform SHALL store the image URL, category, primary color, secondary colors, occasion list, season list, and detected tags in Supabase.
4. THE Platform SHALL allow a User to view all items in their Wardrobe.
5. WHEN a User deletes a Wardrobe item, THE Platform SHALL remove the item from Supabase and confirm deletion within 2 seconds.
6. THE Platform SHALL associate all Wardrobe items with the authenticated User's ID and SHALL NOT expose one User's Wardrobe items to another User.

---

### Requirement 5: Virtual Try-On

**User Story:** As a shopper, I want to virtually try on clothing items before purchasing, so that I can see how they look on me without visiting a physical store.

#### Acceptance Criteria

1. WHEN a User submits a body image and a clothing image, THE Virtual_Try_On SHALL generate a composited try-on image using the CatVTON model and return it within 30 seconds.
2. THE Virtual_Try_On SHALL accept images as file uploads or as publicly accessible URLs.
3. WHEN a try-on is generated, THE Platform SHALL automatically analyze the clothing item using the Clothing_Analyzer and return the analysis alongside the try-on image.
4. WHEN a try-on is generated, THE Platform SHALL automatically invoke the Outfit_Recommender for the analyzed clothing item and return up to 6 matching product recommendations alongside the try-on image.
5. THE Platform SHALL save each try-on session as a history record associated with the User's ID, including the body image path, clothing image path, generated try-on image, clothing analysis, and recommendations.
6. IF the Virtual_Try_On model fails to generate an image, THEN THE Platform SHALL return an HTTP 500 response with a descriptive error message and SHALL NOT save an incomplete history record.

---

### Requirement 6: Outfit Scoring

**User Story:** As a shopper, I want to receive a score and feedback on my outfit combinations, so that I can improve my style choices.

#### Acceptance Criteria

1. WHEN a User submits an outfit image, THE Outfit_Scorer SHALL return a numeric score between 0 and 100 and a textual feedback string within 5 seconds.
2. THE Outfit_Scorer SHALL accept outfit images as publicly accessible URLs.
3. THE Platform SHALL associate outfit scoring requests with the authenticated User's ID for future personalization.

---

### Requirement 7: Shopping Cart and Wishlist

**User Story:** As a shopper, I want to add products to a cart and a wishlist, so that I can manage my intended purchases and save items for later.

#### Acceptance Criteria

1. WHEN a User adds a Product to the Cart, THE Platform SHALL persist the Cart item in Supabase associated with the User's ID.
2. THE Platform SHALL allow a User to view all items currently in their Cart, including product title, image, price, and selected quantity.
3. WHEN a User updates the quantity of a Cart item to zero, THE Platform SHALL remove that item from the Cart.
4. THE Platform SHALL allow a User to add a Product to the Wishlist.
5. WHEN a User adds a Product already present in the Wishlist, THE Platform SHALL return the existing Wishlist entry without creating a duplicate.
6. THE Platform SHALL allow a User to remove a Product from the Wishlist.
7. THE Platform SHALL allow a User to move a Product from the Wishlist to the Cart in a single action.
8. IF a User is not authenticated, THEN THE Platform SHALL store Cart items in browser local storage and SHALL merge the local Cart with the server-side Cart upon login.

---

### Requirement 8: Checkout and Order Management

**User Story:** As a shopper, I want to complete a purchase and track my orders, so that I can buy fashion items and know when they will arrive.

#### Acceptance Criteria

1. WHEN a User initiates checkout, THE Platform SHALL display an order summary with all Cart items, subtotal, shipping cost, taxes, and total amount.
2. THE Platform SHALL collect a shipping address and validate that all required fields (street, city, postal code, country) are present before allowing payment.
3. WHEN a User submits payment, THE Platform SHALL forward the transaction to the Payment_Gateway and await confirmation within 10 seconds.
4. IF the Payment_Gateway returns a payment failure, THEN THE Platform SHALL display a descriptive error message and SHALL NOT create an Order record.
5. WHEN the Payment_Gateway confirms a successful payment, THE Platform SHALL create an Order record in Supabase with status "confirmed", clear the User's Cart, and send an order confirmation notification via the Notification_Service within 30 seconds.
6. THE Platform SHALL allow a User to view a list of their past Orders, each showing order ID, date, status, and total amount.
7. WHEN a User selects an Order, THE Platform SHALL display the full order detail including all purchased items, shipping address, and current fulfillment status.
8. THE Platform SHALL support the following Order statuses: "confirmed", "processing", "shipped", "delivered", and "cancelled".
9. WHEN an Order status changes, THE Notification_Service SHALL send an email notification to the User within 60 seconds.

---

### Requirement 9: Seller Product Management

**User Story:** As a seller, I want to list and manage my fashion products on the platform, so that shoppers can discover and purchase my inventory.

#### Acceptance Criteria

1. THE Auth_Service SHALL support a Seller account role distinct from the User role.
2. WHEN a Seller submits a new product listing with title, description, price, category, gender, images, and stock quantity, THE Platform SHALL create the Product record in Supabase and make it visible in the catalog within 60 seconds.
3. THE Platform SHALL allow a Seller to update the title, description, price, images, and stock quantity of their own Products.
4. IF a Seller attempts to update or delete a Product not owned by them, THEN THE Platform SHALL return an HTTP 403 response.
5. WHEN a Seller deletes a Product, THE Platform SHALL mark the Product as inactive and SHALL NOT remove it from existing Orders.
6. THE Platform SHALL allow a Seller to view a dashboard showing their active listings, total sales, and pending orders.

---

### Requirement 10: Notifications

**User Story:** As a shopper, I want to receive timely notifications about my orders and account activity, so that I stay informed without having to check the platform manually.

#### Acceptance Criteria

1. THE Notification_Service SHALL send a transactional email to a User within 60 seconds of each of the following events: account registration, password reset request, order confirmation, and order status change.
2. THE Platform SHALL display in-app notifications for order status changes while a User session is active.
3. WHERE a User has opted out of email notifications, THE Notification_Service SHALL suppress email delivery for that User and SHALL still deliver in-app notifications.

---

### Requirement 11: Image Handling and Caching

**User Story:** As a shopper, I want product images to load quickly and reliably, so that I can browse the catalog without delays.

#### Acceptance Criteria

1. THE Image_Proxy SHALL accept a product image URL as a query parameter and return the image with the correct MIME type.
2. WHEN the Image_Proxy receives a request for an image it has already cached, THE Image_Proxy SHALL serve the cached file without making an upstream HTTP request.
3. IF the upstream image server returns a non-image content type, THEN THE Image_Proxy SHALL return an HTTP 502 response with a descriptive error message.
4. IF the upstream image server is unreachable but a cached version exists, THEN THE Image_Proxy SHALL serve the cached version.
5. THE Image_Proxy SHALL store cached images under `backend/static/image_cache/` using a SHA-256 hash of the source URL as the filename.

---

### Requirement 12: API Reliability and Error Handling

**User Story:** As a developer integrating with the platform, I want consistent and predictable API responses, so that I can build reliable frontend experiences.

#### Acceptance Criteria

1. WHEN any API endpoint encounters an unhandled exception, THE Platform SHALL return an HTTP 500 response with a JSON body containing a `detail` field describing the error.
2. THE Platform SHALL return HTTP 404 for requests to product endpoints where the product ID does not exist in Supabase.
3. WHEN the RapidAPI external product source times out after 5 seconds, THE Platform SHALL fall back to Supabase-only results and SHALL NOT propagate the timeout error to the client.
4. THE Platform SHALL return all API responses with CORS headers permitting requests from the configured frontend origins.
5. THE Platform SHALL expose a `/health` endpoint that returns HTTP 200 with `{"status": "ok"}` when the backend is operational.
