/* Immersive portfolio · page logic (vanilla JS): scroll → 3D state, reveals, cursor, build steps, skills, project list + detail with galleries and live demos. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const html = document.documentElement, ND = window.ND3D || { ok: false, words: [], addWord() {}, burst() {}, ready: Promise.resolve() };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '"><use href="#i-' + id + '"/></svg>';
  const pad2 = (n) => String(n).padStart(2, '0');
  if (!fine) html.classList.add('touch');

  /* ───────── Content (same wording as the classic version) ───────── */
  const BUILD = [
    { color: '#FFCC00', label: 'AI & Machine Learning', blurb: 'Classification & regression models, from preprocessing to evaluation.', tags: ['Python', 'Scikit-Learn', 'Pandas', 'NumPy'] },
    { color: '#818cf8', label: 'Full-Stack Web', blurb: 'Production web apps, from data model to deployed, mobile-first UI.', tags: ['Django', 'PostgreSQL', 'JS', 'APIs'] },
    { color: '#fb923c', label: 'Algorithms & Graphs', blurb: 'Shortest paths, search and clean object-oriented solvers.', tags: ['C#', '.NET', 'Dijkstra', 'OOP'] },
    { color: '#34d399', label: 'Embedded Systems', blurb: 'Microcontrollers, sensors and real-time control loops.', tags: ['Arduino', 'C++', 'MPU6050', 'Servos'] },
    { color: '#38bdf8', label: 'Networks & Telecom', blurb: 'Network coding research at MIT, data transmission in Riga.', tags: ['Network coding', 'Python sims', 'Telecom'] },
    { color: '#fb7185', label: 'Cybersecurity', blurb: 'Threat detection, IOC hunting and security dashboards.', tags: ['CrowdStrike', 'SIEM', 'Log analysis'] }
  ];
  const SKILLS = [
    { name: 'Data & AI', color: '#FFCC00', skills: [['Python', ['ligue1', 'tips', 'mit', 'uttt']], ['pandas · NumPy', ['ligue1', 'tips', 'mit']], ['scikit-learn', ['ligue1']], ['Feature engineering', ['ligue1']], ['Statistics', ['tips', 'ligue1']], ['Data viz', ['ligue1', 'tips', 'mit']]] },
    { name: 'Algorithms', color: '#fb923c', skills: [['Shortest paths', ['livin']], ['Minimax · alpha-beta', ['uttt']], ['Recursion · DFS', ['boggle']], ['Sorting · search', ['boggle']], ['Simulation', ['mit', 'siem']]] },
    { name: 'Software & web', color: '#818cf8', skills: [['Django', ['fabrique']], ['SQL', ['livin', 'doovoirs', 'fabrique']], ['C# · .NET', ['livin', 'boggle']], ['C++ · OOP', ['rpg']], ['PHP · JavaScript', ['doovoirs', 'vivesmap']], ['Figma · Webflow', ['boudoubox', 'vivesmap']]] },
    { name: 'Security data', color: '#fb7185', skills: [['CrowdStrike NG-SIEM', ['siem']], ['Log queries', ['siem']], ['Dashboards', ['siem']], ['Alerting', ['siem']]] },
    { name: 'Networks', color: '#38bdf8', skills: [['Network coding', ['mit']], ['Channel models', ['mit']], ['Probability', ['mit']]] },
    { name: 'Hardware & CAD', color: '#34d399', skills: [['Arduino · sensors', ['quake']], ['SolidWorks', ['hexapod', 'h160', 'rocket']], ['CNC · laser cutting', ['rocket', 'hexapod']], ['3D printing', ['quake']]] },
    { name: 'Product & teams', color: '#a78bfa', skills: [['Pitching', ['fabrique', 'distraction', 'sport']], ['Business model', ['fabrique', 'distraction']], ['Explaining tech', ['seechy', 'mit']]] }
  ];
  const CATS = [['all', 'All'], ['ai', 'Data & AI'], ['sw', 'Software'], ['hw', 'Hardware & CAD'], ['more', 'Research & more']];
  const P = window.ND_PROJECTS || [], G = window.GALLERIES || {};
  const byId = {}; P.forEach((p, i) => { p.n = i + 1; p.imgs = (G[p.id] && G[p.id].images) || []; byId[p.id] = p; });

  /* ───────── Split headings into words (they rise one by one) ───────── */
  $$('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/); el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + esc(w) + '</span></span>').join(' ');
    el.setAttribute('data-reveal', '');
  });

  /* ───────── What I build ───────── */
  const buildMain = $('#buildMain'), buildList = $('#buildList'), buildSec = $('#build');
  buildList.innerHTML = BUILD.map((b, i) => '<li><button type="button" data-build="' + i + '" style="--c:' + b.color + '"><i>' + pad2(i + 1) + '</i><span>' + esc(b.label) + '</span></button></li>').join('');
  let buildIdx = -1;
  function setBuild(i) {
    if (i === buildIdx) return; buildIdx = i; const b = BUILD[i];
    buildMain.style.setProperty('--c', b.color);
    buildMain.innerHTML = '<div class="build-card"><span class="build-idx">' + pad2(i + 1) + ' <em>/ ' + pad2(BUILD.length) + '</em></span><h2 class="build-label">' + b.label.split(' ').map((w, k) => '<span class="w"><span style="--i:' + k + '">' + esc(w) + '</span></span>').join(' ') + '</h2><p class="build-blurb">' + esc(b.blurb) + '</p><div class="tags">' + b.tags.map((t, k) => '<span style="--i:' + k + '">' + esc(t) + '</span>').join('') + '</div></div>';
    $$('[data-build]', buildList).forEach((el, k) => el.classList.toggle('is-on', k === i));
  }
  setBuild(0);
  buildList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-build]'); if (!b) return; const i = +b.getAttribute('data-build'), r = buildSec.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + ((i + 0.5) / BUILD.length) * (r.height - innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ───────── Skills ───────── */
  const skillGrid = $('#skillGrid'), skillUsed = $('#skillUsed');
  $('#skillCount').textContent = SKILLS.length + ' areas, ' + SKILLS.reduce((a, c) => a + c.skills.length, 0) + ' skills.';
  skillGrid.innerHTML = SKILLS.map((c, ci) => '<article class="skill-col glass" data-reveal style="--c:' + c.color + ';--d:' + ci * 60 + 'ms"><h3><i></i>' + esc(c.name) + '<em>' + c.skills.length + '</em></h3><div class="chips">' +
    c.skills.map(([n], si) => '<button type="button" class="chip" data-skill="' + ci + '.' + si + '">' + esc(n) + '</button>').join('') + '</div></article>').join('');
  let skillPin = null;
  function showSkill(key) {
    $$('.chip', skillGrid).forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-skill') === key));
    const list = $('.skill-used-list', skillUsed);
    if (!key) { skillUsed.style.removeProperty('--c'); list.innerHTML = '<em>pick a skill above</em>'; return; }
    const [ci, si] = key.split('.').map(Number), c = SKILLS[ci], [name, used] = c.skills[si];
    skillUsed.style.setProperty('--c', c.color);
    list.innerHTML = '<b>' + esc(name) + '</b>' + used.map((id) => byId[id] ? '<button type="button" data-open="' + id + '" style="--c:' + byId[id].color + '"><span>' + pad2(byId[id].n) + '</span>' + esc(byId[id].title) + icon('arrow-up-right') + '</button>' : '').join('');
    tint = c.color;
  }
  skillGrid.addEventListener('mouseover', (e) => { const c = e.target.closest('.chip'); if (c && !skillPin) showSkill(c.getAttribute('data-skill')); });
  skillGrid.addEventListener('focusin', (e) => { const c = e.target.closest('.chip'); if (c && !skillPin) showSkill(c.getAttribute('data-skill')); });
  skillGrid.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (!c) return; const k = c.getAttribute('data-skill'); skillPin = skillPin === k ? null : k; showSkill(k); c.classList.toggle('is-pin', !!skillPin); });
  let tint = null; // colour pushed into the 3D scene by a hover (skill, project row)

  /* ───────── Places ───────── */
  const places = $$('#places .place'); let placeAuto = 0, placeHold = 0;
  function setPlace(k, hold) { ND.place = k; places.forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-place') === k)); if (hold) placeHold = 9; }
  places.forEach((el) => { const k = el.getAttribute('data-place'); el.addEventListener('mouseenter', () => setPlace(k, true)); el.addEventListener('focus', () => setPlace(k, true)); el.addEventListener('click', () => setPlace(k, true)); });

  /* ───────── Projects ───────── */
  const rows = $('#rows'), filters = $('#filters'), peek = $('#peek');
  filters.innerHTML = CATS.map(([k, l], i) => '<button type="button" class="filter' + (i ? '' : ' is-on') + '" data-filter="' + k + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + esc(l) + '<b>' + (k === 'all' ? P.length : P.filter((p) => p.cat.includes(k)).length) + '</b></button>').join('');
  rows.innerHTML = P.map((p) => '<button type="button" class="row" data-open="' + p.id + '" data-cat="' + p.cat.join(' ') + '" style="--c:' + p.color + '" data-reveal data-cursor="open">' +
    '<span class="row-n">' + pad2(p.n) + '</span>' +
    (p.imgs[0] ? '<span class="row-thumb"><img src="' + p.imgs[0].src + '" alt="" loading="lazy"></span>' : '<span class="row-thumb ph"></span>') +
    '<span class="row-main"><span class="row-t">' + esc(p.title) + '</span><span class="row-sub">' + esc(p.foot) + '</span></span>' +
    '<span class="row-meta"><span class="row-tag">' + esc(p.tag) + '</span>' + (p.demo ? '<span class="row-live"><i></i>live demo</span>' : '') + '</span>' +
    '<span class="row-arrow">' + icon('arrow-up-right') + '</span></button>').join('');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]'); if (!b) return; const k = b.getAttribute('data-filter');
    $$('.filter', filters).forEach((el) => { const on = el === b; el.classList.toggle('is-on', on); el.setAttribute('aria-pressed', on); });
    let n = 0; $$('.row', rows).forEach((el) => { const show = k === 'all' || el.getAttribute('data-cat').split(' ').includes(k); el.hidden = !show; if (show) { el.classList.remove('in'); el.style.setProperty('--d', n++ * 35 + 'ms'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))); } });
    ND.burst(0.5);
  });
  // floating preview that trails the cursor
  const pk = { x: 0, y: 0, tx: 0, ty: 0, r: 0, on: false, id: null }, peekImg = $('img', peek), peekLbl = $('span', peek);
  if (fine) {
    rows.addEventListener('mouseover', (e) => {
      const r = e.target.closest('.row'); if (!r) return; const p = byId[r.getAttribute('data-open')]; tint = p.color;
      if (pk.id !== p.id) { pk.id = p.id; peek.style.setProperty('--c', p.color); peekLbl.textContent = p.file; if (p.imgs[0]) { peekImg.src = p.imgs[0].src; peek.classList.remove('no-img'); } else { peekImg.removeAttribute('src'); peek.classList.add('no-img'); } }
      if (!pk.on) { pk.x = pk.tx; pk.y = pk.ty; } pk.on = true; peek.classList.add('is-on'); rows.classList.add('is-hover');
    });
    rows.addEventListener('mouseleave', () => { pk.on = false; peek.classList.remove('is-on'); rows.classList.remove('is-hover'); tint = null; });
    window.addEventListener('pointermove', (e) => { pk.tx = e.clientX; pk.ty = e.clientY; }, { passive: true });
  }

  /* ───────── Project detail ───────── */
  const detail = $('#detail'), dMedia = $('#detailMedia'), dBody = $('#detailBody'), dIdx = $('#detailIdx'), dScroll = $('#detailScroll'), zoom = $('#zoom');
  let openId = null, widget = null, lastFocus = null;
  const visible = () => $$('.row', rows).filter((el) => !el.hidden).map((el) => el.getAttribute('data-open'));
  function stopDemo() { if (widget) { try { widget.destroy && widget.destroy(); } catch (e) { /* demo already gone */ } widget = null; } }
  function media(p, i) {
    const im = p.imgs[i]; if (!im) return '<div class="shot ph"><span>' + esc(p.title) + '</span></div>';
    return '<button type="button" class="shot" data-zoom="' + im.src + '" data-cursor="zoom"><img src="' + im.src + '" alt="' + esc(im.alt || p.title) + '">' + (im.caption ? '<span class="cap">' + esc(im.caption) + '</span>' : '') + '</button>';
  }
  function openProject(id, dir) {
    const p = byId[id]; if (!p) return; stopDemo();
    if (!openId) { lastFocus = document.activeElement; detail.hidden = false; html.classList.add('is-detail'); requestAnimationFrame(() => detail.classList.add('is-open')); }
    openId = id; detail.style.setProperty('--c', p.color); const list = visible(), at = list.indexOf(id);
    dIdx.innerHTML = '<b>' + pad2(p.n) + '</b> / ' + pad2(P.length) + ' · ' + esc(p.file);
    dMedia.innerHTML = '<div class="stage" id="stage">' + media(p, 0) + '</div>' +
      '<div class="thumbs" id="thumbs">' + (p.demo ? '<button type="button" class="demo-btn" id="demoBtn" data-magnet>' + icon('play') + '<span>' + esc(p.run) + '</span></button>' : '') +
      p.imgs.map((im, i) => '<button type="button" class="thumb' + (i ? '' : ' is-on') + '" data-shot="' + i + '" aria-label="Screenshot ' + (i + 1) + '"><img src="' + im.src + '" alt="" loading="lazy"></button>').join('') + '</div>' +
      (p.demo ? '<div class="demo-ctrl" id="demoCtrl" hidden>' + p.ctrl + '</div>' : '');
    dBody.innerHTML = '<span class="tag-pill">' + esc(p.tag) + '</span><h2 id="detailTitle">' + esc(p.title) + '</h2><p class="d-text">' + p.text + '</p>' +
      (p.facts.length ? '<ul class="facts">' + p.facts.map((f) => '<li>' + f + '</li>').join('') + '</ul>' : '') +
      '<div class="stack"><span class="stack-lbl">$ stack</span>' + p.stack.map((s) => '<span>' + esc(s) + '</span>').join('') + '</div>' +
      '<div class="d-foot"><span>' + esc(p.foot) + '</span>' + (p.link ? '<a class="btn btn-solid" href="' + p.link.href + '" target="_blank" rel="noopener" data-magnet>' + icon(p.link.icon) + esc(p.link.label) + icon('arrow-up-right') + '</a>' : '') + '</div>' +
      '<div class="d-next">' + (at >= 0 && list.length > 1 ? '<button type="button" data-open="' + list[(at + 1) % list.length] + '"><small>Next project</small><b>' + esc(byId[list[(at + 1) % list.length]].title) + '</b>' + icon('arrow-right') + '</button>' : '') + '</div>';
    detail.classList.remove('swap-l', 'swap-r'); void detail.offsetWidth; detail.classList.add(dir < 0 ? 'swap-l' : 'swap-r');
    dScroll.scrollTop = 0; ND.override = { w1: 1, w2: 0, w3: 0, w4: 0, half: 0, x: 0, y: 0, scale: 1.5, dim: 0.5, globe: 0, active: -1, colA: hex(p.color), colB: hex('#1e1b4b'), tint: hex(p.color) };
    ND.burst(0.6); $('#detailClose').focus({ preventScroll: true });
  }
  function closeProject() {
    if (!openId) return; stopDemo(); openId = null; ND.override = null; detail.classList.remove('is-open'); html.classList.remove('is-detail');
    setTimeout(() => { if (!openId) { detail.hidden = true; dMedia.innerHTML = ''; } }, 450);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function step(d) { const list = visible(), at = list.indexOf(openId); if (list.length) openProject(list[(at + d + list.length) % list.length], d); }
  function showShot(i) { stopDemo(); const p = byId[openId]; $('#stage').innerHTML = media(p, i); $('#stage').classList.remove('is-demo'); $$('.thumb', dMedia).forEach((el, k) => el.classList.toggle('is-on', k === i)); const c = $('#demoCtrl'); if (c) c.hidden = true; const b = $('#demoBtn'); if (b) b.classList.remove('is-on'); }
  function runDemo() {
    const p = byId[openId], PW = window.PW; if (!p || !p.demo || !PW || !PW.predictor) return; stopDemo();
    const stage = $('#stage'), ctrl = $('#demoCtrl'); stage.classList.add('is-demo'); stage.innerHTML = '<div class="demo-canvas"><canvas></canvas></div>';
    ctrl.hidden = false; ctrl.innerHTML = p.ctrl; $('#demoBtn').classList.add('is-on'); $$('.thumb', dMedia).forEach((el) => el.classList.remove('is-on'));
    const cv = $('canvas', stage), out = (name, v) => $$('[data-out="' + name + '"]', dMedia).forEach((el) => { el.innerHTML = v; });
    const MAP = { ligue1: 'predictor', siem: 'siem', mit: 'rlnc', uttt: 'uttt', fabrique: 'fabric', livin: 'metro', tips: 'tips', boggle: 'boggle', rpg: 'rpg', hexapod: 'hexapod', h160: 'h160', rocket: 'rocket' };
    try {
      if (p.demo === 'quake') { // the platform reports its angles; the stabilizer toggle lives here, as on the classic page
        let stab = true, fell = false; const note = $('.pip-note', ctrl), base = note.innerHTML;
        const w = PW.platform(cv, { onState: (s) => { if (s.fallen !== fell) { fell = s.fallen; note.innerHTML = fell ? '<b class="rose">the tower fell!</b> turn the stabilizer on to rebuild' : base; } if (!fell) { const a = $('#pitch'), b = $('#roll'); if (a) a.textContent = s.pitch.toFixed(1); if (b) b.textContent = s.roll.toFixed(1); } } });
        w.setStab(true);
        widget = { quake: () => w.quake(1.2), stab: () => { stab = !stab; w.setStab(stab); $('#stabLabel').textContent = stab ? 'Stabilizer ON' : 'Stabilizer OFF'; $('#stabDot').style.background = stab ? '#34d399' : '#f43f5e'; }, destroy: w.destroy };
      } else widget = PW[MAP[p.demo]](cv, { card: dMedia, out });
      PW.pause(cv, false); if (widget && widget.live) widget.live(true);
    } catch (e) { stage.innerHTML = '<div class="shot ph"><span>This demo could not start here.</span></div>'; widget = null; }
  }
  dMedia.addEventListener('click', (e) => {
    const t = e.target.closest('[data-shot]'), a = e.target.closest('[data-act]'), z = e.target.closest('[data-zoom]');
    if (e.target.closest('#demoBtn')) return runDemo();
    if (t) return showShot(+t.getAttribute('data-shot'));
    if (a && widget) { const fn = widget[a.getAttribute('data-act')]; if (typeof fn === 'function') fn.call(widget, a); return; }
    if (z) { $('img', zoom).src = z.getAttribute('data-zoom'); zoom.hidden = false; requestAnimationFrame(() => zoom.classList.add('is-open')); }
  });
  const closeZoom = () => { zoom.classList.remove('is-open'); setTimeout(() => { zoom.hidden = true; }, 300); };
  zoom.addEventListener('click', closeZoom);
  $('#detailClose').addEventListener('click', closeProject); $('#detailBack').addEventListener('click', closeProject);
  $('#detailPrev').addEventListener('click', () => step(-1)); $('#detailNext').addEventListener('click', () => step(1));
  document.addEventListener('click', (e) => { const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); openProject(o.getAttribute('data-open'), 1); } });
  document.addEventListener('keydown', (e) => {
    if (!zoom.hidden && e.key === 'Escape') return closeZoom();
    if (!openId) return;
    if (e.key === 'Escape') closeProject(); else if (e.key === 'ArrowRight' && !e.target.closest('input')) step(1); else if (e.key === 'ArrowLeft' && !e.target.closest('input')) step(-1);
  });

  /* ───────── Navigation ───────── */
  const SECS = ['hero', 'about', 'build', 'skills', 'path', 'work', 'contact'].map((id) => document.getElementById(id));
  const LABELS = ['Intro', 'About', 'Build', 'Skills', 'Path', 'Work', 'Contact'];
  const menu = $('#menu'), burger = $('#burger');
  function setMenu(on) { burger.setAttribute('aria-expanded', on); html.classList.toggle('is-menu', on); if (on) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); } else { menu.classList.remove('is-open'); setTimeout(() => { if (!html.classList.contains('is-menu')) menu.hidden = true; }, 400); } }
  burger.addEventListener('click', () => setMenu(!html.classList.contains('is-menu')));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-goto]'); if (!b) return; const el = document.getElementById(b.getAttribute('data-goto')); setMenu(false); if (openId) closeProject();
    if (el) window.scrollTo({ top: el.id === 'hero' ? 0 : el.getBoundingClientRect().top + window.scrollY + (el.id === 'build' ? 2 : 0), behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ───────── Reveals ───────── */
  const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });
  // numbers count up when they appear
  const cio = new IntersectionObserver((es) => { es.forEach((e) => { if (!e.isIntersecting) return; cio.unobserve(e.target); const el = e.target, to = +el.getAttribute('data-count'), t0 = performance.now(); if (reduce) return; (function tick(now) { const k = clamp((now - t0) / 1400, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); })(t0); }); }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => cio.observe(el));

  /* ───────── Cursor, magnets, tilt ───────── */
  const cursor = $('#cursor'), cu = { x: -100, y: -100, tx: -100, ty: -100 };
  if (fine && !reduce) {
    html.classList.add('has-cursor'); const lbl = $('span', cursor);
    const WORDS = { drag: 'drag', open: 'open', zoom: 'zoom', write: 'write' };
    window.addEventListener('pointermove', (e) => { cu.tx = e.clientX; cu.ty = e.clientY; }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      const hot = e.target.closest('a,button,[role="button"],input'), z = e.target.closest('[data-cursor]'), word = z && (!hot || hot === z || z.contains(hot) === false || hot.hasAttribute('data-cursor')) ? WORDS[z.getAttribute('data-cursor')] : '';
      const inZone = z && z.getAttribute('data-cursor') === 'drag' && hot; // a button inside a drag zone is a plain link target
      cursor.classList.toggle('is-hot', !!hot && (!word || inZone)); cursor.classList.toggle('is-word', !!word && !inZone); lbl.textContent = word && !inZone ? word : '';
    });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-out')); document.addEventListener('mouseenter', () => cursor.classList.remove('is-out'));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down')); window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointermove', (e) => {
      const m = e.target.closest && e.target.closest('[data-magnet]');
      $$('[data-magnet].is-mag').forEach((el) => { if (el !== m) { el.classList.remove('is-mag'); el.style.transform = ''; } });
      if (m) { const r = m.getBoundingClientRect(); m.classList.add('is-mag'); m.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)'; }
      const t = e.target.closest && e.target.closest('[data-tilt]');
      $$('[data-tilt].is-tilt').forEach((el) => { if (el !== t) { el.classList.remove('is-tilt'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); } });
      if (t) { const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; t.classList.add('is-tilt'); t.style.setProperty('--ry', ((px - 0.5) * 5).toFixed(2) + 'deg'); t.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg'); t.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); t.style.setProperty('--my', (py * 100).toFixed(1) + '%'); }
    }, { passive: true });
  }
  // glass cards: a light that follows the pointer
  document.addEventListener('pointermove', (e) => { const g = e.target.closest && e.target.closest('.glass'); if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%'); g.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%'); } }, { passive: true });

  /* ───────── Scroll → 3D state ───────── */
  // One key state per section. x/y are fractions of the half viewport; w = [cloud, clusters, orbits, helix] layout weights (0,0,0,0 = assembled).
  const wide = () => innerWidth / innerHeight > 1.05 && innerWidth > 900;
  function keys() {
    const W = wide(), b = BUILD[Math.max(0, buildIdx)];
    const K = [
      { w: [0, 0, 0, 0], half: 0, x: 0, y: W ? 0.04 : 0.42, scale: W ? 1.28 : 0.95, dim: 0, globe: 0, A: '#FFCC00', B: '#4338ca', tint: '#ffffff' },
      { w: [0.02, 0, 0, 0], half: 1, x: W ? 0.52 : 0, y: W ? 0 : 0.1, scale: W ? 1.05 : 1.1, dim: W ? 0.05 : 0.55, globe: 0, A: '#818cf8', B: '#0ea5e9', tint: '#c7d2fe' },
      { w: [0, 1, 0, 0], half: 0, x: W ? 0.46 : 0, y: W ? 0 : 0.34, scale: W ? 1 : 0.8, dim: 0, globe: 0, A: b.color, B: '#1e1b4b', tint: '#ffffff', active: buildIdx },
      { w: [1, 0, 0, 0], half: 0, x: 0, y: 0, scale: 1.45, dim: 0.5, globe: 0, A: '#a78bfa', B: '#059669', tint: '#ddd6fe' },
      { w: [0, 0, 1, 0], half: 0, x: W ? 0.5 : 0, y: W ? 0 : 0.42, scale: W ? 1.05 : 0.62, dim: W ? 0.1 : 0.2, globe: 1, A: '#34d399', B: '#1d4ed8', tint: '#a7f3d0' },
      { w: [0, 0, 0, 1], half: 0, x: W ? 0.72 : 0.62, y: 0, scale: W ? 1 : 0.8, dim: W ? 0.12 : 0.5, globe: 0, A: '#fb7185', B: '#312e81', tint: '#fecdd3' },
      { w: [0, 0, 0, 0], half: 0, x: W ? 0.5 : 0, y: W ? 0.02 : 0.3, scale: W ? 1.3 : 0.85, dim: W ? 0 : 0.6, globe: 0, A: '#FFCC00', B: '#4338ca', tint: '#fff7d6' }
    ];
    return K;
  }
  const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const navBtns = $$('.nav-links [data-goto]'), hudIdx = $('#hudIdx'), hudLbl = $('#hudLbl'), hudBar = $('#hudBar');
  let secIdx = -1, intro = 1, lastY = -1, navHide = false;
  function update() {
    const vh = innerHeight, y = window.scrollY, mid = vh * 0.5, K = keys();
    // which two sections the viewport centre is between, and how far (blend happens in a band around the boundary)
    let i = 0; for (let k = 0; k < SECS.length; k++) if (SECS[k].getBoundingClientRect().top <= mid) i = k;
    const nxt = Math.min(SECS.length - 1, i + 1), topN = SECS[nxt].getBoundingClientRect().top, prevTop = SECS[i].getBoundingClientRect().top;
    let t = 0, a = i, b = nxt;
    if (nxt !== i && topN - mid < vh * 0.5) t = smooth(clamp(0.5 - (topN - mid) / vh, 0, 0.5)); // approaching the next section: 0 → .5
    else if (i > 0 && mid - prevTop < vh * 0.5) { a = i - 1; b = i; t = smooth(clamp(0.5 + (mid - prevTop) / vh, 0.5, 1)); } // just entered: .5 → 1
    const A = K[a], B = K[b], num = (n) => lerp(A[n], B[n], t);
    // build steps (pinned section)
    const br = buildSec.getBoundingClientRect(), bp = clamp(-br.top / Math.max(1, br.height - vh), 0, 0.9999);
    if (br.top < vh * 0.6 && br.bottom > vh * 0.4) setBuild(Math.floor(bp * BUILD.length));
    buildSec.style.setProperty('--p', bp.toFixed(4));
    const hov = tint && (i === 3 || i === 5) && t < 0.2 ? hex(tint) : null;
    const st = {
      w1: lerp(A.w[0], B.w[0], t), w2: lerp(A.w[1], B.w[1], t), w3: lerp(A.w[2], B.w[2], t), w4: lerp(A.w[3], B.w[3], t),
      half: num('half'), x: num('x'), y: num('y'), scale: num('scale'), dim: num('dim'), globe: num('globe'),
      colA: hov || mixC(hex(A.A), hex(B.A), t), colB: mixC(hex(A.B), hex(B.B), t), tint: hov ? mixC(hov, [1, 1, 1], 0.35) : mixC(hex(A.tint), hex(B.tint), t),
      active: (t < 0.5 ? A : B).active == null ? -1 : (t < 0.5 ? A : B).active
    };
    if (intro > 0) { st.w1 = lerp(st.w1, 1, intro); st.scale = lerp(st.scale, 0.5, intro); } // before the loader ends: a loose cloud of shards
    ND.target = st;
    const cur = t < 0.5 ? a : b;
    if (cur !== secIdx) { secIdx = cur; hudIdx.textContent = pad2(cur); hudLbl.textContent = LABELS[cur]; navBtns.forEach((el, k) => el.classList.toggle('is-on', k === cur - 1)); html.setAttribute('data-sec', SECS[cur].id); }
    const max = Math.max(1, document.documentElement.scrollHeight - vh); hudBar.style.transform = 'scaleY(' + clamp(y / max, 0, 1).toFixed(4) + ')';
    // nav hides on the way down, returns on the way up
    if (lastY >= 0) { const hide = y > lastY && y > vh * 0.6 && !html.classList.contains('is-menu'); if (y !== lastY && hide !== navHide) { navHide = hide; html.classList.toggle('nav-hide', hide); } } lastY = y;
    html.classList.toggle('is-top', y < 40);
    // places cycle on their own until one is picked
    if (cur === 4) { if (placeHold > 0) placeHold -= 1 / 60; else { placeAuto += 1 / 60; if (placeAuto > 4) { placeAuto = 0; const ks = ['paris', 'riga', 'boston']; setPlace(ks[(ks.indexOf(ND.place) + 1) % 3]); } } }
    // cursor + preview follow with a little lag
    if (cursor) { cu.x = lerp(cu.x, cu.tx, 0.28); cu.y = lerp(cu.y, cu.ty, 0.28); cursor.style.transform = 'translate3d(' + cu.x.toFixed(1) + 'px,' + cu.y.toFixed(1) + 'px,0)'; }
    if (pk.on || peek.classList.contains('is-on')) { const px = pk.x; pk.x = lerp(pk.x, pk.tx, 0.14); pk.y = lerp(pk.y, pk.ty, 0.14); pk.r = lerp(pk.r, clamp((pk.x - px) * 0.9, -14, 14), 0.2); peek.style.transform = 'translate3d(' + pk.x.toFixed(1) + 'px,' + pk.y.toFixed(1) + 'px,0) rotate(' + pk.r.toFixed(2) + 'deg)'; }
    requestAnimationFrame(update);
  }

  /* ───────── Giant words behind the crystal ───────── */
  ND.addWord(SECS[0], ['NILS', 'DEMOUGEOT'], { solid: true, opacity: 0.96, fit: 0.9 });
  [['ABOUT'], ['BUILD'], ['SKILLS'], ['PATH'], ['WORK'], ['HELLO']].forEach((l, i) => ND.addWord(SECS[i + 1], l, { opacity: 0.13, fit: 0.86 }));

  /* ───────── Loader → intro ───────── */
  const loader = $('#loader'), lnum = $('#loaderNum'), lbar = $('#loaderBar');
  let prog = 0, goal = 0.35, done = false;
  const quick = reduce || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent) && !window.__ndForceIntro;
  function start() {
    done = true; html.classList.add('is-ready'); loader.classList.add('is-done'); setTimeout(() => { loader.hidden = true; }, 1300);
    $$('.hero [data-reveal]').forEach((el, i) => setTimeout(() => el.classList.add('in'), 500 + i * 130));
    const t0 = performance.now(); (function ease(now) { const k = clamp((now - t0) / 1600, 0, 1); intro = 1 - (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(ease); else intro = 0; })(t0);
  }
  (function load() {
    prog = lerp(prog, goal, 0.08) + 0.004; if (prog > goal) prog = goal;
    lnum.textContent = String(Math.round(prog * 100)).padStart(3, '0'); lbar.style.transform = 'scaleX(' + prog.toFixed(3) + ')';
    if (prog >= 0.995 && !done) return start();
    if (!done) requestAnimationFrame(load);
  })();
  const fontsReady = (ND.ready || Promise.resolve());
  const loaded = new Promise((res) => { if (document.readyState === 'complete') res(); else window.addEventListener('load', res); });
  fontsReady.then(() => { goal = Math.max(goal, 0.7); });
  Promise.all([fontsReady, loaded]).then(() => { goal = 1; if (quick) { prog = 1; } });
  setTimeout(() => { goal = 1; }, 6000); // never block the page on a slow asset
  requestAnimationFrame(update);
})();
