/* LedgerWorks - "Built by Emerant Technologies" byline + promo card.
   Self-contained: injects its own DOM, follows LW.i18n, never throws. */
(function () {
  'use strict';
  var LW = window.LW = window.LW || {};

  var SITE = 'https://emerant.net/';
  var UTM = '?utm_source=ledgerworks&utm_medium=demo&utm_campaign=built_by';
  var SEEN_KEY = 'lw-emerant-promo-seen';

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
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage unavailable */ }
    try { if (window.umami && typeof window.umami.track === 'function') window.umami.track('emerant-promo-shown'); } catch (e2) { /* noop */ }
  }
  function hide() { if (els.card) els.card.hidden = true; }

  function seen() { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }

  // Show the promo once per session when the guided tour finishes or is exited
  function watchTour() {
    var wasRunning = false;
    setInterval(function () {
      var d = LW.demo;
      if (!d || typeof d.state !== 'function') return;
      var st;
      try { st = d.state(); } catch (e) { return; }
      var running = !!(st && st.running && !st.done);
      if (wasRunning && !running && !seen()) setTimeout(show, 1200);
      wasRunning = running;
    }, 800);
  }

  function init() {
    try {
      build();
      if (LW.i18n && typeof LW.i18n.on === 'function') LW.i18n.on(render);
      watchTour();
    } catch (e) {
      if (window.console) console.warn('[brand] init failed', e);
    }
  }

  LW.brand = { show: show, hide: hide };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
