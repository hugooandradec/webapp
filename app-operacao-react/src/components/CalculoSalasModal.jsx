import { FaXmark } from "react-icons/fa6";

import { useRef, useState } from "react";

import html2canvas from "html2canvas";
import { FaWhatsapp } from "react-icons/fa";

import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import { classeValor, moedaBR } from "../utils/money.js";
import {
  calcularResumoSala,
  formatarDataBR,
} from "../utils/calculoSalas.js";

export default function CalculoSalasModal({
  aberto,
  dataDe,
  dataAte,
  salas,
  totalGeral,
  onFechar,
}) {
  const relatorioRef = useRef(null);
  const [compartilhando, setCompartilhando] = useState(false);
  useBodyScrollLock(aberto);

  if (!aberto) return null;

  async function compartilharResumo() {
    if (!relatorioRef.current || compartilhando) return;

    setCompartilhando(true);

    try {
      await aguardarPintura();

      const canvas = await html2canvas(relatorioRef.current, {
        backgroundColor: "#ffffff",
        scale: 3,
        useCORS: true,
      });
      const blob = await canvasParaBlob(canvas);
      const nomeArquivo = montarNomeArquivoSalas(dataDe, dataAte);
      const arquivo = new File([blob], nomeArquivo, { type: "image/png" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Cálculo Salas",
          text: montarLegendaSalas(dataDe, dataAte, totalGeral),
        });
        return;
      }

      baixarImagem(blob, nomeArquivo);
    } finally {
      setCompartilhando(false);
    }
  }

  return (
    <div className="modal modal-resumo-full ativo" onClick={onFechar}>
      <div
        className="modal-conteudo modal-conteudo-resumo-full salas-modal-conteudo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fechar-modal fechar-modal-resumo-full">
          <button className="btn-fechar" type="button" onClick={onFechar} aria-label="Fechar">
            <FaXmark />
          </button>
        </div>

        <div className="relatorio relatorio-resumo-full" ref={relatorioRef}>
          <div className="relatorio-topo">
            <h2>Cálculo Salas</h2>
            <p>
              <strong>Período:</strong> {formatarDataBR(dataDe)} até {formatarDataBR(dataAte)}
            </p>
          </div>

          <div className="secao-relatorio">
            {salas.length === 0 ? (
              <div className="estado-vazio">Ainda não há salas para mostrar no relatório.</div>
            ) : (
              <div className="salas-relatorio-legado">
                {salas.map((sala, index) => {
                  const resumo = calcularResumoSala(sala);

                  return (
                    <div className="salas-relatorio-item-legado" key={`rel-sala-${index}`}>
                      <strong className="salas-relatorio-item-titulo">
                        Sala {index + 1} - {(sala.nome || "SEM NOME").toUpperCase()}
                      </strong>

                      <Linha label="Bruto" valor={resumo.bruto} />
                      <Linha label="Despesas Extras" valor={resumo.despesasExtras} negativo />
                      <Linha label="Despesas" valor={resumo.despesas} negativo />
                      <Linha label="Cartão" valor={resumo.cartao} cartao />
                      <Linha label="Taxa parcelamento cartão" valor={resumo.taxa} negativo />
                      <Linha label="Resultado" valor={resumo.resultado} destaque />

                      <div className="salas-relatorio-partes-legado">
                        <span>
                          Pipo:{" "}
                          <strong className={classeValor(resumo.pipo)}>{moedaBR(resumo.pipo)}</strong>
                        </span>
                      </div>

                      {index < salas.length - 1 ? (
                        <div className="salas-relatorio-divisor" aria-hidden="true" />
                      ) : null}
                    </div>
                  );
                })}

                <div className="salas-relatorio-total-legado">
                  <strong>Total Geral:</strong>{" "}
                  <strong className={classeValor(totalGeral)}>{moedaBR(totalGeral)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relatorio-rodape-acoes">
          <button
            className="btn btn-claro btn-whatsapp"
            type="button"
            onClick={compartilharResumo}
            disabled={compartilhando}
          >
            <FaWhatsapp />
            {compartilhando ? "Gerando imagem..." : "Enviar no WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

function aguardarPintura() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

function canvasParaBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Nao foi possivel gerar a imagem do resumo."));
      }
    }, "image/png");
  });
}

function montarNomeArquivoSalas(dataDe, dataAte) {
  const inicio = formatarDataArquivo(dataDe);
  const fim = formatarDataArquivo(dataAte);
  const periodo = inicio && fim ? `${inicio}-${fim}` : inicio || fim || "periodo";
  return `${periodo}-salas.png`;
}

function montarLegendaSalas(dataDe, dataAte, totalGeral) {
  return `Cálculo Salas - ${formatarDataBR(dataDe)} até ${formatarDataBR(dataAte)}\n${moedaBR(totalGeral)}`;
}

function formatarDataArquivo(dataIso) {
  if (!dataIso) return "";

  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return "";

  return `${dia}_${mes}_${String(ano).slice(-2)}`;
}

function baixarImagem(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function Linha({ label, valor, destaque = false, negativo = false, cartao = false }) {
  const valorExibicao = negativo ? -Math.abs(valor) : valor;
  const classe = cartao ? "azul" : classeValor(valorExibicao);

  return (
    <div className={`linha-mobile salas-relatorio-linha-legado ${destaque ? "linha-mobile-total" : ""}`}>
      <span>{label}</span>
      <strong className={classe}>{moedaBR(valorExibicao)}</strong>
    </div>
  );
}
