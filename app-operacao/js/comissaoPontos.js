import { inicializarPagina } from "../../common/js/navegacao.js";

const PONTOS = ["Tubiacanga", "MR", "Amarelos", "Fabinho", "Seven", "Praça"];
const STORAGE_KEY = "comissao_pontos_v2_centavos_com_datas";

// dados em centavos (inteiro) + datas ISO
let dados = {};
// {
//   dataDe: "2026-01-19",
//   dataAte: "2026-01-25",
//   pontos: { Tubiacanga: { comissaoCent: 0, despesasCent: 0 }, ... }
// }

/* =====================
   STORAGE
===================== */
function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    dados = { dataDe: "", dataAte: "", pontos: {} };
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    // compat mínimo
    dados = {
      dataDe: parsed?.dataDe || "",
      dataAte: parsed?.dataAte || "",
      pontos: parsed?.pontos && typeof parsed.pontos === "object" ? parsed.pontos : {}
    };
  } catch {
    dados = { dataDe: "", dataAte: "", pontos: {} };
  }
}

/* =====================
   HELPERS
===================== */
function soDigitos(str) {
  return (str || "").toString().replace(/\D/g, "");
}

function formatarNumeroDeCentavos(centavos) {
  const v = (Number(centavos) || 0) / 100;
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarMoeda(centavos) {
  const v = (Number(centavos) || 0) / 100;
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function formatarDataBR(iso) {
  if (!iso) return "___/___/____";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "___/___/____";
  return `${d}/${m}/${y}`;
}

function getPonto(ponto) {
  if (!dados.pontos[ponto]) dados.pontos[ponto] = { comissaoCent: 0, despesasCent: 0 };
  return dados.pontos[ponto];
}

function setCentavos(ponto, campo, valor) {
  const p = getPonto(ponto);
  p[campo] = Math.max(0, Number(valor) || 0);
}

/* =====================
   CÁLCULOS
===================== */
function calcularTotais() {
  let soma = 0;

  PONTOS.forEach((ponto) => {
    const p = getPonto(ponto);
    const comissao = Number(p.comissaoCent || 0);
    const despesas = Number(p.despesasCent || 0);
    const total = comissao - despesas;
    soma += total;

    const totalSpan = document.querySelector(`[data-total="${ponto}"]`);
    if (totalSpan) {
      totalSpan.textContent = formatarMoeda(total);
      totalSpan.classList.remove("verde", "vermelho", "neutro");
      totalSpan.classList.add(total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro");
    }
  });

  const totalGeralEl = document.getElementById("totalGeral");
  totalGeralEl.textContent = "TOTAL GERAL: " + formatarMoeda(soma);
  totalGeralEl.className =
    "total-geral " + (soma < 0 ? "vermelho" : soma > 0 ? "verde" : "neutro");
}

/* =====================
   MÁSCARA DE CENTAVOS
===================== */
function aplicarMascaraCentavos(input, ponto, campo) {
  const digits = soDigitos(input.value);
  const centavos = digits ? Number(digits) : 0;

  setCentavos(ponto, campo, centavos);

  input.value = digits ? formatarNumeroDeCentavos(centavos) : "";

  salvar();
  calcularTotais();

  requestAnimationFrame(() => {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  });
}

function bindMascara(input, ponto, campo) {
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");

  input.addEventListener("beforeinput", (e) => {
    if (typeof e.data === "string" && /\D/.test(e.data)) e.preventDefault();
  });

  input.addEventListener("input", () => aplicarMascaraCentavos(input, ponto, campo));

  input.addEventListener("focus", () => {
    requestAnimationFrame(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  });
}

/* =====================
   TELA
===================== */
function criarTelaUmaVez() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  PONTOS.forEach((ponto) => {
    const p = getPonto(ponto);
    const comissaoCent = Number(p.comissaoCent || 0);
    const despesasCent = Number(p.despesasCent || 0);
    const total = comissaoCent - despesasCent;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-titulo">
        <span>${ponto}</span>
      </div>

      <div class="grid">
        <div class="linha">
          <label>Comissão (%):</label>
          <input
            type="text"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="comissaoCent"
            value="${comissaoCent ? formatarNumeroDeCentavos(comissaoCent) : ""}"
          />
        </div>

        <div class="linha">
          <label>Despesas:</label>
          <input
            type="text"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="despesasCent"
            value="${despesasCent ? formatarNumeroDeCentavos(despesasCent) : ""}"
          />
        </div>

        <div class="resultado">
          Total:
          <span data-total="${ponto}" class="${total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro"}">
            ${formatarMoeda(total)}
          </span>
        </div>
      </div>
    `;

    lista.appendChild(card);
  });

  document.querySelectorAll("input[data-ponto]").forEach((inp) => {
    bindMascara(inp, inp.dataset.ponto, inp.dataset.campo);
  });

  calcularTotais();
}

/* =====================
   DATAS
===================== */
function bindDatas() {
  const elDe = document.getElementById("dataDe");
  const elAte = document.getElementById("dataAte");

  elDe.value = dados.dataDe || "";
  elAte.value = dados.dataAte || "";

  elDe.addEventListener("change", () => {
    dados.dataDe = elDe.value || "";
    salvar();
  });

  elAte.addEventListener("change", () => {
    dados.dataAte = elAte.value || "";
    salvar();
  });
}

/* =====================
   MODAL
===================== */
function abrirModal() {
  const modal = document.getElementById("modalFecho");
  const rel = document.getElementById("relConteudo");

  const dataDe = formatarDataBR(dados.dataDe || "");
  const dataAte = formatarDataBR(dados.dataAte || "");

  let html = `Período: ${dataDe} até ${dataAte}<br><br>`;
  let soma = 0;

  PONTOS.forEach((ponto) => {
    const p = getPonto(ponto);
    const comissao = Number(p.comissaoCent || 0);
    const despesas = Number(p.despesasCent || 0);
    const total = comissao - despesas;
    soma += total;

    const classeTotal = total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro";

    html += `<strong>${ponto}</strong><br>`;
    html += `Comissão: <span class="verde"><strong>${formatarMoeda(comissao)}</strong></span><br>`;
    html += `Despesas: <span class="vermelho"><strong>-${formatarMoeda(despesas)}</strong></span><br>`;
    html += `Total: <span class="${classeTotal}"><strong>${formatarMoeda(total)}</strong></span><br>`;
    html += `----------------------------------------<br><br>`;
  });

  const classeSoma = soma < 0 ? "vermelho" : soma > 0 ? "verde" : "neutro";
  html += `<strong>TOTAL GERAL: <span class="${classeSoma}">${formatarMoeda(soma)}</span></strong>`;

  rel.innerHTML = html;
  modal.classList.add("aberta");
}

function fecharModal() {
  document.getElementById("modalFecho").classList.remove("aberta");
}

/* =====================
   LIMPAR
===================== */
function limparTudo() {
  if (!confirm("Deseja limpar todos os valores e datas?")) return;
  dados = { dataDe: "", dataAte: "", pontos: {} };
  salvar();
  carregar();
  bindDatas();
  criarTelaUmaVez();
}

/* =====================
   INIT
===================== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Comissão dos Pontos", "operacao");

  carregar();
  bindDatas();
  criarTelaUmaVez();

  document.getElementById("btnRelatorio").addEventListener("click", abrirModal);
  document.getElementById("btnLimpar").addEventListener("click", limparTudo);

  document.getElementById("btnFecharModal").addEventListener("click", fecharModal);
  document.getElementById("modalFecho").addEventListener("click", (e) => {
    if (e.target.id === "modalFecho") fecharModal();
  });

  calcularTotais();
});
