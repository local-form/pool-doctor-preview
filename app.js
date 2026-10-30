// Pool Doctor: wiring. Every entry point (Health Check, care plan, repair part, configurator, zip, booking) writes to
// the one store in state.js and calls refresh(); the views below redraw only from what refresh() derives.
import { store, set, refresh, onRefresh, D as _D, derive, NEEDS, PLANS, SEASON_ADDONS, POOL_TYPES, EQUIPMENT, clock, nyParts, fmtTime, fmtDay, money, range, kRange, seasonOf, ics, confirmCode } from './state.js';
import * as S from './state.js';
import { SYMPTOMS, PARTS, SWIM, URGENCY, BANDS, VISITS } from './triage.js';
import { mountConfigurator, defaultDesign, designQuote, planSVG, SHAPES, DEPTHS, shapePath, dims } from './configurator.js';
import { mapSVG, ZONES, zipCheck, zipMessage } from './map.js';
const ACCESS = { side: 'side-yard access, 8 ft or wider', tight: 'tight access, under 8 ft', unsure: 'access to be checked' }, SLOPE = { flat: 'mostly flat yard', sloped: 'sloped yard' };
import { mountBuild, STAGES } from './build.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const D = () => S.D;
const qs = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hrs = m => { const h = Math.round(m / 30) / 2; return `${Math.floor(h) || ''}${h % 1 ? '½' : ''} hr${h > 1 ? 's' : ''}`; };
const smooth = () => (reduced ? 'auto' : 'smooth');

// ---- live announcements: one polite region, debounced, never the same message twice in a row ----
let lastSaid = '', sayTimer = 0;
function announce(msg) {
  if (!msg) return; clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { if (msg === lastSaid) return; lastSaid = msg; $('#sr').textContent = msg; }, 450);
}

// ---------------------------------------------------------------- header and menu
const top = $('#topbar'), menuBtn = $('#menu-btn'), nav = $('#nav');
const solid = () => top.classList.toggle('is-solid', scrollY > 24 || document.documentElement.classList.contains('nav-open'));
addEventListener('scroll', solid, { passive: true }); solid();
function menu(open, focusBack = true) {
  menuBtn.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open); document.documentElement.classList.toggle('nav-open', open); solid();
  if (open) nav.querySelector('a').focus(); else if (focusBack) menuBtn.focus();
}
menuBtn.addEventListener('click', () => menu(menuBtn.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a') && menuBtn.getAttribute('aria-expanded') === 'true') menu(false, false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') menu(false); });

// ---------------------------------------------------------------- hero
const SEASON_LINES = {   // the compact seasonal notice under the headline
  spring: 'Opening season · book for May',
  summer: 'Peak season · green pools in 48 h',
  fall: 'Closing season · beat the first frost',
  winter: 'Design season · spring slots open',
};
const season = seasonOf();
$('#season-line').textContent = SEASON_LINES[season];
const hero = $('#top'), split = $('#split'), poster = $('#hero-poster');
let heroApi = null, splitV = .55;
function placeSplit(v, say) {
  splitV = Math.min(.96, Math.max(.04, v)); split.style.left = splitV * 100 + '%';
  split.setAttribute('aria-valuenow', Math.round(splitV * 100)); split.setAttribute('aria-valuetext', `${Math.round(splitV * 100)}% treated`);
  heroApi?.setSplit(splitV); if (say) announce(`${Math.round(splitV * 100)}% treated`);
}
if (qs.has('poster')) hero.classList.add('hero--poster');
// after dark in New York (6 pm to 6 am) the pool lights come on; ?night=1 / ?night=0 forces it; the button toggles it
const nyHour = nyParts(clock.now()).min / 60;
let night = qs.has('night') ? qs.get('night') !== '0' : nyHour >= 18 || nyHour < 6;
const nightBtn = $('#night-btn');
const showNight = () => { nightBtn.setAttribute('aria-pressed', night); $('#night-label').textContent = matchMedia('(max-width: 767px)').matches ? (night ? 'Lights on' : 'Lights off') : (night ? 'Pool lights on' : 'Pool lights off'); hero.classList.toggle('is-night', night); document.documentElement.classList.toggle('is-night', night);
  document.querySelector('meta[name=theme-color]').content = night ? '#0A1D25' : '#061A22'; window.dispatchEvent(new Event('pd-night')); };
if (night) poster.src = 'hero-poster-night.webp';
nightBtn.addEventListener('click', () => { document.documentElement.classList.add('theme-fade'); clearTimeout(nightBtn.t); nightBtn.t = setTimeout(() => document.documentElement.classList.remove('theme-fade'), 1200); night = !night; showNight(); heroApi?.setNight(night ? 1 : 0); announce(night ? 'Evening view: pool lights on.' : 'Daylight view.'); });
showNight();
function heroFallback() {
  hero.classList.add('no-gl'); $('#water-note').hidden = false;
}
(async () => {
  try {
    const { mountHero } = await import('./water.js');
    heroApi = mountHero(hero, {
      canvas: $('#water'), reduced: reduced || qs.has('poster'), still: qs.has('poster'), night: night ? 1 : 0,
      coping: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--coping')) || 84,
      onFirstFrame() { hero.classList.add('is-live'); setTimeout(() => { poster.style.visibility = 'hidden'; }, 1300); },
    });
    window.__pd.water = heroApi.stats; nightBtn.hidden = false;
    placeSplit(splitV);
    if (!reduced && !qs.has('poster')) {   // once: ease the front from 15% to 55% to show what it does
      const t0 = performance.now(), from = .15, to = .55;
      placeSplit(from);
      const step = t => { const k = Math.min(1, (t - t0) / 2400), e = 1 - Math.pow(1 - k, 3); if (!dragging) placeSplit(from + (to - from) * e); if (k < 1 && !dragging) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  } catch (err) { heroFallback(); window.__pd.waterError = String(err?.message || err); }
})();
let dragging = false;
split.addEventListener('pointerdown', e => { dragging = true; split.classList.add('is-drag'); split.setPointerCapture(e.pointerId); e.preventDefault(); });
split.addEventListener('pointermove', e => { if (dragging) placeSplit((e.clientX - hero.getBoundingClientRect().left) / hero.clientWidth); });
const endDrag = () => { if (dragging) { dragging = false; split.classList.remove('is-drag'); announce(`${Math.round(splitV * 100)}% treated`); } };
split.addEventListener('pointerup', endDrag); split.addEventListener('pointercancel', endDrag);
split.addEventListener('keydown', e => {
  const k = { ArrowLeft: -.05, ArrowDown: -.05, ArrowRight: .05, ArrowUp: .05, PageDown: -.2, PageUp: .2 }[e.key];
  if (k) { e.preventDefault(); placeSplit(splitV + k, true); }
  if (e.key === 'Home') { e.preventDefault(); placeSplit(0, true); } if (e.key === 'End') { e.preventDefault(); placeSplit(1, true); }
});
// on the water: a tap makes a ripple ring; a sideways swipe moves the front; a vertical swipe scrolls the page.
// Touch decides the direction in the first few pixels: sideways locks the page for the rest of that swipe (no
// accidental scrolling) and the front glides to the finger and follows it; vertical lets the page scroll untouched.
// Two fingers (pinch zoom) are left to the browser. A mouse drags the same way; moving a mouse leaves a faint wake.
let lastMove = null, follow = null, followRaf = 0;
function glideTo(v) {   // the front eases to the finger instead of jumping
  follow = Math.min(.96, Math.max(.04, v));
  if (followRaf) return;
  const step = () => { const d = follow - splitV; if (Math.abs(d) < .002) { placeSplit(follow); followRaf = 0; return; } placeSplit(splitV + d * .35); followRaf = requestAnimationFrame(step); };
  followRaf = requestAnimationFrame(step);
}
const xOf = cx => (cx - hero.getBoundingClientRect().left) / hero.clientWidth;
let tg = null;   // the current touch: start point, time and mode ('x' sideways, 'y' scrolling)
hero.addEventListener('touchstart', e => {
  if (e.touches.length !== 1 || e.target.closest('a, button, .knob')) { if (tg?.mode === 'x') endX(); tg = null; return; }
  const t = e.touches[0]; tg = { x: t.clientX, y: t.clientY, t: performance.now(), mode: null };
}, { passive: true });
hero.addEventListener('touchmove', e => {
  if (!tg || heroApi == null) return;
  if (e.touches.length !== 1) { if (tg.mode === 'x') endX(); tg = null; return; }
  const t = e.touches[0], dx = t.clientX - tg.x, dy = t.clientY - tg.y;
  if (!tg.mode && Math.hypot(dx, dy) >= 6) {   // decide once, before the browser commits to a scroll (~10 px)
    tg.mode = Math.abs(dx) > Math.abs(dy) * .9 ? 'x' : 'y';
    if (tg.mode === 'x') { dragging = true; hero.classList.add('is-swiping'); }
  }
  if (tg.mode === 'x') { if (e.cancelable) e.preventDefault(); glideTo(xOf(t.clientX)); }
}, { passive: false });
function endX() { dragging = false; hero.classList.remove('is-swiping'); announce(`${Math.round(follow * 100)}% treated`); }
hero.addEventListener('touchend', e => {
  if (!tg) return;
  if (tg.mode === 'x') endX();
  else if (!tg.mode && performance.now() - tg.t < 500) { const c = e.changedTouches[0], r = hero.getBoundingClientRect(); heroApi?.ripple(c.clientX - r.left, c.clientY - r.top, 1); }
  tg = null;
});
hero.addEventListener('touchcancel', () => { if (tg?.mode === 'x') endX(); tg = null; });
let md = null;   // mouse: click for a ripple, drag sideways to move the front
hero.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button, .split')) return; md = { x: e.clientX, y: e.clientY, drag: false }; });
addEventListener('pointermove', e => {
  if (!md || e.pointerType !== 'mouse') return;
  if (!md.drag && Math.abs(e.clientX - md.x) > 6 && Math.abs(e.clientX - md.x) > Math.abs(e.clientY - md.y)) { md.drag = true; dragging = true; hero.classList.add('is-swiping'); }
  if (md.drag) { e.preventDefault(); glideTo(xOf(e.clientX)); }
});
addEventListener('pointerup', e => {
  if (!md || e.pointerType !== 'mouse') return;
  if (md.drag) endX(); else if (hero.contains(e.target)) { const r = hero.getBoundingClientRect(); heroApi?.ripple(e.clientX - r.left, e.clientY - r.top, 1); }
  md = null;
});
hero.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || dragging || e.buttons) return;
  const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = performance.now();
  if (lastMove) { const v = Math.hypot(x - lastMove.x, y - lastMove.y) / Math.max(1, t - lastMove.t); if (v > .05) heroApi?.wake(x, y, Math.min(1, v * .6)); }
  lastMove = { x, y, t };
});

