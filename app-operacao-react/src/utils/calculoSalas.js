import { somenteDigitos } from "./money.js";

export const CALCULO_SALAS_STORAGE_KEY = "calculo_salas_v3";

export const SALA_VAZIA = {
  nome: "",
  bruto: "",
  despesasExtras: "",
  despesas: "",
  cartao: "",
  taxa: "",
};

export function hojeISO() {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();
  return `${ano}-${mes}-${dia}`;
}

export function criarEstadoInicialSalas() {
  return {
    dataDe: "",
    dataAte: "",
    salas: [],
  };
}

export function normalizarSala(sala = {}) {
  return {
    ...SALA_VAZIA,
    ...sala,
  };
}

export function carregarCalculoSalasLocal() {
  const estadoInicial = criarEstadoInicialSalas();

  if (typeof window === "undefined") {
    return estadoInicial;
  }

  try {
    const bruto = window.localStorage.getItem(CALCULO_SALAS_STORAGE_KEY);
    if (!bruto) return estadoInicial;

    const salvo = JSON.parse(bruto);

    return {
      dataDe: salvo?.dataDe || "",
      dataAte: salvo?.dataAte || "",
      salas: Array.isArray(salvo?.salas) ? salvo.salas.map(normalizarSala) : [],
    };
  } catch {
    return estadoInicial;
  }
}

export function salvarCalculoSalasLocal(estado) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CALCULO_SALAS_STORAGE_KEY, JSON.stringify(estado));
}

export function limparStorageCalculoSalas() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CALCULO_SALAS_STORAGE_KEY);
}

export function parseCentavosComSinal(valor) {
  if (valor === null || valor === undefined) return 0;

  const texto = String(valor).trim();
  if (!texto) return 0;

  const negativo = texto.includes("-");
  const digitos = somenteDigitos(texto);
  if (!digitos) return 0;

  const numero = Number(digitos) / 100;
  return negativo ? -numero : numero;
}

export function formatarEntradaMonetaria(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  if (texto === "-") return "-";

  const negativo = texto.includes("-");
  const digitos = somenteDigitos(texto);
  if (!digitos) return "";

  const numero = Number(digitos) / 100;
  const formatado = numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return negativo && numero !== 0 ? `-${formatado}` : formatado;
}

export function formatarDataBR(iso) {
  if (!iso) return "__/__/____";
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function calcularResultadoSala(sala) {
  const bruto = parseCentavosComSinal(sala.bruto);
  const despesasExtras = parseCentavosComSinal(sala.despesasExtras);
  const despesas = parseCentavosComSinal(sala.despesas);
  const cartao = parseCentavosComSinal(sala.cartao);
  const taxa = parseCentavosComSinal(sala.taxa);

  if (!bruto && !despesasExtras && !despesas && !cartao && !taxa) return 0;

  const taxaCartao = cartao * 0.06;
  const brutoLiquido = bruto - despesasExtras;

  if (brutoLiquido < 0) {
    return brutoLiquido - despesas - taxaCartao - taxa;
  }

  const metade = brutoLiquido / 2;
  const comDezPorCento = metade * 1.1;

  return comDezPorCento - despesas - taxaCartao - taxa;
}

export function calcularPipoPass(resultado) {
  const terco = resultado / 3;
  return {
    pipo: terco * 2,
    pass: terco,
  };
}

export function calcularResumoSala(sala) {
  const resultado = calcularResultadoSala(sala);
  const valores = {
    bruto: parseCentavosComSinal(sala.bruto),
    despesasExtras: parseCentavosComSinal(sala.despesasExtras),
    despesas: parseCentavosComSinal(sala.despesas),
    cartao: parseCentavosComSinal(sala.cartao),
    taxa: parseCentavosComSinal(sala.taxa),
  };

  return {
    ...valores,
    resultado,
    ...calcularPipoPass(resultado),
  };
}

export function calcularTotalGeralSalas(salas) {
  return salas.reduce((total, sala) => total + calcularResultadoSala(sala), 0);
}
