// common/js/auth.js
const USERS = [
  // vt agora com acesso a ERP + Operação e role admin
  { username: "vt",  password: "178590", nome: "vt",  apps: ["operacao","erp"], role: "admin" },
  // exemplo: usuário só-ERP, sem admin
  { username: "pipo", password: "7853",  nome: "pipo", apps: ["erp"], role: "user" }
];

const LS_USER = "usuarioLogado"; // guardamos {username,nome,apps,role}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)) || null; } catch { return null; }
}
export function login(username, password) {
  const u = USERS.find(x => x.username === username && x.password === password);
  if (!u) throw new Error("Usuário ou senha inválidos");
  const { password: _omit, ...pub } = u;
  localStorage.setItem(LS_USER, JSON.stringify(pub));
  return pub;
}
export function logout() { localStorage.removeItem(LS_USER); }

export function canAccess(appKey) {
  const u = getCurrentUser(); if (!u) return false;
  if (!appKey) return true;
  return Array.isArray(u.apps) && u.apps.includes(appKey);
}
export function requireApp(appKey) {
  const u = getCurrentUser();
  if (!u) { window.location.replace("./login.html"); return false; }
  if (!canAccess(appKey)) {
    if (u.apps?.includes("erp")) window.location.replace("./app-erp/html/menu.html");
    else window.location.replace("./app-selector.html");
    return false;
  }
  return true;
}

// ===== permissões
export function isAdmin() {
  const u = getCurrentUser();
  return !!u && (u.role === "admin");
}
