export default function PasoFormulario({ secciones, datos, onCambiar, onSiguiente, onVolver }) {
  return (
    <section className="paso">
      <h2>Paso 3: Revisa y corrige los datos</h2>
      <p>
        Los datos de la hoja fueron leídos con IA y el resto viene con los valores por defecto del informe. Lo que no
        aparece en la hoja queda en blanco: complétalo o déjalo así.
      </p>

      {secciones.map((seccion) => (
        <div key={seccion.titulo}>
          <h3>{seccion.titulo}</h3>
          <div className="formulario">
            {seccion.campos.map((campo) => (
              <label key={campo.clave} className={`campo ${campo.tipo === "largo" ? "ancho" : ""}`}>
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
                {!campo.tipo && (
                  <input type="text" value={datos[campo.clave] || ""} onChange={(e) => onCambiar(campo.clave, e.target.value)} />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="acciones">
        <button type="button" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="principal" onClick={onSiguiente}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
