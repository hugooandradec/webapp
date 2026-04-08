import { getApiBaseUrl } from "../../app.config.js";

const DEVICE_ID_STORAGE_KEY = "app_operacao_device_id";

function getSyncBaseUrl() {
  return `${getApiBaseUrl()}/sync`;
}

function normalizarModulo(modulo = "") {
  return String(modulo).trim().toLowerCase();
}

function normalizarUsuario(usuario = "") {
  return String(usuario).trim().toLowerCase();
}

export function getDeviceId() {
  if (typeof window === "undefined") return "server";

  const existente = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existente) return existente;

  const novo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, novo);
  return novo;
}

export async function carregarDocumentoSync(modulo, usuario) {
  const moduloNormalizado = normalizarModulo(modulo);
  const usuarioNormalizado = normalizarUsuario(usuario);

  if (!moduloNormalizado || !usuarioNormalizado) {
    return null;
  }

  const baseUrl = getSyncBaseUrl();
  const url = new URL(`${baseUrl}/${encodeURIComponent(moduloNormalizado)}`);
  url.searchParams.set("usuario", usuarioNormalizado);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar sincronizacao de ${moduloNormalizado}.`);
  }

  const data = await response.json();
  return data?.documento || null;
}

export async function salvarDocumentoSync(modulo, usuario, payload) {
  const moduloNormalizado = normalizarModulo(modulo);
  const usuarioNormalizado = normalizarUsuario(usuario);

  if (!moduloNormalizado || !usuarioNormalizado || !payload || typeof payload !== "object") {
    return null;
  }

  const baseUrl = getSyncBaseUrl();
  const response = await fetch(`${baseUrl}/${encodeURIComponent(moduloNormalizado)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      usuario: usuarioNormalizado,
      payload,
      deviceId: getDeviceId(),
      updatedAtClient: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao salvar sincronizacao de ${moduloNormalizado}.`);
  }

  const data = await response.json();
  return data?.documento || null;
}
