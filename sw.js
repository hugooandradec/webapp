// sw.js (raiz do webapp) — PWA simples e seguro
const CACHE_NAME = "webapp-cache-v1";
const ROOT = self.registration.scope; // ex.: https://hugooandradec.github.io/webapp/

// Apenas arquivos que EXISTEM na raiz:
const CORE_ASSETS = [
  "index.html",
  "app-selector.html",
  "login.html",
  "manifest.json",
  "common/img/icon-192.png",
  "common/img/icon-512.png",
].map(p => new URL(p, ROOT).toString());

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => Promise.resolve()) // não falha a instalação por causa de 1 arquivo
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Network-first para HTML; cache-first para estáticos
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // só trata GET
  if (req.method !== "GET") return;

  // HTML → network-first
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // estáticos → cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => new Response("", { status: 504 }));
    })
  );
});
