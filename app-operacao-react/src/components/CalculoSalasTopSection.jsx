import { FaFileLines, FaPlus, FaTrashCan } from "react-icons/fa6";

function Atalho({ className, icon, label, ...props }) {
  return (
    <button
      className={`salas-atalho ${className}`.trim()}
      type="button"
      aria-label={label}
      title={label}
      {...props}
    >
      <span className="salas-atalho__icon">{icon}</span>
      <span className="salas-atalho__label">{label}</span>
    </button>
  );
}

export default function CalculoSalasTopSection({
  dataDe,
  dataAte,
  onAtualizarDataDe,
  onAtualizarDataAte,
  onAdicionarSala,
  onAbrirRelatorio,
  onLimparTudo,
}) {
  return (
    <section className="bloco">
      <div className="salas-topo">
        <div className="salas-titulo">
          <span>Cálculo Salas</span>
        </div>
      </div>

      <div className="periodo-grid salas-periodo">
        <div className="campo">
          <label htmlFor="salas-data-de">Data de</label>
          <input
            id="salas-data-de"
            type="date"
            value={dataDe}
            onChange={(e) => onAtualizarDataDe(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="salas-data-ate">Data até</label>
          <input
            id="salas-data-ate"
            type="date"
            value={dataAte}
            onChange={(e) => onAtualizarDataAte(e.target.value)}
          />
        </div>
      </div>

      <div className="salas-atalhos">
        <Atalho
          className="salas-atalho--claro"
          icon={<FaFileLines />}
          label="Relatório"
          onClick={onAbrirRelatorio}
        />

        <Atalho
          className="salas-atalho--primario"
          icon={<FaPlus />}
          label="Sala"
          onClick={onAdicionarSala}
        />

        <Atalho
          className="salas-atalho--perigo"
          icon={<FaTrashCan />}
          label="Limpar"
          onClick={onLimparTudo}
        />
      </div>
    </section>
  );
}
