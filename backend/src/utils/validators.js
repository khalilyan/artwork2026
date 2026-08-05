const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isEmail(email) {
  return emailPattern.test(String(email ?? '').trim());
}

export function toCleanString(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizePhone(phone) {
  return String(phone ?? '').replace(/[^\d+]/g, '');
}

export function toPositiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function toRating(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}
