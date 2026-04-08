export function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

export function formatarMoedaDigitada(valor) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return "";

  const numero = Number(digitos) / 100;

  return numero.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function numeroDeMoeda(texto) {
  if (!texto) return 0;

  const numero = Number(String(texto).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

export function moedaBR(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarMoedaSemSimbolo(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function classeValor(valor) {
  if (valor > 0) return "positivo";
  if (valor < 0) return "negativo";
  return "";
}

export function valorComSinal(valor) {
  if (valor < 0) return `-${moedaBR(Math.abs(valor))}`;
  return moedaBR(valor);
}