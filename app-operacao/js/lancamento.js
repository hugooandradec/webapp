/* ===== HELPERS ===== */
function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}
function parseValor(v) {
  return parseFloat((v || "0").toString().replace(",", ".")) || 0;
}
function normalizarPonto(n) {
  return (n || "").trim().toLowerCase();
}

const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const corAzul = "#1976d2";

/* ===== ESTADO ===== */
const STORAGE_KEY = "lancamentos";
const RAW_STORAGE_KEY = "lancamentos_raw";
const listaLancamentos = [];
let historicoRaw = [];

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  carregarDoStorage();

  ["data", "valorInicial"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        salvarNoStorage();
        atualizarTotais();
      });
    }
  });
});

/* ===== STORAGE ===== */
function salvarNoStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaLancamentos));
  localStorage.setItem(RAW_STORAGE_KEY, JSON.stringify(historicoRaw));
  localStorage.setItem("dataLancamento", document.getElementById("data").value || "");
  localStorage.setItem("valorInicialLancamento", document.getElementById("valorInicial").value || "");
}

function carregarDoStorage() {
  document.getElementById("data").value =
    localStorage.getItem("dataLancamento") || "";
  document.getElementById("valorInicial").value =
    localStorage.getItem("valorInicialLancamento") || "";

  historicoRaw = JSON.parse(localStorage.getItem(RAW_STORAGE_KEY) || "[]");
  rebuildAgregado();
  atualizarLista();
}

/* ===== AGREGAÇÃO ===== */
function rebuildAgregado() {
  const mapa = new Map();

  historicoRaw.forEach(e => {
    const k = normalizarPonto(e.ponto);
    if (!mapa.has(k)) {
      mapa.set(k, { ponto: k, dinheiro: 0, cartao: 0, outros: 0, saida: 0 });
    }
    const acc = mapa.get(k);
    acc.dinheiro += e.dinheiro || 0;
    acc.cartao += e.cartao || 0;
    acc.outros += e.outros || 0;
    acc.saida += e.saida || 0;
  });

  listaLancamentos.length = 0;
  mapa.forEach(v => listaLancamentos.push(v));
}

/* ===== UI ENTRADA ===== */
window.adicionarEntrada = function () {
  const box = document.getElementById("container-nova-entrada");

  box.innerHTML = `
    <label>Ponto</label>
    <input id="ponto" type="text" />

    <label>Entrada</label>
    <input id="dinheiro" type="number" />

    <label>Cartão</label>
    <input id="cartao" type="number" />

    <label>Outros</label>
    <input id="outros" type="number" />

    <label>Saída</label>
    <input id="saida" type="number" />

    <button class="btn" onclick="salvarEntrada()">Salvar Entrada</button>
  `;
};

window.salvarEntrada = function () {
  const pontoEl = document.getElementById("ponto");
  if (!pontoEl || !pontoEl.value.trim()) {
    window.toast?.error?.("Informe o ponto");
    return;
  }

  historicoRaw.push({
    ponto: normalizarPonto(pontoEl.value),
    dinheiro: parseValor(document.getElementById("dinheiro").value),
    cartao: parseValor(document.getElementById("cartao").value),
    outros: parseValor(document.getElementById("outros").value),
    saida: parseValor(document.getElementById("saida").value)
  });

  rebuildAgregado();
  salvarNoStorage();
  atualizarLista();

  document.getElementById("container-nova-entrada").innerHTML = "";
};

/* ===== LISTA ===== */
function atualizarLista() {
  const lista = document.getElementById("entradas");
  lista.innerHTML = "";

  listaLancamentos.forEach(l => {
    lista.innerHTML += `
      <div class="linha-lancamento">
        <div>
          <strong>${l.ponto}</strong><br>
          ${l.dinheiro ? `Entrada: ${formatarMoeda(l.dinheiro)} ` : ""}
          ${l.cartao ? `| Cartão: ${formatarMoeda(l.cartao)} ` : ""}
          ${l.outros ? `| Outros: ${formatarMoeda(l.outros)} ` : ""}
          ${l.saida ? `| Saída: -${formatarMoeda(l.saida)}` : ""}
        </div>
      </div>
    `;
  });

  atualizarTotais();
}

/* ===== TOTAIS ===== */
function atualizarTotais() {
  const totalEntrada = listaLancamentos.reduce((s,e)=>s+(e.dinheiro||0),0);
  const totalOutros = listaLancamentos.reduce((s,e)=>s+(e.outros||0),0);
  const totalSaida = listaLancamentos.reduce((s,e)=>s+(e.saida||0),0);
  const valorInicial = parseValor(document.getElementById("valorInicial").value);

  const total = valorInicial + totalEntrada + totalOutros - totalSaida;

  document.getElementById("resumoLancamento").innerHTML = `
    <p><strong>Valor Inicial:</strong> ${formatarMoeda(valorInicial)}</p>
    <p><strong>Valor Total:</strong>
      <span style="color:${total < 0 ? corNeg : corPos}">
        ${formatarMoeda(total)}
      </span>
    </p>
  `;
}

/* ===== MODAL ===== */
window.visualizarRelatorio = function () {
  const conteudo = document.getElementById("conteudo-relatorio");
  conteudo.innerHTML = document.getElementById("resumoLancamento").innerHTML;
  document.getElementById("modal-relatorio").classList.add("aberta");
};

/* ===== LIMPAR ===== */
window.limparLancamentos = function () {
  if (!confirm("Limpar tudo?")) return;

  listaLancamentos.length = 0;
  historicoRaw = [];
  localStorage.clear();

  document.getElementById("container-nova-entrada").innerHTML = "";
  atualizarLista();
};
