// sw.js (raiz do webapp)

const CACHE_NAME = "webapp-cache-v2";
const ROOT = self.registration.scope;

const CORE_ASSETS = [
  "index.html",
  "login.html",
  "manifest.json",

  "common/img/icon-192.png",
  "common/img/icon-512.png",
  "common/img/favicon.ico",

  "common/js/auth.js",
  "common/js/navegacao.js",
  "common/js/toast.js",

  "app-operacao/manifest.json",

  "app-operacao/html/menu.html",
  "app-operacao/html/lancamento.html",
  "app-operacao/html/preFecho.html",
  "app-operacao/html/calculoRetencao.html",
  "app-operacao/html/calculoSalas.html",

  "app-operacao/js/lancamento.js",
  "app-operacao/js/preFecho.js",
  "app-operacao/js/calculoRetencao.js",
  "app-operacao/js/calculoSalas.js",
  "app-operacao/js/sync.js"
  
  "/app-operacao-react/dist/"
  
  
].map(p => new URL(p, ROOT).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          return new Response("", { status: 504 });
        });
      })
  );
});