import TablaBaterias, { faltantesTablaBaterias } from "./TablaBaterias";

/**
 * Fecha mientras se escribe: solo números y las "/" se agregan solas
 * ("05102026" -> "05/10/2026"). La barra aparece al escribir el número que
 * sigue, así borrar con la tecla de retroceso no se traba en ella.
 */
function formatearFecha(valor) {
  const d = String(valor).replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function NotaBaterias({ estado, modelo }) {
  if (!estado || !modelo || estado.antiguedad === null) return null;
  if (!estado.vida) {
    return (
      <div className="nota-baterias">
        El modelo de baterías «{modelo}» no está en la tabla de vida útil: no se agrega recomendación de cambio.
      </div>
    );
  }
  const { vida, antiguedad, degradada } = estado;
  return (
    <div className={`nota-baterias ${degradada ? "nota-baterias--activa" : ""}`}>
      {degradada
        ? `✓ Baterías ${vida.modelo} con ${antiguedad} años (vida útil ${vida.anios} años): se agregó la recomendación de cambio en Recomendaciones.`
        : `Baterías ${vida.modelo} con ${antiguedad} años (vida útil ${vida.anios} años): todavía no requieren cambio.`}
    </div>
  );
}

const vacio = (valor) => !String(valor ?? "").trim();

export default function PasoFormulario({ secciones, estadoBaterias, datos, onCambiar, onSiguiente, onVolver }) {
  // Todos los campos son obligatorios: lo vacío queda en rojo y no se puede avanzar.
  const campos = secciones.flatMap((s) => s.campos);
  const clavesFormulario = new Set(campos.map((c) => c.clave));
  const faltantes = [
    ...campos.filter((c) => vacio(datos[c.clave])).map((c) => c.etiqueta),
    ...(secciones.some((s) => s.componente === "tablaBaterias")
      ? faltantesTablaBaterias(datos).filter((f) => !clavesFormulario.has(f.clave)).map((f) => f.etiqueta)
      : []),
  ];

  return (
    <section className="paso">
      <h2>Paso 3: Revisa y corrige los datos</h2>
      <p>
        Los datos de la hoja fueron leídos con IA y el resto viene con los valores por defecto del informe.{" "}
        <strong>Todos los campos son obligatorios:</strong> lo que quede en blanco se marca en rojo y hay que
        completarlo para seguir.
      </p>

      {secciones.map((seccion) => (
        <div key={seccion.titulo}>
          <h3>{seccion.titulo}</h3>
          {seccion.componente === "tablaBaterias" && <TablaBaterias datos={datos} onCambiar={onCambiar} />}
          <div className="formulario">
            {seccion.campos.map((campo) => (
              <label
                key={campo.clave}
                className={`campo ${campo.tipo === "largo" ? "ancho" : ""} ${vacio(datos[campo.clave]) ? "campo--falta" : ""}`}
              >
                <span>{campo.etiqueta}</span>
                {campo.tipo === "largo" && (
                  <textarea value={datos[campo.clave] || ""} onChange={(e) => onCambiar(campo.clave, e.target.value)} rows={3} />
                )}
                {campo.tipo === "opciones" && (
                  <select value={datos[campo.clave] || ""} onChange={(e) => onCambiar(campo.clave, e.target.value)}>
                    {campo.opciones.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                )}
                {campo.tipo === "fecha" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    value={datos[campo.clave] || ""}
                    onChange={(e) => onCambiar(campo.clave, formatearFecha(e.target.value))}
                  />
                )}
                {!campo.tipo && (
                  <input type="text" value={datos[campo.clave] || ""} onChange={(e) => onCambiar(campo.clave, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          {seccion.titulo === "Antecedentes del equipo" && (
            <NotaBaterias estado={estadoBaterias} modelo={datos.MODELO_BATERIAS} />
          )}
        </div>
      ))}

      {faltantes.length > 0 && (
        <div className="error">
          {faltantes.length === 1 ? "Falta 1 campo" : `Faltan ${faltantes.length} campos`} por completar (marcados en
          rojo):{" "}
          {faltantes.join(", ")}.
        </div>
      )}

      <div className="acciones">
        <button type="button" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="principal" onClick={onSiguiente} disabled={faltantes.length > 0}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
