import crypto from 'node:crypto';
import { getDatabase } from '../db/mongo.js';
import { HttpError } from '../utils/httpError.js';

function getCooldownMs(cooldownHours) {
  const hours = Number(cooldownHours);
  if (!Number.isFinite(hours) || hours <= 0) return 0;

  return hours * 60 * 60 * 1000;
}

function formatCooldownHours(cooldownHours) {
  const hours = Number(cooldownHours);
  if (!Number.isFinite(hours) || hours <= 0) return 'without a cooldown';

  return `once every ${hours} hour${hours === 1 ? '' : 's'}`;
}

function limitsCollection() {
  return getDatabase().collection('ai_generation_limits');
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function getRequestFingerprint(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  const ip = forwardedFor || request.ip || request.socket?.remoteAddress || 'unknown-ip';
  const userAgent = request.get('user-agent') || 'unknown-agent';

  return hash(`${ip}|${userAgent}`);
}

function getGuestId(request) {
  const guestId = String(request.get('x-artwork-guest-id') ?? '').trim();
  return /^[a-z0-9-]{12,80}$/i.test(guestId) ? guestId : '';
}

export function getAiGenerationIdentity(request) {
  if (request.user?._id) {
    return {
      key: `user:${request.user._id}`,
      scope: 'user',
      userId: String(request.user._id),
    };
  }

  const guestId = getGuestId(request);
  const fingerprint = getRequestFingerprint(request);

  return {
    key: `guest:${hash(`${guestId || 'anonymous'}|${fingerprint}`)}`,
    scope: 'guest',
    guestIdHash: guestId ? hash(guestId) : null,
    fingerprint,
  };
}

export async function assertAiGenerationAllowed(identity, cooldownHours) {
  const cooldownMs = getCooldownMs(cooldownHours);
  if (cooldownMs <= 0) return;

  const limit = await limitsCollection().findOne({ key: identity.key });
  const lastGeneratedAt = limit?.lastGeneratedAt ? new Date(limit.lastGeneratedAt) : null;
  const nextAllowedAt = lastGeneratedAt ? new Date(lastGeneratedAt.getTime() + cooldownMs) : null;

  if (nextAllowedAt && nextAllowedAt > new Date()) {
    const secondsRemaining = Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000);
    throw new HttpError(429, `AI image generation is available ${formatCooldownHours(cooldownHours)}.`, {
      nextAllowedAt: nextAllowedAt.toISOString(),
      secondsRemaining,
      cooldownHours: Number(cooldownHours),
    });
  }
}

export async function markAiGenerationUsed(identity, cooldownHours) {
  const now = new Date();
  await limitsCollection().updateOne(
    { key: identity.key },
    {
      $set: {
        ...identity,
        lastGeneratedAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    nextAllowedAt: new Date(now.getTime() + getCooldownMs(cooldownHours)).toISOString(),
    cooldownHours: Number(cooldownHours),
  };
}
