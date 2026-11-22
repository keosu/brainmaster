/**
 * 荣誉系统：成就定义、进度计算、特殊挑战判定
 * ============================================================
 * 成就全部由存档里的统计数据推导（progress 返回 [当前, 目标]），
 * 新增一个成就只需在 ACHIEVEMENTS 里加一条。
 */
import { save } from './storage.js';
import { GAMES, CATEGORY_META, getGameMeta } from '../games/manifest.js';

/** 当前荣誉数据快照 */
export function snapshot() {
  const all = save.all;
  const st = save.stats;
  const playsBy = all.plays || {};
  const played = Object.keys(playsBy).filter((id) => playsBy[id] > 0 && getGameMeta(id));
  const cats = new Set(played.map((id) => getGameMeta(id).category));
  return {
    plays: Object.values(playsBy).reduce((a, b) => a + b, 0),
    played,
    categories: cats,
    stars: st.stars,
    catStars: st.catStars,
    bestStars: st.bestStars,
    threeStars: st.threeStars,
    records: st.records,
    trainings: st.trainings,
    feats: st.feats,
    days: Object.keys(save.days).length,
    streak: save.streak,
    bestStreak: Math.max(all.brain.bestStreak || 0, save.streak),
  };
}

const n = (key) => (s) => s[key];

/* ---------------- 成就列表 ---------------- */
const BASE = [
  // 起步
  { id: 'first', group: '成长', emoji: '🎈', name: '初来乍到', desc: '完成第一局游戏', goal: 1, value: n('plays') },
  { id: 'plays10', group: '成长', emoji: '🎯', name: '小试牛刀', desc: '累计完成 10 局', goal: 10, value: n('plays') },
  { id: 'plays50', group: '成长', emoji: '💪', name: '渐入佳境', desc: '累计完成 50 局', goal: 50, value: n('plays') },
  { id: 'plays200', group: '成长', emoji: '🏋️', name: '身经百战', desc: '累计完成 200 局', goal: 200, value: n('plays') },
  { id: 'plays500', group: '成长', emoji: '🗻', name: '千锤百炼', desc: '累计完成 500 局', goal: 500, value: n('plays') },
  // 打卡
  { id: 'days3', group: '打卡', emoji: '📅', name: '初次打卡', desc: '累计打卡 3 天', goal: 3, value: n('days') },
  { id: 'streak3', group: '打卡', emoji: '🔥', name: '小火苗', desc: '连续打卡 3 天', goal: 3, value: n('bestStreak') },
  { id: 'streak7', group: '打卡', emoji: '🔥', name: '一周不断', desc: '连续打卡 7 天', goal: 7, value: n('bestStreak') },
  { id: 'streak30', group: '打卡', emoji: '🌟', name: '月度之星', desc: '连续打卡 30 天', goal: 30, value: n('bestStreak') },
  { id: 'days100', group: '打卡', emoji: '💯', name: '百日坚持', desc: '累计打卡 100 天', goal: 100, value: n('days') },
  { id: 'train1', group: '打卡', emoji: '🎽', name: '晨练开始', desc: '完成 1 次每日训练', goal: 1, value: n('trainings') },
  { id: 'train20', group: '打卡', emoji: '🏅', name: '训练达人', desc: '完成 20 次每日训练', goal: 20, value: n('trainings') },
  // 星光
  { id: 'three1', group: '星光', emoji: '⭐', name: '第一个三星', desc: '任意游戏拿到三星', goal: 1, value: n('threeStars') },
  { id: 'three30', group: '星光', emoji: '🏆', name: '三星收藏家', desc: '拿到 30 次三星', goal: 30, value: n('threeStars') },
  { id: 'stars50', group: '星光', emoji: '🌠', name: '星光闪耀', desc: '累计获得 50 颗星', goal: 50, value: n('stars') },
  { id: 'stars300', group: '星光', emoji: '🌌', name: '摘星者', desc: '累计获得 300 颗星', goal: 300, value: n('stars') },
  { id: 'records10', group: '星光', emoji: '📈', name: '超越自己', desc: '刷新个人纪录 10 次', goal: 10, value: n('records') },
  // 探索
  { id: 'explore5', group: '探索', emoji: '🧭', name: '小探险家', desc: '玩过 5 个不同的游戏', goal: 5, value: (s) => s.played.length },
  { id: 'explore15', group: '探索', emoji: '🗺️', name: '探索家', desc: '玩过 15 个不同的游戏', goal: 15, value: (s) => s.played.length },
  { id: 'exploreAll', group: '探索', emoji: '👑', name: '全部收集', desc: `${GAMES.length} 个游戏全都玩过`, goal: GAMES.length, value: (s) => s.played.length },
  { id: 'allCats', group: '探索', emoji: '🎨', name: '全能选手', desc: `${Object.keys(CATEGORY_META).length} 大类游戏都玩过`, goal: Object.keys(CATEGORY_META).length, value: (s) => s.categories.size },
];

