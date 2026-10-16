/* AIO Pro Inspect — service worker.
   The app HTML is always pulled from the network with the browser's own HTTP
   cache bypassed: GitHub Pages serves index.html with max-age=600, so a plain
   fetch here can hand back a ten-minute-old copy AND store it as the offline
   fallback, which is how a phone ends up running an old build for days.
   The cache is only a fallback for being offline. Other assets are
   cache-first with a background refresh. Bump CACHE when this file changes. */
var CACHE = 'aiopro-inspect-v7';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './estimate-sign.html'
];

/* Only the app at the root of this scope counts as "the app" (not the /beta/ test copy). */
function isAppPath(p) {
  var root = new URL(self.registration.scope).pathname;
  return p === root || p === root + 'index.html';
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        /* Prime the offline copy from the network, not from the HTTP cache. */
        return Promise.all(ASSETS.map(function (u) {
          return fetch(new Request(u, { cache: 'reload' }))
            .then(function (r) { return r && r.status === 200 ? c.put(u, r) : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* a missing asset must not block install */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

/* The app can ask the worker to step aside so a new build takes over at once. */
self.addEventListener('message', function (e) {
  var d = e.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var req = e.request;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1;

  if (isHTML) {
    /* Network-first with the HTTP cache bypassed; fall back to cache offline. */
    e.respondWith(
      fetch(new Request(req.url, {
        cache: 'reload', credentials: req.credentials, headers: req.headers,
        mode: req.mode === 'navigate' ? 'same-origin' : req.mode, redirect: 'follow'
      })).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          /* Only the main app is stored as index.html; other pages
             (worker.html, estimate-sign.html) are stored under their own URL. */
          var p = new URL(req.url).pathname;
          var isApp = isAppPath(p);
          caches.open(CACHE).then(function (c) { c.put(isApp ? './index.html' : req, copy); });
        }
        return res;
      }).catch(function () {
        var path = new URL(req.url).pathname;
        var appPage = isAppPath(path);
        return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || (appPage ? caches.match('./index.html') : undefined); });
      })
    );
    return;
  }

  /* Other GETs: cache-first with background refresh. */
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
