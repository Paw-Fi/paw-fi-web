/**
 * Service Worker Self-Destruct Script
 *
 * This Service Worker immediately unregisters itself to fix the infinite reload bug.
 * It runs ONCE to clean up any existing registrations and then removes itself permanently.
 *
 * IMPORTANT: This is a one-time cleanup script that ensures:
 * 1. Any existing Service Worker registrations are removed
 * 2. All caches are cleared
 * 3. The Service Worker unregisters itself
 * 4. NO page reloads are triggered
 *
 * After deployment, users will visit once, the cleanup happens silently,
 * and the Service Worker will never register again.
 */

// Version to track cleanup execution
const CLEANUP_VERSION = 'cleanup-v1.0.0';

self.addEventListener('install', (event) => {
  console.log('🧹 Service Worker cleanup: Installing...');
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      console.log('🧹 Service Worker cleanup: Starting cleanup...');

      // 1. Delete ALL caches (complete cleanup)
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log(`🧹 Deleted ${cacheNames.length} cache(s)`);

      // 2. Take control of all clients (without reloading)
      await self.clients.claim();
      console.log('🧹 Claimed all clients');

      // 3. Unregister this Service Worker
      const unregistered = await self.registration.unregister();
      console.log(`🧹 Service Worker unregistered: ${unregistered}`);

      // 4. Mark cleanup as complete in localStorage via postMessage
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({
          type: 'SW_CLEANUP_COMPLETE',
          version: CLEANUP_VERSION,
          message: 'Service Worker has been permanently removed. No action needed.'
        });
      }

      console.log('✅ Service Worker cleanup complete - will not register again');

    } catch (error) {
      console.error('❌ Error during Service Worker cleanup:', error);
    }
  })());
});

// Do NOT intercept any fetch requests - let all requests go directly to network
self.addEventListener('fetch', (event) => {
  // No interception - all requests pass through to network
  return;
});

console.log('🧹 Service Worker cleanup script loaded');
