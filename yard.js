// The Pool Doctor hero: a top-down backyard where the visitor designs the pool.
// One WebGL fragment shader, no libraries. World units are feet; the pool sits at the origin, length along x, the back of the yard is +y.
const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
const FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes, uC; uniform float uTime, uScale;
uniform float uL, uW, uSA, uSB, uM, uSpa, uShelf, uWall, uFire, uNight, uDeck, uPeb;
uniform vec3 uFloor;
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
vec2 spaPos(float id){ return id > .5 && id < 1.5 ? vec2(uL * .52 + 4.5, uW * .06) : vec2(uL * .5 + 4.5, max(uW * .5 - 3.7, 0.)); }
vec2 spaC(){ return mix(spaPos(uSA), spaPos(uSB), uM); }
float poolD(vec2 p){ float d = shapeD(p, uSB); if (uM < .999) d = mix(shapeD(p, uSA), d, uM); return d; }
float spaD(vec2 p){ return length(p - spaC()) - 3.2 * uSpa + .02 + (1. - smoothstep(0., .25, uSpa)) * 6.; }
float allD(vec2 p){ return min(poolD(p), spaD(p)); }
float wallD(vec2 p){ return sdBox(p - vec2(0., uW * .5 + 2.4), vec2(uL * .38, .85), .1) + (1. - uWall) * 1.2; }
vec2 fireC(){ return vec2(-uL * .5 - 11., -uW * .5 - 2.2); }
float deckD(vec2 p){ float x0 = -uL * .5 - 6.5 - 11.5 * uFire, x1 = uL * .5 + 6.5 + 5.5 * uSpa, y0 = -uW * .5 - 9.6, y1 = uW * .5 + 6.6;
  return sdBox(p - vec2(x0 + x1, y0 + y1) * .5, vec2(x1 - x0, y1 - y0) * .5, 1.2); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// Adirondack chairs round the fire pit; back = fanned slats, seat, two flat arms
float adiD(vec2 p, out float slat){
  float d = 1e3; slat = 0.;
  for (int i = 0; i < 3; i++) { float a = 1.35 + float(i) * 1.75; vec2 c = fireC() + vec2(cos(a), sin(a)) * 4.;
    vec2 q = rot(-a + 1.5708) * (p - c);                       // +y points at the fire
    float seat = sdBox(q, vec2(.95, .85), .15);
    float arms = min(sdBox(q - vec2(-1.12, .1), vec2(.2, 1.15), .1), sdBox(q - vec2(1.12, .1), vec2(.2, 1.15), .1));
    float back = max(sdBox(q - vec2(0., -1.45), vec2(1.1, .62), .3), abs(q.x) - (.95 + (-.85 - q.y) * .35));
    float di = min(min(seat, arms), back); if (di < d) { d = di; slat = step(.5, fract(q.x * 2.6 + .25)) * step(q.y, -.8); } }
  return d;
}
vec2 loungeC(float i){ return vec2(uL * .08 + i * 3.4, -uW * .5 - 5.5); }
float chairD(vec2 p, out float cush){
  float d = 1e3; cush = 1e3;
  for (int i = 0; i < 2; i++) { vec2 q = p - loungeC(float(i));
    d = min(d, sdBox(q, vec2(1.1, 3.3), .22)); cush = min(cush, sdBox(q - vec2(0., -.15), vec2(.88, 2.95), .4)); }
  return d;
}
vec2 tableC(){ return loungeC(0.) + vec2(1.7, -2.4); }
vec2 umbC(){ return loungeC(1.) + vec2(4.1, -.6); }
vec2 potC(float i){ return i < .5 ? vec2(-uL * .5 - 4.9 - 11.5 * uFire, uW * .5 + 4.9) : vec2(uL * .5 + 4.9 + 5.5 * uSpa, uW * .5 + 4.9); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
vec3 deckCol(vec2 p, float k){
  if (k < .5) return texture2D(tP, p / 9.).rgb * vec3(1.05, 1., .93);
  if (k < 1.5) { vec3 c = texture2D(tP, p / 15. + .37).rgb; return mix(vec3(dot(c, vec3(.33))), c, .45) * vec3(1.22, 1.15, 1.02); }
  vec3 c = mix(texture2D(tPl, p / 6.).rgb, vec3(.78), .35) * vec3(.84, .83, .8);
  vec2 j = abs(fract(p / 8. + .5) - .5) * 8.; return c * (1. - .35 * smoothstep(.07, .02, min(j.x, j.y)));
}
// coping to match the deck: tumbled paver soldier course, pale travertine bullnose, or a poured concrete edge
vec3 copCol(vec2 p, float k){
  if (k < .5) { vec2 j = abs(fract(p / 1.25 + .5) - .5) * 1.25; return texture2D(tP, p / 3.).rgb * vec3(1.1, 1.02, .9) * (1. - .3 * smoothstep(.09, .03, min(j.x, j.y))); }
  if (k < 1.5) { vec3 c = texture2D(tP, p / 6. + .37).rgb; return mix(vec3(dot(c, vec3(.33))), c, .35) * vec3(1.42, 1.36, 1.24); }
  return mix(texture2D(tPl, p / 4.).rgb, vec3(.8), .45) * vec3(.9, .9, .89);
}
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
  // deck: one clean paver rectangle that grows to take the spa and the fire pit
  float dDeck = deckD(p);
  vec3 pave = mix(deckCol(p, floor(uDeck)), deckCol(p, ceil(uDeck)), fract(uDeck));
  pave *= mix(.8, 1., smoothstep(-.7, -.5, dDeck));                    // soldier course edge
  col *= 1. - .3 * smoothstep(1.4, 0., dDeck) * step(0., dDeck);        // lawn contact shadow
  col = mix(col, pave, smoothstep(fw, -fw, dDeck));
  // dappled shade from a tree outside the frame
  float tree = smoothstep(.5, .62, fbm(p * .22 + vec2(t * .03, 0.))) * smoothstep(34., 14., length(p - vec2(-uL * .5 - 18., uW * .5 + 16.)));
  // cast shadows (sun from the upper left)
  float cush; float sh = 0.;
  sh = max(sh, smoothstep(fw * 3., -fw * 3., wallD(p + TL * 3.4)) * uWall);
  sh = max(sh, smoothstep(.15, -.15, chairD(p + TL * 1.1, cush)) * .8);
  sh = max(sh, smoothstep(.4, -.4, length(p + TL * 4.2 - umbC()) - 2.9) * .55);
  sh = max(sh, smoothstep(.2, -.2, length(p + TL * .8 - fireC()) - 2.35) * uFire * .7);
  float slat; if (uFire > .01) sh = max(sh, smoothstep(.15, -.15, adiD(p + TL * 1.2, slat)) * .75 * uFire);
  sh = max(sh, smoothstep(.15, -.15, length(p + TL * 1.3 - tableC()) - .55) * .7);
  for (int i = 0; i < 2; i++) sh = max(sh, smoothstep(.4, -.4, length(p + TL * 1.8 - potC(float(i))) - 1.5) * .6);
  if (uSpa > .01) sh = max(sh, smoothstep(.2, -.2, spaD(p + TL * 1.1) - .55) * (1. - smoothstep(-.1, .1, -spaD(p) + .55)) * .5);
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
  // loungers: teak frame with slats, cushion with seams, pillow, one with a striped towel
  float dc = chairD(p, cush);
  vec3 teak = vec3(.42, .26, .15) * (.78 + .22 * step(.32, fract(p.y * 2.6))) * (.9 + .2 * vn(p * vec2(1., 9.)));
  col = mix(col, teak, smoothstep(fw, -fw, dc));
  for (int i = 0; i < 2; i++) { vec2 q = p - loungeC(float(i));
    float seam = smoothstep(.05, 0., abs(q.y + 1.1)) + smoothstep(.05, 0., abs(q.y - 1.)) ;
    float raised = smoothstep(-1.2, -2.9, q.y);                               // backrest tilted up to the sun
    vec3 cu = vec3(.94, .92, .87) * (1. - .14 * smoothstep(-.35, 0., cush)) * (1. - .2 * seam) * (1. + .08 * raised);
    if (i == 1) { float tw = sdBox(q - vec2(0., .6), vec2(.82, .95), .05); cu = mix(cu, mix(vec3(.12, .27, .5), vec3(.95), step(.5, fract(q.x * 2.2))), smoothstep(fw, -fw, tw)); }
    col = mix(col, cu, smoothstep(fw, -fw, cush) * step(abs(p.x - loungeC(float(i)).x), 1.5));
    float pil = sdBox(q - vec2(0., -2.45), vec2(.72, .38), .3);
    col = mix(col, vec3(.98, .97, .94) * (1. - .15 * smoothstep(-.25, 0., pil)), smoothstep(fw, -fw, pil)); }
  // side table with a drink
  float tb = length(p - tableC()) - .55;
  col = mix(col, teak * 1.1, smoothstep(fw, -fw, tb));
  col = mix(col, vec3(.85, .93, .95), smoothstep(fw, -fw, length(p - tableC() - vec2(.15, .1)) - .16));
  // Adirondack chairs round the fire pit
  if (uFire > .01) { float ad = adiD(p, slat) + (1. - uFire) * 3.;
    col = mix(col, vec3(.95, .94, .9) * (.86 + .14 * slat), smoothstep(fw, -fw, ad)); }
  // planters at the back corners
  for (int i = 0; i < 2; i++) { vec2 q = p - potC(float(i)); float pr = length(q);
    col = mix(col, vec3(.2, .2, .21) * (.85 + .3 * smoothstep(1.5, 1.2, pr)), smoothstep(fw, -fw, pr - 1.5));
    float leaf = fbm(q * 1.6 + float(i) * 9.); float fol = pr - 1.25 - .35 * (leaf - .5);
    vec3 lc = vec3(.13, .3, .1) * (.6 + .9 * leaf) * (1. + .35 * dot(normalize(q + .001), TL) * smoothstep(0., 1.3, pr));
    col = mix(col, lc, smoothstep(fw, -fw, fol)); }
  // coping (travertine bullnose) round pool and spa
  vec2 g = vec2(dFdx(d), dFdy(d)); vec2 en = length(g) > 0. ? normalize(g) : vec2(0.);
  vec3 cop = mix(copCol(p, floor(uDeck)), copCol(p, ceil(uDeck)), fract(uDeck)) * (.93 + .14 * dot(en, TL) * smoothstep(.0, .5, d));
  cop *= 1. - .22 * smoothstep(1.5, 2., uDeck) * smoothstep(.12, .0, abs(d - 1.02));   // concrete: a shadow joint where the edge meets the slab
  cop *= .8 + .2 * smoothstep(0., .25, d);
  col = mix(col, cop, smoothstep(fw, -fw, d - 1.1));
  // water
  float sd = spaD(p), inSpa = smoothstep(fw, -fw, sd);
  float depth = mix(3.6, 7.4, smoothstep(-uL * .25, uL * .3, p.x));
  float shelf = uShelf * smoothstep(-uL * .5 + 6.6, -uL * .5 + 6., p.x);
  depth = mix(depth, .9, shelf); depth = mix(depth, 3.3, inSpa);
  vec2 e = vec2(.06, 0.); vec2 n2 = vec2(wave(p + e) - wave(p - e), wave(p + e.yx) - wave(p - e.yx)) / (2. * e.x) * .12;
  vec2 fp = p + n2 * (.4 + depth * .45);
  vec3 floorC = mix(texture2D(tPl, fp / 5.).rgb, vec3(.86), .55);
  floorC *= mix(1., .55 + .9 * h21(floor(fp * 16.)), uPeb * .6);
  floorC = mix(floorC * uFloor, vec3(.86, .8, .7), shelf * .5);
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
  if (uSpa > .01) { float wallR = abs(sd - .3) - .3;                       // raised spa wall
    vec2 sq = p - spaC(); vec3 sw = texture2D(tS, p / 2.).rgb * .9 * (.9 + .2 * dot(normalize(sq), TL));
    col = mix(col, mix(sw, cop, smoothstep(.12, .2, abs(sd - .3))), smoothstep(fw, -fw, wallR) * step(.2, uSpa));
    // sheet of water spilling from the spa to the pool
    float spill = step(abs(sq.y), .75) * smoothstep(-3.05, -3.2, sq.x) * step(-4.55, sq.x) * step(.9, uSpa);
    float st = .6 + .4 * sin(sq.x * 14. + t * 12. + sq.y * 6.);
    col = mix(col, mix(vec3(.55, .82, .92), vec3(.95, 1., 1.), st), spill * .9); }
  // water falling from the scuppers
  if (uWall > .01) for (int i = 0; i < 3; i++) { float x = (float(i) - 1.) * uL * .22; vec2 q = p - vec2(x, uW * .5 + .2);
    float sm = smoothstep(.32, .12, abs(q.x)) * smoothstep(1.4, 1.1, q.y) * smoothstep(-1.4, -.9, q.y);
    float fl = .65 + .35 * sin(q.y * 9. + t * 14. + q.x * 20.);
    col = mix(col, vec3(.9, .97, 1.), sm * fl * uWall * .85);
    col = mix(col, vec3(.28, .2, .14), smoothstep(fw, -fw, sdBox(p - vec2(x, uW * .5 + 1.55), vec2(.32, .22), .05)) * uWall); }
  // umbrella canopy over the loungers
  vec2 uq = p - umbC(); float ur = length(uq), ang = atan(uq.y, uq.x);
  float pan = abs(fract(ang * 8. / 6.2831) - .5);                         // 0 on a rib, .5 mid-panel
  float ud = ur - 2.9 + .18 * (1. - pan * 2.) * (1. - pan * 2.);           // canopy sags between ribs
  vec3 umb = vec3(.11, .25, .48) * (.8 + .35 * pan) * (1. + .28 * dot(normalize(uq + .001), TL) * smoothstep(0., 2.9, ur));
  umb = mix(umb, umb * .7, smoothstep(.04, 0., pan) * smoothstep(.3, .6, ur));
  umb = mix(umb, vec3(.92, .9, .85), smoothstep(.22, .17, ur));
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
  const U = {}; ['uRes', 'uC', 'uTime', 'uScale', 'uL', 'uW', 'uSA', 'uSB', 'uM', 'uSpa', 'uShelf', 'uWall', 'uFire', 'uNight', 'uDeck', 'uPeb', 'uFloor', 'tG', 'tP', 'tPl', 'tS'].forEach(n => U[n] = gl.getUniformLocation(pr, n));
  const base = opts.tex || new URL('./tex/', import.meta.url).href;
  const tex = (name, unit) => new Promise(res => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    const im = new Image(); im.onload = () => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); res(); };
    im.onerror = () => res(); im.src = base + name + '.webp'; });
  [['tG', 0], ['tP', 1], ['tPl', 2], ['tS', 3]].forEach(([n, u]) => gl.uniform1i(U[n], u));
  const ready = Promise.all([tex('grass-col', 0), tex('paving-col', 1), tex('plaster-col', 2), tex('slate-col', 3)]);

  const cur = { L: 32, W: 16, spa: 0, shelf: 0, wall: 0, fire: 0, night: 0, m: 1, deck: 0, peb: 0, fr: .93, fg: .97, fb: 1 }, tgt = { ...cur };
  const FIN = { 'White plaster': [.93, .97, 1, 0], 'Pebble blue': [.52, .6, .66, 1], Midnight: [.2, .23, .3, .6] }, DECK = ['Pavers', 'Travertine', 'Concrete'];
  let held = false;
  let sa = 0, sb = 0, time = 0, raf = 0, last = 0, visible = true, dirty = true;
  const view = { w: 1, h: 1, dpr: 1, cx: 0, cy: 0, s: 10 };
  function set(p) {
    tgt.L = p.len; tgt.W = p.wid; const ex = new Set(p.extras || []);
    const f = FIN[p.finish] || FIN['White plaster']; [tgt.fr, tgt.fg, tgt.fb, tgt.peb] = f; tgt.deck = Math.max(0, DECK.indexOf(p.deck));
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
    const ext = 5.5 * cur.spa + 11.5 * cur.fire;
    const s = held ? view.s : Math.min(a.w / (.6 * cur.L + pad[0] + ext * (a.w < 600 ? 1.5 : .8)), a.h / (.6 * cur.W + pad[1]), a.w / (cur.L + 15 + ext));
    view.s = s; view.cx = a.x + a.w / 2 - (5.5 * cur.spa - 11.5 * cur.fire) / 2 * s; view.cy = a.y + a.h / 2 - 1.5 * s;   // css px, from top-left
    if (opts.grip) opts.grip.style.transform = `translate(${view.cx + cur.L * s / 2}px,${view.cy + cur.W * s / 2}px)`;
    if (opts.labels) {
      const { L, W } = opts.labels, k = s;
      L.style.cssText = `left:${view.cx - cur.L * k / 2}px;top:${view.cy + (cur.W / 2 + 9.6) * k}px;width:${cur.L * k}px`;
      W.style.cssText = `left:${view.cx + (cur.L / 2 + 7.6 + 5.5 * cur.spa) * k}px;top:${view.cy - cur.W * k / 2}px;height:${cur.W * k}px`;
    }
  }
  function draw() {
    place();
    gl.uniform2f(U.uRes, view.w, view.h); gl.uniform2f(U.uC, view.cx * view.dpr, view.h - view.cy * view.dpr);
    gl.uniform1f(U.uScale, view.s * view.dpr); gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uL, cur.L); gl.uniform1f(U.uW, cur.W); gl.uniform1f(U.uSA, sa); gl.uniform1f(U.uSB, sb); gl.uniform1f(U.uM, cur.m);
    gl.uniform1f(U.uSpa, cur.spa); gl.uniform1f(U.uShelf, cur.shelf); gl.uniform1f(U.uWall, cur.wall); gl.uniform1f(U.uFire, cur.fire); gl.uniform1f(U.uNight, cur.night);
    gl.uniform1f(U.uDeck, cur.deck); gl.uniform1f(U.uPeb, cur.peb); gl.uniform3f(U.uFloor, cur.fr, cur.fg, cur.fb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const ease = (k, v, dt, sp) => { cur[k] += (tgt[k] - cur[k]) * Math.min(1, dt * sp); if (Math.abs(tgt[k] - cur[k]) < .002) cur[k] = tgt[k]; };
  function loop(now) {
    raf = 0; if (!visible || document.hidden) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (!opts.reduced) time += dt;
    ['L', 'W'].forEach(k => ease(k, 0, dt, 9)); ['spa', 'shelf', 'wall', 'fire'].forEach(k => ease(k, 0, dt, 5)); ease('night', 0, dt, 3); ['deck', 'peb', 'fr', 'fg', 'fb'].forEach(k => ease(k, 0, dt, 4));
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
    hold(v) { held = v; if (!v) start(); }, get origin() { return [view.cx, view.cy, view.s]; },
    toScreen(x, y) { return [view.cx + x * view.s, view.cy - y * view.s]; }, get scale() { return view.s; }, get dims() { return { L: cur.L, W: cur.W }; }
  };
}
