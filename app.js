// The Pool Doctor · concept preview by Local Form. Nothing on this page sends data anywhere.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = () => innerWidth < 861;
const q = new URLSearchParams(location.search);
const picked = root => $$('button[aria-pressed=true]', root).map(b => b.dataset.v);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- reveal (PREVIEW-STANDARD) ---------- */
(() => {
  const els = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-visible')); return; }
  const n = new Map();
  els.forEach(e => { const p = e.parentElement, i = n.get(p) || 0; e.style.setProperty('--d', i * .08 + 's'); n.set(p, i + 1); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: .01, rootMargin: innerWidth > 860 ? '0px 0px -16% 0px' : '0px 0px -8% 0px' });
  els.forEach(e => io.observe(e));
  setTimeout(() => els.forEach(e => { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('is-visible'); }), 1500);
})();

/* ---------- hero: design your pool from above ---------- */
const hero = $('.hero'), cv = $('#yard'), poster = $('#poster');
poster.addEventListener('error', () => poster.remove());
const plan = { shape: 'Rectangle', len: 32, wid: 16, extras: [], finish: 'White plaster', deck: 'Pavers' };
const lenI = $('#len'), widI = $('#wid');
const fill = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
let yard = null;
function readPlan() {
  $$('#designer .chips').forEach(c => { const v = picked(c); plan[c.dataset.k] = c.hasAttribute('data-one') ? (v[0] || '') : v; });
  plan.len = +lenI.value; plan.wid = +widI.value;
}
function planText() {
  const p = plan, bits = [`${p.shape} ${p.len}×${p.wid} ft`];
  bits.push(`${p.finish} finish`, `${p.deck} deck`);
  if (p.extras.length) bits.push(p.extras.map(e => e === 'Lights' ? 'LED lighting' : e).join(', '));
  return bits.join(' · ');
}
const announce = () => { const l = $('#planLive'); if (l) l.textContent = `${$('#planDims').textContent}, ${$('#planGal').textContent}`; };
function updatePlan() {
  readPlan();
  const { shape: s, len: L, wid: W } = plan;
  const depth = s === 'Plunge' ? 4.5 : s === 'Lap' ? 4.25 : 5.25, area = s === 'Freeform' ? .8 : s === 'L-shape' ? .74 : 1;
  plan.gal = Math.round(L * W * area * depth * 7.48 / 100) * 100;
  $('#planDims').innerHTML = `<span class="pre">Concept sketch · </span>${L} × ${W} ft ${s.toLowerCase()}`;
  $('#planGal').textContent = `about ${plan.gal.toLocaleString()} gallons at ${depth} ft average depth`;
  $('#lenOut').textContent = L + ' ft'; $('#widOut').textContent = W + ' ft'; fill(lenI); fill(widI);
  $('#dimL span').textContent = L + ' ft'; $('#dimW span').textContent = W + ' ft';
  yard?.set(plan);
}
let lastShape = plan.shape;
$$('#designer .chips').forEach(c => chips(c, b => {
  if (c.dataset.k === 'shape') { const v = b.dataset.v, was = lastShape, odd = x => x === 'Plunge' || x === 'Lap'; lastShape = v;
    if (v !== was) { if (v === 'Plunge') { lenI.value = 14; widI.value = 8; } else if (v === 'Lap') { lenI.value = 45; widI.value = 9; } else if (odd(was)) { lenI.value = 32; widI.value = 16; } } }
  updatePlan(); announce();
}));
[lenI, widI].forEach(i => { i.addEventListener('input', updatePlan); i.addEventListener('change', announce); });
updatePlan();
const grip = $('#grip'), clampI = (i, v) => Math.max(+i.min, Math.min(+i.max, Math.round(v)));
grip.addEventListener('pointerdown', e => { if (!yard) return; e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add('drag'); hero.classList.add('sized'); yard.hold(true); });
grip.addEventListener('pointermove', e => {
  if (!grip.classList.contains('drag')) return;
  const r = cv.getBoundingClientRect(), [cx, cy, s] = yard.origin;
  lenI.value = clampI(lenI, 2 * (e.clientX - r.left - cx) / s); widI.value = clampI(widI, 2 * (e.clientY - r.top - cy) / s); updatePlan();
});
const gripUp = () => { if (!grip.classList.contains('drag')) return; grip.classList.remove('drag'); yard.hold(false); announce(); };
grip.addEventListener('pointerup', gripUp); grip.addEventListener('pointercancel', gripUp);
grip.addEventListener('keydown', e => {
  const k = e.key, dl = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dw = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
  if (!dl && !dw) return; e.preventDefault(); lenI.value = clampI(lenI, +lenI.value + dl); widI.value = clampI(widI, +widI.value + dw); updatePlan(); announce();
});
$('#heroSend').addEventListener('click', () => { readPlan(); openRequest('New pool', { kind: 'plan', text: planText() }); });
// phones: the three services come first; the planner opens from "Design my pool" and the sketch stays pinned above the controls
function openPlanner() {
  if (phone()) { hero.classList.add('planning'); $('#svcPlan').setAttribute('aria-expanded', 'true'); }
  hero.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => $('#designer button').focus({ preventScroll: true }), reduced ? 0 : 500);
}
$('#svcPlan').addEventListener('click', openPlanner);
$('#planDone').addEventListener('click', () => { hero.classList.remove('planning'); $('#svcPlan').setAttribute('aria-expanded', 'false'); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); $('#svcPlan').focus({ preventScroll: true }); });
$$('a[href="#design"]:not(#dockMain)').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPlanner(); }));
import('./yard.js?v=7').then(({ mountYard }) => {
  const copy = $('.hero-copy');
  yard = mountYard(cv, { dpr: phone() ? 1.5 : 1.25, reduced, still: q.has('still'), labels: { L: $('#dimL'), W: $('#dimW') }, grip: $('#grip'),
    pad: phone() ? [18, 30] : [34, 30],
    area: () => { const r = cv.getBoundingClientRect(); if (phone()) return { x: 0, y: 64, w: r.width, h: r.height - 72 };
      const left = copy.getBoundingClientRect().right + 24; return { x: left, y: 80, w: r.width - left - 32, h: r.height - 110 }; } });
  yard.set(plan);
  new IntersectionObserver(([e]) => yard.setVisible(e.isIntersecting)).observe(cv);
  yard.ready.then(() => { if (q.has('still')) yard.still(plan); hero.classList.add('live'); window.__done = true; });
  window.__yard = yard;
}).catch(e => { console.warn('yard', e); hero.classList.add('no3d'); window.__done = true; });

