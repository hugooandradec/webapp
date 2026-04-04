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
  "calculoSalas.html": "operacao-salas",
  "fechamento.html": "operacao-fechamento"
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

// ===== helper de fetch =====
async function tentarFetch(
  url,
  {
    timeout = 8000,
    parseJson = false,
    noCors = false
  } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      mode: noCors ? "no-cors" : "cors"
    });

    // Em no-cors, a resposta costuma vir como "opaque"
    if (resp.type === "opaque") {
      return {
        ok: true,
        status: 0,
        json: null,
        opaque: true
      };
    }

    let json = null;

    if (parseJson) {
      try {
        json = await resp.json();
      } catch {
        json = null;
      }
    }

    return {
      ok: resp.ok,
      status: resp.status,
      json,
      opaque: false
    };
  } catch (erro) {
    return {
      ok: false,
      status: 0,
      json: null,
      erro,
      opaque: false
    };
  } finally {
    clearTimeout(timer);
  }
}

// ===== wake automático do backend =====
export async function acordarBackend() {
  const base = getURLBackend();

  if (!base) {
    console.warn("URL do backend não configurada.");
    return false;
  }

  const tentativasCors = [
    `${base}/health`,
    `${base}`,
    `${base}/`
  ];

  for (const url of tentativasCors) {
    const resp = await tentarFetch(url, {
      timeout: 8000,
      parseJson: false,
      noCors: false
    });

    if (resp.ok || resp.status === 404 || resp.status === 405) {
      console.log("🌐 Backend acionado:", url);
      return true;
    }
  }

  // fallback silencioso para acordar sem depender de CORS
  const tentativasNoCors = [
    `${base}/health`,
    `${base}`,
    `${base}/`
  ];

  for (const url of tentativasNoCors) {
    const resp = await tentarFetch(url, {
      timeout: 8000,
      parseJson: false,
      noCors: true
    });

    if (resp.ok || resp.opaque) {
      console.log("🌐 Backend acionado (no-cors):", url);
      return true;
    }
  }

  console.log("⏳ Backend ainda dormindo ou indisponível");
  return false;
}

// ===== status online =====
export async function isOnline() {
  const base = getURLBackend();

  if (!base) return false;

  // 1) tenta health com CORS normal
  const health = await tentarFetch(`${base}/health`, {
    timeout: 6000,
    parseJson: true,
    noCors: false
  });

  if (health.ok) {
    const json = health.json || {};

    if (json?.status === "ok" || json?.mongo === "connected") {
      return true;
    }

    return true;
  }

  // 2) tenta raiz com CORS normal
  const raiz = await tentarFetch(`${base}`, {
    timeout: 6000,
    parseJson: false,
    noCors: false
  });

  if (raiz.ok || raiz.status === 404 || raiz.status === 405) {
    return true;
  }

  // 3) fallback no-cors
  const pingNoCors = await tentarFetch(`${base}`, {
    timeout: 6000,
    parseJson: false,
    noCors: true
  });

  if (pingNoCors.ok || pingNoCors.opaque) {
    return true;
  }

  return false;
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
      position:sticky;
      top:0;
      z-index:999;
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

        <span style="
          font-weight:600;
          max-width:120px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${usuario?.nome ?? ""}</span>

        <button
          id="btn-logout"
          type="button"
          title="Sair"
          style="
            border:0;
            background:transparent;
            color:#fff;
            cursor:pointer;
            font-size:16px;
            padding:4px;
          "
        >
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

  try {
    const ok = await isOnline();
    dot.style.background = ok ? "#16a34a" : "#9ca3af";
    dot.title = ok ? "Backend online" : "Backend offline";
  } catch {
    dot.style.background = "#9ca3af";
    dot.title = "Status indisponível";
  }
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

  // acorda o backend depois que a página já montou
  setTimeout(() => {
    acordarBackend().catch(() => {});
  }, 800);

  // atualiza o status com segurança
  setTimeout(() => {
    atualizarStatusOnline().catch(() => {});
  }, 1800);

  setInterval(() => {
    atualizarStatusOnline().catch(() => {});
  }, 30000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      acordarBackend().catch(() => {});
      atualizarStatusOnline().catch(() => {});
    }
  });

  window.addEventListener("focus", () => {
    acordarBackend().catch(() => {});
    atualizarStatusOnline().catch(() => {});
  });

  window.addEventListener("online", () => {
    acordarBackend().catch(() => {});
    atualizarStatusOnline().catch(() => {});
  });

  window.addEventListener("offline", () => {
    atualizarStatusOnline().catch(() => {});
  });
}