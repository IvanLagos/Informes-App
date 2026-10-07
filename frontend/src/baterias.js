// Recomendación automática de cambio de baterías según su vida útil.

function normalizar(modelo) {
  return String(modelo || "")
    .toUpperCase()
    .replace(/[\s.,\-_/]/g, "");
}

/** Años de vida útil del modelo (o null si no está en la tabla). Acepta sufijos, ej. "HRL1234W". */
export function vidaUtilDe(modelo, tabla) {
  const buscado = normalizar(modelo);
  if (!buscado) return null;
  let mejor = null;
  for (const [clave, anios] of Object.entries(tabla)) {
    const c = normalizar(clave);
    if (buscado === c) return { modelo: clave, anios };
    if (buscado.startsWith(c) && (!mejor || c.length > normalizar(mejor.modelo).length)) {
      mejor = { modelo: clave, anios };
    }
  }
  return mejor;
}

/** Antigüedad = año del servicio (FECHA_ASUNTO DD/MM/AAAA, o el actual) − año de las baterías. */
export function antiguedadBaterias(anioBaterias, fechaServicio) {
  const anioBat = parseInt(String(anioBaterias || "").trim(), 10);
  if (Number.isNaN(anioBat)) return null;
  const m = /(\d{4})\s*$/.exec(String(fechaServicio || ""));
  const anioServicio = m ? parseInt(m[1], 10) : new Date().getFullYear();
  return anioServicio - anioBat;
}

/** Estado de las baterías para el formulario: { vida, antiguedad, degradada }. */
export function estadoBaterias(datos, regla) {
  if (!regla) return null;
  const vida = vidaUtilDe(datos.MODELO_BATERIAS, regla.vidaUtil);
  const antiguedad = antiguedadBaterias(datos.ANIO_BATERIAS, datos.FECHA_ASUNTO);
  return { vida, antiguedad, degradada: Boolean(vida && antiguedad !== null && antiguedad >= vida.anios) };
}

/** Agrega o quita la recomendación de cambio en el texto de recomendaciones. */
export function sincronizarRecomendacion(recomendaciones, texto, degradada) {
  const lineas = String(recomendaciones || "")
    .split("\n")
    .filter((l) => l.trim() !== "" && l.trim() !== texto);
  if (degradada) lineas.push(texto);
  return lineas.join("\n");
}
