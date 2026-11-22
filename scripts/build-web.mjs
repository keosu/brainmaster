/**
 * 前端打包：用 esbuild 把 src/ 打成单文件 dist/app.js，同时把样式、游戏 CSS、
 * 素材、PWA 文件原样拷进 dist/。Capacitor 直接把 dist/ 当作 WebView 的静态资源，
 * 也可以把 dist/ 部署到任意 https 静态站点作为 PWA 安装。
 *
 * 关键约定：
 *  - index.html 里静态样式仍写成 ./src/styles/*.css，构建时把 src/styles 整体拷到
 *    dist/src/styles，链接无需改动；
 *  - Runner 里按 ./src/games/<id>/style.css 懒加载游戏样式，构建时按同样结构拷到
 *    dist/src/games/<id>/style.css，运行时链接依旧有效；
 *  - public/ 下的文件（manifest、sw.js、icons）拷到 dist 根目录，sw.js 里的
 *    预缓存清单与版本号在这里注入。
 */
import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const exists = (p) => existsSync(p);
const copyDir = (from, to) => cp(from, to, { recursive: true });

async function listFiles(dir, base = dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) out.push(...await listFiles(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

async function main() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

  // 先清干净再构建，避免旧 chunk 残留（清理失败不致命：输出文件名稳定，esbuild 会覆盖）
  if (exists(dist)) {
    try { await rm(dist, { recursive: true, force: true }); }
    catch (e) { console.warn('⚠️ 清理 dist/ 失败（已忽略）:', e.message); }
  }
  await mkdir(dist, { recursive: true });

  // 1) JS bundle（动态 import 的游戏模块会被内联进同一个文件）
  await build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2019'],
    outfile: path.join(dist, 'app.js'),
    minify: true,
    sourcemap: false,
    logLevel: 'info',
    define: {
      __BUILD__: 'true',
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
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

  // 5) PWA 静态文件
  if (exists(path.join(root, 'public'))) await copyDir(path.join(root, 'public'), dist);

  // 6) index.html：只把入口脚本换成打包产物，其余（样式链接、兜底脚本）原样保留
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  await writeFile(path.join(dist, 'index.html'), html.replace('./src/main.js', './app.js'));

  // 7) Service Worker：注入预缓存清单 + 内容哈希版本号（内容变了才会触发更新）
  const files = (await listFiles(dist)).filter((f) => f !== 'sw.js' && !f.endsWith('.md'));
  const hash = createHash('sha1');
  for (const f of files.sort()) hash.update(f).update(await readFile(path.join(dist, f)));
  const version = `${pkg.version}-${hash.digest('hex').slice(0, 8)}`;
  const swPath = path.join(dist, 'sw.js');
  if (exists(swPath)) {
    const sw = (await readFile(swPath, 'utf8'))
      .replace('__BM_VERSION__', version)
      .replace('/*__BM_PRECACHE__*/[]', JSON.stringify(['./', ...files.map((f) => `./${f}`)]));
    await writeFile(swPath, sw);
  }

  console.log(`✅ dist/ 构建完成 v${version}（${files.length} 个文件已加入离线缓存）`);
}

main().catch((e) => {
  console.error('❌ 构建失败:', e);
  process.exit(1);
});
