import { formatAmdPrice, formatAmdPriceByUnit, getPriceAmount } from '../utils/currency.js';

const defaultProductionApiBaseUrl = 'https://api.artwork.am/api';
const configuredApiBaseUrl = resolveApiBaseUrl();
const configuredFallbackApiBaseUrls = resolveFallbackApiBaseUrls();
const authTokenKey = 'artworkAuthToken';
const authUserKey = 'artworkAuthUser';
const guestCartKey = 'artworkGuestCart';
const guestIdKey = 'artworkGuestId';
const preferredApiBaseUrlKey = 'artworkApiBaseUrl';
const requestTimeoutMs = 12000;
let resolvedApiBaseUrl = null;

function resolveApiBaseUrl() {
  const envBaseUrl = String(import.meta.env.VITE_API_URL ?? '').trim();

  if (!envBaseUrl) {
    return import.meta.env.PROD ? defaultProductionApiBaseUrl : 'http://localhost:4000/api';
  }

  // In production, a relative base (e.g. "/api") can accidentally point to the frontend host.
  if (import.meta.env.PROD && envBaseUrl.startsWith('/')) {
    return defaultProductionApiBaseUrl;
  }

  return envBaseUrl;
}

function resolveFallbackApiBaseUrls() {
  const fallbackList = String(import.meta.env.VITE_API_FALLBACK_URLS ?? '').trim();
  if (!fallbackList) return [];

  return fallbackList
    .split(',')
    .map((url) => normalizeBaseUrl(url.trim()))
    .filter(Boolean);
}

function readStoredJson(key, fallbackValue) {
  const rawValue = window.localStorage.getItem(key);

  if (!rawValue || rawValue === 'undefined') {
    return fallbackValue;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue ?? fallbackValue;
  } catch {
    window.localStorage.removeItem(key);
    return fallbackValue;
  }
}

function normalizeBaseUrl(value) {
  if (!value) return '';
  return String(value).replace(/\/+$/, '');
}

function ensureProductionApiBasePath(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized || !import.meta.env.PROD) return normalized;

  const parsed = parseUrlSafely(normalized);
  if (!parsed) return normalized;

  const pathname = parsed.pathname.replace(/\/+$/, '');
  if (pathname.endsWith('/api')) return normalized;

  if (isArtworkApiHost(normalized) || !pathname || pathname === '/') {
    parsed.pathname = '/api';
    parsed.search = '';
    parsed.hash = '';
    return normalizeBaseUrl(parsed.toString());
  }

  return normalized;
}

function getStoredPreferredApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  return ensureProductionApiBasePath(window.localStorage.getItem(preferredApiBaseUrlKey));
}

function setStoredPreferredApiBaseUrl(baseUrl) {
  if (typeof window === 'undefined') return;

  const normalized = ensureProductionApiBasePath(baseUrl);
  if (!normalized) {
    window.localStorage.removeItem(preferredApiBaseUrlKey);
    return;
  }

  window.localStorage.setItem(preferredApiBaseUrlKey, normalized);
}

