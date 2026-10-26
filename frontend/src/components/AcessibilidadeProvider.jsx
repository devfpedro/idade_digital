import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AcessibilidadeContext,
  aplicarNoDocumento,
  lerPreferencias,
  salvarPreferencias,
} from "../services/acessibilidade";

function AcessibilidadeProvider({ children }) {
  const [prefs, setPrefs] = useState(lerPreferencias);

  useEffect(() => {
    aplicarNoDocumento(prefs);
    salvarPreferencias(prefs);
  }, [prefs]);

  const alterar = useCallback(
    (mudanca) => setPrefs((atual) => ({ ...atual, ...mudanca })),
    [],
  );
  const valor = useMemo(() => ({ prefs, alterar }), [prefs, alterar]);

  return (
    <AcessibilidadeContext.Provider value={valor}>
      {children}
    </AcessibilidadeContext.Provider>
  );
}

export default AcessibilidadeProvider;
