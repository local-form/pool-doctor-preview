// New pool configurator: shape, size, depth, interior and extras -> a top-down plan and an example price range.
// designQuote(design) is pure (the booking and the tests use it); mountConfigurator() draws the controls and plan.

export const SHAPES = {
  rect:   { name: 'Rectangle', aspect: .5,  min: 24, max: 48, def: 32 },
  l:      { name: 'L-shape',   aspect: .56, min: 28, max: 48, def: 36 },
  free:   { name: 'Freeform',  aspect: .55, min: 24, max: 44, def: 32 },
  lap:    { name: 'Lap',       aspect: .2,  min: 40, max: 75, def: 50 },
  plunge: { name: 'Plunge',    aspect: .6,  min: 10, max: 18, def: 14 },
};
export const DEPTHS = {
  sport:  { name: 'Sport', note: '3½ to 6 ft', avg: 4.75, add: 2000 },
  flat:   { name: 'Flat', note: '4 to 5 ft', avg: 4.5, add: 0 },
  diving: { name: 'Diving', note: '3½ to 8½ ft', avg: 5.6, add: 7000, minLen: 34, not: ['plunge', 'lap'] },
  beach:  { name: 'Beach entry', note: '0 to 5 ft', avg: 3.7, add: 5000, not: ['plunge', 'lap'] },
};
export const INTERIORS = {
  plaster: { name: 'White plaster', add: 0, tint: [1, 0, 1, 1] },
  pebble:  { name: 'Pebble', add: 9000, tint: [1, .12, .9, 1] },
  glass:   { name: 'Glass tile line', add: 6000, tint: [1, 0, 1.1, 1] },
};
export const EXTRAS = {
  spa:    { name: 'Spa', add: 18000 },
  shelf:  { name: 'Sun shelf', add: 6000, not: ['plunge', 'lap'] },
  led:    { name: 'LED lighting', add: 2500 },
  cover:  { name: 'Automatic cover', add: 14000, not: ['free', 'l'], why: 'Automatic covers need straight sides.' },
  heater: { name: 'Heater', add: 5500 },
};
export const APR = 8.99, DOWN = .2;
export const defaultDesign = () => ({ shape: 'rect', len: 32, depth: 'sport', interior: 'plaster', extras: ['led'], term: 15 });

export function dims(shape, len) {
  const s = SHAPES[shape], L = Math.min(s.max, Math.max(s.min, len)), W = Math.round(L * s.aspect);
  const area = shape === 'l' ? L * W - .4 * L * .45 * W : shape === 'free' ? .8 * L * W : L * W;
  const perim = shape === 'free' ? 2.6 * (L + W) / 2 * 1.1 : 2 * (L + W);
  return { L, W, area, perim };
}
// the rules: which depths and extras each shape allows
export function allowed(d) {
  const { L } = dims(d.shape, d.len);
  const depthOk = k => !(DEPTHS[k].not || []).includes(d.shape) && L >= (DEPTHS[k].minLen || 0);
  const depthShapeOk = k => !(DEPTHS[k].not || []).includes(d.shape);   // the chip stays tappable; picking it lengthens the pool
  const extraOk = k => !(EXTRAS[k].not || []).includes(d.shape);
  return { depthOk, depthShapeOk, extraOk };
}
export function normalize(d) {
  const n = { ...d, extras: [...d.extras] }, s = SHAPES[n.shape];
  n.len = Math.min(s.max, Math.max(s.min, n.len));
  const { depthOk, extraOk } = allowed(n);
  if (!depthOk(n.depth)) n.depth = 'sport';
  n.extras = n.extras.filter(extraOk);
  return n;
}
const k1000 = v => Math.round(v / 1000) * 1000;
export function designQuote(d0) {
  const d = normalize(d0), { L, W, area, perim } = dims(d.shape, d.len), dp = DEPTHS[d.depth];
  const base = 38000 + area * 60 + perim * 110;
  const parts = [
    { label: `${SHAPES[d.shape].name} shell, ${L} × ${W} ft`, v: base },
    { label: `${dp.name} depth`, v: dp.add },
    { label: INTERIORS[d.interior].name, v: INTERIORS[d.interior].add },
    ...d.extras.map(k => ({ label: EXTRAS[k].name, v: EXTRAS[k].add })),
  ];
  const mid = parts.reduce((a, p) => a + p.v, 0);
  const lo = k1000(mid * .92), hi = k1000(mid * 1.14);
  const gallons = Math.round(area * dp.avg * 7.48 / 500) * 500;
  const P = (lo + hi) / 2 * (1 - DOWN), r = APR / 100 / 12, n = d.term * 12;
  const monthly = Math.round(P * r / (1 - (1 + r) ** -n));
  return { design: d, L, W, area: Math.round(area), gallons, range: [lo, hi], parts, monthly, term: d.term };
}

