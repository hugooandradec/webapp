import { FaTrashCan } from "react-icons/fa6";

import { classeValor, moedaBR } from "../utils/money.js";
import {
  calcularResumoMaquinaRetencao,
  formatarPercentual,
} from "../utils/retencao.js";

function CardRetencao({ maquina, index, inputRef, onAtualizar, onRemover }) {
  const resumo = calcularResumoMaquinaRetencao(maquina);

  return (
    <article className="linha-item retencao-card">
      <div className="retencao-card-topo">
        <div>
          <h3 className="retencao-card-titulo">Máquina {index + 1}</h3>
          <p className="retencao-card-ajuda">Digite entrada e saída para calcular a retenção.</p>
        </div>

        <button
          className="btn-acao btn-excluir retencao-btn-remover"
          type="button"
          onClick={onRemover}
          title="Remover máquina"
          aria-label="Remover máquina"
        >
          <FaTrashCan />
        </button>
      </div>

      <div className="grid-2 retencao-campos-topo">
        <div className="campo">
          <label>Selo</label>
          <input
            ref={inputRef}
            type="text"
            value={maquina.selo}
            onChange={(e) => onAtualizar("selo", e.target.value)}
            placeholder="Código da máquina"
          />
        </div>

        <div className="campo">
          <label>Jogo</label>
          <input
            type="text"
            value={maquina.jogo}
            onChange={(e) => onAtualizar("jogo", e.target.value)}
            placeholder="Tipo de jogo"
          />
        </div>
      </div>

      <div className="grid-2 retencao-campos-valores">
        <div className="campo">
          <label>E</label>
          <input
            type="text"
            inputMode="numeric"
            value={maquina.entrada}
            onChange={(e) => onAtualizar("entrada", e.target.value, true)}
            placeholder="Valor de entrada"
          />
        </div>

        <div className="campo">
          <label>S</label>
          <input
            type="text"
            inputMode="numeric"
            value={maquina.saida}
            onChange={(e) => onAtualizar("saida", e.target.value, true)}
            placeholder="Valor de saída"
          />
        </div>
      </div>

      <div className="retencao-resumo-linhas">
        <div className="retencao-resumo-item">
          <span>E</span>
          <strong className="positivo">{moedaBR(resumo.entrada)}</strong>
        </div>

        <div className="retencao-resumo-item">
          <span>S</span>
          <strong className="negativo">{moedaBR(resumo.saida)}</strong>
        </div>

        <div className="retencao-resumo-item retencao-resumo-item--retencao">
          <span>Retenção</span>
          <strong className={classeValor(resumo.retencao)}>
            {formatarPercentual(resumo.retencao)}
          </strong>
        </div>
      </div>
    </article>
  );
}

export default function RetencaoLista({
  maquinas,
  refsMaquinas,
  onAdicionarMaquina,
  onAtualizarMaquina,
  onRemoverMaquina,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Máquinas</h2>

      {maquinas.length === 0 ? (
        <div className="estado-vazio">Nenhuma máquina adicionada ainda.</div>
      ) : null}

      <div className="retencao-lista">
        {maquinas.map((maquina, index) => (
          <CardRetencao
            key={`retencao-maquina-${index}`}
            maquina={maquina}
            index={index}
            inputRef={(el) => {
              refsMaquinas.current[index] = el;
            }}
            onAtualizar={(campo, valor, numerico = false) =>
              onAtualizarMaquina(index, campo, valor, numerico)
            }
            onRemover={() => onRemoverMaquina(index)}
          />
        ))}
      </div>

      <div className="acoes-lista">
        <button
          className="btn-acao btn-adicionar"
          type="button"
          onClick={onAdicionarMaquina}
          title="Adicionar máquina"
          aria-label="Adicionar máquina"
        >
          +
        </button>
      </div>
    </section>
  );
}