/* ---------- 01 build story (Joe's own show pool, from his Instagram) ---------- */
const story = [
  ['b1-stakes', 'Layout', 'The lawn marked out with stakes and string. The shape, the steps and where the equipment goes all get settled here, before a shovel moves.', 'The backyard lawn marked out with wooden stakes'],
  ['b2-forms', 'Forms', 'Wood forms set the exact edge and height of the pool, so the finished deck sits level with the yard.', 'Wooden forms framing the outline of the pool in the yard'],
  ['b3-dig', 'Dig', 'The excavator digs to the planned depths: the shallow end, the steps and the deep end.', 'An excavator digging the pool hole'],
  ['b4-steel', 'Steel', 'A cage of rebar ties the whole shell together. This is the part you never see again, so it has to be right.', 'Rebar steel tied in a grid across the dug pool'],
  ['b5-gunite', 'Gunite', 'The crew sprays concrete over the steel to form the shell: walls, floor, steps and benches in one piece.', 'The crew spraying gunite concrete over the steel'],
  ['b6-plumbing', 'Plumbing', 'The pipes for the returns, drains and skimmers run back to the equipment pad, ready for the pump and filter.', 'Pool plumbing pipes laid in a trench'],
  ['b7-finished', 'Finished', 'Coping, decking, water and lights: what the yard turns into.', 'The finished pool at dusk with lights on'],
];
let si = 0;
const sImg = $('#storyImg');
// load a step's photo at the size this screen uses (the same srcset and sizes as the <img>)
const pre = i => { const f = story[i][0], im = new Image(); im.sizes = sImg.sizes; im.srcset = `img/${f}-sm.webp 600w, img/${f}-lg.webp 1000w`; im.src = `img/${f}-lg.webp`; return im; };
function setStory(i, dir = 0) {
  si = (i + story.length) % story.length; const [f, t, b, alt] = story[si];
  $$('#storySteps button, #storyThumbs button').forEach(e => e.setAttribute('aria-pressed', +e.dataset.i === si));
  $('#storyTitle').textContent = t; $('#storyBody').textContent = b; $('#storyCount').textContent = String(si + 1).padStart(2, '0') + ' / 07';
  sImg.classList.add('swap');
  const want = si, im = pre(si);
  const go = () => { if (want !== si) return; sImg.srcset = im.srcset; sImg.src = im.src; sImg.alt = alt; sImg.classList.remove('swap');
    if (dir && !reduced) { sImg.style.transition = 'none'; sImg.style.transform = `translateX(${dir * 36}px)`; sImg.style.opacity = 0; void sImg.offsetWidth; sImg.style.transition = ''; }
    sImg.style.transform = ''; sImg.style.opacity = ''; };
  im.decode ? im.decode().then(go, go) : go();
  if (si + 1 < story.length) pre(si + 1);
}
$('#storyBody').textContent = story[0][2];
// desktop: a strip of the seven photos to jump between steps (phones swipe instead)
if (!phone()) { $('#storyThumbs').innerHTML = story.map(([f, t], i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}" aria-label="Step ${i + 1}: ${t}"><img src="img/${f}-sm.webp" alt="" loading="lazy" width="600" height="600"></button>`).join('');
  $$('#storyThumbs button').forEach(b => b.addEventListener('click', () => setStory(+b.dataset.i, +b.dataset.i > si ? 1 : -1))); }
$$('#storySteps button').forEach(b => b.addEventListener('click', () => setStory(+b.dataset.i)));
$('#storyPrev').addEventListener('click', () => setStory(si - 1, -1));
$('#storyNext').addEventListener('click', () => setStory(si + 1, 1));
// swipe the photo: it follows the finger sideways, then the next step slides in. Up-and-down still scrolls the page.
{ const m = $('.story-media'); let x0 = 0, y0 = 0, dx = 0, axis = '', on = false;
  m.addEventListener('touchstart', e => { if (e.touches.length !== 1) { if (on) { on = false; sImg.style.transition = ''; sImg.style.transform = ''; sImg.style.opacity = ''; } return; } on = true; axis = ''; dx = 0; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; sImg.style.transition = 'none'; }, { passive: true });
  m.addEventListener('touchmove', e => { if (!on || e.touches.length > 1) return; const t = e.touches[0]; dx = t.clientX - x0; const dy = t.clientY - y0;
    if (!axis && Math.abs(dx) + Math.abs(dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axis === 'x') { sImg.style.transform = `translateX(${dx * .9}px)`; sImg.style.opacity = Math.max(.35, 1 - Math.abs(dx) / 420); } }, { passive: true });
  const end = () => { if (!on) return; on = false; sImg.style.transition = '';
    if (axis === 'x' && Math.abs(dx) > 48 && si + (dx < 0 ? 1 : -1) >= 0 && si + (dx < 0 ? 1 : -1) < story.length) { const d = dx < 0 ? 1 : -1; sImg.style.transform = `translateX(${-d * 70}px)`; sImg.style.opacity = 0; m.classList.add('swiped'); setStory(si + d, d); }
    else { sImg.style.transform = ''; sImg.style.opacity = ''; } };
  m.addEventListener('touchend', end); m.addEventListener('touchcancel', end); }
// fetch the next photo only once the story is close to the screen
{ const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); pre(1); } }, { rootMargin: '600px 0px' }); o.observe($('#build')); }

