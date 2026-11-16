/* Immersive portfolio · page logic (vanilla JS): scroll → 3D state, reveals, cursor, the six fields, skills, project index + project page with galleries and live demos. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const html = document.documentElement, ND = window.ND3D || { ok: false, burst() {}, ready: Promise.resolve() };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => '<svg class="ic"><use href="#i-' + id + '"/></svg>';
  const pad2 = (n) => String(n).padStart(2, '0');
  if (!fine) html.classList.add('touch');

  /* ───────── Content ───────── */
  const BUILD = [
    { label: 'AI & Machine Learning', blurb: 'Classification & regression models, from preprocessing to evaluation.', tags: ['Python', 'Scikit-Learn', 'Pandas', 'NumPy'] },
    { label: 'Full-Stack Web', blurb: 'Production web apps, from data model to deployed, mobile-first UI.', tags: ['Django', 'PostgreSQL', 'JS', 'APIs'] },
    { label: 'Algorithms & Graphs', blurb: 'Shortest paths, search and clean object-oriented solvers.', tags: ['C#', '.NET', 'Dijkstra', 'OOP'] },
    { label: 'Embedded Systems', blurb: 'Microcontrollers, sensors and real-time control loops.', tags: ['Arduino', 'C++', 'MPU6050', 'Servos'] },
    { label: 'Networks & Telecom', blurb: 'Network coding research at MIT, data transmission in Riga.', tags: ['Network coding', 'Python sims', 'Telecom'] },
    { label: 'Cybersecurity', blurb: 'Threat detection, IOC hunting and security dashboards.', tags: ['CrowdStrike', 'SIEM', 'Log analysis'] }
  ];
  const SKILLS = [
    { name: 'Data & AI', skills: [['Python', ['ligue1', 'tips', 'mit', 'uttt']], ['pandas · NumPy', ['ligue1', 'tips', 'mit']], ['scikit-learn', ['ligue1']], ['Feature engineering', ['ligue1']], ['Statistics', ['tips', 'ligue1']], ['Data viz', ['ligue1', 'tips', 'mit']]] },
    { name: 'Algorithms', skills: [['Shortest paths', ['livin']], ['Minimax · alpha-beta', ['uttt']], ['Recursion · DFS', ['boggle']], ['Sorting · search', ['boggle']], ['Simulation', ['mit', 'siem']]] },
    { name: 'Software & web', skills: [['Django', ['fabrique']], ['SQL', ['livin', 'doovoirs', 'fabrique']], ['C# · .NET', ['livin', 'boggle']], ['C++ · OOP', ['rpg']], ['PHP · JavaScript', ['doovoirs', 'vivesmap']], ['Figma · Webflow', ['boudoubox', 'vivesmap']]] },
    { name: 'Security data', skills: [['CrowdStrike NG-SIEM', ['siem']], ['Log queries', ['siem']], ['Dashboards', ['siem']], ['Alerting', ['siem']]] },
    { name: 'Networks', skills: [['Network coding', ['mit']], ['Channel models', ['mit']], ['Probability', ['mit']]] },
    { name: 'Hardware & CAD', skills: [['Arduino · sensors', ['quake']], ['SolidWorks', ['hexapod', 'h160', 'rocket']], ['CNC · laser cutting', ['rocket', 'hexapod']], ['3D printing', ['quake']]] },
    { name: 'Product & teams', skills: [['Pitching', ['fabrique', 'distraction', 'sport']], ['Business model', ['fabrique', 'distraction']], ['Explaining tech', ['seechy', 'mit']]] }
  ];
  const CATS = [['all', 'All'], ['ai', 'Data & AI'], ['sw', 'Software'], ['hw', 'Hardware & CAD'], ['more', 'Research & more']];
  const P = window.ND_PROJECTS || [], G = window.GALLERIES || {};
  const byId = {}; P.forEach((p, i) => { p.n = i + 1; p.imgs = (G[p.id] && G[p.id].images) || []; byId[p.id] = p; });

  /* ───────── Statements: words come into focus one by one; *…* marks the serif italic part ───────── */
  $$('[data-words]').forEach((el) => {
    const raw = el.textContent.trim(); el.setAttribute('aria-label', raw.replace(/\*/g, ''));
    let it = false, i = 0;
    el.innerHTML = raw.split(/\s+/).map((w) => {
      let open = false, close = false; if (w.startsWith('*')) { it = true; w = w.slice(1); open = true; } if (/\*[.,;:!?]*$/.test(w)) { w = w.replace('*', ''); close = true; }
      const s = '<span class="w' + (it ? ' it' : '') + '" aria-hidden="true" style="--i:' + i++ + '">' + esc(w) + '</span>'; if (close) it = false; return s;
    }).join(' ');
    el.setAttribute('data-reveal', '');
  });

  /* ───────── What I build ───────── */
  const disc = $('#disc'), discNote = $('#discNote'), buildSec = $('#build');
  disc.innerHTML = BUILD.map((b, i) => '<li><button type="button" data-build="' + i + '"><i>(' + pad2(i + 1) + ')</i><span>' + esc(b.label) + '</span></button></li>').join('');
  let buildIdx = -1;
  function setBuild(i) {
    if (i === buildIdx) return; buildIdx = i; const b = BUILD[i];
    discNote.innerHTML = '<div class="note-in"><p>' + esc(b.blurb) + '</p><span>' + b.tags.map(esc).join(' / ') + '</span></div>';
    $$('[data-build]', disc).forEach((el, k) => el.classList.toggle('is-on', k === i));
  }
  setBuild(0);
  disc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-build]'); if (!b) return; const i = +b.getAttribute('data-build'), r = buildSec.getBoundingClientRect();
    scrollToY(window.scrollY + r.top + ((i + 0.5) / BUILD.length) * (r.height - innerHeight));
  });

  /* ───────── Skills ───────── */
  const skillTable = $('#skillTable');
  $('#skillCount').textContent = SKILLS.length + ' areas, ' + SKILLS.reduce((a, c) => a + c.skills.length, 0) + ' skills.';
  skillTable.innerHTML = SKILLS.map((c, ci) => '<div class="sk-row" data-reveal><h3>' + esc(c.name) + '</h3><div class="sk-list">' +
    c.skills.map(([n], si) => '<button type="button" class="sk" data-skill="' + ci + '.' + si + '">' + esc(n) + '</button>').join('<i>/</i>') + '</div><div class="sk-used" aria-live="polite"></div></div>').join('');
  let skillPin = null;
  function showSkill(key) {
    $$('.sk', skillTable).forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-skill') === key));
    $$('.sk-used', skillTable).forEach((el) => { el.innerHTML = ''; });
    if (!key) return; const [ci, si] = key.split('.').map(Number), used = SKILLS[ci].skills[si][1];
    $$('.sk-row', skillTable)[ci].querySelector('.sk-used').innerHTML = '<span>used in</span>' + used.map((id) => byId[id] ? '<button type="button" data-open="' + id + '">' + esc(byId[id].title) + ' →</button>' : '').join('');
  }
  skillTable.addEventListener('mouseover', (e) => { const c = e.target.closest('.sk'); if (c && !skillPin) showSkill(c.getAttribute('data-skill')); });
  skillTable.addEventListener('focusin', (e) => { const c = e.target.closest('.sk'); if (c && !skillPin) showSkill(c.getAttribute('data-skill')); });
  skillTable.addEventListener('click', (e) => { const c = e.target.closest('.sk'); if (!c) return; const k = c.getAttribute('data-skill'); skillPin = skillPin === k ? null : k; showSkill(k); });

  /* ───────── Places ───────── */
  const places = $$('#places .place'); let placeAuto = 0, placeHold = 0;
  function setPlace(k, hold) { ND.place = k; places.forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-place') === k)); if (hold) placeHold = 10; }
  places.forEach((el) => { const k = el.getAttribute('data-place'); el.addEventListener('mouseenter', () => setPlace(k, true)); el.addEventListener('focus', () => setPlace(k, true)); el.addEventListener('click', () => setPlace(k, true)); });

  /* ───────── Project index ───────── */
  const rows = $('#rows'), filters = $('#filters'), peek = $('#peek');
  filters.innerHTML = CATS.map(([k, l], i) => '<button type="button" class="filter' + (i ? '' : ' is-on') + '" data-filter="' + k + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + esc(l) + '<sup>' + (k === 'all' ? P.length : P.filter((p) => p.cat.includes(k)).length) + '</sup></button>').join('');
  rows.innerHTML = P.map((p) => '<button type="button" class="row" data-open="' + p.id + '" data-cat="' + p.cat.join(' ') + '" style="--c:' + p.color + '" data-reveal data-cursor="open">' +
    '<span class="row-n">(' + pad2(p.n) + ')</span>' +
    '<span class="row-thumb">' + (p.imgs[0] ? '<img src="' + p.imgs[0].src + '" alt="" loading="lazy">' : '') + '</span>' +
    '<span class="row-t">' + esc(p.title) + '</span>' +
    '<span class="row-meta"><span>' + esc(p.tag) + '</span><span>' + esc(p.foot) + '</span>' + (p.demo ? '<span class="row-live"><i></i>live demo</span>' : '') + '</span></button>').join('');
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]'); if (!b) return; const k = b.getAttribute('data-filter');
    $$('.filter', filters).forEach((el) => { const on = el === b; el.classList.toggle('is-on', on); el.setAttribute('aria-pressed', on); });
    let n = 0; $$('.row', rows).forEach((el) => { const show = k === 'all' || el.getAttribute('data-cat').split(' ').includes(k); el.hidden = !show; if (show) { el.classList.remove('in'); el.style.setProperty('--d', n++ * 30 + 'ms'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in'))); } });
    $('#workCount').textContent = n + (n === 1 ? ' project' : ' projects');
  });
  // a plate with the project's first screenshot trails the cursor
  const pk = { x: 0, y: 0, tx: 0, ty: 0, r: 0, on: false, id: null }, peekImg = $('img', peek);
  if (fine) {
    rows.addEventListener('mouseover', (e) => {
      const r = e.target.closest('.row'); if (!r) return; const p = byId[r.getAttribute('data-open')];
      if (pk.id !== p.id) { pk.id = p.id; peek.style.setProperty('--c', p.color); if (p.imgs[0]) { peekImg.src = p.imgs[0].src; peek.classList.remove('no-img'); } else { peekImg.removeAttribute('src'); peek.classList.add('no-img'); } }
      if (!pk.on) { pk.x = pk.tx; pk.y = pk.ty; } pk.on = true; peek.classList.add('is-on'); rows.classList.add('is-hover');
    });
    rows.addEventListener('mouseleave', () => { pk.on = false; peek.classList.remove('is-on'); rows.classList.remove('is-hover'); });
    window.addEventListener('pointermove', (e) => { pk.tx = e.clientX; pk.ty = e.clientY; }, { passive: true });
  }

  /* ───────── Project page ───────── */
  const detail = $('#detail'), dHead = $('#detailHead'), dMedia = $('#detailMedia'), dBody = $('#detailBody'), dIdx = $('#detailIdx'), dScroll = $('#detailScroll'), zoom = $('#zoom');
  let openId = null, widget = null, lastFocus = null, pauseT = 0;
  const visible = () => $$('.row', rows).filter((el) => !el.hidden).map((el) => el.getAttribute('data-open'));
  function stopDemo() { if (widget) { try { widget.destroy && widget.destroy(); } catch (e) { /* demo already gone */ } widget = null; } }
  function media(p, i) {
    const im = p.imgs[i]; if (!im) return '<div class="shot ph"><span>' + esc(p.title) + '</span></div>';
    return '<button type="button" class="shot" data-zoom="' + im.src + '" data-cursor="zoom"><img src="' + im.src + '" alt="' + esc(im.alt || p.title) + '"></button>' + (im.caption ? '<span class="cap">' + esc(im.caption) + '</span>' : '');
  }
  function openProject(id, dir) {
    const p = byId[id]; if (!p) return; stopDemo();
    if (!openId) { lastFocus = document.activeElement; detail.hidden = false; html.classList.add('is-detail'); requestAnimationFrame(() => detail.classList.add('is-open')); }
    openId = id; detail.style.setProperty('--c', p.color); const list = visible(), at = list.indexOf(id);
    dIdx.textContent = pad2(p.n) + ' / ' + pad2(P.length);
    dHead.innerHTML = '<span class="label">(' + pad2(p.n) + ') ' + esc(p.tag) + '</span><h2 id="detailTitle">' + esc(p.title) + '</h2>';
    dMedia.innerHTML = '<div class="stage" id="stage">' + media(p, 0) + '</div>' +
      '<div class="thumbs" id="thumbs">' + (p.demo ? '<button type="button" class="demo-btn" id="demoBtn">' + icon('play') + '<span>' + esc(p.run) + '</span></button>' : '') +
      p.imgs.map((im, i) => '<button type="button" class="thumb' + (i ? '' : ' is-on') + '" data-shot="' + i + '" aria-label="Screenshot ' + (i + 1) + '"><img src="' + im.src + '" alt="" loading="lazy"></button>').join('') + '</div>' +
      (p.demo ? '<div class="demo-ctrl" id="demoCtrl" hidden>' + p.ctrl + '</div>' : '');
    dBody.innerHTML = '<p class="d-text">' + p.text + '</p>' +
      (p.facts.length ? '<ul class="facts">' + p.facts.map((f) => '<li>' + f + '</li>').join('') + '</ul>' : '') +
      '<dl class="d-meta"><div><dt>Stack</dt><dd>' + p.stack.map(esc).join(' / ') + '</dd></div><div><dt>Context</dt><dd>' + esc(p.foot) + '</dd></div><div><dt>File</dt><dd>' + esc(p.file) + '</dd></div></dl>' +
      (p.link ? '<a class="d-link" href="' + p.link.href + '" target="_blank" rel="noopener">' + esc(p.link.label) + ' <span>↗</span></a>' : '') +
      (at >= 0 && list.length > 1 ? '<button type="button" class="d-next" data-open="' + list[(at + 1) % list.length] + '"><small>Next project</small><b>' + esc(byId[list[(at + 1) % list.length]].title) + '</b><span>→</span></button>' : '');
    detail.classList.remove('swap-l', 'swap-r'); void detail.offsetWidth; detail.classList.add(dir < 0 ? 'swap-l' : 'swap-r');
    dScroll.scrollTop = 0; $('#detailClose').focus({ preventScroll: true });
    try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (e) { /* file:// */ }
    clearTimeout(pauseT); pauseT = setTimeout(() => { if (openId) ND.paused = true; }, 1000); // the page covers the canvas: stop drawing the 3D, the demos get the GPU
  }
  function closeProject() {
    if (!openId) return; stopDemo(); openId = null; clearTimeout(pauseT); ND.paused = false;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ } detail.classList.remove('is-open'); html.classList.remove('is-detail');
    setTimeout(() => { if (!openId) { detail.hidden = true; dMedia.innerHTML = ''; } }, 600);
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
    if (!openId || html.classList.contains('is-find')) return;
    if (e.key === 'Escape') closeProject(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
  });

  /* ───────── Navigation, clock ───────── */
  const SECS = ['hero', 'about', 'build', 'skills', 'work', 'path', 'contact'].map((id) => document.getElementById(id));
  const menu = $('#menu'), burger = $('#burger');
  function setMenu(on) { burger.setAttribute('aria-expanded', on); burger.textContent = on ? 'Close' : 'Menu'; html.classList.toggle('is-menu', on); if (on) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); } else { menu.classList.remove('is-open'); setTimeout(() => { if (!html.classList.contains('is-menu')) menu.hidden = true; }, 500); } }
  burger.addEventListener('click', () => setMenu(!html.classList.contains('is-menu')));
  /* Inertial scrolling (mouse and trackpad only): the wheel sets a target and the page glides to it. Touch, keyboard and the scrollbar stay native. */
  const sm = { on: fine && !reduce, y: window.scrollY, to: window.scrollY, run: false };
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  if (sm.on) {
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey || html.classList.contains('is-detail') || html.classList.contains('is-menu') || html.classList.contains('is-find')) return;
      e.preventDefault(); if (!sm.run) { sm.y = sm.to = window.scrollY; }
      sm.to = clamp(sm.to + e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1), 0, maxScroll()); sm.run = true;
    }, { passive: false });
    window.addEventListener('scroll', () => { if (sm.run && Math.abs(window.scrollY - sm.y) > 3) sm.run = false; }, { passive: true }); // something else moved the page (keys, scrollbar)
    window.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) sm.run = false; });
  }
  function glide(dt) { if (!sm.run) return; sm.y = lerp(sm.y, sm.to, 1 - Math.exp(-dt * 7.5)); if (Math.abs(sm.to - sm.y) < 0.4) { sm.y = sm.to; sm.run = false; } window.scrollTo(0, sm.y); }
  function scrollToY(top) { top = clamp(top, 0, maxScroll()); if (sm.on) { if (!sm.run) sm.y = window.scrollY; sm.to = top; sm.run = true; } else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' }); }
  function goTo(id) { const el = document.getElementById(id); setMenu(false); if (openId) closeProject(); if (el) scrollToY(id === 'hero' ? 0 : el.getBoundingClientRect().top + window.scrollY + (id === 'build' ? 2 : 0)); }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (b) goTo(b.getAttribute('data-goto')); });
  const railBtns = $$('#rail [data-goto]'), railBar = $('#railBar');

  /* ───────── Search: "/" or Ctrl/⌘ K finds a project, a skill or a section ───────── */
  const find = $('#find'), findIn = $('#findIn'), findOut = $('#findOut');
  const INDEX = [].concat(
    [['about', 'About'], ['build', 'What I build'], ['skills', 'Skills'], ['work', 'Selected work'], ['path', 'Path'], ['contact', 'Contact']].map(([id, t]) => ({ kind: 'Section', title: t, hay: t.toLowerCase(), go: () => goTo(id) })),
    P.map((p) => ({ kind: 'Project', title: p.title, sub: p.tag, hay: (p.title + ' ' + p.tag + ' ' + p.stack.join(' ') + ' ' + p.foot).toLowerCase(), go: () => openProject(p.id, 1) })),
    SKILLS.reduce((acc, c, ci) => acc.concat(c.skills.map(([n, used], si) => ({ kind: 'Skill', title: n, sub: c.name + ' · ' + used.length + (used.length > 1 ? ' projects' : ' project'), hay: (n + ' ' + c.name).toLowerCase(), go: () => { goTo('skills'); skillPin = ci + '.' + si; showSkill(skillPin); } }))), []),
    [{ kind: 'Action', title: 'Download the CV', hay: 'cv resume download pdf', go: () => { const a = document.createElement('a'); a.href = 'assets/cv/Resume_Nils_Demougeot.pdf'; a.download = 'Resume_Nils_Demougeot.pdf'; a.click(); } },
     { kind: 'Action', title: 'Write an email', hay: 'email mail contact hire internship', go: () => { location.href = 'mailto:nils.demougeot@gmail.com'; } },
     { kind: 'Action', title: 'Open the classic version', hay: 'classic version old', go: () => { location.href = './'; } }]);
  let hits = [], sel = 0;
  function renderFind() {
    const q = findIn.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
    hits = (q ? INDEX.filter((it) => words.every((w) => it.hay.includes(w))) : INDEX.filter((it) => it.kind === 'Section' || it.kind === 'Action')).slice(0, 9); sel = Math.min(sel, Math.max(0, hits.length - 1));
    findOut.innerHTML = hits.length ? hits.map((it, i) => '<button type="button" class="hit' + (i === sel ? ' is-on' : '') + '" data-hit="' + i + '"><small>' + it.kind + '</small><b>' + esc(it.title) + '</b><span>' + esc(it.sub || '') + '</span><i>↵</i></button>').join('') : '<p class="nohit">Nothing for “' + esc(findIn.value) + '”. Try a language, a tool or a project name.</p>';
  }
  function setFind(on) { html.classList.toggle('is-find', on); if (on) { find.hidden = false; findIn.value = ''; sel = 0; renderFind(); requestAnimationFrame(() => { find.classList.add('is-open'); findIn.focus(); }); } else { find.classList.remove('is-open'); setTimeout(() => { if (!html.classList.contains('is-find')) find.hidden = true; }, 350); } }
  function pick(i) { const it = hits[i]; if (!it) return; setFind(false); it.go(); }
  findIn.addEventListener('input', () => { sel = 0; renderFind(); });
  findOut.addEventListener('click', (e) => { const h = e.target.closest('[data-hit]'); if (h) pick(+h.getAttribute('data-hit')); });
  findOut.addEventListener('mousemove', (e) => { const h = e.target.closest('[data-hit]'); if (h && +h.getAttribute('data-hit') !== sel) { sel = +h.getAttribute('data-hit'); $$('.hit', findOut).forEach((el, k) => el.classList.toggle('is-on', k === sel)); } });
  find.addEventListener('click', (e) => { if (e.target === find) setFind(false); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-find]')) { setMenu(false); setFind(true); } });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''));
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); setFind(!html.classList.contains('is-find')); return; }
    if (!html.classList.contains('is-find')) return;
    if (e.key === 'Escape') { e.stopPropagation(); setFind(false); } else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, hits.length); renderFind(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + hits.length) % Math.max(1, hits.length); renderFind(); } else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
  }, true);

  /* ───────── Copy the email address ───────── */
  const copyBtn = $('#copyMail');
  if (copyBtn) copyBtn.addEventListener('click', (e) => { e.preventDefault(); const done = () => { copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('nils.demougeot@gmail.com').then(done, () => { copyBtn.textContent = 'Select it above'; }); else copyBtn.textContent = 'Select it above'; });

  const clock = $('#clock'), tick = () => { try { clock.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date()); } catch (e) { clock.textContent = ''; } };
  tick(); setInterval(tick, 20000);

  /* ───────── Reveals ───────── */
  const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => { if (!el.closest('.hero')) io.observe(el); });
  const cio = new IntersectionObserver((es) => { es.forEach((e) => { if (!e.isIntersecting) return; cio.unobserve(e.target); const el = e.target, to = +el.getAttribute('data-count'), t0 = performance.now(); if (reduce) return; (function run(now) { const k = clamp((now - t0) / 1400, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(run); })(t0); }); }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => cio.observe(el));

  /* ───────── Cursor ───────── */
  const cursor = $('#cursor'), cu = { x: -100, y: -100, tx: -100, ty: -100 };
  if (fine && !reduce) {
    html.classList.add('has-cursor'); const lbl = $('span', cursor), WORDS = { drag: 'Drag', open: 'Open', zoom: 'Zoom', write: 'Write' };
    window.addEventListener('pointermove', (e) => { cu.tx = e.clientX; cu.ty = e.clientY; }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      const hot = e.target.closest('a,button,input'), z = e.target.closest('[data-cursor]');
      const word = z && (!hot || hot === z || hot.hasAttribute('data-cursor')) ? WORDS[z.getAttribute('data-cursor')] : '';
      cursor.classList.toggle('is-hot', !!hot && !word); cursor.classList.toggle('is-word', !!word); if (word) lbl.textContent = word;
    });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-out')); document.addEventListener('mouseenter', () => cursor.classList.remove('is-out'));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down')); window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  }

  /* ───────── Scroll → 3D state ───────── */
  // One key state per section: which layout the ice takes, where its centre is (fractions of the half viewport), how big, day or night.
  const wide = () => innerWidth / innerHeight > 1.05 && innerWidth > 900;
  function keys() {
    const W = wide();
    // pw: shape of the data points [shell, clusters, network, loss surface]; pop: their opacity; ptx/pty/pts: where and how big
    return [
      { lay: 'one', x: W ? 0.06 : 0, y: W ? 0.06 : 0.12, scale: W ? 1.45 : 1.25, night: 0, globe: 0, ring: 0, fade: 0, marquee: 1, pw: [1, 0, 0, 0], pop: 0, ptx: W ? 0.06 : 0, pty: 0.06, pts: 1.5 },
      { lay: 'cluster', x: W ? 0.62 : 0.1, y: 0, scale: W ? 0.95 : 0.9, night: 0, globe: 0, ring: 0, fade: W ? 0 : 0.45, marquee: 0, pw: [1, 0, 0, 0], pop: W ? 0.55 : 0.3, ptx: W ? 0.62 : 0.1, pty: 0, pts: 1.25 },
      { lay: 'six', x: W ? 0.48 : 0, y: W ? 0 : 0.42, scale: W ? 1.25 : 0.95, night: 0, globe: 0, ring: 0, fade: 0, marquee: 0, pw: [0, 1, 0, 0], pop: 0.9, ptx: W ? 0.48 : 0, pty: W ? 0 : 0.42, pts: W ? 1.25 : 0.8 },
      { lay: 'drift', x: 0, y: 0, scale: 1, night: 0, globe: 0, ring: 0, fade: W ? 0.1 : 0.4, marquee: 0, pw: [0, 0, 1, 0], pop: W ? 0.6 : 0.3, ptx: W ? 0.6 : 0, pty: W ? 0.0 : 0.2, pts: W ? 0.95 : 0.7 },
      { lay: 'drift', x: 0, y: 0, scale: 1.15, night: 0, globe: 0, ring: 0, fade: W ? 0.1 : 0.4, marquee: 0, pw: [0, 0, 0, 1], pop: W ? 0.85 : 0.3, ptx: W ? 0.45 : 0, pty: -0.38, pts: W ? 1.35 : 0.8 },
      { lay: 'orbit', x: W ? 0.48 : 0, y: W ? 0.02 : 0.4, scale: W ? 1.2 : 0.7, night: 1, globe: 1, ring: 0, fade: 0, marquee: 0, pw: [1, 0, 0, 0], pop: 0.5, ptx: W ? 0.48 : 0, pty: W ? 0.02 : 0.4, pts: W ? 1.7 : 1 },
      { lay: 'one', x: W ? 0.4 : 0, y: W ? 0 : 0.36, scale: W ? 1.15 : 0.8, night: 0, globe: 0, ring: W ? 1 : 0, fade: W ? 0 : 0.45, marquee: 0, pw: [1, 0, 0, 0], pop: W ? 0.4 : 0, ptx: W ? 0.4 : 0, pty: 0, pts: 1.3 }
    ];
  }
  const smooth = (t) => t * t * (3 - 2 * t);
  let secIdx = -1, intro = 1, lastY = -1, navHide = false, tops = [], buildTop = 0, buildH = 1, KEYS = keys(), lastT = performance.now();
  // section positions are measured once per layout change, not every frame
  function measure() { const y = window.scrollY; tops = SECS.map((el) => el.getBoundingClientRect().top + y); const r = buildSec.getBoundingClientRect(); buildTop = r.top + y; buildH = r.height; KEYS = keys(); }
  measure(); window.addEventListener('resize', measure); window.addEventListener('load', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.querySelector('main'));
  function update(now) {
    const dt = Math.min(0.05, ((now || performance.now()) - lastT) / 1000); lastT = now || performance.now();
    glide(dt);
    const vh = innerHeight, y = window.scrollY, mid = vh * 0.5, K = KEYS;
    let i = 0; for (let k = 0; k < tops.length; k++) if (tops[k] - y <= mid) i = k;
    const nxt = Math.min(SECS.length - 1, i + 1), topN = tops[nxt] - y, prevTop = tops[i] - y;
    let t = 0, a = i, b = nxt; // blend in a band of one viewport around each boundary
    if (nxt !== i && topN - mid < vh * 0.5) t = clamp(0.5 - (topN - mid) / vh, 0, 0.5);
    else if (i > 0 && mid - prevTop < vh * 0.5) { a = i - 1; b = i; t = clamp(0.5 + (mid - prevTop) / vh, 0.5, 1); }
    const A = K[a], B = K[b], ts = smooth(t), num = (n) => lerp(A[n], B[n], ts);
    const bTop = buildTop - y, bp = clamp(-bTop / Math.max(1, buildH - vh), 0, 0.9999);
    if (bTop < vh * 0.6 && bTop + buildH > vh * 0.4) setBuild(Math.floor(bp * BUILD.length));
    const st = { a: A.lay, b: B.lay, t, x: num('x'), y: num('y'), scale: num('scale'), night: num('night'), globe: num('globe'), ring: num('ring'), fade: num('fade'), marquee: num('marquee'), active: buildIdx, pw: A.pw.map((v, k) => lerp(v, B.pw[k], ts)), pop: num('pop'), ptx: num('ptx'), pty: num('pty'), pts: num('pts') };
    if (openId) st.fade = Math.max(st.fade, 0.2);
    if (intro > 0) st.scale = lerp(st.scale, 0.2, intro); // before the loader ends the rock is small and far
    ND.target = st;
    const cur = t < 0.5 ? a : b;
    if (cur !== secIdx) { secIdx = cur; html.setAttribute('data-sec', SECS[cur].id); railBtns.forEach((el, k) => el.classList.toggle('is-on', k === cur)); }
    railBar.style.transform = 'scaleY(' + clamp(y / Math.max(1, document.documentElement.scrollHeight - vh), 0, 1).toFixed(4) + ')';
    const night = st.night > 0.5; if (night !== (html.getAttribute('data-tone') === 'night')) html.setAttribute('data-tone', night ? 'night' : 'day');
    if (lastY >= 0 && y !== lastY) { const hide = y > lastY && y > vh * 0.6 && !html.classList.contains('is-menu'); if (hide !== navHide) { navHide = hide; html.classList.toggle('nav-hide', hide); } } lastY = y;
    html.classList.toggle('is-top', y < 40);
    if (cur === 5) { if (placeHold > 0) placeHold -= 1 / 60; else { placeAuto += 1 / 60; if (placeAuto > 4.5) { placeAuto = 0; const ks = ['paris', 'riga', 'boston']; setPlace(ks[(ks.indexOf(ND.place) + 1) % 3]); } } }
    if (cursor) { cu.x = lerp(cu.x, cu.tx, 0.3); cu.y = lerp(cu.y, cu.ty, 0.3); cursor.style.transform = 'translate3d(' + cu.x.toFixed(1) + 'px,' + cu.y.toFixed(1) + 'px,0)'; }
    if (pk.on || peek.classList.contains('is-on')) { const px = pk.x; pk.x = lerp(pk.x, pk.tx, 0.12); pk.y = lerp(pk.y, pk.ty, 0.12); pk.r = lerp(pk.r, clamp((pk.x - px) * 0.4, -5, 5), 0.12); peek.style.transform = 'translate3d(' + pk.x.toFixed(1) + 'px,' + pk.y.toFixed(1) + 'px,0) rotate(' + pk.r.toFixed(2) + 'deg)'; }
    requestAnimationFrame(update);
  }

  /* ───────── Loader → intro ───────── */
  const loader = $('#loader'), lnum = $('#loaderNum');
  let prog = 0, goal = 0.4, done = false;
  function start() {
    done = true; html.classList.add('is-ready'); loader.classList.add('is-done'); setTimeout(() => { loader.hidden = true; }, 1200);
    $$('.hero [data-reveal]').forEach((el, i) => setTimeout(() => el.classList.add('in'), 700 + i * 110));
    const deep = location.hash.slice(1); if (byId[deep]) setTimeout(() => openProject(deep, 1), 900);
    const t0 = performance.now(); (function ease(now) { const k = clamp((now - t0) / 1500, 0, 1); intro = Math.pow(1 - k, 3); if (k < 1) requestAnimationFrame(ease); else intro = 0; })(t0);
  }
  (function load() {
    prog = Math.min(goal, lerp(prog, goal, 0.09) + 0.005);
    lnum.textContent = String(Math.round(prog * 100)).padStart(3, '0');
    if (prog >= 0.995 && !done) return start();
    if (!done) requestAnimationFrame(load);
  })();
  const fontsReady = ND.ready || Promise.resolve();
  const loaded = new Promise((res) => { if (document.readyState === 'complete') res(); else window.addEventListener('load', res); });
  fontsReady.then(() => { goal = Math.max(goal, 0.75); });
  Promise.all([fontsReady, loaded]).then(() => { goal = 1; if (reduce) prog = 1; });
  setTimeout(() => { goal = 1; }, 6000); // never block the page on a slow asset
  requestAnimationFrame(update);
})();
