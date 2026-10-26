import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./views/Login";
import Home from "./views/Home";
import Cursos from "./views/Cursos";
import Informacoes from "./views/Informacoes";
import CursoDetalhe from "./views/CursoDetalhe";
import Equipe from "./views/Equipe";
import ModuloDetalhe from "./views/ModuloDetalhe";
import Usuarios from "./views/Usuarios";
import { PAPEIS_GESTAO } from "./services/papeis";
import AvisoSessao from "./components/AvisoSessao";
import RotaProtegida from "./components/RotaProtegida";
import AcessibilidadeProvider from "./components/AcessibilidadeProvider";
import {
  sessaoValida,
  iniciarVigiaSessao,
  lerAvisoLogout,
  limparAvisoLogout,
  EVENTO_SESSAO_EXPIRADA,
} from "./services/auth";
import { ToastContext } from "./services/toast";
import "./App.css";

let contadorToasts = 0;

const TITULOS = {
  "/": "Início",
  "/login": "Entrar",
  "/cursos": "Cursos",
  "/informacoes": "Informações",
  "/equipe": "Equipe e Parceiros",
  "/usuarios": "Usuários",
};

function useAcessoDePagina() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titulo = pathname.includes("/modulos/")
      ? "Módulo"
      : pathname.startsWith("/cursos/")
        ? "Curso"
        : TITULOS[pathname];
    document.title = titulo ? `${titulo} | Idade Digital` : "Idade Digital";
    document.getElementById("conteudo-principal")?.focus({ preventScroll: true });
  }, [pathname]);
}

function Toast({ toast, onFechar }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;

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
      role={toast.tipo === "erro" ? "alert" : "status"}
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
  useAcessoDePagina();
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

  // Aviso de sessão encerrada. Se a expiração for percebida ao abrir o site (janela
  // fechada sem sair), o aviso já está guardado e aparece sobre a tela de entrada.
  const [aviso, setAviso] = useState(() => {
    sessaoValida();
    const guardado = lerAvisoLogout();
    return guardado ? { motivo: guardado.motivo, redirecionar: false } : null;
  });

  const fecharAviso = useCallback(() => {
    if (aviso?.redirecionar) navigate("/login", { replace: true });
    setAviso(null);
  }, [aviso, navigate]);

  useEffect(() => {
    limparAvisoLogout();

    function aoExpirar(evento) {
      limparAvisoLogout();
      setAviso({ motivo: evento.detail?.motivo || "", redirecionar: true });
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    const pararVigia = iniciarVigiaSessao();

    return () => {
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
      pararVigia();
    };
  }, []);

  return (
    <ToastContext.Provider value={mostrarToast}>
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onFechar={fecharToast} />
        ))}
      </div>

      {aviso && <AvisoSessao aviso={aviso} onFechar={fecharAviso} />}

      <Routes>
        <Route path="/" element={<RotaProtegida><Home /></RotaProtegida>} />
        <Route
          path="/login"
          element={sessaoValida() ? <Navigate to="/" replace /> : <Login />}
        />
        <Route path="/cursos" element={<RotaProtegida><Cursos /></RotaProtegida>} />
        <Route path="/cursos/:id" element={<RotaProtegida><CursoDetalhe /></RotaProtegida>} />
        <Route path="/informacoes" element={<RotaProtegida><Informacoes /></RotaProtegida>} />
        <Route
          path="/cursos/:id/modulos/:ordem"
          element={<RotaProtegida><ModuloDetalhe /></RotaProtegida>}
        />
        <Route
          path="/usuarios"
          element={<RotaProtegida papeis={PAPEIS_GESTAO}><Usuarios /></RotaProtegida>}
        />
        <Route path="/equipe" element={<RotaProtegida><Equipe /></RotaProtegida>} />
        <Route path="/sobre" element={<Navigate to="/equipe" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AcessibilidadeProvider>
        <AppInterno />
      </AcessibilidadeProvider>
    </BrowserRouter>
  );
}

export default App;
