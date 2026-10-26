import { useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";

const SEGUNDOS_PARA_LER = 20;

function AvisoSessao({ aviso, onFechar }) {
  const [segundos, setSegundos] = useState(SEGUNDOS_PARA_LER);

  useEffect(() => {
    const intervalo = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (segundos <= 0) onFechar();
  }, [segundos, onFechar]);

  return (
    <Modal show centered backdrop="static" keyboard={false} aria-labelledby="titulo-aviso-sessao" role="alertdialog">
      <Modal.Header>
        <Modal.Title as="h2" id="titulo-aviso-sessao">
          <span aria-hidden="true">⏳ </span>Sessão encerrada por segurança
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="aviso-sessao-texto">{aviso.motivo}</p>
        {aviso.redirecionar && (
          <p className="mb-0">Você será levado à tela de entrada em {Math.max(segundos, 0)} segundos.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button className="btn-accent" autoFocus onClick={onFechar}>
          {aviso.redirecionar ? "Ir para a tela de entrada" : "Entendi"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AvisoSessao;
