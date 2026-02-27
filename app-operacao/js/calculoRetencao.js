// js/calculoRetencao.js
import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_retencao_v2"; // subi a versão pra não bater com o antigo
let retContador = 0;

// cores
const COR_ENTRADA = "#1b8f2e"; // verde
const COR_SAIDA = "#c0392b";   // vermelho
const COR_RETENCAO = "#4aa3ff"; // azul claro

// ===============================
//   HELPERS
// ===============================
function parseNumeroCentavos(v) {
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

function formatarPercentual(v) {
  return (Number(v) || 0).toFixed(2) + "%";
}

function dataHojeISO() {
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const yyyy = hoje.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatarDataBR(iso) {
  if (!iso) return "___/___/____";
  const partes = iso.split("-");
  if (partes.length !== 3) return iso;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function limparToast() {
  try {
    if (window.toast?.dismissAll) window.toast.dismissAll();
    else if (window.toast?.clearAll) window.toast.clearAll();
  } catch (e) {}
  try {
    document
      .querySelectorAll(".toast, .toast-container, [id*='toast']")
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));
  } catch (e) {}
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===============================
//   IMPORTAR TEXTO (RETENÇÃO)
//   Formato:
//   *0008 | KAMALEON*
//   038 - HALLOWEN 2018
//   E    30609700   31171300___...
//   S    19863586   20437476___...
//
//   Regra: usar SEMPRE a 2ª coluna (31171300 / 20437476)
// ===============================
function extrairNomePonto(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);

  // *0008 | KAMALEON*
  for (const l of linhas) {
    const m = l.match(/^\*[^|]*\|\s*(.+?)\s*\*$/);
    if (m && m[1]) return m[1].trim();

    const m2 = l.match(/^\*[^|]*\|\s*(.+?)\s*$/);
    if (m2 && m2[1]) return m2[1].replace(/\*+$/,"").trim();
  }

  // fallback
  const m3 = texto.match(/PONTO\s*:\s*(.+)$/im);
  if (m3 && m3[1]) return m3[1].trim();

  return "";
}

function extrairMaquinasTexto(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n");
  const maquinas = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = (linhas[i] || "").trim();

    // 038 - HALLOWEN 2018
    const h = linha.match(/^(\d{3})\s*-\s*(.+)$/);
    if (!h) { i++; continue; }

    const selo = (h[1] || "").trim().toUpperCase();
    const jogo = (h[2] || "").trim().toUpperCase();

    let entrada = "";
    let saida = "";

    let j = i + 1;
    for (; j < Math.min(i + 12, linhas.length); j++) {
      const l2 = (linhas[j] || "").trim();

      if (/^\d{3}\s*-\s*/.test(l2)) break; // próxima máquina

      // E    30609700   31171300___...
      const e = l2.match(/^E\s+(\d+)\s+(\d+)/i);
      if (e) {
        entrada = (e[2] || "").trim(); // 2ª coluna
        continue;
      }

      // S    19863586   20437476___...
      const s = l2.match(/^S\s+(\d+)\s+(\d+)/i);
      if (s) {
        saida = (s[2] || "").trim(); // 2ª coluna
        continue;
      }
    }

    if (entrada || saida) {
      maquinas.push({ selo, jogo, entrada, saida });
    }

    i = j;
  }

  return maquinas;
}

function importarTextoRet(txt, lista, inputPonto) {
  const texto = (txt || "").toString();

  const nomePonto = extrairNomePonto(texto);
  if (nomePonto && inputPonto) {
    inputPonto.value = nomePonto.toUpperCase();
  }

  const maquinas = extrairMaquinasTexto(texto);

  if (!maquinas.length) {
    limparToast();
    alert("Não consegui identificar máquinas nesse texto 😩\nConfere se tem linhas tipo: '038 - JOGO' + 'E ... ...' + 'S ... ...'.");
    return;
  }

  // substitui tudo
  lista.innerHTML = "";
  retContador = 0;

  maquinas.forEach((m) => adicionarMaquina(lista, m));

  salvarRetencao();
  atualizarLinhaTotal();
}

