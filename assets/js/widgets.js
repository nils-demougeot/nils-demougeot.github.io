/* Interactive widgets for the Nils Demougeot portfolio. Requires THREE (r128). Project demos without WebGL live in demos.js. */
(function () {
  const PW = (window.PW = {});
  const DPR = () => Math.min(2, window.devicePixelRatio || 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  PW.pause = function (el, b) { if (!el) return; el.__pwPaused = !!b; if (el.__pwWake) el.__pwWake(); };

  function loop(el, fn) {
    // The rAF chain only runs while the widget is on screen and the tab visible (and, once paused, just for its preview frames).
    let raf = 0, vis = false, alive = true, last = 0;
    const want = () => alive && vis && !document.hidden && (!el.__pwPaused || (el.__pwFrames | 0) < 30 || el.__pwKick > 0);
    const tick = (t) => {
      raf = 0; if (!want()) return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      el.__pwFrames = (el.__pwFrames | 0) + 1; if (el.__pwKick > 0) el.__pwKick--;
      fn(dt, t); if (!raf) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf && want()) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    el.__pwWake = wake;
    const io = new IntersectionObserver((e) => { vis = e[e.length - 1].isIntersecting; wake(); });
    io.observe(el); document.addEventListener('visibilitychange', wake);
    return () => { alive = false; if (raf) cancelAnimationFrame(raf); raf = 0; io.disconnect(); document.removeEventListener('visibilitychange', wake); };
  }
  function fit(canvas, cb) {
    const p = canvas.parentElement;
    const run = () => { const r = p.getBoundingClientRect(); cb(Math.max(2, r.width), Math.max(2, r.height)); canvas.__pwKick = 2; if (canvas.__pwWake) canvas.__pwWake(); };
    const ro = new ResizeObserver(run); ro.observe(p); run();
    return () => ro.disconnect();
  }
  function ctx2d(canvas) {
    const c = canvas.getContext('2d'); const s = { w: 2, h: 2, c };
    s.off = fit(canvas, (w, h) => { const d = DPR(); canvas.width = w * d; canvas.height = h * d; s.w = w; s.h = h; c.setTransform(d, 0, 0, d, 0, 0); });
    return s;
  }
  function gl(canvas, fov) {
    const T = THREE; const r = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1)); // WebGL: 1.5× is visually the same, far fewer pixels than 2×
    const scene = new T.Scene(); const cam = new T.PerspectiveCamera(fov || 35, 1, 0.1, 100);
    const off = fit(canvas, (w, h) => { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); });
    return { T, r, scene, cam, dispose() { off(); r.dispose(); } };
  }
  function lights(T, scene) {
    scene.add(new T.HemisphereLight(0xffffff, 0x1c1f2b, 0.95));
    const d = new T.DirectionalLight(0xffffff, 0.85); d.position.set(3, 5, 4); scene.add(d);
    const f = new T.DirectionalLight(0xFFCC00, 0.25); f.position.set(-4, 1, -3); scene.add(f);
  }
  function drag(el, onMove, onClick) {
    let down = false, lx = 0, ly = 0, moved = 0;
    const pd = (e) => { down = true; moved = 0; lx = e.clientX; ly = e.clientY; };
    const pm = (e) => { if (!down) return; const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); onMove(dx, dy, e); lx = e.clientX; ly = e.clientY; };
    const pu = (e) => { if (down && moved < 6 && onClick) onClick(e); down = false; };
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu);
    return () => { el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); };
  }
  function dotTex(T) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  }
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function llv(T, lat, lon, r) { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); }
  PW.u = { loop, fit, ctx2d, drag, clamp, lerp, ease, rng }; // shared with demos.js

  /* ───────── Shared bits for the project models ───────── */
  const mat = (T, c, x) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.05 }, x || {}));
  function outline(T, mesh, col, op, thr) { mesh.add(new T.LineSegments(new T.EdgesGeometry(mesh.geometry, thr || 20), new T.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 1 : op }))); return mesh; }
  function block(T, parent, w, h, d, m, x, y, z) { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); parent.add(b); return b; }
  function orbiter(canvas, cam, o) { // drag to orbit, slow auto-rotation otherwise
    const s = { ang: o.ang || 0.7, el: o.el || 0.45, dist: o.dist || 7, ty: o.ty || 1, idle: 0 };
    const off = drag(canvas, (dx, dy) => { s.ang -= dx * 0.008; s.el = clamp(s.el + dy * 0.005, 0.08, 1.2); s.idle = 2; });
    s.update = (dt, auto) => {
      if (s.idle > 0) s.idle -= dt; else if (auto !== false) s.ang += dt * 0.12;
      cam.position.set(Math.sin(s.ang) * Math.cos(s.el) * s.dist, s.ty + Math.sin(s.el) * s.dist, Math.cos(s.ang) * Math.cos(s.el) * s.dist); cam.lookAt(0, s.ty, 0);
    };
    s.off = off; return s;
  }
  function floorDisc(T, scene, r) { const f = new T.Mesh(new T.CircleGeometry(r, 64), new T.MeshBasicMaterial({ color: 0x1c1f2b, transparent: true, opacity: 0.55 })); f.rotation.x = -Math.PI / 2; scene.add(f); return f; }

  /* ───────── Earthquake-resistant platform: base box (Arduino + batteries) → 2 servos at 90° → LED panel → tower ───────── */
  PW.platform = function (canvas, o) {
    o = o || {};
    const g = gl(canvas, 30), T = g.T, scene = g.scene, cam = g.cam; lights(T, scene);
    const mdf = mat(T, 0xb88c5c, { roughness: 0.85 }), mdfDark = mat(T, 0x7a5634, { roughness: 0.9 }), white = mat(T, 0xf0f0f0, { roughness: 0.45 });
    const black = mat(T, 0x1b1d24, { roughness: 0.5 }), horn = mat(T, 0xf4f4f5, { roughness: 0.4 }), pcb = mat(T, 0x13806a, { roughness: 0.5 });
    floorDisc(T, scene, 2.1);
    const quake = new T.Group(); scene.add(quake); // everything the ground moves
    // white plinth + laser-cut MDF box holding the Arduino and the batteries
    block(T, quake, 1.72, 0.06, 1.72, white, 0, 0.03, 0);
    const BW = 1.5, BH = 0.72, by = 0.06;
    outline(T, block(T, quake, BW, BH, BW, mdf, 0, by + BH / 2, 0), 0x5e4127, 0.8);
    for (let i = 0; i < 7; i += 2) { // finger joints on the top edges
      const u = -BW / 2 + (i + 0.5) * BW / 7;
      [[u, BW / 2], [u, -BW / 2]].forEach(([x, z]) => { block(T, quake, BW / 7, 0.05, 0.012, mdfDark, x, by + BH - 0.05, z + Math.sign(z) * 0.004); block(T, quake, 0.012, 0.05, BW / 7, mdfDark, z + Math.sign(z) * 0.004, by + BH - 0.05, x); });
    }
    block(T, quake, 0.62, 0.3, 0.01, black, 0, by + 0.34, BW / 2 + 0.006);
    block(T, quake, 0.46, 0.2, 0.01, pcb, -0.02, by + 0.34, BW / 2 + 0.012);
    [-0.12, 0.08].forEach((x) => block(T, quake, 0.14, 0.03, 0.01, black, x, by + 0.41, BW / 2 + 0.018));
    function servo(parent, x, y, z, rotY) { // body, mounting ears, white horn on the output shaft (local +z)
      const s = new T.Group(); s.position.set(x, y, z); s.rotation.y = rotY || 0; parent.add(s);
      outline(T, block(T, s, 0.5, 0.26, 0.24, black), 0x3f4457, 0.9);
      block(T, s, 0.68, 0.03, 0.24, black, 0, 0.07, 0);
      const h = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.04, 24), horn); h.rotation.x = Math.PI / 2; h.position.set(0.1, 0.03, 0.14); s.add(h);
      block(T, s, 0.36, 0.05, 0.03, horn, 0.1, 0.03, 0.16);
      return s;
    }
    const top = by + BH;
    servo(quake, 0, top + 0.13, 0); // servo 1: shaft along z → tilts about z
    const pivot1 = new T.Group(); pivot1.position.set(0.1, top + 0.16, 0); quake.add(pivot1);
    block(T, pivot1, 0.34, 0.42, 0.03, white, -0.1, 0.19, 0.2);
    block(T, pivot1, 0.58, 0.03, 0.46, white, -0.1, 0.41, 0.0);
    servo(pivot1, -0.1, 0.56, 0, Math.PI / 2); // servo 2, turned 90°: shaft along x → tilts about x
    const pivot2 = new T.Group(); pivot2.position.set(0.04, 0.59, -0.1); pivot1.add(pivot2);
    block(T, pivot2, 0.03, 0.34, 0.34, white, 0.06, 0.14, 0.1);
    // LED panel (white 3D-printed tray, RGB matrix) + model tower
    const panel = new T.Group(); panel.position.set(-0.14, 0.34, 0.1); pivot2.add(panel);
    outline(T, block(T, panel, 1.6, 0.06, 1.6, white, 0, 0, 0), 0xd4d4d8, 0.9);
    const NL = 13, lp = new Float32Array(NL * NL * 3), lc = new Float32Array(NL * NL * 3);
    for (let i = 0; i < NL; i++) for (let j = 0; j < NL; j++) { const k = (i * NL + j) * 3; lp[k] = -0.72 + i * 1.44 / (NL - 1); lp[k + 1] = 0.045; lp[k + 2] = -0.72 + j * 1.44 / (NL - 1); }
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('color', new T.BufferAttribute(lc, 3));
    panel.add(new T.Points(lg, new T.PointsMaterial({ size: 0.11, map: dotTex(T), vertexColors: true, transparent: true, depthWrite: false })));
    const TH = 1.9, tg = new T.BoxGeometry(0.5, TH, 0.34, 1, 30, 1), tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) { const u = (tp.getY(i) + TH / 2) / TH, s = 1 - 0.3 * Math.sin(Math.PI * Math.min(1, u * 1.05)); tp.setX(i, tp.getX(i) * s); tp.setZ(i, tp.getZ(i) * (0.9 + 0.1 * s)); }
    tg.computeVertexNormals();
    const towerG = new T.Group(); towerG.position.y = 0.03; panel.add(towerG); // pivot at the tower's base, so it can topple
    const tower = new T.Mesh(tg, white); tower.position.y = TH / 2; towerG.add(tower);
    block(T, towerG, 0.5, 0.012, 0.35, mat(T, 0xc9c9cc), 0, TH * 0.56, 0);
    outline(T, block(T, towerG, 0.52, 0.26, 0.36, mat(T, 0xfafafa, { transparent: true, opacity: 0.85, roughness: 0.3 }), 0, TH + 0.13, 0), 0xd4d4d8, 0.8);
    let fall = null, over = 0; const fdir = new T.Vector3();
    function topple(tx, tz) { // slide off the tilted panel, rotate 90° towards the low side, land on the floor
      const dx = -tz, dz = tx, l = Math.hypot(dx, dz) || 1; fdir.set(dx / l, 0, dz / l);
      scene.attach(towerG);
      const p0 = towerG.position.clone();
      fall = { t: 0, p0, q0: towerG.quaternion.clone(), p1: new T.Vector3(p0.x + fdir.x * 0.95, 0.2, p0.z + fdir.z * 0.95), q1: new T.Quaternion().setFromAxisAngle(new T.Vector3(fdir.z, 0, -fdir.x), Math.PI / 2) };
    }
    function rebuild() { if (!fall) return; scene.remove(towerG); panel.add(towerG); towerG.position.set(0, 0.03, 0); towerG.quaternion.identity(); fall = null; over = 0; }
    const cams = orbiter(canvas, cam, { ang: 0.75, el: 0.3, dist: 9.2, ty: 1.95 });
    let t = 0, qa = 0, stab = o.stab !== false, s1 = 0, s2 = 0, mx = 0, mz = 0, acc = 0; const col = new T.Color();
    const stop = loop(canvas, (dt) => {
      t += dt; qa *= Math.pow(0.45, dt); if (qa < 0.003) qa = 0;
      // the ground tilts and shakes; with the stabilizer on, each servo turns against the tilt on its own axis
      const gx = qa * 0.2 * (Math.sin(t * 7.3) * 0.6 + Math.sin(t * 12.9 + 1) * 0.4), gz = qa * 0.2 * (Math.sin(t * 6.1 + 2) * 0.6 + Math.sin(t * 15.7) * 0.4);
      quake.rotation.set(gx, 0, gz); quake.position.set(qa * 0.05 * Math.sin(t * 31), 0, qa * 0.05 * Math.sin(t * 27 + 1));
      const k = Math.min(1, dt * 14), vmax = 3.2 * dt; mx += (gx + s2 - mx) * k; mz += (gz + s1 - mz) * k; // MPU6050 reading (filtered), servo speed limit
      s1 += clamp((stab ? s1 - mz * 1.6 : 0) - s1, -vmax, vmax); s2 += clamp((stab ? s2 - mx * 1.6 : 0) - s2, -vmax, vmax);
      pivot1.rotation.z = s1; pivot2.rotation.x = s2;
      const tx = gx + s2, tz = gz + s1; // panel tilt; past ~6° for a moment during a quake, the tower goes over
      if (!fall) { over = qa > 0.15 && Math.hypot(tx, tz) > 0.1 ? over + dt : 0; if (over > 0.12) topple(tx, tz); }
      if (fall) {
        fall.t += dt; const f = clamp(fall.t / 1.05, 0, 1), r = Math.min(1, f * 1.35);
        towerG.quaternion.copy(fall.q0).slerp(fall.q1, r * r);
        towerG.position.set(lerp(fall.p0.x, fall.p1.x, f), lerp(fall.p0.y, fall.p1.y, f * f), lerp(fall.p0.z, fall.p1.z, f));
      }
      for (let i = 0; i < NL * NL; i++) { col.setHSL((((i / NL | 0) + (i % NL)) / (NL * 2.2) + t * 0.08) % 1, 1, 0.5); lc[i * 3] = col.r; lc[i * 3 + 1] = col.g; lc[i * 3 + 2] = col.b; }
      lg.attributes.color.needsUpdate = true;
      cams.update(dt); g.r.render(scene, cam);
      acc += dt; if (acc > 0.1 && o.onState) { acc = 0; o.onState({ pitch: tx * 57.3, roll: tz * 57.3, quake: qa > 0.05, stab, fallen: !!fall }); }
    });
    return { quake(s) { rebuild(); qa = Math.max(qa, s || 1); }, setStab(b) { stab = b; if (b) rebuild(); }, destroy() { stop(); cams.off(); g.dispose(); } };
  };

  /* ───────── Hexapod: laser-cut box, gear train, 2 × 3 crank-driven legs in a tripod gait ───────── */
  function gearGeo(T, r, teeth, depth) {
    const s = new T.Shape(), n = teeth * 4;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, rr = (i % 4 < 2) ? r + 0.03 : r - 0.02; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const hole = new T.Path(); hole.absarc(0, 0, 0.03, 0, Math.PI * 2, true); s.holes.push(hole);
    const geo = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false }); geo.translate(0, 0, -depth / 2); return geo;
  }
  PW.hexapod = function (canvas, o) {
    o = o || {}; const out = o.out || (() => {});
    const g = gl(canvas, 30), T = g.T, scene = g.scene, cam = g.cam; lights(T, scene);
    const white = mat(T, 0xe6e6e8, { roughness: 0.75 }), green = mat(T, 0x3ee865, { roughness: 0.35, emissive: 0x0d4a1a, emissiveIntensity: 0.7 }), wood = mat(T, 0x9c6f45, { roughness: 0.8 }), dark = mat(T, 0x2a2d38);
    const L = 2.6, W = 1.1, H = 0.95, th = 0.05;
    const grid = new T.GridHelper(40, 80, 0x2a2f3d, 0x1f2330); scene.add(grid);
    const body = new T.Group(); scene.add(body);
    const panelE = (m) => outline(T, m, 0x9ca3af, 0.8);
    [1, -1].forEach((sd) => panelE(block(T, body, L, H, th, white, 0, H / 2, sd * (W / 2 - th / 2))));
    [1, -1].forEach((sd) => panelE(block(T, body, th, H, W - 2 * th, white, sd * (L / 2 - th / 2), H / 2, 0)));
    panelE(block(T, body, th, H * 0.85, W - 2 * th, white, 0.1, H * 0.42, 0));
    panelE(block(T, body, L, th, W, white, 0, th / 2, 0));
    [1, -1].forEach((sd) => panelE(block(T, body, L, th, 0.14, white, 0, H - th / 2, sd * (W / 2 - 0.07))));
    [-1, 0.08, 1].forEach((x) => panelE(block(T, body, 0.14, th, W, white, x * (L / 2 - 0.07), H - th / 2, 0)));
    // gear train inside (motor pinion → … → crank shaft), alternating green acrylic and wood
    const gears = [], radii = [0.1, 0.22, 0.12, 0.22, 0.12, 0.2]; let gx = -0.95;
    radii.forEach((r, i) => {
      if (i) gx += radii[i - 1] + r + 0.02;
      const m = new T.Mesh(gearGeo(T, r, Math.round(r * 60), 0.04), i % 2 ? green : wood); m.position.set(gx, 0.5, 0.28); body.add(m); gears.push({ m, r });
    });
    block(T, body, 0.36, 0.2, 0.22, dark, -0.95, 0.5, 0.05);
    const wire = new T.Mesh(new T.TorusGeometry(0.12, 0.012, 6, 20, Math.PI * 1.3), mat(T, 0xd12f2f)); wire.position.set(-0.7, 0.3, 0.05); wire.rotation.y = 1.2; body.add(wire);
    // legs: crank disc + pin on the side panel, leg slides through a pin in a vertical slot above
    const legs = [], D = 0.42, LF = 0.8, RC = 0.11;
    [-0.85, 0, 0.85].forEach((x, k) => [1, -1].forEach((sd) => {
      const z = sd * (W / 2 + 0.04), crank = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 0.05, 28), wood); crank.rotation.x = Math.PI / 2; crank.position.set(x, 0.4, z); body.add(crank);
      const pin = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.16, 10), wood); pin.rotation.x = Math.PI / 2; body.add(pin);
      const slot = block(T, body, 0.05, 0.3, 0.01, dark, x, 0.84, sd * (W / 2 + 0.001));
      const leg = new T.Mesh(new T.BoxGeometry(0.09, 1, 0.035), green); body.add(leg);
      legs.push({ x, z, sd, crank, pin, leg, slot, ph: (k + (sd > 0 ? 0 : 1)) % 2 ? Math.PI : 0 });
    }));
    const legAt = (l, a) => { // crank angle a → pin P, slot pin Q, foot F (all in the side plane)
      const px = l.x + Math.cos(a) * RC, py = 0.4 + Math.sin(a) * RC, qx = l.x, qy = py + Math.sqrt(D * D - (px - qx) * (px - qx));
      const ux = (px - qx) / D, uy = (py - qy) / D; return { px, py, qx, qy, fx: px + ux * LF, fy: py + uy * LF };
    };
    let lift = 0; for (let a = 0; a < 6.3; a += 0.05) lift = Math.max(lift, -legAt(legs[0], a).fy);
    body.position.y = lift + 0.01;
    const up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
    const RATIOS = [3, 5, 9]; let ri = 1, t = 0, crankA = 0, dist = 0;
    const cams = orbiter(canvas, cam, { ang: 0.9, el: 0.35, dist: 7.2, ty: 0.75 });
    const stop = loop(canvas, (dt) => {
      t += dt; const motor = 22, w = motor / RATIOS[ri] * 0.9; crankA -= w * dt;
      gears.forEach((q, i) => { q.m.rotation.z = (i % 2 ? 1 : -1) * crankA * RATIOS[ri] * (q.r / 0.2) / (i + 1); });
      let minY = 1e9, vx = 0;
      legs.forEach((l) => {
        const a = crankA + l.ph, p = legAt(l, a), p2 = legAt(l, a - 0.01);
        l.crank.rotation.y = a; l.pin.position.set(p.px, p.py, l.z + l.sd * 0.05);
        dir.set(p.fx - p.qx, p.fy - p.qy, 0); const len = dir.length() + 0.12; dir.normalize();
        l.leg.scale.set(1, len, 1); l.leg.quaternion.setFromUnitVectors(up, dir);
        l.leg.position.set((p.qx + p.fx) / 2 - dir.x * 0.03, (p.qy + p.fy) / 2, l.z + l.sd * 0.08);
        if (p.fy < minY) { minY = p.fy; vx = (p2.fx - p.fx) / 0.01 * w; }
      });
      dist += vx * dt; grid.position.x = ((dist % 0.5) + 0.5) % 0.5; // a planted foot moves with the ground
      cams.update(dt); g.r.render(scene, cam);
    });
    const info = () => { out('ratio', '1:' + RATIOS[ri]); out('note', 'legs ' + (RATIOS[ri] === 3 ? 'fast, weak' : RATIOS[ri] === 9 ? 'slow, strong' : 'balanced') + ' · torque ×' + RATIOS[ri]); };
    return { ratio() { ri = (ri + 1) % RATIOS.length; info(); }, destroy() { stop(); cams.off(); g.dispose(); } };
  };

  /* ───────── Airbus H160 (SolidWorks-style): fuselage, 5-blade Blue Edge rotor, fenestron, exploded view ───────── */
  PW.h160 = function (canvas, o) {
    o = o || {}; const out = o.out || (() => {});
    const g = gl(canvas, 30), T = g.T, scene = g.scene, cam = g.cam; lights(T, scene);
    const skin = mat(T, 0xbac0d6, { metalness: 0.3, roughness: 0.42 }), blade = mat(T, 0x2b2e38, { roughness: 0.5 }), glass = mat(T, 0x283049, { metalness: 0.6, roughness: 0.15 }), tyre = mat(T, 0x16181f);
    const eM = new T.LineBasicMaterial({ color: 0x0c0d12, transparent: true, opacity: 0.55 });
    const ed = (m, thr) => { m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry, thr || 35), eM)); return m; };
    floorDisc(T, scene, 3);
    const root = new T.Group(); root.position.y = 0.72; scene.add(root);
    const parts = [];
    const part = (obj, off) => { root.add(obj); parts.push({ obj, home: obj.position.clone(), off: new T.Vector3(off[0], off[1], off[2]) }); return obj; };
    const prof = [[0.001, -1.95], [0.2, -1.88], [0.38, -1.66], [0.5, -1.3], [0.58, -0.8], [0.6, -0.2], [0.55, 0.3], [0.4, 0.75], [0.24, 1.15], [0.15, 1.6], [0.13, 2.05], [0.001, 2.12]];
    const fus = ed(new T.Mesh(new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 40), skin), 50); fus.rotation.z = -Math.PI / 2; fus.scale.set(1, 1, 0.8); part(fus, [0, 0, 0]);
    const wind = new T.Mesh(new T.SphereGeometry(0.5, 32, 16), glass); wind.scale.set(0.95, 0.55, 0.78); wind.position.set(-1.05, 0.2, 0); part(wind, [-0.9, 0.35, 0]);
    [-0.35, 0.05].forEach((x) => [1, -1].forEach((sd) => { const w = block(T, root, 0.3, 0.2, 0.01, glass, x, 0.12, sd * 0.47); root.remove(w); part(w, [0, 0, sd * 0.6]); }));
    const cowl = ed(new T.Mesh(new T.SphereGeometry(1, 32, 16), skin)); cowl.scale.set(0.95, 0.24, 0.42); cowl.position.set(0.1, 0.52, 0); part(cowl, [0, 0.55, 0]);
    const mast = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.35, 16), blade); mast.position.set(-0.05, 0.85, 0); part(mast, [0, 0.9, 0]);
    const rotor = new T.Group(); rotor.position.set(-0.05, 1.04, 0); part(rotor, [0, 1.4, 0]);
    rotor.add(ed(new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.1, 30), skin)));
    for (let k = 0; k < 5; k++) { // Blue Edge blade: straight root, forward sweep, then swept-back tip
      const b = new T.Group(); b.rotation.y = k * Math.PI * 2 / 5; rotor.add(b);
      block(T, b, 1.35, 0.02, 0.15, blade, 0.85, 0, 0);
      const s2 = block(T, b, 0.5, 0.02, 0.13, blade, 1.72, 0, -0.06); s2.rotation.y = 0.25;
      const s3 = block(T, b, 0.36, 0.02, 0.1, blade, 2.1, 0, 0.0); s3.rotation.y = -0.4;
    }
    const fen = new T.Group(); fen.position.set(2.05, 0.18, 0); part(fen, [1.1, 0, 0]);
    fen.add(ed(new T.Mesh(new T.TorusGeometry(0.3, 0.1, 14, 40), skin)));
    const fan = new T.Group(); fen.add(fan);
    for (let k = 0; k < 10; k++) { const f = block(T, fan, 0.04, 0.26, 0.015, blade, 0, 0.13, 0); f.parent.remove(f); const p = new T.Group(); p.rotation.z = k * Math.PI / 5; p.add(f); fan.add(p); }
    const fin = ed(block(T, root, 0.42, 0.72, 0.05, skin, 2.18, 0.72, 0)); fin.rotation.z = -0.35; root.remove(fin); part(fin, [1.2, 0.7, 0]);
    const stab = ed(block(T, root, 0.2, 0.03, 1.1, skin, 1.55, 0.3, 0)); root.remove(stab); part(stab, [0.9, -0.35, 0]);
    [1, -1].forEach((sd) => { const e = ed(block(T, root, 0.2, 0.18, 0.02, skin, 1.55, 0.36, sd * 0.55)); root.remove(e); part(e, [0.9, -0.35, sd * 0.35]); });
    const wheel = (x, z) => { const gr = new T.Group(); gr.position.set(x, -0.6, z); const w = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08, 20), tyre); w.rotation.x = Math.PI / 2; gr.add(w); block(T, gr, 0.04, 0.25, 0.04, blade, 0, 0.14, 0); return gr; };
    [[-1.2, 0.08], [-1.2, -0.08], [0.15, 0.42], [0.15, -0.42]].forEach(([x, z]) => part(wheel(x, z), [0, -0.55, z * 0.8]));
    [1, -1].forEach((sd) => { const sp = ed(block(T, root, 0.55, 0.14, 0.14, skin, 0.15, -0.38, sd * 0.4)); root.remove(sp); part(sp, [0, -0.35, sd * 0.35]); });
    let t = 0, ex = 0, exT = 0, spin = 7, spinT = 7;
    const cams = orbiter(canvas, cam, { ang: -0.75, el: 0.28, dist: 8.2, ty: 0.9 });
    const stop = loop(canvas, (dt) => {
      t += dt; ex = lerp(ex, exT, Math.min(1, dt * 3)); spin = lerp(spin, spinT, Math.min(1, dt * 1.5));
      parts.forEach((p) => p.obj.position.copy(p.home).addScaledVector(p.off, ex));
      rotor.rotation.y += spin * dt; fan.rotation.z += spin * 3 * dt;
      cams.update(dt); g.r.render(scene, cam);
    });
    return {
      explode() { exT = exT ? 0 : 1; out('explode', exT ? 'Assemble' : 'Exploded view'); },
      rotor() { spinT = spinT ? 0 : 7; out('rotor', spinT ? 'Rotor ON' : 'Rotor OFF'); },
      destroy() { stop(); cams.off(); g.dispose(); }
    };
  };

  /* ───────── Wooden rocket puzzle: CNC toolpath → loose pieces → slotted assembly ───────── */
  PW.rocket = function (canvas, o) {
    o = o || {}; const out = o.out || (() => {});
    const g = gl(canvas, 30), T = g.T, scene = g.scene, cam = g.cam; lights(T, scene);
    const mdf = mat(T, 0xb08459, { roughness: 0.92 }), edgeCol = 0x4a2f17, TH = 0.045, HB = 2.7, Y0 = 0.5;
    const R = (u) => (u < 0.28 ? 0.42 + 0.2 * Math.sin((u / 0.28) * Math.PI / 2) : 0.62 * Math.pow(Math.max(0, Math.cos(((u - 0.28) / 0.72) * Math.PI / 2)), 0.75));
    floorDisc(T, scene, 3.4);
    const board = new T.Mesh(new T.BoxGeometry(7.2, 0.06, 4.6), mat(T, 0x6b5238, { roughness: 0.95, transparent: true, opacity: 0 })); board.position.y = -0.03; scene.add(board);
    const pieces = []; // each: mesh, outline points (flat, local 2D), built / parts / flat poses
    const pose = (x, y, z, rx, ry) => ({ p: new T.Vector3(x, y, z), q: new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0)) });
    function plate(shape, built, parts) {
      const geo = new T.ExtrudeGeometry(shape, { depth: TH, bevelEnabled: false, curveSegments: 24 }); geo.translate(0, 0, -TH / 2);
      const m = outline(T, new T.Mesh(geo, mdf), edgeCol, 0.9, 30); scene.add(m);
      pieces.push({ m, pts: shape.getPoints(40), built, parts }); return m;
    }
    const spine = () => { const s = new T.Shape(); for (let i = 0; i <= 40; i++) { const u = i / 40; i ? s.lineTo(R(u) * 0.97, u * HB) : s.moveTo(R(0) * 0.97, 0); } for (let i = 40; i >= 0; i--) { const u = i / 40; s.lineTo(-R(u) * 0.97, u * HB); } return s; };
    plate(spine(), pose(0, Y0, 0), pose(-2.4, Y0 + 0.1, -0.4, 0, 0.5));
    plate(spine(), pose(0, Y0, 0, 0, Math.PI / 2), pose(2.4, Y0 + 0.1, -0.4, 0, Math.PI / 2 - 0.5));
    const fin = () => { const s = new T.Shape(); s.moveTo(0, 1.25); s.quadraticCurveTo(0.95, 1.05, 1.0, 0); s.lineTo(0.74, 0); s.quadraticCurveTo(0.64, 0.5, 0, 0.52); s.quadraticCurveTo(-0.64, 0.5, -0.74, 0); s.lineTo(-1.0, 0); s.quadraticCurveTo(-0.95, 1.05, 0, 1.25); return s; };
    plate(fin(), pose(0, 0, 0), pose(0, -0.1, 1.5, 0, 0));
    plate(fin(), pose(0, 0, 0, 0, Math.PI / 2), pose(0, -0.1, -1.5, 0, 0));
    const NR = 17;
    for (let k = 0; k < NR; k++) {
      const u = 0.03 + (k / (NR - 1)) * 0.88, r = R(u), m = outline(T, new T.Mesh(new T.CylinderGeometry(r, r, TH, 40), mdf), edgeCol, 0.9, 30); scene.add(m);
      const pts = []; for (let i = 0; i <= 40; i++) pts.push(new T.Vector2(Math.cos(i / 40 * Math.PI * 2) * r, Math.sin(i / 40 * Math.PI * 2) * r));
      const a = k * 0.9;
      pieces.push({ m, ring: true, pts, built: pose(0, Y0 + u * HB, 0), parts: pose(Math.cos(a) * 1.05, Y0 + 0.2 + u * HB * 1.25, Math.sin(a) * 1.05, 0.35, a) });
    }
    // flat layout on the CNC board: shelf packing by bounding box
    let cx = -3.4, cz = -2.1, rowH = 0; const path = [], marks = [];
    pieces.forEach((pc) => {
      const xs = pc.pts.map((p) => p.x), ys = pc.pts.map((p) => p.y), w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      if (cx + w > 3.5) { cx = -3.4; cz += rowH + 0.12; rowH = 0; }
      const ox = cx - Math.min(...xs), oz = cz - Math.min(...ys); cx += w + 0.12; rowH = Math.max(rowH, h);
      pc.flat = pc.ring ? pose(ox, TH / 2, oz) : pose(ox, TH / 2, oz, -Math.PI / 2, 0);
      if (!pc.ring) pc.flat.p.z = cz + Math.max(...ys); // laid flat, a plate's shape y maps to −z
      marks.push(path.length);
      pc.pts.forEach((p) => path.push(pc.ring ? new T.Vector3(ox + p.x, TH + 0.006, oz + p.y) : new T.Vector3(ox + p.x, TH + 0.006, pc.flat.p.z - p.y)));
    });
    const segs = []; for (let i = 0; i < pieces.length; i++) { const a = marks[i], b = i + 1 < pieces.length ? marks[i + 1] : path.length; for (let k = a; k < b - 1; k++) segs.push(path[k], path[k + 1]); }
    const trail = new T.LineSegments(new T.BufferGeometry().setFromPoints(segs), new T.LineBasicMaterial({ color: 0xFFCC00 })); scene.add(trail);
    const tool = new T.Group(); scene.add(tool);
    const bit = new T.Mesh(new T.ConeGeometry(0.06, 0.22, 16), mat(T, 0xd4d4d8, { metalness: 0.8, roughness: 0.2 })); bit.rotation.x = Math.PI; bit.position.y = 0.11; tool.add(bit);
    block(T, tool, 0.16, 0.5, 0.16, mat(T, 0x3f4457), 0, 0.47, 0);
    const spark = new T.PointLight(0xffcc00, 0, 1.2); spark.position.y = 0.05; tool.add(spark);
    const STEPS = { built: ['CNC cut', 'the finished puzzle · drag to orbit'], cnc: ['Unpack pieces', 'G-code toolpath on the CNC'], parts: ['Assemble', 'every piece before assembly'] };
    let state = 'built', t = 0, t0 = -9, cutT = 0;
    pieces.forEach((pc) => { pc.m.position.copy(pc.built.p); pc.m.quaternion.copy(pc.built.q); pc.from = pose(0, 0, 0); });
    function go(s) {
      state = s; t0 = t; cutT = 0;
      pieces.forEach((pc) => { pc.from = { p: pc.m.position.clone(), q: pc.m.quaternion.clone() }; });
      out('step', STEPS[s][0]); out('note', STEPS[s][1]);
    }
    const cams = orbiter(canvas, cam, { ang: 0.6, el: 0.25, dist: 8, ty: 1.4 });
    const stop = loop(canvas, (dt) => {
      t += dt; const cnc = state === 'cnc';
      pieces.forEach((pc, i) => {
        const to = pc[state === 'cnc' ? 'flat' : state], e = ease(clamp((t - t0 - (state === 'built' ? (pieces.length - i) : i) * 0.06) / 0.9, 0, 1));
        pc.m.position.lerpVectors(pc.from.p, to.p, e); if (state === 'built' || cnc) pc.m.position.y += Math.sin(e * Math.PI) * 0.5;
        pc.m.quaternion.copy(pc.from.q).slerp(to.q, e);
      });
      board.material.opacity = lerp(board.material.opacity, cnc ? 1 : 0, Math.min(1, dt * 4)); board.visible = board.material.opacity > 0.02;
      if (cnc && t - t0 > 1.2) cutT = Math.min(segs.length, cutT + dt * 60);
      trail.visible = cnc && cutT > 0; trail.geometry.setDrawRange(0, Math.floor(cutT / 2) * 2);
      tool.visible = cnc; const tp = segs[Math.min(segs.length - 1, Math.floor(cutT))] || segs[0]; if (tp) tool.position.set(tp.x, tp.y + (cutT >= segs.length ? 0.4 : 0), tp.z);
      spark.intensity = cnc && cutT < segs.length ? 1.5 : 0;
      cams.dist = lerp(cams.dist, cnc ? 14 : state === 'parts' ? 9.5 : 8, Math.min(1, dt * 2)); cams.el = lerp(cams.el, cnc ? 1.1 : cams.el, Math.min(1, dt * 2)); cams.ty = lerp(cams.ty, cnc ? 0 : 1.4, Math.min(1, dt * 2));
      if (!cnc && cams.idle <= 0) cams.el = lerp(cams.el, 0.25, Math.min(1, dt));
      cams.update(dt); g.r.render(scene, cam);
    });
    return { step() { go(state === 'built' ? 'cnc' : state === 'cnc' ? 'parts' : 'built'); }, destroy() { stop(); cams.off(); g.dispose(); } };
  };

  /* ───────── "What I build": figurative particle shapes ─────────
     Each builder fills a point collector. Roles drive per-frame animation:
     0 static · 1 expanding wave ring · 2 pulse travelling along u · 3 blink · 4 scan line · 5 glow breathing */
  function Collector(n, R) {
    this.n = n; this.i = 0; this.R = R;
    this.p = new Float32Array(n * 3); this.c = new Float32Array(n * 3); this.role = new Uint8Array(n);
    this.u = new Float32Array(n); this.v = new Float32Array(n); this.w = new Float32Array(n);
  }
  Collector.prototype.add = function (x, y, z, col, b, role, u, v, w) {
    if (this.i >= this.n) return; const k = this.i++, j = k * 3, br = (b == null ? 1 : b) * (0.62 + this.R() * 0.38);
    this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z;
    this.c[j] = col.r * br; this.c[j + 1] = col.g * br; this.c[j + 2] = col.b * br;
    this.role[k] = role || 0; this.u[k] = u || 0; this.v[k] = v || 0; this.w[k] = w || 0;
  };
  Collector.prototype.left = function () { return this.n - this.i; };
  Collector.prototype.fill = function () { // duplicate random existing points so every particle has a home
    const m = this.i; if (!m) return;
    while (this.i < this.n) { const s = Math.floor(this.R() * m), j = s * 3, k = this.i++, q = k * 3; for (let a = 0; a < 3; a++) { this.p[q + a] = this.p[j + a] + (this.R() - 0.5) * 0.02; this.c[q + a] = this.c[j + a] * 0.6; } this.role[k] = this.role[s]; this.u[k] = this.u[s]; this.v[k] = this.v[s]; this.w[k] = this.w[s]; }
  };
  function seg(C, a, b, n, col, bri, role, u0, u1, v) { for (let i = 0; i < n; i++) { const u = C.R(); C.add(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), col, bri, role, u0 != null ? lerp(u0, u1, u) : u, v); } }
  function ball(C, c, r, n, col, bri, role, u, v) { for (let i = 0; i < n; i++) { const th = C.R() * 6.283, ph = Math.acos(2 * C.R() - 1), rr = r * (0.75 + C.R() * 0.25); C.add(c[0] + rr * Math.sin(ph) * Math.cos(th), c[1] + rr * Math.cos(ph), c[2] + rr * Math.sin(ph) * Math.sin(th), col, bri, role, u, v); } }
  function poly(C, pts, n, col, bri, role, closed) { // points along a polyline (closed optional), evenly by length
    const segs = []; let L = 0; for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); segs.push([a, b, l, L]); L += l; }
    for (let i = 0; i < n; i++) { const d = C.R() * L; const s = segs.find((q) => d <= q[3] + q[2]) || segs[segs.length - 1], u = (d - s[3]) / s[2]; C.add(lerp(s[0][0], s[1][0], u), lerp(s[0][1], s[1][1], u), lerp(s[0][2], s[1][2], u), col, bri, role, d / L); }
  }
  function rrect(cx, cy, hw, hh, r, map) { // rounded-rect outline as polyline, mapped to 3D
    const out = [], seg = 5; [[hw - r, hh - r, 0], [-hw + r, hh - r, 1], [-hw + r, -hh + r, 2], [hw - r, -hh + r, 3]].forEach(([x, y, q]) => { for (let k = 0; k <= seg; k++) { const a = (q + k / seg) * Math.PI / 2; out.push(map(cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r)); } });
    return out;
  }

  const SHAPES = {
    neural(C, A, W) { // layered network with signals flowing input → output
      const L = [4, 6, 6, 3], X = [-1.55, -0.52, 0.52, 1.55], nodes = L.map((n, l) => Array.from({ length: n }, (_, k) => [X[l], (k - (n - 1) / 2) * (n > 4 ? 0.44 : 0.56), (k % 2 ? 0.24 : -0.24) * (l % 2 ? 1 : -1)]));
      const nn = nodes.flat().length, perNode = Math.floor(C.n * 0.3 / nn);
      nodes.forEach((layer, l) => layer.forEach((p) => ball(C, p, l === 0 || l === 3 ? 0.11 : 0.095, perNode, A, 1.25, 5)));
      const edges = []; for (let l = 0; l < 3; l++) nodes[l].forEach((a) => nodes[l + 1].forEach((b) => edges.push([a, b, l])));
      const per = Math.floor(C.left() / edges.length);
      edges.forEach(([a, b, l]) => seg(C, a, b, per, W, 0.5, 2, l / 3, (l + 1) / 3, C.R() * 0.2));
    },
    stack(C, A, W) { // full stack: browser on top, API server in the middle, database at the bottom; data flows up
      const col = (h) => new THREE.Color(h), n = (f) => Math.floor(C.n * f);
      const dbY = [-1.36, -1.12, -0.88], r = 0.6;
      dbY.forEach((y, k) => { for (let i = 0; i < n(0.05); i++) { const a = C.R() * 6.283; C.add(Math.cos(a) * r, y, Math.sin(a) * r, A, k === 2 ? 1.15 : 0.85); } });
      for (let i = 0; i < n(0.05); i++) { const a = C.R() * 6.283; C.add(Math.cos(a) * r, lerp(dbY[0], dbY[2], C.R()), Math.sin(a) * r, A, 0.3); }
      for (let i = 0; i < n(0.035); i++) { const a = C.R() * 6.283, rr = Math.sqrt(C.R()) * r; C.add(Math.cos(a) * rr, dbY[2], Math.sin(a) * rr, A, 0.28); }
      const bx = 0.82, y0 = -0.46, y1 = 0.06, bz = 0.42, V = [[-bx, y0, -bz], [bx, y0, -bz], [bx, y0, bz], [-bx, y0, bz], [-bx, y1, -bz], [bx, y1, -bz], [bx, y1, bz], [-bx, y1, bz]];
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => seg(C, V[a], V[b], Math.floor(n(0.15) / 12), W, 0.9));
      [-0.3, -0.12].forEach((y) => seg(C, [-0.66, y, bz], [0.2, y, bz], n(0.02), W, 0.55));
      [[0.44, -0.3], [0.6, -0.3], [0.44, -0.12], [0.6, -0.12]].forEach(([x, y], i) => ball(C, [x, y, bz], 0.03, 26, i % 2 ? A : col('#34d399'), 1.4, 3));
      const wy0 = 0.34, wy1 = 1.6, wx = 1.12, face = (x, y) => [x, y, 0];
      poly(C, rrect(0, (wy0 + wy1) / 2, wx, (wy1 - wy0) / 2, 0.07, face), n(0.1), W, 1, 0, true);
      seg(C, [-wx, 1.4, 0], [wx, 1.4, 0], n(0.02), W, 0.6);
      ['#fb7185', '#fbbf24', '#34d399'].forEach((h, i) => ball(C, [-1.0 + i * 0.09, 1.5, 0], 0.024, 22, col(h), 1.2));
      poly(C, rrect(0.12, 1.5, 0.55, 0.035, 0.03, face), n(0.02), W, 0.45, 0, true);
      for (let i = 0; i < n(0.05); i++) C.add(lerp(-0.96, 0.18, C.R()), lerp(1.02, 1.3, C.R()), 0, A, 0.5);
      poly(C, rrect(0.6, 1.16, 0.34, 0.14, 0.02, face), n(0.025), A, 0.9, 0, true);
      [-0.65, 0, 0.65].forEach((x) => { poly(C, rrect(x, 0.66, 0.28, 0.2, 0.03, face), n(0.03), A, 0.85, 0, true); seg(C, [x - 0.2, 0.62, 0], [x + 0.12, 0.62, 0], n(0.006), W, 0.5); });
      const per = Math.floor(C.left() / 4);
      [-0.36, 0.36].forEach((x, i) => { seg(C, [x, dbY[2], 0], [x, y0, 0], per, A, 0.7, 2, 0, 1, i * 0.5); seg(C, [x, y1, 0], [x, wy0, 0], per, A, 0.7, 2, 0, 1, i * 0.5 + 0.25); });
    },
    tree(C, A, W) { // 3D search tree, highlighted root → leaf path
      const Ys = [1.3, 0.48, -0.34, -1.16], Rs = [0, 0.62, 1.05, 1.5], nodes = [];
      for (let l = 0; l < 4; l++) { const n = 1 << l; nodes.push(Array.from({ length: n }, (_, k) => { const a = (2 * Math.PI * (k + 0.5)) / n + 0.4; return [Math.cos(a) * Rs[l], Ys[l], Math.sin(a) * Rs[l]]; })); }
      const path = [0, 1, 2, 5], perNode = Math.floor(C.n * 0.3 / 15);
      nodes.forEach((layer, l) => layer.forEach((p, k) => ball(C, p, l === 0 ? 0.13 : 0.1, perNode, path[l] === k ? A : W, path[l] === k ? 1.3 : 0.9, path[l] === k ? 5 : 0)));
      const edges = []; for (let l = 1; l < 4; l++) nodes[l].forEach((p, k) => edges.push([nodes[l - 1][k >> 1], p, l, path[l] === k && path[l - 1] === k >> 1]));
      const hot = edges.filter((e) => e[3]).length, cold = edges.length - hot, budget = C.left(), ph = Math.floor(budget * 0.34 / hot), pc = Math.floor(budget * 0.66 / cold);
      edges.forEach(([a, b, l, on]) => on ? seg(C, a, b, ph, A, 0.9, 2, (l - 1) / 3, l / 3, 0) : seg(C, a, b, pc, W, 0.3));
    },
    chip(C, A, W) { // microcontroller with pins, die and circuit traces
      const s = 0.62, yT = 0.08;
      poly(C, rrect(0, 0, s, s, 0.04, (x, z) => [x, yT, z]), Math.floor(C.n * 0.09), W, 1, 0, true);
      poly(C, rrect(0, 0, s, s, 0.04, (x, z) => [x, -0.06, z]), Math.floor(C.n * 0.04), W, 0.45, 0, true);
      for (let i = 0; i < Math.floor(C.n * 0.07); i++) C.add((C.R() - 0.5) * 2 * s, yT, (C.R() - 0.5) * 2 * s, W, 0.2);
      poly(C, rrect(0, 0, 0.3, 0.3, 0.02, (x, z) => [x, yT + 0.005, z]), Math.floor(C.n * 0.06), A, 1.2, 5, true);
      for (let i = 0; i < Math.floor(C.n * 0.05); i++) C.add((C.R() - 0.5) * 0.52, yT + 0.005, (C.R() - 0.5) * 0.52, A, 0.55, 5);
      ball(C, [-0.48, yT + 0.01, -0.48], 0.035, 30, W, 1.3);
      const P = 8, sp = (2 * s) / (P + 1), pinN = Math.floor(C.n * 0.11 / (4 * P)), tr = []; let k = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => { for (let p = 1; p <= P; p++) {
        const o = -s + p * sp, bx = dx ? dx * s : o, bz = dz ? dz * s : o, ex = bx + dx * 0.16, ez = bz + dz * 0.16;
        seg(C, [bx, 0, bz], [ex, 0, ez], pinN, W, 0.9); seg(C, [ex, 0, ez], [ex, -0.12, ez], Math.ceil(pinN / 2), W, 0.9);
        const d1 = 0.12 + ((k * 37) % 11) / 30, side = p <= P / 2 ? -1 : 1, d2 = 0.1 + ((k * 13) % 7) / 25;
        const p1 = [ex + dx * d1, -0.12, ez + dz * d1], p2 = [p1[0] + dx * d2 + (dz ? side * d2 : 0), -0.12, p1[2] + dz * d2 + (dx ? side * d2 : 0)];
        tr.push([[ex, -0.12, ez], p1, p2]); k++;
      } });
      const per = Math.floor(C.left() / tr.length);
      tr.forEach(([a, b, c], i) => { const n1 = Math.floor(per * 0.55), seed = (i * 0.137) % 1; seg(C, a, b, n1, A, 0.75, 2, 0, 0.55, seed); seg(C, b, c, Math.floor(per * 0.3), A, 0.75, 2, 0.55, 1, seed);
        for (let j = 0; j < per - n1 - Math.floor(per * 0.3); j++) { const th = C.R() * 6.283; C.add(c[0] + Math.cos(th) * 0.035, -0.12, c[2] + Math.sin(th) * 0.035, W, 1.1); } });
    },
    tower(C, A, W) { // lattice radio mast broadcasting wave rings
      const yb = -1.35, yt = 0.42, rb = 0.5, rt = 0.07, legs = [0, 1, 2].map((i) => i * 2.094 + 0.5), at = (i, y) => { const f = (y - yb) / (yt - yb), r = lerp(rb, rt, f); return [Math.cos(legs[i]) * r, y, Math.sin(legs[i]) * r]; };
      const lp = Math.floor(C.n * 0.05); legs.forEach((_, i) => seg(C, at(i, yb), at(i, yt), lp, W, 0.95));
      const lv = 7, bp = Math.floor(C.n * 0.16 / (lv * 3 * 2));
      for (let j = 0; j < lv; j++) { const y1 = lerp(yb, yt, j / lv), y2 = lerp(yb, yt, (j + 1) / lv); for (let i = 0; i < 3; i++) { seg(C, at(i, y1), at((i + 1) % 3, y2), bp, W, 0.55); seg(C, at(i, y2), at((i + 1) % 3, y2), bp, W, 0.45); } }
      seg(C, [0, yt, 0], [0, 0.74, 0], 70, W, 1);
      ball(C, [0, 0.78, 0], 0.065, 110, A, 1.6, 5);
      [[0.18, 0.1], [-0.16, -0.25]].forEach(([dy, a]) => { const y = 0.05 + dy, r = lerp(rb, rt, (y - yb) / (yt - yb)) + 0.03; for (let i = 0; i < 80; i++) { const u = C.R() - 0.5, v = C.R() - 0.5; C.add(Math.cos(a) * r - Math.sin(a) * u * 0.18, y + v * 0.28, Math.sin(a) * r + Math.cos(a) * u * 0.18, A, 0.9); } });
      for (let i = 0; i < 160; i++) { const th = C.R() * 6.283; C.add(Math.cos(th) * 0.8, yb, Math.sin(th) * 0.8, W, 0.3); }
      const wv = C.left(); for (let i = 0; i < wv; i++) C.add(0, 0.78, 0, A, 1.1, 1, C.R() * 6.283, (i % 4) / 4, (C.R() + C.R() - 1) * 0.045);
    },
    shield(C, A, W) { // extruded shield: hex-mesh face, glowing check mark, scan line
      const sw = 0.98, d = 0.16, out = [], bez = (p0, p1, p2, p3, u) => { const m = 1 - u; return [m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0], m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1]]; };
      for (let i = 0; i <= 16; i++) { const u = i / 16; out.push([lerp(-sw, sw, u), 1.02 + Math.sin(u * Math.PI) * 0.16]); }
      for (let i = 1; i <= 24; i++) out.push(bez([sw, 1.02], [sw, 0.2], [0.62, -0.78], [0, -1.32], i / 24));
      for (let i = 1; i < 24; i++) out.push(bez([0, -1.32], [-0.62, -0.78], [-sw, 0.2], [-sw, 1.02], i / 24));
      const bulge = (x, y) => d + 0.16 * (1 - Math.min(1, (x * x) / (sw * sw))) * (1 - Math.max(0, -y) / 1.6);
      const inner = out.map(([x, y]) => [x * 0.8, y * 0.8 + 0.02]);
      const inside = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
      poly(C, out.map(([x, y]) => [x, y, bulge(x, y)]), Math.floor(C.n * 0.17), A, 1.15, 0, true);
      poly(C, out.map(([x, y]) => [x, y, -d]), Math.floor(C.n * 0.08), A, 0.55, 0, true);
      for (let i = 0; i < Math.floor(C.n * 0.08); i++) { const [x, y] = out[Math.floor(C.R() * out.length)]; C.add(x, y, lerp(-d, bulge(x, y), C.R()), A, 0.3); }
      poly(C, inner.map(([x, y]) => [x, y, bulge(x, y) + 0.01]), Math.floor(C.n * 0.09), W, 0.7, 0, true);
      const hs = 0.2, hexE = [];
      for (let row = -8; row <= 8; row++) for (let q = -6; q <= 6; q++) {
        const cx = q * hs * 1.732 + (row % 2 ? hs * 0.866 : 0), cy = row * hs * 1.5;
        for (let k = 0; k < 6; k++) { const a1 = Math.PI / 6 + k * Math.PI / 3, a2 = a1 + Math.PI / 3, p1 = [cx + Math.cos(a1) * hs, cy + Math.sin(a1) * hs], p2 = [cx + Math.cos(a2) * hs, cy + Math.sin(a2) * hs];
          if (inside(p1[0], p1[1], inner) && inside(p2[0], p2[1], inner)) hexE.push([p1, p2]); }
      }
      for (let i = 0, m = Math.floor(C.n * 0.26); i < m && hexE.length; i++) { const [p1, p2] = hexE[Math.floor(C.R() * hexE.length)], u = C.R(), x = lerp(p1[0], p2[0], u), y = lerp(p1[1], p2[1], u); C.add(x, y, bulge(x, y) + 0.005, A, 0.32, 4); }
      const ck = [[-0.36, 0.02], [-0.1, -0.26], [0.4, 0.34]];
      const n = C.left(); for (let i = 0; i < n; i++) { const f = C.R(), s = f < 0.35 ? 0 : 1, u = s ? (f - 0.35) / 0.65 : f / 0.35, a = ck[s], b = ck[s + 1], x = lerp(a[0], b[0], u) + (C.R() - 0.5) * 0.05, y = lerp(a[1], b[1], u) + (C.R() - 0.5) * 0.05; C.add(x, y, bulge(x, y) + 0.03, W, 1.5, 5); }
    }
  };
  const TILT = { neural: 0.12, stack: 0.3, tree: 0.22, chip: 0.78, tower: 0.5, shield: 0.06 };
  const FIT = { stack: [0.8, -0.2] }; // per-shape [scale, y offset] so tall shapes clear the card edges
  PW.shapeNames = Object.keys(SHAPES);

  PW.points = function (canvas, o) {
    o = o || {};
    const g = gl(canvas, 40), T = g.T, scene = g.scene, cam = g.cam; cam.position.set(0, 0, o.dist || 5.6);
    const N = o.count || 3000, R = rng(7), W = new T.Color('#e4e4e7');
    const forms = (o.forms || []).map((f) => { const C = new Collector(N, R); (SHAPES[f.shape] || SHAPES.neural)(C, new T.Color(f.color), W); C.fill(); C.tilt = TILT[f.shape] || 0.1; C.fit = FIT[f.shape] || [1, 0]; return C; });
    const cur = new Float32Array(N * 3), vel = new Float32Array(N * 3), col = new Float32Array(N * 3), k = new Float32Array(N);
    for (let i = 0; i < N; i++) { const th = R() * 6.283, ph = Math.acos(2 * R() - 1), r = 3 + R() * 3; cur.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3); k[i] = 14 + R() * 26; }
    const rp = new Float32Array(N * 3), rc = new Float32Array(N * 3), disp = new Float32Array(N * 3), glow = new Float32Array(N);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(rp, 3)); geo.setAttribute('color', new T.BufferAttribute(rc, 3));
    const hv = o.hover == null ? 0.6 : o.hover, HR = 0.8, hray = new T.Raycaster(), hmv = new T.Vector2(), hinv = new T.Matrix4(), ro = new T.Vector3(), rd = new T.Vector3();
    const mat = new T.PointsMaterial({ size: o.size || 0.048, map: dotTex(T), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    const grp = new T.Group(); grp.add(new T.Points(geo, mat)); scene.add(grp);
    let idx = -1, F = null, last = 0, spin = 0, px = 0, py = 0, t = 0, since = 0, inside = false, held = false;
    function go(i) {
      if (!forms.length) return;
      idx = ((i % forms.length) + forms.length) % forms.length; F = forms[idx]; since = 0;
      for (let j = 0; j < N * 3; j++) vel[j] += (R() - 0.5) * 2.4; // little burst so the morph feels alive
      o.onChange && o.onChange(idx);
    }
    go(o.start || 0);
    const offDrag = drag(canvas, (dx) => { spin += dx * 0.004; last = t; }, () => { last = t; go(idx + 1); });
    const pm = (e) => { const r = canvas.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width) * 2 - 1; py = ((e.clientY - r.top) / r.height) * 2 - 1; inside = true; };
    const plv = () => { inside = false; };
    canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerleave', plv);
    const stop = loop(canvas, (dt) => {
      t += dt; since += dt;
      if (held) last += dt;
      if (o.auto !== false && t - last > (o.interval || 7)) { last = t; go(idx + 1); }
      if (o.onProgress) o.onProgress(clamp((t - last) / (o.interval || 7), 0, 1)); // the progress bar follows this same clock
      const P = F.p, scanY = -1.4 + ((t * 0.38) % 1) * 2.7, blink = (t * 1.8) % 1 < 0.55 ? 1.5 : 0.08, breathe = 1 + 0.35 * Math.sin(t * 3.2), settled = since > 1.4;
      for (let i = 0; i < N; i++) {
        const j = i * 3, role = F.role[i]; let tx = P[j], ty = P[j + 1], tz = P[j + 2], m = 1;
        if (role === 1) { const f = (F.v[i] + t * 0.3) % 1, r = 0.16 + f * 1.55, la = F.w[i], th = F.u[i]; tx = Math.cos(la) * Math.cos(th) * r; ty = 0.78 + Math.sin(la) * r; tz = Math.cos(la) * Math.sin(th) * r; m = Math.pow(Math.sin(Math.PI * f), 1.4) * 1.3; }
        else if (role === 2) { const s = Math.sin(6.283 * (F.u[i] * 1.5 - t * 0.55 + F.v[i])); m = 0.55 + 2.6 * Math.pow(Math.max(0, s), 14); }
        else if (role === 3) m = blink;
        else if (role === 4) { const d = ty - scanY; m = 1 + 3.2 * Math.exp(-(d * d) / 0.003); }
        else if (role === 5) m = breathe;
        if (role === 1 && settled) { cur[j] = tx; cur[j + 1] = ty; cur[j + 2] = tz; vel[j] = vel[j + 1] = vel[j + 2] = 0; }
        else { const kk = k[i], c = 2 * Math.sqrt(kk) * 0.62; for (let a = 0; a < 3; a++) { const tv = a === 0 ? tx : a === 1 ? ty : tz; vel[j + a] += ((tv - cur[j + a]) * kk - vel[j + a] * c) * dt; cur[j + a] += vel[j + a] * dt; } }
        const ck = Math.min(1, dt * 3); col[j] += (F.c[j] * m - col[j]) * ck; col[j + 1] += (F.c[j + 1] * m - col[j + 1]) * ck; col[j + 2] += (F.c[j + 2] * m - col[j + 2]) * ck;
        if (role === 1 || role === 3 || role === 4) { col[j] = F.c[j] * m; col[j + 1] = F.c[j + 1] * m; col[j + 2] = F.c[j + 2] * m; }
      }
      spin *= Math.pow(0.2, dt); grp.rotation.y += (0.16 + spin * 20) * dt; grp.rotation.x = lerp(grp.rotation.x, F.tilt + py * 0.3, dt * 2);
      const wide = cam.aspect > 1.05; grp.position.x = lerp(grp.position.x, wide ? 0.42 : 0, dt * 3); grp.position.y = lerp(grp.position.y, (wide ? 0.38 : 0.55) + F.fit[1], dt * 3); grp.scale.setScalar(lerp(grp.scale.x, (wide ? 0.84 : 0.72) * F.fit[0], dt * 3)); // keep clear of the caption (bottom-left)
      let on = false;
      if (hv && inside) { grp.updateMatrixWorld(true); hmv.set(px, -py); hray.setFromCamera(hmv, cam); hinv.copy(grp.matrixWorld).invert(); ro.copy(hray.ray.origin).applyMatrix4(hinv); rd.copy(hray.ray.direction).transformDirection(hinv); on = true; }
      const kk = Math.min(1, dt * 6);
      for (let i = 0; i < N; i++) {
        const j = i * 3; let tx = 0, ty = 0, tz = 0, gw = 0;
        if (on) {
          const ax = cur[j] - ro.x, ay = cur[j + 1] - ro.y, az = cur[j + 2] - ro.z, sp = ax * rd.x + ay * rd.y + az * rd.z;
          const ox = ax - rd.x * sp, oy = ay - rd.y * sp, oz = az - rd.z * sp, d = Math.sqrt(ox * ox + oy * oy + oz * oz);
          if (d < HR && d > 1e-4) {
            const f = 1 - d / HR, f2 = f * f * hv * 0.38, nx = ox / d, ny = oy / d, nz = oz / d;
            const cx = rd.y * nz - rd.z * ny, cy = rd.z * nx - rd.x * nz, cz = rd.x * ny - rd.y * nx;
            tx = nx * f2 + cx * f2 * 0.45; ty = ny * f2 + cy * f2 * 0.45; tz = nz * f2 + cz * f2 * 0.45; gw = f * f * hv;
          }
        }
        disp[j] += (tx - disp[j]) * kk; disp[j + 1] += (ty - disp[j + 1]) * kk; disp[j + 2] += (tz - disp[j + 2]) * kk; glow[i] += (gw - glow[i]) * kk;
        rp[j] = cur[j] + disp[j]; rp[j + 1] = cur[j + 1] + disp[j + 1]; rp[j + 2] = cur[j + 2] + disp[j + 2];
        const b = 1 + glow[i] * 1.1; rc[j] = col[j] * b; rc[j + 1] = col[j + 1] * b; rc[j + 2] = col[j + 2] * b;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      g.r.render(scene, cam);
    });
    return {
      go: (i) => { last = t; go(i); }, next: () => { last = t; go(idx + 1); }, prev: () => { last = t; go(idx - 1); }, hold: (b) => { held = !!b; }, count: forms.length,
      destroy() { stop(); offDrag(); canvas.removeEventListener('pointermove', pm); canvas.removeEventListener('pointerleave', plv); g.dispose(); }
    };
  };

  /* ───────── Land-mask earth with pins, arcs & hover (3D) ───────── */
  function landData() {
    if (!PW._landP) PW._landP = (window.LAND_110M ? Promise.resolve(window.LAND_110M) : fetch('assets/data/land-110m.json').then((r) => r.json())).then((topo) => {
      const tf = topo.transform, sc = tf ? tf.scale : [1, 1], tr = tf ? tf.translate : [0, 0];
      const arcs = topo.arcs.map((a) => { let x = 0, y = 0; return a.map((q) => { if (!tf) return q; x += q[0]; y += q[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; }); });
      const arc = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
      const ring = (ids) => { const out = []; ids.forEach((i, k) => { const a = arc(i); for (let j = k ? 1 : 0; j < a.length; j++) out.push(a[j]); }); return out; };
      const polys = [];
      (function geom(gm) { if (gm.type === 'Polygon') polys.push(gm.arcs.map(ring)); else if (gm.type === 'MultiPolygon') gm.arcs.forEach((pp) => polys.push(pp.map(ring))); else if (gm.geometries) gm.geometries.forEach(geom); })(topo.objects.land);
      const unwrap = (r) => { const out = []; let off = 0; r.forEach((q, k) => { if (k) { const d = q[0] - r[k - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; } out.push([q[0] + off, q[1]]); });
        if (Math.abs(out[out.length - 1][0] - out[0][0]) > 180) { const pole = out.reduce((a, q) => a + q[1], 0) / out.length < 0 ? -90 : 90; out.push([out[out.length - 1][0], pole], [out[0][0], pole]); } return out; };
      const W = 1440, H = 720, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.fillStyle = '#fff';
      polys.forEach((pg) => { const rs = pg.map(unwrap); [-360, 0, 360].forEach((sh) => { x.beginPath(); rs.forEach((r) => r.forEach((q, k) => { const X = ((q[0] + sh + 180) / 360) * W, Y = ((90 - q[1]) / 180) * H; k ? x.lineTo(X, Y) : x.moveTo(X, Y); })); x.fill('evenodd'); }); });
      const rings = []; polys.forEach((pg) => pg.forEach((r) => rings.push(r)));
      return { w: W, h: H, data: x.getImageData(0, 0, W, H).data, rings };
    });
    return PW._landP;
  }
  PW.earth = function (canvas, o) {
    o = o || {};
    const g = gl(canvas, 30), T = g.T, scene = g.scene, cam = g.cam; cam.position.set(0, 0, o.dist || 3.9);
    const tilt = new T.Group(), spin = new T.Group(); tilt.add(spin); scene.add(tilt);
    const tex = dotTex(T), landC = new T.Color(o.land || '#e4e4e7');
    spin.add(new T.Mesh(new T.SphereGeometry(0.99, 64, 64), new T.MeshBasicMaterial({ color: o.fill || 0x0f1118 })));
    const gp = [];
    for (let la = -60; la <= 60; la += 20) for (let lo = -180; lo < 180; lo += 3) gp.push(llv(T, la, lo, 1.001), llv(T, la, lo + 3, 1.001));
    for (let lo = -180; lo < 180; lo += 20) for (let la = -80; la < 80; la += 4) gp.push(llv(T, la, lo, 1.001), llv(T, la + 4, lo, 1.001));
    spin.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(gp), new T.LineBasicMaterial({ color: 0x262a38, transparent: true, opacity: 0.85 })));
    scene.add(new T.Mesh(new T.RingGeometry(1.0, 1.012, 128), new T.MeshBasicMaterial({ color: 0x2a2f3d, transparent: true, opacity: 0.9 })));
    function build(L) {
      const W = L.w, H = L.h, d = L.data, n = o.dots || 20000, p = [];
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n, lat = Math.asin(y) * 57.29578, lon = ((i * 137.50776) % 360) - 180;
        const px = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W)), py = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
        if (d[(py * W + px) * 4 + 3] > 128) { const v = llv(T, lat, lon, 1.004); p.push(v.x, v.y, v.z); }
      }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      spin.add(new T.Points(geo, new T.PointsMaterial({ color: landC, size: o.dotSize || 0.018, map: tex, transparent: true, depthWrite: false, opacity: 0.85 })));
      const c = [];
      L.rings.forEach((r) => { for (let k = 1; k < r.length; k++) { if (Math.abs(r[k][0] - r[k - 1][0]) > 180) continue; c.push(llv(T, r[k - 1][1], r[k - 1][0], 1.003), llv(T, r[k][1], r[k][0], 1.003)); } });
      spin.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(c), new T.LineBasicMaterial({ color: landC, transparent: true, opacity: 0.4 })));
    }
    function fallback() {
      const n = 1500, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), th = i * 2.39996; a.set([Math.cos(th) * rr, y, Math.sin(th) * rr], i * 3); }
      const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(a, 3));
      spin.add(new T.Points(dg, new T.PointsMaterial({ color: 0x4b5168, size: 0.03, map: tex, transparent: true, depthWrite: false })));
    }
    let alive = true;
    landData().then((L) => alive && build(L)).catch(() => alive && fallback());
    const places = (o.places || []).map((pl) => {
      const col = new T.Color(pl.color), base = llv(T, pl.lat, pl.lon, 1.0), top = llv(T, pl.lat, pl.lon, 1.075);
      spin.add(new T.Line(new T.BufferGeometry().setFromPoints([base, top]), new T.LineBasicMaterial({ color: col })));
      const head = new T.Mesh(new T.SphereGeometry(0.022, 16, 16), new T.MeshBasicMaterial({ color: col })); head.position.copy(top); spin.add(head);
      const ring = new T.Mesh(new T.RingGeometry(0.03, 0.04, 40), new T.MeshBasicMaterial({ color: col, transparent: true, side: T.DoubleSide, depthWrite: false }));
      const rp = llv(T, pl.lat, pl.lon, 1.006); ring.position.copy(rp); ring.lookAt(rp.clone().multiplyScalar(2)); spin.add(ring);
      return Object.assign({}, pl, { v: base, head, ring, yaw: Math.atan2(-base.x, base.z) });
    });
    const home = places.find((p) => p.id === o.home) || places[0];
    const arcs = places.filter((p) => p !== home).map((p) => {
      const a = home.v.clone().normalize(), b = p.v.clone().normalize(), ang = a.angleTo(b);
      const mid = a.clone().add(b).normalize().multiplyScalar(1.03 + ang * 0.38);
      const curve = new T.QuadraticBezierCurve3(a.clone().multiplyScalar(1.006), mid, b.clone().multiplyScalar(1.006)), pts = curve.getPoints(80), col = new T.Color(p.color);
      spin.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35 })));
      const cg = new T.BufferGeometry().setFromPoints(pts); spin.add(new T.Line(cg, new T.LineBasicMaterial({ color: col })));
      const dot = new T.Mesh(new T.SphereGeometry(0.014, 10, 10), new T.MeshBasicMaterial({ color: 0xffffff })); spin.add(dot);
      return { curve, cg, dot };
    });
    const c0 = llv(T, o.lat0 != null ? o.lat0 : 47, o.lon0 != null ? o.lon0 : -26, 1);
    let yaw = Math.atan2(-c0.x, c0.z), ty = yaw, tx = o.tilt0 || 0.72, t = 0, hover = null, pinned = false, pinT = 0, hold = 0, focusId = null, last = null, down = false;
    tilt.rotation.x = tx; spin.rotation.y = yaw;
    function setHover(id, pin) { hover = id; pinned = !!pin; canvas.style.cursor = id ? 'pointer' : 'grab'; }
    const offDrag = drag(canvas, (dx, dy) => { ty += dx * 0.008; tx = clamp(tx + dy * 0.005, -0.5, 1.25); hold = 2.5; focusId = null; if (hover) setHover(null); });
    const wp = new T.Vector3();
    function scr(p) { p.head.getWorldPosition(wp); const front = wp.z > 0.3; wp.project(cam); const r = canvas.getBoundingClientRect(); return { x: ((wp.x + 1) / 2) * r.width, y: ((1 - wp.y) / 2) * r.height, front }; }
    const pdn = () => { down = true; }, pup = () => { down = false; };
    const pm = (e) => {
      if (down) return; const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 22;
      places.forEach((p) => { const s = scr(p); if (!s.front) return; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = p.id; } });
      if (best) { if (best !== hover || pinned) setHover(best); } else if (hover && !pinned) setHover(null);
    };
    const pl = () => { if (!pinned) setHover(null); };
    canvas.addEventListener('pointerdown', pdn); window.addEventListener('pointerup', pup); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerleave', pl);
    const stop = loop(canvas, (dt) => {
      t += dt; if (hold > 0) hold -= dt;
      if (!hover && hold <= 0 && !focusId) ty += dt * 0.07;
      const k = Math.min(1, dt * 3.2); yaw = lerp(yaw, ty, k); spin.rotation.y = yaw; tilt.rotation.x = lerp(tilt.rotation.x, tx, k);
      if (focusId && Math.abs(yaw - ty) < 0.015 && Math.abs(tilt.rotation.x - tx) < 0.015) { setHover(focusId, true); pinT = 5; hold = 5; focusId = null; }
      if (pinned) { pinT -= dt; if (pinT <= 0) setHover(null); }
      places.forEach((p, i) => { const s = lerp(p.head.scale.x, p.id === hover ? 1.8 : 1, Math.min(1, dt * 10)); p.head.scale.setScalar(s); const pu = (t * 0.7 + i * 0.33) % 1; p.ring.scale.setScalar(1 + pu * 2.4); p.ring.material.opacity = (1 - pu) * 0.9; });
      arcs.forEach((a, i) => { const ph = (t * 0.32 + i * 0.55) % 1.5, f = clamp(ph, 0, 1), hd = Math.floor(f * 81), len = 18; a.cg.setDrawRange(Math.max(0, hd - len), Math.min(len, hd)); a.dot.visible = ph < 1; a.dot.position.copy(a.curve.getPoint(f)); });
      g.r.render(scene, cam);
      if (hover) {
        const p = places.find((q) => q.id === hover), s = scr(p);
        if (!s.front) setHover(null);
        else if (!last || last.id !== hover || Math.abs(last.x - s.x) > 0.8 || Math.abs(last.y - s.y) > 0.8) { last = { id: hover, x: s.x, y: s.y }; o.onHover && o.onHover(last); }
      } else if (last) { last = null; o.onHover && o.onHover(null); }
    });
    return {
      focus(id) { const p = places.find((q) => q.id === id); if (!p) return; let a = p.yaw; while (a - yaw > Math.PI) a -= Math.PI * 2; while (a - yaw < -Math.PI) a += Math.PI * 2; ty = a; tx = clamp((p.lat * Math.PI / 180) * 0.8, -0.5, 1.2); focusId = id; hold = 6; if (hover) setHover(null); },
      destroy() { alive = false; stop(); offDrag(); canvas.removeEventListener('pointerdown', pdn); window.removeEventListener('pointerup', pup); canvas.removeEventListener('pointermove', pm); canvas.removeEventListener('pointerleave', pl); g.dispose(); }
    };
  };
})();
