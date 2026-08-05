import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongo.js';

export function formatProduct(product, options = {}) {
  if (!product) return null;

  const publicProduct = { ...product };
  delete publicProduct.collection;
  delete publicProduct.collectionSlug;
  delete publicProduct.adminEditable;
  delete publicProduct.details;
  delete publicProduct.inventory;
  delete publicProduct.material;
  delete publicProduct.productSlug;
  delete publicProduct.productSku;
  if (!options.includeReviews) {
    delete publicProduct.reviews;
  }

  const reviews = product.reviews ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? Number((reviews.reduce((sum, review) => sum + Number(review.rate ?? 0), 0) / reviewCount).toFixed(1))
    : 0;
  const galleryImages = Array.from(new Set([
    product.images?.primary,
    ...(product.images?.gallery ?? []),
  ].filter(Boolean)));
  const primaryImage = galleryImages[0] ?? '';

  return {
    ...publicProduct,
    id: product.slug,
    priceAmount: product.price?.amount ?? null,
    currency: product.price?.currency ?? 'AMD',
    price: product.price?.display ?? 'Price on request',
    oldPriceAmount: product.oldPrice?.amount ?? null,
    oldPrice: product.oldPrice?.display ?? null,
    image: primaryImage,
    hoverImage: product.images?.hover ?? primaryImage,
    gallery: galleryImages,
    technicalImage: product.images?.technical ?? primaryImage,
    reviewCount,
    averageRating,
  };
}

export async function listRoomProducts(options = {}) {
  const rooms = await getDatabase().collection('rooms').find({}).sort({ sortOrder: 1 }).toArray();
  const productsBySlug = new Map();

  for (const room of rooms) {
    for (const type of room.furnitureTypes ?? []) {
      for (const embeddedProduct of type.products ?? []) {
        const slug = embeddedProduct.slug ?? embeddedProduct.productSlug;
        if (!slug) continue;

        const existingProduct = productsBySlug.get(slug);
        const roomSlugs = new Set([...(existingProduct?.roomSlugs ?? []), room.slug, ...(embeddedProduct.roomSlugs ?? [])]);

        productsBySlug.set(slug, {
          ...embeddedProduct,
          slug,
          categorySlug: embeddedProduct.categorySlug ?? type.slug,
          type: embeddedProduct.type ?? type.slug,
          roomSlugs: Array.from(roomSlugs),
          group: embeddedProduct.group ?? type.slug,
        });
      }
    }
  }

  return Array.from(productsBySlug.values()).map((product) => ({ ...formatProduct(product, options), group: product.group }));
}

export async function listProducts(filters = {}) {
  const allProducts = await listRoomProducts({ includeReviews: Boolean(filters.includeReviews) });

  const query = String(filters.q ?? '').trim().toLowerCase();
  const sort = String(filters.sort ?? 'relevance').trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const roomMatches = filters.roomSlug ? product.roomSlugs?.includes(filters.roomSlug) : true;
    const categoryMatches = filters.categorySlug ? product.categorySlug === filters.categorySlug || product.type === filters.categorySlug : true;
    const searchableText = [
      product.name,
      product.categorySlug,
      product.type,
      product.description,
      ...(product.hashtags ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
    const queryMatches = query ? searchableText.includes(query) : true;

    const activeMatches = filters.includeInactive ? true : product.isActive !== false;
    return activeMatches && roomMatches && categoryMatches && queryMatches;
  });

  const sortedProducts = [...filteredProducts];

  if (sort === 'price-asc') {
    sortedProducts.sort((a, b) => Number(a.priceAmount ?? Number.MAX_SAFE_INTEGER) - Number(b.priceAmount ?? Number.MAX_SAFE_INTEGER));
  } else if (sort === 'price-desc') {
    sortedProducts.sort((a, b) => Number(b.priceAmount ?? 0) - Number(a.priceAmount ?? 0));
  } else if (sort === 'rating') {
    sortedProducts.sort((a, b) => Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0));
  } else if (sort === 'newest') {
    sortedProducts.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  }

  return sortedProducts;
}

export async function findProductBySlug(productSlug) {
  const slug = String(productSlug ?? '').trim();
  const roomProduct = (await listRoomProducts({ includeReviews: true })).find((product) => product.slug === slug);

  if (roomProduct) {
    return { group: roomProduct.group, product: roomProduct, groupDocumentId: null, source: 'rooms' };
  }

  return null;
}

export async function incrementProductViews(productSlug) {
  const slug = String(productSlug ?? '').trim();
  if (!slug) return null;

  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.slug': slug },
    { $inc: { 'furnitureTypes.$[].products.$[product].views': 1 } },
    { arrayFilters: [{ 'product.slug': slug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.productSlug': slug, 'furnitureTypes.products.slug': { $exists: false } },
    { $inc: { 'furnitureTypes.$[].products.$[product].views': 1 } },
    { arrayFilters: [{ 'product.productSlug': slug, 'product.slug': { $exists: false } }] },
  );

  const updatedMatch = await findProductBySlug(slug);
  return updatedMatch?.product ?? null;
}

export async function appendProductReview(productSlug, review) {
  const match = await findProductBySlug(productSlug);
  if (!match) return null;

  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.slug': productSlug },
    { $push: { 'furnitureTypes.$[].products.$[product].reviews': review } },
    { arrayFilters: [{ 'product.slug': productSlug }] },
  );

  const updatedMatch = await findProductBySlug(productSlug);
  return updatedMatch?.product ?? null;
}

export async function removeProductReview(productSlug, reviewId) {
  const slug = String(productSlug ?? '').trim();
  const id = String(reviewId ?? '').trim();
  if (!slug || !id) return null;

  const reviewIds = [id];
  if (/^[a-f\d]{24}$/i.test(id)) {
    reviewIds.push(new ObjectId(id));
  }

  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.slug': slug },
    { $pull: { 'furnitureTypes.$[].products.$[product].reviews': { _id: { $in: reviewIds } } } },
    { arrayFilters: [{ 'product.slug': slug }] },
  );

  const updatedMatch = await findProductBySlug(slug);
  return updatedMatch?.product ?? null;
}

export function createProductSnapshot(product) {
  const priceAmount = product.price?.amount ?? product.priceAmount ?? null;
  const priceDisplay = product.price?.display ?? (typeof product.price === 'string' ? product.price : null);
  const gallery = Array.from(new Set([
    product.images?.primary,
    ...(product.images?.gallery ?? []),
    product.image,
    product.images?.hover,
    product.hoverImage,
    product.images?.technical,
    product.technicalImage,
  ].filter(Boolean)));

  return {
    productSlug: product.slug,
    productSku: product.sku,
    name: product.name,
    image: gallery[0] ?? null,
    gallery,
    price: {
      amount: priceAmount,
      currency: product.price?.currency ?? product.currency ?? 'AMD',
      display: priceDisplay ?? (priceAmount === null || priceAmount === undefined
        ? 'Գինը հարցումով'
        : new Intl.NumberFormat('hy-AM', { style: 'currency', currency: product.price?.currency ?? product.currency ?? 'AMD', maximumFractionDigits: 0 }).format(priceAmount)),
    },
    roomSlugs: product.roomSlugs ?? [],
    categorySlug: product.categorySlug ?? product.type ?? null,
    type: product.type ?? null,
  };
}
