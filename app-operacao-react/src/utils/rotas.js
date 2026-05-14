const DIAS_ORDEM = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

export const DIAS_SEMANA = [
  { id: "segunda", nome: "Segunda", curto: "Seg" },
  { id: "terca", nome: "Terça", curto: "Ter" },
  { id: "quarta", nome: "Quarta", curto: "Qua" },
  { id: "quinta", nome: "Quinta", curto: "Qui" },
  { id: "sexta", nome: "Sexta", curto: "Sex" },
  { id: "sabado", nome: "Sábado", curto: "Sáb" },
  { id: "domingo", nome: "Domingo", curto: "Dom" },
];

export const DIAS_PADRAO_ROTAS = ["segunda", "terca", "quarta", "quinta", "sexta"];

export const CASA_PADRAO = {
  nome: "",
  cep: "",
  numero: "",
  semNumero: false,
  enderecoSelecionado: "",
  latitude: "",
  longitude: "",
};

const PLUS_CODE_ALFABETO = "23456789CFGHJMPQRVWX";
const PLUS_CODE_SEPARATOR = "+";
const PLUS_CODE_RESOLUCOES = [20, 1, 0.05, 0.0025, 0.000125];
const PLUS_CODE_GRID_LINHAS = 5;
const PLUS_CODE_GRID_COLUNAS = 4;