// ---------------------------------------------------------------- 01 the Health Check
const ICONS = {
  green: '<path d="M3 15c3-2 6-2 9 0s6 2 9 0"/><path d="M3 19c3-2 6-2 9 0s6 2 9 0"/><path d="M8 5c3 0 5 2 5 5-3 0-5-2-5-5z"/><path d="M8 5l5 5"/>',
  cloudy: '<path d="M7 13h10a3 3 0 0 0 0-6 4 4 0 0 0-7.6-1A3.5 3.5 0 0 0 7 13z"/><path d="M3 18c3-2 6-2 9 0s6 2 9 0"/>',
  black: '<circle cx="8" cy="9" r="2"/><circle cx="15" cy="7" r="1.3"/><circle cx="14" cy="14" r="2.6"/><circle cx="7" cy="16" r="1.2"/><rect x="3" y="3" width="18" height="18" rx="2"/>',
  foam: '<circle cx="8" cy="12" r="3"/><circle cx="14.5" cy="9" r="2.2"/><circle cx="15" cy="15" r="1.6"/><circle cx="10" cy="6" r="1"/><path d="M3 19c3-2 6-2 9 0s6 2 9 0"/>',
  smell: '<path d="M8 20c-2-3 2-5 0-8s2-5 0-8"/><path d="M12 20c-2-3 2-5 0-8s2-5 0-8"/><path d="M16 20c-2-3 2-5 0-8s2-5 0-8"/>',
  low: '<path d="M4 5h16"/><path d="M4 14c3-2 5-2 8 0s5 2 8 0"/><path d="M12 6v5m-2-2 2 2 2-2"/><path d="M4 19h16"/>',
  loud: '<rect x="3" y="9" width="7" height="6" rx="1"/><path d="M10 9l5-4v14l-5-4"/><path d="M18 9c1 1.5 1 4.5 0 6"/><path d="M20.5 7c2 3 2 7 0 10"/>',
  nopower: '<path d="M12 3v8"/><path d="M7 6.5a7 7 0 1 0 10 0"/><path d="M4 4l16 16"/>',
  heat: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v6"/><path d="M18 6h2M18 10h2"/>',
  cracks: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3l2 5-3 3 4 3-2 4 2 3"/>',
  salt: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7 8v8M17 8v8"/><circle cx="12" cy="5" r="1.4"/>',
};
const symBox = $('#symptoms');
symBox.innerHTML = SYMPTOMS.map(s => `<button type="button" class="sym" data-sym="${s.id}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[s.id]}</svg><span>${esc(s.label)}</span></button>`).join('');
symBox.addEventListener('click', e => {
  const b = e.target.closest('.sym'); if (!b) return;
  const id = b.dataset.sym, cur = store.triage.symptoms;
  const symptoms = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  set({ triage: { ...store.triage, symptoms } }, 'triage');
});
for (const [id, key] of [['#r-ph', 'ph'], ['#r-cl', 'cl']]) {
  $(id).addEventListener('input', e => {
    const v = e.target.value === '' ? null : parseFloat(e.target.value);
    set({ triage: { ...store.triage, readings: { ...store.triage.readings, [key]: Number.isFinite(v) ? v : null } } }, 'triage');
  });
}
const gauge = (el, v, lo, hi, [a, b]) => {
  el.innerHTML = `<span class="band" style="left:${(a - lo) / (hi - lo) * 100}%;width:${(b - a) / (hi - lo) * 100}%"></span>` + (v == null ? '' : `<span class="pin${v < a || v > b ? ' is-off' : ''}" style="left:calc(${Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * 100}% - 1px)"></span>`);
};
const nyDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }).format(clock.now());
$('#report-date').textContent = nyDate;
let lastCause = '';
onRefresh((d, { msg }) => {
  $$('.sym').forEach(b => b.setAttribute('aria-pressed', store.triage.symptoms.includes(b.dataset.sym)));
  gauge($('#g-ph'), store.triage.readings.ph, 6.4, 8.6, BANDS.ph); gauge($('#g-cl'), store.triage.readings.cl, 0, 6, BANDS.cl);
  const t = d.triage, body = $('#report-body');
  if (!t) {
    body.innerHTML = `<div class="report-empty"><h3 id="report-h">Tap a symptom to start.</h3><p class="detail">Your report builds here as you go. Nothing is sent.</p><p class="range" aria-hidden="true">$—</p></div>`;
    lastCause = ''; return;
  }
  const swimCls = t.swim === 'no' ? 'dot--no' : t.swim === 'notyet' ? 'dot--notyet' : '';
  body.innerHTML = `<p class="mono label">Likely cause</p><h3 id="report-h">${esc(t.cause)}</h3><p class="detail">${esc(t.detail)}${t.also.length ? ` Also noted: ${esc(t.also.join('; ').toLowerCase())}.` : ''}</p>
    <dl class="facts">
      <div><dt class="mono">Safe to swim?</dt><dd data-k="swim"><span class="dot ${swimCls}" aria-hidden="true"></span>${SWIM[t.swim].label}<span class="swim-why">${esc(t.swimWhy)}</span></dd></div>
      <div><dt class="mono">How soon</dt><dd data-k="urgency">${URGENCY[t.urgency].label}</dd></div>
      <div><dt class="mono">Visit</dt><dd data-k="visit">${esc(t.lines[0].label)}</dd></div>
      <div><dt class="mono">On site</dt><dd>${hrs(t.minutes)}</dd></div>
    </dl>
    <p class="mono label">Tonight</p><ul class="tonight">${t.tonight.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="mono label">Example range</p><p class="range" data-k="range">${range(t.range)}</p>
    ${t.lines.length > 1 ? `<ul class="lines">${t.lines.map(l => `<li><span>${esc(l.label)}</span><span>${range(l.range)}</span></li>`).join('')}</ul>` : ''}
    <button class="btn btn--solid" type="button" id="book-triage">Book this visit</button>
    <p class="confirm">${t.confirm} General guidance only: no chemical doses.</p>`;
  if (msg === 'triage' && t.cause !== lastCause) announce(`Report: ${t.cause}. Safe to swim: ${SWIM[t.swim].label}. ${URGENCY[t.urgency].label}. Example range ${range(t.range)}.`);
  lastCause = t.cause;
});
document.addEventListener('click', e => { if (e.target.id === 'book-triage') bookFrom({ need: 'diagnosis' }); });
// on phones the report sits below the tiles: a pill points to it while the tiles are in view and the report is not
let reportSeen = false, diagIn = false;
new IntersectionObserver(([e]) => { reportSeen = e.isIntersecting; pill(); }).observe($('#report'));
new IntersectionObserver(([e]) => { diagIn = e.isIntersecting; pill(); }).observe($('#symptoms'));
function pill() { const t = S.D.triage; $('#see-report').hidden = !t || reportSeen || !diagIn; if (t) $('#see-report-r').textContent = range(t.range); }
onRefresh(pill);

