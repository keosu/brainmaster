/**
 * 本地存档：最佳成绩 / 设置 / 脑力值 / 训练记录
 * 统一走 localStorage，读写都做了容错，方便后期替换成远端存档。
 */
const KEY = 'brainmaster.save.v1';

const DEFAULT = {
  version: 1,
  settings: {
    sound: true,      // 音效
    voice: true,      // 语音朗读（TTS）
    hints: true,      // 是否显示提示（如黑白棋可落点）
    theme: 'heroes',  // 当前主题包 id
    hidden: [],       // 被用户隐藏的游戏 id 列表
    haptics: true,    // 震动反馈
    fullscreen: true, // 手机浏览器里首次点击自动进入全屏（隐藏状态栏）
  },
  seen: {},       // { [gameId]: 1 } 已看过玩法说明
  brain: {
    power: 0,     // 脑力值
    day: null,    // 最近训练日
    streak: 0,    // 连续天数
    bestStreak: 0, // 历史最长连续天数
    trained: [],  // 今日已完成训练的游戏 id
  },
  best: {},       // { [gameId]: { score, meta, at } }
  plays: {},      // { [gameId]: 次数 }
  history: [],    // 最近 30 条记录
  days: {},       // 打卡记录 { 'YYYY-MM-DD': { n: 局数, s: 星数 } }
  stats: {
    stars: 0,        // 累计星星
    catStars: {},    // { 分类: 星星数 }
    bestStars: {},   // { [gameId]: 单局最高星级 }
    threeStars: 0,   // 三星局数
    records: 0,      // 刷新个人纪录次数
    trainings: 0,    // 完成每日训练次数
    feats: {},       // 特殊挑战 { featId: 时间戳 }
  },
  achievements: {}, // 已解锁成就 { id: 时间戳 }
};

let cache = null;

function read() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? deepMerge(structuredClone(DEFAULT), JSON.parse(raw)) : structuredClone(DEFAULT);
  } catch {
    cache = structuredClone(DEFAULT);
  }
  return cache;
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 隐私模式忽略 */ }
}

function deepMerge(base, patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      deepMerge(base[k], v);
    } else if (v !== undefined) {
      base[k] = v;
    }
  }
  return base;
}

