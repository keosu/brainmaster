/**
 * 程序化 SVG 素材库
 * ------------------------------------------------------------
 * 这里的图形全部由代码生成，零外部资源、零版权风险。
 * 后期想换成奥特曼 / 汪汪队 / 恐龙等真实素材时，
 * 不需要动这里 —— 直接在 themes/index.js 里注册一个"图片主题"即可：
 *   { id:'ultraman', kind:'image', faces:[{name:'迪迦', img:'assets/ultraman/01.png'}], art:'assets/ultraman/scene.jpg' }
 */
import { shade, seeded } from '../core/utils.js';

const wrap = (inner, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${extra}${inner}</svg>`;

const grad = (id, from, to, angle = 90) =>
  `<defs><linearGradient id="${id}" gradientTransform="rotate(${angle} .5 .5)">
     <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
   </linearGradient></defs>`;

const glow = (id, color, blur = 3.2) =>
  `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">
     <feGaussianBlur stdDeviation="${blur}" result="b"/>
     <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
   </filter>`;

/* ============================================================
 * 1. 光之英雄（奥特曼风格：银色头盔 + 彩色条纹 + 发光眼 + 计时灯）
 * ========================================================== */
export function heroFace({ base = '#eef3fb', stripe = '#e0243a', eye = '#ffe066', visor = '#1b2a4a', crest = true } = {}) {
  return wrap(
    `<ellipse cx="50" cy="54" rx="35" ry="41" fill="${base}" stroke="${shade(base, -40)}" stroke-width="2"/>
     <path d="M50 13 C60 24 61 42 50 52 C39 42 40 24 50 13Z" fill="${stripe}"/>
     ${crest ? `<path d="M50 13 L57 30 L50 26 L43 30 Z" fill="${shade(stripe, 40)}" opacity=".9"/>` : ''}
     <path d="M16 46 C26 32 74 32 84 46 C74 40 26 40 16 46Z" fill="${shade(stripe, -20)}" opacity=".55"/>
     <ellipse cx="35" cy="55" rx="10" ry="14" fill="${visor}" transform="rotate(-10 35 55)"/>
     <ellipse cx="65" cy="55" rx="10" ry="14" fill="${visor}" transform="rotate(10 65 55)"/>
     <ellipse cx="35" cy="55" rx="7" ry="10" fill="${eye}" transform="rotate(-10 35 55)"/>
     <ellipse cx="65" cy="55" rx="7" ry="10" fill="${eye}" transform="rotate(10 65 55)"/>
     <circle cx="50" cy="80" r="8" fill="#0c1330"/>
     <circle cx="50" cy="80" r="5.5" fill="${eye}"/>
     <path d="M42 90 Q50 96 58 90" stroke="${shade(base, -50)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    grad('hb', shade(base, 18), shade(base, -18)) + glow('hg', eye, 2.4)
  );
}

/* ============================================================
 * 2. 怪兽（圆胖身体 + 犄角 + 大牙）
 * ========================================================== */
export function monsterFace({ body = '#7b5cff', horn = '#ffd166', eye = '#fff7d6', pupil = '#24123f', spikes = 3 } = {}) {
  let spike = '';
  for (let i = 0; i < spikes; i++) {
    const x = 34 + i * 16;
    spike += `<path d="M${x} 14 L${x + 6} 26 L${x + 12} 14 Z" fill="${horn}"/>`;
  }
  return wrap(
    `${spike}
     <ellipse cx="50" cy="56" rx="38" ry="36" fill="${body}" stroke="${shade(body, -45)}" stroke-width="2"/>
     <ellipse cx="34" cy="52" rx="12" ry="13" fill="${eye}"/>
     <ellipse cx="66" cy="52" rx="12" ry="13" fill="${eye}"/>
     <circle cx="36" cy="53" r="5.5" fill="${pupil}"/>
     <circle cx="64" cy="53" r="5.5" fill="${pupil}"/>
     <path d="M32 74 Q50 90 68 74 Z" fill="#2b0f2a"/>
     <path d="M38 74 l4 8 l4 -8 M50 74 l4 8 l4 -8 M62 74 l3 7 l3 -7" fill="#fff" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>`,
    grad('mb', shade(body, 26), shade(body, -22)) + glow('mg', horn, 1.6)
  );
}

/* ============================================================
 * 3. 动物
 * ========================================================== */
const animalBase = (fur, inner) =>
  wrap(`<circle cx="50" cy="54" r="34" fill="${fur}" stroke="${shade(fur, -45)}" stroke-width="2"/>${inner}`);

