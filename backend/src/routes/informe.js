const express = require("express");
const multer = require("multer");

const { TIPOS, obtenerTipo, describirTipo } = require("../tipos");
const { leerHojaTrabajo } = require("../lib/vision");
const { generarDocx } = require("../lib/docx");

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
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}.docx`);
    res.send(docx);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

module.exports = router;
