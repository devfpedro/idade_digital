import { Button, Container, Form, InputGroup } from "react-bootstrap";

function BuscaHero({ titulo, subtitulo, rotulo, placeholder, valor, onChange, onBuscar }) {
  function aoEnviar(evento) {
    evento.preventDefault();
    onBuscar(valor.trim());
  }

  return (
    <section className="hero text-center" aria-labelledby="titulo-pagina">
      <Container>
        <h1 id="titulo-pagina" className="hero-title" tabIndex={-1}>{titulo}</h1>
        <p className="hero-subtitle mx-auto">{subtitulo}</p>

        <Form onSubmit={aoEnviar} className="search-bar mx-auto" role="search">
          <InputGroup size="lg">
            <InputGroup.Text className="search-icon" aria-hidden="true">🔍</InputGroup.Text>
            <Form.Control
              type="search"
              placeholder={placeholder}
              aria-label={rotulo}
              value={valor}
              maxLength={100}
              onChange={(e) => onChange(e.target.value)}
            />
            <Button type="submit" className="btn-accent px-4">Buscar</Button>
          </InputGroup>
        </Form>
      </Container>
    </section>
  );
}

export default BuscaHero;
