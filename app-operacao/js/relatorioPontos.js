// js/relatorioPontos.js
import { inicializarPagina } from "../../common/js/navegacao.js";

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  // mesma lógica das outras telas do app Operação
  inicializarPagina("Relatório de Pontos", "operacao");

  carregarPontosNosSelects();

  document.getElementById("btnProcessarPrint").onclick = processarPrint;
  document.getElementById("btnAprovar").onclick = aprovarFechamento;
  document.getElementById("btnDescartar").onclick = descartarExtracao;

  document.getElementById("btnGerarSemanal").onclick = gerarRelatorioSemanal;
  document.getElementById("btnGerarConsolidado").onclick =
    gerarRelatorioConsolidado;

  const btnRemover = document.getElementById("btnRemoverFechamento");
  if (btnRemover) btnRemover.onclick = removerFechamentoSelecionado;

  document.getElementById("fecharModal").onclick = fecharModal;

  const selPontoSem = document.getElementById("selectPontoSemanal");
  if (selPontoSem) selPontoSem.addEventListener("change", carregarSemanas);

  const modalRel = document.getElementById("modalRelatorio");
  if (modalRel) {
    modalRel.addEventListener("click", (e) => {
      if (e.target.id === "modalRelatorio") fecharModal();
    });
  }

  // restaura extração em andamento (caso a página tenha sido recarregada)
  restaurarExtracaoAtual();
});

/* ===== HELPERS GERAIS ===== */

