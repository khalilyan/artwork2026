import { formatAmdPrice, getPriceAmount } from '../utils/currency.js';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');
const authTokenKey = 'artworkAuthToken';
const authUserKey = 'artworkAuthUser';
const guestCartKey = 'artworkGuestCart';
const guestIdKey = 'artworkGuestId';

function createGuestId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();

  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getGuestId() {
  let guestId = window.localStorage.getItem(guestIdKey);

  if (!guestId) {
    guestId = createGuestId();
    window.localStorage.setItem(guestIdKey, guestId);
  }

  return guestId;
}

export function getAuthToken() {
  return window.localStorage.getItem(authTokenKey);
}

export function getStoredAuthUser() {
  const user = window.localStorage.getItem(authUserKey);
  return user ? JSON.parse(user) : null;
}

export function isAuthorized() {
  return Boolean(getAuthToken());
}

export function setAuthSession({ token, user }) {
  window.localStorage.setItem(authTokenKey, token);
  window.localStorage.setItem(authUserKey, JSON.stringify(user));
  window.dispatchEvent(new Event('artwork-auth-change'));
  window.dispatchEvent(new Event('artwork-cart-change'));
}

export function clearAuthSession() {
  window.localStorage.removeItem(authTokenKey);
  window.localStorage.removeItem(authUserKey);
  window.dispatchEvent(new Event('artwork-auth-change'));
  window.dispatchEvent(new Event('artwork-cart-change'));
}

export function getGuestCart() {
  return JSON.parse(window.localStorage.getItem(guestCartKey) ?? '[]');
}

export function setGuestCart(cart) {
  window.localStorage.setItem(guestCartKey, JSON.stringify(cart));
  window.dispatchEvent(new Event('artwork-cart-change'));
}

export function clearGuestCart() {
  window.localStorage.removeItem(guestCartKey);
  window.dispatchEvent(new Event('artwork-cart-change'));
}

export function productToGuestCartItem(product, quantity = 1) {
  const priceAmount = getPriceAmount(product.price?.amount, product.priceAmount, product.price);

  return {
    productSlug: product.id,
    productSku: product.sku ?? null,
    name: product.name,
    image: product.gallery?.[0] ?? product.image,
    price: { display: formatAmdPrice(priceAmount), amount: priceAmount || null, currency: 'AMD' },
    roomSlugs: product.roomSlugs ?? [],
    categorySlug: product.categorySlug ?? product.type ?? null,
    type: product.type ?? null,
    quantity,
    addedAt: new Date().toISOString(),
  };
}

export function collectionToGuestCartItem(collection, quantity = 1) {
  const bundlePrice = getPriceAmount(collection.price?.amount, collection.priceAmount, collection.price);
  const priceAmount = bundlePrice || (collection.products ?? []).reduce(
    (sum, product) => sum + getPriceAmount(product.price?.amount, product.priceAmount, product.price),
    0,
  );

  return {
    productSlug: `collection:${collection.slug}`,
    itemType: 'collection',
    collectionSlug: collection.slug,
    name: collection.title,
    image: collection.heroImage ?? collection.image,
    price: { display: formatAmdPrice(priceAmount), amount: priceAmount || null, currency: 'AMD' },
    productSlugs: collection.productSlugs ?? collection.products?.map((product) => product.slug ?? product.id).filter(Boolean) ?? [],
    products: (collection.products ?? []).map((product) => productToGuestCartItem({ ...product, id: product.slug ?? product.id }, 1)),
    quantity,
    addedAt: new Date().toISOString(),
  };
}

export function addGuestCartItem(product, quantity = 1) {
  const cart = getGuestCart();
  const existingItem = cart.find((item) => item.productSlug === product.id);
  const nextCart = existingItem
    ? cart.map((item) => (item.productSlug === product.id ? { ...item, quantity: item.quantity + quantity } : item))
    : [productToGuestCartItem(product, quantity), ...cart];

  setGuestCart(nextCart);
  return nextCart;
}

export function addGuestCollectionCartItem(collection, quantity = 1) {
  const cart = getGuestCart();
  const collectionKey = `collection:${collection.slug}`;
  const existingItem = cart.find((item) => item.productSlug === collectionKey);
  const nextCart = existingItem
    ? cart.map((item) => (item.productSlug === collectionKey ? { ...item, quantity: item.quantity + quantity } : item))
    : [collectionToGuestCartItem(collection, quantity), ...cart];

  setGuestCart(nextCart);
  return nextCart;
}