export function gerarIdRota() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `rota-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizarTexto(valor) {
  return String(valor || "").trim();
}

export function limparCep(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 8);
}

export function formatarCep(valor) {
  const cep = limparCep(valor);
  if (cep.length <= 5) return cep;
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

export function normalizarNumero(valor) {
  const texto = String(valor ?? "").replace(",", ".").trim();
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

export function normalizarPonto(ponto) {
  return {
    id: ponto.id || gerarIdRota(),
    nome: normalizarTexto(ponto.nome).toLocaleUpperCase("pt-BR"),
    cep: formatarCep(ponto.cep),
    numero: normalizarTexto(ponto.numero),
    semNumero: Boolean(ponto.semNumero),
    plusCode: normalizarTexto(ponto.plusCode),
    logradouro: normalizarTexto(ponto.logradouro),
    bairro: normalizarTexto(ponto.bairro),
    cidade: normalizarTexto(ponto.cidade || ponto.localidade),
    uf: normalizarTexto(ponto.uf),
    linkMaps: normalizarTexto(ponto.linkMaps || ponto.link || ponto.url),
    referenciaLocal: normalizarTexto(ponto.referenciaLocal),
    enderecoSelecionado: normalizarTexto(ponto.enderecoSelecionado || ponto.endereco),
    latitude: normalizarTexto(ponto.latitude),
    longitude: normalizarTexto(ponto.longitude),
    numeroConfirmado: ponto.numeroConfirmado,
    ajusteManual: Boolean(ponto.ajusteManual),
    revisarFuncionamento: Boolean(ponto.revisarFuncionamento),
    diasFuncionamento: Array.isArray(ponto.diasFuncionamento)
      ? ponto.diasFuncionamento.filter((dia) => DIAS_ORDEM.includes(dia))
      : [],
    horarioAbertura: ponto.horarioAbertura || "",
    horarioFechamento: ponto.horarioFechamento || "",
  };
}

export function pontoTemCoordenadas(ponto) {
  return (
    normalizarNumero(ponto?.latitude) !== null &&
    normalizarNumero(ponto?.longitude) !== null
  );
}

function limitarLatitude(latitude) {
  return Math.min(90, Math.max(-90, latitude));
}

function normalizarLongitude(longitude) {
  let lng = longitude;
  while (lng < -180) lng += 360;
  while (lng >= 180) lng -= 360;
  return lng;
}

function extrairPlusCode(texto) {
  const valor = normalizarTexto(texto).toUpperCase();
  const encontrado = valor.match(/[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,}/i);
  return encontrado ? encontrado[0].toUpperCase() : "";
}

function removerAcentos(texto) {
  return normalizarTexto(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function codificarPlusCodeReferencia(latitude, longitude) {
  let lat = limitarLatitude(latitude);
  let lng = normalizarLongitude(longitude);
  if (lat === 90) lat -= 0.000001;

  let latValor = lat + 90;
  let lngValor = lng + 180;
  let codigo = "";

  PLUS_CODE_RESOLUCOES.forEach((resolucao) => {
    const latDigito = Math.floor(latValor / resolucao);
    const lngDigito = Math.floor(lngValor / resolucao);

    codigo += PLUS_CODE_ALFABETO[latDigito] + PLUS_CODE_ALFABETO[lngDigito];
    latValor -= latDigito * resolucao;
    lngValor -= lngDigito * resolucao;
  });

  return `${codigo.slice(0, 8)}${PLUS_CODE_SEPARATOR}${codigo.slice(8)}`;
}

function completarPlusCodeLocal(plusCode, referencia) {
  const codigo = plusCode.toUpperCase();
  const posicaoSeparador = codigo.indexOf(PLUS_CODE_SEPARATOR);
  if (posicaoSeparador >= 8) return codigo;

  const latRef = normalizarNumero(referencia?.latitude);
  const lngRef = normalizarNumero(referencia?.longitude);
  if (latRef === null || lngRef === null) {
    throw new Error("Valide o endereco ou ajuste uma referencia antes de usar um Plus Code curto.");
  }

  const codigoReferencia = codificarPlusCodeReferencia(latRef, lngRef).replace(PLUS_CODE_SEPARATOR, "");
  const codigoCurto = codigo.replace(PLUS_CODE_SEPARATOR, "");
  const prefixo = codigoReferencia.slice(0, 8 - posicaoSeparador);
  const completo = `${prefixo}${codigoCurto}`;

  return `${completo.slice(0, 8)}${PLUS_CODE_SEPARATOR}${completo.slice(8)}`;
}

export function aplicarPlusCode(texto, referencia = {}) {
  const plusCode = extrairPlusCode(texto);
  if (!plusCode) {
    throw new Error("Informe um Plus Code valido, como 6X33+WH8.");
  }

  const completo = completarPlusCodeLocal(plusCode, referencia);
  const codigo = completo.replace(PLUS_CODE_SEPARATOR, "");
  let latitudeMin = -90;
  let longitudeMin = -180;
  let latitudeMax = 90;
  let longitudeMax = 180;
  const pares = Math.min(10, Math.floor(codigo.length / 2) * 2);

  for (let index = 0; index < pares; index += 2) {
    const resolucao = PLUS_CODE_RESOLUCOES[index / 2];
    const latDigito = PLUS_CODE_ALFABETO.indexOf(codigo[index]);
    const lngDigito = PLUS_CODE_ALFABETO.indexOf(codigo[index + 1]);

    if (latDigito < 0 || lngDigito < 0) {
      throw new Error("Plus Code invalido.");
    }

    latitudeMin += latDigito * resolucao;
    longitudeMin += lngDigito * resolucao;
    latitudeMax = latitudeMin + resolucao;
    longitudeMax = longitudeMin + resolucao;
  }

  let latResolucao = PLUS_CODE_RESOLUCOES[PLUS_CODE_RESOLUCOES.length - 1];
  let lngResolucao = PLUS_CODE_RESOLUCOES[PLUS_CODE_RESOLUCOES.length - 1];

  for (let index = 10; index < codigo.length; index += 1) {
    const digito = PLUS_CODE_ALFABETO.indexOf(codigo[index]);
    if (digito < 0) throw new Error("Plus Code invalido.");

    latResolucao /= PLUS_CODE_GRID_LINHAS;
    lngResolucao /= PLUS_CODE_GRID_COLUNAS;

    const linha = Math.floor(digito / PLUS_CODE_GRID_COLUNAS);
    const coluna = digito % PLUS_CODE_GRID_COLUNAS;

    latitudeMin += linha * latResolucao;
    longitudeMin += coluna * lngResolucao;
    latitudeMax = latitudeMin + latResolucao;
    longitudeMax = longitudeMin + lngResolucao;
  }

  return {
    plusCode,
    latitude: String((latitudeMin + latitudeMax) / 2),
    longitude: String((longitudeMin + longitudeMax) / 2),
    ajusteManual: true,
  };
}

export async function localizarPlusCode(texto, referencia = {}) {
  try {
    return aplicarPlusCode(texto, referencia);
  } catch (error) {
    const plusCode = extrairPlusCode(texto);
    const contexto = normalizarTexto(String(texto || "").replace(plusCode, ""));

    if (!plusCode) throw error;

    if (!contexto) throw error;

    const consultas = [
      contexto,
      [contexto, "Brasil"].join(", "),
      removerAcentos(contexto),
      [removerAcentos(contexto), "Brasil"].join(", "),
    ];

    let referenciaContexto = null;

    for (const consulta of consultas) {
      referenciaContexto = await buscarCoordenadasNominatim({ q: consulta }, consulta);
      if (referenciaContexto) break;
    }

    if (!referenciaContexto) throw error;

    return aplicarPlusCode(plusCode, referenciaContexto);
  }
}

function campoEndereco(address = {}, nomes) {
  for (const nome of nomes) {
    const valor = normalizarTexto(address[nome]);
    if (valor) return valor;
  }

  return "";
}

function extrairNumeroEnderecoTexto(texto) {
  const partes = normalizarTexto(texto).split(",").map((parte) => parte.trim());
  const numero = partes.find((parte) => /^\d{1,6}[A-Z]?$/i.test(parte));
  return numero || "";
}

export async function buscarEnderecoPorCoordenadas(ponto) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);

  if (lat === null || lng === null) return {};

  const params = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
  });

  let dados = null;

  try {
    const resposta = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!resposta.ok) return {};
    dados = await resposta.json();
  } catch {
    return {};
  }

  const address = dados?.address || {};
  const numero = campoEndereco(address, ["house_number"]) || extrairNumeroEnderecoTexto(dados?.display_name);
  const logradouro = campoEndereco(address, ["road", "pedestrian", "footway", "path", "residential"]);
  const bairro = campoEndereco(address, ["suburb", "neighbourhood", "quarter", "city_district"]);
  const cidade = campoEndereco(address, ["city", "town", "municipality", "village"]);
  const uf = campoEndereco(address, ["state"]);
  const cep = formatarCep(campoEndereco(address, ["postcode"]));
  const enderecoSelecionado = [
    [logradouro, numero].filter(Boolean).join(", "),
    bairro,
    cidade,
    uf,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    cep,
    numero,
    logradouro,
    bairro,
    cidade,
    uf,
    enderecoSelecionado: enderecoSelecionado || normalizarTexto(dados?.display_name),
  };
}

export function calcularDistanciaKm(origem, destino) {
  const lat1 = normalizarNumero(origem?.latitude);
  const lon1 = normalizarNumero(origem?.longitude);
  const lat2 = normalizarNumero(destino?.latitude);
  const lon2 = normalizarNumero(destino?.longitude);

  if ([lat1, lon1, lat2, lon2].some((valor) => valor === null)) {
    return Infinity;
  }

  const raioTerraKm = 6371;
  const grausParaRad = (graus) => (graus * Math.PI) / 180;
  const dLat = grausParaRad(lat2 - lat1);
  const dLon = grausParaRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(grausParaRad(lat1)) *
      Math.cos(grausParaRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return raioTerraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatarDistancia(distanciaKm) {
  if (!Number.isFinite(distanciaKm)) return "-";
  if (distanciaKm < 1) return `${Math.round(distanciaKm * 1000)} m`;
  return `${distanciaKm.toFixed(1).replace(".", ",")} km`;
}

export function abrirWazeUrl(ponto) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);

  if (lat === null || lng === null) return "";

  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function abrirMapsUrl(ponto) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);

  if (ponto?.linkMaps) return ponto.linkMaps;
  if (lat === null || lng === null) return "";

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function abrirBuscaMapsUrl(texto, contexto = {}) {
  const partes = [
    normalizarTexto(texto),
    contexto.bairro,
    contexto.cidade || contexto.localidade,
    contexto.uf,
    "Brasil",
  ].filter(Boolean);

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(", "))}`;
}

