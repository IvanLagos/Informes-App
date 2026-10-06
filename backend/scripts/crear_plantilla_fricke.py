"""
Crea plantillas/fricke_mantencion.docx a partir del informe original de
Hospital Gustavo Fricke, reemplazando los datos variables por {{TOKENS}}.

Solo hace falta correrlo de nuevo si cambia el informe original:
    python scripts/crear_plantilla_fricke.py "<ruta al .docx original>"
"""
import re
import sys
import zipfile
from pathlib import Path

ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\56981\OneDrive\Escritorio\ffica\INFSAT_UPS Hospital Gustavo Fricke P4-A1 V1.docx"
)
DESTINO = Path(__file__).resolve().parent.parent / "plantillas" / "fricke_mantencion.docx"

RE_PARRAFO = re.compile(r"<w:p[ >].*?</w:p>", re.S)
RE_TEXTO = re.compile(r"(<w:t[^>]*>)([^<]*)(</w:t>)")


def fijar_texto(parrafo, nuevo, desde=0):
    """Deja `nuevo` en el run de texto N° `desde` y vacía los siguientes
    (conserva el formato del primer run reemplazado)."""
    i = -1

    def repl(m):
        nonlocal i
        i += 1
        if i < desde:
            return m.group(0)
        texto = nuevo if i == desde else ""
        apertura = m.group(1)
        if 'xml:space="preserve"' not in apertura:
            apertura = apertura.replace("<w:t", '<w:t xml:space="preserve"', 1)
        return f"{apertura}{texto}{m.group(3)}"

    return RE_TEXTO.sub(repl, parrafo)


def procesar_documento(doc):
    parrafos = [m for m in RE_PARRAFO.finditer(doc)]
    textos = [m.group(0) for m in parrafos]

    # índice de párrafo -> (texto nuevo, run desde el que se reemplaza)
    cambios = {
        0: ("{{EMPRESA}}", 3),
        1: ("{{ATENCION}}", 2),
        2: ("{{ASUNTO}}", 2),
        3: ("{{FECHA_ASUNTO_TEXTO}}", 2),
        21: ("{{MODELO_UPS}}", 0),
        23: ("{{NUM_SERIE}}", 0),
        25: ("{{CONFIGURACION}}", 0),
        27: ("{{NUM_MODULO}}", 0),
        29: ("{{POTENCIA}}", 0),
        31: ("{{CANT_BATERIAS}} PIEZAS", 0),
        33: ("{{MODELO_BATERIAS}}", 0),
        35: ("{{DATA_UPS}}", 0),
        37: ("{{ANIO_BATERIAS}}", 0),
        38: ("Ubicación", 0),
        39: ("{{UBICACION}}", 0),
        41: ("{{TABLERO}}", 0),
        48: ("{{ESTADO_UPS}}", 0),
        50: ("{{ESTADO_BATERIAS}}", 0),
        52: ("{{INFO_BATERIAS}}", 0),
        54: ("{{BYPASS}}", 0),
        56: ("{{SNMP}}", 0),
        58: ("{{OBSERVACIONES}}", 0),
        62: ("{{RECOMENDACIONES}}", 0),
    }
    for idx, (nuevo, desde) in cambios.items():
        textos[idx] = fijar_texto(textos[idx], nuevo, desde)

    # Observaciones y recomendaciones quedan en un solo párrafo con
    # placeholder; el backend lo clona por cada línea.
    for idx in (59, 60, 63):
        textos[idx] = ""

    # Reconstruir el documento con los párrafos modificados.
    salida, ultimo = [], 0
    for m, nuevo in zip(parrafos, textos):
        salida.append(doc[ultimo:m.start()])
        salida.append(nuevo)
        ultimo = m.end()
    salida.append(doc[ultimo:])
    doc = "".join(salida)

    # La fila "Estado de las baterías" tenía alto fijo: con el texto nuevo la
    # última línea quedaba cortada. Se deja con alto mínimo para que crezca.
    i = doc.find("{{INFO_BATERIAS}}")
    inicio_fila = doc.rfind("<w:tr ", 0, i)
    fila = doc[inicio_fila:i].replace('w:hRule="exact"', 'w:hRule="atLeast"', 1)
    doc = doc[:inicio_fila] + fila + doc[i:]

    # La fila "Tablero" no se usa en este informe: se elimina de la tabla.
    i = doc.find("{{TABLERO}}")
    inicio_fila = doc.rfind("<w:tr ", 0, i)
    fin_fila = doc.find("</w:tr>", i) + len("</w:tr>")
    doc = doc[:inicio_fila] + doc[fin_fila:]

    # Registro fotográfico: las 2 tablas originales (panel/placa y 2 fotos de
    # la UPS, con sus títulos fijos) se reemplazan por una tabla 2x2 con
    # borde, donde cada celda lleva un título elegible y su foto.
    inicio = doc.rfind("<w:p ", 0, doc.find("Panel Sin"))
    tablas = list(re.finditer(r"<w:tbl>.*?</w:tbl>", doc, re.S))
    fin = next(t for t in tablas if 'r:embed="rId11"' in t.group(0)).end()
    dibujo_base = re.search(r'<w:drawing>(?:(?!<w:drawing>).)*?r:embed="rId8".*?</w:drawing>', doc, re.S).group(0)
    doc = doc[:inicio] + tabla_fotos(dibujo_base) + doc[fin:]
    return doc


