import { useEffect } from 'react';
import {
  defaultSeoDescription,
  defaultSeoImage,
  defaultSeoKeywords,
  defaultSeoTitle,
  getAbsoluteUrl,
  resolvePublicAssetUrl,
  siteName,
} from '../../utils/seo.js';

const defaultTitle = defaultSeoTitle;
const defaultDescription = defaultSeoDescription;

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      element.removeAttribute(key);
      return;
    }

    element.setAttribute(key, value);
  });

  return element;
}

function removeMeta(selector) {
  document.head.querySelector(selector)?.remove();
}

function removeAll(selector) {
  document.head.querySelectorAll(selector).forEach((element) => element.remove());
}

function setLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      element.removeAttribute(key);
      return;
    }

    element.setAttribute(key, value);
  });

  return element;
}

export default function SeoMeta({
  title = defaultTitle,
  description = defaultDescription,
  image = defaultSeoImage,
  url = '',
  type = 'website',
  keywords = defaultSeoKeywords,
  robots = 'index, follow',
  locale = 'hy_AM',
  jsonLd = null,
  priceAmount = null,
  priceCurrency = 'AMD',
}) {
  useEffect(() => {
    const absoluteUrl = getAbsoluteUrl(url || window.location.href);
    const absoluteImage = resolvePublicAssetUrl(image);
    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd].filter(Boolean);

    document.title = title;
    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="keywords"]', { name: 'keywords', content: keywords });
    setMeta('meta[name="robots"]', { name: 'robots', content: robots });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: absoluteUrl });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName });
    setMeta('meta[property="og:locale"]', { property: 'og:locale', content: locale });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: absoluteImage ? 'summary_large_image' : 'summary' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setLink('link[rel="canonical"]', { rel: 'canonical', href: absoluteUrl });

    if (absoluteImage) {
      setMeta('meta[property="og:image"]', { property: 'og:image', content: absoluteImage });
      setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: title });
      setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absoluteImage });
    } else {
      removeMeta('meta[property="og:image"]');
      removeMeta('meta[property="og:image:alt"]');
      removeMeta('meta[name="twitter:image"]');
    }

    if (priceAmount) {
      setMeta('meta[property="product:price:amount"]', { property: 'product:price:amount', content: String(priceAmount) });
      setMeta('meta[property="product:price:currency"]', { property: 'product:price:currency', content: priceCurrency });
    } else {
      removeMeta('meta[property="product:price:amount"]');
      removeMeta('meta[property="product:price:currency"]');
    }

    removeAll('script[type="application/ld+json"][data-seo-json]');
    schemas.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seoJson = 'true';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.title = defaultTitle;
      setMeta('meta[name="description"]', { name: 'description', content: defaultDescription });
      setMeta('meta[name="keywords"]', { name: 'keywords', content: defaultSeoKeywords });
      removeMeta('meta[property="product:price:amount"]');
      removeMeta('meta[property="product:price:currency"]');
      removeAll('script[type="application/ld+json"][data-seo-json]');
    };
  }, [description, image, jsonLd, keywords, locale, priceAmount, priceCurrency, robots, title, type, url]);

  return null;
}
