const fs = require("fs");
const JSZip = require("jszip");

const EMU_POR_CM = 360000;

function escapeXml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Reemplaza cada {{TOKEN}} de una línea por su valor. */
function reemplazarTokens(xml, valores) {
  return xml.replace(/\{\{(\w+)\}\}/g, (match, token) =>
    token in valores ? escapeXml(valores[token]) : match
  );
}

/**
 * Para los tokens de varias líneas (observaciones, recomendaciones): clona el
 * párrafo que contiene {{TOKEN}} una vez por línea, así cada línea queda como
 * párrafo propio con el mismo formato del original.
 */
function expandirParrafos(xml, token, texto) {
  const lineas = String(texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const regex = new RegExp(`<w:p[ >](?:(?!<w:p[ >]).)*?\\{\\{${token}\\}\\}.*?</w:p>`, "s");
  return xml.replace(regex, (parrafo) => {
    if (lineas.length === 0) return parrafo.replace(`{{${token}}}`, "");
    return lineas.map((linea) => parrafo.replace(`{{${token}}}`, escapeXml(linea))).join("");
  });
}

/**
 * Ajusta el dibujo que usa `rid` para que muestre la foto nueva completa:
 * tamaño fijo en cm, sin rotación ni recorte heredados de la plantilla (la
 * foto ya llega recortada desde el navegador a la proporción correcta).
 */
function ajustarDibujo(xml, rid, anchoCm, altoCm) {
  const cx = Math.round(anchoCm * EMU_POR_CM);
  const cy = Math.round(altoCm * EMU_POR_CM);
  const regex = new RegExp(`<w:drawing>(?:(?!<w:drawing>).)*?r:embed="${rid}".*?</w:drawing>`, "s");
  return xml.replace(regex, (dibujo) =>
    dibujo
      .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${cx}" cy="${cy}"/>`)
      .replace(/<wp:effectExtent [^>]*\/>/, '<wp:effectExtent l="0" t="0" r="0" b="0"/>')
      .replace(/<a:xfrm[^>]*>/, "<a:xfrm>")
      .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${cx}" cy="${cy}"/>`)
      .replace(/<a:srcRect[^>]*\/>/, "<a:srcRect/>")
      .replace(/<a:stretch\/>|<a:stretch>.*?<\/a:stretch>/s, "<a:stretch><a:fillRect/></a:stretch>")
      .replace(/<pic:blipFill rotWithShape="1">/, "<pic:blipFill>")
  );
}

/**
 * Arma el .docx a partir de una plantilla.
 * - `valores`: tokens de una línea (documento y encabezados).
 * - `parrafos`: tokens de varias líneas (un párrafo por línea).
 * - `fotos`: [{ rid, archivo, anchoCm, altoCm, buffer }].
 */
async function generarDocx({ plantillaPath, valores, parrafos, fotos }) {
  const zip = await JSZip.loadAsync(fs.readFileSync(plantillaPath));

  let doc = await zip.file("word/document.xml").async("string");
  for (const [token, texto] of Object.entries(parrafos)) {
    doc = expandirParrafos(doc, token, texto);
  }
  doc = reemplazarTokens(doc, valores);
  for (const foto of fotos) {
    doc = ajustarDibujo(doc, foto.rid, foto.anchoCm, foto.altoCm);
    zip.file(`word/media/${foto.archivo}`, foto.buffer);
  }
  zip.file("word/document.xml", doc);

  const encabezados = Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d+\.xml$/.test(n));
  for (const nombre of encabezados) {
    const xml = await zip.file(nombre).async("string");
    zip.file(nombre, reemplazarTokens(xml, valores));
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

module.exports = { generarDocx };
