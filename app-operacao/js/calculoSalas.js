// js/calculoSalas.js
import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_salas_v1";
let salas = [];

/* ==== HELPERS DE MOEDA / DATA ==== */

function parseCentavos(v) {
  if (!v) return 0;
  const limpo = v.toString().replace(/\D/g, "");
  if (!limpo) return 0;
  return Number(limpo) / 100;
}

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function formatarInputMonetario(input) {
  let v = (input.value || "").toString().replace(/\D/g, "");
  if (!v) {
    input.value = "";
    return;
  }
  const num = Number(v) / 100;
  input.value = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarDataBR(iso) {
  if (!iso) return "___/___/____";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return "___/___/____";
  return `${dia}/${mes}/${ano}`;
}

/* ==== CÁLCULO =====
   valor1 = (bruto/2) + 10% da metade - despesas
   valor2 = 6% do cartão
   resultado = valor1 - valor2 - taxaParcelamento
*/
function calcularResultadoSala(sala) {
  const bruto = parseCentavos(sala.bruto);
  const despesas = parseCentavos(sala.despesas);
  const cartao = parseCentavos(sala.cartao);
  const taxaParc = parseCentavos(sala.taxaParcelamento);

  if (!bruto && !despesas && !cartao && !taxaParc) return 0;

  const metade = bruto / 2;
  const com10 = metade * 1.1;
  const valor1 = com10 - despesas;
  const valor2 = cartao * 0.06;

  return valor1 - valor2 - taxaParc;
}

/* ==== STORAGE ==== */

function salvarNoStorage() {
  const dataDe = document.getElementById("dataDe").value || "";
  const dataAte = document.getElementById("dataAte").value || "";
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ dataDe, dataAte, salas })
  );
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

/* ==== TOTAL GERAL ==== */

function atualizarTotalGeral() {
  const elTotal = document.getElementById("totalGeral");
  let total = 0;
  salas.forEach((s) => {
    total += calcularResultadoSala(s);
  });

  elTotal.textContent = "";
  elTotal.className = "total-geral";

  if (!salas.length) return;

  elTotal.textContent = "TOTAL GERAL: " + formatarMoeda(total);

  if (total < 0) {
    elTotal.classList.add("vermelho");
  } else if (total > 0) {
    elTotal.classList.add("verde");
  } else {
    elTotal.classList.add("neutro");
  }
}

/* ==== UI: CRIAR CARD ==== */

