/* Immersive portfolio · WebGL scene (three.js r128, no build step).
   One glass crystal made of 80 shards. app.js sets ND3D.target (layout weights, position, colours) from the scroll position
   and this file eases towards it every frame. Passes: background → texture A; A + back faces + core/globe → texture B;
   then the screen gets the background, the core/globe and the front faces, which refract texture B. */
(function () {
  'use strict';
  const T = window.THREE, canvas = document.getElementById('gl'), html = document.documentElement;
  const ND = (window.ND3D = { ok: false, target: null, override: null, place: 'paris', words: [], burst() {}, addWord() {}, ready: Promise.resolve() });
  const fail = () => { html.classList.add('no-gl'); };
  if (!T || !canvas) return fail();
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return fail(); }
  if (!renderer.getContext()) return fail();
  ND.ok = true; html.classList.add('gl');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  ND.hex = hex;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const FOV = 35, CAMZ = 10, HALF_H = Math.tan((FOV * Math.PI) / 360) * CAMZ;
  const cam = new T.PerspectiveCamera(FOV, 1, 0.1, 60); cam.position.z = CAMZ;
  const V = { w: 2, h: 2, aspect: 1, halfW: HALF_H, dpr: 1 };
  renderer.setClearColor(0x06070b, 1); renderer.autoClear = false;
  const rtOpt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, stencilBuffer: false };
  const rtA = new T.WebGLRenderTarget(2, 2, Object.assign({ depthBuffer: false }, rtOpt));
  const rtB = new T.WebGLRenderTarget(2, 2, Object.assign({ depthBuffer: true }, rtOpt));

  const bgScene = new T.Scene(), backScene = new T.Scene(), midScene = new T.Scene(), frontScene = new T.Scene();

  /* ───────── State (eased towards ND.target) ───────── */
  const BASE = { w1: 1, w2: 0, w3: 0, w4: 0, half: 0, x: 0, y: 0, scale: 0.55, dim: 0, globe: 0, active: -1, colA: hex('#FFCC00'), colB: hex('#4338ca'), tint: [1, 1, 1] };
  const cur = JSON.parse(JSON.stringify(BASE)); ND.target = JSON.parse(JSON.stringify(BASE));
  const act = [0, 0, 0, 0, 0, 0];
  const NUM = ['w1', 'w2', 'w3', 'w4', 'half', 'x', 'y', 'scale', 'dim', 'globe'], COL = ['colA', 'colB', 'tint'];

  /* ───────── Background: slow colour fields + grain ───────── */
  const U = {
    uTime: { value: 0 }, uAspect: { value: 1 }, uA: { value: new T.Vector3() }, uB: { value: new T.Vector3() }, uMouse2: { value: new T.Vector2() },
    uScroll: { value: 0 }, uRes: { value: new T.Vector2(2, 2) }, uW: { value: new T.Vector4(1, 0, 0, 0) }, uHalf: { value: 0 }, uAct: { value: act },
    uMouse: { value: new T.Vector3(99, 99, 0) }, uRepel: { value: 1 }, uBurst: { value: 0 }, uTint: { value: new T.Vector3(1, 1, 1) }, uDim: { value: 0 },
    uLight: { value: new T.Vector3(-0.5, 0.7, 0.6) }, uObj: { value: new T.Vector2() }
  };
  const quadGeo = new T.PlaneGeometry(2, 2);
  const QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }';
  const aurora = new T.Mesh(quadGeo, new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uAspect: U.uAspect, uA: U.uA, uB: U.uB, uMouse2: U.uMouse2, uScroll: U.uScroll, uObj: U.uObj },
    depthTest: false, depthWrite: false, vertexShader: QUAD_V,
    fragmentShader: [
      'precision highp float; varying vec2 vUv; uniform float uTime, uAspect, uScroll; uniform vec3 uA, uB; uniform vec2 uMouse2, uObj;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float blob(vec2 p, vec2 c, float r){ float d = length(p - c) / r; return exp(-d * d * 2.2); }',
      'void main(){',
      '  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);',
      '  vec2 q = p + 0.09 * vec2(sin(p.y * 3.1 + uTime * 0.21), cos(p.x * 2.7 - uTime * 0.17));',
      '  float s = uScroll * 6.2831;',
      '  vec3 col = vec3(0.020, 0.023, 0.036);',
      '  col += uA * 0.34 * blob(q, uObj + vec2(-0.30 + 0.10 * sin(uTime * 0.13 + s), 0.22 + 0.08 * cos(uTime * 0.11)), 0.62);',
      '  col += uB * 0.40 * blob(q, uObj + vec2(0.34 + 0.12 * cos(uTime * 0.09 - s), -0.26 + 0.10 * sin(uTime * 0.15)), 0.70);',
      '  col += mix(uA, uB, 0.5) * 0.10 * blob(q, vec2(-0.55 * uAspect, -0.45), 0.55);',
      '  col += mix(uA, vec3(1.0), 0.3) * 0.07 * blob(p, uMouse2 * vec2(uAspect, 1.0) * 0.5, 0.26);',
      '  col *= 1.0 - 0.42 * dot(p, p) / (0.25 * uAspect * uAspect + 0.25);',
      '  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.022;',
      '  gl_FragColor = vec4(max(col, 0.0), 1.0);',
      '}'
    ].join('\n')
  }));
  aurora.frustumCulled = false; aurora.renderOrder = -10; bgScene.add(aurora);

  /* ───────── Giant words (canvas textures on planes behind the crystal, so the glass refracts them) ───────── */
  const WORD_Z = -2.2, WORD_HALF_H = Math.tan((FOV * Math.PI) / 360) * (CAMZ - WORD_Z);
  const FONT = '800 240px "Plus Jakarta Sans", system-ui, sans-serif';
  function wordMesh(lines, solid) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), LH = 228, pad = 40;
    x.font = FONT; const widths = lines.map((l) => x.measureText(l).width * 0.955 + 8), wmax = Math.max.apply(null, widths);
    const k = Math.min(1, 4096 / (wmax + pad * 2));
    c.width = Math.ceil((wmax + pad * 2) * k); c.height = Math.ceil((LH * lines.length + pad * 2) * k);
    x.setTransform(k, 0, 0, k, 0, 0); x.font = FONT; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
    lines.forEach((l, i) => {
      let px = pad; const y = pad + LH * i + 186;
      for (const ch of l) { // manual tracking: tighter than the font's own advance
        if (solid) { x.fillStyle = '#fff'; x.fillText(ch, px, y); } else { x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeText(ch, px, y); }
        px += x.measureText(ch).width * 0.955;
      }
    });
    const tex = new T.CanvasTexture(c); tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
    m.userData.ratio = c.height / c.width; m.position.z = WORD_Z; m.renderOrder = -5; m.frustumCulled = false;
    return m;
  }
  // app.js registers one word per section; it sticks to the viewport while its section is on screen.
  ND.addWord = function (el, lines, o) {
    o = o || {}; const w = { el, lines, solid: !!o.solid, op: o.opacity == null ? 0.12 : o.opacity, fit: o.fit || 0.9, mesh: null, show: 0 };
    ND.words.push(w); if (fontsOk) buildWord(w); return w;
  };
  let fontsOk = false;
  function buildWord(w) { w.mesh = wordMesh(w.lines, w.solid); bgScene.add(w.mesh); }
  ND.ready = (document.fonts && document.fonts.load ? document.fonts.load(FONT, 'NILS').catch(() => {}) : Promise.resolve())
    .then(() => { fontsOk = true; ND.words.forEach((w) => { if (!w.mesh) buildWord(w); }); });

  /* ───────── Dust ───────── */
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  const DUST = 420, dustPos = new Float32Array(DUST * 3), dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { dustPos[i * 3] = (rnd() - 0.5) * 22; dustPos[i * 3 + 1] = (rnd() - 0.5) * 12; dustPos[i * 3 + 2] = -6 + rnd() * 10; dustSeed[i] = rnd(); }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('aSeed', new T.BufferAttribute(dustSeed, 1));
  const dust = new T.Points(dustGeo, new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScroll: U.uScroll, uMap: { value: dotTex }, uA: U.uA, uPx: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: 'attribute float aSeed; uniform float uTime, uScroll, uPx; varying float vA; void main(){ vec3 p = position; p.y = mod(p.y + uScroll * 26.0 * (0.4 + aSeed) + uTime * 0.05 * (0.5 + aSeed) + 6.0, 12.0) - 6.0; p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.25; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (0.6 + aSeed * 2.2) * 10.0 / -mv.z; vA = 0.25 + 0.55 * fract(aSeed * 7.3); }',
    fragmentShader: 'precision mediump float; uniform sampler2D uMap; uniform vec3 uA; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(mix(vec3(1.0), uA, 0.45) * a * vA * 0.7, 1.0); }'
  }));
  dust.frustumCulled = false; dust.renderOrder = -4; bgScene.add(dust);

  /* ───────── Crystal: 80 shards in one geometry ───────── */
  const GROUP_DIR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((d) => new T.Vector3(d[0], d[1], d[2]));
  const GROUP_COL = ['#FFCC00', '#818cf8', '#fb923c', '#34d399', '#38bdf8', '#fb7185'].map(hex); // same order as BUILD in app.js
  const geo = (() => {
    const src = new T.IcosahedronGeometry(1, 1).attributes.position, n = src.count / 3, VPS = 24;
    const A = (size) => new Float32Array(n * VPS * size);
    const pos = A(3), nor = A(3), cen = A(3), t1 = A(3), t3 = A(3), t4 = A(3), axis = A(3), gdir = A(3), gcol = A(3), rand = A(4), grp = A(1);
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), ctr = new T.Vector3(), tmp = new T.Vector3(), nn = new T.Vector3();
    const order = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let f = 0; f < n; f++) {
      a.fromBufferAttribute(src, f * 3); b.fromBufferAttribute(src, f * 3 + 1); c.fromBufferAttribute(src, f * 3 + 2);
      const IN = 0.42, ai = a.clone().multiplyScalar(IN), bi = b.clone().multiplyScalar(IN), ci = c.clone().multiplyScalar(IN);
      ctr.copy(a).add(b).add(c).add(ai).add(bi).add(ci).multiplyScalar(1 / 6);
      const tris = [[a, b, c], [ai, ci, bi], [a, ai, bi], [a, bi, b], [b, bi, ci], [b, ci, c], [c, ci, ai], [c, ai, a]];
      const dir = ctr.clone().normalize(), r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
      const ax = new T.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      let g = 0, best = -9; GROUP_DIR.forEach((d, i) => { const dp = d.dot(dir); if (dp > best) { best = dp; g = i; } });
      const e1 = dir.clone().multiplyScalar(2.3 + r1 * 3.2).add(new T.Vector3((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.0, (rnd() - 0.5) * 1.6)); // scattered cloud
      const k = order[f] / n, ang3 = k * Math.PI * 2 * 3 + r2 * 0.25, rad3 = 1.95 + (order[f] % 3) * 0.32 + r3 * 0.1; // three orbits around the globe
      const e3 = new T.Vector3(Math.cos(ang3) * rad3, (r4 - 0.5) * 0.22 + Math.sin(ang3 * 2) * 0.06, Math.sin(ang3) * rad3);
      const ang4 = k * Math.PI * 2 * 4.5, e4 = new T.Vector3(Math.cos(ang4) * (0.62 + r2 * 0.18), (k - 0.5) * 8.6, Math.sin(ang4) * (0.62 + r2 * 0.18)); // helix column
      tris.forEach((tri, ti) => {
        nn.copy(tri[1]).sub(tri[0]).cross(tmp.copy(tri[2]).sub(tri[0])).normalize();
        tri.forEach((v, vi) => {
          const i = (f * VPS + ti * 3 + vi), i3 = i * 3;
          pos[i3] = v.x - ctr.x; pos[i3 + 1] = v.y - ctr.y; pos[i3 + 2] = v.z - ctr.z;
          nor[i3] = nn.x; nor[i3 + 1] = nn.y; nor[i3 + 2] = nn.z;
          cen[i3] = ctr.x; cen[i3 + 1] = ctr.y; cen[i3 + 2] = ctr.z;
          t1[i3] = e1.x; t1[i3 + 1] = e1.y; t1[i3 + 2] = e1.z; t3[i3] = e3.x; t3[i3 + 1] = e3.y; t3[i3 + 2] = e3.z; t4[i3] = e4.x; t4[i3 + 1] = e4.y; t4[i3 + 2] = e4.z;
          axis[i3] = ax.x; axis[i3 + 1] = ax.y; axis[i3 + 2] = ax.z;
          gdir[i3] = GROUP_DIR[g].x; gdir[i3 + 1] = GROUP_DIR[g].y; gdir[i3 + 2] = GROUP_DIR[g].z;
          gcol[i3] = GROUP_COL[g][0]; gcol[i3 + 1] = GROUP_COL[g][1]; gcol[i3 + 2] = GROUP_COL[g][2];
          rand[i * 4] = r1; rand[i * 4 + 1] = r2; rand[i * 4 + 2] = r3; rand[i * 4 + 3] = r4; grp[i] = g;
        });
      });
    }
    const gm = new T.BufferGeometry(), set = (name, arr, size) => gm.setAttribute(name, new T.BufferAttribute(arr, size));
    set('position', pos, 3); set('normal', nor, 3); set('aCenter', cen, 3); set('aT1', t1, 3); set('aT3', t3, 3); set('aT4', t4, 3); set('aAxis', axis, 3);
    set('aGDir', gdir, 3); set('aGCol', gcol, 3); set('aRand', rand, 4); set('aGroup', grp, 1);
    return gm;
  })();

  const SHARD_V = [
    'attribute vec3 aCenter, aT1, aT3, aT4, aAxis, aGDir, aGCol; attribute vec4 aRand; attribute float aGroup;',
    'uniform float uTime, uHalf, uRepel, uBurst; uniform vec4 uW; uniform float uAct[6]; uniform vec3 uMouse;',
    'varying vec3 vN, vV, vCol; varying float vAct, vGrp, vSeed;',
    'mat3 rot(vec3 a, float g){ float s = sin(g), c = cos(g), o = 1.0 - c; return mat3(o*a.x*a.x + c, o*a.x*a.y + a.z*s, o*a.z*a.x - a.y*s, o*a.x*a.y - a.z*s, o*a.y*a.y + c, o*a.y*a.z + a.x*s, o*a.z*a.x + a.y*s, o*a.y*a.z - a.x*s, o*a.z*a.z + c); }',
    'vec3 spinY(vec3 p, float g){ float s = sin(g), c = cos(g); return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }',
    'void main(){',
    '  float w0 = clamp(1.0 - uW.x - uW.y - uW.z - uW.w, 0.0, 1.0);',
    '  float act = uAct[int(aGroup + 0.5)];',
    '  vec3 dir = normalize(aCenter);',
    '  vec3 t2 = aCenter + aGDir * (0.42 + act * 0.7);',
    '  vec3 t3 = spinY(aT3, uTime * (0.10 + 0.05 * aRand.z));',
    '  vec3 t4 = spinY(aT4, uTime * 0.22 + aT4.y * 0.35);',
    '  vec3 c = aCenter * w0 + aT1 * uW.x + t2 * uW.y + t3 * uW.z + t4 * uW.w;',
    '  c.y += sign(aCenter.y + 0.0001) * uHalf * 0.46;',                                            // split in two halves
    '  c += dir * (0.5 + 0.5 * sin(uTime * 1.1 + aRand.z * 6.2831)) * 0.035 * w0;',                  // the assembled crystal breathes
    '  c += dir * uBurst * (0.5 + aRand.x * 1.5);',
    '  c += aAxis * sin(uTime * 0.6 + aRand.w * 6.2831) * 0.09 * (1.0 - w0);',
    '  float loose = clamp(uW.x + uW.z + uW.w * 0.8 + uBurst * 0.7, 0.0, 1.5);',
    '  float ang = loose * (aRand.x * 6.2831 + uTime * (0.25 + aRand.y * 0.6));',
    '  float sc = 1.0 - 0.62 * uW.z - 0.42 * uW.w - 0.1 * uW.x;',
    '  mat3 R = rot(aAxis, ang);',
    '  vec4 wp = modelMatrix * vec4(R * (position * sc) + c, 1.0);',
    '  vec4 wc = modelMatrix * vec4(c, 1.0);',
    '  vec2 d = wc.xy - uMouse.xy; float f = smoothstep(1.35, 0.0, length(d)) * uRepel;',           // shards lean away from the pointer
    '  wp.xy += normalize(d + 0.0001) * f * 0.34; wp.z += f * 0.25;',
    '  vec4 mv = viewMatrix * wp;',
    '  vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * (R * normal)); vV = mv.xyz; vCol = aGCol; vAct = act; vGrp = uW.y; vSeed = aRand.x;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  const SHARD_F = [
    'precision highp float;',
    'uniform sampler2D uBg; uniform vec2 uRes; uniform vec3 uTint, uLight; uniform float uTime, uDim, uBack;',
    'varying vec3 vN, vV, vCol; varying float vAct, vGrp, vSeed;',
    'vec3 pal(float t){ return mix(0.5 + 0.5 * cos(6.2831 * (t * 0.85 + vec3(0.0, 0.12, 0.28))), vec3(1.0), 0.25); }',
    'void main(){',
    '  vec3 N = normalize(vN); if (uBack > 0.5) N = -N;',
    '  vec3 Vd = normalize(-vV); float ndv = clamp(dot(N, Vd), 0.0, 1.0);',
    '  float fres = pow(1.0 - ndv, 3.0);',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  vec2 off = N.xy * (0.07 + 0.05 * fres) * (uBack > 0.5 ? -0.6 : 1.0);',
    '  vec3 col = vec3(texture2D(uBg, uv - off * 0.88).r, texture2D(uBg, uv - off).g, texture2D(uBg, uv - off * 1.13).b);', // dispersion
    '  vec3 tint = mix(uTint, vCol, vGrp * (0.55 + 0.45 * vAct));',
    '  col = col * mix(vec3(1.0), tint, 0.38) * (uBack > 0.5 ? 0.92 : 1.08) + vec3(0.012, 0.014, 0.022);',
    '  vec3 R = reflect(-Vd, N);',
    '  float key = pow(max(dot(R, normalize(uLight)), 0.0), 26.0);',
    '  float rim = pow(max(dot(R, normalize(vec3(0.7, -0.3, 0.5))), 0.0), 12.0);',
    '  vec3 iri = pal(ndv * 1.15 + N.y * 0.22 + vSeed * 0.12 + uTime * 0.025);',
    '  col += iri * fres * 0.42 + iri * 0.02;',
    '  col += vec3(1.0) * key * 0.5 + tint * rim * 0.32;',
    '  col += tint * (0.035 + 0.16 * vAct * vGrp);',
    '  col += vec3(1.0) * smoothstep(0.75, 1.0, fres) * 0.25;',
    '  col = mix(col, texture2D(uBg, uv).rgb + iri * fres * 0.12 + tint * 0.012, uDim);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');
  const shardU = (bg, back) => ({ uBg: { value: bg }, uBack: { value: back }, uRes: U.uRes, uTint: U.uTint, uLight: U.uLight, uTime: U.uTime, uDim: U.uDim, uHalf: U.uHalf, uRepel: U.uRepel, uBurst: U.uBurst, uW: U.uW, uAct: U.uAct, uMouse: U.uMouse });
  const backMesh = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: shardU(rtA.texture, 1), vertexShader: SHARD_V, fragmentShader: SHARD_F, side: T.BackSide }));
  const frontMesh = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: shardU(rtB.texture, 0), vertexShader: SHARD_V, fragmentShader: SHARD_F, side: T.FrontSide }));
  backMesh.frustumCulled = frontMesh.frustumCulled = false;
  const quadA = new T.Mesh(quadGeo, new T.ShaderMaterial({ uniforms: { uMap: { value: rtA.texture } }, depthTest: false, depthWrite: false, vertexShader: QUAD_V, fragmentShader: 'precision mediump float; varying vec2 vUv; uniform sampler2D uMap; void main(){ gl_FragColor = texture2D(uMap, vUv); }' }));
  quadA.frustumCulled = false; quadA.renderOrder = -10;
  backScene.add(quadA, backMesh); frontScene.add(frontMesh);

  /* ───────── Core + rings (inside the crystal, shown when it opens) ───────── */
  const core = new T.Group(); midScene.add(core);
  const coreMat = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const coreWire = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(0.3, 0)), coreMat); core.add(coreWire);
  const coreWire2 = new T.LineSegments(new T.EdgesGeometry(new T.OctahedronGeometry(0.16, 0)), coreMat); core.add(coreWire2);
  const glowMat = new T.SpriteMaterial({ map: dotTex, color: 0xffcc00, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, depthTest: false });
  const glow = new T.Sprite(glowMat); glow.scale.set(2.4, 2.4, 1); core.add(glow);
  const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false });
  const rings = [1.62, 1.86, 2.2].map((r, i) => { const m = new T.Mesh(new T.TorusGeometry(r, 0.0045, 6, 160), ringMat); m.rotation.set(1.2 + i * 0.5, i * 0.9, 0); midScene.add(m); return m; });

  /* ───────── Globe (Path section): dotted land, three pins, two arcs ───────── */
  const globe = new T.Group(), globeSpin = new T.Group(); globe.add(globeSpin); midScene.add(globe); globe.visible = false;
  const GR = 1.18, PLACES = { paris: { lat: 48.8566, lon: 2.3522, col: '#FFCC00' }, riga: { lat: 56.9496, lon: 24.1052, col: '#34d399' }, boston: { lat: 42.3601, lon: -71.0942, col: '#fb7185' } };
  const llv = (lat, lon, r) => { const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180; return new T.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
  const globeMats = [];
  (function buildGlobe() {
    const body = new T.Mesh(new T.SphereGeometry(GR * 0.985, 48, 32), new T.MeshBasicMaterial({ color: 0x070a14, transparent: true, opacity: 0.78 })); globeSpin.add(body); globeMats.push(body.material);
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
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, px: -9, py: -9, has: false };
  const spin = { x: 0, y: 0, vx: 0, vy: 0, down: false, lx: 0, ly: 0, moved: 0, zone: null };
  window.addEventListener('pointermove', (e) => {
    ptr.x = (e.clientX / V.w) * 2 - 1; ptr.y = -((e.clientY / V.h) * 2 - 1); ptr.has = e.pointerType !== 'touch';
    if (spin.down) {
      const dx = e.clientX - spin.lx, dy = e.clientY - spin.ly; spin.lx = e.clientX; spin.ly = e.clientY; spin.moved += Math.abs(dx) + Math.abs(dy);
      if (cur.globe > 0.5) { gl.dragY += dx * 0.006; gl.dragX = clamp(gl.dragX + dy * 0.004, -0.7, 0.7); gl.idle = 4; }
      else { spin.vy = dx * 0.0065; spin.vx = dy * 0.0065; }
    }
  }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    const z = e.target.closest && e.target.closest('[data-spin]'); if (!z || e.target.closest('a,button,input,.glass')) return;
    spin.down = true; spin.lx = e.clientX; spin.ly = e.clientY; spin.moved = 0; spin.zone = z; html.classList.add('is-drag');
  });
  const up = (e) => { if (!spin.down) return; spin.down = false; html.classList.remove('is-drag'); if (spin.moved < 6 && e.type === 'pointerup' && cur.globe < 0.5) ND.burst(1); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  let burst = 0, burstV = 0;
  ND.burst = (k) => { burstV += 2.6 * (k || 1); };

  /* ───────── Resize ───────── */
  function resize() {
    V.w = window.innerWidth; V.h = window.innerHeight; V.aspect = V.w / V.h; V.halfW = HALF_H * V.aspect;
    V.dpr = Math.min(window.devicePixelRatio || 1, V.w < 760 ? 1.5 : 1.6);
    renderer.setPixelRatio(V.dpr); renderer.setSize(V.w, V.h, false);
    cam.aspect = V.aspect; cam.updateProjectionMatrix();
    const rs = Math.max(0.5, Math.min(1, 1 / V.dpr)), bw = Math.max(2, Math.round(V.w * V.dpr * rs)), bh = Math.max(2, Math.round(V.h * V.dpr * rs)); // refraction textures at about one CSS pixel
    rtA.setSize(bw, bh); rtB.setSize(bw, bh);
    U.uAspect.value = V.aspect; dust.material.uniforms.uPx.value = (V.h * V.dpr) / 420;
  }
  window.addEventListener('resize', resize); resize();

  /* ───────── Frame ───────── */
  let last = performance.now(), time = 0, sc = window.scrollY, scVel = 0, placeT = 0;
  const v3 = new T.Vector3(), colT = new T.Color();
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt * (reduce ? 0.35 : 1);
    const tg = ND.override ? Object.assign({}, ND.target, ND.override) : ND.target, k = 1 - Math.exp(-dt * 3.4), kc = 1 - Math.exp(-dt * 2.4);
    NUM.forEach((n) => { cur[n] = lerp(cur[n], tg[n], k); });
    COL.forEach((n) => { for (let i = 0; i < 3; i++) cur[n][i] = lerp(cur[n][i], tg[n][i], kc); });
    for (let i = 0; i < 6; i++) act[i] = lerp(act[i], tg.active === i ? 1 : 0, 1 - Math.exp(-dt * 5));
    // scroll: eased position + velocity (velocity loosens the crystal and spins it)
    const sy = window.scrollY; const prev = sc; sc = lerp(sc, sy, 1 - Math.exp(-dt * 7)); scVel = lerp(scVel, (sc - prev) / Math.max(dt, 0.001), 0.2);
    const maxS = Math.max(1, document.documentElement.scrollHeight - V.h);
    ptr.sx = lerp(ptr.sx, ptr.x, 1 - Math.exp(-dt * 5)); ptr.sy = lerp(ptr.sy, ptr.y, 1 - Math.exp(-dt * 5));
    burstV += (-burst * 30 - burstV * 5.5) * dt; burst = Math.max(0, burst + burstV * dt);
    if (!spin.down) { spin.vx *= Math.exp(-dt * 2.2); spin.vy *= Math.exp(-dt * 2.2); }
    spin.x += spin.vx; spin.y += spin.vy; spin.x *= Math.exp(-dt * 0.6);

    // uniforms
    U.uTime.value = time; U.uScroll.value = sc / maxS;
    U.uA.value.fromArray(cur.colA); U.uB.value.fromArray(cur.colB); U.uTint.value.fromArray(cur.tint);
    U.uMouse2.value.set(ptr.sx, ptr.sy);
    U.uW.value.set(cur.w1, cur.w2, cur.w3, cur.w4); U.uHalf.value = cur.half; U.uDim.value = cur.dim;
    U.uBurst.value = burst + Math.min(0.3, Math.abs(scVel) / 9000);
    U.uRepel.value = ptr.has ? 1 : 0; U.uMouse.value.set(ptr.sx * V.halfW, ptr.sy * HALF_H, 0);
    U.uLight.value.set(-0.45 + ptr.sx * 0.9, 0.65 + ptr.sy * 0.6, 0.6);
    U.uRes.value.set(V.w * V.dpr, V.h * V.dpr);

    // crystal transform
    const ox = cur.x * V.halfW, oy = cur.y * HALF_H, fitS = Math.min(1, V.aspect * 1.25);
    U.uObj.value.set(cur.x * 0.5 * V.aspect, cur.y * 0.5);
    [backMesh, frontMesh].forEach((m) => {
      m.position.set(ox, oy + Math.sin(time * 0.5) * 0.06, 0); m.scale.setScalar(cur.scale * fitS);
      m.rotation.set(0.22 + Math.sin(time * 0.21) * 0.1 - ptr.sy * 0.22 + spin.x, time * 0.16 + sc * 0.0011 + ptr.sx * 0.3 + spin.y, Math.sin(time * 0.13) * 0.06);
    });
    core.position.copy(frontMesh.position); core.scale.setScalar(cur.scale * fitS * (1 + cur.half * 0.5 + burst));
    coreWire.rotation.set(time * 0.4, time * 0.55, 0); coreWire2.rotation.set(-time * 0.7, time * 0.3, time * 0.2);
    const coreVis = clamp(cur.half + cur.w2 + cur.w1 * 0.5 + burst * 2, 0, 1) * (1 - cur.globe) * (1 - cur.w4);
    colT.setRGB(cur.colA[0], cur.colA[1], cur.colA[2]); glowMat.color.copy(colT); glowMat.opacity = 0.15 + 0.5 * coreVis; coreMat.opacity = 0.25 + 0.75 * coreVis; coreMat.color.copy(colT).lerp(new T.Color(1, 1, 1), 0.55);
    core.visible = cur.globe < 0.9;
    const ringK = clamp(1 - cur.w1 - cur.w3 - cur.w4, 0, 1);
    rings.forEach((m, i) => { m.position.copy(frontMesh.position); m.scale.setScalar(cur.scale * fitS * (1 + cur.w2 * 0.35)); m.rotation.x += dt * (0.12 + i * 0.05); m.rotation.y += dt * (0.09 - i * 0.04); m.visible = ringK > 0.02; });
    ringMat.opacity = 0.32 * ringK * (1 - cur.dim); ringMat.color.copy(colT).lerp(new T.Color(1, 1, 1), 0.5);

    // globe
    globe.visible = cur.globe > 0.02;
    if (globe.visible) {
      const p = PLACES[ND.place] || PLACES.paris; if (gl.idle > 0) gl.idle -= dt; else { gl.dragY *= Math.exp(-dt * 1.5); gl.dragX *= Math.exp(-dt * 1.5); }
      let d = -p.ang - gl.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); gl.ry += d * (1 - Math.exp(-dt * 2.6)); gl.rx = lerp(gl.rx, (p.lat * Math.PI) / 180 * 0.75, 1 - Math.exp(-dt * 2.6));
      globeSpin.rotation.set(0, gl.ry + gl.dragY + Math.sin(time * 0.3) * 0.05, 0); globe.rotation.set(gl.rx + gl.dragX, 0, 0);
      globe.position.copy(frontMesh.position); const e = cur.globe * cur.globe * (3 - 2 * cur.globe); globe.scale.setScalar(Math.max(0.001, e) * cur.scale * fitS);
      globeMats.forEach((m) => { m.opacity = m.userData.op * e; }); globe.userData.halo.material.uniforms.uOp.value = e;
      Object.keys(PLACES).forEach((kk) => { const q = PLACES[kk], on = kk === ND.place; q.sprite.scale.setScalar((on ? 0.34 : 0.16) + (on ? Math.sin(time * 3) * 0.06 : 0)); });
    }

    // words follow their section (stick while it covers the viewport centre)
    const wW = WORD_HALF_H * V.aspect * 2, wH = WORD_HALF_H * 2;
    for (let i = 0; i < ND.words.length; i++) {
      const w = ND.words[i]; if (!w.mesh) continue; const r = w.el.getBoundingClientRect(), mid = V.h / 2;
      const top = r.top + Math.min(mid, r.height / 2), bot = r.bottom - Math.min(mid, r.height / 2);
      const dpx = mid < top ? top - mid : mid > bot ? bot - mid : 0; // px between viewport centre and the section's sticky range
      const on = Math.abs(dpx) < V.h * 1.1; w.mesh.visible = on; if (!on) continue;
      const width = Math.min(wW * w.fit, wH * 0.62 / w.mesh.userData.ratio);
      w.mesh.scale.set(width, width * w.mesh.userData.ratio, 1);
      w.mesh.position.set(w.solid ? 0 : -ptr.sx * 0.12, -(dpx / V.h) * wH * (w.solid ? 0.82 : 1) + (w.solid ? 0.1 : 0) - ptr.sy * 0.08, WORD_Z);
      w.mesh.material.opacity = w.op * clamp(1 - Math.abs(dpx) / (V.h * 0.75), 0, 1) * (ND.override ? 0.25 : 1) * ND.fade;
    }
    cam.position.x = lerp(cam.position.x, ptr.sx * 0.22, 0.05); cam.position.y = lerp(cam.position.y, ptr.sy * 0.14, 0.05); cam.lookAt(0, 0, 0);

    // passes
    renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(bgScene, cam);
    renderer.setRenderTarget(rtB); renderer.clear(); renderer.render(backScene, cam); renderer.render(midScene, cam);
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(bgScene, cam); renderer.clearDepth(); renderer.render(midScene, cam); renderer.render(frontScene, cam);
    if (!ND.started) { ND.started = true; html.classList.add('gl-live'); }
  }
  ND.fade = 1; ND.view = V; ND.state = cur;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
  requestAnimationFrame(frame);
})();
