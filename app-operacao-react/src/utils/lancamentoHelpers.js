export const APP_STORAGE_KEY = "app_operacao_lancamento_v1";

export const EMPTY_FORM_ENTRADA = {
  aberto: false,
  editIndex: null,
  pontoOriginal: "",
  ponto: "",
  dinheiro: "",
  saida: "",
};

export function gerarId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function getHojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function normalizarTexto(valor = "") {
  return String(valor).trim();
}

export function normalizarPonto(valor = "") {
  return normalizarTexto(valor).toLowerCase();
}

export function normalizarCaixa(valor = "") {
  return normalizarTexto(valor).toLowerCase();
}

export function formatarNomeCaixa(valor = "") {
  const texto = normalizarTexto(valor);
  if (!texto) return "";
  return texto.replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function criarCaixaVazia() {
  return {
    data: getHojeIso(),
    valorInicial: "",
    historicoRaw: [],
  };
}

export function garantirEstrutura(dados) {
  const base = {
    caixas: [],
    caixaAtiva: "",
    dadosPorCaixa: {},
  };

  const estrutura = {
    ...base,
    ...(dados || {}),
  };

  if (!Array.isArray(estrutura.caixas)) {
    estrutura.caixas = [];
  }

  if (!estrutura.dadosPorCaixa || typeof estrutura.dadosPorCaixa !== "object") {
    estrutura.dadosPorCaixa = {};
  }

  for (const caixa of estrutura.caixas) {
    if (!estrutura.dadosPorCaixa[caixa]) {
      estrutura.dadosPorCaixa[caixa] = criarCaixaVazia();
    } else {
      estrutura.dadosPorCaixa[caixa] = {
        ...criarCaixaVazia(),
        ...estrutura.dadosPorCaixa[caixa],
        historicoRaw: Array.isArray(estrutura.dadosPorCaixa[caixa].historicoRaw)
          ? estrutura.dadosPorCaixa[caixa].historicoRaw
          : [],
      };
    }
  }

  if (estrutura.caixaAtiva && !estrutura.caixas.includes(estrutura.caixaAtiva)) {
    estrutura.caixas.push(estrutura.caixaAtiva);
    estrutura.dadosPorCaixa[estrutura.caixaAtiva] =
      estrutura.dadosPorCaixa[estrutura.caixaAtiva] || criarCaixaVazia();
  }

  return estrutura;
}

export function parseEstruturaSalva(valorSalvo) {
  if (!valorSalvo) return null;

  try {
    return JSON.parse(valorSalvo);
  } catch (error) {
    console.error("Erro ao fazer parse da estrutura salva:", error);
    return null;
  }
}

export function rebuildAgregadoFromRaw(lista = []) {
  const mapa = new Map();

  for (const item of lista) {
    const pontoKey = normalizarPonto(item.ponto);
    if (!pontoKey) continue;

    const atual = mapa.get(pontoKey) || {
      ponto: pontoKey,
      dinheiro: 0,
      saida: 0,
      cartao: 0,
      outros: 0,
    };

    atual.dinheiro += Number(item.dinheiro) || 0;
    atual.saida += Number(item.saida) || 0;
    atual.cartao += Number(item.cartao) || 0;
    atual.outros += Number(item.outros) || 0;

    mapa.set(pontoKey, atual);
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.ponto.localeCompare(b.ponto, "pt-BR")
  );
}

export function calcularResumoDoCaixa(nomeCaixa, dadosPorCaixa = {}) {
  const caixa = dadosPorCaixa[nomeCaixa] || criarCaixaVazia();
  const lista = rebuildAgregadoFromRaw(caixa.historicoRaw || []);

  const valorInicial = numeroDeMoedaTexto(caixa.valorInicial);
  const entrada = lista.reduce((soma, item) => soma + (Number(item.dinheiro) || 0), 0);
  const saida = lista.reduce((soma, item) => soma + (Number(item.saida) || 0), 0);
  const valorTotal = valorInicial + entrada - saida;

  return {
    data: caixa.data || "",
    valorInicial,
    entrada,
    saida,
    valorTotal,
  };
}

export function numeroDeMoedaTexto(valor) {
  if (typeof valor === "number") return valor;
  if (!valor) return 0;

  const limpo = String(valor)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarDataHora(timestamp) {
  if (!timestamp) return "-";

  const data = new Date(timestamp);

  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function textoDataExtenso(dataIso) {
  if (!dataIso) return "-";

  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return dataIso;

  const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);

  if (Number.isNaN(data.getTime())) return dataIso;

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
