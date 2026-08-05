import { getDatabase } from '../db/mongo.js';

export function pushSubscriptionsCollection() {
  return getDatabase().collection('push_subscriptions');
}

export async function upsertPushSubscription(subscription, metadata = {}) {
  const endpoint = String(subscription?.endpoint ?? '').trim();
  if (!endpoint) return null;

  const now = new Date().toISOString();
  const document = {
    endpoint,
    subscription,
    userAgent: metadata.userAgent ?? '',
    guestId: metadata.guestId ?? '',
    updatedAt: now,
  };

  await pushSubscriptionsCollection().updateOne(
    { endpoint },
    {
      $set: document,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  return document;
}

export async function deletePushSubscription(endpoint) {
  if (!endpoint) return;
  await pushSubscriptionsCollection().deleteOne({ endpoint });
}

export async function listPushSubscriptions() {
  return pushSubscriptionsCollection().find({}).toArray();
}
