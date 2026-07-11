# -*- coding: utf-8 -*-
"""Generador del Wireflow Diagram 4.4.2 (EcoMove).
Este script produce index.html a partir de una tabla de nodos (pantallas)
y una tabla de conexiones (flechas con etiqueta). No se ejecuta en el
navegador: solo sirve para construir el HTML estatico (sin JavaScript).
"""

NODE_W = 150
NODE_H = 210
# Alto visual total de la tarjeta (badge + mini-phone + titulo + etiqueta),
# usado para que los conectores que salen "por abajo" no atraviesen el texto.
NODE_FULL_H = 235

# ---------------------------------------------------------------- LANE 1 ---
COL_X = {1: 220, 2: 470, 3: 720, 4: 970, 5: 1220}
ROW_Y = {1: 110, 2: 470, 3: 830, 4: 1190}
CANVAS1_W = 1470
CANVAS1_H = 1480

def pos(col, row):
    return (COL_X[col], ROW_Y[row])

def edge(col, row, side, t=0.5):
    x, y = pos(col, row)
    if side == 'right':
        return (x + NODE_W, y + NODE_H * t)
    if side == 'left':
        return (x, y + NODE_H * t)
    if side == 'top':
        return (x + NODE_W * t, y)
    if side == 'bottom':
        return (x + NODE_W * t, y + NODE_FULL_H)
    raise ValueError(side)

NODES1 = [
    dict(id="01", col=1, row=1, title="Splash / Bienvenida", tag="Onboarding", variant="icon"),
    dict(id="02", col=2, row=1, title="Login", tag="Onboarding", variant="form"),
    dict(id="03", col=3, row=1, title="Registro", tag="Onboarding", variant="form"),
    dict(id="04", col=4, row=1, title="Seleccion de tipo de usuario", tag="Onboarding", variant="list"),
    dict(id="05", col=5, row=1, title="Permiso de ubicacion", tag="Onboarding", variant="icon"),
    dict(id="06", col=1, row=2, title="Inicio eco-usuario", tag="Eco-usuario", variant="list"),
    dict(id="07", col=2, row=2, title="Seleccion de medio sostenible", tag="Eco-usuario", variant="list"),
    dict(id="08", col=3, row=2, title="Mapa / rutas sostenibles", tag="Eco-usuario", variant="map"),
    dict(id="09", col=4, row=2, title="Viaje en curso", tag="Eco-usuario", variant="map"),
    dict(id="10", col=5, row=2, title="Viaje pausado", tag="Eco-usuario", variant="list"),
    dict(id="11", col=1, row=3, title="Resumen de viaje", tag="Eco-usuario", variant="icon"),
    dict(id="12", col=2, row=3, title="Historial de viajes", tag="Eco-usuario", variant="list"),
    dict(id="13", col=3, row=3, title="Progreso ambiental / Logros", tag="Eco-usuario", variant="chart"),
    dict(id="14", col=4, row=3, title="Recompensas / Marketplace", tag="Eco-usuario", variant="list"),
    dict(id="15", col=5, row=3, title="Detalle de beneficio", tag="Eco-usuario", variant="icon"),
    dict(id="16", col=1, row=4, title="Confirmacion de canje", tag="Eco-usuario", variant="icon"),
    dict(id="17", col=2, row=4, title="Perfil y preferencias", tag="Eco-usuario", variant="list"),
]

def seglist(points):
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        assert x1 == x2 or y1 == y2, f"segmento no ortogonal: {(x1,y1)} -> {(x2,y2)}"
    return points

