// One store for the whole visit, from the first symptom to the confirmation (the Pearl & Plum lesson).
// Every entry point writes here and calls refresh(); refresh() re-derives prices, duration, notices, the review and
// the confirmation from the store, then every registered view redraws from that one result. Nothing is stored
// anywhere else and nothing is sent.
import { diagnose, VISITS, PARTS, URGENCY } from './triage.js';
import { designQuote, SHAPES } from './configurator.js';
import { zipCheck, ZONES } from './map.js';

export const NEEDS = [
  { id: 'diagnosis', label: 'Fix what the Health Check found' },
  { id: 'repair', label: 'Repair equipment' },
  { id: 'care', label: 'Start a care plan' },
  { id: 'season', label: 'Opening or closing' },
  { id: 'water', label: 'Water-balance visit' },
  { id: 'build', label: 'Design a new pool' },
];

export const PLANS = {
  essentials: { name: 'Essentials', weekly: 120, biweekly: 85, every: ['Test and balance the water', 'Skim the surface', 'Empty skimmer and pump baskets', 'Note anything that needs attention'] },
  complete:   { name: 'Complete', weekly: 165, biweekly: 120, every: ['Everything in Essentials', 'Vacuum and brush walls and steps', 'Backwash or clean the filter as needed', 'Equipment check: pump, heater, salt cell'] },
  worryfree:  { name: 'Worry-free', weekly: 200, biweekly: 150, includes: ['open', 'close'], every: ['Everything in Complete', 'Opening and closing included', 'Priority repair visits within 48 hours', 'Chemicals included'] },
};
export const SEASON_ADDONS = { open: { name: 'Pool opening', range: [250, 450] }, close: { name: 'Pool closing', range: [250, 450] } };
export const TRIP_FEE = 45;
export const HOURS = { open: 8 * 60, close: 17 * 60, satClose: 13 * 60 };   // NY time; closed Sundays

export const POOL_TYPES = { gunite: 'In-ground gunite', vinyl: 'In-ground vinyl', fiberglass: 'In-ground fibreglass', above: 'Above-ground', semi: 'Semi in-ground' };
export const EQUIPMENT = { pump: 'Pump', filter: 'Filter', heater: 'Heater', salt: 'Salt system', cover: 'Automatic cover' };

const blankPool = () => ({ type: 'gunite', shape: 'rect', len: 32, equipment: ['pump', 'filter'] });
// `pool` describes an owner's existing pool; `property` is asked instead for a new-pool consult (the design itself is `design`).
export const store = {
  need: null, triage: { symptoms: [], readings: { ph: null, cl: null } }, plan: { tier: 'complete', freq: 'weekly', addons: [] }, part: null,
  design: null, season: 'close', pool: blankPool(), property: { existing: 'no', oldType: 'gunite', access: 'side', slope: 'flat' },
  photos: [], zip: '', visitType: null, slot: null, contact: { name: '', mobile: '' }, notes: '',
  step: 0, confirmed: false, reviewed: false,
};

