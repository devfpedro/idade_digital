import { useEffect, useState } from "react";

export function useApi(buscar) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState({
    origem: null,
    tentativa: -1,
    dados: null,
    erro: "",
  });

  useEffect(() => {
    const controle = new AbortController();
    buscar(controle.signal)
      .then((dados) => setResultado({ origem: buscar, tentativa, dados, erro: "" }))
      .catch((erro) => {
        if (erro.name === "AbortError") return;
        setResultado({ origem: buscar, tentativa, dados: null, erro: erro.message });
      });
    return () => controle.abort();
  }, [buscar, tentativa]);

  const carregando =
    resultado.origem !== buscar || resultado.tentativa !== tentativa;

  return {
    dados: resultado.dados,
    erro: carregando ? "" : resultado.erro,
    carregando,
    recarregar: () => setTentativa((t) => t + 1),
  };
}
