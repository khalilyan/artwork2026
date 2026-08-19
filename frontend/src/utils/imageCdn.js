const defaultWidths = [480, 768, 1024, 1366, 1600, 1920, 2560];
const configuredProxyBaseUrl = String(import.meta.env.VITE_IMAGE_PROXY_BASE_URL ?? '').trim();

function toPositiveInteger(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const roundedValue = Math.round(numericValue);
  return roundedValue > 0 ? roundedValue : null;
}

function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ''));
}

function removeGoogleTransformSuffix(urlValue) {
  const [basePart, queryAndHash = ''] = String(urlValue).split(/([?#].*)/, 2);
  const cleanedBase = basePart.replace(/=[^/?#]+$/, '');
  return `${cleanedBase}${queryAndHash}`;
}

function withProxyUrl(source, options) {
  if (!configuredProxyBaseUrl || !isAbsoluteHttpUrl(source)) return null;

  const proxyUrl = new URL(configuredProxyBaseUrl);
  const width = toPositiveInteger(options.width);
  const quality = toPositiveInteger(options.quality);
  const format = String(options.format ?? 'auto').toLowerCase();

  proxyUrl.searchParams.set('url', source);
  if (width) proxyUrl.searchParams.set('w', String(width));
  if (quality) proxyUrl.searchParams.set('q', String(quality));
  if (format && format !== 'auto') proxyUrl.searchParams.set('output', format);

  return proxyUrl.toString();
}

function withCloudinaryTransforms(source, options) {
  if (!isAbsoluteHttpUrl(source)) return null;

  const parsedUrl = new URL(source);
  if (!parsedUrl.hostname.includes('res.cloudinary.com')) return null;

  const marker = '/upload/';
  const markerIndex = parsedUrl.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const width = toPositiveInteger(options.width);
  const quality = toPositiveInteger(options.quality);
  const format = String(options.format ?? 'auto').toLowerCase();

  const transforms = [
    width ? `w_${width}` : null,
    width ? 'c_limit' : null,
    quality ? `q_${quality}` : 'q_auto',
    format ? `f_${format}` : 'f_auto',
  ].filter(Boolean).join(',');

  if (!transforms) return source;

  const before = parsedUrl.pathname.slice(0, markerIndex + marker.length);
  const after = parsedUrl.pathname.slice(markerIndex + marker.length).replace(/^\/+/, '');
  return `${parsedUrl.origin}${before}${transforms}/${after}${parsedUrl.search}${parsedUrl.hash}`;
}

function withGoogleusercontentTransforms(source, options) {
  if (!isAbsoluteHttpUrl(source)) return null;

  const parsedUrl = new URL(source);
  if (!parsedUrl.hostname.includes('googleusercontent.com')) return null;

  const width = toPositiveInteger(options.width);
  if (!width) return removeGoogleTransformSuffix(source);

  const cleanedUrl = removeGoogleTransformSuffix(source);
  const [basePart, queryAndHash = ''] = String(cleanedUrl).split(/([?#].*)/, 2);
  return `${basePart}=w${width}${queryAndHash}`;
}

export function getOptimizedImageUrl(source, options = {}) {
  const originalSource = String(source ?? '').trim();
  if (!originalSource) return '';
  if (!isAbsoluteHttpUrl(originalSource)) return originalSource;

  const proxiedSource = withProxyUrl(originalSource, options);
  if (proxiedSource) return proxiedSource;

  const cloudinarySource = withCloudinaryTransforms(originalSource, options);
  if (cloudinarySource) return cloudinarySource;

  const googleusercontentSource = withGoogleusercontentTransforms(originalSource, options);
  if (googleusercontentSource) return googleusercontentSource;

  return originalSource;
}

export function createResponsiveImageSources(source, options = {}) {
  const widths = Array.from(new Set((Array.isArray(options.widths) ? options.widths : defaultWidths)
    .map(toPositiveInteger)
    .filter(Boolean))).sort((first, second) => first - second);
  const sizes = String(options.sizes ?? '100vw');
  const quality = toPositiveInteger(options.quality) ?? 72;
  const format = String(options.format ?? 'auto').toLowerCase();

  if (!widths.length) {
    const fallbackSrc = getOptimizedImageUrl(source, { quality, format });
    return { src: fallbackSrc, srcSet: undefined, sizes: undefined };
  }

  const srcSetEntries = widths.map((width) => {
    const url = getOptimizedImageUrl(source, { width, quality, format });
    return { width, url };
  });
  const uniqueUrls = Array.from(new Set(srcSetEntries.map((entry) => entry.url)));

  if (uniqueUrls.length <= 1) {
    return {
      src: uniqueUrls[0] ?? getOptimizedImageUrl(source, { width: widths[widths.length - 1], quality, format }),
      srcSet: undefined,
      sizes: undefined,
    };
  }

  const srcSet = srcSetEntries.map((entry) => `${entry.url} ${entry.width}w`).join(', ');
  const src = getOptimizedImageUrl(source, { width: widths[widths.length - 1], quality, format });

  return { src, srcSet, sizes };
}