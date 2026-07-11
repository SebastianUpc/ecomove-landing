/* =========================================================
   EcoMove - Functional App (frontend simulado, sin backend)
   Estado en memoria + localStorage. JavaScript vanilla.
   Convenciones: camelCase, funciones descriptivas en inglés.
   ========================================================= */
(function () {
  'use strict';

  /* =======================================================
     CONSTANTS & DESIGN DATA
     ======================================================= */
  const STORAGE_KEY = 'ecomove:state:v1';
  const CREDITS_PER_KM = 10;            // US11 - Eco-Créditos proporcionales a km
  const CAR_CO2_PER_KM = 0.192;         // kg CO2 emitidos por un auto promedio / km
  const SIM_SECONDS_PER_TICK = 60;      // aceleración de la simulación: 1 s real = 1 min de viaje
                                        // (el cronómetro sigue siendo un setInterval real y en vivo)

  // US20 - Solo medios sostenibles: caminata, bicicleta, scooter eléctrico
  const TRANSPORT_MODES = {
    walk:    { id: 'walk',    label: 'Caminata',          icon: '🚶', speedKmh: 5,  co2PerKm: 0.000, maxPlausibleKmh: 12 },
    bike:    { id: 'bike',    label: 'Bicicleta',         icon: '🚲', speedKmh: 16, co2PerKm: 0.005, maxPlausibleKmh: 40 },
    scooter: { id: 'scooter', label: 'Scooter eléctrico', icon: '🛴', speedKmh: 20, co2PerKm: 0.020, maxPlausibleKmh: 45 }
  };

  /* =======================================================
     STATE (persisted)
     ======================================================= */
  function defaultState() {
    return {
      credits: { balance: 120, ledger: [
        { id: 'seed-1', type: 'earned', amount: 120, label: 'Créditos de bienvenida', date: Date.now() - 86400000 * 3 }
      ] },
      trips: [],
      redemptions: [],
      dashboard: { zone: 'all', period: '30', mode: 'all' }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (err) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* almacenamiento no disponible: el estado sigue en memoria */
    }
  }

  /* =======================================================
     SMALL HELPERS
     ======================================================= */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return (hh > 0 ? pad(hh) + ':' : '') + pad(mm) + ':' + pad(ss);
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function formatNumber(n, decimals) {
    return Number(n).toLocaleString('es-PE', {
      minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0
    });
  }

  /* =======================================================
     TOASTS & NOTIFICATIONS (US13)
     ======================================================= */
  function showToast(options) {
    const stack = $('#toast-stack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + (options.type || 'success');
    toast.setAttribute('role', options.type === 'error' ? 'alert' : 'status');
    toast.innerHTML =
      '<span class="toast__icon" aria-hidden="true">' + (options.icon || '✅') + '</span>' +
      '<div><p class="toast__title">' + escapeHtml(options.title || '') + '</p>' +
      (options.body ? '<p class="toast__body">' + escapeHtml(options.body) + '</p>' : '') + '</div>';
    stack.appendChild(toast);
    setTimeout(function () {
      toast.style.transition = 'opacity 0.3s ease';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 300);
    }, options.duration || 4200);
  }

  /* =======================================================
     MODAL
     ======================================================= */
  function openModal(html) {
    const root = $('#modal-root');
    root.innerHTML = '<div class="modal" role="document">' + html + '</div>';
    root.hidden = false;
    root.onclick = function (e) { if (e.target === root) closeModal(); };
    document.addEventListener('keydown', escToCloseModal);
  }

  function closeModal() {
    const root = $('#modal-root');
    root.hidden = true;
    root.innerHTML = '';
    document.removeEventListener('keydown', escToCloseModal);
  }

  function escToCloseModal(e) { if (e.key === 'Escape') closeModal(); }

  /* =======================================================
     VIEW REGISTRY + ROUTER
     Cada módulo funcional registra su vista. La barra de
     navegación se construye dinámicamente desde el registro.
     ======================================================= */
  const views = [];
  let activeViewId = null;

  function registerView(view) { views.push(view); }

  function renderNav() {
    const nav = $('#app-nav');
    nav.innerHTML = views.map(function (v) {
      const active = v.id === activeViewId;
      return '<button class="nav-tab' + (active ? ' nav-tab--active' : '') + '" ' +
        'type="button" data-view="' + v.id + '" aria-current="' + (active ? 'page' : 'false') + '">' +
        '<span class="nav-tab__icon" aria-hidden="true">' + v.icon + '</span>' +
        '<span>' + escapeHtml(v.navLabel || v.title) + '</span></button>';
    }).join('');
  }

  function navigateTo(viewId) {
    const view = views.find(function (v) { return v.id === viewId; });
    if (!view) return;
    activeViewId = viewId;
    const viewEl = $('#app-view');
    const inner = document.createElement('div');
    inner.className = 'app__view-inner';
    viewEl.innerHTML = '';
    viewEl.appendChild(inner);
    view.render(inner);
    $('#app-view-title').textContent = view.title;
    viewEl.scrollTop = 0;
    renderNav();
    updateBackgroundBanner();
  }

  /* =======================================================
     APP SHELL open / close
     ======================================================= */
  function openApp(viewId) {
    $('#app-shell').hidden = false;
    document.body.classList.add('app-open');
    refreshCreditsPill();
    navigateTo(viewId || (views[0] && views[0].id));
    $('#app-view').focus();
  }

  function closeApp() {
    $('#app-shell').hidden = true;
    document.body.classList.remove('app-open');
  }

  function refreshCreditsPill() {
    const el = $('#app-credits-balance');
    if (el) el.textContent = formatNumber(state.credits.balance);
  }

  /* =======================================================
     CREDITS LEDGER (base compartida; UI en módulo rewards)
     ======================================================= */
  function addCreditsEntry(type, amount, label) {
    state.credits.ledger.unshift({ id: uid(), type: type, amount: amount, label: label, date: Date.now() });
    state.credits.balance += (type === 'earned' ? amount : -amount);
    if (state.credits.balance < 0) state.credits.balance = 0;
    saveState();
    refreshCreditsPill();
  }

  /* =======================================================
     CO2 & CREDITS CALCULATIONS (US06, US11)
     ======================================================= */
  function calculateCo2Saved(distanceKm, mode) {
    // CO2 evitado = emisiones de un auto - emisiones del medio sostenible
    const modeCfg = TRANSPORT_MODES[mode];
    const saved = distanceKm * (CAR_CO2_PER_KM - modeCfg.co2PerKm);
    return Math.max(0, saved);
  }

  function calculateEcoCredits(distanceKm) {
    return Math.round(distanceKm * CREDITS_PER_KM);
  }

  /* =======================================================
     ANTIFRAUD VALIDATION (US15)
     Regla simple: la velocidad promedio no puede superar la
     máxima plausible del medio seleccionado.
     ======================================================= */
  function validateTripAntiFraud(distanceKm, durationSec, mode) {
    const modeCfg = TRANSPORT_MODES[mode];
    const hours = durationSec / 3600;
    const avgSpeed = hours > 0 ? distanceKm / hours : 0;
    if (avgSpeed > modeCfg.maxPlausibleKmh) {
      return { valid: false, avgSpeed: avgSpeed,
        reason: 'Velocidad promedio (' + avgSpeed.toFixed(1) + ' km/h) imposible para ' +
          modeCfg.label.toLowerCase() + '.' };
    }
    if (durationSec < 3) {
      return { valid: false, avgSpeed: avgSpeed, reason: 'Trayecto demasiado corto para validar.' };
    }
    return { valid: true, avgSpeed: avgSpeed, reason: 'Trayecto validado' };
  }

  /* =======================================================
     ROUTES (US16-US19) — dataset fijo simulado
     ======================================================= */
  const ROUTE_TEMPLATES = [
    { name: 'Ruta ciclovía costanera', hasBikeLane: true,  safety: 5, factor: 1.05, note: 'Ciclovía protegida junto al malecón' },
    { name: 'Ruta directa avenidas',   hasBikeLane: false, safety: 3, factor: 0.90, note: 'Más corta pero con tráfico' },
    { name: 'Ruta parques',            hasBikeLane: true,  safety: 4, factor: 1.12, note: 'Atraviesa zonas verdes' },
    { name: 'Ruta calles internas',    hasBikeLane: false, safety: 4, factor: 1.00, note: 'Calles tranquilas de bajo tránsito' }
  ];

  function generateRoutes(mode, seedShift) {
    const modeCfg = TRANSPORT_MODES[mode];
    const baseKm = 3 + ((seedShift || 0) % 3) * 0.6;
    // elegimos 3 plantillas rotando según seedShift (US19 recalcular cambia el set)
    const rotated = ROUTE_TEMPLATES.slice();
    for (let i = 0; i < (seedShift || 0) % 4; i++) rotated.push(rotated.shift());
    return rotated.slice(0, 3).map(function (tpl, i) {
      const distanceKm = +(baseKm * tpl.factor + i * 0.3).toFixed(2);
      const durationMin = Math.round((distanceKm / modeCfg.speedKmh) * 60);
      return {
        id: 'route-' + i,
        name: tpl.name,
        note: tpl.note,
        hasBikeLane: tpl.hasBikeLane,
        safety: tpl.safety,
        distanceKm: distanceKm,
        durationMin: durationMin,
        co2Kg: +calculateCo2Saved(distanceKm, mode).toFixed(2)
      };
    });
  }

  /* =======================================================
     TRIP MODULE STATE (runtime, no persistido)
     ======================================================= */
  let activeTrip = null;      // { mode, status, elapsedSec, distanceKm, intervalId }
  let selectedMode = 'bike';  // US20
  let currentRoutes = [];
  let selectedRouteId = null;
  let routeSeed = 0;
  let plannerVisible = false;
  let simulateFraud = false;  // toggle demo US15

  function accumulatedCo2() {
    return state.trips.reduce(function (sum, t) { return sum + (t.validated ? t.co2Kg : 0); }, 0);
  }

  /* ---------- TRIP CONTROL (US01-US04) ---------- */
  function startTrip() {
    if (activeTrip && activeTrip.status !== 'idle') return;
    activeTrip = {
      mode: selectedMode,
      status: 'active',
      elapsedSec: 0,
      distanceKm: 0,
      routeId: selectedRouteId,
      intervalId: null
    };
    activeTrip.intervalId = setInterval(tripTick, 1000); // US01 cronómetro real
    renderTripView($('.app__view-inner'));
    showToast({ type: 'success', icon: '🚴', title: 'Viaje iniciado',
      body: 'Registrando tu trayecto en ' + TRANSPORT_MODES[selectedMode].label.toLowerCase() + '.' });
  }

  function tripTick() {
    if (!activeTrip || activeTrip.status !== 'active') return;
    activeTrip.elapsedSec += SIM_SECONDS_PER_TICK;
    // distancia derivada del tiempo (simulado) a la velocidad del medio (avg speed plausible)
    const modeCfg = TRANSPORT_MODES[activeTrip.mode];
    activeTrip.distanceKm = +(modeCfg.speedKmh * (activeTrip.elapsedSec / 3600)).toFixed(3);
    updateLiveTripStats();
    updateBackgroundBanner();
  }

  function pauseTrip() {           // US03
    if (!activeTrip || activeTrip.status !== 'active') return;
    activeTrip.status = 'paused';
    clearInterval(activeTrip.intervalId);
    renderTripView($('.app__view-inner'));
  }

  function resumeTrip() {          // US03
    if (!activeTrip || activeTrip.status !== 'paused') return;
    activeTrip.status = 'active';
    activeTrip.intervalId = setInterval(tripTick, 1000);
    renderTripView($('.app__view-inner'));
  }

  function finishTrip() {          // US04
    if (!activeTrip) return;
    clearInterval(activeTrip.intervalId);

    let distanceKm = activeTrip.distanceKm;
    const durationSec = activeTrip.elapsedSec;
    const mode = activeTrip.mode;

    // Demo antifraude (US15): simula anomalía GPS inflando la distancia
    if (simulateFraud) distanceKm = +(distanceKm * 9 + 4).toFixed(2);

    const co2Kg = +calculateCo2Saved(distanceKm, mode).toFixed(2);
    const credits = calculateEcoCredits(distanceKm);
    const validation = validateTripAntiFraud(distanceKm, durationSec, mode);

    const trip = {
      id: uid(),
      mode: mode,
      distanceKm: +distanceKm.toFixed(2),
      durationSec: durationSec,
      co2Kg: co2Kg,
      credits: credits,
      avgSpeed: +validation.avgSpeed.toFixed(1),
      validated: validation.valid,
      date: Date.now()
    };
    state.trips.unshift(trip);

    // US11: los créditos se acreditan sólo si el trayecto queda validado
    if (validation.valid) {
      addCreditsEntry('earned', credits, 'Trayecto ' + TRANSPORT_MODES[mode].label.toLowerCase());
    }
    saveState();

    activeTrip = null;
    simulateFraud = false;
    showTripSummary(trip, validation);
    navigateTo('trip');
  }

  /* ---------- TRIP SUMMARY MODAL (US04, US06) ---------- */
  function showTripSummary(trip, validation) {
    const modeCfg = TRANSPORT_MODES[trip.mode];
    const validBadge = validation.valid
      ? '<span class="badge badge--ok">✓ Trayecto validado</span>'
      : '<span class="badge badge--warn">✕ No validado (antifraude)</span>';

    openModal(
      '<div class="modal__header">' +
        '<span class="modal__icon" aria-hidden="true">' + (validation.valid ? '🎉' : '⚠️') + '</span>' +
        '<h2 class="modal__title">' + (validation.valid ? '¡Viaje completado!' : 'Viaje no validado') + '</h2>' +
        '<p class="modal__subtitle">' + escapeHtml(modeCfg.label) + ' · ' + formatDate(trip.date) + '</p>' +
        '<div class="modal__badge">' + validBadge + '</div>' +
      '</div>' +
      '<div class="modal__body">' +
        '<div class="summary-grid">' +
          summaryStat(trip.distanceKm.toFixed(2) + ' km', 'Distancia') +
          summaryStat(formatDuration(trip.durationSec), 'Tiempo') +
          summaryStat(trip.co2Kg.toFixed(2) + ' kg', 'CO₂ ahorrado') +
          summaryStat((validation.valid ? '+' + trip.credits : '0') + ' pts',
            validation.valid ? 'Eco-Créditos acreditados' : 'Eco-Créditos (rechazados)') +
        '</div>' +
        (validation.valid ? '' :
          '<p class="form-state form-state--error" style="margin-top:14px">' +
          escapeHtml(validation.reason) + '</p>') +
      '</div>' +
      '<div class="modal__footer">' +
        '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="close-modal">Entendido</button>' +
      '</div>'
    );

    if (validation.valid) {
      // US13: notificación de recompensa
      showToast({ type: 'reward', icon: '★', title: '+' + trip.credits + ' Eco-Créditos',
        body: 'Recompensa acreditada por tu trayecto validado.' });
    } else {
      showToast({ type: 'error', icon: '🛡️', title: 'Trayecto rechazado',
        body: validation.reason });
    }
  }

  function summaryStat(value, label) {
    return '<div class="stat"><span class="stat__value">' + escapeHtml(value) +
      '</span><span class="stat__label">' + escapeHtml(label) + '</span></div>';
  }

  /* ---------- LIVE STAT UPDATES (sin re-render completo) ---------- */
  function updateLiveTripStats() {
    if (!activeTrip) return;
    const timerEl = $('#trip-timer');
    if (timerEl) timerEl.textContent = formatDuration(activeTrip.elapsedSec);
    const distEl = $('#trip-live-distance');
    if (distEl) distEl.textContent = activeTrip.distanceKm.toFixed(2) + ' km';
    const co2El = $('#trip-live-co2');
    if (co2El) co2El.textContent = calculateCo2Saved(activeTrip.distanceKm, activeTrip.mode).toFixed(2) + ' kg';
    const credEl = $('#trip-live-credits');
    if (credEl) credEl.textContent = '~' + calculateEcoCredits(activeTrip.distanceKm) + ' pts';
  }

  /* ---------- BACKGROUND BANNER (US02) ---------- */
  function updateBackgroundBanner() {
    const banner = $('#app-bg-banner');
    if (!banner) return;
    const tripActive = activeTrip && (activeTrip.status === 'active' || activeTrip.status === 'paused');
    if (tripActive && activeViewId !== 'trip') {
      banner.hidden = false;
      $('#app-bg-banner-text').textContent =
        (activeTrip.status === 'paused' ? 'Viaje en pausa · ' : 'Registrando en segundo plano · ') +
        TRANSPORT_MODES[activeTrip.mode].label + ' · ' +
        formatDuration(activeTrip.elapsedSec) + ' · ' + activeTrip.distanceKm.toFixed(2) + ' km';
    } else {
      banner.hidden = true;
    }
  }

  /* ---------- MODE SELECTION (US20) ---------- */
  function selectMode(modeId) {
    if (activeTrip) return; // no cambiar de medio con viaje en curso
    selectedMode = modeId;
    currentRoutes = [];
    selectedRouteId = null;
    renderTripView($('.app__view-inner'));
  }

  /* ---------- ROUTE ACTIONS (US16-US19) ---------- */
  function showRoutes() {
    plannerVisible = true;
    currentRoutes = generateRoutes(selectedMode, routeSeed);
    // US18: recomendar la ruta más segura por defecto
    selectedRouteId = recommendedRouteId();
    renderTripView($('.app__view-inner'));
  }

  function recommendedRouteId() {
    let best = currentRoutes[0];
    currentRoutes.forEach(function (r) { if (r.safety > best.safety) best = r; });
    return best ? best.id : null;
  }

  function recalculateRoutes() {   // US19
    routeSeed += 1;
    currentRoutes = generateRoutes(selectedMode, routeSeed);
    selectedRouteId = recommendedRouteId();
    renderTripView($('.app__view-inner'));
    showToast({ type: 'success', icon: '🗺️', title: 'Ruta recalculada',
      body: 'Se actualizaron las opciones de ruta.' });
  }

  function selectRoute(routeId) {
    selectedRouteId = routeId;
    renderTripView($('.app__view-inner'));
  }

  /* =======================================================
     TRIP VIEW RENDER (US01-07, US16-20)
     ======================================================= */
  function renderTripView(container) {
    if (!container) return;
    let html = '';

    // Encabezado + CO2 acumulado (US07)
    html +=
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Registro de trayecto</span>' +
        '<h1 class="view-head__title">Tu viaje sostenible</h1>' +
        '<p class="view-head__subtitle">Inicia, pausa y finaliza tu trayecto para ganar Eco-Créditos.</p>' +
      '</header>';

    html +=
      '<div class="stat-grid" style="margin-bottom:16px">' +
        '<div class="stat stat--yellow"><span class="stat__value">' + formatNumber(state.credits.balance) +
          '</span><span class="stat__label">Eco-Créditos</span></div>' +
        '<div class="stat"><span class="stat__value">' + accumulatedCo2().toFixed(1) +
          '</span><span class="stat__label">kg CO₂ acumulado</span></div>' +
        '<div class="stat"><span class="stat__value">' + state.trips.length +
          '</span><span class="stat__label">Viajes</span></div>' +
      '</div>';

    // Selector de medio (US20)
    html += '<div class="panel"><h2 class="panel__title">Medio sostenible</h2>' +
      '<div class="mode-selector">' +
      Object.keys(TRANSPORT_MODES).map(function (id) {
        const m = TRANSPORT_MODES[id];
        const active = id === (activeTrip ? activeTrip.mode : selectedMode);
        return '<button class="mode-option' + (active ? ' mode-option--active' : '') + '" type="button" ' +
          'data-mode="' + id + '"' + (activeTrip ? ' disabled' : '') + ' aria-pressed="' + active + '">' +
          '<span class="mode-option__icon" aria-hidden="true">' + m.icon + '</span>' +
          '<span>' + m.label + '</span></button>';
      }).join('') +
      '</div></div>';

    // Planificador de ruta (US16-US19)
    html += renderRoutePlanner();

    // Control del viaje (US01-US04)
    html += renderTripTracker();

    container.innerHTML = html;
    updateLiveTripStats();
  }

  function renderRoutePlanner() {
    let html = '<div class="panel"><h2 class="panel__title">Planificar ruta</h2>';
    html +=
      '<div class="route-planner__fields">' +
        '<div class="field"><label class="field__label" for="route-origin">Origen</label>' +
          '<input class="field__control" id="route-origin" type="text" value="Mi ubicación" ' +
          'placeholder="Punto de partida"></div>' +
        '<div class="field"><label class="field__label" for="route-destination">Destino</label>' +
          '<input class="field__control" id="route-destination" type="text" value="Parque Kennedy, Miraflores" ' +
          'placeholder="¿A dónde vas?"></div>' +
      '</div>';
    html += '<button class="app-btn app-btn--secondary app-btn--block" type="button" data-action="show-routes">' +
      '🔍 Ver rutas sostenibles</button>';

    if (plannerVisible && currentRoutes.length) {
      html += '<p class="panel__hint" style="margin-top:14px">Comparación de rutas (US17). ' +
        'Marcamos la más segura como recomendada.</p>';
      html += '<div class="route-list">';
      currentRoutes.forEach(function (r) {
        const isRecommended = r.id === recommendedRouteId();
        const isSelected = r.id === selectedRouteId;
        html +=
          '<button class="route-card' + (isSelected ? ' route-card--selected' : '') +
            (isRecommended ? ' route-card--recommended' : '') + '" type="button" data-route="' + r.id + '">' +
            '<div class="route-card__head">' +
              '<span class="route-card__name">' + escapeHtml(r.name) + '</span>' +
              (isSelected ? '<span class="badge badge--ok">Seleccionada</span>' : '') +
            '</div>' +
            '<div class="route-card__meta">' +
              '<span><strong>' + r.distanceKm.toFixed(2) + ' km</strong> distancia</span>' +
              '<span><strong>' + r.durationMin + ' min</strong> aprox.</span>' +
              '<span><strong>' + r.co2Kg.toFixed(2) + ' kg</strong> CO₂ evitado</span>' +
            '</div>' +
            '<div class="route-card__badges">' +
              (r.hasBikeLane
                ? '<span class="badge badge--ok">🚲 Ciclovía</span>'
                : '<span class="badge badge--neutral">Sin ciclovía</span>') +
              '<span class="badge badge--neutral">Seguridad ' + '★'.repeat(r.safety) + '</span>' +
              (isRecommended ? '<span class="badge badge--yellow">✓ Recomendada (más segura)</span>' : '') +
            '</div>' +
          '</button>';
      });
      html += '</div>';
      html += '<button class="app-btn app-btn--ghost app-btn--block" type="button" ' +
        'data-action="recalculate-routes" style="margin-top:10px">🔄 Recalcular ruta</button>';
    }
    html += '</div>';
    return html;
  }

  function renderTripTracker() {
    const status = activeTrip ? activeTrip.status : 'idle';
    const mode = activeTrip ? activeTrip.mode : selectedMode;
    const modeCfg = TRANSPORT_MODES[mode];
    const elapsed = activeTrip ? activeTrip.elapsedSec : 0;
    const distance = activeTrip ? activeTrip.distanceKm : 0;

    const statusMap = {
      idle:   { cls: 'idle',   label: 'Listo para iniciar' },
      active: { cls: 'active', label: '● En curso' },
      paused: { cls: 'paused', label: '❚❚ En pausa' }
    };
    const st = statusMap[status];

    let controls = '';
    if (status === 'idle') {
      controls = '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="start-trip">' +
        '▶ Iniciar viaje</button>';
    } else if (status === 'active') {
      controls = '<div class="app-btn-row">' +
        '<button class="app-btn app-btn--warning" type="button" data-action="pause-trip">❚❚ Pausar</button>' +
        '<button class="app-btn app-btn--danger" type="button" data-action="finish-trip">■ Finalizar</button>' +
        '</div>';
    } else if (status === 'paused') {
      controls = '<div class="app-btn-row">' +
        '<button class="app-btn app-btn--primary" type="button" data-action="resume-trip">▶ Reanudar</button>' +
        '<button class="app-btn app-btn--danger" type="button" data-action="finish-trip">■ Finalizar</button>' +
        '</div>';
    }

    return '<div class="panel trip-tracker">' +
      '<span class="trip-tracker__status trip-tracker__status--' + st.cls + '">' + st.label + '</span>' +
      '<div class="trip-tracker__timer" id="trip-timer" aria-live="off">' + formatDuration(elapsed) + '</div>' +
      '<p class="trip-tracker__mode-label">' + modeCfg.icon + ' ' + escapeHtml(modeCfg.label) +
        (status !== 'idle' ? ' · <em>tiempo simulado acelerado</em>' : '') + '</p>' +
      '<div class="trip-tracker__live-stats">' +
        '<div class="stat"><span class="stat__value" id="trip-live-distance">' + distance.toFixed(2) +
          ' km</span><span class="stat__label">Distancia</span></div>' +
        '<div class="stat"><span class="stat__value" id="trip-live-co2">' +
          calculateCo2Saved(distance, mode).toFixed(2) + ' kg</span><span class="stat__label">CO₂ evitado</span></div>' +
        '<div class="stat stat--yellow"><span class="stat__value" id="trip-live-credits">~' +
          calculateEcoCredits(distance) + ' pts</span><span class="stat__label">Estimados</span></div>' +
      '</div>' +
      controls +
      (status === 'idle'
        ? '<label class="antifraud-toggle"><input type="checkbox" id="simulate-fraud"' +
          (simulateFraud ? ' checked' : '') + '> Simular anomalía GPS (prueba antifraude US15)</label>'
        : '') +
      '</div>';
  }

  /* =======================================================
     HISTORY VIEW (US05 + US07)
     ======================================================= */
  function renderHistoryView(container) {
    let html =
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Historial</span>' +
        '<h1 class="view-head__title">Tus trayectos</h1>' +
        '<p class="view-head__subtitle">Revisa cada viaje registrado y tu impacto acumulado.</p>' +
      '</header>';

    const validCount = state.trips.filter(function (t) { return t.validated; }).length;
    const totalDistance = state.trips.reduce(function (s, t) { return s + t.distanceKm; }, 0);

    html +=
      '<div class="stat-grid" style="margin-bottom:16px">' +
        '<div class="stat stat--dark"><span class="stat__value">' + accumulatedCo2().toFixed(1) +
          '</span><span class="stat__label">kg CO₂ acumulado</span></div>' +
        '<div class="stat"><span class="stat__value">' + totalDistance.toFixed(1) +
          '</span><span class="stat__label">km totales</span></div>' +
        '<div class="stat"><span class="stat__value">' + validCount + '/' + state.trips.length +
          '</span><span class="stat__label">Validados</span></div>' +
      '</div>';

    if (!state.trips.length) {
      html += '<div class="panel"><div class="empty-state">' +
        '<span class="empty-state__icon" aria-hidden="true">🚲</span>' +
        '<p class="empty-state__text">Aún no tienes viajes. ¡Inicia tu primer trayecto sostenible!</p>' +
        '</div></div>';
    } else {
      html += '<div class="list">';
      state.trips.forEach(function (t) {
        const m = TRANSPORT_MODES[t.mode];
        html +=
          '<div class="list-row">' +
            '<span class="list-row__icon" aria-hidden="true">' + m.icon + '</span>' +
            '<div class="list-row__body">' +
              '<p class="list-row__title">' + escapeHtml(m.label) + ' · ' + t.distanceKm.toFixed(2) + ' km</p>' +
              '<p class="list-row__sub">' + formatDate(t.date) + ' · ' + formatDuration(t.durationSec) +
                ' · ' + t.co2Kg.toFixed(2) + ' kg CO₂' + '</p>' +
              '<p class="list-row__sub">' + (t.validated
                ? '<span class="badge badge--ok">✓ Validado</span>'
                : '<span class="badge badge--warn">✕ No validado</span>') + '</p>' +
            '</div>' +
            '<span class="list-row__amount ' + (t.validated ? 'list-row__amount--plus' : '') + '">' +
              (t.validated ? '+' + t.credits : '0') + ' pts</span>' +
          '</div>';
      });
      html += '</div>';
    }
    container.innerHTML = html;
  }

  /* =======================================================
     REGISTER TRIP-TRACKING VIEWS
     ======================================================= */
  registerView({ id: 'trip', icon: '🚴', title: 'Viaje', navLabel: 'Viaje', render: renderTripView });
  registerView({ id: 'history', icon: '🕘', title: 'Historial', navLabel: 'Historial', render: renderHistoryView });

  /* =======================================================
     EVENT DELEGATION inside the app
     ======================================================= */
  function handleAppClick(e) {
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) { selectMode(modeBtn.getAttribute('data-mode')); return; }

    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) { selectRoute(routeBtn.getAttribute('data-route')); return; }

    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) { navigateTo(viewBtn.getAttribute('data-view')); return; }

    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    const handler = appActions[action];
    if (handler) handler(actionBtn);
  }

  const appActions = {
    'start-trip': startTrip,
    'pause-trip': pauseTrip,
    'resume-trip': resumeTrip,
    'finish-trip': finishTrip,
    'show-routes': showRoutes,
    'recalculate-routes': recalculateRoutes,
    'close-modal': closeModal
  };

  function handleAppChange(e) {
    if (e.target.id === 'simulate-fraud') simulateFraud = e.target.checked;
  }

  /* =======================================================
     LANDING PAGE WIRING
     ======================================================= */
  function wireLandingButtons() {
    // Botones "Empezar ahora" abren la app funcional
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (btn) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'empezar ahora') {
        btn.addEventListener('click', function () { openApp('trip'); });
      }
    });
    // "Solicitar demo" (anchors) ya navegan al formulario de contacto por #hash.
  }

  function wireContactForms() {
    ['#contact-form-desktop', '#contact-form-mobile'].forEach(function (sel) {
      const form = $(sel);
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const errorEl = form.querySelector('.form-state--error');
        const confirmEl = form.querySelector('.form-state--confirm');
        const valid = form.checkValidity();
        if (!valid) {
          errorEl.hidden = false;
          confirmEl.hidden = true;
          form.reportValidity();
          return;
        }
        errorEl.hidden = true;
        confirmEl.hidden = false;
        form.reset();
        showToast({ type: 'success', icon: '✉️', title: 'Consulta enviada',
          body: 'Gracias por escribirnos. Te responderemos pronto.' });
      });
    });
  }

  function wireMobileMenu() {
    const btn = $('#mobile-menu-btn');
    const nav = $('#mobile-nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      const open = nav.hidden;
      nav.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '✕' : '☰';
    });
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () {
        nav.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = '☰';
      });
    });
  }

  /* =======================================================
     INIT
     ======================================================= */
  function init() {
    wireLandingButtons();
    wireContactForms();
    wireMobileMenu();

    $('#app-close').addEventListener('click', closeApp);
    // Delegación global: cubre app-view, nav, banner y modal (que viven fuera de app-view)
    document.addEventListener('click', handleAppClick);
    document.addEventListener('change', handleAppChange);
    $('#app-bg-banner').addEventListener('click', function () { navigateTo('trip'); });
    $('#app-credits-pill').addEventListener('click', function () {
      // El módulo de créditos registra la vista 'credits'; si aún no existe, vamos a inicio.
      navigateTo(views.some(function (v) { return v.id === 'credits'; }) ? 'credits' : 'trip');
    });

    // refresco periódico del banner de segundo plano (US02)
    setInterval(updateBackgroundBanner, 1000);
  }

  /* =======================================================
     PUBLIC API for sibling module scripts (rewards, dashboard)
     Se expone de forma síncrona para que rewards.js y
     dashboard.js puedan registrar sus vistas al cargarse.
     ======================================================= */
  window.EcoMove = {
    state: state, saveState: saveState, registerView: registerView, navigateTo: navigateTo,
    openModal: openModal, closeModal: closeModal, showToast: showToast,
    addCreditsEntry: addCreditsEntry, refreshCreditsPill: refreshCreditsPill,
    escapeHtml: escapeHtml, formatDate: formatDate, formatNumber: formatNumber,
    formatDuration: formatDuration, uid: uid, appActions: appActions,
    TRANSPORT_MODES: TRANSPORT_MODES
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
