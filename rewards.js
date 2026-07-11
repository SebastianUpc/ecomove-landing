/* =========================================================
   EcoMove - Rewards & redemption module
   US11-15 (créditos, antifraude), US21-25 (catálogo, canje)
   Usa la API pública window.EcoMove expuesta por app.js.
   ========================================================= */
(function () {
  'use strict';

  const EM = window.EcoMove;
  if (!EM) return; // app.js debe cargarse primero

  const state = EM.state;
  const esc = EM.escapeHtml;

  /* ---------- Catálogo de beneficios (US21) — dataset fijo ---------- */
  const BENEFIT_CATEGORIES = [
    { id: 'all',            label: 'Todos' },
    { id: 'transporte',     label: 'Transporte' },
    { id: 'alimentacion',   label: 'Alimentación' },
    { id: 'entretenimiento', label: 'Entretenimiento' },
    { id: 'compras',        label: 'Compras' }
  ];

  const BENEFITS = [
    { id: 'b1', title: 'Pasaje de scooter gratis',   partner: 'MoviScoot',   category: 'transporte',      cost: 80,  icon: '🛴', desc: '1 desbloqueo gratuito de scooter eléctrico.' },
    { id: 'b2', title: '20% dscto. en café',         partner: 'Verde Café',  category: 'alimentacion',    cost: 60,  icon: '☕', desc: 'Descuento en tu bebida favorita.' },
    { id: 'b3', title: 'Entrada 2x1 al cine',        partner: 'CineEco',     category: 'entretenimiento', cost: 150, icon: '🎬', desc: 'Dos entradas por el precio de una.' },
    { id: 'b4', title: 'Bolsa reutilizable',         partner: 'EcoMarket',   category: 'compras',         cost: 40,  icon: '🛍️', desc: 'Bolsa ecológica de regalo.' },
    { id: 'b5', title: 'Mantenimiento de bici',      partner: 'BiciTaller',  category: 'transporte',      cost: 220, icon: '🚲', desc: 'Revisión y ajuste completo.' },
    { id: 'b6', title: 'Almuerzo saludable',         partner: 'Green Bowl',  category: 'alimentacion',    cost: 130, icon: '🥗', desc: 'Menú vegetariano del día.' },
    { id: 'b7', title: 'Concierto al aire libre',    partner: 'EcoFest',     category: 'entretenimiento', cost: 300, icon: '🎶', desc: 'Entrada general a EcoFest.' },
    { id: 'b8', title: 'Planta de interior',         partner: 'Vivero Lima', category: 'compras',         cost: 90,  icon: '🪴', desc: 'Una planta para tu hogar.' }
  ];

  let selectedCategory = 'all';

  /* =======================================================
     CREDITS VIEW (US12 saldo, US14 historial de créditos)
     ======================================================= */
  // Vista combinada Recompensas = saldo/créditos (US12,US14) + catálogo/canje (US21-25)
  function renderRewardsView(container) {
    container.innerHTML =
      '<header class="view-head">' +
        '<span class="view-head__eyebrow">Recompensas</span>' +
        '<h1 class="view-head__title">Recompensas</h1>' +
        '<p class="view-head__subtitle">Tu saldo de Eco-Créditos y el catálogo de beneficios para canjear.</p>' +
      '</header>' +
      '<div id="rewards-credits"></div>' +
      '<div id="rewards-benefits" style="margin-top:8px"></div>';
    renderCreditsSection(document.getElementById('rewards-credits'));
    renderBenefitsSection(document.getElementById('rewards-benefits'));
  }

  function renderCreditsSection(container) {
    const earned = state.credits.ledger
      .filter(function (e) { return e.type === 'earned'; })
      .reduce(function (s, e) { return s + e.amount; }, 0);
    const redeemed = state.credits.ledger
      .filter(function (e) { return e.type === 'redeemed'; })
      .reduce(function (s, e) { return s + e.amount; }, 0);

    // US12: saldo actual destacado
    let html =
      '<div class="credits-hero">' +
        '<span class="credits-hero__icon" aria-hidden="true">★</span>' +
        '<span class="credits-hero__value">' + EM.formatNumber(state.credits.balance) + '</span>' +
        '<span class="credits-hero__label">Eco-Créditos disponibles</span>' +
      '</div>';

    html +=
      '<div class="stat-grid" style="margin-bottom:16px">' +
        '<div class="stat"><span class="stat__value">+' + EM.formatNumber(earned) +
          '</span><span class="stat__label">Total ganado</span></div>' +
        '<div class="stat"><span class="stat__value">-' + EM.formatNumber(redeemed) +
          '</span><span class="stat__label">Total canjeado</span></div>' +
        '<div class="stat"><span class="stat__value">' + state.credits.ledger.length +
          '</span><span class="stat__label">Movimientos</span></div>' +
      '</div>';

    // US14: historial de Eco-Créditos (ledger)
    html += '<h2 class="panel__title">Historial de Eco-Créditos</h2>';
    if (!state.credits.ledger.length) {
      html += emptyState('★', 'Aún no tienes movimientos de créditos.');
    } else {
      html += '<div class="list">';
      state.credits.ledger.forEach(function (e) {
        const plus = e.type === 'earned';
        html +=
          '<div class="list-row">' +
            '<span class="list-row__icon" aria-hidden="true">' + (plus ? '➕' : '🎁') + '</span>' +
            '<div class="list-row__body">' +
              '<p class="list-row__title">' + esc(e.label) + '</p>' +
              '<p class="list-row__sub">' + EM.formatDate(e.date) + '</p>' +
            '</div>' +
            '<span class="list-row__amount ' + (plus ? 'list-row__amount--plus' : 'list-row__amount--minus') + '">' +
              (plus ? '+' : '-') + EM.formatNumber(e.amount) + ' pts</span>' +
          '</div>';
      });
      html += '</div>';
    }
    container.innerHTML = html;
  }

  /* =======================================================
     BENEFITS VIEW (US21 catálogo, US22 filtro, US23 canje,
                    US24 confirmación, US25 historial)
     ======================================================= */
  function renderBenefitsSection(container) {
    let html = '<h2 class="panel__title" style="margin-top:8px">Catálogo de beneficios</h2>';

    // US22: filtro por categoría
    html += '<div class="chip-filter" role="group" aria-label="Filtrar beneficios por categoría">';
    BENEFIT_CATEGORIES.forEach(function (c) {
      const active = c.id === selectedCategory;
      html += '<button class="chip-filter__item' + (active ? ' chip-filter__item--active' : '') +
        '" type="button" data-action="filter-benefits" data-category="' + c.id + '" ' +
        'aria-pressed="' + active + '">' + esc(c.label) + '</button>';
    });
    html += '</div>';

    // US21: catálogo
    const list = BENEFITS.filter(function (b) {
      return selectedCategory === 'all' || b.category === selectedCategory;
    });

    html += '<div class="benefit-grid">';
    list.forEach(function (b) {
      const affordable = state.credits.balance >= b.cost;
      html +=
        '<article class="benefit-card">' +
          '<div class="benefit-card__icon" aria-hidden="true">' + b.icon + '</div>' +
          '<h3 class="benefit-card__title">' + esc(b.title) + '</h3>' +
          '<p class="benefit-card__partner">' + esc(b.partner) + '</p>' +
          '<p class="benefit-card__desc">' + esc(b.desc) + '</p>' +
          '<div class="benefit-card__foot">' +
            '<span class="benefit-card__cost">★ ' + b.cost + ' pts</span>' +
            '<button class="app-btn app-btn--primary app-btn--sm" type="button" ' +
              'data-action="redeem-benefit" data-benefit="' + b.id + '"' +
              (affordable ? '' : ' disabled') + '>' +
              (affordable ? 'Canjear' : 'Saldo insuf.') + '</button>' +
          '</div>' +
        '</article>';
    });
    html += '</div>';

    // US25: historial de canjes
    html += '<h2 class="panel__title" style="margin-top:24px">Mis canjes</h2>';
    if (!state.redemptions.length) {
      html += emptyState('🎁', 'Aún no has canjeado beneficios.');
    } else {
      html += '<div class="list">';
      state.redemptions.forEach(function (r) {
        html +=
          '<div class="list-row">' +
            '<span class="list-row__icon" aria-hidden="true">' + r.icon + '</span>' +
            '<div class="list-row__body">' +
              '<p class="list-row__title">' + esc(r.title) + '</p>' +
              '<p class="list-row__sub">' + esc(r.partner) + ' · ' + EM.formatDate(r.date) + '</p>' +
            '</div>' +
            '<span class="list-row__amount list-row__amount--minus">-' + r.cost + ' pts</span>' +
          '</div>';
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  /* ---------- Actions ---------- */
  function filterBenefits(btn) {
    selectedCategory = btn.getAttribute('data-category');
    EM.navigateTo('eco-rewards');
  }

  function redeemBenefit(btn) {              // US23
    const benefit = BENEFITS.find(function (b) { return b.id === btn.getAttribute('data-benefit'); });
    if (!benefit) return;

    // US23: validar saldo suficiente
    if (state.credits.balance < benefit.cost) {
      EM.showToast({ type: 'error', icon: '⚠️', title: 'Saldo insuficiente',
        body: 'Necesitas ' + (benefit.cost - state.credits.balance) + ' pts más para este beneficio.' });
      return;
    }

    // US24: modal de confirmación previo al canje
    EM.openModal(
      '<div class="modal__header">' +
        '<span class="modal__icon" aria-hidden="true">' + benefit.icon + '</span>' +
        '<h2 class="modal__title">Confirmar canje</h2>' +
        '<p class="modal__subtitle">' + esc(benefit.title) + ' · ' + esc(benefit.partner) + '</p>' +
      '</div>' +
      '<div class="modal__body">' +
        '<div class="summary-grid">' +
          '<div class="stat"><span class="stat__value">★ ' + benefit.cost +
            '</span><span class="stat__label">Costo</span></div>' +
          '<div class="stat"><span class="stat__value">' + EM.formatNumber(state.credits.balance - benefit.cost) +
            '</span><span class="stat__label">Saldo restante</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="modal__footer">' +
        '<button class="app-btn app-btn--primary app-btn--block" type="button" ' +
          'data-action="confirm-redeem" data-benefit="' + benefit.id + '">Confirmar canje</button>' +
        '<button class="app-btn app-btn--secondary app-btn--block" type="button" ' +
          'data-action="close-modal">Cancelar</button>' +
      '</div>'
    );
  }

  function confirmRedeem(btn) {              // US24 -> ejecuta el canje
    const benefit = BENEFITS.find(function (b) { return b.id === btn.getAttribute('data-benefit'); });
    if (!benefit) return;
    if (state.credits.balance < benefit.cost) { EM.closeModal(); return; }

    EM.addCreditsEntry('redeemed', benefit.cost, 'Canje: ' + benefit.title);
    state.redemptions.unshift({
      id: EM.uid(), benefitId: benefit.id, title: benefit.title,
      partner: benefit.partner, icon: benefit.icon, cost: benefit.cost, date: Date.now()
    });
    EM.saveState();
    EM.closeModal();
    EM.showToast({ type: 'reward', icon: '🎉', title: 'Canje realizado',
      body: benefit.title + ' — se descontaron ' + benefit.cost + ' pts.' });
    EM.navigateTo('eco-rewards');
  }

  /* ---------- helper ---------- */
  function emptyState(icon, text) {
    return '<div class="panel"><div class="empty-state">' +
      '<span class="empty-state__icon" aria-hidden="true">' + icon + '</span>' +
      '<p class="empty-state__text">' + esc(text) + '</p></div></div>';
  }

  /* ---------- Register view + actions ----------
     Créditos + Beneficios se fusionan en 'Recompensas' (perfil eco). */
  EM.registerView({ id: 'eco-rewards', profile: 'eco', order: 4, icon: '🎁', title: 'Recompensas', navLabel: 'Recompensas', render: renderRewardsView });

  EM.appActions['filter-benefits'] = filterBenefits;
  EM.appActions['redeem-benefit']  = redeemBenefit;
  EM.appActions['confirm-redeem']  = confirmRedeem;
})();