/* ---------- chips ---------- */
function chips(root, onChange) {
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (root.hasAttribute('data-one')) $$('button', root).forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', root.hasAttribute('data-one') && !root.closest('#req') ? 'true' : on);
    onChange?.(b);
  });
}


/* ---------- 04 clinic: symptoms + 3D equipment pad ---------- */
const PARTS = {
  pump: ['Pump', 'Pulls water from the pool and pushes it through everything else. When it fails, nothing else on the pad works.', 'Common trouble: a failed start capacitor (it hums but won\'t spin), worn bearings (screeching), a leaking shaft seal, or a clogged impeller.'],
  filter: ['Filter', 'Catches what the skimmer and drains pull in. The gauge on top tells you how hard it\'s working.', 'Common trouble: pressure climbing because the media needs cleaning, cracked laterals sending sand back to the pool, or a stuck valve.'],
  salt: ['Salt cell', 'Turns salt in the water into chlorine as the water passes through.', 'Common trouble: scale on the plates, low salt, a flow switch that thinks nothing is moving, or a cell at the end of its life.'],
  heater: ['Heater', 'Warms the water on the way back to the pool. Needs good flow, gas or power, and a clean start.', 'Common trouble: a pressure switch that trips on low flow, a dirty igniter or sensor, or a gas supply problem.'],
  panel: ['Automation', 'The controls: timers, relays, lights and the remote app on newer systems.', 'Common trouble: a tripped breaker, a burned relay, a lost connection, or a light circuit tripping the GFCI.'],
  plumbing: ['Plumbing & valves', 'The pipes and valves between the pool and the pad, and the ones under the deck.', 'Common trouble: an air leak on the suction side (bubbles in the pump), a cracked fitting, a valve in the wrong position, or a leak under the deck.'],
};
const SYM = [
  { part: 'pump', t: 'Hums but won\'t start', c: ['<b>Start capacitor</b> has failed (very common, quick fix)', '<b>Impeller jammed</b> by debris', '<b>Motor</b> seized or burned out'] },
  { part: 'pump', t: 'Loud or screeching', c: ['<b>Motor bearings</b> wearing out', '<b>Starving for water</b>: low pool level or a clogged basket'] },
  { part: 'pump', t: 'Bubbles in the pump basket', c: ['<b>Air leak on the suction side</b>: lid O-ring, union or fitting', '<b>Water level</b> below the skimmer'] },
  { part: 'pump', t: 'Weak returns, low flow', c: ['<b>Clogged pump basket or impeller</b>', '<b>Dirty filter</b> or a valve half closed'] },
  { part: 'filter', t: 'Pressure gauge is high', c: ['<b>Filter needs cleaning</b> or new media', '<b>Return line restricted</b> or a valve closed'] },
  { part: 'filter', t: 'Water won\'t clear', c: ['<b>Filter not doing its job</b>: worn media or broken laterals', '<b>Not enough chlorine</b>: salt cell down or run time too short'] },
  { part: 'heater', t: 'Won\'t fire', c: ['<b>Low flow</b> tripping the pressure switch', '<b>Igniter or flame sensor</b> dirty or failed', '<b>Gas supply</b> or a tripped breaker'], warn: 'Smell gas? Turn the heater off, stay away from it and call your gas company first.' },
  { part: 'heater', t: 'Starts, then shuts off', c: ['<b>Flow drops</b> and the pressure switch cuts it out', '<b>Flame sensor</b> dirty', '<b>High-limit switch</b> tripping'], warn: 'Smell gas? Turn the heater off, stay away from it and call your gas company first.' },
  { part: 'salt', t: 'Says "check cell"', c: ['<b>Scale</b> on the cell plates', '<b>Salt level</b> low or the reading is off', '<b>Flow switch</b> not seeing flow'] },
  { part: 'salt', t: 'Chlorine stays low', c: ['<b>Cell scaled</b> or near the end of its life', '<b>Salt level</b> low', '<b>Run time</b> or output set too low'] },
  { part: 'panel', t: 'Timer or app not working', c: ['<b>Tripped breaker</b> or blown fuse', '<b>Relay or board</b> failed', '<b>Lost connection</b> to the app or remote'] },
  { part: 'panel', t: 'Pool light out or tripping power', c: ['<b>Bulb or fixture</b> failed', '<b>Water in the light</b> tripping the GFCI'], warn: 'If a pool light trips the power, keep everyone out of the water and leave the breaker off until it\'s checked.' },
  { part: 'plumbing', t: 'Water leaking at the equipment', c: ['<b>Pump shaft seal</b> leaking under the motor', '<b>Cracked union or fitting</b> on the pad'] },
  { part: 'plumbing', t: 'Pool keeps losing water', c: ['<b>Leak in the plumbing</b> or at the equipment', '<b>Leak in the shell</b>, a fitting or a light niche', 'Tip: a bucket test tells evaporation from a leak'] },
];
const symBox = $('#sym'), box = $('#report');
let pad = null, padPending = null, running = false, curPart = 'pump';
const partBtns = $$('#parts button');
function showPart(id, from3d) {
  if (!PARTS[id]) return; curPart = id;
  partBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.p === id));
  $('#partLine').textContent = PARTS[id][1];
  symBox.innerHTML = SYM.map((x, i) => x.part === id ? `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-i="${i}">${esc(x.t)}</button>` : '').join('');
  const f0 = $('button', symBox); if (f0) f0.tabIndex = 0;
  box.hidden = true; box.innerHTML = '';
  pad ? pad.select(id) : (padPending = id);
}
partBtns.forEach(b => b.addEventListener('click', () => showPart(b.dataset.p)));
symBox.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', symBox).forEach(x => { x.setAttribute('aria-checked', x === b); x.tabIndex = x === b ? 0 : -1; });
  const x = SYM[+b.dataset.i], label = `${PARTS[x.part][0]}: ${x.t}`;
  pad ? pad.flag(x.part) : (padPending = x.part);
  const sms = encodeURIComponent(`Hi Joe, pool problem: ${label}. Photo attached.`);
  box.innerHTML = `<h3>Usual causes</h3><ul>${x.c.map(c => `<li>${c}</li>`).join('')}</ul>
    ${x.warn ? `<p class="warn">${esc(x.warn)}</p>` : ''}
    <div class="cta"><a class="btn btn-p" href="tel:+18437373165">Call Joe</a><a class="btn btn-s" href="sms:+18437373165?&body=${sms}">Text a photo</a><button type="button" class="btn btn-s" id="repReq">Request a repair</button></div>
    <p class="fine">General guide only. What's wrong gets confirmed before anything is replaced.</p>`;
  box.hidden = false;
  $('#repReq').addEventListener('click', () => openRequest('Repair', { kind: 'sym', text: label }));
  if (phone()) box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
});
symBox.addEventListener('keydown', e => {
  const bs = $$('button', symBox), i = bs.indexOf(document.activeElement); if (i < 0) return;
  const k = e.key, n = k === 'ArrowDown' || k === 'ArrowRight' ? i + 1 : k === 'ArrowUp' || k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? bs.length - 1 : null;
  if (n === null) return; e.preventDefault(); const t = bs[(n + bs.length) % bs.length]; t.focus(); t.click();
});
showPart('pump');

