import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obterSessao, encerrarSessao, TEMPO_SESSAO_MS } from "./auth";
import { useToast } from "./toast";
import "./Home.css";

function descreverPeriodoSessao() {
  if (TEMPO_SESSAO_MS < 60000) {
    return `${Math.round(TEMPO_SESSAO_MS / 1000)} segundos`;
  }
  const minutos = Math.round(TEMPO_SESSAO_MS / 60000);
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}

function Home() {
  const navigate = useNavigate();
  const mostrarToast = useToast();
  const sessao = obterSessao();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);

  // Sessão sumiu (expirada em outra aba/storage limpo): volta para o login
  useEffect(() => {
    if (!sessao) navigate("/login", { replace: true });
  }, [sessao, navigate]);

  // Fecha o dropdown ao clicar fora ou pressionar Esc
  useEffect(() => {
    if (!menuAberto) return undefined;

    function aoClicarFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    }
    function aoPressionarEsc(e) {
      if (e.key === "Escape") setMenuAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarEsc);
    };
  }, [menuAberto]);

  function handleLogout() {
    encerrarSessao();
    navigate("/login");
  }

  function itemMenu(nomeItem) {
    return () => {
      setMenuAberto(false);
      mostrarToast(`${nomeItem}: funcionalidade em desenvolvimento.`, "info");
    };
  }

  function secaoFutura(nomeSecao) {
    return () =>
      mostrarToast(`${nomeSecao}: em breve nesta plataforma!`, "info");
  }

  return (
    <div className="home-container">
      <header className="home-topo">
        <div className="perfil-wrapper" ref={menuRef}>
          <button
            type="button"
            className="btn-perfil"
            aria-label="Abrir menu do perfil"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            title={sessao?.usuario || "Perfil"}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            {(sessao?.usuario || "U")
              .trim()
              .charAt(0)
              .toUpperCase()}
          </button>

          {menuAberto && (
            <nav className="menu-perfil" role="menu" aria-label="Menu do perfil">
              <button type="button" role="menuitem" className="item-menu" onClick={itemMenu("Informações Pessoais")}>
                <span aria-hidden="true">👤</span> Informações Pessoais
              </button>
              <button type="button" role="menuitem" className="item-menu" onClick={itemMenu("Suporte")}>
                <span aria-hidden="true">🛟</span> Suporte
              </button>
              <button type="button" role="menuitem" className="item-menu" onClick={itemMenu("Notificações")}>
                <span aria-hidden="true">🔔</span> Notificações
              </button>
              <button type="button" role="menuitem" className="item-menu item-sair" onClick={handleLogout}>
                <span aria-hidden="true">🚪</span> Sair
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="home-card">
        <h1>Bem-vindo(a), {sessao?.usuario || "usuário"}!</h1>
        <p className="home-frase">
          Que bom te ver por aqui. Escolha uma opção abaixo para continuar
          aprendendo e navegando com segurança.
        </p>

        <section className="secoes" aria-label="Seções da plataforma">
          <button type="button" className="cartao-secao" onClick={secaoFutura("Cursos")}>
            <span className="cartao-icone" aria-hidden="true">🎓</span>
            <span className="cartao-titulo">Cursos</span>
            <span className="cartao-descricao">Aprenda a usar computador e celular no seu ritmo</span>
          </button>

          <button type="button" className="cartao-secao" onClick={secaoFutura("Informações")}>
            <span className="cartao-icone" aria-hidden="true">ℹ️</span>
            <span className="cartao-titulo">Informações</span>
            <span className="cartao-descricao">Dicas de segurança e proteção contra golpes online</span>
          </button>
        </section>

        <p className="home-info">
          Por segurança, sua sessão expira após {descreverPeriodoSessao()} sem
          atividade. Toques, cliques e digitação renovam esse tempo
          automaticamente — você só entra de novo se ficar esse período sem
          usar a plataforma.
        </p>

        <button type="button" className="btn-logout" onClick={handleLogout}>
          SAIR
        </button>
      </main>
    </div>
  );
}

export default Home;