async function cartRequest(request) {
  const data = await request();
  window.dispatchEvent(new Event('artwork-cart-change'));
  return data;
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Artwork-Guest-Id': getGuestId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error?.message ?? 'Request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  signup: (payload) => apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => apiRequest('/auth/me'),
  account: () => apiRequest('/account'),
  updateAccount: (payload) => apiRequest('/account/details', { method: 'PATCH', body: JSON.stringify(payload) }),
  updatePassword: (payload) => apiRequest('/account/password', { method: 'PATCH', body: JSON.stringify(payload) }),
  addCartItem: (payload) => cartRequest(() => apiRequest('/account/cart', { method: 'POST', body: JSON.stringify(payload) })),
  updateCartItem: (productSlug, payload) => cartRequest(() => apiRequest(`/account/cart/${productSlug}`, { method: 'PATCH', body: JSON.stringify(payload) })),
  removeCartItem: (productSlug) => cartRequest(() => apiRequest(`/account/cart/${productSlug}`, { method: 'DELETE' })),
  addSavedItem: (payload) => apiRequest('/account/saved-items', { method: 'POST', body: JSON.stringify(payload) }),
  removeSavedItem: (productSlug) => apiRequest(`/account/saved-items/${productSlug}`, { method: 'DELETE' }),
  createAccountOrder: (payload) => cartRequest(() => apiRequest('/account/orders', { method: 'POST', body: JSON.stringify(payload) })),
  createGuestOrder: (payload) => apiRequest('/orders/guest', { method: 'POST', body: JSON.stringify(payload) }),
  submitContact: (payload) => apiRequest('/contact', { method: 'POST', body: JSON.stringify(payload) }),
  pushPublicKey: () => apiRequest('/push/public-key'),
  savePushSubscription: (payload) => apiRequest('/push/subscriptions', { method: 'POST', body: JSON.stringify(payload) }),
  removePushSubscription: (payload) => apiRequest('/push/subscriptions', { method: 'DELETE', body: JSON.stringify(payload) }),
  createReview: (productSlug, payload) => apiRequest(`/products/${productSlug}/reviews`, { method: 'POST', body: JSON.stringify(payload) }),
  rooms: () => apiRequest('/catalog/rooms'),
  room: (roomSlug) => apiRequest(`/catalog/rooms/${roomSlug}`),
  categories: () => apiRequest('/catalog/categories'),
  materials: () => apiRequest('/catalog/materials'),
  pageAssets: (pageKey) => apiRequest(`/catalog/page-assets/${pageKey}`),
  page: (pageSlug) => apiRequest(`/catalog/pages/${pageSlug}`),
  products: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
    return apiRequest(`/catalog/products${query ? `?${query}` : ''}`);
  },
  product: (productSlug) => apiRequest(`/catalog/products/${productSlug}`),
  aiSettings: () => apiRequest('/ai/settings'),
  visualizeProductInRoom: (payload) => apiRequest('/ai/room-preview', { method: 'POST', body: JSON.stringify(payload) }),
  collections: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString();
    return apiRequest(`/catalog/collections${query ? `?${query}` : ''}`);
  },
  collection: (collectionSlug) => apiRequest(`/catalog/collections/${collectionSlug}`),
  adminOverview: () => apiRequest('/admin/overview'),
  adminAiSettings: () => apiRequest('/admin/ai-settings'),
  updateAdminAiSettings: (payload) => apiRequest('/admin/ai-settings', { method: 'PATCH', body: JSON.stringify(payload) }),
  adminProducts: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString();
    return apiRequest(`/admin/products${query ? `?${query}` : ''}`);
  },
  updateAdminProduct: (productSlug, payload) => apiRequest(`/admin/products/${productSlug}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  createAdminProduct: (payload) => apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAdminProduct: (productSlug) => apiRequest(`/admin/products/${productSlug}`, { method: 'DELETE' }),
  deleteAdminProductReview: (productSlug, reviewId) => apiRequest(`/admin/products/${productSlug}/reviews/${reviewId}`, { method: 'DELETE' }),
  adminMaterials: () => apiRequest('/admin/materials'),
  createAdminMaterial: (payload) => apiRequest('/admin/materials', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminMaterial: (materialId, payload) => apiRequest(`/admin/materials/${materialId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminMaterial: (materialId) => apiRequest(`/admin/materials/${materialId}`, { method: 'DELETE' }),
  adminRooms: () => apiRequest('/admin/rooms'),
  createAdminRoom: (payload) => apiRequest('/admin/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminRoom: (roomSlug, payload) => apiRequest(`/admin/rooms/${roomSlug}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminRoom: (roomSlug) => apiRequest(`/admin/rooms/${roomSlug}`, { method: 'DELETE' }),
  adminCollections: () => apiRequest('/admin/collections'),
  adminHomepage: () => apiRequest('/admin/homepage'),
  updateAdminHomepage: (payload) => apiRequest('/admin/homepage', { method: 'PATCH', body: JSON.stringify(payload) }),
  createAdminCollection: (payload) => apiRequest('/admin/collections', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminCollection: (collectionSlug, payload) => apiRequest(`/admin/collections/${collectionSlug}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminCollection: (collectionSlug) => apiRequest(`/admin/collections/${collectionSlug}`, { method: 'DELETE' }),
  uploadAdminImage: (payload) => apiRequest('/admin/uploads/images', { method: 'POST', body: JSON.stringify(payload) }),
  adminOrders: () => apiRequest('/admin/orders'),
  adminContacts: () => apiRequest('/admin/contacts'),
  updateAdminOrder: (orderId, payload) => apiRequest(`/admin/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAdminOrder: (orderId) => apiRequest(`/admin/orders/${orderId}`, { method: 'DELETE' }),
  adminUsers: () => apiRequest('/admin/users'),
  updateAdminUser: (userId, payload) => apiRequest(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};
