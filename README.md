# 🧠 Brain Master · 脑力大师

一个给小朋友的益智游戏合集（类似《灵活脑学校》），26 个小游戏覆盖记忆、计算、逻辑、空间、观察、反应、专注、策略八大类。
Web 端**零依赖、打开即玩**，可**安装为 PWA**（全屏、离线可玩）；同时支持一键打包成安卓 App（Capacitor + 原生 TTS 语音 + 沉浸式全屏）。
架构围绕"**新增一个游戏只改两个地方**"和"**换一套素材只加一个主题**"来设计。

---

## 快速开始

```bash
npm install
npm run dev                # 开发：http://127.0.0.1:8123/ （同时监听局域网，手机可直接访问）
npm run preview            # 打包后预览 dist/（含 Service Worker，可测试 PWA 安装与离线）
```

> ⚠️ 本项目用原生 ES Modules，**必须通过 http 打开**。直接双击 `index.html`（file:// 协议）
> 会被浏览器拦截模块加载 —— 此时页面上的兜底提示会告诉你怎么做。

路由采用 hash，无需服务端配置：
`#/` 首页 · `#/game/<id>` 单个游戏 · `#/training` 每日训练

---

## 已包含的游戏（26 个）

| 分类 | 游戏 |
|---|---|
| 🧠 记忆 | 🃏 翻牌记忆（可换皮，简单档开局预览）· 🟦 记忆矩阵 · 🔢 数字记忆（3 条命）· 🎹 声光序列（Simon） |
| 🔢 计算 | 🎈 气球爆爆（从小到大戳气球，困难档是算式）· ➕ 心算冲刺（含除法档）· 🃏 24 点（带提示） |
| 🧩 逻辑 | ⚖️ 天平称重 · 🔮 找规律 · 💡 点亮全屏（Lights Out）· 🧮 数独小格 · 🗼 汉诺塔（带最优提示）· 🏯 华容道（BFS 提示）· 💣 扫雷 |
| 📐 空间 | 🧊 数积木（等轴测立体）· 🔄 转一转（心理旋转 / 镜像辨别）· 🐭 迷宫探险 · 🧩 拼图挑战（交换 / 滑块） |
| 👀 观察 | 🔍 找不同（三档，可换皮）· 👁️ 一眼数清 |
| ⚡ 反应 | 🌈 色词干扰 · 🐹 打地鼠 · ⚡ 闪电反应 |
| 🎯 专注 | 🔟 舒尔特方格 |
| ♟️ 策略 | 🔷 2048 · ⚫ 黑白棋（α-β 剪枝 AI） |

配套系统：脑力值 + 9 级称号、每日训练（随机 3 项、尽量不同类别）、最佳成绩存档、每项难度分档、
首次进入自动弹出玩法说明（游戏中点 ❓ 可再看）、切到后台自动暂停计时、三星彩纸庆祝、
音效 / 语音 / 震动 / 自动全屏开关、存档导入导出。

## 平台适配

- **横竖屏**：竖屏时 HUD → 控件 → 棋盘自上而下排列；横屏（宽高比 ≥ 1.2）时棋盘独占右侧，
  HUD、难度条、按钮和提示自动挪到左侧栏。由 `Runner.arrange()` 统一完成，游戏代码无需感知；
  游戏只要给主棋盘加 `.fit-box`，并用 `--fit-w / --fit-h` 决定尺寸即可。
- **PWA**：`public/manifest.webmanifest`（`display: fullscreen`）+ `public/sw.js`（打包时注入预缓存清单与内容哈希版本号）。
  把 `dist/` 部署到任意 https 静态站点即可「安装到桌面」，离线也能玩；设置里有安装按钮（iOS 显示添加到主屏幕的指引）。
- **移动端全屏**：
  - 安卓 App：`MainActivity` 开启沉浸模式，隐藏状态栏和导航栏（从边缘滑动可临时呼出），刘海区域用 safe-area 变量避让；
  - 已安装的 PWA：以 fullscreen 模式启动，不显示状态栏；
  - 手机浏览器：首次点击自动进入全屏（可在设置里关闭），顶栏也有 ⛶ 按钮手动切换。
- **安卓返回键**：先关弹窗，再回首页，在首页时退到后台。

---

## 目录结构

