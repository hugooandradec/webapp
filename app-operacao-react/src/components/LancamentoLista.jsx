import { IconActionButton, IconEdit, IconHistory, IconTrash } from "./ActionButtons.jsx";
import { classeValor, valorComSinalSemCentavos } from "../utils/money.js";

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
        <div className="estado-vazio">Crie um caixa para comecar os lancamentos.</div>
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
        <IconActionButton title="Editar" onClick={() => onEditar(item, index)}>
          <IconEdit />
        </IconActionButton>

        <IconActionButton title="Historico" onClick={() => onHistorico(index)}>
          <IconHistory />
        </IconActionButton>

        <IconActionButton
          title="Excluir"
          className="btn-acao-icon--excluir"
          onClick={() => onExcluir(index)}
        >
          <IconTrash />
        </IconActionButton>
      </div>
    </div>
  );
}
