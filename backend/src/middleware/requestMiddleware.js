import cors from 'cors';
import express from 'express';
import { env } from '../config/env.js';

const defaultProductionOrigins = [
  'https://artwork.am',
  'https://www.artwork.am',
  'https://api.artwork.am',
];

const allowedMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const allowedHeaders = ['Content-Type', 'Authorization', 'X-Artwork-Guest-Id'];

function isLocalFrontendOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function parseHostname(origin) {
  try {
    return new URL(origin).hostname.toLowerCase().replace(/\.+$/, '');
  } catch {
    return '';
  }
}

function normalizeOrigin(origin) {
  try {
    const parsed = new URL(origin);
    const normalizedHostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');
    return `${parsed.protocol}//${normalizedHostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return '';
  }
}

function addHostnameVariants(hostnames, hostname) {
  if (!hostname) return;

  hostnames.add(hostname);

  if (hostname.startsWith('www.')) {
    hostnames.add(hostname.slice(4));
  } else {
    hostnames.add(`www.${hostname}`);
  }
}

function getRootDomain(hostname) {
  const parts = String(hostname ?? '').split('.').filter(Boolean);
  if (parts.length < 2) return '';
  return parts.slice(-2).join('.');
}

const trustedHostnames = (() => {
  const hostnames = new Set();

  for (const origin of env.clientOrigins) {
    addHostnameVariants(hostnames, parseHostname(origin));
  }

  addHostnameVariants(hostnames, parseHostname(env.publicSiteUrl));
  addHostnameVariants(hostnames, parseHostname(env.publicApiUrl));

  for (const origin of defaultProductionOrigins) {
    addHostnameVariants(hostnames, parseHostname(origin));
  }

  return hostnames;
})();

const trustedOrigins = (() => {
  const origins = new Set();

  for (const origin of [...env.clientOrigins, env.publicSiteUrl, env.publicApiUrl, ...defaultProductionOrigins]) {
    const normalized = normalizeOrigin(origin);
    if (normalized) origins.add(normalized);
  }

  return origins;
})();

const trustedRootDomain = getRootDomain(parseHostname(env.publicSiteUrl)) || 'artwork.am';

function isTrustedDeploymentOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && trustedOrigins.has(normalizedOrigin)) return true;

  const hostname = parseHostname(origin);
  if (!hostname) return false;

  if (trustedHostnames.has(hostname)) return true;
  if (!trustedRootDomain) return false;

  return hostname === trustedRootDomain || hostname.endsWith(`.${trustedRootDomain}`);
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin) || isLocalFrontendOrigin(origin) || isTrustedDeploymentOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: allowedMethods,
  allowedHeaders,
  credentials: true,
  maxAge: 86400,
  optionsSuccessStatus: 204,
});

export const jsonMiddleware = express.json({ limit: '30mb' });
