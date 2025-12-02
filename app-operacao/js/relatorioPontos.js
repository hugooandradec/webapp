// ===========================================
//  RELATÓRIO DE PONTOS - VERSÃO COMPLETA
//  Feito pela Cah, do jeitinho que você pediu ❤️
// ===========================================

// ====== FORMATADORES ======

function limparTexto(txt) {
  return (txt || "")
    .replace(/\s+/g, " ")
    .trim();
}

function paraMaiusculo(txt) {
  return limparTexto(txt).toUpperCase();
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });
}

// ====== PERÍODO DA SEMANA ======

function calcularPeriodoSemana(dataStr) {
  // data vem no formato DD/MM/YYYY
  const [d, m, y] = dataStr.split("/").map(n => parseInt(n));
  const data = new Date(y, m - 1, d);

  const diaSemana = data.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab

  // Ajusta para começar na segunda
  const segunda = new Date(data);
  segunda.setDate(data.getDate() - ((diaSemana + 6) % 7));

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  const fmt = dt =>
    `${String(dt.getDate()).padStart(2, "0")}/${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}/${dt.getFullYear()}`;

  return {
    inicio: fmt(segunda),
    fim: fmt(domingo)
  };
}

// ====== NORMALIZA SEL0 (igual retenção) ======
//
// Formato final: LLNNN (duas letras + três números)
// Remove prefixos tipo "1-" e corrige tudo pra maiúsculo
//
function normalizarSelo(seloBruto) {
  if (!seloBruto) return "";

  let txt = seloBruto.toUpperCase().trim();

  // remove prefixos tipo "1-" ou "2-"
  txt = txt.replace(/^\d+\-/, "");

  // extrai duas letras + três números
  const padrao = /([A-Z]{2})(\d{3})/;
  const achou = txt.match(padrao);

  if (achou) return `${achou[1]}${achou[2]}`;

  return txt; // fallback
}

// ====== EXTRAI VALOR APÓS '= R$' ======
function extrairValorRS(linha) {
  const achou = linha.match(/=\s*R\$\s*([\d\.,]+)/i);
  if (!achou) return 0;

  return parseFloat(
    achou[1]
      .replace(/\./g, "")
      .replace(",", ".")
  ) || 0;
}

// ====== PROCESSA MÁQUINA ======
function processarBlocoMaquina(bloco) {
  // bloco contém: selo + linhas E/S/Total
  const linhas = bloco.split("\n").map(l => l.trim()).filter(Boolean);

  const primeira = linhas[0];
  const seloBruto = primeira.split(" ")[0];
  const jogoBruto = primeira.replace(seloBruto, "").replace(/[()]/g, "").trim();

  let entrada = 0;
  let saida = 0;
  let sobra = 0;

  linhas.forEach(l => {
    if (l.startsWith("(E)")) entrada = extrairValorRS(l);
    if (l.startsWith("(S)")) saida = extrairValorRS(l);
    if (l.startsWith("(Total)")) sobra = extrairValorRS(l);
  });

  return {
    selo: normalizarSelo(seloBruto),
    jogo: paraMaiusculo(jogoBruto),
    entrada,
    saida,
    sobra,
    vidaUtil: entrada > 0 ? (saida / entrada) * 100 : 0
  };
}

// ====== PROCESSADOR PRINCIPAL ======
function gerarRelatorioDePontos(textoOCR) {
  const linhas = textoOCR.split("\n").map(l => l.trim());

  // ----- CAPTURA CLIENTE -----
  const linhaCliente = linhas.find(l => l.toLowerCase().startsWith("cliente"));
  const cliente = linhaCliente
    ? paraMaiusculo(linhaCliente.split(":")[1])
    : "";

  // ----- CAPTURA DATA -----
  const linhaData = linhas.find(l => l.startsWith("Data"));
  const dataStr = linhaData
    ? linhaData.split(":")[1].trim()
    : "";

  const { inicio, fim } = calcularPeriodoSemana(dataStr);

  // ----- CAPTURA MÁQUINAS -----
  let blocosMaquinas = [];
  let atual = [];

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // início de máquina: começa com algo tipo "1-IE033" ou "IE033"
    if (/^\d*\-?[A-Za-z]{1,3}\d{3}/.test(l)) {
      // fecha bloco anterior
      if (atual.length > 0) {
        blocosMaquinas.push(atual.join("\n"));
        atual = [];
      }
      atual.push(l);
    } else if (atual.length > 0) {
      atual.push(l);
    }
  }
  if (atual.length > 0) blocosMaquinas.push(atual.join("\n"));

  const maquinas = blocosMaquinas.map(processarBlocoMaquina);

  // soma valores
  const totalBruto = maquinas.reduce((s, m) => s + m.sobra, 0);
  const percentualCliente = 0.3;
  const valorCliente = totalBruto * percentualCliente;
  const subtotal = totalBruto - valorCliente;

  // ====== RETORNA OBJETO DO RELATÓRIO ======
  return {
    cliente,
    dataFechamento: dataStr,
    periodo: `${inicio} até ${fim}`,
    maquinas,
    totalBruto,
    percentualCliente,
    valorCliente,
    subtotal
  };
}

// ====== RELATÓRIO FINAL (TEXTO BONITO) ======

function montarRelatorioFinal(dados) {
  let txt = "";
  txt += `=== RELATÓRIO DE PONTOS ===\n`;
  txt += `CLIENTE: ${dados.cliente}\n`;
  txt += `DATA DO FECHAMENTO: ${dados.dataFechamento}\n`;
  txt += `PERÍODO DA SEMANA: ${dados.periodo}\n\n`;

  dados.maquinas.forEach(m => {
    txt += `Selo: ${m.selo} | Jogo: ${m.jogo}\n`;
    txt += `Entrada: ${formatarMoeda(m.entrada)}\n`;
    txt += `Saída: ${formatarMoeda(m.saida)}\n`;
    txt += `Sobra: ${formatarMoeda(m.sobra)}\n`;
    txt += `Vida Útil: ${m.vidaUtil.toFixed(2)}%\n`;
    txt += `---------------------------------------\n`;
  });

  txt += `TOTAL BRUTO: ${formatarMoeda(dados.totalBruto)}\n`;
  txt += `PERCENTUAL DO CLIENTE: ${(dados.percentualCliente * 100).toFixed(2)}%\n`;
  txt += `VALOR DO CLIENTE: ${formatarMoeda(dados.valorCliente)}\n`;
  txt += `SUBTOTAL: ${formatarMoeda(dados.subtotal)}\n`;

  return txt;
}

// ====== USO ======
// Coloque o OCR bruto aqui dentro para testar:
// const resultado = gerarRelatorioDePontos(textoDoOCR);
// console.log(montarRelatorioFinal(resultado));
