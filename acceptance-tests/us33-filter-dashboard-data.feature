# language: es
Característica: Filtrar datos del dashboard
  Como consultor ambiental
  Quiero filtrar los datos por zona y periodo
  Para analizar información ambiental específica

  Escenario: Aplicación correcta de los filtros
    Dado que el consultor se encuentra en el dashboard ambiental
    Cuando selecciona una zona y un periodo de análisis
    Entonces el sistema actualiza los indicadores mostrados
    Y actualiza el mapa de calor con los datos filtrados
    Y mantiene visibles los filtros seleccionados

