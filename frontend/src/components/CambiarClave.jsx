import { useState } from "react";
import { cambiarMiClave } from "../api";

/** obligatorio: la clave actual es temporal y no se puede seguir sin cambiarla. */
export default function CambiarClave({ onListo, onVolver, obligatorio = false }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState(false);

  const noCoinciden = repetida && nueva !== repetida;

  async function enviar(e) {
    e.preventDefault();
    if (noCoinciden) return;
    setError("");
    setCargando(true);
    try {
      onListo(await cambiarMiClave(actual, nueva));
      setHecho(true);
      setActual("");
      setNueva("");
      setRepetida("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="paso">
      <h2>{obligatorio ? "Elige tu clave" : "Cambiar mi clave"}</h2>
      {obligatorio && (
        <div className="aviso-info">
          Estás usando una clave temporal. Antes de continuar, elige una clave propia que solo tú conozcas.
        </div>
      )}
      {hecho && <div className="aviso-ok">Listo: tu clave quedó cambiada.</div>}
      {error && <div className="error">{error}</div>}
      <form className="formulario formulario--angosto" onSubmit={enviar}>
        <label className="campo ancho">
          <span>{obligatorio ? "Clave temporal (con la que entraste)" : "Clave actual"}</span>
          <input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
        </label>
        <label className="campo">
          <span>Clave nueva (mínimo 8 caracteres)</span>
          <input type="password" autoComplete="new-password" minLength={8} value={nueva} onChange={(e) => setNueva(e.target.value)} required />
        </label>
        <label className={`campo ${noCoinciden ? "campo--falta" : ""}`}>
          <span>Repite la clave nueva</span>
          <input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} required />
        </label>
        {noCoinciden && <p className="texto-error ancho">Las claves nuevas no coinciden.</p>}
        <div className="acciones ancho">
          <button type="button" onClick={onVolver}>
            {obligatorio ? "Cerrar sesión" : "Volver a los informes"}
          </button>
          <button type="submit" className="principal" disabled={cargando || !actual || nueva.length < 8 || nueva !== repetida}>
            {cargando ? "Guardando…" : "Cambiar clave"}
          </button>
        </div>
      </form>
    </section>
  );
}
