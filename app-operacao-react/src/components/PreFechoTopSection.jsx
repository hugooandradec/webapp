import {
  FaFileLines,
  FaPaste,
  FaPlus,
  FaTrashCan,
  FaWandMagicSparkles,
} from "react-icons/fa6";

function BotaoIcone({ className, icon, label, ...props }) {
  return (
    <button
      className={`pre-fecho-atalho ${className}`.trim()}
      type="button"
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="pre-fecho-atalho-icone">{icon}</span>
      <span className="pre-fecho-atalho-label">{label}</span>
    </button>
  );
}

export default function PreFechoTopSection({
  textoFonte,
  onAtualizarTextoFonte,
  onImportarTexto,
  onAdicionarMaquina,
  onAbrirRelatorio,
  onLimparTudo,
}) {
  return (
    <section className="bloco">
      <div className="pre-fecho-importacao-topo">
        <div className="pre-fecho-importacao-titulo">
          <FaPaste />
          <span>Pre-Fecho</span>
        </div>
      </div>

      <div className="campo campo-textarea">
        <label htmlFor="pre-fecho-texto">Texto base</label>
        <textarea
          id="pre-fecho-texto"
          className="pre-fecho-textarea"
          value={textoFonte}
          onChange={(e) => onAtualizarTextoFonte(e.target.value)}
          placeholder="Cole o fechamento aqui"
        />
      </div>

      <div className="pre-fecho-atalhos">
        <BotaoIcone
          className="pre-fecho-atalho--primario"
          icon={<FaWandMagicSparkles />}
          label="Importar"
          onClick={onImportarTexto}
        />

        <BotaoIcone
          className="pre-fecho-atalho--claro"
          icon={<FaFileLines />}
          label="Relatório"
          onClick={onAbrirRelatorio}
        />

        <BotaoIcone
          className="pre-fecho-atalho--claro"
          icon={<FaPlus />}
          label="Máquina"
          onClick={onAdicionarMaquina}
        />

        <BotaoIcone
          className="pre-fecho-atalho--perigo"
          icon={<FaTrashCan />}
          label="Limpar"
          onClick={onLimparTudo}
        />
      </div>
    </section>
  );
}