// ---- the drawing: a plan in feet, 5 px per foot, centred in a 420 x 280 box ----
const PX = 5;
export function shapePath(shape, L, W, px = PX) {
  const l = L * px, w = W * px;
  switch (shape) {
    case 'l': return `M0 0H${l}V${w * .55}H${l * .6}V${w}H0Z`;
    case 'free': return `M${l * .08} ${w * .2}C${l * .2} ${-w * .08} ${l * .55} ${w * .12} ${l * .72} ${w * .04}C${l * .92} ${-w * .04} ${l * 1.03} ${w * .35} ${l * .96} ${w * .62}`
      + `C${l * .9} ${w * .9} ${l * .7} ${w * 1.02} ${l * .48} ${w * .9}C${l * .3} ${w * .8} ${l * .16} ${w * 1.02} ${l * .05} ${w * .82}C${-l * .04} ${w * .66} ${-l * .02} ${w * .36} ${l * .08} ${w * .2}Z`;
    default: { const r = shape === 'plunge' ? 10 : 3; return `M${r} 0H${l - r}Q${l} 0 ${l} ${r}V${w - r}Q${l} ${w} ${l - r} ${w}H${r}Q0 ${w} 0 ${w - r}V${r}Q0 0 ${r} 0Z`; }
  }
}
export function planSVG(q, { tile = null, id = 'plan' } = {}) {
  const { design: d, L, W } = q, px = Math.min(PX, 290 / L), l = L * px, w = W * px, ox = (400 - l) / 2, oy = Math.max(30, (226 - w) / 2 + 4);   // long lap pools are drawn a little smaller
  const ex = new Set(d.extras), path = shapePath(d.shape, L, W, px);
  const fill = tile ? `url(#${id}-w)` : `url(#${id}-g)`;
  const spa = ex.has('spa') ? `<circle cx="${l + 2}" cy="${-4}" r="${Math.round(Math.min(26, Math.max(13, w * .42)))}" fill="${fill}" stroke="#D9D2C4" stroke-width="8"/>` : '';
  const shelf = ex.has('shelf') ? `<path d="M0 0H${Math.min(40, l * .2)}V${d.shape === 'l' ? w : w}H0Z" fill="#E6F4F4" opacity=".55" clip-path="url(#${id}-c)"/>` : '';
  const led = ex.has('led') ? [.25, .5, .75].map(f => `<circle cx="${l * f}" cy="${d.shape === 'l' ? 4 : w - 4}" r="2.6" fill="#FFF6DA"/>`).join('') : '';
  const cover = ex.has('cover') ? `<path d="M-6 -6V${w + 6}M${l + 6} -6V${w + 6}" stroke="#7A6E5B" stroke-width="2" stroke-dasharray="2 4"/>` : '';
  const lane = d.shape === 'lap' ? `<path d="M10 ${w / 2}H${l - 10}" stroke="#0B3B4D" stroke-width="3" opacity=".7"/>` : '';
  const pebble = d.interior === 'pebble' ? `<rect width="${l}" height="${w}" fill="url(#${id}-p)" clip-path="url(#${id}-c)" opacity=".5"/>` : '';
  const glass = d.interior === 'glass' ? `<path d="${path}" fill="none" stroke="#0E5A78" stroke-width="5" clip-path="url(#${id}-c)"/>` : '';
  return `<svg viewBox="0 0 420 300" role="img" aria-label="Top-down plan: ${q.design.shape === 'free' ? 'freeform' : SHAPES[d.shape].name.toLowerCase()} pool, ${L} by ${W} feet" xmlns="http://www.w3.org/2000/svg">
<defs>
  <clipPath id="${id}-c"><path d="${path}"/></clipPath>
  <linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3E0"/><stop offset="1" stop-color="#0F6E8C"/></linearGradient>
  ${tile ? `<pattern id="${id}-w" y="-40" width="240" height="240" patternUnits="userSpaceOnUse"><image href="${tile}" width="240" height="240" preserveAspectRatio="none"/></pattern>` : ''}
  <pattern id="${id}-p" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#6E8C86"/><circle cx="5" cy="4.5" r=".8" fill="#A9BDB8"/></pattern>
</defs>
<g transform="translate(${ox} ${oy})">
  <path d="${path}" fill="none" stroke="#D9D2C4" stroke-width="14" stroke-linejoin="round"/>
  <path d="${path}" fill="none" stroke="#B8AC97" stroke-width="1" transform="translate(0 0)" stroke-linejoin="round" opacity=".6"/>
  ${spa}
  <path d="${path}" fill="${fill}"/>
  ${pebble}${shelf}${glass}${lane}${led}${cover}
  <g font-family="Geist Mono, ui-monospace, monospace" font-size="13" fill="#5E5545" letter-spacing=".08em">
    <path d="M0 -22V-14M${l} -22V-14M0 -18H${l}" stroke="#8C8170" stroke-width="1"/>
    <text x="${l / 2}" y="-26" text-anchor="middle">${L} FT</text>
    <path d="M${l + 18} 0H${l + 26}M${l + 18} ${w}H${l + 26}M${l + 22} 0V${w}" stroke="#8C8170" stroke-width="1"/>
    <text x="${l + 32}" y="${w / 2 + 4}">${W} FT</text>
  </g>
</g>
${profileSVG(d)}</svg>`;
}
// a side section of the floor under the plan: depth along the pool's length, 4 px per foot
export const PROFILES = { sport: [[0, 3.5], [.3, 3.5], [.5, 6], [.7, 3.5], [1, 3.5]], flat: [[0, 4], [1, 5]], diving: [[0, 3.5], [.35, 3.5], [.6, 8.5], [.78, 8.5], [1, 6.5]], beach: [[0, 0], [.35, 2], [.6, 4], [1, 5]] };
function profileSVG(d) {
  const w = 300, x0 = 60, y0 = 258, pts = PROFILES[d.depth].map(([f, ft]) => `${x0 + f * w} ${y0 + ft * 4}`);
  return `<g class="profile"><text x="${x0}" y="${y0 - 10}" font-family="Geist Mono, ui-monospace, monospace" font-size="13" fill="#5E5545" letter-spacing=".06em">DEPTH · ${DEPTHS[d.depth].name.toUpperCase()} · ${DEPTHS[d.depth].note.toUpperCase()}</text>
<path d="M${x0} ${y0}L${pts.join('L')}L${x0 + w} ${y0}Z" fill="#8FD3E0" opacity=".55"/><path d="M${pts.join('L')}" fill="none" stroke="#0F6E8C" stroke-width="1.5"/><path d="M${x0 - 6} ${y0}H${x0 + w + 6}" stroke="#B8AC97"/></g>`;
}

