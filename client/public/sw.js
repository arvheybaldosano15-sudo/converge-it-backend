/* Service Worker for Converge IT Solutions PWA & Real Mobile Push Notifications - v2.5.0 */
const SW_VERSION = 'v2.5.0';
const CACHE_NAME = `converge-pwa-cache-${SW_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/CSiLogo.png',
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

// Helper: Fetch with Timeout to prevent hanging network requests on mobile Wi-Fi / Data
const fetchWithTimeout = (request, timeoutMs = 3000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// Fetch Event — Bulletproof Fast-Load Strategy (Cache First / Fast Network Timeout)
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
      // 1. Navigation requests (PWA app launch from home screen / page navigation):
      // Return cached /index.html INSTANTLY (0ms) so mobile OS dismisses splash logo immediately!
      if (event.request.mode === 'navigate') {
        const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));
        
        // Background revalidation so index.html stays fresh
        const bgFetch = fetchWithTimeout(event.request, 3000)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/index.html', responseClone);
              }).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {});

        if (cachedIndex) {
          // Serve cached index.html immediately — zero delay, splash screen logo vanishes instantly!
          return cachedIndex;
        }

        // If not in cache yet (first launch), wait for network fetch
        try {
          const networkResponse = await bgFetch;
          if (networkResponse && networkResponse.status === 200) {
            return networkResponse;
          }
        } catch (e) {
          // fallback handled below
        }
      }

      // 2. Static Assets (JS, CSS, Images, Fonts):
      // Return cached version instantly if available, then revalidate in background
      try {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          // Background revalidation
          fetchWithTimeout(event.request, 4000).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse)).catch(() => {});
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Not in cache — fetch from network with a 5s timeout
        const networkResponse = await fetchWithTimeout(event.request, 5000);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          }).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        const fallback = await caches.match(event.request);
        if (fallback) return fallback;

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

// Push Notification Listeners — Suppresses desktop OS banners when app is active in browser
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if user has app open and active in browser
      const hasVisibleWindow = clientList.some((client) => client.visibilityState === 'visible');
      if (hasVisibleWindow) {
        // App is actively open in browser — in-app toasts & bell handle it cleanly; suppress desktop OS banner
        return;
      }

      let data = {
        title: 'Converge Support Notification',
        body: 'You have a new support ticket notification.',
        icon: '/CSiLogo.png',
        badge: '/CSiLogo.png',
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
        data: {
          url: data.url || '/technician/assigned',
          ticketId: data.data?.ticketId
        },
        tag: data.data?.ticketId ? `converge-notif-${data.data.ticketId}` : `converge-notif-${Date.now()}`,
        renotify: false
      };

      return self.registration.showNotification(data.title, options);
    })
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
