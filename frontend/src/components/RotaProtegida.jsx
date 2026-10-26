import { Navigate } from "react-router-dom";
import { obterSessao, sessaoValida } from "../services/auth";

function RotaProtegida({ children, papeis }) {
  if (!sessaoValida()) return <Navigate to="/login" replace />;
  if (papeis && !papeis.includes(obterSessao()?.papel)) return <Navigate to="/" replace />;
  return children;
}

export default RotaProtegida;
