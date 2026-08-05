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

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin) || isLocalFrontendOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
});

export const jsonMiddleware = express.json({ limit: '30mb' });
