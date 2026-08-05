import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { isEmail, toCleanString, toPositiveInteger } from '../utils/validators.js';
import { createProductSnapshot, findProductBySlug, listProducts } from '../models/productModel.js';
import { toPublicUser, updateUserById, usersCollection } from '../models/userModel.js';
import { getDatabase } from '../db/mongo.js';
import { createInfoTable, escapeHtml, sendAdminNotificationEmailQuietly } from '../utils/email.js';

async function getProductOrFail(productSlug) {
  const productMatch = await findProductBySlug(productSlug);
  if (!productMatch) {
    throw new HttpError(404, 'Product was not found.');
  }

  return productMatch.product;
}

async function getCollectionOrFail(collectionSlug) {
  const collection = await getDatabase().collection('collections').findOne({ slug: collectionSlug, isActive: { $ne: false } });
  if (!collection) {
    throw new HttpError(404, 'Collection was not found.');
  }

  return collection;
}

async function getCollectionProducts(collection) {
  const allProducts = await listProducts();
  return (collection.productSlugs ?? [])
    .map((slug) => allProducts.find((product) => product.slug === slug))
    .filter(Boolean);
}

function createCollectionSnapshot(collection, products = []) {
  const fallbackAmount = products.reduce((sum, product) => sum + Number(product.price?.amount ?? product.priceAmount ?? 0), 0);
  const price = collection.price?.amount ? collection.price : {
    amount: fallbackAmount || null,
    currency: 'AMD',
    display: fallbackAmount
      ? new Intl.NumberFormat('hy-AM', { style: 'currency', currency: 'AMD', maximumFractionDigits: 0 }).format(fallbackAmount)
      : 'Price on request',
  };

  return {
    productSlug: `collection:${collection.slug}`,
    itemType: 'collection',
    collectionSlug: collection.slug,
    name: collection.title,
    image: collection.heroImage ?? collection.image ?? null,
    price,
    productSlugs: collection.productSlugs ?? [],
    products: products.map(createProductSnapshot),
  };
}

export function getCart(request, response) {
  response.json({ cart: request.user.cart ?? [] });
}

