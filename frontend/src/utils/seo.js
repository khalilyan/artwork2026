const configuredApiBaseUrl = import.meta.env.VITE_API_URL ?? '';

function normalizeBaseUrl(value) {
  return String(value ?? '').replace(/\/+$/, '');
}

const normalizedApiBaseUrl = normalizeBaseUrl(configuredApiBaseUrl);
const apiOrigin = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl.slice(0, -4)
  : normalizedApiBaseUrl;

export const siteName = 'ARTWORK Կահույք';
export const siteShortName = 'ARTWORK';
export const defaultSeoTitle = 'ARTWORK | Դիզայներական կահույք Հայաստանում';
export const defaultSeoDescription = 'ARTWORK-ի դիզայներական կահույք, հավաքածուներ, անհատական լուծումներ և վերականգնման ծառայություններ Հայաստանում։';
export const defaultSeoKeywords = 'ARTWORK, կահույք, դիզայներական կահույք Հայաստան, անհատական կահույք, ինտերիերի կահույք, վերականգնում';
export const defaultSeoImage = '/artwork-logo.png';

export function getAbsoluteUrl(path = '/') {
  if (typeof window === 'undefined') return path;

  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return window.location.origin;
  }
}

export function resolvePublicAssetUrl(path = '') {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith('/uploads/') && apiOrigin) {
    return `${apiOrigin}${path}`;
  }

  return getAbsoluteUrl(path);
}

export function createWebsiteSchema(url = '/') {
  const absoluteUrl = getAbsoluteUrl(url);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    alternateName: siteShortName,
    url: absoluteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getAbsoluteUrl('/products')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function createOrganizationSchema(url = '/') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    alternateName: siteShortName,
    url: getAbsoluteUrl(url),
    logo: resolvePublicAssetUrl(defaultSeoImage),
    sameAs: [],
  };
}
