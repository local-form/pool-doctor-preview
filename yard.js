// The Pool Doctor hero: a top-down backyard where the visitor designs the pool.
// One WebGL fragment shader, no libraries. World units are feet; the pool sits at the origin, length along x, the back of the yard is +y.
const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
const FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes, uC; uniform float uTime, uScale;
uniform float uL, uW, uSA, uSB, uM, uSpa, uShelf, uWall, uFire, uNight;
uniform sampler2D tG, tP, tPl, tS;
const vec2 TL = vec2(-.62, .78);            // towards the sun, on the ground plane
const vec3 SUN = vec3(-.5, .63, .6);
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float sdEl(vec2 p, vec2 r){ return (length(p / r) - 1.) * min(r.x, r.y); }
float shapeD(vec2 p, float id){
  float L = uL, W = uW;
  if (id < .5) return sdBox(p, vec2(L, W) * .5, 1.);
  if (id < 1.5) { float a = sdEl(p - vec2(-L * .2, -W * .02), vec2(L * .32, W * .5)); float b = sdEl(p - vec2(L * .24, W * .06), vec2(L * .28, W * .42));
    float d = smin(a, b, W * .3); return max(d, -sdEl(p - vec2(L * .04, -W * .8), vec2(L * .2, W * .42))); }
  if (id < 2.5) return min(sdBox(p - vec2(0., W * .21), vec2(L * .5, W * .29), .8), sdBox(p - vec2(-L * .35, 0.), vec2(L * .15, W * .5), .8));
  if (id < 3.5) return sdBox(p, vec2(L, W) * .5, 1.6);
  return sdBox(p, vec2(L, W) * .5, .45);
}
vec2 spaC(){ return vec2(uL * .5 + 1.2, uW * .5 - 3.); }
float poolD(vec2 p){ float d = shapeD(p, uSB); if (uM < .999) d = mix(shapeD(p, uSA), d, uM); return d; }
float spaD(vec2 p){ return length(p - spaC()) - 3.4 * uSpa + .02; }
float allD(vec2 p){ return min(poolD(p), spaD(p)); }
float wallD(vec2 p){ return sdBox(p - vec2(0., uW * .5 + 2.4), vec2(uL * .38, .85), .1) + (1. - uWall) * 1.2; }
vec2 fireC(){ return vec2(-uL * .5 - 9.5, -uW * .5 - 4.5); }
float chairD(vec2 p, out float cush){
  float d = 1e3; cush = 1e3;
  for (int i = 0; i < 2; i++) { vec2 q = p - vec2(uL * .1 + float(i) * 3.2, -uW * .5 - 5.4);
    d = min(d, sdBox(q, vec2(1.1, 3.3), .3)); cush = min(cush, sdBox(q - vec2(0., -.1), vec2(.9, 3.), .45)); }
  return d;
}
vec2 umbC(){ return vec2(uL * .1 + 7.6, -uW * .5 - 5.6); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
float cn(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 1.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = vec2(h21(i + g), h21(i + g + 17.3)); o = .5 + .5 * sin(uTime * .8 + 6.2831 * o); d = min(d, length(g + o - f)); }
  return d; }
