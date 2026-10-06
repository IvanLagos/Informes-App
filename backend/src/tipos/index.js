// Tipos de informe disponibles. Para agregar uno nuevo, crea su archivo en
// esta carpeta (con la misma forma que fricke.js) y súmalo a esta lista.
const TIPOS = [require("./fricke")];

function obtenerTipo(id) {
  return TIPOS.find((t) => t.ID === id);
}

/** Lo que el navegador necesita saber de cada tipo para armar el asistente. */
function describirTipo(t) {
  return {
    id: t.ID,
    nombre: t.NOMBRE,
    secciones: t.SECCIONES,
    fotos: t.FOTOS.map(({ clave, etiqueta, tituloPorDefecto, anchoCm, altoCm }) => ({
      clave,
      etiqueta,
      tituloPorDefecto,
      anchoCm,
      altoCm,
    })),
    fotoHoja: t.FOTO_HOJA,
    titulosFoto: t.TITULOS_FOTO || [],
    reglaBaterias: t.VIDA_UTIL_BATERIAS ? { vidaUtil: t.VIDA_UTIL_BATERIAS, texto: t.TEXTO_CAMBIO_BATERIAS } : null,
    valoresPorDefecto: t.valoresPorDefecto(),
  };
}

module.exports = { TIPOS, obtenerTipo, describirTipo };
