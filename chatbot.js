/* =========================================================
   EcoMove - Chatbot simulado (rule-based, sin backend)
   Widget flotante global: informa y redirige leyendo el
   estado real expuesto por window.EcoMove. No ejecuta
   canjes ni llamadas externas.
   ========================================================= */
(function () {
  'use strict';

  const EM = window.EcoMove;
  if (!EM) return; // app.js debe cargarse primero

  const esc = EM.escapeHtml;

  const MODE_LABELS = { walk: 'Caminata', bike: 'Bicicleta', scooter: 'Scooter' };

  let panel = null;
  let messagesEl = null;
  let inputEl = null;
  let greeted = false;

  /* ---------- helpers ---------- */

  function normalizar(s) {
    // quita tildes: descompone (NFD) y elimina los diacríticos combinantes
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function botonIrA(action, label) {
    return '<button type="button" class="chatbot-btn" data-action="' + action + '">' + label + '</button>';
  }

  /* ---------- saludo ---------- */

  function saludoInicial() {
    const perfil = EM.getProfile();
    if (perfil === 'eco') {
      return 'Hola 👋 Soy el asistente de EcoMove. Puedo ayudarte con: <strong>creditos</strong>, <strong>recompensas</strong>, <strong>viajes</strong>, o escribe <strong>ayuda</strong> para ver todo.';
    }
    if (perfil === 'consultant') {
      return 'Hola 👋 Soy el asistente de EcoMove. Puedo ayudarte con: <strong>reportes</strong>, <strong>zona [nombre]</strong>, <strong>dashboard</strong>, o escribe <strong>ayuda</strong>.';
    }
    return 'Hola, primero elige un perfil (eco-usuario o consultor) para que pueda ayudarte.';
  }

  /* ---------- respuestas: perfil eco ---------- */

  function ayudaEco() {
    return 'Puedo ayudarte con estos comandos:<ul>' +
      '<li><strong>creditos</strong> / <strong>saldo</strong> — tu saldo de Eco-Créditos</li>' +
      '<li><strong>recompensas</strong> — catálogo de beneficios</li>' +
      '<li>el nombre de un beneficio (ej. <strong>cine</strong>) — su detalle</li>' +
      '<li><strong>viajes</strong> — tus trayectos registrados</li>' +
      '<li><strong>gracias</strong> · <strong>cerrar</strong></li></ul>';
  }

  function respuestaCreditos() {
    return 'Tienes ★ ' + EM.formatNumber(EM.state.credits.balance) + ' Eco-Créditos disponibles.';
  }

  function buscarBeneficio(textoNorm) {
    const stopwords = ['recompensa', 'recompensas', 'catalogo', 'listar', 'lista', 'quiero', 'sobre', 'beneficio', 'beneficios', 'cuanto', 'cuesta', 'informacion'];
    const palabras = textoNorm.split(/\s+/).filter(function (w) {
      return w.length >= 4 && stopwords.indexOf(w) === -1;
    });
    let encontrado = null;
    EM.BENEFITS.forEach(function (b) {
      if (encontrado) return;
      const titulo = normalizar(b.title);
      if (titulo.includes(textoNorm) || textoNorm.includes(titulo)) { encontrado = b; return; }
      palabras.forEach(function (w) {
        if (!encontrado && titulo.includes(w)) encontrado = b;
      });
    });
    return encontrado;
  }

  function respuestaBeneficio(b) {
    return b.icon + ' <strong>' + esc(b.title) + '</strong><br>' +
      esc(b.desc) + '<br>' +
      'Partner: ' + esc(b.partner) + ' · Costo: ★ ' + EM.formatNumber(b.cost) + ' pts.<br>' +
      'Ve a la sección Recompensas para canjearlo. ' +
      botonIrA('chatbot-goto-rewards', 'Ir a Recompensas');
  }

  function respuestaCatalogo() {
    return 'Este es el catálogo de beneficios:<ul>' +
      EM.BENEFITS.map(function (b) {
        return '<li>' + b.icon + ' ' + esc(b.title) + ' — ' + EM.formatNumber(b.cost) + ' pts</li>';
      }).join('') + '</ul>Escribe el nombre de un beneficio para ver su detalle.';
  }

  function respuestaViajes() {
    const trips = EM.state.trips;
    if (trips && trips.length) {
      const validados = trips.filter(function (t) { return t.validated; }).length;
      return 'Tienes ' + EM.formatNumber(trips.length) + ' viaje' + (trips.length === 1 ? '' : 's') +
        ' registrado' + (trips.length === 1 ? '' : 's') + ' (' + EM.formatNumber(validados) + ' validado' + (validados === 1 ? '' : 's') + '). ' +
        botonIrA('chatbot-goto-trips', 'Ir a Viajes');
    }
    return 'Aún no tienes viajes registrados. ¡Inicia tu primer trayecto sostenible! ' +
      botonIrA('chatbot-goto-trips', 'Ir a Viajes');
  }

  function responderEco(t) {
    if (t.includes('ayuda')) return ayudaEco();
    if (t.includes('credito') || t.includes('saldo')) return respuestaCreditos();
    const beneficio = buscarBeneficio(normalizar(t));
    if (beneficio) return respuestaBeneficio(beneficio);
    if (t.includes('recompensa') || t.includes('listar') || t.includes('catalogo') || t.includes('catálogo')) return respuestaCatalogo();
    if (t.includes('viaje')) return respuestaViajes();
    return null;
  }

  /* ---------- respuestas: perfil consultor ---------- */

  function ayudaConsultor() {
    return 'Puedo ayudarte con estos comandos:<ul>' +
      '<li><strong>reportes</strong> — generar reportes ambientales</li>' +
      '<li><strong>dashboard</strong> / <strong>metricas</strong> — indicadores y tendencias</li>' +
      '<li><strong>zona [nombre]</strong> — datos de una zona (ej. <em>zona miraflores</em>)</li>' +
      '<li><strong>gracias</strong> · <strong>cerrar</strong></li></ul>';
  }

  function respuestaZona(t) {
    const resto = normalizar(t.split('zona')[1] || '');
    let zona = null;
    if (resto) {
      Object.keys(EM.DASH_ZONES).forEach(function (zid) {
        if (zona) return;
        const nombre = normalizar(EM.DASH_ZONES[zid].name);
        if (nombre.includes(resto) || resto.includes(nombre)) zona = EM.DASH_ZONES[zid];
      });
    }
    if (!zona) {
      return 'No tengo datos de esa zona. Zonas disponibles: San Isidro, Miraflores, Surco, Barranco, La Molina. ' +
        botonIrA('chatbot-goto-map', 'Ver mapa de calor');
    }
    let total = 0;
    let modoTop = null;
    Object.keys(zona.modes).forEach(function (mid) {
      const trips = zona.modes[mid].tripsPerDay;
      total += trips;
      if (!modoTop || trips > zona.modes[modoTop].tripsPerDay) modoTop = mid;
    });
    return '📍 <strong>' + esc(zona.name) + '</strong><br>' +
      'Trayectos por día: ' + EM.formatNumber(total) + ' (caminata + bicicleta + scooter).<br>' +
      'Modo más usado: ' + MODE_LABELS[modoTop] + ' (' + EM.formatNumber(zona.modes[modoTop].tripsPerDay) + ' trayectos/día). ' +
      botonIrA('chatbot-goto-map', 'Ver mapa de calor');
  }

  function responderConsultor(t) {
    if (t.includes('ayuda')) return ayudaConsultor();
    if (t.includes('reporte')) {
      return 'Puedes generar reportes ambientales con métricas, filtros y trazabilidad. ' +
        botonIrA('chatbot-goto-reports', 'Ir a Reportes');
    }
    if (t.includes('dashboard') || t.includes('metrica') || t.includes('métrica')) {
      return 'El dashboard muestra CO₂ evitado, tendencias y tabla por zona. ' +
        botonIrA('chatbot-goto-dashboard', 'Ir al Dashboard');
    }
    if (t.includes('zona')) return respuestaZona(t);
    return null;
  }

  /* ---------- dispatcher ---------- */

  function procesarComando(texto) {
    agregarMensaje('user', esc(texto));

    const t = texto.toLowerCase().trim();

    if (t.includes('gracias')) { agregarMensaje('bot', '¡De nada! 🌱'); return; }
    if (t.includes('cerrar') || t.includes('salir')) {
      agregarMensaje('bot', '¡Hasta pronto! 🌱');
      toggleChatPanel();
      return;
    }

    const perfil = EM.getProfile();
    let respuesta = null;
    if (perfil === 'eco') respuesta = responderEco(t);
    else if (perfil === 'consultant') respuesta = responderConsultor(t);
    else respuesta = 'Hola, primero elige un perfil (eco-usuario o consultor) para que pueda ayudarte.';

    if (!respuesta) respuesta = 'No entendí ese comando. Escribe <strong>ayuda</strong> para ver las opciones disponibles.';
    agregarMensaje('bot', respuesta);
  }

  /* ---------- UI ---------- */

  function agregarMensaje(tipo, contenidoHTML) {
    const msg = document.createElement('div');
    msg.className = 'chatbot-msg chatbot-msg--' + tipo;
    msg.innerHTML = contenidoHTML;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function toggleChatPanel() {
    const abrir = panel.hidden;
    panel.hidden = !abrir;
    if (abrir && !greeted) {
      greeted = true;
      agregarMensaje('bot', saludoInicial());
    }
    if (abrir) inputEl.focus();
  }

  function cerrarYNavegar(viewId) {
    if (!panel.hidden) toggleChatPanel();
    EM.navigateTo(viewId);
  }

  function initChatbot() {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'chatbot-fab';
    fab.setAttribute('aria-label', 'Abrir asistente EcoMove');
    fab.textContent = '💬';

    panel = document.createElement('div');
    panel.className = 'chatbot-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<header class="chatbot-panel__head">' +
        '<span class="chatbot-panel__title">Asistente EcoMove</span>' +
        '<button type="button" class="chatbot-panel__close" aria-label="Cerrar asistente">✕</button>' +
      '</header>' +
      '<div class="chatbot-messages" aria-live="polite"></div>' +
      '<form class="chatbot-form">' +
        '<input type="text" class="chatbot-form__input" placeholder="Escribe un comando…" aria-label="Mensaje para el asistente">' +
        '<button type="submit" class="chatbot-form__send">Enviar</button>' +
      '</form>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    messagesEl = panel.querySelector('.chatbot-messages');
    inputEl = panel.querySelector('.chatbot-form__input');

    fab.addEventListener('click', toggleChatPanel);
    panel.querySelector('.chatbot-panel__close').addEventListener('click', toggleChatPanel);
    panel.querySelector('.chatbot-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const valor = inputEl.value.trim();
      if (valor) procesarComando(valor);
      inputEl.value = '';
      inputEl.focus();
    });
  }

  /* ---------- acciones de navegación (delegación global de app.js) ---------- */
  EM.appActions['chatbot-goto-rewards']   = function () { cerrarYNavegar('eco-rewards'); };
  EM.appActions['chatbot-goto-trips']     = function () { cerrarYNavegar('eco-trips'); };
  EM.appActions['chatbot-goto-reports']   = function () { cerrarYNavegar('cons-reports'); };
  EM.appActions['chatbot-goto-dashboard'] = function () { cerrarYNavegar('cons-dashboard'); };
  EM.appActions['chatbot-goto-map']       = function () { cerrarYNavegar('cons-map'); };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
