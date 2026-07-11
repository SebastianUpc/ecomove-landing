# language: es
Característica: Iniciar un viaje sostenible
  Como eco-usuario
  Quiero iniciar el registro de un trayecto sostenible
  Para medir mi desplazamiento y su impacto ambiental

  Escenario: Inicio correcto de un viaje en bicicleta
    Dado que el eco-usuario se encuentra en la pantalla de inicio
    Y ha seleccionado la bicicleta como medio sostenible
    Cuando presiona el botón "Iniciar viaje"
    Entonces el sistema inicia el cronómetro en tiempo real
    Y muestra el viaje con estado "En curso"
    Y comienza a estimar la distancia, el CO2 reducido y los Eco-Créditos

