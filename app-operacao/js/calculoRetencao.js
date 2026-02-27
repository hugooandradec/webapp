// js/calculoRetencao.js
import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_retencao_v2";
let retContador = 0;

// cores
const COR_ENTRADA = "#1b8f2e"; // verde
const COR_SAIDA = "#c0392b";   // vermelho
const COR_RETENCAO = "#4aa3ff"; // azul claro

// ===============================
// HELPERS
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

function normalizarEspacos(s) {
  return (s || "").replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim();
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

// ===============================
// MOSTRAR/ESCONDER Ret. Média + Botões de baixo
// ===============================
function atualizarAcoesELinhaTotal() {
  const lista = document.getElementById("listaMaquinas");
  const acoesBottom = document.getElementById("acoesBottom");
  const linhaTotal = document.getElementById("linhaTotal");

  const temMaquina = !!(lista && lista.children && lista.children.length > 0);

  if (acoesBottom) acoesBottom.classList.toggle("oculta", !temMaquina);
  if (linhaTotal) linhaTotal.classList.toggle("oculta", !temMaquina);
}

// ===============================
// IMPORTAR POR TEXTO (mesmo padrão do pré-fecho)
// Pega:
// - Ponto: primeira linha "*0008 | KAMALEON*"
// - Máquinas: "038 - JOGO" + linhas E e S com 2 números
// - Para retenção usamos a 2ª coluna (ATUAL) como valor da máquina
// ===============================
function extrairPontoDoTexto(texto) {
  const linhas = (texto || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const first = linhas[0] || "";
  // "*0008 | KAMALEON*" -> KAMALEON
  const m = first.match(/\|\s*([^|*]+)\s*\*/);
  if (m && m[1]) return m[1].trim().toUpperCase();
  // fallback: tenta entre "| |"
  const m2 = first.match(/\|\s*([^|]+)\s*\|/);
  if (m2 && m2[1]) return m2[1].trim().toUpperCase();
  return "";
}

function extrairMaquinasDoTexto(texto) {
  const linhas = (texto || "")
    .split(/\r?\n/)
    .map(l => normalizarEspacos(l))
    .filter(Boolean);

  const maquinas = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // "038 - HALLOWEN 2018"
    const cab = l.match(/^(\d{3})\s*-\s*(.+)$/);
    if (!cab) continue;

    const selo = cab[1];
    const jogo = (cab[2] || "").trim().toUpperCase();

    let entradaAtual = "";
    let saidaAtual = "";

    // procura as próximas linhas E e S
    for (let j = i + 1; j < Math.min(i + 6, linhas.length); j++) {
      const lx = linhas[j];

      // "E    30609700   31171300___5.616,00"
      // pega os 2 primeiros grupos grandes de números
      if (!entradaAtual && /^E\b/i.test(lx)) {
        const nums = lx.replace(/_/g, " ").match(/(\d{4,})/g) || [];
        if (nums.length >= 2) entradaAtual = nums[1]; // 2ª coluna
      }

      if (!saidaAtual && /^S\b/i.test(lx)) {
        const nums = lx.replace(/_/g, " ").match(/(\d{4,})/g) || [];
        if (nums.length >= 2) saidaAtual = nums[1]; // 2ª coluna
      }

      if (entradaAtual && saidaAtual) break;
    }

    // evita duplicados
    if (maquinas.some(m => m.selo === selo)) continue;

    // só adiciona se achou algo
    if (entradaAtual || saidaAtual) {
      maquinas.push({
        selo,
        jogo,
        entrada: (entradaAtual || "").replace(/\D/g, ""),
        saida: (saidaAtual || "").replace(/\D/g, "")
      });
    }
  }

  return maquinas;
}

function importarTextoRetencao() {
  const ta = document.getElementById("textoFonte");
  const lista = document.getElementById("listaMaquinas");
  if (!ta || !lista) return;

  const texto = ta.value || "";
  if (!texto.trim()) {
    if (window.toast) toast.warn("Cole o texto do fechamento primeiro.");
    return;
  }

  // ponto
  const ponto = extrairPontoDoTexto(texto);
  const inputPonto = document.getElementById("ponto");
  if (inputPonto && ponto) inputPonto.value = ponto.toUpperCase();

  // máquinas
  const maquinas = extrairMaquinasDoTexto(texto);
  if (!maquinas.length) {
    alert("Não consegui identificar máquinas no texto.\nConfere se está no formato:\n038 - JOGO\nE ... ...\nS ... ...");
    return;
  }

  lista.innerHTML = "";
  retContador = 0;

  maquinas.forEach(m => adicionarMaquina(lista, m));

  salvarRetencao();
  atualizarLinhaTotal();
  atualizarAcoesELinhaTotal();

  if (window.toast) toast.success(`Importado: ${maquinas.length} máquina(s).`);
}

// ===============================
// ADICIONAR MÁQUINA
// ===============================
function adicionarMaquina(lista, dadosIniciais = null) {
  retContador++;
  const idx = retContador;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${idx}</span>
      <div style="display:flex;align-items:center;gap:10px;">
        <small>digite E / S para ver a retenção</small>
        <button class="icone-remover" title="Remover máquina" type="button">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha-flex">
      <div class="col">
        <label>Selo:</label>
        <input type="text" class="ret-selo" placeholder="CÓDIGO DA MÁQUINA">
      </div>
      <div class="col">
        <label>Jogo:</label>
        <input type="text" class="ret-jogo" placeholder="TIPO DE JOGO">
      </div>
    </div>

    <div class="linha-flex">
      <div class="col">
        <label>E:</label>
        <input type="tel" inputmode="numeric" class="ret-entrada" placeholder="valor de entrada">
      </div>
      <div class="col">
        <label>S:</label>
        <input type="tel" inputmode="numeric" class="ret-saida" placeholder="valor de saída">
      </div>
    </div>

    <div class="resumo">
      <span class="texto-resumo">E: R$ 0,00 | S: R$ 0,00 | Ret: 0.00%</span>
    </div>
  `;

  const inputSelo = card.querySelector(".ret-selo");
  const inputJogo = card.querySelector(".ret-jogo");
  const inputEntrada = card.querySelector(".ret-entrada");
  const inputSaida = card.querySelector(".ret-saida");
  const btnRemover = card.querySelector(".icone-remover");
  const textoResumo = card.querySelector(".texto-resumo");

  if (dadosIniciais) {
    if (dadosIniciais.selo) inputSelo.value = dadosIniciais.selo;
    if (dadosIniciais.jogo) inputJogo.value = dadosIniciais.jogo;
    if (dadosIniciais.entrada) inputEntrada.value = dadosIniciais.entrada;
    if (dadosIniciais.saida) inputSaida.value = dadosIniciais.saida;
  }

  const atualizarResumo = () => {
    inputSelo.value = (inputSelo.value || "").toUpperCase();
    inputJogo.value = (inputJogo.value || "").toUpperCase();

    const entradaNum = parseNumeroCentavos(inputEntrada.value);
    const saidaNum = parseNumeroCentavos(inputSaida.value);

    let ret = 0;
    if (entradaNum > 0) ret = ((entradaNum - saidaNum) / entradaNum) * 100;

    const eStr = formatarMoeda(entradaNum);
    const sStr = formatarMoeda(saidaNum);
    const rStr = formatarPercentual(ret);

    textoResumo.innerHTML =
      `E: <span style="color:${COR_ENTRADA};">${eStr}</span>` +
      ` | S: <span style="color:${COR_SAIDA};">${sStr}</span>` +
      ` | Ret: <span style="color:${COR_RETENCAO};">${rStr}</span>`;

    salvarRetencao();
    atualizarLinhaTotal();
    atualizarAcoesELinhaTotal();
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
    atualizarAcoesELinhaTotal();
  });

  lista.appendChild(card);
  atualizarResumo();
}

// ===============================
// SALVAR / CARREGAR
// ===============================
function salvarRetencao() {
  const data = document.getElementById("data")?.value || "";
  const ponto = document.getElementById("ponto")?.value || "";
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

  const payload = { data, ponto, maquinas, contador: retContador };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function carregarRetencao(lista) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // ✅ não cria máquina automática
    retContador = 0;
    lista.innerHTML = "";
    atualizarLinhaTotal();
    atualizarAcoesELinhaTotal();
    return;
  }

  try {
    const dados = JSON.parse(raw);
    document.getElementById("data").value = dados.data || "";
    document.getElementById("ponto").value = dados.ponto || "";

    retContador = 0;
    lista.innerHTML = "";

    if (Array.isArray(dados.maquinas) && dados.maquinas.length) {
      dados.maquinas.forEach((m) => adicionarMaquina(lista, m));
    }
  } catch (e) {
    console.error("Erro ao carregar retenção:", e);
    retContador = 0;
    lista.innerHTML = "";
  }

  atualizarLinhaTotal();
  atualizarAcoesELinhaTotal();
}

// ===============================
// TOTAL GERAL (Ret. Média)
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
    span.style.color = COR_RETENCAO;
  }

  linhaTotal.style.color = "#000";
}

// ===============================
// RELATÓRIO (modal)
// ===============================
function criarRelatorioRetencao(lista, inputData, inputPonto) {
  const dataISO = inputData?.value || "";
  const dataBR = formatarDataBR(dataISO);
  const ponto = inputPonto?.value || "-";

  const blocos = [];
  blocos.push(`DATA: ${dataBR}`);
  blocos.push(`PONTO: ${ponto || "-"}`);
  blocos.push("");

  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach((card, idx) => {
    const selo = (card.querySelector(".ret-selo")?.value || "-").toUpperCase();
    const jogo = (card.querySelector(".ret-jogo")?.value || "-").toUpperCase();
    const entradaNum = parseNumeroCentavos(card.querySelector(".ret-entrada")?.value);
    const saidaNum = parseNumeroCentavos(card.querySelector(".ret-saida")?.value);

    const ret = entradaNum > 0 ? ((entradaNum - saidaNum) / entradaNum) * 100 : 0;

    if (entradaNum > 0) { somaRet += ret; contRet++; }

    blocos.push(`MÁQUINA ${idx + 1}`);
    blocos.push(`SELO: ${selo}`);
    blocos.push(`JOGO: ${jogo}`);
    blocos.push(`E: ${formatarMoeda(entradaNum)}`);
    blocos.push(`S: ${formatarMoeda(saidaNum)}`);
    blocos.push(`RET: ${formatarPercentual(ret)}`);
    blocos.push("----------------------------------------");
    blocos.push("");
  });

  const retMedia = contRet ? somaRet / contRet : 0;
  blocos.push(`Ret. Média: ${formatarPercentual(retMedia)}`);

  // pinta no HTML depois
  return blocos.join("\n");
}

function relatorioParaHTML(texto) {
  // pinta linhas E/S/RET/Ret. Média
  const linhas = (texto || "").split("\n");
  return linhas.map(l => {
    if (l.startsWith("E: ")) return `E: <span class="valor-entrada">${l.slice(3)}</span>`;
    if (l.startsWith("S: ")) return `S: <span class="valor-saida">${l.slice(3)}</span>`;
    if (l.startsWith("RET: ")) return `RET: <span class="valor-retencao">${l.slice(5)}</span>`;
    if (l.startsWith("Ret. Média: ")) return `Ret. Média: <span class="valor-ret-media">${l.slice(11)}</span>`;
    return l;
  }).join("<br>");
}

// ===============================
// LIMPAR
// ===============================
function limparTudo(lista, inputData, inputPonto) {
  if (!confirm("Deseja limpar todas as máquinas e dados?")) return;
  retContador = 0;
  lista.innerHTML = "";
  if (inputPonto) inputPonto.value = "";
  // data continua (igual pré-fecho: sempre hoje)
  salvarRetencao();
  atualizarLinhaTotal();
  atualizarAcoesELinhaTotal();
}

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Cálculo de Retenção", "operacao");

  const btnAdd = document.getElementById("btnAdicionar");
  const btnAdd2 = document.getElementById("btnAdicionar2");
  const btnRel = document.getElementById("btnRelatorio");
  const btnRel2 = document.getElementById("btnRelatorio2");
  const btnLimpar = document.getElementById("btnLimpar");
  const btnLimpar2 = document.getElementById("btnLimpar2");
  const btnImportarTexto = document.getElementById("btnImportarTexto");

  const lista = document.getElementById("listaMaquinas");

  const modal = document.getElementById("modalRet");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relConteudo = document.getElementById("relConteudo");

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  // data automática (mas ainda editável se quiser)
  if (inputData && !inputData.value) inputData.value = dataHojeISO();

  // eventos topo
  const onAdd = () => { adicionarMaquina(lista); salvarRetencao(); atualizarLinhaTotal(); atualizarAcoesELinhaTotal(); };
  const onRel = () => {
    if (!lista.children.length) {
      if (window.toast) toast.warn("Adicione pelo menos uma máquina.");
      return;
    }
    const relTxt = criarRelatorioRetencao(lista, inputData, inputPonto);
    relConteudo.innerHTML = relatorioParaHTML(relTxt);
    modal.classList.add("aberta");
  };
  const onLimpar = () => limparTudo(lista, inputData, inputPonto);

  if (btnAdd) btnAdd.addEventListener("click", onAdd);
  if (btnAdd2) btnAdd2.addEventListener("click", onAdd);

  if (btnRel) btnRel.addEventListener("click", onRel);
  if (btnRel2) btnRel2.addEventListener("click", onRel);

  if (btnLimpar) btnLimpar.addEventListener("click", onLimpar);
  if (btnLimpar2) btnLimpar2.addEventListener("click", onLimpar);

  if (btnFecharModal && modal) {
    btnFecharModal.addEventListener("click", () => modal.classList.remove("aberta"));
    modal.addEventListener("click", (e) => { if (e.target.id === "modalRet") modal.classList.remove("aberta"); });
  }

  if (btnImportarTexto) btnImportarTexto.addEventListener("click", importarTextoRetencao);

  if (inputData) inputData.addEventListener("change", salvarRetencao);

  if (inputPonto) {
    inputPonto.addEventListener("input", () => {
      inputPonto.value = inputPonto.value.toUpperCase();
      salvarRetencao();
    });
  }

  carregarRetencao(lista);

  // garante que Ret. Média e botões respeitem o estado inicial
  atualizarLinhaTotal();
  atualizarAcoesELinhaTotal();
});