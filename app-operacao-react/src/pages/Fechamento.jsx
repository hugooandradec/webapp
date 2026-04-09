import { useEffect, useMemo, useRef, useState } from "react";

import DadosPrincipais from "../components/DadosPrincipais";
import Debitos from "../components/Debitos";
import Devedores from "../components/Devedores";
import { useDialog } from "../components/dialogContext";
import ModalRelatorio from "../components/ModalRelatorio";
import PageLayout from "../components/PageLayout";
import { useToast } from "../components/toastContext";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/fechamento.css";
import { isSyncEnabled } from "../../app.config.js";
import {
  calcularResumoDevedores,
  calcularTotaisFechamento,
  calcularValorAtualVale,
  criarEstadoInicial,
  DEBITO_VAZIO,
  lerLocalmente,
  limparStorageFechamento,
  salvarLocalmente,
  VALE_VAZIO,
} from "../utils/calculos.js";
import { formatarMoedaDigitada, numeroDeMoeda } from "../utils/money.js";
import {
  irParaLogin,
  irParaMenu,
  lerUsuarioLogado,
  limparDadosLogin,
} from "../utils/session.js";
import { carregarDocumentoSync, salvarDocumentoSync } from "../utils/syncApi.js";

function carregarEstadoInicial() {
  const estadoBase = criarEstadoInicial();
  const salvo = lerLocalmente();

  if (!salvo) {
    return estadoBase;
  }

  return {
    dados: { ...estadoBase.dados, ...(salvo.dados || {}) },
    debitos: Array.isArray(salvo.debitos) ? salvo.debitos : [],
    devedores: Array.isArray(salvo.devedores) ? salvo.devedores : [],
  };
}

function normalizarEstadoFechamento(payload) {
  const estadoBase = criarEstadoInicial();
  const dados = payload?.dados || {};
  const debitos = Array.isArray(payload?.debitos) ? payload.debitos : [];
  const devedores = Array.isArray(payload?.devedores) ? payload.devedores : [];

  return {
    dados: { ...estadoBase.dados, ...dados },
    debitos,
    devedores,
  };
}

function estadoFechamentoTemConteudo(payload) {
  const estado = normalizarEstadoFechamento(payload);

  const dadosPreenchidos = Object.values(estado.dados).some((valor) =>
    Boolean(String(valor || "").trim())
  );

  if (dadosPreenchidos) return true;

  if (estado.debitos.some((item) => item?.ponto?.trim() || numeroDeMoeda(item?.valor) !== 0)) {
    return true;
  }

  return estado.devedores.some(
    (item) =>
      item?.ponto?.trim() ||
      numeroDeMoeda(item?.valorAnterior) !== 0 ||
      numeroDeMoeda(item?.pago) !== 0 ||
      numeroDeMoeda(item?.semana) !== 0 ||
      numeroDeMoeda(item?.valorAtual) !== 0
  );
}

