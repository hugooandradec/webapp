// js/relatorioPontos.js
import { inicializarPagina } from "../../common/js/navegacao.js";

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  inicializarPagina("Relatório de Pontos", "operacao");

  carregarPontosNosSelects();

  document.getElementById("btnProcessarPrint").onclick = processarPrint;
  document.getElementById("btnAprovar").onclick = aprovarFechamento;
  document.getElementById("btnDescartar").onclick = descartarExtracao;

  document.getElementById("btnGerarSemanal").onclick = gerarRelatorioSemanal;
  document.getElementById("btnGerarConsolidado").onclick =
    gerarRelatorioConsolidado;

  const btnRemover = document.getElementById("btnRemoverFechamento");
  if (btnRemover) btnRemover.onclick = removerFechamento;

  const btnRemoverPonto = document.getElementById("btnRemoverPonto");
  if (btnRemoverPonto) btnRemoverPonto.onclick = removerPonto;

  document.getElementById("fecharModal").onclick = fecharModal;

  const selPontoSem = document.getElementById("selectPontoSemanal");
  if (selPontoSem) selPontoSem.addEventListener("change", carregarSemanas);

  restaurarExtracaoAtual();
});


/* ===== HELPERS GERAIS / STORAGE ===== */

function getRegistros() {
  try {
    const raw = localStorage.getItem("relatorio_pontos_v1");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao ler registros do localStorage:", e);
    return [];
  }
}

function salvarRegistros(lista) {
  localStorage.setItem("relatorio_pontos_v1", JSON.stringify(lista));
}

function proximoId() {
  const regs = getRegistros();
  let maior = 0;
  regs.forEach((r) => {
    if (r.id > maior) maior = r.id;
  });
  return maior + 1;
}

function formatarMoedaBR(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

function gerarSlugPonto(nome) {
  if (!nome) return "";
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

// calcula a semana (segunda a domingo) onde cai a data do fechamento
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

/* ===== 1. CARREGAR PONTOS NOS SELECTS ===== */

function carregarPontosNosSelects() {
  const registros = getRegistros();
  const pontosMap = new Map();

  registros.forEach((r) => {
    if (!pontosMap.has(r.pontoChave)) {
      pontosMap.set(r.pontoChave, r.pontoExibicao);
    }
  });

  const selSem = document.getElementById("selectPontoSemanal");
  const selCons = document.getElementById("selectPontoConsolidado");

  // transforma em array e ordena pelo nome do ponto (valor do map)
  const listaPontos = Array.from(pontosMap.entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "pt-BR", { sensitivity: "base" })
  );
  // a[0] = chave, a[1] = nome

  [selSem, selCons].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "<option value=''>Selecione</option>";
    listaPontos.forEach(([chave, nome]) => {
      sel.innerHTML += `<option value="${chave}">${nome}</option>`;
    });
  });

  carregarSemanas();
}


/* ===== 2. OCR / IMPORTAÇÃO DO PRINT ===== */

async function lerTextoDoPrint(file) {
  if (!file) return "";
  try {
    if (window.toast) toast.info("Lendo imagem, aguarde...");

    const { data } = await Tesseract.recognize(file, "por+eng", {
      logger: (m) => console.log("[OCR Relatório de Pontos]", m)
    });
    const texto = (data && data.text) ? data.text : "";
    console.log("OCR (Relatório de Pontos):", texto);
    return texto;
  } catch (err) {
    console.error("Erro no OCR (Relatório de Pontos):", err);
    alert("Não foi possível ler a imagem.");
    return "";
  } finally {
    try {
      if (window.toast && toast.clear) toast.clear();
    } catch (e) {}
  }
}

