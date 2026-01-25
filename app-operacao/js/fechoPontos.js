const PONTOS = [
  "Tubiacanga",
  "MR",
  "Amarelos",
  "Fabinho",
  "Seven",
  "Praça"
];

const STORAGE_KEY = "fecho_pontos_v1";
let dados = {};

function parseValor(v) {
  return Number((v || "").replace(/\D/g, "")) / 100 || 0;
}

function formatar(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregar() {
  dados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function render() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  let totalGeral = 0;

  PONTOS.forEach(ponto => {
    const fecho = parseValor(dados[ponto]?.fecho);
    const despesas = parseValor(dados[ponto]?.despesas);
    const total = fecho - despesas;
    totalGeral += total;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${ponto}</h3>

      <div class="linha">
        <label>Fecho:</label>
        <input data-ponto="${ponto}" data-campo="fecho" value="${dados[ponto]?.fecho || ""}">
      </div>

      <div class="linha">
        <label>Despesas:</label>
        <input data-ponto="${ponto}" data-campo="despesas" value="${dados[ponto]?.despesas || ""}">
      </div>

      <div class="resultado ${total >= 0 ? "verde" : "vermelho"}">
        Total: ${formatar(total)}
      </div>
    `;

    lista.appendChild(card);
  });

  const tg = document.getElementById("totalGeral");
  tg.textContent = "TOTAL GERAL: " + formatar(totalGeral);
  tg.className = "total-geral " + (totalGeral >= 0 ? "verde" : "vermelho");

  document.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const p = e.target.dataset.ponto;
      const c = e.target.dataset.campo;
      dados[p] ??= {};
      dados[p][c] = e.target.value;
      salvar();
      render();
    });
  });
}

function abrirModal() {
  let texto = "";
  let soma = 0;

  PONTOS.forEach(p => {
    const fecho = parseValor(dados[p]?.fecho);
    const despesas = parseValor(dados[p]?.despesas);
    const total = fecho - despesas;
    soma += total;

    texto += `${p}\n`;
    texto += `Fecho: ${formatar(fecho)}\n`;
    texto += `Despesas: ${formatar(despesas)}\n`;
    texto += `Total: ${formatar(total)}\n`;
    texto += "---------------------------\n\n";
  });

  texto += `TOTAL GERAL: ${formatar(soma)}`;

  document.getElementById("relatorio").textContent = texto;
  document.getElementById("modal").classList.add("aberto");
}

function limpar() {
  if (!confirm("Limpar todos os valores?")) return;
  dados = {};
  salvar();
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  carregar();
  render();

  document.getElementById("btnRelatorio").onclick = abrirModal;
  document.getElementById("fechar").onclick = () =>
    document.getElementById("modal").classList.remove("aberto");
  document.getElementById("btnLimpar").onclick = limpar;
});
