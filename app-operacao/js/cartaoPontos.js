import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "cartao_maquinas_v1";
const TAXA = 0.06; // 6%

let state = {
  itens: []
  // { id, ponto, maquina, brutoCent }
};

/* =======================
   STORAGE
======================= */
function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function carregar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.itens)) state.itens = parsed.itens;
  } catch {}
}

/* =======================
   HELPERS
======================= */
function uid() {
  return (crypto?.randomUUID?.() || ("id_" + Date.now() + "_" + Math.random().toString(16).slice(2)));
}

function soDigitos(str) {
  return (str || "").toString().replace(/\D/g, "");
}

function formatarNumeroDeCentavos(cent) {
  const v = (Number(cent) || 0) / 100;
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarMoeda(cent) {
  const v = (Number(cent) || 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

function calcLiquidoCent(brutoCent) {
  // líquido = bruto - 6% => bruto * 0.94
  const v = Number(brutoCent) || 0;
  return Math.round(v * (1 - TAXA));
}

function getItem(id) {
  return state.itens.find(x => x.id === id);
}

/* =======================
   UI (sem re-render em input)
======================= */
function atualizarLinha(id) {
  const item = getItem(id);
  if (!item) return;

  const brutoCent = Number(item.brutoCent || 0);
  const liquidoCent = calcLiquidoCent(brutoCent);

  const elLiquido = document.querySelector(`[data-liquido="${id}"]`);
  if (elLiquido) elLiquido.textContent = formatarMoeda(liquidoCent);

  atualizarTotalGeral();
}

function atualizarTotalGeral() {
  let soma = 0;
  for (const it of state.itens) soma += calcLiquidoCent(Number(it.brutoCent || 0));

  const el = document.getElementById("totalLiquido");
  el.textContent = "TOTAL LÍQUIDO: " + formatarMoeda(soma);
  el.className = "total-geral " + (soma > 0 ? "verde" : "neutro");
}

function bindMascaraCentavos(input, onCentavos) {
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");

  input.addEventListener("beforeinput", (e) => {
    if (typeof e.data === "string" && /\D/.test(e.data)) e.preventDefault();
  });

  input.addEventListener("input", () => {
    const digits = soDigitos(input.value);
    const cent = digits ? Number(digits) : 0;

    onCentavos(cent);

    input.value = digits ? formatarNumeroDeCentavos(cent) : "";

    salvar();
    requestAnimationFrame(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  });

  input.addEventListener("focus", () => {
    requestAnimationFrame(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  });
}

function criarCard(item) {
  const brutoCent = Number(item.brutoCent || 0);
  const liquidoCent = calcLiquidoCent(brutoCent);

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="card-topo">
      <strong>Máquina</strong>
      <button class="btn-mini" data-remover="${item.id}">
        <i class="fa-solid fa-xmark"></i> Remover
      </button>
    </div>

    <div class="grid">
      <div class="linha">
        <label>Ponto:</label>
        <input type="text" placeholder="Nome do ponto" value="${item.ponto || ""}" data-ponto="${item.id}" />
      </div>

      <div class="linha">
        <label>Máquina:</label>
        <input type="text" placeholder="ID da máquina" value="${item.maquina || ""}" data-maquina="${item.id}" />
      </div>

      <div class="linha">
        <label>Bruto:</label>
        <input type="text" placeholder="0,00" value="${brutoCent ? formatarNumeroDeCentavos(brutoCent) : ""}" data-bruto="${item.id}" />
      </div>

      <div class="resultado">
        Líquido: <span data-liquido="${item.id}" class="verde">${formatarMoeda(liquidoCent)}</span>
        <span class="neutro" style="font-weight:800;"> ( -6% )</span>
      </div>
    </div>
  `;

  // binds texto simples
  const inpPonto = card.querySelector(`[data-ponto="${item.id}"]`);
  const inpMaquina = card.querySelector(`[data-maquina="${item.id}"]`);
  inpPonto.addEventListener("input", () => { item.ponto = inpPonto.value; salvar(); });
  inpMaquina.addEventListener("input", () => { item.maquina = inpMaquina.value; salvar(); });

  // máscara bruto (centavos automáticos)
  const inpBruto = card.querySelector(`[data-bruto="${item.id}"]`);
  bindMascaraCentavos(inpBruto, (cent) => {
    item.brutoCent = cent;
    atualizarLinha(item.id);
  });

  // remover
  const btnRem = card.querySelector(`[data-remover="${item.id}"]`);
  btnRem.addEventListener("click", () => removerItem(item.id));

  return card;
}

function renderInicial() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  if (state.itens.length === 0) {
    // começa com 1 por padrão (pra não ficar “em branco”)
    adicionarItem();
  }

  for (const item of state.itens) {
    lista.appendChild(criarCard(item));
  }

  atualizarTotalGeral();
}

/* =======================
   AÇÕES
======================= */
function adicionarItem() {
  const novo = { id: uid(), ponto: "", maquina: "", brutoCent: 0 };
  state.itens.push(novo);
  salvar();

  const lista = document.getElementById("lista");
  const card = criarCard(novo);
  lista.appendChild(card);

  // foca no ponto
  const inp = card.querySelector(`[data-ponto="${novo.id}"]`);
  if (inp) inp.focus();

  atualizarTotalGeral();
}

function removerItem(id) {
  state.itens = state.itens.filter(x => x.id !== id);
  salvar();

  const el = document.querySelector(`.card[data-id="${id}"]`);
  if (el) el.remove();

  atualizarTotalGeral();
}

function limparTudo() {
  if (!confirm("Limpar todas as máquinas do cartão?")) return;
  state = { itens: [] };
  salvar();
  renderInicial();
}

/* =======================
   MODAL
======================= */
function abrirModal() {
  const modal = document.getElementById("modalCartao");
  const rel = document.getElementById("relConteudo");

  let html = "";
  let soma = 0;

  for (const it of state.itens) {
    const bruto = Number(it.brutoCent || 0);
    const liquido = calcLiquidoCent(bruto);
    soma += liquido;

    html += `<strong>${(it.ponto || "(sem ponto)")}</strong><br>`;
    html += `Máquina: <strong>${(it.maquina || "(sem máquina)")}</strong><br>`;
    html += `Bruto: <strong>${formatarMoeda(bruto)}</strong><br>`;
    html += `Líquido (-6%): <strong>${formatarMoeda(liquido)}</strong><br>`;
    html += `----------------------------------------<br><br>`;
  }

  html += `<strong>TOTAL LÍQUIDO: ${formatarMoeda(soma)}</strong>`;

  rel.innerHTML = html;
  modal.classList.add("aberta");
}

function fecharModal() {
  document.getElementById("modalCartao").classList.remove("aberta");
}

/* =======================
   INIT
======================= */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Cartão — Máquinas", "operacao");

  carregar();
  renderInicial();

  document.getElementById("btnNova").addEventListener("click", adicionarItem);
  document.getElementById("btnRelatorio").addEventListener("click", abrirModal);
  document.getElementById("btnLimpar").addEventListener("click", limparTudo);

  document.getElementById("btnFecharModal").addEventListener("click", fecharModal);
  document.getElementById("modalCartao").addEventListener("click", (e) => {
    if (e.target.id === "modalCartao") fecharModal();
  });
});
