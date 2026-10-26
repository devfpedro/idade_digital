import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { api, urlImagem } from "../services/api";

function CampoImagem({ id, rotulo, valor, onChange }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function aoEscolher(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro("");
    setEnviando(true);
    try {
      const { url } = await api.enviarImagem(arquivo);
      onChange(url);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>{rotulo}</Form.Label>
      {valor && <img className="previa-capa" src={urlImagem(valor)} alt="Prévia da capa escolhida" />}
      <Form.Control type="file" accept="image/png,image/jpeg,image/webp" onChange={aoEscolher} disabled={enviando} />
      <Form.Text>PNG, JPG ou WEBP, até 4 MB. {enviando && "Enviando..."}</Form.Text>
      {erro && <div className="text-danger" role="alert">⚠️ {erro}</div>}
      {valor && (
        <Button variant="link" className="p-0 mt-1 d-block" onClick={() => onChange("")}>
          Remover capa
        </Button>
      )}
    </Form.Group>
  );
}

export default CampoImagem;
