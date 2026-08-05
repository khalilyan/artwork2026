import { getDatabase } from '../db/mongo.js';

const aiSettingsId = 'ai-room-preview';
const defaultAiCooldownHours = 5;

function normalizeCooldownHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return defaultAiCooldownHours;

  return Math.max(0, Math.min(168, hours));
}

export async function getAiSettings() {
  const settings = await getDatabase().collection('settings').findOne({ _id: aiSettingsId });

  return {
    enabled: settings?.enabled !== false,
    cooldownHours: normalizeCooldownHours(settings?.cooldownHours),
    lastError: settings?.lastError ?? null,
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function updateAiSettings(update) {
  const now = new Date().toISOString();
  const nextUpdate = {
    ...update,
    ...(Object.hasOwn(update, 'cooldownHours') ? { cooldownHours: normalizeCooldownHours(update.cooldownHours) } : {}),
    updatedAt: now,
  };

  await getDatabase().collection('settings').updateOne(
    { _id: aiSettingsId },
    { $set: nextUpdate, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  return getAiSettings();
}
