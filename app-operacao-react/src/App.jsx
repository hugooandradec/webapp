import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Fechamento from "./pages/Fechamento";
import Lancamento from "./pages/Lancamento";
import Login from "./pages/Login";
import CalculoSalas from "./pages/CalculoSalas";
import Menu from "./pages/Menu";
import PreFecho from "./pages/PreFecho";
import Retencao from "./pages/Retencao";
import { canAccessModule, getCurrentUser, logout } from "./utils/auth";

import "./styles/login.css";

export default function App() {
  const [usuario, setUsuario] = useState(getCurrentUser());

  useEffect(() => {
    const atualizarUsuario = () => {
      setUsuario(getCurrentUser());
    };

    window.addEventListener("storage", atualizarUsuario);
    window.addEventListener("focus", atualizarUsuario);

    return () => {
      window.removeEventListener("storage", atualizarUsuario);
      window.removeEventListener("focus", atualizarUsuario);
    };
  }, []);

  function handleLogout() {
    logout();
    setUsuario(null);
  }

  if (!usuario) {
    return <Login />;
  }

  function protegerModulo(modulo, element) {
    return canAccessModule(modulo, usuario) ? element : <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Menu
            usuario={usuario}
            onLogout={handleLogout}
          />
        }
      />

      <Route
        path="/fechamento"
        element={protegerModulo(
          "fechamento",
          <Fechamento
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}
      />

      <Route
        path="/lancamento"
        element={protegerModulo(
          "lancamento",
          <Lancamento
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}
      />

      <Route
        path="/pre-fecho"
        element={protegerModulo(
          "pre-fecho",
          <PreFecho
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}
      />

      <Route
        path="/retencao"
        element={protegerModulo(
          "retencao",
          <Retencao
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}
      />

      <Route
        path="/calculo-salas"
        element={protegerModulo(
          "calculo-salas",
          <CalculoSalas
            usuario={usuario}
            onLogout={handleLogout}
          />
        )}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
