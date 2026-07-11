# Correcciones al informe — EcoMove

Este documento lista los cambios de texto que deben aplicarse manualmente al informe
principal del proyecto (PDF *Grupo2_Ecomov_ihc*), ya que los archivos PDF son binarios y
no se modifican directamente como parte de esta corrección de coherencia UX/UI. Ninguna
corrección de este documento aplica al enunciado oficial
(*UPC-PRE-202610-1ASI0385-Final-Project-Statement*) ni al PDF *ihc tb1* / NeuroSpace:
ambos son documentos de referencia entregados por la universidad o el cliente y no deben
modificarse. Cada punto referencia el cambio de diseño correspondiente aplicado en los
entregables 4.3.1 / 4.3.2 / 4.4.1 / 4.4.2 / 4.4.3.

## 1. User Story US20 — alcance de medios de transporte

**Dónde:** sección de User Stories / Backlog, historia US20 (selección de medio de
transporte sostenible).

**Cambio:** limitar el alcance descrito en US20 a los tres medios validados por el MVP:
**caminata, bicicleta y scooter eléctrico**. Eliminar cualquier mención a "transporte
público" o "auto particular" como medios registrables dentro de US20; el "Pase de bus
gratis" del marketplace es una recompensa canjeable, no un medio de transporte validado,
y no debe usarse para justificar incluir transporte público en el alcance.

**Redacción sugerida:**
> US20 — Como eco-usuario, quiero seleccionar el medio de transporte sostenible de mi
> viaje (caminata, bicicleta o scooter eléctrico) para que EcoMove registre el trayecto
> con el medio correcto.

## 2. Tabla de pantallas móviles — incluir la pantalla 21

**Dónde:** tabla que enumera las pantallas del prototipo móvil (sección 4.4).

**Cambio:** agregar la fila faltante:

| # | Pantalla | Descripción |
|---|----------|-------------|
| 21 | Perfil consultor | Gestionar datos de la consultora, preferencias, notificaciones y seguridad |

Verificar que la tabla completa liste continuamente del 01 al 21 sin saltos.

## 3. Referencias a "20 pantallas" → "21 pantallas"

**Dónde:** cualquier párrafo introductorio de las secciones 4.4.1, 4.4.2 y 4.4.3, y
cualquier resumen ejecutivo que mencione el número total de pantallas móviles.

**Cambio:** reemplazar toda referencia a "20 pantallas" por "21 pantallas". El wireflow
(4.4.2) solo diagrama explícitamente la navegación entre las pantallas con flujo de
transición directa; la pantalla 21 (Perfil consultor) se referencia desde el Dashboard
consultor (18) mediante la pestaña "Perfil" de la barra inferior — ya incorporada como
nodo en el diagrama actualizado.

## 4. Nombre del consultor — Ricardo Vásquez → Ricardo Valdivia

**Dónde:** cualquier mención textual de "Ricardo Vásquez" en el cuerpo del informe
(descripciones de persona/usuario, casos de uso del consultor ambiental, capturas
referenciadas).

**Cambio:** reemplazar por "Ricardo Valdivia" en todas las apariciones. Las iniciales
"RV" se mantienen sin cambio. Este ajuste ya se aplicó en los wireframes (4.4.1) y
mock-ups (4.4.3) del perfil consultor (pantalla 21) y en el dashboard (pantalla 18).

## 5. Pantallas 18–21 como vista móvil complementaria

**Dónde:** sección que describe la experiencia del consultor ambiental / dashboard.

**Cambio:** aclarar explícitamente que las pantallas 18–21 del prototipo móvil
(Dashboard consultor, Filtros / Mapa de calor, Reporte ambiental / Trazabilidad y
Perfil consultor) representan una **vista móvil complementaria** para consulta rápida
en campo, y que el **dashboard web de escritorio sigue siendo la experiencia principal
B2B** para el consultor ambiental (landing 4.3.1/4.3.2, sección "Beneficios para
consultores ambientales"). Evitar dar a entender que el consultor opera exclusivamente
desde el móvil.

## 6. Eco-Créditos: estimados durante el viaje, acreditados tras validar

**Dónde:** cualquier descripción del flujo de registro de viaje y del sistema de
Eco-Créditos.

**Cambio:** documentar que los Eco-Créditos que se muestran **durante** el trayecto
(pantallas 09 "Viaje en curso" y 10 "Viaje pausado") son **estimados y están pendientes
de validación**, y que solo se acreditan formalmente al finalizar el viaje, una vez que
el trayecto pasa por el estado "Trayecto validado" (pantalla 11 "Resumen de viaje"),
mostrando el feedback "+24 Eco-Créditos acreditados". Esto evita que el informe describa
los Eco-Créditos como un saldo definitivo antes de que el trayecto haya sido validado.

## 7. Conclusión: 50 User Stories → US01–US52

**Dónde:** sección de conclusiones / resumen del backlog de User Stories.

**Cambio:** corregir cualquier mención a "50 User Stories" (o cifra redonda equivalente)
por la referencia correcta al rango real del backlog: **US01–US52**. Verificar que el
conteo total citado en la conclusión coincida con el número de historias efectivamente
documentadas en el backlog (52), no con una cifra aproximada.

## 8. Otras referencias de coherencia a verificar

- Cualquier mención de "transporte público" o "auto particular" como medio de traslado
  del MVP debe limitarse a caminata, bicicleta y scooter eléctrico (ver punto 1). El
  "Pase de bus gratis" del marketplace se mantiene como recompensa, no como medio.
- Las métricas de la landing (12.4k trayectos, 3.8 t CO₂, +2,500 eco-usuarios) son datos
  **acumulados** globales del producto y no deben mezclarse con las métricas del
  dashboard consultor, que corresponden a **Miraflores · últimos 30 días** (6,340
  trayectos, 18.2 t CO₂).
- Los CTA de la landing se estandarizan a **"Empezar ahora"** (eco-usuarios) y
  **"Solicitar demo"** (consultores/B2B); el texto "Iniciar ahora" fue retirado de la
  landing.
