// Minimal service worker scaffold for portal push notifications (12.40)
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? { title: 'MatsFlow', body: 'You have a new notification.' };
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'MatsFlow', {
      body: data.body ?? '',
      icon: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/portal'));
});
