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

  const CV = 'assets/cv/Resume_Nils_Demougeot.pdf';
  const LOGO = { esilv: 'assets/img/logos/esilv.png', mit: 'assets/img/logos/mit.svg', rtu: 'assets/img/logos/rtu.svg' };
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
    paris: { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, color: '#FFCC00', logo: LOGO.esilv, tag: 'HOME BASE', coords: '48.86° N · 2.35° E', title: 'ESILV, engineering cycle', sub: 'Data & AI major · M1, class of 2028', dates: '2023 → 2028', dist: 'home · 0 km', extra: 'Also here: cybersecurity & data internship (summer 2025).' },
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
    whoami: () => '<div class="who"><div class="avatar">ND' + (avatarOk ? '<img src="' + AVATAR + '" alt="Nils Demougeot">' : '') + '</div><div class="who-txt"><p><strong>Nils Demougeot</strong>, Data &amp; AI engineering student at ESILV Paris. I did network coding research at MIT, built security dashboards during a cybersecurity internship and won a startup prize with La Fabrique. I like projects where data turns into a decision or a product.</p><div class="pills"><span>Courbevoie, FR</span><span>M1 · class of 2028</span><span class="ok">internship · from Apr 2027</span></div></div></div>',
    gitlog: () => '<div class="xp">' + [
      ['2026', '<span class="logo-tile sm ph" style="--c:#818cf8">' + icon('scissors') + '</span>', 'La Fabrique, founder project', 'Django platform for textile upcycling · Prix Esprit Startup'],
      ['summer 2025', '<span class="logo-tile sm ph" style="--c:#fb7185">' + icon('briefcase') + '</span>', 'Cybersecurity &amp; Data intern', 'Corporate SOC team · threat detection &amp; security dashboards'],
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

  const text = (t, color, link) => '<div class="txt"><span style="color:' + (color || '#d4d4d8') + '">' + esc(t) + '</span>' + (link ? '<a href="' + link.href + '" download="Resume_Nils_Demougeot.pdf">' + esc(link.label) + icon('download') + '</a>' : '') + '</div>';
  const run = (k, id, fn, delay) => { activate(k); scrollToId(id); const w = demo(k); if (w && fn) setTimeout(() => fn(w), delay || 0); };
  const demoCmds = {
    predict: () => { run('ligue1', 'p-ligue1', (w) => w.random(), 300); return '→ random fixture sent to the Ligue 1 model…'; },
    leak: () => { run('siem', 'p-siem', (w) => w.exfil(), 500); return '→ someone is copying files to a USB key… watch the hourly search.'; },
    ttt: () => { run('uttt', 'p-uttt', (w) => w.watch(), 300); return '→ two alpha-beta AIs, 0.45 s per move.'; },
    route: () => { run('livin', 'p-livin', (w) => w.random(), 300); return '→ shortest path on the real Paris metro graph…'; },
    fit: () => { run('fabrique', 'p-fabrique', (w) => w.restart(), 300); return '→ La Fabrique demo: pick a garment to scan.'; },
    boggle: () => { run('boggle', 'p-boggle', (w) => w.ai(), 600); return '→ the Boggle solver is looking for every word…'; },
    quake: () => { run('quake', 'p-quake', (w) => w.quake(), 500); return '→ shaking stabilizer.ino… watch the ball stay put.'; },
    stab: () => { toggleStab(); return '→ stabilizer ' + (state.stab ? 'ON' : 'OFF') + '.'; },
    rlnc: () => { run('mit', 'p-mit', (w) => w.mode(), 300); return '→ the research result: theory vs 10,000 simulated messages per point.'; },
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
    if (e.key === '/' && !typing && !html.classList.contains('lb-open')) { e.preventDefault(); scrollToId('terminal'); setTimeout(() => input.focus({ preventScroll: true }), 350); }
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
  function activate(k) { if (!demos[k]) return; reveal(demos[k].el); if (listView) openRow(demos[k].el, true); demo(k); if (state.act != null && state.act !== k) setLive(state.act, false); setLive(k, true); state.act = k; }
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
  let projFilter = 'all', projOpen = false, listView = false;
  function applyProjects(animate) {
    const before = new Set(projCards.filter((el) => !el.hidden));
    projCards.forEach((el, i) => {
      const match = projFilter === 'all' || el.getAttribute('data-cat').split(' ').includes(projFilter);
      el.hidden = !(match && (projFilter !== 'all' || projOpen || listView || i < LIMIT));
      if (el.hidden && state.act === el.getAttribute('data-demo')) stopDemo();
    });
    moreWrap.hidden = projFilter !== 'all' || projOpen || listView || projCards.length <= LIMIT;
    $$('.pf').forEach((b) => { const on = b.getAttribute('data-filter') === projFilter; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    if (animate) replay(projCards.filter((el) => !el.hidden && (animate === 'all' || !before.has(el))));
  }
  function reveal(card) { if (card.hidden) { projFilter = 'all'; projOpen = true; applyProjects(true); } }
  $$('.pf').forEach((b) => b.addEventListener('click', () => { projFilter = b.getAttribute('data-filter'); applyProjects('all'); }));
  // filter chips count their cards, so cards can be added or moved without touching the numbers
  $$('.pf').forEach((b) => { const f = b.getAttribute('data-filter'), n = f === 'all' ? projCards.length : projCards.filter((el) => (el.getAttribute('data-cat') || '').split(' ').includes(f)).length, c = $('b', b); if (c) c.textContent = n; });
  const extra = projCards.slice(LIMIT), extraDemos = extra.filter((el) => el.hasAttribute('data-demo')).length;
  $('#projMoreCount').textContent = extra.length;
  $('#projMoreNames').textContent = extra.map((el) => $('h3', el).textContent).slice(0, 4).join(' · ') + ' …' + (extraDemos ? '  ·  ' + extraDemos + ' more live demos' : '');
  $('#projMore').addEventListener('click', () => { projOpen = true; applyProjects(true); });
  // Grid or list (remembered). The list shows every project as a compact row; a row opens into the full card.
  const projWrap = $('#projects'), viewTgl = $('.view-toggle');
  function openRow(el, on) {
    if (on) projCards.forEach((o) => { if (o !== el && o.classList.contains('open')) openRow(o, false); });
    el.classList.toggle('open', on); $('.proj-toggle', el).setAttribute('aria-expanded', on);
    if (!on && state.act != null && state.act === el.getAttribute('data-demo')) stopDemo();
  }
  function setView(list, animate) {
    listView = list; projWrap.classList.toggle('is-list', list); viewTgl.classList.toggle('is-list', list);
    $$('[data-view]', viewTgl).forEach((b) => b.setAttribute('aria-pressed', String((b.getAttribute('data-view') === 'list') === list)));
    if (!list) projCards.forEach((el) => { if (el.classList.contains('open')) openRow(el, false); });
    try { localStorage.setItem('nd-proj-view', list ? 'list' : 'grid'); } catch (e) { /* private mode */ }
    applyProjects(animate ? 'all' : false);
  }
  projCards.forEach((el) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'proj-toggle'; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Show or hide details'); b.innerHTML = icon('chevron-down');
    b.addEventListener('click', (e) => { e.stopPropagation(); openRow(el, !el.classList.contains('open')); });
    el.appendChild(b);
    el.addEventListener('click', (e) => { if (!listView || el.classList.contains('open') || e.target.closest('a, button')) return; openRow(el, true); });
  });
  $$('[data-view]', viewTgl).forEach((b) => b.addEventListener('click', () => { const list = b.getAttribute('data-view') === 'list'; if (list !== listView) setView(list, true); }));
  let savedView = null; try { savedView = localStorage.getItem('nd-proj-view'); } catch (e) { /* private mode */ }
  if (savedView === 'list') setView(true, false); else applyProjects();
  projCards.forEach((el) => cardIO.observe(el));
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-goto]'); if (!b) return; const el = document.getElementById(b.getAttribute('data-goto')); if (el) { reveal(el); if (listView && el.classList.contains('proj')) openRow(el, true); scrollToId(el.id); } });


  // Screenshot galleries (assets/js/gallery.js, data in assets/data/galleries.js)
  if (window.PGallery) try { PGallery.mount(); } catch (err) { console.warn('[gallery]', err); }

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

  /* ───────── Intro (≈3 s, once per session) ─────────
     A dot lights up and a field of data points unrolls into a 3D landscape, with bars of the projects' figures rising out of it,
     while the name decodes. The camera then climbs until it looks straight down: the flattened points land exactly on the
     page's own dot grid, the name flies into the hero title and the cards are drafted in place. Without WebGL, the same
     choreography runs in 2D over the plain dot grid. */
  function runIntro(onLand, onDone) {
    const root = $('#intro'), title = $('#heroTitle'), page = $('.page');
    if (!html.classList.contains('intro-on')) { onLand(); onDone(); return; }
    try { sessionStorage.setItem('nd-intro', '1'); } catch (e) { /* private mode */ }
    const cv = $('#introFx'), c = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1), W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const MONO = '"JetBrains Mono", ui-monospace, monospace', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
    const NAME = 'NILS DEMOUGEOT', SUB = 'data & ai engineering · paris', POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
    const small = W < 600;
    const T = { dot: 0.05, ripple: 0.18, rippleD: 1.3, rise: 0.3, riseD: 0.8, spikes: 0.62, labels: 0.95, name: 0.42, sub: 0.9,
      flat: 1.5, flatD: 0.6, cam: 1.42, camD: 0.78, fly: 1.72, flyD: 0.7, frames: 1.98, clear: 2.22, land: 2.36, lit: 2.62, end: 3.05 };
    const cl = (x) => clamp(x, 0, 1), out3 = (x) => 1 - Math.pow(1 - x, 3);
    const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const ease = (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2);
    // where every visible card will sit once its entrance transition is done (undo translateY(26px) scale(.985))
    const cards = $$('.bento [data-enter]').map((el) => {
      const r = el.getBoundingClientRect(), hello = el.classList.contains('card-hello'), k = hello ? 1 : 0.985;
      const w = r.width / k, h = r.height / k, mx = r.left + r.width / 2, my = r.top + r.height / 2 - (hello ? 0 : 26);
      return { x: mx - w / 2, y: my - h / 2, w, h, r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 };
    }).filter((q) => q.y < H * 1.1 && q.w > 0);
    // the name, centred, then each letter flies to its place in the hero title
    const tfs = parseFloat(getComputedStyle(title).fontSize), dst = [];
    $$('span', title).forEach((sp) => { const node = sp.firstChild; for (let k = 0; k < node.length; k++) { const rg = document.createRange(); rg.setStart(node, k); rg.setEnd(node, k + 1); dst.push(rg.getBoundingClientRect()); } });
    const lines = small ? ['NILS', 'DEMOUGEOT'] : [NAME], fs = small ? Math.min(W * 0.13, 64) : clamp(W * 0.074, 30, 104), nameY = H * 0.47, lh = fs * 0.98;
    c.font = '800 ' + fs + 'px ' + SANS;
    const glyphs = [], mid = (NAME.replace(/ /g, '').length - 1) / 2;
    lines.forEach((ln, li) => {
      const y = nameY + (li - (lines.length - 1) / 2) * lh, x0 = W / 2 - c.measureText(ln).width / 2;
      ln.split('').forEach((ch, i) => { if (ch === ' ') return; const n = glyphs.length; glyphs.push({ ch, x: x0 + c.measureText(ln.slice(0, i)).width + c.measureText(ch).width / 2, y, s: T.name + Math.abs(n - mid) * 0.032, to: dst[n] }); });
    });
    const subY = nameY + (lines.length - 1) / 2 * lh + fs * 0.62 + 10;

    /* 3D: the data landscape (three.js is already on the page for the project models) */
    const TERR = [[6, -8, 22, 4.2], [-9, -5, 16, 3], [-1, -18, 40, 5.2], [13, -17, 30, 3.4], [-16, -14, 26, 2.6], [2, -32, 80, 4]];
    const terr = (x, z, t) => { let h = 0; TERR.forEach((p) => { const dx = x - p[0], dz = z - p[1]; h += p[3] * Math.exp(-(dx * dx + dz * dz) / p[2]); }); return h + 0.55 * Math.sin(x * 0.42 + t * 1.7) * Math.cos(z * 0.36 - t * 1.3) + 0.25 * Math.sin(Math.hypot(x, z + 4) * 0.6 - t * 2.4); };
    const riseAt = (t) => out3(cl((t - T.rise) / T.riseD)) * (1 - inOut(cl((t - T.flat) / T.flatD)));
    const rippleAt = (t) => out3(cl((t - T.ripple) / T.rippleD)) * 70;
    const flatAt = (t) => inOut(cl((t - 1.58) / 0.56));
    const g3 = (() => {
      if (!window.THREE) return null;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
      const el = renderer.domElement; el.className = 'intro-gl'; root.insertBefore(el, cv);
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0); // transparent: the intro's background shows through, then the page's
      const G = 26, FOV = 50, D = (H / G) / (2 * Math.tan(FOV * Math.PI / 360));
      // a half-step grid; the points on whole steps sit on the page's dots (centres at 13 + 26k px) once seen from above,
      // the ones in between thicken the landscape and fade out as it flattens
      const ox = ((((13 - W / 2) / G) % 1) + 1) % 1, oz = ((((13 - H / 2) / G) % 1) + 1) % 1;
      const XH = Math.max(small ? 22 : 34, Math.ceil(W / G / 2) + 2), ZN = Math.ceil(H / G / 2) + 2, ZF = small ? 48 : 64;
      const pos = [], rnd = [], main = [];
      for (let z = -ZF * 2; z <= ZN * 2; z++) for (let x = -XH * 2; x <= XH * 2; x++) { pos.push(x / 2 + ox, 0, z / 2 + oz); rnd.push(Math.random()); main.push(x % 2 === 0 && z % 2 === 0 ? 1 : 0); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1)); geo.setAttribute('aMain', new THREE.Float32BufferAttribute(main, 1));
      const U = { uT: { value: 0 }, uRise: { value: 0 }, uR: { value: 0 }, uFlat: { value: 0 }, uPx: { value: dpr }, uO: { value: new THREE.Vector2(0, -4) } };
      const pk = TERR.map((p) => '+' + p[3].toFixed(2) + '*pk(p,vec2(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + '),' + p[2].toFixed(1) + ')').join('');
      const mat = new THREE.ShaderMaterial({
        uniforms: U, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
        vertexShader: [
          'uniform float uT, uRise, uR, uFlat, uPx; uniform vec2 uO; attribute float aRnd, aMain; varying vec3 vCol; varying float vA;',
          'float pk(vec2 p, vec2 c, float r) { vec2 d = p - c; return exp(-dot(d, d) / r); }',
          'void main() {',
          '  vec2 p = position.xz; float d = length(p - uO), rev = smoothstep(uR, uR - 7.0, d);',
          '  float h = (0.0' + pk + ' + 0.55 * sin(p.x * 0.42 + uT * 1.7) * cos(p.y * 0.36 - uT * 1.3) + 0.25 * sin(length(p - uO) * 0.6 - uT * 2.4)) * uRise * rev;',
          '  vec4 mv = modelViewMatrix * vec4(position.x, h, position.z, 1.0); gl_Position = projectionMatrix * mv;',
          '  float ring = exp(-pow((d - uR) / 1.7, 2.0)) * step(0.5, uR) * (1.0 - uFlat), hk = clamp(h / 5.0, 0.0, 1.0), fog = smoothstep(78.0, 24.0, -mv.z);',
          '  vec3 side = mix(vec3(0.506, 0.549, 0.973), vec3(0.984, 0.443, 0.522), smoothstep(-20.0, 20.0, position.x));',
          '  vec3 col = mix(vec3(0.46, 0.48, 0.58), mix(side, vec3(1.0, 0.8, 0.0), smoothstep(0.6, 1.0, hk)), smoothstep(0.06, 0.6, hk)) + ring * vec3(1.0, 0.82, 0.25);',
          '  float a = (0.34 + 0.62 * hk + 1.3 * ring) * rev * fog * (0.78 + 0.22 * sin(uT * 3.0 + aRnd * 40.0));',
          '  vCol = mix(col, vec3(1.0), uFlat); vA = mix(a, 0.1 * aMain, uFlat);',
          '  gl_PointSize = mix(clamp(2.9 * (1.0 + hk * 1.2 + ring * 1.4) * 16.0 / -mv.z, 1.0, 9.0), 3.3 * aMain, uFlat) * uPx;',
          '}'].join('\n'),
        fragmentShader: 'varying vec3 vCol; varying float vA; void main() { float r = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vCol, vA * (1.0 - smoothstep(0.32, 0.5, r))); }'
      });
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 400);
      scene.add(new THREE.Points(geo, mat));
      // bars: the projects' figures poking out of the landscape
      const COLS = ['#FFCC00', '#fb7185', '#818cf8', '#34d399', '#38bdf8', '#fb923c', '#a78bfa', '#2dd4bf'];
      const LABELS = ['ligue1 · 52% acc.', 'soc_dashboard · live', 'rlnc · MIT', 'uttt · alpha-beta', 'h160 · 3D'];
      const spikes = [], NS = small ? 16 : 30;
      for (let k = 0; k < NS; k++) {
        const x = Math.round((Math.random() * 2 - 1) * (small ? 10 : 18)) + ox, z = Math.round(-2 - Math.random() * 24) + oz;
        spikes.push({ x, z, len: 1.2 + Math.pow(Math.random(), 2) * 3.5, delay: Math.random() * 0.45, col: new THREE.Color(COLS[k % COLS.length]), label: k < LABELS.length ? LABELS[k] : null });
      }
      spikes.slice(0, LABELS.length).forEach((s, k) => { s.len = 3.6 + k * 0.35; s.x = [-11, 8, -3, 15, -18][k] + ox; s.z = [-9, -6, -17, -15, -20][k] + oz; s.delay = 0.05 * k; });
      const lp = new Float32Array(NS * 6), lc = new Float32Array(NS * 6), tp = new Float32Array(NS * 3), tc = new Float32Array(NS * 3);
      spikes.forEach((s, k) => { [0, 3].forEach((o) => { lc[k * 6 + o] = s.col.r; lc[k * 6 + o + 1] = s.col.g; lc[k * 6 + o + 2] = s.col.b; }); tc[k * 3] = s.col.r; tc[k * 3 + 1] = s.col.g; tc[k * 3 + 2] = s.col.b; });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
      const lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
      const tm = new THREE.PointsMaterial({ vertexColors: true, size: 7 * dpr, sizeAttenuation: false, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, map: (() => {
        const s = document.createElement('canvas'); s.width = s.height = 64; const x = s.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(s);
      })() });
      scene.add(new THREE.LineSegments(lg, lm), new THREE.Points(tg, tm));
      const TGT0 = new THREE.Vector3(0, 1, -6), v = new THREE.Vector3(), tgt = new THREE.Vector3(), up = new THREE.Vector3();
      function camAt(t) {
        const o = out3(cl(t / T.cam)), a = inOut(cl((t - T.cam) / T.camD)), yaw = lerp(-0.6, 0.1, o), dist = lerp(small ? 24 : 21, small ? 19 : 16, o), el = lerp(0.5, 0.6, o);
        v.set(TGT0.x + Math.sin(yaw) * dist * Math.cos(el), TGT0.y + dist * Math.sin(el), TGT0.z + Math.cos(yaw) * dist * Math.cos(el)).lerp(new THREE.Vector3(0, D, 0), a);
        tgt.copy(TGT0).lerp(new THREE.Vector3(0, 0, 0), a); up.set(0, 1 - a, -a).normalize();
        cam.position.copy(v); cam.up.copy(up); cam.lookAt(tgt); cam.updateMatrixWorld();
      }
      const proj = (x, y, z) => { const p = new THREE.Vector3(x, y, z).project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, on: p.z < 1 }; };
      let alive = true;
      return {
        el, proj, count: pos.length / 3,
        render(t) {
          if (!alive) return [];
          camAt(t);
          const rise = riseAt(t), R = rippleAt(t), flat = flatAt(t);
          U.uT.value = t; U.uRise.value = rise; U.uR.value = t > T.flat ? 200 : R; U.uFlat.value = flat;
          const tops = [], grow = (s) => out3(cl((t - T.spikes - s.delay) / 0.55)) * (1 - inOut(cl((t - T.flat + 0.2) / 0.4)));
          spikes.forEach((s, k) => {
            const d = Math.hypot(s.x, s.z + 4), rev = cl((R - d) / 7), base = terr(s.x, s.z, t) * rise * rev, top = base + s.len * grow(s) * rev;
            lp.set([s.x, base, s.z, s.x, top, s.z], k * 6); tp.set([s.x, top, s.z], k * 3);
            if (s.label) tops.push({ label: s.label, col: s.col.getStyle(), k: grow(s) * rev, p: proj(s.x, top, s.z) });
          });
          lg.attributes.position.needsUpdate = true; tg.attributes.position.needsUpdate = true;
          lm.opacity = tm.opacity = 1 - flat;
          renderer.render(scene, cam);
          return tops;
        },
        dispose() { if (!alive) return; alive = false; [geo, mat, lg, tg, lm, tm, tm.map].forEach((o) => o.dispose()); renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); el.remove(); }
      };
    })();
    if (!g3) root.classList.add('no-gl');
    const origin = g3 ? (g3.render(0), g3.proj(0, 0, -4)) : { x: W / 2, y: H * 0.62 };

    let raf = 0, finished = false, landed = false, lit = false, cleared = false;
    const T0 = performance.now(), NPTS = g3 ? g3.count.toLocaleString('en-US') : '';
    function frame(now) {
      if (finished) return;
      const t = (now - T0) / 1000; c.clearRect(0, 0, W, H);
      const tops = g3 && t < T.clear + 0.45 ? g3.render(t) : [];
      if (g3 && t >= T.clear + 0.45) g3.dispose();
      // 1 · a dot lights up where the landscape will unroll, and sends out the first ring
      const dotA = cl((t - T.dot) / 0.12) * (1 - cl((t - T.ripple - 0.45) / 0.3));
      if (dotA > 0) {
        c.fillStyle = 'rgba(255,204,0,' + dotA + ')'; c.beginPath(); c.arc(origin.x, origin.y, 3.2 + Math.sin(t * 18) * 0.6, 0, 7); c.fill();
        const rr = out3(cl((t - T.dot) / 0.7)); c.strokeStyle = 'rgba(255,204,0,' + (1 - rr) * dotA * 0.8 + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(origin.x, origin.y, 4 + rr * 70, 0, 7); c.stroke();
      }
      // 2 · HUD: prompt, point count, progress
      const hudA = cl((t - 0.2) / 0.25) * (1 - cl((t - T.flat - 0.1) / 0.3));
      if (hudA > 0) {
        const pct = Math.round(out3(cl((t - 0.15) / (T.flat - 0.1))) * 100), m = small ? 16 : 26;
        c.font = '500 ' + (small ? 9.5 : 11) + 'px ' + MONO; c.textBaseline = 'alphabetic';
        c.fillStyle = 'rgba(161,161,170,' + hudA + ')'; c.textAlign = 'left'; c.fillText('~/nils-demougeot % ./render --projects 19', m, m + 10);
        if (!small && NPTS) c.fillText('data points ' + NPTS + ' · webgl', m, H - m);
        c.textAlign = 'right'; c.fillStyle = 'rgba(244,244,245,' + hudA + ')'; c.fillText(String(pct).padStart(3, '0') + ' %', W - m, H - m);
        c.fillStyle = 'rgba(255,255,255,' + 0.12 * hudA + ')'; c.fillRect(W - m - 120, H - m + 8, 120, 1.5);
        c.fillStyle = 'rgba(255,204,0,' + hudA + ')'; c.fillRect(W - m - 120, H - m + 8, 120 * pct / 100, 1.5);
        c.textAlign = 'left';
      }
      // 3 · labels on the tallest bars
      const labA = cl((t - T.labels) / 0.3) * (1 - cl((t - T.flat + 0.2) / 0.25));
      if (labA > 0 && !small) tops.forEach((q) => {
        if (!q.p.on || q.k < 0.6) return;
        c.font = '600 10px ' + MONO; const w = c.measureText(q.label).width + 14;
        c.globalAlpha = labA * cl((q.k - 0.6) / 0.3);
        c.strokeStyle = q.col; c.lineWidth = 1; c.beginPath(); c.moveTo(q.p.x, q.p.y - 6); c.lineTo(q.p.x + 10, q.p.y - 16); c.stroke();
        c.fillStyle = 'rgba(12,13,18,.82)'; c.beginPath(); if (c.roundRect) c.roundRect(q.p.x + 10, q.p.y - 27, w, 20, 10); else c.rect(q.p.x + 10, q.p.y - 27, w, 20); c.fill();
        c.stroke(); c.fillStyle = '#f4f4f5'; c.fillText(q.label, q.p.x + 17, q.p.y - 13.5); c.globalAlpha = 1;
      });
      // 4 · the name decodes from the centre out, then each letter flies to the hero title (white → ink as the card lands)
      const veil = cl((t - T.name) / 0.4) * (1 - cl((t - T.fly) / 0.4));
      if (veil > 0) { const g = c.createRadialGradient(W / 2, nameY - fs * 0.3, 0, W / 2, nameY - fs * 0.3, Math.max(W * 0.42, fs * 5)); g.addColorStop(0, 'rgba(12,13,18,' + 0.7 * veil + ')'); g.addColorStop(1, 'rgba(12,13,18,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
      if (!lit) {
        const inkK = cl((t - T.land - 0.05) / 0.45);
        glyphs.forEach((g, n) => {
          if (t < g.s || !g.to) return;
          const settled = t > g.s + 0.3, f = t < T.fly ? 0 : ease(cl((t - T.fly - n * 0.018) / T.flyD));
          const ch = settled ? g.ch : POOL[(Math.floor(t * 22) + n * 7) % POOL.length], pop = settled ? 1 + 0.12 * (1 - cl((t - g.s - 0.3) / 0.16)) : 1;
          const tx = g.to.left + g.to.width / 2, ty = g.to.top + g.to.height * 0.5 + tfs * 0.36;
          const x = lerp(g.x, tx, f), y = lerp(g.y, ty, f) - Math.sin(f * Math.PI) * (small ? 20 : 44), size = lerp(fs, tfs, f) * pop;
          c.font = '800 ' + size + 'px ' + SANS; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
          if (!settled) c.fillStyle = 'rgba(255,204,0,.9)';
          else { const k = inkK; c.fillStyle = 'rgb(' + Math.round(lerp(244, 24, k)) + ',' + Math.round(lerp(244, 24, k)) + ',' + Math.round(lerp(245, 27, k)) + ')'; }
          if (settled && f === 0) { c.shadowColor = 'rgba(255,204,0,.35)'; c.shadowBlur = 26 * (1 - cl((t - g.s - 0.3) / 0.6)) + 6; }
          c.fillText(ch, x, y); c.shadowBlur = 0;
        });
        c.textAlign = 'left';
      }
      const subN = Math.floor(cl((t - T.sub) / 0.4) * SUB.length), subA = 1 - cl((t - T.fly) / 0.2);
      if (subN && subA > 0) {
        c.font = '500 ' + (small ? 11 : 13) + 'px ' + MONO; c.textAlign = 'center'; c.fillStyle = 'rgba(161,161,170,' + subA + ')';
        const s = SUB.slice(0, subN), cur = subN < SUB.length || t % 0.5 < 0.28 ? '▍' : ' ';
        c.fillText('> ' + s + cur, W / 2, subY); c.textAlign = 'left';
      }
      // 5 · the cards are drafted on the grid: each outline is traced, with guides and live sizes, then the card lands in it
      if (t >= T.frames) {
        cards.forEach((r, i) => {
          const p = out3(cl((t - T.frames - i * 0.06) / 0.5)), a = 1 - cl((t - T.land - 0.3 - i * 0.04) / 0.4); if (a <= 0 || p <= 0.02) return;
          const per = 2 * (r.w + r.h) - (8 - 2 * Math.PI) * r.r;
          if (p < 1) {
            c.strokeStyle = 'rgba(244,244,245,' + 0.13 * a * (1 - p) + ')'; c.lineWidth = 1; c.setLineDash([2, 4]); c.beginPath();
            c.moveTo(r.x, 0); c.lineTo(r.x, H); c.moveTo(0, r.y); c.lineTo(W, r.y); c.stroke(); c.setLineDash([]);
          }
          c.strokeStyle = 'rgba(244,244,245,' + 0.85 * a + ')'; c.lineWidth = 1; c.setLineDash([per * p, per]); c.beginPath();
          if (c.roundRect) c.roundRect(r.x, r.y, r.w, r.h, r.r); else c.rect(r.x, r.y, r.w, r.h); c.stroke(); c.setLineDash([]);
          c.fillStyle = 'rgba(255,204,0,' + a + ')'; c.fillRect(r.x - 2.5, r.y - 2.5, 5, 5);
          if (p > 0.98) { c.fillStyle = 'rgba(244,244,245,' + a + ')'; [[r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([x, y]) => c.fillRect(x - 2.5, y - 2.5, 5, 5)); }
          if (p < 1 && !small) { c.font = '500 9px ' + MONO; c.fillStyle = 'rgba(161,161,170,' + a * (1 - p) + ')'; c.fillText(Math.round(r.w * p) + '×' + Math.round(r.h * p), r.x + 4, r.y - 6); }
        });
      }
      if (!cleared && t >= T.clear) { cleared = true; root.classList.add('clear'); }
      if (!landed && t >= T.land) { landed = true; page.classList.add('hello-in'); onLand(); }
      if (!lit && t >= T.lit) { lit = true; title.classList.add('lit'); }
      if (t >= T.end) { cleanup(); return; }
      raf = requestAnimationFrame(frame);
    }
    function cleanup() { if (finished) return; finished = true; cancelAnimationFrame(raf); if (g3) g3.dispose(); root.remove(); html.classList.remove('intro-on'); onDone(); }
    function skip() {
      if (finished) return; finished = true; cancelAnimationFrame(raf);
      title.classList.add('lit'); page.classList.add('hello-in'); onLand(); root.classList.add('is-leaving');
      setTimeout(() => { if (g3) g3.dispose(); root.remove(); html.classList.remove('intro-on'); onDone(); }, 280);
    }
    const W0 = innerWidth;
    raf = requestAnimationFrame(frame);
    root.addEventListener('click', skip); root.addEventListener('wheel', skip, { passive: true }); root.addEventListener('touchstart', skip, { passive: true });
    addEventListener('keydown', function k() { removeEventListener('keydown', k); skip(); });
    addEventListener('resize', function r() { if (innerWidth === W0) return; removeEventListener('resize', r); skip(); });
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
