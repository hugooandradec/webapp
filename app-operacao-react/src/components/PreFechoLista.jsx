import { FaTrashCan } from "react-icons/fa6";

import { classeValor, moedaBR } from "../utils/money.js";
import { calcularValoresMaquina } from "../utils/preFecho.js";

function CardMaquina({
  maquina,
  index,
  inputRef,
  onAtualizar,
  onRemover,
}) {
  const valores = calcularValoresMaquina(maquina);

  return (
    <article className="linha-item pre-fecho-card">
      <div className="pre-fecho-card-topo">
        <div>
          <h3 className="pre-fecho-card-titulo">Máquina {index + 1}</h3>
          <p className="pre-fecho-card-ajuda">Preencha os relógios e confira o resultado.</p>
        </div>

        <button
          className="btn-acao btn-excluir pre-fecho-btn-remover"
          type="button"
          onClick={onRemover}
          title="Remover máquina"
          aria-label="Remover máquina"
        >
          <FaTrashCan />
        </button>
      </div>

      <div className="grid-2 pre-fecho-campos-topo">
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

      <div className="pre-fecho-relogios">
        <section className="pre-fecho-painel">
          <h4>Entrada</h4>

          <div className="grid-2">
            <div className="campo">
              <label>Anterior</label>
              <input
                type="text"
                inputMode="numeric"
                value={maquina.entradaAnterior}
                onChange={(e) => onAtualizar("entradaAnterior", e.target.value, true)}
                placeholder="Digite aqui..."
              />
            </div>

            <div className="campo">
              <label>Atual</label>
              <input
                type="text"
                inputMode="numeric"
                value={maquina.entradaAtual}
                onChange={(e) => onAtualizar("entradaAtual", e.target.value, true)}
                placeholder="Digite aqui..."
              />
            </div>
          </div>

          <div className="pre-fecho-resultado-linha">
            <span>Diferença</span>
            <strong className={classeValor(valores.diferencaEntrada)}>
              {moedaBR(valores.diferencaEntrada)}
            </strong>
          </div>
        </section>

        <section className="pre-fecho-painel">
          <h4>Saída</h4>

          <div className="grid-2">
            <div className="campo">
              <label>Anterior</label>
              <input
                type="text"
                inputMode="numeric"
                value={maquina.saidaAnterior}
                onChange={(e) => onAtualizar("saidaAnterior", e.target.value, true)}
                placeholder="Digite aqui..."
              />
            </div>

            <div className="campo">
              <label>Atual</label>
              <input
                type="text"
                inputMode="numeric"
                value={maquina.saidaAtual}
                onChange={(e) => onAtualizar("saidaAtual", e.target.value, true)}
                placeholder="Digite aqui..."
              />
            </div>
          </div>

          <div className="pre-fecho-resultado-linha">
            <span>Diferença</span>
            <strong className={classeValor(valores.diferencaSaida)}>
              {moedaBR(valores.diferencaSaida)}
            </strong>
          </div>
        </section>
      </div>

      <div className="pre-fecho-total-maquina">
        <span>Resultado</span>
        <strong className={classeValor(valores.resultado)}>
          {moedaBR(valores.resultado)}
        </strong>
      </div>
    </article>
  );
}

export default function PreFechoLista({
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

      <div className="pre-fecho-lista">
        {maquinas.map((maquina, index) => (
          <CardMaquina
            key={`pre-fecho-maquina-${index}`}
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
