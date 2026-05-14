import { somenteDigitos } from "./money.js";

export const RETENCAO_STORAGE_KEY = "calculo_retencao_v2";

export const MAQUINA_RETENCAO_VAZIA = {
  selo: "",
  jogo: "",
  entrada: "",
  saida: "",
};

export function hojeISO() {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${ano}-${mes}-${dia}`;
}

export function criarEstadoInicialRetencao() {
  return {
    textoFonte: "",
    maquinas: [],
  };
}

export function normalizarMaquinaRetencao(maquina = {}) {
  return {
    ...MAQUINA_RETENCAO_VAZIA,
    ...maquina,
  };
}

export function carregarRetencaoLocal() {
  const estadoInicial = criarEstadoInicialRetencao();

  if (typeof window === "undefined") {
    return estadoInicial;
  }

  try {
    const bruto = window.localStorage.getItem(RETENCAO_STORAGE_KEY);
    if (!bruto) return estadoInicial;

    const salvo = JSON.parse(bruto);

    return {
      textoFonte: salvo?.textoFonte || "",
      maquinas: Array.isArray(salvo?.maquinas)
        ? salvo.maquinas.map(normalizarMaquinaRetencao)
        : [],
    };
  } catch {
    return estadoInicial;
  }
}

export function salvarRetencaoLocal(estado) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RETENCAO_STORAGE_KEY, JSON.stringify(estado));
}

export function limparStorageRetencao() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RETENCAO_STORAGE_KEY);
}

export function numeroCentavosParaMoeda(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return 0;
  return Number(digitos) / 100;
}

export function formatarPercentual(valor) {
  return `${Number(valor || 0).toFixed(2)}%`;
}

export function formatarDataBR(iso) {
  if (!iso) return "__/__/____";
  const partes = iso.split("-");
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function calcularResumoMaquinaRetencao(maquina) {
  const entrada = numeroCentavosParaMoeda(maquina.entrada);
  const saida = numeroCentavosParaMoeda(maquina.saida);
  const retencao = entrada > 0 ? ((entrada - saida) / entrada) * 100 : 0;

  return {
    entrada,
    saida,
    retencao,
  };
}

export function calcularRetencaoMedia(maquinas) {
  let soma = 0;
  let contador = 0;

  maquinas.forEach((maquina) => {
    const { entrada, retencao } = calcularResumoMaquinaRetencao(maquina);
    if (entrada > 0) {
      soma += retencao;
      contador += 1;
    }
  });

  return contador ? soma / contador : 0;
}

export function calcularRetencaoGeral(maquinas) {
  let totalEntrada = 0;
  let totalSaida = 0;

  maquinas.forEach((maquina) => {
    const { entrada, saida } = calcularResumoMaquinaRetencao(maquina);
    totalEntrada += entrada;
    totalSaida += saida;
  });

  return totalEntrada > 0 ? ((totalEntrada - totalSaida) / totalEntrada) * 100 : 0;
}

export function extrairPontoRetencao(texto) {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const primeira = linhas[0] || "";

  const matchComAsterisco = primeira.match(/\|\s*([^|*]+)\s*\*/);
  if (matchComAsterisco?.[1]) {
    return matchComAsterisco[1].trim().toUpperCase();
  }

  const matchPipe = primeira.match(/\|\s*([^|]+)\s*\|/);
  if (matchPipe?.[1]) {
    return matchPipe[1].trim().toUpperCase();
  }

  return "";
}

export function importarTextoRetencao(texto) {
  const ponto = extrairPontoRetencao(texto);
  const data = extrairDataRetencao(texto);
  const maquinas = extrairMaquinasDoTexto(texto).map((maquina) => ({
    ...MAQUINA_RETENCAO_VAZIA,
    ...maquina,
  }));

  return { data, ponto, maquinas };
}

export function extrairDataRetencao(texto) {
  const match = String(texto || "").match(/Data:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{2,4})/i);
  return match?.[1] || "";
}

function normalizarEspacos(texto) {
  return String(texto || "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function extrairMaquinasDoTexto(texto) {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => normalizarEspacos(linha))
    .filter(Boolean);

  const maquinas = [];

  for (let indice = 0; indice < linhas.length; indice += 1) {
    const linha = linhas[indice];
    const cabecalho = linha.match(/^(\d{3,}(?:\([A-Z]+\))?)\s*-\s*(.+)$/i);
    if (!cabecalho) continue;

    const selo = (cabecalho[1] || "").trim().toUpperCase();
    const jogo = (cabecalho[2] || "").trim().toUpperCase();

    let entrada = "";
    let saida = "";

    for (let cursor = indice + 1; cursor < Math.min(indice + 6, linhas.length); cursor += 1) {
      const linhaAtual = linhas[cursor];

      if (!entrada && /^E\b/i.test(linhaAtual)) {
        const numeros = linhaAtual.replace(/_/g, " ").match(/(\d{4,})/g) || [];
        if (numeros.length >= 2) entrada = numeros[1];
      }

      if (!saida && /^S\b/i.test(linhaAtual)) {
        const numeros = linhaAtual.replace(/_/g, " ").match(/(\d{4,})/g) || [];
        if (numeros.length >= 2) saida = numeros[1];
      }

      if (entrada && saida) break;
    }

    if (maquinas.some((item) => item.selo === selo)) continue;

    if (entrada || saida) {
      maquinas.push({
        selo,
        jogo,
        entrada: somenteDigitos(entrada),
        saida: somenteDigitos(saida),
      });
    }
  }

  return maquinas;
}
