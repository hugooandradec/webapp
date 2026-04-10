import { classeValor, numeroDeMoeda, valorComSinal } from "../utils/money.js";
import { IconActionButton, IconEdit, IconTrash } from "./ActionButtons.jsx";

export default function Devedores({
  devedores,
  inputRef,
  valeForm,
  editandoIndex,
  atualizarValeForm,
  salvarVale,
  editarVale,
  removerDevedor,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Vales</h2>

      {devedores.length === 0 ? (
        <div className="estado-vazio">Nenhum vale cadastrado.</div>
      ) : null}

      {devedores.map((item, index) => {
        const anterior = -Math.abs(numeroDeMoeda(item.valorAnterior));
        const pago = numeroDeMoeda(item.pago);
        const semana = -Math.abs(numeroDeMoeda(item.semana));
        const total = -Math.abs(numeroDeMoeda(item.valorAtual));
        const saldoSemana =
          numeroDeMoeda(item.valorAnterior) - numeroDeMoeda(item.valorAtual);

        return (
          <div className="linha-item linha-item-vale linha-item-salvo" key={`devedor-${index}`}>
            <div className="linha-item-resumo">
              <div className="linha-item-texto">
                <span className="linha-item-ponto">{item.ponto || "-"}</span>
                <span className="linha-item-separador">|</span>
                <span className={`linha-item-valor ${classeValor(anterior)}`.trim()}>
                  Anterior: {valorComSinal(anterior)}
                </span>
                <span className="linha-item-separador">|</span>
                <span className={`linha-item-valor ${classeValor(pago)}`.trim()}>
                  Pago: {valorComSinal(pago)}
                </span>
                <span className="linha-item-separador">|</span>
                <span className={`linha-item-valor ${classeValor(semana)}`.trim()}>
                  Semana: {valorComSinal(semana)}
                </span>
                <span className="linha-item-separador">|</span>
                <span className={`linha-item-valor ${classeValor(saldoSemana)}`.trim()}>
                  Saldo: {valorComSinal(saldoSemana)}
                </span>
                <span className="linha-item-separador">|</span>
                <span className={`linha-item-valor ${classeValor(total)}`.trim()}>
                  Total: {valorComSinal(total)}
                </span>
              </div>

              <div className="acoes-item-salvo">
                <IconActionButton title="Editar vale" onClick={() => editarVale(index)}>
                  <IconEdit />
                </IconActionButton>

                <IconActionButton
                  title="Excluir vale"
                  className="btn-acao-icon--excluir"
                  onClick={() => removerDevedor(index)}
                >
                  <IconTrash />
                </IconActionButton>
              </div>
            </div>
          </div>
        );
      })}

      <div className="linha-item linha-item-vale linha-item-formulario">
        <div className="subtitulo-lista">
          {editandoIndex !== null ? "Editando vale" : "Novo vale"}
        </div>

        <div className="grid-vales">
          <div className="campo">
            <label>Ponto</label>
            <input
              ref={inputRef}
              type="text"
              value={valeForm.ponto}
              onChange={(e) => atualizarValeForm("ponto", e.target.value)}
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Vale Anterior</label>
            <input
              type="text"
              value={valeForm.valorAnterior}
              onChange={(e) => atualizarValeForm("valorAnterior", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Vale Pago</label>
            <input
              type="text"
              value={valeForm.pago}
              onChange={(e) => atualizarValeForm("pago", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Vale da Semana</label>
            <input
              type="text"
              value={valeForm.semana}
              onChange={(e) => atualizarValeForm("semana", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Valor Atual</label>
            <input type="text" value={valeForm.valorAtual || "0,00"} readOnly />
          </div>
        </div>

        <div className="campo campo-saldo-semana">
          <label>Saldo da Semana</label>
          <input
            type="text"
            value={valorComSinal(
              numeroDeMoeda(valeForm.valorAnterior) - numeroDeMoeda(valeForm.valorAtual)
            )}
            readOnly
            className={classeValor(
              numeroDeMoeda(valeForm.valorAnterior) - numeroDeMoeda(valeForm.valorAtual)
            )}
          />
        </div>

        <button className="btn btn-roxo btn-salvar-item" type="button" onClick={salvarVale}>
          {editandoIndex !== null ? "Atualizar vale" : "Salvar vale"}
        </button>
      </div>
    </section>
  );
}
