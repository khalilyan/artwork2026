# ARTWORK MongoDB Seed

These JSON files are ready to import into MongoDB Compass. Use database name `artwork`.

## Collections to import

Import each file into the matching MongoDB collection:

- `collections.json` -> `collections`
- `rooms.json` -> `rooms`
- `pages.json` -> `pages`
- `users.json` -> `users`
- `products.json` -> `products` only as a temporary source for syncing products into rooms

## Embedded data model

The seed now keeps related user and product data inside the parent document:

- User documents include `orders`, `saved_items`, and `cart`.
- Room documents include `furnitureTypes`, so there is no separate `categories` collection.
- Product documents used by the website are embedded in `rooms.furnitureTypes.products`.
- The legacy `products` collection is only a sync source. After running the sync and checking the catalog, it can be removed.
- Product groups in the temporary sync source are stored by furniture type, for example:

```json
{
  "group": "chairs",
  "chairs": [{ "slug": "the-sculptors-chair" }]
}
```

## Product IDs

Do not store readable product `_id` values like `prod_the_sculptors_chair`.

- When importing through MongoDB normally, top-level documents receive Mongo-generated ObjectIds if `_id` is omitted.
- This seed uses stable `slug` and `sku` fields for app routing/admin lookup.
- If backend needs IDs for nested product items, assign `new ObjectId()` to each nested item during backend seeding/migration.

## Catalog sync and cleanup

After importing seed data, sync temporary products into room documents:

```bash
cd backend
npm run catalog:sync-room-products
```

To remove unused catalog metadata and compact embedded room products:

```bash
npm run database:optimize
```

This removes legacy embedded product fields such as `adminEditable`, `inventory`, `details`, `productSlug`, and `productSku`, while preserving data still used by the website.

After confirming products are present in `rooms.furnitureTypes.products`, the old sync-source collection can also be dropped:

```bash
npm run database:optimize -- --drop-legacy-products
```

## Complementary Objects

Products include `hashtags`. Later, product details can find complementary products by matching same or close hashtags:

```js
db.products.find({ "chairs.hashtags": { $in: ["walnut", "architectural"] } });
```

For a backend API, flatten product groups in memory or use an aggregation pipeline, then score matches by shared `hashtags`.

## Sale settings

Each product has a `sale` object for admin-panel control:

```json
{
  "sale": { "isActive": true, "percent": 50, "label": "50% OFF" }
}
```

- `isActive`: controls whether sale pricing/badges are shown.
- `percent`: discount percent, adjustable from the admin panel.
- `label`: optional display label; backend/admin can auto-generate it from `percent`.

## Compass import

1. Open MongoDB Compass.
2. Create or select database `artwork`.
3. Create the target collection, for example `products`.
4. Click `Add Data` -> `Import JSON or CSV file`.
5. Select the matching JSON file and import as JSON array.

## Password security

`users.json` does not store plaintext passwords. It stores a `password` object with:

- `algorithm`: `scrypt`
- `hash`: base64 hash
- `salt`: base64 salt
- `params`: scrypt settings
- `mustChangePassword`: force password reset after first login

When backend auth is added, verify passwords with Node `crypto.scrypt` using the stored salt and params. For production, also add:

- HTTPS-only cookies or short-lived JWT access tokens plus refresh tokens
- login rate limiting
- email verification
- password reset tokens stored hashed
- unique index on `emailNormalized`
- role checks for admin routes

## Suggested indexes

Create these indexes later from backend migrations:

```js
db.users.createIndex({ emailNormalized: 1 }, { unique: true });
db.collections.createIndex({ slug: 1 }, { unique: true });
db.rooms.createIndex({ slug: 1 }, { unique: true });
db.rooms.createIndex({ "furnitureTypes.slug": 1 });
db.rooms.createIndex({ "furnitureTypes.products.slug": 1 });
db.contacts.createIndex({ createdAt: -1 });
```
