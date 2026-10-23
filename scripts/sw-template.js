const CACHE_NAME = 'math-sprint-__VERSION__';
const APP_FILES = __FILES__;
const appURL = path => new URL(path, self.registration.scope).href;
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_FILES.map(path => new Request(appURL(path), { cache: 'reload' })));
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key.startsWith('math-sprint-') && key !== CACHE_NAME) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});
self.addEventListener('message', event => {
    if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
    if (event.data?.type === 'CHECK_OFFLINE') {
        event.waitUntil((async () => {
            const cache = await caches.open(CACHE_NAME);
            const entries = await Promise.all(APP_FILES.map(path => cache.match(appURL(path))));
            event.ports[0]?.postMessage({ ready: entries.every(Boolean) });
        })());
    }
});
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    const root = appURL('./');
    const isAppNavigation = event.request.mode === 'navigate' && (url.pathname === new URL(root).pathname || url.pathname === new URL(appURL('./index.html')).pathname);
    const asset = APP_FILES.find(path => appURL(path) === url.href);
    if (!isAppNavigation && !asset) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(isAppNavigation ? appURL('./index.html') : event.request);
        return cached || fetch(event.request);
    })());
});
