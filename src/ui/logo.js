/**
 * 品牌图标：电路大脑（512 坐标系）。
 * 左半脑是柔和的脑回褶皱，右半脑是从中缝延伸出去的电路走线 —— 生物脑 + 科技感。
 * 纯字符串、无 DOM 依赖 —— 应用内 Logo 与 scripts/gen-icons.mjs 共用这一份源。
 */

/** 半脑轮廓由几个圆叠出脑叶的起伏感，右半边镜像 */
const LOBES = [[200, 172, 62], [148, 224, 60], [140, 298, 58], [190, 350, 56], [226, 262, 82]];
const lobes = (mirror) => LOBES.map(([x, y, r]) => `<circle cx="${mirror ? 512 - x : x}" cy="${y}" r="${r}"/>`).join('');

const FOLDS = [
  'M156 182 q15 -13 30 0 t30 0',
  'M112 238 q16 -14 32 0 t32 0 t32 0',
  'M110 298 q16 14 32 0 t32 0 t32 0',
  'M160 352 q15 -13 30 0 t30 0',
];

const TRACES = [
  { d: 'M263 186 H316 L344 158', node: [344, 158] },
  { d: 'M263 236 H376', node: [376, 236] },
  { d: 'M300 236 V286 H338', node: [338, 286] },
  { d: 'M263 326 H310 L340 356', node: [340, 356] },
  { d: 'M338 286 L384 286', node: [384, 300] , skip: true },
];

const DEFS = `
  <defs>
    <linearGradient id="bmBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3f7bff"/>
      <stop offset="1" stop-color="#7c4dff"/>
    </linearGradient>
    <radialGradient id="bmGlow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#9ff3ff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#9ff3ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bmBrain" gradientUnits="userSpaceOnUse" x1="0" y1="110" x2="0" y2="410">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dde5ff"/>
    </linearGradient>
    <clipPath id="bmL"><rect x="0" y="0" width="249" height="512"/></clipPath>
    <clipPath id="bmR"><rect x="263" y="0" width="249" height="512"/></clipPath>
    <filter id="bmShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#160a5a" flood-opacity=".35"/>
    </filter>
  </defs>`;

/** 图标主体（不含背景），中心约在 (256, 257) */
export function mark({ glow = true } = {}) {
  const traces = TRACES.filter((t) => !t.skip);
  return `
    ${glow ? '<circle cx="256" cy="257" r="210" fill="url(#bmGlow)"/>' : ''}
    <g filter="url(#bmShadow)">
      <g clip-path="url(#bmL)" fill="url(#bmBrain)">${lobes(false)}</g>
      <g clip-path="url(#bmR)" fill="url(#bmBrain)">${lobes(true)}</g>
    </g>
    <g clip-path="url(#bmL)" fill="none" stroke="#7d8cff" stroke-width="12" stroke-linecap="round">
      ${FOLDS.map((d) => `<path d="${d}"/>`).join('')}
    </g>
    <g fill="none" stroke="#5a63f0" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      ${traces.map((t) => `<path d="${t.d}"/>`).join('')}
    </g>
    <g>
      ${traces.map((t) => `<circle cx="${t.node[0]}" cy="${t.node[1]}" r="14" fill="#5a63f0"/><circle cx="${t.node[0]}" cy="${t.node[1]}" r="6" fill="#9ff3ff"/>`).join('')}
    </g>`;
}

/**
 * 生成完整图标 SVG
 * @param {object} o
 * @param {'rounded'|'square'|'circle'|'none'} o.bg 背景形状（none = 透明，用于自适应图标前景）
 * @param {number} o.scale 主体缩放（相对 512 画布）
 */
export function iconSvg({ bg = 'rounded', scale = 0.86, size = 512 } = {}) {
  let back = '';
  if (bg === 'rounded') back = '<rect width="512" height="512" rx="114" fill="url(#bmBg)"/>';
  else if (bg === 'square') back = '<rect width="512" height="512" fill="url(#bmBg)"/>';
  else if (bg === 'circle') back = '<circle cx="256" cy="256" r="256" fill="url(#bmBg)"/>';
  const s = (scale * 1.12).toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${DEFS}${back}<g transform="translate(256 256) scale(${s}) translate(-256 -257)">${mark({ glow: bg !== 'none' })}</g></svg>`;
}

/** 安卓开屏图：深色底 + 居中图标 */
export function splashSvg(w, h) {
  const logo = Math.min(w, h) * 0.36;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="sg" cx=".5" cy=".46" r=".6">
        <stop offset="0" stop-color="#25306e"/>
        <stop offset=".6" stop-color="#101838"/>
        <stop offset="1" stop-color="#0a0e1f"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sg)"/>
    <g transform="translate(${(w - logo) / 2} ${(h - logo) / 2}) scale(${logo / 512})">
      ${iconSvg({ bg: 'rounded' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
    </g>
  </svg>`;
}
