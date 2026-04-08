import { useEffect, useMemo, useRef, useState } from "react";

import PageLayout from "../components/PageLayout";
import { useDialog } from "../components/dialogContext";
import PreFechoLista from "../components/PreFechoLista";
import PreFechoModal from "../components/PreFechoModal";
import PreFechoTopSection from "../components/PreFechoTopSection";
import "../styles/module-base.css";
import "../styles/buttons.css";
import "../styles/prefecho.css";
import { somenteDigitos } from "../utils/money.js";
import {
  calcularTotalPreFecho,
  carregarPreFechoLocal,
  criarEstadoInicialPreFecho,
  extrairClientePreFecho,
  extrairDataFechamento,
  importarTextoPreFecho,
  limparStoragePreFecho,
  MAQUINA_VAZIA,
  salvarPreFechoLocal,
} from "../utils/preFecho.js";
import {
  irParaLogin,
  irParaMenu,
  lerUsuarioLogado,
  limparDadosLogin,
} from "../utils/session.js";

export default function PreFecho() {
  const dialog = useDialog();
  const estadoInicial = useMemo(() => criarEstadoInicialPreFecho(), []);
  const estadoPersistido = useMemo(() => carregarPreFechoLocal(), []);
  const [usuario] = useState(() => lerUsuarioLogado());
  const [data, setData] = useState(estadoPersistido.data);
  const [textoFonte, setTextoFonte] = useState(estadoPersistido.textoFonte);
  const [maquinas, setMaquinas] = useState(estadoPersistido.maquinas);
  const [modalAberto, setModalAberto] = useState(false);

  const refsMaquinas = useRef([]);

  useEffect(() => {
    salvarPreFechoLocal({ data, textoFonte, maquinas });
  }, [data, textoFonte, maquinas]);

  const totalGeral = useMemo(() => calcularTotalPreFecho(maquinas), [maquinas]);
  const clienteRelatorio = useMemo(() => extrairClientePreFecho(textoFonte), [textoFonte]);
  const dataFechamento = useMemo(() => extrairDataFechamento(textoFonte), [textoFonte]);

  function voltarParaMenu() {
    irParaMenu();
  }

  function sair() {
    limparDadosLogin();
    irParaLogin();
  }

  function adicionarMaquina(maquina = null) {
    setMaquinas((prev) => {
      const proximo = [...prev, maquina ? { ...MAQUINA_VAZIA, ...maquina } : { ...MAQUINA_VAZIA }];
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

  function removerMaquina(index) {
    setMaquinas((prev) => prev.filter((_, posicao) => posicao !== index));
  }

  async function importarTexto() {
    const textoLimpo = textoFonte.trim();

    if (!textoLimpo) {
      await dialog.alert("Cole o fechamento primeiro.", {
        title: "Texto vazio",
      });
      return;
    }

    const importado = importarTextoPreFecho(textoLimpo);

    if (importado.maquinas.length === 0) {
      await dialog.alert("Nao consegui identificar nenhuma maquina nesse texto.", {
        title: "Importacao nao encontrada",
      });
      return;
    }

    setMaquinas(importado.maquinas);
  }

  function limparTudo() {
    setData(estadoInicial.data);
    setTextoFonte("");
    setMaquinas([]);
    limparStoragePreFecho();
  }

  async function confirmarLimpeza() {
    const confirmar = await dialog.confirm(
      "Tem certeza que deseja limpar todos os dados do pre-fecho?",
      {
        title: "Limpar pre-fecho",
        confirmLabel: "Limpar",
      }
    );

    if (confirmar) {
      limparTudo();
    }
  }

  return (
    <PageLayout
      titulo="Pre-Fecho"
      usuario={usuario}
      onLogout={sair}
      onBack={voltarParaMenu}
      mostrarVoltar
      className="pagina-pre-fecho"
    >
      <PreFechoTopSection
        textoFonte={textoFonte}
        onAtualizarTextoFonte={setTextoFonte}
        onImportarTexto={importarTexto}
        onAdicionarMaquina={() => adicionarMaquina()}
        onAbrirRelatorio={() => setModalAberto(true)}
        onLimparTudo={confirmarLimpeza}
      />

      <PreFechoLista
        maquinas={maquinas}
        refsMaquinas={refsMaquinas}
        onAdicionarMaquina={() => adicionarMaquina()}
        onAtualizarMaquina={atualizarMaquina}
        onRemoverMaquina={removerMaquina}
      />

      <PreFechoModal
        aberto={modalAberto}
        dataFechamento={dataFechamento}
        dataPreFecho={data}
        cliente={clienteRelatorio}
        maquinas={maquinas}
        totalGeral={totalGeral}
        onFechar={() => setModalAberto(false)}
      />
    </PageLayout>
  );
}