// pool care key
const GAUGE = [
  ['Free chlorine', '1–3 ppm', 0, 6, 1, 3, 'Test twice a week; more in summer heat.'],
  ['pH', '7.4–7.6', 6.8, 8.2, 7.4, 7.6, 'Off-balance pH burns eyes and eats equipment.'],
  ['Total alkalinity', '80–120 ppm', 0, 200, 80, 120, 'Keeps pH from bouncing around.'],
  ['Calcium hardness', '200–400 ppm', 0, 600, 200, 400, 'Too low etches plaster, too high scales it.'],
  ['Stabilizer (CYA)', '30–50 ppm', 0, 120, 30, 50, 'Shields chlorine from the sun. Salt pools often run a little higher.'],
  ['Salt (salt pools)', 'per your cell', 2000, 4500, 2700, 3400, 'Most cells want about 3,200 ppm. Check its label.'],
];
$('#gauges').innerHTML = GAUGE.map(([n, t, lo, hi, a, b, s]) => `<li><b>${n}</b><em>${t}</em><span class="bar" aria-hidden="true"><i style="--l:${(a - lo) / (hi - lo) * 100}%;--w:${(b - a) / (hi - lo) * 100}%"></i></span><small>${s}</small></li>`).join('');
const CARE = {
  'New pool': ['The usual rules for fresh plaster in the first month. Ask if yours needs something else.', [
    '<b>Brush the whole pool twice a day</b> for the first two weeks to clear plaster dust',
    '<b>Run the pump around the clock</b> for the first few days',
    '<b>Test and balance every day</b> the first week, starting from your startup numbers',
    '<b>No automatic cleaner</b> for the first two weeks while the plaster hardens',
    '<b>Hold off on the heater</b> for about two weeks',
    '<b>Wait about a month before adding salt</b> on a salt pool',
  ]],
  Weekly: ['About 30 minutes a week keeps most problems away.', [
    '<b>Test chlorine and pH</b> twice a week and adjust',
    '<b>Empty the skimmer and pump baskets</b>',
    '<b>Skim, brush</b> walls and steps, and <b>vacuum</b> or run the cleaner',
    '<b>Check the water level</b>: halfway up the skimmer opening',
    '<b>Glance at the filter gauge</b> and note the pressure',
  ]],
  Monthly: ['A quick once-over of the water and the equipment.', [
    '<b>Test alkalinity, calcium and stabilizer</b>',
    '<b>Clean the filter</b> when the gauge reads 8–10 psi above its clean reading: hose the cartridge, or backwash sand and DE',
    '<b>Check the salt level</b> and look at the salt cell for white scale',
    '<b>Check the pump lid O-ring</b> and keep it lubed with pool silicone',
    '<b>Set run times</b> for the season on the timer or app',
  ]],
  Quarterly: ['A deeper check, ideally with the seasons.', [
    '<b>Deep-clean the filter</b>: soak cartridges in filter cleaner, or check the sand or DE',
    '<b>Clean the salt cell</b> if it\'s scaled, following its maker\'s steps',
    '<b>Walk the equipment pad</b>: drips, cracks, a noisy pump',
    '<b>Test the pool light\'s GFCI</b> with its test button',
    '<b>Before a cold snap</b>, make sure freeze protection is on',
  ]],
};
const when = $('#when'), todo = $('#todo');
when.innerHTML = Object.keys(CARE).map((k, i) => `<button type="button" role="tab" aria-selected="${i === 1}" data-k="${k}">${k}</button>`).join('');
function showCare(k) {
  $$('button', when).forEach(b => { b.setAttribute('aria-selected', b.dataset.k === k); b.tabIndex = b.dataset.k === k ? 0 : -1; });
  const [intro, list] = CARE[k];
  todo.style.animation = 'none'; void todo.offsetWidth; todo.style.animation = '';
  todo.innerHTML = `<p class="intro">${intro}</p>` + list.map(t => `<label><input type="checkbox"><span>${t}</span></label>`).join('');
}
when.addEventListener('click', e => { const b = e.target.closest('button'); if (b) showCare(b.dataset.k); });
when.addEventListener('keydown', e => {
  const bs = $$('button', when), i = bs.indexOf(document.activeElement), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!d || i < 0) return; e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); showCare(n.dataset.k);
});
showCare('Weekly');

