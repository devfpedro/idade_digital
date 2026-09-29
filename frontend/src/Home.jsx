import { useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const sessaoSalva = localStorage.getItem("sessao");
  const sessao = sessaoSalva ? JSON.parse(sessaoSalva) : null;

  function handleLogout() {
    localStorage.removeItem("sessao");
    navigate("/login");
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Login realizado com sucesso!</h1>
        <p>
          Bem-vindo, <strong>{sessao?.usuario}</strong>
        </p>
        <p className="home-info">
          Você vai continuar logado por até 10 minutos sem precisar digitar
          usuário e senha de novo.
        </p>
        <button type="button" className="btn-logout" onClick={handleLogout}>
          SAIR
        </button>
      </div>
    </div>
  );
}

export default Home;