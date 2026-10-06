import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { criarSessao } from "./auth";
import dados from "./users_mock.json";

// Autenticação mock: valida o e-mail (e a senha, se preenchida) contra o
// users_mock.json. O arquivo é gitignored; o .example versionado garante que
// o build não quebre para quem clona o repositório.
function carregarUsuarios() {
  if (dados && Array.isArray(dados.users) && dados.users.length > 0) {
    return dados.users;
  }
  return [];
}

function Login() {
  const navigate = useNavigate();
  const [erro, setErro] = useState("");
  const [mensagemSuporte, setMensagemSuporte] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    const email = e.target.email.value.trim().toLowerCase();
    const senha = e.target.senha.value;

    // Validações básicas (segurança: não confiar só no atributo required)
    if (!email || !senha) {
      setErro("Preencha o e-mail e a senha para entrar.");
      return;
    }

    const usuarios = carregarUsuarios();
    if (usuarios.length === 0) {
      setErro(
        "Nenhum usuário de teste configurado. Verifique o users_mock.json.",
      );
      return;
    }

    const usuarioEncontrado = usuarios.find(
      (u) =>
        u && typeof u.email === "string" && u.email.toLowerCase() === email,
    );

    if (!usuarioEncontrado) {
      setErro("E-mail não cadastrado. Verifique e tente novamente.");
      return;
    }

    if (senha !== usuarioEncontrado.senha) {
      setErro("Senha incorreta. Tente novamente.");
      return;
    }

    // A estrutura da sessão é responsabilidade exclusiva do auth.js
    criarSessao(usuarioEncontrado.nome || email);
    navigate("/");
  }

  function abrirSuporte() {
    setMensagemSuporte(
      "Suporte: suporte@idadedigital.com.br | Telefone: 0800 555 0123",
    );
  }

  function acaoIndisponivel(nomeBotao) {
    return () =>
      setErro(`${nomeBotao}: funcionalidade em desenvolvimento.`);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-left">
          <h2>Primeira vez aqui?</h2>
          <p>Crie sua conta e comece a aprender no seu ritmo.</p>
          <button
            type="button"
            className="btn-outline"
            onClick={acaoIndisponivel("Criar conta")}
          >
            CRIAR CONTA
          </button>
        </div>

        <div className="auth-right">
          <h2>Entre na sua conta</h2>
          {erro && (
            <p className="form-mensagem-erro" role="alert">
              {erro}
              <button
                type="button"
                className="btn-fechar"
                aria-label="Fechar mensagem"
                onClick={() => setErro("")}
              >
                ✕
              </button>
            </p>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <label className="campo-rotulo" htmlFor="campo-email">Seu e-mail</label>
            <div className="input-group">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M2 6l10 7 10-7" />
                </svg>
              </span>
              <input
                id="campo-email"
                type="email"
                name="email"
                placeholder="exemplo@email.com"
                autoComplete="email"
                required
              />
            </div>
            <label className="campo-rotulo" htmlFor="campo-senha">Sua senha</label>
            <div className="input-group">
              <span className="icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
              </span>
              <input
                id="campo-senha"
                type={mostrarSenha ? "text" : "password"}
                name="senha"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-olho"
                aria-pressed={mostrarSenha}
                onClick={() => setMostrarSenha((v) => !v)}
              >
                {mostrarSenha ? "Esconder" : "Mostrar"}
              </button>
            </div>
            <button type="submit" className="btn-solid">
              ENTRAR
            </button>
          </form>

          <button
            type="button"
            className="btn-link"
            onClick={acaoIndisponivel("Esqueceu a senha?")}
          >
            Esqueceu a senha?
          </button>

          <button
            type="button"
            className="btn-google"
            onClick={acaoIndisponivel("Entrar com o Google")}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.3 3.8l3.6 2.8c2.1-2 3.7-4.9 3.7-8.7z" />
              <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.6-2.8c-1 .7-2.4 1.2-4.3 1.2-3.3 0-6.1-2.2-7.1-5.2L1.2 17C3.2 21.1 7.2 24 12 24z" />
              <path fill="#FBBC05" d="M4.9 14.3a7.2 7.2 0 010-4.6L1.2 6.8a12 12 0 000 10.4l3.7-2.9z" />
              <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.2 0 3.2 2.9 1.2 6.8l3.7 2.9C5.9 6.9 8.7 4.7 12 4.7z" />
            </svg>
            ENTRAR COM O GOOGLE
          </button>
        </div>

        <button
          type="button"
          className="btn-suporte"
          aria-label="Suporte e contato"
          title="Suporte/Contato"
          onClick={abrirSuporte}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
            <path d="M19.4 13a7.6 7.6 0 000-2l2.1-1.6a.5.5 0 00.1-.7l-2-3.4a.5.5 0 00-.6-.2l-2.5 1a7.6 7.6 0 00-1.7-1L14.4 2.4a.5.5 0 00-.5-.4h-4a.5.5 0 00-.5.4L9 5a7.6 7.6 0 00-1.7 1l-2.5-1a.5.5 0 00-.6.2l-2 3.4a.5.5 0 00.1.7L4.6 11a7.6 7.6 0 000 2l-2.1 1.6a.5.5 0 00-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7 1l.4 2.6c0 .2.2.4.5.4h4c.2 0 .5-.2.5-.4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 00-.1-.7L19.4 13z" />
            <circle cx="12" cy="12" r="3" fill="#ffffff" />
          </svg>
          Preciso de ajuda
        </button>
      </div>

      {mensagemSuporte && (
        <div className="suporte-balao" role="status">
          {mensagemSuporte}
          <button
            type="button"
            className="btn-fechar"
            aria-label="Fechar informações de suporte"
            onClick={() => setMensagemSuporte("")}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default Login;