$('#runBtn').addEventListener('click', e => { running = !running; e.currentTarget.setAttribute('aria-pressed', running); pad?.setRun(running); });
const padBox = $('.padbox');
const padIO = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return; padIO.disconnect();
  import('./pad3d.js?v=5').then(m => m.mountPad($('#padCanvas'), { onPick: id => showPart(id, true), reduced })).then(p => {
    pad = p; $('#padNote').textContent = phone() ? 'Drag · pinch · tap a part' : 'Drag to turn · tap a part';
    const pz = $('#padZoom'); pz.hidden = false; pz.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pad.zoomBy(+b.dataset.z); });
    if (running) pad.setRun(true);
    if (padPending) pad.select(padPending);
  }).catch(err => { console.error('pad', err?.stack || err); $('#padNote').textContent = '3D view not available on this device. The part buttons still work.'; $('#padCanvas').style.display = 'none'; $('#runBtn').hidden = true; });
}, { rootMargin: '400px 0px' });
padIO.observe(padBox);

/* ---------- request (preview: builds a summary on this screen and sends nothing) ----------
   One way in: openRequest(type, carry). Photo limit: MAX_PHOTOS images, kept in memory on this device only.
   Before a real launch: wire delivery and confirm a test request arrives with contact details, service, plan or symptom, and photos. */
const reqForm = $('#req'), tabs = $$('#reqType button'), carry = $('#carry'), MAX_PHOTOS = 6;
let reqType = 'New pool', carried = null, photos = [];
const detailLabels = { 'New pool': 'Anything to know about your yard or the pool you want?', Renovation: 'What would you like redone? (plaster, liner, coping, deck…)', Repair: 'What\'s happening, and when did it start?', 'Contractor help': 'Your company, the job address area and what the build needs' };
const applies = () => !!carried && ((carried.kind === 'plan' && reqType === 'New pool') || (carried.kind === 'sym' && reqType === 'Repair'));
function setType(t) {
  reqType = t; tabs.forEach(b => { const on = b.dataset.v === t; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  $('#fDetailL').textContent = detailLabels[t]; $('#poolMore').hidden = t !== 'New pool'; $('#urgWrap').hidden = t !== 'Repair';
  drawCarry();
}
function drawCarry() {
  const on = applies(); carry.hidden = !on; if (!on) return;
  carry.innerHTML = `<span><b>${carried.kind === 'plan' ? 'Your plan' : 'What you\'re seeing'}:</b> ${esc(carried.text)}</span><button type="button" id="dropCarry">Remove</button>`;
  $('#dropCarry').addEventListener('click', () => { carried = null; drawCarry(); $('#reqType button[aria-checked=true]')?.focus(); });
}
tabs.forEach((b, i) => {
  b.addEventListener('click', () => setType(b.dataset.v));
  b.addEventListener('keydown', e => { const k = e.key, n = k === 'ArrowRight' || k === 'ArrowDown' ? i + 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : null;
    if (n === null) return; e.preventDefault(); const t = tabs[(n + tabs.length) % tabs.length]; t.focus(); setType(t.dataset.v); });
});
function showForm() { reqForm.hidden = false; $('#done').hidden = true; }
function openRequest(type, c) {
  if (c !== undefined) carried = c;                       // a new plan or symptom replaces the old one; a plain CTA keeps what's there
  setType(type); showForm();
  $('#request').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => (phone() ? $('#req-h') : $('#fName')).focus({ preventScroll: true }), reduced ? 0 : 700);
}
$$('[data-req]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openRequest(a.dataset.req); }));
$$('a[href="#request"]:not([data-req])').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openRequest(reqType); }));
chips($('#fWhen')); chips($('#fBudget')); chips($('#fStart')); chips($('#fUrgent'));
// photos: images only, first MAX_PHOTOS, never uploaded
const thumbs = $('#thumbs'), photoNote = $('#photoNote');
function drawPhotos() { $$('img', thumbs).forEach(i => URL.revokeObjectURL(i.src)); thumbs.innerHTML = '';
  photos.forEach((f, i) => { const w = document.createElement('span'); w.className = 'ph'; const im = new Image(); im.alt = 'Your photo: ' + f.name; im.src = URL.createObjectURL(f);
    const x = document.createElement('button'); x.type = 'button'; x.className = 'phx'; x.setAttribute('aria-label', 'Remove ' + f.name); x.textContent = '×';
    x.addEventListener('click', () => { photos.splice(i, 1); drawPhotos(); photoNote.textContent = ''; ($('.phx', thumbs) || $('#fPhotos')).focus(); });
    w.append(im, x); thumbs.append(w); }); }