// parse simples de número pt-BR
function parseNumero(str) {
  if (!str) return 0;
  return Number(
    str
      .toString()
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}
function normalizarSelo(bruto) {
  if (!bruto) return "";
  // deixa só letras e números
  let s = bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // se tiver um padrão certinho LLNNN (ex: IE033), usa esse
  const strict = s.match(/[A-Z]{2}\d{3}/);
  if (strict) {
    s = strict[0];
  }

  // se ficou algo tipo 1E033, IE033, LE033 etc (1/I/L confundidos)
  if (/^[1IL][A-Z]\d{3}$/.test(s)) {
    s = "I" + s.slice(1); // força o primeiro caractere a ser "I"
  }

  return s;
}

function normalizarJogo(bruto) {
  if (!bruto) return "";
  let j = bruto.toString().trim().toUpperCase();

  // troca " (" por " - (" para casos tipo "SEVEN (AMERICA)"
  j = j.replace(/\s+\(/g, " - (");

  // se tiver "(" mas menos ")" (OCR comeu um parêntese), completa no final
  const abre = (j.match(/\(/g) || []).length;
  const fecha = (j.match(/\)/g) || []).length;
  if (abre > fecha) {
    j += ")".repeat(abre - fecha);
  }

  // REMOVE HÍFENS DUPLICADOS: " - - (" → " - ("
  j = j.replace(/-\s*-\s*\(/g, "- (");

  // Se houver espaços extras antes do hífen, limpa: "SEVEN  -  (" -> "SEVEN - ("
  j = j.replace(/\s+-\s+\(/g, " - (");

  // Remove duplicações estranhas causadas pelo OCR: "--" → "-"
  j = j.replace(/--+/g, "-");

  return j.trim();
}



/**
 * Faz o parse do texto lido do print, retornando
 * um objeto com ponto, data, lista de máquinas, etc.
 * Aceita linhas de máquina no formato:
 *  - "1-IE033 (Seven (America))"
 *  - "IE033 (HL)"
 */
function interpretarTextoFechamento(texto) {
  texto = (texto || "").replace(/\r/g, "");
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log("Linhas normalizadas:", linhas);

  // ===== Cliente / Ponto =====
  let ponto = "";
  const linhaCliente = linhas.find((l) =>
    l.toLowerCase().startsWith("cliente")
  );
  if (linhaCliente) {
    const partes = linhaCliente.split(":");
    if (partes[1]) {
      ponto = partes[1].trim();
    }
  }
  ponto = (ponto || "").toUpperCase();
  if (!ponto) ponto = "PONTO DESCONHECIDO";

  // ===== Data do fechamento =====
  let dataFechamentoISO = "";
  const linhaData = linhas.find((l) =>
    l.toLowerCase().startsWith("data")
  );
  if (linhaData) {
    const m = linhaData.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
      let [_, d, mo, y] = m;
      let anoNum = parseInt(y, 10);
      if (anoNum < 100) anoNum += 2000;
      const dt = new Date(anoNum, parseInt(mo, 10) - 1, parseInt(d, 10));
      if (!isNaN(dt.getTime())) {
        dataFechamentoISO = formatarDataISO(dt);
      }
    }
  }
  if (!dataFechamentoISO) {
    dataFechamentoISO = formatarDataISO(new Date());
  }

  // ===== Máquinas =====
  const maquinas = [];
  let atual = null;

  for (const linhaOriginal of linhas) {
    const l = linhaOriginal.trim();
    const upper = l.toUpperCase();

    // CABEÇALHO DE MÁQUINA
    // ex: "1-IE033 (Seven (America))" ou "2-IB158 (HL)"
    const mCabecalho = l.match(/^\d+\s*-\s*([^\s(]+)/);
    if (mCabecalho && l.includes("(")) {
      if (atual) maquinas.push(atual);

  let seloBruto = "";
  const mSeloStrict = l.match(/([A-Za-z]{2}\d{3})/);
  if (mSeloStrict) {
    seloBruto = mSeloStrict[1];
  } else {
    seloBruto = mCabecalho[1];
  }
  const selo = normalizarSelo(seloBruto);

  // ===== jogo: tudo entre o primeiro "(" e o último ")" (se tiver)
  let jogo = "";
  const idxAbre = l.indexOf("(");
  const idxFecha = l.lastIndexOf(")");
  let inside;
  if (idxAbre !== -1) {
    if (idxFecha !== -1 && idxFecha > idxAbre) {
      inside = l.slice(idxAbre + 1, idxFecha).trim();
    } else {
      // se não achou ")", pega até o fim da linha
      inside = l.slice(idxAbre + 1).trim();
    }
    jogo = normalizarJogo(inside);
  }

  atual = {
    selo,
    jogo,
    entrada: 0,
    saida: 0,
    sobra: 0
  };
  continue;
}



    if (!atual) continue;

    // LINHA DE ENTRADA: "(E) ... = R$ 1.503,00"
    if (upper.startsWith("(E)")) {
      const mEntrada = l.match(/R\$\s*([\d\.,]+)/i);
      if (mEntrada) {
        atual.entrada = parseNumero(mEntrada[1]);
      }
      continue;
    }

    // LINHA DE SAÍDA: "(S) ... = R$ 1.318,85"
    if (upper.startsWith("(S)")) {
      const mSaida = l.match(/R\$\s*([\d\.,]+)/i);
      if (mSaida) {
        atual.saida = parseNumero(mSaida[1]);
      }
      continue;
    }

    // linhas de Total, vida útil, etc. são ignoradas
  }

  if (atual) maquinas.push(atual);

  // calcula sobra (entrada - saída)
  maquinas.forEach((m) => {
    m.sobra = (m.entrada || 0) - (m.saida || 0);
  });

  return {
    ponto,
    dataFechamentoISO,
    maquinas
  };
}


/* ===== 3. PRÉ-VISUALIZAÇÃO DA EXTRAÇÃO ===== */

const TEMP_KEY = "relatorio_pontos_extracao_atual";

async function processarPrint() {
  const input = document.getElementById("inputPrint");
  const file = input.files && input.files[0];
  if (!file) {
    alert("Selecione uma imagem primeiro.");
    return;
  }

  const texto = await lerTextoDoPrint(file);
  if (!texto) return;

  const dados = interpretarTextoFechamento(texto);
  console.log("Dados interpretados (fechamento):", dados);

  localStorage.setItem(TEMP_KEY, JSON.stringify(dados));
  mostrarExtracaoNaTela(dados);
}

function restaurarExtracaoAtual() {
  try {
    const raw = localStorage.getItem(TEMP_KEY);
    if (!raw) return;
    const dados = JSON.parse(raw);
    if (!dados || !dados.maquinas || !dados.maquinas.length) return;
    mostrarExtracaoNaTela(dados);
  } catch (e) {
    console.error("Erro ao restaurar extração atual:", e);
  }
}

function mostrarExtracaoNaTela(dados) {
  const divPreview = document.getElementById("previewExtracao");
  const divDados = document.getElementById("dadosExtraidos");

  if (!dados || !dados.maquinas || !dados.maquinas.length) {
    divPreview.style.display = "none";
    divDados.innerHTML = "";
    return;
  }

  divPreview.style.display = "block";

  const { ponto, dataFechamentoISO, maquinas } = dados;

  const pontoExibicao = (ponto || "").toUpperCase() || "(SEM NOME)";
  const dataBR = formatarDataBR(dataFechamentoISO);

  let html = `<p><b>Ponto:</b> ${pontoExibicao}<br><b>Data do Fechamento:</b> ${
    dataBR || "-"
  }</p>`;

  html += "<ul>";
  maquinas.forEach((m) => {
    html += `<li>${m.selo} — ${m.jogo || "-"}<br>
      Entrada: ${formatarMoedaBR(m.entrada)} |
      Saída: ${formatarMoedaBR(m.saida)} |
      Sobra: <b>${formatarMoedaBR(m.sobra)}</b>
    </li>`;
  });
  html += "</ul>";

  divDados.innerHTML = html;
}

function descartarExtracao() {
  localStorage.removeItem(TEMP_KEY);
  document.getElementById("previewExtracao").style.display = "none";
  document.getElementById("dadosExtraidos").innerHTML = "";
  document.getElementById("inputPrint").value = "";
}

/* ===== 4. APROVAR E SALVAR FECHAMENTO ===== */

function aprovarFechamento() {
  try {
    const raw = localStorage.getItem(TEMP_KEY);
    if (!raw) {
      alert("Nenhuma extração pendente.");
      return;
    }
    const dados = JSON.parse(raw);
    if (!dados || !dados.maquinas || !dados.maquinas.length) {
      alert("Dados incompletos para salvar.");
      return;
    }

    const { ponto, dataFechamentoISO, maquinas } = dados;

    const pontoExibicao = (ponto || "").toUpperCase() || "(SEM NOME)";
    const pontoChave = gerarSlugPonto(pontoExibicao);

    const dataFechamentoDate = dataFechamentoISO
      ? new Date(dataFechamentoISO)
      : new Date();

    const periodo = calcularPeriodoSemana(dataFechamentoDate);

    const maquinasCompletas = maquinas.map((m, idx) => ({
      numero: idx + 1,
      selo: normalizarSelo(m.selo),
      jogo: normalizarJogo(m.jogo),
      entrada: m.entrada || 0,
      saida: m.saida || 0,
      sobra: (m.entrada || 0) - (m.saida || 0)
    }));


    const totais = maquinasCompletas.reduce(
      (acc, m) => {
        acc.entrada += m.entrada || 0;
        acc.saida += m.saida || 0;
        acc.sobra += m.sobra || 0;
        return acc;
      },
      { entrada: 0, saida: 0, sobra: 0 }
    );

    const registros = getRegistros();

    // checa duplicidade: mesmo ponto + mesma combinação de entradas/saídas
    const jaExiste = registros.some((reg) => {
      if (reg.pontoChave !== pontoChave) return false;
      if (!reg.maquinas || reg.maquinas.length !== maquinasCompletas.length)
        return false;
      return reg.maquinas.every((mReg, i) => {
        const mNovo = maquinasCompletas[i];
        return (
          Number(mReg.entrada) === Number(mNovo.entrada) &&
          Number(mReg.saida) === Number(mNovo.saida)
        );
      });
    });

    if (jaExiste) {
      alert(
        "Esse fechamento já foi importado anteriormente (mesmos valores de entrada e saída)."
      );
      return;
    }

    const novo = {
      id: proximoId(),
      pontoChave,
      pontoExibicao,
      periodo,
      dataFechamento: dataFechamentoISO,
      maquinas: maquinasCompletas,
      totais
    };

    registros.push(novo);
    salvarRegistros(registros);

    alert("Fechamento salvo com sucesso!");

    descartarExtracao();
    carregarPontosNosSelects();
  } catch (e) {
    console.error("Erro ao aprovar fechamento:", e);
    alert("Erro ao salvar fechamento.");
  }
}

/* ===== 5. CARREGAR SEMANAS DE UM PONTO ===== */

function carregarSemanas() {
  const ponto = document.getElementById("selectPontoSemanal").value;
  const selectSemana = document.getElementById("selectSemana");

  if (!ponto) {
    selectSemana.innerHTML = "<option value=''>Selecione</option>";
    return;
  }

  let registros = getRegistros().filter((r) => r.pontoChave === ponto);

  // ordena pela data de início da semana (mais antiga primeiro)
  registros.sort(
    (a, b) =>
      new Date(a.periodo.inicio).getTime() -
      new Date(b.periodo.inicio).getTime()
  );

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
  const qtdSemanasSolicitada = Number(
    document.getElementById("inputQtdSemanas").value || "0"
  );

  if (!ponto || !qtdSemanasSolicitada) {
    alert("Selecione o ponto e informe a quantidade de semanas.");
    return;
  }

  let regs = getRegistros().filter((r) => r.pontoChave === ponto);
  if (!regs.length) {
    alert("Ainda não há fechamentos salvos para esse ponto.");
    return;
  }

  // ordena por fim do período (mais recente primeiro)
  regs.sort((a, b) => new Date(b.periodo.fim) - new Date(a.periodo.fim));

  const disponiveis = regs.length;

  // se pediu mais do que tem, avisa e ajusta
  if (disponiveis < qtdSemanasSolicitada) {
    alert(
      `Existem apenas ${disponiveis} semana(s) disponível(is) para este ponto.\n` +
      `O relatório será gerado com ${disponiveis} semana(s).`
    );
  }

  const qtdUsada = Math.min(disponiveis, qtdSemanasSolicitada);
  regs = regs.slice(0, qtdUsada);

  const pontoExibicao = regs[0].pontoExibicao;
  const periodoGeral = {
    inicio: regs[regs.length - 1].periodo.inicio,
    fim: regs[0].periodo.fim
  };

  const totais = regs.reduce(
    (acc, r) => {
      acc.entrada += r.totais.entrada || 0;
      acc.saida += r.totais.saida || 0;
      acc.sobra += r.totais.sobra || 0;
      return acc;
    },
    { entrada: 0, saida: 0, sobra: 0 }
  );

  const mapaMaquinas = new Map();

regs.forEach((r) => {
  r.maquinas.forEach((m) => {
    const seloNorm = normalizarSelo(m.selo);
    const jogoNorm = normalizarJogo(m.jogo);

    // chave de agrupamento = SÓ o selo
    const chave = seloNorm;

    if (!mapaMaquinas.has(chave)) {
      mapaMaquinas.set(chave, {
        selo: seloNorm,
        jogo: jogoNorm,   // jogo atual conhecido (pode ser atualizado depois)
        entrada: 0,
        saida: 0,
        sobra: 0
      });
    }

    const ag = mapaMaquinas.get(chave);
    ag.entrada += m.entrada || 0;
    ag.saida += m.saida || 0;
    ag.sobra += m.sobra || 0;

    // se nesse lançamento o jogo vier preenchido, atualiza o "nome" da máquina
    if (jogoNorm) {
      ag.jogo = jogoNorm;
    }
  });
});

const listaMaquinas = Array.from(mapaMaquinas.values());


  const consolidado = {
    pontoChave: ponto,
    pontoExibicao,
    periodo: periodoGeral,
    totais,
    maquinas: listaMaquinas
  };

  const html = montarHtmlRelatorio(consolidado, "Relatório Consolidado");
  abrirModal(html);
}


/* ===== 8. HTML DO RELATÓRIO (formato “tipo Retenção”) ===== */

function montarHtmlRelatorio(r, titulo) {
  if (!r) return "";

  const blocos = [];

  // título + período
  blocos.push(
    `<span style="color:#6a1b9a;font-weight:900;">${r.pontoExibicao} — ${titulo}</span>`
  );
  if (r.periodo && r.periodo.inicio && r.periodo.fim) {
    blocos.push(
      `${formatarDataBRCurta(r.periodo.inicio)} - ${formatarDataBRCurta(
        r.periodo.fim
      )}`
    );
  }
  blocos.push("");

  // totais
  blocos.push("Totais do Ponto");
  blocos.push(
    `Entrada: <span class="valor-entrada">${formatarMoedaBR(
      r.totais.entrada
    )}</span>`
  );
  blocos.push(
    `Saída: <span class="valor-saida">${formatarMoedaBR(
      r.totais.saida
    )}</span>`
  );
  blocos.push(
    `Sobra: <span class="valor-sobra">${formatarMoedaBR(
      r.totais.sobra
    )}</span>`
  );
  blocos.push("");

  // máquinas
  blocos.push("Máquinas");
  blocos.push("");

  (r.maquinas || []).forEach((m) => {
    const prefixo =
      m.numero != null && m.numero !== "" ? `${m.numero} - ` : "";
    const jogo = m.jogo ? ` - ${m.jogo}` : "";
    blocos.push(`${prefixo}${m.selo}${jogo}`);
    blocos.push(
      `Entrada: <span class="valor-entrada">${formatarMoedaBR(
        m.entrada
      )}</span> | ` +
        `Saída: <span class="valor-saida">${formatarMoedaBR(
          m.saida
        )}</span> | ` +
        `Sobra: <span class="valor-sobra">${formatarMoedaBR(m.sobra)}</span>`
    );
    blocos.push("");
  });

  // indicadores (quando tiver período + máquinas)
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
      (acc, m) =>
        acc == null || (m.saida || 0) > (acc.saida || 0) ? m : acc,
      null
    );
    const menosSaida = maquinas.reduce(
      (acc, m) =>
        acc == null || (m.saida || 0) < (acc.saida || 0) ? m : acc,
      null
    );
    const maisSobra = maquinas.reduce(
      (acc, m) =>
        acc == null || (m.sobra || 0) > (acc.sobra || 0) ? m : acc,
      null
    );
    const menosSobra = maquinas.reduce(
      (acc, m) =>
        acc == null || (m.sobra || 0) < (acc.sobra || 0) ? m : acc,
      null
    );

    const pct = (val, total) =>
      total ? ((Number(val) || 0) / total) * 100 : 0;

   const linhaIndicador = (rotulo, m, campo, total, tipo) => {
  if (!m) return;
  const valor = m[campo] || 0;
  const nomeMaquina = m.jogo ? `${m.selo} - ${m.jogo}` : m.selo;

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

  const porcent = pct(valor, total);

  blocos.push("");
  // linha 1: enunciado + máquina
  blocos.push(`${rotulo}: ${nomeMaquina}`);
  // linha 2: valor + porcentagem
  blocos.push(
    `${labelCampo}: <span class="${classe}">${formatarMoedaBR(
      valor
    )}</span> (${porcent.toFixed(2)}% do total)`
  );
};

    blocos.push("----------------------------------------");
    blocos.push("");
    blocos.push("Indicadores da Semana");

    linhaIndicador(
      "Máquina que mais jogou",
      maisEntrada,
      "entrada",
      totalEntrada,
      "entrada"
    );
    linhaIndicador(
      "Máquina que menos jogou",
      menosEntrada,
      "entrada",
      totalEntrada,
      "entrada"
    );
    linhaIndicador(
      "Máquina que mais pagou",
      maisSaida,
      "saida",
      totalSaida,
      "saida"
    );
    linhaIndicador(
      "Máquina que menos pagou",
      menosSaida,
      "saida",
      totalSaida,
      "saida"
    );
    linhaIndicador(
      "Máquina que mais sobrou",
      maisSobra,
      "sobra",
      totalSobra,
      "sobra"
    );
    linhaIndicador(
      "Máquina que menos sobrou",
      menosSobra,
      "sobra",
      totalSobra,
      "sobra"
    );
  }

  return blocos.join("<br>");
}

/* ===== 9. REMOVER FECHAMENTO (selecionado) ===== */

function removerFechamento() {
  const selectSemana = document.getElementById("selectSemana");
  if (!selectSemana) return;

  const id = Number(selectSemana.value);
  if (!id) {
    alert("Selecione o ponto e a semana que deseja remover.");
    return;
  }

  const registros = getRegistros();
  const registro = registros.find((r) => r.id === id);
  if (!registro) {
    alert("Fechamento não encontrado.");
    return;
  }

  const periodo = `${formatarDataBR(registro.periodo.inicio)} até ${formatarDataBR(
    registro.periodo.fim
  )}`;

  const ok = confirm(
    `Remover o fechamento da semana ${periodo} do ponto ${registro.pontoExibicao}?`
  );
  if (!ok) return;

  const novos = registros.filter((r) => r.id !== id);
  salvarRegistros(novos);

  alert("Fechamento removido com sucesso.");
  carregarPontosNosSelects();
}

function removerPonto() {
  const selPonto = document.getElementById("selectPontoSemanal");
  if (!selPonto) return;

  const pontoChave = selPonto.value;
  if (!pontoChave) {
    alert("Selecione o ponto que você deseja remover.");
    return;
  }

  const registros = getRegistros();
  const registrosDoPonto = registros.filter(
    (r) => r.pontoChave === pontoChave
  );

  if (!registrosDoPonto.length) {
    alert("Não há fechamentos salvos para esse ponto.");
    return;
  }

  const nomePonto = registrosDoPonto[0].pontoExibicao;
  const qtd = registrosDoPonto.length;

  const ok = confirm(
    `Remover TODOS os ${qtd} fechamento(s) do ponto ${nomePonto}?\n` +
      "Essa operação NÃO poderá ser desfeita."
  );
  if (!ok) return;

  const novos = registros.filter((r) => r.pontoChave !== pontoChave);
  salvarRegistros(novos);

  alert(`Todos os fechamentos do ponto ${nomePonto} foram removidos.`);

  // atualiza selects
  carregarPontosNosSelects();
  const selectSemana = document.getElementById("selectSemana");
  if (selectSemana) {
    selectSemana.innerHTML = "<option value=''>Selecione</option>";
  }
}


/* ===== 10. MODAL ===== */

function abrirModal(html) {
  document.getElementById("modalConteudo").innerHTML = html;
  document.getElementById("modalRelatorio").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modalRelatorio").style.display = "none";
}
