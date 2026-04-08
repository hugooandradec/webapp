import { formatarMoedaSemSimbolo, numeroDeMoeda } from "./money";

export const STORAGE_KEY = "fechamento_react_v1";

export const DEBITO_VAZIO = {
  ponto: "",
  valor: "",
};

export const VALE_VAZIO = {
  ponto: "",
  valorAnterior: "",
  pago: "",
  semana: "",
  valorAtual: "",
};

export function criarEstadoInicial() {
  return {
    dados: {
      periodoInicio: "",
      periodoFim: "",
      turano: "",
      rc: "",
      centro: "",
      cartaoPassado: "",
      cartaoAtual: "",
    },
    debitos: [],
    devedores: [],
  };
}

export function salvarLocalmente(payload) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // evita quebrar a aplicação
  }
}

export function lerLocalmente() {
  try {
    if (typeof window === "undefined") return null;
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function limparStorageFechamento() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // evita quebrar a aplicação
  }
}

export function calcularComissaoVisual(valorLiquidoRota) {
  if (!valorLiquidoRota) return 0;
  return (valorLiquidoRota / 0.915) * 0.085;
}

export function formatarDataBR(dataIso) {
  if (!dataIso) return "-";

  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return "-";

  return `${dia}/${mes}/${ano}`;
}

export function periodoTexto(inicio, fim) {
  if (!inicio && !fim) return "-";
  if (inicio && fim) return `${formatarDataBR(inicio)} - ${formatarDataBR(fim)}`;
  return formatarDataBR(inicio || fim);
}

export function calcularValorAtualVale(item) {
  const anterior = numeroDeMoeda(item.valorAnterior);
  const pago = numeroDeMoeda(item.pago);
  const semana = numeroDeMoeda(item.semana);

  const atual = anterior - pago + semana;
  return atual > 0 ? formatarMoedaSemSimbolo(atual) : "0,00";
}

export function calcularResumoDevedores(devedores) {
  return devedores.reduce(
    (acc, item) => {
      const anterior = numeroDeMoeda(item.valorAnterior);
      const atual = numeroDeMoeda(item.valorAtual);
      const saldoSemana = anterior - atual;

      if (saldoSemana > 0) {
        acc.devAntReceb += saldoSemana;
      } else if (saldoSemana < 0) {
        acc.devedores += Math.abs(saldoSemana);
      }

      acc.lista.push({
        ...item,
        saldoSemana,
      });

      return acc;
    },
    {
      devAntReceb: 0,
      devedores: 0,
      lista: [],
    }
  );
}

export function calcularTotaisFechamento({ dados, debitos, resumoDevedores }) {
  const totalRota =
    numeroDeMoeda(dados.turano) +
    numeroDeMoeda(dados.rc) +
    numeroDeMoeda(dados.centro);

  const comissao = calcularComissaoVisual(totalRota);
  const cartaoPassadoLiquido = numeroDeMoeda(dados.cartaoPassado) * 0.95;
  const cartaoAtual = numeroDeMoeda(dados.cartaoAtual);

  const totalDebitos = debitos.reduce((acc, item) => {
    return acc + numeroDeMoeda(item.valor);
  }, 0);

  const totalDevedores = resumoDevedores.devedores;
  const devAntReceb = resumoDevedores.devAntReceb;
  const debitosMaisDevedores = totalDebitos + totalDevedores;

  const firma =
    totalRota -
    debitosMaisDevedores -
    cartaoAtual +
    cartaoPassadoLiquido +
    devAntReceb;

  return {
    totalRota,
    comissao,
    cartaoPassadoLiquido,
    cartaoAtual,
    totalDebitos,
    totalDevedores,
    devAntReceb,
    debitosMaisDevedores,
    firma,
    totalRotasResumo: totalRota,
    cartaoAnteriorResumo: cartaoPassadoLiquido,
    cartaoAtualResumo: -cartaoAtual,
    debitosResumo: -totalDebitos,
    valesResumo: -totalDevedores,
    valesPagosResumo: devAntReceb,
    firmaResumo: firma,
  };
}