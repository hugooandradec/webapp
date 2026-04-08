import { useEffect, useMemo, useRef, useState } from "react";

import CalculoSalasLista from "../components/CalculoSalasLista";
import CalculoSalasModal from "../components/CalculoSalasModal";
import CalculoSalasTopSection from "../components/CalculoSalasTopSection";
import { useDialog } from "../components/dialogContext";
import PageLayout from "../components/PageLayout";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/calculo-salas.css";
import { somenteDigitos } from "../utils/money.js";
import {
  calcularTotalGeralSalas,
  carregarCalculoSalasLocal,
  limparStorageCalculoSalas,
  SALA_VAZIA,
  salvarCalculoSalasLocal,
} from "../utils/calculoSalas.js";
import {
  irParaLogin,
  irParaMenu,
  lerUsuarioLogado,
  limparDadosLogin,
} from "../utils/session.js";

export default function CalculoSalas() {
  const dialog = useDialog();
  const estadoPersistido = useMemo(() => carregarCalculoSalasLocal(), []);

  const [usuario] = useState(() => lerUsuarioLogado());
  const [dataDe, setDataDe] = useState(estadoPersistido.dataDe);
  const [dataAte, setDataAte] = useState(estadoPersistido.dataAte);
  const [salas, setSalas] = useState(estadoPersistido.salas);
  const [modalAberto, setModalAberto] = useState(false);

  const refsSalas = useRef([]);

  useEffect(() => {
    salvarCalculoSalasLocal({ dataDe, dataAte, salas });
  }, [dataDe, dataAte, salas]);

  const totalGeral = useMemo(() => calcularTotalGeralSalas(salas), [salas]);

  function voltarParaMenu() {
    irParaMenu();
  }

  function sair() {
    limparDadosLogin();
    irParaLogin();
  }

  function adicionarSala(sala = null) {
    setSalas((prev) => {
      const proximo = [...prev, sala ? { ...SALA_VAZIA, ...sala } : { ...SALA_VAZIA }];
      setTimeout(() => refsSalas.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function atualizarSala(index, campo, valor, monetario = false) {
    setSalas((prev) =>
      prev.map((sala, posicao) => {
        if (posicao !== index) return sala;

        const valorTratado = monetario
          ? valor.includes("-")
            ? `-${somenteDigitos(valor)}`
            : somenteDigitos(valor)
          : valor.toUpperCase();

        return {
          ...sala,
          [campo]: valorTratado,
        };
      })
    );
  }

  async function removerSala(index) {
    const confirmar = await dialog.confirm("Remover esta sala?", {
      title: "Excluir sala",
      confirmLabel: "Remover",
    });
    if (!confirmar) return;

    setSalas((prev) => prev.filter((_, posicao) => posicao !== index));
  }

  function limparTudo() {
    setDataDe("");
    setDataAte("");
    setSalas([]);
    limparStorageCalculoSalas();
  }

  async function confirmarLimpeza() {
    const confirmar = await dialog.confirm("Deseja limpar todas as salas e datas?", {
      title: "Limpar calculo",
      confirmLabel: "Limpar",
    });
    if (confirmar) limparTudo();
  }

  async function abrirRelatorio() {
    if (!salas.length) {
      await dialog.alert("Adicione pelo menos uma sala.", {
        title: "Sem salas",
      });
      return;
    }

    setModalAberto(true);
  }

  return (
    <PageLayout
      titulo="Calculo Salas"
      usuario={usuario}
      onLogout={sair}
      onBack={voltarParaMenu}
      mostrarVoltar
      className="pagina-salas"
    >
      <CalculoSalasTopSection
        dataDe={dataDe}
        dataAte={dataAte}
        onAtualizarDataDe={setDataDe}
        onAtualizarDataAte={setDataAte}
        onAdicionarSala={() => adicionarSala()}
        onAbrirRelatorio={abrirRelatorio}
        onLimparTudo={confirmarLimpeza}
      />

      <CalculoSalasLista
        salas={salas}
        refsSalas={refsSalas}
        onAdicionarSala={() => adicionarSala()}
        onAtualizarSala={atualizarSala}
        onRemoverSala={removerSala}
      />

      <CalculoSalasModal
        aberto={modalAberto}
        dataDe={dataDe}
        dataAte={dataAte}
        salas={salas}
        totalGeral={totalGeral}
        onFechar={() => setModalAberto(false)}
      />
    </PageLayout>
  );
}
