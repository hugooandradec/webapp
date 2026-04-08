import { FaXmark } from "react-icons/fa6";

import { classeValor, numeroDeMoeda, valorComSinal } from "../utils/money.js";

export default function Devedores({
  devedores,
  refsDevedores,
  atualizarDevedor,
  removerDevedor,
  adicionarDevedor,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Vales</h2>

      {devedores.length === 0 ? (
        <div className="estado-vazio">Nenhum vale cadastrado.</div>
      ) : null}

      {devedores.map((item, index) => {
        const saldoSemana =
          numeroDeMoeda(item.valorAnterior) - numeroDeMoeda(item.valorAtual);

        return (
          <div className="linha-item linha-item-vale" key={`devedor-${index}`}>
            <div className="subtitulo-lista">
              <button
                className="btn-acao btn-acao--close btn-excluir"
                type="button"
                onClick={() => removerDevedor(index)}
                title="Remover vale"
                aria-label="Remover vale"
              >
                <FaXmark />
              </button>
            </div>

            <div className="grid-vales">
              <div className="campo">
                <label>Ponto</label>
                <input
                  ref={(el) => {
                    refsDevedores.current[index] = el;
                  }}
                  type="text"
                  value={item.ponto}
                  onChange={(e) => atualizarDevedor(index, "ponto", e.target.value)}
                  placeholder="Digite aqui..."
                />
              </div>

              <div className="campo">
                <label>Vale Anterior</label>
                <input
                  type="text"
                  value={item.valorAnterior}
                  onChange={(e) =>
                    atualizarDevedor(index, "valorAnterior", e.target.value, true)
                  }
                  inputMode="numeric"
                  placeholder="Digite aqui..."
                />
              </div>

              <div className="campo">
                <label>Vale Pago</label>
                <input
                  type="text"
                  value={item.pago}
                  onChange={(e) => atualizarDevedor(index, "pago", e.target.value, true)}
                  inputMode="numeric"
                  placeholder="Digite aqui..."
                />
              </div>

              <div className="campo">
                <label>Vale da Semana</label>
                <input
                  type="text"
                  value={item.semana}
                  onChange={(e) => atualizarDevedor(index, "semana", e.target.value, true)}
                  inputMode="numeric"
                  placeholder="Digite aqui..."
                />
              </div>

              <div className="campo">
                <label>Valor Atual</label>
                <input type="text" value={item.valorAtual || "0,00"} readOnly />
              </div>
            </div>

            <div className="campo campo-saldo-semana">
              <label>Saldo da Semana</label>
              <input
                type="text"
                value={valorComSinal(saldoSemana)}
                readOnly
                className={classeValor(saldoSemana)}
              />
            </div>
          </div>
        );
      })}

      <div className="acoes-lista">
        <button
          className="btn-acao btn-adicionar"
          type="button"
          onClick={adicionarDevedor}
          title="Adicionar vale"
          aria-label="Adicionar vale"
        >
          +
        </button>
      </div>
    </section>
  );
}
