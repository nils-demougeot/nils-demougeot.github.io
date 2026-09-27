/* Live project demos (2D canvas). Each one is a small, faithful port of the real project's logic.
   Needs widgets.js first (PW.u helpers). */
(function () {
  const PW = window.PW; if (!PW || !PW.u) return;
  const { loop, ctx2d, clamp, lerp, ease } = PW.u;
  const MONO = '"JetBrains Mono", ui-monospace, monospace', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
  const K = { bg: '#10121a', card: '#13151d', card2: '#1c1f2b', line: '#262a38', line2: '#2a2f3d', line3: '#3f4457', tx: '#e4e4e7', tx3: '#d4d4d8', mute: '#a1a1aa', mute2: '#71717a', mute3: '#52525b', yellow: '#FFCC00', indigo: '#818cf8', amber: '#fbbf24', green: '#34d399', rose: '#fb7185', sky: '#38bdf8', violet: '#a78bfa', teal: '#2dd4bf', orange: '#fb923c', pink: '#f472b6' };
  const noop = () => {};

  // Draw in a fixed design space (W×H), letterboxed into whatever size the card gives.
  function view(canvas, W, H) {
    const s = ctx2d(canvas), v = { W, H, k: 1, ox: 0, oy: 0, s, c: s.c };
    v.begin = () => {
      const c = s.c, d = canvas.width / s.w || 1;
      c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, s.w, s.h);
      v.k = Math.min(s.w / W, s.h / H); v.ox = (s.w - W * v.k) / 2; v.oy = (s.h - H * v.k) / 2;
      c.setTransform(d * v.k, 0, 0, d * v.k, d * v.ox, d * v.oy);
      return c;
    };
    v.at = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left - v.ox) / v.k, (e.clientY - r.top - v.oy) / v.k]; };
    return v;
  }
  function listen(el, map) { Object.keys(map).forEach((k) => el.addEventListener(k, map[k])); return () => Object.keys(map).forEach((k) => el.removeEventListener(k, map[k])); }
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function txt(c, s, x, y, o) {
    o = o || {}; c.font = (o.w || 500) + ' ' + (o.px || 11) + 'px ' + (o.sans ? SANS : MONO);
    c.fillStyle = o.col || K.tx; c.textAlign = o.al || 'left'; c.textBaseline = o.bl || 'alphabetic'; c.fillText(s, x, y);
  }
  function panel(c, x, y, w, h) { rr(c, x, y, w, h, 12); c.fillStyle = K.card; c.fill(); c.lineWidth = 1; c.strokeStyle = K.line; c.stroke(); }
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const paused = (cv) => !!cv.__pwPaused;

  // Load a data script once (works from file:// too, unlike fetch).
  const loading = {};
  PW.need = function (src, ready) {
    if (ready()) return Promise.resolve();
    if (!loading[src]) loading[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = () => res(); s.onerror = () => { delete loading[src]; rej(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
    return loading[src];
  };

  /* ───────── Ligue 1 predictor: the model's inputs → P(home / draw / away), plus the notebook's real scores ───────── */
  PW.predictor = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300);
    const F = [
      { label: 'Budget gap (home − away)', min: -500, max: 500, val: 180, fmt: (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x)) + ' M€', z: (x) => x / 200, mid: true },
      { label: 'Home stadium seats', min: 10, max: 80, val: 42, fmt: (x) => Math.round(x) + 'k', z: (x) => (x - 30) / 15 },
      { label: 'Home form · pts, last 5', min: 0, max: 15, val: 10, step: 1, fmt: (x) => Math.round(x) + ' / 15', z: (x) => (x - 7) / 3.5 },
      { label: 'Away form · pts, last 5', min: 0, max: 15, val: 6, step: 1, fmt: (x) => Math.round(x) + ' / 15', z: (x) => (x - 7) / 3.5 }
    ];
    F.forEach((f) => { f.tv = f.val; });
    // Illustrative multinomial-logistic weights on standardized inputs [bias, gap, seats, home form, away form].
    // The draw logit barely moves, so a draw is never the top pick: the trained model also had a draw recall of 0.01.
    const WT = { H: [0.35, 0.85, 0.18, 0.12, -0.1], D: [0.05, 0, 0, 0, 0], A: [-0.1, -0.75, -0.12, -0.08, 0.14] };
    const MODELS = [['Baseline · always home win', 44.0, K.mute3], ['Logistic Regression', 51.88, K.yellow], ['Random Forest', 51.72, K.yellow], ['Gradient Boosting', 50.08, K.yellow], ['V3 · Random Forest, 11 features', 52.05, K.green], ['Top 3 features only (RFE)', 51.88, K.green]];
    const RANK = ['diff_market_value', 'diff_internationals', 'stadium_seats_home', 'home_goals_5', 'diff_conceded_5', 'away_form_5', 'away_goals_5', 'diff_indiscipline', 'home_form_5', 'h2h_points_last_5', 'diff_rest_days'];
    const shown = { H: 1 / 3, D: 1 / 3, A: 1 / 3 };
    let mode = 'predict', t = 0, t0 = 0, dragI = -1;
    const SX0 = 24, SX1 = 244, SY = (i) => 66 + i * 56;

    function probs() {
      const z = [1].concat(F.map((f) => f.z(f.val))), l = {}; let m = -1e9, s = 0;
      for (const k in WT) { l[k] = WT[k].reduce((a, w, i) => a + w * z[i], 0); m = Math.max(m, l[k]); }
      for (const k in l) { l[k] = Math.exp(l[k] - m); s += l[k]; }
      for (const k in l) l[k] /= s;
      return l;
    }
    function drawPredict(c) {
      txt(c, 'MATCH SETUP', SX0, 32, { col: K.mute, px: 10, w: 700 });
      F.forEach((f, i) => {
        const y = SY(i), u = (f.val - f.min) / (f.max - f.min), ty = y + 16, x1 = lerp(SX0, SX1, u), x0 = f.mid ? lerp(SX0, SX1, 0.5) : SX0;
        txt(c, f.label, SX0, y, { col: K.tx3, px: 10.5 }); txt(c, f.fmt(f.val), SX1, y, { col: K.yellow, px: 10.5, w: 700, al: 'right' });
        rr(c, SX0, ty - 3, SX1 - SX0, 6, 3); c.fillStyle = K.line; c.fill();
        rr(c, Math.min(x0, x1), ty - 3, Math.max(1, Math.abs(x1 - x0)), 6, 3); c.fillStyle = K.yellow; c.fill();
        if (f.mid) { c.fillStyle = K.mute3; c.fillRect(x0 - 0.5, ty - 7, 1, 14); }
        c.beginPath(); c.arc(x1, ty, dragI === i ? 8 : 7, 0, 7); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = K.yellow; c.stroke();
      });
      const P = probs(); let best = 'H'; ['D', 'A'].forEach((k) => { if (P[k] > P[best]) best = k; });
      for (const k in shown) shown[k] = lerp(shown[k], P[k], 0.18);
      const RX = 292, RW = 222; panel(c, RX - 14, 14, 250, 272);
      txt(c, 'MODEL OUTPUT', RX, 38, { col: K.mute, px: 10, w: 700 });
      [['H', 'Home win', K.yellow], ['D', 'Draw', K.mute], ['A', 'Away win', K.indigo]].forEach(([k, name, col], i) => {
        const y = 72 + i * 48, on = k === best;
        txt(c, name, RX, y, { col: on ? '#fff' : K.tx3, px: 11, w: on ? 700 : 500 });
        txt(c, Math.round(shown[k] * 100) + '%', RX + RW, y, { al: 'right', px: 11, w: 700, col: on ? col : K.mute });
        rr(c, RX, y + 8, RW, 12, 4); c.fillStyle = K.line; c.fill();
        rr(c, RX, y + 8, Math.max(4, RW * shown[k]), 12, 4); c.fillStyle = col; c.globalAlpha = on ? 1 : 0.45; c.fill(); c.globalAlpha = 1;
      });
      txt(c, 'PREDICTION', RX, 226, { col: K.mute, px: 10, w: 700 });
      txt(c, { H: 'Home win', D: 'Draw', A: 'Away win' }[best], RX, 252, { sans: true, px: 22, w: 800, col: best === 'H' ? K.yellow : K.indigo });
      txt(c, 'demo weights · same inputs as the notebook', RX, 274, { px: 9, col: K.mute2 });
    }
    function drawModels(c) {
      const g = ease(clamp((t - t0) / 0.8, 0, 1)), a0 = 40, a1 = 54, BX = 24, BW = 214;
      txt(c, 'TEST ACCURACY · 2023–24 SEASONS', BX, 32, { col: K.mute, px: 10, w: 700 });
      [44, 48, 52].forEach((a) => { const x = BX + BW * (a - a0) / (a1 - a0); c.fillStyle = K.line; c.fillRect(x, 44, 1, 238); txt(c, a + '%', x, 292, { px: 9, col: K.mute2, al: 'center' }); });
      MODELS.forEach(([name, acc, col], i) => {
        const y = 60 + i * 37, w = BW * (acc - a0) / (a1 - a0) * g;
        txt(c, name, BX, y, { px: 10, col: i ? K.tx3 : K.mute });
        rr(c, BX, y + 6, Math.max(2, w), 13, 3); c.fillStyle = col; c.fill();
        txt(c, (acc * g + a0 * (1 - g)).toFixed(i ? 2 : 0) + '%', BX + w + 7, y + 17, { px: 10, w: 700, col: i ? '#fff' : K.mute });
      });
      const RX = 310; panel(c, RX - 14, 14, 244, 272);
      txt(c, 'FEATURE RANKING · RANDOM FOREST', RX, 38, { col: K.mute, px: 9.5, w: 700 });
      RANK.forEach((f, i) => {
        const y = 62 + i * 20.5, on = i < 3, a = clamp((t - t0) * 6 - i * 0.4, 0, 1);
        c.globalAlpha = a;
        txt(c, String(i + 1).padStart(2, '0'), RX, y, { px: 10, col: on ? K.green : K.mute3, w: 700 });
        txt(c, f, RX + 24, y, { px: 10, col: on ? '#fff' : K.mute });
        if (on) { rr(c, RX + 170, y - 10, 38, 14, 4); c.fillStyle = 'rgba(52,211,153,.15)'; c.fill(); txt(c, 'kept', RX + 189, y, { px: 9, col: K.green, al: 'center', w: 700 }); }
        c.globalAlpha = 1;
      });
    }
    function setVal(i, x) { const f = F[i], u = clamp((x - SX0) / (SX1 - SX0), 0, 1); let val = lerp(f.min, f.max, u); if (f.step) val = Math.round(val); f.val = f.tv = val; }
    const off = listen(canvas, {
      pointerdown: (e) => {
        if (mode !== 'predict') return; const [x, y] = v.at(e);
        F.forEach((f, i) => { if (Math.abs(y - (SY(i) + 16)) < 14 && x > SX0 - 12 && x < SX1 + 12) dragI = i; });
        if (dragI >= 0) { canvas.setPointerCapture(e.pointerId); setVal(dragI, x); }
      },
      pointermove: (e) => {
        const [x, y] = v.at(e);
        if (dragI >= 0) setVal(dragI, x);
        else canvas.style.cursor = mode === 'predict' && F.some((f, i) => Math.abs(y - (SY(i) + 16)) < 14 && x > SX0 - 12 && x < SX1 + 12) ? 'pointer' : 'default';
      },
      pointerup: () => { dragI = -1; }, pointercancel: () => { dragI = -1; }
    });
    const stop = loop(canvas, (dt) => {
      t += dt; F.forEach((f) => { if (dragI < 0) f.val = lerp(f.val, f.tv, Math.min(1, dt * 8)); });
      const c = v.begin(); if (mode === 'predict') drawPredict(c); else drawModels(c);
    });
    return {
      random() { if (mode !== 'predict') this.mode(); F.forEach((f) => { f.tv = f.step ? Math.round(lerp(f.min, f.max, Math.random())) : lerp(f.min, f.max, Math.pow(Math.random(), f.mid ? 1 : 1.3)); }); if (Math.random() < 0.5) F[0].tv = -F[0].tv * 0.6; },
      mode() {
        mode = mode === 'predict' ? 'models' : 'predict'; t0 = t;
        out('mode', mode === 'predict' ? 'Model scores' : 'Try a match');
        out('note', mode === 'predict' ? 'drag the sliders' : 'real results from the notebook');
      },
      destroy() { stop(); off(); v.s.off(); }
    };
  };

  /* ───────── Cyber internship: a simulated SOC console · EDR + proxy telemetry → NG-SIEM → hourly exfiltration search ───────── */
  PW.siem = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300);
    const USERS = ['user_014', 'user_027', 'user_033', 'user_041', 'user_058', 'user_062'];
    const HOSTS = ['LAPTOP-3QK1', 'LAPTOP-7F2K', 'PC-LYO-221', 'LAPTOP-9ZD4', 'PC-LIL-073', 'PC-BDX-118'];
    const SITES = [['Paris', 2.35, 48.86], ['Lille', 3.06, 50.63], ['Rennes', -1.68, 48.11], ['Nantes', -1.55, 47.22], ['Bordeaux', -0.58, 44.84], ['Toulouse', 1.44, 43.6], ['Marseille', 5.37, 43.3], ['Nice', 7.26, 43.7], ['Lyon', 4.84, 45.76], ['Strasbourg', 7.75, 48.58]];
    const HOME = [0, 8, 3, 6, 1, 4];
    const FR = [[-4.8, 48.4], [-3.0, 48.85], [-1.6, 48.7], [-1.3, 49.7], [0.2, 49.7], [1.6, 50.2], [2.5, 51.1], [4.2, 50.0], [5.9, 49.5], [8.2, 49.0], [7.6, 47.6], [6.9, 47.4], [6.0, 46.3], [7.0, 45.9], [6.7, 45.1], [7.0, 44.2], [7.6, 43.8], [6.2, 43.1], [4.6, 43.4], [3.1, 43.1], [3.0, 42.5], [1.7, 42.5], [-1.8, 43.4], [-1.2, 44.6], [-1.1, 46.2], [-2.2, 47.1], [-4.4, 47.9]];
    const NORMAL = [['EDR', 'process', ['excel.exe', 'outlook.exe', 'teams.exe', 'chrome.exe']], ['EDR', 'USB', ['report.pdf', 'notes.docx', 'kpi.xlsx']], ['PRX', 'upload', ['sharepoint', 'outlook', 'intranet']], ['EDR', 'file read', ['srv-files/RH', 'srv-files/Ops']]];
    const HOUR = 8, THR = 500; // 8 demo seconds = 1 hour of logs; alert when a user moves > 500 MB out in an hour
    const mx = (lon) => 222 + (lon + 5) * 10.2, my = (lat) => 70 + (51.3 - lat) * 14.2, HUB = [290, 212];
    let t = 0, evs = [], feed = [], next = 0, burst = null, runIn = HOUR, incident = null, flows = [], totals = USERS.map(() => 0), epm = 1240, buckets = new Array(40).fill(0), bT = 0, runs = 0;
    const clock = (tt) => { const m = 9 * 60 + Math.floor(tt * 7.5); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    function add(u, src, kind, detail, mb, hot) {
      const e = { t, u, src, kind, detail, mb, hot, site: HOME[u] }; if (mb) evs.push(e); feed.unshift(e); if (feed.length > 14) feed.pop();
      buckets[buckets.length - 1] += mb || 0; flows.push({ site: e.site, t0: t, hot, src });
    }
    function normalEvent() {
      const u = Math.floor(Math.random() * USERS.length), [src, kind, opts] = pick(NORMAL), d = pick(opts);
      const mb = kind === 'USB' || kind === 'upload' ? 1 + Math.pow(Math.random(), 2) * 26 : 0;
      add(u, src, kind, d, mb, false);
    }
    function runSearch() {
      runs++;
      const hits = USERS.map((_, u) => [u, totals[u]]).filter(([, mb]) => mb > THR).sort((a, b) => b[1] - a[1]);
      if (hits.length) {
        const u = hits[0][0], mine = evs.filter((e) => e.u === u && e.hot);
        incident = { u, mb: hits[0][1], files: 180 + Math.floor(Math.random() * 90), usb: mine.some((e) => e.kind === 'USB'), cloud: mine.some((e) => e.kind === 'upload'), t0: t, at: clock(t) };
        out('note', '⚠ incident opened · SOC team notified');
      } else if (incident && t - incident.t0 > HOUR * 1.5) incident = null;
    }
    for (let i = 0; i < 12; i++) { t = i * 0.25; normalEvent(); }
    function tile(c, x, label, value, sub, col) {
      rr(c, x, 8, 126, 38, 8); c.fillStyle = K.card; c.fill(); c.strokeStyle = col === K.rose ? K.rose : K.line2; c.lineWidth = 1; c.stroke();
      txt(c, label, x + 9, 20, { px: 7.5, w: 700, col: K.mute2 });
      txt(c, value, x + 9, 38, { sans: true, px: 14, w: 800, col: col || '#fff' });
      if (sub) txt(c, sub, x + 118, 38, { px: 8, col: K.mute, al: 'right' });
    }
    function draw(c) {
      const alert = incident && t - incident.t0 < HOUR * 1.5, pulse = 0.6 + 0.4 * Math.sin(t * 7);
      // KPIs
      tile(c, 8, 'EVENTS / MIN', fmt(epm), 'NG-SIEM');
      tile(c, 140, 'ENDPOINTS · FALCON EDR', '3,412', 'online');
      tile(c, 272, 'WEB UPLOADS · NETSKOPE', fmt(evs.filter((e) => e.src === 'PRX').length * 37 + 180), '/ hour');
      tile(c, 404, 'OPEN ALERTS', alert ? '1 · HIGH' : '0', alert ? '' : 'all clear', alert ? K.rose : K.green);
      // telemetry feed
      txt(c, 'LIVE TELEMETRY', 8, 62, { px: 8.5, w: 700, col: K.mute });
      txt(c, 'simulated', 196, 62, { px: 7.5, col: K.mute3, al: 'right' });
      c.save(); c.beginPath(); c.rect(6, 66, 194, 230); c.clip();
      feed.forEach((e, i) => {
        const y = 80 + i * 16.5 + Math.max(0, 1 - (t - e.t) * 6) * -8; c.globalAlpha = (i === 0 ? clamp((t - e.t) * 6, 0, 1) : 1) * (1 - i * 0.045);
        rr(c, 8, y - 8.5, 26, 11, 3); c.fillStyle = e.src === 'EDR' ? 'rgba(251,113,133,.18)' : 'rgba(56,189,248,.18)'; c.fill();
        txt(c, e.src === 'EDR' ? 'EDR' : 'PRX', 21, y, { px: 7, w: 700, col: e.src === 'EDR' ? K.rose : K.sky, al: 'center' });
        txt(c, USERS[e.u].slice(5), 39, y, { px: 8.5, w: 700, col: e.hot ? K.rose : K.tx3 });
        txt(c, e.kind + (e.mb ? ' ' + e.mb.toFixed(0) + ' MB' : ''), 62, y, { px: 8.5, col: e.hot ? '#fff' : K.mute });
        txt(c, e.detail.length > 12 ? e.detail.slice(0, 11) + '…' : e.detail, 196, y, { px: 8, col: e.hot ? K.rose : K.mute2, al: 'right' });
      });
      c.restore(); c.globalAlpha = 1;
      // map: every site streams its logs to the SIEM
      txt(c, 'SITES → NG-SIEM', 212, 62, { px: 8.5, w: 700, col: K.mute });
      c.beginPath(); FR.forEach(([lo, la], i) => (i ? c.lineTo(mx(lo), my(la)) : c.moveTo(mx(lo), my(la)))); c.closePath();
      c.fillStyle = K.card2; c.fill(); c.strokeStyle = K.line3; c.lineWidth = 1; c.stroke();
      SITES.forEach(([, lo, la]) => { c.strokeStyle = 'rgba(63,68,87,.55)'; c.beginPath(); c.moveTo(mx(lo), my(la)); c.lineTo(HUB[0], HUB[1]); c.stroke(); });
      flows = flows.filter((f) => t - f.t0 < 1.1);
      flows.forEach((f) => { const [, lo, la] = SITES[f.site], k = ease((t - f.t0) / 1.1), x = lerp(mx(lo), HUB[0], k), y = lerp(my(la), HUB[1], k); c.beginPath(); c.arc(x, y, f.hot ? 2.6 : 1.8, 0, 7); c.fillStyle = f.hot ? K.rose : f.src === 'EDR' ? K.amber : K.sky; c.fill(); });
      SITES.forEach(([, lo, la], i) => { const hot = alert && HOME[incident.u] === i; c.beginPath(); c.arc(mx(lo), my(la), hot ? 3.5 + pulse * 2 : 2.4, 0, 7); c.fillStyle = hot ? K.rose : K.tx3; c.fill(); });
      rr(c, HUB[0] - 30, HUB[1] - 9, 60, 18, 5); c.fillStyle = alert ? 'rgba(251,113,133,.25)' : 'rgba(129,140,248,.2)'; c.fill(); c.strokeStyle = alert ? K.rose : K.indigo; c.stroke();
      txt(c, 'NG-SIEM', HUB[0], HUB[1] + 3.5, { px: 8.5, w: 700, col: alert ? K.rose : K.indigo, al: 'center' });
      // risk per user + volume timeline
      const RX = 384, RW = 148; txt(c, 'DATA OUT · LAST HOUR', RX, 62, { px: 8.5, w: 700, col: K.mute });
      const sc = RW / Math.max(THR * 1.4, ...totals);
      USERS.forEach((u, i) => {
        const y = 70 + i * 15, hot = totals[i] > THR;
        txt(c, u.slice(5), RX, y + 8, { px: 8, col: hot ? K.rose : K.mute });
        rr(c, RX + 22, y + 2, RW - 22, 7, 3); c.fillStyle = K.line; c.fill();
        rr(c, RX + 22, y + 2, Math.max(2, Math.min(RW - 22, totals[i] * sc)), 7, 3); c.fillStyle = hot ? K.rose : K.sky; c.fill();
      });
      const tx = RX + 22 + THR * sc; c.setLineDash([2, 3]); c.strokeStyle = K.amber; c.beginPath(); c.moveTo(tx, 68); c.lineTo(tx, 160); c.stroke(); c.setLineDash([]);
      txt(c, '500 MB', tx, 168, { px: 7.5, col: K.amber, al: 'center' });
      txt(c, 'VOLUME · MB / 7 MIN', RX, 184, { px: 8.5, w: 700, col: K.mute });
      const bmax = Math.max(60, ...buckets), bw = RW / buckets.length;
      c.beginPath(); c.moveTo(RX, 222); buckets.forEach((b, i) => c.lineTo(RX + i * bw, 222 - (b / bmax) * 30)); c.lineTo(RX + RW, 222); c.closePath();
      c.fillStyle = alert ? 'rgba(251,113,133,.25)' : 'rgba(56,189,248,.18)'; c.fill();
      c.beginPath(); buckets.forEach((b, i) => { const x = RX + i * bw, y = 222 - (b / bmax) * 30; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = alert ? K.rose : K.sky; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = K.line; c.fillRect(RX, 222, RW, 1);
      // scheduled search status / incident card
      if (alert) {
        const a = clamp((t - incident.t0) * 4, 0, 1), y0 = 230 + (1 - a) * 20; c.globalAlpha = a;
        rr(c, 206, y0, 326, 64, 9); c.fillStyle = 'rgba(28,14,20,.96)'; c.fill(); c.strokeStyle = K.rose; c.lineWidth = 1.2; c.stroke();
        rr(c, 216, y0 + 8, 40, 13, 4); c.fillStyle = K.rose; c.fill(); txt(c, 'HIGH', 236, y0 + 17.5, { px: 8, w: 800, col: '#0c0d12', al: 'center' });
        txt(c, 'Possible mass exfiltration', 262, y0 + 18, { sans: true, px: 11.5, w: 800, col: '#fff' });
        txt(c, incident.at, 514, y0 + 18, { px: 8, col: K.mute, al: 'right' });
        txt(c, USERS[incident.u] + ' · ' + HOSTS[incident.u] + ' · ' + SITES[HOME[incident.u]][0], 216, y0 + 34, { px: 8.5, col: K.tx3 });
        txt(c, (incident.mb / 1000).toFixed(1) + ' GB · ' + incident.files + ' files → ' + [incident.usb ? 'USB drive (E:)' : '', incident.cloud ? 'personal cloud' : ''].filter(Boolean).join(' + '), 216, y0 + 46, { px: 8.5, w: 700, col: K.rose });
        txt(c, 'MITRE ATT&CK ' + [incident.usb ? 'T1052' : '', incident.cloud ? 'T1567' : ''].filter(Boolean).join(' · ') + ' · exfiltration · SOC team notified', 216, y0 + 58, { px: 7.5, col: K.mute });
        c.globalAlpha = 1;
      } else {
        rr(c, 206, 250, 172, 38, 8); c.fillStyle = K.card; c.fill(); c.strokeStyle = K.line; c.stroke();
        txt(c, 'HOURLY SCHEDULED SEARCH', 216, 264, { px: 7.5, w: 700, col: K.mute });
        txt(c, 'next run in ' + Math.ceil(runIn) + ' s · ' + runs + ' run' + (runs === 1 ? '' : 's') + ', 0 hit', 216, 279, { px: 8.5, col: K.green });
      }
    }
    const stop = loop(canvas, (dt) => {
      t += dt; next -= dt;
      if (next <= 0) { next = 0.22 + Math.random() * 0.35; normalEvent(); }
      if (burst) {
        burst.next -= dt;
        if (burst.next <= 0) {
          burst.next = 0.18; burst.left--;
          const usb = burst.left % 3 !== 0;
          add(burst.u, usb ? 'EDR' : 'PRX', usb ? 'USB' : 'upload', usb ? pick(['clients.xlsx', 'contrats.zip', 'paie.csv', 'plans.pdf']) : pick(['gdrive', 'wetransfer', 'dropbox']), 60 + Math.random() * 110, true);
          if (!burst.left) burst = null;
        }
      }
      evs = evs.filter((e) => t - e.t < HOUR);
      const tgt = USERS.map(() => 0); evs.forEach((e) => { tgt[e.u] += e.mb; });
      totals = totals.map((x, i) => lerp(x, tgt[i], Math.min(1, dt * 6)));
      epm = lerp(epm, 1180 + Math.random() * 140 + (burst ? 420 : 0), Math.min(1, dt * 3));
      bT += dt; if (bT > 0.2) { bT = 0; buckets.shift(); buckets.push(0); }
      runIn -= dt; if (runIn <= 0) { runIn = HOUR; runSearch(); }
      draw(v.begin());
    });
    return {
      exfil() { if (burst) return; const u = Math.floor(Math.random() * USERS.length); burst = { u, left: 14, next: 0 }; runIn = Math.min(runIn, 4.5); out('note', USERS[u] + ' is copying files out…'); },
      destroy() { stop(); v.s.off(); }
    };
  };

  /* ───────── Ultimate Tic-Tac-Toe: alpha-beta engine, reworked from ultimate_tictactoe.py ─────────
     Same ideas as the Python file (iterative deepening, transposition table, killer + history ordering, line-based
     evaluation), with its bugs fixed: TT bounds use the original alpha/beta, no aspiration-window loop, the root
     always returns a move, Zobrist hashing + make/unmake instead of copying the board at every node. */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const CELL = [], SB = new Int8Array(81), POS = new Int8Array(81); // CELL[s][k]: board index · SB[i]: small board · POS[i]: place inside it
  for (let s = 0; s < 9; s++) { CELL.push([]); for (let k = 0; k < 9; k++) { const i = ((s / 3 | 0) * 3 + (k / 3 | 0)) * 9 + (s % 3) * 3 + (k % 3); CELL[s].push(i); SB[i] = s; POS[i] = k; } }
  const r32 = () => (Math.random() * 4294967296) | 0, zt = (n) => Array.from({ length: n }, r32);
  const ZK = [null, zt(81), zt(81)], ZC = [null, zt(81), zt(81)], ZNK = zt(10), ZNC = zt(10), ZSK = r32(), ZSC = r32();
  const UWIN = 100000, UINF = 1e9, BW = [1.2, 1, 1.2, 1, 1.5, 1, 1.2, 1, 1.2];
  class UBoard { // cells: 0 empty, 1 X, 2 O · small boards w: 0 open, 1/2 won, 3 full with no winner
    constructor() { this.b = new Int8Array(81); this.w = new Int8Array(9); this.next = -1; this.turn = 1; this.k = ZNK[0]; this.c = ZNC[0]; this.hist = []; }
    legal() {
      const m = [], add = (s) => { const C = CELL[s]; for (let q = 0; q < 9; q++) if (!this.b[C[q]]) m.push(C[q]); };
      if (this.next >= 0) add(this.next); else for (let s = 0; s < 9; s++) if (!this.w[s]) add(s);
      return m;
    }
    lineWin(s, p) { const C = CELL[s], b = this.b; for (const L of LINES) if (b[C[L[0]]] === p && b[C[L[1]]] === p && b[C[L[2]]] === p) return true; return false; }
    full(s) { const C = CELL[s]; for (let q = 0; q < 9; q++) if (!this.b[C[q]]) return false; return true; }
    play(i) {
      const p = this.turn, s = SB[i];
      this.hist.push(i, this.next, this.w[s]);
      this.b[i] = p; this.k ^= ZK[p][i]; this.c ^= ZC[p][i];
      if (this.lineWin(s, p)) this.w[s] = p; else if (this.full(s)) this.w[s] = 3;
      this.k ^= ZNK[this.next + 1]; this.c ^= ZNC[this.next + 1];
      const n = POS[i]; this.next = this.w[n] ? -1 : n; // sent to a finished board → free move
      this.k ^= ZNK[this.next + 1] ^ ZSK; this.c ^= ZNC[this.next + 1] ^ ZSC; this.turn = 3 - p;
    }
    undo() {
      const ws = this.hist.pop(), prev = this.hist.pop(), i = this.hist.pop(), p = this.b[i];
      this.k ^= ZNK[this.next + 1] ^ ZSK; this.c ^= ZNC[this.next + 1] ^ ZSC;
      this.next = prev; this.k ^= ZNK[prev + 1]; this.c ^= ZNC[prev + 1];
      this.w[SB[i]] = ws; this.b[i] = 0; this.k ^= ZK[p][i]; this.c ^= ZC[p][i]; this.turn = p;
    }
    winner() { // 0 ongoing · 1/2 winner · 3 draw
      const w = this.w; for (const L of LINES) { const a = w[L[0]]; if ((a === 1 || a === 2) && a === w[L[1]] && a === w[L[2]]) return a; }
      for (let s = 0; s < 9; s++) if (!w[s]) return 0; return 3;
    }
  }
  function uEval(bd) { // from X's point of view
    const b = bd.b, w = bd.w; let s = 0;
    for (let sb = 0; sb < 9; sb++) {
      const o = w[sb];
      if (o === 1) s += 100 * BW[sb]; else if (o === 2) s -= 100 * BW[sb];
      else if (o === 0) {
        const C = CELL[sb]; let loc = 0;
        for (const L of LINES) {
          let x = 0, y = 0; for (let q = 0; q < 3; q++) { const v = b[C[L[q]]]; if (v === 1) x++; else if (v === 2) y++; }
          if (!y) loc += x === 2 ? 10 : x; else if (!x) loc -= y === 2 ? 10 : y;
        }
        s += loc * BW[sb];
      }
    }
    for (const L of LINES) { // big-board lines: dead as soon as both sides (or a drawn board) sit on them
      let x = 0, y = 0, d = 0; for (let q = 0; q < 3; q++) { const v = w[L[q]]; if (v === 1) x++; else if (v === 2) y++; else if (v === 3) d++; }
      if (d || (x && y)) continue;
      s += x === 2 ? 350 : x === 1 ? 30 : 0; s -= y === 2 ? 350 : y === 1 ? 30 : 0;
    }
    return s;
  }
  class UAI {
    constructor(ms) { this.ms = ms; this.tt = new Map(); this.stats = null; }
    move(bd) {
      const legal = bd.legal(); this.nodes = 0;
      if (legal.length <= 1) { this.stats = { depth: 0, nodes: 0, score: 0, ms: 0, tt: this.tt.size }; return legal.length ? legal[0] : null; }
      if (this.tt.size > 1500000) this.tt.clear();
      this.t0 = performance.now(); this.stop = false; this.killers = []; this.hh = new Int32Array(162);
      let best = legal[0], score = 0, reached = 0;
      for (let d = 1; d <= 40; d++) { // iterative deepening: keep the best move of the last completed depth
        let alpha = -UINF, bm = best;
        for (const m of [best].concat(legal.filter((x) => x !== best))) {
          bd.play(m); const v = -this.search(bd, d - 1, -UINF, -alpha, 1); bd.undo();
          if (this.stop) break; if (v > alpha) { alpha = v; bm = m; }
        }
        if (this.stop) break;
        best = bm; score = alpha; reached = d;
        if (Math.abs(score) > UWIN - 100) break; // forced win / loss found
      }
      this.stats = { depth: reached, nodes: this.nodes, score, ms: performance.now() - this.t0, tt: this.tt.size };
      return best;
    }
    search(bd, depth, alpha, beta, ply) {
      if ((++this.nodes & 2047) === 0 && performance.now() - this.t0 > this.ms) this.stop = true;
      if (this.stop) return 0;
      const wn = bd.winner(); if (wn === 3) return 0; if (wn) return -(UWIN - ply); // the previous player just won
      if (depth <= 0) return (bd.turn === 1 ? 1 : -1) * uEval(bd) + (bd.next < 0 ? 25 : 0);
      const e = this.tt.get(bd.k); let ttm = -1;
      if (e && e.c === bd.c) { ttm = e.m; if (e.d >= depth && (e.f === 0 || (e.f === 1 && e.v >= beta) || (e.f === 2 && e.v <= alpha))) return e.v; }
      const moves = bd.legal(), p = bd.turn, n = moves.length, sc = new Float64Array(n), kl = this.killers[ply];
      for (let j = 0; j < n; j++) { // ordering: TT move, killers, board-winning moves, history; free moves for the opponent last
        const m = moves[j]; let s = this.hh[(p - 1) * 81 + m];
        if (m === ttm) s += 1e8; else if (kl && (m === kl[0] || m === kl[1])) s += 1e6;
        bd.b[m] = p; if (bd.lineWin(SB[m], p)) s += 5e5; bd.b[m] = 0;
        if (bd.w[POS[m]] && POS[m] !== SB[m]) s -= 2e5;
        sc[j] = s;
      }
      let best = -UINF, bm = -1; const a0 = alpha;
      for (let j = 0; j < n; j++) {
        let bi = j; for (let q = j + 1; q < n; q++) if (sc[q] > sc[bi]) bi = q;
        const m = moves[bi]; moves[bi] = moves[j]; moves[j] = m; sc[bi] = sc[j];
        bd.play(m); const v = -this.search(bd, depth - 1, -beta, -alpha, ply + 1); bd.undo();
        if (this.stop) return 0;
        if (v > best) { best = v; bm = m; }
        if (v > alpha) alpha = v;
        if (alpha >= beta) { if (!kl || kl[0] !== m) this.killers[ply] = [m, kl ? kl[0] : -1]; this.hh[(p - 1) * 81 + m] += depth * depth; break; }
      }
      this.tt.set(bd.k, { c: bd.c, d: depth, v: best, f: best <= a0 ? 2 : best >= beta ? 1 : 0, m: bm }); // bounds vs the ORIGINAL window
      return best;
    }
  }
  PW.uttt = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), BX = 14, BY = 14, BS = 272, CS = BS / 9;
    const SYM = ['', 'X', 'O'], COL = ['', K.yellow, K.violet];
    let bd, ai = {}, over = 0, last = -1, thinking = false, auto = false, hover = -1, stats = null, t = 0, endT = 0, timer = 0;
    function reset(preset) {
      bd = new UBoard(); ai = { 1: new UAI(450), 2: new UAI(450) }; over = 0; last = -1; thinking = false; stats = null; clearTimeout(timer);
      if (preset) [40, 30, 10, 50, 70, 39].forEach((m) => { bd.play(m); last = m; });
      if (auto) schedule(700);
    }
    function aiPlay() {
      if (over) return; if (paused(canvas)) { schedule(300); return; }
      const who = bd.turn, m = ai[who].move(bd);
      thinking = false; if (m == null) return;
      bd.play(m); last = m; stats = Object.assign({ who }, ai[who].stats); over = bd.winner();
      if (over) { endT = t; if (auto) schedule(2600, true); else out('note', over === 1 ? 'you beat the AI!' : over === 3 ? 'draw' : 'the AI wins'); return; }
      if (auto) schedule(650);
    }
    function schedule(ms, restart) { clearTimeout(timer); timer = setTimeout(() => { if (restart) { reset(false); return; } thinking = true; setTimeout(aiPlay, 40); }, ms); }
    function cellAt(e) { const [x, y] = v.at(e), c = Math.floor((x - BX) / CS), r = Math.floor((y - BY) / CS); return c >= 0 && c < 9 && r >= 0 && r < 9 ? r * 9 + c : -1; }
    const humanTurn = () => !auto && !over && !thinking && bd.turn === 1;
    const off = listen(canvas, {
      pointermove: (e) => { const i = cellAt(e); hover = humanTurn() && bd.legal().includes(i) ? i : -1; canvas.style.cursor = hover >= 0 ? 'pointer' : 'default'; },
      pointerleave: () => { hover = -1; },
      click: (e) => {
        const i = cellAt(e); if (!humanTurn() || !bd.legal().includes(i)) return;
        bd.play(i); last = i; hover = -1; over = bd.winner();
        if (over) { endT = t; out('note', over === 1 ? 'you beat the AI!' : over === 3 ? 'draw' : 'the AI wins'); return; }
        thinking = true; setTimeout(aiPlay, 40);
      }
    });
    function sym(c, p, x, y, r, col, lw) {
      c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
      if (p === 1) { c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke(); }
      else { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
    }
    function draw(c) {
      rr(c, BX - 6, BY - 6, BS + 12, BS + 12, 10); c.fillStyle = K.card; c.fill();
      const legal = over || thinking ? [] : bd.legal(), allowed = new Set(legal.map((i) => SB[i])), tc = bd.turn === 1 ? '255,204,0' : '167,139,250';
      for (let s = 0; s < 9; s++) {
        const x = BX + (s % 3) * CS * 3, y = BY + (s / 3 | 0) * CS * 3;
        if (allowed.has(s)) { rr(c, x + 2, y + 2, CS * 3 - 4, CS * 3 - 4, 6); c.fillStyle = 'rgba(' + tc + ',.07)'; c.fill(); c.strokeStyle = 'rgba(' + tc + ',.45)'; c.lineWidth = 1; c.stroke(); }
      }
      c.strokeStyle = K.line2; c.lineWidth = 1;
      for (let k = 1; k < 9; k++) { if (k % 3 === 0) continue; c.beginPath(); c.moveTo(BX + k * CS, BY + 3); c.lineTo(BX + k * CS, BY + BS - 3); c.moveTo(BX + 3, BY + k * CS); c.lineTo(BX + BS - 3, BY + k * CS); c.stroke(); }
      c.strokeStyle = K.mute2; c.lineWidth = 2;
      [3, 6].forEach((k) => { c.beginPath(); c.moveTo(BX + k * CS, BY); c.lineTo(BX + k * CS, BY + BS); c.moveTo(BX, BY + k * CS); c.lineTo(BX + BS, BY + k * CS); c.stroke(); });
      for (let i = 0; i < 81; i++) {
        const p = bd.b[i], x = BX + (i % 9 + 0.5) * CS, y = BY + ((i / 9 | 0) + 0.5) * CS;
        if (p) { c.globalAlpha = bd.w[SB[i]] ? 0.25 : 1; sym(c, p, x, y, CS * 0.26, COL[p], 2.2); c.globalAlpha = 1; }
        if (i === last) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.setLineDash([2, 2]); c.strokeRect(x - CS / 2 + 3, y - CS / 2 + 3, CS - 6, CS - 6); c.setLineDash([]); }
        if (i === hover) { c.globalAlpha = 0.4; sym(c, 1, x, y, CS * 0.26, K.yellow, 2.2); c.globalAlpha = 1; }
      }
      for (let s = 0; s < 9; s++) {
        const cx = BX + ((s % 3) + 0.5) * CS * 3, cy = BY + ((s / 3 | 0) + 0.5) * CS * 3;
        if (bd.w[s] === 1 || bd.w[s] === 2) sym(c, bd.w[s], cx, cy, CS * 1.05, COL[bd.w[s]], 5);
        else if (bd.w[s] === 3) { c.fillStyle = 'rgba(12,13,18,.55)'; c.fillRect(cx - CS * 1.5 + 3, cy - CS * 1.5 + 3, CS * 3 - 6, CS * 3 - 6); }
      }
      // side panel
      const RX = 306; panel(c, RX, 14, 222, 272);
      txt(c, auto ? 'AI VS AI' : 'YOU (X) VS AI (O)', RX + 14, 38, { px: 10, w: 700, col: K.mute });
      let status = thinking ? 'AI is thinking…' : bd.turn === 1 && !auto ? 'Your move' : SYM[bd.turn] + ' to play', col = thinking ? K.violet : K.yellow;
      if (over) { status = over === 3 ? 'Draw' : auto ? SYM[over] + ' wins' : over === 1 ? 'You win!' : 'The AI wins'; col = over === 2 ? K.violet : over === 1 ? K.yellow : K.tx; }
      txt(c, status, RX + 14, 64, { sans: true, px: 19, w: 800, col });
      txt(c, over ? 'press New game to play again' : bd.next < 0 ? 'play in any open board' : 'play in the highlighted board', RX + 14, 82, { px: 9.5, col: K.mute2 });
      c.fillStyle = K.line; c.fillRect(RX + 14, 96, 194, 1);
      txt(c, 'LAST AI SEARCH', RX + 14, 116, { px: 9.5, w: 700, col: K.mute });
      const ev = stats ? (Math.abs(stats.score) > UWIN - 100 ? (stats.score > 0 ? 'forced win' : 'forced loss') : (stats.score > 0 ? '+' : '') + fmt(stats.score)) : '–';
      const rows = stats ? [['search depth', stats.depth + ' plies'], ['positions', fmt(stats.nodes)], ['evaluation', ev], ['time', fmt(stats.ms) + ' ms'], ['cache (TT)', fmt(stats.tt) + ' entries']] : [['search depth', '–'], ['positions', '–'], ['evaluation', '–'], ['time', '–'], ['cache (TT)', '–']];
      rows.forEach(([k, val], i) => { const y = 138 + i * 21; txt(c, k, RX + 14, y, { px: 10.5, col: K.mute }); txt(c, val, RX + 208, y, { px: 10.5, w: 700, col: '#fff', al: 'right' }); });
      txt(c, 'alpha-beta · iterative deepening', RX + 14, 258, { px: 9, col: K.mute2 });
      txt(c, 'Zobrist cache · killer/history', RX + 14, 272, { px: 9, col: K.mute2 });
      if (over && !auto) { const a = clamp((t - endT) * 3, 0, 1); c.globalAlpha = a * 0.9; rr(c, BX + BS / 2 - 70, BY + BS / 2 - 18, 140, 36, 18); c.fillStyle = over === 2 ? K.violet : K.yellow; c.fill(); c.globalAlpha = a; txt(c, over === 3 ? 'DRAW' : over === 1 ? 'YOU WIN' : 'AI WINS', BX + BS / 2, BY + BS / 2 + 5, { al: 'center', w: 800, px: 14, col: '#0c0d12', sans: true }); c.globalAlpha = 1; }
    }
    reset(true);
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return {
      new() { reset(false); out('note', auto ? 'two AIs, 0.45 s per move' : 'you are X · click a cell'); },
      watch() { auto = !auto; out('mode', auto ? 'Stop AI vs AI' : 'Watch AI vs AI'); reset(false); out('note', auto ? 'two AIs, 0.45 s per move' : 'you are X · click a cell'); },
      live(on) { if (!on) clearTimeout(timer); else if (auto && !over) schedule(500); },
      destroy() { clearTimeout(timer); stop(); off(); v.s.off(); }
    };
  };

  /* ───────── La Fabrique: a simplified, click-through demo of the real app (scan → patterns → feasibility → passport) ─────────
     Styled after the real Django app; data taken from it (patterns, surfaces, accepted fabrics, tote-bag pieces,
     water / CO₂ / grammage factors from views.py). A DOM mini-app, scaled to fit the card like the canvas demos. */
  const LF_URL = 'https://la-fabrique.onrender.com/';
  const LF_EAU = { denim: 15000, coton: 15000, viscose: 5000 }, LF_CO2 = { denim: 5.5, coton: 5.5, viscose: 5.0 }, LF_GSM = { jean: 380, tshirt: 170, robe: 130 };
  const LF_GARMENTS = [ // one face in cm; the app scans every face, so usable surface = 2 faces − defects
    { name: 'Old faded jeans', short: 'Jeans', icon: 'pants', type: 'jean', mat: 'denim', fab: 'jean', matLabel: 'Denim 98 %', color: '#6f8fc4', ink: '#3b5b94', q: 4,
      poly: [[5, 0], [53, 0], [55, 20], [57, 100], [35, 100], [30.5, 38], [27.5, 38], [23, 100], [1, 100], [3, 20]], defects: [[44, 72, 3.2]] },
    { name: 'Worn white T-shirt', short: 'T-shirt', icon: 'shirt', type: 'tshirt', mat: 'coton', fab: 'coton', matLabel: 'Cotton 100 %', color: '#efece3', ink: '#c9c3b3', q: 3,
      poly: [[22, 0], [33, 0], [40, 5], [47, 0], [58, 0], [80, 15], [72, 28], [65, 22], [65, 74], [15, 74], [15, 22], [8, 28], [0, 15]], defects: [[33, 52, 2.6]] },
    { name: 'Summer floral dress', short: 'Dress', icon: 'dress', type: 'robe', mat: 'viscose', fab: 'viscose', matLabel: 'Viscose 100 %', color: '#eea3b3', ink: '#c9677e', q: 5,
      poly: [[18, 0], [27, 0], [33, 6], [39, 0], [48, 0], [48, 24], [64, 100], [2, 100], [18, 24]], defects: [] }
  ];
  const LF_PATTERNS = [ // from the app's seed data
    { t: 'Tote bag XXL', kind: 'Bag', min: 0.5, mats: ['coton', 'lin', 'jean', 'toile'], time: '2h', glyph: 'bag', pieces: [['Front panel', 20, 24], ['Back panel', 20, 24], ['Handle', 4, 28], ['Handle', 4, 28], ['Pocket', 12, 12]] },
    { t: 'Zipped pouch', kind: 'Pouch', min: 0.15, mats: [], time: '1h', glyph: 'pouch', pieces: [['Front', 22, 16], ['Back', 22, 16], ['Zip tab', 5, 8]] },
    { t: 'Reversible cushion cover', kind: 'Cushion', min: 0.3, mats: [], time: '45 min', glyph: 'cushion', pieces: [['Front', 36, 36], ['Back flap', 36, 24], ['Back flap', 36, 24]] },
    { t: 'Kitchen apron', kind: 'Apron', min: 0.6, mats: ['coton', 'lin', 'toile', 'jean'], time: '2h', glyph: 'apron', pieces: [['Bib', 26, 24], ['Skirt', 44, 34], ['Strap', 4, 50], ['Strap', 4, 50]] },
    { t: 'Urban backpack', kind: 'Bag', min: 1.0, mats: ['jean', 'toile'], time: '6h', glyph: 'backpack', pieces: [] },
    { t: 'Headband & scent sachet', kind: 'Accessory', min: 0.05, mats: [], time: '30 min', glyph: 'band', pieces: [['Headband', 50, 10], ['Sachet', 12, 12], ['Sachet', 12, 12]] }
  ];
  const LF_GLYPH = {
    bag: '<path d="M7 9h10l1 11H6z"/><path d="M9.5 9V7a2.5 2.5 0 0 1 5 0v2"/>', pouch: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M4 11h16M16 11v2"/>',
    cushion: '<path d="M5 6q7 2 14 0q-2 6 0 12q-7-2-14 0q2-6 0-12z"/>', apron: '<path d="M8 4h8v5l3 11H5l3-11z"/><path d="M8 4 6 2M16 4l2-2"/>',
    backpack: '<rect x="6" y="6" width="12" height="15" rx="4"/><path d="M9 6V4h6v2M9 14h6"/>', band: '<ellipse cx="12" cy="12" rx="8" ry="5"/><ellipse cx="12" cy="12" rx="5" ry="2.5"/>'
  };
  const shoelace = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += P[j][0] * P[i][1] - P[i][0] * P[j][1]; return Math.abs(a) / 2; };
  function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
  const lfSurface = (g) => (2 * shoelace(g.poly) - g.defects.reduce((s, d) => s + Math.PI * d[2] * d[2], 0)) / 10000; // m²
  PW.fabric = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const host = canvas.parentElement, W = 600, H = 318;
    canvas.style.display = 'none';
    const root = document.createElement('div'); root.className = 'lfd'; host.appendChild(root);
    const fit = () => { const r = host.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H) || 1; root.style.transform = 'translate(' + (r.width - W * k) / 2 + 'px,' + (r.height - H * k) / 2 + 'px) scale(' + k + ')'; };
    const ro = new ResizeObserver(fit); ro.observe(host);
    let step = 0, g = null, pat = null, placed = [];
    const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const icon = (n) => '<img src="assets/img/fabrique/' + n + '.svg" alt="">';
    const glyph = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">' + LF_GLYPH[n] + '</svg>';
    const doable = (p) => (g ? (lfSurface(g) < p.min ? 'needs ' + String(p.min).replace('.', ',') + ' m²' : p.mats.length && !p.mats.includes(g.fab) ? 'not for ' + g.mat : '') : '');
    const fmtM2 = (x) => x.toFixed(2).replace('.', ',') + ' m²';
    function garmentSvg(gg, cls, extra) {
      const xs = gg.poly.map((p) => p[0]), ys = gg.poly.map((p) => p[1]), w = Math.max(...xs), h = Math.max(...ys);
      return '<svg class="' + cls + '" viewBox="-4 -4 ' + (w + 8) + ' ' + (h + 8) + '"><defs><pattern id="lfTex' + gg.type + '" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="' + gg.color + '"/><rect width="1" height="3" fill="' + gg.ink + '" opacity=".35"/></pattern></defs>' +
        '<polygon points="' + gg.poly.map((p) => p.join(',')).join(' ') + '" fill="url(#lfTex' + gg.type + ')" stroke="' + gg.ink + '" stroke-width=".6"/>' + (extra || '') + '</svg>';
    }
    const bar = () => '<div class="lfd-top"><span class="lfd-logo">La Fabri<b>q</b>ue</span><span class="lfd-demo">Demo</span>' +
      '<div class="lfd-steps">' + ['Scan', 'Patterns', 'Fit', 'Passport'].map((s, i) => '<span class="' + (i === step ? 'on' : i < step ? 'done' : '') + '">' + (i + 1) + ' ' + s + '</span>').join('') + '</div>' +
      '<a class="lfd-real" href="' + LF_URL + '" target="_blank" rel="noopener">Real app ↗</a></div>';
    function screenScan() {
      const s = g ? lfSurface(g) : 0;
      const outline = g ? '<polygon class="lfd-cut" points="' + g.poly.map((p) => p.join(',')).join(' ') + '" pathLength="1"/>' + g.defects.map((d) => '<circle class="lfd-defect" cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"/>').join('') + '<rect class="lfd-scanline" x="-4" width="80" height="2"/>' : '';
      return '<div class="lfd-body lfd-scan"><div class="lfd-col"><span class="lfd-eyebrow">NEW GARMENT</span><h3>Put your old clothes<br>under the X-ray</h3><p>Pick an example to scan. The app cuts out the garment, measures each face and spots the defects.</p>' +
        '<div class="lfd-pick">' + LF_GARMENTS.map((x, i) => '<button type="button" data-g="' + i + '" class="' + (g === x ? 'on' : '') + '">' + icon(x.icon) + '<b>' + x.short + '</b><small>' + x.mat + '</small></button>').join('') + '</div></div>' +
        '<div class="lfd-photo">' + (g ? garmentSvg(g, 'lfd-gsvg', outline) +
          '<div class="lfd-res"><div><small>Material</small><b>' + g.matLabel + '</b></div><div><small>Usable surface · 2 faces</small><b class="g">' + fmtM2(s) + '</b></div><div><small>Quality</small><b>' + '★'.repeat(g.q) + '<i>' + '★'.repeat(5 - g.q) + '</i></b></div><div><small>Defects</small><b>' + (g.defects.length ? g.defects.length + ' ' + (g.type === 'tshirt' ? 'hole' : 'stain') : 'none') + '</b></div>' +
          '<p class="lfd-formula">surface = ½ |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)| on the cut-out outline (shoelace), minus defects</p>' +
          '<button type="button" class="lfd-cta" data-go="1">See matching patterns →</button></div>'
          : '<div class="lfd-empty"><span>' + icon('shirt') + '</span>Choose a garment to scan</div>') + '</div></div>';
    }
    function screenPatterns() {
      const s = lfSurface(g), ok = LF_PATTERNS.filter((p) => !doable(p)).length;
      return '<div class="lfd-body lfd-pats"><div class="lfd-violet"><div><b>' + ok + ' / ' + LF_PATTERNS.length + '</b> doable with your ' + fmtM2(s) + ' of ' + g.short.toLowerCase() + '</div><button type="button" data-go="0">← change garment</button></div>' +
        '<div class="lfd-grid">' + LF_PATTERNS.map((p, i) => { const why = doable(p); return '<button type="button" class="lfd-pat' + (why ? ' no' : '') + '" data-p="' + i + '"' + (why ? ' disabled' : '') + '><span class="lfd-glyph">' + glyph(p.glyph) + '</span><b>' + p.t + '</b><small>' + String(p.min).replace('.', ',') + ' m² min · ' + p.time + '</small><em>' + (why ? why : 'Doable ✓') + '</em></button>'; }).join('') + '</div></div>';
    }
    // feasibility: pieces on the front face, in cm; a piece is red if it leaves the fabric, overlaps another or covers a defect
    const gb = () => { const xs = g.poly.map((p) => p[0]); return { w: Math.max(...xs), h: Math.max(...g.poly.map((p) => p[1])) }; };
    function valid(p, list) {
      for (let y = p.y; y <= p.y + p.h + 0.01; y += Math.min(2, p.h)) for (let x = p.x; x <= p.x + p.w + 0.01; x += Math.min(2, p.w)) if (!inPoly(Math.min(x, p.x + p.w - 0.05), Math.min(y, p.y + p.h - 0.05), g.poly)) return 'overflows';
      for (const q of list) if (q !== p && q.on && p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y) return 'overlaps';
      for (const [dx, dy, r] of g.defects) { const cx = clamp(dx, p.x, p.x + p.w), cy = clamp(dy, p.y, p.y + p.h); if (Math.hypot(dx - cx, dy - cy) < r) return 'covers a defect'; }
      return '';
    }
    function resetPieces() {
      const { w } = gb(); let y = 0;
      placed = pat.pieces.map(([n, pw, ph]) => { const p = { n, w: pw, h: ph, x: w + 8, y, on: false }; y += ph + 3; return p; });
      const scale = Math.min(1, (gb().h + 4) / Math.max(1, y)); if (scale < 1) { y = 0; placed.forEach((p) => { p.y = y; y += p.h * scale + 2; }); }
    }
    function autoPlace() {
      placed.forEach((p) => { p.on = false; });
      const { w, h } = gb();
      [...placed].sort((a, b) => b.w * b.h - a.w * a.h).forEach((p) => {
        for (let y = 0; y <= h; y += 1) for (let x = 0; x <= w; x += 1) for (const rot of [false, true]) {
          if (p.on) return; const c = { ...p, x, y, w: rot ? p.h : p.w, h: rot ? p.w : p.h, on: true };
          if (!valid(c, placed)) { Object.assign(p, c); return; }
        }
      });
      paintFeas();
    }
    function screenFeas() {
      const { w, h } = gb(), railW = Math.max(...pat.pieces.map((q) => Math.max(q[1], q[2]))) + 10;
      return '<div class="lfd-body lfd-feas"><div class="lfd-board"><svg class="lfd-fsvg" viewBox="-4 -4 ' + (w + railW + 12) + ' ' + (h + 8) + '">' +
        '<polygon points="' + g.poly.map((p) => p.join(',')).join(' ') + '" fill="' + g.color + '" opacity=".92" stroke="' + g.ink + '" stroke-width=".6"/>' +
        g.defects.map((d) => '<circle class="lfd-defect" cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"/>').join('') +
        '<text x="' + (w + 8) + '" y="-0.8" class="lfd-rail">pieces to place</text><g class="lfd-pieces"></g></svg></div>' +
        '<div class="lfd-side"><span class="lfd-eyebrow">FEASIBILITY · FRONT FACE</span><h3>' + pat.t + '</h3><p>Drag the pieces onto the fabric (double-click rotates). A piece turns <b class="r">red</b> if it leaves the fabric, overlaps another piece or covers a defect.</p>' +
        '<div class="lfd-count"></div><div class="lfd-btns"><button type="button" class="lfd-ghost" data-auto>Auto-place</button><button type="button" class="lfd-cta" data-go="3" disabled>Validate → passport</button></div></div></div>';
    }
    function paintFeas() {
      const gEl = root.querySelector('.lfd-pieces'); if (!gEl) return;
      let okN = 0;
      gEl.innerHTML = placed.map((p, i) => { const bad = p.on ? valid(p, placed) : ''; if (p.on && !bad) okN++; return '<g data-i="' + i + '" class="lfd-pc ' + (!p.on ? 'idle' : bad ? 'bad' : 'ok') + '"><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx=".8"/><text x="' + (p.x + p.w / 2) + '" y="' + (p.y + p.h / 2 + 1.1) + '">' + (p.w > 9 && p.h > 5 ? esc(p.n) : '') + '</text></g>'; }).join('');
      const all = okN === placed.length;
      root.querySelector('.lfd-count').innerHTML = '<b>' + okN + ' / ' + placed.length + '</b> pieces placed correctly' + (all ? ' <i>✓ feasible</i>' : '');
      root.querySelector('[data-go="3"]').disabled = !all;
    }
    function screenPass() {
      const kg = pat.min * LF_GSM[g.type] / 1000, water = Math.round(kg * LF_EAU[g.mat]), co2 = kg * LF_CO2[g.mat];
      const qr = Array.from({ length: 81 }, (_, i) => ((i * 7919) % 13 < 6 || [0, 8, 72].includes(i)) ? '<i></i>' : '<span></span>').join('');
      return '<div class="lfd-body lfd-pass"><div class="lfd-ticket"><div class="lfd-tk-top"><span>CIRCULAR PASSPORT</span><span>N° TX-2026-0453</span></div>' +
        '<h3>' + pat.t + '</h3><p>made from <b>' + g.name.toLowerCase() + '</b> · ' + g.matLabel + '</p>' +
        '<div class="lfd-impact"><div><small>Water saved</small><b>' + fmt(water) + ' L</b></div><div><small>CO₂ avoided</small><b>' + co2.toFixed(1).replace('.', ',') + ' kg</b></div><div><small>Reward</small><b>+20 coins</b></div></div>' +
        '<p class="lfd-formula">fabric mass = ' + String(pat.min).replace('.', ',') + ' m² × ' + LF_GSM[g.type] + ' g/m² · then × ' + fmt(LF_EAU[g.mat]) + ' L/kg and × ' + LF_CO2[g.mat] + ' kg CO₂/kg (' + g.mat + ', factors from the app)</p></div>' +
        '<div class="lfd-side"><div class="lfd-qr">' + qr + '</div><p>Scanning the QR code opens this item\'s public passport: where the fabric came from and what it became.</p><button type="button" class="lfd-cta" data-go="0">Scan another garment ↺</button><a class="lfd-real big" href="' + LF_URL + '" target="_blank" rel="noopener">Try the real app ↗</a><small class="lfd-wake">free hosting: may take ~30 s to wake up</small></div></div>';
    }
    function render() {
      root.innerHTML = bar() + [screenScan, screenPatterns, screenFeas, screenPass][step]();
      if (step === 2) paintFeas();
      out('note', ['simplified demo · pick a garment', 'patterns filtered by surface and fabric', 'drag the pieces onto the fabric', 'impact computed with the app\'s own factors'][step]);
    }
    let drag = null;
    const svgPt = (e) => { const svg = root.querySelector('.lfd-fsvg'), m = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(m); };
    const onDown = (e) => {
      const pc = e.target.closest('.lfd-pc'); if (!pc) return;
      const p = placed[+pc.getAttribute('data-i')], q = svgPt(e); drag = { p, dx: q.x - p.x, dy: q.y - p.y, moved: false };
      root.setPointerCapture && root.setPointerCapture(e.pointerId); e.preventDefault();
    };
    const onMove = (e) => { if (!drag) return; const q = svgPt(e); drag.p.x = q.x - drag.dx; drag.p.y = q.y - drag.dy; drag.moved = true; drag.p.on = drag.p.x < gb().w + 2; paintFeas(); };
    const onUp = () => { if (!drag) return; drag.p.x = Math.round(drag.p.x); drag.p.y = Math.round(drag.p.y); drag = null; paintFeas(); };
    const onDbl = (e) => { const pc = e.target.closest('.lfd-pc'); if (!pc) return; const p = placed[+pc.getAttribute('data-i')]; [p.w, p.h] = [p.h, p.w]; paintFeas(); };
    const onClick = (e) => {
      const b = e.target.closest('[data-g],[data-go],[data-p],[data-auto]'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-g')) { g = LF_GARMENTS[+b.getAttribute('data-g')]; render(); return; }
      if (b.hasAttribute('data-auto')) { autoPlace(); return; }
      if (b.hasAttribute('data-p')) { pat = LF_PATTERNS[+b.getAttribute('data-p')]; resetPieces(); step = 2; render(); return; }
      const to = +b.getAttribute('data-go'); if (to === 0) { g = null; pat = null; } step = to; render();
    };
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove); root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
    root.addEventListener('dblclick', onDbl); root.addEventListener('click', onClick);
    g = LF_GARMENTS[0]; render(); // the preview shows a scanned example
    return {
      restart() { step = 0; g = null; pat = null; render(); },
      destroy() { ro.disconnect(); root.remove(); canvas.style.display = ''; }
    };
  };

  /* ───────── Liv'in Paris: shortest trips on the real metro graph (Dijkstra / Bellman-Ford / Floyd-Warshall) ───────── */
  const LINE_COL = { '1': '#FFCD00', '2': '#3f73d6', '3': '#9a8f1a', '3bis': '#6EC4E8', '4': '#CF009E', '5': '#FF7E2E', '6': '#6ECA97', '7': '#FA9ABA', '7bis': '#6ECA97', '8': '#E19BDF', '9': '#B6BD00', '10': '#C9910D', '11': '#9a6b3a', '12': '#1a9a6a', '13': '#6EC4E8', '14': '#8a4fd0' };
  PW.metro = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), ALGOS = ['Dijkstra', 'Bellman-Ford', 'Floyd-Warshall'];
    let S = null, adj, edges, byName, names, fw = null, algo = 0, from = null, pickFrom = true, hover = -1, anim = null, t = 0, failed = false;
    function build() {
      const M = window.METRO; S = M.s.map(([line, name, lon, lat], i) => ({ i, line, name, lon, lat }));
      const lon0 = Math.min(...S.map((s) => s.lon)), lon1 = Math.max(...S.map((s) => s.lon)), lat0 = Math.min(...S.map((s) => s.lat)), lat1 = Math.max(...S.map((s) => s.lat));
      const kx = Math.cos(48.86 * Math.PI / 180), sc = Math.min(508 / ((lon1 - lon0) * kx), 262 / (lat1 - lat0)), w = (lon1 - lon0) * kx * sc, h = (lat1 - lat0) * sc;
      S.forEach((s) => { s.x = 270 - w / 2 + (s.lon - lon0) * kx * sc; s.y = 150 - h / 2 + (lat1 - s.lat) * sc; });
      adj = S.map(() => []); edges = []; byName = {};
      const link = (a, b, m, tr) => { adj[a].push([b, m, tr]); edges.push([a, b, m, tr]); };
      M.a.forEach(([a, b, m, one]) => { link(a, b, m, 0); if (!one) link(b, a, m, 0); });
      S.forEach((s) => { (byName[s.name] = byName[s.name] || []).push(s.i); });
      Object.values(byName).forEach((ids) => ids.forEach((a) => ids.forEach((b) => { if (a !== b) link(a, b, 3, 1); }))); // 3 min to change line, as in Graphe.cs
      names = Object.keys(byName);
      run('Charles de Gaulle - Etoile', 'Nation');
    }
    PW.need('assets/data/metro.js', () => window.METRO).then(build, () => { failed = true; });
    const walk = (prev, end) => { const p = []; for (let u = end; u >= 0; u = prev[u]) p.unshift(u); return p; };
    function dijkstra(A, B) {
      const n = S.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n), order = [], T = new Set(byName[B]);
      let ops = 0, end = -1; byName[A].forEach((i) => { dist[i] = 0; });
      for (;;) {
        let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break; done[u] = 1; order.push(u); if (T.has(u)) { end = u; break; }
        for (const [w, m] of adj[u]) { ops++; if (dist[u] + m < dist[w]) { dist[w] = dist[u] + m; prev[w] = u; } }
      }
      return { path: walk(prev, end), min: dist[end], order, ops, unit: 'edge checks' };
    }
    function bellman(A, B) {
      const n = S.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1); let ops = 0;
      byName[A].forEach((i) => { dist[i] = 0; });
      for (let k = 1; k < n; k++) { let ch = false; for (const [a, b, m] of edges) { ops++; if (dist[a] + m < dist[b]) { dist[b] = dist[a] + m; prev[b] = a; ch = true; } } if (!ch) break; }
      let end = -1; byName[B].forEach((i) => { if (end < 0 || dist[i] < dist[end]) end = i; });
      return { path: walk(prev, end), min: dist[end], order: [], ops, unit: 'relaxations' };
    }
    function floyd(A, B) {
      const n = S.length;
      if (!fw) {
        const d = new Float32Array(n * n).fill(Infinity), nx = new Int32Array(n * n).fill(-1);
        for (let i = 0; i < n; i++) { d[i * n + i] = 0; nx[i * n + i] = i; }
        edges.forEach(([a, b, m]) => { if (m < d[a * n + b]) { d[a * n + b] = m; nx[a * n + b] = b; } });
        for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) { const ik = d[i * n + k]; if (ik === Infinity) continue; for (let j = 0; j < n; j++) { const v2 = ik + d[k * n + j]; if (v2 < d[i * n + j]) { d[i * n + j] = v2; nx[i * n + j] = nx[i * n + k]; } } }
        fw = { d, nx };
      }
      let a0 = -1, b0 = -1; byName[A].forEach((a) => byName[B].forEach((b) => { if (a0 < 0 || fw.d[a * n + b] < fw.d[a0 * n + b0]) { a0 = a; b0 = b; } }));
      const path = [a0]; for (let u = a0; u !== b0 && u >= 0;) { u = fw.nx[u * n + b0]; path.push(u); }
      return { path, min: fw.d[a0 * n + b0], order: [], ops: n * n * n, unit: 'loop steps (n³)' };
    }
    function run(A, B) {
      const r = [dijkstra, bellman, floyd][algo](A, B); let stops = 0, changes = 0;
      if (r.path.length < 2 || !isFinite(r.min)) { anim = null; out('note', 'no route found'); return; }
      for (let k = 1; k < r.path.length; k++) { if (S[r.path[k]].name === S[r.path[k - 1]].name) changes++; else stops++; }
      anim = Object.assign(r, { A, B, t0: t, stops, changes, dur: r.order.length ? 1.1 : 0 });
      out('note', A.replace(' - ', ' ') + ' → ' + B + ' · ' + r.min + ' min · ' + stops + ' stops · ' + changes + ' change' + (changes === 1 ? '' : 's'));
    }
    function near(e) { if (!S) return -1; const [x, y] = v.at(e); let b = -1, bd = e.pointerType === 'touch' ? Math.max(12, 22 / v.k) : 12; S.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; b = s.i; } }); return b; }
    const off = listen(canvas, {
      pointermove: (e) => { hover = near(e); canvas.style.cursor = hover >= 0 ? 'pointer' : 'default'; },
      pointerleave: () => { hover = -1; },
      click: (e) => {
        const n = near(e); if (n < 0) return;
        if (pickFrom) { from = S[n].name; pickFrom = false; anim = null; out('note', 'from ' + from + ': now pick a destination'); }
        else if (S[n].name !== from) { pickFrom = true; run(from, S[n].name); }
      }
    });
    function label(c, s, text, col) {
      c.font = '700 9.5px ' + MONO; const w = c.measureText(text).width + 10, right = s.x > 400, x = right ? s.x - 8 - w : s.x + 8;
      rr(c, x, s.y - 8, w, 16, 4); c.fillStyle = 'rgba(12,13,18,.9)'; c.fill(); c.strokeStyle = col; c.lineWidth = 1; c.stroke();
      txt(c, text, x + 5, s.y + 3.5, { px: 9.5, w: 700, col });
    }
    function draw(c) {
      if (!S) { txt(c, failed ? 'could not load the metro graph' : 'loading the metro graph…', 270, 150, { al: 'center', col: K.mute }); return; }
      const el = anim ? t - anim.t0 : 0, nv = anim ? (anim.dur ? Math.floor(anim.order.length * Math.min(1, el / anim.dur)) : 0) : 0;
      const pp = anim ? Math.max(0, (el - anim.dur) / 0.7) * (anim.path.length - 1) : 0, seen = new Set(anim ? anim.order.slice(0, nv) : []);
      c.lineCap = 'round';
      edges.forEach(([a, b, , tr]) => { if (tr || a > b && adj[b].some((q) => q[0] === a)) return; c.strokeStyle = LINE_COL[S[a].line] || K.line3; c.globalAlpha = anim ? 0.28 : 0.5; c.lineWidth = 2; c.beginPath(); c.moveTo(S[a].x, S[a].y); c.lineTo(S[b].x, S[b].y); c.stroke(); });
      c.globalAlpha = 1;
      S.forEach((s) => { c.beginPath(); c.arc(s.x, s.y, seen.has(s.i) ? 2 : 1.4, 0, 7); c.fillStyle = seen.has(s.i) ? '#fff' : K.line3; c.fill(); });
      const onPath = [];
      if (anim) {
        c.shadowBlur = 10;
        for (let k = 0; k < anim.path.length - 1; k++) {
          const f = clamp(pp - k, 0, 1); if (f <= 0) break;
          const a = S[anim.path[k]], b = S[anim.path[k + 1]], col = a.name === b.name ? '#fff' : LINE_COL[b.line] || K.amber;
          c.strokeStyle = col; c.shadowColor = col; c.lineWidth = 4; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(lerp(a.x, b.x, f), lerp(a.y, b.y, f)); c.stroke();
          onPath.push(a); if (f >= 1) onPath.push(b);
        }
        c.shadowBlur = 0;
        onPath.forEach((s) => { c.beginPath(); c.arc(s.x, s.y, 2.6, 0, 7); c.fillStyle = '#fff'; c.fill(); });
      }
      const ends = anim ? [[anim.path[0], K.green, anim.A], [anim.path[anim.path.length - 1], K.rose, anim.B]] : from ? [[byName[from][0], K.green, from]] : [];
      ends.forEach(([i, col]) => { const s = S[i]; if (!s) return; c.beginPath(); c.arc(s.x, s.y, 5, 0, 7); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = K.bg; c.stroke(); });
      if (anim && pp >= anim.path.length - 1) {
        ends.forEach(([i, col, name]) => label(c, S[i], name, col));
        for (let k = 1; k < anim.path.length; k++) { const a = S[anim.path[k - 1]], b = S[anim.path[k]]; if (a.name === b.name && k > 1 && k < anim.path.length - 1) label(c, b, 'change → ' + b.line, K.tx3); }
      } else if (!anim && from) label(c, S[byName[from][0]], from, K.green);
      if (hover >= 0) label(c, S[hover], S[hover].name + ' · ' + (byName[S[hover].name] || []).map((i) => S[i].line).join('/'), K.tx);
      // stats box
      rr(c, 10, 10, 178, anim ? 58 : 28, 8); c.fillStyle = 'rgba(12,13,18,.88)'; c.fill(); c.strokeStyle = K.line2; c.stroke();
      txt(c, ALGOS[algo].toUpperCase() + ' · ' + names.length + ' STATIONS', 20, 28, { px: 9, w: 700, col: K.amber });
      if (anim) {
        txt(c, anim.min + ' min', 20, 50, { px: 16, w: 800, sans: true, col: '#fff' });
        txt(c, fmt(anim.ops) + ' ' + anim.unit, 20, 62, { px: 8.5, col: K.mute });
      }
    }
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return {
      random() { if (!S) return; let a = pick(names), b; do { b = pick(names); } while (b === a); pickFrom = true; run(a, b); },
      algo() { algo = (algo + 1) % 3; out('algo', ALGOS[algo]); if (anim) run(anim.A, anim.B); },
      destroy() { stop(); off(); v.s.off(); }
    };
  };

  /* ───────── Tipping survey (Norway): the notebook's real counts and statistics, one variable per type ───────── */
  const TIPS = {
    rt: { name: 'Response time', type: 'quantitative, continuous', counts: [50, 213, 173, 111, 51, 39, 19, 14, 7, 9, 5, 4, 2, 2, 0, 9], stats: [['mean', '148.2 s'], ['median', '105 s'], ['Q1 · Q3', '81 · 147 s'], ['std dev', '276 s'], ['outliers', '48 (1.5 × IQR)']], note: ['mean ≫ median: a long right tail,', 'up to 4,946 s (82 min)'] },
    fin: { name: 'Financial situation', type: 'qualitative, ordinal', labels: ['Very bad', 'Bad', 'OK', 'Good', 'Very good'], counts: [13, 47, 305, 228, 116], cum: [0.018, 0.085, 0.515, 0.836, 1], stats: [['mode', 'OK (43%)'], ['median', 'OK'], ['mean', '2.55 / 4'], ['std dev', '0.90']], note: ['91.5% say their finances', 'are OK or better'] },
    age: { name: 'Age', type: 'quantitative, discrete', counts: [4, 57, 89, 97, 80, 55, 38, 34, 17, 22, 15, 11, 14, 11, 8, 10, 11, 11, 3, 9, 7, 7, 3, 8, 11, 5, 4, 14, 12, 4, 4, 6, 3, 5, 4, 2, 5, 2, 2, 4, 1], stats: [['mean', '27.2'], ['median', '23'], ['Q1 · Q3', '21 · 30'], ['std dev', '9.4'], ['range', '18 → 58']], note: ['half the sample is 23 or younger:', 'mostly students'] },
    svc: { name: 'Service quality', type: 'qualitative, binary', counts: [343, 366], stats: [['Very good', '366 (51.6%)'], ['OK', '343 (48.4%)'], ['mode', 'Very good']], note: ['a near 50/50 split: service level was', 'one of the survey scenarios'] }
  };
  PW.tips = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300);
    let cur = 'rt', t = 0, t0 = 0;
    const X0 = 36, X1 = 336, Y0 = 44, Y1 = 236;
    function axes(c, max, ticks) {
      ticks.forEach((tk) => { const y = Y1 - (tk / max) * (Y1 - Y0); c.fillStyle = K.line; c.fillRect(X0, y, X1 - X0, 1); txt(c, String(tk), X0 - 6, y + 3, { px: 8.5, col: K.mute2, al: 'right' }); });
    }
    function bars(c, counts, max, colFn, gap) {
      const bw = (X1 - X0) / counts.length, g = ease(clamp((t - t0) / 0.8, 0, 1));
      counts.forEach((n, i) => { const h = (n / max) * (Y1 - Y0) * g; rr(c, X0 + i * bw + gap / 2, Y1 - h, bw - gap, Math.max(1, h), 2); c.fillStyle = colFn(i); c.fill(); });
      return bw;
    }
    function draw(c) {
      const d = TIPS[cur], g = ease(clamp((t - t0) / 0.8, 0, 1));
      txt(c, d.name.toUpperCase(), 14, 24, { px: 10, w: 700, col: K.tx }); txt(c, d.type + ' · n = 709', 336, 24, { px: 9, col: K.mute2, al: 'right' });
      if (cur === 'rt') {
        axes(c, 220, [0, 100, 200]); const bw = bars(c, d.counts, 220, (i) => (i === 15 ? K.rose : i >= 7 ? 'rgba(45,212,191,.45)' : K.teal), 3);
        const xv = (s) => X0 + ((s - 31) / 30) * bw;
        c.globalAlpha = g; c.setLineDash([3, 3]); c.strokeStyle = K.rose; c.beginPath(); c.moveTo(xv(246), Y0 - 4); c.lineTo(xv(246), Y1); c.stroke(); c.setLineDash([]);
        txt(c, 'upper fence 246 s', xv(246) + 5, Y0 + 6, { px: 9, col: K.rose });
        [[81, 'Q1'], [105, 'med'], [147, 'Q3']].forEach(([s, l]) => { c.fillStyle = K.yellow; c.fillRect(xv(s) - 0.5, Y1 + 2, 1, 7); txt(c, l, xv(s), Y1 + 18, { px: 8.5, col: K.yellow, al: 'center' }); });
        c.globalAlpha = 1;
        [['31', 0], ['151', 4], ['271', 8], ['391', 12]].forEach(([l, i]) => txt(c, l, X0 + i * bw, Y1 + 32, { px: 8.5, col: K.mute2, al: 'center' }));
        txt(c, '481–4,946', X0 + 15.5 * bw, Y1 + 32, { px: 8.5, col: K.rose, al: 'center' });
        txt(c, 'seconds to answer (30 s classes)', X0, Y1 + 50, { px: 8.5, col: K.mute2 });
      } else if (cur === 'fin') {
        axes(c, 320, [0, 100, 200, 300]); const bw = bars(c, d.counts, 320, (i) => (i === 2 ? K.teal : 'rgba(45,212,191,.5)'), 18);
        d.labels.forEach((l, i) => txt(c, l, X0 + (i + 0.5) * bw, Y1 + 16, { px: 9, col: K.mute, al: 'center' }));
        c.strokeStyle = K.yellow; c.lineWidth = 2; c.beginPath();
        d.cum.forEach((f, i) => { const x = X0 + (i + 0.5) * bw, y = Y1 - f * g * (Y1 - Y0); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
        d.cum.forEach((f, i) => { const x = X0 + (i + 0.5) * bw, y = Y1 - f * g * (Y1 - Y0); c.beginPath(); c.arc(x, y, 3, 0, 7); c.fillStyle = K.yellow; c.fill(); if (g > 0.95) txt(c, Math.round(f * 100) + '%', x, y - 8, { px: 8.5, col: K.yellow, al: 'center' }); });
        txt(c, '— cumulative frequency', X0, Y1 + 34, { px: 8.5, col: K.yellow });
      } else if (cur === 'age') {
        axes(c, 100, [0, 50, 100]); const bw = bars(c, d.counts, 100, (i) => (i + 18 > 43 ? 'rgba(251,113,133,.6)' : K.teal), 1);
        [18, 25, 35, 45, 58].forEach((a) => txt(c, String(a), X0 + (a - 18 + 0.5) * bw, Y1 + 14, { px: 8.5, col: K.mute2, al: 'center' }));
        const bx = (a) => X0 + (a - 18 + 0.5) * bw, by = Y1 + 32; c.globalAlpha = g;
        c.strokeStyle = K.yellow; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx(18), by); c.lineTo(bx(21), by); c.moveTo(bx(30), by); c.lineTo(bx(43), by); c.moveTo(bx(18), by - 5); c.lineTo(bx(18), by + 5); c.moveTo(bx(43), by - 5); c.lineTo(bx(43), by + 5); c.stroke();
        rr(c, bx(21), by - 7, bx(30) - bx(21), 14, 2); c.fillStyle = 'rgba(255,204,0,.15)'; c.fill(); c.stroke();
        c.beginPath(); c.moveTo(bx(23), by - 7); c.lineTo(bx(23), by + 7); c.stroke();
        for (let a = 44; a <= 58; a++) if (d.counts[a - 18]) { c.beginPath(); c.arc(bx(a), by, 2, 0, 7); c.fillStyle = K.rose; c.fill(); }
        c.globalAlpha = 1; txt(c, 'box plot · 44+ flagged as outliers', X0, Y1 + 56, { px: 8.5, col: K.mute2 });
      } else {
        const cx = 186, cy = 146, R = 78, f = 366 / 709;
        c.lineWidth = 26; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * f * g); c.strokeStyle = K.teal; c.stroke();
        c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + 2 * Math.PI * f * g, -Math.PI / 2 + 2 * Math.PI * g); c.strokeStyle = K.line3; c.stroke();
        txt(c, '51.6%', cx, cy + 2, { px: 24, sans: true, w: 800, al: 'center' }); txt(c, 'very good service', cx, cy + 20, { px: 9, col: K.mute, al: 'center' });
      }
      const RX = 356; panel(c, RX, 14, 172, 272);
      txt(c, 'STATISTICS', RX + 14, 38, { px: 9.5, w: 700, col: K.mute });
      d.stats.forEach(([k, val], i) => { const y = 64 + i * 22; txt(c, k, RX + 14, y, { px: 10, col: K.mute }); txt(c, val, RX + 158, y, { px: 10, w: 700, col: '#fff', al: 'right' }); });
      c.fillStyle = K.line; c.fillRect(RX + 14, 184, 144, 1);
      txt(c, 'INSIGHT', RX + 14, 206, { px: 9.5, w: 700, col: K.teal });
      d.note.forEach((l, i) => txt(c, l, RX + 14, 226 + i * 15, { px: 9.5, col: K.tx3 }));
    }
    function show(k, btn) {
      cur = k; t0 = t;
      if (o.card) o.card.querySelectorAll('[data-act="rt"],[data-act="fin"],[data-act="age"],[data-act="svc"]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-act') === k));
    }
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return { rt: () => show('rt'), fin: () => show('fin'), age: () => show('age'), svc: () => show('svc'), destroy() { stop(); v.s.off(); } };
  };

  /* ───────── Boggle: weighted dice, binary search in the sorted dictionary, recursive board search, solver "AI" ───────── */
  // LettresEN.txt: letter · points · dice weight
  const BLET = [['A', 1, 9], ['B', 3, 2], ['C', 3, 2], ['D', 2, 3], ['E', 1, 12], ['F', 4, 2], ['G', 2, 3], ['H', 4, 2], ['I', 1, 7], ['J', 8, 1], ['K', 5, 1], ['L', 1, 5], ['M', 3, 2], ['N', 1, 6], ['O', 1, 6], ['P', 3, 2], ['Q', 8, 1], ['R', 1, 7], ['S', 1, 6], ['T', 1, 6], ['U', 1, 6], ['V', 4, 2], ['W', 4, 2], ['X', 8, 1], ['Y', 4, 2], ['Z', 10, 1]];
  PW.boggle = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), PTS = {}; BLET.forEach(([l, p]) => { PTS[l] = p; });
    const BAG = []; BLET.forEach(([l, , w]) => { for (let i = 0; i < w; i++) BAG.push(l); });
    let N = 4, grid = [], sel = [], found = [], ai = [], score = 0, aiScore = 0, msg = null, dict = null, t = 0, dragging = false;
    const BS = 236, BX = 18, BY = 32, cs = () => BS / N;
    function newBoard() {
      do { grid = Array.from({ length: N * N }, () => pick(BAG)); } while (grid.filter((l) => 'AEIOU'.includes(l)).length < N * N / 4);
      sel = []; found = []; ai = []; score = aiScore = 0; msg = null;
    }
    function ensure() { return dict ? Promise.resolve() : PW.need('assets/data/boggle-en.js', () => window.BOGGLE).then(() => { dict = window.BOGGLE.words.split(' '); }); }
    function has(w) { let a = 0, b = dict.length - 1; while (a <= b) { const m = (a + b) >> 1; if (dict[m] === w) return true; if (dict[m] < w) a = m + 1; else b = m - 1; } return false; }
    function prefix(p) { let a = 0, b = dict.length; while (a < b) { const m = (a + b) >> 1; if (dict[m] < p) a = m + 1; else b = m; } return a < dict.length && dict[a].startsWith(p); }
    const adjacent = (a, b) => Math.abs((a / N | 0) - (b / N | 0)) <= 1 && Math.abs((a % N) - (b % N)) <= 1 && a !== b;
    const points = (w) => w.split('').reduce((s, l) => s + (PTS[l] || 0), 0);
    function submit() {
      const w = sel.map((i) => grid[i]).join(''); sel = [];
      if (w.length < 3) { if (w.length) msg = [w, 'too short', K.mute]; return; }
      if (!dict) { msg = [w, 'dictionary still loading, try again', K.mute]; ensure(); return; }
      if (found.some((f) => f.w === w)) msg = [w, 'already found', K.amber];
      else if (!has(w)) msg = [w, 'not in the dictionary', K.rose];
      else { const p = points(w); found.push({ w, p, t }); score += p; msg = [w, '+' + p + ' · valid word', K.green]; }
    }
    function solve() { // depth-first search from every cell, cut as soon as no dictionary word starts with the prefix
      const res = new Set(), seen = new Array(N * N).fill(false);
      const dfs = (i, p) => {
        const w = p + grid[i]; if (!prefix(w)) return;
        if (w.length >= 3 && has(w)) res.add(w);
        seen[i] = true; for (let j = 0; j < N * N; j++) if (!seen[j] && adjacent(i, j)) dfs(j, w); seen[i] = false;
      };
      for (let i = 0; i < N * N; i++) dfs(i, '');
      return [...res].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
    }
    function cellAt(e, tight) { const [x, y] = v.at(e), c = cs(), col = Math.floor((x - BX) / c), row = Math.floor((y - BY) / c); if (col < 0 || row < 0 || col >= N || row >= N) return -1; const dx = x - BX - (col + 0.5) * c, dy = y - BY - (row + 0.5) * c; return Math.hypot(dx, dy) < c * (tight ? 0.38 : 0.5) ? row * N + col : -1; }
    const off = listen(canvas, {
      pointerdown: (e) => { const i = cellAt(e); if (i < 0) return; ensure(); dragging = true; sel = [i]; msg = null; canvas.setPointerCapture(e.pointerId); },
      pointermove: (e) => {
        if (!dragging) { canvas.style.cursor = cellAt(e) >= 0 ? 'pointer' : 'default'; return; }
        const i = cellAt(e, true); if (i < 0) return;
        if (i === sel[sel.length - 2]) sel.pop(); else if (!sel.includes(i) && adjacent(sel[sel.length - 1], i)) sel.push(i);
      },
      pointerup: () => { if (dragging) { dragging = false; submit(); } }, pointercancel: () => { dragging = false; sel = []; }
    });
    function draw(c) {
      const C = cs(); txt(c, N + '×' + N + ' BOARD · DRAG ACROSS LETTERS', BX, 22, { px: 9.5, w: 700, col: K.mute });
      c.lineCap = 'round'; c.lineJoin = 'round';
      if (sel.length > 1) { c.strokeStyle = 'rgba(251,146,60,.55)'; c.lineWidth = C * 0.22; c.beginPath(); sel.forEach((i, k) => { const x = BX + (i % N + 0.5) * C, y = BY + ((i / N | 0) + 0.5) * C; k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
      grid.forEach((l, i) => {
        const x = BX + (i % N) * C, y = BY + (i / N | 0) * C, on = sel.includes(i);
        rr(c, x + 3, y + 3, C - 6, C - 6, 8); c.fillStyle = on ? K.orange : '#f4f4f5'; c.fill();
        txt(c, l, x + C / 2, y + C / 2 + C * 0.15, { px: C * 0.42, w: 800, sans: true, al: 'center', col: '#0c0d12' });
        txt(c, String(PTS[l]), x + C - 10, y + 16, { px: 8.5, w: 700, col: on ? '#0c0d12' : K.mute2, al: 'right' });
      });
      const RX = 276; panel(c, RX, 14, 252, 272);
      txt(c, 'YOU', RX + 14, 38, { px: 9.5, w: 700, col: K.mute }); txt(c, score + ' pts', RX + 14, 60, { px: 18, sans: true, w: 800, col: K.orange });
      txt(c, 'AI', RX + 136, 38, { px: 9.5, w: 700, col: K.mute }); txt(c, ai.length ? aiScore + ' pts' : '–', RX + 136, 60, { px: 18, sans: true, w: 800, col: K.violet });
      const cur = sel.map((i) => grid[i]).join('');
      if (cur) txt(c, cur, RX + 14, 86, { px: 12, w: 700, col: '#fff' });
      else if (msg) { txt(c, msg[0], RX + 14, 86, { px: 12, w: 700, col: '#fff' }); c.font = '700 12px ' + MONO; txt(c, msg[1], RX + 22 + c.measureText(msg[0]).width, 86, { px: 10, col: msg[2] }); }
      else txt(c, dict ? 'find words of 3+ letters' : 'dictionary loads on first word', RX + 14, 86, { px: 10, col: K.mute2 });
      c.fillStyle = K.line; c.fillRect(RX + 14, 98, 224, 1);
      let x = RX + 14, y = 118; c.font = '700 9.5px ' + MONO;
      const chips = found.map((f) => [f.w, K.orange, 1]).concat(ai.filter((a) => a.t <= t).map((a) => [a.w, K.violet, 0]));
      for (const [w, col, mine] of chips) {
        const cw = c.measureText(w).width + 12; if (x + cw > RX + 240) { x = RX + 14; y += 20; } if (y > 272) { txt(c, '…', x, y, { col: K.mute }); break; }
        rr(c, x, y - 11, cw, 16, 4); c.fillStyle = mine ? 'rgba(251,146,60,.16)' : 'rgba(167,139,250,.14)'; c.fill();
        txt(c, w, x + 6, y + 1, { px: 9.5, w: 700, col }); x += cw + 5;
      }
      if (!chips.length) txt(c, 'no words yet', RX + 14, 118, { px: 9.5, col: K.mute3 });
    }
    newBoard();
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return {
      live(on) { if (on) ensure(); },
      shuffle() { newBoard(); out('note', 'new board'); },
      size() { N = N === 4 ? 5 : 4; out('size', N + '×' + N); newBoard(); },
      ai() {
        out('note', 'AI is searching…');
        ensure().then(() => {
          const all = solve().filter((w) => !found.some((f) => f.w === w)); aiScore = 0;
          ai = all.map((w, i) => { aiScore += points(w); return { w, t: t + 0.12 * i }; });
          out('note', 'AI found ' + all.length + ' more word' + (all.length === 1 ? '' : 's'));
        }, () => out('note', 'could not load the dictionary'));
      },
      destroy() { stop(); off(); v.s.off(); }
    };
  };

  /* ───────── Alterdune (C++ RPG): FIGHT / ACT / ITEM / MERCY with the game's own stats and rules ───────── */
  const MONSTERS = [ // monstres.csv (names translated)
    { cat: 'NORMAL', name: 'Guard', hp: 30, atk: 7, def: 2, mercy0: 50, acts: ['DISCUSS', 'COMPLIMENT'], col: '#a1a1aa', px: ['..####..', '.######.', '.#r##r#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..'] },
    { cat: 'MINIBOSS', name: 'Knight', hp: 60, atk: 12, def: 5, mercy0: 30, acts: ['OBSERVE', 'REASON', 'PET'], col: '#818cf8', px: ['....yy..', '...yy...', '.######.', '.#r##r#.', '.######.', '########', '#.####.#', '.##..##.'] },
    { cat: 'BOSS', name: 'Skeleton King', hp: 120, atk: 22, def: 10, mercy0: 10, acts: ['JOKE', 'DANCE', 'INSULT', 'MOCK'], col: '#e4e4e7', px: ['y.y.y.y.', 'yyyyyyy.', '.#####..', '#r###r#.', '.#####..', '..#.#...', '.#####..', '#.#.#.#.'] }
  ];
  const ACTS = { JOKE: 15, COMPLIMENT: 25, DISCUSS: 10, OBSERVE: 5, PET: 30, REASON: 20, DANCE: 10, INSULT: -20, MOCK: -15 };
  const ITEMS = [ // items.csv (names translated)
    ['Potion', 'HEAL', 15, 'COMMON'], ['Snack', 'HEAL', 8, 'COMMON'], ['Bandage', 'HEAL', 5, 'COMMON'], ['Super potion', 'HEAL', 30, 'RARE'], ['Mega potion', 'HEAL', 50, 'RARE'], ['Peace flower', 'MERCY', 20, 'RARE'],
    ['Elixir', 'FULLHEAL', 0, 'EPIC'], ['Cursed relic', 'RISK', 40, 'EPIC'], ['Dagger', 'ATK', 3, 'COMMON'], ['Rusty sword', 'ATK', 5, 'COMMON'], ['Great sword', 'ATK', 10, 'RARE'], ['Wooden shield', 'DEF', 3, 'COMMON'], ['Iron shield', 'DEF', 6, 'RARE'], ['Heavy armour', 'DEF', 10, 'EPIC']
  ];
  PW.rpg = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), menuEl = o.card && o.card.querySelector('[data-out="menu"]');
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let P, M, log, phase, wins, t = 0, fx = { hit: -9, hurt: -9, heart: -9 };
    function newMonster() { const b = pick(MONSTERS); M = Object.assign({}, b, { hpNow: b.hp, mercy: b.mercy0 }); say('A wild ' + M.name + ' (' + M.cat + ') appears!', K.amber); phase = 'menu'; menu(); }
    function reset() {
      P = { hp: 100, max: 100, atk: 10, def: 3, inv: [], kills: 0, spares: 0 }; wins = 0; log = [];
      for (let i = 0; i < 3; i++) P.inv.push(pick(ITEMS).slice()); // donnerItemsDeDepart: 3 random items
      newMonster();
    }
    function say(s, col) { log.push([s, col || K.tx3]); if (log.length > 5) log.shift(); }
    function dmg(atk, def) { let d = atk + rnd(0, atk / 4 | 0) - def; if (d < 0) d = 0; const crit = rnd(1, 100) > 90; if (crit) d *= 2; return [d, crit]; }
    function enemyTurn() {
      if (phase !== 'menu') return;
      const [d, crit] = dmg(M.atk, P.def);
      if (!d) say(M.name + ' stumbles and misses!', K.mute);
      else { P.hp = Math.max(0, P.hp - d); fx.hurt = t; say((crit ? 'CRITICAL! ' : '') + M.name + ' deals ' + d + ' damage', K.rose); }
      if (P.hp <= 0) { phase = 'lost'; say('You collapse… game over.', K.rose); }
    }
    function win(how) {
      wins++; phase = wins >= 10 ? 'end' : 'won';
      if (how === 'kill') {
        P.kills++; const roll = rnd(1, 100), rar = roll <= 60 ? 'COMMON' : roll <= 90 ? 'RARE' : 'EPIC', loot = pick(ITEMS.filter((i) => i[3] === rar)).slice();
        P.inv.push(loot); say('Victory! Loot: ' + loot[0] + ' (' + rar.toLowerCase() + ')', K.green);
      } else { P.spares++; say('You spare the ' + M.name + '. Peaceful ending!', K.green); }
      if (phase === 'end') say(P.kills ? 'THE END · ' + P.kills + ' defeated, ' + P.spares + ' spared' : 'PACIFIST ENDING · a heart of gold', K.yellow);
    }
    const action = {
      fight() {
        const [d, crit] = dmg(P.atk, M.def);
        if (!d) say('Your sword slips… no damage.', K.mute); else { M.hpNow = Math.max(0, M.hpNow - d); fx.hit = t; say((crit ? 'CRITICAL! ' : '') + 'You deal ' + d + ' damage', K.yellow); }
        if (M.hpNow <= 0) win('kill'); else enemyTurn(); menu();
      },
      act(name) {
        const k = ACTS[name]; M.mercy = clamp(M.mercy + k, 0, 100); if (k > 0) fx.heart = t;
        say(name + ' → mercy ' + (k > 0 ? '+' : '') + k, k > 0 ? K.pink : K.rose); enemyTurn(); phase = phase === 'act' ? 'menu' : phase; menu();
      },
      item(i) {
        const it = P.inv[i]; if (!it) return; P.inv.splice(i, 1); const [n, type, val] = it;
        if (type === 'HEAL') { P.hp = Math.min(P.max, P.hp + val); say(n + ': +' + val + ' HP', K.green); }
        else if (type === 'FULLHEAL') { P.hp = P.max; say(n + ': HP fully restored', K.green); }
        else if (type === 'MERCY') { M.mercy = Math.min(100, M.mercy + val); fx.heart = t; say(n + ': mercy +' + val, K.pink); }
        else if (type === 'ATK') { P.atk += val; say(n + ': ATK +' + val, K.yellow); }
        else if (type === 'DEF') { P.def += val; say(n + ': DEF +' + val, K.sky); }
        else say(n + ': nothing happens…', K.mute);
        phase = 'menu'; enemyTurn(); menu();
      },
      mercy() {
        if (M.mercy >= 100) { win('spare'); menu(); return; }
        say(M.name + ' won\'t stop yet (mercy ' + M.mercy + '/100)', K.mute); enemyTurn(); menu();
      }
    };
    function menu() {
      if (!menuEl) return; const b = (act, label, bg) => '<button type="button" class="pill-btn' + (bg ? '' : ' ghost') + '" data-rpg="' + act + '"' + (bg ? ' style="background:' + bg + '"' : '') + '>' + label + '</button>';
      let h = '';
      if (phase === 'menu') h = b('fight', 'FIGHT', K.yellow) + b('act', 'ACT', K.pink) + b('item', 'ITEM (' + P.inv.length + ')', K.green) + b('mercy', 'MERCY', M.mercy >= 100 ? K.pink : '#e4e4e7');
      else if (phase === 'act') h = M.acts.map((a) => b('do:' + a, a)).join('') + b('back', '←');
      else if (phase === 'item') h = P.inv.slice(0, 4).map((it, i) => b('use:' + i, it[0])).join('') + b('back', '←');
      else if (phase === 'won') h = b('next', 'Next fight →', K.pink);
      else h = b('restart', 'New adventure', K.pink);
      menuEl.innerHTML = h;
    }
    const onMenu = (e) => {
      const btn = e.target.closest('[data-rpg]'); if (!btn) return; const a = btn.getAttribute('data-rpg');
      if (a === 'fight' || a === 'mercy') action[a]();
      else if (a === 'act') { phase = 'act'; menu(); } else if (a === 'item') { if (P.inv.length) { phase = 'item'; menu(); } }
      else if (a === 'back') { phase = 'menu'; menu(); }
      else if (a.startsWith('do:')) { phase = 'menu'; action.act(a.slice(3)); }
      else if (a.startsWith('use:')) action.item(+a.slice(4));
      else if (a === 'next') newMonster(); else if (a === 'restart') reset();
    };
    if (menuEl) menuEl.addEventListener('click', onMenu);
    function bar(c, x, y, w, f, col, label) {
      rr(c, x, y, w, 9, 4); c.fillStyle = K.line; c.fill(); rr(c, x, y, Math.max(0, w * clamp(f, 0, 1)), 9, 4); c.fillStyle = col; c.fill();
      txt(c, label, x + w, y - 4, { px: 9, col: K.mute, al: 'right' });
    }
    function draw(c) {
      // monster
      const sh = t - fx.hit < 0.3 ? Math.sin(t * 90) * 4 : 0, bob = Math.sin(t * 2.4) * 3, px = 12, ox = 150 - 4 * px + sh, oy = 60 + bob;
      c.fillStyle = 'rgba(244,114,182,.06)'; c.beginPath(); c.ellipse(150, 176, 70, 10, 0, 0, 7); c.fill();
      M.px.forEach((row, r) => row.split('').forEach((ch, k) => { if (ch === '.') return; c.fillStyle = ch === 'r' ? K.rose : ch === 'y' ? K.yellow : t - fx.hit < 0.12 ? '#fff' : M.col; c.fillRect(ox + k * px, oy + r * px, px - 1, px - 1); }));
      if (t - fx.heart < 0.9) { const a = (t - fx.heart) / 0.9; c.globalAlpha = 1 - a; txt(c, '♥', 196, 72 - a * 30, { px: 20, col: K.pink, al: 'center' }); c.globalAlpha = 1; }
      txt(c, M.name, 26, 30, { px: 15, sans: true, w: 800 }); txt(c, M.cat, 26, 46, { px: 9, w: 700, col: M.cat === 'BOSS' ? K.rose : M.cat === 'MINIBOSS' ? K.indigo : K.mute });
      bar(c, 26, 196, 248, M.hpNow / M.hp, K.yellow, 'HP ' + M.hpNow + '/' + M.hp); bar(c, 26, 226, 248, M.mercy / 100, K.pink, 'MERCY ' + M.mercy + '/100');
      txt(c, 'ATK ' + M.atk + ' · DEF ' + M.def, 26, 252, { px: 9, col: K.mute2 });
      if (phase === 'won' || phase === 'end' || phase === 'lost') { rr(c, 70, 110, 160, 34, 17); c.fillStyle = phase === 'lost' ? K.rose : K.green; c.fill(); txt(c, phase === 'lost' ? 'GAME OVER' : phase === 'end' ? 'THE END' : 'VICTORY', 150, 132, { px: 14, w: 800, sans: true, al: 'center', col: '#0c0d12' }); }
      // player + log
      const RX = 296, hurt = t - fx.hurt < 0.3 ? Math.sin(t * 80) * 3 : 0; panel(c, RX + hurt, 14, 232, 272);
      txt(c, 'HERO', RX + 14, 38, { px: 9.5, w: 700, col: K.mute }); txt(c, 'wins ' + wins + '/10', RX + 218, 38, { px: 9, col: K.pink, al: 'right' });
      bar(c, RX + 14, 58, 204, P.hp / P.max, P.hp < 30 ? K.rose : K.green, 'HP ' + P.hp + '/' + P.max);
      txt(c, 'ATK ' + P.atk + ' · DEF ' + P.def + ' · ' + P.inv.length + ' item' + (P.inv.length === 1 ? '' : 's'), RX + 14, 86, { px: 9.5, col: K.tx3 });
      c.fillStyle = K.line; c.fillRect(RX + 14, 98, 204, 1);
      txt(c, 'BATTLE LOG', RX + 14, 118, { px: 9, w: 700, col: K.mute });
      log.forEach(([s, col], i) => { const y = 140 + i * 27; c.globalAlpha = 0.45 + 0.55 * (i + 1) / log.length; wrap(c, s, RX + 14, y, 204, col); c.globalAlpha = 1; });
    }
    function wrap(c, s, x, y, w, col) {
      c.font = '500 9.5px ' + MONO; const words = s.split(' '); let line = '', yy = y;
      for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (c.measureText(tst).width > w && line) { txt(c, line, x, yy, { px: 9.5, col }); line = wd; yy += 12; } else line = tst; }
      txt(c, line, x, yy, { px: 9.5, col });
    }
    reset();
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return { destroy() { stop(); v.s.off(); if (menuEl) menuEl.removeEventListener('click', onMenu); } };
  };

  /* ───────── MIT: random linear network coding, told step by step · plus the research result (delay vs loss) ─────────
     Same set-up as the internship code: 5 packets, 10 (or 7) coded packets with coefficients 0–31, whole packets
     erased by the channel, the generation resent with new coefficients when fewer than 5 arrive. */
  PW.rlnc = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), M = 5, PS = [0.1, 0.2, 0.3, 0.4, 0.5], COLS = [K.indigo, K.sky, K.teal, K.amber, K.pink];
    let mode = 'story', pi = 1, t = 0, t0m = 0, gen = null, msgNo = 0, done = 0, txDone = 0;
    const stats = {}; // key "n_p" → { gens, tx } for the research chart
    const binom = (a, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (a - k + i)) / i; return r; };
    const pfail = (nn, p) => { let s = 0; for (let j = 0; j < M; j++) s += binom(nn, j) * Math.pow(1 - p, j) * Math.pow(p, nn - j); return s; }; // P[received < 5]
    const delay = (nn, p) => 1 / (1 - pfail(nn, p)); // expected sends per message = Σ i·P_fail^(i−1)·(1−P_fail)
    const N = 10, P1 = 1.5, P2 = 1.9, P3 = 2.1, P4 = 2.4; // story: 10 mixes; phase lengths (s)
    function send(attempt) {
      const erased = Array.from({ length: N }, () => Math.random() < PS[pi]);
      gen = { t0: t, attempt, erased, got: erased.filter((e) => !e).length, skip: attempt > 1 ? P1 : 0, coef: Array.from({ length: N }, () => Array.from({ length: M }, () => 1 + Math.floor(Math.random() * 31))) };
      if (attempt === 1) msgNo++;
    }
    function batch(nn, p, k) { const key = nn + '_' + p, s = (stats[key] = stats[key] || { gens: 0, tx: 0 }); for (let g = 0; g < k; g++) { let a = 1; for (;;) { let got = 0; for (let i = 0; i < nn; i++) if (Math.random() >= p) got++; if (got >= M) break; a++; } s.gens++; s.tx += a; } }
    const pct = () => Math.round(PS[pi] * 100) + '%';
    function caption(c, step, title, sub, col) {
      rr(c, 12, 10, 58, 20, 10); c.fillStyle = col; c.fill();
      txt(c, 'STEP ' + step + '/4', 41, 23.5, { px: 9, w: 700, col: '#0c0d12', al: 'center' });
      txt(c, title, 80, 25, { sans: true, px: 14.5, w: 800, col: '#fff' });
      txt(c, sub, 12, 46, { px: 9.5, col: K.mute });
    }
    function packet(c, x, y, w, h, i, a) { c.globalAlpha = a; rr(c, x, y, w, h, 4); c.fillStyle = COLS[i]; c.fill(); txt(c, 'P' + (i + 1), x + w / 2, y + h / 2 + 3.5, { px: 9.5, w: 800, col: '#0c0d12', al: 'center' }); c.globalAlpha = 1; }
    function mix(c, x, y, w, h, coef, a) { // a coded packet: stripes sized by its coefficients
      c.globalAlpha = a; c.save(); rr(c, x, y, w, h, 3); c.clip(); const sum = coef.reduce((s, q) => s + q, 0); let xx = x;
      coef.forEach((q, i) => { const ww = (q / sum) * w; c.fillStyle = COLS[i]; c.fillRect(xx, y, ww + 0.5, h); xx += ww; }); c.restore(); c.globalAlpha = 1;
    }
    function drawStory(c) {
      const e = t - gen.t0 + gen.skip, ok = gen.got >= M, lost = N - gen.got;
      const ph = e < P1 ? 1 : e < P1 + P2 ? 2 : e < P1 + P2 + P3 ? 3 : 4;
      if (ph === 1) caption(c, 1, 'The message is cut into 5 packets', 'message #' + msgNo + ': the source splits the data into packets P1 … P5', K.indigo);
      else if (ph === 2) caption(c, 2, gen.attempt > 1 ? 'The source sends 10 NEW mixes' : 'The source sends 10 mixes, not the packets', 'each mix = a random blend of all 5, e.g. E1 = ' + gen.coef[0].map((q, i) => q + '·P' + (i + 1)).join(' + '), K.sky);
      else if (ph === 3) caption(c, 3, 'The network loses some of them', 'each mix is lost with probability p = ' + pct() + ': this time ' + lost + ' lost, ' + gen.got + ' arrive', K.rose);
      else caption(c, 4, ok ? 'Any 5 mixes are enough ✓' : 'Only ' + gen.got + ' arrived: not enough', ok ? 'with 5 mixes = 5 equations, inverting the 5×5 matrix gives back P1 … P5' : 'fewer than 5 equations cannot be solved → the source sends a new round', ok ? K.green : K.amber);
      // columns
      [['MESSAGE', 16], ['10 MIXES', 146], ['NETWORK', 272], ['RECEIVER', 378]].forEach(([s, x]) => txt(c, s, x, 68, { px: 8.5, w: 700, col: K.mute2 }));
      rr(c, 262, 74, 96, 214, 10); c.fillStyle = 'rgba(251,113,133,.05)'; c.fill(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(251,113,133,.35)'; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
      txt(c, 'loses ' + pct(), 310, 283, { px: 8.5, w: 700, col: K.rose, al: 'center' });
      const a1 = gen.attempt > 1 ? 1 : ease(clamp(e / 0.8, 0, 1));
      for (let i = 0; i < M; i++) packet(c, 16, 82 + i * 40, 76, 22, i, clamp(a1 * 5 - i, 0, 1));
      // mixes: appear (step 2), travel (step 3)
      const e2 = e - P1, e3 = e - P1 - P2, rowY = (k) => 78 + k * 21;
      if (e2 > 0) {
        if (ph === 2) { const lk = clamp(e2 / 0.6, 0, 1) * (1 - clamp((e2 - 1.2) / 0.6, 0, 1)); c.globalAlpha = 0.16 * lk; for (let k = 0; k < N; k++) for (let i = 0; i < M; i++) { c.strokeStyle = COLS[i]; c.beginPath(); c.moveTo(92, 93 + i * 40); c.lineTo(146, rowY(k) + 7); c.stroke(); } c.globalAlpha = 1; }
        let arrived = 0;
        for (let k = 0; k < N; k++) {
          const ap = clamp((e2 - k * 0.09) / 0.35, 0, 1); if (!ap) continue;
          const mv = ease(clamp((e3 - k * 0.07) / 1.1, 0, 1)), gone = gen.erased[k];
          let x = lerp(146, gone ? 296 : 380, mv), y = rowY(k), w = 76, a = ap;
          if (!gone && mv >= 1) { y = 78 + arrived * 21; arrived++; w = 58; x = 380; }
          if (gone && mv > 0.95) { a = Math.max(0, 1 - (e3 - k * 0.07 - 1.05) * 2.5); const cx = 310, cy = y + 7; c.globalAlpha = Math.max(0.35, a); c.strokeStyle = K.rose; c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx - 6, cy - 6); c.lineTo(cx + 6, cy + 6); c.moveTo(cx + 6, cy - 6); c.lineTo(cx - 6, cy + 6); c.stroke(); c.globalAlpha = 1; x = 272; }
          mix(c, x, y, w, 14, gen.coef[k], a);
        }
      }
      if (ph === 4) { // receiver: counter, then decoded packets (or the resend)
        const e4 = e - P1 - P2 - P3;
        txt(c, gen.got + ' received', 446, 88, { px: 9.5, w: 700, col: ok ? K.green : K.amber });
        txt(c, 'need any 5', 446, 101, { px: 8.5, col: K.mute });
        for (let s = 0; s < 5; s++) { rr(c, 446 + s * 15, 108, 12, 6, 2); c.fillStyle = s < gen.got ? (ok ? K.green : K.amber) : K.line3; c.fill(); }
        if (ok) { txt(c, '=', 462, 146, { px: 14, w: 800, col: K.mute, al: 'center' }); for (let i = 0; i < M; i++) packet(c, 474, 126 + i * 30, 54, 20, i, clamp(e4 * 3 - i * 0.35, 0, 1)); }
        else { txt(c, '↺ resend', 446, 150, { px: 12, w: 800, col: K.amber, sans: true }); txt(c, 'new coefficients,', 446, 166, { px: 8.5, col: K.mute }); txt(c, 'same message', 446, 178, { px: 8.5, col: K.mute }); }
      }
      txt(c, done + ' delivered · ' + (done ? (txDone / done).toFixed(2) : '–') + ' sends/msg · theory ' + delay(N, PS[pi]).toFixed(2), 528, 294, { px: 8, col: K.mute2, al: 'right' });
    }
    const X0 = 58, X1 = 318, Y0 = 50, Y1 = 250, px = (p) => X0 + (p / 0.5) * (X1 - X0), py = (d) => Y1 - ((d - 1) / 2.4) * (Y1 - Y0);
    function drawResults(c) {
      txt(c, 'THE RESEARCH RESULT · average sends per message vs loss rate', 12, 24, { px: 9.5, w: 700, col: K.mute });
      [1, 1.8, 2.6, 3.4].forEach((d) => { const y = py(d); c.fillStyle = K.line; c.fillRect(X0, y, X1 - X0, 1); txt(c, d.toFixed(1), X0 - 6, y + 3, { px: 8.5, col: K.mute2, al: 'right' }); });
      [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach((p) => txt(c, Math.round(p * 100) + '%', px(p), Y1 + 14, { px: 8.5, col: K.mute2, al: 'center' }));
      txt(c, 'packet loss rate p', (X0 + X1) / 2, Y1 + 30, { px: 8.5, col: K.mute, al: 'center' });
      const g = ease(clamp((t - t0m) / 1.2, 0, 1));
      [[7, K.amber], [10, K.sky]].forEach(([nn, col]) => {
        c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath();
        for (let p = 0.005; p <= 0.5 * g + 0.001; p += 0.005) { const x = px(p), y = Math.max(Y0, py(delay(nn, p))); p > 0.006 ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
        PS.forEach((p) => { const s = stats[nn + '_' + p]; if (!s || !s.gens || px(p) > px(0.5 * g + 0.001)) return; c.beginPath(); c.arc(px(p), Math.max(Y0, py(s.tx / s.gens)), 4, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = K.bg; c.lineWidth = 1.5; c.stroke(); });
      });
      txt(c, '— 7 mixes', X0 + 8, Y0 + 6, { px: 9, w: 700, col: K.amber }); txt(c, '— 10 mixes', X0 + 8, Y0 + 20, { px: 9, w: 700, col: K.sky });
      txt(c, '- - theory   ● simulation (10,000 messages each)', X0 + 8, Y0 + 34, { px: 8.5, col: K.mute2 });
      const RX = 336; panel(c, RX, 34, 192, 252);
      txt(c, 'HOW TO READ IT', RX + 14, 56, { px: 9.5, w: 700, col: K.mute });
      const lines = [['More mixes = more safety.', '#fff'], ['With 10 mixes for 5 packets,', K.tx3], ['a message almost always', K.tx3], ['arrives first time, even at', K.tx3], ['30 % loss.', K.tx3], ['', 0], ['Fewer mixes = less waste.', '#fff'], ['7 mixes send less data but', K.tx3], ['need resends when losses', K.tx3], ['grow: 2.4 sends at 40 %.', K.tx3], ['', 0], ['Theory = simulation.', K.green], ['The binomial formula I', K.tx3], ['derived matches the', K.tx3], ['simulated points.', K.tx3]];
      lines.forEach(([s, col], i) => { if (s) txt(c, s, RX + 14, 76 + i * 13.5, { px: 9.5, w: col === '#fff' || col === K.green ? 700 : 500, col }); });
    }
    send(1);
    const stop = loop(canvas, (dt) => {
      t += dt;
      if (mode === 'story' && t - gen.t0 + gen.skip > P1 + P2 + P3 + P4) { if (gen.got >= M) { done++; txDone += gen.attempt; send(1); } else send(gen.attempt + 1); }
      const c = v.begin(); if (mode === 'story') drawStory(c); else drawResults(c);
    });
    return {
      p() { pi = (pi + 1) % PS.length; out('p', 'loss ' + pct()); done = 0; txDone = 0; msgNo = 0; send(1); if (mode === 'story') out('note', 'network now loses ' + pct() + ' of the mixes'); },
      mode() {
        mode = mode === 'story' ? 'results' : 'story'; t0m = t;
        if (mode === 'results') [7, 10].forEach((nn) => PS.forEach((p) => { if (!stats[nn + '_' + p]) batch(nn, p, 10000); }));
        out('mode', mode === 'story' ? 'Research result' : 'Step by step');
      },
      destroy() { stop(); v.s.off(); }
    };
  };
})();
