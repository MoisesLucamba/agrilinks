// Service Worker para gerenciar notificações push offline
// Colocar em public/service-worker.js

declare const self: ServiceWorkerGlobalScope;

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  sound?: string;
}

// Instalar Service Worker
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Instalando...');
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Ativando...');
  self.clients.claim();
});

// Receber mensagens do cliente
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('[Service Worker] Mensagem recebida:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Receber notificações push
self.addEventListener('push', (event: PushEvent) => {
  console.log('[Service Worker] Push recebido:', event);

  let notificationData: NotificationPayload = {
    title: 'Notificação Agri Link',
    body: 'Você tem uma nova notificação',
    icon: '/agrilink-icon.png',
    badge: '/agrilink-badge.png',
    tag: 'agrilink-notification',
    sound: '/sounds/chicken-notification.mp3',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      sound: notificationData.sound,
      data: notificationData.data || {},
      actions: [
        {
          action: 'open',
          title: 'Abrir',
          icon: '/icons/open.png',
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icons/close.png',
        },
      ],
      requireInteraction: true, // Mantém a notificação visível
      vibrate: [200, 100, 200], // Padrão de vibração
      badge: notificationData.badge,
    })
  );
});

// Clicar na notificação
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[Service Worker] Notificação clicada:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Procurar janela existente
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }

      // Abrir nova janela se não existir
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Fechar notificação
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('[Service Worker] Notificação fechada:', event);
});

// Sincronização em background
self.addEventListener('sync', (event: any) => {
  console.log('[Service Worker] Sincronização em background:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Função para sincronizar notificações
async function syncNotifications() {
  try {
    // Buscar notificações pendentes do servidor
    const response = await fetch('/api/notifications/pending');
    const notifications = await response.json();

    // Mostrar cada notificação
    for (const notification of notifications) {
      await self.registration.showNotification(notification.title, {
        body: notification.message,
        icon: '/agrilink-icon.png',
        badge: '/agrilink-badge.png',
        tag: 'agrilink-notification',
        sound: '/sounds/chicken-notification.mp3',
        data: notification,
        requireInteraction: true,
      });
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao sincronizar:', error);
  }
}

// Periodic Sync (sincronização periódica)
self.addEventListener('periodicsync', (event: any) => {
  console.log('[Service Worker] Sincronização periódica:', event.tag);

  if (event.tag === 'check-notifications') {
    event.waitUntil(checkNotifications());
  }
});

// Função para verificar notificações periodicamente
async function checkNotifications() {
  try {
    const response = await fetch('/api/notifications/check');
    const { hasNew } = await response.json();

    if (hasNew) {
      await self.registration.showNotification('Nova Notificação', {
        body: 'Você tem novas notificações no Agri Link',
        icon: '/agrilink-icon.png',
        badge: '/agrilink-badge.png',
        tag: 'agrilink-notification',
        sound: '/sounds/chicken-notification.mp3',
        requireInteraction: true,
        vibrate: [200, 100, 200],
      });
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao verificar notificações:', error);
  }
}

export {};