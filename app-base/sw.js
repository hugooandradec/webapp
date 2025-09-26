// sw.js – app-base (HTMLs em app-base/html)

const SCOPE_URL  = new URL(self.registration.scope);
const BASE_PATH  = SCOPE_URL.pathname.endsWith("/") ? SCOPE_URL.pathname : SCOPE_URL.pathname + "/";
// BASE_PATH tipicamente = ".../webapp/app-base/"
const WEBAPP_ROOT = BASE_PATH.replace(/app-base\/$/, ""); // ex.: ".../webapp/"

// ⚠ altere a versão sempre que mudar o pré-cache
const CACHE_VERSION = "base-pwa-v1";
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Deixe só o essencial por enquanto; adicionamos telas conforme implementar
const ASSETS = [
  // Páginas
  `${BASE_PATH}html/menu.html`,

  // Manifest do módulo
  `${BASE_PATH}manifest.json`,

  // Ícones globais (em common)
  `${WEBAPP_ROOT}common/img/icon-192.png`,
  `${WEBAPP_ROOT}common/img/icon-512.png`
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
    // Fallback para o menu da Base quando offline
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