function parseMoedaBR(str) {
  if (!str) return 0;
  const limpo = str
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function formatarMoedaBR(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function formatarPercent(valor) {
  return (Number(valor) || 0).toFixed(2) + "%";
}

function gerarSlugPonto(nome) {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function formatarDataISO(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarDataBRCurta(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// calcula segunda e domingo da semana do fechamento (segunda–domingo)
function calcularPeriodoSemana(dataFechamento) {
  const diaSemana = dataFechamento.getDay(); // 0 = dom, 1 = seg...
  const diffSegunda = (diaSemana + 6) % 7; // distância até segunda
  const dtInicio = new Date(dataFechamento);
  dtInicio.setDate(dtInicio.getDate() - diffSegunda);
  const dtFim = new Date(dtInicio);
  dtFim.setDate(dtInicio.getDate() + 6);
  return {
    inicio: formatarDataISO(dtInicio),
    fim: formatarDataISO(dtFim)
  };
}

/* Helper para limpar toasts, igual outras telas */
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

/*
  Normaliza selo para o padrão:
  - SEMPRE 2 letras + 3 números (LLNNN)
  - Corrige casos de OCR como:
      "1E033" -> "IE033"
      "1B158" -> "IB158"
*/
function normalizarSelo(seloBruto) {
  let txt = (seloBruto || "").toUpperCase().trim();

  // caso típico: OCR lê "1E033" ou "1B158" (1 no lugar de I)
  const bugI = txt.match(/^1([A-Z]\d{3})$/);
  if (bugI) {
    return "I" + bugI[1]; // IE033, IB158...
  }

  // limpa qualquer coisa que não seja letra ou número
  txt = txt.replace(/[^A-Z0-9]/g, "");

  // se já estiver certinho (LLNNN), mantém
  const padraoOk = txt.match(/^([A-Z]{2}\d{3})$/);
  if (padraoOk) {
    return padraoOk[1];
  }

  // fallback: se vier só 1 letra + 3 números, assume que falta um 'I' no início
  const umLetraTresNum = txt.match(/^([A-Z]\d{3})$/);
  if (umLetraTresNum) {
    return "I" + umLetraTresNum[1];
  }

  // último recurso: devolve o texto como veio (pra debug)
  return txt;
}

/* ===== STORAGE ===== */
const KEY = "relatorioPontos_registros";
const KEY_EXTRACAO_ATUAL = "relatorioPontos_extracaoAtual";

function getRegistros() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

function salvarRegistros(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

function salvarExtracaoAtual() {
  if (extracaoAtual) {
    localStorage.setItem(KEY_EXTRACAO_ATUAL, JSON.stringify(extracaoAtual));
  } else {
    localStorage.removeItem(KEY_EXTRACAO_ATUAL);
  }
}

function restaurarExtracaoAtual() {
  try {
    const salvo = localStorage.getItem(KEY_EXTRACAO_ATUAL);
    if (!salvo) return;
    const obj = JSON.parse(salvo);
    if (obj && obj.maquinas && obj.maquinas.length) {
      extracaoAtual = obj;
      mostrarExtracaoNaTela(extracaoAtual);
    }
  } catch (e) {
    console.error("Erro ao restaurar extração atual:", e);
  }
}

/* ===== DUPLICIDADE DE FECHAMENTO ===== */

function gerarAssinaturaMaquinas(listaMaquinas) {
  const arr = (listaMaquinas || []).map((m) => ({
    selo: (m.selo || "").toUpperCase(),
    entrada: Number(m.entrada) || 0,
    saida: Number(m.saida) || 0
  }));

  arr.sort((a, b) => {
    if (a.selo < b.selo) return -1;
    if (a.selo > b.selo) return 1;
    if (a.entrada !== b.entrada) return a.entrada - b.entrada;
    return a.saida - b.saida;
  });

  return arr.map((m) => `${m.selo}|${m.entrada}|${m.saida}`).join(";");
}

function ehFechamentoDuplicado(novo, registros) {
  const assinaturaNovo = gerarAssinaturaMaquinas(novo.maquinas);

  return registros.some((r) => {
    if (!r || !r.maquinas) return false;
    if (r.pontoChave !== novo.pontoChave) return false;

    // mesma semana (segunda–domingo)
    if (r.periodo && novo.periodo) {
      if (
        r.periodo.inicio !== novo.periodo.inicio ||
        r.periodo.fim !== novo.periodo.fim
      ) {
        return false;
      }
    }

    const assinaturaExistente = gerarAssinaturaMaquinas(r.maquinas);
    return assinaturaExistente === assinaturaNovo;
  });
}

/* ===== 1. PROCESSAR PRINT ===== */
let extracaoAtual = null;

async function processarPrint() {
  const file = document.getElementById("inputPrint").files[0];
  if (!file) {
    alert("Escolha um print primeiro.");
    return;
  }

  const texto = await extrairTextoOCR(file);

  console.log("=== OCR RELATÓRIO DE PONTOS (BRUTO) ===");
  console.log(texto);

  // Se o OCR devolveu literalmente nada ou quase nada
  if (!texto || texto.trim().length < 10) {
    alert("O OCR não conseguiu ler o print (texto vazio ou muito curto).");
    const preview = document.getElementById("previewExtracao");
    const dados = document.getElementById("dadosExtraidos");
    if (preview && dados) {
      preview.style.display = "block";
      dados.innerText = "[OCR não retornou texto útil]\n\n" + (texto || "");
    }
    return;
  }

  extracaoAtual = extrairRelatorioDoOcr(texto);

  // Se não achou nenhuma máquina, vamos mostrar o texto cru pra debug
  if (!extracaoAtual || !extracaoAtual.maquinas?.length) {
    alert(
      "Não consegui identificar as máquinas automaticamente.\n" +
        "Vou mostrar o texto cru do OCR na tela. Copia isso pra mim depois, por favor."
    );

    const preview = document.getElementById("previewExtracao");
    const dados = document.getElementById("dadosExtraidos");
    if (preview && dados) {
      preview.style.display = "block";
      dados.innerText = texto;
    }
    extracaoAtual = null;
    salvarExtracaoAtual();
    return;
  }

  // Se deu certo, segue o fluxo normal
  salvarExtracaoAtual();
  mostrarExtracaoNaTela(extracaoAtual);
}

// OCR LOCAL — igual Retenção / Pré-Fecho (Tesseract no navegador)
async function extrairTextoOCR(file) {
  if (!window.Tesseract) {
    alert("Biblioteca de OCR (Tesseract.js) não carregada.");
    return "";
  }

  try {
    if (window.toast) toast.info("Lendo imagem, aguarde...");
  } catch (e) {}

  let texto = "";
  try {
    const { data } = await Tesseract.recognize(file, "por+eng", {
      logger: (m) => console.log("[OCR Relatório de Pontos]", m)
    });
    texto = data && data.text ? data.text : "";
  } catch (err) {
    console.error("Erro no OCR (Relatório de Pontos):", err);
    alert("Não foi possível ler a imagem.");
    texto = "";
  }

  limparToast();
  return texto;
}

/* ===== 2. EXTRAIR DADOS DO TEXTO ===== */
function extrairRelatorioDoOcr(texto) {
  texto = (texto || "").replace(/\r/g, "");
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ===== Cliente / Ponto =====
  let pontoNome = "PONTO DESCONHECIDO";
  const linhaCliente = linhas.find((l) =>
    l.toLowerCase().startsWith("cliente")
  );
  if (linhaCliente) {
    const partes = linhaCliente.split(":");
    if (partes[1]) {
      pontoNome = partes[1].trim();
    }
  }
  const pontoExibicao = pontoNome.toUpperCase();
  const pontoChave = gerarSlugPonto(pontoExibicao);

  // ===== Data do fechamento =====
  let dataFechamentoISO = null;
  let dataFechamentoDate = new Date();
  const linhaData = linhas.find((l) => l.toLowerCase().startsWith("data"));
  if (linhaData) {
    const m = linhaData.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      let [_, d, mo, y] = m;
      let anoNum = parseInt(y, 10);
      if (anoNum < 100) anoNum += 2000; // 25 -> 2025
      const dt = new Date(anoNum, parseInt(mo, 10) - 1, parseInt(d, 10));
      if (!isNaN(dt.getTime())) {
        dataFechamentoDate = dt;
        dataFechamentoISO = formatarDataISO(dt);
      }
    }
  }
  if (!dataFechamentoISO) {
    dataFechamentoISO = formatarDataISO(dataFechamentoDate);
  }

  // ===== Período da semana (segunda a domingo) =====
  const periodo = calcularPeriodoSemana(dataFechamentoDate);

  // ===== Máquinas =====
  const maquinas = [];
  let atual = null;

  linhas.forEach((l) => {
    // Cabeçalho da máquina:
    // "1-1E033 (Seven (America))"  -> num=1, seloBruto="1E033"
    // "2-1B158 (HL)"              -> num=2, seloBruto="1B158"
    // "IE033 (Seven America)"     -> sem número
    const cabComNumero = l.match(/^(\d+)\s*-\s*([A-Za-z0-9]+)\s*\((.+)\)/);
    const cabSemNumero = !cabComNumero
      ? l.match(/^([A-Za-z0-9]+)\s*\((.+)\)/)
      : null;

    if (cabComNumero || cabSemNumero) {
      if (atual) maquinas.push(atual);

      let numero = "";
      let seloBruto = "";
      let jogoBruto = "";

      if (cabComNumero) {
        numero = cabComNumero[1]; // "1", "2", ...
        seloBruto = cabComNumero[2]; // "1E033", "1B158"...
        jogoBruto = cabComNumero[3];
      } else {
        seloBruto = cabSemNumero[1];
        jogoBruto = cabSemNumero[2];
      }

      const selo = normalizarSelo(seloBruto);
      const jogo = (jogoBruto || "").trim().toUpperCase();

      atual = {
        numero: numero || null,
        selo,
        jogo,
        entrada: 0,
        saida: 0,
        sobra: 0
      };
      return;
    }

    if (!atual) return;

    // Linha de Entrada: "(E) xxxx - yyyy = R$ 1.503,00"
    if (l.toUpperCase().startsWith("(E)")) {
      const m = l.match(/R\$\s*([\d\.,]+)/i);
      if (m) atual.entrada = parseMoedaBR(m[1]);
      return;
    }

    // Linha de Saída: "(S) xxxx - yyyy = R$ 1.318,85"
    if (l.toUpperCase().startsWith("(S)")) {
      const m = l.match(/R\$\s*([\d\.,]+)/i);
      if (m) atual.saida = parseMoedaBR(m[1]);
      return;
    }

    // Linha de (Total) a gente ignora agora; a sobra é calculada manualmente.
  });

  if (atual) maquinas.push(atual);

  // ===== Totais do ponto =====
  let totalEntrada = 0;
  let totalSaida = 0;
  let totalSobra = 0;

  maquinas.forEach((m) => {
    // sobra sempre calculada como entrada - saída
    m.sobra = (m.entrada || 0) - (m.saida || 0);

    totalEntrada += m.entrada;
    totalSaida += m.saida;
    totalSobra += m.sobra;
  });

  return {
    pontoChave,
    pontoExibicao,
    periodo, // { inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }
    dataFechamento: dataFechamentoISO,
    maquinas,
    totais: {
      entrada: totalEntrada,
      saida: totalSaida,
      sobra: totalSobra
    }
  };
}

/* ===== 3. MOSTRAR PRÉ-VISUALIZAÇÃO ===== */
function mostrarExtracaoNaTela(data) {
  if (!data) return;

  const preview = document.getElementById("previewExtracao");
  if (preview) preview.style.display = "block";

  const htmlMaquinas = data.maquinas
    .map((m) => {
      const prefixo =
        m.numero != null && m.numero !== "" ? `${m.numero} - ` : "";
      return `
        <div style="margin-bottom:10px;">
          <b>${prefixo}${m.selo}</b> — ${m.jogo}<br>
          Entrada: ${formatarMoedaBR(m.entrada)} |
          Saída: ${formatarMoedaBR(m.saida)} |
          Sobra: <b>${formatarMoedaBR(m.sobra)}</b>
        </div>
      `;
    })
    .join("");

  const periodoTexto = `${formatarDataBR(
    data.periodo.inicio
  )} até ${formatarDataBR(data.periodo.fim)}`;

  document.getElementById("dadosExtraidos").innerHTML = `
    <strong>Ponto:</strong> ${data.pontoExibicao}<br>
    <strong>Data do fechamento:</strong> ${formatarDataBR(
      data.dataFechamento
    )}<br>
    <strong>Período da semana:</strong> ${periodoTexto}<br><br>

    <strong>Totais do ponto:</strong><br>
    Entrada: ${formatarMoedaBR(data.totais.entrada)}<br>
    Saída: ${formatarMoedaBR(data.totais.saida)}<br>
    Sobra: <b>${formatarMoedaBR(data.totais.sobra)}</b><br><br>

    <strong>Máquinas:</strong><br>
    ${htmlMaquinas}
  `;
}

/* ===== 4. APROVAR FECHAMENTO ===== */
function aprovarFechamento() {
  if (!extracaoAtual) return;

  const registros = getRegistros();

  if (ehFechamentoDuplicado(extracaoAtual, registros)) {
    alert(
      "Este fechamento já parece ter sido importado para esta semana.\n" +
        "Não será salvo novamente."
    );
    return;
  }

  registros.push({
    ...extracaoAtual,
    id: Date.now(),
    aprovado: true,
    criadoEm: new Date().toISOString()
  });

  salvarRegistros(registros);

  alert("Fechamento salvo com sucesso!");

  extracaoAtual = null;
  salvarExtracaoAtual();
  document.getElementById("previewExtracao").style.display = "none";

  carregarPontosNosSelects();
}

/* DESCARTAR */
function descartarExtracao() {
  extracaoAtual = null;
  salvarExtracaoAtual();
  document.getElementById("previewExtracao").style.display = "none";
}

/* ===== 5. CARREGAR SELECTS ===== */
function carregarPontosNosSelects() {
  const registros = getRegistros();
  const pontos = [...new Set(registros.map((r) => r.pontoChave))];

  const selects = ["selectPontoSemanal", "selectPontoConsolidado"];
  selects.forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = `<option value="">Selecione</option>`;
    pontos.forEach((p) => {
      const item = registros.find((r) => r.pontoChave === p);
      select.innerHTML += `<option value="${p}">${item.pontoExibicao}</option>`;
    });
  });

  carregarSemanas();
}

function carregarSemanas() {
  const ponto = document.getElementById("selectPontoSemanal").value;
  const selectSemana = document.getElementById("selectSemana");

  if (!ponto) {
    selectSemana.innerHTML = "<option value=''>Selecione</option>";
    return;
  }

  const registros = getRegistros().filter((r) => r.pontoChave === ponto);

  selectSemana.innerHTML = "";
  registros.forEach((r) => {
    const periodo = `${formatarDataBR(r.periodo.inicio)} até ${formatarDataBR(
      r.periodo.fim
    )}`;
    selectSemana.innerHTML += `<option value="${r.id}">${periodo}</option>`;
  });
}

/* ===== 6. RELATÓRIO SEMANAL ===== */
function gerarRelatorioSemanal() {
  const id = Number(document.getElementById("selectSemana").value);
  const registro = getRegistros().find((r) => r.id === id);
  if (!registro) {
    alert("Selecione uma semana para gerar o relatório.");
    return;
  }

  const html = montarHtmlRelatorio(registro, "Relatório Semanal");

  abrirModal(html);
}

/* ===== 7. RELATÓRIO CONSOLIDADO ===== */
function gerarRelatorioConsolidado() {
  const ponto = document.getElementById("selectPontoConsolidado").value;

  // lê de um input number (novo). Se não existir, cai no select antigo.
  let qtd = 0;
  const inputQtd = document.getElementById("inputQtdSemanas");
  if (inputQtd) {
    qtd = Number(inputQtd.value);
  } else {
    const selQtd = document.getElementById("selectQtdSemanas");
    qtd = selQtd ? Number(selQtd.value) : 0;
  }

  if (!ponto) {
    alert("Selecione um ponto primeiro.");
    return;
  }

  if (!qtd || qtd <= 0) {
    alert("Informe uma quantidade de semanas válida (mínimo 1).");
    return;
  }

  const todosRegistros = getRegistros()
    .filter((r) => r.pontoChave === ponto)
    .sort((a, b) => new Date(b.periodo.fim) - new Date(a.periodo.fim));

  if (todosRegistros.length === 0) {
    alert("Ainda não há fechamentos salvos para esse ponto.");
    return;
  }

  let qtdUsada = qtd;

  if (qtd > todosRegistros.length) {
    const disponiveis = todosRegistros.length;
    const ok = confirm(
      `Você pediu ${qtd} semana(s), mas só existem ${disponiveis} semana(s) cadastradas para este ponto.\n\n` +
        `Deseja gerar o relatório assim mesmo, usando apenas ${disponiveis} semana(s)?`
    );
    if (!ok) return;
    qtdUsada = disponiveis;
  }

  const registros = todosRegistros.slice(0, qtdUsada);

  const relatorio = consolidarRegistros(registros);

  const html = montarHtmlRelatorio(
    relatorio,
    `Consolidado (${qtdUsada} semana${qtdUsada > 1 ? "s" : ""})`
  );

  abrirModal(html);
}

/* CONSOLIDADO: SOMA TUDO */
function consolidarRegistros(lista) {
  let totalEntrada = 0;
  let totalSaida = 0;
  let totalSobra = 0;

  const maquinas = {};

  lista.forEach((r) => {
    totalEntrada += r.totais.entrada;
    totalSaida += r.totais.saida;
    totalSobra += r.totais.sobra;

    r.maquinas.forEach((m) => {
      if (!maquinas[m.selo]) {
        maquinas[m.selo] = {
          selo: m.selo,
          entrada: 0,
          saida: 0,
          sobra: 0
        };
      }
      maquinas[m.selo].entrada += m.entrada;
      maquinas[m.selo].saida += m.saida;
      maquinas[m.selo].sobra += m.sobra;
    });
  });

  return {
    pontoExibicao: lista[0].pontoExibicao,
    maquinas: Object.values(maquinas),
    totais: { entrada: totalEntrada, saida: totalSaida, sobra: totalSobra }
  };
}

/* ===== 8. HTML DO MODAL ===== */
function montarHtmlRelatorio(r, titulo) {
  if (!r) return "";

  const periodoHtml =
    r.periodo && r.periodo.inicio && r.periodo.fim
      ? `<div class="rel-periodo">${formatarDataBRCurta(
          r.periodo.inicio
        )} - ${formatarDataBRCurta(r.periodo.fim)}</div>`
      : "";

  const htmlMaquinas = (r.maquinas || [])
    .map((m) => {
      const prefixo =
        m.numero != null && m.numero !== "" ? `${m.numero} - ` : "";
      const jogo = m.jogo ? ` - ${m.jogo}` : "";
      return `
        <div class="linha-maquina">
          <b>${prefixo}${m.selo}${jogo}</b><br>
          Entrada: <span class="valor-entrada">${formatarMoedaBR(
            m.entrada
          )}</span> |
          Saída: <span class="valor-saida">${formatarMoedaBR(
            m.saida
          )}</span> |
          Sobra: <span class="valor-sobra">${formatarMoedaBR(
            m.sobra
          )}</span>
        </div>
      `;
    })
    .join("");

  let resumoHtml = "";

  // Indicadores só fazem sentido no relatório semanal (tem período)
  if (r.periodo && r.maquinas && r.maquinas.length) {
    const totalEntrada = r.totais?.entrada || 0;
    const totalSaida = r.totais?.saida || 0;
    const totalSobra = r.totais?.sobra || 0;

    const maquinas = r.maquinas;

    const maisEntrada = maquinas.reduce(
      (acc, m) =>
        acc == null || (m.entrada || 0) > (acc.entrada || 0) ? m : acc,
      null
    );
    const menosEntrada = maquinas.reduce(
      (acc, m) =>
        acc == null || (m.entrada || 0) < (acc.entrada || 0) ? m : acc,
      null
    );
    const maisSaida = maquinas.reduce(
      (acc, m) => (acc == null || (m.saida || 0) > (acc.saida || 0) ? m : acc),
      null
    );
    const menosSaida = maquinas.reduce(
      (acc, m) => (acc == null || (m.saida || 0) < (acc.saida || 0) ? m : acc),
      null
    );
    const maisSobra = maquinas.reduce(
      (acc, m) => (acc == null || (m.sobra || 0) > (acc.sobra || 0) ? m : acc),
      null
    );
    const menosSobra = maquinas.reduce(
      (acc, m) => (acc == null || (m.sobra || 0) < (acc.sobra || 0) ? m : acc),
      null
    );

    const pct = (val, total) =>
      total ? ((Number(val) || 0) / total) * 100 : 0;

    const linhaStat = (rotulo, m, campo, total, tipo) => {
      if (!m) return "";
      const valor = m[campo] || 0;
      const porcent = pct(valor, total);
      const jogoLabel = m.jogo ? ` - ${m.jogo}` : "";
      const classe =
        tipo === "entrada"
          ? "valor-entrada"
          : tipo === "saida"
          ? "valor-saida"
          : "valor-sobra";
      const labelCampo =
        tipo === "entrada"
          ? "Entrada"
          : tipo === "saida"
          ? "Saída"
          : "Sobra";
      return `
        <div class="linha-indicador">
          <strong>${rotulo}:</strong>
          <span> ${m.selo}${jogoLabel} — ${labelCampo}: <span class="${classe}">${formatarMoedaBR(
        valor
      )}</span> (${formatarPercent(porcent)} do total)</span>
        </div>
      `;
    };

    resumoHtml = `
      <hr class="rel-sep">
      <h3 class="rel-subtitulo">Indicadores da Semana</h3>
      ${linhaStat(
        "Máquina que mais jogou",
        maisEntrada,
        "entrada",
        totalEntrada,
        "entrada"
      )}
      ${linhaStat(
        "Máquina que menos jogou",
        menosEntrada,
        "entrada",
        totalEntrada,
        "entrada"
      )}
      ${linhaStat(
        "Máquina que mais pagou",
        maisSaida,
        "saida",
        totalSaida,
        "saida"
      )}
      ${linhaStat(
        "Máquina que menos pagou",
        menosSaida,
        "saida",
        totalSaida,
        "saida"
      )}
      ${linhaStat(
        "Máquina que mais sobrou",
        maisSobra,
        "sobra",
        totalSobra,
        "sobra"
      )}
      ${linhaStat(
        "Máquina que menos sobrou",
        menosSobra,
        "sobra",
        totalSobra,
        "sobra"
      )}
    `;
  }

  return `
    <h2 class="rel-titulo">${r.pontoExibicao} — ${titulo}</h2>
    ${periodoHtml}

    <div class="rel-totais">
      <strong>Totais do Ponto</strong><br>
      Entrada: <span class="valor-entrada">${formatarMoedaBR(
        r.totais.entrada
      )}</span><br>
      Saída: <span class="valor-saida">${formatarMoedaBR(
        r.totais.saida
      )}</span><br>
      Sobra: <span class="valor-sobra">${formatarMoedaBR(
        r.totais.sobra
      )}</span>
    </div>

    <div class="rel-maquinas">
      <strong>Máquinas</strong><br>
      ${htmlMaquinas}
    </div>

    ${resumoHtml}
  `;
}

/* ===== 9. REMOVER FECHAMENTO SELECIONADO ===== */
function removerFechamentoSelecionado() {
  const id = Number(document.getElementById("selectSemana").value);
  if (!id) {
    alert("Selecione um fechamento (semana) para remover.");
    return;
  }

  const registros = getRegistros();
  const idx = registros.findIndex((r) => r.id === id);
  if (idx === -1) {
    alert("Fechamento não encontrado.");
    return;
  }

  const ok = confirm("Tem certeza que deseja remover este fechamento?");
  if (!ok) return;

  registros.splice(idx, 1);
  salvarRegistros(registros);
  alert("Fechamento removido.");

  carregarPontosNosSelects();
}

/* ===== 10. MODAL ===== */
function abrirModal(html) {
  const conteudo = document.getElementById("modalConteudo");
  if (conteudo) conteudo.innerHTML = html;
  const modal = document.getElementById("modalRelatorio");
  if (modal) modal.classList.add("aberta");
}

function fecharModal() {
  const modal = document.getElementById("modalRelatorio");
  if (modal) modal.classList.remove("aberta");
}
