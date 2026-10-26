import { Button, Spinner } from "react-bootstrap";

function EstadoLista({ carregando, erro, vazio, mensagemVazio, onTentarDeNovo }) {
  if (carregando) {
    return (
      <div className="estado-lista" role="status">
        <Spinner animation="border" size="sm" className="me-2" aria-hidden="true" />
        Carregando...
      </div>
    );
  }
  if (erro) {
    return (
      <div className="estado-lista estado-erro" role="alert">
        <p><span aria-hidden="true">⚠️ </span>{erro}</p>
        <Button className="btn-accent" onClick={onTentarDeNovo}>Tentar de novo</Button>
      </div>
    );
  }
  if (vazio) {
    return <div className="estado-lista" role="status">{mensagemVazio}</div>;
  }
  return null;
}

export default EstadoLista;