function criarCardSala(sala, index) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Sala ${index + 1}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <small>preencha os valores e veja o resultado</small>
        <button class="icone-remover" title="Remover sala" type="button">
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
        <input type="tel" inputmode="numeric" class="sala-bruto" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Despesas (-R$)</label>
        <input type="tel" inputmode="numeric" class="sala-despesas" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Cartão (R$)</label>
        <input type="tel" inputmode="numeric" class="sala-cartao" placeholder="0,00">
      </div>
      <div class="col-sala">
        <label>Taxa parcelamento (-R$)</label>
        <input type="tel" inputmode="numeric" class="sala-taxa-parc" placeholder="0,00">
      </div>
    </div>

    <div class="resultado">
      Resultado: <span class="valor">R$ 0,00</span> <span class="status">(Neutro)</span>
    </div>
  `;

  const nomeInput = card.querySelector(".sala-nome");
  const brutoInput = card.querySelector(".sala-bruto");
  const despesasInput = card.querySelector(".sala-despesas");
  const cartaoInput = card.querySelector(".sala-cartao");
  const taxaParcInput = card.querySelector(".sala-taxa-parc");
  const btnRemover = card.querySelector(".icone-remover");
  const valorSpan = card.querySelector(".resultado .valor");
  const statusSpan = card.querySelector(".resultado .status");
  const resultadoDiv = card.querySelector(".resultado");

  // popular se veio do storage
  if (sala.nome) nomeInput.value = sala.nome;
  if (sala.bruto) {
    brutoInput.value = sala.bruto;
    formatarInputMonetario(brutoInput);
  }
  if (sala.despesas) {
    despesasInput.value = sala.despesas;
    formatarInputMonetario(despesasInput);
  }
  if (sala.cartao) {
    cartaoInput.value = sala.cartao;
    formatarInputMonetario(cartaoInput);
  }
  if (sala.taxaParcelamento) {
    taxaParcInput.value = sala.taxaParcelamento;
    formatarInputMonetario(taxaParcInput);
  }

  const atualizarResultado = () => {
    salas[index].nome = (nomeInput.value || "").toUpperCase();

    [brutoInput, despesasInput, cartaoInput, taxaParcInput].forEach(inp => {
      formatarInputMonetario(inp);
    });

    salas[index].bruto = brutoInput.value || "";
    salas[index].despesas = despesasInput.value || "";
    salas[index].cartao = cartaoInput.value || "";
    salas[index].taxaParcelamento = taxaParcInput.value || "";

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

    atualizarTotalGeral();
    salvarNoStorage();
  };

  nomeInput.addEventListener("input", () => {
    nomeInput.value = nomeInput.value.toUpperCase();
    atualizarResultado();
  });

  [brutoInput, despesasInput, cartaoInput, taxaParcInput].forEach((inp) => {
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

/* ==== MODAL / RELATÓRIO ==== */

function abrirModal() {
  const modal = document.getElementById("modalSalas");
  const rel = document.getElementById("relConteudo");
  const dataDeIso = document.getElementById("dataDe").value;
  const dataAteIso = document.getElementById("dataAte").value;

  const dataDe = formatarDataBR(dataDeIso);
  const dataAte = formatarDataBR(dataAteIso);

  let html = `Período: ${dataDe} até ${dataAte}<br><br>`;
  let total = 0;

  salas.forEach((sala, idx) => {
    const bruto = parseCentavos(sala.bruto);
    const despesas = parseCentavos(sala.despesas);
    const cartao = parseCentavos(sala.cartao);
    const taxaParc = parseCentavos(sala.taxaParcelamento);
    const res = calcularResultadoSala(sala);
    total += res;

    const classeRes = res < 0 ? "vermelho" : res > 0 ? "verde" : "neutro";

    // Pipo / Pass (2/3 e 1/3 do resultado)
    const terco = res / 3;
    const pipo = terco * 2;
    const pass = terco;

    const classePipo = pipo < 0 ? "vermelho" : pipo > 0 ? "verde" : "neutro";
    const classePass = pass < 0 ? "vermelho" : pass > 0 ? "verde" : "neutro";

    html += `<strong>Sala ${idx + 1} - ${(sala.nome || "SEM NOME").toUpperCase()}</strong><br>`;
    html += `Bruto: <span class="verde">${formatarMoeda(bruto)}</span><br>`;
    html += `Despesas: <span class="vermelho">-${formatarMoeda(despesas)}</span><br>`;
    html += `Cartão: <span class="azul">${formatarMoeda(cartao)}</span><br>`;
    html += `Taxa parcelamento: <span class="vermelho">-${formatarMoeda(taxaParc)}</span><br>`;
    html += `Resultado: <strong><span class="${classeRes}">${formatarMoeda(res)}</span></strong><br><br>`;
    html += `<strong>Pipo: <span class="${classePipo}">${formatarMoeda(pipo)}</span> | ` +
            `Pass: <span class="${classePass}">${formatarMoeda(pass)}</span></strong><br>`;
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

/* ==== INIT ==== */

document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Cálculo de Salas", "operacao");

  carregarDoStorage();
  if (!salas.length) {
    salas.push({
      nome: "",
      bruto: "",
      despesas: "",
      cartao: "",
      taxaParcelamento: ""
    });
  }
  renderizarSalas();

  document.getElementById("dataDe").addEventListener("change", salvarNoStorage);
  document.getElementById("dataAte").addEventListener("change", salvarNoStorage);

  document.getElementById("btnAdicionar").addEventListener("click", () => {
    salas.push({
      nome: "",
      bruto: "",
      despesas: "",
      cartao: "",
      taxaParcelamento: ""
    });
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
