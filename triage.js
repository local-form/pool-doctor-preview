// The Pool Health Check rules, as data. Every price is an example range for a fictional company.
// diagnose({ symptoms, readings }) is pure: the same input always gives the same report.

// Visit types: example range in dollars, length on site in minutes.
export const VISITS = {
  green:   { name: 'Green-to-clean visit',      range: [250, 650], minutes: 180 },
  black:   { name: 'Black-algae treatment',     range: [300, 700], minutes: 180 },
  water:   { name: 'Water-balance visit',       range: [95, 180],  minutes: 60 },
  leak:    { name: 'Leak detection',            range: [250, 550], minutes: 150 },
  repair:  { name: 'Equipment repair visit',    range: [150, 650], minutes: 120 },
  inspect: { name: 'Structural inspection',     range: [200, 400], minutes: 90 },
  care:    { name: 'Care plan start-up visit',  range: [0, 0],     minutes: 60 },
  open:    { name: 'Pool opening',              range: [250, 450], minutes: 150 },
  close:   { name: 'Pool closing',              range: [250, 450], minutes: 150 },
  consult: { name: 'Design consult',            range: [0, 0],     minutes: 90 },
};

export const URGENCY = {
  '48h':  { label: 'Within 48 hours', rank: 3 },
  week:   { label: 'This week', rank: 2 },
  route:  { label: 'Next route day', rank: 1 },
};
export const SWIM = {
  no:     { label: 'No', rank: 3 },
  notyet: { label: 'Not yet', rank: 2 },
  yes:    { label: 'Yes', rank: 1 },
};

// Equipment parts (the repair section and repair visits). Ranges are examples.
export const PARTS = {
  pump:   { name: 'Pump', range: [150, 650], minutes: 120, fails: ['Worn motor bearings', 'Failed start capacitor', 'Cracked strainer lid or O-ring'],
            signs: ['A screech or grinding hum', 'Hums but won’t spin', 'Air bubbles in the strainer basket'] },
  filter: { name: 'Sand filter', range: [180, 600], minutes: 120, fails: ['Channelled or caked sand', 'Broken laterals', 'Leaking multiport valve'],
            signs: ['Pressure 10 psi above clean', 'Sand on the pool floor', 'Water at the backwash line'] },
  heater: { name: 'Heater', range: [200, 900], minutes: 150, fails: ['Dirty igniter or flame sensor', 'Tripped pressure switch', 'Scaled heat exchanger'],
            signs: ['Clicks, then nothing', 'Error code on the panel', 'Heats slowly or not at all'] },
  salt:   { name: 'Salt cell', range: [120, 450], minutes: 75, fails: ['Scale on the plates', 'Cell at end of life', 'Flow switch fault'],
            signs: ['“Check cell” light', 'Low chlorine despite salt', 'White crust inside the cell'] },
  timer:  { name: 'Timer & controls', range: [120, 380], minutes: 75, fails: ['Failed mechanical timer', 'Tripped GFCI breaker', 'Loose relay connection'],
            signs: ['Pump runs at the wrong hours', 'Nothing powers on', 'Breaker trips when the pump starts'] },
};

