import { useEffect, useState } from "react";
import { obtenerTipos, leerHoja, generarInforme } from "./api";
import PasoTipo from "./components/PasoTipo";
import PasoHoja from "./components/PasoHoja";
import PasoFormulario from "./components/PasoFormulario";
import PasoFotos, { tituloFinal } from "./components/PasoFotos";
import PasoGenerar from "./components/PasoGenerar";

const NOMBRES_PASOS = ["Tipo de informe", "Hoja de trabajo", "Datos", "Fotos", "Generar"];

export default function App() {
  const [paso, setPaso] = useState(1);
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState("");
  const [datos, setDatos] = useState({});
  const [fotos, setFotos] = useState({});
  const [titulos, setTitulos] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");

  const tipo = tipos.find((t) => t.id === tipoId);

  useEffect(() => {
    obtenerTipos()
      .then((lista) => {
        setTipos(lista);
        if (lista.length === 1) setTipoId(lista[0].id);
      })
      .catch((e) => setError(`${e.message} ¿Está abierto el backend?`));
  }, []);

  function elegirTipo() {
    setDatos({ ...tipo.valoresPorDefecto });
    setFotos({});
    // Cada foto del trabajo parte con su título por defecto ya elegido.
    setTitulos(
      Object.fromEntries(
        tipo.fotos.filter((f) => f.tituloPorDefecto).map((f) => [f.clave, { seleccion: f.tituloPorDefecto, libre: "" }])
      )
    );
    setNombreArchivo("");
    setPaso(2);
  }

  async function manejarHoja(blob) {
    setError("");
    setCargando(true);
    // La misma foto recortada se usa como "Hoja de trabajo" en el registro fotográfico.
    setFotos((prev) => ({ ...prev, [tipo.fotoHoja]: blob }));
    try {
      const leido = await leerHoja(tipo.id, blob);
      setDatos(leido);
      setPaso(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampo(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarFoto(clave, blob) {
    setFotos((prev) => ({ ...prev, [clave]: blob }));
  }

  async function manejarGenerar() {
    setError("");
    setCargando(true);
    try {
      const camposTitulos = Object.fromEntries(
        Object.entries(titulos).map(([clave, titulo]) => [`titulo_${clave}`, tituloFinal(titulo)])
      );
      const { blob, nombre } = await generarInforme(tipo.id, {
        datos: { ...datos, ...camposTitulos },
        fotos,
        nombreArchivo: nombreArchivo.trim(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <img
          src="https://fernandezfica.cl/img/LogoFF2.png"
          alt="Fernández Fica S.A."
          className="app-logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="app-header-texto">
          <h1>Generador de Informes</h1>
          <p>{tipo ? tipo.nombre : "Fernández Fica S.A."}</p>
        </div>
      </header>

      <ol className="pasos">
        {NOMBRES_PASOS.map((nombre, i) => {
          const n = i + 1;
          const estado = paso === n ? "activo" : paso > n ? "hecho" : "";
          return (
            <li key={n} className={estado}>
              <span className="paso-circulo">{paso > n ? "✓" : n}</span>
              <span className="paso-nombre">{nombre}</span>
            </li>
          );
        })}
      </ol>

      {error && <div className="error">{error}</div>}

      {paso === 1 && <PasoTipo tipos={tipos} tipoId={tipoId} onElegir={setTipoId} onSiguiente={elegirTipo} />}

      {paso === 2 && tipo && (
        <PasoHoja
          cargando={cargando}
          foto={tipo.fotos.find((f) => f.clave === tipo.fotoHoja)}
          onLeer={manejarHoja}
          onVolver={() => setPaso(1)}
        />
      )}

      {paso === 3 && tipo && (
        <PasoFormulario
          secciones={tipo.secciones}
          datos={datos}
          onCambiar={actualizarCampo}
          onSiguiente={() => setPaso(4)}
          onVolver={() => setPaso(2)}
        />
      )}

      {paso === 4 && tipo && (
        <PasoFotos
          fotosTipo={tipo.fotos}
          fotoHoja={tipo.fotoHoja}
          titulosFoto={tipo.titulosFoto}
          fotos={fotos}
          titulos={titulos}
          onFoto={actualizarFoto}
          onTitulo={(clave, titulo) => setTitulos((prev) => ({ ...prev, [clave]: titulo }))}
          onSiguiente={() => setPaso(5)}
          onVolver={() => setPaso(3)}
        />
      )}

      {paso === 5 && tipo && (
        <PasoGenerar
          tipo={tipo}
          datos={datos}
          cargando={cargando}
          nombreArchivo={nombreArchivo}
          onCambiarNombre={setNombreArchivo}
          onGenerar={manejarGenerar}
          onVolver={() => setPaso(4)}
        />
      )}
    </div>
  );
}
