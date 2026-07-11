# language: es
Característica: Generar un reporte ambiental
  Como consultor ambiental
  Quiero generar un reporte con los datos analizados
  Para utilizar la información en mis evaluaciones ambientales

  Escenario: Generación correcta del reporte
    Dado que el consultor ha seleccionado una zona y un periodo
    Y el dashboard muestra datos disponibles para los filtros aplicados
    Cuando presiona el botón "Generar reporte"
    Entonces el sistema crea un reporte ambiental
    Y muestra el periodo, las métricas y los filtros utilizados
    Y presenta la fuente de datos y el método de validación

