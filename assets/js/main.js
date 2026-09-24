/* Nils Demougeot · portfolio app (vanilla JS, no build step). */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '"><use href="#i-' + id + '"/></svg>';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  const CV = 'assets/cv/Nils_Demougeot_CV.pdf';
  const LOGO = { esilv: 'assets/img/logos/esilv.png', mit: 'assets/img/logos/mit.svg', rtu: 'assets/img/logos/rtu.svg', transdev: 'assets/img/logos/transdev.png' };
  const AVATAR = 'assets/img/avatar.jpg'; // square photo shown in `whoami`
  let avatarOk = false; if (AVATAR) { const im = new Image(); im.onload = () => { avatarOk = true; }; im.src = AVATAR; }

  /* ───────── Content ───────── */
  // "What I build": one figurative particle shape per cluster of work. Edit freely: shape ∈ neural | stack | tree | chip | tower | shield.
  const BUILD = [
    { shape: 'neural', color: '#FFCC00', label: 'AI & Machine Learning', blurb: 'Classification & regression models, from preprocessing to evaluation.', tags: ['Python', 'Scikit-Learn', 'Pandas', 'NumPy'] },
    { shape: 'stack', color: '#818cf8', label: 'Full-Stack Web', blurb: 'Production web apps, from data model to deployed, mobile-first UI.', tags: ['Django', 'PostgreSQL', 'JS', 'APIs'] },
    { shape: 'tree', color: '#fb923c', label: 'Algorithms & Graphs', blurb: 'Shortest paths, search and clean object-oriented solvers.', tags: ['C#', '.NET', 'Dijkstra', 'OOP'] },
    { shape: 'chip', color: '#34d399', label: 'Embedded Systems', blurb: 'Microcontrollers, sensors and real-time control loops.', tags: ['Arduino', 'C++', 'MPU6050', 'Servos'] },
    { shape: 'tower', color: '#38bdf8', label: 'Networks & Telecom', blurb: 'Network coding research at MIT, data transmission in Riga.', tags: ['Network coding', 'Python sims', 'Telecom'] },
    { shape: 'shield', color: '#fb7185', label: 'Cybersecurity', blurb: 'Threat detection, IOC hunting and security dashboards.', tags: ['CrowdStrike', 'SIEM', 'Log analysis'] }
  ];
  const PLACES = {
    paris: { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, color: '#FFCC00', logo: LOGO.esilv, tag: 'HOME BASE', coords: '48.86° N · 2.35° E', title: 'ESILV, engineering cycle', sub: 'Data & AI major · M1, class of 2028', dates: '2023 → 2028', dist: 'home · 0 km', extra: 'Also here: Transdev, cybersecurity & data internship (summer 2025).' },
    riga: { name: 'Riga', country: 'Latvia', lat: 56.9496, lon: 24.1052, color: '#34d399', logo: LOGO.rtu, tag: 'EXCHANGE SEMESTER', coords: '56.95° N · 24.11° E', title: 'Riga Technical University', sub: 'Telecommunications & data transmission', dates: 'Aug 2025 → Jan 2026', dist: '≈ 1,700 km from Paris', extra: 'One semester abroad during the engineering cycle.' },
    boston: { name: 'Boston', country: 'USA', lat: 42.3601, lon: -71.0942, color: '#fb7185', logo: LOGO.mit, tag: 'RESEARCH + HIGH SCHOOL', coords: '42.36° N · 71.09° W', title: 'MIT, Research Lab of Electronics', sub: 'Network Coding group · research intern', dates: 'Jul → Aug 2022', dist: '≈ 5,500 km from Paris', extra: 'Also here: International School of Boston (2021 → 2023), French Bac with Mention Très Bien.' }
  };
  // Skills map: one hub per area; each skill lists the project cards (ids) where I used it.
  const SKILL_GRAPH = [
    { name: 'Data & AI', color: '#FFCC00', skills: [['Python', ['p-ligue1', 'p-tips', 'p-mit', 'p-uttt']], ['pandas · NumPy', ['p-ligue1', 'p-tips', 'p-mit']], ['scikit-learn', ['p-ligue1']], ['Feature engineering', ['p-ligue1']], ['Statistics', ['p-tips', 'p-ligue1']], ['Data viz', ['p-ligue1', 'p-tips', 'p-mit']]] },
    { name: 'Algorithms', color: '#fb923c', skills: [['Shortest paths', ['p-livin']], ['Minimax · alpha-beta', ['p-uttt']], ['Recursion · DFS', ['p-boggle']], ['Sorting · search', ['p-boggle']], ['Simulation', ['p-mit', 'p-siem']]] },
    { name: 'Software & web', color: '#818cf8', skills: [['Django', ['p-fabrique']], ['SQL', ['p-livin', 'p-doovoirs', 'p-fabrique']], ['C# · .NET', ['p-livin', 'p-boggle']], ['C++ · OOP', ['p-rpg']], ['PHP · JavaScript', ['p-doovoirs', 'p-vivesmap']], ['Figma · Webflow', ['p-boudoubox', 'p-vivesmap']]] },
    { name: 'Security data', color: '#fb7185', skills: [['CrowdStrike NG-SIEM', ['p-siem']], ['Log queries', ['p-siem']], ['Dashboards', ['p-siem']], ['Alerting', ['p-siem']]] },
    { name: 'Networks', color: '#38bdf8', skills: [['Network coding', ['p-mit']], ['Channel models', ['p-mit']], ['Probability', ['p-mit']]] },
    { name: 'Hardware & CAD', color: '#34d399', skills: [['Arduino · sensors', ['p-quake']], ['SolidWorks', ['p-hexapod', 'p-h160', 'p-rocket']], ['CNC · laser cutting', ['p-rocket', 'p-hexapod']], ['3D printing', ['p-quake']]] },
    { name: 'Product & teams', color: '#a78bfa', skills: [['Pitching', ['p-fabrique', 'p-distraction', 'p-sport']], ['Business model', ['p-fabrique', 'p-distraction']], ['Explaining tech', ['p-seechy', 'p-mit']]] }
  ];
  const ALIASES = { projects: 'projects', 'ls projects': 'projects', 'ls projects/': 'projects', whoami: 'whoami', about: 'whoami', bio: 'whoami', me: 'whoami', experience: 'gitlog', exp: 'gitlog', work: 'gitlog', internships: 'gitlog', internship: 'gitlog', 'git log': 'gitlog', education: 'tree', edu: 'tree', school: 'tree', 'ls ~/education': 'tree', skills: 'skills', stack: 'skills', languages: 'locale', langs: 'locale', locale: 'locale', volunteering: 'log', volunteer: 'log', associations: 'log', asso: 'log', contact: 'contact', help: 'help', '?': 'help', man: 'help', 'man nils': 'help', 'sudo hire nils': 'sudo' };
  const MAIN_CMDS = ['whoami', 'projects', 'experience', 'education', 'skills', 'languages', 'volunteering', 'contact', 'cv', 'sudo hire nils'];
  const HIDDEN_CMDS = ['globe riga', 'predict', 'leak', 'rlnc', 'ttt', 'route', 'quake', 'walk', 'morph', 'clear'];
  const KNOWN = ['help', 'whoami', 'projects', 'experience', 'education', 'skills', 'languages', 'volunteering', 'contact', 'cv', 'sudo hire nils', 'globe paris', 'globe riga', 'globe boston', 'predict', 'leak', 'ttt', 'quake', 'stab', 'route', 'fit', 'boggle', 'rlnc', 'walk', 'explode', 'morph', 'ls', 'clear', 'date', 'exit'];
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

  const W = {}; // live widgets
  const scrollToId = (id) => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 86, behavior: reduce ? 'auto' : 'smooth' }); };

  /* ───────── Terminal ───────── */
  const term = $('#term'), out = $('#termOut'), input = $('#termInput');
  const TS = { history: [], hIdx: -1, typing: false, timer: 0 };
  out.style.position = 'relative';
  const PROMPT = '<span class="p-user">nils@portfolio</span> <span class="p-dir">~</span> <span class="p-sym">%</span>';

  function setOpen(open) {
    term.classList.toggle('is-open', open);
    $('#termSize use').setAttribute('href', open ? '#i-minimize' : '#i-maximize');
    $('#termSize').setAttribute('aria-label', open ? 'Shrink terminal' : 'Expand terminal');
  }
  function motd() {
    const d = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return '<div class="motd"><span class="dim">Last login: ' + d + ' on ttys001</span>' +
      (finePointer
        ? '<span class="hi">Hi, I\'m Nils\' terminal. Click a quick command below, or type one and press <span class="k">' + icon('enter') + '</span></span>' +
          '<div class="motd-tips"><span>start with <button class="run" data-run="whoami">whoami</button></span><span><span class="k">Tab</span> autocomplete</span><span><span class="k">' + icon('arrow-up') + '</span> history</span><span><span class="k">/</span> open from anywhere</span><span><button class="run" data-run="help">help</button> all commands</span></div></div>'
        : '<span class="hi">Hi, I\'m Nils\' terminal. Tap a command below, or type your own.</span>' +
          '<div class="motd-tips"><span>start with <button class="run" data-run="whoami">whoami</button></span><span><button class="run" data-run="help">help</button> all commands</span></div></div>');
  }
  function append(body, cmd, keepSmall) {
    const d = document.createElement('div'); d.className = 'entry';
    d.innerHTML = (cmd != null ? '<div class="cmdline">' + PROMPT + ' <span class="c">' + esc(cmd) + '</span></div>' : '') + body;
    out.appendChild(d);
    if (!keepSmall) setOpen(true);
    requestAnimationFrame(() => out.scrollTo({ top: Math.max(0, d.offsetTop - 14), behavior: reduce ? 'auto' : 'smooth' }));
    setTimeout(() => out.scrollTo({ top: Math.max(0, d.offsetTop - 14), behavior: reduce ? 'auto' : 'smooth' }), 620); // after the height transition
    return d;
  }
  function resetTerm() { out.innerHTML = ''; append(motd(), null, true); setOpen(false); }

  const R = {
    whoami: () => '<div class="who"><div class="avatar">ND' + (avatarOk ? '<img src="' + AVATAR + '" alt="Nils Demougeot">' : '') + '</div><div class="who-txt"><p><strong>Nils Demougeot</strong>, Data &amp; AI engineering student at ESILV Paris. I did network coding research at MIT, built security dashboards at Transdev and won a startup prize with La Fabrique. I like projects where data turns into a decision or a product.</p><div class="pills"><span>Courbevoie, FR</span><span>M1 · class of 2028</span><span class="ok">internship · from Apr 2027</span></div></div></div>',
    gitlog: () => '<div class="xp">' + [
      ['2026', '<span class="logo-tile sm ph" style="--c:#818cf8">' + icon('scissors') + '</span>', 'La Fabrique, founder project', 'Django platform for textile upcycling · Prix Esprit Startup'],
      ['summer 2025', '<span class="logo-tile sm crop"><img src="' + LOGO.transdev + '" alt="Transdev"></span>', 'Cybersecurity &amp; Data intern', 'Transdev · threat detection &amp; security dashboards'],
      ['summer 2022', '<span class="logo-tile sm"><img src="' + LOGO.mit + '" alt="MIT"></span>', 'Research intern', 'MIT, Research Lab of Electronics · network coding']
    ].map((r) => '<div class="xp-row"><span class="xp-when">' + r[0] + '</span>' + r[1] + '<div><b>' + r[2] + '</b><span>' + r[3] + '</span></div></div>').join('') + '</div>',
    tree: () => narrow() ? eduList() : '<div class="edu"><div class="gantt"><div class="today"></div>' +
      '<div class="bar-row"><div class="bar" style="left:35.6%;width:64.4%;background:#f4f4f5;color:#000"><img src="' + LOGO.esilv + '" alt="">ESILV Paris · Data &amp; AI engineering</div></div>' +
      '<div class="bar-row"><div class="bar" style="left:62.2%;width:5.5%;background:#34d399"></div><span class="bar-lbl" style="right:calc(37.8% + 10px);color:#34d399"><img src="' + LOGO.rtu + '" alt="">Riga TU · exchange, Sep → Jan</span></div>' +
      '<div class="bar-row"><div class="bar" style="left:8.9%;width:24.4%;background:#fb7185;color:#0c0d12">' + icon('cap') + 'High school</div><span class="bar-lbl" style="left:calc(33.3% + 10px);color:#fb7185">Boston · French Bac, Très Bien</span></div>' +
      '</div><div class="axis"><span style="left:0">2021</span><span style="left:26.7%;transform:translateX(-50%)">2023</span><span style="left:53.3%;transform:translateX(-50%)">2025</span><span style="left:76.4%;transform:translateX(-50%);color:#FFCC00">now</span><span style="right:0">2028</span></div></div>',
    skills: () => '<div class="skillmap"><div class="graph">' + skillSvg() + '</div><div class="sk-info" aria-live="polite">' + skillInfo(null) + '</div></div><span class="graph-hint">' + (finePointer ? 'hover a skill · click to pin it' : 'swipe the map · tap a skill') + ' · ' + SKILL_COUNT + ' skills from my projects</span>',
    locale: () => '<div class="gauges">' + [['FR', 'native', '#FFCC00', 0], ['EN', 'C1 · TOEFL 657', '#818cf8', 23.6], ['ES', 'intermediate', '#fb7185', 78.5]].map(([l, s, c, off]) =>
      '<div class="gauge"><div><svg viewBox="0 0 120 66"><path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="#232735" stroke-width="10" stroke-linecap="round"/><path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="' + c + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="157.08" stroke-dashoffset="157.08" data-off="' + off + '"/></svg><b>' + l + '</b></div><span style="color:' + c + '">' + s + '</span></div>').join('') + '</div>',
    log: () => '<div class="vol"><p><span class="logo-tile sm ph" style="--c:#4ade80">' + icon('leaf') + '</span><span><strong>DeVinci Durable</strong>, Head of Communication &amp; Board Advisor.</span></p><div class="stats">' +
      [['10', 'people on my team'], ['600 m²', 'shared garden launched at La Défense'], ['4 days', 'eco seminar in Marseille']].map(([b, s]) => '<div class="stat"><b>' + b + '</b><span>' + s + '</span></div>').join('') + '</div></div>',
    contact: () => '<div class="links"><a class="primary" href="mailto:nils.demougeot@gmail.com">' + icon('mail') + 'nils.demougeot@gmail.com</a><a href="https://github.com/nils-demougeot" target="_blank" rel="noopener">' + icon('github') + 'GitHub' + icon('arrow-up-right') + '</a><a href="https://www.linkedin.com/in/nils-demougeot/" target="_blank" rel="noopener">' + icon('linkedin') + 'LinkedIn' + icon('arrow-up-right') + '</a></div>',
    help: () => '<div class="help"><span>Main commands (click to run):</span><div class="help-grid">' + MAIN_CMDS.map((c) => '<button data-run="' + c + '">' + c + '</button>').join('') + '</div><span>A few hidden ones that drive the demos on this page:</span><div class="help-grid">' + HIDDEN_CMDS.map((c) => '<button class="hidden-cmd" data-run="' + c + '">' + c + '</button>').join('') + '</div></div>',
    sudo: () => '<div class="sudo"><div><small>' + icon('check') + 'access granted</small><b>I&#39;m ready to join your team.</b></div><a href="mailto:nils.demougeot@gmail.com?subject=Internship%20offer">Send the offer' + icon('arrow-up-right') + '</a></div>'
  };
  const SKILL_COUNT = SKILL_GRAPH.reduce((a, c) => a + c.skills.length, 0);
  const narrow = () => out.clientWidth < 560;
  function eduList() { // phone version of `education`: one row per school, with its span on a 2021 → 2028 line
    return '<div class="edu-list">' + [
      ['<span class="logo-tile sm"><img src="' + LOGO.esilv + '" alt=""></span>', 'ESILV Paris', 'Data &amp; AI engineering school', '2023 → 2028', '#f4f4f5', 35.6, 64.4],
      ['<span class="logo-tile sm"><img src="' + LOGO.rtu + '" alt=""></span>', 'Riga Technical University', 'exchange semester', 'Sep 2025 → Jan 2026', '#34d399', 62.2, 5.5],
      ['<span class="logo-tile sm ph" style="--c:#fb7185">' + icon('cap') + '</span>', 'International School of Boston', 'high school · French Bac, Très Bien', '2021 → 2023', '#fb7185', 8.9, 24.4]
    ].map(([ic, t, sub, when, col, l, w]) => '<div class="edu-row" style="--c:' + col + '">' + ic + '<div><b>' + t + '</b><span>' + sub + '</span><i class="edu-bar"><i style="left:' + l + '%;width:' + w + '%"></i><em></em></i><small>' + when + '</small></div></div>').join('') + '</div>';
  }
  function skillSvg() {
    const Wd = 780, H = 450, cx = Wd / 2, cy = H / 2, N = SKILL_GRAPH.length, links = [], nodes = [], hubs = [], F = 'font-family="JetBrains Mono, monospace"', halo = 'stroke="#0a0b10" stroke-width="4" paint-order="stroke"';
    let k = 0; const boxes = [];
    const hit = (bx) => boxes.some((o) => bx[0] < o[2] && bx[2] > o[0] && bx[1] < o[3] && bx[3] > o[1]);
    SKILL_GRAPH.forEach((c, ci) => { // hub labels first, so skill labels steer around them
      const a0 = -Math.PI / 2 + (ci / N) * Math.PI * 2, hx = cx + Math.cos(a0) * 178, hy = cy + Math.sin(a0) * 120, ly = hy + (Math.sin(a0) > 0.3 ? -17 : 25), w = c.name.length * 7 + 6;
      boxes.push([hx - w / 2, ly - 11, hx + w / 2, ly + 3], [hx - 14, hy - 14, hx + 14, hy + 14]);
    });
    boxes.push([cx - 36, cy - 36, cx + 36, cy + 36]);
    SKILL_GRAPH.forEach((c, ci) => {
      const a0 = -Math.PI / 2 + (ci / N) * Math.PI * 2, hx = cx + Math.cos(a0) * 178, hy = cy + Math.sin(a0) * 120, n = c.skills.length, span = Math.min(2, 0.44 * (n - 1));
      links.push('<line class="lk" data-c="' + ci + '" pathLength="1" style="--d:' + ci * 70 + 'ms" x1="' + cx + '" y1="' + cy + '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) + '" stroke="' + c.color + '" stroke-width="1.6" stroke-opacity=".5"/>');
      c.skills.forEach(([name], si) => {
        const a = a0 + (n === 1 ? 0 : -span / 2 + (span * si) / (n - 1)), cs = Math.cos(a), d = 380 + k++ * 28, lw = name.length * 6.7 + 4;
        const anchor = cs > 0.12 ? 'start' : cs < -0.12 ? 'end' : 'middle';
        let x, y, tx, ty, bx;
        for (let r = 1; r < 2.2; r += 0.16) { // push the node outward along its branch until its label is clear
          x = hx + Math.cos(a) * 88 * r; y = hy + Math.sin(a) * 60 * r;
          tx = anchor === 'start' ? x + 10 : anchor === 'end' ? x - 10 : x; ty = anchor === 'middle' ? y + (Math.sin(a) < 0 ? -12 : 19) : y + 4;
          const x0 = anchor === 'start' ? tx : anchor === 'end' ? tx - lw : tx - lw / 2;
          bx = [Math.min(x0, x - 6), Math.min(ty - 11, y - 6), Math.max(x0 + lw, x + 6), Math.max(ty + 3, y + 6)];
          if (!hit(bx)) break;
        }
        boxes.push(bx);
        links.push('<line class="lk" data-c="' + ci + '" data-s="' + ci + '.' + si + '" pathLength="1" style="--d:' + (d - 120) + 'ms" x1="' + hx.toFixed(1) + '" y1="' + hy.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + c.color + '" stroke-width="1.2" stroke-opacity=".28"/>');
        nodes.push('<g class="nd" tabindex="0" data-c="' + ci + '" data-s="' + ci + '.' + si + '" style="--d:' + d + 'ms;--c:' + c.color + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="15" fill="transparent"/><circle class="dot" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5"/><text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" ' + F + ' ' + halo + '>' + esc(name) + '</text></g>');
      });
      const ly = hy + (Math.sin(a0) > 0.3 ? -17 : 25);
      hubs.push('<g class="hub" tabindex="0" data-c="' + ci + '" style="--d:' + (200 + ci * 70) + 'ms;--c:' + c.color + '"><circle class="ring" cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="11"/><circle cx="' + hx.toFixed(1) + '" cy="' + hy.toFixed(1) + '" r="10" fill="' + c.color + '"/><text x="' + hx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + c.color + '" ' + F + ' ' + halo + '>' + esc(c.name) + '</text></g>');
    });
    const me = avatarOk ? '<clipPath id="skMe"><circle cx="' + cx + '" cy="' + cy + '" r="30"/></clipPath><image href="' + AVATAR + '" x="' + (cx - 30) + '" y="' + (cy - 30) + '" width="60" height="60" clip-path="url(#skMe)" preserveAspectRatio="xMidYMid slice"/>'
      : '<circle cx="' + cx + '" cy="' + cy + '" r="30" fill="#0b3df5"/><text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" fill="#fff" font-weight="800" font-size="16" ' + F + '>ND</text>';
    return '<svg viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="Skills map">' + links.join('') +
      '<g class="me"><circle class="ring" cx="' + cx + '" cy="' + cy + '" r="31"/>' + me + '<circle cx="' + cx + '" cy="' + cy + '" r="30" fill="none" stroke="#f4f4f5" stroke-width="2"/></g>' + hubs.join('') + nodes.join('') + '</svg>';
  }
  const projTitle = (id) => { const el = document.getElementById(id); return el ? $('h3', el).textContent : id; };
  const projNum = (id) => String($$('#projects > .proj').findIndex((el) => el.id === id) + 1).padStart(2, '0');
  function skillInfo(sel) {
    if (!sel) return '<span class="sk-cat" style="--c:#a1a1aa">SKILLS MAP</span><b class="sk-name">' + SKILL_GRAPH.length + ' areas, ' + SKILL_COUNT + ' skills</b><p>Each skill is linked to the projects where I used it. ' + (finePointer ? 'Hover' : 'Tap') + ' one, or pick an area:</p><div class="sk-legend">' +
      SKILL_GRAPH.map((c, ci) => '<button type="button" data-hubbtn="' + ci + '" style="--c:' + c.color + '"><i></i>' + esc(c.name) + '</button>').join('') + '</div>';
    const c = SKILL_GRAPH[sel.c];
    if (sel.s == null) return '<span class="sk-cat" style="--c:' + c.color + '">AREA · ' + c.skills.length + ' SKILLS</span><b class="sk-name">' + esc(c.name) + '</b><div class="sk-legend">' +
      c.skills.map(([n], si) => '<button type="button" data-skbtn="' + sel.c + '.' + si + '" style="--c:' + c.color + '"><i></i>' + esc(n) + '</button>').join('') + '</div>';
    const [name, used] = c.skills[+sel.s.split('.')[1]];
    return '<span class="sk-cat" style="--c:' + c.color + '">' + esc(c.name.toUpperCase()) + '</span><b class="sk-name">' + esc(name) + '</b><span class="sk-sub">used in</span><div class="sk-used">' +
      used.map((id) => '<button type="button" data-goto="' + id + '"><span>' + projNum(id) + '</span>' + esc(projTitle(id)) + icon('arrow-up-right') + '</button>').join('') + '</div>';
  }
  function skFocus(svg, sel) {
    svg.classList.toggle('focus', !!sel);
    $$('[data-c]', svg).forEach((el) => el.classList.toggle('on', !!sel && el.getAttribute('data-c') === String(sel.c) && (sel.s == null || !el.hasAttribute('data-s') || el.getAttribute('data-s') === sel.s)));
    $('.sk-info', svg.closest('.skillmap')).innerHTML = skillInfo(sel);
  }
  const skSel = (el) => (el.classList.contains('hub') ? { c: +el.getAttribute('data-c'), s: null } : { c: +el.getAttribute('data-c'), s: el.getAttribute('data-s') });
  out.addEventListener('mouseover', (e) => { const el = e.target.closest('.skillmap .nd, .skillmap .hub'); if (!el) return; const svg = el.ownerSVGElement; if (!svg.__pin) skFocus(svg, skSel(el)); });
  out.addEventListener('mouseout', (e) => { const svg = e.target.closest('.skillmap svg'); if (svg && !svg.contains(e.relatedTarget) && !svg.__pin) skFocus(svg, null); });
  out.addEventListener('focusin', (e) => { const el = e.target.closest('.skillmap .nd, .skillmap .hub'); if (el) skFocus(el.ownerSVGElement, skSel(el)); });
  out.addEventListener('click', (e) => {
    const map = e.target.closest('.skillmap'); if (!map) return; const svg = $('svg', map);
    const el = e.target.closest('.nd, .hub'), hb = e.target.closest('[data-hubbtn]'), sb = e.target.closest('[data-skbtn]');
    let sel = null;
    if (el) sel = skSel(el); else if (hb) sel = { c: +hb.getAttribute('data-hubbtn'), s: null }; else if (sb) sel = { c: +sb.getAttribute('data-skbtn').split('.')[0], s: sb.getAttribute('data-skbtn') }; else if (!e.target.closest('.sk-info')) sel = null; else return;
    const key = sel ? sel.c + '|' + sel.s : null;
    svg.__pin = key && svg.__pin !== key ? key : null; skFocus(svg, svg.__pin ? sel : null);
  });

  const text = (t, color, link) => '<div class="txt"><span style="color:' + (color || '#d4d4d8') + '">' + esc(t) + '</span>' + (link ? '<a href="' + link.href + '" download="Nils_Demougeot_CV.pdf">' + esc(link.label) + icon('download') + '</a>' : '') + '</div>';
  const run = (k, id, fn, delay) => { activate(k); scrollToId(id); const w = demo(k); if (w && fn) setTimeout(() => fn(w), delay || 0); };
  const demoCmds = {
    predict: () => { run('ligue1', 'p-ligue1', (w) => w.random(), 300); return '→ random fixture sent to the Ligue 1 model…'; },
    leak: () => { run('siem', 'p-siem', (w) => w.exfil(), 500); return '→ someone is copying files to a USB key… watch the hourly search.'; },
    ttt: () => { run('uttt', 'p-uttt', (w) => w.watch(), 300); return '→ two alpha-beta AIs, 0.45 s per move.'; },
    route: () => { run('livin', 'p-livin', (w) => w.random(), 300); return '→ shortest path on the real Paris metro graph…'; },
    fit: () => { run('fabrique', 'p-fabrique', (w) => w.pattern(), 300); return '→ checking a new pattern against the fabric.'; },
    boggle: () => { run('boggle', 'p-boggle', (w) => w.ai(), 600); return '→ the Boggle solver is looking for every word…'; },
    quake: () => { run('quake', 'p-quake', (w) => w.quake(), 500); return '→ shaking stabilizer.ino… watch the ball stay put.'; },
    stab: () => { toggleStab(); return '→ stabilizer ' + (state.stab ? 'ON' : 'OFF') + '.'; },
    rlnc: () => { run('mit', 'p-mit', (w) => w.batch(), 300); return '→ 10,000 RLNC generations over the erasure channel…'; },
    walk: () => { run('hexapod', 'p-hexapod', (w) => w.ratio(), 300); return '→ changing the hexapod gear ratio.'; },
    explode: () => { run('h160', 'p-h160', (w) => w.explode(), 400); return '→ exploded view of the H160 assembly.'; },
    morph: () => { scrollToId('top'); W.points && W.points.next(); return '→ morphing the hero particles…'; }
  };
  R.projects = () => '<div class="plist">' + $$('#projects > .proj').map((el, i) => '<button type="button" data-goto="' + el.id + '"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><b>' + esc($('h3', el).textContent) + '</b><span class="t" style="color:' + el.style.getPropertyValue('--c') + '">' + esc($('.tag', el).textContent) + '</span>' + (el.hasAttribute('data-demo') ? '<span class="live">● live demo</span>' : '') + '</button>').join('') + '</div>';
  function exec(raw) {
    const cmd = (raw || '').trim(), k = cmd.toLowerCase().replace(/\s+/g, ' ');
    if (!k) return;
    TS.history.push(cmd); TS.hIdx = -1;
    if (k === 'clear' || k === 'cls') { resetTerm(); return; }
    let body;
    if (ALIASES[k]) body = R[ALIASES[k]]();
    else if (k.startsWith('sudo')) body = text('Nice try. The only sudo allowed here is "sudo hire nils".', '#fbbf24');
    else if (k.startsWith('globe')) {
      const id = k.split(' ')[1];
      if (PLACES[id]) { scrollToId('globe'); setTimeout(() => W.earth && W.earth.focus(id), 450); body = text('→ flying to ' + PLACES[id].name + '… look up.', PLACES[id].color); }
      else body = text('usage: globe paris | riga | boston', '#a1a1aa');
    }
    else if (k === 'ls') body = text('whoami  experience  education  skills  languages  volunteering  contact  cv.pdf  projects/', '#818cf8');
    else if (['cv', 'resume', 'cat cv.pdf', 'open cv.pdf', 'cv.pdf'].includes(k)) body = text('cv.pdf: 1 page, 1 click.', null, { href: CV, label: 'Download cv.pdf' });
    else if (k === 'pwd') body = text('/home/nils/portfolio');
    else if (k === 'date') body = text(new Date().toString());
    else if (k === 'exit' || k === 'logout') body = text('logout… just kidding. The projects are right below.', '#a1a1aa');
    else if (['hi', 'hello', 'hey', 'bonjour', 'salut'].includes(k)) body = text('Hey! Start with "whoami", or "help" for the full list.');
    else if (k.startsWith('echo ')) body = text(cmd.slice(5));
    else if (demoCmds[k]) body = text(demoCmds[k](), '#34d399');
    else {
      let best = '', bd = 99; KNOWN.forEach((c) => { const d = lev(k, c); if (d < bd) { bd = d; best = c; } });
      const sug = bd <= Math.max(2, Math.floor(k.length / 3)) ? best : '';
      body = '<div class="txt"><span style="color:#a1a1aa">command not found: ' + esc(cmd) + (sug ? '. Did you mean <button class="run" data-run="' + esc(sug) + '">' + esc(sug) + '</button>?' : '. Try <button class="run" data-run="help">help</button>.') + '</span></div>';
    }
    const d = append(body, cmd);
    const gr = $('.skillmap .graph', d); if (gr) requestAnimationFrame(() => { gr.scrollLeft = (gr.scrollWidth - gr.clientWidth) / 2; }); // phone: start centred on the map
    $$('.gauge path[data-off]', d).forEach((p) => requestAnimationFrame(() => requestAnimationFrame(() => (p.style.strokeDashoffset = p.getAttribute('data-off')))));
  }
  function typeRun(cmd, chip) {
    if (TS.typing) return; TS.typing = true; let i = 0;
    if (chip) chip.classList.add('is-running');
    const done = () => { TS.typing = false; input.value = ''; if (chip) chip.classList.remove('is-running'); exec(cmd); };
    if (reduce) { done(); return; }
    const step = () => { i++; input.value = cmd.slice(0, i); if (i < cmd.length) TS.timer = setTimeout(step, 22 + Math.random() * 34); else TS.timer = setTimeout(done, 160); };
    input.value = ''; TS.timer = setTimeout(step, 40);
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-run]'); if (b) { e.preventDefault(); typeRun(b.getAttribute('data-run'), b.classList.contains('qc') ? b : null); } });
  $('#termForm').addEventListener('submit', (e) => { e.preventDefault(); if (TS.typing) return; const v = input.value; input.value = ''; exec(v); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault(); const v = input.value.toLowerCase().trim(); if (!v) return;
      const m = KNOWN.filter((c) => c.startsWith(v));
      if (m.length === 1) input.value = m[0];
      else if (m.length > 1) { let p = m[0]; m.forEach((c) => { while (!c.startsWith(p)) p = p.slice(0, -1); }); if (p.length > v.length) input.value = p; else append(text(m.join('  ·  '), '#a1a1aa')); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); if (!TS.history.length) return; TS.hIdx = TS.hIdx < 0 ? TS.history.length - 1 : Math.max(0, TS.hIdx - 1); input.value = TS.history[TS.hIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); if (TS.hIdx < 0) return; TS.hIdx++; if (TS.hIdx >= TS.history.length) { TS.hIdx = -1; input.value = ''; } else input.value = TS.history[TS.hIdx];
    } else if (e.key === 'Escape') input.blur();
  });
  $$('[data-term]').forEach((b) => b.addEventListener('click', () => { const a = b.getAttribute('data-term'); if (a === 'clear') resetTerm(); else setOpen(a === 'expand'); }));
  $('#termSize').addEventListener('click', () => setOpen(!term.classList.contains('is-open')));
  window.addEventListener('keydown', (e) => {
    const typing = e.target && /INPUT|TEXTAREA/.test(e.target.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); scrollToId('terminal'); setTimeout(() => input.focus({ preventScroll: true }), 350); }
  });
  resetTerm();

  /* ───────── Projects ───────── */
  // Each card with data-demo="key" gets its widget from DEMOS, created when the card nears the viewport.
  const state = { act: null, stab: true };
  const GL_DEMOS = ['quake', 'hexapod', 'h160', 'rocket']; // these need three.js
  const DEMOS = {
    ligue1: (cv, o) => PW.predictor(cv, o),
    siem: (cv, o) => PW.siem(cv, o),
    mit: (cv, o) => PW.rlnc(cv, o),
    uttt: (cv, o) => PW.uttt(cv, o),
    fabrique: (cv, o) => PW.fabric(cv, o),
    livin: (cv, o) => PW.metro(cv, o),
    tips: (cv, o) => PW.tips(cv, o),
    boggle: (cv, o) => PW.boggle(cv, o),
    quake: (cv) => {
      const note = $('#p-quake .pip-note'), base = note.innerHTML; let fell = false;
      const w = PW.platform(cv, { onState: (s) => {
        if (s.fallen !== fell) { fell = s.fallen; note.innerHTML = fell ? '<b class="rose">the tower fell!</b> turn the stabilizer on to rebuild' : base; }
        if (!fell) { $('#pitch').textContent = s.pitch.toFixed(1); $('#roll').textContent = s.roll.toFixed(1); }
      } }); w.setStab(state.stab); return { quake: () => w.quake(1.2), stab: toggleStab, setStab: w.setStab, destroy: w.destroy }; },
    rpg: (cv, o) => PW.rpg(cv, o),
    hexapod: (cv, o) => PW.hexapod(cv, o),
    h160: (cv, o) => PW.h160(cv, o),
    rocket: (cv, o) => PW.rocket(cv, o)
  };
  const demos = {};
  $$('.proj[data-demo]').forEach((el) => { demos[el.getAttribute('data-demo')] = { el, cv: $('.pip-canvas canvas', el), w: undefined }; });
  function demo(k) {
    const d = demos[k]; if (!d) return null;
    if (d.w === undefined && window.PW && PW.predictor && (!GL_DEMOS.includes(k) || window.THREE)) {
      const out = (name, v) => $$('[data-out="' + name + '"]', d.el).forEach((e) => { e.innerHTML = v; });
      d.w = safe(() => DEMOS[k](d.cv, { card: d.el, out }));
      PW.pause(d.cv, state.act !== k);
    }
    return d.w || null;
  }
  function setLive(k, on) {
    const d = demos[k]; if (!on && d.el.classList.contains('is-full')) setFull(k, false);
    d.el.classList.toggle('is-live', on); $('.status em', d.el).textContent = on ? 'live' : 'paused';
    if (window.PW) PW.pause(d.cv, !on);
    const w = demo(k); if (w && w.live) w.live(on);
  }
  function activate(k) { if (!demos[k]) return; reveal(demos[k].el); demo(k); if (state.act != null && state.act !== k) setLive(state.act, false); setLive(k, true); state.act = k; }
  function stopDemo() { if (state.act != null) setLive(state.act, false); state.act = null; }
  function toggleStab() { state.stab = !state.stab; const w = demo('quake'); w && w.setStab(state.stab); $('#stabLabel').textContent = state.stab ? 'Stabilizer ON' : 'Stabilizer OFF'; $('#stabDot').style.background = state.stab ? '#34d399' : '#f43f5e'; }
  // Phones: a live demo can fill the screen (and turn to landscape where the browser allows), so it shows at laptop size.
  function setFull(k, on) {
    const d = demos[k], stage = $('.proj-stage', d.el), b = $('.pip-fs', d.el);
    d.el.classList.toggle('is-full', on); html.classList.toggle('demo-full', on);
    if (b) { b.innerHTML = icon(on ? 'minimize' : 'maximize'); b.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen'); }
    try {
      if (on && stage.requestFullscreen) stage.requestFullscreen().then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) { /* the CSS overlay still works without the Fullscreen API (iPhone) */ }
  }
  if (!finePointer) Object.keys(demos).forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pip-fs'; b.setAttribute('aria-label', 'Full screen'); b.innerHTML = icon('maximize');
    b.addEventListener('click', () => setFull(k, !demos[k].el.classList.contains('is-full')));
    $('.pip', demos[k].el).appendChild(b);
  });
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) return; Object.keys(demos).forEach((k) => { if (demos[k].el.classList.contains('is-full')) setFull(k, false); }); });
  $$('[data-activate]').forEach((b) => b.addEventListener('click', () => activate(b.getAttribute('data-activate'))));
  $$('[data-stop]').forEach((b) => b.addEventListener('click', stopDemo));
  $$('.proj [data-act]').forEach((b) => b.addEventListener('click', () => { const k = b.closest('.proj').getAttribute('data-demo'), w = demo(k), a = b.getAttribute('data-act'); if (w && typeof w[a] === 'function') w[a](b); }));

  // Cards rise in (blur → sharp, accent scan along the top) when they scroll into view or come back through a filter.
  const projCards = $$('#projects > .proj');
  const cardIO = new IntersectionObserver((es) => {
    es.filter((e) => e.isIntersecting).sort((a, b) => projCards.indexOf(a.target) - projCards.indexOf(b.target)).forEach((e, i) => {
      const el = e.target; el.style.setProperty('--d', i * 90 + 'ms'); el.classList.add('anim', 'in'); cardIO.unobserve(el);
      setTimeout(() => el.classList.remove('anim'), i * 90 + 1000);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  function replay(cards) { cards.forEach((el) => { el.classList.remove('in'); cardIO.unobserve(el); }); void document.body.offsetHeight; cards.forEach((el) => cardIO.observe(el)); }

  // Filters + "show more": the first LIMIT cards show by default, a filter shows every match.
  const moreWrap = $('#projMoreWrap'), LIMIT = 10;
  let projFilter = 'all', projOpen = false;
  function applyProjects(animate) {
    const before = new Set(projCards.filter((el) => !el.hidden));
    projCards.forEach((el, i) => {
      const match = projFilter === 'all' || el.getAttribute('data-cat').split(' ').includes(projFilter);
      el.hidden = !(match && (projFilter !== 'all' || projOpen || i < LIMIT));
      if (el.hidden && state.act === el.getAttribute('data-demo')) stopDemo();
    });
    moreWrap.hidden = projFilter !== 'all' || projOpen || projCards.length <= LIMIT;
    $$('.pf').forEach((b) => { const on = b.getAttribute('data-filter') === projFilter; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    if (animate) replay(projCards.filter((el) => !el.hidden && (animate === 'all' || !before.has(el))));
  }
  function reveal(card) { if (card.hidden) { projFilter = 'all'; projOpen = true; applyProjects(true); } }
  $$('.pf').forEach((b) => b.addEventListener('click', () => { projFilter = b.getAttribute('data-filter'); applyProjects('all'); }));
  const extra = projCards.slice(LIMIT), extraDemos = extra.filter((el) => el.hasAttribute('data-demo')).length;
  $('#projMoreCount').textContent = extra.length;
  $('#projMoreNames').textContent = extra.map((el) => $('h3', el).textContent).slice(0, 4).join(' · ') + ' …' + (extraDemos ? '  ·  ' + extraDemos + ' more live demos' : '');
  $('#projMore').addEventListener('click', () => { projOpen = true; applyProjects(true); });
  applyProjects();
  projCards.forEach((el) => cardIO.observe(el));
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (!b) return; const el = document.getElementById(b.getAttribute('data-goto')); if (el) { reveal(el); scrollToId(el.id); } });

  // Academics card: opens ./education in the terminal.
  const acad = $('.card-acad');
  const openEdu = () => { scrollToId('terminal'); setTimeout(() => typeRun('education'), reduce ? 0 : 450); };
  acad.addEventListener('click', openEdu);
  acad.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdu(); } });

  /* ───────── What I build ───────── */
  const build = $('#build'), info = $('#buildInfo'), dots = $('#buildDots');
  BUILD.forEach((b, i) => { const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', b.label); d.style.setProperty('--dot', b.color); d.addEventListener('click', (e) => { e.stopPropagation(); W.points ? W.points.go(i) : showBuild(i); }); dots.appendChild(d); });
  let buildIdx = -1, buildBar = null;
  function showBuild(i, instant) {
    if (i === buildIdx) return; buildIdx = i; const b = BUILD[i];
    const fill = () => {
      build.style.setProperty('--accent', b.color); build.setAttribute('data-accent', b.color);
      $('#buildIdx').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(BUILD.length).padStart(2, '0');
      $('#buildLabel').textContent = b.label; $('#buildBlurb').textContent = b.blurb;
      $('#buildTags').innerHTML = b.tags.map((t) => '<span>' + esc(t) + '</span>').join('');
      $$('button', dots).forEach((d, k) => { d.classList.toggle('on', k === i); d.innerHTML = k === i ? '<i></i>' : ''; });
      buildBar = $('button.on i', dots);
    };
    if (instant) { fill(); return; }
    info.classList.add('swap'); setTimeout(() => { fill(); requestAnimationFrame(() => info.classList.remove('swap')); }, 220);
  }
  showBuild(0, true);
  $('#buildPrev').addEventListener('click', (e) => { e.stopPropagation(); W.points && W.points.prev(); });
  $('#buildNext').addEventListener('click', (e) => { e.stopPropagation(); W.points && W.points.next(); });

  /* ───────── Globe popup ───────── */
  const globe = $('#globe'), pop = $('#globePop'); let popId = null;
  function onGlobeHover(h) {
    if (!h || !PLACES[h.id]) { pop.hidden = true; popId = null; return; }
    const p = PLACES[h.id];
    if (popId !== h.id) {
      popId = h.id;
      pop.innerHTML = '<div class="pop"><div class="pop-head"><span class="pop-tag" style="color:' + p.color + '"><i></i>' + p.tag + '</span><span style="color:#71717a">' + p.coords + '</span></div>' +
        '<div class="pop-name"><span class="logo-tile sm"><img src="' + p.logo + '" alt=""></span><div>' + p.name + '<span>, ' + p.country + '</span></div></div><hr>' +
        '<div class="pop-role"><b>' + esc(p.title) + '</b><span>' + esc(p.sub) + '</span></div>' +
        '<div class="pop-meta"><b style="background:' + p.color + '">' + p.dates + '</b><span>' + p.dist + '</span></div><div class="pop-extra">' + esc(p.extra) + '</div></div>';
      pop.hidden = false;
    }
    const gw = globe.clientWidth, below = h.y < 250;
    pop.style.left = Math.round(clamp(h.x, 150, gw - 150)) + 'px'; pop.style.top = Math.round(h.y) + 'px';
    pop.style.transform = below ? 'translate(-50%, 24px)' : 'translate(-50%, calc(-100% - 24px))';
  }
  $$('[data-place]').forEach((b) => b.addEventListener('click', () => W.earth && W.earth.focus(b.getAttribute('data-place'))));

  /* ───────── Widgets: started one per frame, demos only when they come near the viewport ───────── */
  const safe = (fn) => { try { return fn(); } catch (err) { console.warn('[widget]', err); return null; } };
  function initWidgets() {
    if (!window.PW || !window.THREE) return;
    W.points = safe(() => PW.points($('#buildCanvas'), { forms: BUILD.map((b) => ({ shape: b.shape, color: b.color })), hover: 0.6, interval: 7, onChange: (i) => showBuild(i), onProgress: (p) => { if (buildBar) buildBar.style.transform = 'scaleX(' + p.toFixed(3) + ')'; } }));
    if (W.points) { buildIdx = -1; showBuild(0, true); } // restart the progress dot in sync with the widget clock
    setTimeout(() => { W.earth = safe(() => PW.earth($('#globeCanvas'), { places: Object.keys(PLACES).map((id) => ({ id, lat: PLACES[id].lat, lon: PLACES[id].lon, color: PLACES[id].color })), home: 'paris', onHover: onGlobeHover })); }, 120);
    // Demos start one card at a time, only when the card comes near the viewport (and is not filtered out).
    const dio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { dio.unobserve(e.target); demo(e.target.getAttribute('data-demo')); } }), { rootMargin: '300px 0px' });
    Object.values(demos).forEach((d) => dio.observe(d.el));
  }

  /* ───────── Dot grid: the page's dots, drawn on canvas so the cursor can light them and gently push them aside ───────── */
  function startGrid() {
    if (!finePointer || reduce) return; // touch / reduced motion keep the plain CSS dots
    // The page's dots stay a CSS background. The canvas only repaints the few grid cells around the cursor:
    // it covers them with the page colour and redraws their dots, lit and gently pushed aside.
    const cv = $('#grid'), c = cv.getContext('2d'), G = 26, R = 150, PUSH = 7, BG = '#0c0d12';
    let Wd = 0, H = 0, dpr = 1, mx = 0, my = 0, lx = 0, ly = 0, str = 0, target = 0, raf = 0, card = null, cardRaf = 0, drawn = false;
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); Wd = innerWidth; H = innerHeight; cv.width = Wd * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); drawn = true; kick(); };
    function draw() {
      if (drawn) { c.clearRect(0, 0, Wd, H); drawn = false; }
      if (str <= 0.002) return;
      drawn = true;
      const ox = 13 - (((scrollX % G) + G) % G), oy = 13 - (((scrollY % G) + G) % G), R2 = R * R, RC = R + PUSH + 3;
      const i0 = Math.floor((lx - RC - ox) / G), i1 = Math.ceil((lx + RC - ox) / G), j0 = Math.floor((ly - RC - oy) / G), j1 = Math.ceil((ly + RC - oy) / G);
      c.fillStyle = BG; c.fillRect(ox + i0 * G - G / 2, oy + j0 * G - G / 2, (i1 - i0 + 1) * G, (j1 - j0 + 1) * G); // whole cells, so no CSS dot is cut
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, R * 1.25);
      g.addColorStop(0, 'rgba(196,208,226,' + (0.055 * str).toFixed(3) + ')'); g.addColorStop(1, 'rgba(196,208,226,0)');
      c.fillStyle = g; c.fillRect(lx - R * 1.25, ly - R * 1.25, R * 2.5, R * 2.5);
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath();
      const near = [];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = ox + i * G, y = oy + j * G, dx = x - lx, dy = y - ly, d2 = dx * dx + dy * dy;
        if (d2 < R2) near.push(x, y, dx, dy, Math.sqrt(d2)); else { c.moveTo(x + 1.5, y); c.arc(x, y, 1.5, 0, 6.283); }
      }
      c.fill();
      for (let i = 0; i < near.length; i += 5) {
        const d = near[i + 4], f = 1 - d / R, e = f * f * (3 - 2 * f) * str, k = d > 0.01 ? (PUSH * e) / d : 0;
        c.fillStyle = 'rgba(206,216,232,' + (0.08 + 0.5 * e).toFixed(3) + ')';
        c.beginPath(); c.arc(near[i] + near[i + 2] * k, near[i + 1] + near[i + 3] * k, 1.5 + 0.5 * e, 0, 6.283); c.fill();
      }
    }
    function frame() {
      lx += (mx - lx) * 0.22; ly += (my - ly) * 0.22; str += (target - str) * 0.12;
      draw();
      raf = Math.abs(mx - lx) > 0.3 || Math.abs(my - ly) > 0.3 || Math.abs(target - str) > 0.004 ? requestAnimationFrame(frame) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    const setCard = (el) => { if (el === card) return; if (card) card.classList.remove('is-lit'); card = el; if (card) card.classList.add('is-lit'); };
    const lightCard = () => { cardRaf = 0; if (!card) return; const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (mx - r.left) + 'px'); card.style.setProperty('--my', (my - r.top) + 'px'); };
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!target) { lx = e.clientX; ly = e.clientY; }
      mx = e.clientX; my = e.clientY; target = 1; kick();
      setCard(e.target.closest ? e.target.closest('[data-card]') : null);
      if (card && !cardRaf) cardRaf = requestAnimationFrame(lightCard);
    }, { passive: true });
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) { target = 0; setCard(null); kick(); } });
    addEventListener('scroll', () => { if (str > 0.002) kick(); }, { passive: true });
    addEventListener('resize', resize);
    resize();
  }

  /* ───────── Intro: a dotted globe and the name, which then flies as particles onto the hero title ───────── */
  function runIntro(onLand, onDone) {
    const root = $('#intro'), title = $('#heroTitle'), page = $('.page');
    if (!html.classList.contains('intro-on')) { onLand(); onDone(); return; }
    try { sessionStorage.setItem('nd-intro', '1'); } catch (e) { /* private mode */ }
    const name = $('#introName');
    let n = 0; name.innerHTML = name.textContent.split(' ').map((w) => '<span class="w">' + w.split('').map((ch) => '<span style="--d:' + (n++) * 30 + 'ms">' + ch + '</span>').join('') + '</span>').join(' ');
    const cv = $('#introCanvas'), c = cv.getContext('2d'), S = 150, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = cv.height = S * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const N = 420, pts = [], PAL = ['#FFCC00', '#818cf8', '#34d399', '#fb7185', '#38bdf8', '#fb923c'];
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), th = i * 2.39996, a = Math.random() * 6.283, sp = 1.6 + Math.random() * 1.6;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, sx: Math.cos(a) * sp, sy: Math.sin(a) * sp, sz: (Math.random() - 0.5) * 2, d: Math.random() * 0.35, c: Math.random() < 0.12 ? PAL[i % PAL.length] : '#e4e4e7' });
    }
    const T0 = performance.now(), easeOut = (x) => 1 - Math.pow(1 - x, 3), easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    let phase = 'globe', raf = 0, finished = false;
    function drawGlobe(now) {
      const t = (now - T0) / 1000, rot = t * 0.9, ct = Math.cos(0.35), st = Math.sin(0.35), cr = Math.cos(rot), sr = Math.sin(rot), R = S * 0.36;
      c.clearRect(0, 0, S, S);
      c.strokeStyle = 'rgba(255,204,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.ellipse(S / 2, S / 2, R * 1.32, R * 1.32 * st * 0.9, 0, 0, 6.283); c.stroke();
      for (const p of pts) {
        const f = easeOut(clamp((t - p.d) / 0.9, 0, 1)), x = lerp(p.sx, p.x, f), y = lerp(p.sy, p.y, f), z = lerp(p.sz, p.z, f);
        const x1 = x * cr + z * sr, z1 = -x * sr + z * cr, y2 = y * ct - z1 * st, z2 = y * st + z1 * ct, k = (z2 + 1) / 2;
        if (f > 0.98 && z2 < -0.2) continue;
        c.globalAlpha = (0.25 + 0.75 * k) * clamp((t - p.d) * 4, 0, 1); c.fillStyle = p.c;
        const s = 1 + k * 0.9; c.fillRect(S / 2 + x1 * R - s / 2, S / 2 + y2 * R - s / 2, s, s);
      }
      const a = t * 1.6; c.globalAlpha = 1; c.fillStyle = '#FFCC00'; c.beginPath(); c.arc(S / 2 + Math.cos(a) * R * 1.32, S / 2 + Math.sin(a) * R * 1.32 * st * 0.9, 2.4, 0, 6.283); c.fill();
    }
    const loop = (now) => { if (phase === 'done') return; drawGlobe(now); raf = requestAnimationFrame(loop); }; // keeps spinning while it fades out
    raf = requestAnimationFrame(loop);
    requestAnimationFrame(() => root.classList.add('is-in'));

    // Rasterise one character at its on-screen box and return its lit pixels (viewport coords).
    const oc = document.createElement('canvas'), ox = oc.getContext('2d', { willReadFrequently: true });
    function glyph(ch, rect, fs) {
      const pad = 6, w = Math.ceil(rect.width + pad * 2), h = Math.ceil(rect.height + pad * 2);
      if (w < 2 || h < 2) return [];
      oc.width = w; oc.height = h; ox.font = '800 ' + fs + 'px "Plus Jakarta Sans"'; ox.fillStyle = '#fff'; ox.textBaseline = 'alphabetic';
      const m = ox.measureText(ch), asc = m.fontBoundingBoxAscent || fs * 0.93, desc = m.fontBoundingBoxDescent || fs * 0.25;
      ox.fillText(ch, pad, pad + (rect.height - (asc + desc)) / 2 + asc);
      const d = ox.getImageData(0, 0, w, h).data, out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 128) out.push([rect.left - pad + x, rect.top - pad + y]);
      return out;
    }
    function targets() { // one entry per visible character of the hero title
      const out = [];
      $$('span', title).forEach((sp) => {
        const node = sp.firstChild, box = sp.getBoundingClientRect(), fs = parseFloat(getComputedStyle(title).fontSize);
        for (let k = 0; k < node.length; k++) { const rg = document.createRange(); rg.setStart(node, k); rg.setEnd(node, k + 1); out.push({ ch: node.data[k].toUpperCase(), rect: rg.getBoundingClientRect(), fs, box }); }
      });
      return out;
    }
    // Sample every letter a few at a time while the name is still settling, so the merge itself starts with no hitch.
    const prep = { chars: [], i: 0, src: null, dst: null, done: false, skip: false };
    function prepare(all) {
      if (prep.done) return;
      if (!prep.src) {
        const tr = title.getBoundingClientRect();
        if (tr.bottom < 0 || tr.top > innerHeight) { prep.skip = prep.done = true; return; }
        const fs0 = parseFloat(getComputedStyle(name).fontSize);
        prep.src = $$('.w > span', name).map((sp) => { // final resting box: undo the slide-in transform still running
          const r = sp.getBoundingClientRect(), m = getComputedStyle(sp).transform, ty = m && m !== 'none' ? new DOMMatrixReadOnly(m).m42 : 0;
          return { ch: sp.textContent.toUpperCase(), rect: { left: r.left, top: r.top - ty, width: r.width, height: r.height }, fs: fs0 };
        });
        prep.dst = targets();
      }
      const grad = [[24, 24, 27], [82, 82, 91], [161, 161, 170]], per = Math.floor((innerWidth < 700 ? 1500 : 3000) / prep.src.length);
      for (let k = 0; k < (all ? 99 : 3) && prep.i < prep.src.length; k++, prep.i++) {
        const i = prep.i, s = prep.src[i], t = prep.dst[i]; if (!t) continue;
        const A = glyph(s.ch, s.rect, s.fs), B = glyph(t.ch, t.rect, t.fs); if (!A.length || !B.length) continue;
        const u = clamp((t.rect.left + t.rect.width / 2 - t.box.left) / t.box.width, 0, 1), a = u < 0.55 ? grad[0] : grad[1], b = u < 0.55 ? grad[1] : grad[2], f = u < 0.55 ? u / 0.55 : (u - 0.55) / 0.45;
        // one shared arc per letter: the curve bulges upward, perpendicular to the flight
        const dx = t.rect.left - s.rect.left, dy = t.rect.top - s.rect.top, len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
        const bend = len * (0.16 + 0.1 * (i / prep.src.length));
        const ps = [];
        for (let q = 0; q < per; q++) { const p = A[(Math.random() * A.length) | 0], r = B[(Math.random() * B.length) | 0], a2 = Math.random() * 6.283, sp = Math.random() * 7; ps.push({ x0: p[0], y0: p[1], x1: r[0], y1: r[1], jx: Math.cos(a2) * sp, jy: Math.sin(a2) * sp, j: Math.random() * 0.09 }); }
        prep.chars.push({ ps, delay: i * 0.022, cx: nx * bend, cy: ny * bend, col: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)] });
      }
      if (prep.i >= prep.src.length) prep.done = true; else if (!all) requestAnimationFrame(() => prepare(false));
    }
    function merge() {
      if (phase !== 'globe') return; phase = 'merge';
      prepare(true);
      if (prep.skip || !prep.chars.length) { finish(); return; }
      const fx = $('#introFx'), g = fx.getContext('2d'), Wd = innerWidth, H = innerHeight;
      fx.width = Wd * dpr; fx.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      page.classList.add('hello-in'); root.classList.add('merging');
      const chars = prep.chars, M0 = performance.now(), DUR = 0.7, END = chars[chars.length - 1].delay + DUR;
      const ease = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2); // quartic in-out: quick lift-off, soft landing
      let lit = false, entered = false;
      const step = (now) => {
        if (finished) return;
        const t = (now - M0) / 1000; g.clearRect(0, 0, Wd, H);
        const fade = t < END ? 1 : clamp(1 - (t - END) / 0.22, 0, 1);
        for (const ch of chars) {
          const fc = ease(clamp((t - ch.delay) / DUR, 0, 1));
          g.fillStyle = 'rgba(' + Math.round(lerp(244, ch.col[0], fc)) + ',' + Math.round(lerp(244, ch.col[1], fc)) + ',' + Math.round(lerp(245, ch.col[2], fc)) + ',' + fade.toFixed(3) + ')';
          for (const p of ch.ps) {
            const f = ease(clamp((t - ch.delay - p.j) / (DUR - 0.09), 0, 1)), m = 1 - f, w = 2 * m * f, bow = Math.sin(f * Math.PI);
            // quadratic Bézier from the source pixel to the target pixel, control point lifted by the letter's shared arc
            const x = m * m * p.x0 + w * ((p.x0 + p.x1) / 2 + ch.cx) + f * f * p.x1 + bow * p.jx;
            const y = m * m * p.y0 + w * ((p.y0 + p.y1) / 2 + ch.cy) + f * f * p.y1 + bow * p.jy;
            g.fillRect(x, y, 1.6, 1.6);
          }
        }
        if (!lit && t > END - 0.12) { lit = true; title.classList.add('lit'); }
        if (!entered && t > END - 0.05) { entered = true; onLand(); }
        if (t > END + 0.24) { cleanup(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    function cleanup() { if (finished) return; finished = true; phase = 'done'; root.remove(); html.classList.remove('intro-on'); onDone(); }
    function finish() { phase = 'done'; cancelAnimationFrame(raf); title.classList.add('lit'); page.classList.add('hello-in'); onLand(); root.classList.add('is-leaving'); setTimeout(cleanup, 300); }
    const prepTimer = setTimeout(() => prepare(false), 850), timer = setTimeout(merge, 1300);
    const skip = () => { clearTimeout(timer); clearTimeout(prepTimer); if (!finished) finish(); };
    root.addEventListener('click', skip); root.addEventListener('wheel', skip, { passive: true }); root.addEventListener('touchstart', skip, { passive: true });
    addEventListener('keydown', function k() { removeEventListener('keydown', k); if (!finished) skip(); });
  }

  /* ───────── Page choreography ───────── */
  $$('[data-enter]').forEach((el, i) => el.style.setProperty('--i', i));
  const page = $('.page');
  let entered = false;
  const enterPage = () => { if (entered) return; entered = true; page.classList.add('entered'); };
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -12% 0px' }); // not a ratio: tall sections (projects on a phone) could never reach one
  $$('.reveal').forEach((el) => io.observe(el));
  // Active nav link = last section whose top has passed 35% of the viewport (bottom of page = contact).
  const navLinks = $$('.nav-link'), secs = [['top', $('.bento')], ['terminal', $('#terminal')], ['demos', $('#demos')], ['contact', $('#contact')]];
  let navRaf = 0;
  const navSync = () => { navRaf = 0; let cur = 'top'; secs.forEach(([id, el]) => { if (el.getBoundingClientRect().top <= innerHeight * 0.35) cur = id; }); if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = 'contact'; navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur)); };
  addEventListener('scroll', () => { if (!navRaf) navRaf = requestAnimationFrame(navSync); }, { passive: true }); addEventListener('resize', navSync); navSync();

  let started = false;
  const start = () => { if (started) return; started = true; runIntro(enterPage, () => { initWidgets(); startGrid(); }); };
  const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('800 100px "Plus Jakarta Sans"'), document.fonts.load('400 12px "JetBrains Mono"')]) : Promise.resolve();
  fontsReady.then(start, start); setTimeout(start, 900);
})();
