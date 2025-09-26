// sw.js — App Operação
// Estratégia: shell precache + network-first para HTML/JS/CSS e cache-first para imagens/fonts

// Detecta o path base (ex.: "/webapp/app-operacao/") mesmo em subpastas (GitHub Pages, etc.)
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.endsWith("/")
  ? SCOPE_URL.pathname
  : SCOPE_URL.pathname + "/";

// Sempre incremente a versão ao publicar
const CACHE_VERSION = "app-operacao-v2025-09-24-02";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Shell mínimo do módulo — HTML interno do módulo
const HTML_PAGES = [
  `${BASE_PATH}html/index.html`,
  `${BASE_PATH}html/menu.html`,
  `${BASE_PATH}html/lancamento.html`,
  `${BASE_PATH}html/preFecho.html`,
  `${BASE_PATH}html/gerenciar.html`,
  `${BASE_PATH}html/gerenciarClientes.html`,
  `${BASE_PATH}html/gerenciarMaquinas.html`,
  `${BASE_PATH}html/gerenciarColaboradores.html`,
  `${BASE_PATH}html/gerenciarJogos.html`,
  `${BASE_PATH}html/gerenciarRotas.html`,
  `${BASE_PATH}html/jogos-roi.html`,
  `${BASE_PATH}html/menu-vales.html`,
  `${BASE_PATH}html/vales.html`,
  `${BASE_PATH}html/fechamento.html`,
  `${BASE_PATH}html/calculoRetencao.html`,
  `${BASE_PATH}html/manutencao.html`
];

// JS do módulo (em /app-operacao/js)
const MODULE_JS = [
  `${BASE_PATH}js/sync.js`,
  `${BASE_PATH}js/lancamento.js`,
  `${BASE_PATH}js/preFecho.js`,
  `${BASE_PATH}js/gerenciarClientes.js`,
  `${BASE_PATH}js/gerenciarMaquinas.js`,
  `${BASE_PATH}js/gerenciarColaboradores.js`,
  `${BASE_PATH}js/gerenciarJogos.js`,
  `${BASE_PATH}js/gerenciarRotas.js`,
  `${BASE_PATH}js/jogos-roi.js`,
  `${BASE_PATH}js/vales.js`,
  `${BASE_PATH}js/fechamento.js`,
  `${BASE_PATH}js/manutencao.js`
];

// JS compartilhado (em /common/js)
const COMMON_JS = [
  `${BASE_PATH}../common/js/navegacao.js`,
  `${BASE_PATH}../common/js/toast.js`,
  `${BASE_PATH}../common/js/sincronizador.js`,
  `${BASE_PATH}../common/js/componentes.js`,
  `${BASE_PATH}../common/js/servicos.js`,
  `${BASE_PATH}../common/js/auth.js`
];

// Ícones/manifest
const ASSETS_MISC = [
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}../common/img/favicon.ico`,
  `${BASE_PATH}../common/img/icon-192.png`,
  `${BASE_PATH}../common/img/icon-512.png`
];

// Conjunto completo para precache
const ASSETS = [
  `${BASE_PATH}`,           // directory index
  ...HTML_PAGES,
  ...MODULE_JS,
  ...COMMON_JS,
  ...ASSETS_MISC
];

// ---------------------- Install & Activate ----------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RUNTIME_CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Atualização imediata quando a página pedir
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------------------- Fetch Strategy ----------------------
// HTML/JS/CSS → network-first (para evitar ficar preso no cache antigo)
// Imagens/Fonts → cache-first
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const dest = req.destination;
  const isHTML =
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    dest === "document";
  const isCode = dest === "script" || dest === "style";
  const isAsset = dest === "image" || dest === "font";

  if (isHTML || isCode) {
    event.respondWith(networkFirst(event));
  } else if (isAsset) {
    event.respondWith(cacheFirst(event));
  } else {
    event.respondWith(networkFirst(event));
  }
});

async function networkFirst(event) {
  try {
    const fresh = await fetch(event.request, { cache: "no-store" });
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(event.request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    // Fallback para a home do módulo quando navegar offline
    if (event.request.mode === "navigate") {
      return caches.match(`${BASE_PATH}html/index.html`) ||
             caches.match(`${BASE_PATH}html/menu.html`);
    }
    throw err;
  }
}

async function cacheFirst(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const fresh = await fetch(event.request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(event.request, fresh.clone());
  return fresh;
}
