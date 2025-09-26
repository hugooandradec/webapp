// sw.js – app-erp (HTMLs em app-erp/html, JS em app-erp/js)

const SCOPE_URL  = new URL(self.registration.scope);
const BASE_PATH  = SCOPE_URL.pathname.endsWith("/") ? SCOPE_URL.pathname : SCOPE_URL.pathname + "/";
// BASE_PATH tipicamente = ".../webapp/app-erp/"

// Deriva a raiz do webapp (remove "app-erp/")
const WEBAPP_ROOT = BASE_PATH.replace(/app-erp\/$/, ""); // ex.: ".../webapp/"

// ⚠ troque a versão quando alterar este arquivo
const CACHE_VERSION = "erp-pwa-v2";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pré-cache do shell do app-erp
const ASSETS = [
  // Páginas
  `${BASE_PATH}html/menu.html`,
  `${BASE_PATH}html/produtos.html`,
  `${BASE_PATH}html/fornecedores.html`,
  `${BASE_PATH}html/vendedores.html`,
  `${BASE_PATH}html/estoque.html`,
  `${BASE_PATH}html/vendas.html`,
  `${BASE_PATH}html/vendas-registro.html`,

  // Manifest do ERP
  `${BASE_PATH}manifest.json`,

  // Ícones globais (em common/img) — dinâmicos a partir do WEBAPP_ROOT
  `${WEBAPP_ROOT}common/img/icon-192.png`,
  `${WEBAPP_ROOT}common/img/icon-512.png`,

  // JS do módulo
  `${BASE_PATH}js/produtos.js`,
  `${BASE_PATH}js/fornecedores.js`,
  `${BASE_PATH}js/vendedores.js`,
  `${BASE_PATH}js/estoque.js`,
  `${BASE_PATH}js/vendas.js`,
  `${BASE_PATH}js/vendas-registro.js`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(RUNTIME_CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const dest = req.destination;
  const acceptsHTML = req.headers.get("accept")?.includes("text/html");
  const isHTML = req.mode === "navigate" || acceptsHTML || dest === "document";
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
  } catch {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    // Fallback para o menu do ERP quando offline
    if (event.request.mode === "navigate") {
      return caches.match(`${BASE_PATH}html/menu.html`);
    }
    throw new Error("Offline e sem cache");
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
