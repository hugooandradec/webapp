import { FaXmark } from "react-icons/fa6";

import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import { classeValor, moedaBR } from "../utils/money.js";
import { calcularValoresMaquina } from "../utils/preFecho.js";

export default function PreFechoModal({
  aberto,
  dataFechamento,
  dataPreFecho,
  cliente,
  maquinas,
  totalGeral,
  onFechar,
}) {
  useBodyScrollLock(aberto);

  if (!aberto) {
    return null;
  }

  return (
    <div className="modal modal-resumo-full ativo" onClick={onFechar}>
      <div
        className="modal-conteudo modal-conteudo-resumo-full pre-fecho-modal-conteudo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fechar-modal fechar-modal-resumo-full">
          <button className="btn-fechar" type="button" onClick={onFechar} aria-label="Fechar">
            <FaXmark />
          </button>
        </div>

        <div className="relatorio relatorio-resumo-full">
          <div className="relatorio-topo">
            <h2>Pre-Fecho</h2>
            <p>
              <strong>Fechamento:</strong> {dataFechamento || "-"}
            </p>
            <p>
              <strong>Pré-fecho:</strong> {dataPreFecho || "-"}
            </p>
            <p>
              <strong>Ponto:</strong> {cliente || "-"}
            </p>
          </div>

          <div className="secao-relatorio">
            <h3>Detalhamento</h3>

            {maquinas.length === 0 ? (
              <div className="estado-vazio">
                Ainda não há máquinas lançadas para mostrar no relatório.
              </div>
            ) : (
              <div className="pre-fecho-relatorio-lista">
                {maquinas.map((maquina, index) => {
                  const valores = calcularValoresMaquina(maquina);

                  return (
                    <div className="card-mobile pre-fecho-relatorio-card" key={`rel-card-${index}`}>
                      <div className="card-mobile-topo">
                        <span className="indice-mobile">{index + 1}</span>
                        <strong className="titulo-mobile">
                          {maquina.selo || "Sem selo"}
                          {maquina.jogo ? ` - ${maquina.jogo}` : ""}
                        </strong>
                      </div>

                      <div className="linha-mobile">
                        <span>Dif. entrada</span>
                        <strong className={classeValor(valores.diferencaEntrada)}>
                          {moedaBR(valores.diferencaEntrada)}
                        </strong>
                      </div>

                      <div className="linha-mobile">
                        <span>Dif. saída</span>
                        <strong className={classeValor(valores.diferencaSaida)}>
                          {moedaBR(valores.diferencaSaida)}
                        </strong>
                      </div>

                      <div className="linha-mobile linha-mobile-total">
                        <span>Resultado</span>
                        <strong className={classeValor(valores.resultado)}>
                          {moedaBR(valores.resultado)}
                        </strong>
                      </div>
                    </div>
                  );
                })}

                <div className="card-mobile pre-fecho-relatorio-card pre-fecho-relatorio-total">
                  <div className="linha-mobile linha-mobile-total">
                    <span>Total geral</span>
                    <strong className={classeValor(totalGeral)}>
                      {moedaBR(totalGeral)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
