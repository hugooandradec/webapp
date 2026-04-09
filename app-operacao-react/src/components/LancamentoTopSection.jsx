import {
  FaFileLines,
  FaList,
  FaPlus,
  FaTrashCan,
} from "react-icons/fa6";

import {
  classeValor,
  formatarMoedaDigitada,
  valorComSinalSemCentavos,
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
  onExcluirCaixa,
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

            <button
              type="button"
              className="btn-acao btn-acao-icon btn-acao-icon--excluir btn-remover-caixa-react"
              onClick={onExcluirCaixa}
              title="Excluir caixa"
              aria-label="Excluir caixa"
              disabled={!caixaAtiva}
            >
              <FaTrashCan aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="campo campo-data-react">
          <label>Data</label>
          <input
            type="date"
            value={dadosCaixaAtual.data || getHojeIso()}
            onChange={(e) => onAtualizarDadosCaixaAtual({ data: e.target.value })}
            disabled={!caixaAtiva}
          />
        </div>

        <div className="campo campo-valor-inicial-react">
          <label>Valor Inicial</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Digite aqui..."
            value={dadosCaixaAtual.valorInicial || ""}
            onChange={(e) =>
                onAtualizarDadosCaixaAtual({
                  valorInicial: formatarMoedaDigitada(e.target.value, {
                    allowNegative: true,
                    wholeUnits: true,
                  }),
                })
              }
            disabled={!caixaAtiva}
          />
        </div>
      </div>

      <div className="acoes-topo acoes-topo--lancamento">
        <button
          className="btn btn-roxo btn-acao-topo-mobile"
          type="button"
          onClick={onAbrirNovaEntrada}
          disabled={!caixaAtiva}
          aria-label="Nova entrada"
          title="Nova entrada"
        >
          <span className="btn-icone" aria-hidden="true">
            <FaPlus />
          </span>
          <span className="btn-label">Nova Entrada</span>
        </button>

        <button
          className="btn btn-claro btn-acao-topo-mobile"
          type="button"
          onClick={onAbrirResumoCaixa}
          disabled={!caixaAtiva}
          aria-label="Visualizar relatório"
          title="Visualizar relatório"
        >
          <span className="btn-icone" aria-hidden="true">
            <FaFileLines />
          </span>
          <span className="btn-label">Visualizar Relatório</span>
        </button>

        <button
          className="btn btn-claro btn-acao-topo-mobile"
          type="button"
          onClick={onAbrirResumoTotal}
          disabled={dadosApp.caixas.length === 0}
          aria-label="Relatório total dos caixas"
          title="Relatório total dos caixas"
        >
          <span className="btn-icone" aria-hidden="true">
            <FaList />
          </span>
          <span className="btn-label">Relatório Total dos Caixas</span>
        </button>

        <button
          className="btn btn-claro btn-acao-topo-mobile"
          type="button"
          onClick={onLimparLancamentos}
          disabled={!caixaAtiva}
          aria-label="Limpar tudo"
          title="Limpar tudo"
        >
          <span className="btn-icone" aria-hidden="true">
            <FaTrashCan />
          </span>
          <span className="btn-label">Limpar Tudo</span>
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
          valor={valorComSinalSemCentavos(valorInicialNumero)}
          className={classeValor(valorInicialNumero)}
        />
        <ResumoCard
          rotulo="Valor Final"
          valor={valorComSinalSemCentavos(valorTotal)}
          className={classeValor(valorTotal)}
        />
        <ResumoCard
          rotulo="Entrada"
          valor={valorComSinalSemCentavos(totalEntrada)}
          className="positivo"
        />
        <ResumoCard
          rotulo="Saída"
          valor={valorComSinalSemCentavos(-totalSaida)}
          className="negativo"
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
