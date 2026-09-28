import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import { sessaoValida } from "./auth";

function RotaProtegida({ children }) {
  return sessaoValida() ? children : <Navigate to="/login" />;
}

function RotaLogin() {
  return sessaoValida() ? <Navigate to="/" /> : <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RotaProtegida>
              <Home />
            </RotaProtegida>
          }
        />
        <Route path="/login" element={<RotaLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;