```
brain_master/
├─ index.html                 入口（只做样式与脚本引入）
├─ public/                    PWA：manifest、Service Worker、icons/（打包时拷到 dist 根目录）
├─ assets/                    可选的图片素材目录（奥特曼等）
├─ scripts/                   build-web.mjs（打包）· gen-icons.mjs（生成全部图标与开屏图）
└─ src/
   ├─ main.js                 启动：同步设置 → 平台适配 → 启动外壳 → 启动路由
   ├─ core/                   与玩法无关的平台能力
   │  ├─ Game.js              【游戏基类】生命周期 + 自动资源回收 + 暂停/恢复 + Timer
   │  ├─ platform.js          PWA 注册与安装、全屏、震动、安卓返回键
   │  ├─ storage.js           存档：最佳成绩 / 设置 / 脑力值 / 等级
   │  ├─ audio.js             WebAudio 合成音效 + TTS 语音
   │  ├─ router.js            hash 路由
   │  └─ utils.js             DOM 构建器 el() / 随机 / 颜色 / 事件总线
   ├─ themes/                 【素材中心】翻牌 / 拼图 / 找不同的图案来源
   │  ├─ index.js             主题注册表（内置 5 套 + registerTheme 扩展）
   │  └─ svg.js               程序化 SVG 素材生成器（英雄/怪兽/动物/宇宙/几何）
   ├─ ui/                     通用界面
   │  ├─ shell.js             顶栏、路由分发、每日训练流程
   │  ├─ home.js              首页：脑力档案 + 最近玩过 + 分类游戏大厅
   │  ├─ runner.js            游戏生命周期、横竖屏排布、玩法说明、暂停、统一结算
   │  ├─ logo.js              品牌吉祥物 SVG（应用内 Logo 与图标生成共用）
   │  ├─ settings.js          设置面板
   │  ├─ hud.js               顶部信息条
   │  ├─ modal.js             弹窗 / 结算面板 / Toast / 3-2-1 倒计时
   │  └─ widgets.js           难度条、主题条、分段控件
   ├─ styles/                 base / layout / components 三层样式
   └─ games/
      ├─ manifest.js          【游戏清单】新增游戏只改这里
      ├─ memory/  index.js + style.css
      ├─ reversi/ index.js + engine.js + ai.js + style.css
      ├─ klotski/ index.js + solver.js（关卡 + BFS 求解）+ style.css
      ├─ count24/ index.js + solvers.js + style.css
      └─ …        每个游戏一个目录，共 26 个
```

---

## 一、新增一个游戏（3 步）

**第 1 步**：建目录 `src/games/my-game/index.js`

```js
import { Game, Timer } from '../../core/Game.js';
import { el } from '../../core/utils.js';

export default class MyGame extends Game {
  async mount() {
    // this.ctx.options 里有 manifest 里配的 level 参数
    this.root.appendChild(el('button.btn.btn--primary', {
      text: '点我',
      onClick: () => this.finish({
        score: 100, stars: 3, mode: 'max',
        title: '完成', message: '干得漂亮',
        stats: [{ label: '次数', value: 1 }],
      }),
    }));

    // 信息条
    this.hud.set([{ key: 'time', label: '用时', value: '00:00' }]);
    this.hud.show();
  }

  start() {
    // 计时请用 Timer：切后台 / 看玩法说明时会自动暂停
    this.timer = new Timer(this);
    this.timer.startCountUp((ms) => this.hud.patch('time', `${Math.round(ms / 1000)}s`));
  }
}
```

主棋盘元素加上 `.fit-box` 类，CSS 里用 `width: min(96vw, var(--fit-w), var(--fit-h))` 之类的写法，
就能在竖屏 / 横屏下自动铺满可用空间（横屏时其它元素会被挪到左侧栏）。

**第 2 步**：把元数据加进 `src/games/manifest.js`

```js
{
  id: 'my-game', name: '我的游戏', emoji: '🎯', category: '观察', isNew: true,
  desc: '一句话介绍', glow: 'linear-gradient(135deg,#6ee7ff,#b46bff)',
  how: ['第一步怎么玩', '第二步怎么玩'], skill: '锻炼的能力',   // 首次进入自动弹出
  theme: false, scoreMode: 'max', unit: '分', quick: true,
  levels: [{ id: 'easy', name: '简单', n: 3 }, { id: 'hard', name: '困难', n: 5 }],
  load: () => import('./my-game/index.js'),
}
```

**第 3 步**：可选 `src/games/my-game/style.css`（会被自动加载/卸载）。

完成 —— 首页大厅、路由、每日训练、最佳成绩、难度切换会自动接入。

### 基类可用的能力

