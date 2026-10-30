// The illustrative service area: three zones of Essex County, NJ, drawn in code (no map tiles, no addresses).
// zipCheck(zip) -> { status: 'in' | 'nearby' | 'outside' | 'invalid', zone, town }

export const ZONES = {
  north: { name: 'North Essex', days: [2, 5], dayNames: 'Tue & Fri', path: 'M190 30L330 20L362 118L342 210L250 230L186 238L204 150Z' },
  west:  { name: 'West Essex',  days: [1, 4], dayNames: 'Mon & Thu', path: 'M40 62L190 30L204 150L186 238L60 230L28 150Z' },
  south: { name: 'South Essex', days: [3, 6], dayNames: 'Wed & Sat', path: 'M60 230L186 238L250 230L342 210L332 300L252 392L120 402L70 322Z' },
};
export const TOWNS = [
  ['Nutley', 'north', 342, 92, ['07110']], ['Belleville', 'north', 330, 156, ['07109']], ['Bloomfield', 'north', 282, 116, ['07003']],
  ['Glen Ridge', 'north', 258, 188, ['07028']], ['Montclair', 'north', 228, 104, ['07042', '07043']], ['Cedar Grove', 'north', 226, 56, ['07009']],
  ['Verona', 'west', 168, 168, ['07044']], ['Caldwell', 'west', 120, 126, ['07006']], ['North Caldwell', 'west', 152, 82, ['07006']],
  ['Essex Fells', 'west', 92, 176, ['07021']], ['Roseland', 'west', 104, 214, ['07068']], ['Fairfield', 'west', 74, 94, ['07004']],
  ['West Orange', 'south', 206, 276, ['07052']], ['Livingston', 'south', 120, 284, ['07039']], ['South Orange', 'south', 272, 296, ['07079']],
  ['Maplewood', 'south', 286, 340, ['07040']], ['Millburn', 'south', 214, 352, ['07041']], ['Short Hills', 'south', 172, 380, ['07078']],
];
export const NEARBY = { '07011': 'Clifton', '07012': 'Clifton', '07013': 'Clifton', '07014': 'Clifton', '07015': 'Clifton', '07424': 'Little Falls', '07470': 'Wayne',
  '07071': 'Lyndhurst', '07901': 'Summit', '07045': 'Montville', '07032': 'Kearny', '07017': 'East Orange', '07050': 'Orange', '07107': 'Newark' };
export const TRIP = 45;

export function zipCheck(zip) {
  const z = String(zip || '').trim();
  if (!/^\d{5}$/.test(z)) return { status: 'invalid', zip: z };
  const t = TOWNS.find(t => t[4].includes(z));
  if (t) return { status: 'in', zip: z, zone: t[1], town: t[0] };
  if (NEARBY[z]) return { status: 'nearby', zip: z, town: NEARBY[z] };
  return { status: 'outside', zip: z };
}
export function zipMessage(c) {
  if (!c) return '';
  switch (c.status) {
    case 'in': return `${c.town} is in ${ZONES[c.zone].name}. Route days: ${ZONES[c.zone].dayNames}.`;
    case 'nearby': return `${c.town} is just outside our routes. We can come with a $${TRIP} trip fee (example).`;
    case 'outside': return 'That zip is outside the area this example covers. A real company would suggest someone nearby.';
    default: return 'Enter a 5-digit zip code.';
  }
}

export function mapSVG({ id = 'map', active = null } = {}) {
  const zones = Object.entries(ZONES).map(([k, z]) => `<path d="${z.path}" class="zone${active?.zone === k ? ' is-on' : ''}" data-zone="${k}"/>`).join('');
  const labels = Object.entries(ZONES).map(([k]) => {
    const [x, y] = { north: [222, 216], west: [54, 150], south: [140, 336] }[k];
    return `<text x="${x}" y="${y}" class="zl" text-anchor="middle">${k === 'north' ? 'N' : k === 'west' ? 'W' : 'S'}</text>`;
  }).join('');
  const towns = TOWNS.map(([n, , x, y]) => `<g class="town${active?.town === n ? ' is-on' : ''}"><circle cx="${x}" cy="${y}" r="${active?.town === n ? 5 : 2.6}"/><text x="${x > 300 ? x - 7 : x + 7}" y="${y + 4}"${x > 300 ? ' text-anchor="end"' : ''}>${n}</text></g>`).join('');
  return `<svg viewBox="0 0 400 440" role="img" aria-labelledby="${id}-t" xmlns="http://www.w3.org/2000/svg"><title id="${id}-t">Illustrative service area: North, West and South Essex County, with route days.</title>
<path d="M20 52L196 12L346 4L384 116L362 220L352 308L262 414L112 428L52 336L8 150Z" fill="none" stroke="#B8AC97" stroke-dasharray="3 6"/>
${zones}${towns}${labels}
<text x="396" y="438" class="nb" text-anchor="end">NEARBY · TRIP FEE</text></svg>`;
}
