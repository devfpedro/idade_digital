import { useEffect, useState } from "react";

export function useBusca(atrasoMs = 400) {
  const [termo, setTermo] = useState("");
  const [consulta, setConsulta] = useState("");

  useEffect(() => {
    const limpo = termo.trim();
    const timer = setTimeout(() => setConsulta(limpo), limpo ? atrasoMs : 0);
    return () => clearTimeout(timer);
  }, [termo, atrasoMs]);

  return { termo, setTermo, consulta, buscarAgora: setConsulta };
}