export async function addCartItem(request, response, next) {
  try {
    const collectionSlug = toCleanString(request.body.collectionSlug);
    const productSlug = collectionSlug ? `collection:${collectionSlug}` : toCleanString(request.body.productSlug);
    const quantity = toPositiveInteger(request.body.quantity);

    assertRequest(productSlug, 400, 'Product slug is required.');
    let snapshot;
    if (collectionSlug) {
      const collection = await getCollectionOrFail(collectionSlug);
      snapshot = createCollectionSnapshot(collection, await getCollectionProducts(collection));
    } else {
      snapshot = createProductSnapshot(await getProductOrFail(productSlug));
    }
    const existingItem = (request.user.cart ?? []).find((item) => item.productSlug === productSlug);
    const now = new Date().toISOString();

    if (existingItem) {
      await usersCollection().updateOne(
        { _id: request.user._id, 'cart.productSlug': productSlug },
        {
          $inc: { 'cart.$.quantity': quantity },
          $set: { 'cart.$.snapshot': snapshot, 'cart.$.updatedAt': now, updatedAt: now },
        },
      );
    } else {
      await usersCollection().updateOne(
        { _id: request.user._id },
        {
          $push: {
            cart: {
              ...snapshot,
              quantity,
              addedAt: now,
              updatedAt: now,
            },
          },
          $set: { updatedAt: now },
        },
      );
    }

    const user = await updateUserById(request.user._id, { $set: { updatedAt: now } });
    response.status(201).json({ cart: user.cart ?? [] });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(request, response, next) {
  try {
    const productSlug = toCleanString(request.params.productSlug);
    const quantity = toPositiveInteger(request.body.quantity, 0);
    const now = new Date().toISOString();

    assertRequest(productSlug, 400, 'Product slug is required.');

    if (quantity < 1) {
      await usersCollection().updateOne(
        { _id: request.user._id },
        { $pull: { cart: { productSlug } }, $set: { updatedAt: now } },
      );
    } else {
      const result = await usersCollection().updateOne(
        { _id: request.user._id, 'cart.productSlug': productSlug },
        { $set: { 'cart.$.quantity': quantity, 'cart.$.updatedAt': now, updatedAt: now } },
      );

      if (!result.matchedCount) {
        throw new HttpError(404, 'Cart item was not found.');
      }
    }

    const user = await usersCollection().findOne({ _id: request.user._id }, { projection: { password: 0 } });
    response.json({ cart: user.cart ?? [] });
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(request, response, next) {
  try {
    const productSlug = toCleanString(request.params.productSlug);
    const now = new Date().toISOString();

    await usersCollection().updateOne(
      { _id: request.user._id },
      { $pull: { cart: { productSlug } }, $set: { updatedAt: now } },
    );

    const user = await usersCollection().findOne({ _id: request.user._id }, { projection: { password: 0 } });
    response.json({ cart: user.cart ?? [] });
  } catch (error) {
    next(error);
  }
}

export function getSavedItems(request, response) {
  response.json({ saved_items: request.user.saved_items ?? [] });
}

export async function addSavedItem(request, response, next) {
  try {
    const productSlug = toCleanString(request.body.productSlug);
    const now = new Date().toISOString();

    assertRequest(productSlug, 400, 'Product slug is required.');
    const product = await getProductOrFail(productSlug);

    if ((request.user.saved_items ?? []).some((item) => item.productSlug === productSlug)) {
      response.json({ saved_items: request.user.saved_items ?? [] });
      return;
    }

    await usersCollection().updateOne(
      { _id: request.user._id },
      {
        $push: {
          saved_items: {
            ...createProductSnapshot(product),
            savedAt: now,
          },
        },
        $set: { updatedAt: now },
      },
    );

    const user = await usersCollection().findOne({ _id: request.user._id }, { projection: { password: 0 } });
    response.status(201).json({ saved_items: user.saved_items ?? [] });
  } catch (error) {
    next(error);
  }
}

export async function removeSavedItem(request, response, next) {
  try {
    const productSlug = toCleanString(request.params.productSlug);
    const now = new Date().toISOString();

    await usersCollection().updateOne(
      { _id: request.user._id },
      { $pull: { saved_items: { productSlug } }, $set: { updatedAt: now } },
    );

    const user = await usersCollection().findOne({ _id: request.user._id }, { projection: { password: 0 } });
    response.json({ saved_items: user.saved_items ?? [] });
  } catch (error) {
    next(error);
  }
}

export function getOrders(request, response) {
  response.json({ orders: request.user.orders ?? [] });
}

function createOrderNumber(prefix = 'ART') {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
}

function formatAmdAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Գինը հարցումով';

  return new Intl.NumberFormat('hy-AM', {
    style: 'currency',
    currency: 'AMD',
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

function getMoneyAmount(value) {
  const amount = Number(value?.amount ?? value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getMoneyDisplay(value) {
  if (value?.display) return value.display;
  const amount = getMoneyAmount(value);
  return amount ? formatAmdAmount(amount) : 'Գինը հարցումով';
}

function normalizeOrderCustomer(body, fallbackUser) {
  const name = toCleanString(body.name, fallbackUser?.fullName);
  const phone = toCleanString(body.phone, fallbackUser?.profile?.phone);
  const email = toCleanString(body.email, fallbackUser?.email);
  const shippingAddress = toCleanString(body.shippingAddress, fallbackUser?.profile?.defaultShippingAddress);
  const notes = toCleanString(body.notes);

  assertRequest(name.length >= 2, 400, 'Name is required.');
  assertRequest(phone.length >= 3, 400, 'Phone number is required.');
  if (email) {
    assertRequest(isEmail(email), 400, 'Email address must be valid and include @.');
  }

  return { name, phone, email: email || null, shippingAddress: shippingAddress || null, notes: notes || null };
}

function normalizeItemPrice(item) {
  const amount = getMoneyAmount(item.unitPrice ?? item.price ?? item.snapshot?.price);
  const display = toCleanString(
    item.unitPrice?.display
      ?? item.price?.display
      ?? item.snapshot?.price?.display,
    amount ? formatAmdAmount(amount) : 'Գինը հարցումով',
  );

  return {
    amount: amount || null,
    currency: toCleanString(
      item.unitPrice?.currency
        ?? item.price?.currency
        ?? item.snapshot?.price?.currency,
      'AMD',
    ),
    display,
  };
}

function normalizeSnapshotProducts(products) {
  if (!Array.isArray(products)) return [];

  return products
    .map((product, index) => {
      const productSlug = toCleanString(product.productSlug ?? product.slug ?? product.id, `snapshot-product-${index + 1}`);
      const productPrice = normalizeItemPrice(product);

      return {
        productSlug,
        productSku: toCleanString(product.productSku ?? product.sku) || null,
        name: toCleanString(product.name, productSlug),
        image: toCleanString(product.image ?? product.snapshot?.image) || null,
        gallery: Array.isArray(product.gallery ?? product.snapshot?.gallery) ? (product.gallery ?? product.snapshot?.gallery) : [],
        price: productPrice,
        roomSlugs: Array.isArray(product.roomSlugs ?? product.snapshot?.roomSlugs) ? (product.roomSlugs ?? product.snapshot?.roomSlugs) : [],
        categorySlug: toCleanString(product.categorySlug ?? product.snapshot?.categorySlug) || null,
        type: toCleanString(product.type ?? product.snapshot?.type) || null,
      };
    })
    .filter((product) => product.name);
}

function createFallbackSnapshotFromItem(item, { collectionSlug = '', productSlug = '' } = {}) {
  const price = normalizeItemPrice(item);
  const name = toCleanString(item.name ?? item.snapshot?.name, productSlug || collectionSlug);
  const image = toCleanString(item.image ?? item.snapshot?.image) || null;

  if (!name) {
    return null;
  }

  if (item.itemType === 'collection' || String(productSlug).startsWith('collection:')) {
    const resolvedCollectionSlug = toCleanString(collectionSlug || String(productSlug).replace(/^collection:/, ''));
    const normalizedProducts = normalizeSnapshotProducts(item.products ?? item.snapshot?.products);
    const resolvedProductSlugs = normalizedProducts.map((product) => product.productSlug);

    return {
      productSlug: `collection:${resolvedCollectionSlug}`,
      itemType: 'collection',
      collectionSlug: resolvedCollectionSlug,
      name,
      image,
      price,
      productSlugs: Array.isArray(item.productSlugs ?? item.snapshot?.productSlugs)
        ? (item.productSlugs ?? item.snapshot?.productSlugs)
        : resolvedProductSlugs,
      products: normalizedProducts,
    };
  }

  const resolvedProductSlug = toCleanString(productSlug || item.productSlug);
  return {
    productSlug: resolvedProductSlug,
    productSku: toCleanString(item.productSku ?? item.sku ?? item.snapshot?.productSku) || null,
    name,
    image,
    gallery: Array.isArray(item.gallery ?? item.snapshot?.gallery) ? (item.gallery ?? item.snapshot?.gallery) : [],
    price,
    roomSlugs: Array.isArray(item.roomSlugs ?? item.snapshot?.roomSlugs) ? (item.roomSlugs ?? item.snapshot?.roomSlugs) : [],
    categorySlug: toCleanString(item.categorySlug ?? item.snapshot?.categorySlug) || null,
    type: toCleanString(item.type ?? item.snapshot?.type) || null,
  };
}

async function normalizeOrderItems(items) {
  assertRequest(Array.isArray(items) && items.length > 0, 400, 'Order must include at least one product.');

  const normalizedItems = [];

  for (const item of items) {
    const collectionSlug = toCleanString(item.collectionSlug || String(item.productSlug ?? '').replace(/^collection:/, ''));
    const productSlug = toCleanString(item.productSlug);
    const quantity = toPositiveInteger(item.quantity);

    assertRequest(productSlug, 400, 'Product slug is required.');
    if (item.itemType === 'collection' || productSlug.startsWith('collection:')) {
      let snapshot;

      try {
        const collection = await getCollectionOrFail(collectionSlug);
        snapshot = createCollectionSnapshot(collection, await getCollectionProducts(collection));
      } catch (error) {
        if (error.status !== 404) throw error;

        snapshot = createFallbackSnapshotFromItem(item, { collectionSlug, productSlug });
        if (!snapshot) throw error;
      }

      normalizedItems.push({
        ...snapshot,
        quantity,
        unitPrice: snapshot.price ?? null,
      });
    } else {
      let snapshot;

      try {
        const product = await getProductOrFail(productSlug);
        snapshot = createProductSnapshot(product);
      } catch (error) {
        if (error.status !== 404) throw error;

        snapshot = createFallbackSnapshotFromItem(item, { productSlug });
        if (!snapshot) throw error;
      }

      normalizedItems.push({
        ...snapshot,
        quantity,
        unitPrice: snapshot.price ?? null,
      });
    }
  }

  return normalizedItems;
}

function createOrderDocument({ customer, items, userId = null }) {
  const now = new Date().toISOString();
  const subtotal = items.reduce((sum, item) => sum + getMoneyAmount(item.unitPrice ?? item.price) * item.quantity, 0);

  return {
    _id: new ObjectId(),
    orderNumber: createOrderNumber(userId ? 'ART' : 'GUEST'),
    status: 'quote_requested',
    userId,
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    shippingAddress: customer.shippingAddress,
    items,
    pricing: {
      subtotal: subtotal || null,
      shipping: null,
      tax: null,
      total: subtotal || null,
      currency: 'AMD',
      requiresManualFinalPrice: !subtotal,
    },
    notes: customer.notes,
    createdAt: now,
    updatedAt: now,
  };
}

function getPublicBaseUrl() {
  const firstOrigin = env.clientOrigins?.[0] ?? 'http://localhost:5173';
  return String(firstOrigin).replace(/\/$/, '');
}

function absolutePublicUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  return `${getPublicBaseUrl()}${String(value).startsWith('/') ? '' : '/'}${value}`;
}

function getOrderItemUrl(item) {
  if (item.itemType === 'collection' || String(item.productSlug ?? '').startsWith('collection:')) {
    return absolutePublicUrl(`/${item.collectionSlug ?? String(item.productSlug).replace(/^collection:/, '')}`);
  }

  const roomSlug = item.roomSlugs?.[0] ?? 'living-room';
  const categorySlug = item.categorySlug ?? item.type ?? 'seating';
  return absolutePublicUrl(`/rooms/${roomSlug}/${categorySlug}/${item.productSlug}`);
}

async function fetchInlineImage(imageUrl, cid, filename) {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;

    return {
      cid,
      filename,
      contentType,
      content: Buffer.from(await response.arrayBuffer()),
    };
  } catch {
    return null;
  }
}

async function createOrderEmailImages(order) {
  const imageSources = [];
  const attachments = [];

  await Promise.all((order.items ?? []).map(async (item, index) => {
    const imageUrl = absolutePublicUrl(item.image);
    const cid = `order-item-${index + 1}@artwork`;
    const extension = imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
    const attachment = await fetchInlineImage(imageUrl, cid, `order-item-${index + 1}.${extension}`);

    if (attachment) {
      attachments.push(attachment);
      imageSources[index] = `cid:${cid}`;
    } else {
      imageSources[index] = imageUrl;
    }
  }));

  return { attachments, imageSources };
}

function formatOrderItems(order) {
  return (order.items ?? []).map((item) => {
    const unitPrice = getMoneyDisplay(item.unitPrice ?? item.price);
    const lineAmount = getMoneyAmount(item.unitPrice ?? item.price) * item.quantity;
    const lineTotal = lineAmount ? formatAmdAmount(lineAmount) : unitPrice;
    return `${item.name} x ${item.quantity} - ${unitPrice} - ընդամենը ${lineTotal} - ${getOrderItemUrl(item)}`;
  });
}

function renderOrderItemCards(order, imageSources = []) {
  return (order.items ?? []).map((item, itemIndex) => {
    const unitPrice = getMoneyDisplay(item.unitPrice ?? item.price);
    const lineAmount = getMoneyAmount(item.unitPrice ?? item.price) * item.quantity;
    const lineTotal = lineAmount ? formatAmdAmount(lineAmount) : unitPrice;
    const image = imageSources[itemIndex] ?? absolutePublicUrl(item.image);
    const itemUrl = getOrderItemUrl(item);
    const sku = item.itemType === 'collection' ? 'Հավաքածու' : item.productSku ?? item.productSlug;

    return `
      <tr>
        <td style="padding:12px;border:1px solid #e7ddd0;width:96px;">
          ${image ? `<a href="${escapeHtml(itemUrl)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(item.name)}" style="display:block;width:82px;height:82px;object-fit:cover;border:1px solid #eee;" /></a>` : ''}
        </td>
        <td style="padding:12px;border:1px solid #e7ddd0;font-family:Arial,sans-serif;color:#211b16;">
          <strong style="display:block;margin-bottom:6px;">${escapeHtml(item.name)}</strong>
          <span style="display:block;color:#6f6259;font-size:13px;">Կոդ՝ ${escapeHtml(sku)}</span>
          <a href="${escapeHtml(itemUrl)}" style="display:inline-block;margin-top:8px;color:#633005;">Բացել ապրանքը</a>
        </td>
        <td style="padding:12px;border:1px solid #e7ddd0;font-family:Arial,sans-serif;text-align:center;color:#211b16;">${escapeHtml(item.quantity)}</td>
        <td style="padding:12px;border:1px solid #e7ddd0;font-family:Arial,sans-serif;color:#211b16;">${escapeHtml(unitPrice)}</td>
        <td style="padding:12px;border:1px solid #e7ddd0;font-family:Arial,sans-serif;color:#211b16;font-weight:700;">${escapeHtml(lineTotal)}</td>
      </tr>
    `;
  }).join('');
}

export function notifyAdminAboutOrder(order) {
  const itemLines = formatOrderItems(order);
  const total = order.pricing.total ? formatAmdAmount(order.pricing.total) : 'Ձեռքով հաշվարկվող գին';
  const adminUrl = absolutePublicUrl('/admin');

  return createOrderEmailImages(order)
    .then(({ attachments, imageSources }) => {
      sendAdminNotificationEmailQuietly({
        subject: `ARTWORK նոր պատվեր ${order.orderNumber}`,
        text: [
          `Նոր պատվեր՝ ${order.orderNumber}`,
          `Հաճախորդ՝ ${order.customer.name}`,
          `Հեռախոս՝ ${order.customer.phone}`,
          `Էլ. փոստ՝ ${order.customer.email ?? '-'}`,
          `Հասցե՝ ${order.shippingAddress ?? '-'}`,
          `Ընդհանուր՝ ${total}`,
          `Ադմին պանել՝ ${adminUrl}`,
          '',
          ...itemLines,
          '',
          order.notes ? `Նշումներ՝ ${order.notes}` : '',
        ].join('\n'),
        html: `
          <h2 style="font-family:Arial,sans-serif;color:#211b16;">Նոր ARTWORK պատվեր</h2>
          <p style="font-family:Arial,sans-serif;margin:18px 0;">
            <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 18px;background:#633005;color:#fff;text-decoration:none;font-weight:700;letter-spacing:.04em;">ԲԱՑԵԼ ԱԴՄԻՆ ՊԱՆԵԼԸ</a>
          </p>
          ${createInfoTable([
            ['Պատվեր', order.orderNumber],
            ['Հաճախորդ', order.customer.name],
            ['Հեռախոս', order.customer.phone],
            ['Էլ. փոստ', order.customer.email ?? '-'],
            ['Հասցե', order.shippingAddress ?? '-'],
            ['Ընդհանուր', total],
            ['Նշումներ', order.notes ?? '-'],
          ])}
          <h3 style="font-family:Arial,sans-serif;color:#633005;">Ապրանքներ</h3>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;">
            <thead>
              <tr>
                <th style="padding:10px;border:1px solid #e7ddd0;text-align:left;font-family:Arial,sans-serif;color:#633005;">Նկար</th>
                <th style="padding:10px;border:1px solid #e7ddd0;text-align:left;font-family:Arial,sans-serif;color:#633005;">Ապրանք</th>
                <th style="padding:10px;border:1px solid #e7ddd0;text-align:center;font-family:Arial,sans-serif;color:#633005;">Քանակ</th>
                <th style="padding:10px;border:1px solid #e7ddd0;text-align:left;font-family:Arial,sans-serif;color:#633005;">Միավորի գին</th>
                <th style="padding:10px;border:1px solid #e7ddd0;text-align:left;font-family:Arial,sans-serif;color:#633005;">Ընդամենը</th>
              </tr>
            </thead>
            <tbody>
              ${renderOrderItemCards(order, imageSources)}
              <tr>
                <td colspan="4" style="padding:14px;border:1px solid #e7ddd0;text-align:right;font-family:Arial,sans-serif;color:#633005;font-weight:700;">Ամբողջ պատվերի գին</td>
                <td style="padding:14px;border:1px solid #e7ddd0;font-family:Arial,sans-serif;color:#211b16;font-weight:700;">${escapeHtml(total)}</td>
              </tr>
            </tbody>
          </table>
        `,
        attachments,
      });
    })
    .catch((error) => {
      console.error('Order email notification failed:', error);
    });
}

export async function createAccountOrder(request, response, next) {
  try {
    const customer = normalizeOrderCustomer(request.body, request.user);
    const items = await normalizeOrderItems(request.body.items ?? request.user.cart ?? []);
    const order = createOrderDocument({ customer, items, userId: request.user._id });
    const shouldPreserveCart = request.body.preserveCart === true;

    const user = await updateUserById(request.user._id, {
      $push: { orders: { $each: [order], $position: 0 } },
      $set: { ...(shouldPreserveCart ? {} : { cart: [] }), updatedAt: new Date().toISOString() },
    });

    notifyAdminAboutOrder(order);
    response.status(201).json({ order, orders: user.orders ?? [], cart: user.cart ?? [] });
  } catch (error) {
    next(error);
  }
}

export async function createGuestOrder(request, response, next) {
  try {
    const customer = normalizeOrderCustomer(request.body);
    const items = await normalizeOrderItems(request.body.items);
    const order = createOrderDocument({ customer, items });

    await getDatabase().collection('guest_orders').insertOne(order);

    notifyAdminAboutOrder(order);
    response.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}
