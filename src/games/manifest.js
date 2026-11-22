/**
 * 游戏清单 —— 新增一个游戏的唯一入口
 * ============================================================
 * 1. 在 src/games/<id>/ 下建目录（index.js 默认导出 Game 子类，可选 style.css）
 * 2. 在下面数组里加一条元数据
 * 3. 完事。首页、每日训练、路由、存档、玩法说明都会自动识别它。
 *
 * 字段说明：
 *   id          唯一标识（也是路由 #/game/<id>）
 *   name/emoji  展示名与图标
 *   category    分组：记忆 / 计算 / 逻辑 / 空间 / 观察 / 反应 / 专注 / 策略
 *   desc        一句话介绍
 *   how         玩法说明（数组，每条一步；首次进入游戏自动弹出，游戏中点 ❓ 可再看）
 *   skill       锻炼的能力
 *   glow        卡片渐变色
 *   theme       true 表示支持主题包（翻牌、拼图、找不同这类可换皮的）
 *   scoreMode   'max' 分数越高越好 | 'min' 越低越好（如步数、用时）
 *   unit        成绩单位，用于首页展示
 *   levels      难度档位，会以 options.level 传给游戏（第一档为默认）
 *   quick       是否可被"每日训练"随机抽中（单局 1~2 分钟内能结束的才勾）
 *   isNew       首页显示 NEW 角标（玩过一次后自动消失）
 *   load        动态 import（保持懒加载，首屏更快）
 */
export const CATEGORY_META = {
  记忆: { emoji: '🧠' },
  计算: { emoji: '🔢' },
  逻辑: { emoji: '🧩' },
  空间: { emoji: '📐' },
  观察: { emoji: '👀' },
  反应: { emoji: '⚡' },
  专注: { emoji: '🎯' },
  策略: { emoji: '♟️' },
};

