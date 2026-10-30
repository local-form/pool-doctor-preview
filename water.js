// Pool Doctor water: one fragment shader, raw WebGL1, no libraries.
// A top-down pool (limestone coping, waterline tile, plaster floor with one lane line) with refraction, two-scale
// chromatic caustics, glints, and a soft "treatment front" between the sick water (left) and treated water (right).
//   mountHero(host, opts)  the full-screen hero; returns { setSplit, ripple, wake, still, stats }
//   miniRenderer()         one shared context that paints small canvases (water lab, before/after cases, configurator tile)

const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FS = `precision highp float;
uniform vec2 R; uniform float T, uSplit, uPx, uCoping, uLane, uSeed;
uniform vec4 uBefore;   // murk, green algae, milky, black spots
uniform vec4 uAfter;    // clarity, green tint, caustic strength, glint
uniform vec4 rip[6];    // x, y (css px from top-left), start time, strength
uniform vec4 trail[10]; // the pointer's recent path: x, y (css px), time, strength. Each point is a small ring
                        // spreading from where the pointer was, so a moving pointer leaves a real, decaying wake
uniform vec2 uSun;
uniform float uNight;  // 0 day .. 1 after dark, pool lights on

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
// tileable caustic web, after the well-known iterative water caustic
float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.; vec2 i = p; float c = 1.;
  for (int n = 0; n < 4; n++) { float tt = t * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005))); }
  c /= 4.; c = 1.17 - pow(c, 1.4); return pow(abs(c), 7.);
}
float height(vec2 q, float t){ return fbm(q * 1.15 + vec2(t * .045, t * .03)) * .65 + noise(q * 2.9 - vec2(t * .07, -t * .05)) * .35; }
// a leaf as a vesica with a midrib; returns coverage and rib
vec2 leaf(vec2 p, vec2 c, float a, float s){
  vec2 d = p - c; d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d / s;
  float off = .4;
  float body = 1. - smoothstep(-.04, .04, max(length(d + vec2(0., off)), length(d - vec2(0., off))) - .78);
  float rib = (1. - smoothstep(.0, .035, abs(d.y))) * step(abs(d.x), .6);
  float stem = (1. - smoothstep(.0, .03, abs(d.y))) * step(.6, d.x) * step(d.x, .9);
  return vec2(max(body, stem), rib * body);
}
void main(){
  vec2 px = vec2(gl_FragCoord.x, R.y - gl_FragCoord.y) / uPx;     // css px, origin top-left
  vec2 W = R / uPx;
  float t = T;
  // ---- coping (hero only) ----
  if (px.y < uCoping) {
    vec2 q = px / 160.;
    float joint = smoothstep(1.2, 0., abs(fract(px.x / 168. + .37) - .5) * 168. - 0.);
    float grain = fbm(px * .06) * .07 + noise(px * .9) * .025 - step(.994, hash(floor(px * .7))) * .035;
    vec3 stone = vec3(.851, .823, .769) + grain - .05 * joint;
    float edge = smoothstep(uCoping - 14., uCoping - 2., px.y);              // bullnose: light, then a shadowed lip
    stone += vec3(.06, .055, .05) * (1. - abs(edge - .35) * 2.) * step(.0, edge);
    stone *= 1. - .35 * smoothstep(uCoping - 4., uCoping, px.y);
    // after dark: the stone falls into shadow, lit only by the pool's glow along the lip and the lamps below it
    float lip = exp(-(uCoping - px.y) / 10.), near = exp(-pow((px.x - W.x * .3) / (W.x * .16), 2.)) + exp(-pow((px.x - W.x * .72) / (W.x * .16), 2.));
    vec3 nightStone = stone * .2 + vec3(.38, .62, .7) * lip * (.25 + .5 * near) + vec3(.12, .1, .08) * .3;
    gl_FragColor = vec4(mix(stone, nightStone, uNight), 1.); return;
  }
  // ---- the surface: waves, ripple rings and the pointer wake bend everything below ----
  vec2 q = px / 210.;
  float e = .02, h0 = height(q, t);
  vec2 n = vec2(height(q + vec2(e, 0.), t) - h0, height(q + vec2(0., e), t) - h0) / e * .055;
  for (int k = 0; k < 6; k++) { vec4 r = rip[k]; if (r.w <= 0.) continue;
    vec2 d = px - r.xy; float L = length(d), age = t - r.z, ring = L - age * 260.;
    n += d / (L + 1.) * sin(ring * .085) * exp(-ring * ring * .00045) * exp(-age * 1.25) * .55 * r.w; }
  for (int k = 0; k < 10; k++) { vec4 w = trail[k]; if (w.w <= 0.) continue;
    vec2 d = px - w.xy; float L = length(d), age = t - w.z, ring = L - age * 85.;
    n += d / (L + 1.) * sin(ring * .13) * exp(-ring * ring * .0016) * exp(-age * 2.4) * .26 * w.w; }
  float depth = clamp((px.y - uCoping) / max(W.y - uCoping, 1.), 0., 1.);
  depth = .25 + .75 * depth;
  vec2 fp = px + n * (9. + 14. * depth);
  // ---- treatment front: a noise-warped soft edge with a faint chlorine glow travelling along it ----
  float edgeX = uSplit * W.x + (noise(vec2(px.y * .011, t * .12 + uSeed)) - .5) * 46. + (noise(vec2(px.y * .05, t * .3)) - .5) * 10.;
  float after = smoothstep(edgeX - 20., edgeX + 20., px.x);
  // ---- the floor: waterline tile just under the coping, then plaster with one dark lane line ----
  float wl = fp.y - uCoping;
  vec3 floorC;
  if (uCoping > 0. && wl < 30.) {
    vec2 g = fract(fp / 13.); float grout = smoothstep(.0, .09, g.x) * smoothstep(.0, .09, g.y) * smoothstep(1., .91, g.x) * smoothstep(1., .91, g.y);
    vec3 tile = mix(vec3(.04, .27, .36), vec3(.07, .36, .46), hash(floor(fp / 13.)));
    floorC = mix(vec3(.62, .7, .7), tile, grout);
  } else {
    float mott = fbm(fp * .045) * .05 + noise(fp * .6) * .018;
    floorC = vec3(.88, .93, .935) + mott;
    float lx = abs(fp.x - uLane * W.x);
    float lane = (1. - smoothstep(4., 5.2, lx)) * step(uCoping + 140., fp.y) * step(fp.y, W.y - 90.);
    float tee = (1. - smoothstep(26., 27.2, lx)) * (1. - smoothstep(4., 5.2, abs(fp.y - (W.y - 90.))));
    floorC = mix(floorC, vec3(.16, .38, .47), max(lane, tee) * .85 * step(.01, uLane));
  }
  // black algae: blotches on the plaster itself
  float spots = smoothstep(.55, .8, fbm(fp * .1 + 3.1)) * smoothstep(.4, .65, noise(fp * .016 + 9.)) * (.55 + .45 * noise(fp * .45));
  vec3 floorB = mix(floorC, vec3(.1, .16, .13), spots * .7 * uBefore.w);
  // ---- caustics: two scales, red/green/blue sampled at slightly different offsets ----
  vec2 cu = fp / 240.; float ts = t * .5;
  vec3 ca = vec3(caustic(cu + vec2(.0022, 0.) + ts * .015, ts), caustic(cu + ts * .015, ts), caustic(cu - vec2(.0022, 0.) + ts * .015, ts));
  ca += .55 * vec3(caustic(cu * 1.9 - ts * .01, ts * 1.25));
  ca *= 1. - depth * .5;
  // ---- treated water ----
  float clar = uAfter.x;
  vec3 absorb = mix(vec3(.80, .95, .97), vec3(.30, .64, .76), depth);
  absorb = mix(absorb, absorb * vec3(.78, .95, .62), uAfter.y);
  vec3 cleanC = floorC * absorb + ca * vec3(1., .98, .92) * .36 * uAfter.z;
  cleanC = mix(cleanC, vec3(.04, .27, .37), depth * depth * .32);
  cleanC = mix(cleanC, vec3(.3, .45, .32), (1. - clar) * .55);
  // ---- sick water: murk that thickens with depth, algae clouds, drifting particles ----
  float cloud = fbm(fp * .006 + vec2(t * .012, -t * .008)) ;
  vec3 murk = mix(vec3(.11, .22, .11), vec3(.18, .3, .12), cloud);
  vec3 sick = floorB * mix(vec3(.55, .66, .5), vec3(.35, .48, .32), depth);
  sick = mix(sick, murk, clamp(.5 + .35 * depth + .3 * (cloud - .5), 0., 1.) * uBefore.x * uBefore.y);
  sick = mix(sick, mix(vec3(.62, .73, .74), vec3(.5, .62, .64), depth), clamp(.6 + .2 * depth + .2 * (cloud - .5), 0., 1.) * uBefore.z);
  sick = mix(sick, sick * absorb * 1.15, (1. - uBefore.x) * (1. - uBefore.z));
  sick += ca * .05 * (1. - uBefore.x) + ca * .015;
  float parts = 0.;
  for (int l = 0; l < 2; l++) { float cs = l == 0 ? 22. : 37.;
    vec2 g = (px + vec2(t * (4. + float(l) * 3.), t * 2.)) / cs, id = floor(g), f = fract(g);
    float h = hash(id + float(l) * 7.);
    vec2 c = vec2(.2 + .6 * hash(id + 1.3), .2 + .6 * hash(id + 2.7)) + .12 * vec2(sin(t * .4 + h * 6.), cos(t * .33 + h * 5.));
    vec2 dd = f - c; parts += exp(-dot(dd, dd) * (l == 0 ? 180. : 110.)) * step(.55, h) * (.6 + .4 * h); }
  sick += vec3(.5, .55, .32) * parts * .22 * max(uBefore.y, uBefore.z * .6);
  vec3 col = mix(sick, cleanC, after);
  // shadow cast by the coping onto the water
  if (uCoping > 0.) col *= 1. - .38 * exp(-(px.y - uCoping) / 18.);
  // ---- surface light: glints and a fresnel sheen ----
  vec3 N = normalize(vec3(-n * 1.6, 1.));
  vec3 H = normalize(vec3(uSun, 1.) + vec3(0., 0., 1.));
  float spec = pow(max(dot(N, H), 0.), 180.);
  col += vec3(1., .97, .9) * spec * mix(.25, 1.1, after) * uAfter.w;
  col += vec3(.7, .84, .9) * (1. - N.z) * .9 * (1. - uNight * .85);
  // ---- leaves floating on the sick side, with a soft shadow on the floor ----
  for (int i = 0; i < 3; i++) { float fi = float(i);
    vec2 c = vec2(mod(W.x * (.12 + fi * .19) + t * (5. + fi * 2.), W.x * .7 + 60.) - 30., uCoping + 90. + fi * (W.y - uCoping) * .27 + sin(t * .2 + fi) * 14.);
    float a = t * (.05 + fi * .02) + fi * 2.1, s = 15. + fi * 4.;
    vec2 sh = leaf(px, c + vec2(7., 10.), a, s); col *= 1. - .25 * sh.x * (1. - after) * uBefore.y;
    vec2 lf = leaf(px, c, a, s);
    vec3 lc = mix(vec3(.36, .28, .12), vec3(.46, .36, .16), hash(vec2(fi, 3.))) - lf.y * vec3(-.08, -.07, -.03);
    col = mix(col, lc, lf.x * (1. - after) * uBefore.y);
  }
  // ---- after dark: two lamps in the wall under the coping throw fans of light down the pool; the murky side scatters
  // it into a green haze, the clear side stays crisp with dim moving caustics ----
  if (uNight > 0.) {
    vec2 l1 = vec2(W.x * .3, uCoping + 4.), l2 = vec2(W.x * .72, uCoping + 4.);
    float R = max(W.x * .34, (W.y - uCoping) * .55), r2 = R * R;
    vec2 a1 = (px - l1) * vec2(1.25, 1.), a2 = (px - l2) * vec2(1.25, 1.);
    float fan = exp(-dot(a1, a1) / r2) + exp(-dot(a2, a2) / r2);
    float lamp = exp(-dot(px - l1, px - l1) / 500.) + exp(-dot(px - l2, px - l2) / 500.);
    float lit = .06 + 1.12 * fan;
    vec3 lc = vec3(.7, .9, 1.);
    vec3 clearN = col * lit * lc + ca * lc * .12 * fan;
    vec3 sickN = col * (.05 + .55 * fan) * vec3(.75, 1., .62) + vec3(.04, .09, .04) * fan * (.5 + .5 * cloud);
    vec3 nightCol = mix(sickN, clearN, after) + vec3(.85, .97, 1.) * lamp * .9 + vec3(1., .97, .9) * spec * .5 * after * fan;
    col = mix(col, nightCol, uNight);
  }
  // ---- the front's glow (brighter at night) ----
  float gd = (px.x - edgeX) / 12.;
  float glow = exp(-gd * gd) * (.55 + .45 * sin(px.y * .045 - t * 1.8)) * step(.001, uSplit) * step(uSplit, .999);
  col += vec3(.18, .83, .78) * glow * (.22 + .2 * uNight);
  gl_FragColor = vec4(col, 1.);
}`;

