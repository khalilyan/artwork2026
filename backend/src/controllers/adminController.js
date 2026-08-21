import { ObjectId } from 'mongodb';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { broadcastProductNotification } from './notificationController.js';
import { getDatabase } from '../db/mongo.js';
import { formatProduct, listProducts, removeProductReview } from '../models/productModel.js';
import { getAiSettings, updateAiSettings } from '../models/settingsModel.js';
import { usersCollection } from '../models/userModel.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { isEmail, normalizeEmail, toCleanString } from '../utils/validators.js';

const allowedOrderStatuses = ['quote_requested', 'processing', 'completed', 'cancelled'];
const allowedUserStatuses = ['active', 'disabled'];
const allowedUserRoles = ['customer', 'admin'];
const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads', 'admin');

function canUseCloudinary() {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}

function createCloudinaryUploadSignature(timestamp, folder) {
  const payload = `folder=${folder}&timestamp=${timestamp}${env.cloudinaryApiSecret}`;
  return crypto.createHash('sha1').update(payload).digest('hex');
}

async function uploadToCloudinary({ base64Data, mimeType }) {
  const cloudName = env.cloudinaryCloudName;
  const folder = toCleanString(env.cloudinaryUploadFolder, 'artwork/admin');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createCloudinaryUploadSignature(timestamp, folder);
  const dataUri = `data:${mimeType};base64,${base64Data}`;
  const formData = new FormData();

  formData.append('file', dataUri);
  formData.append('api_key', env.cloudinaryApiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('resource_type', 'image');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.secure_url) {
    throw new HttpError(502, payload.error?.message ?? 'Cloud image upload failed.');
  }

  return {
    url: payload.secure_url,
    filename: payload.public_id ?? null,
  };
}

