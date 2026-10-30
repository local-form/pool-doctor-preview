// The equipment pad in 3D. Pump, sand filter and heater are Meshy models (approved by Conner 2026-10-29, disclosed in
// the footer); the salt cell, timer, pipes and the concrete pad are built here. Everything wears one matte "clay"
// finish, like an architect's model. mountPad(host, { onPick, reduced }) -> { select(id) }; throws without WebGL.
import * as THREE from './vendor/three-pad.min.js';

const CLAY = 0xE9E3D7, PICK = 0x8FD3E0;
export async function mountPad(host, { canvas, onPick, reduced = false, anchors = {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no-webgl');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new THREE.RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 60);
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2); key.position.set(-3, 6, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 1, far: 20 }); key.shadow.bias = -.0008; key.shadow.radius = 6;
  scene.add(key, new THREE.HemisphereLight(0xdbe9ee, 0x2a3a40, .7));
  const rig = new THREE.Group(); scene.add(rig);
  const clay = () => new THREE.MeshStandardMaterial({ color: CLAY, roughness: .62, metalness: 0 });
  // the pad and the ground shadow
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6.6, .22, 2.8), new THREE.MeshStandardMaterial({ color: 0xB9B2A4, roughness: .9 }));
  pad.position.y = -.11; pad.receiveShadow = true; rig.add(pad);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .28 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.221; ground.receiveShadow = true; rig.add(ground);
  const parts = {};
  const place = (id, obj, size, x, z = 0, axis = 'y') => {
    const box = new THREE.Box3().setFromObject(obj), v = box.getSize(new THREE.Vector3());
    obj.scale.setScalar(size / (axis === 'x' ? v.x : v.y));
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    obj.position.x += x - c.x; obj.position.z += z - c.z; obj.position.y += -b2.min.y;
    const g = new THREE.Group(); g.add(obj); g.userData.id = id; rig.add(g);
    obj.traverse(m => { if (m.isMesh) { m.material = clay(); m.castShadow = true; m.receiveShadow = true; m.userData.id = id; } });
    parts[id] = g; return g;
  };
  const loader = new THREE.GLTFLoader(), url = n => new URL(`./models/${n}.glb`, import.meta.url).href;
  const [pump, filter, heater] = await Promise.all(['pump', 'filter', 'heater'].map(n => loader.loadAsync(url(n)).then(g => g.scene)));
  place('pump', pump, 1.25, -2.15, .25, 'x'); pump.rotation.y = 0;
  place('filter', filter, 1.55, -.45, -.1);
  place('heater', heater, 1.35, 1.55, -.15);
  // salt cell: a clear-ish cylinder with unions, on the return line
  const salt = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .62, 32), clay()); body.rotation.z = Math.PI / 2; salt.add(body);
  for (const sx of [-.36, .36]) { const u = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 32), clay()); u.rotation.z = Math.PI / 2; u.position.x = sx; salt.add(u); }
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.16, .1, .12), clay()); cap.position.y = .16; salt.add(cap);
  salt.position.set(.55, .62, .78); rig.add(salt); salt.userData.id = 'salt';
  salt.traverse(m => { if (m.isMesh) { m.castShadow = true; m.userData.id = 'salt'; } }); parts.salt = salt;
  // timer & controls: a box on a post
  const timer = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.1, .08), clay()); post.position.y = .55; timer.add(post);
  const tbox = new THREE.Mesh(new THREE.BoxGeometry(.46, .6, .18), clay()); tbox.position.set(0, 1.05, .1); timer.add(tbox);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .03, 32), clay()); dial.rotation.x = Math.PI / 2; dial.position.set(0, 1.08, .2); timer.add(dial);
  timer.position.set(2.85, 0, -.6); rig.add(timer);
  timer.traverse(m => { if (m.isMesh) { m.castShadow = true; m.userData.id = 'timer'; } }); parts.timer = timer;
  // PVC plumbing linking the pad together
  const pipeM = new THREE.MeshStandardMaterial({ color: 0xF4F1EA, roughness: .45 });
  const pipe = pts => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .02), 80, .055, 12), pipeM); m.castShadow = true; rig.add(m); };
  pipe([[-3.2, .32, .25], [-2.9, .32, .25]]);
  pipe([[-1.5, .32, .3], [-1.15, .32, .3], [-.95, .3, .45], [-.75, .25, .55]]);
  pipe([[-.2, 1.5, -.1], [.2, 1.45, .2], [.25, .62, .78]]);
  pipe([[.9, .62, .78], [1.1, .5, .7], [1.2, .3, .4]]);
  pipe([[1.9, .3, .4], [2.3, .3, .78], [3.2, .3, .9]]);
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let sel = null, rotY = 0, rotX = 0, velY = 0, dragging = false, sx = 0, sy = 0, lastT = 0, moved = 0, visible = true, raf = 0, t0 = performance.now(), idle = 0;
  const stats = { frames: 0 };
  function select(id) {
    sel = id;
    for (const [k, g] of Object.entries(parts)) g.traverse(m => { if (m.isMesh) { m.material.color.setHex(k === id ? PICK : CLAY); m.material.emissive?.setHex(k === id ? 0x0F6E8C : 0); m.material.emissiveIntensity = k === id ? .18 : 0; } });
    kick();
  }
  const anchorFor = id => { const b = new THREE.Box3().setFromObject(parts[id]), c = b.getCenter(new THREE.Vector3()); c.y = b.max.y + .12; return c; };
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const narrow = w / h < 1.1; cam.fov = narrow ? 40 : 26;
    cam.position.set(0, narrow ? 4.4 : 3.4, narrow ? 10.5 : 8.6); cam.lookAt(.15, .55, 0); cam.updateProjectionMatrix();
  }
  function draw() {
    const t = (performance.now() - t0) / 1000;
    if (!dragging) { rotY += velY; velY *= .95; if (Math.abs(velY) < .0004) velY = 0; }
    const sway = reduced || dragging || velY ? 0 : Math.sin(t * .25) * .06 * Math.min(1, (performance.now() - idle) / 4000);
    rig.rotation.y = rotY + sway; rig.rotation.x = rotX;
    renderer.render(scene, cam); stats.frames++;
    rig.updateMatrixWorld();
    for (const [id, el] of Object.entries(anchors)) {
      const v = anchorFor(id).project(cam);
      el.style.transform = `translate(${(v.x * .5 + .5) * canvas.clientWidth}px, ${(-v.y * .5 + .5) * canvas.clientHeight}px)`;
    }
  }
  function loop() { raf = 0; if (!visible || document.hidden) return; draw(); if (!reduced || velY || dragging) raf = requestAnimationFrame(loop); }
  function kick() { if (reduced) { draw(); return; } if (!raf) raf = requestAnimationFrame(loop); }
  canvas.addEventListener('pointerdown', e => { dragging = true; velY = 0; sx = e.clientX; sy = e.clientY; lastT = performance.now(); moved = 0; try { canvas.setPointerCapture(e.pointerId); } catch {} kick(); });
  addEventListener('pointermove', e => {
    if (!dragging) return; const dx = e.clientX - sx, dy = e.clientY - sy, now = performance.now(); sx = e.clientX; sy = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    rotY += dx * .011; rotX = Math.max(-.35, Math.min(.5, rotX + dy * .005)); velY = dx * .011 * Math.min(1, 16 / Math.max(1, now - lastT)) * .6; lastT = now; kick();
  });
  addEventListener('pointerup', e => {
    if (!dragging) return; dragging = false; idle = performance.now();
    if (performance.now() - lastT > 80) velY = 0;   // a held pointer doesn't throw it
    kick();
    if (moved > 6) return;
    const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, cam); const hit = ray.intersectObjects(Object.values(parts), true)[0];
    if (hit) onPick?.(hit.object.userData.id);
  });
  new ResizeObserver(() => { size(); kick(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(host);
  document.addEventListener('visibilitychange', kick);
  size(); draw(); kick();
  return { select, stats };
}
