// Paso 1: primero el cliente y luego el tipo de informe de ese cliente.
export default function PasoTipo({ clientes, tipos, clienteId, tipoId, onElegirCliente, onElegirTipo, onSiguiente }) {
  const tiposDelCliente = tipos.filter((t) => t.cliente === clienteId);

  return (
    <section className="paso">
      <h2>Paso 1: Cliente y tipo de informe</h2>

      <h3>¿Para qué cliente es el informe?</h3>
      <div className="clientes">
        {clientes.map((c) => {
          const cantidad = tipos.filter((t) => t.cliente === c.id).length;
          return (
            <label key={c.id} className={`tipo-opcion${c.id === clienteId ? " tipo-opcion--activa" : ""}`}>
              <input type="radio" name="cliente" value={c.id} checked={c.id === clienteId} onChange={() => onElegirCliente(c.id)} />
              <span>
                <strong>{c.nombre}</strong>
                <small>{cantidad ? `${cantidad} tipo${cantidad > 1 ? "s" : ""} de informe` : "Próximamente"}</small>
              </span>
            </label>
          );
        })}
        {clientes.length === 0 && <p className="cargando">Cargando clientes…</p>}
      </div>

      {clienteId && (
        <>
          <h3>¿Qué tipo de informe?</h3>
          <div className="tipos">
            {tiposDelCliente.map((t) => (
              <label key={t.id} className={`tipo-opcion${t.id === tipoId ? " tipo-opcion--activa" : ""}`}>
                <input type="radio" name="tipo" value={t.id} checked={t.id === tipoId} onChange={() => onElegirTipo(t.id)} />
                <span>
                  <strong>{t.nombreCorto || t.nombre}</strong>
                  <small>
                    {t.fotos.length} fotos · {t.secciones.reduce((n, s) => n + s.campos.length, 0)} campos
                  </small>
                </span>
              </label>
            ))}
            {tiposDelCliente.length === 0 && (
              <p className="sin-tipos">Todavía no hay informes disponibles para este cliente. Próximamente.</p>
            )}
          </div>
        </>
      )}

      <div className="acciones">
        <button type="button" className="principal" disabled={!tipoId} onClick={onSiguiente}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
