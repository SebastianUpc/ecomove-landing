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
  const SIM_SECONDS_PER_TICK = 1;       // tiempo real: 1 s real = 1 s de viaje

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
      dashboard: { zone: 'all', period: '30', mode: 'all' },
      membership: { status: 'none', activatedAt: null, trialEndsAt: null, renewsAt: null },
      auth: { loggedIn: false, name: null, email: null }
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

  function formatDay(ts) {
    return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
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
  let currentProfile = null;   // 'eco' | 'consultant' | null (pantalla de selección)

  // Dos experiencias separadas (perfiles) según el diseño de Figma
  const PROFILES = {
    eco:        { label: 'Eco-usuario',          icon: '🌿', userName: 'Alex Ríos' },
    consultant: { label: 'Consultor ambiental',  icon: '📊', userName: 'Dra. Elena Vargas' }
  };

  function registerView(view) { views.push(view); }

  function profileViews(profile) {
    return views
      .filter(function (v) { return v.profile === profile; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function renderNav() {
    const nav = $('#app-nav');
    if (!currentProfile) { nav.hidden = true; nav.innerHTML = ''; return; }
    nav.hidden = false;
    // clase modificadora por perfil => cada menú se ve visualmente distinto
    nav.className = 'app__nav app__nav--' + currentProfile;
    nav.innerHTML = profileViews(currentProfile).filter(function (v) { return !v.hidden; }).map(function (v) {
      const active = v.id === activeViewId;
      return '<button class="nav-tab' + (active ? ' nav-tab--active' : '') + '" ' +
        'type="button" data-view="' + v.id + '" aria-current="' + (active ? 'page' : 'false') + '">' +
        '<span class="nav-tab__icon" aria-hidden="true">' + v.icon + '</span>' +
        '<span>' + escapeHtml(v.navLabel || v.title) + '</span></button>';
    }).join('');
  }

  function navigateTo(viewId) {
    let view = views.find(function (v) { return v.id === viewId; });
    if (!view) return;
    // Bloqueo por membresía: sin activar (o vencida) el consultor no entra a sus vistas
    const gateId = membershipGateRedirect(view);
    if (gateId && gateId !== view.id) {
      view = views.find(function (v) { return v.id === gateId; });
      if (!view) return;
    }
    activeViewId = view.id;
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

  function rerenderCurrent() { if (activeViewId) navigateTo(activeViewId); }

  /* =======================================================
     AUTH — LOGIN / REGISTRO (pantallas 02-03 del wireflow)
     Autenticación simulada, sin backend: valida campos y
     transiciona. Compartida por ambos perfiles; la sesión se
     recuerda en localStorage (state.auth.loggedIn).
     ======================================================= */
  function showAuthScreen(mode) {
    currentProfile = null;
    activeViewId = null;
    const viewEl = $('#app-view');
    const inner = document.createElement('div');
    inner.className = 'app__view-inner';
    viewEl.innerHTML = '';
    viewEl.appendChild(inner);
    if (mode === 'register') renderRegisterScreen(inner); else renderLoginScreen(inner);
    $('#app-view-title').textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    $('#app-credits-pill').hidden = true;
    viewEl.scrollTop = 0;
    renderNav();
    updateBackgroundBanner();
  }

  function authField(id, label, type, placeholder) {
    return '<div class="field"><label class="field__label" for="' + id + '">' + label + '</label>' +
      '<input class="field__control" id="' + id + '" type="' + type + '" placeholder="' + placeholder + '"></div>';
  }

  function renderLoginScreen(container) {
    container.innerHTML =
      '<div class="auth">' +
        '<header class="view-head auth__head">' +
          '<span class="view-head__eyebrow">Bienvenido de vuelta</span>' +
          '<h1 class="view-head__title">Iniciar sesión</h1>' +
          '<p class="view-head__subtitle">Ingresa a tu cuenta para continuar.</p>' +
        '</header>' +
        '<div class="panel auth__panel">' +
          authField('login-email', 'Correo electrónico', 'email', 'correo@ejemplo.com') +
          authField('login-password', 'Contraseña', 'password', '••••••••') +
          '<div class="auth__forgot-row">' +
            '<button class="auth__link" type="button" data-action="auth-forgot">¿Olvidaste tu contraseña?</button>' +
          '</div>' +
          '<p class="form-state form-state--error auth__error" id="login-error" role="alert" hidden></p>' +
          '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="auth-login">Ingresar</button>' +
          '<button class="app-btn app-btn--secondary app-btn--block" type="button" data-action="auth-google">' +
            '<span class="auth__gicon" aria-hidden="true">G</span> Continuar con Google</button>' +
        '</div>' +
        '<p class="auth__switch">¿No tienes cuenta? ' +
          '<button class="auth__link" type="button" data-action="auth-goto-register">Registrarse</button></p>' +
        '<p class="auth__hint">Al ingresar aceptas los términos y privacidad</p>' +
      '</div>';
  }

  function renderRegisterScreen(container) {
    container.innerHTML =
      '<div class="auth">' +
        '<button class="auth__back" type="button" data-action="auth-goto-login" ' +
          'aria-label="Volver a iniciar sesión">←</button>' +
        '<header class="view-head auth__head">' +
          '<span class="view-head__eyebrow">Únete a EcoMove</span>' +
          '<h1 class="view-head__title">Crear cuenta</h1>' +
          '<p class="view-head__subtitle">Regístrate para empezar a moverte sostenible.</p>' +
        '</header>' +
        '<div class="panel auth__panel">' +
          authField('reg-name', 'Nombre completo', 'text', 'Nombre y apellido') +
          authField('reg-email', 'Correo electrónico', 'email', 'correo@ejemplo.com') +
          authField('reg-password', 'Contraseña', 'password', '••••••••') +
          authField('reg-password2', 'Confirmar contraseña', 'password', '••••••••') +
          '<label class="auth__terms"><input type="checkbox" id="reg-terms"> Acepto términos y condiciones</label>' +
          '<p class="form-state form-state--error auth__error" id="reg-error" role="alert" hidden></p>' +
          '<button class="app-btn app-btn--primary app-btn--block" type="button" id="reg-submit" ' +
            'data-action="auth-register" disabled>Crear cuenta</button>' +
          '<p class="auth__hint">Usa un correo válido para recibir confirmaciones</p>' +
        '</div>' +
        '<p class="auth__switch">' +
          '<button class="auth__link" type="button" data-action="auth-goto-login">Ya tengo una cuenta</button></p>' +
      '</div>';
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showAuthError(id, message) {
    const el = $('#' + id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function submitLogin() {
    const email = ($('#login-email').value || '').trim();
    const password = $('#login-password').value || '';
    if (!email || !password) {
      showAuthError('login-error', 'Completa correo y contraseña para ingresar.');
      return;
    }
    if (!isValidEmail(email)) {
      showAuthError('login-error', 'Ingresa un correo electrónico válido.');
      return;
    }
    completeAuth(email, null, 'Sesión iniciada');
  }

  function submitRegister() {
    const name = ($('#reg-name').value || '').trim();
    const email = ($('#reg-email').value || '').trim();
    const password = $('#reg-password').value || '';
    const password2 = $('#reg-password2').value || '';
    if (!name || !email || !password || !password2) {
      showAuthError('reg-error', 'Completa todos los campos para crear tu cuenta.');
      return;
    }
    if (!isValidEmail(email)) {
      showAuthError('reg-error', 'Ingresa un correo electrónico válido.');
      return;
    }
    if (password !== password2) {
      showAuthError('reg-error', 'Las contraseñas no coinciden.');
      return;
    }
    if (!$('#reg-terms').checked) {
      showAuthError('reg-error', 'Debes aceptar los términos y condiciones.');
      return;
    }
    completeAuth(email, name, 'Cuenta creada');
  }

  function completeAuth(email, name, toastTitle) {
    state.auth.loggedIn = true;
    state.auth.email = email;
    if (name) state.auth.name = name;
    saveState();
    showToast({ type: 'success', icon: '👋', title: toastTitle,
      body: 'Bienvenido a EcoMove. Elige cómo quieres continuar.' });
    showProfileSelection();
  }

  /* =======================================================
     USER-TYPE SELECTION + PROFILE SCREENS
     ======================================================= */
  function showProfileSelection() {
    currentProfile = null;
    activeViewId = null;
    const viewEl = $('#app-view');
    const inner = document.createElement('div');
    inner.className = 'app__view-inner';
    viewEl.innerHTML = '';
    viewEl.appendChild(inner);
    renderProfileSelection(inner);
    $('#app-view-title').textContent = 'EcoMove';
    $('#app-credits-pill').hidden = true;
    viewEl.scrollTop = 0;
    renderNav();
    updateBackgroundBanner();
  }

  function renderProfileSelection(container) {
    container.innerHTML =
      '<div class="profile-select">' +
        '<header class="view-head profile-select__head">' +
          '<span class="view-head__eyebrow">Bienvenido a EcoMove</span>' +
          '<h1 class="view-head__title">¿Cómo quieres continuar?</h1>' +
          '<p class="view-head__subtitle">Elige con qué experiencia deseas ingresar.</p>' +
        '</header>' +
        '<button class="profile-card profile-card--eco" type="button" data-action="select-eco">' +
          '<span class="profile-card__icon" aria-hidden="true">🌿</span>' +
          '<span class="profile-card__title">Continuar como eco-usuario</span>' +
          '<span class="profile-card__desc">Registra viajes sostenibles, gana Eco-Créditos y canjéalos por recompensas.</span>' +
        '</button>' +
        '<button class="profile-card profile-card--consultant" type="button" data-action="select-consultant">' +
          '<span class="profile-card__icon" aria-hidden="true">📊</span>' +
          '<span class="profile-card__title">Continuar como consultor ambiental</span>' +
          '<span class="profile-card__desc">Analiza métricas agregadas de movilidad y genera reportes ambientales.</span>' +
        '</button>' +
      '</div>';
  }

  function selectProfile(profile) {
    currentProfile = profile;
    $('#app-credits-pill').hidden = (profile !== 'eco');
    const first = profileViews(profile).filter(function (v) { return !v.hidden; })[0];
    if (first) navigateTo(first.id);
  }

  // Pantalla "Perfil" (compartida por ambos perfiles; usa currentProfile)
  function renderProfileScreen(container) {
    const p = PROFILES[currentProfile] || PROFILES.eco;
    container.innerHTML =
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Perfil</span>' +
        '<h1 class="view-head__title">Mi perfil</h1>' +
        '<p class="view-head__subtitle">Gestiona tu sesión y tu tipo de experiencia.</p>' +
      '</header>' +
      '<div class="panel profile-panel">' +
        '<span class="profile-panel__avatar" aria-hidden="true">' + p.icon + '</span>' +
        '<p class="profile-panel__name">' + escapeHtml(p.userName) + '</p>' +
        '<span class="badge badge--ok">' + escapeHtml(p.label) + '</span>' +
      '</div>' +
      (currentProfile === 'consultant' ? membershipProfileSectionHtml() : '') +
      '<button class="app-btn app-btn--secondary app-btn--block" type="button" data-action="change-profile" ' +
        'style="margin-bottom:10px">🔄 Cambiar de perfil</button>' +
      '<button class="app-btn app-btn--ghost app-btn--block" type="button" data-action="logout">🚪 Cerrar sesión</button>';
  }

  /* =======================================================
     CONSULTANT MEMBERSHIP — plan único "EcoMove Consultor"
     Prueba gratis 7 días (sin tarjeta) → pago S/19.90/mes.
     Estados: none | trial | active | expired. El flujo del
     eco-usuario no pasa por aquí.
     ======================================================= */
  const MEMBERSHIP_PLAN = { name: 'EcoMove Consultor', priceLabel: 'S/19.90', periodLabel: 'mes', trialDays: 7 };
  const DAY_MS = 86400000;

  const MEMBERSHIP_BENEFITS = [
    'Dashboard completo: KPIs, tendencias y tabla histórica',
    'Mapa de calor con filtros por zona/distrito',
    'Reportes trazables, exportables PDF/Excel',
    'Histórico de 12 meses y alertas de zonas críticas',
    'Multi-dispositivo (web + móvil) y soporte prioritario',
    'Sin límite de zonas'
  ];

  function membership() {
    const m = state.membership;
    // sin backend, el vencimiento se deriva al momento de leer el estado
    if (m.status === 'trial' && m.trialEndsAt && Date.now() > m.trialEndsAt) { m.status = 'expired'; saveState(); }
    if (m.status === 'active' && m.renewsAt && Date.now() > m.renewsAt) { m.status = 'expired'; saveState(); }
    return m;
  }

  function trialDaysLeft() {
    const m = state.membership;
    if (!m.trialEndsAt) return 0;
    return Math.max(0, Math.ceil((m.trialEndsAt - Date.now()) / DAY_MS));
  }

  // Fecha relevante según cómo terminó/termina el plan (prueba o renovación)
  function membershipKeyDate(m) { return m.trialEndsAt || m.renewsAt; }

  // Devuelve la vista a la que hay que redirigir si la membresía bloquea `view`
  function membershipGateRedirect(view) {
    if (view.profile !== 'consultant' || view.id === 'cons-membership') return null;
    const m = membership();
    if (m.status === 'none') return 'cons-membership';
    if (m.status === 'expired' && view.id !== 'cons-profile') return 'cons-membership';
    return null;
  }

  function activateTrial() {
    const m = state.membership;
    if (m.status !== 'none') return;
    m.status = 'trial';
    m.activatedAt = Date.now();
    m.trialEndsAt = Date.now() + MEMBERSHIP_PLAN.trialDays * DAY_MS;
    saveState();
    showToast({ type: 'success', icon: '🎁', title: 'Prueba gratis activada',
      body: 'Acceso total por ' + MEMBERSHIP_PLAN.trialDays + ' días, hasta el ' + formatDay(m.trialEndsAt) + '.' });
    navigateTo('cons-dashboard');
  }

  function confirmMembershipPayment() {
    const m = state.membership;
    // si el plan sigue vigente, la renovación se extiende desde la fecha actual de renovación
    const base = (m.status === 'active' && m.renewsAt && m.renewsAt > Date.now()) ? m.renewsAt : Date.now();
    m.status = 'active';
    m.trialEndsAt = null;
    m.renewsAt = base + 30 * DAY_MS;
    saveState();
    closeModal();
    showToast({ type: 'success', icon: '💳', title: 'Pago confirmado (simulado)',
      body: 'Plan ' + MEMBERSHIP_PLAN.name + ' activo. Próxima renovación: ' + formatDay(m.renewsAt) + '.' });
    if (activeViewId === 'cons-membership') navigateTo('cons-dashboard'); else rerenderCurrent();
  }

  /* ---------- Badge discreto para Dashboard/Mapa/Reportes ---------- */
  function membershipBadgeHtml() {
    const m = membership();
    if (m.status === 'trial') {
      const days = trialDaysLeft();
      return '<div class="membership-strip"><span class="badge badge--yellow">🎁 Prueba gratis · ' +
        days + (days === 1 ? ' día restante' : ' días restantes') + '</span></div>';
    }
    if (m.status === 'active') {
      return '<div class="membership-strip"><span class="badge badge--ok">✓ Plan activo</span></div>';
    }
    return '';
  }

  /* ---------- Pantalla de activación / bloqueo (antes de la 18) ---------- */
  function renderMembershipGate(container) {
    const m = membership();
    if (m.status === 'expired') { renderMembershipExpired(container, m); return; }
    container.innerHTML =
      '<div class="membership-gate">' +
        '<header class="view-head membership-gate__head">' +
          '<span class="view-head__eyebrow">Membresía</span>' +
          '<h1 class="view-head__title">Activa tu membresía de consultor</h1>' +
          '<p class="view-head__subtitle">Para acceder al dashboard ambiental necesitas activar el plan ' +
            MEMBERSHIP_PLAN.name + '.</p>' +
        '</header>' +
        '<div class="panel membership-plan">' +
          '<span class="badge badge--yellow">Prueba gratis ' + MEMBERSHIP_PLAN.trialDays + ' días</span>' +
          '<h2 class="membership-plan__name">' + MEMBERSHIP_PLAN.name + '</h2>' +
          '<p class="membership-plan__price">' + MEMBERSHIP_PLAN.priceLabel +
            '<span class="membership-plan__period">/' + MEMBERSHIP_PLAN.periodLabel + '</span></p>' +
          '<ul class="check-list membership-plan__list">' +
            MEMBERSHIP_BENEFITS.map(function (b) {
              return '<li><span class="check-icon">✓</span> ' + escapeHtml(b) + '</li>';
            }).join('') +
          '</ul>' +
          '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="activate-trial">' +
            '🎁 Activar prueba gratis</button>' +
          '<p class="membership-plan__note">Sin tarjeta para empezar · Cancela cuando quieras. ' +
            'Al terminar la prueba podrás confirmar el pago desde tu perfil.</p>' +
        '</div>' +
        '<button class="app-btn app-btn--ghost app-btn--block" type="button" data-action="change-profile">' +
          '← Volver a la selección de perfil</button>' +
      '</div>';
  }

  function renderMembershipExpired(container, m) {
    container.innerHTML =
      '<div class="membership-gate">' +
        '<header class="view-head membership-gate__head">' +
          '<span class="view-head__eyebrow">Membresía</span>' +
          '<h1 class="view-head__title">Membresía vencida</h1>' +
          '<p class="view-head__subtitle">El acceso a Dashboard, Mapa y Reportes está bloqueado hasta reactivar tu plan.</p>' +
        '</header>' +
        '<div class="panel membership-plan">' +
          '<span class="badge badge--warn">⚠ Vencida el ' + formatDay(membershipKeyDate(m)) + '</span>' +
          '<h2 class="membership-plan__name">' + MEMBERSHIP_PLAN.name + '</h2>' +
          '<p class="membership-plan__price">' + MEMBERSHIP_PLAN.priceLabel +
            '<span class="membership-plan__period">/' + MEMBERSHIP_PLAN.periodLabel + '</span></p>' +
          '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="open-payment">' +
            '🔄 Reactivar membresía</button>' +
          '<p class="membership-plan__note">Recuperarás el acceso total apenas confirmes el pago.</p>' +
        '</div>' +
        '<button class="app-btn app-btn--ghost app-btn--block" type="button" data-action="change-profile">' +
          '← Volver a la selección de perfil</button>' +
      '</div>';
  }

  /* ---------- Sección "Mi membresía" (pantalla Perfil, 21) ---------- */
  function membershipRow(label, value) {
    return '<li><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></li>';
  }

  function membershipProfileSectionHtml() {
    const m = membership();
    let statusBadge = '';
    let rows = '';
    let actions = '';

    if (m.status === 'trial') {
      statusBadge = '<span class="badge badge--yellow">🎁 Prueba gratis</span>';
      rows = membershipRow('Días restantes', trialDaysLeft() + ' días') +
        membershipRow('La prueba termina el', formatDay(m.trialEndsAt));
      actions = '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="open-payment">' +
        '💳 Confirmar pago</button>';
    } else if (m.status === 'active') {
      statusBadge = '<span class="badge badge--ok">✓ Plan activo</span>';
      rows = membershipRow('Precio', MEMBERSHIP_PLAN.priceLabel + ' / ' + MEMBERSHIP_PLAN.periodLabel) +
        membershipRow('Próxima renovación', formatDay(m.renewsAt));
      actions = '<button class="app-btn app-btn--secondary app-btn--block" type="button" data-action="open-payment">' +
        '⚙️ Gestionar membresía</button>';
    } else if (m.status === 'expired') {
      statusBadge = '<span class="badge badge--warn">⚠ Vencida</span>';
      rows = membershipRow('Venció el', formatDay(membershipKeyDate(m)));
      actions = '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="open-payment">' +
        '🔄 Reactivar</button>';
    } else {
      statusBadge = '<span class="badge badge--neutral">Sin activar</span>';
      actions = '<button class="app-btn app-btn--primary app-btn--block" type="button" data-view="cons-membership">' +
        '🎁 Activar prueba gratis</button>';
    }

    return '<div class="panel membership-profile">' +
      '<div class="membership-profile__head">' +
        '<h2 class="panel__title" style="margin:0">Mi membresía</h2>' + statusBadge +
      '</div>' +
      '<ul class="membership-rows">' +
        membershipRow('Plan', MEMBERSHIP_PLAN.name) + rows +
      '</ul>' +
      actions +
      '</div>';
  }

  /* ---------- Modal de pago único (Perfil y pantalla de bloqueo) ---------- */
  function openMembershipPaymentModal() {
    const m = membership();
    const isManage = m.status === 'active';
    const title = isManage ? 'Gestionar membresía'
      : (m.status === 'expired' ? 'Reactivar membresía' : 'Confirmar pago');
    const base = (isManage && m.renewsAt && m.renewsAt > Date.now()) ? m.renewsAt : Date.now();
    const nextRenewal = base + 30 * DAY_MS;

    openModal(
      '<div class="modal__header">' +
        '<span class="modal__icon" aria-hidden="true">💳</span>' +
        '<h2 class="modal__title">' + title + '</h2>' +
        '<p class="modal__subtitle">Plan único ' + MEMBERSHIP_PLAN.name + '</p>' +
      '</div>' +
      '<div class="modal__body">' +
        '<ul class="membership-rows">' +
          membershipRow('Plan', MEMBERSHIP_PLAN.name) +
          membershipRow('Precio', MEMBERSHIP_PLAN.priceLabel + ' / ' + MEMBERSHIP_PLAN.periodLabel) +
          (m.status === 'trial' ? membershipRow('Prueba gratis hasta', formatDay(m.trialEndsAt)) : '') +
          (isManage ? membershipRow('Renovación actual', formatDay(m.renewsAt)) : '') +
          membershipRow(isManage ? 'Nueva renovación' : 'Próxima renovación', formatDay(nextRenewal)) +
        '</ul>' +
        '<div class="field" style="margin-top:12px">' +
          '<label class="field__label" for="pay-method">Método de pago</label>' +
          '<select class="field__control" id="pay-method">' +
            '<option>Tarjeta de crédito / débito</option>' +
            '<option>Yape</option>' +
            '<option>Plin</option>' +
          '</select>' +
        '</div>' +
        '<p class="membership-plan__note">Pago simulado (demo académica, sin backend).</p>' +
      '</div>' +
      '<div class="modal__footer">' +
        '<button class="app-btn app-btn--primary app-btn--block" type="button" data-action="confirm-payment">' +
          '💳 Confirmar pago ' + MEMBERSHIP_PLAN.priceLabel + '</button>' +
        '<button class="app-btn app-btn--ghost app-btn--block" type="button" data-action="close-modal">Cancelar</button>' +
      '</div>'
    );
  }

  /* =======================================================
     APP SHELL open / close
     ======================================================= */
  function openApp() {
    $('#app-shell').hidden = false;
    document.body.classList.add('app-open');
    refreshCreditsPill();
    // sesión recordada: con login previo va directo a la selección de perfil
    if (state.auth && state.auth.loggedIn) showProfileSelection(); else showAuthScreen('login');
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
    rerenderCurrent();
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
    rerenderCurrent();
  }

  function resumeTrip() {          // US03
    if (!activeTrip || activeTrip.status !== 'paused') return;
    activeTrip.status = 'active';
    activeTrip.intervalId = setInterval(tripTick, 1000);
    rerenderCurrent();
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
    navigateTo('eco-home');
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
    if (tripActive && activeViewId !== 'eco-home') {
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
    rerenderCurrent();
  }

  /* ---------- ROUTE ACTIONS (US16-US19) ---------- */
  function showRoutes() {
    plannerVisible = true;
    currentRoutes = generateRoutes(selectedMode, routeSeed);
    // US18: recomendar la ruta más segura por defecto
    selectedRouteId = recommendedRouteId();
    rerenderCurrent();
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
    rerenderCurrent();
    showToast({ type: 'success', icon: '🗺️', title: 'Ruta recalculada',
      body: 'Se actualizaron las opciones de ruta.' });
  }

  function selectRoute(routeId) {
    selectedRouteId = routeId;
    rerenderCurrent();
  }

  /* =======================================================
     ECO — INICIO (resumen + selector de medio + cronómetro)
     US01-07, US20. Acceso rápido para iniciar un viaje.
     ======================================================= */
  function renderEcoHome(container) {
    if (!container) return;
    let html = '';

    html +=
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Inicio</span>' +
        '<h1 class="view-head__title">Hola, ' + escapeHtml(PROFILES.eco.userName) + '</h1>' +
        '<p class="view-head__subtitle">Tu resumen de impacto y acceso rápido para iniciar un viaje.</p>' +
      '</header>';

    // Resumen (US07 CO2 acumulado, US12 saldo)
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

    // Control del viaje (US01-US04)
    html += renderTripTracker();

    // Acceso a la planificación de ruta (vive en la pestaña Mapa)
    html += '<button class="app-btn app-btn--ghost app-btn--block" type="button" data-view="eco-map" ' +
      'style="margin-top:6px">🗺️ Planificar una ruta sostenible</button>';

    container.innerHTML = html;
    updateLiveTripStats();
  }

  /* =======================================================
     ECO — MAPA (planificador y comparación de rutas)
     US16-US19
     ======================================================= */
  function renderEcoMap(container) {
    if (!container) return;
    let html =
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Mapa</span>' +
        '<h1 class="view-head__title">Planificar ruta</h1>' +
        '<p class="view-head__subtitle">Compara rutas sostenibles con ciclovías y elige la más segura.</p>' +
      '</header>';
    html += renderRoutePlanner();
    container.innerHTML = html;
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
      '<p class="trip-tracker__mode-label">' + modeCfg.icon + ' ' + escapeHtml(modeCfg.label) + '</p>' +
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
     REGISTER VIEWS
     Eco-usuario: Inicio, Mapa, Viajes, Recompensas(rewards.js), Perfil
     Consultor:   Dashboard(dashboard.js), Mapa, Reportes, Perfil
     El orden dentro de cada menú lo define el campo `order`.
     ======================================================= */
  registerView({ id: 'eco-home',  profile: 'eco', order: 1, icon: '🏠', title: 'Inicio',  navLabel: 'Inicio',  render: renderEcoHome });
  registerView({ id: 'eco-map',   profile: 'eco', order: 2, icon: '🗺️', title: 'Mapa',    navLabel: 'Mapa',    render: renderEcoMap });
  registerView({ id: 'eco-trips', profile: 'eco', order: 3, icon: '🚴', title: 'Viajes',  navLabel: 'Viajes',  render: renderHistoryView });
  // 'eco-rewards' (order 4) lo registra rewards.js
  registerView({ id: 'eco-profile', profile: 'eco', order: 5, icon: '👤', title: 'Perfil', navLabel: 'Perfil', render: renderProfileScreen });
  // Perfil del consultor (order 4); las vistas 1-3 las registra dashboard.js
  registerView({ id: 'cons-profile', profile: 'consultant', order: 4, icon: '👤', title: 'Perfil', navLabel: 'Perfil', render: renderProfileScreen });
  // Activación/bloqueo de membresía: oculta del menú, se llega por redirección
  registerView({ id: 'cons-membership', profile: 'consultant', order: 0, icon: '💳', title: 'Membresía', hidden: true, render: renderMembershipGate });

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
    'close-modal': closeModal,
    'activate-trial': activateTrial,
    'open-payment': openMembershipPaymentModal,
    'confirm-payment': confirmMembershipPayment,
    'auth-login': submitLogin,
    'auth-google': submitLogin,   // decorativo: mismo comportamiento que "Ingresar" en el prototipo
    'auth-register': submitRegister,
    'auth-goto-register': function () { showAuthScreen('register'); },
    'auth-goto-login': function () { showAuthScreen('login'); },
    'auth-forgot': function () {
      showToast({ type: 'success', icon: '🔐', title: 'Recuperación de contraseña',
        body: 'Función disponible próximamente (prototipo).' });
    },
    'select-eco': function () { selectProfile('eco'); },
    'select-consultant': function () { selectProfile('consultant'); },
    'change-profile': function () { showProfileSelection(); },
    'logout': function () {
      state.auth.loggedIn = false;
      saveState();
      closeApp();
      showToast({ type: 'success', icon: '👋', title: 'Sesión cerrada', body: 'Vuelve pronto a moverte sostenible.' });
    }
  };

  function handleAppChange(e) {
    if (e.target.id === 'simulate-fraud') simulateFraud = e.target.checked;
    if (e.target.id === 'reg-terms') {
      const submitBtn = $('#reg-submit');
      if (submitBtn) submitBtn.disabled = !e.target.checked;
    }
  }

  /* =======================================================
     LANDING PAGE WIRING
     ======================================================= */
  function wireLandingButtons() {
    // Botones "Empezar ahora" abren la app funcional
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (btn) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'empezar ahora') {
        btn.addEventListener('click', function () { openApp(); });
      }
      // CTA de la sección de membresía: entra directo al flujo de consultor
      // (si no hay sesión, openApp muestra primero el login compartido)
      if (text === 'comenzar prueba gratis') {
        btn.addEventListener('click', function () {
          openApp();
          if (state.auth && state.auth.loggedIn) selectProfile('consultant');
        });
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
    $('#app-bg-banner').addEventListener('click', function () {
      if (currentProfile !== 'eco') selectProfile('eco'); else navigateTo('eco-home');
    });
    $('#app-credits-pill').addEventListener('click', function () {
      if (currentProfile === 'eco') navigateTo('eco-rewards');
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
    TRANSPORT_MODES: TRANSPORT_MODES, membershipBadgeHtml: membershipBadgeHtml
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
