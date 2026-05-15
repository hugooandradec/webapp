import { useRef, useState } from "react";

import html2canvas from "html2canvas";
import { FaWhatsapp } from "react-icons/fa";

import { classeValor, moedaBR, numeroDeMoeda, valorComSinal } from "../utils/money.js";
import { periodoTexto } from "../utils/calculos.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";

export default function ModalRelatorio({
  aberto,
  onFechar,
  dados,
  totais,
  linhasRotas,
  linhasResumoModal,
  debitosParaResumo,
  devedoresParaResumo,
}) {
  const relatorioRef = useRef(null);
  const [compartilhando, setCompartilhando] = useState(false);
  useBodyScrollLock(aberto);

  if (!aberto) {
    return null;
  }

  async function enviarResumoWhatsApp() {
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
      const nomeArquivo = montarNomeArquivoResumo(dados);
      const legenda = montarLegendaResumo(dados, totais);
      const arquivo = new File([blob], nomeArquivo, { type: "image/png" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Resumo do Fechamento",
          text: legenda,
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
        className="modal-conteudo modal-conteudo-resumo-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fechar-modal fechar-modal-resumo-full">
          <button className="btn-fechar" type="button" onClick={onFechar}>
            x
          </button>
        </div>

        <div className="relatorio relatorio-resumo-full" ref={relatorioRef}>
          <div className="relatorio-topo">
            <h2>Resumo</h2>
            <p>
              <strong>Período:</strong> {periodoTexto(dados.periodoInicio, dados.periodoFim)}
            </p>
            <div className="relatorio-topo-acoes" data-html2canvas-ignore>
              <button
                className="btn btn-claro btn-whatsapp"
                type="button"
                onClick={enviarResumoWhatsApp}
                disabled={compartilhando}
              >
                <FaWhatsapp />
                {compartilhando ? "Gerando imagem..." : "Enviar no WhatsApp"}
              </button>
            </div>
          </div>

          <SecaoRotas linhasRotas={linhasRotas} totalRota={totais.totalRota} />

          <div className="secao-relatorio secao-resumo-geral">
            <h3>Resumo</h3>

            <div className="resumo-geral-lista">
              {linhasResumoModal.map((item) => (
                <div
                  className={`resumo-geral-linha ${item.total ? "total" : ""}`}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong className={classeValor(item.valor)}>
                    {valorComSinal(item.valor)}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <SecaoDebitos debitosParaResumo={debitosParaResumo} />

          <SecaoVales
            devedoresParaResumo={devedoresParaResumo}
            totalVales={totais.valesAtualResumo}
          />
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

function montarNomeArquivoResumo(dados) {
  const inicio = formatarDataArquivo(dados.periodoInicio);
  const fim = formatarDataArquivo(dados.periodoFim);
  const periodo = inicio && fim ? `${inicio}-${fim}` : inicio || fim || "periodo";
  return `${periodo}-centro.png`;
}

function montarLegendaResumo(dados, totais) {
  return `Centro - ${formatarPeriodoLegenda(dados)}\n${moedaBR(totais.firmaResumo)}`;
}

function formatarPeriodoLegenda(dados) {
  const inicio = formatarDataLegenda(dados.periodoInicio);
  const fim = formatarDataLegenda(dados.periodoFim);

  if (inicio && fim) return `${inicio} até ${fim}`;
  return inicio || fim || "periodo";
}

function formatarDataLegenda(dataIso) {
  if (!dataIso) return "";

  const [, mes, dia] = String(dataIso).split("-");
  if (!mes || !dia) return "";

  return `${dia}/${mes}`;
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

function SecaoRotas({ linhasRotas, totalRota }) {
  return (
    <div className="secao-relatorio">
      <h3>Total Rotas</h3>

      <div className="tabela-wrap tabela-desktop">
        <table className="tabela-relatorio">
          <thead>
            <tr>
              <th>Turano</th>
              <th>RC</th>
              <th>Centro</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {linhasRotas.map((item) => (
                <td key={item.label} className={classeValor(item.valor)}>
                  {valorComSinal(item.valor)}
                </td>
              ))}
              <td className={classeValor(totalRota)}>{valorComSinal(totalRota)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="lista-mobile">
        <div className="card-mobile card-mobile-compacto">
          {linhasRotas.map((item) => (
            <div className="linha-mobile" key={item.label}>
              <span>{item.label}</span>
              <strong className={classeValor(item.valor)}>{valorComSinal(item.valor)}</strong>
            </div>
          ))}

          <div className="linha-mobile linha-mobile-total">
            <span>Total</span>
            <strong className={classeValor(totalRota)}>{valorComSinal(totalRota)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecaoDebitos({ debitosParaResumo }) {
  return (
    <div className="secao-relatorio">
      <h3>Débitos</h3>

      <div className="tabela-wrap tabela-desktop">
        <table className="tabela-relatorio">
          <thead>
            <tr>
              <th>#</th>
              <th>Descrição</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {debitosParaResumo.length === 0 ? (
              <tr>
                <td>1</td>
                <td>-</td>
                <td>{moedaBR(0)}</td>
              </tr>
            ) : (
              debitosParaResumo.map((item, index) => {
                const valor = -numeroDeMoeda(item.valor);

                return (
                  <tr key={`debito-resumo-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.ponto || "-"}</td>
                    <td className={classeValor(valor)}>{valorComSinal(valor)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="lista-mobile">
        {debitosParaResumo.length === 0 ? (
          <div className="card-mobile card-mobile-linha-unica">
            <div className="linha-mobile-inline">
              <span>-</span>
              <strong>{moedaBR(0)}</strong>
            </div>
          </div>
        ) : (
          debitosParaResumo.map((item, index) => {
            const valor = -numeroDeMoeda(item.valor);

            return (
              <div className="card-mobile card-mobile-linha-unica" key={`debito-resumo-mobile-${index}`}>
                <div className="linha-mobile-inline">
                  <span>{item.ponto || "-"}</span>
                  <strong className={classeValor(valor)}>{valorComSinal(valor)}</strong>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SecaoVales({ devedoresParaResumo, totalVales }) {
  return (
    <div className="secao-relatorio">
      <h3>Vales</h3>

      <div className="tabela-wrap tabela-desktop">
        <table className="tabela-relatorio">
          <thead>
            <tr>
              <th>#</th>
              <th>Ponto</th>
              <th>Anterior</th>
              <th>Pago</th>
              <th>Semana</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {devedoresParaResumo.length === 0 ? (
              <tr>
                <td>1</td>
                <td>-</td>
                <td>{moedaBR(0)}</td>
                <td>{moedaBR(0)}</td>
                <td>{moedaBR(0)}</td>
                <td>{moedaBR(0)}</td>
              </tr>
            ) : (
              devedoresParaResumo.map((item, index) => {
                const anterior = -Math.abs(numeroDeMoeda(item.valorAnterior));
                const pago = numeroDeMoeda(item.pago);
                const semana = -Math.abs(numeroDeMoeda(item.semana));
                const total = -Math.abs(numeroDeMoeda(item.valorAtual));

                return (
                  <tr key={`devedor-resumo-${index}`}>
                    <td>{index + 1}</td>
                    <td>{item.ponto || "-"}</td>
                    <td className={classeValor(anterior)}>{valorComSinal(anterior)}</td>
                    <td className={classeValor(pago)}>{valorComSinal(pago)}</td>
                    <td className={classeValor(semana)}>{valorComSinal(semana)}</td>
                    <td className={classeValor(total)}>{valorComSinal(total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="lista-mobile">
        {devedoresParaResumo.length === 0 ? (
          <div className="card-mobile card-mobile-linha-unica">
            <div className="linha-mobile-inline">
              <span>-</span>
              <strong>{moedaBR(0)}</strong>
            </div>
          </div>
        ) : (
          devedoresParaResumo.map((item, index) => {
            const anterior = -Math.abs(numeroDeMoeda(item.valorAnterior));
            const pago = numeroDeMoeda(item.pago);
            const semana = -Math.abs(numeroDeMoeda(item.semana));
            const total = -Math.abs(numeroDeMoeda(item.valorAtual));

            return (
              <div className="card-mobile card-mobile-linha-unica" key={`devedor-resumo-mobile-${index}`}>
                <div className="vale-mobile-resumo-linha">
                  <span className="vale-mobile-ponto">{item.ponto || "-"}</span>
                  <span className="vale-mobile-separador">|</span>
                  <span className={`vale-mobile-item ${classeValor(anterior)}`.trim()}>
                    A: {valorComSinal(anterior)}
                  </span>
                  <span className="vale-mobile-separador">|</span>
                  <span className={`vale-mobile-item ${classeValor(pago)}`.trim()}>
                    P: {valorComSinal(pago)}
                  </span>
                  <span className="vale-mobile-separador">|</span>
                  <span className={`vale-mobile-item ${classeValor(semana)}`.trim()}>
                    S: {valorComSinal(semana)}
                  </span>
                  <span className="vale-mobile-separador">|</span>
                  <span className={`vale-mobile-item ${classeValor(total)}`.trim()}>
                    T: {valorComSinal(total)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="resumo-geral-lista resumo-total-vales">
        <div className="resumo-geral-linha total">
          <span>Valor Total dos Vales</span>
          <strong className={classeValor(totalVales)}>{valorComSinal(totalVales)}</strong>
        </div>
      </div>
    </div>
  );
}
