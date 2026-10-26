import { Link } from "react-router-dom";
import Header from "../components/Header";
import Rodape from "../components/Rodape";
import { obterSessao } from "../services/auth";
import "./Home.css";

const PASSOS = [
  {
    icone: "🎓",
    titulo: "Escolha um curso",
    texto: (
      <>
        Em <Link to="/cursos">“Cursos”</Link> há trilhas sobre celular, WhatsApp, internet e
        computador.
      </>
    ),
  },
  {
    icone: "🧩",
    titulo: "Avance por módulos",
    texto: (
      <>
        Cada curso é dividido em “módulos”. Um módulo libera o próximo
        quando você termina, e a plataforma percebe sozinha e guarda seu progresso.
      </>
    ),
  },
  {
    icone: "🛡️",
    titulo: "Aprenda a se proteger",
    texto: (
      <>
        Em <Link to="/informacoes">“Informações”</Link> você reconhece golpes e descobre como
        evitá-los.
      </>
    ),
  },
  {
    icone: "♿",
    titulo: "Use a acessibilidade",
    texto: (
      <>
        No topo de todas as páginas: letra maior, alto contraste, cores para daltonismo e leitura
        em voz alta.
      </>
    ),
  },
];

function Home() {
  const sessao = obterSessao();

  return (
    <div className="home-container">
      <Header />

      <main id="conteudo-principal" tabIndex={-1} className="home-principal">
        <section className="home-boasvindas" aria-labelledby="titulo-boasvindas">
          <div className="boasvindas-texto">
            <h1 id="titulo-boasvindas">Bem-vindo(a), {sessao?.usuario || "usuário"}!</h1>
            <p className="home-frase">
              Que bom te ver por aqui. Escolha uma opção ao lado para continuar
              aprendendo e navegando com segurança.
            </p>
          </div>

          <div className="secoes" role="navigation" aria-label="Seções da plataforma">
            <Link className="cartao-secao" to="/cursos">
              <span className="cartao-icone" aria-hidden="true">🎓</span>
              <span className="cartao-titulo">Cursos</span>
              <span className="cartao-descricao">Aprenda a usar computador e celular no seu ritmo</span>
            </Link>

            <Link className="cartao-secao" to="/informacoes">
              <span className="cartao-icone" aria-hidden="true">ℹ️</span>
              <span className="cartao-titulo">Informações</span>
              <span className="cartao-descricao">Dicas de segurança e proteção contra golpes online</span>
            </Link>
          </div>
        </section>

        <div className="home-duas-colunas">
          <section className="home-bloco" aria-labelledby="sobre-plataforma">
            <h2 id="sobre-plataforma">O que é o Idade Digital?</h2>
            <p>
              O Idade Digital é uma plataforma para aprender a usar o computador e o celular
              com calma, no seu ritmo e com segurança. Aqui você encontra cursos organizados em
              módulos e dicas para se proteger de golpes na internet.
            </p>
          </section>

          <section className="home-bloco" aria-labelledby="para-quem">
            <h2 id="para-quem">Para quem é</h2>
            <p>
              Foi pensado para pessoas com mais de 60 anos que querem usar a tecnologia no dia
              a dia com autonomia. Familiares, cuidadores e educadores também podem usar a
              plataforma para aprender, além de ajudar a pessoa idosa.
            </p>
          </section>
        </div>

        <section className="home-passos-secao" aria-labelledby="como-funciona">
          <h2 id="como-funciona">Como funciona</h2>
          <ol className="home-passos">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="passo">
                <span className="passo-numero" aria-hidden="true">{i + 1}</span>
                <span className="passo-icone" aria-hidden="true">{passo.icone}</span>
                <strong className="passo-titulo">{passo.titulo}</strong>
                <span className="passo-texto">{passo.texto}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="home-faixa" aria-labelledby="quem-faz">
          <div>
            <h2 id="quem-faz">Quem desenvolve</h2>
            <p>
              Projeto de extensão do IFPB Campus Guarabira, do curso de Tecnologia em Sistemas
              para Internet, em parceria com o Centro de Convivência da Pessoa Idosa de Guarabira.
            </p>
          </div>
          <Link to="/equipe" className="faixa-link">Conheça a equipe e os parceiros →</Link>
        </section>
      </main>

      <Rodape />
    </div>
  );
}

export default Home;
