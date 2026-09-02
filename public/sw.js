// Service Worker：画面資産をキャッシュし、オフラインでも全モードが動くようにする。
// 同一オリジンは「キャッシュ優先＋裏で更新」、フォント等の外部は「ネットワーク優先、失敗時キャッシュ」。

// 画面資産を変えて公開するときは VERSION を上げる。旧キャッシュが破棄され、開いているページは再読み込みされる（app.js）。
const VERSION = 'ttc-v3';
const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './tokens.css',
  './style.css',
  './print.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './lib/time.js',
  './lib/angles.js',
  './lib/clock-svg.js',
  './lib/animator.js',
  './lib/rng.js',
  './lib/text.js',
  './lib/storage.js',
  './lib/apply-settings.js',
  './lib/problems/index.js',
  './lib/problems/read.js',
  './lib/problems/after-before.js',
  './lib/problems/duration.js',
  './lib/problems/ampm.js',
  './lib/problems/units.js',
  './lib/problems/story.js',
  './components/movement-view.js',
  './components/numpad.js',
  './screens/home.js',
  './screens/learn.js',
  './screens/practice.js',
  './screens/print.js',
  './screens/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    event.respondWith(networkFirst(request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    refresh.catch(() => {});
    return cached;
  }
  const fresh = await refresh;
  if (fresh) return fresh;
  // SPA：未キャッシュのパスは index.html を返す
  return (await cache.match('./index.html')) || Response.error();
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}
