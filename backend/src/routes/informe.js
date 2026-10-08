const express = require("express");
const multer = require("multer");

const { CLIENTES, TIPOS, obtenerTipo, describirTipo } = require("../tipos");
const { leerHojaTrabajo } = require("../lib/vision");
const { generarDocx } = require("../lib/docx");
const { docxAPdf } = require("../lib/pdf");

// "Ambos" lo resuelve el navegador pidiendo los dos formatos por separado.
const FORMATOS = {
  docx: { extension: "docx", tipoContenido: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  pdf: { extension: "pdf", tipoContenido: "application/pdf" },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = express.Router();

function tipoDesde(req, res) {
  const tipo = obtenerTipo(req.params.tipo);
  if (!tipo) res.status(404).json({ error: `Tipo de informe desconocido: ${req.params.tipo}` });
  return tipo;
}

function sanitizarNombreArchivo(nombre) {
  return String(nombre || "")
    .replace(/\.docx$/i, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
}

router.get("/clientes", (req, res) => {
  res.json(CLIENTES);
});

router.get("/tipos", (req, res) => {
  res.json(TIPOS.map(describirTipo));
});

router.post("/tipos/:tipo/leer-hoja", upload.single("foto"), async (req, res) => {
  const tipo = tipoDesde(req, res);
  if (!tipo) return;
  try {
    if (!req.file) return res.status(400).json({ error: "Falta el archivo 'foto'." });
    const leido = await leerHojaTrabajo(req.file.buffer, tipo.PROMPT);
    res.json(tipo.interpretarLectura(leido));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Nombre que tendrá el archivo si el técnico no escribe uno (para mostrarlo en el paso 5).
router.post("/tipos/:tipo/nombre-archivo", express.json({ limit: "1mb" }), (req, res) => {
  const tipo = tipoDesde(req, res);
  if (!tipo) return;
  res.json({ nombre: tipo.nombreArchivo({ ...tipo.valoresPorDefecto(), ...(req.body || {}) }) });
});

router.post("/tipos/:tipo/generar", upload.any(), async (req, res) => {
  const tipo = tipoDesde(req, res);
  if (!tipo) return;
  try {
    const archivos = Object.fromEntries((req.files || []).map((f) => [f.fieldname, f.buffer]));
    const faltantes = tipo.FOTOS.filter((f) => !archivos[f.clave]).map((f) => f.etiqueta);
    if (faltantes.length) {
      return res.status(400).json({ error: `Faltan fotos: ${faltantes.join(", ")}.` });
    }

    const datos = { ...tipo.valoresPorDefecto(), ...req.body };
    const { valores, parrafos } = tipo.prepararDocumento(datos);
    const docx = await generarDocx({
      plantillaPath: tipo.PLANTILLA,
      valores,
      parrafos,
      fotos: tipo.FOTOS.map((f) => ({ ...f, buffer: archivos[f.clave] })),
    });

    const nombre = sanitizarNombreArchivo(req.body.nombre_archivo) || tipo.nombreArchivo(datos);
    const formato = FORMATOS[req.body.formato] ? req.body.formato : "docx";

    const archivo = formato === "pdf" ? await docxAPdf(docx) : docx;
    const { extension, tipoContenido } = FORMATOS[formato];
    res.setHeader("Content-Type", tipoContenido);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}.${extension}`);
    res.send(archivo);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

module.exports = router;