export const GAMES = [
  {
    id: 'memory', name: '翻牌记忆', emoji: '🃏', category: '记忆',
    desc: '翻开卡片找出相同的两张，考验短时记忆与专注力。',
    how: ['每次翻开两张牌，图案一样就配对成功', '不一样会自动翻回去，记住它们的位置', '翻牌次数越少、连击越多，分数越高'],
    skill: '短时记忆 · 专注力',
    glow: 'linear-gradient(135deg,#ff6b9d,#ffd166)',
    theme: true, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '简单', cols: 4, rows: 3, preview: 2200 },
      { id: 'normal', name: '普通', cols: 4, rows: 4, preview: 1600 },
      { id: 'hard', name: '困难', cols: 5, rows: 4 },
    ],
    load: () => import('./memory/index.js'),
  },
  {
    id: 'matrix', name: '记忆矩阵', emoji: '🟦', category: '记忆', isNew: true,
    desc: '格子会亮一下再熄灭，凭记忆把亮过的格子全部点出来。',
    how: ['仔细看：有几个格子会短暂亮起', '熄灭后把它们全部点出来', '全对进入下一关，亮的格子越来越多；点错 3 次结束'],
    skill: '空间记忆 · 工作记忆',
    glow: 'linear-gradient(135deg,#5b8cff,#6ee7ff)',
    theme: false, scoreMode: 'max', unit: '块', quick: true,
    levels: [
      { id: 'easy', name: '入门', n: 3, k: 3 },
      { id: 'normal', name: '标准', n: 4, k: 4 },
      { id: 'hard', name: '挑战', n: 5, k: 5 },
    ],
    load: () => import('./matrix/index.js'),
  },
  {
    id: 'balloon', name: '气球爆爆', emoji: '🎈', category: '计算', isNew: true,
    desc: '从小到大依次戳破气球，困难档气球上是算式哦！',
    how: ['每个气球上有一个数字（或算式）', '按从小到大的顺序戳破它们', '戳错会扣 2 秒，60 秒内戳得越多分越高'],
    skill: '数感 · 心算 · 比较大小',
    glow: 'linear-gradient(135deg,#ff6b9d,#ff9f45)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '数字', max: 20, n: 4, time: 60000 },
      { id: 'normal', name: '大数', max: 99, n: 5, time: 60000 },
      { id: 'hard', name: '算式', max: 30, n: 5, expr: true, time: 60000 },
    ],
    load: () => import('./balloon/index.js'),
  },
  {
    id: 'math', name: '心算冲刺', emoji: '➕', category: '计算',
    desc: '60 秒倒计时，一口气算出尽可能多的题目。',
    how: ['看算式，从四个答案里选出正确的那个', '每连对 5 题奖励 2 秒，答错扣 2 秒', '电脑键盘可以按 1~4 选择'],
    skill: '心算速度 · 准确率',
    glow: 'linear-gradient(135deg,#ff9f45,#ffd166)',
    theme: false, scoreMode: 'max', unit: '题', quick: true,
    levels: [
      { id: 'easy', name: '加减', ops: ['+', '-'], max: 20, time: 60000 },
      { id: 'normal', name: '加减乘', ops: ['+', '-', '×'], max: 50, time: 60000 },
      { id: 'hard', name: '四则', ops: ['+', '-', '×', '÷'], max: 99, time: 60000 },
    ],
    load: () => import('./math/index.js'),
  },
  {
    id: 'scale', name: '天平称重', emoji: '⚖️', category: '逻辑', isNew: true,
    desc: '看天平往哪边倾斜，推理出谁最重、谁最轻。',
    how: ['天平往下沉的一边更重', '综合所有天平，找出最重（或最轻）的那个', '60 秒内答对越多越好'],
    skill: '推理 · 比较 · 传递关系',
    glow: 'linear-gradient(135deg,#ffd166,#4ade80)',
    theme: false, scoreMode: 'max', unit: '题', quick: true,
    levels: [
      { id: 'easy', name: '3 个', k: 3, time: 60000 },
      { id: 'normal', name: '4 个', k: 4, time: 60000 },
      { id: 'hard', name: '5 个', k: 5, ask: 'mix', time: 60000 },
    ],
    load: () => import('./scale/index.js'),
  },
  {
    id: 'blocks', name: '数积木', emoji: '🧊', category: '空间', isNew: true,
    desc: '数一数这堆积木一共有几块，被挡住的也要算上！',
    how: ['观察这堆立体积木', '上面的积木下面一定有积木托着，看不见的也要数', '选出总块数，共 8 题，又快又准分数高'],
    skill: '空间想象 · 立体感知',
    glow: 'linear-gradient(135deg,#6ee7ff,#b46bff)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '小堆', w: 2, d: 2, h: 3, rounds: 8 },
      { id: 'normal', name: '中堆', w: 3, d: 3, h: 3, rounds: 8 },
      { id: 'hard', name: '大堆', w: 4, d: 3, h: 4, rounds: 8 },
    ],
    load: () => import('./blocks/index.js'),
  },
  {
    id: 'shadow', name: '影子观察', emoji: '🔦', category: '空间', isNew: true,
    desc: '灯从不同方向照向一堆积木，墙上、地上的影子会是什么样？',
    how: ['看清积木的形状和灯的位置', '灯从哪边照，影子就落在对面的墙上；从正上方照，影子落在地上', '选出正确的影子；挑战档还会问「哪个不可能是它的影子」', '共 8 题，又快又准分数高'],
    skill: '空间想象 · 三视图 · 投影推理',
    glow: 'linear-gradient(135deg,#ffd166,#5b8cff)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', w: 3, d: 2, h: 2, opts: 3, rounds: 8 },
      { id: 'normal', name: '标准', w: 3, d: 3, h: 3, opts: 4, rounds: 8 },
      { id: 'hard', name: '挑战', w: 4, d: 3, h: 3, opts: 4, not: 0.45, rounds: 8 },
    ],
    load: () => import('./shadow/index.js'),
  },
  {
    id: 'odd', name: '找不同', emoji: '🔍', category: '观察', isNew: true,
    desc: '左右两幅图藏着几处不一样，越往后越细微，考验你的火眼金睛。',
    how: ['左右两幅图几乎一样，但有几处不同', '在任意一幅图上点出不同的地方', '可能是消失、变色、换了东西、少了小细节、翻了个面……', '点错扣 3 秒；卡住了可以用💡提示（扣 5 秒）'],
    skill: '视觉辨别 · 细节观察 · 专注力',
    glow: 'linear-gradient(135deg,#ffd166,#4ade80)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '3 处', objects: 11, diffs: 3, size: [1.2, 1.5], time: 50000, rounds: 3 },
      { id: 'normal', name: '5 处', objects: 15, diffs: 5, size: [1.0, 1.3], time: 70000, rounds: 3 },
      { id: 'hard', name: '7 处', objects: 19, diffs: 7, size: [0.88, 1.14], time: 90000, rounds: 3 },
    ],
    load: () => import('./odd/index.js'),
  },
  {
    id: 'quickcount', name: '一眼数清', emoji: '👁️', category: '观察', isNew: true,
    desc: '图案只闪一下，快速说出有几个。',
    how: ['屏幕上会闪现一堆图案', '它们很快会消失，记住有几个', '从选项中选出正确数量，共 10 题'],
    skill: '数感 · 视觉广度',
    glow: 'linear-gradient(135deg,#4ade80,#ffd166)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', min: 3, max: 7, show: 1600, rounds: 10 },
      { id: 'normal', name: '标准', min: 5, max: 12, show: 1200, rounds: 10 },
      { id: 'hard', name: '混合', min: 6, max: 14, show: 1300, mix: true, rounds: 10 },
    ],
    load: () => import('./quickcount/index.js'),
  },
  {
    id: 'schulte', name: '舒尔特方格', emoji: '🔟', category: '专注',
    desc: '从 1 开始按顺序点完所有数字，练的是眼力和专注。',
    how: ['方格里的数字是打乱的', '从 1 开始，按顺序一个个点下去', '越快越好，点错不会结束'],
    skill: '注意力 · 视觉搜索',
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
    id: 'stroop', name: '色词干扰', emoji: '🌈', category: '反应',
    desc: '字的颜色和字的意思不一样，只选颜色别被字骗了！',
    how: ['屏幕上会出现一个颜色字，比如用蓝色写的「红」', '选「字的颜色」（蓝），不是字的意思', '答错扣时间，看你能坚持多少题'],
    skill: '抑制控制 · 反应速度',
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
    id: 'mole', name: '打地鼠', emoji: '🐹', category: '反应', isNew: true,
    desc: '地鼠一冒头就敲下去，小心别敲到炸弹！',
    how: ['地鼠从洞里冒出来时，快点敲它', '金色地鼠分数更高，炸弹千万别碰', '时间结束前拿到尽可能多的分'],
    skill: '反应速度 · 手眼协调',
    glow: 'linear-gradient(135deg,#ff9f45,#ffd166)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', n: 3, speed: 1, bombs: false, time: 40000 },
      { id: 'normal', name: '标准', n: 3, speed: 1.3, bombs: true, time: 40000 },
      { id: 'hard', name: '疯狂', n: 4, speed: 1.6, bombs: true, time: 40000 },
    ],
    load: () => import('./mole/index.js'),
  },
  {
    id: 'reaction', name: '闪电反应', emoji: '⚡', category: '反应',
    desc: '灯光一亮就点！测测你的反应到底有多快。',
    how: ['等待屏幕变成绿色', '一变绿立刻点击（键盘按空格也行）', '提前点会被判抢跑，这次不算'],
    skill: '反应速度',
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
    id: 'numbers', name: '数字记忆', emoji: '🔢', category: '记忆',
    desc: '数字闪一下就消失，按从小到大的顺序把它们点出来。',
    how: ['记住每个数字出现的位置', '数字消失后，按 1、2、3… 的顺序点出来', '每关数字更多，有 3 次犯错机会'],
    skill: '视觉记忆 · 顺序记忆',
    glow: 'linear-gradient(135deg,#6ee7ff,#5b8cff)',
    theme: false, scoreMode: 'max', unit: '关', quick: true,
    levels: [
      { id: 'easy', name: '入门', start: 3, show: 2600 },
      { id: 'normal', name: '标准', start: 4, show: 2000 },
      { id: 'hard', name: '困难', start: 5, show: 1500 },
    ],
    load: () => import('./numbers/index.js'),
  },
  {
    id: 'simon', name: '声光序列', emoji: '🎹', category: '记忆', isNew: true,
    desc: '彩色按钮依次闪烁并发出音符，按同样的顺序弹回去。',
    how: ['看清并听清按钮亮起的顺序', '轮到你时按相同顺序点一遍', '每过一关序列加长一个，看你能记多长'],
    skill: '序列记忆 · 听觉记忆',
    glow: 'linear-gradient(135deg,#4ade80,#5b8cff)',
    theme: false, scoreMode: 'max', unit: '个', quick: true,
    levels: [
      { id: 'easy', name: '慢速', pads: 4, speed: 680, lives: 2 },
      { id: 'normal', name: '标准', pads: 4, speed: 500, lives: 1 },
      { id: 'hard', name: '六键', pads: 6, speed: 440, lives: 1 },
    ],
    load: () => import('./simon/index.js'),
  },
  {
    id: 'rotate', name: '转一转', emoji: '🔄', category: '空间', isNew: true,
    desc: '哪个图形是原图转一转得到的？小心镜子里的"假双胞胎"。',
    how: ['看上面的原图', '下面哪个只是把它旋转了（不是翻面）', '选对加分，60 秒内看你能答对几题'],
    skill: '心理旋转 · 空间想象',
    glow: 'linear-gradient(135deg,#b46bff,#6ee7ff)',
    theme: false, scoreMode: 'max', unit: '题', quick: true,
    levels: [
      { id: 'easy', name: '入门', cells: 4, opts: 3, mirror: false, time: 60000 },
      { id: 'normal', name: '镜像', cells: 5, opts: 4, mirror: true, time: 60000 },
      { id: 'hard', name: '复杂', cells: 7, opts: 4, mirror: true, time: 60000 },
    ],
    load: () => import('./rotate/index.js'),
  },
  {
    id: 'maze', name: '迷宫探险', emoji: '🐭', category: '空间', isNew: true,
    desc: '帮小老鼠穿过迷宫找到奶酪，滑一下就跑到下个路口。',
    how: ['在迷宫上滑动（或用方向键 / 方向按钮）移动小老鼠', '它会一直跑到下一个岔路口才停', '用最短的时间找到奶酪 🧀'],
    skill: '路径规划 · 空间方位',
    glow: 'linear-gradient(135deg,#ffd166,#ff9f45)',
    theme: false, scoreMode: 'min', unit: '秒', quick: true,
    levels: [
      { id: 'easy', name: '8×8', n: 8 },
      { id: 'normal', name: '12×12', n: 12 },
      { id: 'hard', name: '16×16', n: 16 },
    ],
    load: () => import('./maze/index.js'),
  },
  {
    id: 'puzzle', name: '拼图挑战', emoji: '🧩', category: '空间',
    desc: '把打乱的画面一块块拼回原位，锻炼空间想象力。',
    how: ['交换模式：点两块图片互换位置', '滑块模式：点空格旁边的图块把它滑过去', '可以随时点「看原图」偷看目标'],
    skill: '空间想象 · 整体与局部',
    glow: 'linear-gradient(135deg,#4ade80,#6ee7ff)',
    theme: true, scoreMode: 'min', unit: '步', quick: false,
    levels: [
      { id: 'swap3', name: '3×3', n: 3, mode: 'swap' },
      { id: 'swap4', name: '4×4', n: 4, mode: 'swap' },
      { id: 'slide3', name: '滑块 3×3', n: 3, mode: 'slide' },
    ],
    load: () => import('./puzzle/index.js'),
  },
  {
    id: 'sudoku', name: '数独小格', emoji: '🧮', category: '逻辑',
    desc: '每行每列每宫都不能重复，小小的格子大大的推理。',
    how: ['点一个空格，再点下面的数字填进去', '每一行、每一列、每一宫里数字都不能重复', '卡住了可以用「提示」'],
    skill: '逻辑推理 · 排除法',
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
    id: 'lights', name: '点亮全屏', emoji: '💡', category: '逻辑', isNew: true,
    desc: '点一盏灯会连带切换上下左右的灯，想办法把灯全部点亮。',
    how: ['点一下：这盏灯和它上下左右的灯都会切换亮灭', '目标是让所有灯都亮起来', '步数越少越好，卡住了可以用提示'],
    skill: '逻辑推理 · 规律发现',
    glow: 'linear-gradient(135deg,#ffd166,#ff6b9d)',
    theme: false, scoreMode: 'min', unit: '步', quick: true,
    levels: [
      { id: 'easy', name: '3×3', n: 3, presses: 3 },
      { id: 'normal', name: '4×4', n: 4, presses: 5 },
      { id: 'hard', name: '5×5', n: 5, presses: 8 },
    ],
    load: () => import('./lights/index.js'),
  },
  {
    id: 'sequence', name: '找规律', emoji: '🔮', category: '逻辑', isNew: true,
    desc: '一串数字或图案藏着规律，猜猜问号是什么。',
    how: ['观察这一串数字（或图案）是怎么变化的', '从选项里选出问号处应该是什么', '共 10 题，答错会告诉你规律'],
    skill: '归纳推理 · 模式识别',
    glow: 'linear-gradient(135deg,#b46bff,#ffd166)',
    theme: false, scoreMode: 'max', unit: '分', quick: true,
    levels: [
      { id: 'easy', name: '入门', tier: 1, rounds: 10 },
      { id: 'normal', name: '进阶', tier: 2, rounds: 10 },
      { id: 'hard', name: '烧脑', tier: 3, rounds: 10 },
    ],
    load: () => import('./sequence/index.js'),
  },
  {
    id: 'count24', name: '24 点', emoji: '🃏', category: '计算',
    desc: '四张牌用加减乘除算出 24，每张牌都要用上。',
    how: ['点两张牌，再点一个运算符，把它们合成一张', '一直合并到只剩一张，正好是 24 就成功', '算错了可以撤销，实在想不出可以看提示'],
    skill: '运算灵活性 · 逆向思维',
    glow: 'linear-gradient(135deg,#b46bff,#5b8cff)',
    theme: false, scoreMode: 'min', unit: '秒', quick: true,
    levels: [
      { id: 'easy', name: '入门', max: 5 },
      { id: 'normal', name: '标准', max: 9 },
      { id: 'hard', name: '挑战', max: 13 },
    ],
    load: () => import('./count24/index.js'),
  },
  {
    id: 'hanoi', name: '汉诺塔', emoji: '🗼', category: '逻辑',
    desc: '把整摞盘子搬到右边，大盘不能压小盘，看谁步数最少。',
    how: ['点一根柱子拿起最上面的盘子，再点另一根柱子放下', '大盘子不能压在小盘子上', '把所有盘子搬到最右边的柱子'],
    skill: '规划能力 · 递归思维',
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
    id: 'klotski', name: '华容道', emoji: '🏯', category: '逻辑', isNew: true,
    desc: '中国经典滑块谜题：挪开挡路的将士，让曹操从下方出口逃走。',
    how: ['按住方块往空位方向滑动', '把最大的红色方块「曹操」移到底部出口', '卡住了可以点提示，电脑会告诉你下一步'],
    skill: '空间规划 · 策略思维',
    glow: 'linear-gradient(135deg,#ff5d5d,#ffd166)',
    theme: false, scoreMode: 'min', unit: '步', quick: false,
    levels: [
      { id: 'easy', name: '小试牛刀', layout: 'easy' },
      { id: 'normal', name: '兵分三路', layout: 'normal' },
      { id: 'hard', name: '横刀立马', layout: 'hard' },
    ],
    load: () => import('./klotski/index.js'),
  },
  {
    id: 'mines', name: '扫雷', emoji: '💣', category: '逻辑', isNew: true,
    desc: '根据数字推理出地雷藏在哪里，把安全的格子全部翻开。',
    how: ['点格子翻开它，数字表示周围 8 格里有几颗雷', '长按（或切换到 🚩 模式）给怀疑的格子插旗', '翻开所有安全格就赢了，第一下一定安全'],
    skill: '逻辑推理 · 概率判断',
    glow: 'linear-gradient(135deg,#94a3b8,#5b8cff)',
    theme: false, scoreMode: 'min', unit: '秒', quick: false,
    levels: [
      { id: 'easy', name: '8×8', rows: 8, cols: 8, mines: 8 },
      { id: 'normal', name: '10×10', rows: 10, cols: 10, mines: 15 },
      { id: 'hard', name: '12×12', rows: 12, cols: 12, mines: 26 },
    ],
    load: () => import('./mines/index.js'),
  },
  {
    id: 'g2048', name: '2048', emoji: '🔷', category: '策略', isNew: true,
    desc: '滑动合并相同数字，一路合成 2048！',
    how: ['上下左右滑动（或用方向键），所有方块一起移动', '两个相同数字撞在一起会合并成它们的和', '没有空位也不能合并时游戏结束'],
    skill: '策略规划 · 2 的倍数',
    glow: 'linear-gradient(135deg,#ff9f45,#ff6b9d)',
    theme: false, scoreMode: 'max', unit: '分', quick: false,
    levels: [
      { id: 'classic', name: '4×4', n: 4, goal: 2048 },
      { id: 'small', name: '3×3', n: 3, goal: 256 },
      { id: 'big', name: '5×5', n: 5, goal: 4096 },
    ],
    load: () => import('./g2048/index.js'),
  },
  {
    id: 'reversi', name: '黑白棋', emoji: '⚫', category: '策略',
    desc: '经典翻转棋，一步吃掉一整排，与电脑比谁的地盘更大。',
    how: ['落子要把对方的棋子夹在中间，被夹住的会翻成你的颜色', '发光的点是可以下的位置', '棋盘下满时，棋子多的一方获胜'],
    skill: '策略规划 · 预判',
    glow: 'linear-gradient(135deg,#5b8cff,#b46bff)',
    theme: false, scoreMode: 'max', unit: '分', quick: false,
    levels: [
      { id: 'easy', name: '入门', depth: 1 },
      { id: 'normal', name: '标准', depth: 2 },
      { id: 'hard', name: '高手', depth: 4 },
    ],
    load: () => import('./reversi/index.js'),
  },
];

const map = new Map(GAMES.map((g) => [g.id, g]));
export const getGameMeta = (id) => map.get(id) || null;
export const gameIds = () => GAMES.map((g) => g.id);
export const quickGames = () => GAMES.filter((g) => g.quick);
export const themedGames = () => GAMES.filter((g) => g.theme);
export const categories = () => Array.from(new Set(GAMES.map((g) => g.category)));