CONN1 = [
    dict(pts=seglist([edge(1,1,'right'), edge(2,1,'left')]), label="Comenzar", lpos=None),
    dict(pts=seglist([edge(2,1,'right'), edge(3,1,'left')]), label="Registrarse", lpos=None),
    dict(pts=seglist([edge(3,1,'right'), edge(4,1,'left')]), label="Crear cuenta", lpos=None),
    dict(pts=seglist([edge(2,1,'bottom',0.75), (edge(2,1,'bottom',0.75)[0],385), (edge(4,1,'bottom',0.25)[0],385), edge(4,1,'bottom',0.25)]),
         label="Ingresar", lpos=((edge(2,1,'bottom',0.75)[0]+edge(4,1,'bottom',0.25)[0])/2, 385)),
    dict(pts=seglist([edge(4,1,'right'), edge(5,1,'left')]), label="Continuar como eco-usuario", lpos=None),
    dict(pts=seglist([edge(5,1,'bottom'), (edge(5,1,'bottom')[0],415), (edge(1,2,'top')[0],415), edge(1,2,'top')]),
         label="Permitir ubicacion", lpos=(650,415)),
    dict(pts=seglist([edge(1,2,'right'), edge(2,2,'left')]), label="Iniciar viaje sostenible", lpos=None),
    dict(pts=seglist([edge(2,2,'right'), edge(3,2,'left')]), label="Continuar", lpos=None),
    dict(pts=seglist([edge(3,2,'right'), edge(4,2,'left')]), label="Iniciar viaje", lpos=None),
    dict(pts=seglist([edge(4,2,'right',0.35), edge(5,2,'left',0.35)]), label="Pausar", lpos=None),
    dict(pts=seglist([edge(5,2,'left',0.65), edge(4,2,'right',0.65)]), label="Reanudar", lpos=None),
    dict(pts=seglist([edge(3,2,'top',0.72), (edge(3,2,'top',0.72)[0],440), (edge(3,2,'top',0.28)[0],440), edge(3,2,'top',0.28)]),
         label="Recalcular ruta", lpos=(pos(3,2)[0]+75,425)),
    dict(pts=seglist([edge(5,2,'bottom'), (edge(5,2,'bottom')[0],745), (edge(1,3,'top')[0],745), edge(1,3,'top')]),
         label="Finalizar viaje", lpos=(650,745)),
    dict(pts=seglist([edge(4,2,'bottom',0.3), (edge(4,2,'bottom',0.3)[0],775), (edge(1,3,'top',0.7)[0],775), edge(1,3,'top',0.7)]),
         label="Finalizar viaje", lpos=(650,775)),
    dict(pts=seglist([edge(1,3,'right'), edge(2,3,'left')]), label="Ver historial", lpos=None),
    dict(pts=seglist([edge(2,3,'right',0.35), edge(3,3,'left',0.35)]), label="Ver detalle", lpos=None),
    dict(pts=seglist([edge(3,3,'left',0.65), edge(2,3,'right',0.65)]), label="Ver historial", lpos=None),
    dict(pts=seglist([edge(4,3,'right'), edge(5,3,'left')]), label="Ver beneficio", lpos=None),
    dict(pts=seglist([edge(1,3,'bottom',0.7), (edge(1,3,'bottom',0.7)[0],1095), (edge(4,3,'bottom',0.3)[0],1095), edge(4,3,'bottom',0.3)]),
         label="Ver recompensas", lpos=(650,1095)),
    dict(pts=seglist([edge(5,3,'bottom'), (edge(5,3,'bottom')[0],1120), (edge(1,4,'top')[0],1120), edge(1,4,'top')]),
         label="Canjear beneficio", lpos=(700,1120)),
    dict(pts=seglist([edge(1,4,'top',0.35), (edge(1,4,'top',0.35)[0],1145), (edge(4,3,'bottom',0.7)[0],1145), edge(4,3,'bottom',0.7)]),
         label="Ver mis canjes", lpos=(750,1145)),
    # loop-back 16 -> 06 (margen izquierdo, canal x=60)
    dict(pts=seglist([edge(1,4,'left',0.35), (60,edge(1,4,'left',0.35)[1]), (60, edge(1,2,'left',0.35)[1]), edge(1,2,'left',0.35)]),
         label="Volver al inicio", lpos=(60,860), vlabel=True),
    # 06 -> 17 (margen izquierdo, canal x=100, evita cruzar la columna 1)
    dict(pts=seglist([edge(1,2,'left',0.65), (100,edge(1,2,'left',0.65)[1]), (100, edge(2,4,'left',0.65)[1]), edge(2,4,'left',0.65)]),
         label="Perfil", lpos=(100,950), vlabel=True),
    # loop-back 17 -> 02 (por debajo de la fila 4 y por el margen izquierdo, canal x=140)
    dict(pts=seglist([edge(2,4,'bottom'), (edge(2,4,'bottom')[0],1460), (140,1460), (140,55), (edge(2,1,'top')[0],55), edge(2,1,'top')]),
         label="Cerrar sesion", lpos=((140+edge(2,1,'top')[0])/2, 40)),
]

SELF_LOOP1 = CONN1[11]  # 08 -> 08 (ya definido arriba como conexion 12)

EXT_BOX1 = None  # lane 1 no tiene caja externa

# ---------------------------------------------------------------- LANE 2 ---
COL_X2 = {1: 220, 2: 470, 3: 720, 4: 970}
ROW_Y2 = {1: 110, 2: 470}
CANVAS2_W = 1300
CANVAS2_H = 820

def pos2(col, row):
    return (COL_X2[col], ROW_Y2[row])

def edge2(col, row, side, t=0.5):
    x, y = pos2(col, row)
    if side == 'right':
        return (x + NODE_W, y + NODE_H * t)
    if side == 'left':
        return (x, y + NODE_H * t)
    if side == 'top':
        return (x + NODE_W * t, y)
    if side == 'bottom':
        return (x + NODE_W * t, y + NODE_FULL_H)
    raise ValueError(side)

