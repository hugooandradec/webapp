import { useEffect, useMemo, useRef, useState } from "react";

import PageLayout from "../components/PageLayout";
import { useDialog } from "../components/dialogContext";
import RetencaoLista from "../components/RetencaoLista";
import RetencaoModal from "../components/RetencaoModal";
import RetencaoTopSection from "../components/RetencaoTopSection";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/retencao.css";
import { somenteDigitos } from "../utils/money.js";
import {
  calcularRetencaoMedia,
  carregarRetencaoLocal,
  extrairDataRetencao,
  extrairPontoRetencao,
  importarTextoRetencao,
  limparStorageRetencao,
  MAQUINA_RETENCAO_VAZIA,
  salvarRetencaoLocal,
} from "../utils/retencao.js";
import {
  irParaLogin,
  irParaMenu,
  lerUsuarioLogado,
  limparDadosLogin,
} from "../utils/session.js";

export default function Retencao() {
  const dialog = useDialog();
  const estadoPersistido = useMemo(() => carregarRetencaoLocal(), []);

  const [usuario] = useState(() => lerUsuarioLogado());
  const [textoFonte, setTextoFonte] = useState(estadoPersistido.textoFonte);
  const [maquinas, setMaquinas] = useState(estadoPersistido.maquinas);
  const [modalAberto, setModalAberto] = useState(false);

  const refsMaquinas = useRef([]);

  useEffect(() => {
    salvarRetencaoLocal({ textoFonte, maquinas });
  }, [textoFonte, maquinas]);

  const retencaoMedia = useMemo(() => calcularRetencaoMedia(maquinas), [maquinas]);
  const dataRetencao = useMemo(() => extrairDataRetencao(textoFonte), [textoFonte]);
  const pontoRetencao = useMemo(() => extrairPontoRetencao(textoFonte), [textoFonte]);

  function voltarParaMenu() {
    irParaMenu();
  }

  function sair() {
    limparDadosLogin();
    irParaLogin();
  }

  function adicionarMaquina(maquina = null) {
    setMaquinas((prev) => {
      const proximo = [
        ...prev,
        maquina ? { ...MAQUINA_RETENCAO_VAZIA, ...maquina } : { ...MAQUINA_RETENCAO_VAZIA },
      ];
      setTimeout(() => refsMaquinas.current[proximo.length - 1]?.focus(), 0);
      return proximo;
    });
  }

  function atualizarMaquina(index, campo, valor, numerico = false) {
    setMaquinas((prev) =>
      prev.map((maquina, posicao) => {
        if (posicao !== index) return maquina;

        const valorTratado = numerico
          ? somenteDigitos(valor)
          : campo === "selo" || campo === "jogo"
            ? valor.toUpperCase()
            : valor;

        return {
          ...maquina,
          [campo]: valorTratado,
        };
      })
    );
  }

  async function removerMaquina(index) {
    const confirmar = await dialog.confirm("Remover esta maquina?", {
      title: "Excluir maquina",
      confirmLabel: "Remover",
    });
    if (!confirmar) return;

    setMaquinas((prev) => prev.filter((_, posicao) => posicao !== index));
  }

  async function importarTexto() {
    const textoLimpo = textoFonte.trim();

    if (!textoLimpo) {
      await dialog.alert("Cole o texto do fechamento primeiro.", {
        title: "Texto vazio",
      });
      return;
    }

    const importado = importarTextoRetencao(textoLimpo);
    if (importado.maquinas.length === 0) {
      await dialog.alert("Nao consegui identificar maquinas nesse texto.", {
        title: "Importacao nao encontrada",
      });
      return;
    }

    setMaquinas(importado.maquinas);
  }

  function limparTudo() {
    setTextoFonte("");
    setMaquinas([]);
    limparStorageRetencao();
  }

  async function confirmarLimpeza() {
    const confirmar = await dialog.confirm("Deseja limpar todas as maquinas e dados?", {
      title: "Limpar retencao",
      confirmLabel: "Limpar",
    });
    if (confirmar) limparTudo();
  }

  async function abrirRelatorio() {
    if (!maquinas.length) {
      await dialog.alert("Adicione pelo menos uma maquina.", {
        title: "Sem maquinas",
      });
      return;
    }

    setModalAberto(true);
  }

  return (
    <PageLayout
      titulo="Retencao"
      usuario={usuario}
      onLogout={sair}
      onBack={voltarParaMenu}
      mostrarVoltar
      className="pagina-retencao"
    >
      <RetencaoTopSection
        textoFonte={textoFonte}
        onAtualizarTexto={setTextoFonte}
        onImportarTexto={importarTexto}
        onAdicionarMaquina={() => adicionarMaquina()}
        onAbrirRelatorio={abrirRelatorio}
        onLimparTudo={confirmarLimpeza}
      />

      <RetencaoLista
        maquinas={maquinas}
        refsMaquinas={refsMaquinas}
        onAdicionarMaquina={() => adicionarMaquina()}
        onAtualizarMaquina={atualizarMaquina}
        onRemoverMaquina={removerMaquina}
      />

      <RetencaoModal
        aberto={modalAberto}
        data={dataRetencao}
        ponto={pontoRetencao}
        maquinas={maquinas}
        retencaoMedia={retencaoMedia}
        onFechar={() => setModalAberto(false)}
      />
    </PageLayout>
  );
}
