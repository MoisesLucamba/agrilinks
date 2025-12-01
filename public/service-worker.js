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
    title: 'Notificação AgriLink',
    body: 'Você tem uma nova notificação',
    icon: '/agrilink-icon.png',
    badge: '/agrilink-badge.png',
    tag: 'agrilink-notification',
    data: {},
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      console.log('[Service Worker] Dados da notificação:', notificationData);
    } catch (e) {
      console.error('[Service Worker] Erro ao parsear dados:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title, notificationData),
      // Tocar som se disponível
      notificationData.sound ? playNotificationSound(notificationData.sound) : Promise.resolve()
    ])
  );
});

// Função para tocar som da notificação
async function playNotificationSound(soundUrl) {
  try {
    // Criar um audio context
    const audioContext = new AudioContext();
    const response = await fetch(soundUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    return new Promise((resolve) => {
      source.onended = resolve;
    });
  } catch (error) {
    console.error('[Service Worker] Erro ao tocar som:', error);
  }
}

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
