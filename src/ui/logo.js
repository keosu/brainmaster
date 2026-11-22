/**
 * 品牌图标：渐变底 + 白色拼图块 + 金色闪光（512 坐标系）。
 * 纯字符串、无 DOM 依赖 —— 应用内 Logo 与 scripts/gen-icons.mjs 共用这一份源。
 */

/** 拼图块轮廓：上、右各一个凸起，左侧一个凹口；外接框中心约在 (284, 248) */
const PIECE = [
  'M180 176 H230',
  'A34 34 0 1 1 282 176',
  'H332 Q356 176 356 200 V250',
  'A34 34 0 1 1 356 302',
  'V352 Q356 376 332 376 H180 Q156 376 156 352 V302',
  'A30 30 0 1 0 156 250',
  'V200 Q156 176 180 176 Z',
].join(' ');

function sparkle(cx, cy, r, fill) {
  const k = r * 0.24;
  return `<path d="M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r}Z" fill="${fill}"/>`;
}

const DEFS = `
  <defs>
    <linearGradient id="bmBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f8bff"/>
      <stop offset="1" stop-color="#8a55f5"/>
    </linearGradient>
    <radialGradient id="bmGlow" cx=".28" cy=".18" r=".8">
      <stop offset="0" stop-color="#fff" stop-opacity=".32"/>
      <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bmPiece" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e6ebff"/>
    </linearGradient>
    <linearGradient id="bmSpark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd76a"/>
      <stop offset="1" stop-color="#ff9a3d"/>
    </linearGradient>
    <filter id="bmShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#1a1060" flood-opacity=".35"/>
    </filter>
  </defs>`;

/** 图标主体（不含背景） */
export function mark() {
  return `<g transform="translate(-28 8)">
    <path d="${PIECE}" fill="url(#bmPiece)" filter="url(#bmShadow)"/>
    ${sparkle(256, 276, 50, 'url(#bmSpark)')}
    ${sparkle(310, 222, 15, '#ffc24d')}
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
  if (bg === 'rounded') back = '<rect width="512" height="512" rx="114" fill="url(#bmBg)"/><rect width="512" height="512" rx="114" fill="url(#bmGlow)"/>';
  else if (bg === 'square') back = '<rect width="512" height="512" fill="url(#bmBg)"/><rect width="512" height="512" fill="url(#bmGlow)"/>';
  else if (bg === 'circle') back = '<circle cx="256" cy="256" r="256" fill="url(#bmBg)"/><circle cx="256" cy="256" r="256" fill="url(#bmGlow)"/>';
  const s = (scale * 1.35).toFixed(3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${DEFS}${back}<g transform="translate(256 256) scale(${s}) translate(-256 -256)">${mark()}</g></svg>`;
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
