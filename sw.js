/* AIO Pro Inspect — service worker.
   Network-first for the app HTML so a new deploy shows up immediately when
   online; the cache is only a fallback for offline. Other assets use
   cache-first with a background refresh. Bump CACHE when this file changes. */
var CACHE = 'aiopro-inspect-v6';
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
      .then(function (c) { return c.addAll(ASSETS); })
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

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var req = e.request;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1;

  if (isHTML) {
    /* Network-first: always try the latest HTML; fall back to cache offline. */
    e.respondWith(
      fetch(req).then(function (res) {
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
