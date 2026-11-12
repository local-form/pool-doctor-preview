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
  $('#planDims').textContent = `${L} × ${W} ft ${s.toLowerCase()}`;
  $('#planGal').textContent = `about ${plan.gal.toLocaleString()} gallons`;
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
  symBox.innerHTML = SYM.map((x, i) => x.part === id ? `<button type="button" role="radio" aria-checked="false" data-i="${i}">${esc(x.t)}</button>` : '').join('');
  box.hidden = true; box.innerHTML = '';
  if (!from3d) pad ? pad.select(id) : (padPending = id);
}
partBtns.forEach(b => b.addEventListener('click', () => showPart(b.dataset.p)));
symBox.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  $$('button', symBox).forEach(x => x.setAttribute('aria-checked', x === b));
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
  $$('button', when).forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
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
  import('./pad3d.js?v=2').then(m => m.mountPad($('#padCanvas'), { onPick: id => showPart(id, true), reduced })).then(p => {
    pad = p; $('#padNote').textContent = 'Drag to turn · tap a part';
    if (running) pad.setRun(true);
    if (padPending) pad.select(padPending);
  }).catch(err => { console.error('pad', err?.stack || err); $('#padNote').textContent = '3D view not available on this device. The part buttons still work.'; $('#padCanvas').style.display = 'none'; $('#runBtn').hidden = true; });
}, { rootMargin: '400px 0px' });
padIO.observe(padBox);

/* ---------- 09 request (preview: nothing sends) ---------- */
const reqForm = $('#req'), tabs = $$('#reqType button'), carry = $('#carry');
let reqType = 'New pool', carried = null;
const detailLabels = { 'New pool': 'Anything Joe should know about your yard or the pool you want?', Renovation: 'What would you like redone? (plaster, liner, coping, deck…)', Repair: 'What\'s happening, and when did it start?', 'Contractor help': 'Your company, the job address area and what the build needs' };
function setType(t) {
  reqType = t; tabs.forEach(b => b.setAttribute('aria-checked', b.dataset.v === t));
  $('#fDetailL').textContent = detailLabels[t]; $('#poolMore').hidden = t !== 'New pool';
  if (carried && !((carried.kind === 'plan' && t === 'New pool') || (carried.kind === 'sym' && t === 'Repair'))) carried = null;
  drawCarry();
}
function drawCarry() {
  carry.hidden = !carried; if (!carried) return;
  carry.innerHTML = `<b>${carried.kind === 'plan' ? 'Your plan' : 'What you\'re seeing'}:</b> ${esc(carried.text)} <button type="button" id="dropCarry">Remove</button>`;
  $('#dropCarry').addEventListener('click', () => { carried = null; drawCarry(); });
}
tabs.forEach((b, i) => {
  b.addEventListener('click', () => setType(b.dataset.v));
  b.addEventListener('keydown', e => { const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null; if (n === null) return; e.preventDefault(); const t = tabs[(n + tabs.length) % tabs.length]; t.focus(); setType(t.dataset.v); });
});
function openRequest(type, carry) { carried = carry || null; setType(type); showForm(); $('#request').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => $('#fName').focus({ preventScroll: true }), reduced ? 0 : 700); }
$$('[data-req]').forEach(a => a.addEventListener('click', () => { carried = null; setType(a.dataset.req); }));
$$('a[href="#request"]:not([data-req])').forEach(a => a.addEventListener('click', () => setType('New pool')));
chips($('#fWhen')); chips($('#fBudget')); chips($('#fStart'));
$('#fPhotos').addEventListener('change', e => {
  const t = $('#thumbs'); t.innerHTML = '';
  [...e.target.files].slice(0, 6).forEach(f => { const im = new Image(); im.alt = 'Your photo: ' + f.name; im.src = URL.createObjectURL(f); t.append(im); });
});
reqForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#fName').value.trim(), ph = $('#fPhone').value.replace(/\D/g, ''), err = $('#reqErr');
  $('#fName').setAttribute('aria-invalid', !name); $('#fPhone').setAttribute('aria-invalid', ph.length < 10);
  if (!name || ph.length < 10) { err.textContent = !name ? 'Add your name so Joe knows who to call.' : 'Add a mobile number (10 digits) so Joe can call or text you back.'; (!name ? $('#fName') : $('#fPhone')).focus(); return; }
  err.textContent = '';
  const rows = [['Request', reqType], carried && [carried.kind === 'plan' ? 'Plan' : 'Seeing', carried.text], ['Name', name], ['Mobile', $('#fPhone').value.trim()],
    $('#fEmail').value.trim() && ['Email', $('#fEmail').value.trim()], $('#fTown').value && ['Town', $('#fTown').value], $('#fDetail').value.trim() && ['Details', $('#fDetail').value.trim()],
    $('#fPhotos').files.length && ['Photos', $('#fPhotos').files.length + ' attached'], picked($('#fWhen')).length && ['Best time', picked($('#fWhen'))[0]], reqType === 'New pool' && picked($('#fBudget')).length && ['Budget', picked($('#fBudget'))[0]], reqType === 'New pool' && picked($('#fStart')).length && ['When', picked($('#fStart'))[0]]].filter(Boolean);
  $('#doneTitle').textContent = `Thanks, ${name.split(' ')[0]}. Here's what Joe would get.`;
  $('#doneBody').innerHTML = `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  reqForm.hidden = true; $('#done').hidden = false; $('#done').focus();
});
function showForm() { reqForm.hidden = false; $('#done').hidden = true; }
$('#again').addEventListener('click', () => { reqForm.reset(); $('#thumbs').innerHTML = ''; $$('#fWhen button, #fBudget button, #fStart button').forEach(b => b.setAttribute('aria-pressed', 'false')); carried = null; setType('New pool'); showForm(); $('#fName').focus(); });
setType('New pool');

/* ---------- phone dock ---------- */
const dock = $('#dock'); let inHero = true, inReq = false;
const dockSet = () => dock.classList.toggle('on', !inHero && !inReq);
new IntersectionObserver(([e]) => { inHero = e.isIntersecting; dockSet(); }).observe(hero);
new IntersectionObserver(([e]) => { inReq = e.isIntersecting; dockSet(); }, { threshold: .05 }).observe($('#request'));

// back to top
{ const t = $('#totop'), hh = () => ($('.hero')?.offsetHeight || innerHeight) * .8;
  addEventListener('scroll', () => t.classList.toggle('on', scrollY > hh()), { passive: true });
  t.addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); history.replaceState(null, '', location.pathname + location.search); }); }
