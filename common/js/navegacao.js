// common/js/navegacao.js
// utilidades globais de navegação, header e PWA

// ===== raiz do site (funciona em GitHub Pages e domínio próprio) =====
function getRootPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  if (location.hostname.endsWith("github.io") && parts.length > 0) {
    return "/" + parts[0] + "/"; // ex.: /webapp/
  }
  return "/";
}
const ROOT = getRootPath();

// ===== backend (com fallback) =====
export function getURLBackend() {
  return (
    localStorage.getItem("URL_BACKEND") ||
    (window.__CONFIG && window.__CONFIG.apiBase) ||
    "https://webapp-backend-8abe.onrender.com"
  );
}

// ===== status com retry (lida melhor com cold start do Render) =====
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
    await new Promise(r => setTimeout(r, 1500)); // cold start retry
    return await tentar();
  } catch {
    return false;
  }
}

// ===== auth helpers (leve integração com auth.js) =====
function getUser() {
  try { return JSON.parse(localStorage.getItem("usuarioLogado")) || null; } catch { return null; }
}
function canAccess(appKey) {
  const u = getUser(); if (!u) return false;
  if (!appKey) return true;
  return Array.isArray(u.apps) && u.apps.includes(appKey);
}
function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.replace(`${ROOT}login.html`);
}

// ===== detecção de "menu" por URL =====
function isMenuURL(appKey) {
  const p = location.pathname.toLowerCase();
  if (appKey === "operacao")  return p.endsWith("/app-operacao/html/menu.html");
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

  // decidir destino do "voltar":
  // - Se estou no MENU do app → voltar para app-selector
  // - Senão (página interna) → voltar para o MENU do app
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

// ===== PWA SW (melhor esforço) =====
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swPath = `${ROOT}sw.js`; // registra a partir da raiz do site
  navigator.serviceWorker.register(swPath).catch(() => {});
}

// ===== API pública =====
/**
 * Inicializa header da página e faz guard de acesso.
 * @param {string} titulo - texto do título no header
 * @param {"erp"|"operacao"|string} appKey - qual app a página pertence
 * @param {{backHref?: string, isMenuPage?: boolean}} options
 *   - backHref: sobrescreve o destino do "voltar"
 *   - isMenuPage: marca explicitamente que a página atual é um MENU (volta para o app-selector)
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

  montarHeader(titulo, appKey, options.backHref, options.isMenuPage);
  registrarServiceWorker();

  try { console.info("Console visual ativado."); } catch {}
}
