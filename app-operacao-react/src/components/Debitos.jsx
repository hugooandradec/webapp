import { valorComSinal } from "../utils/money.js";
import { IconActionButton, IconEdit, IconTrash } from "./ActionButtons.jsx";

export default function Debitos({
  debitos,
  inputRef,
  debitoForm,
  editandoIndex,
  atualizarDebitoForm,
  salvarDebito,
  editarDebito,
  removerDebito,
}) {
  return (
    <section className="bloco">
      <h2 className="titulo-bloco">Debitos</h2>

      {debitos.length === 0 ? (
        <div className="estado-vazio">Nenhum debito cadastrado.</div>
      ) : null}

      <div className="debitos-grid">
        {debitos.map((item, index) => (
          <div className="linha-item linha-item-salvo" key={`debito-${index}`}>
            <div className="linha-item-resumo">
              <div className="linha-item-texto">
                <span className="linha-item-ponto">{item.ponto || "-"}</span>
                <span className="linha-item-separador">|</span>
                <span className="linha-item-valor negativo">
                  {valorComSinal(
                    -Math.abs(Number(String(item.valor).replace(/\./g, "").replace(",", ".")) || 0)
                  )}
                </span>
              </div>

              <div className="acoes-item-salvo">
                <IconActionButton title="Editar debito" onClick={() => editarDebito(index)}>
                  <IconEdit />
                </IconActionButton>

                <IconActionButton
                  title="Excluir debito"
                  className="btn-acao-icon--excluir"
                  onClick={() => removerDebito(index)}
                >
                  <IconTrash />
                </IconActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="linha-item linha-item-formulario">
        <div className="subtitulo-lista">
          {editandoIndex !== null ? "Editando débito" : "Novo débito"}
        </div>

        <div className="grid-2">
          <div className="campo">
            <label>Ponto / Descricao</label>
            <input
              ref={inputRef}
              type="text"
              value={debitoForm.ponto}
              onChange={(e) => atualizarDebitoForm("ponto", e.target.value)}
              placeholder="Digite aqui..."
            />
          </div>

          <div className="campo">
            <label>Valor</label>
            <input
              type="text"
              value={debitoForm.valor}
              onChange={(e) => atualizarDebitoForm("valor", e.target.value, true)}
              inputMode="numeric"
              placeholder="Digite aqui..."
            />
          </div>
        </div>

        <button className="btn btn-roxo btn-salvar-item" type="button" onClick={salvarDebito}>
          {editandoIndex !== null ? "Atualizar débito" : "Salvar débito"}
        </button>
      </div>
    </section>
  );
}
