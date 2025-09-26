// common/js/servicos.js
// Centraliza envio de dados ao backend

// Define a URL do backend com fallback automático
const URL_BACKEND =
  localStorage.getItem("URL_BACKEND") ||
  (window.__CONFIG && window.__CONFIG.apiBase) ||
  "https://webapp-backend-8abe.onrender.com";

/**
 * Envia dados ao backend (estrutura { acao, dados })
 * @param {string} acao - nome da ação
 * @param {object} dados - payload
 */
export async function enviarDados(acao, dados) {
  try {
    const resp = await fetch(URL_BACKEND, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao, dados }),
    });

    if (!resp.ok) {
      throw new Error("Erro na requisição: " + resp.status);
    }

    return await resp.json();
  } catch (err) {
    console.error("Falha ao enviar dados:", err);
    throw err;
  }
}

/**
 * Exemplo de função utilitária para GET (se quiser usar endpoints REST)
 * @param {string} endpoint - rota (ex: /app-erp/produtos)
 */
export async function getDados(endpoint) {
  try {
    const resp = await fetch(`${URL_BACKEND}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      throw new Error("Erro na requisição GET: " + resp.status);
    }

    return await resp.json();
  } catch (err) {
    console.error("Falha ao obter dados:", err);
    throw err;
  }
}

/**
 * Exemplo de função utilitária para PUT (atualizar no backend REST)
 * @param {string} endpoint
 * @param {object} dados
 */
export async function atualizarDados(endpoint, dados) {
  try {
    const resp = await fetch(`${URL_BACKEND}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!resp.ok) {
      throw new Error("Erro na requisição PUT: " + resp.status);
    }

    return await resp.json();
  } catch (err) {
    console.error("Falha ao atualizar dados:", err);
    throw err;
  }
}

/**
 * Exemplo de função utilitária para DELETE
 * @param {string} endpoint
 */
export async function deletarDados(endpoint) {
  try {
    const resp = await fetch(`${URL_BACKEND}${endpoint}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      throw new Error("Erro na requisição DELETE: " + resp.status);
    }

    return await resp.json();
  } catch (err) {
    console.error("Falha ao deletar dados:", err);
    throw err;
  }
}
