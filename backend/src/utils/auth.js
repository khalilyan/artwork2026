import crypto from 'crypto';
import { env } from '../config/env.js';

const passwordParams = { N: 16384, r: 8, p: 1, keyLength: 64 };

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signTokenPayload(header, payload) {
  return crypto
    .createHmac('sha256', env.authSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, passwordParams.keyLength, passwordParams, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

  return {
    algorithm: 'scrypt',
    hash: hash.toString('base64'),
    salt: salt.toString('base64'),
    params: passwordParams,
    mustChangePassword: false,
  };
}

export async function verifyPassword(password, storedPassword) {
  if (!storedPassword || storedPassword.algorithm !== 'scrypt') return false;

  const params = storedPassword.params ?? passwordParams;
  const salt = Buffer.from(storedPassword.salt, 'base64');
  const expectedHash = Buffer.from(storedPassword.hash, 'base64');
  const actualHash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, params.keyLength ?? expectedHash.length, params, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

  return expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);
}

export function createAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncode({
    sub: String(user._id),
    email: user.emailNormalized,
    role: user.role,
    iat: now,
    exp: now + env.authTokenTtlSeconds,
  });
  const signature = signTokenPayload(header, payload);

  return `${header}.${payload}.${signature}`;
}

export function verifyAuthToken(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = signTokenPayload(header, payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const decodedPayload = base64UrlDecode(payload);
  const now = Math.floor(Date.now() / 1000);

  if (!decodedPayload.exp || decodedPayload.exp < now) return null;

  return decodedPayload;
}
