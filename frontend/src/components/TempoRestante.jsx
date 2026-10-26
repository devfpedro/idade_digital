import { useEffect, useState } from "react";
import { formatarTempoRestante, milissegundosRestantes } from "../services/auth";

function TempoRestante() {
  const [restante, setRestante] = useState(milissegundosRestantes);

  useEffect(() => {
    const intervalo = setInterval(() => setRestante(milissegundosRestantes()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="tempo-sessao">
      <span aria-hidden="true">⏱️ </span>
      Sessão ativa por mais <strong>{formatarTempoRestante(restante)}</strong>
      <small className="d-block">O tempo reinicia quando você usa a plataforma.</small>
    </div>
  );
}

export default TempoRestante;
