// UPDATE THIS VERSION to trigger an update for all users (e.g. v1 -> v2)
const CACHE_NAME = 'stock-manager-v2';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/login.html',
    '/login.js',
    '/admin.html',
    '/admin.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/bg.png'
];

// Install Event: Cache files
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activate
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Claim immediately
    );
});

// Fetch Event: Serve from cache, then network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
