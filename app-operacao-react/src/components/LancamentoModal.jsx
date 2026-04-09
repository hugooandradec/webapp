import {
  classeValor,
  moedaBRSemCentavos,
  valorComSinalSemCentavos,
} from "../utils/money.js";
import {
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
  useBodyScrollLock(aberto);

  if (!aberto) return null;

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

        <div className="relatorio relatorio-resumo-full relatorio-lancamento">
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
      </div>
    </div>
  );
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
          <strong>Data:</strong> {formatarDataCurta(dadosCaixaAtual.data)}
        </p>
      </div>

      <div className="relatorio-cards relatorio-cards-resumo lancamento-modal-cards">
        <ResumoCard rotulo="Valor Inicial" valor={valorInicialNumero} />
        <ResumoCard rotulo="Valor Total" valor={valorTotal} />
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
            label="Valor Total"
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

                  return (
                    <tr key={`resumo-caixa-${index}`}>
                      <td>{item.ponto}</td>
                      <td className={classeValor(item.dinheiro)}>
                        {valorComSinalSemCentavos(item.dinheiro)}
                      </td>
                      <td className={classeValor(-Math.abs(item.saida))}>
                        {valorComSinalSemCentavos(-Math.abs(item.saida))}
                      </td>
                      <td className={classeValor(total)}>
                        {valorComSinalSemCentavos(total)}
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
            listaLancamentos.map((item, index) => {
              const total = (Number(item.dinheiro) || 0) - (Number(item.saida) || 0);
              const mostrarEntrada = (Number(item.dinheiro) || 0) !== 0;
              const mostrarSaida = (Number(item.saida) || 0) !== 0;

              return (
                <div
                  className="card-mobile lancamento-mobile-resumo"
                  key={`resumo-caixa-mobile-${index}`}
                >
                  <div className="lancamento-mobile-resumo-linha">
                    <span className="lancamento-mobile-ponto">{item.ponto}</span>

                    {mostrarEntrada ? (
                      <>
                        <span className="lancamento-separador">|</span>
                        <span className="positivo">
                          E: {valorComSinalSemCentavos(item.dinheiro)}
                        </span>
                      </>
                    ) : null}

                    {mostrarSaida ? (
                      <>
                        <span className="lancamento-separador">|</span>
                        <span className="negativo">
                          S: {valorComSinalSemCentavos(-Math.abs(item.saida))}
                        </span>
                      </>
                    ) : null}

                    <span className="lancamento-separador">|</span>
                    <span className={classeValor(total)}>
                      Total: {valorComSinalSemCentavos(total)}
                    </span>
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
                  Inicial: {valorComSinalSemCentavos(item.valorInicial)}
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
                  Total: {valorComSinalSemCentavos(item.valorTotal)}
                </span>
              </div>
            </div>
          ))}

          <div className="card-mobile lancamento-mobile-resumo">
            <div className="lancamento-mobile-resumo-linha">
              <span className="lancamento-mobile-ponto">Total Geral</span>
              <span className="lancamento-separador">|</span>
              <span className={classeValor(resumoTotalCaixas.somaInicial)}>
                Inicial: {valorComSinalSemCentavos(resumoTotalCaixas.somaInicial)}
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
                Total: {valorComSinalSemCentavos(resumoTotalCaixas.somaTotal)}
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
