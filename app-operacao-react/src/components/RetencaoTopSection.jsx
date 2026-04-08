import {
  FaFileLines,
  FaPaste,
  FaPlus,
  FaTrashCan,
  FaWandMagicSparkles,
} from "react-icons/fa6";

function Atalho({ className, icon, label, ...props }) {
  return (
    <button
      className={`retencao-atalho ${className}`.trim()}
      type="button"
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="retencao-atalho__icon">{icon}</span>
      <span className="retencao-atalho__label">{label}</span>
    </button>
  );
}

export default function RetencaoTopSection({
  textoFonte,
  onAtualizarTexto,
  onImportarTexto,
  onAdicionarMaquina,
  onAbrirRelatorio,
  onLimparTudo,
}) {
  return (
    <section className="bloco">
      <div className="retencao-topo">
        <div className="retencao-titulo">
          <FaPaste />
          <span>Retenção</span>
        </div>
      </div>

      <div className="campo campo-textarea">
        <label htmlFor="retencao-texto">Texto base</label>
        <textarea
          id="retencao-texto"
          className="retencao-textarea"
          value={textoFonte}
          onChange={(e) => onAtualizarTexto(e.target.value)}
          placeholder="Cole o fechamento aqui"
        />
      </div>

      <div className="retencao-atalhos">
        <Atalho
          className="retencao-atalho--primario"
          icon={<FaWandMagicSparkles />}
          label="Importar"
          onClick={onImportarTexto}
        />

        <Atalho
          className="retencao-atalho--claro"
          icon={<FaFileLines />}
          label="Relatório"
          onClick={onAbrirRelatorio}
        />

        <Atalho
          className="retencao-atalho--claro"
          icon={<FaPlus />}
          label="Máquina"
          onClick={onAdicionarMaquina}
        />

        <Atalho
          className="retencao-atalho--perigo"
          icon={<FaTrashCan />}
          label="Limpar"
          onClick={onLimparTudo}
        />
      </div>
    </section>
  );
}
