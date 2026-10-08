/* LedgerWorks - "Built by Emerant Technologies" byline + promo card.
   Self-contained: injects its own DOM, follows LW.i18n, never throws. */
(function () {
  'use strict';
  var LW = window.LW = window.LW || {};

  var SITE = 'https://emerant.net/';
  var UTM = '?utm_source=ledgerworks&utm_medium=demo&utm_campaign=built_by';

  var TXT = {
    builtBy: { en: 'Built by', bg: 'Създадено от' },
    promoKicker: { en: 'Built by Emerant Technologies', bg: 'Създадено от Emerant Technologies' },
    promoTitle: {
      en: 'Want software like this for your team?',
      bg: 'Искате такъв софтуер за вашия екип?'
    },
    promoText: {
      en: 'We design and build custom finance dashboards, digital twins and interactive training tools, from first sketch to production.',
      bg: 'Проектираме и разработваме персонализирани финансови табла, дигитални близнаци и интерактивни инструменти за обучение - от първата скица до продукция.'
    },
    cta: { en: 'Talk to Emerant', bg: 'Свържете се с Emerant' },
    later: { en: 'Keep exploring', bg: 'Продължете да разглеждате' },
    close: { en: 'Close', bg: 'Затвори' },
    wKicker: { en: 'Demo · Built by Emerant Technologies', bg: 'Демо · Създадено от Emerant Technologies' },
    wTitle: { en: 'Welcome to LedgerWorks', bg: 'Добре дошли в LedgerWorks' },
    wLead: {
      en: 'A gamified finance & accounting dashboard, created for demo purposes.',
      bg: 'Геймифицирано табло за финанси и счетоводство, създадено за демонстрационни цели.'
    },
    wB1t: { en: 'Learning', bg: 'Обучение' },
    wB1: {
      en: 'Practice real postings, month-end close and analysis, with points, levels and instant feedback.',
      bg: 'Упражнявайте реални осчетоводявания, месечно приключване и анализ - с точки, нива и мигновена обратна връзка.'
    },
    wB2t: { en: 'Engagement', bg: 'Ангажираност' },
    wB2: {
      en: 'Turn the finance team\'s daily work into a real-world game that keeps people motivated.',
      bg: 'Превърнете ежедневната работа на финансовия екип в реална игра, която мотивира хората.'
    },
    wB3t: { en: 'Visibility', bg: 'Видимост' },
    wB3: {
      en: 'Give management granular, live monitoring of every team member\'s activity and of the KPIs it moves.',
      bg: 'Дайте на мениджмънта детайлен поглед в реално време върху дейността на всеки служител и показателите, които тя движи.'
    },
    wSell: {
      en: 'Want something like this for your company? Emerant Technologies designs and builds tools like this one. Reach out to see more of our work.',
      bg: 'Искате нещо подобно за вашата компания? Emerant Technologies проектира и разработва подобни решения. Свържете се с нас, за да видите още от работата ни.'
    },
    wNote: { en: 'Demo data: the company, people and figures are fictional.', bg: 'Демо данни: компанията, хората и цифрите са измислени.' },
    wTour: { en: 'Start the 3-minute tour', bg: 'Започни 3-минутната обиколка' },
    wExplore: { en: 'Explore on my own', bg: 'Разгледай сам' },
    wSite: { en: 'See our work', bg: 'Вижте наши проекти' },
    bylineAria: { en: 'About Emerant Technologies, the team that built LedgerWorks', bg: 'За Emerant Technologies, екипът създал LedgerWorks' }
  };

  function lang() { return (LW.i18n && LW.i18n.lang) === 'en' ? 'en' : 'bg'; }
  function tx(o) { return o[lang()] || o.en; }

  // Emerant mark: three ink bars with the lime "emerging" block (from the brand kit)
  function mark(ink) {
    return '<svg class="em-mark" viewBox="0 0 60 59.6" aria-hidden="true" focusable="false">' +
      '<rect x="0" y="0" width="60" height="14.5" fill="' + ink + '"/>' +
      '<rect x="0" y="22.55" width="36.5" height="14.5" fill="' + ink + '"/>' +
      '<rect x="44.1" y="22.55" width="15.9" height="14.5" fill="#C8F031"/>' +
      '<rect x="0" y="45.1" width="60" height="14.5" fill="' + ink + '"/></svg>';
  }

  var els = {};
  var welcome = { open: false };

  var ICONS = {
    learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    spark: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  function ic(k) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + '</svg>';
  }

  // Nothing is persisted: the welcome opens on every page load. The only exception
  // is the tour's own Restart (?demo=1); that flag is dropped from the URL right away
  // so a later refresh shows the welcome again.
  function shouldWelcome() {
    var restart = false;
    try {
      var u = new URL(location.href);
      if (u.searchParams.get('demo') === '1') {
        restart = true;
        u.searchParams.delete('demo');
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      }
    } catch (e) { /* noop */ }
    return !restart;
  }

  function buildWelcome() {
    var w = document.createElement('div');
    w.className = 'em-welcome-wrap';
    w.innerHTML =
      '<section class="em-welcome" role="dialog" aria-modal="true" aria-labelledby="emWTitle">' +
        '<div class="em-kicker">' + mark('#F3F3EF') + '<span data-w="wKicker"></span></div>' +
        '<h1 id="emWTitle" class="em-title em-w-title" data-w="wTitle"></h1>' +
        '<p class="em-w-lead" data-w="wLead"></p>' +
        '<ul class="em-w-list">' +
          '<li><span class="em-w-ic">' + ic('learn') + '</span><span><b data-w="wB1t"></b><span data-w="wB1"></span></span></li>' +
          '<li><span class="em-w-ic">' + ic('spark') + '</span><span><b data-w="wB2t"></b><span data-w="wB2"></span></span></li>' +
          '<li><span class="em-w-ic">' + ic('eye') + '</span><span><b data-w="wB3t"></b><span data-w="wB3"></span></span></li>' +
        '</ul>' +
        '<div class="em-w-sell">' +
          '<p data-w="wSell"></p>' +
          '<div class="em-w-contacts">' +
            '<a href="mailto:hello@emerant.net?subject=LedgerWorks%20demo" data-umami-event="emerant-welcome-email">hello@emerant.net</a>' +
            '<span aria-hidden="true">·</span>' +
            '<a class="em-w-site" target="_blank" rel="noopener" data-umami-event="emerant-welcome-site"></a>' +
          '</div>' +
        '</div>' +
        '<div class="em-actions em-w-actions">' +
          '<button type="button" class="em-cta" data-wact="tour" data-umami-event="welcome-start-tour"></button>' +
          '<button type="button" class="em-later" data-wact="explore" data-umami-event="welcome-explore"></button>' +
        '</div>' +
        '<p class="em-w-note" data-w="wNote"></p>' +
      '</section>';
    w.querySelector('.em-w-site').href = SITE + UTM.replace('built_by', 'welcome');
    w.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-wact]') : null;
      if (b) closeWelcome(b.getAttribute('data-wact'));
    });
    w.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeWelcome('tour'); }
    });
    document.body.appendChild(w);
    els.welcome = w;
    welcome.open = true;
    setTimeout(function () { var b = w.querySelector('[data-wact="tour"]'); if (b) b.focus(); }, 50);
  }

  function renderWelcome() {
    var w = els.welcome;
    if (!w) return;
    Array.prototype.forEach.call(w.querySelectorAll('[data-w]'), function (n) {
      n.textContent = tx(TXT[n.getAttribute('data-w')]);
    });
    w.querySelector('[data-wact="tour"]').textContent = '\u25B6 ' + tx(TXT.wTour);
    w.querySelector('[data-wact="explore"]').textContent = tx(TXT.wExplore);
    w.querySelector('.em-w-site').textContent = 'emerant.net \u2014 ' + tx(TXT.wSite) + ' \u2192';
  }

  function closeWelcome(choice) {
    if (!welcome.open) return;
    welcome.open = false;
    LW.brand.choice = choice === 'explore' ? 'explore' : 'tour';
    if (els.welcome) {
      els.welcome.classList.add('em-out');
      var w = els.welcome;
      setTimeout(function () { w.remove(); }, 220);
    }
  }

  function build() {
    // top bar byline
    var by = document.createElement('button');
    by.type = 'button';
    by.className = 'em-byline';
    by.setAttribute('data-umami-event', 'emerant-byline-click');
    by.innerHTML = mark('#111214') +
      '<span class="em-by-text"><span class="em-by-kicker"></span><span class="em-by-name">Emerant</span></span>';
    by.addEventListener('click', function () { show(); });
    var brand = document.querySelector('.topbar .brand');
    if (brand && brand.parentNode) brand.parentNode.insertBefore(by, brand.nextSibling);
    else { by.classList.add('em-byline-floating'); document.body.appendChild(by); }
    els.by = by;

    // promo card
    var card = document.createElement('aside');
    card.className = 'em-promo';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'emPromoTitle');
    card.innerHTML =
      '<button type="button" class="em-x" data-em="close">&times;</button>' +
      '<div class="em-kicker">' + mark('#F3F3EF') + '<span data-em="kicker"></span></div>' +
      '<h2 id="emPromoTitle" class="em-title" data-em="title"></h2>' +
      '<p class="em-text" data-em="text"></p>' +
      '<div class="em-actions">' +
        '<a class="em-cta" data-em="cta" target="_blank" rel="noopener" data-umami-event="emerant-cta-click"></a>' +
        '<button type="button" class="em-later" data-em="later"></button>' +
      '</div>' +
      '<div class="em-url">emerant.net</div>';
    card.querySelector('[data-em="cta"]').href = SITE + UTM;
    card.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-em]') : null;
      if (!t) return;
      var k = t.getAttribute('data-em');
      if (k === 'close' || k === 'later') hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) hide(); });
    document.body.appendChild(card);
    els.card = card;

    render();
  }

  function render() {
    renderWelcome();
    if (!els.by) return;
    els.by.querySelector('.em-by-kicker').textContent = tx(TXT.builtBy);
    els.by.setAttribute('aria-label', tx(TXT.bylineAria));
    els.by.title = tx(TXT.promoKicker);
    var c = els.card;
    c.querySelector('[data-em="kicker"]').textContent = tx(TXT.promoKicker);
    c.querySelector('[data-em="title"]').textContent = tx(TXT.promoTitle);
    c.querySelector('[data-em="text"]').textContent = tx(TXT.promoText);
    c.querySelector('[data-em="cta"]').textContent = tx(TXT.cta) + ' →';
    c.querySelector('[data-em="later"]').textContent = tx(TXT.later);
    c.querySelector('[data-em="close"]').setAttribute('aria-label', tx(TXT.close));
  }

  function show() {
    if (!els.card) return;
    els.card.hidden = false;
    // restart entry animation
    els.card.classList.remove('em-in'); void els.card.offsetWidth; els.card.classList.add('em-in');
    promoSeen = true;
    try { if (window.umami && typeof window.umami.track === 'function') window.umami.track('emerant-promo-shown'); } catch (e2) { /* noop */ }
  }
  function hide() { if (els.card) els.card.hidden = true; }

  // in-memory only, resets on every page load
  var promoSeen = false;
  function seen() { return promoSeen; }

  // Show the promo once per session when the guided tour finishes or is exited
  function watchTour() {
    var wasRunning = false;
    setInterval(function () {
      var d = LW.demo;
      if (!d || typeof d.state !== 'function') return;
      var st;
      try { st = d.state(); } catch (e) { return; }
      var running = !!(st && st.running && !st.done);
      if (wasRunning && !running && !seen() && !welcome.open) setTimeout(show, 1200);
      wasRunning = running;
    }, 800);
  }

  // Earlier versions remembered language / welcome / promo in browser storage.
  // The app is stateless now, so clear those leftovers for returning visitors.
  function clearLegacyState() {
    try { localStorage.removeItem('lw-lang'); } catch (e) { /* noop */ }
    try {
      sessionStorage.removeItem('lw-welcome-seen');
      sessionStorage.removeItem('lw-emerant-promo-seen');
    } catch (e2) { /* noop */ }
  }

  function init() {
    clearLegacyState();
    try {
      if (shouldWelcome()) buildWelcome();
      build();
      if (LW.i18n && typeof LW.i18n.on === 'function') LW.i18n.on(render);
      watchTour();
    } catch (e) {
      if (window.console) console.warn('[brand] init failed', e);
    }
  }

  LW.brand = {
    show: show, hide: hide, choice: null,
    welcomeOpen: function () { return welcome.open; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
