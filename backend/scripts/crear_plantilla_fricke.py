"""
Crea plantillas/fricke_mantencion.docx a partir del informe original de
Hospital Gustavo Fricke, reemplazando los datos variables por {{TOKENS}}.
La portada se toma del informe de Clínica Los Carrera.

Solo hace falta correrlo de nuevo si cambia alguno de los dos informes:
    python scripts/crear_plantilla_fricke.py "<informe Fricke .docx>" "<informe con la portada .docx>"
"""
import re
import sys
import zipfile
from pathlib import Path

ESCRITORIO = Path(r"C:\Users\56981\OneDrive\Escritorio")
ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else ESCRITORIO / "INFSAT_UPS Hospital Gustavo Fricke P4-A1 V1.docx"
PORTADA = (
    Path(sys.argv[2])
    if len(sys.argv) > 2
    else ESCRITORIO / "INFSAT_Reporte Mantenimiento Preventivo_UPS MASBC 60KVA_Clinica Los Carrera.docx"
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
    return agregar_titulo_hoja(doc)


TITULO_HOJA = "Registro de hoja de trabajo"
MARCADOR_HOJA = "_TocHojaTrabajo"


def agregar_titulo_hoja(doc):
    """La página de la hoja de trabajo solo tenía una leyenda centrada: pasa a
    ser la sección 6, con el mismo estilo de título que las demás y su línea
    en el índice."""
    leyenda = next(
        m for m in RE_PARRAFO.finditer(doc) if "Registro de Hoja de Trabajo de Asistencia" in m.group(0)
    )
    titulo = (
        '<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr>'
        f'<w:bookmarkStart w:id="900" w:name="{MARCADOR_HOJA}"/>'
        f"<w:r><w:t>{TITULO_HOJA}</w:t></w:r>"
        '<w:bookmarkEnd w:id="900"/></w:p>'
    )
    doc = doc[: leyenda.start()] + titulo + doc[leyenda.end():]

    # Línea del índice: copia de la del registro fotográfico (sección 5), con
    # la página siguiente (la hoja de trabajo va en la página después de las fotos).
    linea_fotos = next(m for m in RE_PARRAFO.finditer(doc) if "TDC1" in m.group(0) and "Registro fotogr" in m.group(0))
    p = linea_fotos.group(0)
    marcador_fotos = re.search(r"PAGEREF (\S+)", p).group(1)
    textos = [t for t in RE_TEXTO.finditer(p) if t.group(2).strip()]
    numero, nombre, pagina = textos[0], textos[1], textos[-1]
    reemplazos = [
        (numero, "6"),
        (nombre, TITULO_HOJA),
        (pagina, str(int(pagina.group(2)) + 1)),
    ]
    nueva = p
    for t, valor in sorted(reemplazos, key=lambda r: r[0].start(), reverse=True):
        nueva = nueva[: t.start(2)] + valor + nueva[t.end(2):]
    nueva = nueva.replace(marcador_fotos, MARCADOR_HOJA)
    nueva = re.sub(r' w14:(paraId|textId)="[^"]*"', "", nueva)
    return doc[: linea_fotos.end()] + nueva + doc[linea_fotos.end():]


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


# ---------------------------------------------------------------------------
# Portada (tomada del informe de Clínica Los Carrera)
# ---------------------------------------------------------------------------

# Imágenes de la portada: rId en el informe de origen -> (rId nuevo, archivo nuevo).
IMAGENES_PORTADA = {
    "rId8": ("rIdPortada1", "portada1.jpeg"),
    "rId9": ("rIdPortada2", "portada2.png"),
    "rId10": ("rIdPortada3", "portada3.png"),
    "rId11": ("rIdPortada4", "portada4.jpeg"),
    "rId12": ("rIdPortada5", "portada5.png"),
    "rId13": ("rIdPortada6", "portada6.png"),
}
RID_ENCABEZADO_PORTADA = "rIdPortadaEncabezado"
TIPO_IMAGEN = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
TIPO_ENCABEZADO = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"

# Datos de la tabla de la portada (fila -> valor). El N° de informe va fijo.
VALORES_PORTADA = ["{{EMPRESA}}", "{{ATENCION}}", "{{ASUNTO}}", "{{FECHA_PORTADA}}", "4SAT010"]


# ---------------------------------------------------------------------------
# Sección "Registro de baterías" (tablas tomadas del informe de Los Carrera)
# ---------------------------------------------------------------------------

TITULO_BATERIAS = "Registro de baterías"
MARCADOR_BATERIAS = "_TocBaterias"
# Tabla "Profile Information": valor de cada fila (2ª celda).
VALORES_PERFIL = ["{{BAT_PERFIL}}", "{{BAT_UBICACION}}", "{{MODELO_BATERIAS}}", "{{CANT_BATERIAS}}", "{{ANIO_BATERIAS}}"]
# Tabla de resultados: fila -> (resistencia, total).
VALORES_RESULTADOS = [
    ("{{BAT_RES_PASS}}", "{{BAT_TOTAL_PASS}}"),
    ("{{BAT_RES_WARNING}}", "{{BAT_TOTAL_WARNING}}"),
    ("{{BAT_RES_FAIL}}", "{{BAT_TOTAL_FAIL}}"),
]


RE_ETIQUETA_BLOQUE = re.compile(r"<(/?)w:(p|tbl)(?=[ >/])[^>]*?(/?)>")


def elementos_cuerpo(cuerpo):
    """Párrafos y tablas de primer nivel del cuerpo, respetando el anidado
    (tablas dentro de tablas, párrafos dentro de cuadros de texto)."""
    elementos, profundidad, inicio = [], 0, None
    for m in RE_ETIQUETA_BLOQUE.finditer(cuerpo):
        cierre, autocierre = m.group(1), m.group(3)
        if autocierre:
            if profundidad == 0:
                elementos.append(cuerpo[m.start() : m.end()])
            continue
        if not cierre:
            if profundidad == 0:
                inicio = m.start()
            profundidad += 1
        else:
            profundidad -= 1
            if profundidad == 0:
                elementos.append(cuerpo[inicio : m.end()])
    return elementos


def textos_de(xml):
    return "".join(t.group(2) for t in RE_TEXTO.finditer(xml))


def reemplazar_primer_texto(xml, nuevo):
    """Cambia solo el primer <w:t> (conserva el resto, ej. 'm Ω')."""
    m = RE_TEXTO.search(xml)
    apertura = m.group(1) if 'xml:space="preserve"' in m.group(1) else m.group(1).replace("<w:t", '<w:t xml:space="preserve"', 1)
    return xml[: m.start()] + apertura + nuevo + m.group(3) + xml[m.end():]


RE_ETIQUETA_TABLA = re.compile(r"<(/?)w:(tbl|tr|tc)(?=[ >/])[^>]*?(/?)>")


def hijos(xml, etiqueta):
    """Elementos `etiqueta` del nivel más externo de `xml` (ignora los de
    tablas anidadas dentro de celdas)."""
    encontrados, pila = [], []
    for m in RE_ETIQUETA_TABLA.finditer(xml):
        cierre, nombre, autocierre = m.groups()
        if autocierre:
            continue
        if not cierre:
            pila.append((nombre, m.start()))
        else:
            _, inicio = pila.pop()
            if nombre == etiqueta:
                encontrados.append((len(pila), xml[inicio : m.end()]))
    if not encontrados:
        return []
    minimo = min(nivel for nivel, _ in encontrados)
    return [x for nivel, x in encontrados if nivel == minimo]


def tokenizar_tabla(tabla, por_fila):
    """Aplica `por_fila(i, celdas) -> {indice_celda: xml_nuevo}` a cada fila."""
    for i, fila in enumerate(hijos(tabla, "tr")):
        celdas = hijos(fila, "tc")
        nueva = fila
        for k, xml in por_fila(i, celdas).items():
            nueva = nueva.replace(celdas[k], xml, 1)
        tabla = tabla.replace(fila, nueva, 1)
    return tabla


def extraer_seccion_baterias(zportada):
    """Las tablas de la sección "Registro de Baterías" (barra azul, "Profile
    Information" y la de resultados Pass/Warning/Fail), con tokens."""
    doc = zportada.read("word/document.xml").decode("utf-8")
    cuerpo = doc[doc.find("<w:body>") + len("<w:body>"):]
    elementos = elementos_cuerpo(cuerpo)
    titulo = next(i for i, e in enumerate(elementos) if "Registro de Bater" in textos_de(e) and "TDC" not in e)
    fin = next(i for i in range(titulo, len(elementos)) if "Judgement" in textos_de(elementos[i]))
    # Solo las tablas: los párrafos vacíos de entremedio traen estilo de
    # título numerado y aparecerían como una sección vacía.
    partes = [e for e in elementos[titulo + 1 : fin + 1] if e.startswith("<w:tbl")]

    def perfil(i, celdas):
        if i == 0:
            return {}
        valor = VALORES_PERFIL[i - 1]
        return {1: RE_PARRAFO.sub(lambda m: fijar_texto(m.group(0), f"- {valor}"), celdas[1], count=1)}

    def resultados(i, celdas):
        if i == 0:
            return {}
        resistencia, total = VALORES_RESULTADOS[i - 1]
        return {
            2: reemplazar_primer_texto(celdas[2], f"{resistencia} "),
            3: RE_PARRAFO.sub(lambda m: fijar_texto(m.group(0), total), celdas[3], count=1),
        }

    # Toda la sección es una tabla exterior (su borde izquierdo es la barra
    # azul) que contiene las tablas "Profile Information" y la de resultados.
    seccion = "".join(partes)
    exterior = next(p for p in partes if p.startswith("<w:tbl"))
    contenido = exterior[exterior.find(">") + 1 : exterior.rfind("</w:tbl>")]
    for interior in hijos(contenido, "tbl"):
        texto = textos_de(interior)
        if "Profile" in texto:
            seccion = seccion.replace(interior, tokenizar_tabla(interior, perfil), 1)
        elif "Judgement" in texto:
            seccion = seccion.replace(interior, tokenizar_tabla(interior, resultados), 1)
    # Estilo de celda vacía que no existe en el informe de Fricke.
    seccion = re.sub(r'<w:pStyle w:val="EmptyCellLayoutStyle"/>', "", seccion)
    # Sin listas numeradas (la numeración del otro informe no existe aquí).
    seccion = re.sub(r"<w:numPr>.*?</w:numPr>", "", seccion, flags=re.S)
    seccion = seccion + "<w:p/>"
    return renumerar_ids(seccion, 3000)


def agregar_seccion_baterias(doc, seccion):
    """Inserta la sección 4 "Registro de baterías" en su propia página, antes
    de la rutina de mantención, y la agrega al índice (las secciones
    siguientes se renumeran y quedan una página más adelante)."""
    rutina = next(
        m for m in RE_PARRAFO.finditer(doc) if "Ttulo1" in m.group(0) and "Rutina de Servicio" in textos_de(m.group(0))
    )
    titulo = (
        '<w:p><w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr>'
        f'<w:bookmarkStart w:id="901" w:name="{MARCADOR_BATERIAS}"/>'
        f"<w:r><w:t>{TITULO_BATERIAS}</w:t></w:r>"
        '<w:bookmarkEnd w:id="901"/></w:p>'
    )
    salto = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    doc = doc[: rutina.start()] + titulo + seccion + salto + doc[rutina.start():]

    lineas = [m for m in RE_PARRAFO.finditer(doc) if "TDC1" in m.group(0) and "PAGEREF" in m.group(0)]
    evaluacion = next(i for i, m in enumerate(lineas) if "Evaluaci" in textos_de(m.group(0)))

    def cambiar(p, numero=None, nombre=None, pagina=None, marcador=None):
        textos = [t for t in RE_TEXTO.finditer(p) if t.group(2).strip()]
        reemplazos = []
        if numero is not None:
            reemplazos.append((textos[0], str(numero)))
        if nombre is not None:
            reemplazos.append((textos[1], nombre))
        if pagina is not None:
            reemplazos.append((textos[-1], str(pagina)))
        for t, valor in sorted(reemplazos, key=lambda r: r[0].start(), reverse=True):
            p = p[: t.start(2)] + valor + p[t.end(2):]
        if marcador:
            p = re.sub(r"PAGEREF \S+", f"PAGEREF {marcador}", p)
            p = re.sub(r' w14:(paraId|textId)="[^"]*"', "", p)
        return p

    def numeros(p):
        textos = [t.group(2) for t in RE_TEXTO.finditer(p) if t.group(2).strip()]
        return int(textos[0]), int(textos[-1])

    # De abajo hacia arriba, para no mover las posiciones pendientes.
    for m in reversed(lineas[evaluacion + 1 :]):
        numero, pagina = numeros(m.group(0))
        doc = doc[: m.start()] + cambiar(m.group(0), numero + 1, pagina=pagina + 1) + doc[m.end():]
    linea_eval = lineas[evaluacion]
    numero, pagina = numeros(linea_eval.group(0))
    nueva = cambiar(linea_eval.group(0), numero + 1, TITULO_BATERIAS, pagina + 1, MARCADOR_BATERIAS)
    return doc[: linea_eval.end()] + nueva + doc[linea_eval.end():]


def renumerar_ids(xml, base):
    """Evita choques de id de dibujos con los del informe de Fricke."""
    return re.sub(r'(<(?:wp:docPr|[a-z]+:cNvPr) id=")(\d+)"', lambda m: f'{m.group(1)}{base + int(m.group(2))}"', xml)


def extraer_portada(zportada):
    """Devuelve (xml de la portada, archivos de imagen) del informe de origen.
    La portada es: el dibujo de fondo (bloque gris, foto, logo), un párrafo y
    la tabla flotante con los datos; luego se fuerza el salto de página."""
    doc = zportada.read("word/document.xml").decode("utf-8")
    cuerpo = doc[doc.find("<w:body>") + len("<w:body>"):]
    dibujo, vacio, tabla = elementos_cuerpo(cuerpo)[:3]

    # Tabla de datos: el valor de cada fila (2ª celda) pasa a ser un token.
    filas = re.findall(r"<w:tr .*?</w:tr>", tabla, re.S)
    for fila, valor in zip(filas, VALORES_PORTADA):
        celdas = re.findall(r"<w:tc>.*?</w:tc>", fila, re.S)
        nueva_celda = RE_PARRAFO.sub(lambda m: fijar_texto(m.group(0), valor), celdas[1], count=1)
        tabla = tabla.replace(fila, fila.replace(celdas[1], nueva_celda), 1)
    # La tabla se ubica respecto de la página (y no del texto) para que caiga
    # sobre el bloque gris aunque el informe de Fricke tenga otro margen superior.
    tabla = re.sub(r'w:vertAnchor="text"', 'w:vertAnchor="page"', tabla)
    tabla = re.sub(r'w:tblpY="-?\d+"', 'w:tblpY="2180"', tabla)

    portada = dibujo + vacio + tabla + '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    for viejo, (nuevo, _) in IMAGENES_PORTADA.items():
        portada = re.sub(rf'(r:(?:embed|id|link)="){viejo}"', rf'\g<1>{nuevo}"', portada)
    portada = renumerar_ids(portada, 1000)

    rels = zportada.read("word/_rels/document.xml.rels").decode("utf-8")
    archivos = {}
    for viejo, (_, archivo) in IMAGENES_PORTADA.items():
        destino = re.search(rf'Id="{viejo}"[^>]*Target="([^"]+)"', rels).group(1)
        archivos[f"word/media/{archivo}"] = zportada.read(f"word/{destino}")
    return portada, archivos


def extraer_encabezado_portada(zportada):
    """Encabezado de la portada ("REPORTE TÉCNICO DE MANTENCIÓN" + logo)."""
    rels = zportada.read("word/_rels/document.xml.rels").decode("utf-8")
    doc = zportada.read("word/document.xml").decode("utf-8")
    sect = re.findall(r"<w:sectPr.*?</w:sectPr>", doc, re.S)[-1]
    rid = re.search(r'<w:headerReference w:type="default" r:id="(\w+)"', sect).group(1)
    nombre = re.search(rf'Id="{rid}"[^>]*Target="([^"]+)"', rels).group(1)
    xml = renumerar_ids(zportada.read(f"word/{nombre}").decode("utf-8"), 2000)
    xml = fijar_a_pagina(xml, sect)
    rels_hdr = zportada.read(f"word/_rels/{nombre}.rels").decode("utf-8")
    archivos = {}
    for rid_img, destino in re.findall(r'Id="(\w+)"[^>]*Target="media/([^"]+)"', rels_hdr):
        nuevo = f"portada_encabezado_{destino}"
        archivos[f"word/media/{nuevo}"] = zportada.read(f"word/media/{destino}")
        rels_hdr = rels_hdr.replace(f'Target="media/{destino}"', f'Target="media/{nuevo}"')
    return xml, rels_hdr, archivos


def fijar_a_pagina(xml, sect):
    """El título y el logo del encabezado están ubicados respecto del margen
    o del párrafo, que en el informe de Fricke quedan más abajo. Se pasan a
    posiciones respecto de la página, calculadas con los márgenes del
    informe de origen, para que queden igual que allá."""
    EMU_POR_TWIP = 635
    margen = abs(int(re.search(r'<w:pgMar [^>]*w:top="(-?\d+)"', sect).group(1))) * EMU_POR_TWIP
    encabezado = int(re.search(r'<w:pgMar [^>]*w:header="(\d+)"', sect).group(1)) * EMU_POR_TWIP
    base = {"margin": margen, "paragraph": encabezado}

    def ancla(m):
        relativo, offset = m.group(1), int(m.group(2))
        if relativo not in base:
            return m.group(0)
        return f'<wp:positionV relativeFrom="page"><wp:posOffset>{offset + base[relativo]}</wp:posOffset>'

    xml = re.sub(r'<wp:positionV relativeFrom="(\w+)"><wp:posOffset>(-?\d+)</wp:posOffset>', ancla, xml)

    # Versión VML (para Word antiguo) del cuadro de texto del título.
    def vml(m):
        estilo = m.group(0)
        if "mso-position-vertical-relative:margin" not in estilo:
            return estilo
        estilo = re.sub(
            r"margin-top:(-?[\d.]+)pt",
            lambda t: f"margin-top:{float(t.group(1)) + margen / 12700:.1f}pt",
            estilo,
        )
        return estilo.replace("mso-position-vertical-relative:margin", "mso-position-vertical-relative:page")

    return re.sub(r'style="[^"]*"', vml, xml)


def insertar_portada(doc, portada):
    """La portada reemplaza el cuadro de datos inicial del informe de Fricke
    (todo lo que hay antes del índice), y el índice pasa a la página 2."""
    inicio = doc.find("<w:body>") + len("<w:body>")
    indice = doc.rfind("<w:p ", 0, doc.find(">INDICE<"))
    doc = doc[:inicio] + portada + doc[indice:]

    # Primera página con encabezado propio (el de la portada); el pie se mantiene.
    def sect(m):
        s = m.group(0)
        pie = re.search(r'<w:footerReference w:type="default" r:id="(\w+)"/>', s).group(1)
        refs = (
            f'<w:headerReference w:type="first" r:id="{RID_ENCABEZADO_PORTADA}"/>'
            f'<w:footerReference w:type="first" r:id="{pie}"/>'
        )
        s = s.replace("<w:pgSz", refs + "<w:pgSz", 1) if "<w:headerReference" not in s else re.sub(
            r"(<w:headerReference [^>]*/>)", r"\1" + refs, s, count=1
        )
        # El orden importa en Word: titlePg va antes de docGrid.
        return s.replace("<w:docGrid", "<w:titlePg/><w:docGrid", 1) if "<w:docGrid" in s else s.replace(
            "</w:sectPr>", "<w:titlePg/></w:sectPr>"
        )

    doc = re.sub(r"<w:sectPr[ >].*?</w:sectPr>(?=</w:body>)", sect, doc, flags=re.S)

    # Índice: con la portada, cada sección queda una página más adelante.
    def sumar_pagina(m):
        p = m.group(0)
        if "PAGEREF" not in p:
            return p
        textos = list(RE_TEXTO.finditer(p))
        ultimo = next((t for t in reversed(textos) if t.group(2).strip().isdigit()), None)
        if not ultimo:
            return p
        nuevo = f"{ultimo.group(1)}{int(ultimo.group(2)) + 1}{ultimo.group(3)}"
        return p[: ultimo.start()] + nuevo + p[ultimo.end():]

    return RE_PARRAFO.sub(sumar_pagina, doc)


def agregar_relaciones(rels):
    nuevas = "".join(
        f'<Relationship Id="{nuevo}" Type="{TIPO_IMAGEN}" Target="media/{archivo}"/>'
        for nuevo, archivo in IMAGENES_PORTADA.values()
    )
    nuevas += f'<Relationship Id="{RID_ENCABEZADO_PORTADA}" Type="{TIPO_ENCABEZADO}" Target="header_portada.xml"/>'
    return rels.replace("</Relationships>", nuevas + "</Relationships>")


def agregar_tipos(tipos):
    override = (
        '<Override PartName="/word/header_portada.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    )
    return tipos.replace("</Types>", override + "</Types>")


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
    with zipfile.ZipFile(PORTADA) as zportada:
        portada, imagenes_portada = extraer_portada(zportada)
        seccion_baterias = extraer_seccion_baterias(zportada)
        encabezado, rels_encabezado, imagenes_encabezado = extraer_encabezado_portada(zportada)

    with zipfile.ZipFile(ORIGEN) as zin, zipfile.ZipFile(DESTINO, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            datos = zin.read(item.filename)
            if item.filename in FOTOS_ORIGINALES:
                datos = imagen_en_blanco()
            elif item.filename == "word/document.xml":
                doc = procesar_documento(datos.decode("utf-8"))
                doc = agregar_seccion_baterias(doc, seccion_baterias)
                datos = insertar_portada(doc, portada).encode("utf-8")
            elif item.filename == "word/header1.xml":
                datos = procesar_encabezado(datos.decode("utf-8")).encode("utf-8")
            elif item.filename == "word/_rels/document.xml.rels":
                datos = agregar_relaciones(datos.decode("utf-8")).encode("utf-8")
            elif item.filename == "[Content_Types].xml":
                datos = agregar_tipos(datos.decode("utf-8")).encode("utf-8")
            zout.writestr(item, datos)

        for nombre, datos in {**imagenes_portada, **imagenes_encabezado}.items():
            zout.writestr(nombre, datos)
        zout.writestr("word/header_portada.xml", encabezado)
        zout.writestr("word/_rels/header_portada.xml.rels", rels_encabezado)
    print(f"Plantilla creada: {DESTINO}")


if __name__ == "__main__":
    main()