// Symptoms. Each row is one rule: what it most likely is, whether to swim, what to do tonight, the visit, how soon.
// `part` adds that equipment's example range when it isn't the main visit. `shift` rows change the result when the
// readings point somewhere else.
export const SYMPTOMS = [
  { id: 'green', label: 'Green water', cause: 'Algae bloom', detail: 'Chlorine dropped low enough for algae to take hold, usually after heat, rain or a stopped pump.',
    swim: 'no', why: 'You can’t see the drain, so nobody can see a swimmer in trouble.', visit: 'green', urgency: '48h', rank: 9,
    tonight: ['Run the pump around the clock.', 'Keep people and pets out until you can see the drain.'],
    shift: [{ when: r => r.cl != null && r.cl >= 3 && r.ph != null && r.ph <= 7.8, cause: 'Algae that chlorine alone isn’t clearing', detail: 'Your chlorine reads fine, so the bloom is likely living in the filter or behind poor circulation.', urgency: 'week' }] },
  { id: 'cloudy', label: 'Cloudy water', cause: 'Filtration or chemistry out of balance', detail: 'Fine particles aren’t being caught: a tired filter, short pump hours, or high pH.',
    swim: 'notyet', why: 'Cloudy water hides the floor; wait until the water clears.', visit: 'water', urgency: 'week', rank: 5,
    tonight: ['Run the pump longer than usual.', 'Clean the skimmer and pump baskets.'],
    shift: [
      { when: r => r.cl != null && r.cl < 1, cause: 'Early algae: chlorine has dropped', detail: 'Low chlorine plus cloudiness is how a green pool starts. Caught now, it’s a shorter visit.', visit: 'green', urgency: '48h', swim: 'no', why: 'Chlorine is too low to keep the water safe.' },
      { when: r => r.ph != null && r.ph > 7.8, cause: 'High pH and scale clouding the water', detail: 'At high pH, calcium drops out of the water as a fine haze.' },
    ] },
  { id: 'black', label: 'Black spots', cause: 'Black algae', detail: 'A tough algae that roots into plaster and needs brushing and a targeted treatment.',
    swim: 'notyet', why: 'Safe to touch, but the treatment needs the pool closed for a day.', visit: 'black', urgency: 'week', rank: 7,
    tonight: ['Brush the spots with a stiff brush.', 'Keep the pump running.'] },
  { id: 'foam', label: 'Foam on the surface', cause: 'Residue in the water', detail: 'Lotions, soaps or some algaecides foam when the water is agitated.',
    swim: 'yes', why: 'Foam is a nuisance, not a hazard.', visit: 'water', urgency: 'route', rank: 2,
    tonight: ['Turn off any waterfalls or jets.', 'Rinse off before swimming.'] },
  { id: 'smell', label: 'Strong chlorine smell', cause: 'Used-up chlorine (chloramines)', detail: 'That “pool smell” usually means too little free chlorine, not too much.',
    swim: 'notyet', why: 'Chloramines sting eyes and skin until the water is shocked.', visit: 'water', urgency: 'week', rank: 4,
    tonight: ['Leave the cover off to let it breathe.', 'Run the pump.'],
    shift: [{ when: r => r.cl != null && r.cl > 5, cause: 'Chlorine is too high', detail: 'The reading is above 5 ppm. It will fall on its own in sun; no visit may be needed.', urgency: 'route', why: 'Wait until chlorine is back under 5 ppm.' }] },
  { id: 'low', label: 'Water level dropping', cause: 'Possible leak', detail: 'More than about a quarter inch a day beyond evaporation points to a leak in the shell, plumbing or equipment.',
    swim: 'yes', why: 'Safe to swim while we find it.', visit: 'leak', urgency: 'week', rank: 6,
    tonight: ['Mark the waterline with tape to measure the drop.', 'Keep the water above the skimmer mouth.'] },
  { id: 'loud', label: 'Loud pump', cause: 'Worn pump bearings or air in the line', detail: 'A screech means bearings; a gurgle means the pump is sucking air.',
    swim: 'yes', why: 'Safe while the water stays circulated.', visit: 'repair', part: 'pump', urgency: 'week', rank: 3,
    tonight: ['Check the strainer lid is tight.', 'Top up the water if it’s below the skimmer.'] },
  { id: 'nopower', label: 'Pump won’t start', cause: 'Capacitor, motor or breaker fault', detail: 'With no circulation the chlorine can’t do its job, so the water turns within days.',
    swim: 'notyet', why: 'Without circulation the water won’t stay safe for long.', visit: 'repair', part: 'pump', urgency: '48h', rank: 8,
    tonight: ['Check the breaker and the timer once.', 'Don’t keep restarting a humming motor.'] },
  { id: 'heat', label: 'Heater won’t heat', cause: 'Ignition or flow fault in the heater', detail: 'Most heaters stop when they sense low flow; a dirty filter is often the real cause.',
    swim: 'yes', why: 'The water is safe, just cold.', visit: 'repair', part: 'heater', urgency: 'week', rank: 2,
    tonight: ['Clean the filter or backwash.', 'Note any code on the heater panel.'] },
  { id: 'cracks', label: 'Cracks', cause: 'Plaster crazing or a structural crack', detail: 'Hairline crazing is cosmetic; a crack you can catch a fingernail in needs an inspection.',
    swim: 'yes', why: 'Safe unless a crack is sharp or near a drain.', visit: 'inspect', urgency: 'route', rank: 3,
    tonight: ['Photograph the crack with a coin for scale.', 'Mark both ends with a pencil to see if it grows.'] },
  { id: 'salt', label: 'Salt cell light', cause: 'Scaled or worn salt cell', detail: 'The cell makes your chlorine. When it scales up, chlorine falls behind.',
    swim: 'yes', why: 'Safe while chlorine reads above 1 ppm.', visit: 'repair', part: 'salt', urgency: 'route', rank: 3,
    tonight: ['Test the chlorine if you can.', 'Don’t add more salt until it’s checked.'] },
];

