import { useEffect, useState } from "react";
import { Button, Dropdown } from "react-bootstrap";
import {
  ESCALAS_FONTE,
  PADRAO,
  RITMOS,
  VOZ_PADRAO,
  carregarVozPublica,
  carregarVozes,
  lerEmVoz,
  pararLeitura,
  useAcessibilidade,
} from "../services/acessibilidade";
import "./BarraAcessibilidade.css";

const OPCOES = [
  ["altoContraste", "Alto contraste", "Texto preto sobre fundo branco, com bordas fortes."],
  ["daltonismo", "Cores para daltonismo", "Troca vermelho e verde por azul e laranja."],
  ["semAnimacao", "Reduzir movimentos", "Remove animações e transições."],
];

function textoDaPagina() {
  const principal = document.getElementById("conteudo-principal");
  return (principal?.innerText || document.body.innerText || "").trim();
}

function BarraAcessibilidade({ publico = false }) {
  const { prefs, alterar } = useAcessibilidade();
  const [lendo, setLendo] = useState(false);
  const [vozes, setVozes] = useState([]);

  useEffect(() => {
    let ativo = true;
    (publico ? carregarVozPublica() : carregarVozes()).then((lista) => ativo && setVozes(lista));
    return () => {
      ativo = false;
      pararLeitura();
    };
  }, [publico]);

  const temVoz = vozes.length > 0;
  const opcoesLeitura = publico ? { publico: true } : { vozId: prefs.vozId, ritmo: prefs.ritmo };

  async function alternarLeitura() {
    if (lendo) {
      pararLeitura();
      setLendo(false);
      return;
    }
    const selecao = window.getSelection()?.toString().trim();
    setLendo(true);
    const iniciou = await lerEmVoz(selecao || textoDaPagina(), {
      ...opcoesLeitura,
      aoTerminar: () => setLendo(false),
    });
    if (!iniciou) setLendo(false);
  }

  async function testarVoz(novas = {}) {
    pararLeitura();
    await lerEmVoz("Olá! Esta é a voz que vai ler as páginas para você.", { ...opcoesLeitura, ...novas });
  }

  const indice = ESCALAS_FONTE.indexOf(prefs.escalaFonte);
  const diferentesDoPadrao = JSON.stringify(prefs) !== JSON.stringify(PADRAO);

  return (
    <div className="barra-acessibilidade" role="group" aria-label="Recursos de acessibilidade">
      {temVoz && (
        <Button
          variant="light"
          className="btn-acess"
          onClick={alternarLeitura}
          aria-pressed={lendo}
          title="Lê em voz alta o texto selecionado ou, se nada estiver selecionado, a página inteira"
        >
          <span aria-hidden="true">{lendo ? "⏹️" : "🔊"}</span>{" "}
          {lendo ? "Parar leitura" : "Ouvir a página"}
        </Button>
      )}

      <Dropdown align="end" autoClose="outside">
        <Dropdown.Toggle variant="light" className="btn-acess" id="menu-acessibilidade">
          <span aria-hidden="true">♿</span> Acessibilidade
        </Dropdown.Toggle>
        <Dropdown.Menu className="menu-acess">
          <div className="grupo-acess">
            <span className="rotulo-acess" id="rotulo-fonte">Tamanho da letra</span>
            <div role="group" aria-labelledby="rotulo-fonte" className="d-flex gap-2">
              <Button
                variant="outline-dark"
                disabled={indice <= 0}
                aria-label="Diminuir letra"
                onClick={() => alterar({ escalaFonte: ESCALAS_FONTE[indice - 1] })}
              >
                A−
              </Button>
              <span className="valor-acess" aria-live="polite">{prefs.escalaFonte}%</span>
              <Button
                variant="outline-dark"
                disabled={indice >= ESCALAS_FONTE.length - 1}
                aria-label="Aumentar letra"
                onClick={() => alterar({ escalaFonte: ESCALAS_FONTE[indice + 1] })}
              >
                A+
              </Button>
            </div>
          </div>

          {OPCOES.map(([chave, rotulo, ajuda]) => (
            <label className="opcao-acess" key={chave}>
              <input
                type="checkbox"
                checked={prefs[chave]}
                onChange={(e) => alterar({ [chave]: e.target.checked })}
              />
              <span>
                {rotulo}
                <small className="ajuda-acess">{ajuda}</small>
              </span>
            </label>
          ))}

          {temVoz && !publico && (
            <div className="grupo-acess">
              <label className="rotulo-acess" htmlFor="voz-leitura">Voz da leitura</label>
              <select
                id="voz-leitura"
                className="form-select"
                value={vozes.some((v) => v.id === prefs.vozId) ? prefs.vozId : VOZ_PADRAO}
                onChange={(e) => {
                  alterar({ vozId: e.target.value });
                  testarVoz({ vozId: e.target.value });
                }}
              >
                {vozes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}{v.padrao ? " (padrão)" : " (em teste)"}
                  </option>
                ))}
              </select>

              <label className="rotulo-acess mt-3" htmlFor="ritmo-leitura">Velocidade da leitura</label>
              <select
                id="ritmo-leitura"
                className="form-select"
                value={prefs.ritmo}
                onChange={(e) => {
                  alterar({ ritmo: e.target.value });
                  testarVoz({ ritmo: e.target.value });
                }}
              >
                {Object.entries(RITMOS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
              <Button variant="outline-dark" size="sm" className="mt-2" onClick={() => testarVoz()}>
                <span aria-hidden="true">▶️</span> Testar a voz
              </Button>
            </div>
          )}

          <Button
            variant="link"
            className="p-0"
            disabled={!diferentesDoPadrao}
            onClick={() => alterar(PADRAO)}
          >
            Voltar ao padrão
          </Button>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}

export default BarraAcessibilidade;
