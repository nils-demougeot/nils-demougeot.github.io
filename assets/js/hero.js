/* Fig. 00 · the title sheet's figure: a loss surface L(θ₁, θ₂) drawn as a plotted mesh, its contour map on the floor,
   and three optimizers (SGD, momentum, Adam) racing down from the same start. Click the surface to drop them elsewhere.
   Needs three.js (r128). Without WebGL the sheet simply keeps its plain grid. */
(function () {
  'use strict';
  const cv = document.getElementById('heroGL'), hero = cv && cv.closest('.hero');
  const html = document.documentElement;
  if (!cv || !window.THREE) { html.classList.add('no-gl'); return; }
  const T = THREE, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { html.classList.add('no-gl'); cv.style.display = 'none'; return; }
  renderer.setClearColor(0x000000, 0);

  /* ── The landscape: a shallow bowl plus a few Gaussian pits and hills → [cx, cz, amplitude, spread] ── */
  const HALF = 5, HS = 1.5, FLOOR = -2.7;
  const G = [[-2.3, -1.5, -1.3, 3.4], [2.5, 2.0, -0.9, 2.5], [0.9, -3.1, -0.55, 1.5], [-0.3, 1.5, 1.0, 2.3], [3.1, -2.1, 0.62, 1.9], [-3.5, 2.9, 0.42, 2.6]];
  const f = (x, z) => { let h = 0.034 * (x * x + z * z); for (const g of G) { const dx = x - g[0], dz = z - g[1]; h += g[2] * Math.exp(-(dx * dx + dz * dz) / g[3]); } return h; };
  const grad = (x, z) => { let gx = 0.068 * x, gz = 0.068 * z; for (const g of G) { const dx = x - g[0], dz = z - g[1], e = g[2] * Math.exp(-(dx * dx + dz * dz) / g[3]) * (-2 / g[3]); gx += e * dx; gz += e * dz; } return [gx, gz]; };
  const GLSL_F = 'float L(vec2 p){ float h = 0.034 * dot(p, p);' + G.map((g) => ' h += ' + g[2].toFixed(3) + ' * exp(-dot(p - vec2(' + g[0].toFixed(2) + ',' + g[1].toFixed(2) + '), p - vec2(' + g[0].toFixed(2) + ',' + g[1].toFixed(2) + ')) / ' + g[3].toFixed(2) + ');').join('') + ' return h; }';
  let FMIN = 1e9, MINX = 0, MINZ = 0;
  for (let x = -HALF; x <= HALF; x += 0.05) for (let z = -HALF; z <= HALF; z += 0.05) { const v = f(x, z); if (v < FMIN) { FMIN = v; MINX = x; MINZ = z; } }

  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
  const U = { uBg: { value: new T.Color(0x002fff) }, uLine: { value: new T.Color(0xffffff) }, uReveal: { value: reduce ? 2 : 0 }, uFade: { value: reduce ? 1 : 0 } };

  // surface: one mesh, grid lines drawn in the fragment shader (constant width on screen, anti-aliased, hidden lines removed by depth)
  const N = 110, geo = new T.PlaneGeometry(HALF * 2, HALF * 2, N, N); geo.rotateX(-Math.PI / 2);
  const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, f(P.getX(i), P.getZ(i)) * HS);
  P.needsUpdate = true; geo.computeBoundingSphere(); geo.computeBoundingBox();
  const surf = new T.Mesh(geo, new T.ShaderMaterial({
    uniforms: U, extensions: { derivatives: true }, side: T.DoubleSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 uBg, uLine; uniform float uReveal; varying vec3 vP;',
      'float grid(vec2 p, float w){ vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p); return 1.0 - smoothstep(0.0, w, min(g.x, g.y)); }',
      'void main(){',
      '  float d = (vP.x - vP.z + 10.0) / 20.0;', // the sheet is "plotted" along one diagonal
      '  if (d > uReveal) discard;',
      '  float shade = smoothstep(-2.2, 2.6, vP.y);',
      '  vec3 base = uBg * mix(0.74, 1.0, shade) + vec3(0.0, 0.03, 0.0) * shade;',
      '  float a = grid(vP.xz * 2.5, 1.15) * 0.42 + grid(vP.xz * 0.5, 1.5) * 0.5;',
      '  float front = exp(-pow((d - uReveal) / 0.012, 2.0));',
      '  float edge = 1.0 - smoothstep(0.0, 1.6, min(5.0 - abs(vP.x), 5.0 - abs(vP.z)) / fwidth(vP.x + vP.z) * 1.4);',
      '  gl_FragColor = vec4(mix(base, uLine, clamp(a + front + edge, 0.0, 1.0)), 1.0);',
      '}'].join('\n')
  }));
  scene.add(surf);

  // floor: the same function as a contour map (iso-loss lines), computed per pixel
  const floor = new T.Mesh(new T.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2), new T.ShaderMaterial({
    uniforms: U, extensions: { derivatives: true }, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: 'varying vec2 vQ; void main(){ vQ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 uLine; uniform float uFade; varying vec2 vQ;', GLSL_F,
      'void main(){',
      '  float h = L(vQ) * 5.0, w = fwidth(h);',
      '  float c = 1.0 - smoothstep(0.0, 1.2, abs(fract(h - 0.5) - 0.5) / w);',
      '  float low = 1.0 - smoothstep(-6.0, 3.0, h);', // lines get stronger towards the minima
      '  float border = 1.0 - smoothstep(0.0, 1.5, min(5.0 - abs(vQ.x), 5.0 - abs(vQ.y)) / fwidth(vQ.x + vQ.y) * 1.4);',
      '  float a = max(c * (0.22 + 0.5 * low), border * 0.9) * uFade;',
      '  gl_FragColor = vec4(uLine * a, a);',
      '}'].join('\n')
  }));
  floor.position.y = FLOOR; floor.renderOrder = -1; scene.add(floor);

  // the four posts joining the floor to the sheet's corners + a loss axis with ticks
  const posts = [];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const x = sx * HALF, z = sz * HALF; posts.push(x, FLOOR, z, x, f(x, z) * HS, z); });
  for (let k = 0; k <= 6; k++) { const y = FLOOR + k * 0.8; posts.push(-HALF, y, -HALF, -HALF - 0.16, y, -HALF - 0.16); }
  const postGeo = new T.BufferGeometry(); postGeo.setAttribute('position', new T.Float32BufferAttribute(posts, 3));
  const postMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  scene.add(new T.LineSegments(postGeo, postMat));

  /* ── Optimizers ── */
  const MAX = 520, COLS = [0xffd60a, 0xffffff, 0xff6a4d];
  const disc = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 28, 0, 7); x.fill(); return new T.CanvasTexture(c); })();
  const opts = COLS.map((col, i) => {
    const mk = () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(MAX * 3), 3)); g.setDrawRange(0, 0); return g; };
    const o = { i, col, x: 0, z: 0, vx: 0, vz: 0, m: [0, 0], v: [0, 0], t: 0, n: 0, still: 0, done: false, top: mk(), low: mk(), dots: mk() };
    o.lineTop = new T.Line(o.top, new T.LineBasicMaterial({ color: col }));
    o.lineLow = new T.Line(o.low, new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthTest: false }));
    o.pts = new T.Points(o.dots, new T.PointsMaterial({ color: col, size: 4.5, sizeAttenuation: false, map: disc, alphaTest: 0.5, transparent: true }));
    o.ball = new T.Mesh(new T.SphereGeometry(0.13, 20, 14), new T.MeshBasicMaterial({ color: col }));
    o.ring = new T.Mesh(new T.RingGeometry(0.1, 0.17, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, depthTest: false }));
    const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
    o.drop = new T.Line(dg, new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 }));
    [o.lineTop, o.lineLow, o.pts, o.ball, o.ring, o.drop].forEach((m) => { m.frustumCulled = false; m.visible = false; scene.add(m); });
    o.lineLow.renderOrder = 2; o.ring.renderOrder = 3;
    return o;
  });
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const clampP = (v) => Math.max(-HALF + 0.05, Math.min(HALF - 0.05, v));
  let running = false, idle = 0, startMark = null;
  function place(o) {
    const y = f(o.x, o.z) * HS;
    if (o.n < MAX) {
      o.top.attributes.position.setXYZ(o.n, o.x, y + 0.035, o.z); o.low.attributes.position.setXYZ(o.n, o.x, FLOOR + 0.01, o.z);
      o.n++; o.top.setDrawRange(0, o.n); o.low.setDrawRange(0, o.n); o.top.attributes.position.needsUpdate = true; o.low.attributes.position.needsUpdate = true;
      if (o.t % 6 === 0) { const k = o.dots.drawRange.count; o.dots.attributes.position.setXYZ(k, o.x, y + 0.05, o.z); o.dots.setDrawRange(0, k + 1); o.dots.attributes.position.needsUpdate = true; }
    }
    o.ball.position.set(o.x, y + 0.13, o.z); o.ring.position.set(o.x, FLOOR + 0.02, o.z);
    const d = o.drop.geometry.attributes.position; d.setXYZ(0, o.x, y, o.z); d.setXYZ(1, o.x, FLOOR, o.z); d.needsUpdate = true;
  }
  function drop(x, z) {
    if (x == null) { // a start high on the rim, where the three paths have room to diverge
      let best = -1e9; for (let k = 0; k < 14; k++) { const a = Math.random() * 6.2832, r = 3.3 + Math.random() * 1.3, px = clampP(Math.cos(a) * r), pz = clampP(Math.sin(a) * r), v = f(px, pz) + Math.random() * 0.4; if (v > best) { best = v; x = px; z = pz; } }
    }
    opts.forEach((o) => {
      o.x = clampP(x); o.z = clampP(z); o.vx = o.vz = 0; o.m = [0, 0]; o.v = [0, 0]; o.t = 0; o.n = 0; o.still = 0; o.done = false;
      o.top.setDrawRange(0, 0); o.low.setDrawRange(0, 0); o.dots.setDrawRange(0, 0);
      [o.lineTop, o.lineLow, o.pts, o.ball, o.ring, o.drop].forEach((m) => { m.visible = true; });
      place(o);
    });
    running = true; idle = 0; readout(true);
  }
  function step(o) {
    if (o.done) return;
    let [gx, gz] = grad(o.x, o.z); const x0 = o.x, z0 = o.z; o.t++;
    if (o.i === 0) { gx += gauss() * 0.42; gz += gauss() * 0.42; o.x -= 0.075 * gx; o.z -= 0.075 * gz; } // SGD: noisy gradient, plain step
    else if (o.i === 1) { o.vx = 0.93 * o.vx - 0.012 * gx; o.vz = 0.93 * o.vz - 0.012 * gz; o.x += o.vx; o.z += o.vz; } // momentum: it overshoots, then settles
    else { // Adam
      const b1 = 0.9, b2 = 0.999, g = [gx, gz], p = [0, 0];
      for (let k = 0; k < 2; k++) { o.m[k] = b1 * o.m[k] + (1 - b1) * g[k]; o.v[k] = b2 * o.v[k] + (1 - b2) * g[k] * g[k]; p[k] = 0.085 * (o.m[k] / (1 - Math.pow(b1, o.t))) / (Math.sqrt(o.v[k] / (1 - Math.pow(b2, o.t))) + 1e-8); }
      o.x -= p[0]; o.z -= p[1];
    }
    o.x = clampP(o.x); o.z = clampP(o.z);
    const moved = Math.hypot(o.x - x0, o.z - z0), gn = Math.hypot(...grad(o.x, o.z));
    o.still = (o.i === 0 ? gn < 0.16 : moved < 0.004) ? o.still + 1 : 0;
    if (o.still > (o.i === 0 ? 55 : 30) || o.t >= MAX - 1) o.done = true;
    place(o);
  }
  const read = document.getElementById('heroRead'), rows = read ? Array.from(read.querySelectorAll('.hr-row')) : [];
  function readout(force) {
    rows.forEach((r, i) => { const o = opts[i]; r.querySelector('.st').textContent = String(o.t).padStart(3, '0'); r.querySelector('.ls').textContent = (f(o.x, o.z) - FMIN).toFixed(3); r.classList.toggle('done', o.done && !force); });
  }

  /* ── Labels pinned to 3D points ── */
  const lab = document.createElement('div'); lab.className = 'hero-labels'; lab.setAttribute('aria-hidden', 'true'); hero.insertBefore(lab, cv.nextSibling);
  const labels = [['θ₁', 0, FLOOR, HALF + 0.55], ['θ₂', HALF + 0.55, FLOOR, 0], ['L', -HALF - 0.3, FLOOR + 5.2, -HALF - 0.3], ['global min', MINX, FLOOR, MINZ]].map(([t, x, y, z]) => { const s = document.createElement('span'); s.textContent = t; lab.appendChild(s); return { s, p: new T.Vector3(x, y, z) }; });
  labels[3].s.style.cssText = 'color:#FFD60A;padding-left:14px;background:linear-gradient(#FFD60A,#FFD60A) left center/10px 1px no-repeat';
  const tmp = new T.Vector3();

  /* ── Camera: slow orbit, drag to turn, the figure sits right of centre on wide screens ── */
  let W = 2, H = 2, yaw = -0.72, pitch = 0.56, vyaw = 0, down = false, moved = 0, lx = 0, ly = 0, hold = 0;
  function resize() {
    const r = cv.getBoundingClientRect(); W = Math.max(2, r.width); H = Math.max(2, r.height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H, false);
    cam.aspect = W / H;
    const wide = W > 900;
    cam.fov = 30; cam.setViewOffset(W, H, wide ? -W * 0.2 : 0, wide ? H * 0.13 : 0, W, H); cam.updateProjectionMatrix();
    draw();
  }
  function setCam() {
    // distance chosen so the 10-unit sheet spans about half of the width (wide) or nearly all of it (narrow)
    const wide = W > 900, span = wide ? Math.min(0.52 * W, 0.95 * H) : 0.98 * W, R = (14.5 * H) / (2 * Math.tan((cam.fov * Math.PI) / 360) * span);
    cam.position.set(Math.sin(yaw) * Math.cos(pitch) * R, Math.sin(pitch) * R - 1.1, Math.cos(yaw) * Math.cos(pitch) * R);
    cam.lookAt(0, -1.1, 0); cam.updateMatrixWorld();
  }
  function draw() {
    setCam(); renderer.render(scene, cam);
    labels.forEach((l) => { tmp.copy(l.p).project(cam); l.s.style.transform = 'translate(' + (((tmp.x + 1) / 2) * W).toFixed(1) + 'px,' + (((1 - tmp.y) / 2) * H - 8).toFixed(1) + 'px)'; l.s.style.opacity = U.uFade.value; });
  }
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function clickAt(e) {
    const r = cv.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    let hit = ray.intersectObject(surf)[0] || ray.intersectObject(floor)[0];
    if (hit) { drop(hit.point.x, hit.point.z); if (reduce) settle(); kick(); }
  }
  cv.addEventListener('pointerdown', (e) => { down = true; moved = 0; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); yaw -= dx * 0.006; vyaw = -dx * 0.006; pitch = Math.max(0.2, Math.min(1.15, pitch + dy * 0.004)); lx = e.clientX; ly = e.clientY; hold = 2.5; kick(); });
  window.addEventListener('pointerup', (e) => { if (down && moved < 6 && e.target === cv) clickAt(e); down = false; });

  /* ── Loop: only while the title sheet is on screen ── */
  let raf = 0, vis = true, last = 0, t0 = 0, frame = 0;
  const settle = () => { for (let k = 0; k < MAX; k++) opts.forEach(step); readout(); };
  function tick(now) {
    raf = 0; if (!vis || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; if (!t0) t0 = now; const t = (now - t0) / 1000; frame++;
    if (!reduce) {
      const k = Math.min(1, t / 1.9); U.uReveal.value = (1 - Math.pow(1 - k, 3)) * 1.04; U.uFade.value = Math.max(0, Math.min(1, (t - 1.1) / 0.9)); postMat.opacity = 0.7 * U.uFade.value;
      if (hold > 0) hold -= dt; else if (!down) yaw += dt * 0.045;
      if (!down) { yaw += vyaw; vyaw *= 0.92; }
      if (t > 1.7 && !running && idle === 0 && opts[0].t === 0) drop();
      if (running) {
        opts.forEach(step); if (frame % 5 === 0) readout();
        if (opts.every((o) => o.done)) { running = false; idle = 2.6; readout(); }
      } else if (idle > 0) { idle -= dt; if (idle <= 0) { idle = 0; drop(); } }
    }
    draw();
    if (!reduce) raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) kick(); }).observe(hero);
  document.addEventListener('visibilitychange', kick);
  new ResizeObserver(resize).observe(cv);
  if (reduce) { postMat.opacity = 0.7; drop(); settle(); }
  resize(); kick();
  window.HeroFig = { drop: () => { drop(); if (reduce) settle(); kick(); } };
})();
