import { FaTrashCan } from "react-icons/fa6";

import { classeValor, moedaBR } from "../utils/money.js";
import {
  calcularResumoSala,
  formatarEntradaMonetaria,
} from "../utils/calculoSalas.js";

function CardSala({ sala, index, inputRef, onAtualizar, onRemover }) {
  const resumo = calcularResumoSala(sala);
  const status = resumo.resultado < 0 ? "Prejuízo" : resumo.resultado > 0 ? "Lucro" : "Neutro";

  const campos = [
    { key: "bruto", label: "Bruto (R$)" },
    { key: "despesasExtras", label: "Despesas Extras (-R$)" },
    { key: "despesas", label: "Despesas (-R$)" },
    { key: "cartao", label: "Cartão (R$)" },
    { key: "taxa", label: "Taxa parcelamento cartao (-R$)" },
  ];

  return (
    <article className="linha-item salas-card">
      <div className="salas-card-topo">
        <div>
          <h3 className="salas-card-titulo">Sala {index + 1}</h3>
          <p className="salas-card-ajuda">Preencha os valores e acompanhe o resultado.</p>
        </div>

        <button
          className="btn-acao btn-excluir salas-btn-remover"
          type="button"
          onClick={onRemover}
          title="Remover sala"
          aria-label="Remover sala"
        >
          <FaTrashCan />
        </button>
      </div>

      <div className="campo salas-campo-nome">
        <label>Nome</label>
        <input
          ref={inputRef}
          type="text"
          value={sala.nome}
          onChange={(e) => onAtualizar("nome", e.target.value)}
          placeholder="Nome da sala"
        />
      </div>

      <div className="salas-campos">
        {campos.map((campo) => (
          <div className="campo" key={`${campo.key}-${index}`}>
            <label>{campo.label}</label>
            <input
              type="text"
              inputMode="decimal"
              value={formatarEntradaMonetaria(sala[campo.key])}
              onChange={(e) => onAtualizar(campo.key, e.target.value, true)}
              placeholder="0,00"
            />
          </div>
        ))}
      </div>

      <div className={`salas-resultado ${classeValor(resumo.resultado)}`}>
        <span>Resultado</span>
        <strong>{moedaBR(resumo.resultado)}</strong>
        <small>({status})</small>
      </div>

      <div className="salas-divisao">
        <div className="salas-divisao-item">
          <span>Pipo</span>
          <strong className={classeValor(resumo.pipo)}>{moedaBR(resumo.pipo)}</strong>
        </div>

        <div className="salas-divisao-item">
          <span>Pass</span>
          <strong className={classeValor(resumo.pass)}>{moedaBR(resumo.pass)}</strong>
        </div>
      </div>
    </article>
  );
}

export default function CalculoSalasLista({
  salas,
  refsSalas,
  onAdicionarSala,
  onAtualizarSala,
  onRemoverSala,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Salas</h2>

      {salas.length === 0 ? (
        <div className="estado-vazio">Nenhuma sala adicionada ainda.</div>
      ) : null}

      <div className="salas-lista">
        {salas.map((sala, index) => (
          <CardSala
            key={`sala-${index}`}
            sala={sala}
            index={index}
            inputRef={(el) => {
              refsSalas.current[index] = el;
            }}
            onAtualizar={(campo, valor, monetario = false) =>
              onAtualizarSala(index, campo, valor, monetario)
            }
            onRemover={() => onRemoverSala(index)}
          />
        ))}
      </div>

      <div className="acoes-lista">
        <button
          className="btn-acao btn-adicionar"
          type="button"
          onClick={onAdicionarSala}
          title="Adicionar sala"
          aria-label="Adicionar sala"
        >
          +
        </button>
      </div>
    </section>
  );
}

