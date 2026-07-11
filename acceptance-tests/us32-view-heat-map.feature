# language: es
Característica: Visualizar el mapa de calor ambiental
  Como consultor ambiental
  Quiero visualizar un mapa de calor
  Para identificar las zonas con mayor movilidad sostenible

  Escenario: Visualización del mapa con datos disponibles
    Dado que el consultor ha ingresado al dashboard ambiental
    Y existen datos simulados de movilidad por zona
    Cuando abre la vista del mapa de calor
    Entonces el sistema muestra las zonas analizadas
    Y diferencia visualmente el nivel de actividad de cada zona
    Y presenta una leyenda para interpretar los resultados

