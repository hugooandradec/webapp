import { FaXmark } from "react-icons/fa6";

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
  useBodyScrollLock(aberto);

  if (!aberto) return null;

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

        <div className="relatorio relatorio-resumo-full">
          <div className="relatorio-topo">
            <h2>Cálculo Salas</h2>
            <p>
              <strong>Período:</strong> {formatarDataBR(dataDe)} até {formatarDataBR(dataAte)}
            </p>
          </div>

          <div className="relatorio-cards relatorio-cards-resumo">
            <div className="rel-card">
              <div className="r1">Salas</div>
              <div className="r2">{salas.length}</div>
            </div>

            <div className="rel-card">
              <div className="r1">Total geral</div>
              <div className={`r2 ${classeValor(totalGeral)}`}>{moedaBR(totalGeral)}</div>
            </div>
          </div>

          <div className="secao-relatorio">
            <h3>Detalhamento</h3>

            {salas.length === 0 ? (
              <div className="estado-vazio">Ainda não há salas para mostrar no relatório.</div>
            ) : (
              <div className="salas-relatorio-lista">
                {salas.map((sala, index) => {
                  const resumo = calcularResumoSala(sala);

                  return (
                    <div className="card-mobile salas-relatorio-card" key={`rel-sala-${index}`}>
                      <div className="card-mobile-topo">
                        <span className="indice-mobile">{index + 1}</span>
                        <strong className="titulo-mobile">{(sala.nome || "SEM NOME").toUpperCase()}</strong>
                      </div>

                      <Linha label="Bruto" valor={resumo.bruto} />
                      <Linha label="Despesas Extras" valor={resumo.despesasExtras} />
                      <Linha label="Despesas" valor={resumo.despesas} />
                      <Linha label="Cartão" valor={resumo.cartao} />
                      <Linha label="Taxa Cartão" valor={resumo.taxa} />
                      <Linha label="Resultado" valor={resumo.resultado} destaque />
                      <Linha label="Pipo" valor={resumo.pipo} />
                      <Linha label="Pass" valor={resumo.pass} />
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

function Linha({ label, valor, destaque = false }) {
  return (
    <div className={`linha-mobile ${destaque ? "linha-mobile-total" : ""}`}>
      <span>{label}</span>
      <strong className={classeValor(valor)}>{moedaBR(valor)}</strong>
    </div>
  );
}