| 成员 | 说明 |
|---|---|
| `this.root` | 游戏挂载的 DOM 节点 |
| `this.ctx.options` | 难度参数（来自 manifest 的 level 定义）+ 路由 query |
| `this.ctx.theme` | 当前主题包（仅 `theme: true` 的游戏有） |
| `this.hud` | `set([...])` / `patch(key, value)` / `show()` / `hide()` |
| `this.finish(r)` | 结算：`{ score, stars(0-3), mode('max'\|'min'), title, message, stats, speak, noRecord }`（`noRecord` 的失败局不计最佳成绩） |
| `this.ctx.reload({level})` | 换难度重开；`this.ctx.restart()` 原参数重开 |
| `this.every/later/frame/on` | 受管资源，`teardown()` 时自动清理，暂停期间自动冻结，**不要直接用 setInterval** |
| `new Timer(this)` | `startCountdown / startCountUp / addTime(±ms) / stop`，暂停时自动停表 |
| `pause() / resume()` | 可选钩子：切后台或打开玩法说明时调用 |
| `this.sound.play('good')` | 音效：tap/flip/place/good/great/bad/tick/win/lose/go/pop/whack/slide/merge（手机上附带震动） |
| `this.say('文字')` | 语音朗读（受设置开关控制） |
| `this.save` | 存档 API：`best(id)` / `settings` / `addPower()` … |

---

## 二、换成奥特曼等素材（图片主题）

游戏的图案全部来自**主题包**，所以换素材不需要改任何游戏代码。

### 做法 A：运行时注册（推荐，改一个文件）

1. 把图片放进 `assets/ultraman/`（正方形 PNG 或 JPG，建议 256×256 以上）；
2. 在 `src/themes/index.js` 末尾追加：

```js
import { registerTheme } from './index.js'; // 文件内直接调用 registerTheme 即可

registerTheme({
  id: 'ultraman',
  name: '奥特曼',
  emoji: '🦸',
  kind: 'image',                     // image = 用真实图片
  palette: ['#e0243a', '#eef3fb'],   // 影响拼图底色与卡片配色
  faces: [                           // 翻牌 / 找不同用，建议 ≥ 10 张
    { id: 'tiga',   name: '迪迦',   img: './assets/ultraman/tiga.png' },
    { id: 'zero',   name: '赛罗',   img: './assets/ultraman/zero.png' },
    { id: 'taiga',  name: '泰迦',   img: './assets/ultraman/taiga.png' },
    // …
  ],
  art: './assets/ultraman/scene.jpg', // 拼图用的一整张大图（建议 900×900 以上）
});
```

刷新后，进入「翻牌记忆 / 拼图挑战 / 找不同」等支持换皮的游戏，顶部会出现主题切换条，
选中即可换皮（主题选择已从首页移入这些游戏内部，避免首页信息过载）。

### 做法 B：只换某几个主题的素材

直接改内置主题的 `faces`（把 `svg: ...` 换成 `img: './assets/...'`）即可，
`svg.js` 里的程序化素材仍然保留给其他主题用。

> 素材数量建议：翻牌困难档 5×4 需要 **10 张**图案；少于 10 张时游戏会自动降规格，不会报错。

---

## 三、存档与成绩

localStorage key：`brainmaster.save.v1`，结构：

```jsonc
{
  "settings": { "sound": true, "voice": true, "hints": true, "theme": "heroes" },
  "brain":    { "power": 0, "day": "2026-09-19", "streak": 1, "trained": ["memory"] },
  "best":     { "memory": { "score": 1154, "meta": {}, "at": 1789749190198 } },
  "plays":    { "memory": 3 },
  "history":  [ { "at": 1789749190198, "game": "memory", "score": 1154 } ]
}
```

- 每局结算会写最佳成绩（`scoreMode: 'min'` 的项目如拼图步数、反应毫秒自动取小）；
- 脑力值 = 基础分 × 星级 × 破纪录加成，等级与称号见 `storage.js` 的 `LEVELS`；
- 需要"清空重来"可在控制台执行 `BrainMaster.save.reset()`。

---

## 四、界面与主题

- 配色令牌集中在 `src/styles/base.css` 的 `:root`，改一处全局生效；
- 目前是**深色霓虹科技风**；想要儿童明亮风，只需把 `--bg-0/--bg-1` 换成浅色、`--ink` 换成深色；
- HUD / 卡片 / 弹窗等通用组件在 `components.css`，游戏私有样式写在各自 `games/*/style.css`。

## 五、安卓打包（Capacitor）