// ---- the clock: New York time, pinned with ?now=YYYY-MM-DDTHH:MM for tests and pitches ----
const pinned = new URLSearchParams(location.search).get('now');
export const clock = { now: () => (pinned ? nyToDate(pinned) : new Date()) };
const NYF = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' });
export function nyParts(date) {
  const p = Object.fromEntries(NYF.formatToParts(date).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
function nyOffset(y, m, d, min) {   // minutes NY is behind UTC at that local time
  const guess = new Date(Date.UTC(y, m - 1, d, 0, min) + 5 * 3600e3), p = nyParts(guess);
  const local = Date.UTC(p.y, p.m - 1, p.d, 0, p.min), want = Date.UTC(y, m - 1, d, 0, min);
  return new Date(guess.getTime() + (want - local));
}
export function nyToDate(s) { const [dt, tm = '00:00'] = s.split('T'); const [y, m, d] = dt.split('-').map(Number), [h, mi] = tm.split(':').map(Number); return nyOffset(y, m, d, h * 60 + mi); }
export const dayKey = p => `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
export const fmtTime = m => { const h = Math.floor(m / 60), mm = m % 60; return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
export const fmtDay = (k, o = { weekday: 'long', month: 'long', day: 'numeric' }) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(new Date(k + 'T12:00:00Z'));
export const money = n => '$' + Math.round(n).toLocaleString('en-US');
export const range = r => (r[0] === r[1] ? (r[0] === 0 ? 'No charge' : money(r[0])) : `${money(r[0])}–${money(r[1])}`);
export const kRange = r => `$${Math.round(r[0] / 1000)}k–$${Math.round(r[1] / 1000)}k`;

export function seasonOf(date = clock.now()) {
  const forced = new URLSearchParams(location.search).get('season');
  if (['spring', 'summer', 'fall', 'winter'].includes(forced)) return forced;
  const m = nyParts(date).m;
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 10 ? 'fall' : 'winter';
}

// ---- slots: visit windows on the zone's route days; urgent visits may use any open day within 48 hours ----
export function slotsFor(D) {
  const now = clock.now(), np = nyParts(now), out = [];
  const zone = D.zone?.zone ? ZONES[D.zone.zone] : null;
  for (let i = 0; i < 15; i++) {
    const p = nyParts(new Date(nyOffset(np.y, np.m, np.d, 12 * 60).getTime() + i * 864e5));
    if (p.dow === 0) continue;
    const priority = D.urgency === '48h' && i <= 2;
    const route = !zone || zone.days.includes(p.dow);
    const close = p.dow === 6 ? HOURS.satClose : HOURS.close, times = [];
    if (route || priority) for (let m = HOURS.open; m + D.minutes <= close; m += 60) if (i > 0 || m >= np.min + 120) times.push(m);
    out.push({ key: dayKey(p), dow: p.dow, priority, route, times, offset: i });
  }
  if (D.urgency === '48h') out.sort((a, b) => (b.priority && b.times.length) - (a.priority && a.times.length) || a.offset - b.offset);
  return out;
}

// ---- derive everything from the store ----
export function derive(s = store) {
  const D = { need: s.need };
  D.triage = diagnose(s.triage);
  D.urgency = s.need === 'diagnosis' ? (D.triage ? D.triage.urgency : 'week')
    : s.need === 'repair' && s.part && D.triage?.part === s.part ? D.triage.urgency : 'route';
  D.zone = s.zip ? zipCheck(s.zip) : null;
  D.design = s.design ? designQuote(s.design) : null;
  const plan = PLANS[s.plan.tier], monthly = plan[s.plan.freq];
  D.plan = { ...s.plan, name: plan.name, monthly, every: plan.every, includes: plan.includes || [] };
  const lines = [];
  let visit = null, minutes = 60;
  switch (s.need) {
    case 'diagnosis':
      if (D.triage) { visit = D.triage.visit; minutes = D.triage.minutes; lines.push(...D.triage.lines.map(l => ({ ...l }))); }
      else { visit = 'water'; minutes = 60; lines.push({ key: 'visit:assess', label: 'Assessment visit', range: VISITS.water.range }); }
      break;
    case 'repair': {
      const part = PARTS[s.part]; visit = 'repair'; minutes = part ? part.minutes : VISITS.repair.minutes;
      lines.push({ key: 'part:' + (s.part || 'any'), label: part ? `Repair · ${part.name.toLowerCase()}` : 'Equipment repair visit', range: part ? part.range : VISITS.repair.range });
      break; }
    case 'care':
      visit = 'care'; minutes = 60;
      lines.push({ key: 'plan', label: `${plan.name} plan · ${s.plan.freq === 'weekly' ? 'weekly' : 'every other week'}`, monthly });
      lines.push({ key: 'startup', label: 'Start-up visit', range: [0, 0], note: 'Included' });
      for (const a of s.plan.addons) {
        const inc = D.plan.includes.includes(a);
        lines.push({ key: 'season:' + a, label: SEASON_ADDONS[a].name, range: inc ? [0, 0] : SEASON_ADDONS[a].range, note: inc ? 'Included in Worry-free' : '' });
      }
      break;
    case 'season':
      visit = s.season; minutes = VISITS[s.season].minutes;
      lines.push({ key: 'season:' + s.season, label: SEASON_ADDONS[s.season].name, range: SEASON_ADDONS[s.season].range });
      break;
    case 'water':
      visit = 'water'; minutes = 60; lines.push({ key: 'visit:water', label: VISITS.water.name, range: VISITS.water.range }); break;
    case 'build':
      visit = 'consult'; minutes = 90; lines.push({ key: 'consult', label: 'Design consult at your home', range: [0, 0], note: 'No charge' }); break;
  }
  if (D.zone?.status === 'nearby' && s.need) lines.push({ key: 'trip', label: 'Trip fee (outside route area)', range: [TRIP_FEE, TRIP_FEE] });
  // one line per key: nothing is charged twice
  const seen = new Set(); D.lines = lines.filter(l => !seen.has(l.key) && seen.add(l.key));
  D.visit = visit; D.visitName = visit ? VISITS[visit].name : null; D.minutes = minutes;
  D.total = D.lines.filter(l => l.range).reduce((a, l) => [a[0] + l.range[0], a[1] + l.range[1]], [0, 0]);
  D.monthly = D.lines.find(l => l.monthly)?.monthly || 0;
  D.slots = slotsFor(D);
  D.slotOk = !!s.slot && D.slots.some(d => d.key === s.slot.day && d.times.includes(s.slot.m));
  D.urgencyLabel = URGENCY[D.urgency]?.label;
  D.photos = s.photos.length;
  return D;
}

// ---- refresh: the only way views update ----
const views = [];
export const onRefresh = fn => views.push(fn);
export let D = derive();
export function refresh(msg) {
  D = derive();
  store.visitType = D.visit;
  const notes = [];
  if (store.slot && !D.slotOk) {
    notes.push(`${fmtDay(store.slot.day, { weekday: 'long' })} at ${fmtTime(store.slot.m)} no longer fits this visit. Pick another time.`);
    store.slot = null; D = derive();
  }
  // (a change after the confirmation reopens the review: app.js compares the booking against what was confirmed)
  for (const v of views) v(D, { msg, notes });
  return D;
}
export function set(patch, msg) { Object.assign(store, patch); return refresh(msg); }

// ---- the calendar file ----
const pad = n => String(n).padStart(2, '0');
export function ics(s = store, d = D) {
  const [y, m, dd] = s.slot.day.split('-').map(Number), st = s.slot.m, en = st + d.minutes;
  const t = mm => `${y}${pad(m)}${pad(dd)}T${pad(Math.floor(mm / 60))}${pad(mm % 60)}00`;
  const stamp = new Date(clock.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Local Form//Pool Doctor example//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:America/New_York',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT', 'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST', 'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT', `UID:${confirmCode(s)}@pool-doctor.example`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/New_York:${t(st)}`, `DTEND;TZID=America/New_York:${t(en)}`,
    `SUMMARY:FICTIONAL EXAMPLE – Pool Doctor · ${d.visitName}`,
    `DESCRIPTION:Fictional example by Local Form. No visit was booked and nothing was sent.\\n${d.visitName} · ${range(d.total)} (example range).`,
    'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
export function confirmCode(s = store) {
  let h = 7; for (const c of `${s.slot?.day}${s.slot?.m}${s.contact.name}${s.visitType}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'PD-' + h.toString(36).toUpperCase().slice(0, 5);
}
export { SHAPES };
