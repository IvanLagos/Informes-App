/**
 * Tipo de informe: mantenimiento preventivo de UPS para Cencosud. Mismas
 * reglas, textos y valores por defecto que Fricke, salvo:
 * - Portada: Atención fija "Cristopher Vargas" (editable).
 * - Sección "Información cliente": local, dirección y la persona que firmó la
 *   hoja en terreno, leídos de la hoja de trabajo.
 * - 3 fotos de checklist ("Registro de hoja check list de asistencia técnica").
 */
const path = require("path");
const fricke = require("./fricke");

const ID = "cencosud-mantencion";
const CLIENTE = "cencosud";
const NOMBRE_CORTO = "Mantenimiento preventivo UPS";
const NOMBRE = "Informe de mantenimiento preventivo UPS — Cencosud";
// La plantilla se edita directamente en Word (los textos {{...}} son los datos que llena la app).
const PLANTILLA = path.join(__dirname, "..", "..", "plantillas", "Cencosud_Mantencion Preventiva.docx");

const SECCION_CLIENTE = {
  titulo: "Información cliente",
  campos: [
    { clave: "LOCAL", etiqueta: "Local", obligatorio: true },
    { clave: "DIRECCION_CLIENTE", etiqueta: "Dirección", obligatorio: true },
    { clave: "ATENCION_CLIENTE", etiqueta: "Atención (quien firmó en terreno)", obligatorio: true },
  ],
};
// Va justo después de "Portada y encabezado", como en el informe.
const SECCIONES = [fricke.SECCIONES[0], SECCION_CLIENTE, ...fricke.SECCIONES.slice(1)];

// Las 3 páginas del checklist van una tras otra después de su título.
const ANCLA_CHECKLIST = "Registro de hoja check list de asistencia técnica";
const FOTOS = [
  ...fricke.FOTOS,
  // 14 x 19,5 cm: la 1ª cabe bajo el título y la 3ª sobre la firma, sin páginas en blanco.
  { clave: "checklist1", grupo: "checklist", etiqueta: "Check list — página 1", ancla: ANCLA_CHECKLIST, saltar: 0, anchoCm: 14, altoCm: 19.5 },
  { clave: "checklist2", grupo: "checklist", etiqueta: "Check list — página 2", ancla: ANCLA_CHECKLIST, saltar: 1, anchoCm: 14, altoCm: 19.5 },
  { clave: "checklist3", grupo: "checklist", etiqueta: "Check list — página 3", ancla: ANCLA_CHECKLIST, saltar: 2, anchoCm: 14, altoCm: 19.5 },
];

function valoresPorDefecto() {
  return {
    ...fricke.valoresPorDefecto(),
    ATENCION: "Cristopher Vargas",
    LOCAL: "",
    DIRECCION_CLIENTE: "",
    ATENCION_CLIENTE: "",
  };
}

const PROMPT = `${fricke.PROMPT}

Además, incluye en el MISMO JSON estas claves (mismas reglas: si no está
escrito o no se lee con certeza, cadena vacía):
  "LOCAL": "local o sucursal del cliente tal como está escrito (código y nombre, ej. 'E524 Easy Linares'); suele ir junto a EMPRESA, en DIRECC. o en el DETALLE",
  "RECEPTOR": "nombre de la persona que firmó como receptor: el NOMBRE escrito bajo 'Firma Receptor'; si está vacío, el campo AT. SR."`;

/** Igual que Fricke + los datos de "Información cliente". */
function interpretarLectura(leido) {
  const datos = { ...valoresPorDefecto(), ...fricke.interpretarLectura(leido), ATENCION: "Cristopher Vargas" };
  datos.LOCAL = String(leido.LOCAL || "").trim();
  datos.DIRECCION_CLIENTE = datos.UBICACION; // DIRECC. + ciudad, igual que la ubicación
  datos.ATENCION_CLIENTE = String(leido.RECEPTOR || "").trim();
  return datos;
}

function prepararDocumento(d) {
  const documento = fricke.prepararDocumento(d);
  Object.assign(documento.valores, {
    LOCAL: d.LOCAL,
    DIRECCION_CLIENTE: d.DIRECCION_CLIENTE,
    ATENCION_CLIENTE: d.ATENCION_CLIENTE,
  });
  return documento;
}

/** "INFSAT_Reporte de Mantenimiento Preventivo UPS_E524_Easy_Linares", como los informes Cencosud. */
function nombreArchivo(d) {
  const local = String(d.LOCAL || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_");
  return ["INFSAT_Reporte de Mantenimiento Preventivo UPS", local].filter(Boolean).join("_");
}

module.exports = {
  ...fricke,
  ID,
  CLIENTE,
  NOMBRE_CORTO,
  NOMBRE,
  PLANTILLA,
  SECCIONES,
  FOTOS,
  PROMPT,
  valoresPorDefecto,
  interpretarLectura,
  prepararDocumento,
  nombreArchivo,
};
