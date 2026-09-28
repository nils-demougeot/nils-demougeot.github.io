/* Screenshot galleries in the project cards.
   The data lives in assets/data/galleries.js (window.GALLERIES, edited with tools/galleries.html): one entry per card id
   ("siem" → #p-siem). The cover first shows the screenshots scattered like cards on a gradient in the project colours,
   then each one on its own, in its own proportions (or cropped to fill the frame with "fit": "cover"); a click opens them full screen. Shared by the site (main.js) and the gallery tool (preview). */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PATHS = {
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    zoom: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6"/><path d="M11 8v6M8 11h6"/>'
  };
  const icon = (k) => '<svg class="ic" viewBox="0 0 24 24">' + PATHS[k] + '</svg>';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLLAGE = 3; // how many screenshots the scattered first view shows
  // Poses of the scattered cards (x %, y %, rotation deg, scale), front card first. "side" leaves room for a demo window bottom-left.
  const POSES = {
    side: [[2, 6, -1.5, 0.9], [-27, -3, -7, 0.76], [17, -12, 6, 0.74]],
    solo: [[0, 7, -1, 0.86], [-23, 1, -6, 0.72], [23, -2, 6, 0.72]]
  };
  const EXTRA = [0, 14, 0, 0.9]; // screenshots after the third one wait out of sight

  // Second background colour when the data gives only one: the card colour turned towards indigo and darkened.
  function partner(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return '#6d28d9';
    const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360; const to = ((255 - h + 540) % 360) - 180; // shortest turn towards indigo
    return hsl2hex((h + Math.max(-90, Math.min(90, to * 0.75)) + 360) % 360, Math.min(0.85, s), Math.max(0.25, l * 0.55));
  }
  function hsl2hex(h, s, l) {
    const f = (k) => { const a = s * Math.min(l, 1 - l), t = (k + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1)))); };
    return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  const galIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('paused', !e.isIntersecting)), { threshold: 0.35 }) : null;

  function build(card, d) {
    const stage = $('.proj-stage', card), imgs = (d && d.images) || [], n = imgs.length;
    if (!stage || !n) return null;
    const side = !!$('.pip', card), poses = POSES[side ? 'side' : 'solo'], title = ($('h3', card) || {}).textContent || '';
    const c1 = (d.colors && d.colors[0]) || getComputedStyle(card).getPropertyValue('--c').trim() || '#fb7185', c2 = (d.colors && d.colors[1]) || partner(c1);
    const g = document.createElement('div');
    g.className = 'gal paused' + (side ? '' : ' solo'); g.style.setProperty('--g1', c1); g.style.setProperty('--g2', c2);
    g.innerHTML = '<div class="gal-frame">' + imgs.map((im, j) => {
      const p = j < COLLAGE ? poses[j] : EXTRA, ar = im.w && im.h ? im.w / im.h : 1.4;
      return '<figure class="gal-slide' + (j < COLLAGE && n > 1 ? ' pile' : '') + (im.fit === 'cover' ? ' fill' : '') + '" style="--x:' + p[0] + '%;--y:' + p[1] + '%;--r:' + p[2] + 'deg;--s:' + p[3] + ';--ar:' + ar.toFixed(3) + ';z-index:' + (COLLAGE - j) + '">' +
        '<img src="' + esc(im.src) + '" alt="' + esc(im.alt || title + ', screenshot ' + (j + 1)) + '" loading="lazy" decoding="async"></figure>';
    }).join('') + '</div>' +
      (n > 1 ? '<div class="gal-ui"><button type="button" class="gal-btn" data-gal="-1" aria-label="Previous screenshot">' + icon('left') + '</button><div class="gal-dots"></div>' +
        '<button type="button" class="gal-btn" data-gal="1" aria-label="Next screenshot">' + icon('right') + '</button><button type="button" class="gal-btn gal-zoom" data-gal="zoom" aria-label="Enlarge screenshot">' + icon('zoom') + '</button></div>'
        : '<div class="gal-ui"><button type="button" class="gal-btn gal-zoom" data-gal="zoom" aria-label="Enlarge screenshot">' + icon('zoom') + '</button></div>');
    const old = $('.cover, .gal', stage); if (old) old.replaceWith(g); else stage.prepend(g);

    // steps of the slideshow: the scattered view (-1, the first dot, drawn as a ring), then each screenshot
    const slides = $$('.gal-slide', g), steps = n > 1 ? [-1].concat(imgs.map((_, j) => j)) : [0], dots = $('.gal-dots', g), ui = $('.gal-ui', g);
    const s = { g, card, title, imgs, slides, step: 0 };
    s.shown = () => Math.max(0, steps[s.step]);
    s.go = (k) => {
      s.step = (k + steps.length) % steps.length; const v = steps[s.step];
      g.classList.toggle('collage', v < 0);
      slides.forEach((el, j) => el.classList.toggle('on', j === v));
      if (dots) {
        // the active dot stretches into a bar that fills up
        dots.innerHTML = steps.map((t, j) => '<button type="button" class="' + (t < 0 ? 'all' : '') + (j === s.step ? ' on' : '') + '" aria-label="' + (t < 0 ? 'All screenshots' : 'Screenshot ' + (t + 1) + ' of ' + n) + '"><b>' +
          (j === s.step ? '<i style="animation-duration:' + (t < 0 ? 6.5 : 5.5) + 's"></i>' : '') + '</b></button>').join('');
      }
    };
    s.goImage = (j) => s.go(Math.max(0, steps.indexOf(j)));
    if (dots) {
      // the active dot fills up; when it is full the slideshow moves on (pausing the fill pauses the slideshow)
      ui.addEventListener('animationend', (e) => { if (e.animationName === 'galFill' && !reduce) s.go(s.step + 1); });
      dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) s.go($$('button', dots).indexOf(b)); });
    }
    $$('[data-gal]', g).forEach((b) => b.addEventListener('click', () => { const a = b.getAttribute('data-gal'); if (a === 'zoom') openLb(s, s.shown()); else s.go(s.step + +a); }));
    let sx = null, sy = 0, swiped = false;
    g.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    g.addEventListener('pointerup', (e) => {
      if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (n > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { s.go(s.step + (dx < 0 ? 1 : -1)); swiped = true; setTimeout(() => { swiped = false; }, 400); }
    });
    g.addEventListener('pointercancel', () => { sx = null; });
    // in the scattered view, a click opens the card that was clicked
    $('.gal-frame', g).addEventListener('click', (e) => { if (swiped) return; const f = e.target.closest('.gal-slide'); openLb(s, g.classList.contains('collage') && f ? slides.indexOf(f) : s.shown()); });
    s.go(0);
    if (galIO) galIO.observe(g); else g.classList.remove('paused');
    s.destroy = () => { if (galIO) galIO.unobserve(g); };
    return s;
  }

  /* ───────── Lightbox ───────── */
  let lb = null, lbS = null, lbI = 0, lbFocus = null, lbTimer = 0;
  function lbShow(k, dir) {
    const n = lbS.imgs.length, img = $('.lb-fig img', lb); lbI = (k + n) % n; const im = lbS.imgs[lbI];
    $('.lb-title span', lb).textContent = n > 1 ? (lbI + 1) + ' / ' + n : '';
    $$('.lb-thumbs button', lb).forEach((b, j) => b.classList.toggle('on', j === lbI));
    const put = () => {
      img.src = im.src; img.alt = im.alt || lbS.title; $('.lb-fig figcaption', lb).textContent = im.caption || '';
      const done = () => requestAnimationFrame(() => img.classList.remove('swap'));
      if (img.complete) done(); else img.onload = done;
    };
    if (!dir) { put(); return; }
    lb.style.setProperty('--dir', dir); img.classList.add('swap'); setTimeout(put, 150);
  }
  function step(d) { if (lbS && lbS.imgs.length > 1) lbShow(lbI + d, d); }
  function makeLb() {
    lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Screenshot viewer');
    lb.innerHTML = '<div class="lb-top"><div class="lb-title"><b></b><span></span></div><button type="button" class="lb-btn lb-x" aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="lb-main"><button type="button" class="lb-btn lb-nav" data-d="-1" aria-label="Previous screenshot">' + icon('left') + '</button>' +
      '<figure class="lb-fig"><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-nav" data-d="1" aria-label="Next screenshot">' + icon('right') + '</button></div><div class="lb-thumbs"></div>';
    document.body.appendChild(lb);
    $('.lb-x', lb).addEventListener('click', closeLb);
    $$('.lb-nav', lb).forEach((b) => b.addEventListener('click', () => step(+b.getAttribute('data-d'))));
    $('.lb-thumbs', lb).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const j = $$('.lb-thumbs button', lb).indexOf(b); if (j !== lbI) lbShow(j, j > lbI ? 1 : -1); });
    lb.addEventListener('click', (e) => { if (e.target === lb || /\b(lb-main|lb-fig|lb-thumbs)\b/.test(e.target.className)) closeLb(); });
    let lx = null, ly = 0;
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { lx = e.clientX; ly = e.clientY; } });
    lb.addEventListener('pointerup', (e) => {
      if (lx == null || !lbS) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) closeLb();
    });
    lb.addEventListener('pointercancel', () => { lx = null; });
    addEventListener('keydown', (e) => {
      if (lb.hidden || !lbS) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(e.key === 'ArrowRight' ? 1 : -1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb).filter((b) => b.offsetParent && b.style.visibility !== 'hidden'), a = f.indexOf(document.activeElement);
        if (e.shiftKey ? a <= 0 : a === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
      }
    });
  }
  function openLb(s, k) {
    if (!lb) makeLb();
    clearTimeout(lbTimer); lbS = s; lbFocus = document.activeElement;
    lb.style.setProperty('--g1', s.g.style.getPropertyValue('--g1'));
    $('.lb-title b', lb).textContent = s.title;
    $('.lb-thumbs', lb).innerHTML = s.imgs.length < 2 ? '' : s.imgs.map((im, j) => '<button type="button" aria-label="Screenshot ' + (j + 1) + '"><img src="' + esc(im.src) + '" alt=""></button>').join('');
    $$('.lb-nav', lb).forEach((b) => { b.style.visibility = s.imgs.length < 2 ? 'hidden' : ''; });
    $('.lb-fig img', lb).classList.remove('swap'); lbShow(k, 0);
    lb.hidden = false; document.documentElement.classList.add('lb-open');
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('in')));
    $('.lb-x', lb).focus({ preventScroll: true });
  }
  function closeLb() {
    if (!lb || lb.hidden || !lbS) return;
    lbS.goImage(lbI); lb.classList.remove('in'); document.documentElement.classList.remove('lb-open');
    lbTimer = setTimeout(() => { lb.hidden = true; }, 260);
    if (lbFocus && lbFocus.focus) lbFocus.focus({ preventScroll: true }); lbS = null;
  }

  // Builds every gallery found in the data (default: window.GALLERIES) into its card.
  function mount(data) {
    data = data || window.GALLERIES || {};
    return Object.keys(data).map((key) => { const card = document.getElementById('p-' + key); return card ? build(card, data[key]) : null; }).filter(Boolean);
  }

  window.PGallery = { mount, build, partner, open: (s, k) => openLb(s, k || 0) };
})();
