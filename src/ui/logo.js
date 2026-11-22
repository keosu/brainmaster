/**
 * 品牌形象：戴学士帽的小脑袋（512 坐标系）。
 * 纯字符串、无 DOM 依赖 —— 应用内 Logo 与 scripts/gen-icons.mjs 共用这一份源。
 */

const BRAIN_LOBES = [
  [196, 206, 62], [256, 192, 66], [316, 206, 62],
  [146, 264, 58], [366, 264, 58],
  [182, 318, 56], [256, 330, 60], [330, 318, 56],
  [256, 262, 90],
];

function star(cx, cy, r, fill, opacity = 1) {
  const k = r * 0.28;
  return `<path d="M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r}Z" fill="${fill}" opacity="${opacity}"/>`;
}

/** 吉祥物本体（不含背景），视觉中心约在 (256, 239) */
export function mascot() {
  const outline = BRAIN_LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 11}"/>`).join('');
  const fill = BRAIN_LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `
  <g>
    <ellipse cx="256" cy="402" rx="150" ry="16" fill="#1a1440" opacity=".22"/>
    <g fill="#c2386f">${outline}</g>
    <g fill="url(#bmBrain)">${fill}</g>
    <g fill="none" stroke="#d94a86" stroke-width="9" stroke-linecap="round" opacity=".85">
      <path d="M122 244 q-14 24 6 46"/>
      <path d="M390 244 q14 24 -6 46"/>
      <path d="M164 212 q-8 18 8 32"/>
      <path d="M348 212 q8 18 -8 32"/>
      <path d="M196 368 q8 -14 24 -14"/>
      <path d="M316 368 q-8 -14 -24 -14"/>
    </g>
    <ellipse cx="200" cy="232" rx="34" ry="18" fill="#fff" opacity=".35" transform="rotate(-18 200 232)"/>
    <g>
      <ellipse cx="212" cy="282" rx="24" ry="29" fill="#1f1b3a"/>
      <ellipse cx="300" cy="282" rx="24" ry="29" fill="#1f1b3a"/>
      <circle cx="221" cy="271" r="9" fill="#fff"/>
      <circle cx="309" cy="271" r="9" fill="#fff"/>
      <circle cx="205" cy="294" r="4.5" fill="#fff" opacity=".9"/>
      <circle cx="293" cy="294" r="4.5" fill="#fff" opacity=".9"/>
    </g>
    <ellipse cx="170" cy="326" rx="22" ry="13" fill="#ff5d8f" opacity=".5"/>
    <ellipse cx="342" cy="326" rx="22" ry="13" fill="#ff5d8f" opacity=".5"/>
    <path d="M230 322 Q256 356 282 322 Q256 334 230 322Z" fill="#7a1f3d" stroke="#7a1f3d" stroke-width="6" stroke-linejoin="round"/>
    <g transform="rotate(-9 256 150)">
      <path d="M190 146 L322 146 L312 196 Q256 214 200 196Z" fill="#231f4f"/>
      <path d="M256 84 L376 128 L256 172 L136 128Z" fill="#2f2a68"/>
      <path d="M256 84 L376 128 L256 140 L136 128Z" fill="#3e388a"/>
      <path d="M256 128 L360 136 L362 192" fill="none" stroke="#ffd166" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="351" y="186" width="22" height="34" rx="8" fill="#ffd166"/>
      <rect x="351" y="208" width="22" height="12" rx="4" fill="#f4b740"/>
      <circle cx="256" cy="128" r="10" fill="#ffd166"/>
    </g>
  </g>`;
}

const DEFS = `
  <defs>
    <linearGradient id="bmBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6ee7ff"/>
      <stop offset=".48" stop-color="#5b8cff"/>
      <stop offset="1" stop-color="#b46bff"/>
    </linearGradient>
    <radialGradient id="bmGlow" cx=".3" cy=".22" r=".75">
      <stop offset="0" stop-color="#fff" stop-opacity=".45"/>
      <stop offset=".6" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bmBrain" cx=".38" cy=".3" r=".8">
      <stop offset="0" stop-color="#ffd3e4"/>
      <stop offset=".55" stop-color="#ffa6c8"/>
      <stop offset="1" stop-color="#ff86b3"/>
    </radialGradient>
  </defs>`;

/**
 * 生成完整图标 SVG
 * @param {object} o
 * @param {'rounded'|'square'|'circle'|'none'} o.bg 背景形状（none = 透明，用于自适应图标前景）
 * @param {number} o.scale 吉祥物缩放（相对 512 画布）
 * @param {boolean} o.sparkles 是否画点缀星星
 */
export function iconSvg({ bg = 'rounded', scale = 0.86, sparkles = true, size = 512 } = {}) {
  let back = '';
  if (bg === 'rounded') back = '<rect width="512" height="512" rx="114" fill="url(#bmBg)"/><rect width="512" height="512" rx="114" fill="url(#bmGlow)"/>';
  else if (bg === 'square') back = '<rect width="512" height="512" fill="url(#bmBg)"/><rect width="512" height="512" fill="url(#bmGlow)"/>';
  else if (bg === 'circle') back = '<circle cx="256" cy="256" r="256" fill="url(#bmBg)"/><circle cx="256" cy="256" r="256" fill="url(#bmGlow)"/>';
  const deco = sparkles && bg !== 'none'
    ? star(96, 112, 24, '#fff', 0.9) + star(424, 96, 16, '#ffd166') + star(434, 404, 14, '#fff', 0.75) + star(78, 392, 10, '#ffd166', 0.9)
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${DEFS}${back}${deco}<g transform="translate(256 256) scale(${scale}) translate(-256 -239)">${mascot()}</g></svg>`;
}

/** 开屏页等深色背景上使用的大 Logo（带柔光，无底板） */
export function splashSvg(w, h) {
  const s = Math.min(w, h);
  const logo = s * 0.42;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="sg" cx=".5" cy=".46" r=".6">
        <stop offset="0" stop-color="#2a3a8c"/>
        <stop offset=".55" stop-color="#101838"/>
        <stop offset="1" stop-color="#0a0e1f"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sg)"/>
    <g transform="translate(${(w - logo) / 2} ${(h - logo) / 2}) scale(${logo / 512})">
      ${iconSvg({ bg: 'rounded', scale: 0.86 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}
    </g>
  </svg>`;
}
