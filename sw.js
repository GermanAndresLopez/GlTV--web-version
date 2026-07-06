/* GlTV — service worker: cachea el shell de la app para uso offline/instalada.
   Las APIs no se cachean aquí: la app ya tiene su propio caché con TTL en
   localStorage; los embeds de video jamás deben pasar por el SW. */

const CACHE = "gltv-shell-v1";
const SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "js/app.js",
  "manifest.json",
  "public/logo.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // APIs y embeds van directo a la red
  // Shell: red primero (para ver cambios al desarrollar) con caché de respaldo offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
