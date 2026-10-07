/**
 * Tipo de informe: mantenimiento preventivo de UPS para Hospital Gustavo
 * Fricke. Basado en "INFSAT_UPS Hospital Gustavo Fricke P4-A1 V1.docx".
 */
const path = require("path");

const ID = "fricke-mantencion";
const CLIENTE = "fricke";
const NOMBRE_CORTO = "Mantenimiento preventivo UPS";
const NOMBRE = "Informe de mantenimiento preventivo UPS — Hospital Gustavo Fricke";
// La plantilla se edita directamente en Word (los textos {{...}} son los datos que llena la app).
const PLANTILLA = path.join(__dirname, "..", "..", "plantillas", "Hospital_Gustavo_Fricke_Mantencion Preventiva.docx");

const SI_NO = ["Si", "No"];

// Secciones y campos que se muestran en el formulario (mismo orden del informe).
const SECCIONES = [
  {
    // Empresa, Atención, Asunto y Fecha del servicio van en la portada (el
    // N° de informe es fijo: 4SAT010). La fecha del informe va en el encabezado.
    titulo: "Portada y encabezado",
    campos: [
      { clave: "EMPRESA", etiqueta: "Empresa", obligatorio: true },
      { clave: "ATENCION", etiqueta: "Atención", obligatorio: true },
      { clave: "ASUNTO", etiqueta: "Asunto", obligatorio: true },
      { clave: "FECHA_ASUNTO", etiqueta: "Fecha del servicio — portada (DD-MM-AAAA)", obligatorio: true },
      { clave: "FECHA_INFORME", etiqueta: "Fecha del informe — encabezado (DD/MM/AAAA)", obligatorio: true },
    ],
  },
  {
    titulo: "Antecedentes del equipo",
    campos: [
      { clave: "MODELO_UPS", etiqueta: "Modelo UPS" },
      { clave: "NUM_SERIE", etiqueta: "Número de serie" },
      { clave: "CONFIGURACION", etiqueta: "Configuración" },
      { clave: "NUM_MODULO", etiqueta: "Número del módulo" },
      { clave: "POTENCIA", etiqueta: "Potencia del módulo" },
      { clave: "CANT_BATERIAS", etiqueta: "Cantidad de baterías" },
      { clave: "MODELO_BATERIAS", etiqueta: "Modelo de baterías" },
      { clave: "DATA_UPS", etiqueta: "Data de la UPS" },
      { clave: "ANIO_BATERIAS", etiqueta: "Data de las baterías" },
      { clave: "UBICACION", etiqueta: "Ubicación" },
    ],
  },
  {
    // Se muestra como la misma tabla de colores del informe (ver
    // TablaBaterias en el navegador). Modelo, cantidad y año de las baterías
    // son los mismos campos de "Antecedentes del equipo".
    titulo: "Registro de baterías",
    componente: "tablaBaterias",
    campos: [],
  },
  {
    titulo: "Evaluación técnica",
    campos: [
      { clave: "ESTADO_UPS", etiqueta: "Estado de la UPS", tipo: "largo" },
      { clave: "ESTADO_BATERIAS", etiqueta: "Estado de las baterías", tipo: "largo" },
      { clave: "BYPASS", etiqueta: "El tablero posee bypass de mantenimiento", tipo: "opciones", opciones: SI_NO },
      { clave: "SNMP", etiqueta: "UPS tiene tarjeta SNMP", tipo: "opciones", opciones: SI_NO },
      { clave: "OBSERVACIONES", etiqueta: "Observaciones generales (un párrafo por línea)", tipo: "largo" },
      { clave: "RECOMENDACIONES", etiqueta: "Recomendaciones (un párrafo por línea)", tipo: "largo" },
    ],
  },
];

// Años de uso con los que se recomienda cambiar cada modelo de batería: un
// año menos que los años en que queda degradada. Al cumplirlos se agrega la
// recomendación de cambio (en el navegador, para que se vea y se pueda
// editar en el formulario).
const VIDA_UTIL_BATERIAS = {
  HRL1234: 6,
  "12V 9Ah": 6,
  GP1272: 3,
  "HR12,27W": 3,
  HRL12110: 8,
  HRL12120: 8,
  HRL12150: 8,
  HRL12200: 8,
  HRL12280: 8,
  SWL1100: 8,
};
const TEXTO_CAMBIO_BATERIAS = "Se recomienda el cambio de baterías por cumplimiento de vida útil.";