$('#fPhotos').addEventListener('change', e => {
  const all = [...e.target.files]; e.target.value = ''; if (!all.length) return;
  const imgs = all.filter(f => /^image\//.test(f.type)), skipped = all.length - imgs.length, over = Math.max(0, photos.length + imgs.length - MAX_PHOTOS);
  photos = [...photos, ...imgs].slice(0, MAX_PHOTOS); drawPhotos();
  photoNote.textContent = [over && `That's the limit of ${MAX_PHOTOS} photos, so ${over} ${over > 1 ? 'were' : 'was'} left out.`, skipped && `Skipped ${skipped} file${skipped > 1 ? 's' : ''} that ${skipped > 1 ? 'aren\'t photos' : 'isn\'t a photo'}.`].filter(Boolean).join(' ');
});
// validation: each error sits under its own field and is tied to it for screen readers
function setErr(input, msg) {
  let e = $('#' + input.id + 'Err'); if (!e) { e = document.createElement('p'); e.className = 'err'; e.id = input.id + 'Err'; input.after(e); }
  e.textContent = msg || ''; input.setAttribute('aria-invalid', !!msg);   // the message sits inside the field's label, so it's read with it
}
const phoneOk = v => { const d = v.replace(/\D/g, ''); return /^[\d\s().+-]+$/.test(v.trim()) && (d.length === 10 || (d.length === 11 && d[0] === '1')); };   // (843) 555-0123, 843.555.0123, +1 843 555 0123
const emailOk = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
['fName', 'fPhone', 'fEmail'].forEach(id => $('#' + id).addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') setErr(e.target, ''); }));
reqForm.addEventListener('submit', e => {
  e.preventDefault();
  const nameI = $('#fName'), phI = $('#fPhone'), emI = $('#fEmail'), name = nameI.value.trim(), ph = phI.value.trim(), em = emI.value.trim();
  setErr(nameI, name ? '' : 'Add your name so you get a call back.');
  setErr(phI, phoneOk(ph) ? '' : ph ? 'That number doesn\'t look right. Use a 10-digit US number, like (843) 555-0123.' : 'Add a mobile number for a call or text back.');
  setErr(emI, emailOk(em) ? '' : 'That email doesn\'t look right. Fix it or leave it empty.');
  const bad = [nameI, phI, emI].find(i => i.getAttribute('aria-invalid') === 'true');
  if (bad) { bad.focus({ preventScroll: true }); bad.closest('label').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return; }
  const pool = reqType === 'New pool';
  const rows = [['Request', reqType], applies() && [carried.kind === 'plan' ? 'Plan' : 'Seeing', carried.text], reqType === 'Repair' && picked($('#fUrgent')).length && ['How urgent', picked($('#fUrgent'))[0]], ['Name', name], ['Mobile', ph],
    em && ['Email', em], $('#fTown').value && ['Town', $('#fTown').value], $('#fDetail').value.trim() && ['Details', $('#fDetail').value.trim()],
    photos.length && ['Photos', `${photos.length} selected, kept on this device`], picked($('#fWhen')).length && ['Best time', picked($('#fWhen'))[0]],
    pool && picked($('#fBudget')).length && ['Budget', picked($('#fBudget'))[0]], pool && picked($('#fStart')).length && ['When', picked($('#fStart'))[0]]].filter(Boolean);
  $('#doneTitle').textContent = `Thanks, ${name.split(' ')[0]}. Here's the summary this preview built.`;
  $('#doneBody').innerHTML = `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` + (photos.length ? `<div class="thumbs">${$$('img', thumbs).map(i => `<img src="${i.src}" alt="${esc(i.alt)}">`).join('')}</div>` : '');
  reqForm.hidden = true; $('#done').hidden = false; $('#done').focus();
});
$('#editReq').addEventListener('click', () => { showForm(); $('#fName').focus(); });
$('#again').addEventListener('click', () => {
  reqForm.reset(); photos = []; drawPhotos(); photoNote.textContent = ''; ['fName', 'fPhone', 'fEmail'].forEach(id => setErr($('#' + id), ''));
  $$('#fWhen button, #fBudget button, #fStart button, #fUrgent button').forEach(b => b.setAttribute('aria-pressed', 'false')); carried = null; setType('New pool'); showForm(); $('#fName').focus();
});
setType('New pool');

/* ---------- phone dock ---------- */
const dock = $('#dock'); let inHero = true, inReq = false;
let inChk = false; const dockSet = () => { const on = !inHero && !inReq && !inChk; if (!on && dock.contains(document.activeElement)) $('.brand').focus({ preventScroll: true }); dock.classList.toggle('on', on); dock.inert = !on; };
const dockMain = $('#dockMain'), DOCK = { plan: 'Design my pool', reno: 'Quote my renovation', repair: 'Request a repair' }; let dockMode = 'plan';
const setDock = m => { if (m !== dockMode) { dockMode = m; dockMain.textContent = DOCK[m]; } };
const dockIO = new IntersectionObserver(es => es.forEach(e => { const m = e.target.id === 'repair' ? 'repair' : 'reno'; if (e.isIntersecting) setDock(m); else if (dockMode === m) setDock('plan'); }), { rootMargin: '-40% 0px -40% 0px' });
dockIO.observe($('#renovate')); dockIO.observe($('#repair'));
dockMain.addEventListener('click', e => { e.preventDefault(); dockMode === 'repair' ? openRequest('Repair') : dockMode === 'reno' ? openRequest('Renovation') : openPlanner(); });
dock.inert = true;
new IntersectionObserver(([e]) => { inHero = e.isIntersecting; dockSet(); }).observe(hero);
new IntersectionObserver(([e]) => { inReq = e.isIntersecting; dockSet(); }, { threshold: .05 }).observe($('#request'));
// the repair checker has its own buttons, so the bar steps aside while its controls are on screen
new IntersectionObserver(([e]) => { inChk = e.isIntersecting; dockSet(); }, { rootMargin: '-12% 0px -12% 0px' }).observe($('.checker'));

// back to top
{ const t = $('#totop'), hh = () => ($('.hero')?.offsetHeight || innerHeight) * .8;
  addEventListener('scroll', () => t.classList.toggle('on', scrollY > hh()), { passive: true });
  const up = e => { e.preventDefault(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname + location.search); $('.brand').focus({ preventScroll: true }); };
  t.addEventListener('click', up); $('#dockTop').addEventListener('click', up); }

// live heartbeat-to-wave line on every section seam. One motif: a crisp heartbeat enters at one end,
// travels along the seam, and as it goes its spike widens and settles into a rolling swell. Baseline = the seam itself.
{ const G = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const AG = (d, sb, sf) => { const s = d < 0 ? sb : sf; return Math.exp(-(d * d) / (2 * s * s)); };   // crest with a gentle back and a steeper front
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const ss = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const mix = (a, b, t) => a + (b - a) * t;
  // the line's height at travel position s (px), given the beats on it right now
  const trace = (s, w, beats, it, tt, L) => {
    let v = 0;
    for (const b of beats) { const r = b.r, sR = mix(.016, .2, r) * L, sb = sR * mix(1, 1.5, r), d = s - b.x;
      if (d < -Math.max(.5 * L, 4.5 * sb) || d > .6 * L) continue;
      const e = (1 - r) * (1 - r);   // the small P, Q, S and T bumps melt away first, so the spike becomes one clean crest
      v += b.g * (1 + .45 * it.K * (1 - r)) * (mix(.95, .5, r) * AG(d, sb, sR * mix(1, .6, r))
        + e * (.12 * G(d, -.2 * L, .045 * L) - .16 * G(d, -.04 * L, .014 * L) - .3 * G(d, .045 * L, .016 * L) + .24 * G(d, .26 * L, .06 * L))); }
    const m = ss(it.a, it.a + .4, s / w);   // the swell underneath grows in as the beats turn to water, rolling the same way
    if (m > 0) v += m * (.09 * Math.sin(s * .042 - tt * 3.4 + it.seed) + .05 * Math.sin(s * .067 - tt * 4.1 + it.seed * 2.3));
    return v;
  };
  const items = $$('.pulse').map((el, i) => { const cv = document.createElement('canvas'); el.append(cv); el.classList.add('live');
    return { el, cv, ctx: cv.getContext('2d'), on: false, seed: i * 17.37 + 3, off: 2.3 + hash(i * 3.3 + 1) * 7, flip: i % 2 === 1, a: .2 + .16 * hash(i * 5.7 + 1), w: 0, h: 0, sec: el.parentElement }; });
  // the colour a section shows along one of its edges, so humps and dips can be filled with the right side's colour
  const mixc = t => { t = Math.max(0, Math.min(1, t)); return `rgb(${Math.round(29 + (15 - 29) * t)},${Math.round(93 + (58 - 93) * t)},${Math.round(181 + (117 - 181) * t)})`; };
  const edge = (sec, bottom, ctx, w) => {
    if (!sec || sec.classList.contains('hero')) return null;
    if (sec.classList.contains('builders')) { const H = sec.offsetHeight, L = w * .866 + H * .5, at = x => ((x - w / 2) * .866 + (bottom ? H / 2 : -H / 2) * .5) / L + .5;
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, mixc(at(0))); g.addColorStop(1, mixc(at(w))); return g; }
    return getComputedStyle(sec).backgroundColor;
  };
  const fit = it => { const d = Math.min(2, devicePixelRatio || 1), w = it.el.clientWidth, h = it.el.clientHeight; it.w = w; it.h = h; it.cv.width = Math.round(w * d); it.cv.height = Math.round(h * d); it.ctx.setTransform(d, 0, 0, d, 0, 0); let pv = it.sec.previousElementSibling; while (pv && !pv.offsetHeight) pv = pv.previousElementSibling; it.up = edge(pv, true, it.ctx, w); it.dn = edge(it.sec, false, it.ctx, w); it.one = !it.up; if (it.up === it.dn) it.up = it.dn = null; };
  const draw = (it, t) => {
    const { ctx, w, h } = it, mid = h / 2, ph = w < 861, amp = h * (it.one ? (ph ? .175 : .275) : (ph ? .35 : .336)),   // canvas is taller than the line needs, so a full beat never clips
     
      V = ph ? 62 : 118, T = ph ? 1.75 : 1.2, L = ph ? 92 : 112, tt = t + it.off;   // phones: slower travel, wider spacing
    // beats on the line now: one born about every T seconds just off the start, moving at V px/s
    const beats = [], life = (w + 2 * L) / V;
    let lb = -1e9;
    for (let k = Math.floor((tt - life) / T) - 1; k <= Math.floor(tt / T) + 1; k++) { const bt = (k + (hash(k * 1.7 + it.seed) - .5) * .3) * T, x = -L + V * (tt - bt);
      if (bt <= tt && bt > lb) lb = bt;
      if (x > -L && x < w + L) beats.push({ x, g: .82 + .18 * hash(k * 2.9 + it.seed), r: ss(it.a, it.a + .4, x / w) }); }
    // the heart itself: every time a new beat enters, the spikes still on the monitor jump (lub), then a softer second jump (dub), then rest.
    // The gaps wander a little, like a real resting pulse. Phones beat softer.
    const tb = tt - lb, K = (Math.exp(-tb * 10) + (tb > .22 ? .5 * Math.exp(-(tb - .22) * 12) : 0)) * (ph ? .5 : 1); it.K = K;
    ctx.clearRect(0, 0, w, h);
    const line = new Path2D(), bDn = new Path2D(), bUp = new Path2D(), O = 2; bDn.moveTo(-4, mid + O); bUp.moveTo(-4, mid - O);
    for (let x = -4; x <= w + 4; x += 1) { let v = trace(it.flip ? w - x : x, w, beats, it, tt, L); if (it.one) v = Math.max(v, 0); const y = mid - v * amp;
      x > -4 ? line.lineTo(x, y) : line.moveTo(x, y); bDn.lineTo(x, y); bUp.lineTo(x, y); }
    bDn.lineTo(w + 4, mid + O); bDn.closePath(); bUp.lineTo(w + 4, mid - O); bUp.closePath();
    // the trace IS the edge: lower section's colour fills what rises above the seam, upper section's fills what dips below
    if (it.dn && it.up) { ctx.fillStyle = it.up; ctx.fillRect(0, mid - O, w, O); ctx.fillStyle = it.dn; ctx.fillRect(0, mid, w, O); }   // seal the seam itself
    if (it.dn) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, mid + O); ctx.clip(); ctx.fillStyle = it.dn; ctx.fill(bDn); ctx.restore(); }
    if (it.up) { ctx.save(); ctx.beginPath(); ctx.rect(0, mid - O, w, h - mid + O); ctx.clip(); ctx.fillStyle = it.up; ctx.fill(bUp); ctx.restore(); }
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(93,182,230,.2)'; ctx.lineWidth = ph ? 4 : 5; ctx.stroke(line);
    ctx.strokeStyle = '#7cc9f2'; ctx.lineWidth = ph ? 1.8 : 2; ctx.stroke(line);
    if (K > .02) {   // each beat flashes the heartbeat end of the line, fading out where it turns to water
      const e0 = it.flip ? w : 0, e1 = it.flip ? w - (it.a + .25) * w : (it.a + .25) * w, g = ctx.createLinearGradient(e0, 0, e1, 0);
      g.addColorStop(0, `rgba(160,220,255,${(.55 * K).toFixed(3)})`); g.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = ph ? 5 : 7; ctx.stroke(line); }
  };
  let raf = 0; const t0 = performance.now();
  const loop = () => { raf = 0; const t = (performance.now() - t0) / 1000; let any = false; for (const it of items) if (it.on) { draw(it, t); any = true; } if (any && !reduced && !document.hidden) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const io = new IntersectionObserver(es => { es.forEach(e => { const it = items.find(i => i.el === e.target); it.on = e.isIntersecting; if (it.on && it.stale) { it.stale = false; fit(it); } }); kick(); }, { rootMargin: '80px' });
  items.forEach(it => { fit(it); draw(it, 0); io.observe(it.el); });
  let lw = innerWidth, rz = 0;
  addEventListener('resize', () => { if (innerWidth === lw || rz) return; rz = requestAnimationFrame(() => { rz = 0; lw = innerWidth;
    items.forEach(it => { if (it.on) { fit(it); draw(it, (performance.now() - t0) / 1000); } else it.stale = true; }); kick(); }); });
  document.addEventListener('visibilitychange', kick);
}
