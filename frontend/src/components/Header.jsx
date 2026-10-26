import { Button, Container, Nav, Navbar, NavDropdown } from "react-bootstrap"
import { Link, NavLink, useNavigate } from "react-router-dom"
import './Header.css'
import { encerrarSessao, obterSessao } from "../services/auth"
import { PAPEIS_GESTAO } from "../services/papeis"
import { useToast } from "../services/toast"
import BarraAcessibilidade from "./BarraAcessibilidade"
import TempoRestante from "./TempoRestante"

const Header = () => {
  const sessao = obterSessao()
  const mostrarToast = useToast();
  const navigate = useNavigate();

  function handleLogout() {
    encerrarSessao();
    navigate("/login");
  }

  function itemMenu(nomeItem) {
    mostrarToast(`${nomeItem}: funcionalidade em desenvolvimento.`, "info");
  }

  return (
    <>
      <a className="link-pular" href="#conteudo-principal">Pular para o conteúdo</a>

      <div className="faixa-acessibilidade" role="region" aria-label="Recursos de acessibilidade">
        <div className="conteudo-faixa">
          <p className="texto-faixa">Precisa de ajuda para ler? Use os recursos ao lado:</p>
          <BarraAcessibilidade />
        </div>
      </div>

      <Navbar as="header" expand="lg" variant="dark" className="myHeader" sticky="top">
        <Container>

          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
            Idade Digital
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navbar" aria-label="Abrir menu de navegação" />

          <Navbar.Collapse id="main-navbar">
            <Nav as="nav" aria-label="Navegação principal">
              <Nav.Link as={NavLink} to="/" end>Início</Nav.Link>
              <Nav.Link as={NavLink} to="/cursos">Cursos</Nav.Link>
              <Nav.Link as={NavLink} to="/informacoes">Informações</Nav.Link>
              <Nav.Link as={NavLink} to="/equipe">Equipe e Parceiros</Nav.Link>
            </Nav>

            <Nav className="ms-auto align-items-lg-center gap-2">
              <NavDropdown
                title={
                  <span className="span-perfil">
                    <span className="perfil-inicial" aria-hidden="true">
                      {(sessao?.usuario || "U").trim().charAt(0).toUpperCase()}
                    </span>
                    Meu menu
                  </span>
                } id="user-dropdown" align="end" className="nav-dropdown">
                <Button className="item-menu" variant="light" onClick={() => itemMenu("Informações Pessoais")}>
                  <span aria-hidden="true">👤</span> Informações Pessoais
                </Button>
                <Button className="item-menu" variant="light" onClick={() => itemMenu("Suporte")}>
                  <span aria-hidden="true">🛟</span> Suporte
                </Button>
                <Button className="item-menu" variant="light" onClick={() => itemMenu("Notificações")}>
                  <span aria-hidden="true">🔔</span> Notificações
                </Button>
                {PAPEIS_GESTAO.includes(sessao?.papel) && (
                  <Button className="item-menu" variant="light" onClick={() => navigate("/usuarios")}>
                    <span aria-hidden="true">👥</span> Gerenciar usuários
                  </Button>
                )}
                <Button className="item-menu item-sair" variant="light" onClick={handleLogout}>
                  <span aria-hidden="true">🚪</span> Sair
                </Button>
                <NavDropdown.Divider />
                <NavDropdown.ItemText>
                  <TempoRestante />
                </NavDropdown.ItemText>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>

        </Container>
      </Navbar>
    </>
  )
}

export default Header
