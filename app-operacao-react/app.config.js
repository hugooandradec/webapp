export const PROD_APP_BASE_PATH = "/webapp";
export const PROD_APP_BASE_URL = `${PROD_APP_BASE_PATH}/`;
export const DEFAULT_DEV_API_BASE_URL = "http://localhost:3000/api";

export function getRuntimeBasePath() {
  const baseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : PROD_APP_BASE_URL;

  if (!baseUrl || baseUrl === "/") {
    return "";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function getApiBaseUrl() {
  const envApiBaseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : "";
  const isDev =
    typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

  if (envApiBaseUrl) {
    return envApiBaseUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, origin } = window.location;

    if (isDev) {
      return `${protocol}//${hostname}:3000/api`;
    }

    return `${origin}/api`;
  }

  return DEFAULT_DEV_API_BASE_URL;
}

export function isSyncEnabled() {
  const envValue =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_SYNC
      ? String(import.meta.env.VITE_ENABLE_SYNC).trim().toLowerCase()
      : "";

  return envValue === "true" || envValue === "1" || envValue === "yes";
}
