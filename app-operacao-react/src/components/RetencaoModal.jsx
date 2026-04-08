import { FaXmark } from "react-icons/fa6";

import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import { classeValor, moedaBR } from "../utils/money.js";
import {
  calcularResumoMaquinaRetencao,
  formatarDataBR,
  formatarPercentual,
} from "../utils/retencao.js";

export default function RetencaoModal({
  aberto,
  data,
  ponto,
  maquinas,
  retencaoMedia,
  onFechar,
}) {
  useBodyScrollLock(aberto);

  if (!aberto) return null;

  return (
    <div className="modal modal-resumo-full ativo" onClick={onFechar}>
      <div
        className="modal-conteudo modal-conteudo-resumo-full retencao-modal-conteudo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fechar-modal fechar-modal-resumo-full">
          <button className="btn-fechar" type="button" onClick={onFechar} aria-label="Fechar">
            <FaXmark />
          </button>
        </div>

        <div className="relatorio relatorio-resumo-full">
          <div className="relatorio-topo">
            <h2>Retenção</h2>
            <p>
              <strong>Data:</strong> {formatarDataBR(data)}
            </p>
            <p>
              <strong>Ponto:</strong> {ponto || "-"}
            </p>
          </div>

          <div className="relatorio-cards relatorio-cards-resumo">
            <div className="rel-card">
              <div className="r1">Máquinas</div>
              <div className="r2">{maquinas.length}</div>
            </div>

            <div className="rel-card">
              <div className="r1">Ret. média</div>
              <div className="r2">{formatarPercentual(retencaoMedia)}</div>
            </div>
          </div>

          <div className="secao-relatorio">
            <h3>Detalhamento</h3>

            {maquinas.length === 0 ? (
              <div className="estado-vazio">Ainda não há máquinas para mostrar no relatório.</div>
            ) : (
              <div className="retencao-relatorio-lista">
                {maquinas.map((maquina, index) => {
                  const resumo = calcularResumoMaquinaRetencao(maquina);

                  return (
                    <div
                      className="card-mobile retencao-relatorio-card"
                      key={`retencao-relatorio-${index}`}
                    >
                      <div className="card-mobile-topo">
                        <span className="indice-mobile">{index + 1}</span>
                        <strong className="titulo-mobile">
                          {maquina.selo || "Sem selo"}
                          {maquina.jogo ? ` - ${maquina.jogo}` : ""}
                        </strong>
                      </div>

                      <div className="linha-mobile">
                        <span>Entrada</span>
                        <strong className="positivo">{moedaBR(resumo.entrada)}</strong>
                      </div>

                      <div className="linha-mobile">
                        <span>Saída</span>
                        <strong className="negativo">{moedaBR(resumo.saida)}</strong>
                      </div>

                      <div className="linha-mobile linha-mobile-total">
                        <span>Retenção</span>
                        <strong className={classeValor(resumo.retencao)}>
                          {formatarPercentual(resumo.retencao)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
