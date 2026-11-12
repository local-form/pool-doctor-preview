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
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: .01, rootMargin: '0px 0px -8% 0px' });
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
function updatePlan() {
  readPlan();
  const { shape: s, len: L, wid: W } = plan;
  const depth = s === 'Plunge' ? 4.5 : s === 'Lap' ? 4.25 : 5.25, area = s === 'Freeform' ? .8 : s === 'L-shape' ? .74 : 1;
  plan.gal = Math.round(L * W * area * depth * 7.48 / 100) * 100;
  $('#planDims').textContent = `Concept sketch · ${L} × ${W} ft ${s.toLowerCase()}`;
  $('#planGal').textContent = `about ${plan.gal.toLocaleString()} gallons at ${depth} ft average depth`;
  $('#lenOut').textContent = L + ' ft'; $('#widOut').textContent = W + ' ft'; fill(lenI); fill(widI);
  $('#dimL span').textContent = L + ' ft'; $('#dimW span').textContent = W + ' ft';
  yard?.set(plan);
}
$$('#designer .chips').forEach(c => chips(c, b => {
  if (c.dataset.k === 'shape') { const v = b.dataset.v; if (v === 'Plunge') { lenI.value = 14; widI.value = 8; } else if (v === 'Lap') { lenI.value = 45; widI.value = 9; } else if (+lenI.value < 20 || +widI.value < 11) { lenI.value = 32; widI.value = 16; } }
  updatePlan();
}));
[lenI, widI].forEach(i => i.addEventListener('input', updatePlan));
updatePlan();
const grip = $('#grip'), clampI = (i, v) => Math.max(+i.min, Math.min(+i.max, Math.round(v)));
grip.addEventListener('pointerdown', e => { if (!yard) return; e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add('drag'); hero.classList.add('sized'); yard.hold(true); });
grip.addEventListener('pointermove', e => {
  if (!grip.classList.contains('drag')) return;
  const r = cv.getBoundingClientRect(), [cx, cy, s] = yard.origin;
  lenI.value = clampI(lenI, 2 * (e.clientX - r.left - cx) / s); widI.value = clampI(widI, 2 * (e.clientY - r.top - cy) / s); updatePlan();
});
const gripUp = () => { if (!grip.classList.contains('drag')) return; grip.classList.remove('drag'); yard.hold(false); };
grip.addEventListener('pointerup', gripUp); grip.addEventListener('pointercancel', gripUp);
grip.addEventListener('keydown', e => {
  const k = e.key, dl = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0, dw = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0;
  if (!dl && !dw) return; e.preventDefault(); lenI.value = clampI(lenI, +lenI.value + dl); widI.value = clampI(widI, +widI.value + dw); updatePlan();
});
$('#heroSend').addEventListener('click', () => { readPlan(); openRequest('New pool', { kind: 'plan', text: planText() }); });
// phones: the three services come first; the planner opens from "Design my pool" and the sketch stays pinned above the controls
function openPlanner() {
  if (phone()) { hero.classList.add('planning'); $('#svcPlan').setAttribute('aria-expanded', 'true'); }
  hero.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (phone()) setTimeout(() => $('#designer button').focus({ preventScroll: true }), reduced ? 0 : 500);
}
$('#svcPlan').addEventListener('click', openPlanner);
$('#planDone').addEventListener('click', () => { hero.classList.remove('planning'); $('#svcPlan').setAttribute('aria-expanded', 'false'); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); $('#svcPlan').focus({ preventScroll: true }); });
$$('a[href="#design"]:not(#dockMain)').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPlanner(); }));
import('./yard.js?v=3').then(({ mountYard }) => {
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
  ['b7-finished', 'Finished', 'Coping, decking, water and lights. The same yard from the first photo, now a pool.', 'The finished pool at dusk with lights on'],
];
let si = 0;
const sImg = $('#storyImg');
function setStory(i) {
  si = (i + story.length) % story.length; const [f, t, b, alt] = story[si];
  $$('#storySteps button').forEach((e, k) => e.setAttribute('aria-pressed', k === si));
  $('#storyTitle').textContent = t; $('#storyBody').textContent = b; $('#storyCount').textContent = String(si + 1).padStart(2, '0') + ' / 07';
  sImg.classList.add('swap');
  const im = new Image(); im.src = `img/${f}-lg.webp`;
  const go = () => { sImg.srcset = `img/${f}-sm.webp 600w, img/${f}-lg.webp 1000w`; sImg.src = `img/${f}-lg.webp`; sImg.alt = alt; sImg.classList.remove('swap'); };
  im.decode ? im.decode().then(go, go) : go();
  const btn = $$('#storySteps button')[si]; if (phone() && btn) btn.parentElement.parentElement.scrollTo({ left: btn.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
}
$('#storyBody').textContent = story[0][2];
$$('#storySteps button').forEach(b => b.addEventListener('click', () => setStory(+b.dataset.i)));
$('#storyPrev').addEventListener('click', () => setStory(si - 1));
$('#storyNext').addEventListener('click', () => setStory(si + 1));
story.forEach(([f]) => { if (f !== 'b1-stakes') { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = `img/${f}-${phone() ? 'sm' : 'lg'}.webp`; document.head.append(l); } });

/* ---------- chips ---------- */
function chips(root, onChange) {
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    if (root.hasAttribute('data-one')) $$('button', root).forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', root.hasAttribute('data-one') ? 'true' : on);
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
  if (!from3d) pad ? pad.select(id) : (padPending = id);
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
    <p class="fine">General guide only. Joe confirms what's wrong before anything gets replaced.</p>`;
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
  'New pool': ['The usual rules for fresh plaster in the first month. Joe walks you through startup.', [
    '<b>Brush the whole pool twice a day</b> for the first two weeks to clear plaster dust',
    '<b>Run the pump around the clock</b> for the first few days',
    '<b>Test and balance every day</b> the first week, starting from Joe\'s startup numbers',
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
  import('./pad3d.js?v=4').then(m => m.mountPad($('#padCanvas'), { onPick: id => showPart(id, true), reduced })).then(p => {
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
const detailLabels = { 'New pool': 'Anything Joe should know about your yard or the pool you want?', Renovation: 'What would you like redone? (plaster, liner, coping, deck…)', Repair: 'What\'s happening, and when did it start?', 'Contractor help': 'Your company, the job address area and what the build needs' };
const applies = () => !!carried && ((carried.kind === 'plan' && reqType === 'New pool') || (carried.kind === 'sym' && reqType === 'Repair'));
function setType(t) {
  reqType = t; tabs.forEach(b => { const on = b.dataset.v === t; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  $('#fDetailL').textContent = detailLabels[t]; $('#poolMore').hidden = t !== 'New pool';
  drawCarry();
}
function drawCarry() {
  const on = applies(); carry.hidden = !on; if (!on) return;
  carry.innerHTML = `<span><b>${carried.kind === 'plan' ? 'Your plan' : 'What you\'re seeing'}:</b> ${esc(carried.text)}</span><button type="button" id="dropCarry">Remove</button>`;
  $('#dropCarry').addEventListener('click', () => { carried = null; drawCarry(); });
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
  $('#request').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => $('#fName').focus({ preventScroll: true }), reduced ? 0 : 700);
}
$$('[data-req]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openRequest(a.dataset.req); }));
$$('a[href="#request"]:not([data-req])').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openRequest(reqType); }));
chips($('#fWhen')); chips($('#fBudget')); chips($('#fStart'));
// photos: images only, first MAX_PHOTOS, never uploaded
const thumbs = $('#thumbs'), photoNote = $('#photoNote');
function drawPhotos() { $$('img', thumbs).forEach(i => URL.revokeObjectURL(i.src)); thumbs.innerHTML = '';
  photos.forEach(f => { const im = new Image(); im.alt = 'Your photo: ' + f.name; im.src = URL.createObjectURL(f); thumbs.append(im); }); }
$('#fPhotos').addEventListener('change', e => {
  const all = [...e.target.files], imgs = all.filter(f => /^image\//.test(f.type)), skipped = all.length - imgs.length, over = Math.max(0, imgs.length - MAX_PHOTOS);
  photos = imgs.slice(0, MAX_PHOTOS); drawPhotos();
  photoNote.textContent = [over && `Kept the first ${MAX_PHOTOS} photos and left out ${over}.`, skipped && `Skipped ${skipped} file${skipped > 1 ? 's' : ''} that ${skipped > 1 ? 'aren\'t photos' : 'isn\'t a photo'}.`].filter(Boolean).join(' ');
});
// validation: each error sits under its own field and is tied to it for screen readers
function setErr(input, msg) {
  let e = $('#' + input.id + 'Err'); if (!e) { e = document.createElement('p'); e.className = 'err'; e.id = input.id + 'Err'; input.after(e); }
  e.textContent = msg || ''; input.setAttribute('aria-invalid', !!msg); msg ? input.setAttribute('aria-describedby', e.id) : input.removeAttribute('aria-describedby');
}
const phoneOk = v => { const d = v.replace(/\D/g, ''); return /^[\d\s().+-]+$/.test(v.trim()) && (d.length === 10 || (d.length === 11 && d[0] === '1')); };   // (843) 555-0123, 843.555.0123, +1 843 555 0123
const emailOk = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
['fName', 'fPhone', 'fEmail'].forEach(id => $('#' + id).addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') setErr(e.target, ''); }));
reqForm.addEventListener('submit', e => {
  e.preventDefault();
  const nameI = $('#fName'), phI = $('#fPhone'), emI = $('#fEmail'), name = nameI.value.trim(), ph = phI.value.trim(), em = emI.value.trim();
  setErr(nameI, name ? '' : 'Add your name so Joe knows who to call.');
  setErr(phI, phoneOk(ph) ? '' : ph ? 'That number doesn\'t look right. Use a 10-digit US number, like (843) 555-0123.' : 'Add a mobile number so Joe can call or text you back.');
  setErr(emI, emailOk(em) ? '' : 'That email doesn\'t look right. Fix it or leave it empty.');
  const bad = [nameI, phI, emI].find(i => i.getAttribute('aria-invalid') === 'true');
  if (bad) { bad.focus({ preventScroll: true }); bad.closest('label').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return; }
  const pool = reqType === 'New pool';
  const rows = [['Request', reqType], applies() && [carried.kind === 'plan' ? 'Plan' : 'Seeing', carried.text], ['Name', name], ['Mobile', ph],
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
  $$('#fWhen button, #fBudget button, #fStart button').forEach(b => b.setAttribute('aria-pressed', 'false')); carried = null; setType('New pool'); showForm(); $('#fName').focus();
});
setType('New pool');

/* ---------- phone dock ---------- */
const dock = $('#dock'); let inHero = true, inReq = false;
const dockSet = () => { const on = !inHero && !inReq; dock.classList.toggle('on', on); dock.inert = !on; };
const dockMain = $('#dockMain'), DOCK = { plan: 'Design my pool', reno: 'Quote my renovation', repair: 'Request a repair' }; let dockMode = 'plan';
const setDock = m => { if (m !== dockMode) { dockMode = m; dockMain.textContent = DOCK[m]; } };
const dockIO = new IntersectionObserver(es => es.forEach(e => { const m = e.target.id === 'repair' ? 'repair' : 'reno'; if (e.isIntersecting) setDock(m); else if (dockMode === m) setDock('plan'); }), { rootMargin: '-40% 0px -40% 0px' });
dockIO.observe($('#renovate')); dockIO.observe($('#repair'));
dockMain.addEventListener('click', e => { e.preventDefault(); dockMode === 'repair' ? openRequest('Repair') : dockMode === 'reno' ? openRequest('Renovation') : openPlanner(); });
dock.inert = true;
new IntersectionObserver(([e]) => { inHero = e.isIntersecting; dockSet(); }).observe(hero);
new IntersectionObserver(([e]) => { inReq = e.isIntersecting; dockSet(); }, { threshold: .05 }).observe($('#request'));

// back to top
{ const t = $('#totop'), hh = () => ($('.hero')?.offsetHeight || innerHeight) * .8;
  addEventListener('scroll', () => t.classList.toggle('on', scrollY > hh()), { passive: true });
  const up = e => { e.preventDefault(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname + location.search); };
  t.addEventListener('click', up); $('#dockTop').addEventListener('click', up); }

// live heartbeat-to-wave line on every section seam: the trace runs across like a monitor,
// beats first, then the beats settle into rolling water. Baseline = the seam itself.
{ const G = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const beat = x => .12 * G(x, .2, .045) - .16 * G(x, .36, .014) + G(x, .4, .016) - .3 * G(x, .445, .016) + .24 * G(x, .66, .06);   // P Q R S T, x in 0..1
  // No fixed loop: beats come at uneven gaps and heights, sometimes skip, and give way to stretches of
  // rolling water wherever a slow noise field says so. Every divider gets its own seed and speed.
  const hash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const ss = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const water = (s, seed) => ss(.44, .62, noise(s / 520 + seed));
  const B = 112; let lean = 0;                                             // lean: how far (px) this point is pushed forward, set by trace()
  const trace = (s, t, seed) => {
    let v = 0; const j = Math.floor(s / B); lean = 0;
    // heartbeat: tall uneven spikes; a pulse travels down the line about once a second and kicks each spike as it passes (lub, then a softer dub)
    for (let n = j - 1; n <= j + 1; n++) {
      const h1 = hash(n * 3.17 + seed), h2 = hash(n * 5.31 + seed + 9), h3 = hash(n * 7.77 + seed + 21), h4 = hash(n * 1.93 + seed + 33);
      if (h3 < .08) continue;                                              // a skipped beat now and then
      const c = (n + .5 + (h1 - .5) * .42) * B, x = (s - c) / (B * (.8 + .35 * h4)) + .4;
      if (x <= 0 || x >= 1) continue;
      const ph = ((t * 1.05 - c / 760 + seed) % 1 + 1) % 1, kick = Math.exp(-ph * 5.5) + .5 * Math.exp(-(((ph + .72) % 1)) * 7);
      v += (.62 + .16 * h2) * (1 + .16 * kick) * (1 - water(c, seed)) * beat(x);
    }
    // water: sets of real swells. Sharp crests, long flat troughs, crests pushed forward so they lean and start to curl, rolling faster than the line travels
    const w = water(s, seed);
    if (w > .001) {
      const set = .55 + .45 * noise(s / 210 + seed + 70 - t * .1), ph = (s + 30 * Math.sin(s / 310 + seed)) / 104 * 6.2832 - t * 2.5;   // every moving part runs forward, the way the line travels
      const c1 = Math.pow(.5 + .5 * Math.sin(ph), 1.5);
      const hgt = w * set * c1 * .78;
      v += hgt - w * .26;
      lean = 15 * hgt * hgt;                                    // the top of the crest is thrown forward so it curls over its own face
    }
    return v;
  };
  const items = $$('.pulse').map((el, i) => { const cv = document.createElement('canvas'); el.append(cv); el.classList.add('live'); return { el, cv, ctx: cv.getContext('2d'), on: false, off: i * 1733.3, seed: i * 17.37 + 3, sp: 52 + (i * 7 % 5) * 6, w: 0, h: 0, sec: el.parentElement, prev: el.parentElement.previousElementSibling }; });
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
    const { ctx, w, h } = it, mid = h / 2, amp = h * (it.one ? .36 : .46), sh = t * it.sp + 16 * Math.sin(t * .45 + it.seed) + it.off, k = w < 700 ? .55 : 1;
    ctx.clearRect(0, 0, w, h);
    const line = new Path2D(), bDn = new Path2D(), bUp = new Path2D(), O = 2; bDn.moveTo(-60, mid + O); bUp.moveTo(-60, mid - O);
    for (let x = -60; x <= w + 60; x += 1.5) { let v = trace(x / k - sh, t, it.seed); if (it.one) v = Math.abs(v); const y = mid - v * amp, X = x + lean * k * (v > 0 ? 1 : 0); x > -60 ? line.lineTo(X, y) : line.moveTo(X, y); bDn.lineTo(X, y); bUp.lineTo(X, y); }
    bDn.lineTo(w + 60, mid + O); bDn.closePath(); bUp.lineTo(w + 60, mid - O); bUp.closePath();
    // the trace IS the edge: lower section's colour fills what rises above the seam, upper section's fills what dips below
    if (it.dn && it.up) { ctx.fillStyle = it.up; ctx.fillRect(0, mid - O, w, O); ctx.fillStyle = it.dn; ctx.fillRect(0, mid, w, O); }   // seal the seam itself
    if (it.dn) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, mid + O); ctx.clip(); ctx.fillStyle = it.dn; ctx.fill(bDn); ctx.restore(); }
    if (it.up) { ctx.save(); ctx.beginPath(); ctx.rect(0, mid - O, w, h - mid + O); ctx.clip(); ctx.fillStyle = it.up; ctx.fill(bUp); ctx.restore(); }
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(93,182,230,.28)'; ctx.lineWidth = 6; ctx.stroke(line);
    ctx.strokeStyle = '#7cc9f2'; ctx.lineWidth = 2; ctx.stroke(line);
  };
  let raf = 0; const t0 = performance.now();
  const loop = () => { raf = 0; const t = (performance.now() - t0) / 1000; let any = false; for (const it of items) if (it.on) { draw(it, t); any = true; } if (any && !reduced && !document.hidden) raf = requestAnimationFrame(loop); };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const io = new IntersectionObserver(es => { es.forEach(e => { const it = items.find(i => i.el === e.target); it.on = e.isIntersecting; }); kick(); }, { rootMargin: '80px' });
  items.forEach(it => { fit(it); draw(it, 0); io.observe(it.el); });
  addEventListener('resize', () => { items.forEach(it => { fit(it); draw(it, (performance.now() - t0) / 1000); }); kick(); });
  document.addEventListener('visibilitychange', kick);
}
