import { somenteDigitos } from "./money.js";

export const PRE_FECHO_STORAGE_KEY = "preFecho_dados_v1";

export const MAQUINA_VAZIA = {
  selo: "",
  jogo: "",
  entradaAnterior: "",
  entradaAtual: "",
  saidaAnterior: "",
  saidaAtual: "",
};

export function hojeBR() {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export function criarEstadoInicialPreFecho() {
  return {
    data: hojeBR(),
    textoFonte: "",
    maquinas: [],
  };
}

export function normalizarMaquina(maquina = {}) {
  return {
    ...MAQUINA_VAZIA,
    ...maquina,
  };
}

export function carregarPreFechoLocal() {
  const estadoInicial = criarEstadoInicialPreFecho();

  if (typeof window === "undefined") {
    return estadoInicial;
  }

  try {
    const bruto = window.localStorage.getItem(PRE_FECHO_STORAGE_KEY);
    if (!bruto) {
      return estadoInicial;
    }

    const salvo = JSON.parse(bruto);

    return {
      data: salvo?.data || estadoInicial.data,
      textoFonte: salvo?.textoFonte || "",
      maquinas: Array.isArray(salvo?.maquinas)
        ? salvo.maquinas.map(normalizarMaquina)
        : [],
    };
  } catch {
    return estadoInicial;
  }
}

export function salvarPreFechoLocal(estado) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PRE_FECHO_STORAGE_KEY, JSON.stringify(estado));
}

export function limparStoragePreFecho() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PRE_FECHO_STORAGE_KEY);
}

export function parseNumeroRelogio(valor) {
  return Number(somenteDigitos(valor) || 0);
}

export function calcularValoresMaquina(maquina) {
  const entradaAnterior = parseNumeroRelogio(maquina.entradaAnterior);
  const saidaAnterior = parseNumeroRelogio(maquina.saidaAnterior);
  const entradaAtual =
    somenteDigitos(maquina.entradaAtual) === ""
      ? entradaAnterior
      : parseNumeroRelogio(maquina.entradaAtual);
  const saidaAtual =
    somenteDigitos(maquina.saidaAtual) === ""
      ? saidaAnterior
      : parseNumeroRelogio(maquina.saidaAtual);

  const diferencaEntradaBruta = entradaAtual - entradaAnterior;
  const diferencaSaidaBruta = saidaAtual - saidaAnterior;

  const diferencaEntrada = Math.abs(diferencaEntradaBruta) / 100;
  const diferencaSaida = -Math.abs(diferencaSaidaBruta) / 100;
  const resultado = diferencaEntrada + diferencaSaida;

  return {
    diferencaEntrada,
    diferencaSaida,
    resultado,
  };
}

export function calcularTotalPreFecho(maquinas) {
  return maquinas.reduce(
    (total, maquina) => total + calcularValoresMaquina(maquina).resultado,
    0
  );
}

export function importarTextoPreFecho(texto) {
  const cliente = extrairNomePonto(texto).toUpperCase();
  const dataFechamento = extrairDataFechamento(texto);
  const maquinas = extrairMaquinasRelatorio(texto).map((maquina) => ({
    ...MAQUINA_VAZIA,
    selo: maquina.selo,
    jogo: maquina.jogo,
    entradaAnterior: maquina.entradaFecho,
    saidaAnterior: maquina.saidaFecho,
  }));

  return { cliente, dataFechamento, maquinas };
}

export function extrairClientePreFecho(texto) {
  return extrairNomePonto(texto).toUpperCase();
}

export function extrairDataFechamento(texto) {
  const match = String(texto || "").match(
    /Data:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{2,4})(?:\s+[0-9]{2}:[0-9]{2}:[0-9]{2})?/i
  );

  if (!match) {
    return "";
  }

  return match[1] || "";
}

function extrairNomePonto(texto) {
  const linhas = String(texto || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  for (const linha of linhas) {
    const comAsterisco = linha.match(/^\*[^|]*\|\s*(.+?)\s*\*$/);
    if (comAsterisco?.[1]) {
      return comAsterisco[1].trim();
    }

    const semAsterisco = linha.match(/^\*[^|]*\|\s*(.+?)\s*$/);
    if (semAsterisco?.[1]) {
      return semAsterisco[1].replace(/\*+$/, "").trim();
    }
  }

  const fallback = String(texto || "").match(/NOME\s+DO\s+PONTO\s*:\s*(.+)$/im);
  return fallback?.[1]?.trim() || "";
}

function extrairMaquinasRelatorio(texto) {
  const linhas = String(texto || "").replace(/\r/g, "\n").split("\n");
  const maquinas = [];

  let indice = 0;

  while (indice < linhas.length) {
    const linha = (linhas[indice] || "").trim();
    const cabecalho = linha.match(/^(\d{3})\s*-\s*(.+)$/);

    if (!cabecalho) {
      indice += 1;
      continue;
    }

    const selo = (cabecalho[1] || "").trim().toUpperCase();
    const jogo = (cabecalho[2] || "").trim().toUpperCase();

    let entradaFecho = "";
    let saidaFecho = "";
    let cursor = indice + 1;

    for (; cursor < Math.min(indice + 12, linhas.length); cursor += 1) {
      const linhaAtual = (linhas[cursor] || "").trim();

      if (/^\d{3}\s*-\s*/.test(linhaAtual)) {
        break;
      }

      const entrada = linhaAtual.match(/^E\s+(\d+)\s+(\d+)/i);
      if (entrada) {
        entradaFecho = (entrada[2] || "").trim();
        continue;
      }

      const saida = linhaAtual.match(/^S\s+(\d+)\s+(\d+)/i);
      if (saida) {
        saidaFecho = (saida[2] || "").trim();
      }
    }

    if (entradaFecho || saidaFecho) {
      maquinas.push({ selo, jogo, entradaFecho, saidaFecho });
    }

    indice = cursor;
  }

  return maquinas;
}