function horarioParaMinutos(horario) {
  const partes = String(horario || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!partes) return null;

  const horas = Number(partes[1]);
  const minutos = Number(partes[2]);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;

  return horas * 60 + minutos;
}

function minutosParaHorario(totalMinutos) {
  if (!Number.isFinite(totalMinutos)) return "";
  const minutosDia = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutos)));
  const horas = String(Math.floor(minutosDia / 60)).padStart(2, "0");
  const minutos = String(minutosDia % 60).padStart(2, "0");
  return `${horas}:${minutos}`;
}

function aberturaMinutos(ponto) {
  return horarioParaMinutos(ponto?.horarioAbertura) ?? 0;
}

function centroidePontos(pontos) {
  const coordenados = pontos.filter(pontoTemCoordenadas);
  if (!coordenados.length) return null;

  const soma = coordenados.reduce(
    (total, ponto) => ({
      latitude: total.latitude + normalizarNumero(ponto.latitude),
      longitude: total.longitude + normalizarNumero(ponto.longitude),
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: String(soma.latitude / coordenados.length),
    longitude: String(soma.longitude / coordenados.length),
  };
}

function pontoRepresentanteArea(area) {
  return area.centro || area.pontos[0];
}

function agruparPorArea(pontos, raioKm = 2.5) {
  const areas = [];

  pontos.forEach((ponto) => {
    let melhorArea = null;
    let melhorDistancia = Infinity;

    areas.forEach((area) => {
      const distancia = calcularDistanciaKm(ponto, pontoRepresentanteArea(area));
      if (distancia < melhorDistancia) {
        melhorArea = area;
        melhorDistancia = distancia;
      }
    });

    if (melhorArea && melhorDistancia <= raioKm) {
      melhorArea.pontos.push(ponto);
      melhorArea.centro = centroidePontos(melhorArea.pontos);
      return;
    }

    areas.push({
      id: `area-${areas.length + 1}`,
      pontos: [ponto],
      centro: { latitude: ponto.latitude, longitude: ponto.longitude },
    });
  });

  return areas.map((area, index) => ({
    ...area,
    id: `area-${index + 1}`,
    nome: `Area ${index + 1}`,
    aberturaReferencia: Math.max(...area.pontos.map(aberturaMinutos)),
  }));
}

function escolherProximaArea(areas, pontoAtual) {
  let melhorIndice = 0;
  let melhorPontuacao = Infinity;

  areas.forEach((area, index) => {
    const distancia = calcularDistanciaKm(pontoAtual, pontoRepresentanteArea(area));
    const pontuacao = distancia + area.aberturaReferencia / 240;

    if (pontuacao < melhorPontuacao) {
      melhorIndice = index;
      melhorPontuacao = pontuacao;
    }
  });

  return melhorIndice;
}

function ordenarPontosDaArea(area, origemArea, horarioAtual) {
  const pendentes = area.pontos.map((ponto) => ({ ...ponto }));
  const ordenados = [];
  let pontoAtual = origemArea;
  let relogio = Math.max(horarioAtual, area.aberturaReferencia);

  while (pendentes.length > 0) {
    let melhorIndice = 0;
    let melhorPontuacao = Infinity;

    pendentes.forEach((ponto, index) => {
      const distancia = calcularDistanciaKm(pontoAtual, ponto);
      const abertura = aberturaMinutos(ponto);
      const espera = Math.max(0, abertura - relogio);
      const pontuacao = distancia + espera / 45;

      if (pontuacao < melhorPontuacao) {
        melhorIndice = index;
        melhorPontuacao = pontuacao;
      }
    });

    const [proximo] = pendentes.splice(melhorIndice, 1);
    const distanciaAnteriorKm = calcularDistanciaKm(pontoAtual, proximo);
    const abertura = aberturaMinutos(proximo);
    relogio = Math.max(relogio, abertura);

    ordenados.push({
      ...proximo,
      areaRota: area.nome,
      horarioSugerido: minutosParaHorario(relogio),
      distanciaAnteriorKm,
      distanciaRotaKm: distanciaAnteriorKm,
    });

    relogio += 25;
    pontoAtual = proximo;
  }

  return {
    pontos: ordenados,
    pontoFinal: pontoAtual,
    horarioFinal: relogio,
  };
}

export function ordenarPorProximidade(pontos, origem) {
  const areasPendentes = agruparPorArea(
    pontos.filter(pontoTemCoordenadas).map((ponto) => ({ ...ponto }))
  );
  const rota = [];
  let pontoAtual = origem;
  let horarioAtual = 8 * 60;

  while (areasPendentes.length > 0) {
    const indiceArea = escolherProximaArea(areasPendentes, pontoAtual);
    const [area] = areasPendentes.splice(indiceArea, 1);
    const trecho = ordenarPontosDaArea(area, pontoAtual, horarioAtual);

    trecho.pontos.forEach((ponto) => {
      rota.push({
        ...ponto,
        distanciaCasaKm: calcularDistanciaKm(origem, ponto),
      });
    });

    pontoAtual = trecho.pontoFinal;
    horarioAtual = trecho.horarioFinal;
  }

  return rota;
}

export function gerarPlanoDeRotas({ pontos, origem, diasDisponiveis, limitePorDia = 20 }) {
  const diasValidos = DIAS_ORDEM.filter((dia) => diasDisponiveis.includes(dia));
  const limiteNormalizado = Math.max(1, Math.floor(Number(limitePorDia) || 20));
  const pontosValidos = pontos
    .map(normalizarPonto)
    .filter((ponto) => ponto.nome && pontoTemCoordenadas(ponto));

  const usados = new Set();

  return diasValidos.map((dia) => {
    const candidatos = pontosValidos.filter(
      (ponto) => !usados.has(ponto.id) && ponto.diasFuncionamento.includes(dia)
    );

    const rota = ordenarPorProximidade(candidatos, origem).slice(0, limiteNormalizado);
    rota.forEach((ponto) => usados.add(ponto.id));

    const distanciaTotalKm = rota.reduce(
      (total, ponto) => total + (Number.isFinite(ponto.distanciaRotaKm) ? ponto.distanciaRotaKm : 0),
      0
    );

    return {
      dia,
      nomeDia: DIAS_SEMANA.find((item) => item.id === dia)?.nome || dia,
      pontos: rota,
      distanciaTotalKm,
    };
  });
}

const cacheDistanciaRota = new Map();

function montarChaveRota(origem, destino) {
  const lat1 = normalizarNumero(origem?.latitude);
  const lng1 = normalizarNumero(origem?.longitude);
  const lat2 = normalizarNumero(destino?.latitude);
  const lng2 = normalizarNumero(destino?.longitude);

  if ([lat1, lng1, lat2, lng2].some((valor) => valor === null)) {
    return "";
  }

  return `${lat1},${lng1}->${lat2},${lng2}`;
}

export async function calcularDistanciaTrajetoKm(origem, destino) {
  const lat1 = normalizarNumero(origem?.latitude);
  const lng1 = normalizarNumero(origem?.longitude);
  const lat2 = normalizarNumero(destino?.latitude);
  const lng2 = normalizarNumero(destino?.longitude);

  if ([lat1, lng1, lat2, lng2].some((valor) => valor === null)) {
    return Infinity;
  }

  const chave = montarChaveRota(origem, destino);
  if (chave && cacheDistanciaRota.has(chave)) {
    return cacheDistanciaRota.get(chave);
  }

  try {
    const params = new URLSearchParams({
      overview: "false",
      alternatives: "false",
      steps: "false",
    });

    const resposta = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?${params.toString()}`
    );

    if (!resposta.ok) {
      throw new Error("Falha ao calcular trajeto");
    }

    const dados = await resposta.json();
    const metros = dados?.routes?.[0]?.distance;
    const distanciaKm = Number(metros) / 1000;

    if (Number.isFinite(distanciaKm) && distanciaKm > 0) {
      if (chave) cacheDistanciaRota.set(chave, distanciaKm);
      return distanciaKm;
    }
  } catch {
    // Fallback silencioso para distância em linha reta.
  }

  const fallback = calcularDistanciaKm(origem, destino);
  if (chave && Number.isFinite(fallback)) {
    cacheDistanciaRota.set(chave, fallback);
  }
  return fallback;
}

export async function enriquecerPlanoComDistanciasReais(plano, origem) {
  const dias = await Promise.all(
    (plano || []).map(async (dia) => {
      let pontoAnterior = origem;
      let distanciaTotalKm = 0;

      const pontos = await Promise.all(
        (dia.pontos || []).map(async (ponto) => {
          const distanciaAnteriorKm = await calcularDistanciaTrajetoKm(pontoAnterior, ponto);
          const distanciaCasaKm = await calcularDistanciaTrajetoKm(origem, ponto);

          if (Number.isFinite(distanciaAnteriorKm)) {
            distanciaTotalKm += distanciaAnteriorKm;
          }

          pontoAnterior = ponto;

          return {
            ...ponto,
            distanciaAnteriorKm,
            distanciaCasaKm,
            distanciaRotaKm: distanciaAnteriorKm,
          };
        })
      );

      return {
        ...dia,
        pontos,
        distanciaTotalKm,
      };
    })
  );

  return dias;
}


export function coordenadasParaTexto(ponto) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);
  if (lat === null || lng === null) return "";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function dmsParaDecimal(graus, minutos = 0, segundos = 0, direcao = "") {
  let decimal = Math.abs(Number(graus)) + Number(minutos || 0) / 60 + Number(segundos || 0) / 3600;
  const dir = String(direcao || "").toUpperCase();
  if (dir === "S" || dir === "W" || Number(graus) < 0) decimal *= -1;
  return decimal;
}

export function extrairCoordenadasTexto(texto) {
  const valor = String(texto || "").trim();
  if (!valor) return null;

  const decimal = valor.match(/(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)/);
  if (decimal) {
    const latitude = Number(decimal[1].replace(",", "."));
    const longitude = Number(decimal[2].replace(",", "."));
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude: String(latitude), longitude: String(longitude) };
    }
  }

  const dms = [
    ...valor.matchAll(/(\d{1,3})[°º]\s*(\d{1,2})['’]\s*(\d{1,2}(?:[.,]\d+)?)["”]?\s*([NSEW])/gi),
  ];

  if (dms.length >= 2) {
    const primeira = dms[0];
    const segunda = dms[1];
    const lat = dmsParaDecimal(primeira[1], primeira[2], primeira[3].replace(",", "."), primeira[4]);
    const lng = dmsParaDecimal(segunda[1], segunda[2], segunda[3].replace(",", "."), segunda[4]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: String(lat), longitude: String(lng) };
    }
  }

  return null;
}

export function montarMapaEmbedUrl(ponto, zoom = 16) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);
  if (lat === null || lng === null) return "";

  const delta = zoom >= 17 ? 0.0025 : 0.006;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
  const marker = `${lat},${lng}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

export function moverCoordenada(ponto, direcao, passo = 0.0003) {
  const lat = normalizarNumero(ponto?.latitude);
  const lng = normalizarNumero(ponto?.longitude);
  if (lat === null || lng === null) return ponto;

  const ajustes = {
    norte: { latitude: lat + passo, longitude: lng },
    sul: { latitude: lat - passo, longitude: lng },
    leste: { latitude: lat, longitude: lng + passo },
    oeste: { latitude: lat, longitude: lng - passo },
  };

  const proxima = ajustes[direcao] || { latitude: lat, longitude: lng };
  return {
    ...ponto,
    latitude: String(proxima.latitude),
    longitude: String(proxima.longitude),
    ajusteManual: true,
  };
}

async function buscarCepBrasilApi(cepLimpo) {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`);
  if (!resposta.ok) return null;

  const dados = await resposta.json();
  const latitude = dados?.location?.coordinates?.latitude;
  const longitude = dados?.location?.coordinates?.longitude;

  return {
    cep: formatarCep(dados.cep || cepLimpo),
    logradouro: normalizarTexto(dados.street),
    bairro: normalizarTexto(dados.neighborhood),
    cidade: normalizarTexto(dados.city),
    uf: normalizarTexto(dados.state),
    latitude: latitude === undefined || latitude === null ? "" : String(latitude),
    longitude: longitude === undefined || longitude === null ? "" : String(longitude),
    fonte: "BrasilAPI",
  };
}

async function buscarCepViaCep(cepLimpo) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  if (!resposta.ok) return null;

  const dados = await resposta.json();
  if (dados.erro) return null;

  return {
    cep: formatarCep(dados.cep || cepLimpo),
    logradouro: normalizarTexto(dados.logradouro),
    bairro: normalizarTexto(dados.bairro),
    cidade: normalizarTexto(dados.localidade),
    uf: normalizarTexto(dados.uf),
    latitude: "",
    longitude: "",
    fonte: "ViaCEP",
  };
}

function montarEnderecoTexto(endereco, numero = "") {
  return [
    [endereco.logradouro, normalizarTexto(numero)].filter(Boolean).join(", "),
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

function numeroEnderecoConfere(item, numero) {
  const numeroLimpo = normalizarTexto(numero);
  if (!numeroLimpo) return true;

  const numeroMapa = normalizarTexto(item?.address?.house_number);
  if (numeroMapa && numeroMapa === numeroLimpo) return true;

  return false;
}

async function buscarCoordenadasNominatim(parametros, descricaoFallback = "", numero = "") {
  const params = new URLSearchParams({
    format: "json",
    limit: "8",
    countrycodes: "br",
    addressdetails: "1",
    ...parametros,
  });

  const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!resposta.ok) return null;

  const dados = await resposta.json();
  const itens = Array.isArray(dados) ? dados : [];
  const item = normalizarTexto(numero)
    ? itens.find((resultado) => numeroEnderecoConfere(resultado, numero)) || itens[0]
    : itens[0];
  if (!item?.lat || !item?.lon) return null;

  return {
    latitude: String(item.lat),
    longitude: String(item.lon),
    enderecoMapa: item.display_name || descricaoFallback,
    numeroConfirmado: numeroEnderecoConfere(item, numero),
  };
}

function montarContextoReferencia(base = {}) {
  return [base.bairro, base.cidade || base.localidade, base.uf, "Brasil"].filter(Boolean).join(", ");
}

function normalizarCandidatoReferencia(item) {
  if (!item?.lat || !item?.lon) return null;

  return {
    latitude: String(item.lat),
    longitude: String(item.lon),
    descricao: normalizarTexto(item.display_name),
  };
}

export async function buscarReferenciasLocalizacao({ texto, base }) {
  const referencia = normalizarTexto(texto);
  if (!referencia) {
    throw new Error("Informe uma referencia para buscar no mapa.");
  }

  const contexto = montarContextoReferencia(base);
  const consultas = [
    [referencia, contexto].filter(Boolean).join(", "),
    [referencia, base?.cidade || base?.localidade, base?.uf, "Brasil"].filter(Boolean).join(", "),
    [referencia, "Sao Goncalo", "RJ", "Brasil"].join(", "),
  ];

  const vistos = new Set();
  const candidatos = [];

  for (const consulta of consultas) {
    const params = new URLSearchParams({
      format: "json",
      limit: "5",
      countrycodes: "br",
      addressdetails: "1",
      q: consulta,
    });

    const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!resposta.ok) continue;

    const dados = await resposta.json();
    const itens = Array.isArray(dados) ? dados : [];

    itens.forEach((item) => {
      const candidato = normalizarCandidatoReferencia(item);
      if (!candidato) return;

      const chave = `${Number(candidato.latitude).toFixed(6)},${Number(candidato.longitude).toFixed(6)}`;
      if (vistos.has(chave)) return;

      vistos.add(chave);
      candidatos.push(candidato);
    });

    if (candidatos.length > 0) break;
  }

  return candidatos.slice(0, 5);
}

async function buscarCoordenadasPorEndereco(endereco, numero) {
  const numeroLimpo = normalizarTexto(numero);
  const ruaComNumero = [numeroLimpo, endereco.logradouro].filter(Boolean).join(" ");

  const tentativas = [
    {
      params: {
        street: ruaComNumero,
        city: endereco.cidade,
        state: endereco.uf,
        country: "Brasil",
      },
      descricao: montarEnderecoTexto(endereco, numero),
    },
    {
      params: { q: montarEnderecoTexto(endereco, numero) },
      descricao: montarEnderecoTexto(endereco, numero),
    },
    {
      params: {
        street: endereco.logradouro,
        city: endereco.cidade,
        state: endereco.uf,
        country: "Brasil",
      },
      descricao: montarEnderecoTexto(endereco, ""),
    },
    {
      params: { q: montarEnderecoTexto(endereco, "") },
      descricao: montarEnderecoTexto(endereco, ""),
    },
    {
      params: { q: [endereco.cep, endereco.cidade, endereco.uf, "Brasil"].filter(Boolean).join(", ") },
      descricao: [endereco.cep, endereco.cidade, endereco.uf, "Brasil"].filter(Boolean).join(", "),
    },
  ];

  let primeiraCoordenada = null;

  for (const tentativa of tentativas) {
    const coords = await buscarCoordenadasNominatim(tentativa.params, tentativa.descricao, numeroLimpo);
    if (!coords) continue;
    if (!primeiraCoordenada) primeiraCoordenada = coords;
    if (!numeroLimpo || coords.numeroConfirmado) return coords;
  }

  return primeiraCoordenada;
}

export async function validarCepParaRota({ cep, numero = "" }) {
  const cepLimpo = limparCep(cep);
  const numeroLimpo = normalizarTexto(numero);

  if (cepLimpo.length !== 8) {
    throw new Error("Informe um CEP com 8 números.");
  }

  if (!numeroLimpo) {
    throw new Error("Informe o numero para validar o endereco.");
  }

  let endereco = null;

  try {
    endereco = await buscarCepBrasilApi(cepLimpo);
  } catch {
    endereco = null;
  }

  if (!endereco) {
    endereco = await buscarCepViaCep(cepLimpo);
  }

  if (!endereco) {
    throw new Error("Não encontrei esse CEP.");
  }

  let latitude = endereco.latitude;
  let longitude = endereco.longitude;
  let origemCoordenada = endereco.latitude && endereco.longitude ? endereco.fonte : "OpenStreetMap";
  let enderecoMapa = "";
  let numeroConfirmado = false;
  const deveRefinarPorEndereco =
    Boolean(endereco.logradouro && endereco.cidade && endereco.uf) &&
    Boolean(numeroLimpo || !latitude || !longitude);

  if (deveRefinarPorEndereco) {
    const coords = await buscarCoordenadasPorEndereco(endereco, numeroLimpo);

    if (!coords && (!latitude || !longitude)) {
      throw new Error("Achei o CEP, mas não consegui transformar em coordenada.");
    }

    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
      enderecoMapa = coords.enderecoMapa;
      origemCoordenada = "OpenStreetMap";
      numeroConfirmado = Boolean(coords.numeroConfirmado);
    }
  }

  const enderecoSelecionado = montarEnderecoTexto(endereco, numeroLimpo);

  return {
    ...endereco,
    numero: numeroLimpo,
    latitude: String(latitude),
    longitude: String(longitude),
    enderecoSelecionado,
    enderecoMapa,
    origemCoordenada,
    numeroConfirmado,
    ajusteManual: false,
  };
}
