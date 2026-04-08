import {
  classeValor,
  formatarMoedaDigitada,
  valorComSinal,
} from "../utils/money.js";
import { formatarNomeCaixa, getHojeIso } from "../utils/lancamentoHelpers.js";

export default function LancamentoTopSection({
  dadosApp,
  caixaAtiva,
  dadosCaixaAtual,
  formEntrada,
  pontoRef,
  valorInicialNumero,
  totalEntrada,
  totalSaida,
  valorTotal,
  onTrocarCaixa,
  onCriarNovoCaixa,
  onAtualizarDadosCaixaAtual,
  onAbrirNovaEntrada,
  onAbrirResumoCaixa,
  onAbrirResumoTotal,
  onLimparLancamentos,
  onAtualizarFormEntrada,
  onSalvarEntrada,
  onCancelarEntrada,
}) {
  return (
    <section className="bloco bloco-principal">
      <h2 className="titulo-bloco">Lançamento</h2>

      <div className="grid-3 lancamento-topo-grid">
        <div className="campo campo-caixa">
          <label>Caixa</label>

          <div className="caixa-linha-react">
            <select
              value={caixaAtiva}
              onChange={(e) => onTrocarCaixa(e.target.value)}
              disabled={dadosApp.caixas.length === 0}
            >
              {dadosApp.caixas.length === 0 ? (
                <option value="">Nenhum caixa</option>
              ) : (
                dadosApp.caixas.map((caixa) => (
                  <option key={caixa} value={caixa}>
                    {formatarNomeCaixa(caixa)}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="btn-acao btn-adicionar btn-add-caixa-react"
              onClick={onCriarNovoCaixa}
              title="Novo caixa"
              aria-label="Novo caixa"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>

        <div className="campo">
          <label>Data</label>
          <input
            type="date"
            value={dadosCaixaAtual.data || getHojeIso()}
            onChange={(e) => onAtualizarDadosCaixaAtual({ data: e.target.value })}
            disabled={!caixaAtiva}
          />
        </div>

        <div className="campo">
          <label>Valor Inicial</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Digite aqui..."
            value={dadosCaixaAtual.valorInicial || ""}
            onChange={(e) =>
              onAtualizarDadosCaixaAtual({
                valorInicial: formatarMoedaDigitada(e.target.value),
              })
            }
            disabled={!caixaAtiva}
          />
        </div>
      </div>

      <div className="acoes-topo">
        <button
          className="btn btn-roxo"
          type="button"
          onClick={onAbrirNovaEntrada}
          disabled={!caixaAtiva}
        >
          Nova Entrada
        </button>

        <button
          className="btn btn-claro"
          type="button"
          onClick={onAbrirResumoCaixa}
          disabled={!caixaAtiva}
        >
          Visualizar Relatório
        </button>

        <button
          className="btn btn-claro"
          type="button"
          onClick={onAbrirResumoTotal}
          disabled={dadosApp.caixas.length === 0}
        >
          Relatório Total dos Caixas
        </button>

        <button
          className="btn btn-claro"
          type="button"
          onClick={onLimparLancamentos}
          disabled={!caixaAtiva}
        >
          Limpar Tudo
        </button>
      </div>

      {formEntrada.aberto ? (
        <div className="linha-item linha-item-lancamento-form">
          <h3 className="subtitulo-form-lancamento">
            {formEntrada.editIndex !== null ? "Editar Entrada" : "Nova Entrada"}
          </h3>

          <div className="grid-3">
            <div className="campo">
              <label>Ponto</label>
              <input
                ref={pontoRef}
                type="text"
                placeholder="Digite aqui..."
                value={formEntrada.ponto}
                onChange={(e) => onAtualizarFormEntrada({ ponto: e.target.value })}
              />
            </div>

            <div className="campo">
              <label>Entrada</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formEntrada.dinheiro}
                onChange={(e) => onAtualizarFormEntrada({ dinheiro: e.target.value })}
              />
            </div>

            <div className="campo">
              <label>Saída</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formEntrada.saida}
                onChange={(e) => onAtualizarFormEntrada({ saida: e.target.value })}
              />
            </div>
          </div>

          <div className="acoes-topo">
            <button className="btn btn-roxo" type="button" onClick={onSalvarEntrada}>
              {formEntrada.editIndex !== null ? "Atualizar Entrada" : "Salvar Entrada"}
            </button>

            <button className="btn btn-claro" type="button" onClick={onCancelarEntrada}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="resumo-cards lancamento-resumo-cards">
        <ResumoCard
          rotulo="Valor Inicial"
          valor={valorComSinal(valorInicialNumero)}
          className={classeValor(valorInicialNumero)}
        />
        <ResumoCard rotulo="Entrada" valor={valorComSinal(totalEntrada)} className="positivo" />
        <ResumoCard rotulo="Saída" valor={valorComSinal(-totalSaida)} className="negativo" />
        <ResumoCard
          rotulo="Valor Total"
          valor={valorComSinal(valorTotal)}
          className={classeValor(valorTotal)}
        />
      </div>
    </section>
  );
}

function ResumoCard({ rotulo, valor, className = "" }) {
  return (
    <div className="card-resumo">
      <div className="rotulo">{rotulo}</div>
      <div className={`valor ${className}`.trim()}>{valor}</div>
    </div>
  );
}
