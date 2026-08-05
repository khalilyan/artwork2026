self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {};
  const title = data.title || 'ARTWORK';
  const options = {
    body: data.body || 'Նորություն ARTWORK-ից',
    icon: '/artwork-logo.png',
    badge: '/artwork-logo.png',
    image: data.image,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingWindow = windows.find((client) => client.url === targetUrl);

    if (existingWindow) {
      await existingWindow.focus();
      return;
    }

    await clients.openWindow(targetUrl);
  })());
});
