import { Button, Container, Nav, Navbar, NavDropdown, } from "react-bootstrap"
import './Header.css'
import { encerrarSessao, obterSessao } from "../services/auth"
import { useToast } from "../services/toast"
import { useNavigate } from "react-router-dom"

import img from '../assets/react.svg'

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

    <Navbar expand="lg" variant="dark" className="myHeader" sticky="top">
      <Container>

        {
        /* LOGO USUARIO */}
        <Navbar.Brand href="/" className="d-flex align-items-center gap-2 fw-bold">
          <span className="brand-icon">
            <img src={img} alt="Logo site" />
          </span>
          Idade Digital
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />

        <Navbar.Collapse id="main-navbar">
          <Nav>
            <Nav.Link href="/">Início</Nav.Link>
            <Nav.Link href="/cursos">Cursos</Nav.Link>
            <Nav.Link href="/informacoes">Informações</Nav.Link>
            <Nav.Link href="#" disabled>Sobre</Nav.Link>
          </Nav>

          {/* DROPDOWN */}
          <Nav className="ms-auto">
            <NavDropdown
              title={
                <span className="span-perfil">
                  <span className="perfil-inicial" aria-hidden="true">
                    {(sessao?.usuario || "U").trim().charAt(0).toUpperCase()}
                  </span>
                  Meu menu
                </span>
              } id="user-dropdown" align="end" className="nav-dropdown">
              <Button role="menuitem" className="item-menu" variant="light" onClick={() => itemMenu("Informações Pessoais")}>
                <span aria-hidden="true">👤</span> Informações Pessoais
              </Button>
              <Button role="menuitem" className="item-menu" variant="light" onClick={() => itemMenu("Suporte")}>
                <span aria-hidden="true">🛟</span> Suporte
              </Button>
              <Button role="menuitem" className="item-menu" variant="light" onClick={() => itemMenu("Notificações")}>
                <span aria-hidden="true">🔔</span> Notificações
              </Button>
              <Button role="menuitem" className="item-menu item-sair" variant="light" onClick={handleLogout}>
                <span aria-hidden="true">🚪</span> Sair
              </Button>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>

      </Container>
    </Navbar>

  )
}

export default Header