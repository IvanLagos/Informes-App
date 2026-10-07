const FORMATOS = [
  { valor: "docx", etiqueta: "Word (.docx)" },
  { valor: "pdf", etiqueta: "PDF (.pdf)" },
  { valor: "ambos", etiqueta: "Ambos (Word y PDF)" },
];

function VistaPrevia({ vistaPrevia, onReintentar }) {
  if (vistaPrevia.cargando) {
    return <div className="vista-previa vista-previa--estado">Generando la vista previa del informe… puede tardar unos segundos.</div>;
  }
  if (vistaPrevia.error) {
    return (
      <div className="vista-previa vista-previa--estado vista-previa--error">
        <p>No se pudo generar la vista previa: {vistaPrevia.error}</p>
        <p>Para descargar el informe primero hay que revisarlo.</p>
        <button type="button" onClick={onReintentar}>
          Reintentar vista previa
        </button>
      </div>
    );
  }
  if (!vistaPrevia.url) return null;
  return (
    <>
      {/* #view=FitH: ajusta la página al ancho; navpanes=0: sin panel de miniaturas. */}
      <iframe className="vista-previa" src={`${vistaPrevia.url}#view=FitH&navpanes=0`} title="Vista previa del informe" />
      <p className="vista-previa-ayuda">
        ¿No se ve bien?{" "}
        <a href={vistaPrevia.url} target="_blank" rel="noreferrer">
          Abrir la vista previa en otra pestaña
        </a>
        . Si algo está mal, usa «Volver» para corregirlo.
      </p>
    </>
  );
}

export default function PasoGenerar({
  cargando,
  vistaPrevia,
  nombreArchivo,
  onCambiarNombre,
  formato,
  onCambiarFormato,
  revisado,
  onCambiarRevisado,
  onReintentarVistaPrevia,
  onGenerar,
  onVolver,
}) {
  const vistaLista = Boolean(vistaPrevia.url);
  const puedeDescargar = vistaLista && revisado && !cargando;

  return (
    <section className="paso">
      <h2>Paso 5: Revisa y descarga el informe</h2>
      <VistaPrevia vistaPrevia={vistaPrevia} onReintentar={onReintentarVistaPrevia} />

      {/* La descarga exige haber visto la vista previa y confirmarlo. */}
      <label className={`revisado${vistaLista ? "" : " revisado--bloqueado"}`}>
        <input
          type="checkbox"
          checked={revisado}
          disabled={!vistaLista}
          onChange={(e) => onCambiarRevisado(e.target.checked)}
        />
        Revisé la vista previa y el informe está correcto.
      </label>

      <label className="campo ancho nombre-archivo">
        <span>Nombre del archivo (opcional)</span>
        <div className="nombre-archivo-campo">
          <input
            type="text"
            value={nombreArchivo}
            placeholder="Si lo dejas vacío se usa el nombre de siempre"
            onChange={(e) => onCambiarNombre(e.target.value)}
          />
        </div>
      </label>

      <div className="formatos">
        <span className="formatos-titulo">Formato de descarga</span>
        <div className="formatos-opciones">
          {FORMATOS.map((f) => (
            <label key={f.valor} className={`tipo-opcion${formato === f.valor ? " tipo-opcion--activa" : ""}`}>
              <input
                type="radio"
                name="formato"
                value={f.valor}
                checked={formato === f.valor}
                onChange={() => onCambiarFormato(f.valor)}
              />
              <span>
                <strong>{f.etiqueta}</strong>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="acciones">
        <button type="button" onClick={onVolver} disabled={cargando}>
          Volver
        </button>
        <button type="button" className="principal" onClick={onGenerar} disabled={!puedeDescargar}>
          {cargando ? "Descargando…" : "Descargar informe"}
        </button>
      </div>
      {!puedeDescargar && !cargando && (
        <p className="vista-previa-ayuda revisado-ayuda">
          {vistaLista
            ? "Marca la casilla de revisión para habilitar la descarga."
            : "La descarga se habilita cuando la vista previa esté lista y la hayas revisado."}
        </p>
      )}
    </section>
  );
}
