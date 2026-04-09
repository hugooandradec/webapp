import { useEffect, useMemo, useRef, useState } from "react";

import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/lancamento.css";

import { isSyncEnabled } from "../../app.config.js";
import { useDialog } from "../components/dialogContext";
import { useToast } from "../components/toastContext";
import LancamentoLista from "../components/LancamentoLista";
import LancamentoModal from "../components/LancamentoModal";
import LancamentoTopSection from "../components/LancamentoTopSection";
import PageLayout from "../components/PageLayout";
import { numeroDeMoeda } from "../utils/money.js";
import {
  APP_STORAGE_KEY,
  EMPTY_FORM_ENTRADA,
  calcularResumoDoCaixa,
  criarCaixaVazia,
  garantirEstrutura,
  gerarId,
  normalizarCaixa,
  normalizarPonto,
  parseEstruturaSalva,
  rebuildAgregadoFromRaw,
} from "../utils/lancamentoHelpers.js";
import {
  irParaLogin,
  irParaMenu,
  lerUsuarioLogado,
  limparDadosLogin,
} from "../utils/session.js";
import { carregarDocumentoSync, salvarDocumentoSync } from "../utils/syncApi.js";

function carregarEstruturaSalva() {
  return garantirEstrutura(
    parseEstruturaSalva(
      typeof window !== "undefined" ? localStorage.getItem(APP_STORAGE_KEY) : null
    )
  );
}

function estruturaTemConteudo(estrutura) {
  const caixas = Array.isArray(estrutura?.caixas) ? estrutura.caixas : [];
  const dadosPorCaixa = estrutura?.dadosPorCaixa || {};

  if (caixas.length > 0) {
    return caixas.some((caixa) => {
      const dados = dadosPorCaixa[caixa] || {};
      return (
        Boolean(String(dados.valorInicial || "").trim()) ||
        (Array.isArray(dados.historicoRaw) && dados.historicoRaw.length > 0)
      );
    });
  }

  return false;
}

