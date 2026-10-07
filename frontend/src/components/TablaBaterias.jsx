// Réplica editable de la tabla "Registro de baterías" del informe, con los
// mismos colores, para que el técnico vea lo que va a quedar en el Word.

const PERFIL = [
  { clave: "BAT_PERFIL", etiqueta: "Profile Number" },
  { clave: "BAT_UBICACION", etiqueta: "Location Information" },
  { clave: "MODELO_BATERIAS", etiqueta: "Device Information", ayuda: "Modelo de baterías" },
  { clave: "CANT_BATERIAS", etiqueta: "Battery Number", ayuda: "Cantidad", numerico: true },
  { clave: "ANIO_BATERIAS", etiqueta: "Data", ayuda: "Año", numerico: true },
];

const RESULTADOS = [
  { clase: "pass", juicio: "Pass", resistencia: "BAT_RES_PASS", total: "BAT_TOTAL_PASS", estado: "Normal" },
  {
    clase: "warning",
    juicio: "Warning (20%<30% Desviación)",
    resistencia: "BAT_RES_WARNING",
    total: "BAT_TOTAL_WARNING",
    estado: "Con Desviación",
  },
  {
    clase: "fail",
    juicio: "Fail (>30% Desviación)",
    resistencia: "BAT_RES_FAIL",
    total: "BAT_TOTAL_FAIL",
    estado: "Degradadas",
  },
];

function entero(valor) {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Total Pass automático: cantidad − Warning − Fail (vacío si no hay cantidad). */
function passAutomatico(datos) {
  const total = parseInt(datos.CANT_BATERIAS, 10);
  if (Number.isNaN(total)) return "";
  return String(Math.max(total - entero(datos.BAT_TOTAL_WARNING) - entero(datos.BAT_TOTAL_FAIL), 0));
}

export default function TablaBaterias({ datos, onCambiar }) {
  const passEditado = String(datos.BAT_TOTAL_PASS || "").trim() !== "";

  function campo(clave, { numerico = false, placeholder = "" } = {}) {
    return (
      <input
        type="text"
        inputMode={numerico ? "decimal" : "text"}
        value={datos[clave] ?? ""}
        placeholder={placeholder}
        onChange={(e) => onCambiar(clave, e.target.value)}
      />
    );
  }

  return (
    <div className="tabla-baterias">
      <table className="tb-perfil">
        <thead>
          <tr>
            <th>Profile Information</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {PERFIL.map((f) => (
            <tr key={f.clave}>
              <td className="tb-etiqueta">{f.etiqueta}</td>
              <td>{campo(f.clave, { numerico: f.numerico, placeholder: f.ayuda })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="tb-resultados">
        <thead>
          <tr>
            <th>Judgement</th>
            <th>Measurement</th>
            <th>Resistance</th>
            <th>Total</th>
            <th>Battery status</th>
          </tr>
        </thead>
        <tbody>
          {RESULTADOS.map((r) => (
            <tr key={r.clase}>
              <td className={`tb-juicio tb-${r.clase}`}>{r.juicio}</td>
              <td>Resistance</td>
              <td>
                <span className="tb-medida">
                  {campo(r.resistencia, { numerico: true })}
                  <span>m Ω</span>
                </span>
              </td>
              <td>
                {r.total === "BAT_TOTAL_PASS" ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={passEditado ? datos.BAT_TOTAL_PASS : passAutomatico(datos)}
                    title="Se calcula solo (cantidad − Warning − Fail) hasta que lo cambies"
                    onChange={(e) => onCambiar("BAT_TOTAL_PASS", e.target.value)}
                  />
                ) : (
                  campo(r.total, { numerico: true })
                )}
              </td>
              <td className="tb-estado">{r.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tb-ayuda">
        Todos los valores son editables. El total «Pass» se calcula solo (cantidad − Warning − Fail) mientras no lo
        cambies.
      </p>
    </div>
  );
}
