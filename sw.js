// sw.js (raiz do webapp) — PWA com cache simples e estável

// 🔁 sempre que mudar algo importante (JS/CSS ou lista de assets),
// sobe esse sufixo de versão:
const CACHE_NAME = "webapp-cache-v2";

// escopo base do SW, ex.: https://hugooandradec.github.io/webapp/
const ROOT = self.registration.scope;

// Arquivos essenciais que queremos disponíveis offline
// logo de cara (login, selector e principais telas da operação)
const CORE_ASSETS = [
  // raiz
  "index.html",
  "app-selector.html",
  "login.html",
  "manifest.json",

  // ícones
  "common/img/icon-192.png",
  "common/img/icon-512.png",

  // app-operacao – páginas que você usa hoje
  "app-operacao/html/menu.html",
  "app-operacao/html/lancamento.html",
  "app-operacao/html/preFecho.html",
  "app-operacao/html/calculoRetencao.html",
  "app-operacao/html/calculoSalas.html",
  "app-operacao/html/relatorioPontos.html",

  // JS comuns importantes
  "common/js/navegacao.js",
  "common/js/auth.js",
  "common/js/servicos.js",
  "common/js/sincronizador.js",
  "common/js/toast.js",

  // JS das telas da operação em uso
  "app-operacao/js/lancamento.js",
  "app-operacao/js/preFecho.js",
  "app-operacao/js/calculoRetencao.js",
  "app-operacao/js/calculoSalas.js",
  "app-operacao/js/relatorioPontos.js"
].map(p => new URL(p, ROOT).toString());

// ===== install: pré-cache dos arquivos principais =====
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => Promise.resolve()) // não falha a instalação se 1 asset der erro
  );
  self.skipWaiting();
});

// ===== activate: limpa caches antigos =====
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ===== fetch: HTML -> network-first / estáticos -> cache-first =====
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // só tratamos GET
  if (req.method !== "GET") return;

  const aceitaHtml = req.headers.get("accept")?.includes("text/html");

  // HTML → network-first (pega sempre a versão mais nova, cai pro cache se offline)
  if (aceitaHtml) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Outros (JS, CSS, imagens) → cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy))
            .catch(() => {});
          return resp;
        })
        .catch(() => new Response("", { status: 504 }));
    })
  );
});