/** 每个能力分类一个"之星"：该类累计 30 颗星 */
const CATEGORY_STARS = Object.entries(CATEGORY_META).map(([cat, m]) => ({
  id: `cat-${cat}`, group: '专精', emoji: m.emoji, name: `${cat}之星`, desc: `${cat}类游戏累计 30 颗星`,
  goal: 30, value: (s) => s.catStars[cat] || 0,
}));

/** 特殊挑战：由单局结果判定（见 detectFeats） */
const FEATS = [
  { id: 'klotski-hard', emoji: '🏯', name: '横刀立马', desc: '华容道「横刀立马」通关', test: (r) => r.id === 'klotski' && r.level === 'hard' },
  { id: 'g2048-2048', emoji: '🔷', name: '合成 2048', desc: '2048 中合成 2048 方块', test: (r) => r.id === 'g2048' && (r.meta?.max || 0) >= 2048 },
  { id: 'mines-hard', emoji: '💣', name: '排雷专家', desc: '扫雷 12×12 通关', test: (r) => r.id === 'mines' && r.level === 'hard' && !r.noRecord },
  { id: 'sudoku-hard', emoji: '🧮', name: '数独达人', desc: '完成一局 9×9 数独', test: (r) => r.id === 'sudoku' && r.level === 'hard' },
  { id: 'maze-hard', emoji: '🐭', name: '迷宫大师', desc: '走出 16×16 迷宫', test: (r) => r.id === 'maze' && r.level === 'hard' },
  { id: 'reversi-hard', emoji: '⚫', name: '击败高手', desc: '黑白棋战胜「高手」电脑', test: (r) => r.id === 'reversi' && r.level === 'hard' && r.stars >= 3 },
  { id: 'hanoi-master', emoji: '🗼', name: '六层高塔', desc: '完成 6 盘汉诺塔', test: (r) => r.id === 'hanoi' && r.level === 'master' },
  { id: 'reaction-fast', emoji: '⚡', name: '闪电侠', desc: '闪电反应平均低于 300 毫秒', test: (r) => r.id === 'reaction' && r.score > 0 && r.score < 300 },
  { id: 'simon-10', emoji: '🎹', name: '小小音乐家', desc: '声光序列记住 10 个音', test: (r) => r.id === 'simon' && r.score >= 10 },
  { id: 'matrix-9', emoji: '🟦', name: '过目不忘', desc: '记忆矩阵记住 9 块', test: (r) => r.id === 'matrix' && r.score >= 9 },
];

export const ACHIEVEMENTS = [
  ...BASE,
  ...CATEGORY_STARS,
  ...FEATS.map((f) => ({ ...f, group: '挑战', goal: 1, value: (s) => (s.feats[f.id] ? 1 : 0) })),
];

export const ACHIEVEMENT_GROUPS = ['成长', '打卡', '星光', '探索', '专精', '挑战'];

/** 单局结束：判定达成了哪些特殊挑战 */
export function detectFeats(result) {
  return FEATS.filter((f) => f.test(result)).map((f) => f.id);
}

/** 所有成就及其进度 */
export function listAchievements(s = snapshot()) {
  const got = save.achievements;
  return ACHIEVEMENTS.map((a) => {
    const cur = Math.min(a.goal, a.value(s));
    return { ...a, cur, done: !!got[a.id], at: got[a.id] || 0 };
  });
}

/** 检查并解锁新达成的成就，返回本次新解锁的列表 */
export function evaluateAchievements() {
  const s = snapshot();
  const fresh = [];
  ACHIEVEMENTS.forEach((a) => {
    if (a.value(s) >= a.goal && save.unlockAchievement(a.id)) fresh.push(a);
  });
  return fresh;
}

/** 老存档迁移：把已有的今日训练记一次打卡 */
export function initHonors() {
  const b = save.brain;
  if (b.day && !Object.keys(save.days).length) save.seedDay(b.day, { n: (b.trained || []).length, s: 0 });
  evaluateAchievements();
}
