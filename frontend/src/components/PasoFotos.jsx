import RecortarFoto from "./RecortarFoto";

export const OTRO = "Otro (escribir)";

// Bloques de fotos sin título elegible, en el orden en que se piden.
const GRUPOS = [
  { grupo: "hoja", titulo: () => "Hoja de trabajo" },
  { grupo: "checklist", titulo: (n) => `Check list de asistencia técnica (${n} páginas)` },
];

export function tituloFinal(titulo) {
  if (!titulo) return "";
  return titulo.seleccion === OTRO ? titulo.libre.trim() : titulo.seleccion;
}

export default function PasoFotos({ fotosTipo, fotoHoja, titulosFoto, fotos, titulos, onFoto, onTitulo, onSiguiente, onVolver }) {
  const fotosTrabajo = fotosTipo.filter((f) => f.tituloPorDefecto);
  const otrasFotos = fotosTipo.filter((f) => !f.tituloPorDefecto);
  const listo =
    fotosTipo.every((f) => fotos[f.clave]) && fotosTrabajo.every((f) => tituloFinal(titulos[f.clave]));

  return (
    <section className="paso">
      <h2>Paso 4: Fotos</h2>

      <h3>Registro fotográfico del trabajo realizado ({fotosTrabajo.length} fotos)</h3>
      <div className="grid-fotos">
        {fotosTrabajo.map((f) => {
          const titulo = titulos[f.clave] || { seleccion: "", libre: "" };
          return (
            <div key={f.clave} className="foto-trabajo">
              <RecortarFoto
                label={f.etiqueta}
                aspecto={f.anchoCm / f.altoCm}
                onListo={(blob) => onFoto(f.clave, blob)}
                inicialListo={Boolean(fotos[f.clave])}
              />
              <select
                value={titulo.seleccion}
                onChange={(e) => onTitulo(f.clave, { seleccion: e.target.value, libre: "" })}
              >
                <option value="">Elige un título…</option>
                {titulosFoto.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              {titulo.seleccion === OTRO && (
                <input
                  type="text"
                  placeholder="Escribe el título"
                  value={titulo.libre}
                  onChange={(e) => onTitulo(f.clave, { ...titulo, libre: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>

      {GRUPOS.map(({ grupo, titulo }) => {
        const delGrupo = otrasFotos.filter((f) => (f.grupo || "hoja") === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <div key={grupo}>
            <h3>{titulo(delGrupo.length)}</h3>
            <div className="grid-fotos">
              {delGrupo.map((f) => (
                <RecortarFoto
                  key={f.clave}
                  label={f.etiqueta}
                  aspecto={f.anchoCm / f.altoCm}
                  onListo={(blob) => onFoto(f.clave, blob)}
                  inicialListo={Boolean(fotos[f.clave])}
                  notaListo={f.clave === fotoHoja ? "(la del paso 2)" : ""}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="acciones">
        <button type="button" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="principal" disabled={!listo} onClick={onSiguiente}>
          Siguiente
        </button>
      </div>
    </section>
  );
}
