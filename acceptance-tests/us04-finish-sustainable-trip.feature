# language: es
Característica: Finalizar un viaje sostenible
  Como eco-usuario
  Quiero finalizar mi trayecto
  Para conocer los resultados de mi viaje sostenible

  Escenario: Finalización correcta de un viaje
    Dado que el eco-usuario tiene un viaje sostenible en curso
    Y el cronómetro ha registrado tiempo y distancia
    Cuando presiona el botón "Finalizar viaje"
    Entonces el sistema detiene el cronómetro
    Y muestra un resumen con la distancia, duración y CO2 reducido
    Y registra el trayecto en el historial de viajes

