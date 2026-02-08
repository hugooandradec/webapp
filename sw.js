// sw.js (raiz do webapp) — PWA com atualização automática

const CACHE_NAME = "webapp-cache";
const ROOT = self.registration.scope;

// Arquivos essenciais (pra garantir que app abre offline)
const CORE_ASSETS = [
  // raiz
  "index.html",
  "app-selector.html",
  "login.html",
  "manifest.json",

  // ícones
  "common/img/icon-192.png",
  "common/img/icon-512.png",

  // ===== OPERAÇÃO (HTML ATUAL) =====
  "app-operacao/html/menu.html",

  "app-operacao/html/lancamento.html",
  "app-operacao/html/preFecho.html",
  "app-operacao/html/calculoRetencao.html",
  "app-operacao/html/calculoSalas.html",

  "app-operacao/html/cartaoPontos.html",
  "app-operacao/html/comissaoPontos.html",
  "app-operacao/html/relatorioPontos.html"
].map(p => new URL(p, ROOT).toString());

/* ===== install: pré-cache do básico ===== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

/* ===== activate: limpa caches antigos ===== */
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

/* ===== fetch: network-first com fallback ===== */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(req, copy))
          .catch(() => {});
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
