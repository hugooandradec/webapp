// sw.js (raiz do webapp) — PWA com atualização automática

// Nome fixo: não vamos mais ficar trocando v1, v2, v3…
const CACHE_NAME = "webapp-cache";
const ROOT = self.registration.scope; // ex.: https://hugooandradec.github.io/webapp/

// Arquivos essenciais (pra garantir que app abre offline)
const CORE_ASSETS = [
  "index.html",
  "app-selector.html",
  "login.html",
  "manifest.json",
  "common/img/icon-192.png",
  "common/img/icon-512.png",

  // principais telas da operação (opcional, mas ajuda no offline)
  "app-operacao/html/menu.html",
  "app-operacao/html/lancamento.html",
  "app-operacao/html/preFecho.html",
  "app-operacao/html/calculoRetencao.html",
  "app-operacao/html/calculoSalas.html",
  "app-operacao/html/relatorioPontos.html"
].map(p => new URL(p, ROOT).toString());

// ===== install: pré-cache do básico =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

// ===== activate: limpa caches antigos (se houver) =====
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

// ===== fetch: network-first pra TUDO, cache só se estiver offline =====
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // só trata GET
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(req, copy))
          .catch(() => {});
        return resp;
      })
      .catch(() => {
        // se estiver offline, tenta devolver do cache
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // se nem isso tiver, devolve 504 vazio
          return new Response("", { status: 504 });
        });
      })
  );
});
