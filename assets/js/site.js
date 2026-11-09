/* Nils Demougeot · portfolio v2 (vanilla JS, no build step).
   The project cards in index.html (#projects > .proj) are the single source of content. This script lays them out:
   the first FEATURED cards become large sheets, hardware demos go to the Workshop viewports, and every card is listed in the Index. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '"><use href="#i-' + id + '"/></svg>';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n, k) => String(n).padStart(k || 2, '0');
  const el = (tag, cls, inner) => { const e = document.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; };
  const safe = (fn) => { try { return fn(); } catch (err) { console.warn('[site]', err); return null; } };

  /* ───────── Settings ───────── */
  const FEATURED = 6;                                   // the first N cards of #projects get a full sheet in "Selected work"
  const GL_DEMOS = ['quake', 'hexapod', 'h160', 'rocket']; // three.js models: shown as viewports in the Workshop
  const MAIL = 'nils.demougeot@gmail.com', CV = 'assets/cv/Resume_Nils_Demougeot.pdf';
  const START = new Date(2027, 3, 1);                   // internship window opens
  const PLACES = {
    paris: { name: 'Paris', lat: 48.8566, lon: 2.3522, note: 'ESILV · home base' },
    riga: { name: 'Riga', lat: 56.9496, lon: 24.1052, note: 'RTU · exchange semester' },
    boston: { name: 'Boston', lat: 42.3601, lon: -71.0942, note: 'MIT · high school' }
  };
  // Skills: each one cites the project cards (ids) where it was used.
  const SKILLS = [
    { name: 'Data & AI', skills: [['Python', ['p-ligue1', 'p-tips', 'p-mit', 'p-uttt']], ['pandas · NumPy', ['p-ligue1', 'p-tips', 'p-mit']], ['scikit-learn', ['p-ligue1']], ['Feature engineering', ['p-ligue1']], ['Statistics', ['p-tips', 'p-ligue1']], ['Data viz', ['p-ligue1', 'p-tips', 'p-mit']]] },
    { name: 'Algorithms', skills: [['Shortest paths', ['p-livin']], ['Minimax · alpha-beta', ['p-uttt']], ['Recursion · DFS', ['p-boggle']], ['Sorting · search', ['p-boggle']], ['Simulation', ['p-mit', 'p-siem']]] },
    { name: 'Software & web', skills: [['Django', ['p-fabrique']], ['SQL', ['p-livin', 'p-doovoirs', 'p-fabrique']], ['C# · .NET', ['p-livin', 'p-boggle']], ['C++ · OOP', ['p-rpg']], ['PHP · JavaScript', ['p-doovoirs', 'p-vivesmap']], ['Figma · Webflow', ['p-boudoubox', 'p-vivesmap']]] },
    { name: 'Security data', skills: [['CrowdStrike NG-SIEM', ['p-siem']], ['Log queries', ['p-siem']], ['Dashboards', ['p-siem']], ['Alerting', ['p-siem']]] },
    { name: 'Networks', skills: [['Network coding', ['p-mit']], ['Channel models', ['p-mit']], ['Probability', ['p-mit']]] },
    { name: 'Hardware & CAD', skills: [['Arduino · sensors', ['p-quake']], ['SolidWorks', ['p-hexapod', 'p-h160', 'p-rocket']], ['CNC · laser cutting', ['p-rocket', 'p-hexapod']], ['3D printing', ['p-quake']]] },
    { name: 'Product & teams', skills: [['Pitching', ['p-fabrique', 'p-distraction', 'p-sport']], ['Business model', ['p-fabrique', 'p-distraction']], ['Explaining tech', ['p-seechy', 'p-mit']]] }
  ];

  const toastEl = $('#toast'); let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200); }
  function scrollToEl(node, block) { if (node) node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: block || 'start' }); }

  /* ───────── Sheets: zone references, top bar, bottom bar ───────── */
  const sheets = $$('.sheet');
  sheets.forEach((s) => {
    const zx = el('div', 'zx'), zy = el('div', 'zy'); zx.setAttribute('aria-hidden', 'true'); zy.setAttribute('aria-hidden', 'true');
    zx.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => '<span>' + n + '</span>').join('');
    s.prepend(zx, zy);
    const fill = () => { const n = clamp(Math.round(s.offsetHeight / 240), 2, 20); if (zy.childElementCount !== n) zy.innerHTML = Array.from({ length: n }, (_, i) => '<span>' + String.fromCharCode(65 + i) + '</span>').join(''); };
    fill(); if ('ResizeObserver' in window) new ResizeObserver(fill).observe(s);
  });
  const navLinks = $$('.bar-nav a'), bbNo = $('#bbNo'), bbName = $('#bbName'), bbProg = $('#bbProg');
  let navRaf = 0, curSheet = -1;
  function navSync() {
    navRaf = 0; let cur = 0;
    sheets.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * 0.4) cur = i; });
    const max = html.scrollHeight - innerHeight;
    if (max > 0 && scrollY >= max - 4) cur = sheets.length - 1;
    bbProg.style.transform = 'scaleX(' + (max > 0 ? clamp(scrollY / max, 0, 1) : 0).toFixed(4) + ')';
    if (cur === curSheet) return; curSheet = cur;
    const id = sheets[cur].id;
    navLinks.forEach((a) => { const on = a.getAttribute('href') === '#' + id; a.classList.toggle('is-on', on); if (on && a.scrollIntoView && innerWidth < 900) a.parentElement.scrollTo({ left: a.offsetLeft - 60, behavior: 'smooth' }); });
    bbNo.textContent = pad(cur + 1); bbName.textContent = sheets[cur].getAttribute('data-sheet') || id;
  }
  addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navSync); }, { passive: true });
  addEventListener('resize', navSync);
  // live readouts: pointer position, Paris time
  if (fine) { const bx = $('#bbX'), by = $('#bbY'); let px = 0, py = 0, r = 0; addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!r) r = requestAnimationFrame(() => { r = 0; bx.textContent = pad(Math.round(px), 4); by.textContent = pad(Math.round(py), 4); }); }, { passive: true }); }
  const clock = $('#clock'), bbClock = $('#bbClock');
  const fmtT = safe(() => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
  function tickClock() { if (!fmtT) return; const t = fmtT.format(new Date()); if (clock) clock.textContent = t + ' · Paris'; if (bbClock) bbClock.textContent = t.slice(0, 5); }
  tickClock(); setInterval(tickClock, 1000);

  /* ───────── Title sheet: the name reacts to the pointer (variable font, width + weight axes) ───────── */
  const hero = $('.hero'), nameEl = $('#name');
  const chars = [];
  $$('.ln', nameEl).forEach((ln) => { const t = ln.textContent; ln.textContent = ''; t.split('').forEach((ch) => { const s = el('span', 'ch'); s.textContent = ch; s.style.setProperty('--i', chars.length); ln.appendChild(s); chars.push({ s, wd: 112, wg: 900 }); }); });
  (function kinetic() {
    if (reduce) return;
    let mx = -1e4, my = -1e4, raf = 0, vis = true, t0 = performance.now(), calm = 0;
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      const t = (now - t0) / 1000; let moving = false;
      chars.forEach((c, i) => {
        const r = c.s.getBoundingClientRect(), d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2)), near = Math.pow(clamp(1 - d / (r.height * 1.7), 0, 1), 1.4);
        const wave = Math.sin(t * 1.1 - i * 0.62) * 0.5 + 0.5; // a slow swell travels along the name
        const wd = 98 + wave * 12 + near * 27, wg = 760 + wave * 60 + near * 140;
        c.wd += (Math.min(125, wd) - c.wd) * 0.14; c.wg += (Math.min(900, wg) - c.wg) * 0.14;
        c.s.style.setProperty('--wd', c.wd.toFixed(1)); c.s.style.setProperty('--wg', c.wg.toFixed(0));
        if (near > 0.01) moving = true;
      });
      calm = moving ? 0 : calm + 1;
      raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) kick(); }).observe(nameEl);
    document.addEventListener('visibilitychange', kick);
    setTimeout(kick, 1400); // after the letters have risen in
  })();
  // portrait: plotted as a halftone of dots (hover shows the photo)
  (function portrait() {
    const cv = $('#portrait'), img = $('.tb-photo img'); if (!cv || !img) return;
    const go = () => safe(() => {
      const N = 46, s = document.createElement('canvas'); s.width = s.height = N; const x = s.getContext('2d');
      const k = Math.min(img.naturalWidth, img.naturalHeight); x.drawImage(img, (img.naturalWidth - k) / 2, (img.naturalHeight - k) * 0.25, k, k, 0, 0, N, N);
      const d = x.getImageData(0, 0, N, N).data, c = cv.getContext('2d'), W = cv.width, cell = W / N;
      let lo = 255, hi = 0; const L = new Float32Array(N * N);
      for (let i = 0; i < N * N; i++) { L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; lo = Math.min(lo, L[i]); hi = Math.max(hi, L[i]); }
      c.clearRect(0, 0, W, W); c.fillStyle = '#fff';
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = Math.pow((L[j * N + i] - lo) / (hi - lo || 1), 1.25), r = v * cell * 0.62; if (r < 0.25) continue; c.beginPath(); c.arc((i + 0.5 + (j % 2 ? 0.25 : -0.25)) * cell, (j + 0.5) * cell, r, 0, 6.2832); c.fill(); }
    }) === null && html.classList.add('no-portrait');
    if (img.complete && img.naturalWidth) go(); else { img.addEventListener('load', go); img.addEventListener('error', () => html.classList.add('no-portrait')); }
  })();
  const ready = () => hero.classList.add('ready');
  (document.fonts && document.fonts.load ? document.fonts.load('900 60px Archivo') : Promise.resolve()).then(ready, ready); setTimeout(ready, 700);

  /* ───────── Project cards → sheets, viewports, index rows ───────── */
  const GAL = window.GALLERIES || {};
  const cards = $$('#projects > .proj').map((node, i) => {
    const key = node.id.replace(/^p-/, ''), demoKey = node.getAttribute('data-demo') || '', cats = (node.getAttribute('data-cat') || '').split(/\s+/).filter(Boolean);
    const foot = ($('.proj-foot > span', node) || {}).textContent || '', yr = /(20\d\d)(?:\s*[–-]\s*(20)?(\d\d))?/.exec(foot);
    const kind = i < FEATURED ? 'sheet' : (GL_DEMOS.includes(demoKey) ? 'cad' : 'row');
    return { node, key, i, n: pad(i + 1), demoKey, cats, kind, title: $('h3', node).textContent.trim(), tag: ($('.tag', node) || {}).textContent || '', foot: foot.trim(), year: yr ? (yr[3] ? yr[1].slice(2) + '–' + yr[3] : yr[1]) : '', file: ($('.file', node) || {}).textContent || '',
      imgs: ((GAL[key] || {}).images || []), link: $('.proj-link', node) };
  });
  const byId = {}; cards.forEach((c) => { byId[c.node.id] = c; });

  cards.forEach((c) => {
    const node = c.node, bar = $('.proj-bar', node), stage = $('.proj-stage', node), body = $('.proj-body', node), title = $('.proj-title', node);
    const head = el('div', 'proj-head', '<span class="proj-num">' + c.n + '</span>'); head.appendChild(title);
    const screen = el('div', 'proj-screen'); screen.setAttribute('data-key', c.key); screen.append(bar, stage);
    node.prepend(head); node.insertBefore(screen, body);
    c.screen = screen; c.body = body;
    bar.insertAdjacentHTML('afterbegin', '<span class="fig">Fig. ' + c.n + '</span>');
    if (c.demoKey) {
      const fs = el('button', 'scr-fs', icon('maximize')); fs.type = 'button'; fs.setAttribute('aria-label', 'Full screen'); fs.title = 'Full screen';
      fs.addEventListener('click', (e) => { e.stopPropagation(); setFull(c.demoKey, !screen.classList.contains('is-full')); });
      bar.appendChild(fs);
    } else { // no demo: the first screenshot takes the stage
      if (c.imgs.length) { const b = el('button', 'shot', '<img src="' + esc(c.imgs[0].src) + '" alt="' + esc(c.imgs[0].alt || c.title + ', screenshot') + '" loading="lazy" decoding="async">'); b.type = 'button'; b.setAttribute('aria-label', 'Open the screenshots of ' + c.title); b.addEventListener('click', () => openLb(c, 0)); stage.appendChild(b); }
      else stage.appendChild(el('div', 'shot-none', esc(($('.cover span', node) || {}).textContent || c.title)));
    }
    const strip = c.imgs.length > (c.demoKey ? 0 : 1) ? thumbs(c, 'plates', '<span>' + (c.demoKey ? 'Real screenshots' : 'More') + ' · ' + c.imgs.length + '</span>') : null;
    if (strip) screen.appendChild(strip);
    node.classList.add('is-' + c.kind);
  });
  function thumbs(c, cls, lead) {
    const w = el('div', cls, lead || '');
    c.imgs.forEach((im, j) => { const b = el('button', '', '<img src="' + esc(im.src) + '" alt="" loading="lazy" decoding="async">'); b.type = 'button'; b.setAttribute('aria-label', c.title + ', screenshot ' + (j + 1)); b.addEventListener('click', (e) => { e.stopPropagation(); openLb(c, j); }); w.appendChild(b); });
    return w;
  }
  // dimension line under each featured screen: its real size on your display
  cards.filter((c) => c.kind === 'sheet').forEach((c) => {
    const d = el('div', 'dimline'); d.setAttribute('aria-hidden', 'true'); c.screen.appendChild(d);
    const set = () => { const r = c.screen.getBoundingClientRect(); d.textContent = Math.round(r.width) + ' × ' + Math.round(r.height) + ' px' + (c.demoKey ? ' · live canvas, not a video' : ''); };
    set(); if ('ResizeObserver' in window) new ResizeObserver(set).observe(c.screen);
    c.screen.classList.add('rv'); c.body.classList.add('rv'); c.body.style.setProperty('--d', '120ms');
  });

  /* ───────── Workshop ───────── */
  const cadCards = cards.filter((c) => c.kind === 'cad'), cadViews = $('#cadViews'), cadProps = $('#cadProps');
  let cadSel = null;
  function cadSelect(key, quiet) {
    if (cadSel === key) return; cadSel = key;
    cadCards.forEach((c) => { const on = c.key === key; c.view.classList.toggle('is-sel', on); c.node.classList.toggle('is-sel', on); c.tab.classList.toggle('is-sel', on); c.tab.setAttribute('aria-pressed', on); });
    if (!quiet) pick();
  }
  if (cadCards.length) {
    const tabs = el('div', 'cad-tabs'); $('#cad').prepend(tabs);
    cadCards.forEach((c, j) => {
      const v = el('div', 'cad-view'); v.setAttribute('data-key', c.key); v.appendChild(c.screen); cadViews.appendChild(v); c.view = v;
      $('.fig', c.screen).textContent = 'View ' + (j + 1) + ' · fig. ' + c.n;
      v.addEventListener('pointerdown', () => cadSelect(c.key)); v.addEventListener('focusin', () => cadSelect(c.key));
      if (c.imgs.length) c.body.appendChild(thumbs(c, 'cad-plates'));
      cadProps.appendChild(c.node);
      c.tab = el('button', '', esc(c.title.replace(/ in 3D| Puzzle|-Resistant/g, ''))); c.tab.type = 'button'; c.tab.addEventListener('click', () => cadSelect(c.key)); tabs.appendChild(c.tab);
    });
    cadSelect(cadCards[0].key, true);
  } else { $('#workshop').hidden = true; const a = $('.bar-nav a[href="#workshop"]'); if (a) a.hidden = true; }

  /* ───────── Index ───────── */
  const ix = $('#ix');
  cards.forEach((c) => {
    const row = el('div', 'ix-row'); row.id = 'ix-' + c.key; row.setAttribute('role', 'listitem'); c.row = row;
    const jump = c.kind !== 'row';
    row.innerHTML = '<button type="button" class="ix-btn"' + (jump ? '' : ' aria-expanded="false"') + '><span class="ix-n">' + c.n + '</span><span class="ix-t">' + esc(c.title) + '</span><span class="ix-tag">' + esc(c.tag) + '</span><span class="ix-ctx">' + esc(c.foot) + '</span>' +
      (c.demoKey ? '<span class="ix-flag live">live</span>' : '<span class="ix-flag">' + esc(c.year) + '</span>') + icon(jump ? 'arrow-up' : 'plus', 'ix-go') + '</button>';
    if (!jump) { const d = el('div', 'ix-detail', '<div></div>'); d.firstChild.appendChild(c.node); row.appendChild(d); }
    $('.ix-btn', row).addEventListener('click', () => { if (jump) goTo(c.node.id); else openRow(c, !row.classList.contains('is-open')); });
    ix.appendChild(row);
  });
  function openRow(c, on) {
    c.row.classList.toggle('is-open', on); $('.ix-btn', c.row).setAttribute('aria-expanded', on);
    if (on && c.row.getBoundingClientRect().top > innerHeight * 0.3) scrollToEl(c.row);
    if (!on && c.demoKey && state.act === c.demoKey) stopDemo();
    if (on && c.demoKey) setTimeout(() => { demo(c.demoKey); pick(); }, 520);
  }
  // filters (the chips count their own cards)
  let filter = 'all';
  const chips = $$('.pf');
  function applyFilter(f) {
    filter = f;
    cards.forEach((c) => { const show = f === 'all' || c.cats.includes(f); c.row.hidden = !show; if (!show && c.row.classList.contains('is-open')) openRow(c, false); });
    chips.forEach((b) => { const on = b.getAttribute('data-filter') === f; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  }
  chips.forEach((b) => { const f = b.getAttribute('data-filter'), n = f === 'all' ? cards.length : cards.filter((c) => c.cats.includes(f)).length, k = $('b', b); if (k) k.textContent = n; b.addEventListener('click', () => applyFilter(f)); });
  // hovering a row shows its first screenshot next to the pointer
  if (fine) {
    const peek = $('#peek'), pim = $('img', peek); let cur = null, raf = 0, px = 0, py = 0;
    const move = () => { raf = 0; const w = peek.offsetWidth, h = peek.offsetHeight; peek.style.transform = 'translate(' + Math.round(clamp(px + 28, 8, innerWidth - w - 18)) + 'px,' + Math.round(clamp(py - h / 2, 48, innerHeight - h - 44)) + 'px)'; };
    ix.addEventListener('pointermove', (e) => {
      const b = e.target.closest('.ix-btn'), c = b && cards.find((k) => k.row === b.parentElement), src = c && !c.row.classList.contains('is-open') && c.imgs[0] ? c.imgs[0].src : null;
      if (src !== cur) { cur = src; if (src) pim.src = src; peek.classList.toggle('on', !!src); }
      px = e.clientX; py = e.clientY; if (src && !raf) raf = requestAnimationFrame(move);
    });
    ix.addEventListener('pointerleave', () => { cur = null; peek.classList.remove('on'); });
    addEventListener('scroll', () => { if (cur) { cur = null; peek.classList.remove('on'); } }, { passive: true });
  }

  // Go to a card wherever it lives (sheet, viewport or index row).
  function goTo(id) {
    const c = byId[id]; if (!c) { scrollToEl(document.getElementById(id)); return; }
    if (c.kind === 'sheet') scrollToEl(c.node);
    else if (c.kind === 'cad') { cadSelect(c.key); scrollToEl($('#cad'), innerWidth < 900 ? 'start' : 'center'); }
    else { if (c.row.hidden) applyFilter('all'); openRow(c, true); scrollToEl(c.row); }
    safe(() => history.replaceState(null, '', '#' + id));
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#p-"]'); if (a && byId[a.getAttribute('href').slice(1)]) { e.preventDefault(); goTo(a.getAttribute('href').slice(1)); }
  });

  /* ───────── Live demos (engine from widgets.js / demos.js) ───────── */
  const state = { act: null, stab: true }, bbLive = $('#bbLive');
  const D = {};
  cards.filter((c) => c.demoKey).forEach((c) => { D[c.demoKey] = { c, screen: c.screen, cv: $('.pip-canvas canvas', c.screen), w: undefined, ratio: 0 }; c.screen.setAttribute('data-demo-key', c.demoKey); });
  const DEMOS = {
    ligue1: (cv, o) => PW.predictor(cv, o), siem: (cv, o) => PW.siem(cv, o), mit: (cv, o) => PW.rlnc(cv, o), uttt: (cv, o) => PW.uttt(cv, o), fabrique: (cv, o) => PW.fabric(cv, o),
    livin: (cv, o) => PW.metro(cv, o), tips: (cv, o) => PW.tips(cv, o), boggle: (cv, o) => PW.boggle(cv, o), rpg: (cv, o) => PW.rpg(cv, o),
    hexapod: (cv, o) => PW.hexapod(cv, o), h160: (cv, o) => PW.h160(cv, o), rocket: (cv, o) => PW.rocket(cv, o),
    quake: (cv, o) => {
      const note = $('.pip-note', o.card), base = note ? note.innerHTML : ''; let fell = false;
      const set = (id, v) => { const n = $('#' + id); if (n) n.textContent = v; };
      const w = PW.platform(cv, { onState: (s) => {
        if (note && s.fallen !== fell) { fell = s.fallen; note.innerHTML = fell ? '<b class="rose">the tower fell!</b> turn the stabilizer on to rebuild' : base; }
        if (!fell) { set('pitch', s.pitch.toFixed(1)); set('roll', s.roll.toFixed(1)); }
      } });
      w.setStab(state.stab);
      return { quake: () => w.quake(1.2), stab: toggleStab, setStab: w.setStab, destroy: w.destroy };
    }
  };
  function demo(k) {
    const d = D[k]; if (!d) return null;
    if (d.w === undefined && window.PW && PW.predictor && DEMOS[k] && (!GL_DEMOS.includes(k) || window.THREE)) {
      const out = (name, v) => $$('[data-out="' + name + '"]', d.screen).forEach((e) => { e.innerHTML = v; });
      d.w = safe(() => DEMOS[k](d.cv, { card: d.screen, out }));
      PW.pause(d.cv, state.act !== k);
    }
    return d.w || null;
  }
  function setLive(k, on) {
    const d = D[k]; if (!d) return;
    if (!on && d.screen.classList.contains('is-full')) setFull(k, false);
    d.screen.classList.toggle('is-live', on); const em = $('.status em', d.screen); if (em) em.textContent = on ? 'live' : 'paused';
    if (window.PW) PW.pause(d.cv, !on);
    const w = demo(k); if (w && w.live) w.live(on);
  }
  function activate(k) {
    if (!D[k]) return; demo(k);
    if (state.act != null && state.act !== k) setLive(state.act, false);
    setLive(k, true); state.act = k;
    bbLive.textContent = 'live · ' + (D[k].c.file || D[k].c.title); bbLive.classList.add('on');
  }
  function stopDemo() { if (state.act != null) setLive(state.act, false); state.act = null; bbLive.textContent = 'no demo running'; bbLive.classList.remove('on'); }
  function toggleStab() {
    state.stab = !state.stab; const w = demo('quake'); if (w) w.setStab(state.stab);
    const l = $('#stabLabel'), dot = $('#stabDot'); if (l) l.textContent = state.stab ? 'Stabilizer ON' : 'Stabilizer OFF'; if (dot) dot.style.background = state.stab ? '#34d399' : '#f43f5e';
  }
  function setFull(k, on) {
    const d = D[k]; if (!d) return; const b = $('.scr-fs', d.screen);
    d.screen.classList.toggle('is-full', on); html.classList.toggle('demo-full', on);
    if (b) { b.innerHTML = icon(on ? 'minimize' : 'maximize'); b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen'); }
    if (on) activate(k);
    try {
      if (on && d.screen.requestFullscreen) d.screen.requestFullscreen().then(() => { if (!fine && screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) { /* the CSS overlay works on its own where the Fullscreen API is missing (iPhone) */ }
    if (!on) pick();
  }
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) Object.keys(D).forEach((k) => { if (D[k].screen.classList.contains('is-full')) setFull(k, false); }); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') Object.keys(D).forEach((k) => { if (D[k].screen.classList.contains('is-full')) setFull(k, false); }); });
  // The demo most in view runs; the others sleep.
  let pickRaf = 0;
  function pick() { if (!pickRaf) pickRaf = requestAnimationFrame(doPick); }
  function doPick() {
    pickRaf = 0; let best = null, br = 0.5;
    Object.keys(D).forEach((k) => {
      const d = D[k]; if (d.screen.classList.contains('is-full')) { best = k; br = 9; return; }
      if (d.c.kind === 'cad' && cadSel !== d.c.key) return;
      if (d.c.kind === 'row' && !d.c.row.classList.contains('is-open')) return;
      if (d.ratio > br) { br = d.ratio; best = k; }
    });
    if (best === state.act) return;
    if (best) activate(best); else stopDemo();
  }
  function startDemos() {
    if (!window.PW) return;
    const near = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { near.unobserve(e.target); demo(e.target.getAttribute('data-demo-key')); } }), { rootMargin: '400px 0px' });
    const view = new IntersectionObserver((es) => { es.forEach((e) => { const d = D[e.target.getAttribute('data-demo-key')]; if (d) d.ratio = e.isIntersecting ? e.intersectionRatio : 0; }); pick(); }, { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] });
    Object.keys(D).forEach((k) => { near.observe(D[k].screen); view.observe(D[k].screen); });
  }
  document.addEventListener('click', (e) => {
    const run = e.target.closest('[data-activate]'); if (run) { const s = run.closest('[data-demo-key]'); if (s) { const k = s.getAttribute('data-demo-key'); if (D[k].c.kind === 'cad') cadSelect(k, true); activate(k); } return; }
    const b = e.target.closest('[data-act]'), s = b && b.closest('[data-demo-key]'); if (!s) return;
    const k = s.getAttribute('data-demo-key'), w = demo(k), a = b.getAttribute('data-act'); if (state.act !== k) activate(k);
    if (w && typeof w[a] === 'function') w[a](b);
  });
  // from the palette: bring a demo on screen, then press one of its buttons
  function runDemo(k, method) { const d = D[k]; if (!d) return; goTo(d.c.node.id); setTimeout(() => { activate(k); const w = demo(k); if (w && method && typeof w[method] === 'function') w[method](); }, reduce ? 50 : 900); }

  /* ───────── Screenshot viewer ───────── */
  const lb = $('#lb'), lbImg = $('#lbImg'); let lbC = null, lbI = 0;
  function lbShow(i) {
    const n = lbC.imgs.length; lbI = (i + n) % n; const im = lbC.imgs[lbI];
    lbImg.src = im.src; lbImg.alt = im.alt || lbC.title + ', screenshot ' + (lbI + 1);
    $('#lbCap').textContent = im.caption || ''; $('#lbTitle').textContent = 'Fig. ' + lbC.n + ' · ' + lbC.title; $('#lbCount').textContent = pad(lbI + 1) + ' / ' + pad(n);
    $('#lbPrev').style.visibility = $('#lbNext').style.visibility = n > 1 ? '' : 'hidden';
  }
  function openLb(c, i) { lbC = c; lbShow(i); if (!lb.open) lb.showModal(); }
  $('#lbClose').addEventListener('click', () => lb.close()); $('#lbPrev').addEventListener('click', () => lbShow(lbI - 1)); $('#lbNext').addEventListener('click', () => lbShow(lbI + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') lb.close(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') lbShow(lbI - 1); else if (e.key === 'ArrowRight') lbShow(lbI + 1); });
  let tx0 = null; lb.addEventListener('touchstart', (e) => { tx0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (tx0 == null) return; const dx = e.changedTouches[0].clientX - tx0; tx0 = null; if (Math.abs(dx) > 50) lbShow(lbI + (dx < 0 ? 1 : -1)); });

  /* ───────── Path: plotted globe, timeline, Gantt ───────── */
  const globe = (function () {
    const cv = $('#globe'); if (!cv || !window.LAND_110M) return null;
    const c = cv.getContext('2d'), RAD = Math.PI / 180;
    // TopoJSON → rings of unit vectors
    const topo = window.LAND_110M, sc = topo.transform.scale, tr = topo.transform.translate;
    const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map((p) => { x += p[0]; y += p[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; }); });
    const vec = (lon, lat) => { const l = lon * RAD, p = lat * RAD, cp = Math.cos(p); return [cp * Math.sin(l), Math.sin(p), cp * Math.cos(l)]; };
    const rings = [];
    topo.objects.land.geometries.forEach((g) => (g.type === 'Polygon' ? [g.arcs] : g.arcs).forEach((poly) => poly.forEach((ring) => {
      const pts = []; ring.forEach((ai) => { const a = ai < 0 ? arcs[~ai].slice().reverse() : arcs[ai]; a.forEach((p, k) => { if (k || !pts.length) pts.push(vec(p[0], p[1])); }); });
      if (pts.length > 3) rings.push(pts);
    })));
    const grat = [];
    for (let lon = -180; lon < 180; lon += 30) { const l = []; for (let lat = -85; lat <= 85; lat += 5) l.push(vec(lon, lat)); grat.push(l); }
    for (let lat = -60; lat <= 60; lat += 30) { const l = []; for (let lon = -180; lon <= 180; lon += 5) l.push(vec(lon, lat)); grat.push(l); }
    const pl = Object.keys(PLACES).map((id) => Object.assign({ id, v: vec(PLACES[id].lon, PLACES[id].lat) }, PLACES[id]));
    const home = pl[0];
    const arcsTo = pl.slice(1).map((p) => { // great circles from Paris, lifted off the surface in the middle
      const a = home.v, b = p.v, om = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)), out = [];
      for (let k = 0; k <= 48; k++) { const t = k / 48, s0 = Math.sin((1 - t) * om) / Math.sin(om), s1 = Math.sin(t * om) / Math.sin(om), h = 1 + 0.16 * Math.sin(Math.PI * t) * Math.min(1, om * 1.4); out.push([(a[0] * s0 + b[0] * s1) * h, (a[1] * s0 + b[1] * s1) * h, (a[2] * s0 + b[2] * s1) * h]); }
      return { id: p.id, pts: out };
    });
    let W = 2, H = 2, dpr = 1, lon0 = -24, lat0 = 44, tlon = lon0, tlat = lat0, vlon = 0, down = false, lx = 0, ly = 0, vis = false, raf = 0, focus = null, hold = 0, last = 0;
    let cl, sl, cp, sp;
    const rot = (v) => { const x = v[0] * cl - v[2] * sl, z = v[0] * sl + v[2] * cl; return [x, v[1] * cp - z * sp, v[1] * sp + z * cp]; };
    function line(pts, R, cx, cy) {
      let prev = null, pen = false;
      for (let i = 0; i < pts.length; i++) {
        const q = rot(pts[i]);
        if (prev) {
          if (prev[2] > 0 && q[2] > 0) { if (!pen) { c.moveTo(cx + prev[0] * R, cy - prev[1] * R); pen = true; } c.lineTo(cx + q[0] * R, cy - q[1] * R); }
          else if (prev[2] > 0 !== q[2] > 0) { // crosses the limb: cut the segment there
            const t = prev[2] / (prev[2] - q[2]), mx = prev[0] + (q[0] - prev[0]) * t, my = prev[1] + (q[1] - prev[1]) * t, k = 1 / (Math.hypot(mx, my) || 1), ex = cx + mx * k * R, ey = cy - my * k * R;
            if (prev[2] > 0) { if (!pen) c.moveTo(cx + prev[0] * R, cy - prev[1] * R); c.lineTo(ex, ey); pen = false; } else { c.moveTo(ex, ey); c.lineTo(cx + q[0] * R, cy - q[1] * R); pen = true; }
          } else pen = false;
        }
        prev = q;
      }
    }
    function draw(now) {
      const R = Math.min(W, H) * 0.43, cx = W / 2, cy = H / 2;
      cl = Math.cos(lon0 * RAD); sl = Math.sin(lon0 * RAD); cp = Math.cos(lat0 * RAD); sp = Math.sin(lat0 * RAD);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); c.lineJoin = 'round'; c.lineCap = 'round';
      c.fillStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.beginPath(); grat.forEach((g) => line(g, R, cx, cy)); c.stroke();
      c.strokeStyle = '#fff'; c.lineWidth = 1.25; c.beginPath(); rings.forEach((r) => line(r, R, cx, cy)); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
      // ticks around the limb, like a protractor
      c.lineWidth = 1; c.beginPath(); for (let a = 0; a < 360; a += 10) { const k = a % 30 ? 5 : 10, ca = Math.cos(a * RAD), sa = Math.sin(a * RAD); c.moveTo(cx + ca * (R + 4), cy + sa * (R + 4)); c.lineTo(cx + ca * (R + 4 + k), cy + sa * (R + 4 + k)); } c.stroke();
      // routes
      c.strokeStyle = '#FFD60A'; c.lineWidth = 1.6; c.setLineDash([5, 5]); c.lineDashOffset = reduce ? 0 : -(now / 60) % 10;
      arcsTo.forEach((a) => { c.globalAlpha = !focus || focus === a.id || focus === 'paris' ? 1 : 0.35; c.beginPath(); line(a.pts, R, cx, cy); c.stroke(); });
      c.setLineDash([]); c.globalAlpha = 1;
      // places
      c.font = '500 11px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'middle';
      pl.forEach((p) => {
        const q = rot(p.v); if (q[2] <= 0.02) return; const x = cx + q[0] * R, y = cy - q[1] * R, on = focus === p.id;
        if (on && !reduce) { const k = (now / 1300) % 1; c.strokeStyle = 'rgba(255,214,10,' + (1 - k).toFixed(2) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 6 + k * 16, 0, 6.2832); c.stroke(); }
        c.fillStyle = '#FFD60A'; c.beginPath(); c.arc(x, y, on ? 6 : 4.5, 0, 6.2832); c.fill(); c.strokeStyle = '#002FFF'; c.lineWidth = 1.5; c.stroke();
        const left = p.id === 'boston', t = p.name.toUpperCase(), tw = c.measureText(t).width + 12, bx = left ? x - 12 - tw : x + 12;
        c.fillStyle = on ? '#FFD60A' : '#fff'; c.fillRect(bx, y - 9, tw, 18); c.fillStyle = on ? '#070B1F' : '#002FFF'; c.textAlign = 'left'; c.fillText(t, bx + 6, y + 0.5);
      });
    }
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return; const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (!down) {
        if (hold > 0) { hold -= dt; lon0 += vlon; vlon *= 0.92; tlon = lon0; tlat = lat0; }
        else { let d = ((tlon - lon0 + 540) % 360) - 180; lon0 += d * Math.min(1, dt * 3.2); lat0 += (tlat - lat0) * Math.min(1, dt * 3.2); }
      }
      draw(now); raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf && vis) { last = performance.now(); if (reduce) draw(last); else raf = requestAnimationFrame(frame); } };
    function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(2, r.width); H = Math.max(2, r.height); cv.width = W * dpr; cv.height = H * dpr; draw(performance.now()); }
    new ResizeObserver(resize).observe(cv);
    new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; kick(); }).observe(cv);
    document.addEventListener('visibilitychange', kick);
    cv.addEventListener('pointerdown', (e) => { down = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (!down) return; const k = 0.42 * 420 / Math.min(W, H); vlon = -(e.clientX - lx) * k; lon0 += vlon; lat0 = clamp(lat0 + (e.clientY - ly) * k, -70, 80); lx = e.clientX; ly = e.clientY; hold = 4; if (reduce) draw(0); });
    const up = () => { down = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return {
      focus(id) { // centre the view between the place and the Atlantic, so the other two stay in sight
        focus = id; hold = 0; const p = PLACES[id];
        if (p) { tlon = -24 + (p.lon + 24) * 0.62; tlat = 44 + (p.lat - 44) * 0.6; } else { tlon = -24; tlat = 44; }
        if (reduce) { lon0 = tlon; lat0 = tlat; draw(0); }
        const cap = $('#globeCap'); if (cap) cap.textContent = p ? p.name + ' · ' + Math.abs(p.lat).toFixed(2) + '° N · ' + Math.abs(p.lon).toFixed(2) + '° ' + (p.lon < 0 ? 'W' : 'E') + ' · ' + p.note : 'Orthographic projection · drag to rotate';
      }
    };
  })();
  (function timeline() {
    const rows = $$('#tl li'); if (!rows.length) return;
    let tour = 0, k = 0, hovering = false, seen = false;
    const set = (li) => { rows.forEach((r) => r.classList.toggle('is-on', r === li)); if (globe) globe.focus(li ? li.getAttribute('data-place') : null); };
    rows.forEach((li) => {
      li.addEventListener('pointerenter', () => { hovering = true; set(li); });
      li.addEventListener('pointerleave', () => { hovering = false; });
      li.addEventListener('click', () => set(li));
    });
    // left alone, the list walks through the stops by itself
    const step = () => { if (hovering || !seen || document.hidden) return; set(rows[k % rows.length]); k++; };
    if (!reduce) new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; if (seen && !tour) { step(); tour = setInterval(step, 3400); } else if (!seen && tour) { clearInterval(tour); tour = 0; } }, { threshold: 0.3 }).observe($('#tl'));
  })();
  (function gantt() {
    const g = $('#gantt'); if (!g) return;
    const Y0 = 2021, YN = 8, pos = (y, m) => ((y - Y0) + (m - 1) / 12) / YN * 100;
    const bar = (a, b, label, cls) => '<div class="g-bar ' + (cls || '') + '" style="left:' + pos(a[0], a[1]).toFixed(2) + '%;width:' + (pos(b[0], b[1]) - pos(a[0], a[1])).toFixed(2) + '%;--d:' + Math.round(pos(a[0], a[1]) * 9) + 'ms"><span>' + label + '</span></div>';
    const now = new Date(), nowP = clamp(pos(now.getFullYear(), now.getMonth() + 1 + now.getDate() / 31), 0, 100);
    g.innerHTML = '<div class="g-axis" style="grid-template-columns:repeat(' + YN + ',1fr)">' + Array.from({ length: YN }, (_, i) => '<span>' + (Y0 + i) + '</span>').join('') + '</div>' +
      '<div class="g-rows" style="--yw:' + (100 / YN) + '%"><div class="g-now" style="left:' + nowP.toFixed(2) + '%"></div>' +
      '<div class="g-row">' + bar([2021, 9], [2023, 7], 'High school · Boston') + bar([2023, 9], [2028, 7], 'ESILV Paris · Data &amp; AI engineering') + '</div>' +
      '<div class="g-row">' + bar([2022, 7], [2022, 9], 'MIT research', 'y out') + bar([2025, 6], [2025, 9], 'SOC internship', 'y out lft') + bar([2027, 4], [2027, 9], 'Internship wanted', 'h out lft') + '</div>' +
      '<div class="g-row">' + bar([2025, 8], [2026, 2], 'Riga exchange', 'y out') + '</div>' +
      '<div class="g-row">' + bar([2025, 9], [2026, 7], 'La Fabrique', 'y out') + '</div></div>';
  })();

  /* ───────── Skills: every skill cites its projects ───────── */
  (function spec() {
    const host = $('#spec'); if (!host) return; let total = 0;
    host.innerHTML = SKILLS.map((grp) => '<div class="sp rv"><h3>' + esc(grp.name) + '<small>' + pad(grp.skills.length) + '</small></h3><ul>' + grp.skills.map(([name, used]) => { total++; return '<li><span>' + esc(name) + '</span>' + used.filter((id) => byId[id]).map((id) => '<a class="ref" href="#' + id + '" data-id="' + id + '" data-t="' + esc(byId[id].title) + '">' + byId[id].n + '</a>').join('') + '</li>'; }).join('') + '</ul></div>').join('') +
      '<div class="sp-note rv"><b>' + total + '</b><span>skills, each one backed by at least one of the ' + cards.length + ' projects in the index.</span></div>';
    $$('.sp, .sp-note', host).forEach((n, i) => n.style.setProperty('--d', i * 60 + 'ms'));
    const hot = (id) => $$('.ref', host).forEach((r) => r.classList.toggle('hot', !!id && r.getAttribute('data-id') === id));
    host.addEventListener('pointerover', (e) => { const r = e.target.closest('.ref'); hot(r ? r.getAttribute('data-id') : null); });
    host.addEventListener('pointerleave', () => hot(null));
  })();

  /* ───────── Contact ───────── */
  const mailBtn = $('#mailCopy');
  function copyMail() {
    const done = () => { toast('Email address copied'); const i = $('em i', mailBtn); if (i) { i.textContent = 'copied'; setTimeout(() => { i.textContent = 'copy'; }, 1800); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(MAIL).then(done, () => { location.href = 'mailto:' + MAIL; }); else location.href = 'mailto:' + MAIL;
  }
  if (mailBtn) mailBtn.addEventListener('click', copyMail);
  (function avail() { const n = $('#availN'); if (!n) return; const days = Math.ceil((START - new Date()) / 864e5); n.textContent = days > 0 ? 'opens in ' + days + ' days · April 2027' : 'open now · 4 to 5 months'; })();
  // numbers count up when they come into view
  function countUp(b) {
    const to = +b.getAttribute('data-count'), unit = b.getAttribute('data-unit') || ''; if (reduce || !to) return; const t0 = performance.now();
    const f = (now) => { const k = clamp((now - t0) / 1100, 0, 1), e = 1 - Math.pow(1 - k, 3); b.textContent = Math.round(to * e) + unit; if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f);
  }

  /* ───────── Find: sections, projects, actions ───────── */
  const pal = $('#pal'), palIn = $('#palInput'), palList = $('#palList');
  const open = (url) => window.open(url, '_blank', 'noopener');
  const ITEMS = [].concat(
    sheets.map((s, i) => ({ g: 'Sheets', n: pad(i + 1), t: s.getAttribute('data-sheet'), k: s.id, run: () => scrollToEl(s) })).filter((x) => !$('#' + x.k).hidden),
    cards.map((c) => ({ g: 'Projects', n: c.n, t: c.title, k: c.tag + ' ' + c.cats.join(' ') + ' ' + $$('.stack span', c.node).map((s) => s.textContent).join(' '), tag: c.demoKey ? 'live demo' : c.year, run: () => goTo(c.node.id) })),
    [
      { g: 'Actions', n: '↓', t: 'Download the résumé (PDF, 1 page)', k: 'cv resume curriculum', run: () => { const a = el('a'); a.href = CV; a.download = 'Resume_Nils_Demougeot.pdf'; document.body.appendChild(a); a.click(); a.remove(); } },
      { g: 'Actions', n: '@', t: 'Copy the email address', k: 'mail contact ' + MAIL, run: copyMail },
      { g: 'Actions', n: '@', t: 'Write an email', k: 'mail contact hire', run: () => { location.href = 'mailto:' + MAIL; } },
      { g: 'Actions', n: '↗', t: 'Open LinkedIn', k: 'linkedin profile', run: () => open('https://www.linkedin.com/in/nils-demougeot/') },
      { g: 'Actions', n: '↗', t: 'Open GitHub', k: 'github code repos', run: () => open('https://github.com/nils-demougeot') },
      { g: 'Actions', n: '↗', t: 'Previous version of this site', k: 'v1 old archive terminal', run: () => { location.href = 'v1/'; } },
      { g: 'Run a demo', n: '▸', t: 'Drop the optimizers somewhere else', k: 'hero gradient descent sgd adam loss', run: () => { scrollToEl($('#top')); if (window.HeroFig) setTimeout(() => HeroFig.drop(), 500); } },
      { g: 'Run a demo', n: '▸', t: 'Predict a random Ligue 1 match', k: 'predict football model', need: 'ligue1', run: () => runDemo('ligue1', 'random') },
      { g: 'Run a demo', n: '▸', t: 'Simulate a data leak in the SOC dashboard', k: 'leak siem security usb exfiltration', need: 'siem', run: () => runDemo('siem', 'exfil') },
      { g: 'Run a demo', n: '▸', t: 'Watch two AIs play Ultimate Tic-Tac-Toe', k: 'ttt minimax alpha beta game', need: 'uttt', run: () => runDemo('uttt', 'watch') },
      { g: 'Run a demo', n: '▸', t: 'Find a route on the Paris metro', k: 'route dijkstra graph livin', need: 'livin', run: () => runDemo('livin', 'random') },
      { g: 'Run a demo', n: '▸', t: 'Trigger an earthquake', k: 'quake platform stabilizer arduino', need: 'quake', run: () => runDemo('quake', 'quake') },
      { g: 'Run a demo', n: '▸', t: 'Explode the H160 helicopter', k: 'h160 exploded view cad airbus', need: 'h160', run: () => runDemo('h160', 'explode') },
      { g: 'Run a demo', n: '▸', t: 'Let the AI solve a Boggle board', k: 'boggle words solver', need: 'boggle', run: () => runDemo('boggle', 'ai') },
      { g: 'sudo', n: '#', t: 'sudo hire nils', k: 'sudo hire nils offer', hidden: true, run: () => { toast('Access granted. Opening your mail client…'); location.href = 'mailto:' + MAIL + '?subject=Internship%20offer'; } }
    ].filter((x) => !x.need || D[x.need])
  );
  let palShown = [], palI = 0;
  function score(it, q) {
    const t = it.t.toLowerCase(), all = t + ' ' + (it.k || '').toLowerCase(); let s = 0;
    for (const w of q.split(/\s+/).filter(Boolean)) { const a = t.indexOf(w), b = all.indexOf(w); if (b < 0) return -1; s += a === 0 ? 30 : a > 0 ? (t[a - 1] === ' ' ? 20 : 10) : 3; }
    return s;
  }
  function palRender() {
    const q = palIn.value.trim().toLowerCase();
    palShown = q ? ITEMS.map((it) => ({ it, s: score(it, q) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s).map((x) => x.it) : ITEMS.filter((it) => !it.hidden);
    palI = clamp(palI, 0, Math.max(0, palShown.length - 1));
    let g = null;
    palList.innerHTML = palShown.length ? palShown.map((it, i) => (!q && it.g !== g ? '<div class="pal-grp">' + esc(g = it.g) + '</div>' : '') + '<button type="button" class="pal-it' + (i === palI ? ' is-on' : '') + '" role="option" data-i="' + i + '" aria-selected="' + (i === palI) + '"><i>' + esc(it.n) + '</i><span>' + esc(it.t) + '</span><small>' + esc(q ? it.g : it.tag || '') + '</small></button>').join('')
      : '<div class="pal-none">Nothing matches “' + esc(palIn.value) + '”. Try “metro”, “python” or “cv”.</div>';
  }
  function palMove(d) { if (!palShown.length) return; palI = (palI + d + palShown.length) % palShown.length; $$('.pal-it', palList).forEach((b, i) => { b.classList.toggle('is-on', i === palI); b.setAttribute('aria-selected', i === palI); if (i === palI) b.scrollIntoView({ block: 'nearest' }); }); }
  function palRun(i) { const it = palShown[i]; if (!it) return; pal.close(); setTimeout(it.run, 30); }
  function palOpen() { if (pal.open) return; palIn.value = ''; palI = 0; palRender(); pal.showModal(); palIn.focus(); }
  $('#palOpen').addEventListener('click', palOpen);
  palIn.addEventListener('input', () => { palI = 0; palRender(); });
  pal.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); palRun(palI); } });
  palList.addEventListener('click', (e) => { const b = e.target.closest('.pal-it'); if (b) palRun(+b.getAttribute('data-i')); });
  palList.addEventListener('pointermove', (e) => { const b = e.target.closest('.pal-it'); if (b && +b.getAttribute('data-i') !== palI) { palI = +b.getAttribute('data-i'); $$('.pal-it', palList).forEach((n, i) => n.classList.toggle('is-on', i === palI)); } });
  pal.addEventListener('click', (e) => { if (e.target === pal) pal.close(); });
  addEventListener('keydown', (e) => {
    const typing = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if ((e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); if (!lb.open) palOpen(); }
  });

  /* ───────── Reveal on scroll ───────── */
  $$('.sec-head, .cad, .proj-filters, .ix, .path, .gantt, .facts3, .contact, .is-sheet > .proj-head').forEach((n) => { if (!n.classList.contains('sec-head') && !n.classList.contains('gantt')) n.classList.add('rv'); });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target); $$('[data-count]', e.target).forEach(countUp); }), { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  $$('.rv, .sec-head, .gantt').forEach((n) => io.observe(n));

  /* ───────── Start ───────── */
  navSync(); startDemos();
  if (/^#p-/.test(location.hash) && byId[location.hash.slice(1)]) setTimeout(() => goTo(location.hash.slice(1)), 300);
})();
