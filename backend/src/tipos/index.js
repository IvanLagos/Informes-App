// Clientes y tipos de informe disponibles. El técnico elige primero el
// cliente y luego uno de sus tipos de informe.
//
// Para agregar un tipo de informe nuevo: crea su archivo en esta carpeta (con
// la misma forma que fricke.js, con CLIENTE = id de uno de los CLIENTES de
// abajo) y súmalo a TIPOS. Un cliente sin tipos aparece como "Próximamente".
const CLIENTES = [
  { id: "cencosud", nombre: "Cencosud" },
  { id: "fricke", nombre: "Hospital Gustavo Fricke" },
];

const TIPOS = [require("./cencosud"), require("./fricke")];

function obtenerTipo(id) {
  return TIPOS.find((t) => t.ID === id);
}

/** Lo que el navegador necesita saber de cada tipo para armar el asistente. */
function describirTipo(t) {
  return {
    id: t.ID,
    cliente: t.CLIENTE,
    nombreCorto: t.NOMBRE_CORTO,
    nombre: t.NOMBRE,
    secciones: t.SECCIONES,
    fotos: t.FOTOS.map(({ clave, grupo, etiqueta, tituloPorDefecto, anchoCm, altoCm }) => ({
      clave,
      grupo,
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

module.exports = { CLIENTES, TIPOS, obtenerTipo, describirTipo };
