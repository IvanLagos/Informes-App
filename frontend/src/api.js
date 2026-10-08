// Misma dirección que la página: en local Vite redirige /api al backend
// (ver vite.config.js) y en Render el backend entrega la página y la API.
const API_URL = "";

// Sesión: el token se guarda en el navegador para no pedir la clave en cada
// recarga (dura 12 horas). Si el servidor lo rechaza, se avisa a la app para
// volver a la pantalla de ingreso.
const CLAVE_TOKEN = "informes-app-token";
let alExpirarSesion = () => {};

export function obtenerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN) || "";
  } catch {
    return "";
  }
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // Sin almacenamiento (ventana privada): la sesión dura mientras la pestaña esté abierta.
  }
  tokenEnMemoria = token || "";
}

let tokenEnMemoria = obtenerToken();

export function alExpirar(fn) {
  alExpirarSesion = fn;
}

function fetch(url, opciones = {}) {
  const headers = new Headers(opciones.headers);
  if (tokenEnMemoria) headers.set("Authorization", `Bearer ${tokenEnMemoria}`);
  return window.fetch(url, { ...opciones, headers }).then((res) => {
    if (res.status === 401 && tokenEnMemoria && !String(url).includes("/api/sesion/login")) alExpirarSesion();
    return res;
  });
}

async function leerError(res, porDefecto) {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error || porDefecto);
}

async function enviarJson(url, metodo, cuerpo, porDefecto) {
  const res = await fetch(`${API_URL}${url}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!res.ok) throw await leerError(res, porDefecto);
  return res.json();
}

export async function iniciarSesion(correo, clave) {
  const data = await enviarJson("/api/sesion/login", "POST", { correo, clave }, "No se pudo iniciar sesión.");
  guardarToken(data.token);
  return data.usuario;
}

export async function obtenerSesion() {
  const res = await fetch(`${API_URL}/api/sesion/yo`);
  if (!res.ok) throw await leerError(res, "La sesión no es válida.");
  return (await res.json()).usuario;
}

export function cerrarSesion() {
  guardarToken("");
}

export async function cambiarMiClave(claveActual, claveNueva) {
  const data = await enviarJson("/api/sesion/cambiar-clave", "POST", { claveActual, claveNueva }, "No se pudo cambiar la clave.");
  guardarToken(data.token);
  return data.usuario;
}

export function listarUsuarios() {
  return enviarJson("/api/admin/usuarios", "GET", undefined, "No se pudo obtener la lista de cuentas.");
}

export function crearUsuario(datos) {
  return enviarJson("/api/admin/usuarios", "POST", datos, "No se pudo crear la cuenta.");
}

export function actualizarUsuario(id, cambios) {
  return enviarJson(`/api/admin/usuarios/${id}`, "PATCH", cambios, "No se pudo actualizar la cuenta.");
}

export function eliminarUsuario(id) {
  return enviarJson(`/api/admin/usuarios/${id}`, "DELETE", undefined, "No se pudo eliminar la cuenta.");
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

/** Nombre del archivo que se usa si no se escribe uno propio (sin extensión). */
export async function obtenerNombrePredeterminado(tipoId, datos) {
  const res = await fetch(`${API_URL}/api/tipos/${tipoId}/nombre-archivo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw await leerError(res, "No se pudo obtener el nombre predeterminado.");
  return (await res.json()).nombre;
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