本项目已接入 [Capacitor](https://capacitorjs.com/)，可把同一套 Web 代码一键打包成安卓 App，
并在安卓上用**原生 TTS 语音引擎**朗读 —— 注意安卓 WebView 没有 `speechSynthesis`，
所以语音必须走原生桥接才能出声（这正是接入 TTS 插件的原因）。

### 1. 安装依赖（已装好）
```bash
npm install
```
关键依赖：`@capacitor/core`、`@capacitor/android`、`@capacitor-community/text-to-speech`、
`@capacitor/splash-screen`、`@capacitor/status-bar`、`@capacitor/haptics`、`@capacitor/app`。

### 2. 打包 Web 资源
```bash
npm run build            # esbuild 把 src/ 打成 dist/app.js，并同步样式 / 游戏 CSS / 素材
# 等价于： node scripts/build-web.mjs
```
> 日常开发用 `npm run dev` 直读 `src/` 即可，无需打包；打包用于产出安卓静态资源和 PWA 部署包。

### 3. 生成 / 同步原生工程
```bash
npx cap add android      # 仅首次：生成 android/ 原生工程（已生成，并已注册 TTS 等插件）
npm run cap:sync         # 改了前端后：重新打包并同步到 android/
```

### 4. 用 Android Studio 打开并运行
```bash
npm run cap:open         # = cap sync + 打开 Android Studio
```
在 Android Studio 里打开 `android/` 目录，连上真机或模拟器点 Run。
首次运行需本机已安装 **Android SDK（API 33+）** 与 Android Studio。

### 5. 直接出 APK（有 SDK 环境）
```bash
npm run android:apk      # cap sync + gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

### 语音与音效在安卓上为什么能响
- `src/core/audio.js` 的 `Voice`：检测到原生壳（`window.Capacitor.isNativePlatform()`）时调用
  `TextToSpeech.speak(...)`（安卓系统 TTS，离线可用、稳定）；否则回退浏览器 Web Speech。
- 音效为 WebAudio 实时合成，已在首次触摸时 `resume()` 解锁 `AudioContext`（安卓 WebView 默认 suspended）。
- 因此安卓上**语音朗读与音效都能正常播放**，无需联网、无需额外权限。

### 关键文件
- `capacitor.config.json` —— appId / appName / `webDir=dist` / 开屏与系统栏（SystemBars 隐藏 + CSS 安全区注入）
- `android/.../MainActivity.java` —— 沉浸式全屏（隐藏状态栏与导航栏，滑动边缘临时呼出）
- `scripts/build-web.mjs` —— esbuild 打包（含游戏 CSS、素材、PWA 文件同步与 SW 预缓存清单注入）
- `android/` —— Capacitor 生成的原生工程（已包含 TTS 等插件）

### 应用图标
图标是戴学士帽的小脑袋吉祥物，源头在 `src/ui/logo.js`（应用内 Logo 也用它）。改完后执行：
```bash
npm run icons            # 重新生成 PWA 图标、安卓 mipmap（含自适应图标前景）和各尺寸开屏图
```

## 六、可继续扩展的方向

- 新增游戏：连线记忆、俄罗斯方块、一笔画、数字华容道闯关（照着上面的 3 步加即可）
- 主题：奥特曼、汪汪队、恐龙、交通工具、汉字卡
- 系统：家长报告（每周脑力曲线 / 分类雷达图）、多语言、排行榜、音效包替换
- 无障碍：更多游戏的键盘操作、更大字号模式

## 七、Git 版本管理与 GitHub Actions（自动出 APK）

项目已初始化 Git 仓库，并附带一条 CI 流水线：每次 push 自动构建安卓 **Debug APK** 并上传为构建产物；
打 `v*` tag 时还会自动发布到 GitHub Release。

### 1. 本地提交
```bash
git add -A
git commit -m "你的改动说明"
git push origin main
```

### 2. CI 做了什么（`.github/workflows/build-android.yml`）
1. 检出代码 → 装 Node 22 + JDK 21；
2. 装 Android SDK（`platform-36` / `build-tools;36.0.0`）并接受协议；
3. `npm ci` → `npm run build` 产出 `dist/`；
4. `npx cap sync android` 把 Web 资源同步进原生工程；
5. `./gradlew assembleDebug` 编译 Debug APK；
6. 用 `actions/upload-artifact` 上传 APK；若是 `v*` tag，再用 `softprops/action-gh-release` 发布。

### 3. 怎么拿到 APK
- 普通 push：进仓库 **Actions → 对应任务 → Artifacts → `brain-master-debug-apk`** 下载；
- 打 tag：`git tag v1.0.0 && git push origin v1.0.0`，去 **Releases** 下载。

> CI 产出的是 **Debug** 包（可直接安装测试，无签名限制）。要上架商店需自行配置 Release 签名
> （`keystore` + `android/app/build.gradle` 的 `signingConfigs` 块）。
> 仓库已用 `.gitignore` / `.gitattributes` 管理：`node_modules`、`dist`、安卓编译缓存、出包与密钥均不入库；
> 文本统一 **LF** 换行，保证 Linux runner 上的 `gradlew` 可正常执行。

### 4. 一键发版示例
```bash
git tag v1.0.0
git push origin v1.0.0     # CI 自动构建并把 APK 发布到 Release
```

> 注意：Capacitor 原生工程 `android/` 已提交进仓库，因此 CI 无需 `cap add`，直接 `cap sync` 即可。
