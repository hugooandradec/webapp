// js/calculoSalas.js
// Cálculo de Salas (Bingos)
// Resultado = (Bruto / 2) + 10% - Despesas - 6% do Cartão - Taxa de parcelamento de cartão
// Pipo = 2/3 do resultado, Pass = 1/3 do resultado

import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_salas_v2";
let salas = [];

/* ===== Helpers de moeda / datas ===== */

// ✅ Agora aceita sinal negativo digitado (ex.: -1.234,56)
function parseCentavos(str) {
  if (str === null || str === undefined) return 0;

  const s = str.toString().trim();
  if (!s) return 0;

  // aceita "-" no começo (ou em qualquer lugar, mas só considera se houver)
  const negativo = s.includes("-");

  const limpo = s.replace(/\D/g, "");
  if (!limpo) return 0;

  const valor = Number(limpo) / 100;
  return negativo ? -valor : valor;
}

function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

// ✅ Formata mantendo o "-" se o usuário digitou negativo.
// Ex.: "-1234" -> "-12,34"
function formatarInputMonetario(input) {
  const raw = (input.value || "").toString();

  // mantém negativo se existir
  const negativo = raw.includes("-");

  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    // se o cara digitou só "-" deixa ele brincar
    input.value = raw.trim() === "-" ? "-" : "";
    return;
  }

  const num = Number(digits) / 100;
  const absFmt = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // se deu 0,00 não força "-"
  input.value = (negativo && num !== 0) ? `-${absFmt}` : absFmt;
}

function formatarDataBR(iso) {
  if (!iso) return "___/___/____";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "___/___/____";
  return `${d}/${m}/${y}`;
}

/* ===== Regras de cálculo ===== */

// REGRA CORRETA:
// (Bruto / 2) + 10% em cima da metade
//   - Despesas
//   - 6% do Cartão
//   - Taxa de parcelamento de cartão
function calcularResultadoSala(sala) {
  const bruto = parseCentavos(sala.bruto);
  const despesas = parseCentavos(sala.despesas);
  const cartao = parseCentavos(sala.cartao);
  const taxa = parseCentavos(sala.taxa);

  if (!bruto && !despesas && !cartao && !taxa) return 0;

  const taxaCartao = cartao * 0.06;

  // 🔴 PREJUÍZO: bruto negativo entra inteiro
  if (bruto < 0) {
    return bruto - despesas - taxaCartao - taxa;
  }

  // 🟢 LUCRO: regra normal
  const metade = bruto / 2;
  const com10 = metade * 1.10;

  return com10 - despesas - taxaCartao - taxa;
}


function calcularPipoPass(resultado) {
  const terco = resultado / 3;
  return {
    pipo: terco * 2,
    pass: terco
  };
}

/* ===== Storage ===== */

function salvarNoStorage() {
  const dataDe = document.getElementById("dataDe").value || "";
  const dataAte = document.getElementById("dataAte").value || "";
  const payload = { dataDe, dataAte, salas };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function carregarDoStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const dados = JSON.parse(raw);
    document.getElementById("dataDe").value = dados.dataDe || "";
    document.getElementById("dataAte").value = dados.dataAte || "";
    salas = Array.isArray(dados.salas) ? dados.salas : [];
  } catch (e) {
    console.error("Erro ao carregar storage:", e);
  }
}

/* ===== Renderização ===== */

function atualizarTotalGeral() {
  const elTotal = document.getElementById("totalGeral");
  let total = 0;
  salas.forEach((s) => {
    total += calcularResultadoSala(s);
  });

  elTotal.textContent = "";
  elTotal.className = "total-geral";

  if (!salas.length) return;

  const texto = "TOTAL GERAL: " + formatarMoeda(total);
  elTotal.textContent = texto;

  if (total < 0) elTotal.classList.add("vermelho");
  else if (total > 0) elTotal.classList.add("verde");
  else elTotal.classList.add("neutro");
}

