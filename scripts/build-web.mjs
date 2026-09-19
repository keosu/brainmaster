/**
 * 前端打包：用 esbuild 把 src/ 打成单文件 dist/app.js，同时把样式、游戏 CSS、
 * 素材原样拷进 dist/。Capacitor 直接把 dist/ 当作 WebView 的静态资源。
 *
 * 关键约定：
 *  - index.html 里静态样式仍写成 ./src/styles/*.css，构建时把 src/styles 整体拷到
 *    dist/src/styles，链接无需改动；
 *  - Runner 里按 ./src/games/<id>/style.css 懒加载游戏样式，构建时按同样结构拷到
 *    dist/src/games/<id>/style.css，运行时链接依旧有效。
 */
import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, readdir, rm, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const exists = (p) => existsSync(p);
const copyDir = (from, to) => cp(from, to, { recursive: true });

async function main() {
  // 先清干净再构建，避免旧 chunk 残留（清理失败不致命：输出文件名稳定，esbuild 会覆盖）
  if (exists(dist)) {
    try { await rm(dist, { recursive: true, force: true }); }
    catch (e) { console.warn('⚠️ 清理 dist/ 失败（已忽略）:', e.message); }
  }
  await mkdir(dist, { recursive: true });

  // 1) JS bundle（含动态 import 拆出的 chunk）
  await build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2019'],
    outfile: path.join(dist, 'app.js'),
    sourcemap: false,
    logLevel: 'info',
  });

  // 2) 全局样式（保持 src/styles 结构）
  await mkdir(path.join(dist, 'src/styles'), { recursive: true });
  await copyDir(path.join(root, 'src/styles'), path.join(dist, 'src/styles'));

  // 3) 各游戏样式 -> dist/src/games/<id>/style.css
  const gamesDir = path.join(root, 'src/games');
  const games = (await readdir(gamesDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const id of games) {
    const css = path.join(gamesDir, id, 'style.css');
    if (exists(css)) {
      const dest = path.join(dist, 'src/games', id);
      await mkdir(dest, { recursive: true });
      await copyDir(css, path.join(dest, 'style.css'));
    }
  }

  // 4) 素材目录
  if (exists(path.join(root, 'assets'))) {
    await mkdir(path.join(dist, 'assets'), { recursive: true });
    await copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
  }

  // 5) index.html：只把入口脚本换成打包产物，其余（样式链接、兜底脚本）原样保留
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const outHtml = html.replace('./src/main.js', './app.js');
  await writeFile(path.join(dist, 'index.html'), outHtml);

  console.log('✅ dist/ 构建完成（JS 已打包，样式/游戏 CSS/素材已同步）');
}

main().catch((e) => {
  console.error('❌ 构建失败:', e);
  process.exit(1);
});
