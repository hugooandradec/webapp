import { inicializarPagina } from "../../common/js/navegacao.js";

const PONTOS = ["Tubiacanga", "MR", "Amarelos", "Fabinho", "Seven", "Praça"];
const STORAGE_KEY = "fecho_pontos_v2";

let dados = {}; // { ponto: { fecho:"", despesas:"" } }

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

function limparTextoMonetario(str) {
  // ✅ só números e vírgula
  let v = (str || "").toString();

  // remove tudo que não for número ou vírgula
  v = v.replace(/[^\d,]/g, "");

  // permite só UMA vírgula
  const partes = v.split(",");
  if (partes.length > 2) {
    v = partes[0] + "," + partes.slice(1).join("");
  }

  return v;
}

function parseBR(str) {
  // "5421,22" => 5421.22
  const v = (str || "").toString().trim();
  if (!v) return 0;
  const num = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function formatarBR(num) {
  return (Number(num) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarMoeda(num) {
  return (Number(num) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function calcularTotais() {
  let soma = 0;

  PONTOS.forEach((p) => {
    const fecho = parseBR(dados[p]?.fecho);
    const despesas = parseBR(dados[p]?.despesas);
    const total = fecho - despesas;

    const totalSpan = document.querySelector(`[data-total="${p}"]`);
    if (totalSpan) {
      totalSpan.textContent = formatarMoeda(total);
      totalSpan.classList.remove("verde", "vermelho", "neutro");
      totalSpan.classList.add(total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro");
    }

    soma += total;
  });

  const totalGeralEl = document.getElementById("totalGeral");
  totalGeralEl.textContent = "TOTAL GERAL: " + formatarMoeda(soma);
  totalGeralEl.className = "total-geral " + (soma < 0 ? "vermelho" : soma > 0 ? "verde" : "neutro");
}

function criarTelaUmaVez() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  PONTOS.forEach((ponto) => {
    if (!dados[ponto]) dados[ponto] = { fecho: "", despesas: "" };

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="card-titulo"><span>${ponto}</span></div>

      <div class="grid">
        <div class="linha">
          <label>Fecho (%):</label>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="fecho"
            value="${dados[ponto].fecho || ""}"
          />
        </div>

        <div class="linha">
          <label>Despesas:</label>
          <input
            type="text"
            inputmode="decimal"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="0,00"
            data-ponto="${ponto}"
            data-campo="despesas"
            value="${dados[ponto].despesas || ""}"
          />
        </div>

        <div class="resultado">
          Total: <span data-total="${ponto}" class="neutro">${formatarMoeda(0)}</span>
        </div>
      </div>
    `;

    lista.appendChild(card);
  });

  // binds (SEM re-render)
  document.querySelectorAll("input[data-ponto]").forEach((inp) => {
    const ponto = inp.dataset.ponto;
    const campo = inp.dataset.campo;

    inp.addEventListener("beforeinput", (e) => {
      // bloqueia letras na fonte
      if (typeof e.data === "string" && /[^\d,]/.test(e.data)) {
        e.preventDefault();
      }
    });

    inp.addEventListener("input", () => {
      const limpo = limparTextoMonetario(inp.value);

      // mantém cursor no lugar mesmo limpando
      const start = inp.selectionStart ?? limpo.length;
      inp.value = limpo;
      inp.setSelectionRange(Math.min(start, limpo.length), Math.min(start, limpo.length));

      dados[ponto][campo] = inp.value;
      salvar();
      calcularTotais();
    });

    // formata bonitinho quando sai do campo (igual sensação do Lançamento)
    inp.addEventListener("blur", () => {
      const n = parseBR(inp.value);
      inp.value = inp.value ? formatarBR(n) : "";
      dados[ponto][campo] = inp.value;
      salvar();
      calcularTotais();
    });
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
    const fecho = parseBR(dados[ponto]?.fecho);
    const despesas = parseBR(dados[ponto]?.despesas);
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
  criarTelaUmaVez(); // recria tudo (ok, aqui pode)
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