// Títulos que se pueden elegir para las fotos del trabajo (mismo sistema que informes-claude).
const TITULOS_FOTO = [
  "Placa informativa",
  "Registro de UPS en sala de computación",
  "Registro de UPS Operativa y sin alarmas",
  "Registro post Mantenimiento Preventivo",
  "Registro de tablero By-Pass",
  "Registro de baterías",
  "Registro de tablero eléctrico",
  "Otro (escribir)",
];

// Fotos del registro fotográfico, con el tamaño (cm) que tienen en el informe.
// Las 4 del trabajo van en una tabla 2x2 con un título elegible cada una.
const FOTOS = [
  // `ancla` = texto de la plantilla tras el cual va la foto (ver ubicarFotos en lib/docx.js).
  // `grupo` = bloque del paso Fotos donde se pide (trabajo / hoja / checklist).
  { clave: "foto1", grupo: "trabajo", etiqueta: "Foto de trabajo N°1", tituloPorDefecto: "Placa informativa", ancla: "{{FOTO1_TITULO}}", anchoCm: 7, altoCm: 7 },
  { clave: "foto2", grupo: "trabajo", etiqueta: "Foto de trabajo N°2", tituloPorDefecto: "Registro de UPS en sala de computación", ancla: "{{FOTO2_TITULO}}", anchoCm: 7, altoCm: 7 },
  { clave: "foto3", grupo: "trabajo", etiqueta: "Foto de trabajo N°3", tituloPorDefecto: "Registro de UPS Operativa y sin alarmas", ancla: "{{FOTO3_TITULO}}", anchoCm: 7, altoCm: 7 },
  { clave: "foto4", grupo: "trabajo", etiqueta: "Foto de trabajo N°4", tituloPorDefecto: "Registro post Mantenimiento Preventivo", ancla: "{{FOTO4_TITULO}}", anchoCm: 7, altoCm: 7 },
  { clave: "hoja", grupo: "hoja", etiqueta: "Hoja de trabajo de asistencia técnica", ancla: "Registro de hoja de trabajo", anchoCm: 14, altoCm: 17.02 },
];

// Foto que se reutiliza como "hoja de trabajo" a partir de la que se sube para la lectura con IA.
const FOTO_HOJA = "hoja";

function hoyDDMMAAAA() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Valores por defecto acordados para este informe.
function valoresPorDefecto() {
  return {
    EMPRESA: "",
    ATENCION: "Eduardo Leiva",
    ASUNTO: "Servicio Mantención Preventiva",
    FECHA_ASUNTO: "",
    FECHA_INFORME: hoyDDMMAAAA(),
    MODELO_UPS: "",
    NUM_SERIE: "",
    CONFIGURACION: "",
    NUM_MODULO: "1",
    POTENCIA: "",
    CANT_BATERIAS: "",
    MODELO_BATERIAS: "",
    DATA_UPS: "",
    ANIO_BATERIAS: "",
    UBICACION: "",
    // Medidas estándar del registro de baterías (todas editables). El total
    // Pass vacío significa "cantidad de baterías − Warning − Fail".
    BAT_PERFIL: "Sistema UPS",
    BAT_UBICACION: "Administración",
    BAT_RES_PASS: "17.0",
    BAT_RES_WARNING: "22.8",
    BAT_RES_FAIL: "24.7",
    BAT_TOTAL_PASS: "",
    BAT_TOTAL_WARNING: "0",
    BAT_TOTAL_FAIL: "0",
    ESTADO_UPS: "UPS se encuentra operativa cumpliendo características técnicas de operación.",
    ESTADO_BATERIAS:
      "Se realiza medición de estas y todos los valores obtenidos se encuentran dentro del rango normal de operación.",
    BYPASS: "Si",
    SNMP: "Si",
    OBSERVACIONES: [
      "De acuerdo con servicio de Mantenimiento Preventivo realizado, UPS se encuentra operativa cumpliendo características técnicas de Placa.",
      "Baterías se encuentran dentro de su vida útil, sin problemas para operar frente a cortes de energía de la red comercial.",
      "Posterior a realizar servicio de mantenimiento, se realiza prueba de autonomía para validar el estado de las baterías y la operación de la UPS, con resultado correcto.",
    ].join("\n"),
    RECOMENDACIONES:
      "Mantener limpieza y orden en sala de UPS, con el objetivo de garantizar así el correcto funcionamiento del equipo.",
  };
}

