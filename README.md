# EcoMove — Landing Page + App funcional (MVP)

Plataforma de movilidad sostenible que registra trayectos, calcula el CO₂ evitado y convierte los hábitos de movilidad en Eco-Créditos canjeables por recompensas.

## 🌐 Demo en producción

**👉 [https://sebastianupc.github.io/ecomove-landing/](https://sebastianupc.github.io/ecomove-landing/)**

Abre la demo y pulsa **"Empezar ahora"** para entrar a la app funcional (frontend simulado, sin backend; el estado se guarda en `localStorage`).

## ✨ Funcionalidades

La landing incluye una app funcional con 32 User Stories implementadas, organizadas en tres módulos:

- **Trayectos** — iniciar/pausar/reanudar/finalizar viaje con cronómetro real, registro en segundo plano, historial, cálculo de CO₂ (por viaje y acumulado), rutas con ciclovías, comparación y recomendación de ruta segura. Medios: caminata, bicicleta y scooter eléctrico.
- **Eco-Créditos y recompensas** — saldo e historial de créditos, validación antifraude, catálogo de beneficios con filtro por categoría, canje con validación de saldo, confirmación e historial de canjes.
- **Dashboard del consultor** — mapa de calor por zona, filtros de zona/periodo/medio que recalculan las métricas, CO₂ agregado, tendencias de movilidad, generación de reporte con trazabilidad y exportación simulada a PDF/Excel.

## 🛠️ Tecnología

HTML semántico · CSS con metodología BEM y variables del Design System (verde jade, verde menta, amarillo pastel) · JavaScript vanilla (sin dependencias). Responsive mobile-first con media queries reales.

## ▶️ Ejecutar localmente

```bash
# Desde la raíz del repositorio
python -m http.server 8000
# Luego abre http://localhost:8000/
```

## 📁 Estructura

```
index.html        # Landing + contenedor de la app (SPA overlay)
styles.css        # Estilos de la landing
app.css           # Estilos de la app funcional (BEM)
app.js            # Shell, router y módulo de trayectos
rewards.js        # Eco-Créditos y canje de beneficios
dashboard.js      # Dashboard del consultor ambiental
assets/           # Logo e imágenes
```

## Acceptance Tests

Las pruebas de aceptación están redactadas en **Gherkin (español)** y se encuentran en la carpeta [`acceptance-tests`](acceptance-tests). Validan los flujos principales del producto: registro de trayectos sostenibles, acumulación y canje de Eco-Créditos, recompensas y dashboard ambiental del consultor. Son pruebas de aceptación del **frontend simulado** (el estado se maneja en `localStorage`), por lo que no requieren un backend real.

- [US01 - Iniciar viaje sostenible](acceptance-tests/us01-start-sustainable-trip.feature)
- [US04 - Finalizar viaje sostenible](acceptance-tests/us04-finish-sustainable-trip.feature)
- [US11 - Acumular Eco-Créditos](acceptance-tests/us11-accrue-eco-credits.feature)
- [US23 - Canjear Eco-Créditos](acceptance-tests/us23-redeem-eco-credits.feature)
- [US32 - Visualizar mapa de calor](acceptance-tests/us32-view-heat-map.feature)
- [US33 - Filtrar dashboard](acceptance-tests/us33-filter-dashboard-data.feature)
- [US36 - Generar reporte ambiental](acceptance-tests/us36-generate-environmental-report.feature)

La ruta oficial de las pruebas de aceptación es únicamente `/acceptance-tests`.

## 🌿 Flujo de ramas

- `main` — versión de producción (desplegada en GitHub Pages).
- `develop` — rama de integración.
- `feature/*` — un branch por bloque funcional (`trip-tracking`, `rewards-redemption`, `consultant-dashboard`), fusionados a `develop` con Conventional Commits.

Release actual: **`v1.0.0`** — EcoMove Landing Page functional MVP.