function criarCardSala(sala, index) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Sala ${index + 1}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <small>preencha os valores e veja o resultado</small>
        <button class="icone-remover" title="Remover sala">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha-nome">
      <label>Nome:</label>
      <input type="text" class="sala-nome" placeholder="NOME DA SALA">
    </div>

    <div class="grid-sala">
      <div class="col-sala">
        <label>Bruto (R$)</label>
        <input type="text" inputmode="decimal" class="sala-bruto" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Despesas (-R$)</label>
        <input type="text" inputmode="decimal" class="sala-despesas" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Cartão (R$)</label>
        <input type="text" inputmode="decimal" class="sala-cartao" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Taxa parcelamento cartão (-R$)</label>
        <input type="text" inputmode="decimal" class="sala-taxa" placeholder="0,00">
      </div>
    </div>

    <div class="resultado">
      Resultado: <span class="valor">R$ 0,00</span> <span class="status">(Neutro)</span>
    </div>
    <div class="linha-pipo-pass">
      Pipo: <span class="pipo-valor">R$ 0,00</span> |
      Pass: <span class="pass-valor">R$ 0,00</span>
    </div>
  `;

  const nomeInput = card.querySelector(".sala-nome");
  const brutoInput = card.querySelector(".sala-bruto");
  const despesasInput = card.querySelector(".sala-despesas");
  const cartaoInput = card.querySelector(".sala-cartao");
  const taxaInput = card.querySelector(".sala-taxa");
  const btnRemover = card.querySelector(".icone-remover");
  const valorSpan = card.querySelector(".resultado .valor");
  const statusSpan = card.querySelector(".resultado .status");
  const resultadoDiv = card.querySelector(".resultado");
  const pipoSpan = card.querySelector(".pipo-valor");
  const passSpan = card.querySelector(".pass-valor");

  if (sala.nome) nomeInput.value = sala.nome;
  if (sala.bruto) { brutoInput.value = sala.bruto; formatarInputMonetario(brutoInput); }
  if (sala.despesas) { despesasInput.value = sala.despesas; formatarInputMonetario(despesasInput); }
  if (sala.cartao) { cartaoInput.value = sala.cartao; formatarInputMonetario(cartaoInput); }
  if (sala.taxa) { taxaInput.value = sala.taxa; formatarInputMonetario(taxaInput); }

  const atualizarResultado = () => {
    salas[index].nome = (nomeInput.value || "").toUpperCase();

    formatarInputMonetario(brutoInput);
    formatarInputMonetario(despesasInput);
    formatarInputMonetario(cartaoInput);
    formatarInputMonetario(taxaInput);

    salas[index].bruto = brutoInput.value || "";
    salas[index].despesas = despesasInput.value || "";
    salas[index].cartao = cartaoInput.value || "";
    salas[index].taxa = taxaInput.value || "";

    const res = calcularResultadoSala(salas[index]);
    valorSpan.textContent = formatarMoeda(res);

    resultadoDiv.classList.remove("verde", "vermelho", "neutro");
    if (res < 0) {
      resultadoDiv.classList.add("vermelho");
      statusSpan.textContent = "(Prejuízo)";
    } else if (res > 0) {
      resultadoDiv.classList.add("verde");
      statusSpan.textContent = "(Lucro)";
    } else {
      resultadoDiv.classList.add("neutro");
      statusSpan.textContent = "(Neutro)";
    }

    const { pipo, pass } = calcularPipoPass(res);
    pipoSpan.textContent = formatarMoeda(pipo);
    passSpan.textContent = formatarMoeda(pass);

    [pipoSpan, passSpan].forEach((span) => {
      span.classList.remove("verde", "vermelho", "neutro");
      if (res < 0) span.classList.add("vermelho");
      else if (res > 0) span.classList.add("verde");
      else span.classList.add("neutro");
    });

    atualizarTotalGeral();
    salvarNoStorage();
  };

  nomeInput.addEventListener("input", () => {
    nomeInput.value = (nomeInput.value || "").toUpperCase();
    atualizarResultado();
  });

  [brutoInput, despesasInput, cartaoInput, taxaInput].forEach((inp) => {
    inp.addEventListener("input", atualizarResultado);
    inp.addEventListener("change", atualizarResultado);
  });

  btnRemover.addEventListener("click", () => {
    if (!confirm("Remover esta sala?")) return;
    salas.splice(index, 1);
    renderizarSalas();
    salvarNoStorage();
  });

  atualizarResultado();
  return card;
}

function renderizarSalas() {
  const lista = document.getElementById("listaSalas");
  lista.innerHTML = "";

  salas.forEach((sala, idx) => {
    const card = criarCardSala(sala, idx);
    lista.appendChild(card);
  });

  atualizarTotalGeral();
}

/* ===== Modal ===== */

function abrirModal() {
  const modal = document.getElementById("modalSalas");
  const rel = document.getElementById("relConteudo");
  const dataDeIso = document.getElementById("dataDe").value || "";
  const dataAteIso = document.getElementById("dataAte").value || "";

  const dataDe = formatarDataBR(dataDeIso);
  const dataAte = formatarDataBR(dataAteIso);

  let html = `Período: ${dataDe} até ${dataAte}<br><br>`;
  let total = 0;

  salas.forEach((sala, idx) => {
    const bruto = parseCentavos(sala.bruto);
    const despesas = parseCentavos(sala.despesas);
    const cartao = parseCentavos(sala.cartao);
    const taxa = parseCentavos(sala.taxa);
    const res = calcularResultadoSala(sala);
    const { pipo, pass } = calcularPipoPass(res);
    total += res;

    const classeRes = res < 0 ? "vermelho" : res > 0 ? "verde" : "neutro";

    html += `<strong>Sala ${idx + 1} - ${(sala.nome || "SEM NOME").toUpperCase()}</strong><br>`;
    html += `Bruto: <span class="${bruto < 0 ? "vermelho" : "verde"}">${formatarMoeda(bruto)}</span><br>`;
    html += `Despesas: <span class="${despesas < 0 ? "verde" : "vermelho"}">${formatarMoeda(despesas)}</span><br>`;
    html += `Cartão: <span style="color:#2563eb;">${formatarMoeda(cartao)}</span><br>`;
    html += `Taxa parcelamento cartão: <span class="${taxa < 0 ? "verde" : "vermelho"}">${formatarMoeda(taxa)}</span><br>`;
    html += `Resultado: <span class="${classeRes}"><strong>${formatarMoeda(res)}</strong></span><br><br>`;
    html += `Pipo: <span class="${classeRes}"><strong>${formatarMoeda(pipo)}</strong></span> | `;
    html += `Pass: <span class="${classeRes}"><strong>${formatarMoeda(pass)}</strong></span><br>`;
    html += `----------------------------------------<br><br>`;
  });

  const classeTotal = total < 0 ? "vermelho" : total > 0 ? "verde" : "neutro";
  html += `<strong>TOTAL GERAL: <span class="${classeTotal}">${formatarMoeda(total)}</span></strong>`;

  rel.innerHTML = html;
  modal.classList.add("aberta");
}

function fecharModal() {
  document.getElementById("modalSalas").classList.remove("aberta");
}

function limparTudo() {
  if (!confirm("Deseja limpar todas as salas e datas?")) return;
  salas = [];
  document.getElementById("dataDe").value = "";
  document.getElementById("dataAte").value = "";
  renderizarSalas();
  salvarNoStorage();
}

/* ===== INIT ===== */

document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Cálculo de Salas", "operacao");

  carregarDoStorage();
  if (!salas.length) {
    salas.push({ nome: "", bruto: "", despesas: "", cartao: "", taxa: "" });
  }
  renderizarSalas();

  document.getElementById("dataDe").addEventListener("change", salvarNoStorage);
  document.getElementById("dataAte").addEventListener("change", salvarNoStorage);

  document.getElementById("btnAdicionar").addEventListener("click", () => {
    salas.push({ nome: "", bruto: "", despesas: "", cartao: "", taxa: "" });
    renderizarSalas();
    salvarNoStorage();
  });

  document.getElementById("btnRelatorio").addEventListener("click", () => {
    if (!salas.length) {
      if (window.toast) toast.warn("Adicione pelo menos uma sala.");
      return;
    }
    abrirModal();
  });

  document.getElementById("btnLimpar").addEventListener("click", limparTudo);
  document.getElementById("btnFecharModal").addEventListener("click", fecharModal);
  document.getElementById("modalSalas").addEventListener("click", (e) => {
    if (e.target.id === "modalSalas") fecharModal();
  });

  atualizarTotalGeral();
});