const PROMPT = `Esta imagen es un "Pedido de Trabajo Terreno" de la empresa Fernández Fica
para un servicio de UPS. Léela con atención y entrégame ÚNICAMENTE un JSON (sin
texto adicional, sin backticks) con estas claves exactas:

{
  "EMPRESA": "campo EMPRESA, tal como está escrito",
  "FECHA_ASUNTO": "campo FECHA PEDIDO en formato DD-MM-AAAA (si el año viene con 2 dígitos, antepone 20)",
  "MODELO_UPS": "campo MODELO de la sección 3",
  "NUM_SERIE": "campo C. PLACA",
  "POTENCIA": "campo POT, ej. '20 kVA'",
  "CANT_BATERIAS": "cantidad de baterías escrita en el DETALLE (solo el número, ej. '72')",
  "MODELO_BATERIAS": "modelo de las baterías escrito en el DETALLE (ej. 'HRL1234')",
  "ANIO_BATERIAS": "año escrito junto a 'Data Batería' en el DETALLE",
  "DATA_UPS": "año o antigüedad de la UPS SOLO si está escrito explícitamente (ej. 'Data UPS 2019'); si no aparece, cadena vacía",
  "DIRECCION": "campo DIRECC.",
  "CIUDAD": "campo CIUDAD",
  "V_ENTRADA": ["cada valor escrito en las casillas de V. ENTRADA, en orden; omite las casillas vacías"],
  "V_SALIDA": ["cada valor escrito en las casillas de V. SALIDA, en orden; omite las casillas vacías"]
}

No deduzcas datos: si un dato no está escrito o no se puede leer con certeza,
deja cadena vacía "" (o lista vacía para los voltajes). No inventes marca ni
capacidad de baterías.`;

function normalizarPotencia(valor) {
  return String(valor || "")
    .trim()
    .replace(/^(\d+(?:[.,]\d+)?)\s*kva$/i, "$1 kVA");
}

