/* Service Worker for Converge IT Solutions PWA & Real Mobile Push Notifications - v2.4.0 */
const SW_VERSION = 'v2.4.0';
const CACHE_NAME = `converge-pwa-cache-${SW_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo16.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png'
];

// Install Event — Pre-cache static assets & activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('SW Precache notice:', err);
      });
    })
  );
});

// Activate Event — Clean up stale caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Bulletproof Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NEVER intercept API, Socket.IO, Vite dev server HMR, extensions, or cross-origin requests
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/node_modules/') ||
    url.protocol.startsWith('chrome-extension') ||
    url.origin !== self.location.origin
  ) {
    return; // Pass through directly to browser network engine
  }

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          }).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === 'navigate') {
          const indexPage = await caches.match('/index.html');
          if (indexPage) return indexPage;
        }

        return new Response('Network unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Push Notification Listeners (Preserved 100%)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Converge Support Notification',
    body: 'You have a new support ticket notification.',
    icon: '/logo16.png',
    badge: '/logo16.png',
    url: '/technician/assigned'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/CSiLogo.png',
    badge: data.badge || '/CSiLogo.png',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    data: {
      url: data.url || '/technician/assigned',
      ticketId: data.data?.ticketId
    },
    actions: [
      { action: 'open', title: '👁️ View Request' }
    ],
    tag: `converge-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/technician/assigned';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