float wave(vec2 p){
  float t = uTime;
  float h = vn(p * .5 + vec2(t * .22, t * .09)) + vn(p * 1.15 + vec2(-t * .18, t * .3) + 3.7) * .5 + vn(p * 2.6 + vec2(t * .45, -t * .26) + 9.1) * .22;
  if (uWall > .01) for (int i = 0; i < 3; i++) { vec2 im = vec2((float(i) - 1.) * uL * .22, uW * .5 - 1.1); float r = length(p - im);
    h += sin(r * 7. - t * 9.) * exp(-r * .9) * .5 * uWall; }
  return h;
}
void main(){
  vec2 p = (gl_FragCoord.xy - uC) / uScale; float fw = 1.3 / uScale; float t = uTime;
  float day = 1. - uNight;
  // ground: lawn with mow stripes and a little colour drift
  vec3 grass = texture2D(tG, p / 5.5).rgb * vec3(.92, 1.04, .82);
  grass *= .9 + .2 * fbm(p * .06) + .045 * step(.5, fract((p.x + p.y * .15) / 7.));
  vec3 col = grass;
  float d = allD(p);
  // deck: a paver rectangle round the pool, plus a round fire-pit patio
  float dDeck = min(sdBox(p - vec2(0., -1.6), vec2(uL * .5 + 6.5, uW * .5 + 7.6), 1.5), d - 5.);
  dDeck = smin(dDeck, length(p - fireC()) - 6.2 * uFire + .02, 1.6);
  vec3 pave = texture2D(tP, p / 9.).rgb * vec3(1.05, 1., .93);
  pave *= mix(.8, 1., smoothstep(-.7, -.5, dDeck));                    // soldier course edge
  col *= 1. - .3 * smoothstep(1.4, 0., dDeck) * step(0., dDeck);        // lawn contact shadow
  col = mix(col, pave, smoothstep(fw, -fw, dDeck));
  // dappled shade from a tree outside the frame
  float tree = smoothstep(.5, .62, fbm(p * .22 + vec2(t * .03, 0.))) * smoothstep(34., 14., length(p - vec2(-uL * .5 - 18., uW * .5 + 16.)));
  // cast shadows (sun from the upper left)
  float cush; float sh = 0.;
  sh = max(sh, smoothstep(fw * 3., -fw * 3., wallD(p + TL * 3.4)) * uWall);
  sh = max(sh, smoothstep(.15, -.15, chairD(p + TL * 1.1, cush)) * .8);
  sh = max(sh, smoothstep(.4, -.4, length(p + TL * 7. - umbC()) - 2.9) * .7);
  sh = max(sh, smoothstep(.2, -.2, length(p + TL * .8 - fireC()) - 2.35) * uFire * .7);
  col *= 1. - .48 * sh * day;
  // raised stone wall with three bronze scuppers
  float dw = wallD(p);
  if (uWall > .01) { vec3 st = texture2D(tS, p / 3.).rgb * .95; vec2 q = p - vec2(0., uW * .5 + 2.4);
    st = mix(st, texture2D(tP, p / 2.5).rgb * 1.1, step(.35, abs(q.y)));   // travertine cap
    col = mix(col, st, smoothstep(fw, -fw, dw)); }
  // fire pit: stone ring, dark rock bed and embers
  vec2 fq = p - fireC(); float fr = length(fq);
  float ember = 0.;
  if (uFire > .01) { float ring = abs(fr - 1.95) - .45;
    col = mix(col, texture2D(tS, p / 2.).rgb * .85, smoothstep(fw, -fw, ring - (1. - uFire) * 3.));
    float bed = fr - 1.5 * uFire; vec3 rock = vec3(.09, .08, .075) * (.6 + .8 * vn(fq * 4.));
    ember = smoothstep(1.2, .2, fr) * smoothstep(.45, .8, vn(fq * 3. + vec2(0., -t * 1.6))) * (.35 + .65 * vn(vec2(t * 3., fr)));
    col = mix(col, rock, smoothstep(fw, -fw, bed)); }
  // loungers
  float dc = chairD(p, cush);
  col = mix(col, vec3(.36, .22, .14) * (.85 + .15 * step(.5, fract(p.y * 2.4))), smoothstep(fw, -fw, dc));
  col = mix(col, vec3(.93, .91, .86) * (1. - .12 * smoothstep(-.4, 0., cush)), smoothstep(fw, -fw, cush));
  // coping (travertine bullnose) round pool and spa
  vec2 g = vec2(dFdx(d), dFdy(d)); vec2 en = length(g) > 0. ? normalize(g) : vec2(0.);
  vec3 cop = texture2D(tP, p / 3.).rgb * vec3(1.13, 1.08, 1.) * (.93 + .14 * dot(en, TL) * smoothstep(.0, .5, d));
  cop *= .8 + .2 * smoothstep(0., .25, d);
  col = mix(col, cop, smoothstep(fw, -fw, d - 1.1));
  // water
  float sd = spaD(p), inSpa = smoothstep(fw, -fw, sd);
  float depth = mix(3.6, 7.4, smoothstep(-uL * .25, uL * .3, p.x));
  float shelf = uShelf * smoothstep(-uL * .5 + 6.6, -uL * .5 + 6., p.x);
  depth = mix(depth, .9, shelf); depth = mix(depth, 3.3, inSpa);
  vec2 e = vec2(.06, 0.); vec2 n2 = vec2(wave(p + e) - wave(p - e), wave(p + e.yx) - wave(p - e.yx)) / (2. * e.x) * .12;
  vec2 fp = p + n2 * (.4 + depth * .45);
  vec3 floorC = mix(mix(texture2D(tPl, fp / 5.).rgb, vec3(.86), .55) * vec3(.93, .97, 1.), vec3(.86, .8, .7), shelf * .5);
  float fsh = smoothstep(-.6, .6, allD(p + TL * (.6 + depth * .32)));   // the pool wall shades the floor
  float c = pow(1. - cn(fp * 1.05), 6.) * .8 + pow(1. - cn(fp * 1.7 + 3.1), 7.) * .45;
  vec3 lit = floorC * (.5 + .62 * (1. - fsh)) + vec3(.9, 1., 1.) * c * (1. - fsh * .7) * .32;
  vec3 ab = exp(-depth * 2. * vec3(.21, .05, .033));
  vec3 wat = lit * ab + vec3(.0, .24, .36) * (1. - ab.g);
  float tile = smoothstep(-.55, -.45, d);
  vec2 tq = fract(p * 3.); vec3 mos = vec3(.06, .25, .42) * (.75 + .5 * h21(floor(p * 3.))) * (.8 + .2 * step(.1, min(tq.x, tq.y)));
  wat = mix(wat, mos * .9 + vec3(.0, .05, .08), tile);
  vec3 n3 = normalize(vec3(-n2 * 2.2, 1.)); vec3 r = reflect(vec3(0., 0., -1.), n3);
  float spec = pow(max(dot(r, normalize(SUN)), 0.), 260.) * 2.2;
  wat += vec3(1., .95, .85) * spec * day + vec3(.55, .7, .85) * .05;
  // night: underwater lights on the front wall, fire glow
  float glow = 0.;
  for (int i = 0; i < 2; i++) { vec2 lp = vec2((float(i) * 2. - 1.) * uL * .22, -uW * .5 + .3); glow += 1.2 / (1. + dot(p - lp, p - lp) * .05); }
  vec3 nwat = vec3(.02, .5, .72) * (.12 + glow * .8) + vec3(.4, .9, 1.) * c * glow * .35 + floorC * .02;
  wat = mix(wat, nwat, uNight);
  // spa: raised wall ring and bubbling water
  if (uSpa > .01) { float bub = smoothstep(.75, .95, vn((p - spaC()) * 3. + vec2(0., t * 2.))) * inSpa;
    wat = mix(wat, vec3(.85, .97, 1.), bub * .35); }
  col = mix(col, wat, smoothstep(fw, -fw, d));
  if (uSpa > .01) col = mix(col, cop * .95, smoothstep(fw, -fw, abs(sd) - .32));
  // water falling from the scuppers
  if (uWall > .01) for (int i = 0; i < 3; i++) { float x = (float(i) - 1.) * uL * .22; vec2 q = p - vec2(x, uW * .5 + .2);
    float sm = smoothstep(.32, .12, abs(q.x)) * smoothstep(1.4, 1.1, q.y) * smoothstep(-1.4, -.9, q.y);
    float fl = .65 + .35 * sin(q.y * 9. + t * 14. + q.x * 20.);
    col = mix(col, vec3(.9, .97, 1.), sm * fl * uWall * .85);
    col = mix(col, vec3(.28, .2, .14), smoothstep(fw, -fw, sdBox(p - vec2(x, uW * .5 + 1.55), vec2(.32, .22), .05)) * uWall); }
  // umbrella canopy over the loungers
  vec2 uq = p - umbC(); float ud = length(uq) - 2.9; float ang = atan(uq.y, uq.x);
  float pan = abs(fract(ang * 8. / 6.2831) - .5);
  vec3 umb = vec3(.11, .25, .48) * (.82 + .3 * pan) * (1. + .25 * dot(normalize(uq + .001), TL) * smoothstep(0., 2.9, length(uq)));
  col = mix(col, umb, smoothstep(fw, -fw, ud));
  // light: dusk tint at night, then the glows
  vec3 nightTint = vec3(.13, .17, .3);
  float isWater = smoothstep(fw, -fw, d);
  col = mix(col, col * mix(vec3(1.), nightTint, uNight), 1. - isWater * uNight);
  col += vec3(.1, .45, .6) * glow * .12 * uNight * smoothstep(3., 0., d) * (1. - isWater);
  float fireL = uFire * exp(-fr * fr / 26.);
  col += vec3(1., .45, .15) * (fireL * (.08 + uNight * .55)) + vec3(1., .5, .12) * ember * uFire * (1.2 + uNight * 2.);
  // vignette
  vec2 sv = gl_FragCoord.xy / uRes - .5; col *= 1. - dot(sv, sv) * .55;
  gl_FragColor = vec4(col, 1.);
}`;

export const SHAPES = ['Rectangle', 'Freeform', 'L-shape', 'Plunge', 'Lap'];

export function mountYard(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.still });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) throw new Error('no webgl');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const al = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uC', 'uTime', 'uScale', 'uL', 'uW', 'uSA', 'uSB', 'uM', 'uSpa', 'uShelf', 'uWall', 'uFire', 'uNight', 'tG', 'tP', 'tPl', 'tS'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  const base = opts.tex || new URL('./tex/', import.meta.url).href;
  const tex = (name, unit) => new Promise(res => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    const im = new Image(); im.onload = () => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); res(); };
    im.onerror = () => res(); im.src = base + name + '.webp'; });
  [['tG', 0], ['tP', 1], ['tPl', 2], ['tS', 3]].forEach(([n, u]) => gl.uniform1i(U[n], u));
  const ready = Promise.all([tex('grass-col', 0), tex('paving-col', 1), tex('plaster-col', 2), tex('slate-col', 3)]);

  const cur = { L: 32, W: 16, spa: 0, shelf: 0, wall: 0, fire: 0, night: 0, m: 1 }, tgt = { ...cur };
  let sa = 0, sb = 0, time = 0, raf = 0, last = 0, visible = true, dirty = true;
  const view = { w: 1, h: 1, dpr: 1, cx: 0, cy: 0, s: 10 };
  function set(p) {
    tgt.L = p.len; tgt.W = p.wid; const ex = new Set(p.extras || []);
    tgt.spa = +ex.has('Spa'); tgt.shelf = +ex.has('Sun shelf'); tgt.wall = +ex.has('Water wall'); tgt.fire = +ex.has('Fire pit'); tgt.night = +ex.has('Lights');
    const id = Math.max(0, SHAPES.indexOf(p.shape));
    if (id !== sb) { sa = cur.m > .5 ? sb : sa; sb = id; cur.m = 0; }
    dirty = true; start();
  }
  function size() {
    const r = canvas.getBoundingClientRect(); view.dpr = Math.min(devicePixelRatio || 1, opts.dpr || 1.5);
    view.w = Math.max(1, Math.round(r.width * view.dpr)); view.h = Math.max(1, Math.round(r.height * view.dpr));
    canvas.width = view.w; canvas.height = view.h; gl.viewport(0, 0, view.w, view.h); dirty = true;
  }
  function place() {
    const a = opts.area ? opts.area() : { x: 0, y: 0, w: view.w / view.dpr, h: view.h / view.dpr }, pad = opts.pad || [34, 30];
    const s = Math.min(a.w / (.6 * cur.L + pad[0]), a.h / (.6 * cur.W + pad[1]));
    view.s = s; view.cx = a.x + a.w / 2 + (opts.shiftX || 0) * s; view.cy = a.y + a.h / 2 - 1.5 * s;   // css px, from top-left
    if (opts.labels) {
      const { L, W } = opts.labels, k = s;
      L.style.cssText = `left:${view.cx - cur.L * k / 2}px;top:${view.cy + (cur.W / 2 + 9.6) * k}px;width:${cur.L * k}px`;
      W.style.cssText = `left:${view.cx + (cur.L / 2 + 7.4) * k}px;top:${view.cy - cur.W * k / 2}px;height:${cur.W * k}px`;
    }
  }
  function draw() {
    place();
    gl.uniform2f(U.uRes, view.w, view.h); gl.uniform2f(U.uC, view.cx * view.dpr, view.h - view.cy * view.dpr);
    gl.uniform1f(U.uScale, view.s * view.dpr); gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uL, cur.L); gl.uniform1f(U.uW, cur.W); gl.uniform1f(U.uSA, sa); gl.uniform1f(U.uSB, sb); gl.uniform1f(U.uM, cur.m);
    gl.uniform1f(U.uSpa, cur.spa); gl.uniform1f(U.uShelf, cur.shelf); gl.uniform1f(U.uWall, cur.wall); gl.uniform1f(U.uFire, cur.fire); gl.uniform1f(U.uNight, cur.night);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const ease = (k, v, dt, sp) => { cur[k] += (tgt[k] - cur[k]) * Math.min(1, dt * sp); if (Math.abs(tgt[k] - cur[k]) < .002) cur[k] = tgt[k]; };
  function loop(now) {
    raf = 0; if (!visible || document.hidden) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (!opts.reduced) time += dt;
    ['L', 'W'].forEach(k => ease(k, 0, dt, 9)); ['spa', 'shelf', 'wall', 'fire'].forEach(k => ease(k, 0, dt, 5)); ease('night', 0, dt, 3);
    cur.m = Math.min(1, cur.m + dt * 2.2);
    draw(); dirty = false;
    if (!opts.reduced || Object.keys(tgt).some(k => k !== 'm' && cur[k] !== tgt[k]) || cur.m < 1) raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(loop); } }
  size(); let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); start(); }, 100); });
  return {
    set, start, ready, size,
    setVisible(v) { visible = v; if (v) start(); },
    still(p, tm = 4) { Object.assign(cur, { L: p.len, W: p.wid }); set(p); Object.keys(tgt).forEach(k => cur[k] = tgt[k]); cur.m = 1; time = tm; draw(); },
    // feet -> css px inside the canvas, for the drag handle
    toScreen(x, y) { return [view.cx + x * view.s, view.cy - y * view.s]; }, get scale() { return view.s; }, get dims() { return { L: cur.L, W: cur.W }; }
  };
}
