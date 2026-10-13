import { Button, Card, Col, Container, Form, InputGroup, Row } from "react-bootstrap"
import Header from "../components/Header";
import './Informacoes.css'
import { useState } from "react";

// IMAGEM DE EXEMPLO
import reactsvg from '../assets/react.svg'

const Informacoes = () => {

    // EXEMPLO PARA VISUALIZAÇÃO DOS CARDS
    const informacoes = [
        {
            id: 1,
            nome: "Informação 1",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            imagem: reactsvg,
        },
        {
            id: 2,
            nome: "Informação 2",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            imagem: reactsvg,
        },
        {
            id: 3,
            nome: "Informação 3",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            imagem: reactsvg,
        }
    ];

    const [termo, setTermo] = useState("");

    const handleSubmit = (event) => {
        event.preventDefault();
        onsubmit(termo.trim());
    }

    const handleChange = (event) => {
        setTermo(event.target.value);
        if (event.target.value === "") onsubmit("");
    }

    return (
        <Container className="main-container">
            <Header />

            <section className="hero text-center">
                <Container>
                    <h1 className="hero-title">Leia dicas de segurança e proteção</h1>
                    <p className="hero-subtitle mx-auto">
                        Informações uteis sobre como ultilizar as redes e dispositivos de forma facil e segura visando prevenção contra golpes online
                    </p>

                    {/* BARRA DE PESQUISA */}
                    <Form onSubmit={handleSubmit} className="search-bar mx-auto" role="search">
                        <InputGroup size="lg">
                            <InputGroup.Text className="search-icon">
                                <img src={reactsvg} alt="" height="20px" />
                            </InputGroup.Text>
                            <Form.Control
                                type="search"
                                placeholder="Procure por informações..."
                                aria-label="Procure por informações"
                                value={termo}
                                onChange={handleChange}
                            />
                            <Button type="submit" className="btn-accent px-4">
                                Buscar
                            </Button>
                        </InputGroup>
                    </Form>
                </Container>
            </section>

            {/* CARDS DE INFORMAÇÕES */}
            <section className="courses-section">
                <Row xs={1} sm={2} lg={3} className="g-4">
                    {informacoes.map((informacao) => (
                        <Col key={informacao.id}>
                            <Card className="course-card h-100">
                                <div className="course-card-img-wrapper">
                                    <Card.Img
                                        variant="top"
                                        src={informacao.imagem}
                                        alt={`Ilustração do informacao ${informacao.nome}`}
                                        className="course-card-img"
                                        loading="lazy"
                                    />
                                </div>

                                <Card.Body className="d-flex flex-column p-4">
                                    <Card.Title as="h3" className="course-title">
                                        {informacao.nome}
                                    </Card.Title>
                                    <Card.Text className="course-description">{informacao.descricao}</Card.Text>
                                    <Button className="btn-accent w-100 mt-3">Saiba Mais</Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </section>

        </Container>
    )
}

export default Informacoes