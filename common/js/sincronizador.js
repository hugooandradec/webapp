import { enviarDados } from './servicos.js';

// 🟣 SALVAR COM SINCRONIZAÇÃO
export async function salvarComSincronizacao(acao, dados) {
  try {
    if (navigator.onLine) {
      return await enviarDados(acao, dados);
    } else {
      const pendentes = JSON.parse(localStorage.getItem("pendentes") || "[]");
      pendentes.push({ acao, dados });
      localStorage.setItem("pendentes", JSON.stringify(pendentes));
      console.warn("💾 Dados salvos localmente (offline)");
      return { sucesso: false, mensagem: "Salvo localmente. Será sincronizado." };
    }
  } catch (erro) {
    console.error("❌ Erro ao salvar com sincronização:", erro);
    return { sucesso: false, mensagem: "Erro ao salvar dados." };
  }
}

// 🔁 SINCRONIZAR PENDÊNCIAS
async function sincronizarPendencias() {
  if (!navigator.onLine) return;

  const pendentes = JSON.parse(localStorage.getItem("pendentes") || "[]");
  if (pendentes.length === 0) return;

  console.log("🔄 Sincronizando pendências...");

  const restantes = [];

  for (const item of pendentes) {
    const { acao, dados } = item;
    const resposta = await enviarDados(acao, dados);
    if (!resposta.sucesso) {
      restantes.push(item); // mantém para tentar novamente depois
    }
  }

  localStorage.setItem("pendentes", JSON.stringify(restantes));

  if (restantes.length === 0) {
    console.log("✅ Todas as pendências foram sincronizadas.");
  } else {
    console.warn("⚠️ Algumas pendências não foram sincronizadas.");
  }
}

// Escutar eventos de conexão
window.addEventListener("online", sincronizarPendencias);
window.addEventListener("load", sincronizarPendencias);