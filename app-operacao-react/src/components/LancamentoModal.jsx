import { useRef, useState } from "react";

import html2canvas from "html2canvas";
import { FaWhatsapp } from "react-icons/fa";

import {
  classeValor,
  moedaBRSemCentavos,
  valorComSinalSemCentavos,
} from "../utils/money.js";
import {
  formatarDataComDiaSemana,
  formatarDataCurta,
  formatarDataHora,
  formatarNomeCaixa,
} from "../utils/lancamentoHelpers.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";

export default function LancamentoModal({
  aberto,
  tipoModal,
  caixaAtiva,
  dadosCaixaAtual,
  listaLancamentos,
  valorInicialNumero,
  totalEntrada,
  totalSaida,
  valorTotal,
  resumoTotalCaixas,
  historicoModal,
  historicoDoPonto,
  onFechar,
}) {
  const relatorioRef = useRef(null);
  const [compartilhando, setCompartilhando] = useState(false);
  useBodyScrollLock(aberto);

  if (!aberto) return null;

  const podeCompartilhar = tipoModal === "resumo-caixa";

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
      const nomeArquivo = montarNomeArquivoLancamento({
        caixaAtiva,
        dadosCaixaAtual,
      });
      const legenda = montarLegendaLancamento({
        caixaAtiva,
        dadosCaixaAtual,
        valorTotal,
      });
      const arquivo = new File([blob], nomeArquivo, { type: "image/png" });

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Resumo do Lançamento",
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
        className="modal-conteudo modal-conteudo-resumo-full modal-conteudo-lancamento"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fechar-modal fechar-modal-resumo-full fechar-modal-lancamento">
          <button className="btn-fechar" type="button" onClick={onFechar}>
            ×
          </button>
        </div>

        <div className="relatorio relatorio-resumo-full relatorio-lancamento" ref={relatorioRef}>
          {tipoModal === "resumo-caixa" ? (
            <ResumoCaixa
              caixaAtiva={caixaAtiva}
              dadosCaixaAtual={dadosCaixaAtual}
              listaLancamentos={listaLancamentos}
              valorInicialNumero={valorInicialNumero}
              totalEntrada={totalEntrada}
              totalSaida={totalSaida}
              valorTotal={valorTotal}
            />
          ) : null}

          {tipoModal === "resumo-total" ? (
            <ResumoTotalCaixas resumoTotalCaixas={resumoTotalCaixas} />
          ) : null}

          {tipoModal === "historico" && historicoModal ? (
            <HistoricoModal
              historicoModal={historicoModal}
              caixaAtiva={caixaAtiva}
              historicoDoPonto={historicoDoPonto}
            />
          ) : null}
        </div>

        {podeCompartilhar ? (
          <div className="relatorio-rodape-acoes relatorio-rodape-acoes-lancamento">
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
        ) : null}
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

function montarNomeArquivoLancamento({ caixaAtiva, dadosCaixaAtual }) {
  const data = formatarDataArquivo(dadosCaixaAtual.data) || "data";
  const caixa = normalizarNomeArquivo(formatarNomeCaixa(caixaAtiva) || "caixa");
  return `${data}-${caixa}.png`;
}

function montarLegendaLancamento({ caixaAtiva, dadosCaixaAtual, valorTotal }) {
  return `${formatarNomeCaixa(caixaAtiva)} - ${formatarDataCurta(dadosCaixaAtual.data)}\n${moedaBRSemCentavos(valorTotal)}`;
}

function formatarDataArquivo(dataIso) {
  if (!dataIso) return "";

  const [ano, mes, dia] = String(dataIso).split("-");
  if (!ano || !mes || !dia) return "";

  return `${dia}_${mes}_${String(ano).slice(-2)}`;
}

function normalizarNomeArquivo(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baixarImagem(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

function ResumoCaixa({
  caixaAtiva,
  dadosCaixaAtual,
  listaLancamentos,
  valorInicialNumero,
  totalEntrada,
  totalSaida,
  valorTotal,
}) {
  return (
    <>
      <div className="relatorio-topo">
        <h2>Resumo do Caixa</h2>
        <p>
          <strong>Caixa:</strong> {formatarNomeCaixa(caixaAtiva)}
        </p>
        <p>
          <strong>Data:</strong> {formatarDataComDiaSemana(dadosCaixaAtual.data)}
        </p>
      </div>

      <div className="relatorio-cards relatorio-cards-resumo lancamento-modal-cards">
        <ResumoCard rotulo="Valor Inicial" valor={valorInicialNumero} />
        <ResumoCard rotulo="Valor Final" valor={valorTotal} />
      </div>

      <div className="secao-relatorio secao-resumo-geral">
        <h3>Resumo</h3>

        <div className="resumo-geral-lista">
          <LinhaResumo
            label="Valor Inicial"
            valor={valorInicialNumero}
            className={classeValor(valorInicialNumero)}
            mobileOnly
          />
          <LinhaResumo label="Entrada" valor={totalEntrada} className="positivo" />
          <LinhaResumo label="Saída" valor={-totalSaida} className="negativo" />
          <LinhaResumo
            label="Valor Final"
            valor={valorTotal}
            className={classeValor(valorTotal)}
            total
          />
        </div>
      </div>

      <div className="secao-relatorio">
        <h3>Lançamentos</h3>

        <div className="tabela-wrap tabela-desktop">
          <table className="tabela-relatorio">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {listaLancamentos.length === 0 ? (
                <tr>
                  <td>-</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                </tr>
              ) : (
                listaLancamentos.map((item, index) => {
                  const total = (Number(item.dinheiro) || 0) - (Number(item.saida) || 0);
                  const mostrarEntrada = (Number(item.dinheiro) || 0) !== 0;
                  const mostrarSaida = (Number(item.saida) || 0) !== 0;
                  const mostrarTotal = mostrarEntrada && mostrarSaida;

                  return (
                    <tr key={`resumo-caixa-${index}`}>
                      <td>{item.ponto}</td>
                      <td className={classeValor(item.dinheiro)}>
                        {mostrarEntrada ? valorComSinalSemCentavos(item.dinheiro) : "-"}
                      </td>
                      <td className={classeValor(-Math.abs(item.saida))}>
                        {mostrarSaida ? valorComSinalSemCentavos(-Math.abs(item.saida)) : "-"}
                      </td>
                      <td className={classeValor(total)}>
                        {mostrarTotal ? valorComSinalSemCentavos(total) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="lista-mobile">
          {listaLancamentos.length === 0 ? (
            <div className="card-mobile card-mobile-linha-unica">
              <div className="linha-mobile-inline">
                <span>Sem entradas.</span>
                <strong>{moedaBRSemCentavos(0)}</strong>
              </div>
            </div>
          ) : (
            <div className="card-mobile card-mobile-compacto lancamento-mobile-lista-card">
              <div className="lancamento-mobile-tabela-cabecalho">
                <span className="lancamento-mobile-col-ponto">Ponto</span>
                <span className="lancamento-mobile-col-valor">Entrada</span>
                <span className="lancamento-mobile-col-valor">Saída</span>
                <span className="lancamento-mobile-col-valor">Total</span>
              </div>

              {listaLancamentos.map((item, index) => {
                const total = (Number(item.dinheiro) || 0) - (Number(item.saida) || 0);
                const mostrarEntrada = (Number(item.dinheiro) || 0) !== 0;
                const mostrarSaida = (Number(item.saida) || 0) !== 0;
                const mostrarTotal = mostrarEntrada && mostrarSaida;

                return (
                  <div
                    className="lancamento-mobile-tabela-linha"
                    key={`resumo-caixa-mobile-${index}`}
                  >
                    <span className="lancamento-mobile-col lancamento-mobile-col-ponto">
                      {item.ponto}
                    </span>
                    <strong
                      className={`lancamento-mobile-col ${mostrarEntrada ? "positivo" : ""}`.trim()}
                    >
                      {mostrarEntrada ? valorComSinalSemCentavos(item.dinheiro) : "-"}
                    </strong>
                    <strong
                      className={`lancamento-mobile-col ${mostrarSaida ? "negativo" : ""}`.trim()}
                    >
                      {mostrarSaida ? valorComSinalSemCentavos(-Math.abs(item.saida)) : "-"}
                    </strong>
                    <strong
                      className={`lancamento-mobile-col ${mostrarTotal ? classeValor(total) : ""}`.trim()}
                    >
                      {mostrarTotal ? valorComSinalSemCentavos(total) : "-"}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ResumoTotalCaixas({ resumoTotalCaixas }) {
  return (
    <>
      <div className="relatorio-topo">
        <h2>Relatório Total dos Caixas</h2>
      </div>

      <div className="relatorio-cards relatorio-cards-resumo">
        <div className="rel-card">
          <div className="r1">Caixas</div>
          <div className="r2">{resumoTotalCaixas.linhas.length}</div>
        </div>

        <ResumoCard rotulo="Total Geral" valor={resumoTotalCaixas.somaTotal} />
      </div>

      <div className="secao-relatorio">
        <h3>Caixas</h3>

        <div className="tabela-wrap tabela-desktop">
          <table className="tabela-relatorio">
            <thead>
              <tr>
                <th>Caixa</th>
                <th>Data</th>
                <th>Inicial</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {resumoTotalCaixas.linhas.map((item, index) => (
                <tr key={`total-caixas-${index}`}>
                  <td>{formatarNomeCaixa(item.caixa)}</td>
                  <td>{formatarDataCurta(item.data)}</td>
                  <td className={classeValor(item.valorInicial)}>
                    {valorComSinalSemCentavos(item.valorInicial)}
                  </td>
                  <td className="positivo">{valorComSinalSemCentavos(item.entrada)}</td>
                  <td className="negativo">{valorComSinalSemCentavos(-item.saida)}</td>
                  <td className={classeValor(item.valorTotal)}>
                    {valorComSinalSemCentavos(item.valorTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">
                  <strong>Total Geral</strong>
                </td>
                <td className={classeValor(resumoTotalCaixas.somaInicial)}>
                  <strong>{valorComSinalSemCentavos(resumoTotalCaixas.somaInicial)}</strong>
                </td>
                <td className="positivo">
                  <strong>{valorComSinalSemCentavos(resumoTotalCaixas.somaEntrada)}</strong>
                </td>
                <td className="negativo">
                  <strong>{valorComSinalSemCentavos(-resumoTotalCaixas.somaSaida)}</strong>
                </td>
                <td className={classeValor(resumoTotalCaixas.somaTotal)}>
                  <strong>{valorComSinalSemCentavos(resumoTotalCaixas.somaTotal)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="lista-mobile">
          {resumoTotalCaixas.linhas.map((item, index) => (
            <div className="card-mobile lancamento-mobile-resumo" key={`total-caixas-mobile-${index}`}>
              <div className="lancamento-mobile-resumo-linha">
                <span className="lancamento-mobile-ponto">{formatarNomeCaixa(item.caixa)}</span>
                <span className="lancamento-separador">|</span>
                <span>{formatarDataCurta(item.data)}</span>
                <span className="lancamento-separador">|</span>
                <span className={classeValor(item.valorInicial)}>
                  I: {valorComSinalSemCentavos(item.valorInicial)}
                </span>
                <span className="lancamento-separador">|</span>
                <span className="positivo">
                  E: {valorComSinalSemCentavos(item.entrada)}
                </span>
                <span className="lancamento-separador">|</span>
                <span className="negativo">
                  S: {valorComSinalSemCentavos(-item.saida)}
                </span>
                <span className="lancamento-separador">|</span>
                <span className={classeValor(item.valorTotal)}>
                  T: {valorComSinalSemCentavos(item.valorTotal)}
                </span>
              </div>
            </div>
          ))}

          <div className="card-mobile lancamento-mobile-resumo">
            <div className="lancamento-mobile-resumo-linha">
              <span className="lancamento-mobile-ponto">Total Geral</span>
              <span className="lancamento-separador">|</span>
              <span className={classeValor(resumoTotalCaixas.somaInicial)}>
                I: {valorComSinalSemCentavos(resumoTotalCaixas.somaInicial)}
              </span>
              <span className="lancamento-separador">|</span>
              <span className="positivo">
                E: {valorComSinalSemCentavos(resumoTotalCaixas.somaEntrada)}
              </span>
              <span className="lancamento-separador">|</span>
              <span className="negativo">
                S: {valorComSinalSemCentavos(-resumoTotalCaixas.somaSaida)}
              </span>
              <span className="lancamento-separador">|</span>
              <span className={classeValor(resumoTotalCaixas.somaTotal)}>
                T: {valorComSinalSemCentavos(resumoTotalCaixas.somaTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HistoricoModal({ historicoModal, caixaAtiva, historicoDoPonto }) {
  return (
    <>
      <div className="relatorio-topo">
        <h2>Histórico</h2>
        <p>
          <strong>Ponto:</strong> {historicoModal.ponto}
        </p>
        <p>
          <strong>Caixa:</strong> {formatarNomeCaixa(caixaAtiva)}
        </p>
      </div>

      <div className="secao-relatorio">
        <h3>Lançamentos do Ponto</h3>

        <div className="tabela-wrap tabela-desktop">
          <table className="tabela-relatorio">
            <thead>
              <tr>
                <th>Data</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {historicoDoPonto.length === 0 ? (
                <tr>
                  <td>-</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                  <td>{moedaBRSemCentavos(0)}</td>
                </tr>
              ) : (
                historicoDoPonto.map((item, index) => {
                  const linha = normalizarLinhaHistorico(item);

                  return (
                    <tr key={`historico-${index}`}>
                      <td>{formatarDataHora(item.ts)}</td>
                      <td className={classeValor(linha.entrada)}>
                        {valorComSinalSemCentavos(linha.entrada)}
                      </td>
                      <td className={classeValor(-linha.saida)}>
                        {valorComSinalSemCentavos(-linha.saida)}
                      </td>
                      <td className={classeValor(linha.subtotal)}>
                        {valorComSinalSemCentavos(linha.subtotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="lista-mobile">
          {historicoDoPonto.length === 0 ? (
            <div className="card-mobile card-mobile-linha-unica">
              <div className="linha-mobile-inline">
                <span>Sem entradas.</span>
                <strong>{moedaBRSemCentavos(0)}</strong>
              </div>
            </div>
          ) : (
            historicoDoPonto.map((item, index) => {
              const linha = normalizarLinhaHistorico(item);

              return (
                <div className="card-mobile card-mobile-vale" key={`historico-mobile-${index}`}>
                  <div className="titulo-mobile titulo-mobile-vale">
                    {formatarDataHora(item.ts)}
                  </div>

                  <div className="grid-mobile-vale">
                    <InfoMobile
                      label="Entrada"
                      valor={valorComSinalSemCentavos(linha.entrada)}
                      className={classeValor(linha.entrada)}
                    />
                    <InfoMobile
                      label="Saída"
                      valor={valorComSinalSemCentavos(-linha.saida)}
                      className={classeValor(-linha.saida)}
                    />
                    <InfoMobile
                      label="Total"
                      valor={valorComSinalSemCentavos(linha.subtotal)}
                      className={classeValor(linha.subtotal)}
                      full
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function ResumoCard({ rotulo, valor }) {
  return (
    <div className="rel-card">
      <div className="r1">{rotulo}</div>
      <div className={`r2 ${classeValor(valor)}`}>{valorComSinalSemCentavos(valor)}</div>
    </div>
  );
}

function LinhaResumo({ label, valor, className = "", total = false, mobileOnly = false }) {
  return (
    <div
      className={`resumo-geral-linha ${total ? "total" : ""} ${mobileOnly ? "lancamento-mobile-only" : ""}`.trim()}
    >
      <span>{label}</span>
      <strong className={className}>{valorComSinalSemCentavos(valor)}</strong>
    </div>
  );
}

function InfoMobile({ label, valor, className = "", full = false }) {
  return (
    <div className={`info-mobile-vale ${full ? "info-mobile-vale-full" : ""}`.trim()}>
      <span>{label}</span>
      <strong className={className}>{valor}</strong>
    </div>
  );
}

function normalizarLinhaHistorico(item) {
  let entrada = Number(item.dinheiro) || 0;
  let saida = Number(item.saida) || 0;

  if (entrada < 0) {
    saida += Math.abs(entrada);
    entrada = 0;
  }

  return {
    entrada,
    saida,
    subtotal: entrada - saida,
  };
}
