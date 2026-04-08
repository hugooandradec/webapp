import Header from "./Header";
import "../styles/header.css";
import "../styles/layout.css";

export default function PageLayout({
  titulo,
  usuario,
  onLogout,
  onBack,
  mostrarVoltar = false,
  children,
  className = "",
}) {
  return (
    <div className="app-shell">
      <Header
        titulo={titulo}
        usuario={usuario}
        onLogout={onLogout}
        onBack={onBack}
        mostrarVoltar={mostrarVoltar}
      />

      <main className={`app-main ${className}`.trim()}>
        <div className="app-container">{children}</div>
      </main>
    </div>
  );
}