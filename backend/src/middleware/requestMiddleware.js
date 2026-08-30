import cors from 'cors';
import express from 'express';
import { env } from '../config/env.js';

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
    return new URL(origin).hostname.toLowerCase();
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

  return hostnames;
})();

const trustedRootDomain = getRootDomain(parseHostname(env.publicSiteUrl));

function isTrustedDeploymentOrigin(origin) {
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
  credentials: true,
  optionsSuccessStatus: 204,
});

export const jsonMiddleware = express.json({ limit: '30mb' });
