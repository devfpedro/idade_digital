import { Button, Modal } from "react-bootstrap";

function ConfirmarExclusao({ mostrar, titulo, mensagem, onConfirmar, onCancelar }) {
  return (
    <Modal show={mostrar} onHide={onCancelar} centered>
      <Modal.Header closeButton closeLabel="Fechar">
        <Modal.Title as="h2">{titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="corpo-confirmacao">{mensagem}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-dark" onClick={onCancelar}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirmar}>Sim, excluir</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmarExclusao;
