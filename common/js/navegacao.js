// common/js/navegacao.js

import { getCurrentUser, canAccessRoute } from "./auth.js";

// ===== raiz do site (GitHub Pages ou domínio próprio) =====
function getRootPath() {
  const parts = location.pathname.split("/").filter(Boolean);

  if (location.hostname.endsWith("github.io") && parts.length > 0) {
    return "/" + parts[0] + "/";
  }

  return "/";
}

const ROOT = getRootPath();


// ===== páginas -> rotas =====
const ROTAS_POR_PAGINA = {
  "lancamento.html": "operacao-lancamento",
  "preFecho.html": "operacao-preFecho",
  "calculoRetencao.html": "operacao-retencao",
  "calculoSalas.html": "operacao-salas"
};


// ===== backend =====
export function getURLBackend() {
  return (
    localStorage.getItem("URL_BACKEND") ||
    "https://webapp-backend-8abe.onrender.com"
  );
}


// ===== status online =====
export async function isOnline() {
  const url = `${getURLBackend()}/health`;

  try {
    const resp = await fetch(url, { method: "GET", cache: "no-store" });

    if (!resp.ok) return false;

    const j = await resp.json().catch(() => ({}));

    return j?.status === "ok" || j?.mongo === "connected";
  } catch {
    return false;
  }
}


// ===== logout =====
function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.replace(`${ROOT}login.html`);
}


// ===== menu padrão =====
function menuPath() {
  return `${ROOT}app-operacao/html/menu.html`;
}


// ===== montar cabeçalho =====
function montarHeader(titulo, backHref) {

  const usuario = getCurrentUser();
  const onlineDotId = "online-dot";

  const hrefVoltar = backHref || menuPath();

  const header = document.createElement("header");

  header.innerHTML = `
    <div style="
      background:#6a1b9a;
      color:#fff;
      padding:10px 14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
    ">

      <div style="display:flex;align-items:center;gap:10px;">
        <a href="${hrefVoltar}" style="color:#fff;text-decoration:none;font-weight:700;">
          <i class="fa-solid fa-arrow-left"></i>
          <span style="margin-left:6px">${titulo}</span>
        </a>
      </div>

      <div style="display:flex;align-items:center;gap:10px;">

        <span id="${onlineDotId}" style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#aaa;
          display:inline-block;
        "></span>

        <span>${usuario?.nome ?? ""}</span>

        <button id="btn-logout"
          style="
            border:0;
            background:transparent;
            color:#fff;
            cursor:pointer;
            font-size:16px;
          "
          title="Sair">

          <i class="fa-solid fa-right-from-bracket"></i>

        </button>

      </div>
    </div>
  `;

  document.body.prepend(header);

  // logout
  header.querySelector("#btn-logout").addEventListener("click", logout);

  // status online
  (async () => {

    const ok = await isOnline();

    const dot = document.getElementById(onlineDotId);

    if (dot) {
      dot.style.background = ok ? "#16a34a" : "#aaa";
    }

  })();
}


// ===== registrar service worker =====
function registrarServiceWorker() {

  if (!("serviceWorker" in navigator)) return;

  const swPath = `${ROOT}sw.js`;

  navigator.serviceWorker
    .register(swPath)
    .then((reg) => {
      console.log("[SW] registrado:", reg.scope);
    })
    .catch((err) => {
      console.warn("[SW] erro:", err);
    });
}


// ===== inicializar página =====
export async function inicializarPagina(titulo, appKey, options = {}) {

  const usuario = getCurrentUser();

  if (!usuario) {
    window.location.replace(`${ROOT}login.html`);
    return;
  }

  const pagina = window.location.pathname.split("/").pop();

  const routeKey = ROTAS_POR_PAGINA[pagina];

  if (routeKey && !canAccessRoute(routeKey)) {
    window.location.replace(menuPath());
    return;
  }

  montarHeader(titulo, options.backHref);

  registrarServiceWorker();
}