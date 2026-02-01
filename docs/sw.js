const CACHE_NAME = 'ttwstar-v1.01.20260201.1';
const STATIC_ASSETS = [
  '/Ttwstar/',
  '/Ttwstar/index.html'
];

const CACHE_STRATEGIES = {
  cacheFirst: ['.js', '.css', '.woff2', '.woff', '.ttf', '.eot', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'],
  networkFirst: ['.html'],
  staleWhileRevalidate: []
};

function shouldCacheFirst(url) {
  return CACHE_STRATEGIES.cacheFirst.some(ext => url.pathname.endsWith(ext));
}

function shouldNetworkFirst(url) {
  return CACHE_STRATEGIES.networkFirst.some(ext => url.pathname.endsWith(ext));
}

async function installEvent() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(STATIC_ASSETS);
  return self.skipWaiting();
}

async function activateEvent() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name !== CACHE_NAME)
      .map(name => caches.delete(name))
  );
  return self.clients.claim();
}

async function fetchEvent(event) {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return fetch(request);
  }

  if (shouldNetworkFirst(url)) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return fetch(request);
    }
  }

  if (shouldCacheFirst(url)) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response));
        }
      }).catch(() => {});
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return caches.match(request);
  }
}

self.addEventListener('install', event => event.waitUntil(installEvent()));
self.addEventListener('activate', event => event.waitUntil(activateEvent()));
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetchEvent(event));
  }
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
