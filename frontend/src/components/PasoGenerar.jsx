export default function PasoGenerar({ tipo, datos, cargando, nombreArchivo, onCambiarNombre, onGenerar, onVolver }) {
  return (
    <section className="paso">
      <h2>Paso 5: Generar informe</h2>
      <div className="resumen">
        <p>
          <strong>Tipo:</strong> {tipo.nombre}
        </p>
        <p>
          <strong>Empresa:</strong> {datos.EMPRESA}
        </p>
        <p>
          <strong>Ubicación:</strong> {datos.UBICACION}
        </p>
        <p>
          <strong>Modelo UPS:</strong> {datos.MODELO_UPS} · {datos.POTENCIA}
        </p>
        <p>
          <strong>Fecha del servicio:</strong> {datos.FECHA_ASUNTO}
        </p>
      </div>

      <label className="campo ancho nombre-archivo">
        <span>Nombre del archivo (opcional)</span>
        <div className="nombre-archivo-campo">
          <input
            type="text"
            value={nombreArchivo}
            placeholder="Si lo dejas vacío se usa el nombre de siempre"
            onChange={(e) => onCambiarNombre(e.target.value)}
          />
          <span className="nombre-archivo-ext">.docx</span>
        </div>
      </label>

      <p>Se generará el archivo Word (.docx) con los datos y las fotos cargadas.</p>
      <div className="acciones">
        <button type="button" onClick={onVolver} disabled={cargando}>
          Volver
        </button>
        <button type="button" className="principal" onClick={onGenerar} disabled={cargando}>
          {cargando ? "Generando…" : "Generar y descargar informe"}
        </button>
      </div>
    </section>
  );
}
