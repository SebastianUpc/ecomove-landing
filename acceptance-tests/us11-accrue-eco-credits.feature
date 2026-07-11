# language: es
Característica: Acumular Eco-Créditos
  Como eco-usuario
  Quiero recibir Eco-Créditos por mis trayectos sostenibles
  Para utilizarlos en el catálogo de recompensas

  Escenario: Acreditación después de validar el trayecto
    Dado que el eco-usuario ha finalizado un viaje sostenible
    Y el trayecto no presenta una anomalía de velocidad o ubicación
    Cuando el sistema valida el trayecto
    Entonces muestra el estado "Trayecto validado"
    Y convierte los Eco-Créditos estimados en acreditados
    Y actualiza el saldo disponible del eco-usuario

