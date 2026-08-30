import webPush from 'web-push';
import { env } from '../config/env.js';
import { deletePushSubscription, listPushSubscriptions, upsertPushSubscription } from '../models/notificationModel.js';
import { assertRequest } from '../utils/httpError.js';
import { toCleanString } from '../utils/validators.js';

function isPushConfigured() {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}

function configureWebPush() {
  if (!isPushConfigured()) return false;
  webPush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  return true;
}

export function getPushPublicKey(_request, response) {
  response.json({
    enabled: isPushConfigured(),
    publicKey: env.vapidPublicKey,
  });
}

export async function savePushSubscription(request, response, next) {
  try {
    assertRequest(isPushConfigured(), 503, 'Push notifications are not configured.');
    assertRequest(request.body?.endpoint, 400, 'Push subscription endpoint is required.');

    await upsertPushSubscription(request.body, {
      userAgent: toCleanString(request.get('user-agent')),
      guestId: toCleanString(request.get('x-artwork-guest-id')),
    });

    response.status(201).json({ subscribed: true });
  } catch (error) {
    next(error);
  }
}

export async function removePushSubscription(request, response, next) {
  try {
    await deletePushSubscription(toCleanString(request.body?.endpoint));
    response.json({ deleted: true });
  } catch (error) {
    next(error);
  }
}

export async function broadcastProductNotification(product) {
  if (!configureWebPush()) return { sent: 0, removed: 0 };

  const subscriptions = await listPushSubscriptions();
  const payload = JSON.stringify({
    title: 'ARTWORK նոր ապրանք',
    body: `${product.name} արդեն հասանելի է խանութում։`,
    url: `/rooms/${product.roomSlugs?.[0] ?? 'living-room'}/${product.categorySlug ?? product.type ?? 'all'}/${product.slug}`,
    image: product.images?.primary ?? product.image ?? '/artwork-logo.png',
  });
  let sent = 0;
  let removed = 0;

  await Promise.all(subscriptions.map(async ({ subscription, endpoint }) => {
    try {
      await webPush.sendNotification(subscription, payload);
      sent += 1;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await deletePushSubscription(endpoint);
        removed += 1;
      }
    }
  }));

  return { sent, removed };
}
