import { useEffect, useState } from "react";
import { alExpirar, cerrarSesion, obtenerSesion, obtenerToken } from "./api";
import App from "./App";
import Ingreso from "./components/Ingreso";

/**
 * Decide qué se muestra según la sesión: la pantalla de ingreso o la app.
 * Al recargar, si hay un token guardado se valida contra el servidor.
 */
export default function Raiz() {
  const [usuario, setUsuario] = useState(null);
  const [revisando, setRevisando] = useState(Boolean(obtenerToken()));
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    alExpirar(() => {
      cerrarSesion();
      setUsuario(null);
      setAviso("Tu sesión expiró o fue cerrada. Vuelve a iniciar sesión.");
    });
    if (!obtenerToken()) return;
    obtenerSesion()
      .then(setUsuario)
      .catch(() => cerrarSesion())
      .finally(() => setRevisando(false));
  }, []);

  if (revisando) return <div className="app ingreso-cargando">Cargando…</div>;

  if (!usuario) {
    return (
      <Ingreso
        aviso={aviso}
        onIngresar={(u) => {
          setAviso("");
          setUsuario(u);
        }}
      />
    );
  }

  return (
    <App
      usuario={usuario}
      onActualizarUsuario={setUsuario}
      onCerrarSesion={() => {
        cerrarSesion();
        setUsuario(null);
      }}
    />
  );
}
