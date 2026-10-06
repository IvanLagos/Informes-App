export default function PasoTipo({ tipos, tipoId, onElegir, onSiguiente }) {
  return (
    <section className="paso">
      <h2>Paso 1: ¿Qué tipo de informe estamos haciendo?</h2>
      <p>Elige el tipo de informe. Los campos y las fotos que se piden dependen de esta elección.</p>

      <div className="tipos">
        {tipos.map((t) => (
          <label key={t.id} className={`tipo-opcion${t.id === tipoId ? " tipo-opcion--activa" : ""}`}>
            <input type="radio" name="tipo" value={t.id} checked={t.id === tipoId} onChange={() => onElegir(t.id)} />
            <span>
              <strong>{t.nombre}</strong>
              <small>{t.fotos.length} fotos · {t.secciones.reduce((n, s) => n + s.campos.length, 0)} campos</small>
            </span>
          </label>
        ))}
        {tipos.length === 0 && <p className="cargando">Cargando tipos de informe…</p>}
      </div>

      <div className="acciones">
        <button type="button" className="principal" disabled={!tipoId} onClick={onSiguiente}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
