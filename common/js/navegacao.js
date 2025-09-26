// js/navegacao.js
// utilidades globais de navegação, header e PWA

// ===== backend =====
export function getURLBackend() {
  // mesma regra que já usávamos (Render)
  return "https://ajudante-api.onrender.com";
}

export async function isOnline() {
  try {
    const resp = await fetch(`${getURLBackend()}/ping`, { method: "GET", cache: "no-store" });
    return resp.ok;
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
  // volta para login do app atual (erp) ou raiz
  window.location.replace("./login.html");
}

// ===== header builder =====
function montarHeader(titulo, appKey, backHref) {
  const u = getUser();
  const onlineDotId = "online-dot";

  // botão voltar
  const hrefVoltar = backHref
    ?? (appKey === "erp" ? "./menu.html"
                         : "./app-selector.html"); // default para outros apps

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

  // wire up
  header.querySelector("#btn-logout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  // status online
  (async () => {
    const ok = await isOnline();
    const dot = document.getElementById(onlineDotId);
    if (dot) dot.style.background = ok ? "#16a34a" : "#aaa";
  })();
}

// ===== PWA SW (melhor esforço) =====
function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const swPath = "./sw.js"; // mantenha seu caminho se já possui um SW
  navigator.serviceWorker.register(swPath).catch(() => {});
}

// ===== API pública =====
/**
 * Inicializa header da página e faz guard de acesso.
 * @param {string} titulo - texto do título no header
 * @param {"erp"|"ajudante"|string} appKey - qual app a página pertence
 * @param {{backHref?: string}} options - para sobrescrever o link do "voltar"
 */
export async function inicializarPagina(titulo, appKey, options = {}) {
  // guard de login
  const user = getUser();
  if (!user) {
    window.location.replace("./login.html");
    return;
  }
  // guard de app
  if (!canAccess(appKey)) {
    // se não tiver acesso, manda para o seletor
    window.location.replace("./app-selector.html");
    return;
  }

  // injeta header
  montarHeader(titulo, appKey, options.backHref);

  // tenta registrar SW (silencioso)
  registrarServiceWorker();

  // console visual (debug opcional)
  try { console.info("Console visual ativado."); } catch {}
}