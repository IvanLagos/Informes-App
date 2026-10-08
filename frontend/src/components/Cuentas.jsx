import { useEffect, useState } from "react";
import { actualizarUsuario, crearUsuario, eliminarUsuario, listarUsuarios } from "../api";

const NUEVA_VACIA = { nombre: "", correo: "", perfil: "tecnico", clave: "" };

function fechaHora(iso) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

/** Clave temporal fácil de dictar: 10 caracteres sin letras confundibles (l/1, O/0). */
function claveAleatoria() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const valores = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(valores, (v) => letras[v % letras.length]).join("");
}

function FilaCuenta({ cuenta, perfiles, esYo, largoMinimo, onCambio, onError }) {
  const [claveNueva, setClaveNueva] = useState(null); // null = cerrado
  const [ocupado, setOcupado] = useState(false);
  const [claveAsignada, setClaveAsignada] = useState("");

  async function aplicar(cambios, mensajeConfirmacion) {
    if (mensajeConfirmacion && !window.confirm(mensajeConfirmacion)) return false;
    setOcupado(true);
    onError("");
    try {
      await onCambio(cuenta.id, cambios);
      return true;
    } catch (e) {
      onError(e.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function guardarClave() {
    if (await aplicar({ clave: claveNueva })) {
      setClaveAsignada(claveNueva);
      setClaveNueva(null);
    }
  }

  return (
    <tr className={cuenta.activo ? "" : "cuenta--inactiva"}>
      <td>
        <strong>{cuenta.nombre}</strong>
        {esYo && <span className="etiqueta-yo">tú</span>}
        <div className="cuenta-correo">{cuenta.correo}</div>
      </td>
      <td>
        <select
          value={cuenta.perfil}
          disabled={ocupado || esYo}
          onChange={(e) => aplicar({ perfil: e.target.value })}
          title={esYo ? "No puedes cambiar tu propio perfil" : ""}
        >
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.etiqueta}
            </option>
          ))}
        </select>
      </td>
      <td>
        <span className={`estado ${cuenta.activo ? "estado--activo" : "estado--inactivo"}`}>
          {cuenta.activo ? "Activa" : "Desactivada"}
        </span>
      </td>
      <td className="cuenta-fecha">{fechaHora(cuenta.ultimoIngreso)}</td>
      <td className="cuenta-acciones">
        {claveNueva === null ? (
          <>
            {/* La propia se cambia en «Cambiar mi clave» (pide la actual y mantiene la sesión). */}
            {esYo ? (
              <span className="cuenta-nota">Tu clave: usa «Cambiar mi clave»</span>
            ) : (
              <button type="button" className="boton-chico" disabled={ocupado} onClick={() => setClaveNueva(claveAleatoria())}>
                Nueva clave
              </button>
            )}
            {!esYo && (
              <button
                type="button"
                className="boton-chico"
                disabled={ocupado}
                onClick={() =>
                  aplicar(
                    { activo: !cuenta.activo },
                    cuenta.activo ? `¿Desactivar a ${cuenta.nombre}? No podrá entrar hasta que la reactives.` : null
                  )
                }
              >
                {cuenta.activo ? "Desactivar" : "Activar"}
              </button>
            )}
            {!esYo && (
              <button
                type="button"
                className="boton-chico boton-peligro"
                disabled={ocupado}
                onClick={() => {
                  if (!window.confirm(`¿Eliminar la cuenta de ${cuenta.nombre}? Esto no se puede deshacer.`)) return;
                  setOcupado(true);
                  onError("");
                  eliminarUsuario(cuenta.id)
                    .then(() => onCambio(null))
                    .catch((e) => onError(e.message))
                    .finally(() => setOcupado(false));
                }}
              >
                Eliminar
              </button>
            )}
          </>
        ) : (
          <div className="nueva-clave">
            <input
              type="text"
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              aria-label="Clave nueva"
            />
            <button
              type="button"
              className="boton-chico principal"
              disabled={ocupado || claveNueva.length < largoMinimo}
              onClick={guardarClave}
            >
              Guardar
            </button>
            <button type="button" className="boton-chico" onClick={() => setClaveNueva(null)}>
              Cancelar
            </button>
          </div>
        )}
        {claveAsignada && (
          <div className="aviso-ok aviso-clave">
            Clave nueva: <code>{claveAsignada}</code>. Entrégasela a {cuenta.nombre}; no se volverá a mostrar.{" "}
            <button type="button" className="enlace" onClick={() => setClaveAsignada("")}>
              Ocultar
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Cuentas({ usuario, onVolver }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState(NUEVA_VACIA);
  const [creando, setCreando] = useState(false);
  const [creada, setCreada] = useState(null);

  function recargar() {
    return listarUsuarios()
      .then(setDatos)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    recargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    setCreando(true);
    try {
      const { usuario: cuenta } = await crearUsuario(nueva);
      setCreada({ ...cuenta, clave: nueva.clave });
      setNueva(NUEVA_VACIA);
      await recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function cambiar(id, cambios) {
    if (id) await actualizarUsuario(id, cambios);
    await recargar();
  }

  const largoMinimo = datos?.largoMinimoClave || 8;

  return (
    <section className="paso">
      <div className="cuentas-titulo">
        <h2>Cuentas de acceso</h2>
        <button type="button" onClick={onVolver}>
          Volver a los informes
        </button>
      </div>
      <p>
        Solo las personas con una cuenta activa pueden entrar a generar informes. Los <strong>técnicos</strong> generan
        informes; los <strong>administradores</strong> además administran estas cuentas.
      </p>

      {error && <div className="error">{error}</div>}

      <h3>Agregar cuenta</h3>
      <form className="formulario" onSubmit={crear}>
        <label className="campo">
          <span>Nombre</span>
          <input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} required />
        </label>
        <label className="campo">
          <span>Correo (con este entra)</span>
          <input
            type="email"
            value={nueva.correo}
            onChange={(e) => setNueva({ ...nueva, correo: e.target.value })}
            placeholder="nombre@fernandezfica.cl"
            required
          />
        </label>
        <label className="campo">
          <span>Perfil</span>
          <select value={nueva.perfil} onChange={(e) => setNueva({ ...nueva, perfil: e.target.value })}>
            {(datos?.perfiles || [{ id: "tecnico", etiqueta: "Técnico" }]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Clave inicial (mínimo {largoMinimo} caracteres)</span>
          <div className="campo-con-boton">
            <input
              type="text"
              value={nueva.clave}
              onChange={(e) => setNueva({ ...nueva, clave: e.target.value })}
              required
              minLength={largoMinimo}
            />
            <button type="button" className="boton-chico" onClick={() => setNueva({ ...nueva, clave: claveAleatoria() })}>
              Generar
            </button>
          </div>
        </label>
        <div className="acciones ancho acciones--derecha">
          <button
            type="submit"
            className="principal"
            disabled={creando || !nueva.nombre.trim() || !nueva.correo.trim() || nueva.clave.length < largoMinimo}
          >
            {creando ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
      </form>

      {creada && (
        <div className="aviso-ok">
          Cuenta creada para <strong>{creada.nombre}</strong>. Entrégale estos datos (la clave no se volverá a mostrar):
          correo <code>{creada.correo}</code>, clave <code>{creada.clave}</code>. Puede cambiarla después en «Cambiar mi
          clave».{" "}
          <button type="button" className="enlace" onClick={() => setCreada(null)}>
            Ocultar
          </button>
        </div>
      )}

      <h3>Cuentas ({datos?.usuarios.length ?? "…"})</h3>
      {datos && (
        <div className="tabla-cuentas-contenedor">
          <table className="tabla-cuentas">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Último ingreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.usuarios.map((cuenta) => (
                <FilaCuenta
                  key={cuenta.id}
                  cuenta={cuenta}
                  perfiles={datos.perfiles}
                  esYo={cuenta.id === usuario.id}
                  largoMinimo={largoMinimo}
                  onCambio={cambiar}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
