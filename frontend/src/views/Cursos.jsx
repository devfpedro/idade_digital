import { Badge, Button, Card, Col, Container, Form, InputGroup, Row } from "react-bootstrap"
import Header from "../components/Header";
import './Cursos.css'
import { useState } from "react";

import reactsvg from '../assets/react.svg'

const Cursos = () => {

    {/* EXEMPLO PARA VISUALIZAÇÃO DOS CARDS */}
    const cursos = [
        {
            id: 1,
            nome: "Curso 1",
            categoria: "Video aula",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            qtdVideos: "40",
            imagem: reactsvg,
        },
        {
            id: 2,
            nome: "Curso 2",
            categoria: "Artigo",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            qtdVideos: "30",
            imagem: reactsvg,
        },
        {
            id: 3,
            nome: "Curso 3",
            categoria: "Video aula",
            descricao:
                'Lorem ipsum dolor sit amet, consectetur adipisicing elit.',
            qtdVideos: "35",
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
                    <h1 className="hero-title">Encontre o curso ideal para você</h1>
                    <p className="hero-subtitle mx-auto">
                        Explore cursos de introdução as novas tecnologias ministrados por profissionais experientes
                        e aprenda no seu ritmo.
                    </p>

                    {/* BARRA DE PESQUISA */}
                    <Form onSubmit={handleSubmit} className="search-bar mx-auto" role="search">
                        <InputGroup size="lg">
                            <InputGroup.Text className="search-icon">
                                <img src={reactsvg} alt="" height="20px" />
                            </InputGroup.Text>
                            <Form.Control
                                type="search"
                                placeholder="Buscar cursos..."
                                aria-label="Buscar cursos"
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

            {/* CARDS DE CUSOS */}
            <section className="courses-section">
                <Row xs={1} sm={2} lg={3} className="g-4">
                    {cursos.map((curso) => (
                        <Col key={curso.id}>
                            <Card className="course-card h-100">
                                <div className="course-card-img-wrapper">
                                    <Card.Img
                                        variant="top"
                                        src={curso.imagem}
                                        alt={`Ilustração do curso ${curso.nome}`}
                                        className="course-card-img"
                                        loading="lazy"
                                    />
                                </div>

                                <Card.Body className="d-flex flex-column p-4">
                                    <Badge bg="" className="course-badge align-self-start mb-3">
                                        {curso.categoria}
                                    </Badge>

                                    <Card.Title as="h3" className="course-title">
                                        {curso.nome}
                                    </Card.Title>

                                    <Card.Text className="course-description">{curso.descricao}</Card.Text>

                                    <div className="course-meta mt-auto">
                                        <span className="d-inline-flex align-items-center gap-2">
                                            <img src={reactsvg} alt="" height="20px" />
                                            Videos: {curso.qtdVideos}
                                        </span>
                                    </div>


                                    <Button className="btn-accent w-100 mt-3">Ver curso</Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </section>

        </Container>
    )
}

export default Cursos