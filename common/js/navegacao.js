// common/js/navegacao.js
// utilidades globais de navegação, header e PWA

import {
  getCurrentUser,
  canAccess as authCanAccess,
  canAccessRoute
} from "./auth.js";

// ===== raiz do site (funciona em GitHub Pages e domínio próprio) =====
function getRootPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (location.hostname.endsWith("github.io") && parts.length > 0) {
    return "/" + parts[0] + "/"; // ex.: /webapp/
  }
  return "/";
}
const ROOT = getRootPath();

// ===== mapeamento de páginas -> rotas de permissão =====
const ROTAS_POR_PAGINA = {
  "preFecho.html":        "operacao-preFecho",
  "calculoRetencao.html": "operacao-retencao",
  "calculoSalas.html":    "operacao-salas",
  "lancamento.html":      "operacao-lancamento"
};

// ===== backend (com fallback) =====
export function getURLBackend() {
  return (
    localStorage.getItem("URL_BACKEND") ||
    (window.__CONFIG && window.__CONFIG.apiBase) ||
    "https://webapp-backend-8abe.onrender.com"
  );
}

// ===== status com retry (cold start Render) =====
export async function isOnline() {
  const url = `${getURLBackend()}/health`;

  async function tentar() {
    const resp = await fetch(url, { method: "GET", cache: "no-store" });
    if (!resp.ok) return false;
    const j = await resp.json().catch(() => ({}));
    return j?.status === "ok" || j?.mongo === "connected";
  }

  try {
    if (await tentar()) return true;
    await new Promise((r) => setTimeout(r, 1500));
    return await tentar();
  } catch {
    return false;
  }
}

// ===== auth helpers =====
function getUser() {
  return getCurrentUser();
}

function canAccess(appKey) {
  return authCanAccess(appKey);
}

function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.replace(`${ROOT}login.html`);
}

// ===== detecção de "menu" por URL =====
function isMenuURL(appKey) {
  const p = location.pathname.toLowerCase();
  if (appKey === "operacao") return p.endsWith("/app-operacao/html/menu.html");
  if (appKey === "erp")       return p.endsWith("/app-erp/html/menu.html");
  return false;
}
function menuPath(appKey) {
  if (appKey === "operacao") return `${ROOT}app-operacao/html/menu.html`;
  if (appKey === "erp")      return `${ROOT}app-erp/html/menu.html`;
  return `${ROOT}app-selector.html`;
}

// ===== header builder =====
function montarHeader(titulo, appKey, backHref, isMenuPageFlag) {
  const u = getUser();
  const onlineDotId = "online-dot";

  let hrefVoltar;
  if (typeof backHref === "string" && backHref) {
    hrefVoltar = backHref;
  } else {
    const estouNoMenu = isMenuPageFlag === true ? true : isMenuURL(appKey);
    hrefVoltar = estouNoMenu ? `${ROOT}app-selector.html` : menuPath(appKey);
  }

  const header = document.createElement("header");
  header.innerHTML = `
    <div style="
      background:#6a1b9a; color:#fff; padding:10px 14px;
      display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:10px;">
        <a href="${hrefVoltar}" style="color:#fff; text-decoration:none; font-weight:700;">
          <i class="fa-solid fa-arrow-left"></i>
          <span style="margin-left:6px">${titulo}</span>
        </a>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span id="${onlineDotId}" style="
          display:inline-block; width:10px; height:10px; border-radius:50%;
          background:#aaa;"></span>
        <span style="text-transform:none">${u?.nome ?? ""}</span>
        <button id="btn-logout" title="Sair" style="
          border:0; background:transparent; color:#fff; cursor:pointer; font-size:16px;">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>
  `;
  document.body.prepend(header);

  header.querySelector("#btn-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  (async () => {
    const ok = await isOnline();
    const dot = document.getElementById(onlineDotId);
    if (dot) dot.style.background = ok ? "#16a34a" : "#aaa";
  })();
}

// ===== PWA SW (a partir da raiz /webapp/) =====
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const swPath = `${ROOT}sw.js`; // ex.: /webapp/sw.js
  console.log("[SW] registrando:", swPath);

  navigator.serviceWorker
    .register(swPath)
    .then((reg) => {
      console.log("[SW] registrado com escopo:", reg.scope);
    })
    .catch((err) => {
      console.warn("[SW] falha ao registrar:", err);
    });
}

// ===== API pública =====
/**
 * Inicializa header da página e faz guard de acesso.
 * @param {string} titulo - texto do título no header
 * @param {"erp"|"operacao"|string} appKey - qual app a página pertence
 * @param {{backHref?: string, isMenuPage?: boolean}} options
 */
export async function inicializarPagina(titulo, appKey, options = {}) {
  const user = getUser();
  if (!user) {
    window.location.replace(`${ROOT}login.html`);
    return;
  }

  if (!canAccess(appKey)) {
    window.location.replace(`${ROOT}app-selector.html`);
    return;
  }

  const pagina = window.location.pathname.split("/").pop().split("?")[0];
  const routeKey = ROTAS_POR_PAGINA[pagina];

  if (routeKey && !canAccessRoute(routeKey)) {
    const destino = menuPath(appKey) || `${ROOT}app-selector.html`;
    window.location.replace(destino);
    return;
  }

  montarHeader(titulo, appKey, options.backHref, options.isMenuPage);
  registrarServiceWorker();

  try {
    console.info("Console visual ativado.");
  } catch {}
}
