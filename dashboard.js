/* =========================================================
   EcoMove - Consultant environmental dashboard module
   US31-40. Dataset fijo simulado; los filtros recalculan
   de verdad las métricas mostradas.
   Usa la API pública window.EcoMove.
   ========================================================= */
(function () {
  'use strict';

  const EM = window.EcoMove;
  if (!EM) return;

  const state = EM.state;
  const esc = EM.escapeHtml;
  const CAR_CO2_PER_KM = 0.192;

  /* ---------- Dataset fijo por zona (promedios diarios) ---------- */
  const DASH_DATA = {
    'san-isidro': { name: 'San Isidro', modes: { walk: { tripsPerDay: 120, kmAvg: 1.8 }, bike: { tripsPerDay: 95,  kmAvg: 3.5 }, scooter: { tripsPerDay: 60, kmAvg: 4.2 } } },
    'miraflores': { name: 'Miraflores', modes: { walk: { tripsPerDay: 150, kmAvg: 1.6 }, bike: { tripsPerDay: 130, kmAvg: 3.8 }, scooter: { tripsPerDay: 90, kmAvg: 4.5 } } },
    'surco':      { name: 'Surco',      modes: { walk: { tripsPerDay: 80,  kmAvg: 2.0 }, bike: { tripsPerDay: 110, kmAvg: 4.0 }, scooter: { tripsPerDay: 70, kmAvg: 5.0 } } },
    'barranco':   { name: 'Barranco',   modes: { walk: { tripsPerDay: 70,  kmAvg: 1.5 }, bike: { tripsPerDay: 60,  kmAvg: 3.2 }, scooter: { tripsPerDay: 40, kmAvg: 3.8 } } },
    'la-molina':  { name: 'La Molina',  modes: { walk: { tripsPerDay: 50,  kmAvg: 2.4 }, bike: { tripsPerDay: 85,  kmAvg: 5.2 }, scooter: { tripsPerDay: 55, kmAvg: 6.0 } } }
  };

  const MODE_CO2 = { walk: 0.000, bike: 0.005, scooter: 0.020 };
  const MODE_LABELS = { walk: 'Caminata', bike: 'Bicicleta', scooter: 'Scooter' };
  const PERIOD_LABELS = { '7': 'Últimos 7 días', '30': 'Últimos 30 días', '90': 'Últimos 90 días' };
  const WEEK_PATTERN = [0.82, 0.9, 0.97, 1.05, 1.1, 1.16, 1.22]; // tendencia creciente determinista

  /* =======================================================
     COMPUTE (US33 recálculo real según filtros)
     ======================================================= */
  function computeDashboard(filters) {
    const days = parseInt(filters.period, 10);
    const zoneIds = filters.zone === 'all' ? Object.keys(DASH_DATA) : [filters.zone];
    const modeIds = filters.mode === 'all' ? ['walk', 'bike', 'scooter'] : [filters.mode];

    let totalTrips = 0;
    let totalCo2Kg = 0;
    const modeShare = { walk: 0, bike: 0, scooter: 0 };
    const zoneRows = [];

    zoneIds.forEach(function (zid) {
      const zone = DASH_DATA[zid];
      let zoneTrips = 0;
      let zoneCo2 = 0;
      modeIds.forEach(function (mid) {
        const m = zone.modes[mid];
        const trips = m.tripsPerDay * days;
        const co2 = trips * m.kmAvg * (CAR_CO2_PER_KM - MODE_CO2[mid]);
        zoneTrips += trips;
        zoneCo2 += co2;
        modeShare[mid] += trips;
      });
      totalTrips += zoneTrips;
      totalCo2Kg += zoneCo2;
      zoneRows.push({ id: zid, name: zone.name, trips: zoneTrips, co2Kg: zoneCo2 });
    });

    // intensidad para el mapa de calor (US32), relativa al máximo de la selección
    const maxTrips = zoneRows.reduce(function (m, z) { return Math.max(m, z.trips); }, 1);
    zoneRows.forEach(function (z) { z.intensity = z.trips / maxTrips; });

    // tendencia semanal (US35)
    const weeks = Math.max(1, Math.ceil(days / 7));
    const weekly = [];
    for (let i = 0; i < Math.min(weeks, 12); i++) {
      const factor = WEEK_PATTERN[i % WEEK_PATTERN.length];
      weekly.push(Math.round((totalTrips / weeks) * factor));
    }

    // medio dominante (US35 tendencia)
    let topMode = 'bike';
    Object.keys(modeShare).forEach(function (k) { if (modeShare[k] > modeShare[topMode]) topMode = k; });
    let topZone = zoneRows[0];
    zoneRows.forEach(function (z) { if (z.trips > topZone.trips) topZone = z; });

    const validatedPct = 88 + (totalTrips % 9); // determinista, 88-96%

    return {
      days: days, totalTrips: totalTrips, totalCo2Kg: totalCo2Kg,
      co2Tonnes: totalCo2Kg / 1000, modeShare: modeShare, zoneRows: zoneRows,
      weekly: weekly, topMode: topMode, topZone: topZone, validatedPct: validatedPct
    };
  }

  /* =======================================================
     HTML BUILDERS (reutilizados por las 3 pestañas del consultor)
     ======================================================= */
  function filtersPanelHtml(f) {
    return '<div class="panel"><h2 class="panel__title">Filtros</h2>' +
        '<p class="panel__hint">Segmenta los datos por zona, periodo y medio. Afecta a todo el panel.</p>' +
        '<div class="dash-filters">' +
          filterSelect('zone', 'Zona', [{ v: 'all', l: 'Todas las zonas' }].concat(
            Object.keys(DASH_DATA).map(function (id) { return { v: id, l: DASH_DATA[id].name }; })), f.zone) +
          filterSelect('period', 'Periodo', [
            { v: '7', l: PERIOD_LABELS['7'] }, { v: '30', l: PERIOD_LABELS['30'] }, { v: '90', l: PERIOD_LABELS['90'] }
          ], f.period) +
          filterSelect('mode', 'Medio', [
            { v: 'all', l: 'Todos los medios' }, { v: 'walk', l: 'Caminata' },
            { v: 'bike', l: 'Bicicleta' }, { v: 'scooter', l: 'Scooter eléctrico' }
          ], f.mode) +
        '</div>' +
      '</div>';
  }

  function kpisHtml(data, f) {   // US34
    return '<div class="stat-grid" style="margin-bottom:16px">' +
        '<div class="stat stat--dark stat--wide"><span class="stat__value">' + data.co2Tonnes.toFixed(1) +
          ' t</span><span class="stat__label">CO₂ evitado (agregado) · ' + esc(PERIOD_LABELS[f.period]) + '</span></div>' +
        '<div class="stat"><span class="stat__value">' + EM.formatNumber(data.totalTrips) +
          '</span><span class="stat__label">Trayectos</span></div>' +
        '<div class="stat"><span class="stat__value">' + data.validatedPct +
          '%</span><span class="stat__label">Validados</span></div>' +
        '<div class="stat"><span class="stat__value">' + MODE_LABELS[data.topMode] +
          '</span><span class="stat__label">Medio dominante</span></div>' +
      '</div>';
  }

  function heatmapHtml(data) {   // US32
    let html = '<div class="panel"><h2 class="panel__title">Mapa de calor por zona</h2>' +
      '<p class="panel__hint">Intensidad de trayectos sostenibles por zona (dataset simulado).</p>' +
      '<div class="heatmap">';
    data.zoneRows.forEach(function (z) {
      const alpha = (0.15 + z.intensity * 0.85).toFixed(2);
      html += '<div class="heatmap__cell" style="background:rgba(0,153,98,' + alpha + ')" ' +
        'title="' + esc(z.name) + ': ' + EM.formatNumber(z.trips) + ' trayectos">' +
        '<span class="heatmap__name">' + esc(z.name) + '</span>' +
        '<span class="heatmap__val">' + EM.formatNumber(z.trips) + '</span>' +
        '</div>';
    });
    return html + '</div></div>';
  }

  function trendsHtml(data) {    // US35
    let html = '<div class="panel"><h2 class="panel__title">Tendencia de movilidad</h2>' +
      '<p class="panel__hint">Trayectos por semana en el periodo seleccionado.</p>' +
      '<div class="trend-chart" role="img" aria-label="Gráfico de tendencia semanal de trayectos">';
    const maxWeek = Math.max.apply(null, data.weekly);
    data.weekly.forEach(function (v, i) {
      const h = Math.round((v / maxWeek) * 100);
      html += '<div class="trend-chart__col">' +
        '<div class="trend-chart__bar" style="height:' + h + '%" title="Semana ' + (i + 1) + ': ' +
        EM.formatNumber(v) + '"></div>' +
        '<span class="trend-chart__label">S' + (i + 1) + '</span></div>';
    });
    html += '</div>';
    html += '<div class="mode-share">';
    ['walk', 'bike', 'scooter'].forEach(function (mid) {
      const pct = data.totalTrips ? Math.round((data.modeShare[mid] / data.totalTrips) * 100) : 0;
      html += '<div class="mode-share__row">' +
        '<span class="mode-share__label">' + MODE_LABELS[mid] + '</span>' +
        '<span class="mode-share__track"><span class="mode-share__fill" style="width:' + pct + '%"></span></span>' +
        '<span class="mode-share__pct">' + pct + '%</span></div>';
    });
    return html + '</div></div>';
  }

  function tableHtml(data) {
    let html = '<div class="panel"><h2 class="panel__title">Detalle por zona</h2>' +
      '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr><th scope="col">Zona</th><th scope="col">Trayectos</th><th scope="col">CO₂ evitado</th></tr></thead><tbody>';
    data.zoneRows.forEach(function (z) {
      html += '<tr><td>' + esc(z.name) + '</td><td>' + EM.formatNumber(z.trips) + '</td><td>' +
        (z.co2Kg / 1000).toFixed(2) + ' t</td></tr>';
    });
    return html + '</tbody></table></div></div>';
  }

  function viewHead(eyebrow, title, subtitle) {
    return '<header class="view-head">' +
      '<span class="view-head__eyebrow">' + esc(eyebrow) + '</span>' +
      '<h1 class="view-head__title">' + esc(title) + '</h1>' +
      '<p class="view-head__subtitle">' + esc(subtitle) + '</p>' +
    '</header>';
  }

  /* =======================================================
     CONSULTOR — DASHBOARD (métricas agregadas) US31, US34, US35
     ======================================================= */
  function renderConsDashboard(container) {
    const f = state.dashboard;
    const data = computeDashboard(f);
    container.innerHTML =
      EM.membershipBadgeHtml() +
      viewHead('Consultor ambiental', 'Dashboard ambiental',
        'Métricas agregadas de movilidad sostenible para la toma de decisiones.') +
      kpisHtml(data, f) + trendsHtml(data) + tableHtml(data);
  }

  /* =======================================================
     CONSULTOR — MAPA (filtros + mapa de calor) US32, US33
     ======================================================= */
  function renderConsMap(container) {
    const f = state.dashboard;
    const data = computeDashboard(f);
    container.innerHTML =
      EM.membershipBadgeHtml() +
      viewHead('Consultor ambiental', 'Mapa de calor',
        'Filtra por zona, periodo y medio para explorar la intensidad de movilidad sostenible.') +
      filtersPanelHtml(f) + heatmapHtml(data);
  }

  /* =======================================================
     CONSULTOR — REPORTES (generación + exportación) US36-40
     ======================================================= */
  function renderConsReports(container) {
    const f = state.dashboard;
    const data = computeDashboard(f);
    container.innerHTML =
      EM.membershipBadgeHtml() +
      viewHead('Consultor ambiental', 'Reportes ambientales',
        'Genera reportes auditables con la selección de filtros actual y expórtalos.') +
      kpisHtml(data, f) +
      '<div class="panel"><h2 class="panel__title">Reporte ambiental</h2>' +
        '<p class="panel__hint">Genera un reporte auditable con la selección actual (Zona/Periodo/Medio del Mapa).</p>' +
        '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="generate-report">' +
        '📄 Generar reporte ambiental</button>' +
        '<div id="report-output"></div></div>';
  }

  function filterSelect(key, label, options, selected) {
    return '<div class="field"><label class="field__label" for="dash-' + key + '">' + esc(label) + '</label>' +
      '<select class="field__control" id="dash-' + key + '" data-dash-filter="' + key + '">' +
      options.map(function (o) {
        return '<option value="' + o.v + '"' + (o.v === selected ? ' selected' : '') + '>' + esc(o.l) + '</option>';
      }).join('') + '</select></div>';
  }

  /* =======================================================
     REPORT (US36) + traceability (US39) + export/share
     ======================================================= */
  function generateReport() {
    const f = state.dashboard;
    const data = computeDashboard(f);
    const zoneLabel = f.zone === 'all' ? 'Todas las zonas' : DASH_DATA[f.zone].name;
    const modeLabel = f.mode === 'all' ? 'Todos los medios' : MODE_LABELS[f.mode];
    const now = EM.formatDate(Date.now());

    const out = document.getElementById('report-output');
    if (!out) return;
    out.innerHTML =
      '<div class="report">' +
        '<div class="report__head">' +
          '<span class="badge badge--ok">✓ Reporte generado</span>' +
          '<span class="report__id">ID: RPT-' + EM.uid().toUpperCase().slice(0, 8) + '</span>' +
        '</div>' +
        '<h3 class="report__title">Reporte de movilidad sostenible</h3>' +
        '<ul class="report__list">' +
          reportItem('CO₂ evitado agregado', data.co2Tonnes.toFixed(1) + ' t') +
          reportItem('Trayectos analizados', EM.formatNumber(data.totalTrips)) +
          reportItem('Zona', zoneLabel) +
          reportItem('Medio', modeLabel) +
          reportItem('Medio dominante', MODE_LABELS[data.topMode]) +
          reportItem('Zona líder', data.topZone.name) +
        '</ul>' +
        // US39 trazabilidad
        '<div class="report__trace">' +
          '<h4 class="report__trace-title">Trazabilidad del reporte (US39)</h4>' +
          '<p><strong>Fuente de datos:</strong> Registros GPS validados de la app EcoMove (dataset simulado).</p>' +
          '<p><strong>Método de validación:</strong> Filtro antifraude por velocidad promedio plausible + validación de trayecto.</p>' +
          '<p><strong>Periodo analizado:</strong> ' + esc(PERIOD_LABELS[f.period]) + '.</p>' +
          '<p><strong>Generado:</strong> ' + now + '.</p>' +
        '</div>' +
        // US37/US38/US40
        '<div class="report__actions">' +
          '<button class="app-btn app-btn--secondary app-btn--sm" type="button" data-action="export-pdf">⬇ Exportar PDF</button>' +
          '<button class="app-btn app-btn--secondary app-btn--sm" type="button" data-action="export-excel">⬇ Exportar Excel</button>' +
          '<button class="app-btn app-btn--ghost app-btn--sm" type="button" data-action="share-report">🔗 Compartir</button>' +
        '</div>' +
      '</div>';

    EM.showToast({ type: 'success', icon: '📄', title: 'Reporte generado',
      body: 'Reporte ambiental listo con la selección actual.' });
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function reportItem(label, value) {
    return '<li><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></li>';
  }

  function exportPdf() {   // US37 (simulado)
    EM.showToast({ type: 'success', icon: '📄', title: 'Reporte exportado',
      body: 'El reporte se exportó en formato PDF (simulado).' });
  }

  function exportExcel() { // US38 (simulado)
    EM.showToast({ type: 'success', icon: '📊', title: 'Datos exportados',
      body: 'Los datos se exportaron en formato Excel (simulado).' });
  }

  function shareReport() { // US40 (simulado)
    EM.showToast({ type: 'success', icon: '🔗', title: 'Reporte compartido',
      body: 'Se generó un enlace y se compartió el reporte (simulado).' });
  }

  /* =======================================================
     Filter change handling (US33) — recalcula de verdad
     ======================================================= */
  document.addEventListener('change', function (e) {
    const el = e.target.closest('[data-dash-filter]');
    if (!el) return;
    const key = el.getAttribute('data-dash-filter');
    state.dashboard[key] = el.value;
    EM.saveState();
    EM.navigateTo('cons-map'); // los filtros viven en la pestaña Mapa
  });

  /* ---------- Register consultant views + actions ---------- */
  EM.registerView({ id: 'cons-dashboard', profile: 'consultant', order: 1, icon: '📊', title: 'Dashboard', navLabel: 'Dashboard', render: renderConsDashboard });
  EM.registerView({ id: 'cons-map',       profile: 'consultant', order: 2, icon: '🗺️', title: 'Mapa',      navLabel: 'Mapa',      render: renderConsMap });
  EM.registerView({ id: 'cons-reports',   profile: 'consultant', order: 3, icon: '📄', title: 'Reportes',  navLabel: 'Reportes',  render: renderConsReports });

  EM.appActions['generate-report'] = generateReport;
  EM.appActions['export-pdf'] = exportPdf;
  EM.appActions['export-excel'] = exportExcel;
  EM.appActions['share-report'] = shareReport;
})();
