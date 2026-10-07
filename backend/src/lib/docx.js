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

const TIPO_IMAGEN = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

/**
 * Pone cada foto en su lugar de la plantilla. El lugar se busca por TEXTO, no
 * por los identificadores internos del Word: la foto va en el primer dibujo
 * que sigue a la última aparición de `foto.ancla` (ej. "{{FOTO1_TITULO}}" o el
 * título "Registro de hoja de trabajo"). Así una plantilla editada y guardada
 * en Word sigue funcionando aunque Word renombre o fusione sus imágenes.
 *
 * Varias fotos tras el mismo texto (ej. las 3 páginas del checklist) usan
 * `saltar`: 0 = el primer dibujo después del texto, 1 = el segundo, etc.
 *
 * Cada foto queda como imagen propia (relación y archivo nuevos), con tamaño
 * fijo en cm y sin rotación ni recorte heredados (ya llega recortada).
 * Devuelve el documento y las relaciones a agregar.
 */
function ubicarFotos(doc, fotos) {
  const relaciones = [];
  fotos.forEach((foto, i) => {
    const ancla = doc.lastIndexOf(foto.ancla);
    if (ancla === -1) throw new Error(`La plantilla no tiene el texto «${foto.ancla}» para ubicar la foto «${foto.etiqueta}».`);
    let inicio = doc.indexOf("<w:drawing>", ancla);
    for (let s = 0; s < (foto.saltar || 0) && inicio !== -1; s++) inicio = doc.indexOf("<w:drawing>", inicio + 1);
    if (inicio === -1) throw new Error(`La plantilla no tiene la imagen de «${foto.etiqueta}» después de «${foto.ancla}».`);
    const fin = doc.indexOf("</w:drawing>", inicio) + "</w:drawing>".length;

    const rid = `rIdFotoApp${i + 1}`;
    const archivo = `foto_app_${i + 1}.jpeg`;
    const cx = Math.round(foto.anchoCm * EMU_POR_CM);
    const cy = Math.round(foto.altoCm * EMU_POR_CM);
    const dibujo = doc
      .slice(inicio, fin)
      .replace(/r:embed="[^"]*"/, `r:embed="${rid}"`)
      .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${cx}" cy="${cy}"/>`)
      .replace(/<wp:effectExtent [^>]*\/>/, '<wp:effectExtent l="0" t="0" r="0" b="0"/>')
      .replace(/<a:xfrm[^>]*>/, "<a:xfrm>")
      .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${cx}" cy="${cy}"/>`)
      .replace(/<a:srcRect[^>]*\/>/, "<a:srcRect/>")
      .replace(/<a:stretch\/>|<a:stretch>.*?<\/a:stretch>/s, "<a:stretch><a:fillRect/></a:stretch>")
      .replace(/<pic:blipFill rotWithShape="1">/, "<pic:blipFill>");
    doc = doc.slice(0, inicio) + dibujo + doc.slice(fin);
    relaciones.push({ rid, archivo, buffer: foto.buffer });
  });
  return { doc, relaciones };
}

/**
 * Arma el .docx a partir de una plantilla.
 * - `valores`: tokens de una línea (documento y encabezados).
 * - `parrafos`: tokens de varias líneas (un párrafo por línea).
 * - `fotos`: [{ ancla, etiqueta, anchoCm, altoCm, buffer }] (ver ubicarFotos).
 */
async function generarDocx({ plantillaPath, valores, parrafos, fotos }) {
  const zip = await JSZip.loadAsync(fs.readFileSync(plantillaPath));

  let doc = await zip.file("word/document.xml").async("string");
  // Las fotos primero: se ubican por textos (como {{FOTO1_TITULO}}) que el
  // reemplazo de tokens hace desaparecer.
  const ubicadas = ubicarFotos(doc, fotos);
  doc = ubicadas.doc;
  for (const [token, texto] of Object.entries(parrafos)) {
    doc = expandirParrafos(doc, token, texto);
  }
  doc = reemplazarTokens(doc, valores);
  zip.file("word/document.xml", doc);

  const rutaRels = "word/_rels/document.xml.rels";
  let rels = await zip.file(rutaRels).async("string");
  const nuevas = ubicadas.relaciones
    .map(({ rid, archivo }) => `<Relationship Id="${rid}" Type="${TIPO_IMAGEN}" Target="media/${archivo}"/>`)
    .join("");
  rels = rels.replace("</Relationships>", `${nuevas}</Relationships>`);
  zip.file(rutaRels, rels);
  for (const { archivo, buffer } of ubicadas.relaciones) zip.file(`word/media/${archivo}`, buffer);

  const tipos = await zip.file("[Content_Types].xml").async("string");
  if (!/Extension="jpeg"/i.test(tipos)) {
    zip.file("[Content_Types].xml", tipos.replace(/(<Types[^>]*>)/, '$1<Default Extension="jpeg" ContentType="image/jpeg"/>'));
  }

  const encabezados = Object.keys(zip.files).filter((n) => /^word\/(header|footer)[^/]*\.xml$/.test(n));
  for (const nombre of encabezados) {
    const xml = await zip.file(nombre).async("string");
    zip.file(nombre, reemplazarTokens(xml, valores));
  }

  const core = zip.file("docProps/core.xml");
  if (core) zip.file("docProps/core.xml", propiedadesNuevas(await core.async("string")));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Propiedades del archivo (Archivo → Información en Word): la plantilla trae
 * las del informe original (fechas de 2021, autor, última impresión). Cada
 * informe queda con la fecha y hora en que se genera.
 */
function propiedadesNuevas(core) {
  const ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const autor = "Fernández Fica S.A.";
  return core
    .replace(/(<dcterms:created[^>]*>)[^<]*/, `$1${ahora}`)
    .replace(/(<dcterms:modified[^>]*>)[^<]*/, `$1${ahora}`)
    .replace(/(<dc:creator>)[^<]*/, `$1${autor}`)
    .replace(/(<cp:lastModifiedBy>)[^<]*/, `$1${autor}`)
    .replace(/(<cp:revision>)[^<]*/, "$11")
    .replace(/<cp:lastPrinted>[^<]*<\/cp:lastPrinted>/, "");
}

module.exports = { generarDocx };