NODES2 = [
    dict(id="02", col=1, row=1, title="Login", tag="Pantalla compartida", variant="form", shared=True),
    dict(id="04", col=2, row=1, title="Seleccion de tipo de usuario", tag="Pantalla compartida", variant="list", shared=True),
    dict(id="18", col=3, row=1, title="Dashboard consultor", tag="Consultor ambiental", variant="chart"),
    dict(id="21", col=4, row=1, title="Perfil consultor", tag="Consultor ambiental", variant="list"),
    dict(id="19", col=2, row=2, title="Filtros / Mapa de calor", tag="Consultor ambiental", variant="grid"),
    dict(id="20", col=3, row=2, title="Reporte ambiental / Trazabilidad", tag="Consultor ambiental", variant="chart"),
]

CONN2 = [
    dict(pts=seglist([edge2(1,1,'right'), edge2(2,1,'left')]), label="Ingresar", lpos=None),
    dict(pts=seglist([edge2(2,1,'right'), edge2(3,1,'left')]), label="Continuar como consultor", lpos=None),
    dict(pts=seglist([edge2(3,1,'right'), edge2(4,1,'left')]), label="Perfil", lpos=None),
    dict(pts=seglist([edge2(3,1,'bottom',0.3), (edge2(3,1,'bottom',0.3)[0],385), (edge2(2,2,'top',0.7)[0],385), edge2(2,2,'top',0.7)]),
         label="Aplicar filtros", lpos=(700,385)),
    dict(pts=seglist([edge2(3,1,'bottom',0.7), edge2(3,2,'top',0.7)]), label="Generar reporte", lpos=(edge2(3,1,'bottom',0.7)[0], 400)),
    dict(pts=seglist([edge2(2,2,'top',0.28), (edge2(2,2,'top',0.28)[0],440), (edge2(2,2,'top',0.05)[0],440), edge2(2,2,'top',0.05)]),
         label="Aplicar filtros", lpos=(pos2(2,2)[0]+30,425)),
    dict(pts=seglist([edge2(2,2,'right'), edge2(3,2,'left')]), label="Generar reporte", lpos=None),
]

EXT_BOX2 = dict(x=970, y=530, w=180, h=90, title="Reporte exportado")
CONN2_EXT = dict(pts=seglist([edge2(3,2,'right'), (EXT_BOX2['x'], EXT_BOX2['y']+EXT_BOX2['h']/2)]),
                  label="Exportar PDF / Excel", lpos=None)

# ----------------------------------------------------------------- HTML ----

def arrow_dir(p1, p2):
    x1, y1 = p1
    x2, y2 = p2
    if x2 > x1: return 'right'
    if x2 < x1: return 'left'
    if y2 > y1: return 'down'
    return 'up'

def build_content(variant):
    if variant == 'icon':
        return (
            '<div class="mp-icon-circle"></div>'
            '<div class="mp-bar mp-bar--60 mp-bar--center"></div>'
            '<div class="mp-bar mp-bar--40 mp-bar--center"></div>'
            '<div class="mp-spacer"></div>'
            '<div class="mp-btn"></div>'
        )
    if variant == 'form':
        return (
            '<div class="mp-bar mp-bar--40"></div>'
            '<div class="mp-input"></div>'
            '<div class="mp-bar mp-bar--30"></div>'
            '<div class="mp-input"></div>'
            '<div class="mp-spacer"></div>'
            '<div class="mp-btn"></div>'
            '<div class="mp-btn mp-btn--ghost"></div>'
        )
    if variant == 'list':
        return (
            '<div class="mp-bar mp-bar--50"></div>'
            '<div class="mp-row"><span class="mp-dot"></span><div class="mp-bar mp-bar--70"></div></div>'
            '<div class="mp-row"><span class="mp-dot"></span><div class="mp-bar mp-bar--60"></div></div>'
            '<div class="mp-row"><span class="mp-dot"></span><div class="mp-bar mp-bar--80"></div></div>'
            '<div class="mp-spacer"></div>'
            '<div class="mp-btn"></div>'
        )
    if variant == 'map':
        return (
            '<div class="mp-map"><div class="mp-map-route"></div><div class="mp-map-pin mp-map-pin--a"></div><div class="mp-map-pin mp-map-pin--b"></div></div>'
            '<div class="mp-bar mp-bar--60"></div>'
            '<div class="mp-spacer"></div>'
            '<div class="mp-btn"></div>'
        )
    if variant == 'chart':
        return (
            '<div class="mp-chart">'
            '<div class="mp-chart-bar" style="height:35%"></div>'
            '<div class="mp-chart-bar" style="height:60%"></div>'
            '<div class="mp-chart-bar" style="height:45%"></div>'
            '<div class="mp-chart-bar" style="height:80%"></div>'
            '<div class="mp-chart-bar" style="height:55%"></div>'
            '</div>'
            '<div class="mp-bar mp-bar--70"></div>'
            '<div class="mp-spacer"></div>'
            '<div class="mp-btn"></div>'
        )
    if variant == 'grid':
        cells = ''.join(f'<div class="mp-heat mp-heat--{i%3}"></div>' for i in range(12))
        return f'<div class="mp-heatgrid">{cells}</div><div class="mp-spacer"></div><div class="mp-btn"></div>'
    return ''

