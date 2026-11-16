/* Immersive portfolio · WebGL scene (three.js r128, no build step).
   A block of ice on paper: one rock in the hero, which breaks into chunks that float through the page and gather again at the end.
   app.js sets ND3D.target (which two layouts to blend, where, how big, day or night) from the scroll position; this file eases towards it.
   Passes: background → texture A; A + back faces + globe/ring → texture B; then the screen gets the background, globe/ring and the front faces, which refract B. */
(function () {
  'use strict';
  const T = window.THREE, canvas = document.getElementById('gl'), html = document.documentElement;
  const ND = (window.ND3D = { ok: false, target: null, override: null, place: 'paris', burst() {}, ready: Promise.resolve() });
  const fail = () => { html.classList.add('no-gl'); };
  if (!T || !canvas) return fail();
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return fail(); }
  if (!renderer.getContext()) return fail();
  ND.ok = true; html.classList.add('gl');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const FOV = 35, CAMZ = 10, HALF_H = Math.tan((FOV * Math.PI) / 360) * CAMZ;
  const cam = new T.PerspectiveCamera(FOV, 1, 0.1, 60); cam.position.z = CAMZ;
  const V = { w: 2, h: 2, aspect: 1, halfW: HALF_H, dpr: 1 };
  renderer.setClearColor(0xeceae4, 1); renderer.autoClear = false;
  const rtOpt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, stencilBuffer: false };
  const rtA = new T.WebGLRenderTarget(2, 2, Object.assign({ depthBuffer: false }, rtOpt));
  const rtB = new T.WebGLRenderTarget(2, 2, Object.assign({ depthBuffer: true }, rtOpt));
  const bgScene = new T.Scene(), backScene = new T.Scene(), midScene = new T.Scene(), frontScene = new T.Scene();

  /* ───────── State ───────── */
  // a/b: the two layouts being blended (t = 0 → a, 1 → b); x/y: centre, as fractions of the half viewport.
  const BASE = { a: 'one', b: 'one', t: 0, x: 0, y: 0, scale: 0.6, night: 0, globe: 0, ring: 0, fade: 0, active: -1, marquee: 1, pw: [1, 0, 0, 0], pop: 0, ptx: 0, pty: 0, pts: 1 };
  ND.target = Object.assign({}, BASE);
  const cur = { x: 0, y: 0, scale: 0.4, night: 0, globe: 0, ring: 0, fade: 0, marquee: 0, pop: 0, ptx: 0, pty: 0, pts: 1, pw: [1, 0, 0, 0] };
  const NUM = ['x', 'y', 'scale', 'night', 'globe', 'ring', 'fade', 'marquee', 'pop', 'ptx', 'pty', 'pts'];
  const U = {
    uTime: { value: 0 }, uAspect: { value: 1 }, uRes: { value: new T.Vector2(2, 2) }, uNight: { value: 0 }, uMouse2: { value: new T.Vector2() },
    uLight: { value: new T.Vector3(-0.5, 0.75, 0.45) }, uObj: { value: new T.Vector2() }, uA: { value: new T.Vector3(0.62, 0.56, 0.9) }
  };

  /* ───────── Background: paper by day, deep blue by night, a warm dusk in between ───────── */
  const quadGeo = new T.PlaneGeometry(2, 2);
  const QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }';
  const SKY = [
    'vec3 sky(vec2 uv, float night, float aspect, vec2 mouse){',
    '  float t = clamp(night + (0.5 - uv.y) * 0.55 * sin(3.14159 * night), 0.0, 1.0);',
    '  vec3 paper = vec3(0.925, 0.918, 0.894), dusk = vec3(0.914, 0.800, 0.722), lilac = vec3(0.545, 0.510, 0.698), deep = vec3(0.050, 0.054, 0.110);',
    '  vec3 c = t < 0.34 ? mix(paper, dusk, t / 0.34) : t < 0.67 ? mix(dusk, lilac, (t - 0.34) / 0.33) : mix(lilac, deep, (t - 0.67) / 0.33);',
    '  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);',
    '  float d = length(p - mouse * vec2(aspect, 1.0) * 0.5);',
    '  c += mix(vec3(0.022, 0.020, 0.014), vec3(0.05, 0.045, 0.11), night) * exp(-d * d * 5.0);', // a soft light under the pointer
    '  c *= 1.0 - mix(0.05, 0.35, night) * dot(p, p);',
    '  return c;',
    '}'
  ].join('\n');
  const sky = new T.Mesh(quadGeo, new T.ShaderMaterial({
    uniforms: { uNight: U.uNight, uAspect: U.uAspect, uMouse2: U.uMouse2 }, depthTest: false, depthWrite: false, vertexShader: QUAD_V,
    fragmentShader: 'precision highp float; varying vec2 vUv; uniform float uNight, uAspect; uniform vec2 uMouse2;\n' + SKY + '\nvoid main(){ gl_FragColor = vec4(sky(vUv, uNight, uAspect, uMouse2), 1.0); }'
  }));
  sky.frustumCulled = false; sky.renderOrder = -10; bgScene.add(sky);

  /* ───────── Marquee: the headline, drawn in WebGL behind the rock so the ice bends it ───────── */
  const BG_Z = -2.4, BG_HALF_H = Math.tan((FOV * Math.PI) / 360) * (CAMZ - BG_Z);
  const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif', SERIF = '"Instrument Serif", "Times New Roman", serif';
  let marquee = null;
  function buildMarquee() {
    const H = 512, base = 372, c = document.createElement('canvas'), x = c.getContext('2d');
    const parts = [['Nils Demougeot', 0], [' — ', 0], ['data, made useful', 1], [' — ', 0]]; // 1 = serif italic
    const font = (s) => (s ? 'italic 400 ' + Math.round(base * 1.12) + 'px ' + SERIF : '600 ' + base + 'px ' + SANS);
    const adv = (ch, s) => { x.font = font(s); return x.measureText(ch).width * (s ? 0.985 : 0.955); };
    let w = 0; parts.forEach(([t, s]) => { for (const ch of t) w += adv(ch, s); });
    const k = Math.min(1, 8192 / w); c.width = Math.round(w * k); c.height = Math.round(H * k);
    x.setTransform(c.width / w, 0, 0, k, 0, 0); x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    let px = 0; parts.forEach(([t, s]) => { for (const ch of t) { x.font = font(s); x.fillText(ch, px, 388); px += adv(ch, s); } });
    const tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping; tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uOff: { value: 0 }, uRep: { value: 1 }, uOp: { value: 0 }, uNight: U.uNight }, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; varying vec2 vUv; uniform sampler2D uMap; uniform float uOff, uRep, uOp, uNight; void main(){ float a = texture2D(uMap, vec2(vUv.x * uRep + uOff, vUv.y)).a; gl_FragColor = vec4(mix(vec3(0.07), vec3(0.95), uNight), a * uOp); }'
    }));
    m.userData.ratio = c.width / c.height; m.position.z = BG_Z; m.renderOrder = -5; m.frustumCulled = false; bgScene.add(m); marquee = m;
  }
  ND.ready = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 100px "Inter Tight"', 'Nils'), document.fonts.load('italic 400 100px "Instrument Serif"', 'data')]).catch(() => {}) : Promise.resolve()).then(buildMarquee);

  /* ───────── Soft shadow under the rock ───────── */
  const blobTex = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach((s) => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); };
  const dotTex = blobTex([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
  const shadowMat = new T.SpriteMaterial({ map: blobTex([[0, 'rgba(40,36,60,.5)'], [0.35, 'rgba(70,60,110,.22)'], [0.7, 'rgba(190,150,120,.07)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
  const shadow = new T.Sprite(shadowMat); shadow.renderOrder = -4; bgScene.add(shadow);


  /* ───────── Data points: one cloud of dots that rearranges itself into the shapes of the trade ─────────
     0 a loose shell around the ice · 1 six clusters (one per field) · 2 a small neural network with signals running along its edges · 3 a loss surface */
  const COLS = ['#e8590c', '#3b5bdb', '#e03131', '#0ca678', '#1c7ed6', '#d6336c'].map(hex);
  const PN = 3000, pA = new Float32Array(PN * 3), pB = new Float32Array(PN * 3), pC = new Float32Array(PN * 3), pC2 = new Float32Array(PN * 3), pD = new Float32Array(PN * 3), pR = new Float32Array(PN * 4);
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rnd(); return (u - 2) / 0.58; };
  (function () {
    const CEN = [[-1.25, 0.95], [0.25, 1.25], [1.5, 0.55], [1.2, -0.85], [-0.2, -1.2], [-1.5, -0.4]], LAYERS = [5, 8, 10, 8, 3], nodes = [];
    LAYERS.forEach((n, l) => { const col = []; for (let k = 0; k < n; k++) col.push([(l - 2) * 0.95, (k - (n - 1) / 2) * 0.42, (rnd() - 0.5) * 0.3]); nodes.push(col); });
    for (let i = 0; i < PN; i++) {
      const i3 = i * 3, g = i % 6, r1 = rnd(), r2 = rnd(), r3 = rnd();
      const th = rnd() * 6.283, ph = Math.acos(rnd() * 2 - 1), rad = 1.7 + Math.pow(rnd(), 2) * 1.6;
      pA[i3] = Math.sin(ph) * Math.cos(th) * rad; pA[i3 + 1] = Math.cos(ph) * rad * 0.8; pA[i3 + 2] = Math.sin(ph) * Math.sin(th) * rad;
      pB[i3] = CEN[g][0] + gauss() * 0.3; pB[i3 + 1] = CEN[g][1] + gauss() * 0.26; pB[i3 + 2] = gauss() * 0.3;
      const l = Math.floor(rnd() * 4), a = nodes[l][Math.floor(rnd() * nodes[l].length)], b = nodes[l + 1][Math.floor(rnd() * nodes[l + 1].length)], edge = i % 5 !== 0; // 4 in 5 travel along an edge, 1 in 5 sits on a node
      const na = edge ? a : nodes[Math.floor(rnd() * 5)][0], nn = edge ? a : (() => { const L = nodes[Math.floor(rnd() * 5)]; return L[Math.floor(rnd() * L.length)]; })(), jit = edge ? 0 : 0.05;
      pC[i3] = nn[0] + gauss() * jit; pC[i3 + 1] = nn[1] + gauss() * jit; pC[i3 + 2] = nn[2] + gauss() * jit;
      const e = edge ? b : null; pC2[i3] = e ? e[0] : pC[i3]; pC2[i3 + 1] = e ? e[1] : pC[i3 + 1]; pC2[i3 + 2] = e ? e[2] : pC[i3 + 2];
      const gx = (i % 60) / 59, gz = Math.floor(i / 60) / 49; pD[i3] = (gx - 0.5) * 5.2; pD[i3 + 1] = 0; pD[i3 + 2] = (gz - 0.5) * 4.2;
      pR[i * 4] = r1; pR[i * 4 + 1] = r2; pR[i * 4 + 2] = r3; pR[i * 4 + 3] = g; void na;
    }
  })();
  const ptsGeo = new T.BufferGeometry();
  [['position', pA, 3], ['aB', pB, 3], ['aC', pC, 3], ['aC2', pC2, 3], ['aD', pD, 3], ['aR', pR, 4]].forEach((a) => ptsGeo.setAttribute(a[0], new T.BufferAttribute(a[1], a[2])));
  const ptsU = { uTime: U.uTime, uNight: U.uNight, uW: { value: new T.Vector4(1, 0, 0, 0) }, uC: { value: new T.Vector3() }, uS: { value: 1 }, uOp: { value: 0 }, uPx: { value: 1 }, uAct: { value: -1 }, uCols: { value: COLS.map((c) => new T.Vector3(c[0], c[1], c[2])) } };
  const points = new T.Points(ptsGeo, new T.ShaderMaterial({
    uniforms: ptsU, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: [
      'attribute vec3 aB, aC, aC2, aD; attribute vec4 aR; uniform float uTime, uS, uPx, uAct, uOp; uniform vec4 uW; uniform vec3 uC; uniform vec3 uCols[6];',
      'varying float vA; varying vec3 vCol; varying float vK;',
      'vec3 ry(vec3 p, float a){ float s = sin(a), c = cos(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }',
      'vec3 rx(vec3 p, float a){ float s = sin(a), c = cos(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }',
      'void main(){',
      '  vec3 p0 = ry(position, uTime * 0.06 + aR.x * 0.4);',
      '  vec3 p1 = aB + vec3(sin(uTime * 0.7 + aR.x * 40.0), cos(uTime * 0.6 + aR.y * 40.0), 0.0) * 0.035;',
      '  float on = step(abs(aR.w - uAct), 0.5);',
      '  p1 += (p1 - vec3(0.0)) * 0.0 + vec3(0.0, 0.0, on * 0.5);',
      '  float tt = fract(aR.y + uTime * (0.10 + 0.12 * aR.z));',
      '  vec3 p2 = ry(mix(aC, aC2, tt * tt * (3.0 - 2.0 * tt)), sin(uTime * 0.17) * 0.35);',
      '  vec3 d = aD; d.y = 0.42 * sin(d.x * 1.25 + uTime * 0.35) * cos(d.z * 1.1 - uTime * 0.2) + 0.3 * sin(d.x * 0.55 - d.z * 0.9 + uTime * 0.25) - 0.25 * exp(-dot(d.xz, d.xz) * 0.35);',
      '  float hgt = d.y; vec3 p3 = rx(ry(d, uTime * 0.05 + 0.5), 0.5);',
      '  vec3 p = p0 * uW.x + p1 * uW.y + p2 * uW.z + p3 * uW.w;',
      '  vec4 mv = modelViewMatrix * vec4(uC + p * uS, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  float node = step(distance(aC, aC2), 0.001);',
      '  float sz = mix(1.0, 1.0 + on * 0.8, uW.y); sz = mix(sz, mix(0.85, 1.9, node), uW.z); sz = mix(sz, 1.05, uW.w);',
      '  gl_PointSize = uPx * sz * (0.7 + 0.6 * aR.x) * 10.0 / -mv.z;',
      '  vA = uOp * mix(0.5 + 0.4 * aR.z, 1.0, max(uW.y * on, uW.z * node)) * mix(1.0, 0.55 + 0.45 * smoothstep(-0.5, 0.5, hgt), uW.w) * mix(1.0, 0.55, uW.x);',
      '  vCol = uCols[int(aR.w + 0.5)]; vK = max(uW.y * (0.25 + 0.75 * on), uW.w * smoothstep(0.1, 0.6, -hgt) * 0.8);',
      '}'
    ].join('\n'),
    fragmentShader: 'precision mediump float; uniform float uNight; varying float vA; varying vec3 vCol; varying float vK; void main(){ vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.32, length(q)); vec3 ink = mix(vec3(0.07), vec3(0.93), uNight); gl_FragColor = vec4(mix(ink, mix(vCol, vCol + 0.35, uNight), vK), a * vA); }'
  }));
  points.frustumCulled = false; points.renderOrder = -3; bgScene.add(points);

  /* ───────── Rocks: displaced spheres with a few chipped faces ───────── */
  const hash3 = (x, y, z, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 144665); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function vnoise(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s);
    return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v), lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v), w);
  }
  const fbm = (x, y, z, s) => vnoise(x, y, z, s) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3, s + 13) * 0.15;
  function makeRock(sd, detail, o) {
    const g = new T.IcosahedronGeometry(1, detail), pos = g.attributes.position, n = pos.count, p = new T.Vector3(), d = new T.Vector3();
    const planes = []; for (let i = 0; i < o.chips; i++) planes.push({ n: new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), o: 0.56 + rnd() * 0.3 });
    const keys = new Array(n);
    for (let i = 0; i < n; i++) {
      d.fromBufferAttribute(pos, i).normalize(); keys[i] = d.x.toFixed(3) + ',' + d.y.toFixed(3) + ',' + d.z.toFixed(3);
      p.copy(d).multiplyScalar(1 + (fbm(d.x * 1.15 + 5, d.y * 1.15, d.z * 1.15, sd) - 0.5) * 0.9 * o.lump);
      p.x *= o.sq[0]; p.y *= o.sq[1]; p.z *= o.sq[2];
      for (let k = 0; k < planes.length; k++) { const e = p.dot(planes[k].n) - planes[k].o; if (e > 0) p.addScaledVector(planes[k].n, -e * 0.93); }
      p.addScaledVector(d, (fbm(d.x * 3.4, d.y * 3.4 + 3, d.z * 3.4, sd + 3) - 0.5) * 0.035);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    g.computeVertexNormals(); // flat per face; then averaged over the vertices that share a position, for a smooth surface with soft edges
    const nor = g.attributes.normal, acc = {};
    for (let i = 0; i < n; i++) { const a = acc[keys[i]] || (acc[keys[i]] = [0, 0, 0]); a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); }
    for (let i = 0; i < n; i++) { const a = acc[keys[i]], l = Math.hypot(a[0], a[1], a[2]) || 1; nor.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    g.computeBoundingSphere(); return g;
  }

  const ICE_V = 'varying vec3 vN, vV, vObj; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = mv.xyz; vObj = position; gl_Position = projectionMatrix * mv; }';
  const ICE_F = [
    'precision highp float;',
    'uniform sampler2D uBg; uniform vec2 uRes; uniform vec3 uTint, uLight; uniform float uTime, uBack, uNight, uSeed, uFade, uGlow;',
    'varying vec3 vN, vV, vObj;',
    'float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }',
    'float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }',
    'float fbm(vec3 p){ return n3(p) * 0.55 + n3(p * 2.1 + 3.1) * 0.3 + n3(p * 4.3 + 7.7) * 0.15; }',
    'vec3 env(vec3 r){', // a photo studio: bright ceiling, grey floor, soft boxes, a dark seam at the horizon
    '  vec3 c = mix(vec3(0.16, 0.18, 0.23), vec3(0.98), smoothstep(-0.6, 0.65, r.y));',
    '  c *= 1.0 - 0.72 * smoothstep(0.16, 0.0, abs(r.y + 0.04));',
    '  c *= 1.0 - 0.5 * smoothstep(0.09, 0.0, abs(r.x - 0.28)) * smoothstep(-0.1, 0.3, r.y);',
    '  c *= 1.0 - 0.4 * smoothstep(0.06, 0.0, abs(r.x + 0.55));',
    '  c += vec3(1.3) * smoothstep(0.80, 0.95, dot(r, normalize(vec3(-0.5, 0.72, 0.48))));',
    '  c += vec3(0.9) * smoothstep(0.90, 0.98, dot(r, normalize(vec3(0.75, 0.2, 0.6))));',
    '  return c;',
    '}',
    'void main(){',
    '  vec3 N = normalize(vN); if (uBack > 0.5) N = -N;',
    '  vec3 Vd = normalize(-vV); float ndv = clamp(dot(N, Vd), 0.0, 1.0), rim = 1.0 - ndv;',
    '  float fres = 0.06 + 0.94 * pow(rim, 4.0);',
    '  vec3 q = vObj + uSeed;',
    '  float cloud = fbm(q * 1.7), grit = n3(q * 13.0);',
    '  float frost = smoothstep(0.54, 0.72, cloud);',                                  // cloudy patches inside clear ice
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  vec2 off = (N.xy * (0.12 + 0.12 * rim) + (vec2(n3(q * 6.0 + 1.7), n3(q * 6.0 + 9.2)) - 0.5) * 0.03) * (uBack > 0.5 ? -0.5 : 1.0);',
    '  float br = 0.0015 + 0.012 * frost;',                                             // sharp where clear, blurred where frosted
    '  vec3 refr = vec3(0.0);',
    '  for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708 + grit * 6.2831; vec2 o = uv - off + vec2(cos(a), sin(a)) * br;',
    '    refr += vec3(texture2D(uBg, o + off * 0.045).r, texture2D(uBg, o).g, texture2D(uBg, o - off * 0.055).b); }',
    '  refr *= 0.25;',
    '  vec3 ice = mix(vec3(0.985, 0.99, 1.0), vec3(0.36, 0.38, 0.58), uNight * 0.8);',
    '  vec3 col = refr * mix(vec3(0.90, 0.935, 0.965), vec3(1.0), uNight) * (0.9 + 0.2 * n3(q * 3.3 + N * 1.5));',
    '  col = mix(col, ice, 0.03 + 0.36 * frost);',
    '  float v = abs(n3(q * 2.4 + 4.0) - 0.5), vein = smoothstep(0.012, 0.0, v) * smoothstep(0.45, 0.75, n3(q * 1.1 + 2.0));', // fractures inside the ice
    '  col = mix(col, mix(vec3(1.0), vec3(0.7, 0.72, 1.0), uNight), vein * 0.5);',
    '  col *= mix(1.0, 0.5, pow(rim, 2.0));',                                          // thicker at the edges
    '  vec3 R = reflect(-Vd, N);',
    '  col = mix(col, env(R) * mix(1.0, 0.4, uNight), clamp(fres, 0.0, 1.0) * (uBack > 0.5 ? 0.3 : 1.0));',
    '  col += vec3(1.0) * pow(max(dot(R, normalize(uLight)), 0.0), 90.0) * (uBack > 0.5 ? 0.0 : 1.0);',
    '  col += vec3(0.55, 0.48, 0.95) * pow(rim, 2.5) * uNight * 0.55;',
    '  col = mix(col, col * mix(vec3(1.0), uTint, 0.16), uGlow) + uTint * (pow(rim, 1.6) * 0.42 + frost * 0.22 + vein * 0.3) * uGlow; // the active chunk stays clear ice, lit from inside with its colour',
    '  col = mix(col, texture2D(uBg, uv).rgb, uFade);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');
  const quadA = new T.Mesh(quadGeo, new T.ShaderMaterial({ uniforms: { uMap: { value: rtA.texture } }, depthTest: false, depthWrite: false, vertexShader: QUAD_V, fragmentShader: 'precision mediump float; varying vec2 vUv; uniform sampler2D uMap; void main(){ gl_FragColor = texture2D(uMap, vUv); }' }));
  quadA.frustumCulled = false; quadA.renderOrder = -10; backScene.add(quadA);

  // 7 chunks (0 is the rock of the hero; 0–5 stand for the six disciplines) and 14 pebbles.
  const BIG = 7, PEB = 14;
  const SHAPES = [
    { d: 28, lump: 1.15, chips: 9, sq: [1, 1.1, 0.95] }, { d: 14, lump: 1.1, chips: 9, sq: [1.1, 0.9, 0.85] }, { d: 14, lump: 0.9, chips: 10, sq: [0.85, 1.15, 0.9] },
    { d: 14, lump: 1.2, chips: 8, sq: [1.05, 0.8, 1] }, { d: 14, lump: 0.8, chips: 11, sq: [0.9, 1, 1.1] }, { d: 14, lump: 1.1, chips: 9, sq: [1.15, 0.95, 0.8] }, { d: 14, lump: 1.0, chips: 10, sq: [0.95, 1.05, 1] },
    { d: 8, lump: 1.0, chips: 7, sq: [1, 0.8, 0.9] }, { d: 8, lump: 0.9, chips: 8, sq: [0.8, 1.1, 1] }, { d: 8, lump: 1.1, chips: 6, sq: [1.1, 0.9, 0.7] }
  ];
  const geos = SHAPES.map((s, i) => makeRock(31 + i * 17, s.d, s));
  const chunks = [];
  for (let i = 0; i < BIG + PEB; i++) {
    const big = i < BIG, g = geos[big ? i : BIG + (i % 3)], sd = rnd() * 40;
    const un = (bg, back) => ({ uBg: { value: bg }, uBack: { value: back }, uRes: U.uRes, uLight: U.uLight, uTime: U.uTime, uNight: U.uNight, uSeed: { value: sd }, uFade: { value: 0 }, uGlow: { value: 0 }, uTint: { value: new T.Vector3(1, 1, 1) } });
    const back = new T.Mesh(g, new T.ShaderMaterial({ uniforms: un(rtA.texture, 1), vertexShader: ICE_V, fragmentShader: ICE_F, side: T.BackSide }));
    const front = new T.Mesh(g, new T.ShaderMaterial({ uniforms: un(rtB.texture, 0), vertexShader: ICE_V, fragmentShader: ICE_F, side: T.FrontSide }));
    backScene.add(back); frontScene.add(front);
    if (big && i < 6) { back.material.uniforms.uTint.value.fromArray(COLS[i]); front.material.uniforms.uTint.value.fromArray(COLS[i]); }
    chunks.push({ i, big, back, front, pos: new T.Vector3(0, 0, 0), push: new T.Vector3(), s: 0.001, glow: 0,
      rot: new T.Euler(rnd() * 6, rnd() * 6, rnd() * 6), w: new T.Vector3((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.3),
      r1: rnd(), r2: rnd(), r3: rnd(), r4: rnd(), tg: { x: 0, y: 0, z: 0, s: 0 } });
  }

  /* ───────── Layouts: where each chunk sits, in world units ───────── */
  // offsets around the centre for the loose cluster (x, y, z, scale)
  const CL = [[0, 0, 0, 0.78], [-1.5, 1.0, -0.6, 0.5], [1.35, 1.25, 0.3, 0.42], [1.7, -0.5, -0.4, 0.55], [-1.25, -1.2, 0.5, 0.46], [0.3, -1.75, -0.3, 0.38], [-0.2, 1.9, -0.8, 0.3]];
  const SIX = [[-0.9, 1.5], [1.3, 1.2], [1.9, -0.2], [1.0, -1.6], [-0.8, -1.5], [-1.9, 0.1]];
  let time = 0, scrollPx = 0;
  const wrap = (v, lim) => ((((v + lim) % (2 * lim)) + 2 * lim) % (2 * lim)) - lim;
  function layout(name, c, cx, cy, S, active, out) {
    const i = c.i, hw = V.halfW, hh = HALF_H, k = Math.min(1, V.aspect * 1.15); // k: everything a little tighter on narrow screens
    if (name === 'one') { // a single rock; the others wait inside it
      if (i === 0) { out.x = cx; out.y = cy; out.z = 0; out.s = S; } else { out.x = cx + (c.r1 - 0.5) * 0.3; out.y = cy + (c.r2 - 0.5) * 0.3; out.z = -0.4; out.s = 0.001; }
    } else if (name === 'cluster') {
      if (c.big) { const o = CL[i]; out.x = cx + o[0] * S * k; out.y = cy + o[1] * S; out.z = o[2]; out.s = o[3] * S; }
      else { const a = c.r1 * 6.283, r = (1.6 + c.r2 * 2.2) * S; out.x = cx + Math.cos(a) * r * k; out.y = cy + Math.sin(a) * r * 0.9; out.z = (c.r3 - 0.5) * 2; out.s = (0.05 + c.r4 * 0.09) * S; }
    } else if (name === 'six') { // the six disciplines: the active one comes forward
      if (i < 6) { const on = i === active, o = SIX[i]; out.x = cx + (on ? 0 : o[0] * S * k); out.y = cy + (on ? 0 : o[1] * S * 0.95); out.z = on ? 0.6 : -0.8; out.s = (on ? 0.95 : 0.3) * S; }
      else { const a = c.r1 * 6.283 + time * 0.03, r = (2.3 + c.r2 * 1.4) * S; out.x = cx + Math.cos(a) * r * k; out.y = cy + Math.sin(a) * r * 0.85; out.z = (c.r3 - 0.5) * 2; out.s = (c.big ? 0.22 : 0.04 + c.r4 * 0.07) * S; }
    } else if (name === 'drift') { // spread over the whole page, sliding past as it scrolls
      const lim = hh * 1.45, sp = 0.35 + c.r3 * 0.9;
      out.x = (c.big ? (i === 3 ? -0.97 : 0.38 + ((i * 0.37 + c.r1 * 0.3) % 1) * 0.6) : (c.r1 * 2 - 1) * 0.98) * hw; // big chunks keep to the right, away from the text
      out.y = wrap((c.r2 * 2 - 1) * lim + (scrollPx / V.h) * hh * 2 * sp, lim); out.z = (c.r4 - 0.5) * 3;
      out.s = (c.big ? 0.26 + c.r4 * 0.3 : 0.04 + c.r4 * 0.08) * S;
    } else if (name === 'orbit') { // around the globe
      const n = c.big ? BIG : PEB, a = time * (c.big ? 0.16 : 0.1 + c.r3 * 0.1) + ((c.big ? i : i - BIG) / n) * 6.283, R = (c.big ? 2.05 : 2.5 + c.r2 * 0.7) * S * Math.min(1, V.aspect * 1.4);
      out.x = cx + Math.cos(a) * R; out.y = cy + Math.sin(a) * R * 0.28 + (c.r1 - 0.5) * 0.3; out.z = Math.sin(a) * R * 0.9; out.s = (c.big ? 0.2 + c.r4 * 0.1 : 0.04 + c.r4 * 0.05) * S;
    }
    return out;
  }

  /* ───────── Ring of words around the rock (contact) ───────── */
  let ring = null;
  function buildRing() {
    const c = document.createElement('canvas'), x = c.getContext('2d'), txt = 'LET’S TALK  ·  INTERNSHIP FROM APRIL 2027  ·  DATA & AI  ·  PARIS  ·  ';
    c.width = 2048; c.height = 64; x.font = '500 34px ' + SANS; const w = x.measureText(txt).width;
    x.setTransform(2048 / w, 0, 0, 1, 0, 0); x.font = '500 34px ' + SANS; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(txt, 0, 34);
    const tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping; tex.anisotropy = 8;
    ring = new T.Mesh(new T.CylinderGeometry(2.05, 2.05, 0.2, 128, 1, true), new T.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uOp: { value: 0 }, uNight: U.uNight }, side: T.DoubleSide, transparent: true,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision highp float; varying vec2 vUv; uniform sampler2D uMap; uniform float uOp, uNight; void main(){ float a = texture2D(uMap, vec2(gl_FrontFacing ? vUv.x : 1.0 - vUv.x, vUv.y)).a; if (a * uOp < 0.4) discard; gl_FragColor = vec4(mix(vec3(gl_FrontFacing ? 0.07 : 0.55), vec3(0.95), uNight), 1.0); }'
    }));
    ring.visible = false; midScene.add(ring);
  }
  ND.ready = ND.ready.then(buildRing);

  /* ───────── Globe (Path section): dotted land, three pins, two arcs ───────── */
  const globe = new T.Group(), globeSpin = new T.Group(); globe.add(globeSpin); midScene.add(globe); globe.visible = false;
  const GR = 1.18, PLACES = { paris: { lat: 48.8566, lon: 2.3522, col: '#FFCC00' }, riga: { lat: 56.9496, lon: 24.1052, col: '#34d399' }, boston: { lat: 42.3601, lon: -71.0942, col: '#fb7185' } };
  const llv = (lat, lon, r) => { const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180; return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const globeMats = [];
  (function buildGlobe() {
    const body = new T.Mesh(new T.SphereGeometry(GR * 0.985, 48, 32), new T.MeshBasicMaterial({ color: 0x0b0d1c, transparent: true, opacity: 0.82 })); globeSpin.add(body); globeMats.push(body.material);
    const halo = new T.Mesh(new T.SphereGeometry(GR * 1.16, 48, 32), new T.ShaderMaterial({
      uniforms: { uA: U.uA, uOp: { value: 1 } }, transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'precision mediump float; varying vec3 vN; uniform vec3 uA; uniform float uOp; void main(){ float f = pow(max(0.0, -vN.z), 2.6); gl_FragColor = vec4(mix(uA, vec3(1.0), 0.25) * f * 0.9 * uOp, 1.0); }'
    })); globe.add(halo); globe.userData.halo = halo;
    const grat = []; // a few meridians and parallels
    for (let lon = -180; lon < 180; lon += 30) for (let lat = -80; lat < 80; lat += 4) grat.push(llv(lat, lon, GR), llv(lat + 4, lon, GR));
    for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 4) grat.push(llv(lat, lon, GR), llv(lat, lon + 4, GR));
    const gratM = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 }); globeSpin.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(grat), gratM)); globeMats.push(gratM);
    const land = window.LAND_110M;
    if (land) {
      const tf = land.transform, sc = tf.scale, tr = tf.translate;
      const arcs = land.arcs.map((a) => { let x = 0, y = 0; return a.map((q) => { x += q[0]; y += q[1]; return [x * sc[0] + tr[0], y * sc[1] + tr[1]]; }); });
      const arc = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
      const ring = (ids) => { const out = []; ids.forEach((i, k) => { const a = arc(i); for (let j = k ? 1 : 0; j < a.length; j++) out.push(a[j]); }); return out; };
      const polys = []; (function g(gm) { if (gm.type === 'Polygon') polys.push(gm.arcs.map(ring)); else if (gm.type === 'MultiPolygon') gm.arcs.forEach((pp) => polys.push(pp.map(ring))); else if (gm.geometries) gm.geometries.forEach(g); })(land.objects.land);
      const W = 720, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.fillStyle = '#fff';
      const unwrap = (r) => { const out = []; let off = 0; r.forEach((q, k) => { if (k) { const d = q[0] - r[k - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; } out.push([q[0] + off, q[1]]); }); if (Math.abs(out[out.length - 1][0] - out[0][0]) > 180) { const pole = out.reduce((s, q) => s + q[1], 0) / out.length < 0 ? -90 : 90; out.push([out[out.length - 1][0], pole], [out[0][0], pole]); } return out; };
      polys.forEach((pg) => { const rs = pg.map(unwrap); [-360, 0, 360].forEach((sh) => { x.beginPath(); rs.forEach((r) => r.forEach((q, k) => { const X = ((q[0] + sh + 180) / 360) * W, Y = ((90 - q[1]) / 180) * H; k ? x.lineTo(X, Y) : x.moveTo(X, Y); })); x.fill('evenodd'); }); });
      const data = x.getImageData(0, 0, W, H).data, pts = [], N = 15000, ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { // even (Fibonacci) sampling of the sphere, kept where the mask says land
        const yy = 1 - (i / (N - 1)) * 2, lat = (Math.asin(yy) * 180) / Math.PI, lon = ((((i * ga) * 180) / Math.PI) % 360) - 180;
        const px = Math.floor(((lon + 180) / 360) * W) % W, py = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
        if (data[(py * W + px) * 4 + 3] > 128) pts.push(llv(lat, lon, GR * 1.002));
      }
      const pm = new T.PointsMaterial({ color: 0xe4e4e7, size: 0.022, map: dotTex, transparent: true, depthWrite: false, opacity: 0.9, sizeAttenuation: true });
      globeSpin.add(new T.Points(new T.BufferGeometry().setFromPoints(pts), pm)); globeMats.push(pm);
    }
    Object.keys(PLACES).forEach((k) => {
      const p = PLACES[k], v = llv(p.lat, p.lon, GR * 1.01), col = new T.Color(p.col);
      const pin = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), new T.MeshBasicMaterial({ color: col, transparent: true })); pin.position.copy(v); globeSpin.add(pin); globeMats.push(pin.material);
      const sp = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: col, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })); sp.position.copy(v.clone().multiplyScalar(1.01)); sp.scale.setScalar(0.22); globeSpin.add(sp);
      p.v = v; p.sprite = sp; p.ang = Math.atan2(v.x, v.z); globeMats.push(sp.material);
    });
    [['paris', 'riga'], ['paris', 'boston']].forEach(([a, b]) => {
      const va = PLACES[a].v, vb = PLACES[b].v, mid = va.clone().add(vb).normalize().multiplyScalar(GR * (1.05 + va.distanceTo(vb) * 0.28));
      const pts = new T.QuadraticBezierCurve3(va, mid, vb).getPoints(48), ca = new T.Color(PLACES[a].col), cb = new T.Color(PLACES[b].col), cols = [];
      pts.forEach((_, i) => { const c = ca.clone().lerp(cb, i / 48); cols.push(c.r, c.g, c.b); });
      const g = new T.BufferGeometry().setFromPoints(pts); g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
      const lm = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }); globeSpin.add(new T.Line(g, lm)); globeMats.push(lm);
    });
    globeMats.forEach((m) => { m.userData.op = m.opacity; });
  })();
  const gl = { ry: 0, rx: 0.5, dragY: 0, dragX: 0, idle: 0, auto: 0 };

  /* ───────── Input ───────── */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, has: false };
  const spin = { x: 0, y: 0, vx: 0, vy: 0, down: false, lx: 0, ly: 0, moved: 0 };
  window.addEventListener('pointermove', (e) => {
    ptr.x = (e.clientX / V.w) * 2 - 1; ptr.y = -((e.clientY / V.h) * 2 - 1); ptr.has = e.pointerType !== 'touch';
    if (spin.down) {
      const dx = e.clientX - spin.lx, dy = e.clientY - spin.ly; spin.lx = e.clientX; spin.ly = e.clientY; spin.moved += Math.abs(dx) + Math.abs(dy);
      if (cur.globe > 0.5) { gl.dragY += dx * 0.006; gl.dragX = clamp(gl.dragX + dy * 0.004, -0.7, 0.7); gl.idle = 4; } else { spin.vy = dx * 0.006; spin.vx = dy * 0.006; }
    }
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    const z = e.target.closest && e.target.closest('[data-spin]'); if (!z || e.target.closest('a,button,input')) return;
    spin.down = true; spin.lx = e.clientX; spin.ly = e.clientY; spin.moved = 0; html.classList.add('is-drag');
  });
  const up = (e) => { if (!spin.down) return; spin.down = false; html.classList.remove('is-drag'); if (spin.moved < 6 && e.type === 'pointerup' && cur.globe < 0.5) ND.burst(); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  let shatter = 0, shatterT = 0;
  ND.burst = () => { shatterT = 1; }; // a click breaks the rock open for a moment

  /* ───────── Resize ───────── */
  const q = { s: 1, ema: 16, n: 0 }; // quality: the drawing buffer shrinks a step when frames get slow
  function resize() {
    V.w = window.innerWidth; V.h = window.innerHeight; V.aspect = V.w / V.h; V.halfW = HALF_H * V.aspect;
    V.dpr = Math.min(window.devicePixelRatio || 1, 1.6) * q.s;
    renderer.setPixelRatio(V.dpr); renderer.setSize(V.w, V.h, false);
    cam.aspect = V.aspect; cam.updateProjectionMatrix();
    const rs = Math.max(0.5, Math.min(1, 1 / V.dpr)), bw = Math.max(2, Math.round(V.w * V.dpr * rs)), bh = Math.max(2, Math.round(V.h * V.dpr * rs)); // refraction textures at about one CSS pixel
    rtA.setSize(bw, bh); rtB.setSize(bw, bh); U.uAspect.value = V.aspect;
  }
  window.addEventListener('resize', resize); resize();

  /* ───────── Frame ───────── */
  let last = performance.now(), sc = window.scrollY, scVel = 0, mqOff = 0;
  const A = { x: 0, y: 0, z: 0, s: 0 }, B = { x: 0, y: 0, z: 0, s: 0 }, C = { x: 0, y: 0, z: 0, s: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || ND.paused) { last = now; return; }
    q.ema = lerp(q.ema, Math.min(100, now - last), 0.06); if (++q.n > 90 && q.ema > 25 && q.s > 0.55) { q.s -= 0.15; q.n = 30; q.ema = 16; resize(); }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt * (reduce ? 0.3 : 1);
    const tg = ND.override ? Object.assign({}, ND.target, ND.override) : ND.target, k = 1 - Math.exp(-dt * 3.2);
    NUM.forEach((n) => { cur[n] = lerp(cur[n], tg[n], n === 'night' ? 1 - Math.exp(-dt * 2.2) : k); });
    for (let i = 0; i < 4; i++) cur.pw[i] = lerp(cur.pw[i], tg.pw[i], 1 - Math.exp(-dt * 2.4));
    const sy = window.scrollY, prev = sc; sc = lerp(sc, sy, 1 - Math.exp(-dt * 8)); scVel = lerp(scVel, (sc - prev) / Math.max(dt, 0.001), 0.2); scrollPx = sc;
    ptr.sx = lerp(ptr.sx, ptr.x, 1 - Math.exp(-dt * 5)); ptr.sy = lerp(ptr.sy, ptr.y, 1 - Math.exp(-dt * 5));
    if (shatterT > 0) { shatter = lerp(shatter, 1, 1 - Math.exp(-dt * 9)); shatterT -= dt * 0.9; } else shatter = lerp(shatter, 0, 1 - Math.exp(-dt * 2.5));
    if (!spin.down) { spin.vx *= Math.exp(-dt * 2); spin.vy *= Math.exp(-dt * 2); }
    spin.x += spin.vx; spin.y += spin.vy;

    U.uTime.value = time; U.uNight.value = cur.night; U.uMouse2.value.set(ptr.sx, ptr.sy); U.uRes.value.set(Math.floor(V.w * V.dpr), Math.floor(V.h * V.dpr));
    U.uLight.value.set(-0.5 + ptr.sx * 0.8, 0.72 + ptr.sy * 0.5, 0.48);
    const cx = cur.x * V.halfW, cy = cur.y * HALF_H, S = cur.scale * Math.min(1, V.aspect * 1.2), mx = ptr.sx * V.halfW, my = ptr.sy * HALF_H;
    const vel = Math.min(3, Math.abs(scVel) / 900);

    for (let n = 0; n < chunks.length; n++) {
      const c = chunks[n];
      layout(tg.a, c, cx, cy, S, tg.active, A); layout(tg.b, c, cx, cy, S, tg.active, B);
      let t = tg.t; t = t * t * (3 - 2 * t);
      let x = lerp(A.x, B.x, t), y = lerp(A.y, B.y, t), z = lerp(A.z, B.z, t), s = lerp(A.s, B.s, t);
      if (shatter > 0.001) { layout('cluster', c, cx, cy, S * 1.15, -1, C); x = lerp(x, C.x, shatter); y = lerp(y, C.y, shatter); z = lerp(z, C.z, shatter); s = lerp(s, C.s, shatter); }
      if (Math.abs(y - c.pos.y) > HALF_H * 1.8) c.pos.set(x, y, z); // a drifting chunk wrapped around off screen: no streak across the page
      const kk = 1 - Math.exp(-dt * (2.2 + c.r3 * 1.6)); c.pos.x = lerp(c.pos.x, x, kk); c.pos.y = lerp(c.pos.y, y, kk); c.pos.z = lerp(c.pos.z, z, kk); c.s = lerp(c.s, s, 1 - Math.exp(-dt * 4));
      // the pointer nudges chunks away; they drift back
      if (ptr.has && c.s > 0.02 && !(n === 0 && c.s > 0.9 * S)) { const dx = c.pos.x + c.push.x - mx, dy = c.pos.y + c.push.y - my, dd = Math.hypot(dx, dy), rr = 0.5 + c.s * 1.3; if (dd < rr) { const f = (1 - dd / rr) * dt * 5; c.push.x += (dx / (dd + 0.001)) * f; c.push.y += (dy / (dd + 0.001)) * f; } }
      c.push.multiplyScalar(Math.exp(-dt * 1.6));
      const bob = Math.sin(time * (0.5 + c.r1 * 0.5) + c.r2 * 9) * 0.05 * (1 + (1 - Math.min(1, c.s)));
      c.rot.x += c.w.x * dt * (1 + vel); c.rot.y += c.w.y * dt * (1 + vel); c.rot.z += c.w.z * dt;
      const on = c.s > 0.012, gl0 = lerp(c.glow, tg.active === n ? (tg.a === 'six' ? 1 - tg.t : 0) + (tg.b === 'six' ? tg.t : 0) : 0, 1 - Math.exp(-dt * 4)); c.glow = gl0;
      [c.back, c.front].forEach((m) => {
        m.visible = on; if (!on) return;
        m.position.set(c.pos.x + c.push.x, c.pos.y + c.push.y + bob, c.pos.z); m.scale.setScalar(c.s);
        if (n === 0) m.rotation.set(c.rot.x * 0.25 + spin.x - ptr.sy * 0.25, c.rot.y * 0.6 + spin.y + ptr.sx * 0.35 + sc * 0.0012, c.rot.z * 0.2); else m.rotation.copy(c.rot);
        m.material.uniforms.uFade.value = cur.fade * (c.big ? 1 : 0.6); m.material.uniforms.uGlow.value = gl0 * 0.7;
      });
    }
    // data points
    points.visible = cur.pop > 0.01;
    if (points.visible) { ptsU.uW.value.set(cur.pw[0], cur.pw[1], cur.pw[2], cur.pw[3]); ptsU.uC.value.set(cur.ptx * V.halfW, cur.pty * HALF_H, -1.4); ptsU.uS.value = cur.pts * Math.min(1, V.aspect * 1.15); ptsU.uOp.value = cur.pop; ptsU.uAct.value = tg.active; ptsU.uPx.value = (V.h * V.dpr) / 300; }
    // shadow under the hero rock
    const c0 = chunks[0], one = c0.s / Math.max(0.001, S);
    shadow.position.set(c0.front.position.x + 0.25 * c0.s, c0.front.position.y - 1.05 * c0.s, -1.2); shadow.scale.set(c0.s * 3.4, c0.s * 1.5, 1);
    shadowMat.opacity = clamp(one - 0.35, 0, 1) * (1 - cur.night) * (1 - cur.fade) * 0.9;

    // marquee: follows the hero as the page scrolls, slides sideways with time and with the scroll
    if (marquee) {
      const wH = BG_HALF_H * 2, wW = wH * V.aspect, h = Math.min(wH * 0.3, wW * 0.3), per = h * marquee.userData.ratio;
      mqOff += dt * (0.035 + Math.min(0.5, Math.abs(scVel) / 6000)) * (reduce ? 0.2 : 1);
      marquee.scale.set(wW * 1.2, h, 1); marquee.position.set(0, (sc / V.h) * wH * 0.92 + wH * 0.035, BG_Z);
      const u = marquee.material.uniforms; u.uRep.value = (wW * 1.2) / per; u.uOff.value = mqOff; u.uOp.value = cur.marquee; marquee.visible = cur.marquee > 0.01 && sc < V.h * 1.3;
    }
    if (ring) {
      ring.visible = cur.ring > 0.02; ring.position.set(c0.front.position.x, c0.front.position.y, 0); ring.scale.setScalar(Math.max(0.001, S * (0.75 + 0.25 * cur.ring)));
      ring.rotation.set(0.32 + ptr.sy * -0.12, time * 0.22, -0.28 + ptr.sx * 0.06); ring.material.uniforms.uOp.value = cur.ring;
    }

    // globe
    globe.visible = cur.globe > 0.02;
    if (globe.visible) {
      const p = PLACES[ND.place] || PLACES.paris; if (gl.idle > 0) gl.idle -= dt; else { gl.dragY *= Math.exp(-dt * 1.5); gl.dragX *= Math.exp(-dt * 1.5); }
      let d = -p.ang - gl.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); gl.ry += d * (1 - Math.exp(-dt * 2.6)); gl.rx = lerp(gl.rx, ((p.lat * Math.PI) / 180) * 0.75, 1 - Math.exp(-dt * 2.6));
      globeSpin.rotation.set(0, gl.ry + gl.dragY + Math.sin(time * 0.3) * 0.05, 0); globe.rotation.set(gl.rx + gl.dragX, 0, 0);
      globe.position.set(cx, cy, 0); const e = cur.globe * cur.globe * (3 - 2 * cur.globe); globe.scale.setScalar(Math.max(0.001, e) * S);
      globeMats.forEach((m) => { m.opacity = m.userData.op * e; }); globe.userData.halo.material.uniforms.uOp.value = e;
      Object.keys(PLACES).forEach((kk) => { const q = PLACES[kk], on = kk === ND.place; q.sprite.scale.setScalar((on ? 0.34 : 0.16) + (on ? Math.sin(time * 3) * 0.06 : 0)); });
    }
    cam.position.x = lerp(cam.position.x, ptr.sx * 0.18, 0.05); cam.position.y = lerp(cam.position.y, ptr.sy * 0.12, 0.05); cam.lookAt(0, 0, 0);

    renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(bgScene, cam);
    renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(backScene, cam); renderer.render(midScene, cam);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(bgScene, cam); renderer.clearDepth(); renderer.render(midScene, cam); renderer.render(frontScene, cam);
    if (!ND.started) { ND.started = true; html.classList.add('gl-live'); }
  }
  ND.view = V; ND.state = cur;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
  requestAnimationFrame(frame);
})();
