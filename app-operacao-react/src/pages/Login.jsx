import { useEffect, useState } from "react";

import PageLayout from "../components/PageLayout";
import { getCurrentUser, login } from "../utils/auth";
import "../styles/login.css";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const usuarioAtual = getCurrentUser();
    if (usuarioAtual) {
      window.location.reload();
      return;
    }

    async function checkOnline() {
      try {
        const res = await fetch("https://ajudante-api.onrender.com/health", {
          method: "GET",
          cache: "no-store",
        });
        return res.ok;
      } catch {
        return false;
      }
    }

    checkOnline();
    const timer = setInterval(checkOnline, 30000);

    return () => clearInterval(timer);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    const usuario = user.trim();
    const senha = pass;

    if (!usuario || !senha) {
      setErro("Informe usuário e senha.");
      return;
    }

    try {
      setCarregando(true);
      login(usuario, senha);
      window.location.reload();
    } catch (err) {
      setErro(err?.message || "Falha no login.");
      setCarregando(false);
    }
  }

  return (
    <PageLayout titulo="Login">
      <div className="login-page">
        <main className="login-container">
          <h1>Entrar</h1>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="input-user">Usuário</label>
              <input
                id="input-user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-pass">Senha</label>
              <input
                id="input-pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"}
            </button>

            {erro && <div className="erro">{erro}</div>}
          </form>
        </main>
      </div>
    </PageLayout>
  );
}

