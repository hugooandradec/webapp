// common/js/auth.js

const USERS = [
  {
    username: "vt",
    password: "178590",
    nome: "vt",
    role: "admin",
    rotas: ["*"]
  },

  {
    username: "pipo",
    password: "7853",
    nome: "pipo",
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

export function isAdmin() {
  const u = getCurrentUser();
  return !!u && u.role === "admin";
}

export function canAccessRoute(routeKey) {
  const u = getCurrentUser();
  if (!u) return false;

  if (u.role === "admin") return true;
  if (!routeKey) return true;
  if (u.rotas?.includes("*")) return true;

  return Array.isArray(u.rotas) && u.rotas.includes(routeKey);
}

export function requireRoute(routeKey) {
  if (!canAccessRoute(routeKey)) {
    window.location.replace("./menu.html");
    return false;
  }
  return true;
}