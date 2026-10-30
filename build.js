// Dirt to Dive: a cross-section built in six stages. Pick a stage (buttons, arrow keys, Previous / Next) and that stage
// plays over about a second: progress 0..1 across the six stages drives every layer. No long scroll track. Works without
// WebGL; the stage name and sentence are live for screen readers; reduced motion jumps straight to the finished stage.

import { PROFILES, SHAPES, DEPTHS } from './configurator.js';

export const STAGES = [
  { name: 'Dig', day: 1, img: 'dig', alt: 'A mini excavator digging in a backyard', say: 'The shape we drew together is staked out and dug. Spoil leaves the same week.' },
  { name: 'Steel', day: 6, img: 'steel', alt: 'A grid of steel rebar, tied the way a pool shell is reinforced', say: 'A rebar cage ties the shell together. The town inspects it before any concrete goes in.' },
  { name: 'Gunite', day: 10, img: 'shell', alt: 'An empty pool shell with steps', say: 'Concrete is sprayed over the steel and shaped by hand, then cures for about three weeks.' },
  { name: 'Plaster & tile', day: 32, img: 'plaster', alt: 'Close-up of a smooth troweled plaster surface', say: 'Waterline tile, coping stone and a hand-troweled plaster finish go on.' },
  { name: 'Fill', day: 38, img: 'water-light', alt: 'Sunlight moving across clear pool water', say: 'The hose runs for about a day. Chemistry starts the minute it is full.' },
  { name: 'Swim', day: 42, img: 'dusk-pool', alt: 'A lit rectangular pool beside a modern house at dusk', say: 'Walk-through, a start-up visit, and your first week of care is on us.' },
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * (3 - 2 * t);
// the side section follows the visitor's design: the floor is its depth profile, 26 px per foot, across the pool
const FT = 26, X0 = 150, X1 = 850;
const floor = (depth, k = 1) => PROFILES[depth].map(([f, ft]) => [X0 + f * (X1 - X0), 200 + ft * FT * k]);
const shellOf = depth => `M${X0} 200 ` + floor(depth).map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ` L${X1} 200 Z`;

export function mountBuild(root, { design } = {}) {
  const $ = s => root.querySelector(s), n = STAGES.length, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seg = (p, i) => clamp(p * n - i);
  const START = i => i / n + .002, END = i => (i + 1) / n - .002;
  let last = -1, depth = 'sport', deepest = 200 + 6 * FT, stage = 0, cur = reduced ? END(0) : START(0), raf = 0, played = false, touched = false, scrubbing = false, playing = 0;
  const imgs = [...root.querySelectorAll('.bstage-img')], btns = [...root.querySelectorAll('.bsteps button')];
  function render(p = cur) {
    cur = p;
    if (!Number.isFinite(p)) p = cur = START(0);
    const s = Math.min(n - 1, Math.max(0, Math.floor(p * n)));
    const d = ease(seg(p, 0));   // dig: the hole deepens toward the design's floor
    $('#b-hole').setAttribute('d', `M${X0} 200 ` + floor(depth, d).map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ` L${X1} 200 Z`);
    const pile = 64 * d * (1 - ease(seg(p, 2)));
    $('#b-pile').setAttribute('d', `M872 200 Q930 ${200 - pile} 994 200 Z`);
    $('#b-steel').style.opacity = ease(seg(p, 1)) * (1 - ease(seg(p, 2)) * .85);
    $('#b-stamp').style.opacity = ease(clamp(seg(p, 1) * 2 - .6)) * (1 - ease(seg(p, 2)));
    $('#b-shell').style.opacity = ease(seg(p, 2));
    const pl = ease(seg(p, 3));
    for (const id of ['#b-plaster', '#b-tile', '#b-coping']) $(id).style.opacity = pl;
    const fill = ease(seg(p, 4)), top = deepest - (deepest - 212) * fill;
    $('#b-water').setAttribute('y', top); $('#b-water').setAttribute('height', deepest - top + 2);
    $('#b-surface').setAttribute('d', fill > .02 ? `M150 ${top} Q320 ${top - 4} 500 ${top} T850 ${top}` : '');
    $('#b-swim').style.opacity = ease(seg(p, 5));
    const a = STAGES[s], b = STAGES[Math.min(n - 1, s + 1)];
    const day = s === n - 1 ? 42 : Math.max(a.day, Math.min(b.day - 1, Math.floor(a.day + (b.day - a.day) * seg(p, s))));
    $('#b-day').textContent = `Day ${String(day).padStart(2, '0')} of 42`;
    const sc = $('#b-scrub'); if (sc && !scrubbing) sc.value = Math.round(p * 1000); $('#b-scrub-o').textContent = `Day ${String(day).padStart(2, '0')}`;
    if (s !== last) {
      last = s; $('#b-stage').textContent = a.name; $('#b-say').textContent = a.say;
      btns.forEach((li, i) => { li.classList.toggle('is-on', i === s); li.setAttribute('aria-current', i === s ? 'step' : 'false'); });
      imgs.forEach((im, i) => im.classList.toggle('is-on', i === s));
    }
  }
  // selecting a stage plays that stage from its start to its end (earlier stages snap to finished, later ones undo)
  function setStage(i, animate = !reduced) {
    clearTimeout(playing); playing = 0;
    stage = Math.min(n - 1, Math.max(0, i));
    $('#b-prev').disabled = stage === 0; $('#b-next').disabled = stage === n - 1;
    $('#b-next').textContent = stage === n - 1 ? 'Finished' : `Next: ${STAGES[stage + 1].name}`;
    cancelAnimationFrame(raf);
    const from = START(stage), to = END(stage);
    if (!animate) { render(to); return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); render(from + (to - from) * e); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  const pick = i => { touched = true; setStage(i); };
  // the scrubber: drag through the whole build, day 1 to 42
  const scrub = $('#b-scrub');
  scrub.addEventListener('input', () => { touched = true; clearTimeout(playing); playing = 0; cancelAnimationFrame(raf); scrubbing = true; const p = Math.min(.998, Math.max(.002, +scrub.value / 1000)); render(p); scrubbing = false;
    stage = Math.min(n - 1, Math.floor(p * n)); $('#b-prev').disabled = stage === 0; $('#b-next').disabled = stage === n - 1; $('#b-next').textContent = stage === n - 1 ? 'Finished' : `Next: ${STAGES[stage + 1].name}`; });
  // Play all: the six stages one after another (about 8 seconds); reduced motion jumps to the finished pool
  $('#b-play').addEventListener('click', () => {
    touched = true;
    if (reduced) { setStage(n - 1, false); return; }
    let i = 0; const go = () => { setStage(i); if (i < n - 1) { i++; playing = setTimeout(go, 1300); } }; go();
  });
  btns.forEach((btn, i) => btn.addEventListener('click', () => pick(i)));
  $('#b-prev').addEventListener('click', () => pick(stage - 1));
  $('#b-next').addEventListener('click', () => pick(stage + 1));
  root.querySelector('.bsteps').addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    e.preventDefault(); pick(stage + k); btns[stage].focus();
  });
  // the dig plays by itself the first time the section comes into view (unless a stage was already picked)
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !played) { played = true; if (!touched) setStage(0); } }, { threshold: .25 }).observe(root);
  // set the pool being built (from the configurator): shell, steel, plaster and the clip all follow its floor
  function setDesign(dz) {
    depth = dz?.depth && PROFILES[dz.depth] ? dz.depth : 'sport';
    const path = shellOf(depth); deepest = Math.max(...floor(depth).map(p => p[1]));
    for (const el of root.querySelectorAll('#hole path, #b-steel path, #b-shell, #b-plaster')) el.setAttribute('d', path);
    const tag = root.querySelector('#b-yours');
    if (tag && dz) { const s = SHAPES[dz.shape], L = Math.min(s.max, Math.max(s.min, dz.len)), W = Math.round(L * s.aspect);
      tag.textContent = `Your design: ${L} × ${W} ft ${s.name.toLowerCase()} · ${DEPTHS[depth].name.toLowerCase()} depth`; }
    render();
  }
  if (design) setDesign(design()); else render();
  return { render, setDesign, setStage, get stage() { return stage; } };
}
