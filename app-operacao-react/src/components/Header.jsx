import { FaArrowLeft, FaRightFromBracket } from "react-icons/fa6";

export default function Header({
  titulo = "Fechamento",
  usuario,
  onLogout,
  onBack,
  mostrarVoltar = true,
}) {
  const nomeUsuario =
    usuario?.nomeExibicao ||
    usuario?.nome ||
    usuario?.login ||
    "";
  const mostrarSessao = Boolean(nomeUsuario) && typeof onLogout === "function";

  const online =
    typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <header className="app-header">
      <div className="app-header-side app-header-side--left">
        {mostrarVoltar ? (
          <button
            type="button"
            className="app-header-btn app-header-btn--back"
            onClick={onBack}
            aria-label="Voltar"
            title="Voltar"
          >
            <FaArrowLeft aria-hidden="true" />
          </button>
        ) : (
          <div className="app-header-placeholder" />
        )}
      </div>

      <div className="app-header-center">
        <h1 className="app-header-title">{titulo}</h1>
      </div>

      <div className="app-header-side app-header-side--right">
        {mostrarSessao ? (
          <>
            <span
              className={`app-header-status ${online ? "online" : "offline"}`}
              title={online ? "Online" : "Offline"}
            />

            <span className="app-header-user" title={nomeUsuario}>
              {nomeUsuario}
            </span>

            <button
              type="button"
              className="app-header-btn"
              onClick={onLogout}
              aria-label="Sair"
              title="Sair"
            >
              <FaRightFromBracket aria-hidden="true" />
            </button>
          </>
        ) : (
          <div className="app-header-placeholder" />
        )}
      </div>
    </header>
  );
}
