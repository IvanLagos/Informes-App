import { useEffect, useState } from "react";
import { obtenerClientes, obtenerTipos, leerHoja, generarInforme, obtenerNombrePredeterminado } from "./api";
import PasoTipo from "./components/PasoTipo";
import PasoHoja from "./components/PasoHoja";
import PasoFormulario from "./components/PasoFormulario";
import PasoFotos, { tituloFinal } from "./components/PasoFotos";
import { estadoBaterias, sincronizarRecomendacion } from "./baterias";
import PasoGenerar from "./components/PasoGenerar";
import BotonArriba from "./components/BotonArriba";
import Cuentas from "./components/Cuentas";
import CambiarClave from "./components/CambiarClave";
import { LOGO_URL } from "./components/Ingreso";

const NOMBRES_PASOS = ["Cliente y tipo", "Hoja de trabajo", "Datos", "Fotos", "Generar"];

export default function App({ usuario, onActualizarUsuario, onCerrarSesion }) {
  // "informes" | "cuentas" | "clave". El asistente sigue montado (oculto) para
  // no perder lo avanzado al ir a cuentas o a cambiar la clave.
  const [vista, setVista] = useState("informes");
  const [paso, setPaso] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState("");
  const [datos, setDatos] = useState({});
  const [fotos, setFotos] = useState({});
  const [titulos, setTitulos] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  // Nombre que se usa si no se escribe uno (depende de los datos, ej. el local en Cencosud).
  const [nombrePredeterminado, setNombrePredeterminado] = useState("");
  const [formatoDescarga, setFormatoDescarga] = useState("docx");
  // { cargando } | { blob, nombre, url } | { error }
  const [vistaPrevia, setVistaPrevia] = useState({});
  // La descarga exige haber revisado la vista previa (se reinicia con cada vista previa nueva).
  const [revisado, setRevisado] = useState(false);
  const [intentoVistaPrevia, setIntentoVistaPrevia] = useState(0);

  const tipo = tipos.find((t) => t.id === tipoId);
  const cliente = clientes.find((c) => c.id === clienteId);

  useEffect(() => {
    Promise.all([obtenerClientes(), obtenerTipos()])
      .then(([listaClientes, listaTipos]) => {
        setClientes(listaClientes);
        setTipos(listaTipos);
      })
      .catch((e) => setError(`${e.message} ¿Está abierto el backend?`));
  }, []);

  // Al cambiar de paso (Siguiente o Volver) la página parte desde arriba.
  // Inmediato y no suave: el contenido cambia de alto en ese momento y el
  // navegador corta un desplazamiento suave a medio camino.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [paso, vista]);

  function cerrarSesion() {
    if (paso > 1 && !window.confirm("¿Cerrar sesión? Se perderá el informe que estás armando.")) return;
    onCerrarSesion();
  }

  function elegirCliente(id) {
    setClienteId(id);
    // Si el cliente tiene un solo tipo de informe, queda elegido de inmediato.
    const delCliente = tipos.filter((t) => t.cliente === id);
    setTipoId(delCliente.length === 1 ? delCliente[0].id : "");
  }

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
    setNombrePredeterminado("");
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

  // Mantiene la recomendación de cambio de baterías al día con el modelo, el
  // año de las baterías y la fecha del servicio (vengan de la IA o de una
  // corrección manual en el formulario).
  useEffect(() => {
    if (!tipo?.reglaBaterias) return;
    setDatos((prev) => {
      if (prev.RECOMENDACIONES === undefined) return prev;
      const { degradada } = estadoBaterias(prev, tipo.reglaBaterias);
      const nuevo = sincronizarRecomendacion(prev.RECOMENDACIONES, tipo.reglaBaterias.texto, degradada);
      return nuevo === prev.RECOMENDACIONES ? prev : { ...prev, RECOMENDACIONES: nuevo };
    });
  }, [tipo, datos.MODELO_BATERIAS, datos.ANIO_BATERIAS, datos.FECHA_ASUNTO]);

  function actualizarCampo(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  function actualizarFoto(clave, blob) {
    setFotos((prev) => ({ ...prev, [clave]: blob }));
  }

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pedirInforme(formato) {
    const camposTitulos = Object.fromEntries(
      Object.entries(titulos).map(([clave, titulo]) => [`titulo_${clave}`, tituloFinal(titulo)])
    );
    return generarInforme(tipo.id, {
      datos: { ...datos, ...camposTitulos },
      fotos,
      nombreArchivo: nombreArchivo.trim(),
      formato,
    });
  }

  // Al entrar al paso 5 se genera el PDF para la vista previa. En ese paso
  // los datos y las fotos ya no cambian, así que el mismo PDF sirve para la
  // descarga. Al salir del paso se descarta.
  useEffect(() => {
    if (paso !== 5) return;
    let cancelado = false;
    let url = null;
    setVistaPrevia({ cargando: true });
    setRevisado(false);
    pedirInforme("pdf")
      .then(({ blob, nombre }) => {
        if (cancelado) return;
        url = URL.createObjectURL(blob);
        setVistaPrevia({ blob, nombre, url });
      })
      .catch((e) => !cancelado && setVistaPrevia({ error: e.message }));
    return () => {
      cancelado = true;
      if (url) URL.revokeObjectURL(url);
      setVistaPrevia({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, intentoVistaPrevia]);

  useEffect(() => {
    if (paso !== 5 || !tipo) return;
    let cancelado = false;
    obtenerNombrePredeterminado(tipo.id, datos)
      .then((nombre) => {
        if (cancelado) return;
        // El campo parte escrito con el nombre predeterminado para editar solo
        // los detalles. Si los datos cambiaron (ej. el local), se actualiza,
        // salvo que el técnico haya escrito un nombre propio.
        setNombreArchivo((actual) => (!actual.trim() || actual === nombrePredeterminado ? nombre : actual));
        setNombrePredeterminado(nombre);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, tipoId]);

  function nombrePdf() {
    const propio = nombreArchivo.trim().replace(/\.docx$|\.pdf$/i, "").replace(/[\\/:*?"<>|]/g, "").trim();
    return propio ? `${propio}.pdf` : vistaPrevia.nombre;
  }

  async function manejarGenerar() {
    if (!vistaPrevia.url || !revisado) return;
    setError("");
    setCargando(true);
    try {
      const formatos = formatoDescarga === "ambos" ? ["docx", "pdf"] : [formatoDescarga];
      for (const formato of formatos) {
        if (formato === "pdf" && vistaPrevia.blob) {
          descargar(vistaPrevia.blob, nombrePdf());
          continue;
        }
        const { blob, nombre } = await pedirInforme(formato);
        descargar(blob, nombre);
      }
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
          src={LOGO_URL}
          alt="Fernández Fica S.A."
          className="app-logo"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <div className="app-header-texto">
          <h1>Generador de Informes</h1>
          <p>{tipo && cliente ? `${cliente.nombre} · ${tipo.nombreCorto || tipo.nombre}` : "Fernández Fica S.A."}</p>
        </div>
        <div className="barra-usuario">
          <span className="barra-usuario-nombre">{usuario.nombre}</span>
          <div className="barra-usuario-botones">
            {usuario.perfil === "administrador" && (
              <button type="button" onClick={() => setVista(vista === "cuentas" ? "informes" : "cuentas")}>
                {vista === "cuentas" ? "Informes" : "Cuentas"}
              </button>
            )}
            <button type="button" onClick={() => setVista(vista === "clave" ? "informes" : "clave")}>
              {vista === "clave" ? (
                "Informes"
              ) : (
                <>
                  <span className="solo-escritorio">Cambiar mi clave</span>
                  <span className="solo-movil">Mi clave</span>
                </>
              )}
            </button>
            <button type="button" onClick={cerrarSesion}>
              <span className="solo-escritorio">Cerrar sesión</span>
              <span className="solo-movil">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {vista === "cuentas" && <Cuentas usuario={usuario} onVolver={() => setVista("informes")} />}
      {vista === "clave" && <CambiarClave onListo={onActualizarUsuario} onVolver={() => setVista("informes")} />}

      <div hidden={vista !== "informes"}>
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

      {paso === 1 && (
        <PasoTipo
          clientes={clientes}
          tipos={tipos}
          clienteId={clienteId}
          tipoId={tipoId}
          onElegirCliente={elegirCliente}
          onElegirTipo={setTipoId}
          onSiguiente={elegirTipo}
        />
      )}

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
          estadoBaterias={estadoBaterias(datos, tipo.reglaBaterias)}
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
          cargando={cargando}
          nombreArchivo={nombreArchivo}
          nombrePredeterminado={nombrePredeterminado}
          onCambiarNombre={setNombreArchivo}
          vistaPrevia={vistaPrevia}
          revisado={revisado}
          onCambiarRevisado={setRevisado}
          onReintentarVistaPrevia={() => setIntentoVistaPrevia((n) => n + 1)}
          formato={formatoDescarga}
          onCambiarFormato={setFormatoDescarga}
          onGenerar={manejarGenerar}
          onVolver={() => setPaso(4)}
        />
      )}
      </div>

      <BotonArriba />
    </div>
  );
}
