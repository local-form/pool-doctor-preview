// The Pool Doctor · concept preview by Local Form. Nothing on this page sends data anywhere.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = () => innerWidth < 861;
const q = new URLSearchParams(location.search);
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

/* ---------- hero: the pool builds itself on the heartbeat line ---------- */
const names = ['Stakes in the grass', 'Dig', 'Steel', 'Shell', 'Stone & coping', 'Water', 'Lights on'];
const hero = $('.hero'), cv = $('#pool'), knob = $('#knob'), ekg = $('#ekg'), playBtn = $('#play');
const poster = $('#poster'); poster.addEventListener('error', () => poster.remove());
const X = i => 8 + i * (684 / 6);
let d = '';
for (let i = 0; i < 7; i++) { const x = X(i);
  d += (i ? ' L' : 'M') + (x - 14) + ' 32 L' + (x - 8) + ' 28 L' + (x - 4) + ' 32 L' + (x - 1) + ' 38 L' + (x + 3) + ' 6 L' + (x + 7) + ' 58 L' + (x + 10) + ' 26 L' + (x + 14) + ' 32';
  if (i < 6) d += ' L' + (X(i + 1) - 14) + ' 32'; }
const base = $('#ekgBase'), done = $('#ekgDone');
base.setAttribute('d', d); done.setAttribute('d', d);
const len = done.getTotalLength(); done.style.strokeDasharray = len;
let shown = -1;
function show(s) {
  done.style.strokeDashoffset = len * (1 - s / 6); knob.style.left = (X(s) / 700 * 100) + '%';
  const i = Math.round(s); if (i === shown) return; shown = i;
  $('#stName').textContent = String(i + 1).padStart(2, '0') + ' · ' + names[i];
  knob.setAttribute('aria-valuenow', i + 1); knob.setAttribute('aria-valuetext', names[i]);
  $$('#stops span').forEach((e, k) => e.classList.toggle('on', k <= i));
}
const s0 = Math.max(0, Math.min(6, +(q.get('s') ?? 6)));
show(s0);
let pool = null;
const stopPlayUI = () => { playBtn.setAttribute('aria-pressed', 'false'); };
import('./pool3d.js?v=3').then(({ mount }) => {
  pool = mount(cv, { stage: s0, small: phone(), dpr: phone() ? 1.5 : 1.75, onStage: show, onPlayEnd: stopPlayUI });
  const size = () => { pool.frame(cv.clientWidth, cv.clientHeight); pool.layout(phone() ? (innerHeight / innerWidth > 1.9 ? { offX: .02, offY: -.2, dist: .8, fov: 54 } : { offX: .02, offY: -.1, dist: .88, fov: 54 }) : { offX: .2, offY: -.02, dist: 1, fov: 30 }); };
  size(); let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 120); });
  new IntersectionObserver(([e]) => pool.setVisible(e.isIntersecting)).observe(hero);
  pool.loaded.then(() => { hero.classList.add('live'); window.__done = true; });
  if (q.has('still')) pool.loaded.then(() => pool.renderOnce(3)); else pool.start();
  window.__pool = pool;
}).catch(() => { hero.classList.add('no3d'); window.__done = true; });

function setStage(s, jump) { s = Math.max(0, Math.min(6, s)); pool?.stopPlay(); stopPlayUI(); if (pool) pool.set(s, jump); show(s); }
const stageAt = x => { const r = ekg.getBoundingClientRect(); return ((x - r.left) / r.width * 700 - 8) / (684 / 6); };
ekg.addEventListener('pointerdown', e => { ekg.setPointerCapture(e.pointerId); ekg.classList.add('drag'); setStage(stageAt(e.clientX)); });
ekg.addEventListener('pointermove', e => { if (ekg.classList.contains('drag')) setStage(stageAt(e.clientX)); });
const release = e => { if (!ekg.classList.contains('drag')) return; ekg.classList.remove('drag'); setStage(Math.round(stageAt(e.clientX))); };
ekg.addEventListener('pointerup', release); ekg.addEventListener('pointercancel', release);
knob.addEventListener('keydown', e => {
  const cur = Math.round(pool ? pool.stage : shown), k = e.key;
  const n = k === 'ArrowRight' || k === 'ArrowUp' ? cur + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? cur - 1 : k === 'Home' ? 0 : k === 'End' ? 6 : null;
  if (n === null) return; e.preventDefault(); setStage(n);
});
playBtn.setAttribute('aria-pressed', 'false');
playBtn.addEventListener('click', () => {
  if (!pool) return;
  if (playBtn.getAttribute('aria-pressed') === 'true') { pool.stopPlay(); stopPlayUI(); return; }
  playBtn.setAttribute('aria-pressed', 'true'); pool.play();
});

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
const picked = root => $$('button[aria-pressed=true]', root).map(b => b.dataset.v);

