const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");

const ejecutar = promisify(execFile);
const TIEMPO_MAXIMO_MS = 120000;

/** Ruta de LibreOffice: SOFFICE_PATH, la instalación típica de Windows o `soffice` del sistema (Render/Docker). */
function rutaLibreOffice() {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  if (process.platform === "win32") {
    const ruta = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
    return fs.existsSync(ruta) ? ruta : null;
  }
  return "soffice";
}

async function conLibreOffice(soffice, entrada, carpeta) {
  // Perfil propio por conversión: LibreOffice no admite dos conversiones a la vez con el mismo perfil.
  const perfil = "file:///" + path.join(carpeta, "perfil").replace(/\\/g, "/").replace(/^\/+/, "");
  await ejecutar(
    soffice,
    [`-env:UserInstallation=${perfil}`, "--headless", "--convert-to", "pdf", "--outdir", carpeta, entrada],
    { timeout: TIEMPO_MAXIMO_MS }
  );
}

// Solo en Windows sin LibreOffice: usa el Word instalado (uso local).
async function conWord(entrada, salida) {
  const script = `
$w = New-Object -ComObject Word.Application
$w.Visible = $false
try {
  $d = $w.Documents.Open('${entrada.replace(/'/g, "''")}', $false, $true)
  $d.Fields.Update() | Out-Null
  $d.ExportAsFixedFormat('${salida.replace(/'/g, "''")}', 17)
  $d.Close(0)
} finally { $w.Quit() }`;
  await ejecutar("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { timeout: TIEMPO_MAXIMO_MS });
}

/** Convierte el .docx (buffer) a PDF (buffer). */
async function docxAPdf(docx) {
  const carpeta = path.join(os.tmpdir(), `informe-${crypto.randomUUID()}`);
  fs.mkdirSync(carpeta, { recursive: true });
  const entrada = path.join(carpeta, "informe.docx");
  const salida = path.join(carpeta, "informe.pdf");
  fs.writeFileSync(entrada, docx);
  try {
    const soffice = rutaLibreOffice();
    if (soffice) await conLibreOffice(soffice, entrada, carpeta);
    else if (process.platform === "win32") await conWord(entrada, salida);
    else throw new Error("No hay LibreOffice instalado para convertir a PDF.");
    if (!fs.existsSync(salida)) throw new Error("La conversión a PDF no generó el archivo.");
    return fs.readFileSync(salida);
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("No encontré LibreOffice para convertir a PDF.");
    throw e;
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
}

module.exports = { docxAPdf };