export default function Lancamento() {
  const dialog = useDialog();
  const toast = useToast();
  const [usuario] = useState(() => lerUsuarioLogado());
  const [dadosApp, setDadosApp] = useState(() => carregarEstruturaSalva());
  const [caixaAtiva, setCaixaAtiva] = useState(() => carregarEstruturaSalva().caixaAtiva || "");
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoModal, setTipoModal] = useState("");
  const [historicoModal, setHistoricoModal] = useState(null);
  const [formEntrada, setFormEntrada] = useState(EMPTY_FORM_ENTRADA);
  const [syncInicializado, setSyncInicializado] = useState(false);

  const pontoRef = useRef(null);
  const estruturaInicialRef = useRef(null);
  const erroSyncCarregamentoRef = useRef(false);
  const erroSyncSalvarRef = useRef(false);
  const ultimoPayloadSincronizadoRef = useRef("");
  const syncHabilitada = isSyncEnabled();

  const loginUsuario = String(usuario?.login || "").trim().toLowerCase();

  if (!estruturaInicialRef.current) {
    estruturaInicialRef.current = garantirEstrutura({ ...dadosApp, caixaAtiva });
  }

  useEffect(() => {
    let ativo = true;

    async function hidratarSync() {
      if (!syncHabilitada || !loginUsuario) {
        setSyncInicializado(true);
        return;
      }

      try {
        const documento = await carregarDocumentoSync("lancamento", loginUsuario);
        if (!ativo) return;

        if (documento?.payload) {
          const estruturaRemota = garantirEstrutura(documento.payload);
          ultimoPayloadSincronizadoRef.current = JSON.stringify(estruturaRemota);
          setDadosApp(estruturaRemota);
          setCaixaAtiva(estruturaRemota.caixaAtiva || "");
        } else {
          const estruturaLocal = estruturaInicialRef.current;

          if (!estruturaTemConteudo(estruturaLocal)) {
            ultimoPayloadSincronizadoRef.current = JSON.stringify(estruturaLocal);
          }
        }
      } catch (error) {
        console.error("Falha ao carregar sincronizacao do lancamento:", error);
        ultimoPayloadSincronizadoRef.current = JSON.stringify(estruturaInicialRef.current);

        if (!erroSyncCarregamentoRef.current) {
          erroSyncCarregamentoRef.current = true;
          toast.warning("Nao foi possivel carregar o Lançamento online. Usando dados locais.");
        }
      } finally {
        if (ativo) {
          setSyncInicializado(true);
        }
      }
    }

    hidratarSync();

    return () => {
      ativo = false;
    };
  }, [loginUsuario, syncHabilitada, toast]);

  useEffect(() => {
    const estrutura = garantirEstrutura({ ...dadosApp, caixaAtiva });
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(estrutura));
  }, [dadosApp, caixaAtiva]);

  useEffect(() => {
    if (!syncHabilitada || !syncInicializado || !loginUsuario) return undefined;

    const estrutura = garantirEstrutura({ ...dadosApp, caixaAtiva });
    const payloadSerializado = JSON.stringify(estrutura);

    if (payloadSerializado === ultimoPayloadSincronizadoRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await salvarDocumentoSync("lancamento", loginUsuario, estrutura);
        ultimoPayloadSincronizadoRef.current = payloadSerializado;
        erroSyncSalvarRef.current = false;
      } catch (error) {
        console.error("Falha ao salvar sincronizacao do lancamento:", error);

        if (!erroSyncSalvarRef.current) {
          erroSyncSalvarRef.current = true;
          toast.warning("Nao foi possivel sincronizar o Lançamento agora. Os dados continuam salvos neste aparelho.");
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dadosApp, caixaAtiva, loginUsuario, syncHabilitada, syncInicializado, toast]);

  useEffect(() => {
    if (formEntrada.aberto) {
      setTimeout(() => pontoRef.current?.focus(), 0);
    }
  }, [formEntrada.aberto]);

  const dadosCaixaAtual = useMemo(() => {
    if (!caixaAtiva) return criarCaixaVazia();
    return dadosApp.dadosPorCaixa[caixaAtiva] || criarCaixaVazia();
  }, [dadosApp, caixaAtiva]);

  const listaLancamentos = useMemo(
    () => rebuildAgregadoFromRaw(dadosCaixaAtual.historicoRaw || []),
    [dadosCaixaAtual]
  );

  const valorInicialNumero = useMemo(
    () => numeroDeMoeda(dadosCaixaAtual.valorInicial || "0"),
    [dadosCaixaAtual.valorInicial]
  );

  const totalEntrada = useMemo(
    () => listaLancamentos.reduce((soma, item) => soma + (Number(item.dinheiro) || 0), 0),
    [listaLancamentos]
  );

  const totalSaida = useMemo(
    () => listaLancamentos.reduce((soma, item) => soma + (Number(item.saida) || 0), 0),
    [listaLancamentos]
  );

  const valorTotal = useMemo(
    () => valorInicialNumero + totalEntrada - totalSaida,
    [valorInicialNumero, totalEntrada, totalSaida]
  );

  const resumoTotalCaixas = useMemo(() => {
    const linhas = (dadosApp.caixas || []).map((caixa) => ({
      caixa,
      ...calcularResumoDoCaixa(caixa, dadosApp.dadosPorCaixa),
    }));

    return linhas.reduce(
      (acc, item) => ({
        linhas: acc.linhas.concat(item),
        somaInicial: acc.somaInicial + item.valorInicial,
        somaEntrada: acc.somaEntrada + item.entrada,
        somaSaida: acc.somaSaida + item.saida,
        somaTotal: acc.somaTotal + item.valorTotal,
      }),
      {
        linhas: [],
        somaInicial: 0,
        somaEntrada: 0,
        somaSaida: 0,
        somaTotal: 0,
      }
    );
  }, [dadosApp]);

  const historicoDoPonto = useMemo(() => {
    if (!historicoModal) return [];

    const key = normalizarPonto(historicoModal.ponto);

    return (dadosCaixaAtual.historicoRaw || []).filter(
      (item) => normalizarPonto(item.ponto) === key
    );
  }, [historicoModal, dadosCaixaAtual.historicoRaw]);

  function atualizarDadosCaixaAtual(patch) {
    if (!caixaAtiva) return;

    setDadosApp((prev) => {
      const atual = prev.dadosPorCaixa[caixaAtiva] || criarCaixaVazia();

      return {
        ...prev,
        dadosPorCaixa: {
          ...prev.dadosPorCaixa,
          [caixaAtiva]: {
            ...atual,
            ...patch,
          },
        },
      };
    });
  }

  function voltarParaMenu() {
    irParaMenu();
  }

  function sair() {
    limparDadosLogin();
    irParaLogin();
  }

  async function criarNovoCaixa() {
    const nomeInformado = await dialog.prompt("Nome do novo caixa:", {
      title: "Novo caixa",
      confirmLabel: "Criar",
      placeholder: "Digite o nome do caixa",
    });
    if (nomeInformado === null) return;

    const nome = normalizarCaixa(nomeInformado);
    if (!nome) return;

    setDadosApp((prev) => {
      if (prev.caixas.includes(nome)) return prev;

      return {
        ...prev,
        caixas: [...prev.caixas, nome],
        dadosPorCaixa: {
          ...prev.dadosPorCaixa,
          [nome]: criarCaixaVazia(),
        },
      };
    });

    setCaixaAtiva(nome);
    setFormEntrada(EMPTY_FORM_ENTRADA);
  }

  async function excluirCaixaAtual() {
    if (!caixaAtiva) return;

    const confirmou = await dialog.confirm(
      `Deseja excluir o caixa "${caixaAtiva}" e todos os lancamentos dele?`,
      {
        title: "Excluir caixa",
        confirmLabel: "Excluir",
      }
    );
    if (!confirmou) return;

    setDadosApp((prev) => {
      const caixasRestantes = (prev.caixas || []).filter((caixa) => caixa !== caixaAtiva);
      const dadosPorCaixa = { ...prev.dadosPorCaixa };
      delete dadosPorCaixa[caixaAtiva];

      const proximoCaixaAtiva = caixasRestantes[0] || "";

      setCaixaAtiva(proximoCaixaAtiva);
      setFormEntrada(EMPTY_FORM_ENTRADA);

      return {
        ...prev,
        caixas: caixasRestantes,
        caixaAtiva: proximoCaixaAtiva,
        dadosPorCaixa,
      };
    });
  }

  function trocarCaixa(valor) {
    setCaixaAtiva(normalizarCaixa(valor));
    setFormEntrada(EMPTY_FORM_ENTRADA);
  }

  function abrirNovaEntrada() {
    abrirEdicaoEntrada();
  }

  async function abrirEdicaoEntrada(lancamento = null, index = null) {
    if (!caixaAtiva) return;

    if (lancamento) {
      const confirmar = await dialog.confirm(
        `Deseja editar o lancamento do ponto "${lancamento.ponto}"?`,
        {
          title: "Editar lancamento",
          confirmLabel: "Editar",
        }
      );
      if (!confirmar) return;
    }

    setFormEntrada({
      aberto: true,
      editIndex: index,
      pontoOriginal: lancamento ? normalizarPonto(lancamento.ponto) : "",
      ponto: lancamento?.ponto || "",
      dinheiro: lancamento?.dinheiro ? String(lancamento.dinheiro) : "",
      saida: lancamento?.saida ? String(lancamento.saida) : "",
    });
  }

  function atualizarFormEntrada(patch) {
    setFormEntrada((prev) => ({ ...prev, ...patch }));
  }

  function cancelarEntrada() {
    setFormEntrada(EMPTY_FORM_ENTRADA);
  }

  function salvarEntrada() {
    if (!caixaAtiva) return;

    const pontoNovo = normalizarPonto(formEntrada.ponto);
    const entrada = Number(formEntrada.dinheiro || 0);
    const saida = Number(formEntrada.saida || 0);

    if (!pontoNovo) return;

    const historicoAtual = Array.isArray(dadosCaixaAtual.historicoRaw)
      ? [...dadosCaixaAtual.historicoRaw]
      : [];

    const base = {
      id: gerarId(),
      ts: Date.now(),
      ponto: pontoNovo,
      dinheiro: entrada,
      saida,
      cartao: 0,
      outros: 0,
      caixa: caixaAtiva,
    };

    let novoHistorico = historicoAtual;

    if (formEntrada.editIndex !== null) {
      const antigo = listaLancamentos[formEntrada.editIndex];
      if (!antigo) return;

      const keyAntiga = normalizarPonto(formEntrada.pontoOriginal || antigo.ponto);
      const keyNova = normalizarPonto(pontoNovo);

      if (keyAntiga && keyNova && keyAntiga !== keyNova) {
        novoHistorico = novoHistorico.map((item) =>
          normalizarPonto(item.ponto) === keyAntiga ? { ...item, ponto: keyNova } : item
        );
      }

      const listaAtualizada = rebuildAgregadoFromRaw(novoHistorico);
      const atualNovo =
        listaAtualizada.find((item) => normalizarPonto(item.ponto) === keyNova) || {
          dinheiro: 0,
          saida: 0,
        };

      novoHistorico.push({
        ...base,
        dinheiro: entrada - (Number(atualNovo.dinheiro) || 0),
        saida: saida - (Number(atualNovo.saida) || 0),
      });
    } else {
      novoHistorico.push(base);
    }

    atualizarDadosCaixaAtual({ historicoRaw: novoHistorico });
    cancelarEntrada();
  }

  async function excluirLancamento(index) {
    const item = listaLancamentos[index];
    if (!item) return;

    const confirmou = await dialog.confirm(
      `Excluir este lancamento do caixa "${caixaAtiva}" e o historico deste ponto?`,
      {
        title: "Excluir lancamento",
        confirmLabel: "Excluir",
      }
    );
    if (!confirmou) return;

    const key = normalizarPonto(item.ponto);
    const novoHistorico = (dadosCaixaAtual.historicoRaw || []).filter(
      (registro) => normalizarPonto(registro.ponto) !== key
    );

    atualizarDadosCaixaAtual({ historicoRaw: novoHistorico });
  }

  async function limparLancamentos() {
    if (!caixaAtiva) return;

    const confirmou = await dialog.confirm(
      `Deseja realmente limpar todos os lancamentos e valores do caixa "${caixaAtiva}"?`,
      {
        title: "Limpar caixa",
        confirmLabel: "Limpar",
      }
    );
    if (!confirmou) return;

    atualizarDadosCaixaAtual({
      historicoRaw: [],
      data: dadosCaixaAtual.data,
      valorInicial: "",
    });

    cancelarEntrada();
  }

  function abrirResumoCaixa() {
    setTipoModal("resumo-caixa");
    setModalAberto(true);
  }

  function abrirResumoTotal() {
    setTipoModal("resumo-total");
    setModalAberto(true);
  }

  function abrirHistorico(index) {
    const item = listaLancamentos[index];
    if (!item) return;

    setHistoricoModal(item);
    setTipoModal("historico");
    setModalAberto(true);
  }

  return (
    <PageLayout
      titulo="Lancamento"
      usuario={usuario}
      onLogout={sair}
      onBack={voltarParaMenu}
      mostrarVoltar
      className="pagina-lancamento"
    >
      <LancamentoTopSection
        dadosApp={dadosApp}
        caixaAtiva={caixaAtiva}
        dadosCaixaAtual={dadosCaixaAtual}
        formEntrada={formEntrada}
        pontoRef={pontoRef}
        valorInicialNumero={valorInicialNumero}
        totalEntrada={totalEntrada}
        totalSaida={totalSaida}
        valorTotal={valorTotal}
        onTrocarCaixa={trocarCaixa}
        onCriarNovoCaixa={criarNovoCaixa}
        onExcluirCaixa={excluirCaixaAtual}
        onAtualizarDadosCaixaAtual={atualizarDadosCaixaAtual}
        onAbrirNovaEntrada={abrirNovaEntrada}
        onAbrirResumoCaixa={abrirResumoCaixa}
        onAbrirResumoTotal={abrirResumoTotal}
        onLimparLancamentos={limparLancamentos}
        onAtualizarFormEntrada={atualizarFormEntrada}
        onSalvarEntrada={salvarEntrada}
        onCancelarEntrada={cancelarEntrada}
      />

      <LancamentoLista
        caixaAtiva={caixaAtiva}
        listaLancamentos={listaLancamentos}
        onEditar={abrirEdicaoEntrada}
        onHistorico={abrirHistorico}
        onExcluir={excluirLancamento}
      />

      <LancamentoModal
        aberto={modalAberto}
        tipoModal={tipoModal}
        caixaAtiva={caixaAtiva}
        dadosCaixaAtual={dadosCaixaAtual}
        listaLancamentos={listaLancamentos}
        valorInicialNumero={valorInicialNumero}
        totalEntrada={totalEntrada}
        totalSaida={totalSaida}
        valorTotal={valorTotal}
        resumoTotalCaixas={resumoTotalCaixas}
        historicoModal={historicoModal}
        historicoDoPonto={historicoDoPonto}
        onFechar={() => setModalAberto(false)}
      />
    </PageLayout>
  );
}
