// js/calculoRetencao.js
import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_retencao_v1";
let retContador = 0;

// cores para resumo
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

function formatarReais(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

// limpa qualquer toast visível, independente da lib
function limparToast() {
  try {
    if (window.toast?.dismissAll) window.toast.dismissAll();
    else if (window.toast?.clearAll) window.toast.clearAll();
    else if (window.toast?.clear) window.toast.clear();
  } catch (e) {}
  // plano B: remove elementos visuais de toast da tela
  try {
    document
      .querySelectorAll(".toast, .toast-container, [id*='toast']")
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));
  } catch (e) {}
}

// ===============================
//   IMPORTAR PRINT (OCR - RETENÇÃO)
// ===============================
//
// Regras específicas do teu print:
// - Linha de cabeçalho da máquina: "1-1E033 (Seven America)", "2-1B158 (HL)" etc.
//   → número da máquina + "-" + selo
// - OCR costuma ler "IE033" como "1E033", "IB158" como "1B158"
// - Em (E) e (S), pegamos SEMPRE o número após o hífen (valor ATUAL)
// - Cliente: linha que começa com "Cliente:" -> nome do ponto
//
async function importarPrintRet(file, lista) {
  if (!window.Tesseract) {
    alert("Biblioteca de OCR (Tesseract.js) não carregada.");
    return;
  }

  try {
    if (window.toast) toast.info("Lendo imagem, aguarde...");
  } catch (e) {}

  let texto = "";
  try {
    const { data } = await Tesseract.recognize(file, "por+eng", {
      logger: (m) => console.log("[OCR]", m)
    });
    texto = (data && data.text) ? data.text : "";
  } catch (e) {
    console.error("Erro no OCR:", e);
    limparToast();
    alert("Não foi possível ler a imagem.");
    return;
  }

  console.log("Texto OCR bruto (retencao):\n", texto);

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  console.log("Linhas OCR normalizadas:", linhas);

  // =====================
  // Cliente -> ponto (nome maiúsculo)
  // =====================
  const linhaCliente = linhas.find((l) =>
    l.toUpperCase().startsWith("CLIENTE")
  );
  if (linhaCliente) {
    const idx = linhaCliente.indexOf(":");
    let nome = idx >= 0 ? linhaCliente.slice(idx + 1) : linhaCliente;
    nome = nome.trim();
    if (nome) {
      const inputPonto = document.getElementById("ponto");
      if (inputPonto) {
        inputPonto.value = nome.toUpperCase();
      }
    }
  }

  const maquinasEncontradas = [];

  // =====================
  // Máquinas (ex.: "1-1E033 (...)", "2-1B158 (...)")
  // =====================
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaUpper = linha.toUpperCase();

    // Procura padrão: número da máquina + hífen + selo (2 chars + 3 dígitos)
    // Ex.: "1-1E033", "2-1B158"
    const cabecalhoMatch = linhaUpper.match(
      /\b\d+\s*[-–]\s*([A-Z0-9]{2}\d{3})\b/
    );
    if (!cabecalhoMatch) continue;

    let selo = cabecalhoMatch[1].toUpperCase();

    // Corrige erro típico do OCR: "1E033" -> "IE033", "1B158" -> "IB158"
    if (selo[0] === "1") {
      selo = "I" + selo.slice(1);
    }

    // Captura o jogo entre o primeiro "(" e o último ")"
    let jogo = "";
    const firstPar = linha.indexOf("(");
    const lastPar = linha.lastIndexOf(")");
    if (firstPar >= 0 && lastPar > firstPar) {
      jogo = linha.slice(firstPar + 1, lastPar).trim().toUpperCase();
    }

    // Evita repetir mesma máquina caso OCR duplique
    if (maquinasEncontradas.some((m) => m.selo === selo)) {
      continue;
    }

    let entradaAtual = "";
    let saidaAtual = "";

    // procura (E) e (S) nas linhas seguintes (até umas 8 linhas depois)
    for (let j = i + 1; j < Math.min(i + 8, linhas.length); j++) {
      const l2 = linhas[j];
      const l2Norm = l2.toUpperCase().replace(/\s+/g, "");

      const isLinhaE = l2Norm.includes("(E)") || l2Norm.startsWith("E)");
      const isLinhaS = l2Norm.includes("(S)") || l2Norm.startsWith("S)");

      if (!entradaAtual && isLinhaE) {
        // pega o número que vem DEPOIS do hífen -> valor ATUAL
        const m = l2.match(/[-–]\s*([\d.,]+)/);
        if (m) entradaAtual = m[1].replace(/\D/g, "");
      }

      if (!saidaAtual && isLinhaS) {
        const m2 = l2.match(/[-–]\s*([\d.,]+)/);
        if (m2) saidaAtual = m2[1].replace(/\D/g, "");
      }

      if (entradaAtual && saidaAtual) break;
    }

    if (entradaAtual || saidaAtual) {
      maquinasEncontradas.push({
        selo,
        jogo,
        entrada: entradaAtual,
        saida: saidaAtual
      });
    }
  }

  console.log("Máquinas encontradas no OCR:", maquinasEncontradas);

  if (!maquinasEncontradas.length) {
    limparToast();
    alert(
      "Não consegui identificar máquinas no print.\n" +
        "Confere se o selo está no formato AA999 e se existem linhas com (E) e (S) usando hífen."
    );
    return;
  }

  // limpa lista atual e recria as máquinas
  lista.innerHTML = "";
  retContador = 0;
  maquinasEncontradas.forEach((m) => adicionarMaquina(lista, m));

  salvarRetencao();
  limparToast();
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
    if (entradaNum > 0) {
      ret = ((entradaNum - saidaNum) / entradaNum) * 100;
    }

    const eStr = formatarMoeda(entradaNum);
    const sStr = formatarMoeda(saidaNum);
    const rStr = formatarPercentual(ret);

    // Entrada em verde, Saída em vermelho, Retenção em azul claro
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
    adicionarMaquina(lista);
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
//   TOTAL GERAL (linha inferior da tela)
// ===============================
//
// Aqui usamos só a retenção média (único <span> dentro da #linhaTotal).
//
function atualizarLinhaTotal() {
  const lista = document.getElementById("listaMaquinas");
  const linhaTotal = document.getElementById("linhaTotal");
  if (!lista || !linhaTotal) return;

  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach((card) => {
    const entrada = parseNumeroCentavos(
      card.querySelector(".ret-entrada")?.value
    );
    const saida = parseNumeroCentavos(
      card.querySelector(".ret-saida")?.value
    );

    if (entrada > 0) {
      const ret = ((entrada - saida) / entrada) * 100;
      somaRet += ret;
      contRet++;
    }
  });

  const span = linhaTotal.querySelector("span");
if (span) {
  span.textContent = contRet
    ? formatarPercentual(somaRet / contRet)
    : "0.00%";
}

// Ret. Média sempre com título preto e valor azul
linhaTotal.style.color = "#000"; // preto

if (span) {
  span.style.color = "#4aa3ff"; // azul claro
}



// ===============================
//   RELATÓRIO
// ===============================
//
// - Data em formato BR
// - Entrada em verde, Saída em vermelho, Retenção em azul claro
// - Sem RESULTADO por máquina
// - Final com "Ret. Média: XX,XX%"
// 
function criarRelatorioRetencao(lista, inputData, inputPonto) {
  const dataISO = inputData?.value || "";
  const dataBR = formatarDataBR(dataISO);
  const ponto = inputPonto?.value || "-";

  const linhas = [];

  linhas.push(`DATA: ${dataBR}`);
  linhas.push(`PONTO: ${ponto || "-"}`);
  linhas.push(""); // linha em branco

  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach((card, idx) => {
    const selo = card.querySelector(".ret-selo")?.value || "-";
    const jogo = card.querySelector(".ret-jogo")?.value || "-";
    const entradaNum = parseNumeroCentavos(
      card.querySelector(".ret-entrada")?.value
    );
    const saidaNum = parseNumeroCentavos(
      card.querySelector(".ret-saida")?.value
    );
    const ret =
      entradaNum > 0
        ? ((entradaNum - saidaNum) / entradaNum) * 100
        : 0;

    if (entradaNum > 0) {
      somaRet += ret;
      contRet++;
    }

    linhas.push(`MÁQUINA ${idx + 1}`);
    linhas.push(`SELO: ${selo || "-"}`);
    linhas.push(`JOGO: ${jogo || "-"}`);
    linhas.push(
      `E: <span class="valor-entrada">${formatarMoeda(entradaNum)}</span>`
    );
    linhas.push(
      `S: <span class="valor-saida">${formatarMoeda(saidaNum)}</span>`
    );
    linhas.push(
      `RET: <span class="valor-retencao">${formatarPercentual(ret)}</span>`
    );
    linhas.push("----------------------------------------");
    linhas.push("");
  });

  const retMedia = contRet ? somaRet / contRet : 0;
  linhas.push(
    `Ret. Média: <span class="valor-ret-media">${formatarPercentual(
      retMedia
    )}</span>`
  );

  return linhas.join("<br>");
}

// ===============================
//   LIMPAR
// ===============================
function limparTudo(lista, inputData, inputPonto) {
  if (!confirm("Deseja limpar todas as máquinas e dados?")) return;
  retContador = 0;
  lista.innerHTML = "";
  if (inputData) inputData.value = "";
  if (inputPonto) inputPonto.value = "";
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
  const btnImportar = document.getElementById("btnImportar");
  const inputPrint = document.getElementById("inputPrintRet");
  const lista = document.getElementById("listaMaquinas");

  const modal = document.getElementById("modalRet");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relConteudo = document.getElementById("relConteudo");

  const inputData = document.getElementById("data");
  const inputPonto = document.getElementById("ponto");

  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      adicionarMaquina(lista);
      salvarRetencao();
    });
  }

  if (btnRel && modal && relConteudo) {
    btnRel.addEventListener("click", () => {
      if (!lista.children.length) {
        if (window.toast) toast.warn("Adicione pelo menos uma máquina.");
        return;
      }
      const rel = criarRelatorioRetencao(lista, inputData, inputPonto);
      relConteudo.innerHTML = rel;
      modal.classList.add("aberta");
    });
  }

  if (btnLimpar) {
    btnLimpar.addEventListener("click", () =>
      limparTudo(lista, inputData, inputPonto)
    );
  }

  if (btnFecharModal && modal) {
    btnFecharModal.addEventListener("click", () =>
      modal.classList.remove("aberta")
    );
    modal.addEventListener("click", (e) => {
      if (e.target.id === "modalRet") modal.classList.remove("aberta");
    });
  }

  // importar print (OCR)
  if (btnImportar && inputPrint) {
    btnImportar.addEventListener("click", () => inputPrint.click());
    inputPrint.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await importarPrintRet(file, lista);
      inputPrint.value = "";
    });
  }

  if (inputData) {
    inputData.addEventListener("change", salvarRetencao);
  }

  if (inputPonto) {
    inputPonto.addEventListener("input", () => {
      inputPonto.value = inputPonto.value.toUpperCase();
      salvarRetencao();
    });
  }

  // carrega do storage
  carregarRetencao(lista);

  // se a data estiver vazia, preenche com a data de hoje
  if (inputData && !inputData.value) {
    inputData.value = dataHojeISO();
    salvarRetencao();
  }
});
