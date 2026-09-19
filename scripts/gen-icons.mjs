/**
 * 生成 Brain Master 的安卓启动图标（替换 Capacitor 默认图标）。
 * 纯 Node + zlib 实现 PNG 编码，零第三方依赖。
 *
 * 设计：品牌渐变底（蓝→金）+ 白色闪电，符合「脑力 / 反应」的品牌调性。
 * 输出：
 *   - mipmap-<dpi>/ic_launcher.png              传统图标（圆角方，API<26）
 *   - mipmap-<dpi>/ic_launcher_round.png        传统圆形图标（API<26）
 *   - mipmap-<dpi>/ic_launcher_foreground.png    自适应前景（透明底 + 闪电，API>=26）
 *   - drawable-v24/ic_launcher_foreground.xml  矢量前景兜底
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANDROID_RES = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

/* ---------------- PNG 编码 ---------------- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------------- 颜色 ---------------- */
const BLUE = [91, 140, 255];
const GOLD = [255, 209, 102];
const WHITE = [255, 255, 255];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------------- 闪电多边形（归一化 [-1,1] 坐标） ---------------- */
const BOLT = [
  [0.12, -1.0],
  [-0.44, 0.12],
  [-0.08, 0.12],
  [-0.22, 1.0],
  [0.44, -0.22],
  [0.06, -0.22],
];
function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* ---------------- 渲染 ---------------- */
// mode: 'normal' | 'round' | 'fg'
// size: 输出尺寸；ss: 超采样倍数（抗锯齿）
function renderIcon(size, mode, boltScale = mode === 'fg' ? 0.6 : 0.62, ss = 3) {
  const big = size * ss;
  const buf = Buffer.alloc(big * big * 4); // RGBA，默认透明
  const radius = mode === 'round' ? big / 2 - 1 : big * 0.22;
  const cx = big / 2, cy = big / 2;
  const half = (big / 2) * boltScale;

  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const idx = (y * big + x) * 4;
      // 外轮廓遮罩
      let inShape = true;
      if (mode === 'round') {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > radius * radius) inShape = false;
      } else if (mode === 'normal') {
        const left = radius, top = radius, right = big - radius, bottom = big - radius;
        if (x < left && y < top) { const dx = left - x, dy = top - y; if (dx * dx + dy * dy > radius * radius) inShape = false; }
        else if (x > right && y < top) { const dx = x - right, dy = top - y; if (dx * dx + dy * dy > radius * radius) inShape = false; }
        else if (x < left && y > bottom) { const dx = left - x, dy = y - bottom; if (dx * dx + dy * dy > radius * radius) inShape = false; }
        else if (x > right && y > bottom) { const dx = x - right, dy = y - bottom; if (dx * dx + dy * dy > radius * radius) inShape = false; }
      }

      // 闪电（仅在 fg 模式或非背景区域绘制）
      const nx = (x - cx) / half;
      const ny = (y - cy) / half;
      const inBolt = pointInPoly(nx, ny, BOLT);

      if (mode === 'fg') {
        if (inBolt) { buf[idx] = WHITE[0]; buf[idx + 1] = WHITE[1]; buf[idx + 2] = WHITE[2]; buf[idx + 3] = 255; }
        continue;
      }
      if (!inShape) continue; // 圆角/圆形外透明
      // 渐变底（左上蓝 → 右下金）
      const t = clamp01((x / big + y / big) / 2);
      const r = Math.round(lerp(BLUE[0], GOLD[0], t));
      const g = Math.round(lerp(BLUE[1], GOLD[1], t));
      const b = Math.round(lerp(BLUE[2], GOLD[2], t));
      if (inBolt) { buf[idx] = WHITE[0]; buf[idx + 1] = WHITE[1]; buf[idx + 2] = WHITE[2]; }
      else { buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; }
      buf[idx + 3] = 255;
    }
  }

  // 降采样抗锯齿
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const bx = x * ss + sx, by = y * ss + sy;
          const bi = (by * big + bx) * 4;
          const a = buf[bi + 3];
          ar += buf[bi] * a; ag += buf[bi + 1] * a; ab += buf[bi + 2] * a; aa += a;
        }
      }
      const oi = (y * size + x) * 4;
      if (aa > 0) {
        out[oi] = Math.round(ar / aa); out[oi + 1] = Math.round(ag / aa); out[oi + 2] = Math.round(ab / aa);
        out[oi + 3] = Math.round(aa / (ss * ss));
      } else {
        out[oi + 3] = 0;
      }
    }
  }
  return encodePNG(size, size, out);
}

/* ---------------- 矢量前景（兜底，108 视口） ---------------- */
function boltPath108() {
  const cx = 54, cy = 54, s = 54 * 0.6;
  const pts = BOLT.map(([x, y]) => [cx + x * s, cy + y * s]);
  return 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L') + 'Z';
}

/* ---------------- 写出 ---------------- */
const DENSITIES = [
  { d: 'mdpi', f: 1 },
  { d: 'hdpi', f: 1.5 },
  { d: 'xhdpi', f: 2 },
  { d: 'xxhdpi', f: 3 },
  { d: 'xxxhdpi', f: 4 },
];
const BASE = 48;        // mdpi 传统图标尺寸
const BASE_FG = 108;    // mdpi 自适应前景尺寸

for (const { d, f } of DENSITIES) {
  const dir = join(ANDROID_RES, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  const s = Math.round(BASE * f);
  writeFileSync(join(dir, 'ic_launcher.png'), renderIcon(s, 'normal'));
  writeFileSync(join(dir, 'ic_launcher_round.png'), renderIcon(s, 'round'));
  const sf = Math.round(BASE_FG * f);
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), renderIcon(sf, 'fg'));
  console.log(`✓ mipmap-${d}: launcher ${s}px, foreground ${sf}px`);
}

// 矢量前景兜底（API 24-25 自适应）
const v24 = join(ANDROID_RES, 'drawable-v24');
mkdirSync(v24, { recursive: true });
writeFileSync(join(v24, 'ic_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:fillType="evenOdd"
        android:pathData="${boltPath108()}" />
</vector>
`);
console.log('✓ drawable-v24/ic_launcher_foreground.xml (vector)');

console.log('图标生成完成 ✓');