/* ---------- 02 planner ---------- */
const plan = { type: 'Concrete (gunite)', shape: 'Rectangle', len: 32, wid: 16, extras: [] };
const lenI = $('#len'), widI = $('#wid');
const fill = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
function readPlan() {
  $$('#planForm .chips').forEach(c => { const v = picked(c); plan[c.dataset.k] = c.hasAttribute('data-one') ? (v[0] || '') : v; });
  plan.len = +lenI.value; plan.wid = +widI.value;
}
function shapePath(s, x, y, w, h) {
  if (s === 'Freeform') return `M${x + w * .12} ${y + h * .2}C${x + w * .3} ${y - h * .08} ${x + w * .52} ${y + h * .22} ${x + w * .72} ${y + h * .04}S${x + w * 1.02} ${y + h * .12} ${x + w} ${y + h * .5}S${x + w * .86} ${y + h * 1.04} ${x + w * .6} ${y + h * .96}S${x + w * .26} ${y + h * .78} ${x + w * .12} ${y + h * .92}S${x - w * .04} ${y + h * .4} ${x + w * .12} ${y + h * .2}Z`;
  if (s === 'L-shape') { const a = h * .58, b = w * .3; return `M${x} ${y}H${x + w}V${y + a}H${x + b}V${y + h}H${x}Z`; }
  return `M${x + 6} ${y}H${x + w - 6}Q${x + w} ${y} ${x + w} ${y + 6}V${y + h - 6}Q${x + w} ${y + h} ${x + w - 6} ${y + h}H${x + 6}Q${x} ${y + h} ${x} ${y + h - 6}V${y + 6}Q${x} ${y} ${x + 6} ${y}Z`;
}
function drawPlan() {
  readPlan();
  const L = plan.len, W = plan.wid, k = Math.min(420 / 50, 250 / 25) * .98, w = L * k, h = W * k, x = 300 - w / 2 - 20, y = 205 - h / 2;
  const ex = new Set(plan.extras), s = plan.shape, deck = 4 * k;
  let g = `<defs><pattern id="grass" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#14361f"/><path d="M2 8l1-3M7 9l1-3" stroke="#1f4d2c" stroke-width="1.2"/></pattern>
    <linearGradient id="wat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5DB6E6"/><stop offset="1" stop-color="#1D5DB5"/></linearGradient>
    <pattern id="trav" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#d9cdb6"/><path d="M0 11H22M11 0V11M5 11V22" stroke="#bfb298" stroke-width="1"/></pattern></defs>
    <rect width="600" height="420" rx="14" fill="url(#grass)"/>
    <rect x="${x - deck}" y="${y - deck}" width="${w + deck * 2}" height="${h + deck * 2}" rx="10" fill="url(#trav)" opacity="${ex.has('New deck or pavers') ? 1 : .8}"/>`;
  if (ex.has('Raised stone wall')) g += `<rect x="${x - deck}" y="${y - deck - 8}" width="${w + deck * 2}" height="10" rx="3" fill="#8a7a62"/>`;
  g += `<path d="${shapePath(s, x, y, w, h)}" fill="url(#wat)" stroke="#f2ede2" stroke-width="5"/>`;
  g += `<path d="${shapePath(s, x, y, w, h)}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-dasharray="3 7" transform="translate(0 4)"/>`;
  if (ex.has('Sun shelf')) g += `<rect x="${x + 4}" y="${y + 4}" width="${Math.min(w * .22, 70)}" height="${h - 8}" rx="4" fill="#8fd3f2" opacity=".75"/>`;
  if (ex.has('Spa')) { const r = Math.max(22, Math.min(36, h * .26)); g += `<circle cx="${x + w + deck + r * .2}" cy="${y + h * .3}" r="${r}" fill="url(#wat)" stroke="#f2ede2" stroke-width="5"/>`; }
  if (ex.has('Scuppers')) for (let i = 0; i < 3; i++) { const sx = x + w * (.3 + i * .2); g += `<rect x="${sx - 6}" y="${y - deck - 6}" width="12" height="8" rx="2" fill="#5a5145"/><path d="M${sx} ${y + 2}v${10}" stroke="#bfe7fb" stroke-width="3" stroke-linecap="round"/>`; }
  if (ex.has('LED lighting')) [[.2, .9], [.5, .9], [.8, .9]].forEach(([a, b]) => { g += `<circle cx="${x + w * a}" cy="${y + h * b - 6}" r="5" fill="#fff6c7"/><circle cx="${x + w * a}" cy="${y + h * b - 6}" r="13" fill="#fff6c7" opacity=".25"/>`; });
  if (ex.has('Fire pit')) g += `<circle cx="${x - deck - 34}" cy="${y + h + 4}" r="22" fill="#6c6156" stroke="#b08a5a" stroke-width="3"/><circle cx="${x - deck - 34}" cy="${y + h + 4}" r="10" fill="#f2a33a"/>`;
  const eq = ['Heater', 'Salt system', 'Automation'].filter(e => ex.has(e)).length;
  g += `<g transform="translate(${Math.min(560, x + w + deck + 30)} ${Math.min(360, y + h + deck - 20)})"><rect x="-26" y="-14" width="${40 + eq * 12}" height="30" rx="5" fill="#2b3a46"/><circle cx="-14" cy="1" r="7" fill="#1D5DB5"/><rect x="-2" y="-8" width="10" height="18" rx="2" fill="#5a6a78"/>${Array.from({ length: eq }, (_, i) => `<rect x="${12 + i * 12}" y="-8" width="9" height="18" rx="2" fill="${['#c64a3a', '#8fd3f2', '#3CC48A'][i]}"/>`).join('')}</g>`;
  g += `<g font-family="Mono,monospace" font-size="13" fill="#fff" letter-spacing="1"><text x="${x + w / 2}" y="${y + h + deck + 24}" text-anchor="middle">${L} FT</text><text x="${x - deck - 14}" y="${y + h / 2}" text-anchor="middle" transform="rotate(-90 ${x - deck - 14} ${y + h / 2})">${W} FT</text></g>`;
  $('#planSvg').innerHTML = g;
  const depth = s === 'Plunge' ? 4.5 : s === 'Lap' ? 4.25 : 5.25, area = s === 'Freeform' ? .82 : s === 'L-shape' ? .74 : 1;
  const gal = Math.round(L * W * area * depth * 7.48 / 100) * 100;
  $('#planDims').textContent = `${L} × ${W} ft · ${s.toLowerCase()}`;
  $('#planGal').textContent = `about ${gal.toLocaleString()} gallons`;
  $('#lenOut').textContent = L + ' ft'; $('#widOut').textContent = W + ' ft'; fill(lenI); fill(widI);
  plan.gal = gal;
  $('#planSummary').textContent = planText();
}
function planText() {
  const p = plan, bits = [p.type, `${p.shape} ${p.len}×${p.wid} ft`];
  if (p.extras.length) bits.push(p.extras.join(', '));
  ['access', 'ground', 'old', 'budget', 'when', 'town'].forEach(k => p[k] && bits.push(p[k]));
  return bits.join(' · ');
}
$$('#planForm .chips').forEach(c => chips(c, b => {
  if (c.dataset.k === 'shape') { if (b.dataset.v === 'Plunge') { lenI.value = 14; widI.value = 8; } else if (b.dataset.v === 'Lap') { lenI.value = 45; widI.value = 9; } }
  drawPlan();
}));
[lenI, widI].forEach(i => i.addEventListener('input', drawPlan));
drawPlan();
$('#planSend').addEventListener('click', () => { readPlan(); openRequest('New pool', { kind: 'plan', text: planText() }); });

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
  { t: 'Pump hums but won\'t start', p: ['pump'], c: ['<b>Start capacitor</b> has failed (very common, quick fix)', '<b>Impeller jammed</b> by debris', '<b>Motor</b> seized or burned out'] },
  { t: 'Pump is loud or screeching', p: ['pump'], c: ['<b>Motor bearings</b> wearing out', '<b>Starving for water</b>: low pool level or a clogged basket'] },
  { t: 'Bubbles in the pump basket', p: ['pump', 'plumbing'], c: ['<b>Air leak on the suction side</b>: lid O-ring, union or fitting', '<b>Water level</b> below the skimmer'] },
  { t: 'Water leaking at the equipment', p: ['plumbing', 'pump'], c: ['<b>Pump shaft seal</b> leaking under the motor', '<b>Cracked union or fitting</b> on the pad'] },
  { t: 'Weak returns, low flow', p: ['pump', 'filter'], c: ['<b>Clogged pump basket or impeller</b>', '<b>Dirty filter</b> or a valve half closed'] },
  { t: 'Filter pressure is high', p: ['filter'], c: ['<b>Filter needs cleaning</b> or new media', '<b>Return line restricted</b> or a valve closed'] },
  { t: 'Water won\'t clear', p: ['filter', 'salt'], c: ['<b>Filter not doing its job</b>: worn media or broken laterals', '<b>Not enough chlorine</b>: salt cell down or run time too short'] },
  { t: 'Heater won\'t fire', p: ['heater'], c: ['<b>Low flow</b> tripping the pressure switch', '<b>Igniter or flame sensor</b> dirty or failed', '<b>Gas supply</b> or a tripped breaker'], warn: 'Smell gas? Turn the heater off, stay away from it and call your gas company first.' },
  { t: 'Salt system says check cell', p: ['salt'], c: ['<b>Scale</b> on the cell plates', '<b>Salt level</b> low or the reading is off', '<b>Flow switch</b> not seeing flow'] },
  { t: 'Pool is losing water', p: ['plumbing'], c: ['<b>Leak in the plumbing</b> or at the equipment', '<b>Leak in the shell</b>, a fitting or a light niche', 'Tip: a bucket test tells evaporation from a leak'] },
  { t: 'Timer or automation not working', p: ['panel'], c: ['<b>Tripped breaker</b> or blown fuse', '<b>Relay or board</b> failed', '<b>Lost connection</b> to the app or remote'] },
  { t: 'Pool light out or tripping power', p: ['panel'], c: ['<b>Bulb or fixture</b> failed', '<b>Water in the light</b> tripping the GFCI'], warn: 'If a pool light trips the power, keep everyone out of the water and leave the breaker off until it\'s checked.' },
];
const symBox = $('#sym');
symBox.innerHTML = SYM.map((s, i) => `<button type="button" aria-pressed="false" data-i="${i}">${esc(s.t)}</button>`).join('');
let pad = null, padPending = null, running = false;
const partBtns = $$('#parts button');
function partCard(id) {
  partBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.p === id));
  const P = PARTS[id]; if (!P) return;
  $('#partCard').innerHTML = `<h3>${P[0]}</h3><p>${P[1]}</p><p class="fine">${P[2]}</p>`;
}
function pickPart(id, from3d) { partCard(id); if (!from3d) pad ? pad.select(id) : (padPending = id); }
partBtns.forEach(b => b.addEventListener('click', () => pickPart(b.dataset.p)));
function symptoms() { return $$('button[aria-pressed=true]', symBox).map(b => SYM[+b.dataset.i]); }
function report() {
  const list = symptoms(), box = $('#report');
  const flagged = new Set(list.flatMap(s => s.p));
  partBtns.forEach(b => b.classList.toggle('flag', flagged.has(b.dataset.p)));
  if (!list.length) { box.innerHTML = '<p class="empty">Pick a symptom to see the usual causes.</p>'; pad?.flag(null); return; }
  const first = list[list.length - 1].p[0];
  pad ? pad.flag(first) : (padPending = first); partCard(first);
  const warns = [...new Set(list.map(s => s.warn).filter(Boolean))];
  const smsBody = encodeURIComponent('Hi Joe, pool problem: ' + list.map(s => s.t).join('; ') + '. Photo attached.');
  box.innerHTML = `<h3>Usual causes</h3><ul>${list.flatMap(s => s.c).map(c => `<li>${c}</li>`).join('')}</ul>
    ${warns.map(w => `<p class="warn">${esc(w)}</p>`).join('')}
    <p class="fine">General guide only. Joe confirms what's wrong before anything gets replaced.</p>
    <div class="cta"><a class="btn btn-p" href="tel:+18437373165">Call Joe</a><a class="btn btn-s" href="sms:+18437373165?&body=${smsBody}">Text Joe a photo</a><button type="button" class="btn btn-s" id="repReq">Request a repair</button></div>`;
  $('#repReq').addEventListener('click', () => openRequest('Repair', { kind: 'sym', text: list.map(s => s.t).join(' · ') }));
}
chips(symBox, report);
$('#runBtn').addEventListener('click', e => { running = !running; e.currentTarget.setAttribute('aria-pressed', running); pad?.setRun(running); });
const padBox = $('.padbox');
const padIO = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return; padIO.disconnect();
  import('./pad3d.js?v=1').then(m => m.mountPad($('#padCanvas'), { onPick: id => pickPart(id, true), reduced })).then(p => {
    pad = p; $('#padNote').textContent = 'Drag to turn · tap a part';
    if (running) pad.setRun(true);
    if (padPending) { symptoms().length ? pad.flag(padPending) : pad.select(padPending); }
  }).catch(err => { console.error('pad', err?.stack || err); $('#padNote').textContent = '3D view not available on this device. The part buttons still work.'; $('#padCanvas').style.display = 'none'; });
}, { rootMargin: '400px 0px' });
padIO.observe(padBox);

