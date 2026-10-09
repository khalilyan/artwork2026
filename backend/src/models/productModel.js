import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongo.js';

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function splitSearchWords(value) {
  return normalizeSearchText(value).split(/\s+/).filter((word) => word.length > 1);
}

function getProductSearchText(product) {
  return normalizeSearchText([
    product.name,
    product.slug,
    product.id,
    product.sku,
    product.description,
    product.type,
    product.categorySlug,
    product.group,
    ...(product.roomSlugs ?? []),
    ...(product.hashtags ?? []),
  ].filter(Boolean).join(' '));
}

function toNonNegativeInteger(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) return fallback;
  return numericValue;
}

function toPositiveInteger(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) return fallback;
  return numericValue;
}

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

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
  delete publicProduct.craftsmanshipText;
  delete publicProduct.technicalTitle;
  delete publicProduct.technicalDescription;
  delete publicProduct.technicalNoteOne;
  delete publicProduct.technicalNoteTwo;
  delete publicProduct.limitedEdition;
  delete publicProduct.technicalImage;
  if (publicProduct.images && typeof publicProduct.images === 'object') {
    const { technical: _technical, ...safeImages } = publicProduct.images;
    publicProduct.images = safeImages;
  }
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
    pricePerSquareMeter: Boolean(product.pricePerSquareMeter),
    priceAmount: product.price?.amount ?? null,
    currency: product.price?.currency ?? 'AMD',
    price: product.price?.display ?? 'Գինը անհատական',
    oldPriceAmount: product.oldPrice?.amount ?? null,
    oldPrice: product.oldPrice?.display ?? null,
    image: primaryImage,
    hoverImage: product.images?.hover ?? primaryImage,
    gallery: galleryImages,
    reviewCount,
    averageRating,
  };
}

export async function listRoomProducts(options = {}) {
  const rooms = await getDatabase().collection('rooms').find({}).sort({ sortOrder: 1 }).toArray();
  const productsBySlug = new Map();

  for (const room of rooms) {
    for (const embeddedProduct of room.products ?? []) {
      const slug = embeddedProduct.slug ?? embeddedProduct.productSlug;
      if (!slug) continue;

      const existingProduct = productsBySlug.get(slug);
      const roomSlugs = new Set([...(existingProduct?.roomSlugs ?? []), room.slug, ...(embeddedProduct.roomSlugs ?? [])]);
      const productType = embeddedProduct.categorySlug ?? embeddedProduct.type ?? '';

      productsBySlug.set(slug, {
        ...embeddedProduct,
        slug,
        categorySlug: embeddedProduct.categorySlug ?? productType,
        type: embeddedProduct.type ?? productType,
        roomSlugs: Array.from(roomSlugs),
        group: embeddedProduct.group ?? productType,
      });
    }

    for (const type of room.furnitureTypes ?? []) {
      for (const embeddedProduct of type.products ?? []) {
        const slug = embeddedProduct.slug ?? embeddedProduct.productSlug;
        if (!slug) continue;

        const existingProduct = productsBySlug.get(slug);
        const roomSlugs = new Set([...(existingProduct?.roomSlugs ?? []), room.slug, ...(embeddedProduct.roomSlugs ?? [])]);
        const normalizedTypeSlug = String(type.slug ?? '').trim();

        productsBySlug.set(slug, {
          ...embeddedProduct,
          slug,
          categorySlug: normalizedTypeSlug || embeddedProduct.categorySlug || embeddedProduct.type || '',
          type: normalizedTypeSlug || embeddedProduct.type || embeddedProduct.categorySlug || '',
          roomSlugs: Array.from(roomSlugs),
          group: normalizedTypeSlug || embeddedProduct.group || embeddedProduct.type || embeddedProduct.categorySlug || '',
        });
      }
    }
  }

  return Array.from(productsBySlug.values()).map((product) => ({ ...formatProduct(product, options), group: product.group }));
}