def render_nodes(nodes, colx, rowy):
    out = []
    for n in nodes:
        x, y = colx[n['col']], rowy[n['row']]
        shared_cls = " node--shared" if n.get('shared') else ""
        content = build_content(n['variant'])
        out.append(f'''<div class="node{shared_cls}" style="left:{x}px; top:{y}px; width:{NODE_W}px;">
  <span class="node-badge">{n['id']}</span>
  <div class="mini-phone">
    <div class="mp-statusbar"></div>
    <div class="mp-header"></div>
    <div class="mp-content">{content}</div>
  </div>
  <p class="node-title">{n['id']}. {n['title']}</p>
  <span class="node-tag">{n['tag']}</span>
</div>''')
    return '\n'.join(out)

def render_connections(conns):
    out = []
    for c in conns:
        pts = c['pts']
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            if y1 == y2:
                left = min(x1, x2)
                width = abs(x2 - x1)
                out.append(f'<div class="seg seg-h" style="left:{left}px; top:{y1-1}px; width:{width}px;"></div>')
            else:
                top = min(y1, y2)
                height = abs(y2 - y1)
                out.append(f'<div class="seg seg-v" style="left:{x1-1}px; top:{top}px; height:{height}px;"></div>')
        d = arrow_dir(pts[-2], pts[-1])
        ax, ay = pts[-1]
        out.append(f'<div class="arrowhead arrowhead--{d}" style="left:{ax}px; top:{ay}px;"></div>')
        if c.get('lpos'):
            lx, ly = c['lpos']
        else:
            (x1, y1), (x2, y2) = pts[0], pts[1]
            lx, ly = (x1 + x2) / 2, y1 - 14
        vcls = ' flow-label--v' if c.get('vlabel') else ''
        out.append(f'<div class="flow-label{vcls}" style="left:{lx}px; top:{ly}px;">{c["label"]}</div>')
    return '\n'.join(out)

def render_ext_box(box):
    return f'''<div class="ext-box" style="left:{box['x']}px; top:{box['y']}px; width:{box['w']}px; height:{box['h']}px;">
  <span class="ext-box-title">{box['title']}</span>
</div>'''

lane1_nodes_html = render_nodes(NODES1, COL_X, ROW_Y)
lane1_conn_html = render_connections(CONN1)

lane2_nodes_html = render_nodes(NODES2, COL_X2, ROW_Y2)
lane2_conn_html = render_connections(CONN2 + [CONN2_EXT])
lane2_ext_html = render_ext_box(EXT_BOX2)

HTML = f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>4.4.2 Mobile Applications Wireflow Diagrams — EcoMove</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="wireflow-page">

  <header class="page-head">
    <h1 class="page-title">4.4.2 Mobile Applications Wireflow Diagrams — EcoMove</h1>
    <p class="page-subtitle">Wireflow en baja fidelidad: conexion entre las 21 pantallas moviles del punto 4.4.1, organizadas en dos flujos de usuario. Diagrama de referencia para navegacion, no de diseno visual final.</p>
    <div class="legend">
      <span class="legend-item"><span class="legend-swatch legend-swatch--node"></span>Pantalla movil</span>
      <span class="legend-item"><span class="legend-swatch legend-swatch--arrow"></span>Flujo de navegacion</span>
      <span class="legend-item"><span class="legend-swatch legend-swatch--shared"></span>Pantalla compartida entre flujos</span>
      <span class="legend-item"><span class="legend-swatch legend-swatch--ext"></span>Salida / resultado externo</span>
    </div>
  </header>

  <section class="lane">
    <h2 class="lane-title">Flujo Eco-usuario joven</h2>
    <div class="wireflow-canvas" style="width:{CANVAS1_W}px; height:{CANVAS1_H}px;">
      {lane1_conn_html}
      {lane1_nodes_html}
    </div>
  </section>

  <section class="lane">
    <h2 class="lane-title">Flujo Ingeniero ambiental consultor</h2>
    <div class="wireflow-canvas" style="width:{CANVAS2_W}px; height:{CANVAS2_H}px;">
      {lane2_conn_html}
      {lane2_nodes_html}
      {lane2_ext_html}
    </div>
  </section>

</div>
</body>
</html>
'''

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(HTML)

print("index.html generado.")