// ---------------------------------------------------------------- 02 water lab (+ the shared mini renderer)
let mini = null;
const miniReady = import('./water.js').then(m => { mini = m.miniRenderer({ reduced }); return m; }).catch(() => null);
const lab = { ph: 7.4, cl: 2, t: 80 };
function labState({ ph, cl, t }) {
  const algae = Math.max(0, Math.min(1, (1.2 - cl) / 1.2 * .75 + Math.max(0, t - 82) / 13 * .35 + Math.max(0, ph - 7.8) * .4));
  const eyes = ph < 7.1 || ph > 7.9 || cl > 4.5, scale = ph >= 8.0;
  const verdict = algae > .62 ? 'Algae bloom likely' : algae > .3 ? 'Algae risk rising' : eyes ? 'Irritating to eyes' : scale ? 'Scale forming' : 'Balanced';
  const say = {
    'Algae bloom likely': 'Too little chlorine for this heat. Expect green within days.',
    'Algae risk rising': 'Chlorine is struggling. Shock now and it stays clear.',
    'Irritating to eyes': ph < 7.1 ? 'Acidic water: it stings and etches plaster.' : cl > 4.5 ? 'Chlorine is high: give it a sunny day before swimming.' : 'High pH: chlorine works poorly and eyes sting.',
    'Scale forming': 'High pH drops calcium out as a white crust.',
    Balanced: 'Clear water, comfortable on eyes. Chlorine has room to work.',
  }[verdict];
  const milky = scale ? .25 : 0;
  return { verdict, say, warn: verdict !== 'Balanced', params: { split: -1, lane: 0, seed: .3, night: night ? .55 : 0, after: [1 - algae * .8, algae, 1 - algae * .85, 1], before: [1, 1, milky, 0] } };
}
function drawLab(say) {
  const s = labState(lab);
  $('#l-ph-o').textContent = lab.ph.toFixed(1); $('#l-cl-o').textContent = lab.cl.toFixed(1) + ' ppm'; $('#l-t-o').textContent = lab.t + '°F';
  $('#lab-verdict').textContent = s.verdict; $('#lab-verdict').classList.toggle('is-warn', s.warn);
  $('#lab-read').textContent = `pH ${lab.ph.toFixed(1)} · Cl ${lab.cl.toFixed(1)} ppm · ${lab.t}°F`;
  $('#lab-say').textContent = s.say;
  const fb = $('#lab-fb-water'); if (fb) fb.setAttribute('fill', s.params.after[1] > .5 ? '#3E6B3A' : s.params.after[1] > .2 ? '#4E8C78' : '#2E8FA8');
  labTarget?.update();
  return s;
}
let labTarget = null; const caseTargets = [];
for (const [id, k] of [['#l-ph', 'ph'], ['#l-cl', 'cl'], ['#l-t', 't']]) $(id).addEventListener('input', e => { lab[k] = +e.target.value; drawLab(); });
miniReady.then(m => {
  if (!mini) throw 0;
  // a split below 0 keeps the whole lab canvas on the "treated" side, driven by the sliders
  labTarget = mini.add($('#lab-canvas'), () => ({ ...labState(lab).params, split: -1 }));
  for (const c of $$('canvas[data-case]')) {
    const preset = { green: [1, 1, 0, 0], cloudy: [.75, 0, 1, 0], black: [.1, .05, 0, 1] }[c.dataset.case];
    caseTargets.push(mini.add(c, () => ({ split: .5, lane: 0, seed: c.dataset.case.length, night: night ? .75 : 0, before: preset, after: [1, 0, 1, 1] }), { scale: .9 }));
  }
}).catch(() => {
  $('#lab-canvas').hidden = true; $('#lab-fallback').removeAttribute('hidden'); $('#cases').classList.add('no-gl');
});
drawLab();

// ---------------------------------------------------------------- 03 care plans + season
function drawTiers() {
  const freq = store.plan.freq;
  $('#tiers').innerHTML = Object.entries(PLANS).map(([k, p]) => `<article class="tier" data-tier="${k}">
    <p class="mono tag">${k === 'complete' ? 'Most chosen · example' : '&nbsp;'}</p>
    <h3>${p.name}</h3><p class="price" data-k="price">${money(p[freq])}</p><p class="per mono">per month · ${freq === 'weekly' ? 'weekly visits' : 'every other week'} · example</p>
    <ul class="spec">${p.every.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ul>
    <button class="btn btn--line" type="button" data-plan="${k}">Start this plan</button></article>`).join('');
}
$('#freq').addEventListener('change', e => set({ plan: { ...store.plan, freq: e.target.value } }, 'plan'));
$('#tiers').addEventListener('click', e => { const b = e.target.closest('[data-plan]'); if (b) bookFrom({ need: 'care', plan: { ...store.plan, tier: b.dataset.plan } }); });
let lastFreq = null;
onRefresh((d, { msg }) => {
  if (lastFreq !== store.plan.freq) { lastFreq = store.plan.freq; drawTiers(); $$('#freq input').forEach(i => { i.checked = i.value === store.plan.freq; }); if (msg === 'plan') announce(`Prices now ${store.plan.freq === 'weekly' ? 'weekly' : 'every other week'}: ${Object.values(PLANS).map(p => `${p.name} ${money(p[store.plan.freq])}`).join(', ')} a month.`); }
});
const seasonAddon = season === 'spring' ? 'open' : 'close';
$('#season-tag').textContent = { spring: 'Opening season', summer: 'Plan ahead', fall: 'Closing season', winter: 'Plan ahead' }[season];
$('#season-copy').textContent = seasonAddon === 'open'
  ? 'An opening in time for the first warm weekend: cover off, equipment started, water balanced. Example range $250–$450, included in Worry-free.'
  : 'A closing before the first frost: water lowered, lines blown out, heater winterized, cover fitted. Example range $250–$450, included in Worry-free.';
