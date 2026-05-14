import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaEdit,
  FaHome,
  FaMapMarkerAlt,
  FaPlus,
  FaRoute,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";
import { SiGooglemaps, SiWaze } from "react-icons/si";
import { useNavigate } from "react-router-dom";

import PageLayout from "../components/PageLayout";
import {
  CASA_PADRAO,
  DIAS_SEMANA,
  DIAS_PADRAO_ROTAS,
  abrirBuscaMapsUrl,
  abrirMapsUrl,
  abrirWazeUrl,
  buscarEnderecoPorCoordenadas,
  buscarReferenciasLocalizacao,
  enriquecerPlanoComDistanciasReais,
  formatarCep,
  formatarDistancia,
  gerarIdRota,
  gerarPlanoDeRotas,
  localizarPlusCode,
  normalizarNumero,
  normalizarPonto,
  pontoTemCoordenadas,
  validarCepParaRota,
} from "../utils/rotas";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/rotas.css";

const STORAGE_PONTOS = "rotasPontos";
const STORAGE_CONFIG = "rotasConfig";

const pontoInicial = {
  nome: "",
  cep: "",
  numero: "",
  semNumero: false,
  plusCode: "",
  logradouro: "",
  bairro: "",
  cidade: "",
  uf: "",
  latitude: "",
  longitude: "",
  referenciaLocal: "",
  enderecoSelecionado: "",
  diasFuncionamento: [...DIAS_PADRAO_ROTAS],
  horarioAbertura: "",
  horarioFechamento: "",
  revisarFuncionamento: true,
};

function carregarPontos() {
  try {
    const bruto = localStorage.getItem(STORAGE_PONTOS);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.map(normalizarPonto) : [];
  } catch {
    return [];
  }
}

function carregarConfig() {
  try {
    const bruto = localStorage.getItem(STORAGE_CONFIG);
    const config = bruto ? JSON.parse(bruto) : null;

    return {
      casa: { ...CASA_PADRAO, ...(config?.casa || {}) },
      diasDisponiveis: [...DIAS_PADRAO_ROTAS],
      limitePorDia: config?.limitePorDia || 20,
    };
  } catch {
    return {
      casa: { ...CASA_PADRAO },
      diasDisponiveis: [...DIAS_PADRAO_ROTAS],
      limitePorDia: 20,
    };
  }
}

function salvarPontos(pontos) {
  localStorage.setItem(STORAGE_PONTOS, JSON.stringify(pontos));
}

function salvarConfig(config) {
  localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
}

function criarPontoPartidaForm(config) {
  return {
    casa: { ...CASA_PADRAO, ...(config?.casa || {}) },
    limitePorDia: String(config?.limitePorDia || 20),
  };
}

function ResumoTopo({ totalPontos }) {
  return (
    <section className="bloco rotas-bloco rotas-intro">
      <div className="rotas-intro-copy">
        <div className="rotas-intro-cabecalho">
          <h2 className="titulo-bloco">
            <FaRoute /> Organizador de rotas
          </h2>
          <div className="rotas-resumo-mini">
            <strong>{totalPontos}</strong>
            <span>pontos cadastrados</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function IconActionLink({ href, title, children, className = "" }) {
  return (
    <a
      className={`btn-acao ${className}`.trim()}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      aria-label={title}
    >
      {children}
    </a>
  );
}

function IconActionButton({ title, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      className={`btn-acao ${className}`.trim()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function RotasModal({ title, icon, onClose, children }) {
  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <div className="rotas-modal-backdrop" role="presentation">
      <div className="rotas-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="rotas-modal-cabecalho">
          <h2 className="titulo-bloco">
            {icon} {title}
          </h2>
          <IconActionButton title="Fechar" onClick={onClose}>
            <FaTimes />
          </IconActionButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatarDiasFuncionamento(dias) {
  const diasValidos = Array.isArray(dias) ? dias : [];
  if (diasValidos.length === DIAS_PADRAO_ROTAS.length && DIAS_PADRAO_ROTAS.every((dia) => diasValidos.includes(dia))) {
    return "Seg a Sex";
  }

  return DIAS_SEMANA.filter((dia) => diasValidos.includes(dia.id))
    .map((dia) => dia.curto)
    .join(", ");
}

function pontoLocalizacaoConfiavel(ponto) {
  return pontoTemCoordenadas(ponto) && (ponto?.ajusteManual || ponto?.numeroConfirmado !== false);
}

function pontoSemNumeroConfirmado(ponto) {
  return Boolean(ponto?.semNumero) && pontoTemCoordenadas(ponto) && Boolean(ponto?.ajusteManual);
}

function normalizarFuncionamentoParaSalvar(formAtual) {
  const semDias = !formAtual.diasFuncionamento.length;
  const semAbertura = !formAtual.horarioAbertura;
  const semFechamento = !formAtual.horarioFechamento;

  return {
    diasFuncionamento: semDias ? [...DIAS_PADRAO_ROTAS] : [...formAtual.diasFuncionamento],
    horarioAbertura: semAbertura ? "10:00" : formAtual.horarioAbertura,
    horarioFechamento: semFechamento ? "22:00" : formAtual.horarioFechamento,
    revisarFuncionamento:
      Boolean(formAtual.revisarFuncionamento) || semDias || semAbertura || semFechamento,
  };
}

function textoTemPlusCode(texto) {
  return /[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,}/i.test(String(texto || ""));
}

function plusCodeSemContexto(texto) {
  const valor = String(texto || "").trim();
  return /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,}$/i.test(valor);
}

function obterLocalizacaoNavegador() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Seu navegador nao liberou localizacao. Digite a cidade junto do Plus Code."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        resolve({
          latitude: String(posicao.coords.latitude),
          longitude: String(posicao.coords.longitude),
        });
      },
      () => reject(new Error("Nao consegui usar sua localizacao. Digite a cidade junto do Plus Code.")),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  });
}

