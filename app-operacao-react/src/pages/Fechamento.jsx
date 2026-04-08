import { useEffect, useMemo, useRef, useState } from "react";

import DadosPrincipais from "../components/DadosPrincipais";
import Debitos from "../components/Debitos";
import Devedores from "../components/Devedores";
import { useDialog } from "../components/dialogContext";
import ModalRelatorio from "../components/ModalRelatorio";
import PageLayout from "../components/PageLayout";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/fechamento.css";
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

export default function Fechamento() {
  const dialog = useDialog();
  const estadoPadrao = useMemo(() => criarEstadoInicial(), []);
  const estadoPersistido = useMemo(() => carregarEstadoInicial(), []);

  const [dados, setDados] = useState(estadoPersistido.dados);
  const [debitos, setDebitos] = useState(estadoPersistido.debitos);
  const [devedores, setDevedores] = useState(estadoPersistido.devedores);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuario] = useState(() => lerUsuarioLogado());

  const refsDebitos = useRef([]);
  const refsDevedores = useRef([]);

  useEffect(() => {
    salvarLocalmente({ dados, debitos, devedores });
  }, [dados, debitos, devedores]);

  function atualizarCampo(campo, valor, monetario = false) {
    setDados((prev) => ({
      ...prev,
      [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
    }));
  }

  function atualizarDebito(index, campo, valor, monetario = false) {
    setDebitos((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [campo]: monetario ? formatarMoedaDigitada(valor) : valor }
          : item
      )
    );
  }

  function atualizarDevedor(index, campo, valor, monetario = false) {
    setDevedores((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const atualizado = {
          ...item,
          [campo]: monetario ? formatarMoedaDigitada(valor) : valor,
        };

        return {
          ...atualizado,
          valorAtual: calcularValorAtualVale(atualizado),
        };
      })
    );
  }

  function adicionarDebito() {
    setDebitos((prev) => {
      const proximo = [...prev, { ...DEBITO_VAZIO }];
      setTimeout(() => refsDebitos.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function removerDebito(index) {
    setDebitos((prev) => prev.filter((_, i) => i !== index));
  }

  function adicionarDevedor() {
    setDevedores((prev) => {
      const proximo = [...prev, { ...VALE_VAZIO }];
      setTimeout(() => refsDevedores.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function removerDevedor(index) {
    setDevedores((prev) => prev.filter((_, i) => i !== index));
  }

  function limparTudo() {
    setDados(estadoPadrao.dados);
    setDebitos([]);
    setDevedores([]);
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
      { label: "Vales Pagos", valor: totais.devAntReceb },
      { label: "Debitos + Vales", valor: -totais.debitosMaisDevedores },
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
        refsDebitos={refsDebitos}
        atualizarDebito={atualizarDebito}
        removerDebito={removerDebito}
        adicionarDebito={adicionarDebito}
      />

      <Devedores
        devedores={devedores}
        refsDevedores={refsDevedores}
        atualizarDevedor={atualizarDevedor}
        removerDevedor={removerDevedor}
        adicionarDevedor={adicionarDevedor}
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
