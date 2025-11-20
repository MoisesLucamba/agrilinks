// Service Worker para notificações push AgriLink

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensagem recebida:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido:', event);

  let notificationData = {
    title: 'Notificação Agri Link',
    body: 'Você tem uma nova notificação',
    icon: '/agrilink-icon.png',
    badge: '/agrilink-badge.png',
    tag: 'agrilink-notification',
    data: {},
    actions: [
      { action: 'open', title: 'Abrir', icon: '/icons/open.png' },
      { action: 'close', title: 'Fechar', icon: '/icons/close.png' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada:', event);
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificação fechada:', event);
});