// ===============================
//   ADICIONAR MÁQUINA
// ===============================
function adicionarMaquina(lista, dadosIniciais = null) {
  retContador++;
  const idx = retContador;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${idx}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <small>digite E / S para ver a retenção</small>
        <button class="icone-remover" title="Remover máquina">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha-flex" style="display:flex;gap:16px;margin-bottom:10px;">
      <div class="col" style="flex:1;">
        <label>Selo:</label>
        <input type="text" class="ret-selo" placeholder="CÓDIGO DA MÁQUINA">
      </div>
      <div class="col" style="flex:1;">
        <label>Jogo:</label>
        <input type="text" class="ret-jogo" placeholder="TIPO DE JOGO">
      </div>
    </div>

    <div class="linha-flex" style="display:flex;gap:16px;margin-bottom:10px;">
      <div class="col" style="flex:1;">
        <label>E:</label>
        <input type="tel" inputmode="numeric" class="ret-entrada" placeholder="valor de entrada">
      </div>
      <div class="col" style="flex:1;">
        <label>S:</label>
        <input type="tel" inputmode="numeric" class="ret-saida" placeholder="valor de saída">
      </div>
    </div>

    <div class="resumo">
      <span class="texto-resumo">
        E: R$ 0,00 | S: R$ 0,00 | Ret: 0.00%
      </span>
    </div>
  `;

  const inputSelo = card.querySelector(".ret-selo");
  const inputJogo = card.querySelector(".ret-jogo");
  const inputEntrada = card.querySelector(".ret-entrada");
  const inputSaida = card.querySelector(".ret-saida");
  const btnRemover = card.querySelector(".icone-remover");
  const textoResumo = card.querySelector(".texto-resumo");

  if (dadosIniciais) {
    if (dadosIniciais.selo) inputSelo.value = String(dadosIniciais.selo).toUpperCase();
    if (dadosIniciais.jogo) inputJogo.value = String(dadosIniciais.jogo).toUpperCase();
    if (dadosIniciais.entrada) inputEntrada.value = String(dadosIniciais.entrada).replace(/\D/g, "");
    if (dadosIniciais.saida) inputSaida.value = String(dadosIniciais.saida).replace(/\D/g, "");
  }

  const atualizarResumo = () => {
    inputSelo.value = (inputSelo.value || "").toUpperCase();
    inputJogo.value = (inputJogo.value || "").toUpperCase();

    const entradaNum = parseNumeroCentavos(inputEntrada.value);
    const saidaNum = parseNumeroCentavos(inputSaida.value);

    let ret = 0;
    if (entradaNum > 0) {
      ret = ((entradaNum - saidaNum) / entradaNum) * 100;
    }

    const eStr = formatarMoeda(entradaNum);
    const sStr = formatarMoeda(saidaNum);
    const rStr = formatarPercentual(ret);

    textoResumo.innerHTML =
      `E: <span style="color:${COR_ENTRADA};">${eStr}</span>` +
      ` | S: <span style="color:${COR_SAIDA};">${sStr}</span>` +
      ` | Ret: <span style="color:${COR_RETENCAO};">${rStr}</span>`;

    salvarRetencao();
    atualizarLinhaTotal();
  };

  [inputEntrada, inputSaida].forEach((inp) => {
    inp.addEventListener("input", () => {
      inp.value = (inp.value || "").replace(/\D/g, "");
      atualizarResumo();
    });
    inp.addEventListener("change", atualizarResumo);
  });

  inputSelo.addEventListener("input", atualizarResumo);
  inputJogo.addEventListener("input", atualizarResumo);

  btnRemover.addEventListener("click", () => {
    if (!confirm("Remover esta máquina?")) return;
    card.remove();
    salvarRetencao();
    atualizarLinhaTotal();
  });

  lista.appendChild(card);
  atualizarResumo();
}

// ===============================
//   SALVAR / CARREGAR
// ===============================
function salvarRetencao() {
  const data = document.getElementById("data")?.value || "";
  const ponto = document.getElementById("ponto")?.value || "";
  const textoFonte = document.getElementById("textoFonte")?.value || "";
  const lista = document.getElementById("listaMaquinas");
  if (!lista) return;

  const maquinas = [];
  lista.querySelectorAll(".card").forEach((card) => {
    const selo = card.querySelector(".ret-selo")?.value || "";
    const jogo = card.querySelector(".ret-jogo")?.value || "";
    const entrada = card.querySelector(".ret-entrada")?.value || "";
    const saida = card.querySelector(".ret-saida")?.value || "";
    maquinas.push({ selo, jogo, entrada, saida });
  });

  const payload = { data, ponto, textoFonte, maquinas, contador: retContador };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function carregarRetencao(lista) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    adicionarMaquina(lista);
    return;
  }

  try {
    const dados = JSON.parse(raw);
    document.getElementById("data").value = dados.data || "";
    document.getElementById("ponto").value = (dados.ponto || "").toUpperCase();
    const tf = document.getElementById("textoFonte");
    if (tf && typeof dados.textoFonte === "string") tf.value = dados.textoFonte;

    retContador = 0;
    lista.innerHTML = "";

    if (Array.isArray(dados.maquinas) && dados.maquinas.length) {
      dados.maquinas.forEach((m) => adicionarMaquina(lista, m));
    } else {
      adicionarMaquina(lista);
    }
  } catch (e) {
    console.error("Erro ao carregar retenção:", e);
    lista.innerHTML = "";
    adicionarMaquina(lista);
  }

  atualizarLinhaTotal();
}

// ===============================
//   TOTAL GERAL (Ret. Média na tela)
// ===============================
function atualizarLinhaTotal() {
  const lista = document.getElementById("listaMaquinas");
  const linhaTotal = document.getElementById("linhaTotal");
  if (!lista || !linhaTotal) return;

  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach((card) => {
    const entrada = parseNumeroCentavos(card.querySelector(".ret-entrada")?.value);
    const saida = parseNumeroCentavos(card.querySelector(".ret-saida")?.value);

    if (entrada > 0) {
      const ret = ((entrada - saida) / entrada) * 100;
      somaRet += ret;
      contRet++;
    }
  });

  const span = linhaTotal.querySelector("span");
  if (span) {
    span.textContent = contRet ? formatarPercentual(somaRet / contRet) : "0.00%";
  }

  // título em preto e valor em azul
  linhaTotal.style.color = "#000";
  if (span) span.style.color = "#4aa3ff";
}

// ===============================
//   RELATÓRIO (modal)
// ===============================
function criarRelatorioRetencao(lista, inputData, inputPonto) {
  const dataISO = inputData?.value || "";
  const dataBR = formatarDataBR(dataISO);
  const ponto = inputPonto?.value || "-";

  const blocos = [];

  blocos.push(`DATA: ${escapeHtml(dataBR)}`);
  blocos.push(`PONTO: ${escapeHtml((ponto || "-").toUpperCase())}`);
  blocos.push("");

  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach((card, idx) => {
    const selo = (card.querySelector(".ret-selo")?.value || "-").toUpperCase();
    const jogo = (card.querySelector(".ret-jogo")?.value || "-").toUpperCase();
    const entradaNum = parseNumeroCentavos(card.querySelector(".ret-entrada")?.value);
    const saidaNum = parseNumeroCentavos(card.querySelector(".ret-saida")?.value);
    const ret = entradaNum > 0 ? ((entradaNum - saidaNum) / entradaNum) * 100 : 0;

    if (entradaNum > 0) {
      somaRet += ret;
      contRet++;
    }

    blocos.push(`MÁQUINA ${idx + 1}`);
    blocos.push(`SELO: ${escapeHtml(selo)}`);
    blocos.push(`JOGO: ${escapeHtml(jogo)}`);
    blocos.push(`E: <span class="valor-entrada">${escapeHtml(formatarMoeda(entradaNum))}</span>`);
    blocos.push(`S: <span class="valor-saida">${escapeHtml(formatarMoeda(saidaNum))}</span>`);
    blocos.push(`RET: <span class="valor-retencao">${escapeHtml(formatarPercentual(ret))}</span>`);
    blocos.push("----------------------------------------");
    blocos.push("");
  });

  const retMedia = contRet ? somaRet / contRet : 0;
  blocos.push(`Ret. Média: <span class="valor-ret-media">${escapeHtml(formatarPercentual(retMedia))}</span>`);

  return blocos.join("<br>");
}

// ===============================
//   LIMPAR TUDO
// ===============================
function limparTudo(lista, inputData, inputPonto) {
  if (!confirm("Deseja limpar todas as máquinas e dados?")) return;
  retContador = 0;
  lista.innerHTML = "";
  if (inputData) inputData.value = "";
  if (inputPonto) inputPonto.value = "";
  const tf = document.getElementById("textoFonte");
  if (tf) tf.value = "";
  adicionarMaquina(lista);
  salvarRetencao();
  atualizarLinhaTotal();
}

// ===============================
//   INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Cálculo de Retenção", "operacao");

  const btnAdd = document.getElementById("btnAdicionar");
  const btnRel = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const btnImportarTexto = document.getElementById("btnImportarTexto");
  const textoFonte = document.getElementById("textoFonte");

  // botões de baixo
  const btnAdd2 = document.getElementById("btnAdicionar2");
  const btnRel2 = document.getElementById("btnRelatorio2");
  const btnLimpar2 = document.getElementById("btnLimpar2");

  const lista = document.getElementById("listaMaquinas");

  const modal = document.getElementById("modalRet");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relConteudo = document.getElementById("relConteudo");

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  btnAdd?.addEventListener("click", () => {
    adicionarMaquina(lista);
    salvarRetencao();
  });

  btnImportarTexto?.addEventListener("click", () => {
    const txt = (textoFonte?.value || "").trim();
    if (!txt) return alert("Cole o fechamento primeiro 🙂");
    importarTextoRet(txt, lista, inputPonto);
  });

  btnRel?.addEventListener("click", () => {
    if (!lista.children.length) {
      if (window.toast) toast.warn("Adicione pelo menos uma máquina.");
      return;
    }
    const rel = criarRelatorioRetencao(lista, inputData, inputPonto);
    relConteudo.innerHTML = rel;
    modal.classList.add("aberta");
  });

  btnLimpar?.addEventListener("click", () => limparTudo(lista, inputData, inputPonto));

  // botões de baixo chamam os de cima
  btnAdd2?.addEventListener("click", () => btnAdd?.click());
  btnRel2?.addEventListener("click", () => btnRel?.click());
  btnLimpar2?.addEventListener("click", () => btnLimpar?.click());

  // modal
  btnFecharModal?.addEventListener("click", () => modal.classList.remove("aberta"));
  modal?.addEventListener("click", (e) => {
    if (e.target.id === "modalRet") modal.classList.remove("aberta");
  });

  if (inputData) inputData.addEventListener("change", salvarRetencao);

  if (inputPonto) {
    inputPonto.addEventListener("input", () => {
      inputPonto.value = inputPonto.value.toUpperCase();
      salvarRetencao();
    });
  }

  carregarRetencao(lista);

  if (inputData && !inputData.value) {
    inputData.value = dataHojeISO();
    salvarRetencao();
  }
});