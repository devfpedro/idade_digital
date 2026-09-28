import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const usuario = e.target.email.value;

    const sessao = {
      usuario: usuario,
      loginEm: Date.now(),
    };

    localStorage.setItem("sessao", JSON.stringify(sessao));
    navigate("/");
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-left">
          <h2>Bem-vindo de volta</h2>
          <p>Acesse sua conta agora</p>
          <button type="button" className="btn-outline">
            ENTRAR
          </button>
        </div>
        <div className="auth-right">
          <h2>CRIA SUA CONTA</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="8" r="4" />
                  <path d="M2 21c0-4 3-7 7-7s7 3 7 7" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </span>
              <input type="text" name="nome" placeholder="NOME" required />
            </div>
            <div className="input-group">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 6l10 7 10-7" />
                </svg>
              </span>
              <input type="email" name="email" placeholder="E-MAIL" required />
            </div>
            <div className="input-group">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
              </span>
              <input type="password" name="senha" placeholder="SENHA" required />
            </div>
            <button type="submit" className="btn-solid">
              CADASTRAR
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;