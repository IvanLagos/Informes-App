import RecortarFoto from "./RecortarFoto";

export default function PasoHoja({ cargando, foto, onLeer, onVolver }) {
  return (
    <section className="paso">
      <h2>Paso 2: Foto de la hoja de trabajo</h2>
      <p>
        Sube la foto del Pedido de Trabajo, ajusta el recorte y la IA leerá los datos. Esta misma foto queda como
        «{foto.etiqueta}» en el registro fotográfico.
      </p>
      <RecortarFoto label="Hoja de trabajo" aspecto={foto.anchoCm / foto.altoCm} onListo={onLeer} />
      {cargando && <p className="cargando">Leyendo la hoja de trabajo con IA… puede tomar unos segundos.</p>}
      <div className="acciones">
        <button type="button" onClick={onVolver} disabled={cargando}>
          Volver
        </button>
      </div>
    </section>
  );
}
