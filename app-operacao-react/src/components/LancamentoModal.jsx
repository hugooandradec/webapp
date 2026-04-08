import { classeValor, moedaBR, valorComSinal } from "../utils/money.js";
import {
  formatarDataHora,
  formatarNomeCaixa,
  textoDataExtenso,
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
          <strong>Data:</strong> {textoDataExtenso(dadosCaixaAtual.data)}
        </p>
      </div>

      <div className="relatorio-cards relatorio-cards-resumo">
        <ResumoCard rotulo="Valor Inicial" valor={valorInicialNumero} />
        <ResumoCard rotulo="Valor Total" valor={valorTotal} />
      </div>

      <div className="secao-relatorio secao-resumo-geral">
        <h3>Resumo</h3>

        <div className="resumo-geral-lista">
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
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {listaLancamentos.length === 0 ? (
                <tr>
                  <td>-</td>
                  <td>{moedaBR(0)}</td>
                  <td>{moedaBR(0)}</td>
                  <td>{moedaBR(0)}</td>
                </tr>
              ) : (
                listaLancamentos.map((item, index) => {
                  const subtotal = (Number(item.dinheiro) || 0) - (Number(item.saida) || 0);

                  return (
                    <tr key={`resumo-caixa-${index}`}>
                      <td>{item.ponto}</td>
                      <td className={classeValor(item.dinheiro)}>
                        {item.dinheiro ? valorComSinal(item.dinheiro) : "-"}
                      </td>
                      <td className={classeValor(-Math.abs(item.saida))}>
                        {item.saida ? valorComSinal(-Math.abs(item.saida)) : "-"}
                      </td>
                      <td className={classeValor(subtotal)}>{valorComSinal(subtotal)}</td>
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
                <strong>{moedaBR(0)}</strong>
              </div>
            </div>
          ) : (
            listaLancamentos.map((item, index) => {
              const subtotal = (Number(item.dinheiro) || 0) - (Number(item.saida) || 0);

              return (
                <div className="card-mobile card-mobile-vale" key={`resumo-caixa-mobile-${index}`}>
                  <div className="titulo-mobile titulo-mobile-vale">{item.ponto}</div>

                  <div className="grid-mobile-vale">
                    <InfoMobile label="Entrada" valor={item.dinheiro ? valorComSinal(item.dinheiro) : moedaBR(0)} className={classeValor(item.dinheiro)} />
                    <InfoMobile
                      label="Saída"
                      valor={item.saida ? valorComSinal(-Math.abs(item.saida)) : moedaBR(0)}
                      className={classeValor(-Math.abs(item.saida))}
                    />
                    <InfoMobile
                      label="Subtotal"
                      valor={valorComSinal(subtotal)}
                      className={classeValor(subtotal)}
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
                  <td>{item.data ? item.data.split("-").reverse().join("/") : "-"}</td>
                  <td className={classeValor(item.valorInicial)}>
                    {valorComSinal(item.valorInicial)}
                  </td>
                  <td className="positivo">{valorComSinal(item.entrada)}</td>
                  <td className="negativo">{valorComSinal(-item.saida)}</td>
                  <td className={classeValor(item.valorTotal)}>
                    {valorComSinal(item.valorTotal)}
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
                  <strong>{valorComSinal(resumoTotalCaixas.somaInicial)}</strong>
                </td>
                <td className="positivo">
                  <strong>{valorComSinal(resumoTotalCaixas.somaEntrada)}</strong>
                </td>
                <td className="negativo">
                  <strong>{valorComSinal(-resumoTotalCaixas.somaSaida)}</strong>
                </td>
                <td className={classeValor(resumoTotalCaixas.somaTotal)}>
                  <strong>{valorComSinal(resumoTotalCaixas.somaTotal)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="lista-mobile">
          {resumoTotalCaixas.linhas.map((item, index) => (
            <div className="card-mobile card-mobile-vale" key={`total-caixas-mobile-${index}`}>
              <div className="titulo-mobile titulo-mobile-vale">
                {formatarNomeCaixa(item.caixa)}
              </div>

              <div className="grid-mobile-vale">
                <InfoMobile label="Data" valor={item.data ? item.data.split("-").reverse().join("/") : "-"} />
                <InfoMobile label="Inicial" valor={valorComSinal(item.valorInicial)} className={classeValor(item.valorInicial)} />
                <InfoMobile label="Entrada" valor={valorComSinal(item.entrada)} className="positivo" />
                <InfoMobile label="Saída" valor={valorComSinal(-item.saida)} className="negativo" />
                <InfoMobile
                  label="Total"
                  valor={valorComSinal(item.valorTotal)}
                  className={classeValor(item.valorTotal)}
                  full
                />
              </div>
            </div>
          ))}

          <div className="card-mobile card-mobile-vale">
            <div className="titulo-mobile titulo-mobile-vale">Total Geral</div>

            <div className="grid-mobile-vale">
              <InfoMobile
                label="Inicial"
                valor={valorComSinal(resumoTotalCaixas.somaInicial)}
                className={classeValor(resumoTotalCaixas.somaInicial)}
              />
              <InfoMobile
                label="Entrada"
                valor={valorComSinal(resumoTotalCaixas.somaEntrada)}
                className="positivo"
              />
              <InfoMobile
                label="Saída"
                valor={valorComSinal(-resumoTotalCaixas.somaSaida)}
                className="negativo"
              />
              <InfoMobile
                label="Total"
                valor={valorComSinal(resumoTotalCaixas.somaTotal)}
                className={classeValor(resumoTotalCaixas.somaTotal)}
                full
              />
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
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {historicoDoPonto.length === 0 ? (
                <tr>
                  <td>-</td>
                  <td>{moedaBR(0)}</td>
                  <td>{moedaBR(0)}</td>
                  <td>{moedaBR(0)}</td>
                </tr>
              ) : (
                historicoDoPonto.map((item, index) => {
                  const linha = normalizarLinhaHistorico(item);

                  return (
                    <tr key={`historico-${index}`}>
                      <td>{formatarDataHora(item.ts)}</td>
                      <td className={classeValor(linha.entrada)}>
                        {linha.entrada ? valorComSinal(linha.entrada) : "-"}
                      </td>
                      <td className={classeValor(-linha.saida)}>
                        {linha.saida ? valorComSinal(-linha.saida) : "-"}
                      </td>
                      <td className={classeValor(linha.subtotal)}>
                        {valorComSinal(linha.subtotal)}
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
                <strong>{moedaBR(0)}</strong>
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
                      valor={linha.entrada ? valorComSinal(linha.entrada) : moedaBR(0)}
                      className={classeValor(linha.entrada)}
                    />
                    <InfoMobile
                      label="Saída"
                      valor={linha.saida ? valorComSinal(-linha.saida) : moedaBR(0)}
                      className={classeValor(-linha.saida)}
                    />
                    <InfoMobile
                      label="Subtotal"
                      valor={valorComSinal(linha.subtotal)}
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
      <div className={`r2 ${classeValor(valor)}`}>{valorComSinal(valor)}</div>
    </div>
  );
}

function LinhaResumo({ label, valor, className = "", total = false }) {
  return (
    <div className={`resumo-geral-linha ${total ? "total" : ""}`.trim()}>
      <span>{label}</span>
      <strong className={className}>{valorComSinal(valor)}</strong>
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
