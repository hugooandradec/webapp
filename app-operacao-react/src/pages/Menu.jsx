import {
  FaCalculator,
  FaCashRegister,
  FaChevronRight,
  FaListUl,
  FaMoneyBillWave,
  FaPercent,
  FaRoute,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import PageLayout from "../components/PageLayout";
import { canAccessModule } from "../utils/auth";
import "../styles/menu.css";

export default function Menu({ usuario, onLogout }) {
  const navigate = useNavigate();

  const modulos = [
    {
      id: "lancamento",
      nome: "Lançamento",
      icone: <FaListUl />,
      acao: () => navigate("/lancamento"),
    },
    {
      id: "fechamento",
      nome: "Fechamento",
      icone: <FaMoneyBillWave />,
      acao: () => navigate("/fechamento"),
    },
    {
      id: "pre-fecho",
      nome: "Pre-Fecho",
      icone: <FaCalculator />,
      acao: () => navigate("/pre-fecho"),
    },
    {
      id: "retencao",
      nome: "Retenção",
      icone: <FaPercent />,
      acao: () => navigate("/retencao"),
    },
    {
      id: "calculo-salas",
      nome: "Cálculo Salas",
      icone: <FaCashRegister />,
      acao: () => navigate("/calculo-salas"),
    },
    {
      id: "rotas",
      nome: "Rotas",
      icone: <FaRoute />,
      acao: () => navigate("/rotas"),
    },
  ].filter((item) => canAccessModule(item.id, usuario));

  return (
    <PageLayout
      titulo="App Ajudante"
      usuario={usuario}
      onLogout={onLogout}
    >
      <div className="menu-list">
        {modulos.map((item) => (
          <button
            key={item.nome}
            className="menu-item"
            onClick={item.acao}
            type="button"
          >
            <span className="menu-item__icon">{item.icone}</span>
            <span className="menu-item__title">{item.nome}</span>
            <span className="menu-item__arrow">
              <FaChevronRight />
            </span>
          </button>
        ))}
      </div>
    </PageLayout>
  );
}

