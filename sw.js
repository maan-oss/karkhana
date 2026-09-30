var V = 'karkhana-v13';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return; var url = new URL(req.url);
  if (url.pathname.indexOf('/api/') === 0) return;
  if (url.origin === location.origin) { e.respondWith(fetch(req).then(function (r) { var copy = r.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); return r; }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })); return; }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(caches.open(V).then(function (c) { return c.match(req).then(function (hit) { var net = fetch(req).then(function (r) { c.put(req, r.clone()); return r; }).catch(function () { return hit; }); return hit || net; }); })); }
});
