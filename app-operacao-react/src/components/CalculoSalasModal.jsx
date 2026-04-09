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
                        <span className="salas-relatorio-partes-separador">|</span>
                        <span>
                          Pass:{" "}
                          <strong className={classeValor(resumo.pass)}>{moedaBR(resumo.pass)}</strong>
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
      </div>
    </div>
  );
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
