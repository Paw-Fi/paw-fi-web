/**
 * Service Worker for Moneko Web App
 * Provides intelligent caching for SSR performance optimization
 */

const CACHE_NAME = 'moneko-v1.0.1';
const STATIC_CACHE = 'moneko-static-v1.0.1';
const DYNAMIC_CACHE = 'moneko-dynamic-v1.0.1';
const IMAGE_CACHE = 'moneko-images-v1.0.1';

// Critical resources to cache immediately (HTML pages should NOT be pre-cached to avoid SSR mismatches)
const CRITICAL_RESOURCES = [];

// Resources to cache on first visit
const RUNTIME_CACHE = [
  '/dashboard/learning',
  '/dashboard/portfolio', 
  '/dashboard/tracker',
];

// Image cache patterns
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

// API cache patterns
const API_PATTERNS = [
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  /^https:\/\/.*\.supabase\.co\/functions\/v1\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(() => {
        // Intentionally avoid pre-caching HTML navigations to prevent serving stale SSR markup
        console.log('✅ Service worker installed (no HTML pre-caching)');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service worker install failed:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service worker activated');
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // 1. Handle HTML pages (navigation requests)
    if (request.mode === 'navigate') {
      return await handleNavigation(request);
    }
    
    // 2. Handle images
    if (IMAGE_EXTENSIONS.some(ext => pathname.includes(ext))) {
      return await handleImageRequest(request);
    }
    
    // 3. Handle API requests
    if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await handleAPIRequest(request);
    }
    
    // 4. Handle static assets (JS, CSS, fonts)
    if (pathname.includes('/assets/') || 
        pathname.includes('.js') || 
        pathname.includes('.css') ||
        pathname.includes('.woff') ||
        pathname.includes('.woff2')) {
      return await handleStaticAsset(request);
    }
    
    // 5. Default: try cache first, then network
    return await cacheFirstStrategy(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Service worker fetch error:', error);
    return fetch(request);
  }
}

// Handle navigation requests with network-first strategy
async function handleNavigation(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // For critical routes, try cache first for faster loading
    if (CRITICAL_RESOURCES.includes(pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Serve from cache immediately, update in background
        fetch(request).then(response => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(request, response.clone());
            });
          }
        });
        return cachedResponse;
      }
    }
    
    // Network first for dynamic content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    return await caches.match('/offline.html') || 
           new Response('Offline - Please check your connection', {
             status: 503,
             headers: { 'Content-Type': 'text/plain' }
           });
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  return await cacheFirstStrategy(request, IMAGE_CACHE, 86400000); // 24 hours
}

// Handle API requests with network-first and short cache
async function handleAPIRequest(request) {
  // Bypass SW for API requests to avoid body stream issues and duplicate fetches
  // This ensures Supabase REST and Edge Function calls are not cached or modified
  return fetch(request);
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  return await cacheFirstStrategy(request, STATIC_CACHE, 604800000); // 7 days
}

// Generic cache-first strategy
async function cacheFirstStrategy(request, cacheName, maxAge = 3600000) { // 1 hour default
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cache is still fresh
    const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
    if (!cacheTimestamp || Date.now() - parseInt(cacheTimestamp) < maxAge) {
      return cachedResponse;
    }
  }
  
  // Not in cache or stale, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    // Only cache complete 200 OK responses (avoid caching 206 partial content)
    if (networkResponse.ok && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      
      const responseWithTimestamp = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cache-timestamp': Date.now().toString()
        }
      });
      
      cache.put(request, responseWithTimestamp.clone());
      return responseWithTimestamp;
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, return stale cache if available
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync logic here
      console.log('Background sync triggered')
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      },
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          icon: '/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/xmark.png'
        },
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Moneko Update', options)
    );
  }
});

console.log('🚀 Moneko Service Worker loaded');