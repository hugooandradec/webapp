// js/calculoRetencao.js
import { inicializarPagina } from "../../common/js/navegacao.js";

const STORAGE_KEY = "calculo_retencao_v1";
let retContador = 0;

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

// ===============================
//   IMPORTAR PRINT (OCR - TESTE)
// ===============================
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
      logger: m => console.log("[OCR]", m)
    });
    texto = (data && data.text) ? data.text : "";
  } catch (e) {
    console.error("Erro no OCR:", e);
    alert("Não foi possível ler a imagem.");
    return;
  }

  console.log("Texto OCR bruto (retencao):\n", texto);

  // tenta achar linhas do tipo: CODIGO 123456 654321
  const regexLinha = /([A-Z0-9]{2,8})\s+(\d{4,})\s+(\d{4,})/g;
  const maquinasEncontradas = [];
  let match;
  while ((match = regexLinha.exec(texto)) !== null) {
    maquinasEncontradas.push({
      selo: match[1].toUpperCase(),
      jogo: "",
      entrada: match[2],
      saida: match[3]
    });
  }

  if (!maquinasEncontradas.length) {
    alert("Não consegui identificar máquinas no print. Veja o console para o texto detectado e me manda o print pra ajustarmos o parser.");
    return;
  }

  // limpa lista atual e recria as máquinas
  lista.innerHTML = "";
  retContador = 0;
  maquinasEncontradas.forEach((m) => adicionarMaquina(lista, m));

  salvarRetencao();
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

    <div class="linha-nome">
      <label>Selo:</label>
      <input type="text" class="ret-selo" placeholder="CÓDIGO DA MÁQUINA">
    </div>

    <div class="linha-nome">
      <label>Jogo:</label>
      <input type="text" class="ret-jogo" placeholder="TIPO DE JOGO">
    </div>

    <div class="linha2">
      <div class="col">
        <label>Entrada</label>
        <input type="tel" inputmode="numeric" class="ret-entrada" placeholder="valor de entrada">
      </div>
      <div class="col">
        <label>Saída</label>
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

    textoResumo.textContent = `E: ${eStr} | S: ${sStr} | Ret: ${rStr}`;
    salvarRetencao();
    atualizarLinhaTotal();
  };

  [inputEntrada, inputSaida].forEach(inp => {
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
  lista.querySelectorAll(".card").forEach(card => {
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
      dados.maquinas.forEach(m => adicionarMaquina(lista, m));
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
//   TOTAL GERAL
// ===============================
function atualizarLinhaTotal() {
  const lista = document.getElementById("listaMaquinas");
  const linhaTotal = document.getElementById("linhaTotal");
  if (!lista || !linhaTotal) return;

  let soma = 0;
  let somaRet = 0;
  let contRet = 0;

  lista.querySelectorAll(".card").forEach(card => {
    const entrada = parseNumeroCentavos(card.querySelector(".ret-entrada")?.value);
    const saida = parseNumeroCentavos(card.querySelector(".ret-saida")?.value);
    let ret = 0;
    if (entrada > 0) {
      ret = ((entrada - saida) / entrada) * 100;
      soma += (entrada - saida);
      somaRet += ret;
      contRet++;
    }
  });

  const spanValor = linhaTotal.querySelector("span:nth-child(1)");
  const spans = linhaTotal.querySelectorAll("span");

  if (spans.length >= 2) {
    spans[0].textContent = formatarMoeda(soma);
    spans[1].textContent = contRet ? formatarPercentual(somaRet / contRet) : "0.00%";
  }

  linhaTotal.classList.remove("verde", "vermelho", "neutro");
  if (soma < 0) linhaTotal.classList.add("vermelho");
  else if (soma > 0) linhaTotal.classList.add("verde");
  else linhaTotal.classList.add("neutro");
}

// ===============================
//   RELATÓRIO
// ===============================
function criarRelatorioRetencao(lista, inputData, inputPonto) {
  const data = inputData?.value || "___/___/____";
  const ponto = inputPonto?.value || "-";

  let texto = "";
  texto += `DATA: ${data}\n`;
  texto += `PONTO: ${ponto || "-"}\n\n`;

  let total = 0;

  lista.querySelectorAll(".card").forEach((card, idx) => {
    const selo = card.querySelector(".ret-selo")?.value || "-";
    const jogo = card.querySelector(".ret-jogo")?.value || "-";
    const entradaNum = parseNumeroCentavos(card.querySelector(".ret-entrada")?.value);
    const saidaNum = parseNumeroCentavos(card.querySelector(".ret-saida")?.value);
    const diff = entradaNum - saidaNum;
    const ret = entradaNum > 0 ? ((entradaNum - saidaNum) / entradaNum) * 100 : 0;

    total += diff;

    texto += `MÁQUINA ${idx + 1}\n`;
    texto += `SELO: ${selo || "-"}\n`;
    texto += `JOGO: ${jogo || "-"}\n`;
    texto += `E: ${formatarMoeda(entradaNum)}\n`;
    texto += `S: ${formatarMoeda(saidaNum)}\n`;
    texto += `RET: ${formatarPercentual(ret)}\n`;
    texto += `RESULTADO: ${formatarMoeda(diff)}\n`;
    texto += `----------------------------------------\n\n`;
  });

  texto += `TOTAL: ${formatarMoeda(total)}\n`;

  return texto.replace(/\n/g, "<br>");
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
    btnLimpar.addEventListener("click", () => limparTudo(lista, inputData, inputPonto));
  }

  if (btnFecharModal && modal) {
    btnFecharModal.addEventListener("click", () => modal.classList.remove("aberta"));
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

  carregarRetencao(lista);
});
