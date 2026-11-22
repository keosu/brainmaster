/**
 * 拼图大图：每个主题一张完整构图的插画（900×900）
 * ------------------------------------------------------------
 * 构图原则：天空 → 远景 → 地面自上而下有明显的色彩变化，中央放一个大主角跨越多块拼图，
 * 四周散布配角和道具 —— 切成 3×3 / 4×4 后每一块都有可辨认的位置线索，拼起来是一张完整的画。
 */
import { seeded } from '../core/utils.js';
import { heroFace, monsterFace, ANIMALS, SPACE, SHAPES } from './svg.js';

const strip = (svg) => svg.replace(/<\/?svg[^>]*>/g, '');

/** 把 100×100 的小图标放到 (cx,cy)，边长 size，可旋转 / 水平翻转 */
const place = (svg, cx, cy, size, rot = 0, flip = false) => {
  const s = (size / 100).toFixed(3);
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${flip ? -s : s} ${s}) translate(-50 -50)">${strip(svg)}</g>`;
};

const frame = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900"><defs>${defs}</defs>${body}</svg>`;

const vgrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

const cloud = (x, y, s, o = 0.92, c = '#fff') =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}" opacity="${o}">
     <ellipse cx="0" cy="0" rx="46" ry="26"/><ellipse cx="-34" cy="8" rx="30" ry="18"/>
     <ellipse cx="36" cy="9" rx="32" ry="19"/><ellipse cx="4" cy="-16" rx="26" ry="18"/>
   </g>`;

function stars(rng, n, yMax, color = '#fff') {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (rng() * 900).toFixed(0);
    const y = (rng() * yMax).toFixed(0);
    const r = (rng() * 2.6 + 0.8).toFixed(1);
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${(0.35 + rng() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

const tree = (x, y, s, leaf = '#3fae5a') =>
  `<g transform="translate(${x} ${y}) scale(${s})">
     <rect x="-9" y="-60" width="18" height="62" rx="6" fill="#8a5a32"/>
     <circle cx="0" cy="-92" r="46" fill="${leaf}"/><circle cx="-30" cy="-70" r="30" fill="${leaf}"/>
     <circle cx="30" cy="-72" r="32" fill="${leaf}"/><circle cx="-12" cy="-112" r="22" fill="#fff" opacity=".12"/>
   </g>`;

const flower = (x, y, c) =>
  `<g transform="translate(${x} ${y})"><path d="M0 0 V-26" stroke="#3d9a4a" stroke-width="4"/>
     <g fill="${c}" transform="translate(0 -30)"><circle cx="0" cy="-8" r="7"/><circle cx="8" cy="0" r="7"/><circle cx="0" cy="8" r="7"/><circle cx="-8" cy="0" r="7"/></g>
     <circle cx="0" cy="-30" r="5" fill="#ffd166"/></g>`;

/* ============================================================
 * 光之英雄：夕阳下的城市，巨人英雄摆出招牌姿势
 * ========================================================== */
export function heroesScene() {
  const rng = seeded(11);
  const skyline = (base, color, minH, maxH, lit) => {
    let x = -20, out = '';
    while (x < 920) {
      const w = 46 + rng() * 60;
      const h = minH + rng() * (maxH - minH);
      out += `<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${color}"/>`;
      if (lit) {
        for (let wy = base - h + 14; wy < base - 20; wy += 22) {
          for (let wx = x + 9; wx < x + w - 12; wx += 16) {
            if (rng() < 0.42) out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="8" height="11" rx="1.5" fill="#ffd77a" opacity="${(0.55 + rng() * 0.45).toFixed(2)}"/>`;
          }
        }
      }
      x += w + 4;
    }
    return out;
  };

  // 英雄身体（局部坐标 200×400，头部占 0~100）
  const silver = 'url(#hsilver)';
  const red = '#e0243a';
  const hero = `
    <g transform="translate(270 168) scale(1.8)">
      <path d="M44 118 L12 30" stroke="${silver}" stroke-width="30" stroke-linecap="round"/>
      <path d="M44 118 L12 30" stroke="${red}" stroke-width="9" stroke-linecap="round" opacity=".9"/>
      <circle cx="12" cy="26" r="17" fill="#d9e1ef" stroke="#8f9bb3" stroke-width="2"/>
      <path d="M156 118 L186 214" stroke="${silver}" stroke-width="30" stroke-linecap="round"/>
      <path d="M156 118 L186 214" stroke="${red}" stroke-width="9" stroke-linecap="round" opacity=".9"/>
      <path d="M84 236 L74 396" stroke="${silver}" stroke-width="36" stroke-linecap="round"/>
      <path d="M116 236 L126 396" stroke="${silver}" stroke-width="36" stroke-linecap="round"/>
      <path d="M70 250 L62 380" stroke="${red}" stroke-width="10" stroke-linecap="round"/>
      <path d="M130 250 L138 380" stroke="${red}" stroke-width="10" stroke-linecap="round"/>
      <rect x="84" y="88" width="32" height="26" rx="8" fill="#cfd8e8"/>
      <path d="M40 112 Q100 96 160 112 L146 236 Q100 248 54 236 Z" fill="${silver}" stroke="#8f9bb3" stroke-width="2"/>
      <path d="M48 116 Q74 150 70 236 L56 236 Q44 170 40 120 Z" fill="${red}"/>
      <path d="M152 116 Q126 150 130 236 L144 236 Q156 170 160 120 Z" fill="${red}"/>
      <path d="M78 104 Q100 124 122 104 L118 118 Q100 132 82 118 Z" fill="${red}"/>
      <circle cx="100" cy="158" r="17" fill="#0c1a3a"/>
      <circle cx="100" cy="158" r="12" fill="url(#htimer)"/>
      <circle cx="96" cy="153" r="4" fill="#fff" opacity=".8"/>
      <rect x="56" y="226" width="88" height="14" rx="6" fill="#9aa6bd"/>
      ${place(heroFace({ stripe: red, eye: '#ffe066' }), 100, 50, 108)}
    </g>`;

  const trail = (x1, y1, x2, y2, c) =>
    `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="26" stroke-linecap="round" opacity=".28"/>
     <path d="M${x1} ${y1} L${x2} ${y2}" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".55"/>`;

  return frame(
    vgrad('hsky', [[0, '#16205c'], [0.42, '#4c3f9e'], [0.68, '#d9668a'], [0.86, '#ffa06a'], [1, '#ffd38a']])
    + vgrad('hsilver', [[0, '#f4f7fc'], [1, '#b7c3d8']])
    + '<radialGradient id="hsun"><stop offset="0" stop-color="#fff6cf"/><stop offset=".6" stop-color="#ffcf6e"/><stop offset="1" stop-color="#ff9a55" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="htimer"><stop offset="0" stop-color="#d6fbff"/><stop offset="1" stop-color="#3fb8ff"/></radialGradient>'
    + '<radialGradient id="haura"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>',
    `<rect width="900" height="900" fill="url(#hsky)"/>
     ${stars(rng, 60, 330)}
     <circle cx="450" cy="640" r="300" fill="url(#hsun)"/>
     ${cloud(150, 330, 1.2, 0.35, '#ffd9e4')}${cloud(760, 300, 1.0, 0.3, '#ffd9e4')}
     ${skyline(760, '#5a3f86', 140, 330, false)}
     ${skyline(800, '#2c2462', 90, 240, true)}
     <rect y="790" width="900" height="110" fill="#1b1744"/>
     <path d="M0 846 H900" stroke="#ffd166" stroke-width="6" stroke-dasharray="44 34" opacity=".7"/>
     <ellipse cx="450" cy="420" rx="300" ry="360" fill="url(#haura)"/>
     ${trail(40, 330, 150, 250, '#6ee7ff')}${trail(870, 150, 770, 210, '#ffd166')}
     ${place(heroFace({ stripe: '#2f6fe0', eye: '#8ef2ff' }), 175, 230, 120, -24)}
     ${place(heroFace({ stripe: '#16a34a', eye: '#ffe066' }), 740, 220, 104, 22)}
     ${hero}`,
  );
}

/* ============================================================
 * 怪兽军团：月夜下的怪兽山谷
 * ========================================================== */
export function monstersScene() {
  const rng = seeded(23);
  const body = '#7b5cff';
  const big = `
    <path d="M610 760 Q760 720 790 600 Q800 570 770 590 Q740 690 610 700 Z" fill="#6544e0"/>
    <ellipse cx="450" cy="720" rx="200" ry="175" fill="${body}" stroke="#4a2fb0" stroke-width="5"/>
    <ellipse cx="450" cy="750" rx="125" ry="115" fill="#b9a6ff" opacity=".55"/>
    <path d="M400 700 q50 30 100 0 M410 750 q40 24 80 0 M420 800 q30 18 60 0" stroke="#7d63e8" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="270" cy="640" rx="44" ry="66" fill="${body}" stroke="#4a2fb0" stroke-width="5" transform="rotate(-35 270 640)"/>
    <ellipse cx="630" cy="640" rx="44" ry="66" fill="${body}" stroke="#4a2fb0" stroke-width="5" transform="rotate(35 630 640)"/>
    <ellipse cx="360" cy="880" rx="74" ry="40" fill="#5a3ccf"/>
    <ellipse cx="540" cy="880" rx="74" ry="40" fill="#5a3ccf"/>
    ${place(monsterFace({ body, horn: '#ffd166', spikes: 3 }), 450, 430, 400)}`;

  const mushroom = (x, y, s, c) =>
    `<g transform="translate(${x} ${y}) scale(${s})">
       <ellipse cx="0" cy="-34" rx="56" ry="56" fill="${c}" opacity=".18"/>
       <rect x="-10" y="-40" width="20" height="44" rx="8" fill="#efe6ff"/>
       <path d="M-38 -38 Q0 -86 38 -38 Z" fill="${c}"/>
       <circle cx="-14" cy="-52" r="6" fill="#fff" opacity=".8"/><circle cx="12" cy="-60" r="4" fill="#fff" opacity=".7"/>
     </g>`;

  const crystal = (x, y, s, c) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 L-16 -50 L0 -90 L16 -50 Z" fill="${c}" opacity=".9"/>
       <path d="M0 0 L0 -90 L16 -50 Z" fill="#fff" opacity=".25"/></g>`;

  return frame(
    vgrad('msky', [[0, '#120a33'], [0.5, '#3a2178'], [1, '#7a3c80']])
    + vgrad('mground', [[0, '#3b2a6b'], [1, '#1c1238']])
    + '<radialGradient id="mmoon"><stop offset="0" stop-color="#fff9dc"/><stop offset="1" stop-color="#ffe7a3"/></radialGradient>'
    + '<radialGradient id="mhalo"><stop offset="0" stop-color="#fff2b8" stop-opacity=".45"/><stop offset="1" stop-color="#fff2b8" stop-opacity="0"/></radialGradient>',
    `<rect width="900" height="900" fill="url(#msky)"/>
     ${stars(rng, 70, 420)}
     <circle cx="720" cy="150" r="150" fill="url(#mhalo)"/>
     <circle cx="720" cy="150" r="72" fill="url(#mmoon)"/>
     <circle cx="696" cy="134" r="12" fill="#f0d98e"/><circle cx="742" cy="172" r="8" fill="#f0d98e"/><circle cx="738" cy="118" r="6" fill="#f0d98e"/>
     ${cloud(220, 150, 1.1, 0.18)}${cloud(520, 90, 0.8, 0.14)}
     <path d="M0 520 L140 330 L250 460 L380 290 L520 470 L640 360 L780 480 L900 380 L900 640 L0 640 Z" fill="#2c1c5c"/>
     <path d="M0 580 L120 470 L260 560 L420 450 L560 560 L720 470 L900 560 L900 680 L0 680 Z" fill="#3a2672"/>
     <path d="M0 610 C200 580 360 640 520 610 C680 580 780 600 900 590 L900 900 L0 900 Z" fill="url(#mground)"/>
     ${crystal(90, 640, 1.1, '#6ee7ff')}${crystal(120, 650, 0.7, '#b46bff')}${crystal(810, 630, 1, '#ff6b9d')}${crystal(840, 640, 0.6, '#6ee7ff')}
     <g fill="#2a1c52"><ellipse cx="160" cy="840" rx="90" ry="34"/><ellipse cx="760" cy="850" rx="100" ry="36"/></g>
     ${place(monsterFace({ body: '#22c55e', horn: '#ff9f45', spikes: 2 }), 150, 760, 170, -8)}
     ${place(monsterFace({ body: '#f97316', horn: '#ffe066', spikes: 4 }), 760, 770, 160, 8)}
     ${place(monsterFace({ body: '#0ea5e9', horn: '#ffd166', spikes: 1 }), 200, 380, 120, -14)}
     ${place(monsterFace({ body: '#e11d48', horn: '#ffd166', spikes: 3 }), 610, 300, 96, 12)}
     ${big}
     ${mushroom(60, 900, 1.3, '#6ee7ff')}${mushroom(860, 900, 1.2, '#ff6b9d')}${mushroom(300, 900, 0.8, '#b46bff')}`,
  );
}

/* ============================================================
 * 动物伙伴：彩虹草地上的动物聚会
 * ========================================================== */
export function animalsScene() {
  const rng = seeded(37);
  const sitter = (face, fur, cx, groundY, size, belly = '#fff') => {
    const bw = size * 0.46, bh = size * 0.42;
    return `<ellipse cx="${cx}" cy="${groundY - bh}" rx="${bw}" ry="${bh}" fill="${fur}" stroke="rgba(0,0,0,.25)" stroke-width="3"/>
      <ellipse cx="${cx}" cy="${groundY - bh * 0.85}" rx="${bw * 0.55}" ry="${bh * 0.62}" fill="${belly}" opacity=".85"/>
      <ellipse cx="${cx - bw * 0.55}" cy="${groundY - 6}" rx="${bw * 0.36}" ry="${bh * 0.2}" fill="${fur}" stroke="rgba(0,0,0,.25)" stroke-width="3"/>
      <ellipse cx="${cx + bw * 0.55}" cy="${groundY - 6}" rx="${bw * 0.36}" ry="${bh * 0.2}" fill="${fur}" stroke="rgba(0,0,0,.25)" stroke-width="3"/>
      ${place(face, cx, groundY - bh * 1.7 - size * 0.18, size)}`;
  };
  const rainbow = ['#ff5d5d', '#ff9f45', '#ffd166', '#4ade80', '#38bdf8', '#6366f1', '#b46bff']
    .map((c, i) => `<path d="M520 520 A${330 - i * 22} ${330 - i * 22} 0 0 1 ${1180 - i * 44} 520" stroke="${c}" stroke-width="22" fill="none" opacity=".75"/>`).join('');

  let flowers = '';
  const fc = ['#ff6b9d', '#ffd166', '#b46bff', '#ff9f45', '#fff'];
  for (let i = 0; i < 22; i++) flowers += flower((30 + rng() * 840).toFixed(0), (700 + rng() * 190).toFixed(0), fc[i % fc.length]);

  const fence = Array.from({ length: 13 }, (_, i) => `<rect x="${i * 72 + 6}" y="560" width="22" height="86" rx="6" fill="#f3e2c3" stroke="#c9a46a" stroke-width="3"/>`).join('');

  return frame(
    vgrad('asky', [[0, '#6cc8ff'], [0.6, '#bfeaff'], [1, '#e9f9ff']])
    + vgrad('aground', [[0, '#82cf6a'], [1, '#4f9f45']])
    + '<radialGradient id="asun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".55" stop-color="#ffe066"/><stop offset="1" stop-color="#ffb84d"/></radialGradient>',
    `<rect width="900" height="900" fill="url(#asky)"/>
     <g stroke="#ffe27a" stroke-width="10" stroke-linecap="round" opacity=".8">
       ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${(150 + Math.cos(a) * 92).toFixed(0)} ${(140 + Math.sin(a) * 92).toFixed(0)} L${(150 + Math.cos(a) * 122).toFixed(0)} ${(140 + Math.sin(a) * 122).toFixed(0)}"/>`; }).join('')}
     </g>
     <circle cx="150" cy="140" r="72" fill="url(#asun)"/>
     ${rainbow}
     ${cloud(420, 120, 1.15)}${cloud(700, 70, 0.8, 0.85)}${cloud(330, 290, 0.7, 0.7)}
     <ellipse cx="160" cy="600" rx="320" ry="140" fill="#9ddb86"/>
     <ellipse cx="760" cy="610" rx="340" ry="150" fill="#8fd27b"/>
     ${tree(80, 600, 1.35)}${tree(830, 590, 1.2, '#36a650')}${tree(300, 560, 0.75, '#4cb862')}
     ${fence}
     <rect x="0" y="584" width="900" height="14" fill="#e8d2a8"/><rect x="0" y="616" width="900" height="14" fill="#e8d2a8"/>
     <path d="M0 640 C220 620 420 660 620 640 C760 626 840 630 900 636 L900 900 L0 900 Z" fill="url(#aground)"/>
     <ellipse cx="730" cy="830" rx="170" ry="58" fill="#4fb6e8"/><ellipse cx="730" cy="822" rx="150" ry="44" fill="#7fd3f7"/>
     <ellipse cx="660" cy="830" rx="34" ry="14" fill="#3fa458"/>
     ${flowers}
     ${place(ANIMALS.fox(), 720, 556, 110, 6)}
     ${place(ANIMALS.penguin(), 585, 548, 100, -6)}
     ${sitter(ANIMALS.cat(), '#f7b267', 160, 860, 190)}
     ${sitter(ANIMALS.rabbit(), '#f3e8ff', 560, 830, 150)}
     ${place(ANIMALS.frog(), 760, 800, 110)}
     ${sitter(ANIMALS.panda(), '#fdfdfd', 380, 880, 280, '#f1f1f1')}`,
  );
}

/* ============================================================
 * 宇宙探险：火箭冲向星海
 * ========================================================== */
export function spaceScene() {
  const rng = seeded(53);
  return frame(
    '<radialGradient id="sbg" cx=".45" cy=".4" r=".85"><stop offset="0" stop-color="#26307a"/><stop offset=".55" stop-color="#121a4a"/><stop offset="1" stop-color="#060a22"/></radialGradient>'
    + '<linearGradient id="splanet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd28a"/><stop offset=".5" stop-color="#ff8a6b"/><stop offset="1" stop-color="#c2477a"/></linearGradient>'
    + '<linearGradient id="searth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fd6ff"/><stop offset="1" stop-color="#2557c9"/></linearGradient>'
    + '<linearGradient id="sflame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5d5d" stop-opacity="0"/></linearGradient>'
    + '<filter id="sblur"><feGaussianBlur stdDeviation="40"/></filter>',
    `<rect width="900" height="900" fill="url(#sbg)"/>
     <g filter="url(#sblur)" opacity=".55">
       <ellipse cx="620" cy="300" rx="260" ry="130" fill="#b46bff"/>
       <ellipse cx="300" cy="620" rx="240" ry="120" fill="#3fa6ff"/>
       <ellipse cx="760" cy="640" rx="150" ry="90" fill="#ff6b9d"/>
     </g>
     ${stars(rng, 140, 900)}
     ${stars(rng, 14, 900, '#ffe9a8')}
     <g transform="rotate(-18 210 230)">
       <ellipse cx="210" cy="230" rx="230" ry="44" fill="none" stroke="#ffe0a6" stroke-width="16" opacity=".55"/>
       <circle cx="210" cy="230" r="140" fill="url(#splanet)"/>
       <path d="M80 200 Q210 240 340 200 M86 262 Q210 300 334 262" stroke="#ffb27a" stroke-width="14" fill="none" opacity=".7"/>
       <path d="M-20 230 A230 44 0 0 0 440 230" fill="none" stroke="#ffe0a6" stroke-width="16" opacity=".85"/>
     </g>
     <circle cx="830" cy="930" r="300" fill="url(#searth)"/>
     <path d="M600 760 q60 -40 120 -10 t110 30 q-20 50 -90 60 t-140 -80 Z M760 660 q50 -10 90 20 q-30 30 -80 20 Z" fill="#4ade80" opacity=".85"/>
     <circle cx="830" cy="930" r="300" fill="none" stroke="#9be7ff" stroke-width="10" opacity=".35"/>
     ${place(SPACE.moon(), 770, 140, 150)}
     ${place(SPACE.comet(), 560, 120, 140, 10)}
     ${place(SPACE.ufo(), 690, 420, 170, -8)}
     ${place(SPACE.satellite(), 140, 780, 140, -25)}
     ${place(SPACE.astronaut(), 250, 560, 190, -16)}
     <g transform="translate(470 450) rotate(32)">
       <path d="M-34 120 Q0 330 34 120 Z" fill="url(#sflame)"/>
       <path d="M-16 120 Q0 230 16 120 Z" fill="#fffbe6" opacity=".9"/>
     </g>
     ${place(SPACE.rocket(), 470, 450, 360, 32)}
     ${place(SPACE.star(), 400, 120, 70)}${place(SPACE.star(), 860, 330, 56)}${place(SPACE.star(), 60, 470, 60)}`,
  );
}

/* ============================================================
 * 几何图形：几何小镇（房子、树、太阳全由基本图形组成）
 * ========================================================== */
export function shapesScene() {
  const house = (x, y, w, body, roof, door = '#8a5a32') => {
    const h = w * 0.82;
    return `<g transform="translate(${x} ${y})">
      <rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" rx="8" fill="${body}" stroke="rgba(0,0,0,.2)" stroke-width="4"/>
      <path d="M${-w / 2 - 22} ${-h + 4} L0 ${-h - w * 0.62} L${w / 2 + 22} ${-h + 4} Z" fill="${roof}" stroke="rgba(0,0,0,.2)" stroke-width="4" stroke-linejoin="round"/>
      <rect x="${-w * 0.12}" y="${-h * 0.46}" width="${w * 0.24}" height="${h * 0.46}" rx="${w * 0.12}" fill="${door}"/>
      <circle cx="${w * 0.06}" cy="${-h * 0.22}" r="4" fill="#ffd166"/>
      <rect x="${-w * 0.4}" y="${-h * 0.78}" width="${w * 0.2}" height="${w * 0.2}" rx="4" fill="#bff1ff" stroke="#fff" stroke-width="4"/>
      <rect x="${w * 0.2}" y="${-h * 0.78}" width="${w * 0.2}" height="${w * 0.2}" rx="4" fill="#bff1ff" stroke="#fff" stroke-width="4"/>
      <circle cx="0" cy="${-h - w * 0.26}" r="${w * 0.1}" fill="#fff" opacity=".9"/>
    </g>`;
  };
  const pine = (x, y, s, c = '#2fa860') =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-30" width="16" height="32" fill="#8a5a32"/>
       <path d="M0 -150 L44 -80 L-44 -80 Z M0 -118 L54 -40 L-54 -40 Z M0 -86 L62 -20 L-62 -20 Z" fill="${c}"/></g>`;
  const balloon = (svg, x, y, size, rot = 0) =>
    `<path d="M${x} ${y + size * 0.42} q-14 50 6 110" stroke="#ffffff" stroke-width="3" fill="none" opacity=".8"/>${place(svg, x, y, size, rot)}`;

  let road = '';
  for (let i = 0; i < 9; i++) road += `<rect x="${i * 104 - 10}" y="812" width="84" height="34" rx="12" fill="#e6dccb" stroke="#c9b99c" stroke-width="3"/>`;

  return frame(
    vgrad('gsky', [[0, '#8fd3ff'], [0.65, '#d6f3ff'], [1, '#f3fbff']])
    + vgrad('gground', [[0, '#7fd06e'], [1, '#55a84b']]),
    `<rect width="900" height="900" fill="url(#gsky)"/>
     <g transform="translate(760 140)">
       ${Array.from({ length: 10 }, (_, i) => `<path d="M0 -118 L14 -88 L-14 -88 Z" fill="#ffc94a" transform="rotate(${i * 36})"/>`).join('')}
       <circle r="74" fill="#ffd34d" stroke="#ffb82e" stroke-width="6"/>
       <circle cx="-22" cy="-10" r="7" fill="#7a4a12"/><circle cx="22" cy="-10" r="7" fill="#7a4a12"/>
       <path d="M-26 18 Q0 40 26 18" stroke="#7a4a12" stroke-width="6" fill="none" stroke-linecap="round"/>
     </g>
     ${cloud(180, 120, 1.1)}${cloud(470, 200, 0.8, 0.85)}
     ${balloon(SHAPES.heart('#ff5d7a'), 330, 110, 90, -8)}
     ${balloon(SHAPES.hexagon('#4ade80'), 560, 90, 76, 10)}
     ${balloon(SHAPES.star('#b46bff'), 96, 300, 84, -12)}
     <path d="M-60 640 A260 260 0 0 1 460 640 Z" fill="#9fdc84"/>
     <path d="M380 640 A300 300 0 0 1 980 640 Z" fill="#8ed175"/>
     <path d="M0 620 C200 600 440 640 640 620 C780 606 860 612 900 616 L900 900 L0 900 Z" fill="url(#gground)"/>
     ${pine(70, 720, 1.25)}${pine(860, 700, 1.1, '#26965a')}
     <g transform="translate(600 720)"><rect x="-10" y="-70" width="20" height="72" fill="#8a5a32"/><circle cx="0" cy="-104" r="52" fill="#3fbf6a"/><circle cx="-18" cy="-118" r="14" fill="#fff" opacity=".18"/></g>
     ${house(230, 760, 210, '#ff8fb1', '#e0436c')}
     ${house(440, 770, 170, '#ffd166', '#ff8a3d', '#5b8cff')}
     ${house(730, 780, 190, '#7cc3ff', '#4a6fe0')}
     ${road}
     ${place(SHAPES.flower('#ff6b9d'), 70, 860, 60)}${place(SHAPES.flower('#b46bff'), 340, 870, 52)}
     ${place(SHAPES.flower('#ffb02e'), 560, 870, 56)}${place(SHAPES.flower('#ff5d5d'), 850, 870, 60)}
     ${place(SHAPES.diamond('#ff9f45'), 160, 870, 42)}${place(SHAPES.circle('#38bdf8'), 680, 872, 40)}`,
  );
}