function primeiroContextoComCoordenadas(candidatos) {
  return candidatos.find((candidato) => pontoTemCoordenadas(candidato)) || null;
}

const TILE_SIZE = 256;
const MAP_ZOOM = 17;
const MAP_HEIGHT = 260;

function longitudeParaTileX(longitude, zoom) {
  return ((longitude + 180) / 360) * 2 ** zoom * TILE_SIZE;
}

function latitudeParaTileY(latitude, zoom) {
  const latRad = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    2 ** zoom *
    TILE_SIZE
  );
}

function tileXParaLongitude(x, zoom) {
  return (x / (2 ** zoom * TILE_SIZE)) * 360 - 180;
}

function tileYParaLatitude(y, zoom) {
  const n = Math.PI - (2 * Math.PI * y) / (2 ** zoom * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function MiniMapaAjuste({ ponto, titulo, onChange }) {
  const mapaRef = useRef(null);
  const [largura, setLargura] = useState(640);
  const latitude = normalizarNumero(ponto?.latitude);
  const longitude = normalizarNumero(ponto?.longitude);
  const temCoordenadas = latitude !== null && longitude !== null;

  useEffect(() => {
    const elemento = mapaRef.current;
    if (!elemento) return undefined;

    function atualizarLargura() {
      setLargura(elemento.clientWidth || 640);
    }

    atualizarLargura();
    const observer = new ResizeObserver(atualizarLargura);
    observer.observe(elemento);

    return () => observer.disconnect();
  }, []);

  if (!temCoordenadas) {
    return (
      <div className="rotas-ajuda-endereco">
        Valide o CEP para mostrar o minimapa e ajustar o marcador.
      </div>
    );
  }

  const centroX = longitudeParaTileX(longitude, MAP_ZOOM);
  const centroY = latitudeParaTileY(latitude, MAP_ZOOM);
  const inicioX = Math.floor((centroX - largura / 2) / TILE_SIZE);
  const fimX = Math.floor((centroX + largura / 2) / TILE_SIZE);
  const inicioY = Math.floor((centroY - MAP_HEIGHT / 2) / TILE_SIZE);
  const fimY = Math.floor((centroY + MAP_HEIGHT / 2) / TILE_SIZE);
  const limiteTiles = 2 ** MAP_ZOOM;
  const tiles = [];

  for (let x = inicioX; x <= fimX; x += 1) {
    for (let y = inicioY; y <= fimY; y += 1) {
      if (y < 0 || y >= limiteTiles) continue;
      const tileX = ((x % limiteTiles) + limiteTiles) % limiteTiles;
      tiles.push({
        key: `${x}-${y}`,
        src: `https://tile.openstreetmap.org/${MAP_ZOOM}/${tileX}/${y}.png`,
        left: x * TILE_SIZE - centroX + largura / 2,
        top: y * TILE_SIZE - centroY + MAP_HEIGHT / 2,
      });
    }
  }

  function ajustarPorClique(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const novoX = centroX + clickX - rect.width / 2;
    const novoY = centroY + clickY - rect.height / 2;

    onChange({
      latitude: String(tileYParaLatitude(novoY, MAP_ZOOM)),
      longitude: String(tileXParaLongitude(novoX, MAP_ZOOM)),
    });
  }

  return (
    <div className="rotas-minimapa-bloco">
      <div className="rotas-minimapa-topo">
        <strong>{titulo}</strong>
        <span>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
      </div>
      <button
        type="button"
        className="rotas-minimapa"
        onClick={ajustarPorClique}
        ref={mapaRef}
        aria-label="Clique no mapa para ajustar a localizacao"
      >
        {tiles.map((tile) => (
          <img
            alt=""
            aria-hidden="true"
            className="rotas-minimapa-tile"
            key={tile.key}
            src={tile.src}
            style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
          />
        ))}
        <span className="rotas-minimapa-marcador">
          <FaMapMarkerAlt />
        </span>
      </button>
    </div>
  );
}

function limparValidacaoPonto(novoForm) {
  return {
    ...novoForm,
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
    latitude: "",
    longitude: "",
    enderecoSelecionado: "",
  };
}

export default function Rotas({ usuario, onLogout }) {
  const navigate = useNavigate();
  const [pontos, setPontos] = useState(carregarPontos);
  const [config, setConfig] = useState(carregarConfig);
  const [pontoPartidaForm, setPontoPartidaForm] = useState(() => criarPontoPartidaForm(carregarConfig()));
  const [form, setForm] = useState(pontoInicial);
  const [mensagem, setMensagem] = useState("");
  const [mensagemPontoPartida, setMensagemPontoPartida] = useState("");
  const [validandoPonto, setValidandoPonto] = useState(false);
  const [validandoPontoPartida, setValidandoPontoPartida] = useState(false);
  const [planoComDistancias, setPlanoComDistancias] = useState([]);
  const [carregandoDistancias, setCarregandoDistancias] = useState(false);
  const [pontoPartidaAberto, setPontoPartidaAberto] = useState(false);
  const [pontoAberto, setPontoAberto] = useState(false);
  const [editandoPontoId, setEditandoPontoId] = useState(null);
  const [buscaPonto, setBuscaPonto] = useState("");
  const [buscandoReferenciaPartida, setBuscandoReferenciaPartida] = useState(false);
  const [referenciasPartida, setReferenciasPartida] = useState([]);
  const [buscandoReferenciaPonto, setBuscandoReferenciaPonto] = useState(false);
  const [referenciasPonto, setReferenciasPonto] = useState([]);
  const ultimaPartidaAutoRef = useRef("");
  const ultimoPontoAutoRef = useRef("");

  const planoBase = useMemo(
    () =>
      gerarPlanoDeRotas({
        pontos,
        origem: config.casa,
        diasDisponiveis: [...DIAS_PADRAO_ROTAS],
        limitePorDia: config.limitePorDia,
      }),
    [pontos, config]
  );

  useEffect(() => {
    let ativo = true;

    async function carregarDistancias() {
      setCarregandoDistancias(true);

      try {
        const planoEnriquecido = await enriquecerPlanoComDistanciasReais(planoBase, config.casa);
        if (ativo) {
          setPlanoComDistancias(planoEnriquecido);
        }
      } catch {
        if (ativo) {
          setPlanoComDistancias(planoBase);
        }
      } finally {
        if (ativo) {
          setCarregandoDistancias(false);
        }
      }
    }

    carregarDistancias();

    return () => {
      ativo = false;
    };
  }, [planoBase, config.casa]);

  useEffect(() => {
    const texto = pontoPartidaForm.casa.referenciaLocal || "";
    if (!pontoPartidaAberto || !textoTemPlusCode(texto) || ultimaPartidaAutoRef.current === texto) return undefined;

    const timer = setTimeout(() => {
      ultimaPartidaAutoRef.current = texto;
      buscarReferenciaPartidaAtual({ permitirGps: false });
    }, 700);

    return () => clearTimeout(timer);
    // A localizacao automatica deve reagir apenas ao texto digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontoPartidaAberto, pontoPartidaForm.casa.referenciaLocal]);

  useEffect(() => {
    const texto = form.referenciaLocal || "";
    if (!pontoAberto || !textoTemPlusCode(texto) || ultimoPontoAutoRef.current === texto) return undefined;

    const timer = setTimeout(() => {
      ultimoPontoAutoRef.current = texto;
      buscarReferenciaPontoAtual({ permitirGps: false });
    }, 700);

    return () => clearTimeout(timer);
    // A localizacao automatica deve reagir apenas ao texto digitado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontoAberto, form.referenciaLocal]);

  const pontoPartidaConfigurado = Boolean(
    config.casa.cep || config.casa.enderecoSelecionado || pontoTemCoordenadas(config.casa)
  );
  const pontosSemCoordenadas = pontos.filter((ponto) => !pontoTemCoordenadas(ponto)).length;
  const pontosFiltrados = useMemo(() => {
    const termo = buscaPonto.trim().toLowerCase();
    const ordenados = [...pontos].sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" })
    );

    if (!termo) return ordenados;

    return ordenados.filter((ponto) => {
      const alvo = [ponto.nome, ponto.enderecoSelecionado, ponto.cep].join(" ").toLowerCase();
      return alvo.includes(termo);
    });
  }, [pontos, buscaPonto]);

  function atualizarForm(campo, valor) {
    setForm((atual) => {
      let novoForm = { ...atual, [campo]: campo === "nome" ? valor.toLocaleUpperCase("pt-BR") : valor };

      if (campo === "cep") {
        novoForm.cep = formatarCep(valor);
        novoForm = limparValidacaoPonto(novoForm);
      }

      if (campo === "numero") {
        novoForm.semNumero = false;
      }

      if (campo === "horarioAbertura" || campo === "horarioFechamento") {
        novoForm.revisarFuncionamento = false;
      }

      return novoForm;
    });
  }

  function atualizarPontoPartidaForm(campo, valor) {
    setPontoPartidaForm((atual) => {
      const novaCasa = { ...atual.casa, [campo]: valor };

      if (campo === "cep") {
        novaCasa.cep = formatarCep(valor);
        novaCasa.logradouro = "";
        novaCasa.bairro = "";
        novaCasa.cidade = "";
        novaCasa.uf = "";
        novaCasa.latitude = "";
        novaCasa.longitude = "";
        novaCasa.enderecoSelecionado = "";
      }

      if (campo === "numero") {
        novaCasa.logradouro = "";
        novaCasa.bairro = "";
        novaCasa.cidade = "";
        novaCasa.uf = "";
        novaCasa.latitude = "";
        novaCasa.longitude = "";
        novaCasa.enderecoSelecionado = "";
      }

      return {
        ...atual,
        casa: novaCasa,
      };
    });
  }

  function abrirNovoPonto() {
    setMensagem("");
    setEditandoPontoId(null);
    setForm({ ...pontoInicial, diasFuncionamento: [...DIAS_PADRAO_ROTAS] });
    setReferenciasPonto([]);
    setPontoAberto(true);
  }

  function cancelarPonto() {
    setPontoAberto(false);
    setEditandoPontoId(null);
    setForm({ ...pontoInicial, diasFuncionamento: [...DIAS_PADRAO_ROTAS] });
    setReferenciasPonto([]);
    setMensagem("");
  }

  function editarPonto(ponto) {
    const pontoNormalizado = normalizarPonto(ponto);
    setMensagem("");
    setEditandoPontoId(ponto.id);
    setForm({
      ...pontoInicial,
      ...pontoNormalizado,
      diasFuncionamento:
        pontoNormalizado.diasFuncionamento.length > 0
          ? [...pontoNormalizado.diasFuncionamento]
          : [...DIAS_PADRAO_ROTAS],
    });
    setReferenciasPonto([]);
    setPontoAberto(true);
  }

  function abrirEdicaoPontoPartida() {
    setMensagemPontoPartida("");
    setPontoPartidaForm(criarPontoPartidaForm(config));
    setReferenciasPartida([]);
    setPontoPartidaAberto(true);
  }

  function cancelarPontoPartida() {
    setPontoPartidaAberto(false);
    setPontoPartidaForm(criarPontoPartidaForm(config));
    setReferenciasPartida([]);
    setMensagemPontoPartida("");
  }

  function ajustarCoordenadasPonto(coords) {
    setForm((atual) => ({
      ...atual,
      ...coords,
      ajusteManual: true,
    }));
    setMensagem("Marcador ajustado no minimapa.");
  }

  async function localizarPlusCodeComContexto(texto, candidatos, permitirGps = false) {
    const contexto = primeiroContextoComCoordenadas(candidatos);

    if (contexto) {
      return localizarPlusCode(texto, contexto);
    }

    if (plusCodeSemContexto(texto) && permitirGps) {
      const localizacaoAtual = await obterLocalizacaoNavegador();
      return localizarPlusCode(texto, localizacaoAtual);
    }

    return localizarPlusCode(texto, {});
  }

  async function buscarReferenciaPontoAtual({ permitirGps = true } = {}) {
    if (!form.referenciaLocal.trim()) {
      setMensagem("Informe um Plus Code ou referencia do local, como Portao do Rosa.");
      return;
    }

    try {
      const coords = await localizarPlusCodeComContexto(
        form.referenciaLocal,
        [form, config.casa],
        permitirGps
      );
      const endereco = await buscarEnderecoPorCoordenadas(coords);

      setForm((atual) => ({
        ...atual,
        ...endereco,
        ...coords,
        numero: endereco.numero || atual.numero,
        plusCode: coords.plusCode,
        referenciaLocal: atual.referenciaLocal,
        semNumero: !(endereco.numero || atual.numero).trim(),
      }));
      setReferenciasPonto([]);
      setMensagem("Marcador ajustado pelo Plus Code. Confira no mapa e salve.");
      return;
    } catch {
      // Se nao for Plus Code, segue como busca por referencia.
    }

    try {
      setBuscandoReferenciaPonto(true);
      const resultados = await buscarReferenciasLocalizacao({
        texto: form.referenciaLocal,
        base: form,
      });

      setReferenciasPonto(resultados);
      setMensagem(
        resultados.length
          ? "Escolha uma referencia encontrada para ajustar o marcador."
          : "Nao encontrei essa referencia no mapa. Tente outro nome do local, Plus Code ou uma rua proxima."
      );
    } catch (error) {
      setMensagem(error.message || "Nao consegui buscar essa referencia.");
    } finally {
      setBuscandoReferenciaPonto(false);
    }
  }

  async function aplicarReferenciaPonto(referencia) {
    const endereco = await buscarEnderecoPorCoordenadas(referencia);

    setForm((atual) => ({
      ...atual,
      ...endereco,
      latitude: referencia.latitude,
      longitude: referencia.longitude,
      numero: endereco.numero || atual.numero,
      ajusteManual: true,
      semNumero: !(endereco.numero || atual.numero).trim(),
    }));
    setReferenciasPonto([]);
    setMensagem("Marcador ajustado pela referencia. Confira no mapa e salve.");
  }

  function ajustarCoordenadasPontoPartida(coords) {
    setPontoPartidaForm((atual) => ({
      ...atual,
      casa: {
        ...atual.casa,
        ...coords,
        ajusteManual: true,
      },
    }));
    setMensagemPontoPartida("Marcador do ponto de partida ajustado no minimapa.");
  }

  async function buscarReferenciaPartidaAtual({ permitirGps = true } = {}) {
    const referenciaDigitada = pontoPartidaForm.casa.referenciaLocal || "";

    if (!referenciaDigitada.trim()) {
      setMensagemPontoPartida("Informe um Plus Code ou referencia do ponto de partida.");
      return;
    }

    try {
      const coords = await localizarPlusCodeComContexto(
        referenciaDigitada,
        [pontoPartidaForm.casa, config.casa],
        permitirGps
      );
      const endereco = await buscarEnderecoPorCoordenadas(coords);

      setPontoPartidaForm((atual) => ({
        ...atual,
        casa: {
          ...atual.casa,
          ...endereco,
          ...coords,
          numero: endereco.numero || atual.casa.numero,
          plusCode: coords.plusCode,
          referenciaLocal: referenciaDigitada,
        },
      }));
      setReferenciasPartida([]);
      setMensagemPontoPartida("Marcador do ponto de partida ajustado pelo Plus Code.");
      return;
    } catch {
      // Se nao for Plus Code, segue como busca por referencia.
    }

    try {
      setBuscandoReferenciaPartida(true);
      const resultados = await buscarReferenciasLocalizacao({
        texto: referenciaDigitada,
        base: pontoPartidaForm.casa,
      });

      setReferenciasPartida(resultados);
      setMensagemPontoPartida(
        resultados.length
          ? "Escolha uma referencia encontrada para ajustar o ponto de partida."
          : "Nao encontrei essa referencia no mapa. Tente outro nome do local, Plus Code ou uma rua proxima."
      );
    } catch (error) {
      setMensagemPontoPartida(error.message || "Nao consegui buscar essa referencia.");
    } finally {
      setBuscandoReferenciaPartida(false);
    }
  }

  async function aplicarReferenciaPartida(referencia) {
    const endereco = await buscarEnderecoPorCoordenadas(referencia);

    setPontoPartidaForm((atual) => ({
      ...atual,
      casa: {
        ...atual.casa,
        ...endereco,
        latitude: referencia.latitude,
        longitude: referencia.longitude,
        numero: endereco.numero || atual.casa.numero,
        ajusteManual: true,
      },
    }));
    setReferenciasPartida([]);
    setMensagemPontoPartida("Marcador do ponto de partida ajustado pela referencia.");
  }

  function alternarDiaFuncionamento(diaId) {
    setForm((atual) => {
      const diasAtuais = Array.isArray(atual.diasFuncionamento) ? atual.diasFuncionamento : [];
      const ativo = diasAtuais.includes(diaId);
      const diasFuncionamento = ativo
        ? diasAtuais.filter((dia) => dia !== diaId)
        : [...diasAtuais, diaId];

      return {
        ...atual,
        diasFuncionamento,
        revisarFuncionamento: false,
      };
    });
  }

  function alternarSemNumeroPonto() {
    setForm((atual) => ({
      ...limparValidacaoPonto(atual),
      numero: "",
      semNumero: !atual.semNumero,
    }));
    setReferenciasPonto([]);
    setMensagem("");
  }

  async function validarPontoPartidaAtual() {
    if (!pontoPartidaForm.casa.cep.trim()) {
      setMensagemPontoPartida("Informe o CEP do ponto de partida.");
      return null;
    }

    if (!pontoPartidaForm.casa.numero.trim()) {
      setMensagemPontoPartida("Informe o numero do ponto de partida.");
      return null;
    }

    try {
      setValidandoPontoPartida(true);
      const resultado = await validarCepParaRota({
        cep: pontoPartidaForm.casa.cep,
        numero: pontoPartidaForm.casa.numero,
      });

      setPontoPartidaForm((atual) => ({
        ...atual,
        casa: {
          ...atual.casa,
          ...resultado,
        },
      }));

      setMensagemPontoPartida(
        resultado.numeroConfirmado
          ? "Endereco validado com CEP e numero. Revise os dados e salve."
          : "Encontrei o CEP, mas o numero nao foi confirmado no mapa. Ajuste o marcador antes de salvar."
      );
      return resultado;
    } catch (error) {
      setMensagemPontoPartida(error.message || "Nao consegui validar o CEP do ponto de partida.");
      return null;
    } finally {
      setValidandoPontoPartida(false);
    }
  }

  async function validarPontoAtual() {
    if (!form.cep.trim()) {
      setMensagem("Informe o CEP do ponto.");
      return null;
    }

    if (!form.numero.trim() && !form.semNumero) {
      setMensagem("Informe o numero do ponto ou marque sem numero.");
      return null;
    }

    if (form.semNumero) {
      setMensagem("Para local sem numero, use Plus Code, referencia ou ajuste o marcador no mapa.");
      return null;
    }

    try {
      setValidandoPonto(true);
      const resultado = await validarCepParaRota({
        cep: form.cep,
        numero: form.numero,
      });

      setForm((atual) => ({
        ...atual,
        ...resultado,
      }));

      setMensagem(
        resultado.numeroConfirmado
          ? "Endereco validado com CEP e numero. Revise os dados e salve."
          : "Encontrei o CEP, mas o numero nao foi confirmado no mapa. Ajuste o marcador antes de salvar."
      );
      return resultado;
    } catch (error) {
      setMensagem(error.message || "Nao consegui validar esse CEP.");
      return null;
    } finally {
      setValidandoPonto(false);
    }
  }

  function salvarPontoPartida(event) {
    event.preventDefault();

    if (!pontoPartidaForm.casa.nome.trim()) {
      setMensagemPontoPartida("Informe o nome do ponto de partida.");
      return;
    }

    if (!pontoLocalizacaoConfiavel(pontoPartidaForm.casa)) {
      setMensagemPontoPartida("Localize a partida por Plus Code, referencia, CEP e numero ou ajuste o marcador.");
      return;
    }

    const novoConfig = {
      casa: {
        ...CASA_PADRAO,
        ...pontoPartidaForm.casa,
      },
      diasDisponiveis: [...DIAS_PADRAO_ROTAS],
      limitePorDia: pontoPartidaForm.limitePorDia,
    };

    setConfig(novoConfig);
    setPontoPartidaForm(criarPontoPartidaForm(novoConfig));
    salvarConfig(novoConfig);
    setPontoPartidaAberto(false);
    setMensagemPontoPartida("Ponto de partida salvo com sucesso.");
  }

  async function salvarPonto(event) {
    event.preventDefault();

    if (!form.nome.trim()) {
      setMensagem("Informe o nome do ponto.");
      return;
    }

    if (!pontoLocalizacaoConfiavel(form) && !pontoSemNumeroConfirmado(form)) {
      setMensagem(
        form.semNumero
          ? "Para local sem numero, aplique um Plus Code, referencia ou ajuste o marcador no mapa."
          : "Localize por Plus Code, referencia, CEP e numero ou ajuste o marcador no mapa."
      );
      return;
    }

    try {
      setValidandoPonto(true);
      const funcionamento = normalizarFuncionamentoParaSalvar(form);
      const resultado = pontoTemCoordenadas(form)
        ? {
            cep: form.cep,
            numero: form.numero,
            semNumero: form.semNumero,
            logradouro: form.logradouro,
            bairro: form.bairro,
            cidade: form.cidade,
            uf: form.uf,
            latitude: form.latitude,
            longitude: form.longitude,
            plusCode: form.plusCode,
            referenciaLocal: form.referenciaLocal,
            enderecoSelecionado: form.enderecoSelecionado,
          }
        : await validarCepParaRota({ cep: form.cep, numero: form.numero });

      const pontoSalvo = normalizarPonto({
        ...form,
        ...resultado,
        ...funcionamento,
        id: editandoPontoId || gerarIdRota(),
      });

      const novaLista = editandoPontoId
        ? pontos.map((item) => (item.id === editandoPontoId ? pontoSalvo : item))
        : [...pontos, pontoSalvo];

      setPontos(novaLista);
      salvarPontos(novaLista);
      setMensagem(
        funcionamento.revisarFuncionamento
          ? "Ponto salvo. Confirme dias e horarios depois."
          : editandoPontoId
            ? "Ponto atualizado com sucesso."
            : "Ponto cadastrado com sucesso."
      );
      setPontoAberto(false);
      setEditandoPontoId(null);
      setForm({ ...pontoInicial, diasFuncionamento: [...DIAS_PADRAO_ROTAS] });
    } catch (error) {
      setMensagem(error.message || "Nao consegui validar o CEP desse ponto.");
    } finally {
      setValidandoPonto(false);
    }
  }

  function removerPonto(id) {
    const novaLista = pontos.filter((ponto) => ponto.id !== id);
    setPontos(novaLista);
    salvarPontos(novaLista);
  }

  function excluirPontoPartida() {
    const novoConfig = {
      casa: { ...CASA_PADRAO },
      diasDisponiveis: [...DIAS_PADRAO_ROTAS],
      limitePorDia: 20,
    };

    setConfig(novoConfig);
    setPontoPartidaForm(criarPontoPartidaForm(novoConfig));
    salvarConfig(novoConfig);
    setPontoPartidaAberto(false);
    setMensagemPontoPartida("Ponto de partida removido.");
  }

  return (
    <PageLayout
      titulo="Rotas"
      usuario={usuario}
      onLogout={onLogout}
      mostrarVoltar
      onBack={() => navigate("/")}
      className="rotas-page"
    >
      <ResumoTopo totalPontos={pontos.length} />

      <section className="bloco rotas-bloco rotas-cadastros">
        <div className="rotas-secao-topo">
          <h2 className="titulo-bloco">Cadastros</h2>
        </div>

        <div className="rotas-topo-operacao">
          <div className="rotas-cadastro-painel">
            <div className="rotas-cadastro-titulo">
              <h3>
                <FaHome /> Partida
              </h3>
            </div>

            {pontoPartidaConfigurado ? (
              <div className="rotas-resumo-card rotas-resumo-compacto">
                <div className="rotas-resumo-principal">
                  <strong>{config.casa.nome || "Ponto de partida"}</strong>
                  <span>{config.casa.enderecoSelecionado || "Endereco validado por CEP"}</span>
                </div>

                <div className="rotas-resumo-meta">
                  <span>{config.limitePorDia} ponto(s) por dia</span>
                </div>

                <div className="rotas-card-acoes">
                  <IconActionLink href={abrirMapsUrl(config.casa)} title="Abrir no Google Maps">
                    <SiGooglemaps />
                  </IconActionLink>
                  <IconActionButton title="Editar ponto de partida" onClick={abrirEdicaoPontoPartida}>
                    <FaEdit />
                  </IconActionButton>
                  <IconActionButton
                    title="Excluir ponto de partida"
                    onClick={excluirPontoPartida}
                    className="btn-excluir"
                  >
                    <FaTrash />
                  </IconActionButton>
                </div>
              </div>
            ) : (
              <button type="button" className="rotas-botao-cadastrar-ponto" onClick={abrirEdicaoPontoPartida}>
                <FaPlus /> Adicionar ponto de partida
              </button>
            )}

            {!pontoPartidaAberto && mensagemPontoPartida ? (
              <div className="rotas-mensagem">{mensagemPontoPartida}</div>
            ) : null}
          </div>

          <div className="rotas-cadastro-painel rotas-cadastro-pontos">
            <div className="rotas-cadastro-titulo">
              <h3>
                <FaPlus /> Pontos
              </h3>
            </div>

            <button type="button" className="rotas-botao-cadastrar-ponto" onClick={abrirNovoPonto}>
              <FaPlus /> Cadastrar ponto
            </button>

            {!pontoAberto && mensagem ? <div className="rotas-mensagem">{mensagem}</div> : null}
          </div>
        </div>
      </section>

      <section className="bloco rotas-bloco">
        <h2 className="titulo-bloco">
          <FaRoute /> Plano sugerido
        </h2>

        {!pontoTemCoordenadas(config.casa) ? (
          <div className="estado-vazio">Defina o ponto de partida para calcular a ordem das rotas.</div>
        ) : null}

        {pontosSemCoordenadas > 0 ? (
          <div className="rotas-alerta">
            {pontosSemCoordenadas} ponto(s) sem coordenadas ficaram fora da rota.
          </div>
        ) : null}

        {carregandoDistancias ? (
          <div className="rotas-ajuda-endereco">Atualizando distancias reais da rota...</div>
        ) : null}

        <div className="rotas-plano">
          {planoComDistancias.map((dia) => (
            <div className="rotas-dia" key={dia.dia}>
              <div className="rotas-dia-cabecalho">
                <strong>{dia.nomeDia}</strong>
                <span>
                  {dia.pontos.length} ponto(s) · {formatarDistancia(dia.distanciaTotalKm)}
                </span>
              </div>

              {dia.pontos.length === 0 ? (
                <div className="estado-vazio rotas-vazio-dia">Nenhum ponto sugerido.</div>
              ) : (
                <ol className="rotas-lista-ordem">
                  {dia.pontos.map((ponto, index) => (
                    <li key={ponto.id}>
                      <div className="rotas-ponto-info">
                        <strong>
                          {index + 1}. {ponto.nome}
                        </strong>
                        <span>
                          {ponto.horarioAbertura || ponto.horarioFechamento
                            ? `${ponto.horarioAbertura || "--:--"} as ${ponto.horarioFechamento || "--:--"}`
                            : "Sem horario informado"}
                        </span>
                        <small>{ponto.enderecoSelecionado || "Endereco validado por CEP"}</small>
                        {ponto.areaRota || ponto.horarioSugerido ? (
                          <small>
                            {[ponto.areaRota, ponto.horarioSugerido ? `Sugerido: ${ponto.horarioSugerido}` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        ) : null}
                        {ponto.revisarFuncionamento ? (
                          <small className="rotas-aviso-funcionamento">
                            Confirmar dias e horarios
                          </small>
                        ) : null}
                        <small>
                          {index === 0 ? "Distancia do ponto de partida" : "Distancia do ponto anterior"}:{" "}
                          {formatarDistancia(ponto.distanciaAnteriorKm)}
                        </small>
                      </div>

                      <div className="rotas-acoes-ponto">
                        <IconActionLink href={abrirMapsUrl(ponto)} title="Abrir no Google Maps">
                          <SiGooglemaps />
                        </IconActionLink>
                        <IconActionLink href={abrirWazeUrl(ponto)} title="Abrir no Waze">
                          <SiWaze />
                        </IconActionLink>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bloco rotas-bloco">
        <div className="rotas-secao-topo">
          <h2 className="titulo-bloco">Pontos cadastrados</h2>
          <div className="rotas-busca">
            <FaSearch />
            <input
              type="text"
              value={buscaPonto}
              onChange={(event) => setBuscaPonto(event.target.value)}
              placeholder="Buscar ponto"
            />
          </div>
        </div>

        {pontos.length === 0 ? (
          <div className="estado-vazio">Nenhum ponto cadastrado ainda.</div>
        ) : pontosFiltrados.length === 0 ? (
          <div className="estado-vazio rotas-estado-compacto">Nenhum ponto encontrado.</div>
        ) : (
          <div className="rotas-pontos-lista">
            {pontosFiltrados.map((ponto) => (
              <div className="rotas-ponto-linha" key={ponto.id}>
                <div className="rotas-ponto-linha-main">
                  <strong>{ponto.nome}</strong>
                  <span>{ponto.enderecoSelecionado || "Endereco validado por CEP"}</span>
                </div>

                <div className="rotas-ponto-linha-meta">
                  <span>{formatarDiasFuncionamento(ponto.diasFuncionamento)}</span>
                  <span>
                    {ponto.horarioAbertura || "--:--"} as {ponto.horarioFechamento || "--:--"}
                  </span>
                  {ponto.revisarFuncionamento ? (
                    <span className="rotas-meta-alerta">Confirmar dias e horarios</span>
                  ) : null}
                </div>

                <div className="rotas-ponto-linha-acoes">
                  <IconActionButton title="Editar ponto" onClick={() => editarPonto(ponto)}>
                    <FaEdit />
                  </IconActionButton>
                  <IconActionButton
                    title="Excluir ponto"
                    onClick={() => removerPonto(ponto.id)}
                    className="btn-excluir"
                  >
                    <FaTrash />
                  </IconActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pontoPartidaAberto ? (
        <RotasModal title="Ponto de partida" icon={<FaHome />} onClose={cancelarPontoPartida}>
          <form className="rotas-form-card rotas-form-modal" onSubmit={salvarPontoPartida}>
            <div className="grid-2 rotas-grid-config">
              <div className="campo">
                <label>Nome do ponto de partida</label>
                <input
                  value={pontoPartidaForm.casa.nome || ""}
                  onChange={(event) => atualizarPontoPartidaForm("nome", event.target.value)}
                  placeholder="Ex: Casa"
                />
              </div>

              <div className="campo rotas-campo-full">
                <label>Plus Code ou referencia</label>
                <div className="rotas-referencia-busca">
                  <input
                    value={pontoPartidaForm.casa.referenciaLocal || ""}
                    onChange={(event) => atualizarPontoPartidaForm("referenciaLocal", event.target.value)}
                    placeholder="Ex: 6X33+WH8 Sao Goncalo, RJ ou nome da base"
                  />
                  <button
                    type="button"
                    className="btn btn-claro"
                    onClick={buscarReferenciaPartidaAtual}
                    disabled={buscandoReferenciaPartida}
                  >
                    <FaSearch /> {buscandoReferenciaPartida ? "Buscando..." : "Localizar partida"}
                  </button>
                </div>
                {referenciasPartida.length > 0 ? (
                  <div className="rotas-referencias-lista">
                    {referenciasPartida.map((referencia) => (
                      <button
                        type="button"
                        key={`${referencia.latitude}-${referencia.longitude}`}
                        onClick={() => aplicarReferenciaPartida(referencia)}
                      >
                        {referencia.descricao}
                      </button>
                    ))}
                  </div>
                ) : null}
                {pontoPartidaForm.casa.referenciaLocal ? (
                  <a
                    className="rotas-link-maps-busca"
                    href={abrirBuscaMapsUrl(pontoPartidaForm.casa.referenciaLocal, pontoPartidaForm.casa)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir busca no Google Maps
                  </a>
                ) : null}
              </div>

              <div className="campo">
                <label>CEP do ponto de partida</label>
                <input
                  value={pontoPartidaForm.casa.cep || ""}
                  onChange={(event) => atualizarPontoPartidaForm("cep", event.target.value)}
                  placeholder="Ex: 24320-330"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>

              <div className="campo">
                <label>Numero</label>
                <input
                  value={pontoPartidaForm.casa.numero || ""}
                  onChange={(event) => atualizarPontoPartidaForm("numero", event.target.value)}
                  placeholder="Ex: numero"
                  inputMode="numeric"
                />
              </div>

              <div className="campo">
                <label>Pontos por dia</label>
                <input
                  value={pontoPartidaForm.limitePorDia}
                  onChange={(event) =>
                    setPontoPartidaForm((atual) => ({ ...atual, limitePorDia: event.target.value }))
                  }
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="rotas-form-acoes">
              <button
                className="btn btn-claro rotas-btn-validar"
                type="button"
                onClick={validarPontoPartidaAtual}
                disabled={validandoPontoPartida}
              >
                <FaMapMarkerAlt />{" "}
                {validandoPontoPartida ? "Validando endereco..." : "Validar endereco"}
              </button>
            </div>

            {pontoTemCoordenadas(pontoPartidaForm.casa) ? (
              <>
                {pontoLocalizacaoConfiavel(pontoPartidaForm.casa) ? (
                  <div className="rotas-coordenadas-ok">
                    Ponto de partida pronto:{" "}
                    {pontoPartidaForm.casa.enderecoSelecionado || "coordenadas confirmadas"}
                  </div>
                ) : (
                  <div className="rotas-alerta">
                    Encontrei uma posicao aproximada, mas o numero nao foi confirmado. Clique no mapa para ajustar.
                  </div>
                )}
                <MiniMapaAjuste
                  ponto={pontoPartidaForm.casa}
                  titulo="Clique no mapa para corrigir o ponto de partida"
                  onChange={ajustarCoordenadasPontoPartida}
                />
              </>
            ) : (
              <div className="rotas-ajuda-endereco">Valide o CEP para confirmar o ponto de partida.</div>
            )}

            {mensagemPontoPartida ? <div className="rotas-mensagem">{mensagemPontoPartida}</div> : null}

            <div className="rotas-form-rodape">
              <button className="btn btn-roxo" type="submit">
                <FaSave /> Salvar ponto de partida
              </button>
              <button className="btn btn-claro" type="button" onClick={cancelarPontoPartida}>
                Cancelar
              </button>
            </div>
          </form>
        </RotasModal>
      ) : null}

      {pontoAberto ? (
        <RotasModal
          title={editandoPontoId ? "Editar ponto" : "Cadastrar ponto"}
          icon={<FaMapMarkerAlt />}
          onClose={cancelarPonto}
        >
          <form className="rotas-form-card rotas-form-modal" onSubmit={salvarPonto}>
            <div className="grid-2 rotas-grid-form">
              <div className="campo rotas-campo-full">
                <label>Nome do ponto</label>
                <input
                  value={form.nome}
                  onChange={(event) => atualizarForm("nome", event.target.value)}
                  placeholder="Ex: Multicenter"
                />
              </div>

              <div className="campo rotas-campo-full">
                <label>Plus Code ou referencia</label>
                <div className="rotas-referencia-busca">
                  <input
                    value={form.referenciaLocal}
                    onChange={(event) => atualizarForm("referenciaLocal", event.target.value)}
                    placeholder="Ex: 6X33+WH8 Sao Goncalo, RJ ou Portao do Rosa"
                  />
                  <button
                    type="button"
                    className="btn btn-claro"
                    onClick={buscarReferenciaPontoAtual}
                    disabled={buscandoReferenciaPonto}
                  >
                    <FaSearch /> {buscandoReferenciaPonto ? "Buscando..." : "Localizar ponto"}
                  </button>
                </div>
                {referenciasPonto.length > 0 ? (
                  <div className="rotas-referencias-lista">
                    {referenciasPonto.map((referencia) => (
                      <button
                        type="button"
                        key={`${referencia.latitude}-${referencia.longitude}`}
                        onClick={() => aplicarReferenciaPonto(referencia)}
                      >
                        {referencia.descricao}
                      </button>
                    ))}
                  </div>
                ) : null}
                {form.referenciaLocal ? (
                  <a
                    className="rotas-link-maps-busca"
                    href={abrirBuscaMapsUrl(form.referenciaLocal, form)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir busca no Google Maps
                  </a>
                ) : null}
              </div>

              <div className="campo">
                <label>CEP do ponto</label>
                <input
                  value={form.cep}
                  onChange={(event) => atualizarForm("cep", event.target.value)}
                  placeholder="Ex: 24320-330"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>

              <div className="campo">
                <label>Numero</label>
                <input
                  value={form.numero}
                  onChange={(event) => atualizarForm("numero", event.target.value)}
                  placeholder="Ex: numero"
                  inputMode="numeric"
                  disabled={form.semNumero}
                />
                <label className="rotas-checkbox-linha">
                  <input type="checkbox" checked={form.semNumero} onChange={alternarSemNumeroPonto} />
                  Sem numero
                </label>
              </div>

              <div className="campo">
                <label>Abre</label>
                <input
                  type="time"
                  value={form.horarioAbertura}
                  onChange={(event) => atualizarForm("horarioAbertura", event.target.value)}
                />
              </div>

              <div className="campo">
                <label>Fecha</label>
                <input
                  type="time"
                  value={form.horarioFechamento}
                  onChange={(event) => atualizarForm("horarioFechamento", event.target.value)}
                />
              </div>

              <div className="campo rotas-campo-full">
                <label>Dias de funcionamento</label>
                <div className="rotas-dias">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      type="button"
                      className={form.diasFuncionamento.includes(dia.id) ? "ativo" : ""}
                      key={dia.id}
                      onClick={() => alternarDiaFuncionamento(dia.id)}
                    >
                      {dia.curto}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            {pontoTemCoordenadas(form) ? (
              <>
                {pontoLocalizacaoConfiavel(form) ? (
                  <div className="rotas-coordenadas-ok">
                    Ponto pronto: {form.enderecoSelecionado || "coordenadas salvas"}
                  </div>
                ) : (
                  <div className="rotas-alerta">
                    Encontrei uma posicao aproximada, mas o numero nao foi confirmado. Clique no mapa para ajustar.
                  </div>
                )}
                <MiniMapaAjuste
                  ponto={form}
                  titulo="Clique no mapa para corrigir a localizacao do ponto"
                  onChange={ajustarCoordenadasPonto}
                />
              </>
            ) : (
              <>
                <div className="rotas-form-acoes">
                  <button
                    className="btn btn-claro rotas-btn-validar"
                    type="button"
                    onClick={validarPontoAtual}
                    disabled={validandoPonto}
                  >
                    <FaMapMarkerAlt /> {validandoPonto ? "Validando CEP..." : "Localizar por CEP e numero"}
                  </button>
                </div>
                <div className="rotas-ajuda-endereco">
                  Localize por Plus Code/referencia ou use CEP e numero como alternativa.
                </div>
              </>
            )}

            {mensagem ? <div className="rotas-mensagem">{mensagem}</div> : null}

            <div className="rotas-form-rodape">
              <button className="btn btn-roxo" type="submit" disabled={validandoPonto}>
                <FaSave /> {editandoPontoId ? "Salvar alteracoes" : "Salvar ponto"}
              </button>
              <button className="btn btn-claro" type="button" onClick={cancelarPonto}>
                Cancelar
              </button>
            </div>
          </form>
        </RotasModal>
      ) : null}
    </PageLayout>
  );
}
