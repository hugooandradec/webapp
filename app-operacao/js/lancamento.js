/* ===== INIT ===== */
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

/* ===== HELPERS ===== */
function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function parseValor(v) {
  return parseFloat((v || "0").toString().replace(",", ".")) || 0;
}
function normalizarPonto(v) {
  return (v || "").trim().toLowerCase();
}

const corPos = "#1b8f2e";
const corNeg = "#c0392b";
const corAzul = "#1976d2";

/* ===== ESTADO ===== */
const STORAGE_KEY = "lancamentos";
const RAW_STORAGE_KEY = "lancamentos_raw";
const listaLancamentos = [];
let historicoRaw = [];

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
      mapa.set(k, { ponto:k, dinheiro:0, cartao:0, outros:0, saida:0 });
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
window.adicionarEntrada = function() {
  document.getElementById("container-nova-entrada").innerHTML = `
    <label>Ponto</label>
    <input id="ponto" type="text" />

    <label>Dinheiro</label>
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

window.salvarEntrada = function() {
  const ponto = normalizarPonto(ponto.value);
  if (!ponto) return toast.error("Informe o ponto");

  historicoRaw.push({
    ponto,
    dinheiro: parseValor(dinheiro.value),
    cartao: parseValor(cartao.value),
    outros: parseValor(outros.value),
    saida: parseValor(saida.value)
  });

  rebuildAgregado();
  salvarNoStorage();
  atualizarLista();
  containerNovaEntrada.innerHTML = "";
};

/* ===== LISTA ===== */
function atualizarLista() {
  const el = document.getElementById("entradas");
  el.innerHTML = "";

  listaLancamentos.forEach(l => {
    const div = document.createElement("div");
    div.className = "linha-lancamento";
    div.innerHTML = `
      <div>
        <strong>${l.ponto}</strong><br>
        ${l.dinheiro ? `Dinheiro: ${formatarMoeda(l.dinheiro)} ` : ""}
        ${l.cartao ? `| Cartão: ${formatarMoeda(l.cartao)} ` : ""}
        ${l.outros ? `| Outros: ${formatarMoeda(l.outros)} ` : ""}
        ${l.saida ? `| Saída: -${formatarMoeda(l.saida)}` : ""}
      </div>
    `;
    el.appendChild(div);
  });

  atualizarTotais();
}

/* ===== TOTAIS ===== */
function atualizarTotais() {
  const valorInicial = parseValor(valorInicial.value);
  const total = listaLancamentos.reduce(
    (s,e)=> s + e.dinheiro + e.outros - e.saida, 0
  );

  resumoLancamento.innerHTML = `
    <p><strong>Valor Inicial:</strong> ${formatarMoeda(valorInicial)}</p>
    <p><strong>Valor Total:</strong>
      <span style="color:${total<0?corNeg:corPos}">
        ${formatarMoeda(valorInicial + total)}
      </span>
    </p>
  `;
}

/* ===== MODAL ===== */
window.visualizarRelatorio = function() {
  conteudoRelatorio.innerHTML = resumoLancamento.innerHTML +
    `<button class="btn" onclick="fecharRelatorio()">Fechar</button>`;
  modalRelatorio.classList.add("aberta");
};

window.fecharRelatorio = function() {
  modalRelatorio.classList.remove("aberta");
};

/* ===== LIMPAR ===== */
window.limparLancamentos = function() {
  if (!confirm("Limpar tudo?")) return;
  listaLancamentos.length = 0;
  historicoRaw = [];
  localStorage.clear();
  atualizarLista();
};
