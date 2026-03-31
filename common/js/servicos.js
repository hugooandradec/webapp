// common/js/servicos.js

const URL_PADRAO_BACKEND = "https://ajudante-api.onrender.com";

export function getURLBackend() {
  const url = localStorage.getItem("URL_BACKEND") || URL_PADRAO_BACKEND;
  return String(url).replace(/\/+$/, "");
}

export function setURLBackend(url) {
  if (!url) return;
  localStorage.setItem("URL_BACKEND", String(url).replace(/\/+$/, ""));
}

export async function enviarDados(acao, dados = {}) {
  const url = getURLBackend();

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ acao, dados })
    });

    const texto = await resposta.text();
    let json = {};

    try {
      json = texto ? JSON.parse(texto) : {};
    } catch {
      json = { sucesso: false, mensagem: texto || "Resposta inválida do servidor." };
    }

    if (!resposta.ok) {
      return {
        sucesso: false,
        mensagem: json?.mensagem || `Erro HTTP ${resposta.status}`,
        status: resposta.status,
        ...json
      };
    }

    return {
      sucesso: json?.sucesso !== false,
      ...json
    };
  } catch (erro) {
    console.error("❌ Erro ao enviar dados:", erro);
    return {
      sucesso: false,
      mensagem: "Não foi possível conectar ao servidor."
    };
  }
}

export async function buscarDados(caminho = "") {
  const base = getURLBackend();
  const url = caminho
    ? `${base}/${String(caminho).replace(/^\/+/, "")}`
    : base;

  try {
    const resposta = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    const texto = await resposta.text();
    let json = {};

    try {
      json = texto ? JSON.parse(texto) : {};
    } catch {
      json = { sucesso: false, mensagem: texto || "Resposta inválida do servidor." };
    }

    if (!resposta.ok) {
      return {
        sucesso: false,
        mensagem: json?.mensagem || `Erro HTTP ${resposta.status}`,
        status: resposta.status,
        ...json
      };
    }

    return {
      sucesso: true,
      ...json
    };
  } catch (erro) {
    console.error("❌ Erro ao buscar dados:", erro);
    return {
      sucesso: false,
      mensagem: "Não foi possível conectar ao servidor."
    };
  }
}