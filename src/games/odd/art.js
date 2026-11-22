/**
 * 找不同的物件图库：每个物件画在 ±20 的局部坐标里
 *   zone   放在天空还是地面
 *   colors 可选主色（≥2 个才能做「变色」差异）
 *   parts  可以被单独去掉的小细节（「少了一样东西」差异）
 *   flip   左右不对称，才能做「翻转」差异
 *   max    同一幅图里最多出现几个
 */
import { shade } from '../../core/utils.js';

const has = (hide, p) => !hide.has(p);

export const KINDS = {
  sun: {
    zone: 'sky', max: 1, colors: ['#ffd166', '#ff9f45'], parts: ['face'],
    draw: (c, hide) => {
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return `<line x1="${(Math.cos(a) * 14).toFixed(1)}" y1="${(Math.sin(a) * 14).toFixed(1)}" x2="${(Math.cos(a) * 20).toFixed(1)}" y2="${(Math.sin(a) * 20).toFixed(1)}"/>`;
      }).join('');
      return `<g stroke="${c}" stroke-width="3" stroke-linecap="round">${rays}</g><circle r="11" fill="${c}"/>`
        + (has(hide, 'face') ? `<circle cx="-4" cy="-2" r="1.6" fill="#7c2d12"/><circle cx="4" cy="-2" r="1.6" fill="#7c2d12"/><path d="M-4 3 Q0 7 4 3" stroke="#7c2d12" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : '');
    },
  },
  moon: {
    zone: 'sky', max: 1, colors: ['#fde68a'], parts: ['star'], flip: true,
    draw: (c, hide) => `<path d="M6 -16 A16 16 0 1 0 14 10 A12 12 0 1 1 6 -16Z" fill="${c}"/>`
      + (has(hide, 'star') ? '<path d="M13 -12 l1.6 3.4 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5Z" fill="#fff7c2"/>' : ''),
  },
  cloud: {
    zone: 'sky', max: 3, colors: ['#ffffff'], parts: [], flip: true,
    draw: (c) => `<g fill="${c}" opacity=".95"><ellipse cx="0" cy="4" rx="19" ry="8"/><circle cx="-7" cy="0" r="8"/><circle cx="4" cy="-4" r="10"/><circle cx="13" cy="2" r="6"/></g>`,
  },
  balloon: {
    zone: 'sky', max: 3, colors: ['#ff5d5d', '#38bdf8', '#ffd166', '#b46bff', '#4ade80'], parts: ['shine'], flip: true,
    draw: (c, hide) => `<path d="M0 10 Q-4 15 1 20" stroke="#e2e8f0" stroke-width="1.2" fill="none"/>`
      + `<ellipse cx="0" cy="-4" rx="10" ry="13" fill="${c}"/><path d="M-2 9 L2 9 L0 11Z" fill="${shade(c, -30)}"/>`
      + (has(hide, 'shine') ? '<ellipse cx="-4" cy="-9" rx="2.4" ry="4" fill="#fff" opacity=".75"/>' : ''),
  },
  bird: {
    zone: 'sky', max: 3, colors: ['#38bdf8', '#ff5d5d', '#ffd166', '#4ade80'], parts: ['wing', 'eye'], flip: true,
    draw: (c, hide) => `<path d="M-11 -2 L-20 -9 L-19 4 Z" fill="${shade(c, -25)}"/>`
      + `<ellipse cx="0" cy="0" rx="13" ry="10" fill="${c}"/><path d="M12 -3 L19 0 L12 3Z" fill="#ff9f45"/>`
      + (has(hide, 'wing') ? `<path d="M-7 0 Q-1 -11 6 0 Q-1 5 -7 0Z" fill="${shade(c, -40)}"/>` : '')
      + (has(hide, 'eye') ? '<circle cx="6" cy="-4" r="2" fill="#1e293b"/>' : '')
      + '<path d="M-2 9 V14 M3 9 V14" stroke="#ff9f45" stroke-width="1.6"/>',
  },
  butterfly: {
    zone: 'sky', max: 2, colors: ['#ff6b9d', '#b46bff', '#ffd166', '#38bdf8'], parts: ['spots', 'antenna'],
    draw: (c, hide) => `<path d="M0 0 C-6 -16 -20 -16 -18 -4 C-17 2 -8 3 0 0Z M0 0 C6 -16 20 -16 18 -4 C17 2 8 3 0 0Z" fill="${c}"/>`
      + `<path d="M0 0 C-4 8 -14 14 -12 6 C-11 2 -5 1 0 0Z M0 0 C4 8 14 14 12 6 C11 2 5 1 0 0Z" fill="${shade(c, -35)}"/>`
      + (has(hide, 'spots') ? '<g fill="#fff" opacity=".85"><circle cx="-10" cy="-7" r="2.6"/><circle cx="10" cy="-7" r="2.6"/></g>' : '')
      + '<rect x="-1.6" y="-9" width="3.2" height="16" rx="1.6" fill="#334155"/>'
      + (has(hide, 'antenna') ? '<path d="M0 -9 Q-3 -15 -6 -16 M0 -9 Q3 -15 6 -16" stroke="#334155" stroke-width="1.2" fill="none"/>' : ''),
  },
  kite: {
    zone: 'sky', max: 2, colors: ['#ff5d5d', '#4ade80', '#ffd166', '#b46bff'], parts: ['tail', 'cross'], flip: true,
    draw: (c, hide) => `<path d="M0 -17 L11 -3 L0 12 L-11 -3Z" fill="${c}"/>`
      + (has(hide, 'cross') ? '<path d="M0 -17 V12 M-11 -3 H11" stroke="#fff" stroke-width="1.3" opacity=".8"/>' : '')
      + (has(hide, 'tail') ? `<path d="M0 12 Q6 16 3 20 Q0 24 7 26" stroke="#e2e8f0" stroke-width="1.3" fill="none"/><path d="M4 17 l4 -2 v4Z M3 22 l4 -2 v4Z" fill="${shade(c, -30)}"/>` : ''),
  },
  star: {
    zone: 'sky', max: 3, colors: ['#ffd166', '#ff9f45', '#ff6b9d', '#f8fafc'], parts: [],
    draw: (c) => `<path d="M0 -15 L4.4 -5 L15 -4.6 L6.8 2.4 L9.4 13 L0 7 L-9.4 13 L-6.8 2.4 L-15 -4.6 L-4.4 -5Z" fill="${c}" stroke="${shade(c, -45)}" stroke-width="1.2" stroke-linejoin="round"/>`,
  },
  tree: {
    zone: 'ground', max: 3, colors: ['#4ade80', '#16a34a', '#a3e635', '#f59e0b'], parts: ['apples'], flip: true,
    draw: (c, hide) => `<rect x="-3" y="4" width="6" height="16" rx="2" fill="#8b5a2b"/>`
      + `<circle cx="0" cy="-5" r="13" fill="${c}"/><circle cx="-8" cy="2" r="8" fill="${c}"/><circle cx="8" cy="1" r="9" fill="${shade(c, -18)}"/>`
      + (has(hide, 'apples') ? '<g fill="#ff3b3b"><circle cx="5" cy="-8" r="2.6"/><circle cx="-6" cy="-2" r="2.6"/><circle cx="9" cy="4" r="2.4"/></g>' : ''),
  },
  house: {
    zone: 'ground', max: 2, colors: ['#ffd166', '#ff9f45', '#f8fafc', '#38bdf8', '#ff6b9d'], parts: ['window', 'door', 'chimney'], flip: true,
    draw: (c, hide) => (has(hide, 'chimney') ? '<rect x="7" y="-19" width="5" height="10" fill="#7c2d12"/>' : '')
      + `<rect x="-14" y="-4" width="28" height="22" fill="${c}" stroke="${shade(c, -50)}" stroke-width="1"/>`
      + '<path d="M-18 -3 L0 -19 L18 -3 Z" fill="#e8590c"/>'
      + (has(hide, 'door') ? '<rect x="2" y="6" width="8" height="12" rx="1.5" fill="#7c4a1e"/>' : '')
      + (has(hide, 'window') ? '<rect x="-11" y="1" width="8" height="7" fill="#bae6fd" stroke="#1e3a5f" stroke-width="1"/><path d="M-7 1 V8 M-11 4.5 H-3" stroke="#1e3a5f" stroke-width=".8"/>' : ''),
  },
  flower: {
    zone: 'ground', max: 3, colors: ['#ff6b9d', '#ff5d5d', '#b46bff', '#38bdf8', '#ff9f45'], parts: ['leaf', 'center'], flip: true,
    draw: (c, hide) => {
      const petals = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return `<circle cx="${(Math.cos(a) * 7).toFixed(1)}" cy="${(Math.sin(a) * 7 - 6).toFixed(1)}" r="5.6"/>`;
      }).join('');
      return '<path d="M0 0 V20" stroke="#16a34a" stroke-width="2.4"/>'
        + (has(hide, 'leaf') ? '<path d="M0 13 Q8 6 12 10 Q6 16 0 13Z" fill="#22c55e"/>' : '')
        + `<g fill="${c}">${petals}</g>`
        + (has(hide, 'center') ? '<circle cx="0" cy="-6" r="4" fill="#ffd166"/>' : '');
    },
  },
  mushroom: {
    zone: 'ground', max: 3, colors: ['#ff5d5d', '#ff9f45', '#b46bff'], parts: ['dots'], flip: true,
    draw: (c, hide) => '<rect x="-5" y="0" width="10" height="15" rx="3" fill="#fde7c7"/>'
      + `<path d="M-16 2 Q-16 -16 0 -16 Q16 -16 16 2 Z" fill="${c}"/>`
      + (has(hide, 'dots') ? '<g fill="#fff"><circle cx="-7" cy="-6" r="3"/><circle cx="5" cy="-10" r="2.4"/><circle cx="9" cy="-2" r="2"/></g>' : ''),
  },
  car: {
    zone: 'ground', max: 2, colors: ['#ff5d5d', '#38bdf8', '#ffd166', '#4ade80'], parts: ['window', 'light'], flip: true,
    draw: (c, hide) => `<path d="M-19 4 V-2 Q-19 -6 -15 -6 H-9 L-5 -13 H7 L12 -6 H16 Q19 -6 19 -2 V4 Z" fill="${c}"/>`
      + (has(hide, 'window') ? '<path d="M-4 -11 H6 L9 -6 H-7 Z" fill="#bae6fd"/>' : '')
      + (has(hide, 'light') ? '<circle cx="17" cy="-2" r="1.9" fill="#fff59d"/>' : '')
      + '<g fill="#1f2937"><circle cx="-10" cy="5" r="4.6"/><circle cx="11" cy="5" r="4.6"/></g><g fill="#cbd5e1"><circle cx="-10" cy="5" r="1.8"/><circle cx="11" cy="5" r="1.8"/></g>',
  },
  gift: {
    zone: 'ground', max: 2, colors: ['#ff6b9d', '#38bdf8', '#4ade80', '#b46bff'], parts: ['bow'],
    draw: (c, hide) => `<rect x="-13" y="-5" width="26" height="20" rx="2" fill="${c}"/><rect x="-15" y="-10" width="30" height="7" rx="2" fill="${shade(c, -30)}"/>`
      + '<rect x="-2.5" y="-10" width="5" height="25" fill="#ffd166"/>'
      + (has(hide, 'bow') ? '<path d="M0 -10 C-8 -19 -13 -11 0 -10 C13 -11 8 -19 0 -10Z" fill="#ffd166" stroke="#d99a00" stroke-width=".8"/>' : ''),
  },
  apple: {
    zone: 'ground', max: 2, colors: ['#ff5d5d', '#4ade80', '#ffd166'], parts: ['leaf'], flip: true,
    draw: (c, hide) => `<path d="M0 -8 C-6 -14 -16 -10 -15 0 C-14 10 -6 16 0 13 C6 16 14 10 15 0 C16 -10 6 -14 0 -8Z" fill="${c}"/>`
      + '<path d="M0 -8 Q1 -14 3 -16" stroke="#7c4a1e" stroke-width="2" fill="none"/>'
      + (has(hide, 'leaf') ? '<path d="M2 -13 Q9 -19 13 -12 Q6 -9 2 -13Z" fill="#22c55e"/>' : '')
      + '<ellipse cx="-7" cy="-3" rx="2.4" ry="4" fill="#fff" opacity=".35"/>',
  },
  icecream: {
    zone: 'ground', max: 2, colors: ['#ff9fc6', '#a7f3d0', '#fde68a', '#c4b5fd'], parts: ['cherry', 'sprinkles'],
    draw: (c, hide) => '<path d="M-9 0 L0 20 L9 0Z" fill="#e0a35a"/><path d="M-6 4 L4 4 M-4 9 L3 9" stroke="#b7742c" stroke-width="1"/>'
      + `<circle cx="0" cy="-4" r="10" fill="${c}"/>`
      + (has(hide, 'sprinkles') ? '<path d="M-5 -7 l2 -1 M3 -9 l2 1 M-1 -2 l2 1 M5 -3 l1 -2" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>' : '')
      + (has(hide, 'cherry') ? '<circle cx="0" cy="-15" r="3.2" fill="#dc2626"/>' : ''),
  },
  umbrella: {
    zone: 'ground', max: 2, colors: ['#ff5d5d', '#38bdf8', '#b46bff', '#ffd166'], parts: ['stripe'], flip: true,
    draw: (c, hide) => '<path d="M0 0 V14 Q0 18 -4 18 Q-7 18 -7 15" stroke="#334155" stroke-width="2" fill="none"/>'
      + `<path d="M-18 0 Q-18 -16 0 -16 Q18 -16 18 0 Q13 -4 9 0 Q4 -4 0 0 Q-4 -4 -9 0 Q-13 -4 -18 0Z" fill="${c}"/>`
      + (has(hide, 'stripe') ? '<path d="M0 -16 Q-5 -8 -9 0 M0 -16 Q5 -8 9 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".75"/>' : ''),
  },
  snail: {
    zone: 'ground', max: 2, colors: ['#ff9f45', '#b46bff', '#38bdf8'], parts: ['eyes', 'swirl'], flip: true,
    draw: (c, hide) => '<path d="M-17 12 H14 Q19 12 18 6 L14 2 Q12 8 6 8 H-14 Q-18 8 -17 12Z" fill="#a3e635"/>'
      + (has(hide, 'eyes') ? '<path d="M14 3 L16 -6 M17 3 L21 -4" stroke="#65a30d" stroke-width="1.4"/><circle cx="16" cy="-6" r="1.6" fill="#1e293b"/><circle cx="21" cy="-4" r="1.6" fill="#1e293b"/>' : '')
      + `<circle cx="-2" cy="-2" r="11" fill="${c}"/>`
      + (has(hide, 'swirl') ? `<path d="M-2 -2 m-6 0 a6 6 0 1 1 6 6 a3.5 3.5 0 1 1 -3 -4" stroke="${shade(c, -50)}" stroke-width="1.6" fill="none"/>` : ''),
  },
};

export const KIND_IDS = Object.keys(KINDS);

/** 背景：两幅图共用，绝不会成为差异 */
export const BACKDROPS = [
  {
    id: 'day', night: false,
    svg: `<defs><linearGradient id="sdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#dbeafe"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sdSky)"/>
      <path d="M0 132 Q90 112 190 128 T400 122 V300 H0Z" fill="#86efac"/>
      <path d="M0 210 Q120 196 240 214 T400 206 V300 H0Z" fill="#6bd98a" opacity=".55"/>`,
  },
  {
    id: 'sunset', night: false,
    svg: `<defs><linearGradient id="sdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f97362"/><stop offset=".7" stop-color="#fdba74"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sdSky)"/>
      <path d="M0 130 Q100 118 200 132 T400 124 V300 H0Z" fill="#a3c45a"/>
      <path d="M0 212 Q110 198 230 216 T400 204 V300 H0Z" fill="#8bb143" opacity=".6"/>`,
  },
  {
    id: 'night', night: true,
    svg: `<defs><linearGradient id="sdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sdSky)"/>
      <g fill="#fff" opacity=".55"><circle cx="40" cy="20" r="1"/><circle cx="120" cy="44" r="1.2"/><circle cx="230" cy="16" r="1"/><circle cx="300" cy="58" r="1.1"/><circle cx="372" cy="28" r="1"/><circle cx="180" cy="80" r=".9"/></g>
      <path d="M0 132 Q90 116 190 130 T400 124 V300 H0Z" fill="#256b45"/>
      <path d="M0 212 Q120 198 240 216 T400 206 V300 H0Z" fill="#1d5a3a" opacity=".7"/>`,
  },
];

export function drawObject(o) {
  const k = KINDS[o.kind];
  const sx = o.flip ? -o.s : o.s;
  return `<g transform="translate(${o.x.toFixed(1)} ${o.y.toFixed(1)}) scale(${sx.toFixed(3)} ${o.s.toFixed(3)})">${k.draw(o.color, o.hide)}</g>`;
}
