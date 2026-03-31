// common/js/auth.js
const USERS = [
  {
    username: "vt",
    password: "178590",
    nome: "vt",
    apps: ["operacao"],
    role: "admin",
    rotas: ["*"]
  },

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

const LS_USER = "usuarioLogado";

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

export function canAccess(appKey) {
  const u = getCurrentUser();
  if (!u) return false;

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
    if (u.apps?.includes("operacao")) {
      window.location.replace("./app-operacao/html/menu.html");
    } else if (u.apps?.includes("erp")) {
      window.location.replace("./app-erp/html/menu.html");
    } else {
      window.location.replace("./login.html");
    }
    return false;
  }

  return true;
}

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

  if (u.role === "admin") return true;
  if (!routeKey) return true;
  if (u.rotas?.includes("*")) return true;

  return Array.isArray(u.rotas) && u.rotas.includes(routeKey);
}

export function requireRoute(routeKey, fallbackUrl = "./app-operacao/html/menu.html") {
  if (!canAccessRoute(routeKey)) {
    window.location.replace(fallbackUrl);
    return false;
  }
  return true;
}