/* ---------- 09 request (preview: nothing sends) ---------- */
const reqForm = $('#req'), tabs = $$('#reqType button'), carry = $('#carry');
let reqType = 'New pool', carried = null;
const detailLabels = { 'New pool': 'Anything Joe should know about your yard or the pool you want?', Renovation: 'What would you like redone? (plaster, liner, coping, deck…)', Repair: 'What\'s happening, and when did it start?', 'Contractor help': 'Your company, the job address area and what the build needs' };
function setType(t) {
  reqType = t; tabs.forEach(b => b.setAttribute('aria-checked', b.dataset.v === t));
  $('#fDetailL').textContent = detailLabels[t];
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
chips($('#fWhen'));
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
    $('#fPhotos').files.length && ['Photos', $('#fPhotos').files.length + ' attached'], picked($('#fWhen')).length && ['Best time', picked($('#fWhen'))[0]]].filter(Boolean);
  $('#doneTitle').textContent = `Thanks, ${name.split(' ')[0]}. Here's what Joe would get.`;
  $('#doneBody').innerHTML = `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  reqForm.hidden = true; $('#done').hidden = false; $('#done').focus();
});
function showForm() { reqForm.hidden = false; $('#done').hidden = true; }
$('#again').addEventListener('click', () => { reqForm.reset(); $('#thumbs').innerHTML = ''; $$('#fWhen button').forEach(b => b.setAttribute('aria-pressed', 'false')); carried = null; setType('New pool'); showForm(); $('#fName').focus(); });
setType('New pool');

/* ---------- phone dock ---------- */
const dock = $('#dock'); let inHero = true, inReq = false;
const dockSet = () => dock.classList.toggle('on', !inHero && !inReq);
new IntersectionObserver(([e]) => { inHero = e.isIntersecting; dockSet(); }).observe($('.hero-copy .actions'));
new IntersectionObserver(([e]) => { inReq = e.isIntersecting; dockSet(); }, { threshold: .05 }).observe($('#request'));
