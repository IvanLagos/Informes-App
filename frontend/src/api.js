// Misma dirección que la página: en local Vite redirige /api al backend
// (ver vite.config.js) y en Render el backend entrega la página y la API.
const API_URL = "";

async function leerError(res, porDefecto) {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error || porDefecto);
}

export async function obtenerClientes() {
  const res = await fetch(`${API_URL}/api/clientes`);
  if (!res.ok) throw await leerError(res, "No se pudo obtener la lista de clientes.");
  return res.json();
}

export async function obtenerTipos() {
  const res = await fetch(`${API_URL}/api/tipos`);
  if (!res.ok) throw await leerError(res, "No se pudo obtener la lista de tipos de informe.");
  return res.json();
}

export async function leerHoja(tipoId, blobFoto) {
  const formData = new FormData();
  formData.append("foto", blobFoto, "hoja.jpg");
  const res = await fetch(`${API_URL}/api/tipos/${tipoId}/leer-hoja`, { method: "POST", body: formData });
  if (!res.ok) throw await leerError(res, "Error al leer la hoja de trabajo.");
  return res.json();
}

/** Devuelve { blob, nombre } del .docx generado. */
export async function generarInforme(tipoId, { datos, fotos, nombreArchivo, formato }) {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(datos)) formData.append(clave, valor ?? "");
  if (nombreArchivo) formData.append("nombre_archivo", nombreArchivo);
  formData.append("formato", formato);
  for (const [clave, blob] of Object.entries(fotos)) formData.append(clave, blob, `${clave}.jpg`);

  const res = await fetch(`${API_URL}/api/tipos/${tipoId}/generar`, { method: "POST", body: formData });
  if (!res.ok) throw await leerError(res, "Error al generar el informe.");

  const disposicion = res.headers.get("Content-Disposition") || "";
  const m = /filename\*=UTF-8''([^;]+)/.exec(disposicion);
  const nombre = m ? decodeURIComponent(m[1]) : `informe.${formato}`;
  return { blob: await res.blob(), nombre };
}
