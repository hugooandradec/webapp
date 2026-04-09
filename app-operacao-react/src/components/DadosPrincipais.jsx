import { classeValor, valorComSinal } from "../utils/money.js";

export default function DadosPrincipais({
  dados,
  atualizarCampo,
  cardsResumo,
  linhasRotas,
  linhasComplementos,
  onSalvarTudo,
  onAbrirResumo,
  onLimparTudo,
}) {
  return (
    <section className="bloco bloco-principal">
      <h2 className="titulo-bloco">Dados Principais</h2>

      <div className="grid-4">
        <div className="campo campo-periodo">
          <label>Período</label>
          <div className="periodo-grid">
            <input
              type="date"
              value={dados.periodoInicio}
              onChange={(e) => atualizarCampo("periodoInicio", e.target.value)}
            />
            <input
              type="date"
              value={dados.periodoFim}
              onChange={(e) => atualizarCampo("periodoFim", e.target.value)}
            />
          </div>
        </div>

        <div className="campo">
          <label>Turano</label>
          <input
            type="text"
            value={dados.turano}
            onChange={(e) => atualizarCampo("turano", e.target.value, true)}
            inputMode="numeric"
            placeholder="Digite aqui..."
          />
        </div>

        <div className="campo">
          <label>RC</label>
          <input
            type="text"
            value={dados.rc}
            onChange={(e) => atualizarCampo("rc", e.target.value, true)}
            inputMode="numeric"
            placeholder="Digite aqui..."
          />
        </div>

        <div className="campo">
          <label>Centro</label>
          <input
            type="text"
            value={dados.centro}
            onChange={(e) => atualizarCampo("centro", e.target.value, true)}
            inputMode="numeric"
            placeholder="Digite aqui..."
          />
        </div>

        <div className="campo">
          <label>Cartão Anterior</label>
          <input
            type="text"
            value={dados.cartaoPassado}
            onChange={(e) => atualizarCampo("cartaoPassado", e.target.value, true)}
            inputMode="numeric"
            placeholder="Digite aqui..."
          />
        </div>

        <div className="campo">
          <label>Cartão Atual</label>
          <input
            type="text"
            value={dados.cartaoAtual}
            onChange={(e) => atualizarCampo("cartaoAtual", e.target.value, true)}
            inputMode="numeric"
            placeholder="Digite aqui..."
          />
        </div>
      </div>

      <div className="acoes-topo">
        <button className="btn btn-roxo" type="button" onClick={onSalvarTudo}>
          Salvar
        </button>

        <button className="btn btn-roxo" type="button" onClick={onAbrirResumo}>
          Resumo
        </button>

        <button className="btn btn-claro" type="button" onClick={onLimparTudo}>
          Limpar tudo
        </button>
      </div>

      <div className="resumo-cards">
        {cardsResumo.map((card) => (
          <div className="card-resumo" key={card.rotulo}>
            <div className="rotulo">{card.rotulo}</div>
            <div className={`valor ${classeValor(card.valor)}`}>
              {valorComSinal(card.valor)}
            </div>
          </div>
        ))}
      </div>

      <div className="mini-resumo">
        <ResumoLista titulo="Rotas" itens={linhasRotas} />
        <ResumoLista titulo="Complementos" itens={linhasComplementos} />
      </div>
    </section>
  );
}

function ResumoLista({ titulo, itens }) {
  return (
    <div className="mini-card">
      <h3>{titulo}</h3>

      {itens.map((item) => (
        <div className="linha" key={item.label}>
          <span>{item.label}</span>
          <strong className={classeValor(item.valor)}>{valorComSinal(item.valor)}</strong>
        </div>
      ))}
    </div>
  );
}
