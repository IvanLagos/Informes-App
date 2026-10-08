import RecortarFoto from "./RecortarFoto";
import Cargando, { ETAPAS_LECTURA } from "./Cargando";

export default function PasoHoja({ cargando, foto, onLeer, onVolver }) {
  return (
    <section className="paso">
      <h2>Paso 2: Foto de la hoja de trabajo</h2>
      <p>
        Sube la foto del Pedido de Trabajo, ajusta el recorte y la IA leerá los datos. Esta misma foto queda como
        «{foto.etiqueta}» en el registro fotográfico.
      </p>
      <RecortarFoto label="Hoja de trabajo" aspecto={foto.anchoCm / foto.altoCm} onListo={onLeer} />
      {cargando && <Cargando titulo="Leyendo la hoja de trabajo con IA" etapas={ETAPAS_LECTURA} />}
      <div className="acciones">
        <button type="button" onClick={onVolver} disabled={cargando}>
          Volver
        </button>
      </div>
    </section>
  );
}