export async function listProducts(filters = {}) {
  const allProducts = await listRoomProducts({ includeReviews: Boolean(filters.includeReviews) });

  const query = normalizeSearchText(filters.q ?? '');
  const queryWords = splitSearchWords(query);
  const sort = String(filters.sort ?? 'relevance').trim().toLowerCase();
  const minPrice = toFiniteNumberOrNull(filters.minPrice);
  const maxPrice = toFiniteNumberOrNull(filters.maxPrice);
  const offset = toNonNegativeInteger(filters.offset, 0);
  const limit = toPositiveInteger(filters.limit, 0);
  const hasPriceFilter = minPrice !== null || maxPrice !== null;
  const lowerPriceBound = minPrice ?? 0;
  const upperPriceBound = maxPrice ?? Number.MAX_SAFE_INTEGER;

  const filteredProducts = allProducts.filter((product) => {
    const roomMatches = filters.roomSlug ? product.roomSlugs?.includes(filters.roomSlug) : true;
    const categoryMatches = filters.categorySlug ? product.categorySlug === filters.categorySlug || product.type === filters.categorySlug : true;

    const searchableText = getProductSearchText(product);
    const searchableWords = query ? splitSearchWords(searchableText) : [];
    const queryMatches = query
      ? searchableText.includes(query)
        || (queryWords.length
          ? queryWords.every((queryWord) => searchableWords.some((word) => (
            word === queryWord
            || (queryWord.length >= 3 && word.startsWith(queryWord))
            || (queryWord.length >= 4 && word.includes(queryWord))
          )))
          : false)
      : true;

    const productPrice = Number(product.priceAmount);
    const priceMatches = hasPriceFilter
      ? Number.isFinite(productPrice) && productPrice >= lowerPriceBound && productPrice <= upperPriceBound
      : true;

    const activeMatches = filters.includeInactive ? true : product.isActive !== false;
    return activeMatches && roomMatches && categoryMatches && queryMatches && priceMatches;
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
  } else if (sort === 'az') {
    sortedProducts.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'hy', { sensitivity: 'base' }));
  } else if (sort === 'za') {
    sortedProducts.sort((a, b) => String(b.name ?? '').localeCompare(String(a.name ?? ''), 'hy', { sensitivity: 'base' }));
  }

  const pagedProducts = limit > 0
    ? sortedProducts.slice(offset, offset + limit)
    : sortedProducts;

  if (filters.withTotal) {
    return {
      products: pagedProducts,
      total: sortedProducts.length,
      offset,
      limit,
    };
  }

  return pagedProducts;
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
    { 'products.slug': slug },
    { $inc: { 'products.$[product].views': 1 } },
    { arrayFilters: [{ 'product.slug': slug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'products.productSlug': slug, 'products.slug': { $exists: false } },
    { $inc: { 'products.$[product].views': 1 } },
    { arrayFilters: [{ 'product.productSlug': slug, 'product.slug': { $exists: false } }] },
  );

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
    { 'products.slug': productSlug },
    { $push: { 'products.$[product].reviews': review } },
    { arrayFilters: [{ 'product.slug': productSlug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'products.productSlug': productSlug, 'products.slug': { $exists: false } },
    { $push: { 'products.$[product].reviews': review } },
    { arrayFilters: [{ 'product.productSlug': productSlug, 'product.slug': { $exists: false } }] },
  );

  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.slug': productSlug },
    { $push: { 'furnitureTypes.$[].products.$[product].reviews': review } },
    { arrayFilters: [{ 'product.slug': productSlug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.productSlug': productSlug, 'furnitureTypes.products.slug': { $exists: false } },
    { $push: { 'furnitureTypes.$[].products.$[product].reviews': review } },
    { arrayFilters: [{ 'product.productSlug': productSlug, 'product.slug': { $exists: false } }] },
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
    { 'products.slug': slug },
    { $pull: { 'products.$[product].reviews': { _id: { $in: reviewIds } } } },
    { arrayFilters: [{ 'product.slug': slug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'products.productSlug': slug, 'products.slug': { $exists: false } },
    { $pull: { 'products.$[product].reviews': { _id: { $in: reviewIds } } } },
    { arrayFilters: [{ 'product.productSlug': slug, 'product.slug': { $exists: false } }] },
  );

  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.slug': slug },
    { $pull: { 'furnitureTypes.$[].products.$[product].reviews': { _id: { $in: reviewIds } } } },
    { arrayFilters: [{ 'product.slug': slug }] },
  );
  await getDatabase().collection('rooms').updateMany(
    { 'furnitureTypes.products.productSlug': slug, 'furnitureTypes.products.slug': { $exists: false } },
    { $pull: { 'furnitureTypes.$[].products.$[product].reviews': { _id: { $in: reviewIds } } } },
    { arrayFilters: [{ 'product.productSlug': slug, 'product.slug': { $exists: false } }] },
  );

  const updatedMatch = await findProductBySlug(slug);
  return updatedMatch?.product ?? null;
}

export function createProductSnapshot(product) {
  const priceAmount = product.price?.amount ?? product.priceAmount ?? null;
  const pricePerSquareMeter = Boolean(product.pricePerSquareMeter);
  const priceDisplay = product.price?.display ?? (typeof product.price === 'string' ? product.price : null);
  const normalizedDisplay = priceDisplay && pricePerSquareMeter && !priceDisplay.includes('/քմ')
    ? `${priceDisplay}/քմ`
    : priceDisplay;
  const gallery = Array.from(new Set([
    product.images?.primary,
    ...(product.images?.gallery ?? []),
    product.image,
    product.images?.hover,
    product.hoverImage,
  ].filter(Boolean)));

  return {
    productSlug: product.slug,
    productSku: product.sku,
    name: product.name,
    image: gallery[0] ?? null,
    gallery,
    pricePerSquareMeter,
    price: {
      amount: priceAmount,
      currency: product.price?.currency ?? product.currency ?? 'AMD',
      display: normalizedDisplay ?? (priceAmount === null || priceAmount === undefined
        ? 'Գինը անհատական'
        : `${new Intl.NumberFormat('hy-AM', { style: 'currency', currency: product.price?.currency ?? product.currency ?? 'AMD', maximumFractionDigits: 0 }).format(priceAmount)}${pricePerSquareMeter ? '/քմ' : ''}`),
      pricePerSquareMeter,
    },
    roomSlugs: product.roomSlugs ?? [],
    categorySlug: product.categorySlug ?? product.type ?? null,
    type: product.type ?? null,
  };
}
