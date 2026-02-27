// preFecho.js
// Script do Pré-Fecho com persistência em localStorage + OCR dos prints
// AGORA: também importa por TEXTO colado (formato do relatório/WhatsApp)

const STORAGE_KEY = "preFecho_dados_v1";
let contadorMaquinas = 0;

document.addEventListener("DOMContentLoaded", () => {
  const inputData = document.getElementById("data");
  const inputCliente = document.getElementById("cliente");
  const btnAdicionar = document.getElementById("btnAdicionar");
  const btnRelatorio = document.getElementById("btnRelatorio");
  const btnLimpar = document.getElementById("btnLimpar");
  const listaMaquinas = document.getElementById("listaMaquinas");
  const totalGeralEl = document.getElementById("totalGeral");
  const modal = document.getElementById("modalRelatorio");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const relatorioConteudo = document.getElementById("relatorioConteudo");

  const btnImportar = document.getElementById("btnImportar");
  const inputPrint = document.getElementById("inputPrintPre");

  // NOVO (texto)
  const btnImportarTexto = document.getElementById("btnImportarTexto");
  const textoFonte = document.getElementById("textoFonte");

  // Data atual (se não tiver nada salvo ainda)
  if (inputData && !inputData.value) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    inputData.value = `${dia}/${mes}/${ano}`;
  }

  // Eventos para salvar quando mudar data / cliente
  if (inputData) {
    inputData.addEventListener("input", salvarNoStorage);
    inputData.addEventListener("change", salvarNoStorage);
  }
  if (inputCliente) {
    inputCliente.addEventListener("input", () => {
      inputCliente.value = inputCliente.value.toUpperCase();
      salvarNoStorage();
    });
    inputCliente.addEventListener("change", salvarNoStorage);
  }

  // Botão adicionar máquina
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", () => {
      adicionarMaquina(listaMaquinas, totalGeralEl);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  // Botão relatório
  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", () => {
      abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal);
    });
  }

  // Botão limpar tudo
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      limparTudo(listaMaquinas, totalGeralEl);
      if (textoFonte) textoFonte.value = "";
    });
  }

  // NOVO: Importar TEXTO
  if (btnImportarTexto) {
    btnImportarTexto.addEventListener("click", () => {
      const txt = (textoFonte?.value || "").trim();
      if (!txt) {
        alert("Cole o texto primeiro 🙂");
        return;
      }
      importarTextoPre(txt, listaMaquinas, totalGeralEl, inputCliente);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  // Botão importar print (OCR)
  if (btnImportar && inputPrint) {
    btnImportar.addEventListener("click", () => inputPrint.click());
    inputPrint.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      await importarPrintPre(file, listaMaquinas, totalGeralEl, inputCliente);
      inputPrint.value = "";
    });
  }

  // Fechar modal
  if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
      modal.classList.remove("aberta");
    });
  }

  // Fechar modal clicando no fundo
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("aberta");
    });
  }

  // Carregar dados salvos (se existirem)
  carregarDoStorage(listaMaquinas, totalGeralEl);

  // Garante que a barra de ações fique logo após a lista de máquinas
  reposicionarBarraAcoes();
});

/* ===========================
   Barra de ações abaixo da última máquina
=========================== */
function reposicionarBarraAcoes() {
  const lista = document.getElementById("listaMaquinas");
  const acoes = document.getElementById("acoesBar");
  if (!lista || !acoes) return;

  const main = lista.parentElement;
  if (!main) return;

  const proximo = lista.nextSibling;
  if (proximo === acoes) return;

  main.insertBefore(acoes, lista.nextSibling);
}