export const ANIMALS = {
  cat: () => animalBase('#f7b267', `<path d="M22 34 L30 12 L44 26 Z" fill="#f7b267" stroke="#c9863f" stroke-width="2"/>
      <path d="M78 34 L70 12 L56 26 Z" fill="#f7b267" stroke="#c9863f" stroke-width="2"/>
      <ellipse cx="37" cy="50" rx="5" ry="8" fill="#2b2118"/><ellipse cx="63" cy="50" rx="5" ry="8" fill="#2b2118"/>
      <path d="M50 60 l-5 5 h10 z" fill="#ff8fa3"/>
      <path d="M50 66 q-7 8 -12 2 M50 66 q7 8 12 2" stroke="#8a5a2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g stroke="#8a5a2b" stroke-width="1.6" stroke-linecap="round"><path d="M14 56 h12 M14 62 h12"/><path d="M86 56 H74 M86 62 H74"/></g>`),
  panda: () => animalBase('#fdfdfd', `<circle cx="24" cy="30" r="11" fill="#26262e"/><circle cx="76" cy="30" r="11" fill="#26262e"/>
      <ellipse cx="37" cy="50" rx="9" ry="11" fill="#26262e"/><ellipse cx="63" cy="50" rx="9" ry="11" fill="#26262e"/>
      <circle cx="37" cy="49" r="3.4" fill="#fff"/><circle cx="63" cy="49" r="3.4" fill="#fff"/>
      <ellipse cx="50" cy="66" rx="7" ry="5" fill="#26262e"/>
      <path d="M50 71 v5 M50 76 q-6 6 -10 1 M50 76 q6 6 10 1" stroke="#26262e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  fox: () => animalBase('#ff8f4d', `<path d="M20 32 L26 8 L46 24 Z" fill="#ff8f4d" stroke="#c95f22" stroke-width="2"/>
      <path d="M80 32 L74 8 L54 24 Z" fill="#ff8f4d" stroke="#c95f22" stroke-width="2"/>
      <path d="M50 56 q-22 22 -30 6 q14 6 30 4 q16 2 30 -4 q-8 16 -30 -6 z" fill="#fff4e8"/>
      <ellipse cx="37" cy="50" rx="5" ry="7" fill="#33231c"/><ellipse cx="63" cy="50" rx="5" ry="7" fill="#33231c"/>
      <path d="M50 62 l-5 6 h10 z" fill="#33231c"/>`),
  frog: () => animalBase('#5fd35f', `<circle cx="31" cy="28" r="13" fill="#5fd35f" stroke="#2f8f3a" stroke-width="2"/><circle cx="69" cy="28" r="13" fill="#5fd35f" stroke="#2f8f3a" stroke-width="2"/>
      <circle cx="31" cy="28" r="6" fill="#fff"/><circle cx="69" cy="28" r="6" fill="#fff"/>
      <circle cx="31" cy="28" r="3" fill="#1a1a1a"/><circle cx="69" cy="28" r="3" fill="#1a1a1a"/>
      <path d="M28 68 q22 18 44 0" stroke="#2f8f3a" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  penguin: () => animalBase('#2b3550', `<ellipse cx="50" cy="62" rx="24" ry="26" fill="#f6f8ff"/>
      <ellipse cx="42" cy="46" rx="4.6" ry="5.6" fill="#1a1a1a"/><ellipse cx="58" cy="46" rx="4.6" ry="5.6" fill="#1a1a1a"/>
      <path d="M50 54 l-8 8 h16 z" fill="#ffb703"/><ellipse cx="50" cy="86" rx="12" ry="6" fill="#ffb703"/>`),
  lion: () => animalBase('#f2c14e', `<circle cx="50" cy="54" r="42" fill="none" stroke="#c98f2e" stroke-width="10" stroke-dasharray="6 8"/>
      <ellipse cx="37" cy="50" rx="5" ry="7" fill="#3a2a12"/><ellipse cx="63" cy="50" rx="5" ry="7" fill="#3a2a12"/>
      <path d="M50 60 l-6 6 h12 z" fill="#8a4b2a"/>
      <path d="M50 66 v4 M50 70 q-8 8 -12 1 M50 70 q8 8 12 1" stroke="#8a5a2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  rabbit: () => animalBase('#f3e8ff', `<ellipse cx="36" cy="16" rx="8" ry="20" fill="#f3e8ff" stroke="#c9a7e8" stroke-width="2"/>
      <ellipse cx="64" cy="16" rx="8" ry="20" fill="#f3e8ff" stroke="#c9a7e8" stroke-width="2"/>
      <ellipse cx="37" cy="52" rx="5.4" ry="7" fill="#4b3357"/><ellipse cx="63" cy="52" rx="5.4" ry="7" fill="#4b3357"/>
      <path d="M50 61 l-4 4 h8 z" fill="#ff8fa3"/>
      <path d="M50 65 v4 M50 69 q-7 6 -10 1 M50 69 q7 6 10 1" stroke="#c9a7e8" stroke-width="2.2" fill="none" stroke-linecap="round"/>`),
  bear: () => animalBase('#a9743f', `<circle cx="26" cy="30" r="12" fill="#a9743f" stroke="#7c5227" stroke-width="2"/><circle cx="74" cy="30" r="12" fill="#a9743f" stroke="#7c5227" stroke-width="2"/>
      <ellipse cx="50" cy="68" rx="16" ry="13" fill="#f0d3a8"/>
      <ellipse cx="38" cy="50" rx="4.6" ry="6" fill="#2b1d10"/><ellipse cx="62" cy="50" rx="4.6" ry="6" fill="#2b1d10"/>
      <ellipse cx="50" cy="62" rx="6" ry="4.6" fill="#3a2617"/>`),
  tiger: () => animalBase('#f0a24a', `<circle cx="26" cy="30" r="11" fill="#f0a24a" stroke="#b96f21" stroke-width="2"/><circle cx="74" cy="30" r="11" fill="#f0a24a" stroke="#b96f21" stroke-width="2"/>
      <g stroke="#3a2412" stroke-width="4" stroke-linecap="round"><path d="M50 24 v10"/><path d="M34 32 q6 8 0 14"/><path d="M66 32 q-6 8 0 14"/></g>
      <ellipse cx="37" cy="52" rx="5" ry="7" fill="#3a2412"/><ellipse cx="63" cy="52" rx="5" ry="7" fill="#3a2412"/>
      <path d="M50 60 l-6 6 h12 z" fill="#3a2412"/>
      <path d="M50 66 v4 M50 70 q-7 6 -11 1 M50 70 q7 6 11 1" stroke="#3a2412" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
  cow: () => animalBase('#fdfdfd', `<path d="M20 34 q-10 -20 4 -22 q10 -2 12 14 z" fill="#fdfdfd" stroke="#c9c9d4" stroke-width="2"/>
      <path d="M80 34 q10 -20 -4 -22 q-10 -2 -12 14 z" fill="#fdfdfd" stroke="#c9c9d4" stroke-width="2"/>
      <path d="M18 46 q14 16 26 4 q-12 16 -26 -4z" fill="#33333d" opacity=".85"/>
      <path d="M70 66 q16 12 22 -2 q-6 16 -22 2z" fill="#33333d" opacity=".85"/>
      <ellipse cx="38" cy="52" rx="5" ry="7" fill="#33333d"/><ellipse cx="62" cy="52" rx="5" ry="7" fill="#33333d"/>
      <ellipse cx="50" cy="70" rx="15" ry="11" fill="#ffb3c1"/>
      <circle cx="44" cy="70" r="2.6" fill="#c96a80"/><circle cx="56" cy="70" r="2.6" fill="#c96a80"/>`),
};

/* ============================================================
 * 4. 宇宙
 * ========================================================== */
export const SPACE = {
  planet: (c1 = '#5b8cff', c2 = '#b46bff') => wrap(
    `<circle cx="50" cy="52" r="30" fill="${c1}"/>
     <ellipse cx="50" cy="52" rx="44" ry="12" fill="none" stroke="${c2}" stroke-width="6" transform="rotate(-20 50 52)"/>
     <path d="M28 40 q14 8 28 0" stroke="${shade(c1, -40)}" stroke-width="4" fill="none" opacity=".7"/>
     <circle cx="40" cy="62" r="5" fill="${shade(c1, -30)}" opacity=".8"/>
     <circle cx="62" cy="44" r="7" fill="${shade(c1, -25)}" opacity=".8"/>`,
    grad('sp', shade(c1, 24), shade(c1, -30), 30)
  ),
  rocket: () => wrap(
    `<path d="M50 8 C62 22 66 44 62 66 H38 C34 44 38 22 50 8Z" fill="#eef3fb" stroke="#9aa8c7" stroke-width="2"/>
     <circle cx="50" cy="38" r="9" fill="#6ee7ff" stroke="#2a4a7a" stroke-width="2"/>
     <path d="M38 62 L26 82 L38 76 Z" fill="#ff6b9d"/><path d="M62 62 L74 82 L62 76 Z" fill="#ff6b9d"/>
     <path d="M44 78 h12 l-6 14 z" fill="#ffd166"/>
     <circle cx="50" cy="86" r="6" fill="#ff9f45" opacity=".9"/>`,
    glow('rg', '#ffd166', 3)
  ),
  star: () => wrap(
    `<path d="M50 10 L61 39 L92 42 L68 62 L75 92 L50 76 L25 92 L32 62 L8 42 L39 39 Z" fill="#ffd166" stroke="#e0a52e" stroke-width="2"/>
     <circle cx="42" cy="46" r="4" fill="#fff8e0" opacity=".9"/>`,
    glow('sg', '#ffd166', 3.4)
  ),
  ufo: () => wrap(
    `<ellipse cx="50" cy="56" rx="40" ry="16" fill="#8ea0c9" stroke="#4a5b86" stroke-width="2"/>
     <path d="M28 52 C34 30 66 30 72 52 Z" fill="#6ee7ff" stroke="#3a6ea8" stroke-width="2"/>
     <circle cx="50" cy="70" r="4" fill="#ff6b9d"/><circle cx="34" cy="70" r="4" fill="#ffd166"/><circle cx="66" cy="70" r="4" fill="#4ade80"/>`,
    glow('ug', '#6ee7ff', 3)
  ),
  astronaut: () => wrap(
    `<rect x="26" y="34" width="48" height="46" rx="20" fill="#f1f5ff" stroke="#9aa8c7" stroke-width="2"/>
     <path d="M32 40 C34 18 66 18 68 40 Z" fill="#6ee7ff" stroke="#3a6ea8" stroke-width="2"/>
     <circle cx="41" cy="34" r="4" fill="#1b2a4a"/><circle cx="59" cy="34" r="4" fill="#1b2a4a"/>
     <rect x="38" y="56" width="24" height="12" rx="5" fill="#b46bff"/>
     <rect x="22" y="44" width="12" height="24" rx="6" fill="#f1f5ff" stroke="#9aa8c7" stroke-width="2"/>
     <rect x="66" y="44" width="12" height="24" rx="6" fill="#f1f5ff" stroke="#9aa8c7" stroke-width="2"/>`
  ),
  comet: () => wrap(
    `<circle cx="34" cy="34" r="16" fill="#6ee7ff" stroke="#2a6ea8" stroke-width="2"/>
     <path d="M44 44 L86 86" stroke="#ffd166" stroke-width="10" stroke-linecap="round" opacity=".85"/>
     <path d="M46 48 L84 84" stroke="#fff3cc" stroke-width="4" stroke-linecap="round"/>`,
    glow('cg', '#6ee7ff', 3)
  ),
  moon: () => wrap(
    `<path d="M62 12 A42 42 0 1 0 62 88 A34 34 0 1 1 62 12 Z" fill="#fff3cc" stroke="#d9bd85" stroke-width="2"/>
     <circle cx="40" cy="42" r="6" fill="#e3cb96"/><circle cx="34" cy="64" r="4" fill="#e3cb96"/><circle cx="52" cy="70" r="3" fill="#e3cb96"/>`,
    glow('mg2', '#fff3cc', 2.4)
  ),
  satellite: () => wrap(
    `<rect x="40" y="38" width="20" height="24" rx="5" fill="#e8eef7" stroke="#9aa8c7" stroke-width="2"/>
     <rect x="10" y="44" width="24" height="12" rx="3" fill="#5b8cff"/>
     <rect x="66" y="44" width="24" height="12" rx="3" fill="#5b8cff"/>
     <path d="M50 38 V20 M50 62 V80" stroke="#9aa8c7" stroke-width="2.5"/>
     <circle cx="50" cy="16" r="5" fill="#ffd166"/><circle cx="50" cy="84" r="5" fill="#ff6b9d"/>`,
    glow('sat', '#5b8cff', 2)
  ),
};

/* ============================================================
 * 5. 几何 / 符号（低龄友好，通用主题）
 * ========================================================== */
export const SHAPES = {
  circle: (c = '#6ee7ff') => wrap(`<circle cx="50" cy="50" r="34" fill="${c}"/>`, grad('sc', shade(c, 30), shade(c, -25))),
  square: (c = '#ff6b9d') => wrap(`<rect x="18" y="18" width="64" height="64" rx="10" fill="${c}"/>`, grad('ss', shade(c, 30), shade(c, -25))),
  triangle: (c = '#ffd166') => wrap(`<path d="M50 14 L88 84 L12 84 Z" fill="${c}"/>`, grad('st', shade(c, 30), shade(c, -25))),
  star: (c = '#b46bff') => wrap(`<path d="M50 10 L61 39 L92 42 L68 62 L75 92 L50 76 L25 92 L32 62 L8 42 L39 39 Z" fill="${c}"/>`, grad('sstar', shade(c, 30), shade(c, -25))),
  heart: (c = '#ff5d5d') => wrap(`<path d="M50 86 C20 66 12 44 26 32 C36 23 48 30 50 40 C52 30 64 23 74 32 C88 44 80 66 50 86 Z" fill="${c}"/>`, grad('sh', shade(c, 30), shade(c, -25))),
  hexagon: (c = '#4ade80') => wrap(`<path d="M50 12 L84 32 V68 L50 88 L16 68 V32 Z" fill="${c}"/>`, grad('sx', shade(c, 30), shade(c, -25))),
  diamond: (c = '#ff9f45') => wrap(`<path d="M50 12 L88 50 L50 88 L12 50 Z" fill="${c}"/>`, grad('sd', shade(c, 30), shade(c, -25))),
  flower: (c = '#ff8fd0') => wrap(
    `<g fill="${c}"><circle cx="50" cy="24" r="16"/><circle cx="50" cy="76" r="16"/><circle cx="24" cy="50" r="16"/><circle cx="76" cy="50" r="16"/>
     <circle cx="32" cy="32" r="14"/><circle cx="68" cy="32" r="14"/><circle cx="32" cy="68" r="14"/><circle cx="68" cy="68" r="14"/></g>
     <circle cx="50" cy="50" r="14" fill="#ffd166"/>`
  ),
};

/* ============================================================
 * 拼图大图：把主题元素排布成一张有细节的场景（900x900）
 * ========================================================== */
export function sceneArt({ palette = ['#5b8cff', '#6ee7ff'], items = [], seed = 7 } = {}) {
  const rng = seeded(seed);
  const [c1, c2] = palette;
  let deco = '';
  // 背景装饰：星点 + 光斑
  for (let i = 0; i < 46; i++) {
    const x = (rng() * 900).toFixed(1), y = (rng() * 900).toFixed(1), r = (rng() * 5 + 1.5).toFixed(1);
    deco += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${(0.08 + rng() * 0.22).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 5; i++) {
    deco += `<circle cx="${(rng() * 900).toFixed(0)}" cy="${(rng() * 900).toFixed(0)}" r="${(90 + rng() * 130).toFixed(0)}"
      fill="${i % 2 ? c2 : c1}" opacity="0.16"/>`;
  }
  // 网格
  let grid = '';
  for (let i = 1; i < 9; i++) {
    const p = i * 100;
    grid += `<path d="M${p} 0 V900 M0 ${p} H900" stroke="#ffffff" stroke-width="1" opacity="0.07"/>`;
  }
  // 主题元素：4×4 抖动格铺满整张图，保证每一块拼图都有可辨认的细节
  const strip = (svg) => svg.replace(/<\/?svg[^>]*>/g, '');
  const put = (svg, x, y, size, rot = 0, extra = '') =>
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot}) scale(${(size / 100).toFixed(3)})"${extra}>${strip(svg)}</g>`;
  const pickItem = (i) => items[i % Math.max(1, items.length)] || SHAPES.star(c1);

  let art = '';
  const N = 4;
  const cell = 900 / N;
  let k = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      k += 1;
      if (rng() < 0.12) continue; // 偶尔留白
      const x = c * cell + cell * (0.26 + rng() * 0.48);
      const y = r * cell + cell * (0.26 + rng() * 0.48);
      const size = cell * (0.5 + rng() * 0.45);
      const rot = (rng() * 70 - 35).toFixed(1);
      const op = (0.72 + rng() * 0.28).toFixed(2);
      art += put(pickItem(k * 3 + r), x, y, size, rot, ` opacity="${op}"`);
    }
  }
  // 中心主图案 + 光环，作为视觉锚点
  art += `<circle cx="450" cy="450" r="215" fill="#ffffff" opacity="0.13"/>
          <circle cx="450" cy="450" r="215" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.35"/>`;
  art += put(pickItem(0), 450, 450, 300, 0);
  art += `<circle cx="450" cy="450" r="78" fill="none" stroke="${c1}" stroke-width="6" opacity="0.5" stroke-dasharray="14 12"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${shade(c1, -60)}"/>
        <stop offset="0.5" stop-color="${shade(c1, -20)}"/>
        <stop offset="1" stop-color="${shade(c2, -50)}"/>
      </linearGradient>
      <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
      </radialGradient>
    </defs>
    <rect width="900" height="900" fill="url(#bg)"/>
    ${grid}${deco}${art}
    <rect width="900" height="900" fill="url(#vig)"/>
    <rect x="6" y="6" width="888" height="888" rx="26" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.35"/>
  </svg>`;
}
