export function capitalizarTexto(texto) {
  return texto
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function capitalizarNome(nome) {
  return nome
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

// Funções existentes (mantidas do original)
export async function enviarDados(acao, dados) {
  const resposta = await fetch(localStorage.getItem("URL_BACKEND"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, dados }),
  });

  if (!resposta.ok) throw new Error("Erro ao enviar dados.");
  return await resposta.json();
}

export function exibirMensagem(mensagem, tipo = "sucesso") {
  const msg = document.createElement("div");
  msg.className = `mensagem ${tipo}`;
  msg.innerText = mensagem;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}