def tabla_fotos(dibujo_base):
    borde = '<w:{0} w:val="single" w:sz="4" w:space="0" w:color="auto"/>'
    bordes = "".join(borde.format(b) for b in ("top", "left", "bottom", "right", "insideH", "insideV"))

    def celda(n, rid):
        dibujo = dibujo_base.replace('r:embed="rId8"', f'r:embed="{rid}"')
        dibujo = re.sub(r'<wp:docPr id="\d+" name="[^"]*"', f'<wp:docPr id="{200 + n}" name="Foto {n}"', dibujo)
        dibujo = re.sub(r'<pic:cNvPr id="\d+" name="[^"]*"', f'<pic:cNvPr id="{200 + n}" name="Foto {n}"', dibujo)
        return (
            '<w:tc><w:tcPr><w:tcW w:w="4531" w:type="dxa"/></w:tcPr>'
            '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/></w:pPr>'
            f"<w:r><w:t>{{{{FOTO{n}_TITULO}}}}</w:t></w:r></w:p>"
            '<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>'
            f"<w:r><w:rPr><w:noProof/></w:rPr>{dibujo}</w:r></w:p></w:tc>"
        )

    filas = "".join(
        f'<w:tr><w:trPr><w:jc w:val="center"/></w:trPr>{celda(a, ra)}{celda(b, rb)}</w:tr>'
        for (a, ra), (b, rb) in [((1, "rId8"), (2, "rId9")), ((3, "rId10"), (4, "rId11"))]
    )
    return (
        f'<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:jc w:val="center"/><w:tblBorders>{bordes}</w:tblBorders>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        '</w:tblPr><w:tblGrid><w:gridCol w:w="4531"/><w:gridCol w:w="4531"/></w:tblGrid>'
        f"{filas}</w:tbl><w:p/>"
    )


def procesar_encabezado(hdr):
    # El N° de informe queda fijo como en el original (4SAT010).
    # Fecha informe: runs 03 / 03 /20 2 1
    hdr = re.sub(
        r"<w:t>03</w:t>(.*?)<w:t>/</w:t>(.*?)<w:t>03</w:t>(.*?)<w:t>/20</w:t>(.*?)<w:t>2</w:t>(.*?)<w:t>1</w:t>",
        r"<w:t>{{FECHA_INFORME}}</w:t>\1<w:t></w:t>\2<w:t></w:t>\3<w:t></w:t>\4<w:t></w:t>\5<w:t></w:t>",
        hdr,
        count=1,
        flags=re.S,
    )
    return hdr


def imagen_en_blanco():
    """JPEG gris claro: reemplaza las fotos del informe original (equipos y
    hoja de trabajo con datos y firmas). La app las sobrescribe al generar."""
    from io import BytesIO
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (400, 400), (235, 235, 235)).save(buf, "JPEG", quality=80)
    return buf.getvalue()


# Fotos del informe original; el logo (image6) y el sello TÜV (image7) se mantienen.
FOTOS_ORIGINALES = {f"word/media/image{i}.jpeg" for i in range(1, 6)}


def main():
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ORIGEN) as zin, zipfile.ZipFile(DESTINO, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            datos = zin.read(item.filename)
            if item.filename in FOTOS_ORIGINALES:
                datos = imagen_en_blanco()
            elif item.filename == "word/document.xml":
                datos = procesar_documento(datos.decode("utf-8")).encode("utf-8")
            elif item.filename == "word/header1.xml":
                datos = procesar_encabezado(datos.decode("utf-8")).encode("utf-8")
            zout.writestr(item, datos)
    print(f"Plantilla creada: {DESTINO}")


if __name__ == "__main__":
    main()
