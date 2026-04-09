import { classeValor, valorComSinalSemCentavos } from "../utils/money.js";

function IconButton({ title, className = "", onClick, children }) {
  return (
    <button
      type="button"
      className={`btn-acao-icon ${className}`.trim()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function LancamentoLista({
  caixaAtiva,
  listaLancamentos,
  onEditar,
  onHistorico,
  onExcluir,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Entradas</h2>

      {!caixaAtiva ? (
        <div className="estado-vazio">Crie um caixa para começar os lançamentos.</div>
      ) : listaLancamentos.length === 0 ? (
        <div className="estado-vazio">Sem entradas neste caixa.</div>
      ) : (
        <div className="lista-lancamentos-react">
          {listaLancamentos.map((item, index) => (
            <LancamentoItem
              key={`${item.ponto}-${index}`}
              item={item}
              index={index}
              onEditar={onEditar}
              onHistorico={onHistorico}
              onExcluir={onExcluir}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function LancamentoItem({ item, index, onEditar, onHistorico, onExcluir }) {
  const entrada = Number(item.dinheiro) || 0;
  const saida = Number(item.saida) || 0;
  const subtotal = entrada - saida;
  const mostrarEntrada = entrada !== 0;
  const mostrarSaida = saida !== 0;

  return (
    <div className="linha-item linha-item-lancamento">
      <div className="linha-lancamento-conteudo">
        <div className="lancamento-topo">
          <div className="lancamento-linha-texto">
            <span className="lancamento-ponto">{item.ponto}</span>

            {mostrarEntrada ? (
              <>
                <span className="lancamento-separador">|</span>
                <span className="lancamento-valor-inline positivo">
                  E: {valorComSinalSemCentavos(entrada)}
                </span>
              </>
            ) : null}

            {mostrarSaida ? (
              <>
                <span className="lancamento-separador">|</span>
                <span className="lancamento-valor-inline negativo">
                  S: {valorComSinalSemCentavos(-Math.abs(saida))}
                </span>
              </>
            ) : null}

            <span className="lancamento-separador">|</span>
            <span className={`lancamento-valor-inline ${classeValor(subtotal)}`.trim()}>
              Total: {valorComSinalSemCentavos(subtotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="acoes-lancamento-react">
        <IconButton title="Editar" onClick={() => onEditar(item, index)}>
          <IconEdit />
        </IconButton>

        <IconButton title="Histórico" onClick={() => onHistorico(index)}>
          <IconHistory />
        </IconButton>

        <IconButton
          title="Excluir"
          className="btn-acao-icon--excluir"
          onClick={() => onExcluir(index)}
        >
          <IconTrash />
        </IconButton>
      </div>
    </div>
  );
}
