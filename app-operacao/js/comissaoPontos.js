import { inicializarPagina } from "../../common/js/navegacao.js";

const PONTOS = ["Tubiacanga", "MR", "Amarelos", "Fabinho", "Seven", "Praça"];
const STORAGE_KEY = "fecho_pontos_v3_centavos";

let dados = {}; 
// { ponto: { fechoCent: 0, despesasCent: 0 } }  // sempre em centavos (inteiro)

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

function carregar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { dados = {}; return; }
  try {
    const parsed = JSON.parse(raw);
    dados = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    dados = {};
  }
}

function soDigitos(str) {
  return (str || "").toString().replace(/\D/g, "");
}

function formatarMoedaDeCentavos(centavos) {
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

function getCentavos(ponto, campo) {
  return Number(dados[ponto]?.[campo] || 0);
}

function setCentavos(ponto, campo, centavos) {
  if (!dados[ponto]) dados[ponto] = { fechoCent: 0, despesasCent: 0 };
  dados[ponto][campo] = Math.max(0, Number(centavos) || 0);
}

function calcularTotais() {
  let soma = 0;

  PONTOS.forEach((p) => {
    const fecho = getCentavos(p, "fechoCent");
    const despesas = getCentavos(p, "despesasCent");
    const total = fecho - despesas;
    soma += total;

    const totalSpan = document.querySelector(`[data-total="${p}"]`);
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

function aplicarMascaraCentavos(input, ponto, campoCentavos) {
  // pega só dígitos do que está no input e transforma em centavos
  const digits = soDigitos(input.value);

  // se vazio: 0
  const centavos = digits ? Number(digits) : 0;
  setCentavos(ponto, campoCentavos, centavos);

  // mostra sempre formatado "x.xxx,yy"
  input.value = digits ? formatarMoedaDeCentavos(centavos) : "";

  salvar();
  calcularTotais();
}

function bindMascara(input, ponto, campoCentavos) {
  // teclado numérico
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");

  // impede letras (cola também vai ser limpo no input)
  input.addEventListener("beforeinput", (e) => {
    if (typeof e.data === "string" && /\D/.test(e.data)) {
      // deixa passar backspace/delete (e.data null)
      e.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    aplicarMascaraCentavos(input, ponto, campoCentavos);

    // mantém cursor no fim (melhor UX nessa máscara)
    requestAnimationFrame(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  });

  // ao focar, joga cursor pro fim
  input.addEventListener("focus", () => {
    requestAnimationFrame(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  });
}

function criarTelaUmaVez() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  PONTOS.forEach((ponto) => {
    if (!dados[ponto]) dados[ponto] = { fechoCent: 0, despesasCent: 0 };

    const fechoCent = getCentavos(ponto, "fechoCent");
    const despesasCent = getCentavos(ponto, "despesasCent");
    const total = fechoCent - despesasCent;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-titulo"><span>${ponto}</span></div>

      <div class="grid">
        <div class="linha">
          <label>Comissão (%):</label>
          <input
            type="text"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="fechoCent"
            value="${fechoCent ? formatarMoedaDeCentavos(fechoCent) : ""}"
          />
        </div>

        <div class="linha">
          <label>Despesas:</label>
          <input
            type="text"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="despesasCent"
            value="${despesasCent ? formatarMoedaDeCentavos(despesasCent) : ""}"
          />
        </div>

        <div class="resultado">
          Total: <span data-total="${ponto}" class="${total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro"}">
            ${formatarMoeda(total)}
          </span>
        </div>
      </div>
    `;

    lista.appendChild(card);
  });

  // bind máscara em todos
  document.querySelectorAll("input[data-ponto]").forEach((inp) => {
    const ponto = inp.dataset.ponto;
    const campo = inp.dataset.campo;
    bindMascara(inp, ponto, campo);
  });

  calcularTotais();
}

/* ===== Modal ===== */

function abrirModal() {
  const modal = document.getElementById("modalFecho");
  const rel = document.getElementById("relConteudo");

  let html = "";
  let soma = 0;

  PONTOS.forEach((ponto) => {
    const fecho = getCentavos(ponto, "fechoCent");
    const despesas = getCentavos(ponto, "despesasCent");
    const total = fecho - despesas;
    soma += total;

    const classeTotal = total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro";

    html += `<strong>${ponto}</strong><br>`;
    html += `Fecho: <span class="verde"><strong>${formatarMoeda(fecho)}</strong></span><br>`;
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

function limparTudo() {
  if (!confirm("Deseja limpar todos os valores?")) return;
  dados = {};
  salvar();
  carregar();
  criarTelaUmaVez();
}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Fecho por Pontos", "operacao");

  carregar();
  criarTelaUmaVez();

  document.getElementById("btnRelatorio").addEventListener("click", abrirModal);
  document.getElementById("btnLimpar").addEventListener("click", limparTudo);

  document.getElementById("btnFecharModal").addEventListener("click", fecharModal);
  document.getElementById("modalFecho").addEventListener("click", (e) => {
    if (e.target.id === "modalFecho") fecharModal();
  });
});
