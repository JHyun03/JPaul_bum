// 오프라인 캐시: 앱 화면 파일은 저장해두고, 사진/데이터는 항상 인터넷에서 새로 받아요.
const VERSION = 'v2';
const SHELL = [
  './',
  'index.html',
  'config.js',
  'manifest.webmanifest',
  'css/style.css',
  'js/characters.js',
  'js/store.js',
  'js/app.js',
  'js/install.js',
  'vendor/supabase-2.118.0.js',
  'icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 같은 사이트 파일: 인터넷 우선, 안 되면 저장본 사용 (업데이트가 바로 반영되도록)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
