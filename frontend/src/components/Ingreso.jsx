import { useState } from "react";
import { iniciarSesion } from "../api";

export const LOGO_URL = "https://fernandezfica.cl/img/LogoFF2.png";

export default function Ingreso({ aviso, onIngresar }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      onIngresar(await iniciarSesion(correo, clave));
    } catch (err) {
      setError(err.message);
      setClave("");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="ingreso">
      <form className="ingreso-tarjeta" onSubmit={enviar}>
        <img
          src={LOGO_URL}
          alt="Fernández Fica S.A."
          className="ingreso-logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <h1>Generador de Informes</h1>
        <p className="ingreso-subtitulo">Acceso solo para técnicos autorizados</p>

        {aviso && !error && <div className="aviso-info">{aviso}</div>}
        {error && <div className="error">{error}</div>}

        <label className="campo">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            placeholder="nombre@fernandezfica.cl"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label className="campo">
          <span>Clave</span>
          <input
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </label>

        <button type="submit" className="principal" disabled={cargando || !correo || !clave}>
          {cargando ? "Ingresando…" : "Iniciar sesión"}
        </button>
        <p className="ingreso-ayuda">¿No tienes cuenta o olvidaste tu clave? Pídesela al administrador.</p>
      </form>
    </div>
  );
}