function parseUrlSafely(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isArtworkApiHost(baseUrl) {
  const parsed = parseUrlSafely(baseUrl);
  if (!parsed) return false;

  const hostname = parsed.hostname.toLowerCase();
  return hostname === 'api.artwork.am' || hostname === 'www.api.artwork.am';
}

function createBaseCandidates(baseUrl) {
  const normalizedBase = ensureProductionApiBasePath(baseUrl);
  const candidates = [];
  const pushCandidate = (candidate) => {
    const normalized = ensureProductionApiBasePath(candidate);
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  if (import.meta.env.PROD) {
    pushCandidate(getStoredPreferredApiBaseUrl());
  }

  pushCandidate(normalizedBase);

  if (!import.meta.env.PROD) {
    if (normalizedBase.endsWith('/api')) {
      pushCandidate(normalizedBase.slice(0, -4));
    } else {
      pushCandidate(`${normalizedBase}/api`);
    }
  }

  if (import.meta.env.PROD) {
    if (isArtworkApiHost(normalizedBase)) {
      pushCandidate('https://www.api.artwork.am/api');
    }

    configuredFallbackApiBaseUrls.forEach((fallbackBase) => pushCandidate(fallbackBase));
  }

  return candidates.filter((candidate) => candidate || candidate === '');
}

function composeRequestUrl(baseUrl, path) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (!normalizedBase) return path;
  return `${normalizedBase}${path}`;
}

async function fetchWithTimeout(url, requestOptions) {
  if (requestOptions.signal) {
    return fetch(url, requestOptions);
  }

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), requestTimeoutMs);

  try {
    return await fetch(url, {
      ...requestOptions,
      signal: abortController.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(resolvedApiBaseUrl ?? configuredApiBaseUrl);
}

export function createApiUrl(path) {
  return composeRequestUrl(getApiBaseUrl(), path);
}

function toRequestError(response, data) {
  const error = new Error(data.error?.message ?? 'Request failed.');
  error.status = response.status;
  error.data = data;
  return error;
}

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
  return readStoredJson(authUserKey, null);
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
  const cart = readStoredJson(guestCartKey, []);
  return Array.isArray(cart) ? cart : [];
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
  const pricePerSquareMeter = Boolean(product.pricePerSquareMeter);

  return {
    productSlug: product.id,
    productSku: product.sku ?? null,
    name: product.name,
    image: product.gallery?.[0] ?? product.image,
    pricePerSquareMeter,
    price: {
      display: formatAmdPriceByUnit(priceAmount, pricePerSquareMeter),
      amount: priceAmount || null,
      currency: 'AMD',
      pricePerSquareMeter,
    },
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
  const {
    includeAuth = true,
    includeGuestId = true,
    ...requestOptions
  } = options;
  const token = getAuthToken();
  const baseCandidates = createBaseCandidates(resolvedApiBaseUrl ?? configuredApiBaseUrl);
  const requestMethod = String(requestOptions.method ?? 'GET').toUpperCase();
  const isReadRequest = requestMethod === 'GET' || requestMethod === 'HEAD';
  const hasBody = requestOptions.body !== undefined && requestOptions.body !== null;

  for (let index = 0; index < baseCandidates.length; index += 1) {
    const candidate = baseCandidates[index];

    try {
      const baseHeaders = {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(!isReadRequest && includeGuestId ? { 'X-Artwork-Guest-Id': getGuestId() } : {}),
        ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetchWithTimeout(composeRequestUrl(candidate, path), {
        ...requestOptions,
        headers: {
          ...baseHeaders,
          ...(requestOptions.headers ?? {}),
        },
      });
      const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
      const isJsonResponse = contentType.includes('application/json');
      const data = isJsonResponse ? await response.json().catch(() => ({})) : {};

      if (response.ok && isJsonResponse) {
        resolvedApiBaseUrl = candidate;
        setStoredPreferredApiBaseUrl(candidate);
        return data;
      }

      if (response.ok && !isJsonResponse) {
        const nonJsonError = new Error('Unexpected API response format.');
        nonJsonError.status = response.status;
        throw nonJsonError;
      }

      const canRetryOn404 = response.status === 404 && index < baseCandidates.length - 1;
      if (!canRetryOn404) {
        throw toRequestError(response, data);
      }
    } catch (error) {
      const canRetry = index < baseCandidates.length - 1;
      if (!canRetry) {
        throw error;
      }
    }
  }

  throw new Error('Request failed.');
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
  rooms: () => apiRequest('/catalog/rooms', { includeAuth: false, includeGuestId: false }),
  room: (roomSlug) => apiRequest(`/catalog/rooms/${roomSlug}`, { includeAuth: false, includeGuestId: false }),
  categories: () => apiRequest('/catalog/categories', { includeAuth: false, includeGuestId: false }),
  pageAssets: (pageKey) => apiRequest(`/catalog/page-assets/${pageKey}`, { includeAuth: false, includeGuestId: false }),
  page: (pageSlug) => apiRequest(`/catalog/pages/${pageSlug}`, { includeAuth: false, includeGuestId: false }),
  products: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
    return apiRequest(`/catalog/products${query ? `?${query}` : ''}`, { includeAuth: false, includeGuestId: false });
  },
  product: (productSlug) => apiRequest(`/catalog/products/${productSlug}`, { includeAuth: false, includeGuestId: false }),
  aiSettings: () => apiRequest('/ai/settings'),
  visualizeProductInRoom: (payload) => apiRequest('/ai/room-preview', { method: 'POST', body: JSON.stringify(payload) }),
  collections: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString();
    return apiRequest(`/catalog/collections${query ? `?${query}` : ''}`, { includeAuth: false, includeGuestId: false });
  },
  collection: (collectionSlug) => apiRequest(`/catalog/collections/${collectionSlug}`, { includeAuth: false, includeGuestId: false }),
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
