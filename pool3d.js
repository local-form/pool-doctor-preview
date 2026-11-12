// The Pool Doctor hero: a backyard pool built in code that builds itself, stake to swim.
// stage s: 0 stakes, 1 dig, 2 steel, 3 shell, 4 stone, 5 water, 6 lights (continuous).
import * as THREE from './vendor/three.min.js';
const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, GLTFLoader, MeshoptDecoder, RGBELoader, RoundedBoxGeometry } = THREE;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const L = 10, W = 5, D = 1.5;            // pool length (x), width (z), depth
const X0 = -L / 2, X1 = L / 2, Z0 = -W / 2, Z1 = W / 2;

function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function mount(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.dpr || 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const U = { time: { value: 0 }, night: { value: 0 }, fill: { value: 0 } };

  // sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { night: U.night },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float night; varying vec3 vP;
      void main(){ float h = clamp(vP.y*1.6+.08,0.,1.);
        vec3 dayLo=vec3(1.0,.72,.46), dayHi=vec3(.36,.55,.78), nLo=vec3(.95,.52,.36), nMid=vec3(.20,.20,.38), nHi=vec3(.02,.05,.12);
        vec3 d = mix(dayLo, dayHi, pow(h,.6));
        vec3 n = mix(mix(nLo,nMid,smoothstep(0.,.35,h)), nHi, smoothstep(.25,1.,h));
        gl_FragColor = vec4(mix(d,n,night),1.); }` }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0x0b1626, 30, 75);

  // lights
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x2b3a22, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd2a1, 3.2); sun.position.set(-14, 9, 6); sun.castShadow = true;
  sun.shadow.mapSize.setScalar(opts.small ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  scene.add(sun);
  const moon = new THREE.DirectionalLight(0x8fb4ff, 0); moon.position.set(6, 10, 8); scene.add(moon);

  // textures
  const tile = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#c9d3d6'; g.fillRect(0, 0, w, h); const c = 18;
    for (let x = 0; x < w; x += c) for (let y = 0; y < h; y += c) { const t = rnd(), k = rnd() < .12 ? 1.35 : 1; g.fillStyle = `rgb(${(18 + t * 26) * k | 0},${(70 + t * 60) * k | 0},${(118 + t * 62) * k | 0})`; g.fillRect(x + 1.5, y + 1.5, c - 3, c - 3);
      g.fillStyle = `rgba(255,255,255,${.06 + rnd() * .1})`; g.fillRect(x + 2.5, y + 2.5, c - 8, 2); } }, [1, 1]);

  const texBase = opts.tex || new URL('./tex/', import.meta.url).href, TL = new THREE.TextureLoader(), maxAni = renderer.capabilities.getMaxAnisotropy();
  const pending = [];
  const T = (n, srgb) => { let done; pending.push(new Promise(r => done = r)); const t = TL.load(texBase + n + '.webp', done, undefined, done); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAni); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const pbr = (n, extra = {}) => { const arm = T(n + '-arm'); return new THREE.MeshStandardMaterial(Object.assign({ map: T(n + '-col', true), normalMap: T(n + '-nor'), roughnessMap: arm, aoMap: arm, roughness: 1, metalness: 0 }, extra)); };
  const M = (o) => new THREE.MeshStandardMaterial(o);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const flat = (shape) => { const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); return g; };
  const rect = (x0, z0, x1, z1) => { const s = new THREE.Shape(); s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.closePath(); return s; };
  const fixUV = (g, k) => { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * k, p.getZ(i) * k); };

  // lawn with the pool hole
  const lawnShape = rect(-40, -40, 40, 40); lawnShape.holes.push(rect(X0, Z0, X1, Z1));
  const lawnG = flat(lawnShape);
  const grassM = pbr('grass', { normalScale: new THREE.Vector2(1.2, 1.2), color: new THREE.Color(1.1, 1.22, .95) }); fixUV(lawnG, 1 / 2.2); const lawn = add(lawnG, grassM); lawn.castShadow = false;
  const patch = add(flat(rect(X0 - .01, Z0 - .01, X1 + .01, Z1 + .01)), grassM, 0, .002, 0); patch.castShadow = false;
  fixUV(patch.geometry, 1 / 2.2);
  // churned yard around the dig
  const dirtRingS = rect(X0 - 2.2, Z0 - 2.2, X1 + 2.2, Z1 + 2.2); dirtRingS.holes.push(rect(X0, Z0, X1, Z1));
  const dirtM = pbr('dirt', { transparent: true }); const dirtRing = add(flat(dirtRingS), dirtM, 0, .004, 0); fixUV(dirtRing.geometry, 1 / 2.5);

  // pool shell (walls + floor), material changes with the stage
  const dirtCol = T('dirt-col', true);
  const shellTex = { dirt: [dirtCol, T('dirt-nor'), T('dirt-arm')], gunite: [T('gunite-col', true), T('gunite-nor'), T('gunite-arm')], plaster: [T('plaster-col', true), T('plaster-nor'), T('plaster-arm')] };
  const shellMat = M({ color: 0xffffff, roughness: 1, map: shellTex.dirt[0], normalMap: shellTex.dirt[1], roughnessMap: shellTex.dirt[2], aoMap: shellTex.dirt[2] });
  const caust = { value: 0 }, rough = { value: 1 };
  shellMat.onBeforeCompile = (sh) => {
    sh.uniforms.time = U.time; sh.uniforms.night = U.night; sh.uniforms.fill = U.fill; sh.uniforms.caust = caust; sh.uniforms.rough = rough;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float rough;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec3 wp = (modelMatrix*vec4(position,1.)).xyz; vec3 wn = normalize(mat3(modelMatrix)*normal);
        float fade = smoothstep(0.,.45,max(${(L / 2).toFixed(2)}-abs(wp.x), ${(W / 2).toFixed(2)}-abs(wp.z))) * smoothstep(0.,.25,-wp.y) * smoothstep(0.,.25,wp.y+${D.toFixed(2)}) * (1.-step(.9,abs(wn.y)));
        float n = sin(wp.x*2.3+wp.y*3.1+wp.z*1.7)*.5 + sin(wp.x*5.9-wp.y*4.3+wp.z*6.1)*.3 + sin(wp.x*13.1+wp.y*11.7-wp.z*12.3)*.15;
        transformed += normal * n * .11 * fade * rough; }`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float time, night, fill, caust, rough; varying vec3 vW;
      float cn(vec2 p){ vec2 i=floor(p), f=fract(p); float d=1.; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=fract(sin(vec2(dot(i+g,vec2(127.1,311.7)),dot(i+g,vec2(269.5,183.3))))*43758.5); o=.5+.5*sin(time*.9+6.2831*o); d=min(d,length(g+o-f)); } return d; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float under = step(vW.y, -0.13 - (1.-fill)*1.4) * caust;
        vec2 q = vW.xz*1.35; float c = pow(1.-cn(q),5.)*.9 + pow(1.-cn(q*1.9+3.1),6.)*.5;
        float glow = 0.;
        glow += 1./(1.+dot(vW-vec3(-1.6,-.95,2.45), vW-vec3(-1.6,-.95,2.45))*.9);
        glow += 1./(1.+dot(vW-vec3(2.6,-.95,2.45), vW-vec3(2.6,-.95,2.45))*.9);
        vec3 nightC = vec3(.02,.5,.75)*(.05+glow*1.1) + vec3(.45,.95,1.)*c*(.06+glow*.5);
        vec3 dayC = vec3(.55,.85,.95)*c*.45;
        totalEmissiveRadiance += under*mix(dayC, nightC, night); }`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      { vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))); normal = normalize(mix(normal, fn, rough*.85)); }`)
      .replace('#include <opaque_fragment>', `{ float wl = -.14 - (1.-fill)*1.36; float dep = max(0., wl - vW.y) * step(.01, fill);
        vec3 vd = normalize(cameraPosition - vW); float path = dep * (1. + 1./max(vd.y, .3));
        vec3 ab = exp(-path * vec3(.42, .085, .055));
        vec3 scat = mix(vec3(.0,.20,.26), vec3(.0,.035,.07), night) * (1. - ab.g);
        outgoingLight = outgoingLight * ab + scat; }
      #include <opaque_fragment>`);
  };
  const floor = add(new THREE.PlaneGeometry(L, W).rotateX(-Math.PI / 2), shellMat, 0, -D, 0); fixUV(floor.geometry, 1 / 3);
  const wallG = (len) => { const g = new THREE.PlaneGeometry(len, D, Math.round(len * 9), 14); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 3, uv.getY(i) * D / 3); return g; };
  const walls = [[L, 0, -D / 2, Z0, 0], [L, 0, -D / 2, Z1, Math.PI], [W, X0, -D / 2, 0, Math.PI / 2], [W, X1, -D / 2, 0, -Math.PI / 2]]
    .map(([len, x, y, z, ry]) => { const m = add(wallG(len), shellMat, x, y, z); m.rotation.y = ry; return m; });
  // waterline tile band
  const tileMat = M({ map: tile, roughness: .12, metalness: 0 });
  const tiles = [[L, Z0 + .002, 0, 0], [L, Z1 - .002, 0, Math.PI], [W, 0, X0 + .002, Math.PI / 2], [W, 0, X1 - .002, -Math.PI / 2]].map(([len, z, x, ry]) => {
    const m = add(new THREE.PlaneGeometry(len, .18), tileMat, x, -.1, z); m.rotation.y = ry; m.material = tileMat; m.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * len / 1.45; }); return m; });
  // underwater light lenses
  const lens = [-1.6, 2.6].map(x => { const m = add(new THREE.CircleGeometry(.13, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }), x, -.95, Z1 - .01); m.rotation.y = Math.PI; return m; });
  const pl = [-1.6, 2.6].map(x => { const p = new THREE.PointLight(0x8fe6ff, 0, 9, 1.6); p.position.set(x, -.9, Z1 - .35); scene.add(p); return p; });

  // dig: dirt piles
  const piles = new THREE.Group(); scene.add(piles);
  [[-8.4, -1.5, 1.6], [8.6, 1.2, 1.9], [7.2, -3.8, 1.2]].forEach(([x, z, r]) => { const g = new THREE.IcosahedronGeometry(r, 5); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + (Math.sin(v.x * 3.1) + Math.cos(v.z * 2.7)) * .07 + Math.sin(v.x * 9.3 + v.z * 7.1) * Math.cos(v.y * 8.7) * .05 + Math.sin(v.x * 23. + v.y * 19.) * .02); v.y = Math.max(v.y * .5, -.2); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals();
    const pm = pbr('dirt'); pm.map.repeat.set(3, 3); pm.normalMap.repeat.set(3, 3); pm.roughnessMap.repeat.set(3, 3); add(g, pm, x, 0, z, piles); });

  // steel: rebar grid
  const reb = []; const sp = .32;
  for (let x = X0 + .15; x < X1; x += sp) reb.push(x, -D + .06, Z0 + .05, x, -D + .06, Z1 - .05, x, -D + .05, Z0 + .05, x, -.05, Z0 + .05, x, -D + .05, Z1 - .05, x, -.05, Z1 - .05);
  for (let z = Z0 + .15; z < Z1; z += sp) reb.push(X0 + .05, -D + .06, z, X1 - .05, -D + .06, z, X0 + .05, -D + .05, z, X0 + .05, -.05, z, X1 - .05, -D + .05, z, X1 - .05, -.05, z);
  for (let y = -D + .25; y < -.05; y += sp) reb.push(X0 + .05, y, Z0 + .05, X1 - .05, y, Z0 + .05, X0 + .05, y, Z1 - .05, X1 - .05, y, Z1 - .05, X0 + .05, y, Z0 + .05, X0 + .05, y, Z1 - .05, X1 - .05, y, Z0 + .05, X1 - .05, y, Z1 - .05);
  const rebar = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(reb, 3)), new THREE.LineBasicMaterial({ color: 0x9a5a34, transparent: true }));
  scene.add(rebar);

  // stakes and string line
  const stakes = new THREE.Group(); scene.add(stakes);
  const stakeMat = M({ color: 0xc89a5e, roughness: .8 });
  const pts = []; for (let x = X0; x <= X1 + .01; x += 2.5) pts.push([x, Z0], [x, Z1]); for (let z = Z0 + 2.5; z < Z1; z += 2.5) pts.push([X0, z], [X1, z]);
  pts.forEach(([x, z]) => add(new THREE.BoxGeometry(.06, .7, .06), stakeMat, x, .3, z, stakes));
  const str = [X0, .45, Z0, X1, .45, Z0, X1, .45, Z0, X1, .45, Z1, X1, .45, Z1, X0, .45, Z1, X0, .45, Z1, X0, .45, Z0];
  stakes.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(str, 3)), new THREE.LineBasicMaterial({ color: 0xff7a3d })));
  const paint = [];
  for (let i = 0; i < 4; i++) { const [a, b] = [[X0, Z0, X1, Z0], [X1, Z0, X1, Z1], [X1, Z1, X0, Z1], [X0, Z1, X0, Z0]][i].reduce((acc, v, j) => (acc[j >> 1].push(v), acc), [[], []]); paint.push(a[0], .012, a[1], b[0], .012, b[1]); }
  stakes.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(paint, 3)), new THREE.LineBasicMaterial({ color: 0xf2f2f2 })));

  // finish: deck, coping, raised stone wall, spa
  const finish = new THREE.Group(); scene.add(finish); const finishLater = [];
  const deckS = rect(X0 - 2.6, Z0 - .9, X1 + 2.8, Z1 + 3.2); deckS.holes.push(rect(X0 - .32, Z0 - .32, X1 + .32, Z1 + .32));
  const deckG = new THREE.ExtrudeGeometry(deckS, { depth: .06, bevelEnabled: false }); deckG.rotateX(-Math.PI / 2);
  fixUV(deckG, 1 / 4.2); const deckM = pbr('paving', { color: 0xfff0dc }); add(deckG, deckM, 0, 0, 0, finish);
  const copS = rect(X0 - .32, Z0 - .32, X1 + .32, Z1 + .32); copS.holes.push(rect(X0, Z0, X1, Z1));
  const copG = new THREE.ExtrudeGeometry(copS, { depth: .09, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }); copG.rotateX(-Math.PI / 2); fixUV(copG, 1 / 1.6);
  add(copG, pbr('paving', { color: 0xfff8ee }), 0, 0, 0, finish);
  const boxUV = (g, k) => { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); uv.setXY(i, (ax > .5 ? p.getZ(i) : p.getX(i)) * k, (ay > .5 ? p.getZ(i) : p.getY(i)) * k); } return g; };
  const cylUV = (g, r, h, k) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6.283 * r * k, uv.getY(i) * h * k); return g; };
  const slate = pbr('slate', { color: 0xd6d0c6 }), capM = pbr('paving', { color: 0xfff8ee }), bronze = M({ color: 0x3b2b1f, roughness: .42, metalness: .85 });
  [slate.map, slate.normalMap, slate.roughnessMap].forEach(t => t.repeat.set(1, 1));
  // stone scupper walls at the back, each pouring into the pool
  const scupX = [-3.3, 0, 3.3], streams = [], wallZ = Z0 - .57, wallH = .78;
  // water
  let envU;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: U.time, night: U.night, fill: U.fill, envT: envU = { value: null } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float time, night, fill; uniform sampler2D envT; varying vec3 vW;
      vec3 envS(vec3 d){ d.xz = mat2(cos(2.2),-sin(2.2),sin(2.2),cos(2.2))*d.xz; vec2 uv = vec2(atan(d.z,d.x)*.1591+.5, asin(clamp(d.y,-1.,1.))*.3183+.5); return texture2D(envT, uv).rgb; }
      float h(vec2 p){ return sin(p.x*2.1+time*.9)*.5+sin(p.y*2.7-time*1.1)*.5+sin((p.x+p.y)*4.3+time*1.7)*.25+sin((p.x-p.y)*7.+time*2.3)*.12; }
      void main(){ vec2 e=vec2(.03,0.); vec2 g=vec2(h(vW.xz+e.xy)-h(vW.xz-e.xy), h(vW.xz+e.yx)-h(vW.xz-e.yx))/(2.*e.x);
        vec3 n = normalize(vec3(-g.x*.05,1.,-g.y*.05)); vec3 v = normalize(cameraPosition - vW);
        float fr = .04 + .96*pow(1.-max(dot(n,v),0.),5.);
        vec3 r0 = reflect(-v,n); r0.y = abs(r0.y); vec3 skyR = mix(envS(r0)*.9, envS(r0)*vec3(.12,.13,.24), night);
        vec3 body = mix(vec3(.0,.36,.47), vec3(.0,.30,.44), night);
        vec3 r = reflect(-v,n); float spec = pow(max(dot(r, normalize(vec3(-.6,.35,-.7))),0.),180.);
        float torch = pow(max(dot(r, normalize(vec3(.15,.25,-1.))),0.),60.)*night;
        vec3 col = mix(body, skyR, fr) + spec*mix(vec3(1.,.85,.6),vec3(.4,.5,.8),night)*1.6 + torch*vec3(1.,.6,.25)*.8;
        float a = mix(.55, .40, night) + fr*.5;
        gl_FragColor = vec4(col, a*fill); }` });
  const water = add(new THREE.PlaneGeometry(L, W).rotateX(-Math.PI / 2), waterMat, 0, -.14, 0); water.castShadow = false; water.receiveShadow = false; water.renderOrder = 2;
  const streamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { time: U.time, night: U.night, fill: U.fill },
    vertexShader: 'varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float time, night, fill; varying vec2 vU;
      void main(){ float s = .5+.5*sin(vU.x*40.+sin(vU.x*9.)*2.)*sin(vU.y*14.-time*10.);
        vec3 c = mix(vec3(.8,.92,.97), vec3(.6,.95,1.), night)*(.75+.45*s);
        float a = smoothstep(0.,.2,vU.x)*smoothstep(1.,.8,vU.x)*(.5+.35*s)*smoothstep(.0,.05,vU.y)*fill; gl_FragColor=vec4(c*(1.+night*.5),a); }` });
  function stream(x, y0, z0) { const N = 24, w = .2, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const t = i / N, z = z0 + t * .62, y = y0 + t * .05 - t * t * (y0 + .19); [-1, 1].forEach((k, j) => { pos.push(x + k * w / 2 * (1 + t * .5), y, z); uv.push(j, t); }); if (i < N) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = new THREE.Mesh(g, streamMat); m.renderOrder = 3; finish.add(m); streams.push(m); }

  // raised stone wall along the back with three bronze scuppers
  add(boxUV(new THREE.BoxGeometry(L + .64, wallH, .5), 1 / 1.4), slate, 0, wallH / 2, wallZ, finish);
  add(boxUV(new RoundedBoxGeometry(L + .84, .07, .66, 2, .015), 1 / 1.6), capM, 0, wallH + .035, wallZ + .02, finish);
  scupX.forEach(x => { add(new RoundedBoxGeometry(.28, .07, .22, 2, .01), bronze, x, .56, wallZ + .3, finish); stream(x, .55, wallZ + .41); });
  // fence, trees, torches, string lights
  const fenceMat = M({ color: 0x6d5444, roughness: .9 });
  const mm = new THREE.Matrix4();
  const fenceT = pbr('fence', { color: 0xc8b8a8 }); [fenceT.map, fenceT.normalMap, fenceT.roughnessMap].forEach(t => t.repeat.set(32 / 2.2, 1));
  const fenceBack = add(new THREE.BoxGeometry(32, 1.85, .05), fenceT, 0, .92, -7.22);
  const fenceSideM = fenceT.clone(); ['map', 'normalMap', 'roughnessMap', 'aoMap'].forEach(k => { fenceSideM[k] = fenceT[k].clone(); fenceSideM[k].repeat.set(11.2 / 2.2, 1); fenceSideM[k].needsUpdate = true; });
  const fenceSide = add(new THREE.BoxGeometry(11.2, 1.85, .05), fenceSideM, -15, .92, -1.6); fenceSide.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(32, .09, .05), fenceMat, 0, 1.5, -7.17); add(new THREE.BoxGeometry(32, .09, .05), fenceMat, 0, .35, -7.17);
  const treeTex = canvasTex(2048, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#000';
    for (let i = 0; i < 70; i++) { const x = rnd() * w, r = 40 + rnd() * 120, y = h - 40 - rnd() * 260; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      for (let k = 0; k < 40; k++) { const a = rnd() * 6.3, d = r * (.8 + rnd() * .35); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, 6 + rnd() * 16, 0, 7); g.fill(); } }
    g.fillRect(0, h - 60, w, 60); for (let i = 0; i < 9; i++) { const x = rnd() * w; g.fillRect(x, h - 340 - rnd() * 80, 6 + rnd() * 6, 340); } });
  treeTex.colorSpace = THREE.NoColorSpace;
  const trees = new THREE.Mesh(new THREE.PlaneGeometry(90, 22), new THREE.MeshBasicMaterial({ color: 0x050b10, alphaMap: treeTex, transparent: true, fog: false, depthWrite: false }));
  trees.position.set(0, 8.5, -26); scene.add(trees);
  // model props
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const base = opts.models || new URL('./models/', import.meta.url).href;
  const load = (n) => new Promise(res => loader.load(base + n + '.glb', g => { g.scene.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (m.material) m.material.envMapIntensity = 1; } }); res(g.scene); }, undefined, () => res(null)));
  function fit(o, h, long, rotY = 0) { const w = new THREE.Group(), inner = new THREE.Group(); inner.add(o); inner.rotation.y = rotY; w.add(inner);
    const b = new THREE.Box3().setFromObject(w), sz = new THREE.Vector3(); b.getSize(sz); w.scale.setScalar(h ? h / sz.y : long / Math.max(sz.x, sz.z));
    const b2 = new THREE.Box3().setFromObject(w), c = new THREE.Vector3(); b2.getCenter(c); inner.position.set(-c.x / w.scale.x, -b2.min.y / w.scale.x, -c.z / w.scale.x); return w; }
  const torches = [-6.2, -1.8, 2.6, 7].map(x => { const g = new THREE.Group(); g.position.set(x, 0, -6.7); scene.add(g);
    add(new THREE.CylinderGeometry(.028, .04, 1.9, 12), bronze, 0, .95, 0, g); add(new THREE.CylinderGeometry(.12, .05, .13, 20), bronze, 0, 1.94, 0, g); add(new THREE.CylinderGeometry(.09, .09, .1, 16), bronze, 0, .05, 0, g);
    const f = add(new THREE.ConeGeometry(.07, .3, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.7, .5) }), 0, 2.02, 0, g); f.castShadow = false;
    const p = new THREE.PointLight(0xffa25a, 0, 9, 1.8); p.position.set(0, 2.05, .2); g.add(p); return { f, p, g }; });
  const fireG = new THREE.Group(); fireG.position.set(-4.4, .06, 4.5); scene.add(fireG); finishLater.push(fireG);
  const flames = [0, 1, 2, 3, 4].map(i => { const f = add(new THREE.ConeGeometry(.09 + (i % 2) * .04, .45, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2, .5), transparent: true, opacity: .9 }), Math.cos(i * 1.3) * .16, .62, Math.sin(i * 1.3) * .16, fireG); f.castShadow = false; return f; });
  add(cylUV(new THREE.CylinderGeometry(.84, .86, .4, 48, 1, true), .85, .4, 1 / 1.4), slate, 0, .2, 0, fireG);
  add(cylUV(new THREE.CylinderGeometry(.56, .56, .4, 40, 1, true), .56, .4, 1 / 1.4), slate, 0, .2, 0, fireG).material = slate.clone(); fireG.children[fireG.children.length - 1].material.side = THREE.BackSide;
  const capG = new THREE.LatheGeometry([new THREE.Vector2(.53, 0), new THREE.Vector2(.9, 0), new THREE.Vector2(.92, .03), new THREE.Vector2(.9, .065), new THREE.Vector2(.53, .065), new THREE.Vector2(.53, 0)], 64); cylUV(capG, .7, .4, 1 / 1.6);
  add(capG, capM, 0, .4, 0, fireG);
  add(new THREE.CircleGeometry(.56, 40).rotateX(-Math.PI / 2), M({ color: 0x1b1714, roughness: 1 }), 0, .28, 0, fireG);
  const fireL = new THREE.PointLight(0xff8a3d, 0, 8, 1.7); fireL.position.set(0, 1, 0); fireG.add(fireL);
  const teak = M({ color: 0x7a5236, roughness: .55 }), fabric = M({ color: 0xeee8dc, roughness: .95 });
  function chaise() { const g = new THREE.Group(), RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
    [-.29, .29].forEach(x => add(RB(.05, .07, 1.95, .015), teak, x, .3, 0, g));
    for (let i = 0; i < 9; i++) add(RB(.6, .025, .16, .008), teak, 0, .345, -.55 + i * .19, g);
    [[-.27, -.85], [.27, -.85], [-.27, .85], [.27, .85]].forEach(([x, z]) => add(RB(.06, .3, .06, .01), teak, x, .15, z, g));
    const seat = add(RB(.6, .09, 1.25, .04), fabric, 0, .405, .33, g);
    const back = new THREE.Group(); back.position.set(0, .36, -.3); back.rotation.x = .95; g.add(back);
    add(RB(.6, .03, .7, .01), teak, 0, .02, -.35, back); add(RB(.6, .08, .68, .04), fabric, 0, .075, -.35, back);
    add(RB(.42, .1, .2, .05), fabric, 0, .16, -.62, back);
    return g; }
  [[2.7, 4.35], [4.5, 4.35]].forEach(([x, z]) => { const c = chaise(); c.position.set(x, .06, z); c.rotation.y = .06; scene.add(c); finishLater.push(c); });
  const props = { ready: false };
  const loaded = Promise.all(['shrub_03', 'shrub_04'].map(load)).then(([s3, s4]) => {
    const bed = [[-12.5, -6.5, 1.3, 3], [-10.4, -6.6, .9, 4], [-8.6, -6.4, 1.2, 3], [-5.6, -6.6, .8, 4], [-4.2, -6.5, 1.0, 3], [-.6, -6.6, .85, 4], [1.0, -6.5, 1.1, 3], [4.6, -6.6, .9, 4], [6.0, -6.4, 1.25, 3], [9.4, -6.5, 1.0, 4], [11.2, -6.4, 1.4, 3], [-14.2, -3.5, 1.2, 3], [-14.3, -1.0, .9, 4], [-14.2, 1.6, 1.1, 3], [9.2, -4.6, .9, 4], [-8.6, 5.6, .8, 3]];
    bed.forEach(([x, z, h, k], i) => { const src = k === 3 ? s3 : s4; if (!src) return; const m = fit(src.clone(), h * 2.1); m.position.set(x, 0, z); m.rotation.y = i * 2.4; scene.add(m); });
    props.ready = true; });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.5) }), 30);
  const wire = []; for (let i = 0; i < 30; i++) { const u = i / 29; const x = -11 + u * 22; const y = 3.6 - Math.sin(u * Math.PI) * .9; const z = -6.9 + u * 1.2; mm.makeTranslation(x, y - .08, z); bulbs.setMatrixAt(i, mm); wire.push(new THREE.Vector3(x, y, z)); }
  scene.add(bulbs); const wireL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: 0x111111 })); scene.add(wireL);

  // image-based light from a real sunset sky (CC0 HDR)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envP = new Promise(res => new RGBELoader().load(texBase + 'sky.hdr', hdr => { hdr.mapping = THREE.EquirectangularReflectionMapping; scene.environment = pmrem.fromEquirectangular(hdr).texture; scene.environmentRotation.y = 2.2; envU.value = hdr; hdr.minFilter = THREE.LinearFilter; hdr.generateMipmaps = false; res(); }, undefined, () => res()));
  const ready = Promise.all([loaded, envP, ...pending]);
  // post
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: opts.small ? 2 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .55, .55, .92); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // state
  let stage = opts.stage ?? 6, target = stage, frames = 0, yaw = 0, yawT = 0, offX = 0, offY = 0, dist = 1, raf = 0, last = performance.now();
  const view = { w: 1, h: 1 };
  function frame(w, h) { view.w = w; view.h = h; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function layout(o) { offX = o.offX ?? offX; offY = o.offY ?? offY; dist = o.dist ?? dist; if (o.fov) { camera.fov = o.fov; camera.updateProjectionMatrix(); } }
  function apply(s, tm) {
    const dig = sm(.6, 1.2, s), steel = sm(1.7, 2.1, s) * (1 - sm(2.75, 3.05, s)), shell = sm(2.7, 3.1, s), fin = sm(3.6, 4.4, s);
    const fill = sm(4.6, 5.5, s), night = sm(5.3, 6, s);
    U.fill.value = fill; U.night.value = night; caust.value = fill;
    stakes.visible = s < 1.1; stakes.position.y = -sm(.6, 1.1, s) * .8;
    patch.visible = dig < .999; patch.position.y = .002 - dig * D; patch.material.opacity = 1;
    dirtRing.visible = s > .5 && fin < .99; dirtRing.material.opacity = sm(.5, 1, s) * (1 - fin);
    piles.visible = s > .6 && s < 4.4; piles.children.forEach(c => c.scale.setScalar(Math.max(.001, dig * (1 - fin))));
    rebar.visible = steel > .01; rebar.material.opacity = steel;
    const ph = shell < .5 ? 'dirt' : fin < .5 ? 'gunite' : 'plaster', st = shellTex[ph];
    shellMat.map = st[0]; shellMat.normalMap = st[1]; shellMat.roughnessMap = shellMat.aoMap = st[2];
    rough.value = 1 - shell;
    if (ph === 'plaster') { shellMat.color.setRGB(.93, .97, 1); shellMat.roughness = .8; shellMat.normalScale.set(.5, .5); }
    else { if (ph === 'dirt') shellMat.color.setScalar(1); else shellMat.color.setRGB(.6, .58, .54); shellMat.roughness = 1; shellMat.normalScale.set(1.3, 1.3); }
    tiles.forEach(m => m.visible = fin > .5);
    finish.visible = fin > .01; finish.position.y = (fin - 1) * .7; finishLater.forEach(g => { g.visible = fill > .9; });
    water.position.y = -.14 - (1 - fill) * 1.36; water.visible = fill > .01; streams.forEach(m => m.visible = fill > .6);
    lens.forEach(m => m.material.color.setScalar(.25 + night * 6)); pl.forEach(p => p.intensity = night * 14);
    torches.forEach((o, i) => { const fl = 1 + Math.sin(tm * 11 + i * 2) * .08 + Math.sin(tm * 23 + i) * .05; o.f.visible = night > .05; o.f.scale.set(1, fl * night, 1); o.p.intensity = night * 9 * fl; });
    flames.forEach((f, i) => { const k = .7 + .3 * Math.sin(tm * (9 + i * 2.3) + i); f.visible = night > .05; f.scale.set(1, k * night, 1); }); fireL.intensity = night * 10 * (.9 + .1 * Math.sin(tm * 17));
    bulbs.visible = night > .05; bulbs.material.color.setRGB(5 * night, 3.4 * night, 1.5 * night);
    sun.intensity = 3.2 * (1 - night) + .02; sun.color.setHSL(.08, .9, .72 - night * .1); hemi.intensity = .55 - night * .42; scene.environmentIntensity = 1 - night * .78; moon.intensity = night * .9;
    renderer.toneMappingExposure = 1 - night * .05;
    scene.fog.color.setRGB(.55 - night * .5, .5 - night * .44, .48 - night * .37);
  }
  function render(tm) {
    const s = stage; apply(s, tm);
    const r = 19.5 * dist, a = .62 + yaw + Math.sin(tm * .07) * .035, el = .29;
    camera.position.set(Math.sin(a) * r * Math.cos(el), Math.sin(el) * r, Math.cos(a) * r * Math.cos(el));
    camera.lookAt(0, -.2, -1.2);
    camera.setViewOffset(view.w, view.h, -view.w * offX, -view.h * offY, view.w, view.h);
    composer.render();
  }
  let visible = true, playT = null;
  function loop(now) { raf = 0; if (!visible || document.hidden) return; if (playT !== null) { target = Math.min(6, (now - playT) / 1000 * .85); if (target >= 6) { playT = null; opts.onPlayEnd?.(); } opts.onStage?.(stage); } const dt = Math.min(.05, (now - last) / 1000); last = now; U.time.value += dt;
    stage += (target - stage) * Math.min(1, dt * 3.2); yaw += (yawT - yaw) * Math.min(1, dt * 4);
    render(U.time.value); frames++; if (Math.abs(target - stage) > .002) opts.onStage?.(stage); raf = requestAnimationFrame(loop); }
  return {
    frame, layout, start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }, stop() { cancelAnimationFrame(raf); raf = 0; },
    setVisible(v) { visible = v; if (v) this.start(); }, play() { stage = 0; target = 0; playT = performance.now(); this.start(); }, stopPlay() { playT = null; },
    get ready() { return props.ready; }, loaded: ready, set(s, jump) { target = clamp(s, 0, 6); if (jump) stage = target; }, get stage() { return stage; }, get frames() { return frames; },
    turn(d) { yawT = clamp(yawT + d, -.5, .45); }, renderOnce(tm = 2) { U.time.value = tm; render(tm); frames++; }
  };
}
