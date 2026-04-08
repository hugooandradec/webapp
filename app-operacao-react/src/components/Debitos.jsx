import { FaXmark } from "react-icons/fa6";

export default function Debitos({
  debitos,
  refsDebitos,
  atualizarDebito,
  removerDebito,
  adicionarDebito,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Debitos</h2>

      {debitos.length === 0 ? (
        <div className="estado-vazio">Nenhum debito cadastrado.</div>
      ) : null}

      <div className="debitos-grid">
        {debitos.map((item, index) => (
          <div className="linha-item" key={`debito-${index}`}>
            <div className="subtitulo-lista">
              <button
                className="btn-acao btn-acao--close btn-excluir"
                type="button"
                onClick={() => removerDebito(index)}
                title="Remover debito"
                aria-label="Remover debito"
              >
                <FaXmark />
              </button>
            </div>

            <div className="grid-2">
              <div className="campo">
                <label>Ponto / Descricao</label>
                <input
                  ref={(el) => {
                    refsDebitos.current[index] = el;
                  }}
                  type="text"
                  value={item.ponto}
                  onChange={(e) => atualizarDebito(index, "ponto", e.target.value)}
                  placeholder="Digite aqui..."
                />
              </div>

              <div className="campo">
                <label>Valor</label>
                <input
                  type="text"
                  value={item.valor}
                  onChange={(e) => atualizarDebito(index, "valor", e.target.value, true)}
                  inputMode="numeric"
                  placeholder="Digite aqui..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="acoes-lista">
        <button
          className="btn-acao btn-adicionar"
          type="button"
          onClick={adicionarDebito}
          title="Adicionar debito"
          aria-label="Adicionar debito"
        >
          +
        </button>
      </div>
    </section>
  );
}