$('#season-book').textContent = seasonAddon === 'open' ? 'Book an opening' : 'Book a closing';
$('#season-book').addEventListener('click', () => bookFrom({ need: 'season', season: seasonAddon }));

// ---------------------------------------------------------------- 04 repair
const PART_ORDER = ['pump', 'filter', 'heater', 'salt', 'timer'];
let viewPart = 'pump', padApi = null;
$('#part-list').innerHTML = PART_ORDER.map((k, i) => `<button type="button" class="part-btn" data-part="${k}" aria-pressed="${k === viewPart}"><span class="n">0${i + 1}</span>${PARTS[k].name}</button>`).join('');
function showPart(k, say) {
  viewPart = k; const p = PARTS[k];
  $$('.part-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.part === k));
  $$('.hot').forEach(b => b.setAttribute('aria-pressed', b.dataset.part === k));
  $$('.pad-svg .pp').forEach(g => { g.classList.toggle('is-on', g.dataset.part === k); g.setAttribute('aria-pressed', g.dataset.part === k); });
  $('#part').innerHTML = `<p class="mono label">0${PART_ORDER.indexOf(k) + 1} — ${p.name}</p><h3>${p.name}</h3>
    <div class="cols"><div><p class="mono label">Common failures</p><ul>${p.fails.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><p class="mono label">Sounds &amp; signs</p><ul>${p.signs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
    <p class="mono label">Example repair range</p><p class="range" data-k="part-range">${range(p.range)}</p>
    <button type="button" class="btn btn--light" id="book-part">Book a repair</button>`;
  padApi?.select(k);
}
$('#part-list').addEventListener('click', e => { const b = e.target.closest('.part-btn'); if (b) showPart(b.dataset.part, true); });
document.addEventListener('click', e => { if (e.target.id === 'book-part') bookFrom({ need: 'repair', part: viewPart }); });
const PAD_SVG = `<svg viewBox="0 0 640 360" role="group" aria-label="Equipment pad, line drawing">
  <path d="M30 300H610" stroke="#D9D2C4" stroke-width="1.4" fill="none"/><path d="M40 300l16 18H586l16-18" stroke="#D9D2C4" stroke-width="1" fill="none" opacity=".5"/>
  <g class="pp" data-part="pump" tabindex="0" role="button" aria-label="Pump"><rect x="60" y="230" width="120" height="58" rx="10"/><path d="M180 244h26v32h-26M78 230v-30h44v30M70 288l-6 12h132l-6-12"/><path d="M96 238v44M110 238v44M124 238v44M138 238v44M152 238v44"/><text x="62" y="186">01 PUMP</text></g>
  <g class="pp" data-part="filter" tabindex="0" role="button" aria-label="Sand filter"><ellipse cx="290" cy="220" rx="62" ry="74"/><path d="M262 292l-10 8h76l-10-8M272 146h36v-24h-36zM290 122v-18M308 132h22v30"/><circle cx="332" cy="170" r="9"/><text x="250" y="92">02 FILTER</text></g>
  <g class="pp" data-part="heater" tabindex="0" role="button" aria-label="Heater"><rect x="400" y="150" width="104" height="146" rx="12"/><path d="M414 166h76M414 176h76M414 186h76M424 214h56v40h-56z"/><circle cx="452" cy="270" r="6"/><text x="404" y="136">03 HEATER</text></g>
  <g class="pp" data-part="salt" tabindex="0" role="button" aria-label="Salt cell"><path d="M206 260h30M352 236h30M382 236v-30h-140v54"/><rect x="262" y="96" width="0" height="0"/><rect x="530" y="250" width="0" height="0"/><rect x="214" y="196" width="0" height="0"/><rect x="345" y="192" width="0" height="0"/><path d="M382 206h0"/><rect x="190" y="0" width="0" height="0"/><rect x="236" y="250" width="0" height="0"/></g>
  <g class="pp" data-part="timer" tabindex="0" role="button" aria-label="Timer and controls"><rect x="540" y="160" width="58" height="76" rx="6"/><circle cx="569" cy="196" r="16"/><path d="M569 196l8-8M566 236v64"/><text x="530" y="146">05 TIMER</text></g>
</svg>`;
// the salt cell in the drawing: on the return line between filter and heater
const SALT = `<g class="pp" data-part="salt" tabindex="0" role="button" aria-label="Salt cell"><path d="M352 250h48"/><rect x="356" y="238" width="0" height="0"/><path d="M364 240h28a10 10 0 0 1 0 20h-28a10 10 0 0 1 0-20z"/><path d="M372 240v20M384 240v20"/><text x="334" y="330">04 SALT CELL</text></g>`;
function padFallback(why) {
  $('#pad-canvas').hidden = true; $('#pad-hot').hidden = true;
  const box = $('#pad-svg'); box.hidden = false; box.innerHTML = PAD_SVG.replace(/<g class="pp" data-part="salt"[\s\S]*?<\/g>/, SALT);
  $('#pad-note').textContent = why || 'Line drawing';
  box.addEventListener('click', e => { const g = e.target.closest('.pp'); if (g) showPart(g.dataset.part, true); });
  box.addEventListener('keydown', e => { const g = e.target.closest('.pp'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showPart(g.dataset.part, true); } });
  showPart(viewPart);
}
function mountPad3d() {
  const hot = $('#pad-hot'), anchors = {};
  hot.innerHTML = PART_ORDER.map((k, i) => `<button type="button" class="hot" data-part="${k}" aria-pressed="${k === viewPart}" aria-label="${PARTS[k].name}"><span>0${i + 1}</span></button>`).join('');
  $$('.hot').forEach(b => { anchors[b.dataset.part] = b; b.addEventListener('click', () => showPart(b.dataset.part, true)); });
  if (qs.has('nopad3d')) { padFallback(); return; }
  import('./repair3d.js').then(m => m.mountPad($('#pad-view'), { canvas: $('#pad-canvas'), reduced, anchors, onPick: k => showPart(k, true) }))
    .then(api => { padApi = api; window.__pd.pad = api.stats; $('#pad-note').textContent = 'Spin it · tap a part'; showPart(viewPart); })
    .catch(() => padFallback('Line drawing · 3D needs WebGL'));
}
showPart(viewPart);
new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); mountPad3d(); } }, { rootMargin: '600px 0px' }).observe($('#repair'));

// ---------------------------------------------------------------- 05 build story
$('#bphotos').innerHTML = STAGES.map((s, i) => `<figure class="bstage-img${i === 0 ? ' is-on' : ''}"><img src="img/${s.img}-sm.webp" srcset="img/${s.img}-sm.webp 600w, img/${s.img}-lg.webp 1200w" sizes="(min-width: 1000px) 22vw, 110px" alt="${esc(s.alt)}" loading="lazy"><figcaption class="mono">Example photography</figcaption></figure>`).join('');
const build = mountBuild($('#btrack'));
let buildFor = '';   // the build story draws the pool from the configurator
onRefresh(() => { const k = JSON.stringify(store.design); if (k !== buildFor) { buildFor = k; build.setDesign(store.design); } });

// ---------------------------------------------------------------- configurator (the design lives in the store)
store.design = defaultDesign();
let tileFn = null;
miniReady.then(m => { if (mini) tileFn = tint => mini.still(240, 240, { split: -1, lane: 0, seed: .7, night: night ? .7 : 0, after: tint }); cfg.draw(); });
// the small water panels follow the lights too
addEventListener('pd-night', () => { labTarget?.update(); caseTargets.forEach(t => t.update()); cfg.draw(); });
const cfg = mountConfigurator($('#cfg'), { get: () => store.design, set: d => set({ design: d }, 'design'), tile: t => tileFn?.(t) ?? null });
let lastRange = '';
onRefresh((d, { msg }) => {
  if (msg === 'design' || !lastRange) { const q = cfg.draw(); const r = kRange(q.range); if (msg === 'design' && r !== lastRange) announce(`Example range ${r}`); lastRange = r; }
});
$('#cfg-consult').addEventListener('click', () => bookFrom({ need: 'build' }));

