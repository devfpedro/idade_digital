import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import {
  sessaoValida,
  iniciarVigiaSessao,
  EVENTO_SESSAO_EXPIRADA,
} from "./auth";
import { ToastContext } from "./toast";
import "./App.css";

let contadorToasts = 0;

function Toast({ toast, onFechar }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;

    // Animação de saída começa pouco antes da remoção da notificação
    const t1 = setTimeout(
      () => setSaindo(true),
      Math.max(toast.duracao - 300, 0),
    );
    const t2 = setTimeout(() => onFechar(toast.id), toast.duracao);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [toast, onFechar]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast-${toast.tipo}${saindo ? " toast-saindo" : ""}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="toast-icone" aria-hidden="true">
        {toast.icone}
      </span>
      <p className="toast-mensagem">{toast.mensagem}</p>
    </div>
  );
}

function AppInterno() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);

  const mostrarToast = useCallback(
    (mensagem, tipo = "info", duracao = 5000, icone = "ℹ️") => {
      contadorToasts += 1;
      const novo = { id: contadorToasts, mensagem, tipo, duracao, icone };
      setToasts((atual) => [...atual.slice(-2), novo]);
    },
    [],
  );

  const fecharToast = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  // Sessão expirada: toast no topo central + redirecionamento para /login.
  useEffect(() => {
    function aoExpirar(evento) {
      mostrarToast(
        evento.detail?.motivo ||
          "Sua sessão expirou por segurança. Faça login novamente.",
        "aviso",
        5000,
        "⏳",
      );
      navigate("/login", { replace: true });
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    const pararVigia = iniciarVigiaSessao();

    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
      pararVigia();
    };
  }, [mostrarToast, navigate]);

  return (
    <ToastContext.Provider value={mostrarToast}>
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onFechar={fecharToast} />
        ))}
      </div>

      <Routes>
        <Route
          path="/"
          element={
            sessaoValida() ? <Home /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={sessaoValida() ? <Navigate to="/" replace /> : <Login />}
        />
      </Routes>
    </ToastContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppInterno />
    </BrowserRouter>
  );
}

export default App;