/* ===========================
   Criação de Máquina
=========================== */
function adicionarMaquina(listaMaquinas, totalGeralEl, dadosMaquina = null) {
  contadorMaquinas++;

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="card-titulo">
      <span>Máquina ${contadorMaquinas}</span>
      <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
        <small>preencha os relógios e veja o resultado</small>
        <button type="button" class="btn-remover" title="Remover máquina"
                style="border:none;background:transparent;color:#999;cursor:pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <div class="linha">
      <label style="min-width:50px;">Selo:</label>
      <input type="text" class="inp-selo" placeholder="código da máquina">
    </div>

    <div class="linha">
      <label style="min-width:50px;">Jogo:</label>
      <input type="text" class="inp-jogo" placeholder="tipo de jogo">
    </div>

    <div class="grid">
      <div class="col">
        <h4>Entrada</h4>
        <div class="linha2">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="entrada-anterior" placeholder="Anterior">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="entrada-atual" placeholder="Atual">
        </div>
        <div class="dif">
          Diferença: <span class="dif-entrada">R$ 0,00</span>
        </div>
      </div>

      <div class="divv"></div>

      <div class="col">
        <h4>Saída</h4>
        <div class="linha2">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="saida-anterior" placeholder="Anterior">
          <input type="tel" inputmode="numeric" pattern="[0-9]*" class="saida-atual" placeholder="Atual">
        </div>
        <div class="dif">
          Diferença: <span class="dif-saida">R$ 0,00</span>
        </div>
      </div>
    </div>

    <div style="margin-top:8px;font-weight:700;">
      Resultado: <span class="resultado-maquina">R$ 0,00</span>
    </div>
  `;

  listaMaquinas.appendChild(card);

  const btnRemover = card.querySelector(".btn-remover");
  if (btnRemover) {
    btnRemover.addEventListener("click", () => {
      card.remove();
      atualizarTotalGeral(totalGeralEl);
      salvarNoStorage();
      reposicionarBarraAcoes();
    });
  }

  const seloInput = card.querySelector(".inp-selo");
  const jogoInput = card.querySelector(".inp-jogo");
  const entradaAnterior = card.querySelector(".entrada-anterior");
  const entradaAtual = card.querySelector(".entrada-atual");
  const saidaAnterior = card.querySelector(".saida-anterior");
  const saidaAtual = card.querySelector(".saida-atual");
  const spanDifEntrada = card.querySelector(".dif-entrada");
  const spanDifSaida = card.querySelector(".dif-saida");
  const spanResultado = card.querySelector(".resultado-maquina");

  const sanitizarNumero = (el) => {
    if (!el) return;
    const soDigitos = (el.value || "").replace(/\D/g, "");
    if (el.value !== soDigitos) el.value = soDigitos;
  };

  const atualizarCalculos = () => {
    // Garante que só tenha dígitos
    [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach(sanitizarNumero);

    const entAnt = parseNumero(entradaAnterior.value);
    const entAt  = parseNumero(entradaAtual.value);
    const saiAnt = parseNumero(saidaAnterior.value);
    const saiAt  = parseNumero(saidaAtual.value);

    // Diferenças brutas de relógio
    const difEntradaBruta = entAt - entAnt;
    const difSaidaBruta   = saiAt - saiAnt;

    // CONVERSÃO PARA REAIS (dois últimos dígitos = centavos)
    // Entrada sempre POSITIVA
    const entradaReais = Math.abs(difEntradaBruta) / 100;

    // Saída sempre NEGATIVA
    const saidaReais   = -Math.abs(difSaidaBruta) / 100;

    // Resultado final da máquina
    const resultado = entradaReais + saidaReais;

    // Diferenças exibidas em reais
    spanDifEntrada.textContent = formatarMoeda(entradaReais);
    spanDifSaida.textContent   = formatarMoeda(saidaReais);

    // Resultado em reais com cor
    spanResultado.textContent = formatarMoeda(resultado);
    aplicarCorValor(spanResultado, resultado);

    atualizarTotalGeral(totalGeralEl);
    salvarNoStorage();
  };

  [entradaAnterior, entradaAtual, saidaAnterior, saidaAtual].forEach((inp) => {
    inp.addEventListener("input", atualizarCalculos);
    inp.addEventListener("change", atualizarCalculos);
  });

  [seloInput, jogoInput].forEach((inp) => {
    if (!inp) return;
    inp.addEventListener("input", () => {
      inp.value = inp.value.toUpperCase();
      salvarNoStorage();
    });
    inp.addEventListener("change", salvarNoStorage);
  });

  // Se veio do storage ou importação, preenche com os valores salvos
  if (dadosMaquina) {
    if (seloInput)        seloInput.value        = (dadosMaquina.selo || "").toUpperCase();
    if (jogoInput)        jogoInput.value        = (dadosMaquina.jogo || "").toUpperCase();
    if (entradaAnterior)  entradaAnterior.value  = dadosMaquina.entradaAnterior || "";
    if (entradaAtual)     entradaAtual.value     = dadosMaquina.entradaAtual || "";
    if (saidaAnterior)    saidaAnterior.value    = dadosMaquina.saidaAnterior || "";
    if (saidaAtual)       saidaAtual.value       = dadosMaquina.saidaAtual || "";

    atualizarCalculos();
  }
}

/* ===========================
   TOTAL GERAL
=========================== */
function atualizarTotalGeral(totalGeralEl) {
  let total = 0;

  document.querySelectorAll(".resultado-maquina").forEach((span) => {
    const valor = moedaParaNumero(span.textContent);
    if (!isNaN(valor)) total += valor;
  });

  totalGeralEl.textContent = `TOTAL: ${formatarMoeda(total)}`;
  aplicarCorValor(totalGeralEl, total);
}

/* ===========================
   RELATÓRIO (MODAL) – COMPACTO
=========================== */
function abrirRelatorio(inputData, inputCliente, totalGeralEl, relatorioConteudo, modal) {
  const data = inputData?.value || "";
  const cliente = (inputCliente?.value || "").trim().toUpperCase();

  let html = "";

  html += `<div style="margin-bottom:4px;"><strong>DATA:</strong> ${escapeHtml(data)}</div>`;
  html += `<div style="margin-bottom:6px;"><strong>CLIENTE:</strong> ${escapeHtml(cliente || "-")}</div>`;
  html += `<hr style="margin:4px 0 6px;">`;

  const cards = document.querySelectorAll(".card");
  if (!cards.length) {
    html += `<div style="margin-top:4px;">Nenhuma máquina lançada.</div>`;
  } else {
    cards.forEach((card, idx) => {
      const seloRaw = (card.querySelector(".inp-selo")?.value || "").trim();
      const jogoRaw = (card.querySelector(".inp-jogo")?.value || "").trim();

      const selo = seloRaw.toUpperCase();
      const jogo = jogoRaw.toUpperCase();

      const difEntradaTxt = card.querySelector(".dif-entrada")?.textContent || "R$ 0,00";
      const difSaidaTxt   = card.querySelector(".dif-saida")?.textContent   || "R$ 0,00";
      const resultadoTxt  = card.querySelector(".resultado-maquina")?.textContent || "R$ 0,00";

      const clsEnt = classeValorMonetario(difEntradaTxt);
      const clsSai = classeValorMonetario(difSaidaTxt);
      const clsRes = classeValorMonetario(resultadoTxt);

      html += `
        <div class="bloco-maquina">
          <div><strong>MÁQUINA ${idx + 1}</strong></div>
          <div>SELO: ${escapeHtml(selo || "-")}</div>
          <div>JOGO: ${escapeHtml(jogo || "-")}</div>
          <div>Dif. ENTRADA: <span class="${clsEnt}">${escapeHtml(difEntradaTxt)}</span></div>
          <div>Dif. SAÍDA: <span class="${clsSai}">${escapeHtml(difSaidaTxt)}</span></div>
          <div>RESULTADO: <span class="${clsRes}">${escapeHtml(resultadoTxt)}</span></div>
        </div>
      `;
    });
  }

  const totalTexto = totalGeralEl.textContent.replace(/^TOTAL:\s*/i, "");
  const clsTotal = classeValorMonetario(totalTexto);

  html += `
    <hr style="margin:6px 0 4px;">
    <div style="font-weight:800; font-size:0.95rem; text-align:right;">
      TOTAL: <span class="${clsTotal}">${escapeHtml(totalTexto)}</span>
    </div>
  `;

  relatorioConteudo.innerHTML = html;
  modal.classList.add("aberta");
}

/* ===========================
   LIMPAR TUDO
=========================== */
function limparTudo(listaMaquinas, totalGeralEl) {
  // Zera campos principais
  const inputCliente = document.getElementById("cliente");
  if (inputCliente) inputCliente.value = "";

  const inputData = document.getElementById("data");
  if (inputData) {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    inputData.value = `${dia}/${mes}/${ano}`;
  }

  // Remove máquinas
  if (listaMaquinas) listaMaquinas.innerHTML = "";
  contadorMaquinas = 0;

  // Zera total
  if (totalGeralEl) {
    totalGeralEl.textContent = `TOTAL: ${formatarMoeda(0)}`;
    totalGeralEl.classList.remove("positivo", "negativo");
  }

  // Limpa storage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Erro ao limpar storage do pré-fecho:", e);
  }

  reposicionarBarraAcoes();
}

/* ===========================
   Persistência em localStorage
=========================== */
function obterEstado() {
  const data = document.getElementById("data")?.value || "";
  const cliente = document.getElementById("cliente")?.value || "";

  const maquinas = [];
  document.querySelectorAll(".card").forEach((card) => {
    maquinas.push({
      selo: card.querySelector(".inp-selo")?.value || "",
      jogo: card.querySelector(".inp-jogo")?.value || "",
      entradaAnterior: card.querySelector(".entrada-anterior")?.value || "",
      entradaAtual: card.querySelector(".entrada-atual")?.value || "",
      saidaAnterior: card.querySelector(".saida-anterior")?.value || "",
      saidaAtual: card.querySelector(".saida-atual")?.value || "",
    });
  });

  return { data, cliente, maquinas };
}

function salvarNoStorage() {
  try {
    const dados = obterEstado();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.error("Erro ao salvar pré-fecho no storage:", e);
  }
}

function carregarDoStorage(listaMaquinas, totalGeralEl) {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return;

    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return;

    const inputData = document.getElementById("data");
    const inputCliente = document.getElementById("cliente");

    if (inputData && dados.data) inputData.value = dados.data;
    if (inputCliente && dados.cliente) inputCliente.value = dados.cliente;

    listaMaquinas.innerHTML = "";
    contadorMaquinas = 0;

    if (Array.isArray(dados.maquinas)) {
      dados.maquinas.forEach((m) => adicionarMaquina(listaMaquinas, totalGeralEl, m));
    }

    atualizarTotalGeral(totalGeralEl);
    reposicionarBarraAcoes();
  } catch (e) {
    console.error("Erro ao carregar pré-fecho do storage:", e);
  }
}

/* ===========================
   IMPORTAR POR TEXTO (NOVO)
   Formato:
   *0008 | KAMALEON*
   038 - HALLOWEN 2018
   E    30609700   31171300___...
   S    19863586   20437476___...
=========================== */
function importarTextoPre(txt, listaMaquinas, totalGeralEl, inputCliente) {
  const texto = (txt || "").toString();

  // 1) Nome do ponto: pega entre "|" e "*" na primeira linha estrelada
  const nomePonto = extrairNomePonto(texto);
  if (nomePonto && inputCliente) {
    inputCliente.value = nomePonto.toUpperCase();
  }

  // 2) Extrair máquinas
  const maquinas = extrairMaquinasRelatorio(texto);

  if (!maquinas.length) {
    alert("Não consegui identificar nenhuma máquina nesse texto 😩\nConfere se tem linhas tipo: 038 - JOGO e depois E/S com 2 colunas.");
    return;
  }

  // 3) Substitui a lista atual por este texto (pra não misturar)
  listaMaquinas.innerHTML = "";
  contadorMaquinas = 0;

  maquinas.forEach((m) => {
    adicionarMaquina(listaMaquinas, totalGeralEl, {
      selo: m.selo,
      jogo: m.jogo,
      // Preenche ANTERIOR = 1ª coluna, ATUAL = 2ª coluna
      entradaAnterior: m.entradaAnterior,
      entradaAtual: m.entradaAtual,
      saidaAnterior: m.saidaAnterior,
      saidaAtual: m.saidaAtual,
    });
  });

  atualizarTotalGeral(totalGeralEl);
  salvarNoStorage();
  reposicionarBarraAcoes();

  try { window.toast?.success?.(`Importei ${maquinas.length} máquina(s) do texto!`); } catch(e){}
}

function extrairNomePonto(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n").map(l => l.trim()).filter(Boolean);

  // Ex: *0008 | KAMALEON*
  for (const l of linhas) {
    const m = l.match(/^\*[^|]*\|\s*(.+?)\s*\*$/);
    if (m && m[1]) return m[1].trim();
    // variação sem fechar com *
    const m2 = l.match(/^\*[^|]*\|\s*(.+?)\s*$/);
    if (m2 && m2[1]) return m2[1].replace(/\*+$/,"").trim();
  }

  // fallback: "Nome do ponto: ..."
  const m3 = texto.match(/NOME\s+DO\s+PONTO\s*:\s*(.+)$/im);
  if (m3 && m3[1]) return m3[1].trim();

  return "";
}

function extrairMaquinasRelatorio(texto) {
  const linhas = texto.replace(/\r/g, "\n").split("\n");

  const maquinas = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = (linhas[i] || "").trim();

    // Header máquina: "038 - HALLOWEN 2018"
    const h = linha.match(/^(\d{3})\s*-\s*(.+)$/);
    if (!h) { i++; continue; }

    const selo = (h[1] || "").trim().toUpperCase();
    const jogo = (h[2] || "").trim().toUpperCase();

    let entradaAnterior = "";
    let entradaAtual = "";
    let saidaAnterior = "";
    let saidaAtual = "";

    // Procura E e S nas próximas linhas (até achar outro header ou separador grande)
    let j = i + 1;
    for (; j < Math.min(i + 10, linhas.length); j++) {
      const l2 = (linhas[j] || "").trim();

      // Se achou outra máquina antes, para
      if (/^\d{3}\s*-\s*/.test(l2)) break;

      // Linha E: "E    30609700   31171300___..."
      const e = l2.match(/^E\s+(\d+)\s+(\d+)/i);
      if (e) {
        entradaAnterior = (e[1] || "").trim();
        entradaAtual = (e[2] || "").trim();
        continue;
      }

      // Linha S: "S    19863586   20437476___..."
      const s = l2.match(/^S\s+(\d+)\s+(\d+)/i);
      if (s) {
        saidaAnterior = (s[1] || "").trim();
        saidaAtual = (s[2] || "").trim();
        continue;
      }
    }

    // Só adiciona se tiver pelo menos um par E/S
    if (entradaAtual || saidaAtual || entradaAnterior || saidaAnterior) {
      maquinas.push({ selo, jogo, entradaAnterior, entradaAtual, saidaAnterior, saidaAtual });
    }

    i = j; // continua dali
  }

  return maquinas;
}

/* ===========================
   OCR – Importar print (mesma lógica do Retenção)
=========================== */
async function importarPrintPre(file, listaMaquinas, totalGeralEl, inputCliente) {
  if (!window.Tesseract) {
    alert("Biblioteca de OCR (Tesseract.js) não carregada.");
    return;
  }

  try { if (window.toast) toast.info("Lendo imagem, aguarde..."); } catch (e) {}

  let texto = "";
  try {
    const { data } = await Tesseract.recognize(file, "por+eng", {
      logger: (m) => console.log("[OCR Pré-Fecho]", m),
    });
    texto = (data && data.text) ? data.text : "";
  } catch (e) {
    console.error("Erro no OCR (Pré-Fecho):", e);
    limparToast();
    alert("Não foi possível ler a imagem.");
    return;
  }

  console.log("Texto OCR bruto (pré-fecho):\n", texto);

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // ===== Cliente =====
  const linhaCliente = linhas.find((l) => l.toUpperCase().startsWith("CLIENTE"));
  if (linhaCliente && inputCliente) {
    const idx = linhaCliente.indexOf(":");
    let nome = idx >= 0 ? linhaCliente.slice(idx + 1) : linhaCliente;
    nome = nome.trim();
    if (nome) inputCliente.value = nome.toUpperCase();
  }

  const maquinasEncontradas = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const linhaUpper = linha.toUpperCase();

    const cabecalhoMatch = linhaUpper.match(/\b\d+\s*[-–]\s*([A-Z0-9]{2}\d{3})\b/);
    if (!cabecalhoMatch) continue;

    let selo = cabecalhoMatch[1].toUpperCase();

    // Corrige OCR: "1E033" -> "IE033", "1B158" -> "IB158"
    if (selo[0] === "1") selo = "I" + selo.slice(1);

    let jogo = "";
    const firstPar = linha.indexOf("(");
    const lastPar = linha.lastIndexOf(")");
    if (firstPar >= 0 && lastPar > firstPar) {
      jogo = linha.slice(firstPar + 1, lastPar).trim().toUpperCase();
    }

    if (maquinasEncontradas.some((m) => m.selo === selo)) continue;

    let entradaAtualOCR = "";
    let saidaAtualOCR = "";

    for (let j = i + 1; j < Math.min(i + 8, linhas.length); j++) {
      const l2 = linhas[j];
      const l2Norm = l2.toUpperCase().replace(/\s+/g, "");

      const isLinhaE = l2Norm.includes("(E)") || l2Norm.startsWith("E)");
      const isLinhaS = l2Norm.includes("(S)") || l2Norm.startsWith("S)");

      if (!entradaAtualOCR && isLinhaE) {
        const m = l2.match(/[-–]\s*([\d.,]+)/);
        if (m) entradaAtualOCR = m[1].replace(/\D/g, "");
      }

      if (!saidaAtualOCR && isLinhaS) {
        const m2 = l2.match(/[-–]\s*([\d.,]+)/);
        if (m2) saidaAtualOCR = m2[1].replace(/\D/g, "");
      }

      if (entradaAtualOCR && saidaAtualOCR) break;
    }

    if (entradaAtualOCR || saidaAtualOCR) {
      maquinasEncontradas.push({
        selo,
        jogo,
        entrada: entradaAtualOCR,
        saida: saidaAtualOCR,
      });
    }
  }

  if (!maquinasEncontradas.length) {
    limparToast();
    alert(
      "Não consegui identificar máquinas no print.\n" +
      "Confere se o selo está no formato AA999 e se existem linhas com (E) e (S) usando hífen."
    );
    return;
  }

  // Limpa máquinas atuais e recria com base no OCR
  listaMaquinas.innerHTML = "";
  contadorMaquinas = 0;

  maquinasEncontradas.forEach((m) => {
    adicionarMaquina(listaMaquinas, totalGeralEl, {
      selo: m.selo,
      jogo: m.jogo,
      entradaAnterior: m.entrada || "",
      entradaAtual: "",
      saidaAnterior: m.saida || "",
      saidaAtual: "",
    });
  });

  atualizarTotalGeral(totalGeralEl);
  salvarNoStorage();
  reposicionarBarraAcoes();
  limparToast();
}

/* ===========================
   Helpers
=========================== */
function parseNumero(valor) {
  if (!valor) return 0;
  const limpo = valor.toString().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarMoeda(n) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moedaParaNumero(txt) {
  if (!txt) return 0;
  const limpo = txt.toString().replace(/[^0-9,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function aplicarCorValor(el, valor) {
  const LIMIAR = 0.005;
  el.classList.remove("positivo", "negativo");
  if (valor > LIMIAR) el.classList.add("positivo");
  else if (valor < -LIMIAR) el.classList.add("negativo");
}

function classeValorMonetario(txt) {
  const v = moedaParaNumero(txt);
  const LIMIAR = 0.005;
  if (v > LIMIAR) return "positivo";
  if (v < -LIMIAR) return "negativo";
  return "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
