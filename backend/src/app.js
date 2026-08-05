import express from 'express';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { corsMiddleware, jsonMiddleware } from './middleware/requestMiddleware.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { findProductBySlug } from './models/productModel.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, '..');
const frontendDist = path.resolve(backendRoot, '..', 'frontend', 'dist');
const frontendIndex = path.join(frontendDist, 'index.html');
const defaultMeta = {
  title: 'ARTWORK | Architectural Artifacts',
  description: 'ARTWORK Furniture - architectural furniture and curated artifacts for refined interiors.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function absoluteUrl(request, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const origin = `${request.protocol}://${request.get('host')}`;
  return new URL(value, origin).href;
}

function formatAmdPrice(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Price on request';

  return `${Math.round(numericAmount).toLocaleString('hy-AM')} ֏`;
}

function buildMetaTags(request, meta) {
  const title = escapeHtml(meta.title ?? defaultMeta.title);
  const description = escapeHtml(meta.description ?? defaultMeta.description);
  const image = escapeHtml(absoluteUrl(request, meta.image));
  const url = escapeHtml(absoluteUrl(request, request.originalUrl));
  const type = escapeHtml(meta.type ?? 'website');
  const priceAmount = Number(meta.priceAmount);
  const priceCurrency = escapeHtml(meta.priceCurrency ?? 'AMD');

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${url}" />`,
    '<meta property="og:site_name" content="ARTWORK" />',
    image ? `<meta property="og:image" content="${image}" />` : '',
    image ? '<meta name="twitter:card" content="summary_large_image" />' : '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    image ? `<meta name="twitter:image" content="${image}" />` : '',
    priceAmount > 0 ? `<meta property="product:price:amount" content="${priceAmount}" />` : '',
    priceAmount > 0 ? `<meta property="product:price:currency" content="${priceCurrency}" />` : '',
  ].filter(Boolean).join('\n    ');
}

function injectMeta(html, tags) {
  return html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta\s+(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+|product:price:[^"']+)["'][^>]*>\s*/gi, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

async function getRouteMeta(request) {
  const productMatch = request.path.toLowerCase().match(/^\/rooms\/[^/]+\/[^/]+\/([^/]+)$/);
  if (!productMatch) return defaultMeta;

  const match = await findProductBySlug(productMatch[1]);
  const product = match?.product;
  if (!product) return defaultMeta;

  const priceText = formatAmdPrice(product.priceAmount);
  return {
    title: `${product.name} | ARTWORK`,
    description: [priceText, product.description].filter(Boolean).join(' · '),
    image: product.image ?? product.gallery?.[0] ?? '',
    type: 'product',
    priceAmount: product.priceAmount,
    priceCurrency: product.currency ?? 'AMD',
  };
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(corsMiddleware);
  app.use(jsonMiddleware);
  app.use('/uploads', express.static(path.join(backendRoot, 'uploads')));
  app.use('/api', apiRoutes);
  // Some cPanel proxy setups strip '/api' before forwarding to Node.
  app.use(apiRoutes);
  if (fs.existsSync(frontendIndex)) {
    app.use(express.static(frontendDist, { index: false }));
    app.use(async (request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) {
        next();
        return;
      }

      try {
        const html = await readFile(frontendIndex, 'utf8');
        const meta = await getRouteMeta(request);
        response.type('html').send(injectMeta(html, buildMetaTags(request, meta)));
      } catch (error) {
        next(error);
      }
    });
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
