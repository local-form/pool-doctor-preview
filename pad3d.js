// The equipment pad in 3D: pump, sand filter and heater are textured models (sources: SHOT-LIST.md, internal);
// salt cell, automation panel, valves and plumbing are built here. Tap a part to focus it; "System on" runs water
// through the plumbing (glowing flow), spins the pump fan, lights the heater and bubbles the salt cell.
// mountPad(canvas, { onPick }) -> { select(id), setRun(on), flag(id) }; throws without WebGL.
import * as THREE from './vendor/three.min.js';
const { GLTFLoader, MeshoptDecoder, RoomEnvironment } = THREE;

export async function mountPad(canvas, { onPick, reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no-webgl');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .8;
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const key = new THREE.DirectionalLight(0xfff1df, 2.6); key.position.set(-4, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: 1, far: 25 }); key.shadow.bias = -.0006; key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0x8fd0ff, 1.4); rim.position.set(5, 3, -6);
  scene.add(key, rim, new THREE.HemisphereLight(0xdbe9f5, 0x1a2630, .55));
  const rig = new THREE.Group(); scene.add(rig);

  // concrete pad with a slight bevel, and a soft ground shadow
  const padTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#9b968d'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14000; i++) { const v = 120 + Math.random() * 60; g.fillStyle = `rgba(${v},${v - 3},${v - 8},.35)`; g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.4); return t; })();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(7.4, .24, 3.2), new THREE.MeshStandardMaterial({ map: padTex, roughness: .95 }));
  pad.position.y = -.12; pad.receiveShadow = true; rig.add(pad);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .3 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.241; ground.receiveShadow = true; rig.add(ground);

  const parts = {}, glow = {};
  const tag = (id, g) => { g.userData.id = id; g.traverse(m => { if (m.isMesh) { m.userData.id = id; m.castShadow = m.receiveShadow = true; if (m.material) { m.material = m.material.clone(); if (m.material.isMeshBasicMaterial && m.material.emissive) delete m.material.emissive; } } }); parts[id] = g; rig.add(g); return g; };
  const fit = (obj, size, axis = 'y') => { const g = new THREE.Group(); g.add(obj); const v = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
    g.scale.setScalar(size / (axis === 'x' ? v.x : v.y)); const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); obj.position.set(-c.x / g.scale.x, -b.min.y / g.scale.x, -c.z / g.scale.x); const w = new THREE.Group(); w.add(g); return w; };
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const url = n => new URL(`./models/${n}.glb`, import.meta.url).href;
  const [pump, filter, heater] = await Promise.all(['pump', 'filter', 'heater'].map(n => loader.loadAsync(url(n)).then(g => g.scene)));
  const P = tag('pump', fit(pump, 1.45, 'x')); P.position.set(-2.55, 0, .35);
  const F = tag('filter', fit(filter, 1.75)); F.position.set(-.55, 0, -.25);
  const H = tag('heater', fit(heater, 1.45)); H.position.set(1.65, 0, -.35);
  const std = (c, r = .5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  // pump fan cover spinner (visible on the motor end when running)
  const fan = new THREE.Group(); const blades = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 6, 18), std(0x9aa3ab, .4, .6)); fan.add(blades);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.03, .3, .015), std(0x2b3036, .5)); b.rotation.z = i * Math.PI / 3; fan.add(b); }
  fan.rotation.y = Math.PI / 2; fan.position.set(-1.83, .42, .35); rig.add(fan);
  // heater flame glow behind the grille
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, .8, .2), transparent: true, opacity: 0 });
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(.8, .12), flameM); flame.position.set(1.65, 1.2, .2); rig.add(flame);
  // salt cell: clear body, unions, sensor cap, bubbles inside
  const salt = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .7, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xcfeaf2, roughness: .08, transmission: .85, thickness: .2, transparent: true, opacity: .55, side: THREE.DoubleSide }));
  body.rotation.z = Math.PI / 2; salt.add(body);
  const plates = new THREE.Mesh(new THREE.BoxGeometry(.6, .18, .12), std(0x9aa5ad, .3, .8)); salt.add(plates);
  for (const sx of [-.4, .4]) { const u = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .12, 32), std(0x2d3238, .45)); u.rotation.z = Math.PI / 2; u.position.x = sx; salt.add(u); }
  const capB = new THREE.Mesh(new THREE.BoxGeometry(.16, .12, .12), std(0x2d3238, .45)); capB.position.y = .19; salt.add(capB);
  const bubbles = []; for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.012 + Math.random() * .01, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); b.userData.o = Math.random(); salt.add(b); bubbles.push(b); }
  salt.position.set(.55, .72, 1.05); tag('salt', salt);
  // automation panel on a post with a small screen and status LEDs
  const auto = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.35, .09), std(0x51565c, .6, .4)); post.position.y = .67; auto.add(post);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.62, .82, .2), std(0xd9dcdd, .45)); box.position.set(0, 1.25, .12); auto.add(box);
  const screenM = new THREE.MeshBasicMaterial({ color: 0x0b2330 }); const screen = new THREE.Mesh(new THREE.PlaneGeometry(.36, .22), screenM); screen.position.set(0, 1.38, .225); auto.add(screen);
  const leds = [0x39d98a, 0x5db6e6, 0xffb547].map((c, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.022, 12), new THREE.MeshBasicMaterial({ color: c })); m.position.set(-.12 + i * .12, 1.13, .225); auto.add(m); return m; });
  auto.position.set(3.15, 0, -.7); tag('panel', auto);
  // plumbing: PVC with unions and three-way valves; flow paths for the glow
  const pipeM = std(0xf2f0ea, .35);
  const flowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(.5, 1.6, 2.2), transparent: true, opacity: 0, depthWrite: false });
  const flows = [];
  const pipe = (pts, r = .065) => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .05);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 90, r, 14), pipeM); m.castShadow = true; m.userData.id = 'plumbing'; plumbing.add(m);
    const f = new THREE.Mesh(new THREE.TubeGeometry(c, 90, r * 1.08, 10), flowM.clone()); f.userData.id = 'plumbing'; f.renderOrder = 2;
    const tex = (() => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 4; const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.75, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 4); const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.max(2, c.getLength() * 2.2), 1); return t; })();
    f.material.alphaMap = tex; f.material.map = tex; plumbing.add(f); flows.push(f); return c; };
  const plumbing = new THREE.Group(); tag('plumbing', plumbing);
  pipe([[-3.6, .36, .35], [-3.25, .36, .35]]);                                   // suction from the pool
  pipe([[-1.95, .62, .35], [-1.4, .62, .45], [-1.1, .5, .62], [-.85, .3, .55]]);  // pump -> filter
  pipe([[-.2, 1.62, -.15], [.15, 1.55, .35], [.15, .72, 1.05]]);                // filter valve -> salt line
  pipe([[.95, .72, 1.05], [1.25, .55, .9], [1.35, .32, .5]]);                    // salt cell -> heater
  pipe([[2.05, .32, .25], [2.45, .32, .95], [3.7, .32, 1.05]]);                  // heater -> return to pool
  const valve = (x, y, z, ry = 0) => { const v = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), pipeM); v.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.32, .05, .07), std(0x1d5db5, .45)); h.position.y = .16; v.add(h); v.position.set(x, y, z); v.rotation.y = ry; plumbing.add(v); };
  valve(-3.4, .36, .35); valve(3.0, .32, 1.03);
  [[-3.25, .36, .35], [-1.95, .62, .35], [2.05, .32, .25]].forEach(([x, y, z]) => { const u = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .1, 18), std(0xe6e3dc, .4)); u.rotation.z = Math.PI / 2; u.position.set(x, y, z); plumbing.add(u); });
  plumbing.traverse(m => { if (m.isMesh) m.userData.id = 'plumbing'; });

  // glow for the picked part: bright emissive pulse, a light on it, and an additive halo shell
  const glowL = new THREE.PointLight(0x5db6e6, 0, 3.2, 1.6); rig.add(glowL);
  const halos = {};
  const haloOf = id => halos[id] || (halos[id] = (() => { const h = [], ms = []; parts[id].traverse(m => { if (m.isMesh && m.geometry && !m.userData.halo) ms.push(m); }); ms.forEach(m => { { const s = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x49b8ff, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(1.09); s.userData.halo = 1; s.raycast = () => {}; m.add(s); h.push(s); } }); return h; })());
  // focus ring for flagged parts
  const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .62, 48), new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .02; rig.add(ring);

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let sel = null, flagged = null, running = false, run = 0, rotY = -.25, rotX = 0, velY = 0, dragging = false, sx = 0, sy = 0, lastT = 0, moved = 0, visible = true, raf = 0, t0 = performance.now();
  const look = new THREE.Vector3(.2, .6, 0), lookT = look.clone(); let zoom = 1, zoomT = 1;
  const centerOf = id => { const b = new THREE.Box3().setFromObject(parts[id]); return b.getCenter(new THREE.Vector3()); };
  function select(id) {
    sel = id;
    for (const [k, g] of Object.entries(parts)) g.traverse(m => { if (m.isMesh && m.material && m.material.emissive && !(m.material.isMeshBasicMaterial)) { m.material.emissive.setHex(k === id ? 0x1f8fff : 0); m.material.emissiveIntensity = k === id ? .6 : 0; } });
    for (const k in halos) if (k !== id) halos[k].forEach(s => { s.material.opacity = 0; });
    if (id && parts[id]) { haloOf(id); rig.updateMatrixWorld(); const c = rig.worldToLocal(centerOf(id)); glowL.position.set(c.x, c.y + .9, c.z + .9); }
    if (id && parts[id]) { rig.updateMatrixWorld(); const c = centerOf(id); lookT.set(c.x * .6, Math.max(.45, c.y), c.z * .3); zoomT = id === 'plumbing' ? .95 : .72; } else { lookT.set(.2, .6, 0); zoomT = 1; }
    kick();
  }
  function flag(id) { flagged = id; if (id && parts[id]) { const c = centerOf(id); ring.position.x = c.x; ring.position.z = c.z; } select(id); }
  function setRun(on) { running = on; kick(); }
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 1.1 ? 44 : 28; cam.updateProjectionMatrix();
  }
  function draw() {
    const t = (performance.now() - t0) / 1000;
    run += ((running ? 1 : 0) - run) * .06;
    if (!dragging) { rotY += velY; velY *= .95; if (Math.abs(velY) < .0004) velY = 0; }
    rig.rotation.y = rotY + (reduced || dragging || velY ? 0 : Math.sin(t * .22) * .05); rig.rotation.x = rotX;
    look.lerp(lookT, .08); zoom += (zoomT - zoom) * .08;
    uz += (uzT - uz) * .18; const narrow = cam.aspect < 1.1, d = (narrow ? 12 : 12.2) * zoom * uz;
    cam.position.set(look.x, look.y + (narrow ? 3.6 : 2.9) * zoom * uz, d); cam.lookAt(look);
    fan.rotation.x += run * .5;
    flows.forEach((f, i) => { f.material.opacity = run * .85; f.material.map.offset.x -= .02 * run; });
    flameM.opacity = run * (.75 + .25 * Math.sin(t * 13)); screenM.color.setRGB(.04 + run * .15, .14 + run * .45, .19 + run * .55);
    leds[0].material.color.setHex(running ? 0x39d98a : 0x1f3b2c);
    bubbles.forEach((b, i) => { const u = (b.userData.o + t * .45) % 1; b.position.set(-.3 + u * .6, -.08 + Math.sin(i * 3.3) * .07, Math.cos(i * 2.1) * .08); b.material.opacity = run * .8 * Math.sin(u * Math.PI); });
    if (sel && parts[sel]) { const g = .5 + .5 * Math.sin(t * 3.2), e = .35 + .45 * g;
      parts[sel].traverse(m => { if (m.isMesh && m.material && m.material.emissive && !m.material.isMeshBasicMaterial) { const c = m.material.color, lum = m.material.map ? .75 : .3 * c.r + .59 * c.g + .11 * c.b; m.material.emissiveIntensity = e * (1 - .8 * Math.min(1, lum)); } });
      (halos[sel] || []).forEach(s => { s.material.opacity = .55 + .45 * g; }); glowL.intensity = 2.2 + 2.6 * g; } else glowL.intensity = 0;
    ring.material.opacity = flagged ? .55 + .35 * Math.sin(t * 4) : 0; ring.scale.setScalar(1 + .06 * Math.sin(t * 4));
    renderer.render(scene, cam);
  }
  const busy = () => dragging || velY || running || run > .01 || look.distanceTo(lookT) > .005 || Math.abs(zoom - zoomT) > .002 || Math.abs(uz - uzT) > .002 || flagged || sel;
  function loop() { raf = 0; if (!visible || document.hidden) return; draw(); if (!reduced || busy()) raf = requestAnimationFrame(loop); }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  // zoom: two-finger pinch on the canvas, ctrl/trackpad-pinch wheel, or the +/- buttons. The page itself never zooms from here.
  let uz = 1, uzT = 1; const pts = new Map(); let pinch0 = 0, uz0 = 1;
  const zoomTo = v => { uzT = Math.max(.45, Math.min(1.5, v)); kick(); };
  const zoomBy = f => zoomTo(uzT * f);
  const pdist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { pinch0 = pdist(); uz0 = uzT; dragging = false; velY = 0; moved = 99; } });
  canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2 && pinch0 > 0) { e.preventDefault(); zoomTo(uz0 * pinch0 / Math.max(20, pdist())); } });
  const pend = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
  canvas.addEventListener('pointerup', pend); canvas.addEventListener('pointercancel', pend); canvas.addEventListener('lostpointercapture', pend);
  canvas.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomBy(Math.exp(e.deltaY * .01)); }, { passive: false });
  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) canvas.addEventListener(g, e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { if (pts.size > 1) return; dragging = true; velY = 0; sx = e.clientX; sy = e.clientY; lastT = performance.now(); moved = 0; try { canvas.setPointerCapture(e.pointerId); } catch {} kick(); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging || pts.size > 1) return; const dx = e.clientX - sx, dy = e.clientY - sy, now = performance.now(); sx = e.clientX; sy = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    rotY += dx * .01; rotX = Math.max(-.25, Math.min(.35, rotX + dy * .004)); velY = dx * .01 * Math.min(1, 16 / Math.max(1, now - lastT)) * .6; lastT = now; kick();
  });
  canvas.addEventListener('pointerup', e => {
    if (!dragging) return; dragging = false; if (performance.now() - lastT > 80) velY = 0; kick();
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(Object.values(parts), true).find(h => h.object.userData.id);
    if (hit) onPick?.(hit.object.userData.id);
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  new ResizeObserver(() => { size(); kick(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  size(); draw(); kick();
  return { select, setRun, flag, zoomBy };
}