export const save = {
  get all() { return read(); },

  /* ---- 设置 ---- */
  get settings() { return read().settings; },
  setSetting(key, value) {
    read().settings[key] = value;
    write();
    return value;
  },
  toggleSetting(key) {
    return save.setSetting(key, !read().settings[key]);
  },

  /* ---- 最佳成绩 ---- */
  best(gameId) { return read().best[gameId] || null; },
  /** mode: 'max' 越大越好 / 'min' 越小越好 */
  submitBest(gameId, score, meta = {}, mode = 'max') {
    const s = read();
    const prev = s.best[gameId];
    const better = !prev || (mode === 'min' ? score < prev.score : score > prev.score);
    if (better) {
      s.best[gameId] = { score, meta, at: Date.now() };
      write();
      return { isBest: true, prev: prev?.score ?? null };
    }
    return { isBest: false, prev: prev.score };
  },

  /* ---- 游玩次数 ---- */
  plays(gameId) { return read().plays[gameId] || 0; },
  addPlay(gameId) {
    const s = read();
    s.plays[gameId] = (s.plays[gameId] || 0) + 1;
    write();
  },

  /* ---- 脑力值 / 连续训练 ---- */
  get brain() { return read().brain; },
  addPower(delta) {
    const s = read();
    s.brain.power += Math.max(0, Math.round(delta));
    write();
    return s.brain.power;
  },
  markTrained(gameId) {
    const s = read();
    const today = todayKey();
    if (s.brain.day !== today) {
      s.brain.streak = s.brain.day === yesterdayKey() ? s.brain.streak + 1 : 1;
      s.brain.day = today;
      s.brain.trained = [];
      s.brain.bestStreak = Math.max(s.brain.bestStreak || 0, s.brain.streak);
    }
    if (!s.brain.trained.includes(gameId)) s.brain.trained.push(gameId);
    write();
    return s.brain;
  },
  get trainedToday() { const b = read().brain; return b.day === todayKey() ? b.trained : []; },

  /** 连续打卡天数：最近一次打卡不是今天或昨天就算断了 */
  get streak() {
    const b = read().brain;
    return b.day === todayKey() || b.day === yesterdayKey() ? b.streak : 0;
  },

  /* ---- 荣誉统计 ---- */
  /** 每局结算时记录：打卡日、星星、三星、刷新纪录 */
  recordResult({ gameId, category, stars = 0, newRecord = false }) {
    const s = read();
    const day = todayKey();
    const d = s.days[day] || (s.days[day] = { n: 0, s: 0 });
    d.n += 1;
    d.s += stars;
    const keys = Object.keys(s.days);
    if (keys.length > 800) keys.sort().slice(0, keys.length - 800).forEach((k) => delete s.days[k]);
    const st = s.stats;
    st.stars += stars;
    if (category) st.catStars[category] = (st.catStars[category] || 0) + stars;
    st.bestStars[gameId] = Math.max(st.bestStars[gameId] || 0, stars);
    if (stars >= 3) st.threeStars += 1;
    if (newRecord) st.records += 1;
    write();
  },
  addFeats(ids) {
    const s = read();
    let added = false;
    ids.forEach((id) => { if (!s.stats.feats[id]) { s.stats.feats[id] = Date.now(); added = true; } });
    if (added) write();
  },
  addTraining() {
    read().stats.trainings += 1;
    write();
  },
  seedDay(day, entry) {
    const s = read();
    if (!s.days[day]) { s.days[day] = entry; write(); }
  },
  get stats() { return read().stats; },
  get days() { return read().days; },
  get achievements() { return read().achievements; },
  unlockAchievement(id) {
    const s = read();
    if (s.achievements[id]) return false;
    s.achievements[id] = Date.now();
    write();
    return true;
  },

  /* ---- 历史 ---- */
  pushHistory(entry) {
    const s = read();
    s.history.unshift({ at: Date.now(), ...entry });
    s.history = s.history.slice(0, 30);
    write();
  },
  get history() { return read().history; },

  reset() {
    cache = structuredClone(DEFAULT);
    write();
  },

  /** 导出全部存档为 JSON 字符串 */
  exportString() {
    return JSON.stringify(read(), null, 2);
  },

  /** 导入存档（用导出的 JSON 覆盖）。结构非法会抛错。 */
  importData(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('数据格式无效');
    cache = deepMerge(structuredClone(DEFAULT), obj);
    write();
    return cache;
  },

  /* ---- 玩法说明 ---- */
  hasSeen(gameId) { return !!read().seen[gameId]; },
  markSeen(gameId) {
    read().seen[gameId] = 1;
    write();
  },

  isHidden(id) {
    const h = read().settings.hidden;
    return Array.isArray(h) && h.includes(id);
  },
};

/* ---------------- 等级体系 ---------------- */
export const LEVELS = [
  { lv: 1, need: 0, title: '见习脑力师', emoji: '🌱' },
  { lv: 2, need: 60, title: '思维小新星', emoji: '⭐' },
  { lv: 3, need: 160, title: '记忆小达人', emoji: '🧠' },
  { lv: 4, need: 320, title: '逻辑小侦探', emoji: '🔍' },
  { lv: 5, need: 560, title: '闪电反应王', emoji: '⚡' },
  { lv: 6, need: 900, title: '计算小超人', emoji: '🚀' },
  { lv: 7, need: 1400, title: '空间魔术师', emoji: '🎩' },
  { lv: 8, need: 2000, title: '策略指挥官', emoji: '♟️' },
  { lv: 9, need: 2800, title: '智慧小博士', emoji: '🎓' },
  { lv: 10, need: 3800, title: '脑力宗师', emoji: '👑' },
  { lv: 11, need: 5000, title: '光之智者', emoji: '✨' },
  { lv: 12, need: 6500, title: '传奇大脑', emoji: '🏆' },
];

export function levelOf(power) {
  let cur = LEVELS[0];
  let next = LEVELS[1] || null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (power >= LEVELS[i].need) {
      cur = LEVELS[i];
      next = LEVELS[i + 1] || null;
    }
  }
  const span = next ? next.need - cur.need : 1;
  const got = next ? power - cur.need : span;
  return { ...cur, next, progress: next ? Math.min(1, got / span) : 1, remain: next ? next.need - power : 0 };
}

/** 按本地时区取日期，避免 UTC 跨日导致"今日训练"提前清零 */
export function localDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function todayKey() { return localDay(new Date()); }
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDay(d);
}
