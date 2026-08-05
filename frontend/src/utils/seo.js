export const siteName = 'ARTWORK Furniture';
export const siteShortName = 'ARTWORK';
export const defaultSeoTitle = 'ARTWORK Furniture | Designer Furniture in Armenia';
export const defaultSeoDescription = 'Shop ARTWORK Furniture for designer furniture, curated collections, custom interiors, restoration, and refined home pieces in Armenia.';
export const defaultSeoKeywords = 'ARTWORK Furniture, designer furniture Armenia, custom furniture Yerevan, interior furniture, luxury furniture, furniture restoration, curated home decor';
export const defaultSeoImage = '/artwork-logo.png';

export function getAbsoluteUrl(path = '/') {
  if (typeof window === 'undefined') return path;

  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return window.location.origin;
  }
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
    logo: getAbsoluteUrl(defaultSeoImage),
    sameAs: [],
  };
}
