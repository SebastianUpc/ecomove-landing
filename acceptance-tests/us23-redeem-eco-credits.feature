# language: es
Característica: Canjear Eco-Créditos
  Como eco-usuario
  Quiero canjear mis Eco-Créditos por beneficios
  Para recibir recompensas por mi movilidad sostenible

  Escenario: Canje con saldo suficiente
    Dado que el eco-usuario tiene un saldo suficiente de Eco-Créditos
    Y ha seleccionado un beneficio disponible
    Cuando confirma el canje
    Entonces el sistema descuenta el costo del beneficio
    Y muestra una confirmación del canje
    Y registra la operación en el historial de canjes

  Escenario: Canje con saldo insuficiente
    Dado que el eco-usuario no tiene suficientes Eco-Créditos
    Cuando intenta confirmar el canje de un beneficio
    Entonces el sistema no realiza el descuento
    Y muestra un mensaje indicando que el saldo es insuficiente

