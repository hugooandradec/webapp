document.addEventListener("DOMContentLoaded", () => {
  carregarDoStorage();
  ["data", "valorInicial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => {
      salvarNoStorage();
      atualizarTotais();
    });
  });
});

const STORAGE_KEY = "lancamentos";
const RAW_STORAGE_KEY = "lancamentos_raw";
const listaLancamentos = [];
let historicoRaw = [];

const corPos = "#1b8f2e";
const corNeg = "#c0392b";

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function parseValor(v) {
  return parseFloat((v || "0").replace(",", ".")) || 0;
}
function normalizarPonto(v) {
  return (v || "").trim().toLowerCase();
}

/* ===== STORAGE ===== */
function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaLancamentos));
  localStorage.setItem(RAW_STORAGE_KEY, JSON.stringify(historicoRaw));
  localStorage.setItem("dataLancamento", document.getElementById("data").value);
  localStorage.setItem("valorInicialLancamento", document.getElementById("valorInicial").value);
}

function carregarDoStorage() {
  document.getElementById("data").value = localStorage.getItem("dataLancamento") || "";
  document.getElementById("valorInicial").value = localStorage.getItem("valorInicialLancamento") || "";

  historicoRaw = JSON.parse(localStorage.getItem(RAW_STORAGE_KEY) || "[]");
  rebuildAgregado();
  atualizarLista();
}

/* ===== AGREGAÇÃO ===== */
function rebuildAgregado() {
  const mapa = new Map();
  for (const e of historicoRaw) {
    const k = normalizarPonto(e.ponto);
    if (!mapa.has(k)) mapa.set(k, { ponto: k, dinheiro: 0, saida: 0 });
    mapa.get(k).dinheiro += e.dinheiro;
    mapa.get(k).saida += e.saida;
  }
  listaLancamentos.length = 0;
  mapa.forEach(v => listaLancamentos.push(v));
}

/* ===== ENTRADA ===== */
window.adicionarEntrada = function () {
  document.getElementById("container-nova-entrada").innerHTML = `
    <label>Ponto</label>
    <input id="ponto" placeholder="Nome do ponto">
    <label>Dinheiro</label>
    <input id="dinheiro" type="number" placeholder="R$">
    <label>Saída</label>
    <input id="saida" type="number" placeholder="R$">
    <button class="btn" onclick="salvarEntrada()">Salvar Entrada</button>
  `;
};

window.salvarEntrada = function () {
  const ponto = normalizarPonto(ponto.value);
  if (!ponto) return toast?.error("Informe o ponto.");

  historicoRaw.push({
    id: crypto.randomUUID(),
    ponto,
    dinheiro: parseValor(dinheiro.value),
    saida: parseValor(saida.value)
  });

  rebuildAgregado();
  salvarNoStorage();
  atualizarLista();
  document.getElementById("container-nova-entrada").innerHTML = "";
};

/* ===== LISTA ===== */
function atualizarLista() {
  const el = document.getElementById("entradas");
  el.innerHTML = "";
  listaLancamentos.forEach((e, i) => {
    el.innerHTML += `
      <div class="linha-lancamento">
        <strong>${e.ponto}</strong>
        ${formatarMoeda(e.dinheiro - e.saida)}
        <div class="acoes">
          <button class="excluir" onclick="excluirLancamento(${i})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`;
  });
  atualizarTotais();
}

/* ===== TOTAIS ===== */
function atualizarTotais() {
  const total = listaLancamentos.reduce(
    (s, e) => s + e.dinheiro - e.saida, 0
  );
  document.getElementById("resumoLancamento").innerHTML = `
    <strong>Valor Total:</strong>
    <span style="color:${total < 0 ? corNeg : corPos}">
      ${formatarMoeda(total)}
    </span>`;
}

/* ===== AÇÕES ===== */
window.excluirLancamento = function (i) {
  const key = listaLancamentos[i].ponto;
  historicoRaw = historicoRaw.filter(e => normalizarPonto(e.ponto) !== key);
  rebuildAgregado();
  salvarNoStorage();
  atualizarLista();
};

window.visualizarRelatorio = function () {
  document.getElementById("conteudo-relatorio").innerHTML = `
    <button class="fechar-x" onclick="fecharRelatorio()">✖</button>
    ${document.getElementById("resumoLancamento").innerHTML}
  `;
  document.getElementById("modal-relatorio").classList.add("aberta");
};

window.fecharRelatorio = () =>
  document.getElementById("modal-relatorio").classList.remove("aberta");

window.limparLancamentos = function () {
  if (!confirm("Limpar tudo?")) return;
  historicoRaw = [];
  listaLancamentos.length = 0;
  localStorage.clear();
  atualizarLista();
};
