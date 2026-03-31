// common/js/navegacao.js

import { getCurrentUser, canAccessRoute } from "./auth.js";
import { getURLBackend } from "./servicos.js";

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

// ===== caminho do menu =====
function menuPath() {
  return `${ROOT}app-operacao/html/menu.html`;
}

// ===== logout =====
function logout() {
  localStorage.removeItem("usuarioLogado");
  window.location.replace(`${ROOT}login.html`);
}

// ===== wake automático do backend =====
export function acordarBackend() {
  const base = getURLBackend();
  const healthUrl = `${base}/health`;

  fetch(healthUrl, {
    method: "GET",
    cache: "no-store"
  })
    .then(() => {
      console.log("🌐 Backend acionado");
    })
    .catch(() => {
      console.log("⏳ Backend ainda dormindo ou indisponível");
    });
}

// ===== status online =====
export async function isOnline() {
  const url = `${getURLBackend()}/health`;

  try {
    const resp = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    if (!resp.ok) return false;

    const json = await resp.json().catch(() => ({}));

    return json?.status === "ok" || json?.mongo === "connected";
  } catch {
    return false;
  }
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
      gap:10px;
    ">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <a href="${hrefVoltar}" style="
          color:#fff;
          text-decoration:none;
          font-weight:700;
          display:flex;
          align-items:center;
          gap:6px;
          min-width:0;
        ">
          <i class="fa-solid fa-arrow-left"></i>
          <span style="
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">${titulo}</span>
        </a>
      </div>

      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <span id="${onlineDotId}" style="
          width:10px;
          height:10px;
          border-radius:50%;
          background:#aaa;
          display:inline-block;
        "></span>

        <span style="font-weight:600;">${usuario?.nome ?? ""}</span>

        <button id="btn-logout"
          type="button"
          title="Sair"
          style="
            border:0;
            background:transparent;
            color:#fff;
            cursor:pointer;
            font-size:16px;
            padding:4px;
          ">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </div>
  `;

  document.body.prepend(header);

  const btnLogout = header.querySelector("#btn-logout");
  btnLogout?.addEventListener("click", logout);

  atualizarStatusOnline();
}

// ===== atualizar bolinha online/offline =====
async function atualizarStatusOnline() {
  const dot = document.getElementById("online-dot");
  if (!dot) return;

  const ok = await isOnline();
  dot.style.background = ok ? "#16a34a" : "#aaa";
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
      console.warn("[SW] erro ao registrar:", err);
    });
}

// ===== inicializar página =====
export async function inicializarPagina(titulo, appKey, options = {}) {
  const usuario = getCurrentUser();

  if (!usuario) {
    window.location.replace(`${ROOT}login.html`);
    return;
  }

  const pagina = window.location.pathname.split("/").pop().split("?")[0];
  const routeKey = ROTAS_POR_PAGINA[pagina];

  if (routeKey && !canAccessRoute(routeKey)) {
    window.location.replace(menuPath());
    return;
  }

  montarHeader(titulo, options.backHref);
  registrarServiceWorker();

  // acorda o backend logo após entrar na página
  setTimeout(acordarBackend, 800);

  // atualiza a bolinha de tempos em tempos
  setTimeout(atualizarStatusOnline, 1800);
  setInterval(atualizarStatusOnline, 30000);
}