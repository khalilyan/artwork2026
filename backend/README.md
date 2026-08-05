# ARTWORK Backend

Node.js + Express API for account, authentication, cart, saved items, orders, and product reviews.

## Setup

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

Default API URL: `http://localhost:4000/api`

## Environment

- `PORT`: API port, defaults to `4000`
- `MONGODB_URI`: MongoDB connection string, defaults to `mongodb://localhost:27017/artwork`
- `PUBLIC_SITE_URL`: canonical public site URL for metadata links, e.g. `https://artwork.am`
- `PUBLIC_API_URL`: public API URL used for absolute `/uploads/...` metadata images, e.g. `https://api.artwork.am`
- `CLIENT_ORIGIN`: comma-separated frontend origins for CORS, defaults to common Vite localhost ports
- `AUTH_SECRET`: HMAC secret for bearer tokens
- `AUTH_TOKEN_TTL_SECONDS`: token lifetime, defaults to 7 days
- `ADMIN_EMAILS`: comma-separated emails that should receive admin access
- `OPENAI_API_KEY`: required for AI room preview image generation
- `OPENAI_IMAGE_MODEL`: optional OpenAI model for room previews, defaults to `gpt-image-1`

## Admin

Create or promote an admin user in MongoDB:

```bash
npm run admin:create -- artwork@email.com "StrongPassword123" "Artwork Admin"
```

This writes to the same `users` collection used by normal login. The admin panel is available at `/admin` after signing in with that email and password.

Sync existing products into the room hierarchy:

```bash
npm run catalog:sync-room-products
```

This is a one-time migration helper for old data. Runtime catalog/admin product reads and writes use `rooms[].furnitureTypes[].products`.

## Auth

All protected routes require:

```http
Authorization: Bearer <token>
```

### Routes

- `POST /api/auth/signup` creates an account only if the email does not already exist; requires name, email, password, phone, and shipping address.
- `POST /api/auth/login` validates email/password and returns a bearer token.
- `GET /api/auth/me` returns the authorized user.
- `GET /api/account` returns account details, cart, saved items, and orders.
- `PATCH /api/account/details` updates name, email, phone, and shipping address.
- `PATCH /api/account/password` updates password after checking current password.
- `GET /api/account/cart` returns embedded user cart.
- `POST /api/account/cart` adds or increments a cart product by `productSlug`.
- `PATCH /api/account/cart/:productSlug` updates cart quantity; quantity below 1 removes the item.
- `DELETE /api/account/cart/:productSlug` removes a cart product.
- `GET /api/account/saved-items` returns embedded saved items.
- `POST /api/account/saved-items` saves a product by `productSlug`.
- `DELETE /api/account/saved-items/:productSlug` removes a saved product.
- `GET /api/account/orders` returns embedded user orders.
- `POST /api/account/orders` creates an account order from submitted items or the current cart, embeds it into the user, and clears the cart.
- `POST /api/orders/guest` creates a guest order without requiring authentication.
- `POST /api/ai/room-preview` generates an AI room preview from a customer room photo and product image reference.
- `POST /api/products/:productSlug/reviews` writes a review into the product document.
- `GET /api/admin/overview` returns admin metrics.
- `GET /api/admin/products` returns all products, including inactive products.
- `POST /api/admin/products` creates a product inside a furniture group such as `chairs`, `sofas`, `lighting`, or `beds`.
- `PATCH /api/admin/products/:productSlug` updates editable product fields.
- `DELETE /api/admin/products/:productSlug` removes a product from its group.
- `GET /api/admin/rooms` returns all room documents.
- `POST /api/admin/rooms` creates a room.
- `PATCH /api/admin/rooms/:roomSlug` updates a room.
- `DELETE /api/admin/rooms/:roomSlug` removes a room.
- `GET /api/admin/collections` returns all collection documents.
- `POST /api/admin/collections` creates a collection.
- `PATCH /api/admin/collections/:collectionSlug` updates a collection.
- `DELETE /api/admin/collections/:collectionSlug` removes a collection.
- `POST /api/admin/uploads/images` saves an uploaded image and returns an `/uploads/admin/...` URL.
- `GET /api/admin/orders` returns account and guest orders.
- `PATCH /api/admin/orders/:orderId` updates order status.
- `GET /api/admin/users` returns users without password hashes.
- `PATCH /api/admin/users/:userId` updates user role/status/email.
- `GET /api/catalog/rooms` returns all rooms with embedded furniture types.
- `GET /api/catalog/rooms/:roomSlug` returns one room and its furniture categories.
- `GET /api/catalog/categories` returns unique categories derived from room `furnitureTypes`.
- `GET /api/catalog/products` returns products, optionally filtered by `roomSlug` or `categorySlug`.
- `GET /api/catalog/products/:productSlug` returns one product.
- `GET /api/catalog/collections` returns all collections.
- `GET /api/catalog/collections/:collectionSlug` returns one priced product bundle with resolved products.

## Validation

- Email must be a valid email address with `@`.
- Signup refuses duplicate emails with `409`.
- Signup requires phone number and shipping address.
- Passwords are hashed with Node `crypto.scrypt`.
- Product cart/saved/review writes validate that the product exists.
- Guest order writes validate customer name, phone, optional email, and product slugs.
- Reviews require `rate` from `1` to `5` and review text.

## Current Data Shape

- User owns `orders`, `cart`, and `saved_items`.
- Product data lives inside `rooms[].furnitureTypes[].products`.
- Product reviews are stored on the embedded product entries inside rooms.
- The legacy `products` collection is not used by runtime catalog/admin code; it is only an optional migration source for `npm run catalog:sync-room-products`.
- Product lookup uses stable `slug`/`sku`; Mongo ObjectIds remain generated by Mongo.