function program(gl) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {}; for (const n of ['R', 'T', 'uSplit', 'uPx', 'uCoping', 'uLane', 'uSeed', 'uBefore', 'uAfter', 'rip', 'trail', 'uSun', 'uNight']) u[n] = gl.getUniformLocation(pr, n);
  return u;
}
const context = canvas => canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });

// New York time of day nudges the sun: low and warm early and late, high at noon. Subtle on purpose.
export function sunFor(date = new Date()) {
  const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(date) % 24;
  const a = (h - 6) / 12 * Math.PI;   // 6am .. 6pm across the sky
  return [Math.cos(a) * .35, .25 + Math.sin(Math.max(0, a)) * .1];
}

export const PRESETS = {
  green: [1, 1, 0, 0], cloudy: [.75, 0, 1, 0], black: [.1, .05, 0, 1],
  clear: [1, 0, 1, 1],
};

export function mountHero(host, { canvas, reduced = false, still = false, onFirstFrame, coping = 84, lane = .7, night = 0 } = {}) {
  const gl = context(canvas);
  if (!gl) throw new Error('no-webgl');
  const u = program(gl);
  const phone = matchMedia('(max-width: 700px)').matches;
  const DPR = Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5);
  const stats = { frames: 0, scale: 1, avgMs: 0, steps: [] };
  let nightV = night, nightTo = night, split = .55, t0 = performance.now(), visible = true, raf = 0, drawn = false, slow = 0, fast = 0, sumMs = 0, n = 0, frozenT = still ? 6.5 : null;
  const rips = new Float32Array(24); let ri = 0; const trail = new Float32Array(40); let ti = 0, lastTrail = 0;
  const sun = sunFor();
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight, d = DPR * stats.scale;
    canvas.width = Math.max(1, Math.round(w * d)); canvas.height = Math.max(1, Math.round(h * d)); gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const now = () => frozenT ?? (performance.now() - t0) / 1000;
  function draw() {
    const d = canvas.width / canvas.clientWidth;
    gl.uniform2f(u.R, canvas.width, canvas.height); gl.uniform1f(u.T, now()); gl.uniform1f(u.uSplit, split); gl.uniform1f(u.uPx, d);
    gl.uniform1f(u.uCoping, coping); gl.uniform1f(u.uLane, lane); gl.uniform1f(u.uSeed, 0);
    gl.uniform4f(u.uBefore, ...PRESETS.green); gl.uniform4f(u.uAfter, ...PRESETS.clear);
    gl.uniform4fv(u.rip, rips); gl.uniform4fv(u.trail, trail); gl.uniform2f(u.uSun, ...sun); gl.uniform1f(u.uNight, nightV);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stats.frames++;
    if (!drawn) { drawn = true; onFirstFrame?.(); }
  }
  // adaptive quality: the real GPU time of a frame, measured by waiting on a 1-pixel read (gl.finish returns early in
  // Chrome). Every frame for 30 frames: above 14 ms on most of them steps down (0.75x, then 0.5x); under 8 ms steps back up.
  const px1 = new Uint8Array(4);
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    const a = performance.now(); draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); const ms = performance.now() - a;
    sumMs += ms; n++; if (ms > 14) slow++; else if (ms < 8) fast++;
    if (n === 30) {
      stats.avgMs = +(sumMs / n).toFixed(2);
      if (slow >= 24 && stats.scale > .5) { stats.scale = stats.scale > .75 ? .75 : .5; stats.steps.push(stats.scale); size(); }
      else if (fast >= 28 && stats.scale < 1) { stats.scale = stats.scale < .75 ? .75 : 1; stats.steps.push(stats.scale); size(); }
      sumMs = 0; n = 0; slow = 0; fast = 0;
    }
    if (nightV !== nightTo) nightV = Math.abs(nightTo - nightV) < .01 ? nightTo : nightV + (nightTo - nightV) * .06;   // lights fade, about a second
    if (!reduced) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (reduced) { draw(); return; } if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  new ResizeObserver(() => { size(); if (reduced || !raf) draw(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', kick);
  size(); kick(); if (reduced) draw();
  return {
    stats,
    setSplit(v) { split = v; if (reduced) draw(); },
    setNight(v) { nightTo = v; if (reduced) { nightV = v; draw(); } else kick(); },
    ripple(x, y, s = 1) { if (reduced) return; rips.set([x, y, now(), s], ri * 4); ri = (ri + 1) % 6; },
    wake(x, y, speed) {   // one trail point every 45 ms while the pointer moves
      if (reduced) return; const tn = now(); if (tn - lastTrail < .045) return; lastTrail = tn;
      trail.set([x, y, tn, Math.min(1, .25 + speed)], ti * 4); ti = (ti + 1) % 10; },
    redraw: draw,
  };
}

// One small context shared by every little water panel. Each target is a 2D canvas plus a params() callback;
// visible targets are painted every other frame from the shared WebGL canvas.
export function miniRenderer({ reduced = false } = {}) {
  const glc = document.createElement('canvas'), gl = context(glc);
  if (!gl) throw new Error('no-webgl');
  const u = program(gl), targets = new Set(), sun = sunFor(), t0 = performance.now();
  let raf = 0, tick = 0;
  function paint(tg, T) {
    const c = tg.canvas, w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    const d = Math.min(devicePixelRatio || 1, 1.25) * (tg.scale || 1);
    const cw = Math.round(w * d), ch = Math.round(h * d);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    if (glc.width !== cw || glc.height !== ch) { glc.width = cw; glc.height = ch; }
    gl.viewport(0, 0, cw, ch);
    const p = tg.params();
    gl.uniform2f(u.R, cw, ch); gl.uniform1f(u.T, T + (p.seed || 0) * 13); gl.uniform1f(u.uSplit, p.split ?? 0); gl.uniform1f(u.uPx, d);
    gl.uniform1f(u.uCoping, 0); gl.uniform1f(u.uLane, p.lane ?? 0); gl.uniform1f(u.uSeed, p.seed || 0);
    gl.uniform4f(u.uBefore, ...(p.before || PRESETS.green)); gl.uniform4f(u.uAfter, ...(p.after || PRESETS.clear));
    gl.uniform4fv(u.rip, new Float32Array(24)); gl.uniform4fv(u.trail, new Float32Array(40)); gl.uniform2f(u.uSun, ...sun); gl.uniform1f(u.uNight, p.night || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const ctx = c.getContext('2d'); ctx.drawImage(glc, 0, 0);
  }
  function loop() {
    raf = 0; tick++;
    const T = (performance.now() - t0) / 1000;
    let any = false;
    for (const tg of targets) if (tg.visible && !document.hidden) { any = true; if (tick % 2 === 0 || tg.dirty) { paint(tg, T); tg.dirty = false; } }
    if (any && !reduced) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', kick);
  return {
    add(canvas, params, opts = {}) {
      const tg = { canvas, params, visible: false, dirty: true, scale: opts.scale };
      targets.add(tg);
      new IntersectionObserver(([e]) => { tg.visible = e.isIntersecting; if (tg.visible) { tg.dirty = true; if (reduced) paint(tg, 6.5); kick(); } }).observe(canvas);
      return { update() { tg.dirty = true; if (reduced) { if (tg.visible) paint(tg, 6.5); } else kick(); } };
    },
    // a still frame as a data: URL (the configurator's water tile; the CSP allows data: images)
    still(w, h, params, T = 6.5) {
      const c = document.createElement('canvas'); c.style.cssText = `width:${w}px;height:${h}px;position:absolute;left:-9999px`;
      document.body.append(c); paint({ canvas: c, params: () => params }, T); const url = c.toDataURL('image/jpeg', .82); c.remove(); return url;
    },
  };
}
