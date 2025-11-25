// common/js/auth.js
const USERS = [
  // vt -> acesso TOTAL a tudo (apps e rotas)
  {
    username: "vt",
    password: "178590",
    nome: "vt",
    apps: ["operacao", "erp", "base"], // continua como antes
    role: "admin",
    rotas: ["*"]                       // * = todas as rotas liberadas
  },

  // pipo -> só operação, e dentro da operação:
  // pré-fecho, retenção e cálculo de salas
  {
    username: "pipo",
    password: "7853",
    nome: "pipo",
    apps: ["operacao"],
    role: "user",
    rotas: [
      "operacao-preFecho",
      "operacao-retencao",
      "operacao-salas"
    ]
  }
];

const LS_USER = "usuarioLogado"; // guardamos {username,nome,apps,role,rotas}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(LS_USER)) || null;
  } catch {
    return null;
  }
}

export function login(username, password) {
  const u = USERS.find(x => x.username === username && x.password === password);
  if (!u) throw new Error("Usuário ou senha inválidos");
  const { password: _omit, ...pub } = u;
  localStorage.setItem(LS_USER, JSON.stringify(pub));
  return pub;
}

export function logout() {
  localStorage.removeItem(LS_USER);
}

// ===== acesso por APP (módulo: operacao / erp / base)
export function canAccess(appKey) {
  const u = getCurrentUser();
  if (!u) return false;

  // admin (vt) enxerga tudo, mesmo que algum app esteja "desativado"
  if (u.role === "admin") return true;
  if (!appKey) return true;

  return Array.isArray(u.apps) && u.apps.includes(appKey);
}

export function requireApp(appKey) {
  const u = getCurrentUser();
  if (!u) {
    window.location.replace("./login.html");
    return false;
  }
  if (!canAccess(appKey)) {
    // redireciona pra algo que ele tenha acesso
    if (u.apps?.includes("erp")) {
      window.location.replace("./app-erp/html/menu.html");
    } else {
      window.location.replace("./app-selector.html");
    }
    return false;
  }
  return true;
}

// ===== permissões extras (por rota / página)
export function isAdmin() {
  const u = getCurrentUser();
  return !!u && (u.role === "admin");
}

/**
 * routeKey exemplo:
 *   "operacao-lancamento"
 *   "operacao-preFecho"
 *   "operacao-retencao"
 *   "operacao-salas"
 */
export function canAccessRoute(routeKey) {
  const u = getCurrentUser();
  if (!u) return false;

  // admin tem acesso a tudo
  if (u.role === "admin") return true;

  if (!routeKey) return true;
  if (u.rotas?.includes("*")) return true;

  return Array.isArray(u.rotas) && u.rotas.includes(routeKey);
}

export function requireRoute(routeKey, fallbackUrl = "./app-operacao/menu.html") {
  if (!canAccessRoute(routeKey)) {
    // se não puder, manda pro menu da operação (ou outro lugar que você passar)
    window.location.replace(fallbackUrl);
    return false;
  }
  return true;
}