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

  /* ───────── Transdev: simulated USB-exfiltration dashboard with an hourly scheduled search ───────── */
  PW.siem = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300);
    const USERS = ['user_014', 'user_027', 'user_033', 'user_041', 'user_058', 'user_062'];
    const SITES = [['Paris', 2.35, 48.86], ['Lille', 3.06, 50.63], ['Rennes', -1.68, 48.11], ['Nantes', -1.55, 47.22], ['Bordeaux', -0.58, 44.84], ['Toulouse', 1.44, 43.6], ['Marseille', 5.37, 43.3], ['Nice', 7.26, 43.7], ['Lyon', 4.84, 45.76], ['Strasbourg', 7.75, 48.58]];
    const HOME = [0, 8, 3, 6, 1, 4], EXT = ['.xlsx', '.pdf', '.docx', '.csv', '.pptx', '.zip'];
    const FR = [[-4.8, 48.4], [-3.0, 48.85], [-1.6, 48.7], [-1.3, 49.7], [0.2, 49.7], [1.6, 50.2], [2.5, 51.1], [4.2, 50.0], [5.9, 49.5], [8.2, 49.0], [7.6, 47.6], [6.9, 47.4], [6.0, 46.3], [7.0, 45.9], [6.7, 45.1], [7.0, 44.2], [7.6, 43.8], [6.2, 43.1], [4.6, 43.4], [3.1, 43.1], [3.0, 42.5], [1.7, 42.5], [-1.8, 43.4], [-1.2, 44.6], [-1.1, 46.2], [-2.2, 47.1], [-4.4, 47.9]];
    const HOUR = 8, THR = 500; // 8 demo seconds = one hour of logs; alert above 500 MB/hour
    const mx = (lon) => 392 + (lon + 5) * 10.4, my = (lat) => 70 + (51.3 - lat) * 15.2;
    let t = 0, evs = [], next = 0, burst = null, runIn = HOUR, alert = null, pings = [], lastHits = 0, totals = USERS.map(() => 0);
    function add(u, mb) { const e = { t, u, mb, ext: pick(EXT), site: HOME[u] }; evs.push(e); pings.push({ site: e.site, t0: t, big: mb > 60 }); if (pings.length > 30) pings.shift(); }
    function run() {
      const hits = USERS.map((_, u) => [u, totals[u]]).filter(([, mb]) => mb > THR).sort((a, b) => b[1] - a[1]);
      lastHits = hits.length;
      if (hits.length) { alert = { u: hits[0][0], mb: hits[0][1], t0: t }; out('note', '⚠ alert sent to the security team'); }
      else if (alert && t - alert.t0 > HOUR) alert = null;
    }
    for (let i = 0; i < 14; i++) { t = i * 0.5; add(Math.floor(Math.random() * USERS.length), 1 + Math.random() * 30); }
    const clock = () => { const m = 9 * 60 + Math.floor(t * 7.5); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    function draw(c) {
      // query bar
      rr(c, 12, 10, 516, 26, 7); c.fillStyle = K.card; c.fill(); c.strokeStyle = K.line2; c.stroke();
      c.font = '500 10px ' + MONO; c.textBaseline = 'middle'; c.textAlign = 'left';
      let x = 22; [['event', K.sky], ['=UsbFileWrite ', K.tx3], ['| ', K.mute3], ['groupBy', K.violet], ['(user, sum(size_mb)) ', K.tx3], ['| ', K.mute3], ['sum > 500', K.amber]].forEach(([s, col]) => { c.fillStyle = col; c.fillText(s, x, 23.5); x += c.measureText(s).width; });
      txt(c, 'simulated logs', 518, 23.5, { px: 9, col: K.mute2, al: 'right', bl: 'middle' });
      // live feed
      txt(c, 'LIVE EVENTS', 12, 56, { px: 9.5, w: 700, col: K.mute });
      c.save(); c.beginPath(); c.rect(8, 62, 204, 230); c.clip();
      evs.slice(-13).reverse().forEach((e, i) => {
        const y = 76 + i * 17.5 + Math.max(0, 1 - (t - e.t) * 5) * -10, big = e.mb > 60, a = i === 0 ? clamp((t - e.t) * 5, 0, 1) : 1;
        c.globalAlpha = a * (1 - i * 0.05);
        const m = 9 * 60 + Math.floor(e.t * 7.5);
        txt(c, String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), 12, y, { px: 9.5, col: K.mute2 });
        txt(c, USERS[e.u], 50, y, { px: 9.5, col: big ? K.rose : K.tx3, w: big ? 700 : 500 });
        txt(c, e.ext, 110, y, { px: 9.5, col: K.mute });
        txt(c, e.mb.toFixed(0) + ' MB', 206, y, { px: 9.5, col: big ? K.rose : K.tx3, al: 'right', w: 700 });
      });
      c.restore(); c.globalAlpha = 1;
      // totals per user
      const BX = 224, BW = 144; txt(c, 'MB TO USB · LAST HOUR', BX, 56, { px: 9.5, w: 700, col: K.mute });
      const scale = BW / Math.max(THR * 1.5, ...totals);
      USERS.forEach((u, i) => {
        const y = 70 + i * 26, w = totals[i] * scale, hot = totals[i] > THR;
        txt(c, u, BX, y + 8, { px: 9, col: hot ? K.rose : K.mute });
        rr(c, BX, y + 12, BW, 7, 3); c.fillStyle = K.line; c.fill();
        rr(c, BX, y + 12, Math.max(2, Math.min(BW, w)), 7, 3); c.fillStyle = hot ? K.rose : K.sky; c.fill();
        txt(c, fmt(totals[i]), BX + BW, y + 8, { px: 9, col: hot ? K.rose : K.tx3, al: 'right', w: 700 });
      });
      const tx = BX + THR * scale; c.setLineDash([3, 3]); c.strokeStyle = K.amber; c.beginPath(); c.moveTo(tx, 64); c.lineTo(tx, 226); c.stroke(); c.setLineDash([]);
      txt(c, '500 MB', tx, 236, { px: 8.5, col: K.amber, al: 'center' });
      // map
      txt(c, 'EVENTS BY SITE', 392, 56, { px: 9.5, w: 700, col: K.mute });
      c.beginPath(); FR.forEach(([lo, la], i) => (i ? c.lineTo(mx(lo), my(la)) : c.moveTo(mx(lo), my(la)))); c.closePath();
      c.fillStyle = K.card2; c.fill(); c.strokeStyle = K.line3; c.lineWidth = 1; c.stroke();
      SITES.forEach(([, lo, la]) => { c.beginPath(); c.arc(mx(lo), my(la), 2.2, 0, 7); c.fillStyle = K.mute2; c.fill(); });
      pings.forEach((p) => {
        const a = (t - p.t0) / 1.4; if (a > 1) return; const [, lo, la] = SITES[p.site];
        c.beginPath(); c.arc(mx(lo), my(la), 3 + a * (p.big ? 16 : 9), 0, 7); c.strokeStyle = p.big ? K.rose : K.sky; c.globalAlpha = 1 - a; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1;
      });
      // scheduled search status / alert
      if (alert) {
        const pulse = 0.75 + 0.25 * Math.sin(t * 6);
        rr(c, 224, 250, 304, 38, 9); c.fillStyle = 'rgba(251,113,133,' + (0.16 * pulse).toFixed(3) + ')'; c.fill(); c.strokeStyle = K.rose; c.stroke();
        txt(c, '⚠ SCHEDULED SEARCH FIRED', 236, 265, { px: 9.5, w: 700, col: K.rose });
        txt(c, USERS[alert.u] + ' wrote ' + (alert.mb / 1000).toFixed(1) + ' GB to USB in 1 h', 236, 280, { px: 9.5, col: '#fff' });
      } else {
        rr(c, 224, 250, 304, 38, 9); c.fillStyle = K.card; c.fill(); c.strokeStyle = K.line; c.stroke();
        txt(c, 'HOURLY SCHEDULED SEARCH · ' + clock(), 236, 265, { px: 9.5, w: 700, col: K.mute });
        txt(c, 'next run in ' + Math.ceil(runIn) + ' s · last run: ' + lastHits + ' hit' + (lastHits === 1 ? '' : 's'), 236, 280, { px: 9.5, col: K.green });
      }
    }
    const stop = loop(canvas, (dt) => {
      t += dt; next -= dt;
      if (next <= 0) { next = 0.3 + Math.random() * 0.5; add(Math.floor(Math.random() * USERS.length), 1 + Math.pow(Math.random(), 2) * 34); }
      if (burst) { burst.next -= dt; if (burst.next <= 0) { burst.next = 0.2; burst.left--; add(burst.u, 70 + Math.random() * 90); if (!burst.left) burst = null; } }
      evs = evs.filter((e) => t - e.t < HOUR);
      const tgt = USERS.map(() => 0); evs.forEach((e) => { tgt[e.u] += e.mb; });
      totals = totals.map((x, i) => lerp(x, tgt[i], Math.min(1, dt * 6)));
      runIn -= dt; if (runIn <= 0) { runIn = HOUR; run(); }
      draw(v.begin());
    });
    return {
      exfil() { if (burst) return; const u = Math.floor(Math.random() * USERS.length); burst = { u, left: 12, next: 0 }; out('note', USERS[u] + ' is copying files to a USB key…'); },
      destroy() { stop(); v.s.off(); }
    };
  };

  /* ───────── Ultimate Tic-Tac-Toe: JS port of ultimate_tictactoe.py (alpha-beta, iterative deepening, TT, killer + history) ───────── */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  class UBoard { // cell i = row*9 + col; small board s = (row/3)*3 + col/3
    constructor() { this.b = Array(81).fill(' '); this.w = Array(9).fill(' '); this.next = -1; }
    idx(s, k) { return ((s / 3 | 0) * 3 + (k / 3 | 0)) * 9 + (s % 3) * 3 + (k % 3); }
    cell(s, k) { return this.b[this.idx(s, k)]; }
    legal() {
      const m = [], add = (s) => { for (let k = 0; k < 9; k++) { const i = this.idx(s, k); if (this.b[i] === ' ') m.push(i); } };
      if (this.next < 0) { for (let s = 0; s < 9; s++) if (this.w[s] === ' ') add(s); } else add(this.next);
      return m.sort((a, b) => a - b);
    }
    play(i, sym) {
      this.b[i] = sym; const r = i / 9 | 0, c = i % 9, s = (r / 3 | 0) * 3 + (c / 3 | 0);
      if (LINES.some((L) => L.every((k) => this.cell(s, k) === sym))) this.w[s] = sym;
      const n = (r % 3) * 3 + (c % 3);
      this.next = this.w[n] !== ' ' || this.full(n) ? -1 : n;
    }
    full(s) { for (let k = 0; k < 9; k++) if (this.cell(s, k) === ' ') return false; return true; }
    winner() {
      for (const sym of ['X', 'O']) if (LINES.some((L) => L.every((k) => this.w[k] === sym))) return sym;
      return this.legal().length ? null : 'Draw';
    }
    copy() { const n = new UBoard(); n.b = this.b.slice(); n.w = this.w.slice(); n.next = this.next; return n; }
    key(maxi) { return this.b.join('') + this.w.join('') + this.next + (maxi ? '+' : '-'); }
  }
  class UAI {
    constructor(sym, limitMs) {
      this.sym = sym; this.opp = sym === 'X' ? 'O' : 'X'; this.limit = limitMs;
      this.tt = new Map(); this.killer = {}; this.hist = new Map(); this.nodes = 0; this.stats = null;
    }
    over(t0) { return performance.now() - t0 > this.limit; }
    move(bd) {
      const t0 = performance.now(), legal = bd.legal(); if (!legal.length) return null;
      this.killer = {}; this.hist.clear(); this.nodes = 0;
      let best = legal[0], bestScore = 0, depth = 1, alpha = -Infinity, beta = Infinity, reached = 0;
      for (;;) {
        if (this.over(t0)) break;
        const [score, mv] = this.search(bd, depth, alpha, beta, true, t0);
        if (this.over(t0)) break;
        if (mv != null) { best = mv; bestScore = score; reached = depth; }
        if (score <= alpha) { alpha = -Infinity; beta = score; continue; } // aspiration window failed: widen and re-search
        else if (score >= beta) { alpha = score; beta = Infinity; continue; }
        alpha = score - 50; beta = score + 50;
        if (++depth > 20) break;
      }
      this.stats = { depth: reached, nodes: this.nodes, score: bestScore, ms: performance.now() - t0, tt: this.tt.size };
      return best;
    }
    search(bd, depth, alpha, beta, maxi, t0) {
      this.nodes++;
      if (this.over(t0)) return [this.heur(bd), null];
      const key = bd.key(maxi), e = this.tt.get(key);
      if (e && e[0] >= depth) {
        if (e[2] === 0) return [e[1], null];
        if (e[2] === 1) alpha = Math.max(alpha, e[1]); else beta = Math.min(beta, e[1]);
        if (alpha >= beta) return [e[1], null];
      }
      const w = bd.winner(); if (w) return [w === this.sym ? 100000 : w === this.opp ? -100000 : 0, null];
      if (depth === 0) return [this.heur(bd), null];
      const moves = this.order(bd.legal(), depth, maxi); if (!moves.length) return [this.heur(bd), null];
      let bestMove = null, best = maxi ? -Infinity : Infinity;
      for (const m of moves) {
        const nb = bd.copy(); nb.play(m, maxi ? this.sym : this.opp);
        const [s] = this.search(nb, depth - 1, alpha, beta, !maxi, t0);
        if (maxi ? s > best : s < best) { best = s; bestMove = m; }
        if (maxi) alpha = Math.max(alpha, s); else beta = Math.min(beta, s);
        if (beta <= alpha) { this.killer[depth] = m; const k = m + (maxi ? this.sym : this.opp); this.hist.set(k, (this.hist.get(k) || 0) + depth * depth); break; }
      }
      this.tt.set(key, [depth, best, best <= alpha ? 2 : best >= beta ? 1 : 0]);
      return [best, bestMove];
    }
    line(sy, two, one) {
      let a = 0, b = 0, e = 0; for (const x of sy) { if (x === this.sym) a++; else if (x === this.opp) b++; else if (x === ' ') e++; }
      if (a === 2 && e === 1) return two; if (b === 2 && e === 1) return -two;
      if (a === 1 && e === 2) return one; if (b === 1 && e === 2) return -one; return 0;
    }
    heur(bd) { // weights from the Python file: macro 140/18, micro 16/2, owned board 50, centre +38
      let s = 0; for (const L of LINES) s += this.line(L.map((k) => bd.w[k]), 140, 18);
      for (let sb = 0; sb < 9; sb++) {
        const o = bd.w[sb];
        if (o === ' ') { for (const L of LINES) s += this.line(L.map((k) => bd.cell(sb, k)), 16, 2); }
        else if (o === this.sym) s += 50 + (sb === 4 ? 38 : 0);
        else if (o === this.opp) s -= 50 + (sb === 4 ? 38 : 0);
      }
      return s;
    }
    order(moves, depth, maxi) {
      const p = maxi ? this.sym : this.opp;
      return moves.map((m) => {
        let s = (this.killer[depth] === m ? 45000 : 0) + (this.hist.get(m + p) || 0);
        const r = (m / 9 | 0) % 3, c = m % 3; if (r === 1 && c === 1) s += 50; else if (r !== 1 && c !== 1) s += 20;
        return [s, m];
      }).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    }
  }
  PW.uttt = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), BX = 14, BY = 14, BS = 272, CS = BS / 9;
    const COL = { X: K.yellow, O: K.violet };
    let bd, aiO, aiX, over, last, thinking, auto = false, hover = -1, stats, t = 0, endT = 0, timer = 0;
    function reset(preset) {
      bd = new UBoard(); aiO = new UAI('O', 450); aiX = new UAI('X', 450); over = null; last = -1; thinking = false; stats = null; clearTimeout(timer);
      if (preset) [40, 30, 10, 50, 70, 39].forEach((m, i) => { bd.play(m, i % 2 ? 'O' : 'X'); last = m; });
      if (auto) schedule(700);
    }
    const turn = () => (bd.b.filter((x) => x !== ' ').length % 2 ? 'O' : 'X');
    function aiPlay() {
      if (over) return; if (paused(canvas)) { schedule(300); return; }
      const who = turn(), ai = who === 'O' ? aiO : aiX, m = ai.move(bd);
      thinking = false; if (m == null) return;
      bd.play(m, who); last = m; stats = Object.assign({ who }, ai.stats); over = bd.winner();
      if (over) { endT = t; if (auto) schedule(2600, true); return; }
      if (auto) schedule(650);
    }
    function schedule(ms, restart) { clearTimeout(timer); timer = setTimeout(() => { if (restart) { reset(false); return; } thinking = true; setTimeout(aiPlay, 40); }, ms); }
    function cellAt(e) { const [x, y] = v.at(e), c = Math.floor((x - BX) / CS), r = Math.floor((y - BY) / CS); return c >= 0 && c < 9 && r >= 0 && r < 9 ? r * 9 + c : -1; }
    const off = listen(canvas, {
      pointermove: (e) => { const i = cellAt(e); hover = !auto && !over && !thinking && turn() === 'X' && bd.legal().includes(i) ? i : -1; canvas.style.cursor = hover >= 0 ? 'pointer' : 'default'; },
      pointerleave: () => { hover = -1; },
      click: (e) => {
        const i = cellAt(e); if (auto || over || thinking || turn() !== 'X' || !bd.legal().includes(i)) return;
        bd.play(i, 'X'); last = i; hover = -1; over = bd.winner();
        if (over) { endT = t; out('note', over === 'X' ? 'you beat the AI!' : over === 'Draw' ? 'draw' : 'the AI wins'); return; }
        thinking = true; setTimeout(aiPlay, 40);
      }
    });
    function sym(c, s, x, y, r, col, lw) {
      c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round';
      if (s === 'X') { c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke(); }
      else { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
    }
    function draw(c) {
      rr(c, BX - 6, BY - 6, BS + 12, BS + 12, 10); c.fillStyle = K.card; c.fill();
      const legal = over || thinking ? [] : bd.legal(), allowed = new Set(legal.map((i) => ((i / 9 | 0) / 3 | 0) * 3 + ((i % 9) / 3 | 0)));
      for (let s = 0; s < 9; s++) {
        const x = BX + (s % 3) * CS * 3, y = BY + (s / 3 | 0) * CS * 3;
        if (allowed.has(s) && !over) { rr(c, x + 2, y + 2, CS * 3 - 4, CS * 3 - 4, 6); c.fillStyle = turn() === 'X' ? 'rgba(255,204,0,.07)' : 'rgba(167,139,250,.07)'; c.fill(); c.strokeStyle = turn() === 'X' ? 'rgba(255,204,0,.45)' : 'rgba(167,139,250,.45)'; c.lineWidth = 1; c.stroke(); }
      }
      c.strokeStyle = K.line2; c.lineWidth = 1;
      for (let k = 1; k < 9; k++) { if (k % 3 === 0) continue; c.beginPath(); c.moveTo(BX + k * CS, BY + 3); c.lineTo(BX + k * CS, BY + BS - 3); c.moveTo(BX + 3, BY + k * CS); c.lineTo(BX + BS - 3, BY + k * CS); c.stroke(); }
      c.strokeStyle = K.mute2; c.lineWidth = 2;
      [3, 6].forEach((k) => { c.beginPath(); c.moveTo(BX + k * CS, BY); c.lineTo(BX + k * CS, BY + BS); c.moveTo(BX, BY + k * CS); c.lineTo(BX + BS, BY + k * CS); c.stroke(); });
      for (let i = 0; i < 81; i++) {
        const s = bd.b[i], x = BX + (i % 9 + 0.5) * CS, y = BY + ((i / 9 | 0) + 0.5) * CS, sb = ((i / 9 | 0) / 3 | 0) * 3 + ((i % 9) / 3 | 0);
        if (s !== ' ') { c.globalAlpha = bd.w[sb] !== ' ' ? 0.25 : 1; sym(c, s, x, y, CS * 0.26, COL[s], 2.2); c.globalAlpha = 1; }
        if (i === last) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.setLineDash([2, 2]); c.strokeRect(x - CS / 2 + 3, y - CS / 2 + 3, CS - 6, CS - 6); c.setLineDash([]); }
        if (i === hover) { c.globalAlpha = 0.4; sym(c, 'X', x, y, CS * 0.26, K.yellow, 2.2); c.globalAlpha = 1; }
      }
      for (let s = 0; s < 9; s++) if (bd.w[s] !== ' ') sym(c, bd.w[s], BX + ((s % 3) + 0.5) * CS * 3, BY + ((s / 3 | 0) + 0.5) * CS * 3, CS * 1.05, COL[bd.w[s]], 5);
      // side panel
      const RX = 306; panel(c, RX, 14, 222, 272);
      txt(c, auto ? 'AI VS AI' : 'YOU (X) VS AI (O)', RX + 14, 38, { px: 10, w: 700, col: K.mute });
      let status = thinking ? 'AI is thinking…' : turn() === 'X' && !auto ? 'Your move' : (turn() === 'X' ? 'X' : 'O') + ' to play';
      let col = thinking ? K.violet : K.yellow;
      if (over) { status = over === 'Draw' ? 'Draw' : auto ? over + ' wins' : over === 'X' ? 'You win!' : 'The AI wins'; col = over === 'O' ? K.violet : over === 'X' ? K.yellow : K.tx; }
      txt(c, status + (thinking ? '' : ''), RX + 14, 64, { sans: true, px: 19, w: 800, col });
      txt(c, over ? 'press New game to play again' : bd.next < 0 ? 'play in any open board' : 'play in the highlighted board', RX + 14, 82, { px: 9.5, col: K.mute2 });
      c.fillStyle = K.line; c.fillRect(RX + 14, 96, 194, 1);
      txt(c, 'LAST AI SEARCH', RX + 14, 116, { px: 9.5, w: 700, col: K.mute });
      const rows = stats ? [['search depth', stats.depth + ' plies'], ['positions', fmt(stats.nodes)], ['evaluation', (stats.score > 0 ? '+' : '') + fmt(stats.score)], ['time', fmt(stats.ms) + ' ms'], ['cache (TT)', fmt(stats.tt) + ' entries']] : [['search depth', '–'], ['positions', '–'], ['evaluation', '–'], ['time', '–'], ['cache (TT)', '–']];
      rows.forEach(([k, val], i) => { const y = 138 + i * 21; txt(c, k, RX + 14, y, { px: 10.5, col: K.mute }); txt(c, val, RX + 208, y, { px: 10.5, w: 700, col: '#fff', al: 'right' }); });
      txt(c, 'alpha-beta · iterative deepening', RX + 14, 258, { px: 9, col: K.mute2 });
      txt(c, 'killer moves · history heuristic', RX + 14, 272, { px: 9, col: K.mute2 });
      if (over && !auto) { const a = clamp((t - endT) * 3, 0, 1); c.globalAlpha = a * 0.9; rr(c, BX + BS / 2 - 70, BY + BS / 2 - 18, 140, 36, 18); c.fillStyle = over === 'O' ? K.violet : K.yellow; c.fill(); c.globalAlpha = a; txt(c, over === 'Draw' ? 'DRAW' : over === 'X' ? 'YOU WIN' : 'AI WINS', BX + BS / 2, BY + BS / 2 + 5, { al: 'center', w: 800, px: 14, col: '#0c0d12', sans: true }); c.globalAlpha = 1; }
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

  /* ───────── La Fabrique: will this pattern fit on this garment? (1 cm grid packing) + circular passport ───────── */
  // Rough impact factors per kg of fabric reused (conventional cotton production). Replace with the app's own figures.
  const IMPACT = { waterPerKg: 10000, co2PerKg: 15 };
  const GARMENTS = [
    { name: 'T-shirt', mat: 'Cotton jersey', gsm: 160, base: '#e4e4e7', ink: '#818cf8', kind: 'stripes', poly: [[22, 0], [33, 0], [40, 4], [47, 0], [58, 0], [80, 15], [72, 28], [65, 22], [65, 76], [15, 76], [15, 22], [8, 28], [0, 15]] },
    { name: 'Shirt', mat: 'Cotton poplin', gsm: 120, base: '#cfe8f7', ink: '#38bdf8', kind: 'check', poly: [[26, 0], [38, 0], [50, 5], [62, 0], [74, 0], [88, 10], [100, 60], [90, 63], [78, 24], [78, 90], [22, 90], [22, 24], [10, 63], [0, 60], [12, 10]] },
    { name: 'Jeans', mat: 'Denim', gsm: 400, base: '#3d5a94', ink: '#9db4e6', kind: 'twill', poly: [[2, 0], [54, 0], [56, 100], [34, 100], [29, 32], [27, 32], [22, 100], [0, 100]] }
  ];
  const PATTERNS = [
    { name: 'Tote bag', pieces: [['body', 36, 34, 2], ['strap', 6, 50, 2]] },
    { name: 'Zip pouch', pieces: [['side', 22, 16, 2], ['tab', 5, 8, 1]] },
    { name: 'Cushion cover', pieces: [['front', 40, 40, 1], ['back', 40, 26, 2]] },
    { name: 'Scrunchie', pieces: [['tube', 52, 10, 1]] }
  ];
  function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
  PW.fitPieces = function (g, p) { // first-fit on a 1 cm grid with a 1 cm gap; tries every rotation combo and keeps the best
    const W = Math.max(...g.poly.map((q) => q[0])) + 1, H = Math.max(...g.poly.map((q) => q[1])) + 1, ok = [];
    let area = 0;
    for (let y = 0; y < H; y++) { ok.push([]); for (let x = 0; x < W; x++) { const v = inPoly(x + 0.5, y + 0.5, g.poly); ok[y].push(v); if (v) area++; } }
    const pcs = []; p.pieces.forEach(([n, w, h, q]) => { for (let i = 0; i < q; i++) pcs.push({ n, w, h }); });
    pcs.sort((a, b) => b.w * b.h - a.w * a.h);
    function attempt(rot) {
      const used = ok.map((r) => r.map(() => false)), placed = [], missing = [];
      const free = (x, y, w, h) => { if (x + w > W || y + h > H) return false; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!ok[j][i] || used[j][i]) return false; return true; };
      pcs.forEach((pc, k) => {
        const w = rot & (1 << k) ? pc.h : pc.w, h = rot & (1 << k) ? pc.w : pc.h; let spot = null;
        for (let y = 0; y < H && !spot; y++) for (let x = 0; x < W && !spot; x++) if (free(x, y, w, h)) spot = [x, y];
        if (!spot) { missing.push(pc); return; }
        const [x, y] = spot; placed.push({ n: pc.n, x, y, w, h });
        for (let j = Math.max(0, y - 1); j < Math.min(H, y + h + 1); j++) for (let i = Math.max(0, x - 1); i < Math.min(W, x + w + 1); i++) used[j][i] = true;
      });
      return { placed, missing, area, used: placed.reduce((a, q) => a + q.w * q.h, 0) };
    }
    let best = null;
    for (let rot = 0; rot < 1 << pcs.length; rot++) {
      if (pcs.some((pc, k) => rot & (1 << k) && pc.w === pc.h)) continue; // rotating a square changes nothing
      const r = attempt(rot); if (!best || r.used > best.used) best = r; if (!r.missing.length) break;
    }
    return best;
  };
  PW.fabric = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), SC = 2.55;
    let gi = 0, pi = 0, res = null, t = 0, t0 = 0, qr = [];
    function compute() {
      res = PW.fitPieces(GARMENTS[gi], PATTERNS[pi]); t0 = t;
      qr = Array.from({ length: 49 }, () => Math.random() < 0.5);
      out('garment', GARMENTS[gi].name); out('pattern', PATTERNS[pi].name);
      out('note', res.missing.length ? 'not enough fabric: try another garment' : 'fits: ' + res.placed.length + ' pieces placed');
    }
    function fabric(c, g) {
      c.fillStyle = g.base; c.fill(); c.save(); c.clip(); c.strokeStyle = g.ink; c.globalAlpha = 0.55;
      if (g.kind === 'stripes') { c.lineWidth = 3.5; for (let y = 6; y < 300; y += 11) { c.beginPath(); c.moveTo(0, y); c.lineTo(540, y); c.stroke(); } }
      else if (g.kind === 'check') { c.lineWidth = 1.2; for (let k = 0; k < 540; k += 9) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 300); c.moveTo(0, k); c.lineTo(540, k); c.stroke(); } }
      else { c.lineWidth = 1; c.globalAlpha = 0.35; for (let k = -300; k < 540; k += 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 300, 300); c.stroke(); } }
      c.restore(); c.globalAlpha = 1;
    }
    function draw(c) {
      const g = GARMENTS[gi], xs = g.poly.map((q) => q[0]), ys = g.poly.map((q) => q[1]);
      const gw = (Math.max(...xs) - Math.min(...xs)) * SC, gh = (Math.max(...ys) - Math.min(...ys)) * SC, ox = 166 - gw / 2, oy = 152 - gh / 2;
      txt(c, 'FEASIBILITY CHECK · 1 cm GRID', 14, 24, { px: 9.5, w: 700, col: K.mute });
      c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      c.beginPath(); g.poly.forEach(([x, y], i) => (i ? c.lineTo(ox + x * SC, oy + y * SC) : c.moveTo(ox + x * SC, oy + y * SC))); c.closePath();
      c.fillStyle = g.base; c.fill(); c.restore();
      c.beginPath(); g.poly.forEach(([x, y], i) => (i ? c.lineTo(ox + x * SC, oy + y * SC) : c.moveTo(ox + x * SC, oy + y * SC))); c.closePath();
      fabric(c, g);
      res.placed.forEach((p, i) => {
        const a = clamp((t - t0 - i * 0.22) / 0.35, 0, 1); if (!a) return; const e = ease(a), s = 1 + (1 - e) * 0.25;
        const cx = ox + (p.x + p.w / 2) * SC, cy = oy + (p.y + p.h / 2) * SC, w = p.w * SC * s, h = p.h * SC * s;
        c.globalAlpha = e; rr(c, cx - w / 2, cy - h / 2, w, h, 3); c.fillStyle = 'rgba(19,21,29,.72)'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = K.indigo; c.stroke();
        c.setLineDash([4, 3]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.strokeRect(cx - w / 2 + 4, cy - h / 2 + 4, w - 8, h - 8); c.setLineDash([]);
        if (w > 30 && h > 16) txt(c, p.n, cx, cy + 3, { px: 8.5, al: 'center', col: '#fff', w: 700 });
        c.globalAlpha = 1;
      });
      // passport
      const RX = 330, done = t - t0 > res.placed.length * 0.22 + 0.3; panel(c, RX, 14, 198, 272);
      txt(c, 'CIRCULAR PASSPORT', RX + 14, 38, { px: 9.5, w: 700, col: K.mute });
      qr.forEach((on, k) => { if (on || k === 0 || k === 6 || k === 42) { c.fillStyle = K.tx3; c.fillRect(RX + 160 + (k % 7) * 3.6, 26 + (k / 7 | 0) * 3.6, 3.2, 3.2); } });
      const m2 = res.used / 10000, kg = m2 * g.gsm / 1000;
      [['garment', g.name], ['material', g.mat], ['usable fabric', (res.area / 10000).toFixed(2) + ' m²'], ['pattern', PATTERNS[pi].name], ['pieces placed', res.placed.length + ' / ' + (res.placed.length + res.missing.length)]].forEach(([k, val], i) => {
        const y = 66 + i * 20; txt(c, k, RX + 14, y, { px: 10, col: K.mute }); txt(c, val, RX + 184, y, { px: 10, col: '#fff', w: 700, al: 'right' });
      });
      c.fillStyle = K.line; c.fillRect(RX + 14, 162, 170, 1);
      if (!done) txt(c, 'placing pieces…', RX + 14, 190, { px: 13, sans: true, w: 700, col: K.mute });
      else if (res.missing.length) { txt(c, '✗ Not enough fabric', RX + 14, 190, { px: 15, sans: true, w: 800, col: K.rose }); txt(c, res.missing.length + ' piece' + (res.missing.length > 1 ? 's' : '') + ' left over (' + res.missing[0].n + ')', RX + 14, 208, { px: 9.5, col: K.mute }); }
      else {
        txt(c, '✓ Feasible', RX + 14, 190, { px: 15, sans: true, w: 800, col: K.green });
        txt(c, 'saved vs new fabric (est.)', RX + 14, 214, { px: 9, col: K.mute2 });
        txt(c, fmt(kg * IMPACT.waterPerKg) + ' L', RX + 14, 244, { px: 18, sans: true, w: 800, col: K.sky }); txt(c, 'water', RX + 14, 260, { px: 9, col: K.mute });
        txt(c, (kg * IMPACT.co2PerKg).toFixed(1) + ' kg', RX + 104, 244, { px: 18, sans: true, w: 800, col: K.green }); txt(c, 'CO₂', RX + 104, 260, { px: 9, col: K.mute });
      }
    }
    compute();
    const stop = loop(canvas, (dt) => { t += dt; draw(v.begin()); });
    return {
      garment() { gi = (gi + 1) % GARMENTS.length; compute(); },
      pattern() { pi = (pi + 1) % PATTERNS.length; compute(); },
      destroy() { stop(); v.s.off(); }
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
    function near(e) { if (!S) return -1; const [x, y] = v.at(e); let b = -1, bd = 12; S.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; b = s.i; } }); return b; }
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

  /* ───────── MIT: random linear network coding over an erasure channel, measured vs theoretical delay ───────── */
  PW.rlnc = function (canvas, o) {
    o = o || {}; const out = o.out || noop;
    const v = view(canvas, 540, 300), M = 5, PS = [0.1, 0.2, 0.3, 0.4], COLS = [K.indigo, K.sky, K.teal, K.amber, K.pink];
    let n = 10, pi = 1, t = 0, gen = null, genNo = 0; const stats = {};
    const key = () => n + '_' + PS[pi], st = () => (stats[key()] = stats[key()] || { gens: 0, tx: 0 });
    const binom = (a, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (a - k + i)) / i; return r; };
    const pfail = (nn, p) => { let s = 0; for (let j = 0; j < M; j++) s += binom(nn, j) * Math.pow(1 - p, j) * Math.pow(p, nn - j); return s; }; // P[k < m], k ~ Binomial(n, 1−p)
    const delay = (nn, p) => 1 / (1 - pfail(nn, p)); // Σ i·P_fail^(i−1)·(1−P_fail)
    function send(attempt) {
      const p = PS[pi], erased = Array.from({ length: n }, () => Math.random() < p);
      gen = { t0: t, n, attempt, erased, got: erased.filter((e) => !e).length, coef: Array.from({ length: n }, () => Array.from({ length: M }, () => Math.floor(Math.random() * 32))) };
      if (attempt === 1) genNo++;
    }
    function settle() { if (gen.got >= M) { const s = st(); s.gens++; s.tx += gen.attempt; send(1); } else send(gen.attempt + 1); }
    function batch(k) { const p = PS[pi], s = st(); for (let g = 0; g < k; g++) { let a = 1; for (;;) { let got = 0; for (let i = 0; i < n; i++) if (Math.random() >= p) got++; if (got >= M) break; a++; } s.gens++; s.tx += a; } }
    const X0 = 344, X1 = 516, Y0 = 56, Y1 = 214, px = (p) => X0 + (p / 0.42) * (X1 - X0), py = (d) => Y1 - ((d - 1) / 1.8) * (Y1 - Y0);
    function draw(c) {
      const e = t - gen.t0, N = gen.n, rowH = Math.min(21, 196 / N), cy = (k) => 64 + k * rowH + (196 - N * rowH) / 2;
      txt(c, 'GENERATION #' + genNo + (gen.attempt > 1 ? ' · RESENT ×' + (gen.attempt - 1) : ''), 14, 26, { px: 10, w: 700, col: gen.attempt > 1 ? K.amber : K.tx });
      [['SOURCE', 16], ['CODED', 92], ['CHANNEL', 164], ['RECEIVER', 232]].forEach(([s, x]) => txt(c, s, x, 46, { px: 8.5, w: 700, col: K.mute2 }));
      rr(c, 164, 54, 52, 214, 8); c.fillStyle = 'rgba(251,113,133,.05)'; c.fill(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(251,113,133,.35)'; c.stroke(); c.setLineDash([]);
      txt(c, 'p = ' + Math.round(PS[pi] * 100) + '%', 190, 282, { px: 9, w: 700, col: K.rose, al: 'center' });
      for (let i = 0; i < M; i++) { const y = 74 + i * 40; rr(c, 14, y, 46, 18, 4); c.fillStyle = COLS[i]; c.fill(); txt(c, 'P' + (i + 1), 37, y + 12.5, { px: 9, w: 700, col: '#0c0d12', al: 'center' }); }
      const enc = clamp(e / 0.5, 0, 1);
      if (enc < 1) { c.globalAlpha = 0.18 * (1 - enc); for (let k = 0; k < N; k++) for (let i = 0; i < M; i++) { c.strokeStyle = COLS[i]; c.beginPath(); c.moveTo(60, 83 + i * 40); c.lineTo(92, cy(k) + 6); c.stroke(); } c.globalAlpha = 1; }
      for (let k = 0; k < N; k++) {
        const y = cy(k), a = clamp((e - k * 0.03) / 0.3, 0, 1), mv = ease(clamp((e - 0.6 - k * 0.04) / 0.8, 0, 1)), x = lerp(92, 232, mv), gone = gen.erased[k] && mv > 0.5;
        if (!a) continue; c.globalAlpha = a * (gone ? Math.max(0.15, 1 - (mv - 0.5) * 2) : 1);
        if (gone) { rr(c, x, y, 52, rowH - 5, 3); c.strokeStyle = K.rose; c.stroke(); txt(c, '#', x + 26, y + rowH / 2 + 1, { px: 10, w: 700, col: K.rose, al: 'center' }); }
        else { const sum = gen.coef[k].reduce((s, q) => s + q, 0) || 1; let xx = x; gen.coef[k].forEach((q, i) => { const w = (q / sum) * 52; c.fillStyle = COLS[i]; c.fillRect(xx, y, w, rowH - 5); xx += w; }); }
        c.globalAlpha = 1;
      }
      if (e > 1.5) {
        const ok = gen.got >= M, a = clamp((e - 1.5) * 4, 0, 1); c.globalAlpha = a;
        txt(c, gen.got + ' / ' + N + ' received', 232, 278, { px: 9, w: 700, col: ok ? K.green : K.rose });
        txt(c, ok ? '✓ decoded' : '✗ < 5: resend', 232, 290, { px: 9, col: ok ? K.green : K.rose });
        c.globalAlpha = 1;
      }
      // chart: average delay (transmissions per generation) vs erasure probability
      panel(c, 326, 14, 202, 272);
      txt(c, 'DELAY vs ERASURE p', 340, 36, { px: 9.5, w: 700, col: K.mute });
      [1, 1.6, 2.2, 2.8].forEach((d) => { const y = py(d); c.fillStyle = K.line; c.fillRect(X0, y, X1 - X0, 1); txt(c, d.toFixed(1), X0 - 4, y + 3, { px: 8, col: K.mute2, al: 'right' }); });
      [0.1, 0.2, 0.3, 0.4].forEach((p) => txt(c, p.toFixed(1), px(p), Y1 + 13, { px: 8, col: K.mute2, al: 'center' }));
      [[7, K.amber], [10, K.sky]].forEach(([nn, col]) => {
        c.strokeStyle = col; c.lineWidth = nn === n ? 2 : 1; c.globalAlpha = nn === n ? 1 : 0.35; c.setLineDash([4, 3]); c.beginPath();
        for (let p = 0.01; p <= 0.421; p += 0.01) { const x = px(p), y = Math.max(Y0, py(delay(nn, p))); p > 0.015 ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
        PS.forEach((p) => { const s = stats[nn + '_' + p]; if (!s || !s.gens) return; c.beginPath(); c.arc(px(p), Math.max(Y0, py(s.tx / s.gens)), 3.2, 0, 7); c.fillStyle = col; c.fill(); });
        txt(c, 'n = ' + nn, X1, nn === 7 ? Y0 + 10 : Y0 + 24, { px: 8.5, w: 700, col, al: 'right' }); c.globalAlpha = 1;
      });
      c.lineWidth = 1; c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(px(PS[pi]), Y0, 1, Y1 - Y0);
      const s = st(), th = delay(n, PS[pi]);
      txt(c, '- - theory   ● measured', X0 - 16, Y1 + 30, { px: 8.5, col: K.mute2 });
      txt(c, 'theory ' + th.toFixed(3) + ' · measured ' + (s.gens ? (s.tx / s.gens).toFixed(3) : '–'), X0 - 16, Y1 + 46, { px: 8.5, col: K.tx3 });
      txt(c, fmt(s.gens) + ' generations · throughput ' + (s.gens ? ((M * s.gens) / (n * s.tx)).toFixed(2) : '–'), X0 - 16, Y1 + 60, { px: 8.5, col: K.mute });
    }
    send(1);
    const stop = loop(canvas, (dt) => { t += dt; if (t - gen.t0 > 2.4) settle(); draw(v.begin()); });
    return {
      p() { pi = (pi + 1) % PS.length; out('p', 'p = ' + Math.round(PS[pi] * 100) + '%'); send(1); },
      n() { n = n === 10 ? 7 : 10; out('n', n + ' coded packets'); send(1); },
      batch() { batch(10000); out('batch', 'Simulate 10k more'); },
      destroy() { stop(); v.s.off(); }
    };
  };
})();