// ---------------------------------------------------------------- 09 area + zip check
$('#routes').innerHTML = Object.values(ZONES).map(z => `<li><b>${z.name}</b><span class="mono">${z.dayNames}</span></li>`).join('');
$('#zip-form').addEventListener('submit', e => { e.preventDefault(); set({ zip: $('#zip-in').value.trim() }, 'zip'); announce(zipMessage(zipCheck(store.zip))); });
onRefresh(d => {
  $('#map').innerHTML = mapSVG({ active: d.zone?.status === 'in' ? d.zone : null });
  const out = $('#zip-out'), c = d.zone;
  if (document.activeElement !== $('#zip-in')) $('#zip-in').value = store.zip;
  out.textContent = c ? zipMessage(c) : ''; out.className = 'zip-out' + (c?.status === 'in' ? ' is-in' : c?.status === 'nearby' ? ' is-near' : '');
});

// ---------------------------------------------------------------- 10 booking
// Three stages, and the questions follow the service: pool owners describe their pool; a new-pool consult asks about
// the property instead (and only mentions an existing pool if there is one to replace). Photos are optional everywhere.
const STEPS = ['Service & details', 'Where & when', 'Contact & review'];
let maxStep = 0;
$('#stepnav').innerHTML = STEPS.map((s, i) => `<li><button type="button" data-go="${i}">${String(i + 1).padStart(2, '0')} ${s}</button></li>`).join('');
$('#stepnav').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) go(+b.dataset.go); });
function bookFrom(patch) {
  if (store.confirmed) Object.assign(store, { step: 0 });
  set({ ...patch, step: 0 }, 'entry');
  $('#book').scrollIntoView({ behavior: smooth(), block: 'start' });
  setTimeout(() => $(`.step[data-step="0"] h3`).focus({ preventScroll: true }), reduced ? 0 : 700);
  announce(`Booking: ${NEEDS.find(n => n.id === store.need).label}. ${S.D.lines.length ? 'Example range ' + range(S.D.total) : ''}`);
}
function errs(step) {
  const e = {};
  if (step === 0 && !store.need) e.need = 'Choose what you need.';
  if (step === 0 && store.need === 'repair' && !store.part) e.need = 'Choose the part that needs a repair.';
  if (step === 1) {
    const c = zipCheck(store.zip);
    if (c.status === 'invalid') e.zip = 'Enter a 5-digit zip code.'; else if (c.status === 'outside') e.zip = 'That zip is outside the area. This example can’t book it.';
    if (!S.D.slotOk) e.slot = 'Pick a day and an arrival time.';
  }
  if (step === 2) {
    if (!store.contact.name.trim()) e.name = 'Enter your first name.';
    const m = store.contact.mobile.replace(/\D/g, '');
    if (m && !(m.length === 10 || (m.length === 11 && m[0] === '1'))) e.mobile = 'A US mobile number has 10 digits.';
  }
  return e;
}
function showErrs(step, e) {
  if (step === 0) { $('#need-notice').hidden = !e.need; $('#need-notice').textContent = e.need || ''; }
  if (step === 1) {
    $('#err-zip').textContent = e.zip || ''; $('#bk-zip').setAttribute('aria-invalid', !!e.zip);
    $('#time-notice').hidden = !e.slot; $('#time-notice').textContent = e.slot || '';
  }
  if (step === 2) {
    $('#err-name').textContent = e.name || ''; $('#f-name').setAttribute('aria-invalid', !!e.name);
    $('#err-mobile').textContent = e.mobile || ''; $('#f-mobile').setAttribute('aria-invalid', !!e.mobile);
  }
  const first = Object.keys(e)[0];
  if (first) {
    const el = { need: '#need-list input', zip: '#bk-zip', slot: '#days input:not(:disabled)', name: '#f-name', mobile: '#f-mobile' }[first];
    $(el)?.focus(); announce(Object.values(e).join(' '));
  }
  return !first;
}
function go(n, focus = true) {
  if (n > store.step) for (let s = store.step; s < n; s++) { if (!showErrs(s, errs(s))) { if (s !== store.step) go(s); return false; } }
  store.step = n; maxStep = Math.max(maxStep, n);
  drawSteps();
  if (focus) { const h = $(`.step[data-step="${n}"] h3`); h?.focus({ preventScroll: true }); h?.scrollIntoView({ block: 'nearest', behavior: smooth() }); }
  announce(`Step ${n + 1} of 3: ${STEPS[n]}`);
  return true;
}
function drawSteps() {
  const n = store.step, done = store.confirmed;
  $('#bk').hidden = done; $('#done').hidden = !done; $('#stepnav').hidden = done;
  $$('.step').forEach(f => { f.hidden = +f.dataset.step !== n; });
  $$('#stepnav button').forEach((b, i) => { if (i === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.disabled = i > maxStep; });
  $('#back').hidden = n === 0; $('#next').textContent = n === 2 ? 'Preview booking' : 'Next';
}
$('#back').addEventListener('click', () => go(Math.max(0, store.step - 1)));
$('#bk').addEventListener('submit', e => {
  e.preventDefault();
  if (store.step < 2) { go(store.step + 1); return; }
  // confirm: re-check every stage and that the time is still open (the clock may have moved)
  for (let s = 0; s <= 2; s++) if (Object.keys(errs(s)).length) { go(s); showErrs(s, errs(s)); return; }
  const d = derive();
  if (!d.slotOk) { refresh(); go(1); showErrs(1, { slot: 'That time has passed or no longer fits. Pick another time.' }); return; }
  store.confirmed = true; confirmedSig = sig(); drawDone(); drawSteps();
  $('#done-h').focus(); announce('Visit requested, simulated. No visit was booked and nothing was sent.');
});

// stage 1: the service and its details
$('#need-list').innerHTML = NEEDS.map(n => `<label class="opt-row"><input type="radio" name="need" value="${n.id}"><span>${n.label}</span></label>`).join('');
$('#need-list').addEventListener('change', e => set({ need: e.target.value }, 'need'));
$('#need-detail').addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'bk-part') set({ part: t.value || null }, 'need');
  if (t.name === 'bk-tier') set({ plan: { ...store.plan, tier: t.value } }, 'plan');
  if (t.name === 'bk-freq') set({ plan: { ...store.plan, freq: t.value } }, 'plan');
  if (t.name === 'bk-addon') set({ plan: { ...store.plan, addons: $$('#need-detail input[name=bk-addon]:checked').map(i => i.value) } }, 'plan');
  if (t.name === 'bk-season') set({ season: t.value }, 'need');
});
function needDetail(d) {
  switch (store.need) {
    case 'diagnosis': return d.triage
      ? `<p class="mono label">From your Health Check</p><p><strong>${esc(d.triage.cause)}</strong> · safe to swim: ${SWIM[d.triage.swim].label.toLowerCase()} · ${URGENCY[d.triage.urgency].label.toLowerCase()}</p><a class="btn btn--line btn--sm" href="#diagnose">Edit the Health Check</a>`
      : `<p class="mini">No symptoms ticked yet. <a href="#diagnose">Run the Health Check</a>, or carry on and describe it in the notes.</p>`;
    case 'repair': return `<label for="bk-part">Which part?</label><select id="bk-part" name="bk-part"><option value="">Choose a part</option>${PART_ORDER.map(k => `<option value="${k}"${store.part === k ? ' selected' : ''}>${PARTS[k].name} · ${range(PARTS[k].range)}</option>`).join('')}</select>`;
    case 'care': return `<div class="chips" role="radiogroup" aria-label="Plan">${Object.entries(PLANS).map(([k, p]) => `<label class="chip"><input type="radio" name="bk-tier" value="${k}"${store.plan.tier === k ? ' checked' : ''}><span>${p.name}<small>${money(p[store.plan.freq])}/mo</small></span></label>`).join('')}</div>
      <div class="chips" role="radiogroup" aria-label="Frequency" style="margin-top:8px">${[['weekly', 'Weekly'], ['biweekly', 'Every other week']].map(([k, l]) => `<label class="chip chip--sm"><input type="radio" name="bk-freq" value="${k}"${store.plan.freq === k ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <p class="mono label" style="margin-top:20px">Add a seasonal visit</p><div class="chips">${Object.entries(SEASON_ADDONS).map(([k, a]) => `<label class="chip chip--sm"><input type="checkbox" name="bk-addon" value="${k}"${store.plan.addons.includes(k) ? ' checked' : ''}><span>${a.name}<small>${d.plan.includes.includes(k) ? 'included' : range(a.range)}</small></span></label>`).join('')}</div>`;
    case 'season': return `<div class="chips" role="radiogroup" aria-label="Opening or closing">${Object.entries(SEASON_ADDONS).map(([k, a]) => `<label class="chip"><input type="radio" name="bk-season" value="${k}"${store.season === k ? ' checked' : ''}><span>${a.name}<small>${range(a.range)}</small></span></label>`).join('')}</div>`;
    case 'build': return `<p class="mono label">Your design</p><div class="rplan" style="max-width:280px">${planSVG(d.design, { id: 'nd' })}</div><p>${esc(SHAPES[d.design.design.shape].name)}, ${d.design.L} × ${d.design.W} ft · ${kRange(d.design.range)} example range</p><a class="btn btn--line btn--sm" href="#design">Edit the design</a>`;
    case 'water': return `<p class="mini">Test, balance and a written note of what we found. ${range(VISITS.water.range)} example.</p>`;
    default: return '';
  }
}
// the pool (owners) or the property (new pools)
$('#pool-type').innerHTML = Object.entries(POOL_TYPES).map(([k, l]) => `<label class="chip chip--sm"><input type="radio" name="pool-type" value="${k}"><span>${l}</span></label>`).join('');
$('#pool-shape').innerHTML = Object.entries(SHAPES).map(([k, s]) => `<label class="chip chip--sm"><input type="radio" name="pool-shape" value="${k}"><span>${s.name}</span></label>`).join('');
$('#pool-eq').innerHTML = Object.entries(EQUIPMENT).map(([k, l]) => `<label class="chip chip--sm"><input type="checkbox" name="pool-eq" value="${k}"><span>${l}</span></label>`).join('');
$('#prop-old-type').innerHTML = Object.entries(POOL_TYPES).map(([k, l]) => `<label class="chip chip--sm"><input type="radio" name="prop-old-type" value="${k}"><span>${l}</span></label>`).join('');
$('#pool-fields').addEventListener('input', e => {
  const t = e.target, p = { ...store.pool };
  if (t.name === 'pool-type') p.type = t.value;
  if (t.name === 'pool-shape') { p.shape = t.value; const s = SHAPES[p.shape]; p.len = Math.min(s.max, Math.max(s.min, p.len)); }
  if (t.id === 'pool-len') p.len = +t.value;
  if (t.name === 'pool-eq') p.equipment = $$('input[name=pool-eq]:checked').map(i => i.value);
  set({ pool: p }, 'pool');
});
$('#prop-fields').addEventListener('change', e => {
  const t = e.target, q = { ...store.property };
  if (t.name === 'prop-existing') q.existing = t.value;
  if (t.name === 'prop-old-type') q.oldType = t.value;
  if (t.name === 'prop-access') q.access = t.value;
  if (t.name === 'prop-slope') q.slope = t.value;
  set({ property: q }, 'property');
});
// photos (optional; drawn into canvases because the live site's CSP blocks blob: image URLs, and nothing is uploaded)
const PHOTO_PROMPTS = { build: ['The yard', 'The access path'], care: ['The water', 'The equipment pad'], default: ['The water', 'The equipment pad', 'The problem'] };
let photoPrompt = 'Photo', pid = 0, promptsFor = '';
$('#photo-btns').addEventListener('click', e => { const b = e.target.closest('[data-prompt]'); if (!b) return; photoPrompt = b.dataset.prompt; $('#photo-in').click(); });
$('#photo-in').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  const room = 5 - store.photos.length, add = [];
  for (const f of files.slice(0, room)) {
    try {
      const bmp = await createImageBitmap(f), c = document.createElement('canvas'), s = Math.min(bmp.width, bmp.height);
      c.width = c.height = 320; c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 320, 320); bmp.close?.();
      add.push({ id: ++pid, prompt: photoPrompt, name: f.name, canvas: c });
    } catch { $('#photo-notice').hidden = false; $('#photo-notice').textContent = `${f.name} can’t be previewed here. Try a JPEG or PNG.`; }
  }
  if (files.length > room) { $('#photo-notice').hidden = false; $('#photo-notice').textContent = 'Up to five photos. The extra ones were left out.'; }
  if (add.length) { set({ photos: [...store.photos, ...add] }, 'photos'); announce(`${add.length} photo${add.length > 1 ? 's' : ''} added. ${store.photos.length} of 5.`); }
});
$('#thumbs').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; set({ photos: store.photos.filter(p => p.id !== +b.dataset.rm) }, 'photos'); announce(`Photo removed. ${store.photos.length} of 5.`); $('#photo-btns button')?.focus(); });
const thumb = (p, size) => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(p.canvas, 0, 0, size, size); c.setAttribute('role', 'img'); c.setAttribute('aria-label', `${p.prompt}: ${p.name}`); return c; };
// stage 2: where and when
$('#bk-zip').addEventListener('input', e => set({ zip: e.target.value.trim() }, 'zip'));
$('#days').addEventListener('change', e => set({ slot: null, _day: e.target.value }, 'day'));
$('#times').addEventListener('change', e => set({ slot: { day: store._day, m: +e.target.value } }, 'slot'));
// stage 3: contact, then the review
$('#f-name').addEventListener('input', e => set({ contact: { ...store.contact, name: e.target.value } }, 'contact'));
$('#f-mobile').addEventListener('input', e => set({ contact: { ...store.contact, mobile: e.target.value } }, 'contact'));
$('#f-notes').addEventListener('input', e => set({ notes: e.target.value }, 'notes'));
$('#sample').addEventListener('click', () => { set({ contact: { name: 'Dana', mobile: '(973) 555-0142' }, notes: store.notes || 'Gate code 1234. The dog is friendly.' }, 'contact'); showErrs(2, {}); });
// review edits
document.addEventListener('click', e => {
  const b = e.target.closest('[data-edit]'); if (!b) return;
  const to = b.dataset.edit;
  if (to === 'diagnose' || to === 'design') { $('#' + to).scrollIntoView({ behavior: smooth() }); return; }
  if (store.confirmed) { store.confirmed = false; }
  if (to === 'contact') { go(2); $('#f-name').focus(); $('#f-name').scrollIntoView({ block: 'center', behavior: smooth() }); return; }
  go(+to);
});
$('#restart').addEventListener('click', () => {
  Object.assign(store, { contact: { name: '', mobile: '' }, notes: '', photos: [], slot: null, step: 0, confirmed: false });
  maxStep = 0; confirmedSig = ''; refresh('restart');
  $('#f-name').value = ''; $('#f-mobile').value = ''; $('#f-notes').value = '';
  $('.step[data-step="0"] h3').focus(); announce('New booking started. Contact, notes and photos were cleared.');
});
store.step = 0;
let confirmedSig = '';
const sig = () => summary(false) + bill() + store.photos.map(p => p.id).join();   // what the confirmation showed
function summary(edit) {
  const d = S.D, q = store.property, E = n => (edit ? `<button type="button" class="edit" data-edit="${n}">Edit</button>` : '');
  const row = (dt, dd, n) => `<div><dt class="mono">${dt}</dt><dd>${dd}</dd>${E(n)}</div>`;
  const rows = [row('Visit', `${esc(d.visitName || '')}${d.urgencyLabel && d.urgency !== 'route' ? ` · <strong>${d.urgencyLabel.toLowerCase()}</strong>` : ''}`, 0)];
  if (store.need === 'diagnosis' && d.triage) rows.push(row('Health Check', `${esc(d.triage.cause)} · safe to swim: ${SWIM[d.triage.swim].label.toLowerCase()}${d.triage.readings.ph != null ? ` · pH ${d.triage.readings.ph}` : ''}${d.triage.readings.cl != null ? ` · Cl ${d.triage.readings.cl} ppm` : ''}`, 'diagnose'));
  if (store.need === 'repair' && store.part) rows.push(row('Part', PARTS[store.part].name, 0));
  if (store.need === 'care') rows.push(row('Plan', `${d.plan.name} · ${store.plan.freq === 'weekly' ? 'weekly' : 'every other week'} · ${money(d.plan.monthly)}/mo`, 0));
  if (store.need === 'build') {
    rows.push(row('Proposed design', `${esc(SHAPES[d.design.design.shape].name)}, ${d.design.L} × ${d.design.W} ft · ${DEPTHS[d.design.design.depth].name.toLowerCase()} depth · ${kRange(d.design.range)}<div class="rplan">${planSVG(d.design, { id: edit ? 'rv' : 'dn' })}</div>`, 'design'));
    rows.push(row('Property', `${ACCESS[q.access]} · ${SLOPE[q.slope]} · ${q.existing === 'yes' ? `replacing an existing ${POOL_TYPES[q.oldType].toLowerCase()} pool` : 'no pool there now'}`, 0));
  } else {
    rows.push(row('Your pool', `${POOL_TYPES[store.pool.type]} · ${SHAPES[store.pool.shape].name.toLowerCase()}, about ${store.pool.len} ft · ${store.pool.equipment.map(k => EQUIPMENT[k].toLowerCase()).join(', ') || 'no equipment listed'}`, 0));
  }
  if (store.photos.length) rows.push(row('Photos', `${store.photos.length} photo${store.photos.length > 1 ? 's' : ''}<div class="rthumbs"></div>`, 0));
  rows.push(row('Where', d.zone ? `${esc(store.zip)} · ${esc(zipMessage(d.zone))}` : '—', 1));
  rows.push(row('When', store.slot ? `${fmtDay(store.slot.day)}, ${fmtTime(store.slot.m)} arrival · New York time · about ${hrs(d.minutes)}` : '—', 1));
  rows.push(row('Contact', `${esc(store.contact.name)}${store.contact.mobile ? ' · ' + esc(store.contact.mobile) : ''}`, 'contact'));
  if (store.notes.trim()) rows.push(row('Notes', esc(store.notes), 'contact'));
  return rows.join('');
}
function bill() {
  const d = S.D;
  return `<ul>${d.lines.map(l => `<li><span>${esc(l.label)}${l.note ? ` <small class="mono">${esc(l.note)}</small>` : ''}</span><span>${l.monthly ? money(l.monthly) + '/mo' : range(l.range)}</span></li>`).join('')}</ul>
    <p class="tot"><span>${d.monthly ? 'Visit today' : 'Example total'}</span><span data-k="total">${range(d.total)}</span></p>
    ${d.monthly ? `<p class="tot"><span>Then monthly</span><span>${money(d.monthly)}</span></p>` : ''}
    ${store.need === 'build' ? `<p class="tot"><span>Project, example range</span><span>${kRange(d.design.range)}</span></p>` : ''}
    <p class="fine">Example prices for a fictional company. A technician confirms on site; nothing is charged here.</p>`;
}
function fillThumbs(root) { const box = $('.rthumbs', root); if (box) for (const p of store.photos) box.append(thumb(p, 64)); }
function drawDone() {
  $('#done-list').innerHTML = summary(false); fillThumbs($('#done-list')); $('#done-bill').innerHTML = bill();
  $('#ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics());
  $('#done-h').firstChild.textContent = `Visit requested · ${confirmCode()} `;
}
onRefresh((d, { msg, notes }) => {
  if (store.confirmed && sig() !== confirmedSig) { store.confirmed = false; store.step = 2; notes = [...notes, 'Your booking changed after the preview, so here is the review again with the latest details.']; }
  if (store.confirmed) { drawSteps(); return; }
  $$('#need-list input').forEach(i => { i.checked = i.value === store.need; });
  { const nd = $('#need-detail'), a = document.activeElement, keep = nd.contains(a) ? { name: a.name, value: a.value, sel: a.tagName === 'SELECT' } : null;
    if (!keep?.sel) { nd.innerHTML = needDetail(d); if (keep) nd.querySelector(`[name="${keep.name}"][value="${keep.value}"]`)?.focus({ preventScroll: true }); } }
  if (store.need) $('#need-notice').hidden = true;
  // which detail questions apply
  const build = store.need === 'build';
  $('#pool-fields').hidden = !store.need || build; $('#prop-fields').hidden = !build; $('#photos-dt').hidden = !store.need;
  $('#prop-old').hidden = store.property.existing !== 'yes';
  for (const [name, v] of [['prop-existing', store.property.existing], ['prop-old-type', store.property.oldType], ['prop-access', store.property.access], ['prop-slope', store.property.slope]]) $$(`input[name=${name}]`).forEach(i => { i.checked = i.value === v; });
  $$('input[name=pool-type]').forEach(i => { i.checked = i.value === store.pool.type; });
  $$('input[name=pool-shape]').forEach(i => { i.checked = i.value === store.pool.shape; });
  $$('input[name=pool-eq]').forEach(i => { i.checked = store.pool.equipment.includes(i.value); });
  const ps = SHAPES[store.pool.shape], pd = dims(store.pool.shape, store.pool.len);
  const pl = $('#pool-len'); pl.min = ps.min; pl.max = ps.max; pl.value = pd.L;
  const gal = Math.round(pd.area * 4.6 * 7.48 / 500) * 500;
  $('#pool-len-o').textContent = `${pd.L} × ${pd.W} ft · about ${gal.toLocaleString('en-US')} gal`; pl.setAttribute('aria-valuetext', `${pd.L} by ${pd.W} feet, about ${gal.toLocaleString('en-US')} gallons`);
  $('#pool-outline').innerHTML = `<svg viewBox="-10 -10 ${pd.L * 5 + 20} ${pd.W * 5 + 20}" preserveAspectRatio="xMinYMid meet"><path d="${shapePath(store.pool.shape, pd.L, pd.W)}" fill="#8FD3E0" stroke="#D9D2C4" stroke-width="6"/></svg>`;
  // photos
  const pk = build ? 'build' : store.need === 'care' ? 'care' : 'default';
  if (promptsFor !== pk) { promptsFor = pk; $('#photo-btns').innerHTML = PHOTO_PROMPTS[pk].map(x => `<button type="button" class="btn btn--line btn--sm" data-prompt="${x}">+ ${x}</button>`).join(''); }
  const th = $('#thumbs'); th.innerHTML = '';
  for (const p of store.photos) { const li = document.createElement('li'); li.append(thumb(p, 320)); li.insertAdjacentHTML('beforeend', `<p>${esc(p.prompt)}</p><button type="button" data-rm="${p.id}">Remove<span class="sr-only"> ${esc(p.prompt)} photo</span></button>`); th.append(li); }
  $$('#photo-btns button').forEach(b => { b.disabled = store.photos.length >= 5; });
  if (store.photos.length < 5 && msg === 'photos') $('#photo-notice').hidden = true;
  if (store.photos.length) $('#photos-dt').open = true;
  // where
  if (document.activeElement !== $('#bk-zip')) $('#bk-zip').value = store.zip;
  const z = d.zone; $('#bk-zip-out').textContent = z && z.status !== 'invalid' ? zipMessage(z) : ''; $('#bk-zip-out').className = 'zip-out' + (z?.status === 'in' ? ' is-in' : z?.status === 'nearby' ? ' is-near' : '');
  if (z && z.status !== 'invalid' && z.status !== 'outside') $('#err-zip').textContent = '';
  // when
  const zoneTxt = z?.status === 'in' ? `${ZONES[z.zone].name} route days: ${ZONES[z.zone].dayNames}` : 'Add your zip to see your route days';
  $('#when-meta').textContent = `${zoneTxt} · New York time · about ${hrs(d.minutes)} on site${d.urgency === '48h' ? ' · within 48 hours first' : ''}`;
  if (!store._day || !d.slots.some(s => s.key === store._day && s.times.length)) store._day = store.slot?.day || d.slots.find(s => s.times.length)?.key;
  $('#days').innerHTML = d.slots.map(s => `<label><input type="radio" name="day" value="${s.key}"${s.key === store._day ? ' checked' : ''}${s.times.length ? '' : ' disabled'}><span class="d"><span class="dw">${fmtDay(s.key, { weekday: 'short' })}</span><span class="dn">${+s.key.slice(8)}</span><span class="dw">${fmtDay(s.key, { month: 'short' })}</span>${s.priority && s.times.length ? '<span class="dp">48 h</span>' : ''}<span class="sr-only">${s.times.length ? '' : ' (no openings)'}${s.priority ? ' (priority, within 48 hours)' : ''}</span></span></label>`).join('');
  const day = d.slots.find(s => s.key === store._day);
  $('#times').innerHTML = (day?.times || []).map(m => `<label><input type="radio" name="time" value="${m}"${store.slot && store.slot.day === day.key && store.slot.m === m ? ' checked' : ''}><span>${fmtTime(m)}</span></label>`).join('') || '<p>No openings this day.</p>';
  const tn = $('#time-notice');
  if (notes.length) { tn.hidden = false; tn.textContent = notes[0]; announce(notes.join(' ')); } else if (msg === 'slot') tn.hidden = true;
  // contact fields mirror the store (they are only written when the store changed elsewhere)
  for (const [id, v] of [['#f-name', store.contact.name], ['#f-mobile', store.contact.mobile], ['#f-notes', store.notes]]) if (document.activeElement !== $(id) && $(id).value !== v) $(id).value = v;
  // review
  $('#review-list').innerHTML = summary(true); fillThumbs($('#review-list')); $('#review-bill').innerHTML = bill();
  const rn = $('#review-notice'); const reopened = notes.find(n => /after the preview/.test(n));
  if (reopened) { rn.hidden = false; rn.textContent = 'Your booking changed after the preview. This review shows the latest details.'; maxStep = 2; }
  else if (msg === 'restart' || msg === 'entry') rn.hidden = true;
  // the running summary
  $('#bb-visit').textContent = d.visitName ? d.visitName : 'Choose what you need';
  $('#bb-range').textContent = store.need ? (d.monthly ? `${money(d.monthly)}/mo` : range(d.total)) : '';
  $('#bb-meta').textContent = store.need ? [`About ${hrs(d.minutes)}`, d.urgency !== 'route' ? d.urgencyLabel : '', store.slot ? `${fmtDay(store.slot.day, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(store.slot.m)}` : '', 'example'].filter(Boolean).join(' · ') : 'Nothing is sent';
  if (msg && ['need', 'plan', 'part', 'pool', 'zip', 'design', 'triage'].includes(msg) && store.need && $('#book-ui').getBoundingClientRect().top < innerHeight) announce(`Visit: ${d.visitName}, ${d.monthly ? money(d.monthly) + ' a month' : range(d.total)}.`);
  drawSteps();
});

// ---------------------------------------------------------------- touch sliders: on phones a range input only moves when
// the tiny thumb is grabbed; here a touch anywhere on the track jumps there and follows the finger sideways. Vertical
// swipes still scroll (touch-action: pan-y pinch-zoom).
function touchRange(el) {
  let on = null; const host = el.parentElement;
  const onTrack = e => { const r = el.getBoundingClientRect(); return e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6 && e.clientX >= r.left - 6 && e.clientX <= r.right + 6; };
  const setX = x => {
    const r = el.getBoundingClientRect(), min = +el.min, max = +el.max, st = +el.step || 1, th = 24;
    const k = Math.min(1, Math.max(0, (x - r.left - th / 2) / (r.width - th)));
    const v = Math.round((min + k * (max - min)) / st) * st, val = String(+v.toFixed(4));
    if (el.value !== val) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  // the native control ignores touches (CSS: pointer-events none on coarse pointers) so a scroll that starts on it can't
  // nudge the value; its parent listens instead. Keyboard and mouse use the native control as usual.
  host.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || !onTrack(e)) return; on = { x: e.clientX, y: e.clientY, moved: false }; });
  host.addEventListener('pointermove', e => { if (!on) return; if (!on.moved && Math.abs(e.clientX - on.x) > 4 && Math.abs(e.clientX - on.x) > Math.abs(e.clientY - on.y)) on.moved = true; if (on.moved) setX(e.clientX); });
  host.addEventListener('pointerup', e => { if (on && !on.moved && Math.abs(e.clientY - on.y) < 10) setX(e.clientX); on = null; });   // a tap, not a scroll
  host.addEventListener('pointercancel', () => { on = null; });
}
$$('input[type=range]').forEach(touchRange);

// ---------------------------------------------------------------- before/after: arrows and a counter for the sideways gallery
{
  const list = $('#case-list'), cards = $$('.case', list), prev = $('#case-prev'), nxt = $('#case-next');
  const idx = () => { const l = list.getBoundingClientRect().left; let best = 0, d = 1e9; cards.forEach((c, i) => { const dd = Math.abs(c.getBoundingClientRect().left - l - parseFloat(getComputedStyle(list).scrollPaddingLeft || 0)); if (dd < d) { d = dd; best = i; } }); return best; };
  const sync = () => { const i = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4 ? cards.length - 1 : idx(); $('#case-count').textContent = `0${i + 1} / 0${cards.length}`; prev.disabled = list.scrollLeft < 4; nxt.disabled = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4; };
  const go = d => { const i = Math.min(cards.length - 1, Math.max(0, idx() + d)); list.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: smooth() }); };
  prev.addEventListener('click', () => go(-1)); nxt.addEventListener('click', () => go(1));
  list.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true }); addEventListener('resize', sync); sync();
}

// ---------------------------------------------------------------- reveals, waterlines, parallax, magnetic buttons
(() => {
  const els = $$('[data-reveal]'), lines = $$('.waterline');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-visible')); return; }
  const n = new Map(); els.forEach(e => { const p = e.parentElement, i = n.get(p) || 0; e.style.setProperty('--d', i * .08 + 's'); n.set(p, i + 1); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add(e.target.classList.contains('waterline') ? 'is-in' : 'is-visible'); io.unobserve(e.target); } }), { threshold: .01, rootMargin: '0px 0px -8% 0px' });
  [...els, ...lines].forEach(e => io.observe(e));
  setTimeout(() => els.forEach(e => { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('is-visible'); }), 1500);
  const photos = $$('.photo img'); let pf = 0;
  const para = () => { pf = 0; for (const im of photos) { const r = im.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue; const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; im.style.setProperty('--py', Math.max(-28, Math.min(28, -k * 40)).toFixed(1) + 'px'); } };
  addEventListener('scroll', () => { if (!pf) pf = requestAnimationFrame(para); }, { passive: true }); para();
})();

// ---------------------------------------------------------------- start
window.__pd = { store, get D() { return S.D; }, set, refresh, go: n => go(n), derive, clock, water: null, pad: null, frames: () => window.__pd.water?.frames ?? 0 };
refresh();
window.__ready = true;