function slugify(value, fallback = 'item') {
  const slug = toCleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toCleanString(item)).filter(Boolean);
  }

  return toCleanString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  const cleanValue = toCleanString(value);
  if (!cleanValue) return fallback;

  try {
    const parsed = JSON.parse(cleanValue);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function createPrice(amount) {
  const parsedAmount = toNumberOrNull(amount);
  const nextCurrency = 'AMD';

  return {
    amount: parsedAmount,
    currency: nextCurrency,
    display: parsedAmount === null ? 'Price on request' : new Intl.NumberFormat('hy-AM', {
      style: 'currency',
      currency: nextCurrency,
      maximumFractionDigits: 0,
    }).format(parsedAmount),
  };
}

function normalizeSale(body) {
  const percent = Math.max(0, Math.min(100, Number(body.salePercent ?? 0) || 0));
  const isActive = toBoolean(body.saleIsActive, false) && percent > 0;
  const labelPercent = Number.isInteger(percent) ? String(percent) : String(Number(percent.toFixed(2)));

  return {
    isActive,
    percent: isActive ? percent : 0,
    label: isActive ? `${labelPercent}% ԶԵՂՉ` : null,
  };
}

function applySaleToProduct(product) {
  const sale = product.sale ?? { isActive: false, percent: 0, label: null };
  const basePrice = product.oldPrice?.amount ?? product.price?.amount ?? null;
  const currency = product.oldPrice?.currency ?? product.price?.currency ?? 'AMD';

  if (!sale.isActive || !sale.percent || basePrice === null) {
    return {
      ...product,
      oldPrice: null,
      sale: { isActive: false, percent: 0, label: null },
    };
  }

  const saleAmount = Math.round(basePrice * (1 - sale.percent / 100) * 100) / 100;

  return {
    ...product,
    price: createPrice(saleAmount, currency),
    oldPrice: createPrice(basePrice, currency),
    sale,
    badge: sale.label,
  };
}

function cleanProductForStorage(product) {
  const { inventory: _inventory, ...cleanProduct } = product;
  if (Object.hasOwn(cleanProduct, 'price')) {
    cleanProduct.price = cleanProduct.price ? createPrice(cleanProduct.price.amount) : createPrice(null);
  }
  if (Object.hasOwn(cleanProduct, 'oldPrice')) {
    cleanProduct.oldPrice = cleanProduct.oldPrice?.amount !== null && cleanProduct.oldPrice?.amount !== undefined
      ? createPrice(cleanProduct.oldPrice.amount)
      : null;
  }

  return cleanProduct;
}

function normalizeProductPayload(body) {
  const update = {};
  const setString = (key) => {
    if (Object.hasOwn(body, key)) update[key] = toCleanString(body[key]);
  };

  setString('name');
  setString('sku');
  setString('badge');
  setString('description');
  setString('dimensionsText');
  setString('craftsmanshipText');
  setString('technicalTitle');
  setString('technicalDescription');
  setString('technicalNoteOne');
  setString('technicalNoteTwo');
  setString('categorySlug');
  setString('type');
  setString('group');
  setString('layout');

  if (Object.hasOwn(body, 'isActive')) update.isActive = toBoolean(body.isActive, true);
  if (Object.hasOwn(body, 'roomSlugs')) update.roomSlugs = toStringArray(body.roomSlugs);
  if (Object.hasOwn(body, 'hashtags')) update.hashtags = toStringArray(body.hashtags);
  if (
    Object.hasOwn(body, 'priceAmount')
    || Object.hasOwn(body, 'saleIsActive')
    || Object.hasOwn(body, 'salePercent')
  ) {
    update.price = createPrice(body.priceAmount);
    update.oldPrice = null;
    update.sale = normalizeSale(body);
    Object.assign(update, applySaleToProduct(update));
  }

  if (Object.hasOwn(body, 'primaryImage') || Object.hasOwn(body, 'hoverImage') || Object.hasOwn(body, 'technicalImage') || Object.hasOwn(body, 'gallery')) {
    update.images = {
      primary: toCleanString(body.primaryImage),
      hover: toCleanString(body.hoverImage) || null,
      technical: toCleanString(body.technicalImage) || null,
      gallery: toStringArray(body.gallery),
    };
  }

  if (Object.hasOwn(body, 'limitedEdition')) update.limitedEdition = toBoolean(body.limitedEdition);

  update.updatedAt = new Date().toISOString();
  return cleanProductForStorage(update);
}

function normalizeNewProduct(body) {
  const now = new Date().toISOString();
  const slug = slugify(body.slug || body.name, `product-${Date.now()}`);
  const price = createPrice(body.priceAmount);
  const categorySlug = toCleanString(body.categorySlug, toCleanString(body.type, 'seating'));

  const product = {
    slug,
    name: toCleanString(body.name, 'Untitled Product'),
    sku: toCleanString(body.sku, slug.toUpperCase()),
    categorySlug,
    roomSlugs: toStringArray(body.roomSlugs),
    type: toCleanString(body.type, categorySlug),
    group: toCleanString(body.group, categorySlug),
    hashtags: toStringArray(body.hashtags),
    price,
    oldPrice: null,
    sale: normalizeSale(body),
    badge: toCleanString(body.badge),
    description: toCleanString(body.description),
    dimensionsText: toCleanString(body.dimensionsText),
    craftsmanshipText: toCleanString(body.craftsmanshipText),
    technicalTitle: toCleanString(body.technicalTitle),
    technicalDescription: toCleanString(body.technicalDescription),
    technicalNoteOne: toCleanString(body.technicalNoteOne),
    technicalNoteTwo: toCleanString(body.technicalNoteTwo),
    images: {
      primary: toCleanString(body.primaryImage),
      hover: toCleanString(body.hoverImage) || null,
      technical: toCleanString(body.technicalImage) || null,
      gallery: toStringArray(body.gallery),
    },
    reviews: [],
    limitedEdition: toBoolean(body.limitedEdition),
    layout: toCleanString(body.layout, 'feature'),
    isActive: toBoolean(body.isActive, true),
    createdAt: now,
    updatedAt: now,
  };

  return cleanProductForStorage(applySaleToProduct(product));
}

function normalizeMaterialPayload(body, existingMaterial = {}) {
  return {
    name: toCleanString(body.name, existingMaterial.name ?? 'Untitled material'),
    color: toCleanString(body.color, existingMaterial.color ?? '#c2a24e'),
    image: toCleanString(body.image, existingMaterial.image ?? ''),
  };
}

function formatMaterial(material) {
  return {
    id: String(material._id),
    name: material.name,
    color: material.color,
    image: material.image ?? '',
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
}

function normalizeRoomPayload(body, existingRoom = {}) {
  const slug = slugify(body.slug || body.name || body.title || existingRoom.slug, `room-${Date.now()}`);

  return {
    slug,
    name: toCleanString(body.name, existingRoom.name ?? 'Untitled Room'),
    eyebrow: toCleanString(body.eyebrow, existingRoom.eyebrow ?? ''),
    title: toCleanString(body.title, existingRoom.title ?? body.name ?? 'Untitled Room'),
    description: toCleanString(body.description, existingRoom.description ?? ''),
    image: toCleanString(body.image, existingRoom.image ?? ''),
    align: toCleanString(body.align, existingRoom.align ?? 'left'),
    tone: toCleanString(body.tone, existingRoom.tone ?? 'light'),
    imageClass: toCleanString(body.imageClass, existingRoom.imageClass ?? '') || null,
    italicDescription: toBoolean(body.italicDescription, Boolean(existingRoom.italicDescription)),
    tall: toBoolean(body.tall, Boolean(existingRoom.tall)),
    furnitureTypes: parseJsonArray(body.furnitureTypes, existingRoom.furnitureTypes ?? []),
    sortOrder: Number.parseInt(body.sortOrder ?? existingRoom.sortOrder ?? 0, 10) || 0,
    isActive: toBoolean(body.isActive, existingRoom.isActive !== false),
  };
}

function normalizeCollectionPayload(body, existingCollection = {}) {
  const slug = slugify(body.slug || body.title || existingCollection.slug, `collection-${Date.now()}`);

  return {
    slug,
    title: toCleanString(body.title, existingCollection.title ?? 'Untitled Collection'),
    subtitle: toCleanString(body.subtitle, existingCollection.subtitle ?? ''),
    description: toCleanString(body.description, existingCollection.description ?? ''),
    detailDescription: toCleanString(body.detailDescription, existingCollection.detailDescription ?? ''),
    heroImage: toCleanString(body.heroImage, existingCollection.heroImage ?? existingCollection.image ?? ''),
    price: createPrice(body.priceAmount ?? existingCollection.price?.amount),
    productSlugs: toStringArray(body.productSlugs ?? existingCollection.productSlugs),
    sortOrder: Number.parseInt(body.sortOrder ?? existingCollection.sortOrder ?? 0, 10) || 0,
    isActive: toBoolean(body.isActive, existingCollection.isActive !== false),
  };
}

function normalizeHeroSlides(value, fallback = []) {
  const slides = parseJsonArray(value, fallback);

  return slides
    .map((slide, index) => {
      if (slide && typeof slide === 'object') {
        return {
          title: toCleanString(slide.title, `Slide ${index + 1}`),
          subtitle: toCleanString(slide.subtitle),
          image: toCleanString(slide.image),
        };
      }

      if (typeof slide === 'string') {
        return {
          title: `Slide ${index + 1}`,
          subtitle: '',
          image: toCleanString(slide),
        };
      }

      return {
        title: `Slide ${index + 1}`,
        subtitle: '',
        image: '',
      };
    })
    .filter((slide) => slide.title || slide.subtitle || slide.image);
}

async function findEmbeddedRoomProductBySlug(slug) {
  const room = await getDatabase().collection('rooms').findOne(
    { 'furnitureTypes.products.slug': slug },
    { projection: { slug: 1, furnitureTypes: 1 } },
  );

  for (const type of room?.furnitureTypes ?? []) {
    const product = (type.products ?? []).find((item) => item.slug === slug || item.productSlug === slug);
    if (product) return { roomSlug: room.slug, typeSlug: type.slug, product };
  }

  return null;
}

async function insertProductIntoRooms(product) {
  await assertProductPlacement(product);

  await getDatabase().collection('rooms').updateMany(
    { slug: { $in: toStringArray(product.roomSlugs) }, 'furnitureTypes.slug': toCleanString(product.categorySlug, product.type) },
    {
      $push: {
        'furnitureTypes.$.products': product,
      },
      $set: { updatedAt: new Date().toISOString() },
    },
  );
}

async function assertProductPlacement(product) {
  const roomSlugs = toStringArray(product.roomSlugs);
  const typeSlug = toCleanString(product.categorySlug, product.type);
  assertRequest(roomSlugs.length > 0, 400, 'Select at least one room for this product.');
  assertRequest(typeSlug, 400, 'Select a furniture type for this product.');

  const matchingRooms = await getDatabase().collection('rooms').countDocuments({ slug: { $in: roomSlugs }, 'furnitureTypes.slug': typeSlug });
  assertRequest(matchingRooms > 0, 400, 'Selected furniture type does not exist in the selected rooms.');
}

function formatOrder(order, source = 'guest') {
  return {
    ...order,
    id: String(order._id),
    source,
  };
}

export async function getAdminOverview(_request, response, next) {
  try {
    const [products, roomsCount, collectionsCount, usersCount, guestOrdersCount, contactsCount] = await Promise.all([
      listProducts({ includeInactive: true }),
      getDatabase().collection('rooms').countDocuments(),
      getDatabase().collection('collections').countDocuments(),
      usersCollection().countDocuments(),
      getDatabase().collection('guest_orders').countDocuments(),
      getDatabase().collection('contacts').countDocuments(),
    ]);

    const userOrderDocs = await usersCollection()
      .find({ orders: { $exists: true, $ne: [] } }, { projection: { orders: 1 } })
      .toArray();
    const accountOrdersCount = userOrderDocs.reduce((total, user) => total + (user.orders?.length ?? 0), 0);

    response.json({
      metrics: {
        products: products.length,
        activeProducts: products.filter((product) => product.isActive !== false).length,
        rooms: roomsCount,
        collections: collectionsCount,
        users: usersCount,
        orders: guestOrdersCount + accountOrdersCount,
        contacts: contactsCount,
      },
      recentProducts: products
        .sort((first, second) => new Date(second.updatedAt ?? second.createdAt ?? 0) - new Date(first.updatedAt ?? first.createdAt ?? 0))
        .slice(0, 6),
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminAiSettings(_request, response, next) {
  try {
    const settings = await getAiSettings();

    response.json({
      settings: {
        ...settings,
        model: env.openaiImageModel,
        apiKeyConfigured: Boolean(env.openaiApiKey),
        billingLinks: {
          overview: 'https://platform.openai.com/settings/organization/billing/overview',
          limits: 'https://platform.openai.com/settings/organization/limits',
          usage: 'https://platform.openai.com/usage',
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminAiSettings(request, response, next) {
  try {
    const update = {
      enabled: toBoolean(request.body.enabled, true),
    };

    if (Object.hasOwn(request.body ?? {}, 'cooldownHours')) {
      update.cooldownHours = toNumberOrNull(request.body.cooldownHours) ?? 5;
    }

    const settings = await updateAiSettings(update);

    response.json({
      settings: {
        ...settings,
        model: env.openaiImageModel,
        apiKeyConfigured: Boolean(env.openaiApiKey),
        billingLinks: {
          overview: 'https://platform.openai.com/settings/organization/billing/overview',
          limits: 'https://platform.openai.com/settings/organization/limits',
          usage: 'https://platform.openai.com/usage',
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminContacts(_request, response, next) {
  try {
    const contacts = await getDatabase()
      .collection('contacts')
      .find({})
      .sort({ createdAt: -1 })
      .limit(160)
      .toArray();

    response.json({ contacts: contacts.map((contact) => ({ ...contact, id: String(contact._id) })) });
  } catch (error) {
    next(error);
  }
}

export async function getAdminProducts(request, response, next) {
  try {
    const products = await listProducts({
      includeInactive: true,
      includeReviews: true,
      q: toCleanString(request.query.q),
      roomSlug: toCleanString(request.query.roomSlug),
      categorySlug: toCleanString(request.query.categorySlug),
      sort: toCleanString(request.query.sort, 'newest'),
    });

    response.json({ products });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminProduct(request, response, next) {
  try {
    const slug = toCleanString(request.params.productSlug);
    const embeddedMatch = await findEmbeddedRoomProductBySlug(slug);
    if (!embeddedMatch) throw new HttpError(404, 'Product was not found.');

    const update = normalizeProductPayload(request.body);
    assertRequest(Object.keys(update).length > 1, 400, 'At least one product field is required.');

    const updatedProduct = cleanProductForStorage({ ...embeddedMatch.product, ...update });
    await assertProductPlacement(updatedProduct);
    await getDatabase().collection('rooms').updateMany(
      { 'furnitureTypes.products.slug': slug },
      { $pull: { 'furnitureTypes.$[].products': { slug } } },
    );
    await insertProductIntoRooms(updatedProduct);

    response.json({ product: { ...formatProduct(updatedProduct, { includeReviews: true }), group: updatedProduct.group ?? updatedProduct.type } });
  } catch (error) {
    next(error);
  }
}

export async function createAdminProduct(request, response, next) {
  try {
    const product = normalizeNewProduct(request.body);
    const existingProduct = await findEmbeddedRoomProductBySlug(product.slug);
    if (existingProduct) throw new HttpError(409, 'Product slug already exists.');

    await insertProductIntoRooms(product);
    broadcastProductNotification(product).catch((error) => {
      console.error('Failed to send product push notification:', error);
    });
    response.status(201).json({ product: { ...formatProduct(product, { includeReviews: true }), group: product.group ?? product.type } });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminProduct(request, response, next) {
  try {
    const slug = toCleanString(request.params.productSlug);
    const embeddedMatch = await findEmbeddedRoomProductBySlug(slug);
    if (!embeddedMatch) throw new HttpError(404, 'Product was not found.');

    await getDatabase().collection('rooms').updateMany(
      { 'furnitureTypes.products.slug': slug },
      { $pull: { 'furnitureTypes.$[].products': { slug } } },
    );

    response.json({ deleted: true, productSlug: slug });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminProductReview(request, response, next) {
  try {
    const productSlug = toCleanString(request.params.productSlug);
    const reviewId = toCleanString(request.params.reviewId);
    assertRequest(productSlug, 400, 'Product slug is required.');
    assertRequest(reviewId, 400, 'Review id is required.');

    const product = await removeProductReview(productSlug, reviewId);
    if (!product) throw new HttpError(404, 'Product was not found.');

    response.json({
      deleted: true,
      productSlug,
      reviewId,
      product: { ...formatProduct(product, { includeReviews: true }), group: product.group ?? product.type },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminMaterials(_request, response, next) {
  try {
    const collection = getDatabase().collection('materials');
    const materials = await collection.find({}).sort({ name: 1 }).toArray();
    response.json({ materials: materials.map(formatMaterial) });
  } catch (error) {
    next(error);
  }
}

export async function createAdminMaterial(request, response, next) {
  try {
    const material = normalizeMaterialPayload(request.body);

    const now = new Date().toISOString();
    const result = await getDatabase().collection('materials').insertOne({ ...material, createdAt: now, updatedAt: now });
    response.status(201).json({ material: formatMaterial({ _id: result.insertedId, ...material, createdAt: now, updatedAt: now }) });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminMaterial(request, response, next) {
  try {
    const materialId = toCleanString(request.params.materialId);
    assertRequest(ObjectId.isValid(materialId), 400, 'Material id is invalid.');
    const _id = new ObjectId(materialId);
    const existingMaterial = await getDatabase().collection('materials').findOne({ _id });
    if (!existingMaterial) throw new HttpError(404, 'Material was not found.');

    const material = { ...normalizeMaterialPayload(request.body, existingMaterial), updatedAt: new Date().toISOString() };
    const result = await getDatabase().collection('materials').findOneAndUpdate(
      { _id },
      { $set: material, $unset: { slug: '', type: '', sortOrder: '', isActive: '' } },
      { returnDocument: 'after' },
    );

    response.json({ material: formatMaterial(result) });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminMaterial(request, response, next) {
  try {
    const materialId = toCleanString(request.params.materialId);
    assertRequest(ObjectId.isValid(materialId), 400, 'Material id is invalid.');
    const result = await getDatabase().collection('materials').deleteOne({ _id: new ObjectId(materialId) });
    if (!result.deletedCount) throw new HttpError(404, 'Material was not found.');

    response.json({ deleted: true, materialId });
  } catch (error) {
    next(error);
  }
}

export async function getAdminRooms(_request, response, next) {
  try {
    const rooms = await getDatabase().collection('rooms').find({}).sort({ sortOrder: 1 }).toArray();
    response.json({ rooms });
  } catch (error) {
    next(error);
  }
}

export async function createAdminRoom(request, response, next) {
  try {
    const room = normalizeRoomPayload(request.body);
    const existingRoom = await getDatabase().collection('rooms').findOne({ slug: room.slug });
    if (existingRoom) throw new HttpError(409, 'Room slug already exists.');

    const now = new Date().toISOString();
    await getDatabase().collection('rooms').insertOne({ ...room, createdAt: now, updatedAt: now });
    response.status(201).json({ room: { ...room, createdAt: now, updatedAt: now } });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminRoom(request, response, next) {
  try {
    const slug = toCleanString(request.params.roomSlug);
    const existingRoom = await getDatabase().collection('rooms').findOne({ slug });
    if (!existingRoom) throw new HttpError(404, 'Room was not found.');

    const room = { ...normalizeRoomPayload(request.body, existingRoom), updatedAt: new Date().toISOString() };
    const result = await getDatabase().collection('rooms').findOneAndUpdate(
      { slug },
      { $set: room },
      { returnDocument: 'after' },
    );

    response.json({ room: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminRoom(request, response, next) {
  try {
    const slug = toCleanString(request.params.roomSlug);
    const result = await getDatabase().collection('rooms').deleteOne({ slug });
    if (!result.deletedCount) throw new HttpError(404, 'Room was not found.');

    response.json({ deleted: true, roomSlug: slug });
  } catch (error) {
    next(error);
  }
}

export async function getAdminCollections(_request, response, next) {
  try {
    const collections = await getDatabase().collection('collections').find({}).sort({ sortOrder: 1 }).toArray();
    response.json({ collections });
  } catch (error) {
    next(error);
  }
}

export async function getAdminHomepage(_request, response, next) {
  try {
    const page = await getDatabase().collection('pages').findOne({ slug: 'home' });
    response.json({ page: page ?? { slug: 'home', type: 'landing', heroSlides: [] } });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminHomepage(request, response, next) {
  try {
    const existingPage = await getDatabase().collection('pages').findOne({ slug: 'home' });
    const now = new Date().toISOString();
    const requestedSlides = request.body && typeof request.body === 'object'
      ? request.body.heroSlides
      : undefined;
    const heroSlides = normalizeHeroSlides(requestedSlides, existingPage?.heroSlides ?? []);
    const page = {
      slug: 'home',
      type: toCleanString(existingPage?.type, 'landing') || 'landing',
      heroSlides,
      updatedAt: now,
    };

    await getDatabase().collection('pages').updateOne(
      { slug: 'home' },
      { $set: page, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );

    response.json({ page });
  } catch (error) {
    next(error);
  }
}

export async function createAdminCollection(request, response, next) {
  try {
    const collection = normalizeCollectionPayload(request.body);
    const existingCollection = await getDatabase().collection('collections').findOne({ slug: collection.slug });
    if (existingCollection) throw new HttpError(409, 'Collection slug already exists.');

    const now = new Date().toISOString();
    await getDatabase().collection('collections').insertOne({ ...collection, createdAt: now, updatedAt: now });
    response.status(201).json({ collection: { ...collection, createdAt: now, updatedAt: now } });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminCollection(request, response, next) {
  try {
    const slug = toCleanString(request.params.collectionSlug);
    const existingCollection = await getDatabase().collection('collections').findOne({ slug });
    if (!existingCollection) throw new HttpError(404, 'Collection was not found.');

    const collection = { ...normalizeCollectionPayload(request.body, existingCollection), updatedAt: new Date().toISOString() };
    const result = await getDatabase().collection('collections').findOneAndUpdate(
      { slug },
      { $set: collection },
      { returnDocument: 'after' },
    );

    response.json({ collection: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminCollection(request, response, next) {
  try {
    const slug = toCleanString(request.params.collectionSlug);
    const result = await getDatabase().collection('collections').deleteOne({ slug });
    if (!result.deletedCount) throw new HttpError(404, 'Collection was not found.');

    response.json({ deleted: true, collectionSlug: slug });
  } catch (error) {
    next(error);
  }
}

export async function uploadAdminImage(request, response, next) {
  try {
    const filename = slugify(request.body.filename || 'upload');
    const source = toCleanString(request.body.dataUrl || request.body.imageUrl || request.body.url);

    if (/^https?:\/\//i.test(source)) {
      response.status(201).json({
        url: source,
        filename: null,
      });
      return;
    }

    const match = source.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
    assertRequest(match, 400, 'Image upload must be a png, jpg, webp, or gif data URL.');

    const [, mimeType, base64Data] = match;

    if (canUseCloudinary()) {
      const cloudinaryUpload = await uploadToCloudinary({ base64Data, mimeType });
      response.status(201).json(cloudinaryUpload);
      return;
    }

    const extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const savedName = `${Date.now()}-${filename}.${extension}`;
    await fs.mkdir(uploadRoot, { recursive: true });
    await fs.writeFile(path.join(uploadRoot, savedName), Buffer.from(base64Data, 'base64'));

    response.status(201).json({
      url: `${request.protocol}://${request.get('host')}/uploads/admin/${savedName}`,
      filename: savedName,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminOrders(_request, response, next) {
  try {
    const guestOrders = await getDatabase().collection('guest_orders').find({}).sort({ createdAt: -1 }).limit(80).toArray();
    const usersWithOrders = await usersCollection()
      .find({ orders: { $exists: true, $ne: [] } }, { projection: { fullName: 1, email: 1, orders: 1 } })
      .toArray();

    const accountOrders = usersWithOrders.flatMap((user) => (user.orders ?? []).map((order) => formatOrder({
      ...order,
      account: { userId: String(user._id), fullName: user.fullName, email: user.email },
    }, 'account')));

    const orders = [...guestOrders.map((order) => formatOrder(order, 'guest')), ...accountOrders]
      .sort((first, second) => new Date(second.createdAt ?? 0) - new Date(first.createdAt ?? 0))
      .slice(0, 120);

    response.json({ orders });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminOrder(request, response, next) {
  try {
    const orderId = toCleanString(request.params.orderId);
    const status = toCleanString(request.body.status);
    assertRequest(allowedOrderStatuses.includes(status), 400, 'Order status is not valid.');

    const now = new Date().toISOString();
    const guestFilter = ObjectId.isValid(orderId) ? { _id: new ObjectId(orderId) } : { orderNumber: orderId };
    const guestResult = await getDatabase().collection('guest_orders').findOneAndUpdate(
      guestFilter,
      { $set: { status, updatedAt: now } },
      { returnDocument: 'after' },
    );

    if (guestResult) {
      response.json({ order: formatOrder(guestResult, 'guest') });
      return;
    }

    const userResult = await usersCollection().findOneAndUpdate(
      { 'orders.orderNumber': orderId },
      { $set: { 'orders.$.status': status, 'orders.$.updatedAt': now, updatedAt: now } },
      { returnDocument: 'after', projection: { orders: { $elemMatch: { orderNumber: orderId } }, fullName: 1, email: 1 } },
    );

    const order = userResult?.orders?.[0];
    if (!order) throw new HttpError(404, 'Order was not found.');

    response.json({ order: formatOrder({ ...order, account: { userId: String(userResult._id), fullName: userResult.fullName, email: userResult.email } }, 'account') });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminOrder(request, response, next) {
  try {
    const orderId = toCleanString(request.params.orderId);
    assertRequest(orderId, 400, 'Order id is required.');

    const guestFilter = ObjectId.isValid(orderId) ? { _id: new ObjectId(orderId) } : { orderNumber: orderId };
    const guestResult = await getDatabase().collection('guest_orders').deleteOne(guestFilter);
    if (guestResult.deletedCount) {
      response.json({ deleted: true, orderId });
      return;
    }

    const userResult = await usersCollection().updateOne(
      { 'orders.orderNumber': orderId },
      { $pull: { orders: { orderNumber: orderId } }, $set: { updatedAt: new Date().toISOString() } },
    );

    if (!userResult.modifiedCount) throw new HttpError(404, 'Order was not found.');

    response.json({ deleted: true, orderId });
  } catch (error) {
    next(error);
  }
}

export async function getAdminUsers(_request, response, next) {
  try {
    const users = await usersCollection()
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(120)
      .toArray();

    response.json({ users: users.map((user) => ({ ...user, id: String(user._id), orderCount: user.orders?.length ?? 0 })) });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUser(request, response, next) {
  try {
    const userId = toCleanString(request.params.userId);
    assertRequest(ObjectId.isValid(userId), 400, 'User id is not valid.');

    const update = {};
    const role = toCleanString(request.body.role);
    const status = toCleanString(request.body.status);
    const email = toCleanString(request.body.email);

    if (role) {
      assertRequest(allowedUserRoles.includes(role), 400, 'User role is not valid.');
      update.role = role;
    }

    if (status) {
      assertRequest(allowedUserStatuses.includes(status), 400, 'User status is not valid.');
      update.status = status;
    }

    if (email) {
      assertRequest(isEmail(email), 400, 'Email address must be valid and include @.');
      update.email = email;
      update.emailNormalized = normalizeEmail(email);
    }

    assertRequest(Object.keys(update).length > 0, 400, 'At least one user field is required.');
    update.updatedAt = new Date().toISOString();

    const user = await usersCollection().findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: update },
      { returnDocument: 'after', projection: { password: 0 } },
    );

    if (!user) throw new HttpError(404, 'User was not found.');

    response.json({ user: { ...user, id: String(user._id), orderCount: user.orders?.length ?? 0 } });
  } catch (error) {
    next(error);
  }
}