export default function Fechamento() {
  const dialog = useDialog();
  const toast = useToast();
  const estadoPadrao = useMemo(() => criarEstadoInicial(), []);
  const estadoPersistido = useMemo(() => carregarEstadoInicial(), []);

  const [dados, setDados] = useState(estadoPersistido.dados);
  const [debitos, setDebitos] = useState(estadoPersistido.debitos);
  const [devedores, setDevedores] = useState(estadoPersistido.devedores);
  const [debitoForm, setDebitoForm] = useState({ ...DEBITO_VAZIO });
  const [valeForm, setValeForm] = useState({ ...VALE_VAZIO });
  const [debitoEditIndex, setDebitoEditIndex] = useState(null);
  const [valeEditIndex, setValeEditIndex] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuario] = useState(() => lerUsuarioLogado());
  const [syncInicializado, setSyncInicializado] = useState(false);

  const refDebitoForm = useRef(null);
  const refValeForm = useRef(null);
  const estadoInicialRef = useRef(estadoPersistido);
  const erroSyncCarregamentoRef = useRef(false);
  const erroSyncSalvarRef = useRef(false);
  const ultimoPayloadSincronizadoRef = useRef("");
  const syncHabilitada = isSyncEnabled();
  const loginUsuario = String(usuario?.login || "").trim().toLowerCase();

  useEffect(() => {
    let ativo = true;

    async function hidratarSync() {
      if (!syncHabilitada || !loginUsuario) {
        setSyncInicializado(true);
        return;
      }

      try {
        const documento = await carregarDocumentoSync("fechamento", loginUsuario);
        if (!ativo) return;

        if (documento?.payload) {
          const estadoRemoto = normalizarEstadoFechamento(documento.payload);
          ultimoPayloadSincronizadoRef.current = JSON.stringify(estadoRemoto);
          setDados(estadoRemoto.dados);
          setDebitos(estadoRemoto.debitos);
          setDevedores(estadoRemoto.devedores);
        } else {
          const estadoLocal = normalizarEstadoFechamento(estadoInicialRef.current);

          if (!estadoFechamentoTemConteudo(estadoLocal)) {
            ultimoPayloadSincronizadoRef.current = JSON.stringify(estadoLocal);
          }
        }
      } catch (error) {
        console.error("Falha ao carregar sincronizacao do fechamento:", error);
        ultimoPayloadSincronizadoRef.current = JSON.stringify(
          normalizarEstadoFechamento(estadoInicialRef.current)
        );

        if (!erroSyncCarregamentoRef.current) {
          erroSyncCarregamentoRef.current = true;
          toast.warning("Não foi possível carregar o Fechamento online. Usando dados locais.");
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
    salvarLocalmente({ dados, debitos, devedores });
  }, [dados, debitos, devedores]);

  useEffect(() => {
    if (!syncHabilitada || !syncInicializado || !loginUsuario) return undefined;

    const payload = normalizarEstadoFechamento({ dados, debitos, devedores });
    const payloadSerializado = JSON.stringify(payload);

    if (payloadSerializado === ultimoPayloadSincronizadoRef.current) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        await salvarDocumentoSync("fechamento", loginUsuario, payload);
        ultimoPayloadSincronizadoRef.current = payloadSerializado;
        erroSyncSalvarRef.current = false;
      } catch (error) {
        console.error("Falha ao salvar sincronizacao do fechamento:", error);

        if (!erroSyncSalvarRef.current) {
          erroSyncSalvarRef.current = true;
          toast.warning("Não foi possível sincronizar o Fechamento agora. Os dados continuam salvos neste aparelho.");
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dados, debitos, devedores, loginUsuario, syncHabilitada, syncInicializado, toast]);

  function atualizarCampo(campo, valor, monetario = false) {
    setDados((prev) => ({
      ...prev,
      [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
    }));
  }

  function atualizarDebitoForm(campo, valor, monetario = false) {
    setDebitoForm((prev) => ({
      ...prev,
      [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
    }));
  }

  function atualizarValeForm(campo, valor, monetario = false) {
    setValeForm((prev) => {
      const atualizado = {
        ...prev,
        [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
      };

      return {
        ...atualizado,
        valorAtual: calcularValorAtualVale(atualizado),
      };
    });
  }

  function salvarDebito() {
    if (!String(debitoForm.ponto || "").trim() && numeroDeMoeda(debitoForm.valor) === 0) {
      return;
    }

    setDebitos((prev) =>
      debitoEditIndex === null
        ? [...prev, { ...debitoForm }]
        : prev.map((item, index) => (index === debitoEditIndex ? { ...debitoForm } : item))
    );
    setDebitoForm({ ...DEBITO_VAZIO });
    setDebitoEditIndex(null);
    setTimeout(() => refDebitoForm.current?.focus(), 0);
  }

  async function editarDebito(index) {
    const item = debitos[index];
    if (!item) return;

    const confirmar = await dialog.confirm(
      `Deseja editar o debito "${item.ponto || "sem descricao"}"?`,
      {
        title: "Editar debito",
        confirmLabel: "Editar",
      }
    );
    if (!confirmar) return;

    setDebitoForm({ ...item });
    setDebitoEditIndex(index);
    setTimeout(() => refDebitoForm.current?.focus(), 0);
  }

  async function removerDebito(index) {
    const item = debitos[index];
    if (!item) return;

    const confirmar = await dialog.confirm(
      `Deseja apagar o debito "${item.ponto || "sem descricao"}"?`,
      {
        title: "Apagar debito",
        confirmLabel: "Apagar",
      }
    );
    if (!confirmar) return;

    setDebitos((prev) => prev.filter((_, i) => i !== index));
    if (debitoEditIndex === index) {
      setDebitoForm({ ...DEBITO_VAZIO });
      setDebitoEditIndex(null);
    } else if (debitoEditIndex !== null && debitoEditIndex > index) {
      setDebitoEditIndex((prev) => prev - 1);
    }
  }

  function salvarVale() {
    const vazio =
      !String(valeForm.ponto || "").trim() &&
      numeroDeMoeda(valeForm.valorAnterior) === 0 &&
      numeroDeMoeda(valeForm.pago) === 0 &&
      numeroDeMoeda(valeForm.semana) === 0;

    if (vazio) return;

    setDevedores((prev) =>
      valeEditIndex === null
        ? [...prev, { ...valeForm }]
        : prev.map((item, index) => (index === valeEditIndex ? { ...valeForm } : item))
    );
    setValeForm({ ...VALE_VAZIO });
    setValeEditIndex(null);
    setTimeout(() => refValeForm.current?.focus(), 0);
  }

  async function editarVale(index) {
    const item = devedores[index];
    if (!item) return;

    const confirmar = await dialog.confirm(
      `Deseja editar o vale "${item.ponto || "sem ponto"}"?`,
      {
        title: "Editar vale",
        confirmLabel: "Editar",
      }
    );
    if (!confirmar) return;

    setValeForm({ ...item });
    setValeEditIndex(index);
    setTimeout(() => refValeForm.current?.focus(), 0);
  }

  async function removerDevedor(index) {
    const item = devedores[index];
    if (!item) return;

    const confirmar = await dialog.confirm(
      `Deseja apagar o vale "${item.ponto || "sem ponto"}"?`,
      {
        title: "Apagar vale",
        confirmLabel: "Apagar",
      }
    );
    if (!confirmar) return;

    setDevedores((prev) => prev.filter((_, i) => i !== index));
    if (valeEditIndex === index) {
      setValeForm({ ...VALE_VAZIO });
      setValeEditIndex(null);
    } else if (valeEditIndex !== null && valeEditIndex > index) {
      setValeEditIndex((prev) => prev - 1);
    }
  }

  function limparTudo() {
    setDados(estadoPadrao.dados);
    setDebitos([]);
    setDevedores([]);
    setDebitoForm({ ...DEBITO_VAZIO });
    setValeForm({ ...VALE_VAZIO });
    setDebitoEditIndex(null);
    setValeEditIndex(null);
    limparStorageFechamento();
  }

  async function confirmarLimpeza() {
    const confirmar = await dialog.confirm(
      "Tem certeza que deseja limpar todos os dados do fechamento?",
      {
        title: "Limpar fechamento",
        confirmLabel: "Limpar",
      }
    );

    if (confirmar) {
      limparTudo();
    }
  }

  function voltarParaMenu() {
    irParaMenu();
  }

  function sair() {
    limparDadosLogin();
    irParaLogin();
  }

  const resumoDevedores = useMemo(
    () => calcularResumoDevedores(devedores),
    [devedores]
  );

  const totais = useMemo(
    () => calcularTotaisFechamento({ dados, debitos, resumoDevedores }),
    [dados, debitos, resumoDevedores]
  );

  const debitosParaResumo = useMemo(
    () => debitos.filter((item) => item.ponto.trim() || numeroDeMoeda(item.valor) !== 0),
    [debitos]
  );

  const devedoresParaResumo = useMemo(
    () =>
      resumoDevedores.lista.filter(
        (item) =>
          item.ponto.trim() ||
          numeroDeMoeda(item.valorAnterior) ||
          numeroDeMoeda(item.valorAtual) ||
          item.saldoSemana
      ),
    [resumoDevedores]
  );

  const cardsResumo = useMemo(
    () => [
      { rotulo: "Total Rota", valor: totais.totalRota },
      { rotulo: "Comissao", valor: totais.comissao },
      { rotulo: "Firma (Saldo Final)", valor: totais.firma },
    ],
    [totais]
  );

  const linhasRotas = useMemo(
    () => [
      { label: "Turano", valor: numeroDeMoeda(dados.turano) },
      { label: "RC", valor: numeroDeMoeda(dados.rc) },
      { label: "Centro", valor: numeroDeMoeda(dados.centro) },
    ],
    [dados.centro, dados.rc, dados.turano]
  );

  const linhasComplementos = useMemo(
    () => [
      { label: "Cartao Anterior", valor: totais.cartaoPassadoLiquido },
      { label: "Cartao Atual", valor: -totais.cartaoAtual },
      { label: "Vales Pagos", valor: totais.totalValesPagos },
      { label: "Debitos + Vales", valor: -totais.debitosMaisVales },
    ],
    [totais]
  );

  const linhasResumoModal = useMemo(
    () => [
      { label: "Rotas", valor: totais.totalRotasResumo },
      { label: "Cartao Anterior - 5%", valor: totais.cartaoAnteriorResumo },
      { label: "Cartao Atual", valor: totais.cartaoAtualResumo },
      { label: "Debitos", valor: totais.debitosResumo },
      { label: "Vales", valor: totais.valesResumo },
      { label: "Vales Pagos", valor: totais.valesPagosResumo },
      {
        label: "Firma (Saldo Final)",
        valor: totais.firmaResumo,
        total: true,
      },
    ],
    [totais]
  );

  return (
    <PageLayout
      titulo="Fechamento"
      usuario={usuario}
      onLogout={sair}
      onBack={voltarParaMenu}
      mostrarVoltar
      className="pagina-fechamento"
    >
      <DadosPrincipais
        dados={dados}
        atualizarCampo={atualizarCampo}
        cardsResumo={cardsResumo}
        linhasRotas={linhasRotas}
        linhasComplementos={linhasComplementos}
        onAbrirResumo={() => setModalAberto(true)}
        onLimparTudo={confirmarLimpeza}
      />

      <Debitos
        debitos={debitos}
        inputRef={refDebitoForm}
        debitoForm={debitoForm}
        editandoIndex={debitoEditIndex}
        atualizarDebitoForm={atualizarDebitoForm}
        salvarDebito={salvarDebito}
        editarDebito={editarDebito}
        removerDebito={removerDebito}
      />

      <Devedores
        devedores={devedores}
        inputRef={refValeForm}
        valeForm={valeForm}
        editandoIndex={valeEditIndex}
        atualizarValeForm={atualizarValeForm}
        salvarVale={salvarVale}
        editarVale={editarVale}
        removerDevedor={removerDevedor}
      />

      <ModalRelatorio
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        dados={dados}
        totais={totais}
        linhasRotas={linhasRotas}
        linhasResumoModal={linhasResumoModal}
        debitosParaResumo={debitosParaResumo}
        devedoresParaResumo={devedoresParaResumo}
      />
    </PageLayout>
  );
}
