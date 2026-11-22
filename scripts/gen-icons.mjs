/**
 * 生成全部图标与开屏图：npm run icons
 * 源头是 src/ui/logo.js 里的 SVG（应用内 Logo 用的也是它），用 resvg 栅格化。
 *
 * 输出：
 *   public/icons/              PWA 图标（any / maskable / apple-touch / favicon）
 *   android/.../mipmap-*       传统图标、圆形图标、自适应图标前景
 *   android/.../drawable*\/splash.png  开屏图（尺寸沿用现有文件）
 */
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { iconSvg, splashSvg } from '../src/ui/logo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const PUB = join(ROOT, 'public', 'icons');

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

function out(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

/* ---------------- PWA ---------------- */
const rounded = iconSvg({ bg: 'rounded', scale: 0.86 });
const square = iconSvg({ bg: 'square', scale: 0.86 });
const maskable = iconSvg({ bg: 'square', scale: 0.72, sparkles: false });

out(join(PUB, 'icon.svg'), rounded);
out(join(PUB, 'icon-192.png'), png(rounded, 192));
out(join(PUB, 'icon-512.png'), png(rounded, 512));
out(join(PUB, 'maskable-192.png'), png(maskable, 192));
out(join(PUB, 'maskable-512.png'), png(maskable, 512));
out(join(PUB, 'apple-touch-icon.png'), png(square, 180));
out(join(PUB, 'favicon-32.png'), png(rounded, 32));
console.log('✓ public/icons');

/* ---------------- Android 启动图标 ---------------- */
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const legacy = iconSvg({ bg: 'rounded', scale: 0.84 });
const round = iconSvg({ bg: 'circle', scale: 0.78, sparkles: false });
// 自适应图标：108dp 画布中只有直径 66dp 的圆保证可见，前景要收在里面
const foreground = iconSvg({ bg: 'none', scale: 0.6 });

if (existsSync(RES)) {
  for (const [d, f] of Object.entries(DENSITIES)) {
    const dir = join(RES, `mipmap-${d}`);
    out(join(dir, 'ic_launcher.png'), png(legacy, Math.round(48 * f)));
    out(join(dir, 'ic_launcher_round.png'), png(round, Math.round(48 * f)));
    out(join(dir, 'ic_launcher_foreground.png'), png(foreground, Math.round(108 * f)));
  }
  console.log('✓ android mipmaps');

  // 旧版闪电矢量前景已不再被引用（自适应图标指向 mipmap 前景）
  const stale = join(RES, 'drawable-v24', 'ic_launcher_foreground.xml');
  if (existsSync(stale)) rmSync(stale);

  /* ---------------- 开屏图：按现有 splash.png 的尺寸重绘 ---------------- */
  for (const dir of readdirSync(RES)) {
    const file = join(RES, dir, 'splash.png');
    if (!dir.startsWith('drawable') || !existsSync(file)) continue;
    const head = readFileSync(file);
    const w = head.readUInt32BE(16);
    const h = head.readUInt32BE(20);
    out(file, png(splashSvg(w, h), w));
  }
  console.log('✓ android splash');
}

console.log('图标生成完成 ✓');
