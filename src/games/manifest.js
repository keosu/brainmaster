/**
 * 游戏清单 —— 新增一个游戏的唯一入口
 * ============================================================
 * 1. 在 src/games/<id>/ 下建目录（index.js 默认导出 Game 子类，可选 style.css）
 * 2. 在下面数组里加一条元数据
 * 3. 完事。首页、每日训练、路由、存档都会自动识别它。
 *
 * 字段说明：
 *   id          唯一标识（也是路由 #/game/<id>）
 *   name/emoji  展示名与图标
 *   category    分组：策略 / 记忆 / 观察 / 计算 / 反应 / 逻辑
 *   desc        一句话介绍
 *   glow        卡片渐变色
 *   theme       true 表示支持主题包（翻牌、拼图、找不同这类可换皮的）
 *   scoreMode   'max' 分数越高越好 | 'min' 越低越好（如步数、用时）
 *   unit        成绩单位，用于首页展示
 *   levels      难度档位，会以 options.level 传给游戏
 *   quick       是否可被"每日训练"随机抽中
 *   load        动态 import（保持懒加载，首屏更快）
 */
export const GAMES = [
  {
    id: 'memory', name: '翻牌记忆', emoji: '🃏', category: '记忆',
    desc: '翻开卡片找出相同的两张，考验短时记忆与专注力。',
    glow: 'linear-gradient(135deg,#ff6b9d,#ffd166)',
    theme: true, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '简单', cols: 4, rows: 3 },
      { id: 'normal', name: '普通', cols: 4, rows: 4 },
      { id: 'hard', name: '困难', cols: 5, rows: 4 },
    ],
    load: () => import('./memory/index.js'),
  },
  {
    id: 'reversi', name: '黑白棋', emoji: '⚫', category: '策略',
    desc: '经典翻转棋，一步吃掉一整排，与电脑比谁的地盘更大。',
    glow: 'linear-gradient(135deg,#5b8cff,#b46bff)',
    theme: false, scoreMode: 'max', unit: '分', quick: false,
    levels: [
      { id: 'easy', name: '入门', depth: 1 },
      { id: 'normal', name: '标准', depth: 2 },
      { id: 'hard', name: '高手', depth: 4 },
    ],
    load: () => import('./reversi/index.js'),
  },
  {
    id: 'puzzle', name: '拼图挑战', emoji: '🧩', category: '观察',
    desc: '把打乱的画面一块块推回原位，锻炼空间想象力。',
    glow: 'linear-gradient(135deg,#4ade80,#6ee7ff)',
    theme: true, scoreMode: 'min', unit: '步', quick: false,
    levels: [
      { id: 'easy', name: '3×3', n: 3, mode: 'slide' },
      { id: 'normal', name: '4×4', n: 4, mode: 'slide' },
      { id: 'hard', name: '5×5', n: 5, mode: 'slide' },
      { id: 'swap3', name: '3×3 交换', n: 3, mode: 'swap' },
      { id: 'swap4', name: '4×4 交换', n: 4, mode: 'swap' },
    ],
    load: () => import('./puzzle/index.js'),
  },
  {
    id: 'math', name: '心算冲刺', emoji: '🔢', category: '计算',
    desc: '60 秒倒计时，一口气算出尽可能多的题目。',
    glow: 'linear-gradient(135deg,#ff9f45,#ffd166)',
    theme: false, scoreMode: 'max', unit: '题', quick: true,
    levels: [
      { id: 'easy', name: '加减', ops: ['+', '-'], max: 20, time: 60000 },
      { id: 'normal', name: '加减乘', ops: ['+', '-', '×'], max: 50, time: 60000 },
      { id: 'hard', name: '混合', ops: ['+', '-', '×'], max: 99, time: 60000 },
    ],
    load: () => import('./math/index.js'),
  },
  {
    id: 'stroop', name: '色词干扰', emoji: '🌈', category: '反应',
    desc: '字的颜色和字的意思不一样，只选颜色别被字骗了！',
    glow: 'linear-gradient(135deg,#b46bff,#ff6b9d)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', time: 45000, options: 3 },
      { id: 'normal', name: '标准', time: 45000, options: 4 },
      { id: 'hard', name: '挑战', time: 45000, options: 6 },
    ],
    load: () => import('./stroop/index.js'),
  },
  {
    id: 'numbers', name: '数字记忆', emoji: '🔢', category: '记忆',
    desc: '数字闪一下就消失，按从小到大的顺序把它们点出来。',
    glow: 'linear-gradient(135deg,#6ee7ff,#5b8cff)',
    theme: false, scoreMode: 'max', unit: '关', quick: true,
    levels: [
      { id: 'easy', name: '入门', start: 3, show: 900 },
      { id: 'normal', name: '标准', start: 4, show: 700 },
      { id: 'hard', name: '困难', start: 5, show: 550 },
    ],
    load: () => import('./numbers/index.js'),
  },
  {
    id: 'odd', name: '找不同', emoji: '🔍', category: '观察',
    desc: '一堆图案里藏着一个不一样的，看谁先发现。',
    glow: 'linear-gradient(135deg,#ffd166,#4ade80)',
    theme: true, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', count: 4, time: 30000 },
      { id: 'normal', name: '标准', count: 6, time: 30000 },
      { id: 'hard', name: '困难', count: 9, time: 30000 },
    ],
    load: () => import('./odd/index.js'),
  },
  {
    id: 'reaction', name: '闪电反应', emoji: '⚡', category: '反应',
    desc: '灯光一亮就点！测测你的反应到底有多快。',
    glow: 'linear-gradient(135deg,#ff5d5d,#ff9f45)',
    theme: false, scoreMode: 'min', unit: 'ms', quick: true,
    levels: [
      { id: 'easy', name: '5 次', rounds: 5 },
      { id: 'normal', name: '8 次', rounds: 8 },
      { id: 'hard', name: '12 次', rounds: 12 },
    ],
    load: () => import('./reaction/index.js'),
  },
  {
    id: 'sudoku', name: '数独小格', emoji: '🧮', category: '逻辑',
    desc: '每行每列每宫都不能重复，小小的格子大大的推理。',
    glow: 'linear-gradient(135deg,#22d3ee,#5b8cff)',
    theme: false, scoreMode: 'min', unit: '秒', quick: false,
    levels: [
      { id: 'easy', name: '4×4', n: 2, holes: 6 },
      { id: 'normal', name: '6×6', n: 3, holes: 14 },
      { id: 'hard', name: '9×9', n: 3, holes: 30, big: true },
    ],
    load: () => import('./sudoku/index.js'),
  },
  {
    id: 'schulte', name: '舒尔特方格', emoji: '👀', category: '专注',
    desc: '从 1 开始按顺序点完所有数字，练的是眼力和专注。',
    glow: 'linear-gradient(135deg,#6ee7ff,#4ade80)',
    theme: false, scoreMode: 'min', unit: '秒', quick: true,
    levels: [
      { id: 'easy', name: '3×3', n: 3 },
      { id: 'normal', name: '4×4', n: 4 },
      { id: 'hard', name: '5×5', n: 5 },
      { id: 'master', name: '6×6', n: 6 },
    ],
    load: () => import('./schulte/index.js'),
  },
  {
    id: 'hanoi', name: '汉诺塔', emoji: '🗼', category: '逻辑',
    desc: '把整摞盘子搬到右边，大盘不能压小盘，看谁步数最少。',
    glow: 'linear-gradient(135deg,#ffd166,#ff9f45)',
    theme: false, scoreMode: 'min', unit: '步', quick: true,
    levels: [
      { id: 'easy', name: '3 盘', n: 3 },
      { id: 'normal', name: '4 盘', n: 4 },
      { id: 'hard', name: '5 盘', n: 5 },
      { id: 'master', name: '6 盘', n: 6 },
    ],
    load: () => import('./hanoi/index.js'),
  },
  {
    id: 'count24', name: '24 点', emoji: '🃏', category: '计算',
    desc: '四张牌用加减乘除算出 24，每张牌都要用上。',
    glow: 'linear-gradient(135deg,#b46bff,#5b8cff)',
    theme: false, scoreMode: 'min', unit: '秒', quick: true,
    levels: [
      { id: 'easy', name: '入门', max: 5 },
      { id: 'normal', name: '标准', max: 9 },
      { id: 'hard', name: '挑战', max: 13 },
    ],
    load: () => import('./count24/index.js'),
  },
];

const map = new Map(GAMES.map((g) => [g.id, g]));
export const getGameMeta = (id) => map.get(id) || null;
export const gameIds = () => GAMES.map((g) => g.id);
export const quickGames = () => GAMES.filter((g) => g.quick);
export const themedGames = () => GAMES.filter((g) => g.theme);
export const categories = () => Array.from(new Set(GAMES.map((g) => g.category)));
