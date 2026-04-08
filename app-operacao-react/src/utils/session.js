import { getRuntimeBasePath } from "../../app.config.js";

const USER_STORAGE_KEYS = [
  "usuarioLogado",
  "usuario",
  "user",
  "authUser",
  "ajudante_usuario",
];

const TOKEN_STORAGE_KEYS = [
  "token",
  "authToken",
  "ajudante_token",
];

function getAppBasePath() {
  return getRuntimeBasePath();
}

export function getLoginPath() {
  return getAppBasePath() || "/";
}

export function getMenuPath() {
  return getAppBasePath() || "/";
}

export function lerUsuarioLogado() {
  if (typeof window === "undefined") return null;

  for (const chave of USER_STORAGE_KEYS) {
    const valor = window.localStorage.getItem(chave);
    if (!valor) continue;

    try {
      const usuario = JSON.parse(valor);
      if (usuario && typeof usuario === "object") return usuario;
    } catch {
      // ignora e tenta a proxima chave
    }
  }

  return null;
}

export function limparDadosLogin() {
  if (typeof window === "undefined") return;

  [...USER_STORAGE_KEYS, ...TOKEN_STORAGE_KEYS].forEach((chave) => {
    window.localStorage.removeItem(chave);
  });
}

export function irPara(caminho) {
  if (typeof window === "undefined") return;
  window.location.href = caminho;
}

export function irParaMenu() {
  irPara(getMenuPath());
}

export function irParaLogin() {
  irPara(getLoginPath());
}