const money = n => '$' + Math.round(n).toLocaleString('en-US');
export const kr = r => `$${Math.round(r[0] / 1000)}k–$${Math.round(r[1] / 1000)}k`;

// mountConfigurator(root, { get, set, tile }) : get() returns the design, set(design) stores it (and refreshes)
export function mountConfigurator(root, { get, set, tile }) {
  const $ = s => root.querySelector(s);
  const radio = (name, obj, val, ok = () => true, extra = () => '') => Object.entries(obj).map(([k, v]) =>
    `<label class="chip${ok(k) ? '' : ' is-off'}"><input type="radio" name="${name}" value="${k}"${k === val ? ' checked' : ''}${ok(k) ? '' : ' disabled'}><span>${v.name}${v.note ? `<small>${v.note}</small>` : ''}${extra(k)}</span></label>`).join('');
  let tileURL = null, tileFor = '', note = '';
  function draw() {
    const d = normalize(get()), q = designQuote(d), { depthShapeOk, extraOk } = allowed(d), s = SHAPES[d.shape];
    $('#cfg-shape').innerHTML = radio('shape', SHAPES, d.shape, () => true, k => `<svg class="shape-ico" viewBox="-4 -4 ${SHAPES[k].max * 5 * .35 + 8} 40" aria-hidden="true"><path d="${shapePath(k, SHAPES[k].max * .35, SHAPES[k].max * .35 * SHAPES[k].aspect)}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`);
    const sl = $('#cfg-len'); sl.min = s.min; sl.max = s.max; sl.value = d.len;
    sl.setAttribute('aria-valuetext', `${q.L} by ${q.W} feet, about ${q.gallons.toLocaleString('en-US')} gallons`);
    $('#cfg-len-out').textContent = `${q.L} × ${q.W} ft · about ${q.gallons.toLocaleString('en-US')} gal`;
    $('#cfg-depth').innerHTML = radio('depth', DEPTHS, d.depth, depthShapeOk);
    const why = [!depthShapeOk('diving') && 'Plunge and lap pools have no room for a diving depth or a beach entry.', !extraOk('cover') && EXTRAS.cover.why, !extraOk('shelf') && 'A sun shelf needs a longer, wider pool.'].filter(Boolean);
    $('#cfg-why').textContent = [note, ...why].filter(Boolean).join(' '); note = '';
    $('#cfg-interior').innerHTML = radio('interior', INTERIORS, d.interior);
    $('#cfg-extras').innerHTML = Object.entries(EXTRAS).map(([k, v]) => `<label class="chip${extraOk(k) ? '' : ' is-off'}"><input type="checkbox" name="extra" value="${k}"${d.extras.includes(k) ? ' checked' : ''}${extraOk(k) ? '' : ' disabled'}><span>${v.name}<small>+${money(v.add)}</small></span></label>`).join('')
;
    const key = d.interior + (document.documentElement.classList.contains('is-night') ? ':night' : '');
    if (tile && tileFor !== key) { try { tileURL = tile(INTERIORS[d.interior].tint); if (tileURL) tileFor = key; } catch { tileURL = null; } }
    $('#cfg-plan').innerHTML = planSVG(q, { tile: tileURL, id: 'cfg' });
    $('#cfg-price').textContent = kr(q.range);
    $('#cfg-parts').innerHTML = q.parts.filter(p => p.v).map(p => `<li><span>${p.label}</span><span>${money(p.v)}</span></li>`).join('');
    $('#cfg-term').innerHTML = [10, 15, 20].map(t => `<label class="chip chip--sm"><input type="radio" name="term" value="${t}"${t === d.term ? ' checked' : ''}><span>${t} yrs</span></label>`).join('');
    $('#cfg-monthly').textContent = `${money(q.monthly)}/mo`;
    $('#cfg-fin-note').textContent = `Example: ${kr(q.range)} midpoint, ${DOWN * 100}% down, ${APR}% APR over ${d.term} years.`;
    return q;
  }
  root.addEventListener('input', e => {
    const d = { ...normalize(get()) }, t = e.target;
    if (t.name === 'shape') {   // keep the length when it fits the new shape; otherwise keep its place in the range
      const was = SHAPES[d.shape], frac = (d.len - was.min) / (was.max - was.min); d.shape = t.value; const s = SHAPES[d.shape];
      if (d.len < s.min || d.len > s.max) d.len = Math.round(s.min + frac * (s.max - s.min)); }
    else if (t.id === 'cfg-len') { d.len = +t.value; const m = DEPTHS[d.depth].minLen; if (m && d.len < m) note = `Diving needs ${m} ft or more, so the depth is back to sport.`; }
    else if (t.name === 'depth') { d.depth = t.value; const m = DEPTHS[d.depth].minLen; if (m && d.len < m) { d.len = m; note = `Diving needs ${m} ft or more, so the pool is now ${m} ft long.`; } }
    else if (t.name === 'interior') d.interior = t.value;
    else if (t.name === 'extra') d.extras = [...root.querySelectorAll('input[name=extra]:checked')].map(i => i.value);
    else if (t.name === 'term') d.term = +t.value;
    else return;
    const focusName = t.name, focusVal = t.value, isSlider = t.id === 'cfg-len';
    set(normalize(d));
    if (!isSlider) root.querySelector(`input[name="${focusName}"][value="${focusVal}"]`)?.focus({ preventScroll: true });
  });
  return { draw };
}