/** "5/10/26", "05.10.2026", "05-10-26"… -> "05-10-2026" (vacío si no es una fecha válida). */
function normalizarFecha(valor) {
  const m = /^\s*(\d{1,2})\s*[-/.·]\s*(\d{1,2})\s*[-/.·]\s*(\d{2}|\d{4})\s*$/.exec(String(valor || ""));
  if (!m) return "";
  const dia = parseInt(m[1], 10);
  const mes = parseInt(m[2], 10);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return "";
  const anio = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${String(dia).padStart(2, "0")}-${String(mes).padStart(2, "0")}-${anio}`;
}

function contarVoltajes(lista) {
  return (Array.isArray(lista) ? lista : []).filter((v) => String(v).trim() !== "").length;
}

/** Convierte lo leído por la IA en valores del formulario (aplica las reglas acordadas). */
function interpretarLectura(leido) {
  const datos = valoresPorDefecto();
  datos.FECHA_ASUNTO = normalizarFecha(leido.FECHA_ASUNTO);
  for (const clave of ["EMPRESA", "MODELO_UPS", "NUM_SERIE", "CANT_BATERIAS", "MODELO_BATERIAS", "ANIO_BATERIAS", "DATA_UPS"]) {
    if (leido[clave]) datos[clave] = String(leido[clave]).trim();
  }
  datos.POTENCIA = normalizarPotencia(leido.POTENCIA);

  // Configuración: N° de voltajes de entrada - N° de voltajes de salida.
  const entrada = contarVoltajes(leido.V_ENTRADA);
  const salida = contarVoltajes(leido.V_SALIDA);
  if (entrada && salida) datos.CONFIGURACION = `${entrada}-${salida}`;

  // Ubicación: dirección de la hoja + ciudad.
  datos.UBICACION = [leido.DIRECCION, leido.CIUDAD]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(", ");

  return datos;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "05-10-2026" -> "5 octubre de 2026" (formato del informe original). */
function fechaEnTexto(fecha) {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(fecha || "").trim());
  if (!m) return String(fecha || "");
  const mes = MESES[parseInt(m[2], 10) - 1];
  return mes ? `${parseInt(m[1], 10)} ${mes} de ${m[3]}` : String(fecha);
}

function infoBaterias(d) {
  const partes = [];
  if (d.MODELO_BATERIAS) partes.push(`Modelo ${d.MODELO_BATERIAS}`);
  if (d.CANT_BATERIAS) partes.push(`Cantidad ${d.CANT_BATERIAS} piezas`);
  if (d.ANIO_BATERIAS) partes.push(`Data ${d.ANIO_BATERIAS}`);
  return `Información de Baterías / ${partes.join(", ")}`;
}

/** Baterías en estado normal: lo que escribió el técnico o, si lo dejó vacío, total − con desviación − degradadas. */
function totalPass(d) {
  if (String(d.BAT_TOTAL_PASS || "").trim()) return String(d.BAT_TOTAL_PASS).trim();
  const total = parseInt(d.CANT_BATERIAS, 10);
  if (Number.isNaN(total)) return "";
  const warning = parseInt(d.BAT_TOTAL_WARNING, 10) || 0;
  const fail = parseInt(d.BAT_TOTAL_FAIL, 10) || 0;
  return String(Math.max(total - warning - fail, 0));
}

/** Prepara lo que se reemplaza en la plantilla a partir de los datos del formulario. */
function prepararDocumento(d) {
  return {
    valores: {
      EMPRESA: d.EMPRESA,
      ATENCION: d.ATENCION,
      ASUNTO: d.ASUNTO,
      FECHA_ASUNTO_TEXTO: fechaEnTexto(d.FECHA_ASUNTO),
      FECHA_PORTADA: (normalizarFecha(d.FECHA_ASUNTO) || String(d.FECHA_ASUNTO || "").trim()).replace(/-/g, "/"),
      FECHA_INFORME: d.FECHA_INFORME,
      MODELO_UPS: d.MODELO_UPS,
      NUM_SERIE: d.NUM_SERIE,
      CONFIGURACION: d.CONFIGURACION,
      NUM_MODULO: d.NUM_MODULO,
      POTENCIA: d.POTENCIA,
      CANT_BATERIAS: d.CANT_BATERIAS,
      MODELO_BATERIAS: d.MODELO_BATERIAS,
      DATA_UPS: d.DATA_UPS,
      ANIO_BATERIAS: d.ANIO_BATERIAS,
      UBICACION: d.UBICACION,
      ESTADO_UPS: d.ESTADO_UPS,
      ESTADO_BATERIAS: d.ESTADO_BATERIAS,
      INFO_BATERIAS: infoBaterias(d),
      BYPASS: d.BYPASS,
      SNMP: d.SNMP,
      BAT_PERFIL: d.BAT_PERFIL,
      BAT_UBICACION: d.BAT_UBICACION,
      BAT_RES_PASS: d.BAT_RES_PASS,
      BAT_RES_WARNING: d.BAT_RES_WARNING,
      BAT_RES_FAIL: d.BAT_RES_FAIL,
      BAT_TOTAL_WARNING: d.BAT_TOTAL_WARNING || "0",
      BAT_TOTAL_FAIL: d.BAT_TOTAL_FAIL || "0",
      BAT_TOTAL_PASS: totalPass(d),
      ...Object.fromEntries(
        FOTOS.filter((f) => f.tituloPorDefecto).map((f, i) => [
          `FOTO${i + 1}_TITULO`,
          d[`titulo_${f.clave}`] || f.tituloPorDefecto,
        ])
      ),
    },
    parrafos: {
      OBSERVACIONES: d.OBSERVACIONES,
      RECOMENDACIONES: d.RECOMENDACIONES,
    },
  };
}

function nombreArchivo() {
  return "INFSAT_UPS Hospital Gustavo Fricke V1";
}

module.exports = {
  ID,
  CLIENTE,
  NOMBRE_CORTO,
  NOMBRE,
  PLANTILLA,
  SECCIONES,
  FOTOS,
  FOTO_HOJA,
  TITULOS_FOTO,
  VIDA_UTIL_BATERIAS,
  TEXTO_CAMBIO_BATERIAS,
  PROMPT,
  valoresPorDefecto,
  interpretarLectura,
  prepararDocumento,
  nombreArchivo,
};