// Readings alone (no symptom ticked) still say something.
const READING_RULES = [
  { when: r => r.cl != null && r.cl < 1, id: 'lowcl', cause: 'Chlorine is too low', detail: 'Below 1 ppm, algae can start within a day or two in warm water.', swim: 'notyet', why: 'Chlorine is too low to keep the water safe.', visit: 'water', urgency: 'week', rank: 5, tonight: ['Run the pump.', 'Keep the cover off in sun.'] },
  { when: r => r.cl != null && r.cl > 5, id: 'highcl', cause: 'Chlorine is too high', detail: 'Above 5 ppm stings eyes; it falls on its own in sun.', swim: 'notyet', why: 'Wait until chlorine is back under 5 ppm.', visit: 'water', urgency: 'route', rank: 2, tonight: ['Leave the cover off.', 'Re-test tomorrow.'] },
  { when: r => r.ph != null && (r.ph < 7.0 || r.ph > 7.8), id: 'ph', cause: 'pH out of range', detail: 'Outside 7.2 to 7.8, chlorine works poorly and the water irritates eyes.', swim: 'yes', why: 'Safe, but it may sting eyes.', visit: 'water', urgency: 'route', rank: 1, tonight: ['Re-test in daylight.'] },
];

export const BANDS = { ph: [7.2, 7.8], cl: [1, 3] };

export function diagnose({ symptoms = [], readings = {} } = {}) {
  const r = { ph: readings.ph ?? null, cl: readings.cl ?? null };
  const rows = SYMPTOMS.filter(s => symptoms.includes(s.id)).map(s => {
    const sh = (s.shift || []).find(x => x.when(r));
    return sh ? { ...s, ...sh, shifted: true } : s;
  });
  if (!rows.length) rows.push(...READING_RULES.filter(x => x.when(r)));
  if (!rows.length) return null;
  const worst = (k, table) => rows.reduce((a, b) => (table[b[k]].rank > table[a[k]].rank ? b : a))[k];
  const primary = rows.reduce((a, b) => (b.rank > a.rank ? b : a));
  const visit = primary.visit, base = VISITS[visit];
  const lines = [{ key: 'visit:' + visit + (primary.part ? ':' + primary.part : ''), label: primary.part ? `${base.name} · ${PARTS[primary.part].name.toLowerCase()}` : base.name,
    range: primary.part ? PARTS[primary.part].range : base.range }];
  // other symptoms add their own work once each (no duplicate lines for the same visit or part)
  for (const s of rows) {
    if (s === primary) continue;
    const key = s.part ? 'part:' + s.part : 'visit:' + s.visit;
    if (lines.some(l => l.key === key || (s.part && l.key.endsWith(':' + s.part)) || (!s.part && l.key.startsWith('visit:' + s.visit)))) continue;
    if (s.part) lines.push({ key, label: `Add: ${PARTS[s.part].name.toLowerCase()} repair`, range: PARTS[s.part].range });
    else if (s.visit !== 'water' || visit !== 'green') lines.push({ key, label: `Add: ${VISITS[s.visit].name.toLowerCase()}`, range: VISITS[s.visit].range });
  }
  const range = lines.reduce((a, l) => [a[0] + l.range[0], a[1] + l.range[1]], [0, 0]);
  const minutes = Math.max(...rows.map(s => (s.part ? PARTS[s.part].minutes : VISITS[s.visit].minutes))) + 30 * (lines.length - 1);
  const tonight = [...new Set(rows.flatMap(s => s.tonight))].slice(0, 4);
  const swim = worst('swim', SWIM);
  return {
    symptoms: rows.map(s => s.id), cause: primary.cause, detail: primary.detail, also: rows.filter(s => s !== primary).map(s => s.cause),
    swim, swimWhy: rows.find(s => s.swim === swim).why, tonight, visit, part: primary.part || null, lines, range, minutes,
    urgency: worst('urgency', URGENCY), readings: r, confirm: 'A technician confirms on site.',
  };
}
