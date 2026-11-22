/**
 * 主题中心 —— 翻牌、拼图、找不同等"可换皮"游戏的素材来源。
 * ============================================================
 * 扩展方式（三选一，互不影响）：
 *  A. 内置程序化主题：kind:'svg'，用 svg.js 里的生成器，零素材依赖。
 *  B. 本地图片主题：kind:'image'，faces 里写图片路径（assets/…），
 *     想换成奥特曼只需把图片丢进 assets/ultraman/ 并在这里登记。
 *  C. 运行时注册：import { registerTheme } from './index.js' 后动态添加。
 *
 * 任何主题都只需要两个东西：
 *   faces: [{ name, img }]   —— 单个图案（翻牌用）
 *   art:    string(URL)      —— 一张完整大图（拼图用）
 */
import { svgToDataUri } from '../core/utils.js';
import * as S from './svg.js';
import { heroesScene, monstersScene, animalsScene, spaceScene, shapesScene } from './scenes.js';

const HERO_COLORS = [
  ['#e0243a', '#ffe066'], ['#2f6fe0', '#8ef2ff'], ['#16a34a', '#ffe066'],
  ['#f59e0b', '#b9f6ff'], ['#8b5cf6', '#ffe066'], ['#06b6d4', '#ffffff'],
  ['#ef4444', '#a5f3fc'], ['#64748b', '#ffd166'], ['#db2777', '#ffffff'],
  ['#7c3aed', '#7dffb2'], ['#0891b2', '#ffe066'], ['#dc2626', '#c7d2fe'],
];
const HERO_NAMES = ['烈焰', '深蓝', '翠光', '金辉', '紫电', '海蓝', '赤红', '钢铁', '樱粉', '星耀', '苍蓝', '炎阳'];

const MONSTER_COLORS = [
  ['#7b5cff', '#ffd166'], ['#22c55e', '#ff9f45'], ['#ef4444', '#ffe066'],
  ['#0ea5e9', '#ffd166'], ['#a855f7', '#4ade80'], ['#f97316', '#ffe066'],
  ['#14b8a6', '#ff6b9d'], ['#e11d48', '#ffd166'], ['#8b5cf6', '#6ee7ff'], ['#84cc16', '#ffd166'],
];
const MONSTER_NAMES = ['紫魔', '绿怪', '红兽', '蓝妖', '幻影', '熔岩', '深海', '血瞳', '暗星', '雷角'];

const SHAPE_LIST = [
  ['circle', '#6ee7ff', '圆圈'], ['square', '#ff6b9d', '方块'], ['triangle', '#ffd166', '三角'],
  ['star', '#b46bff', '星星'], ['heart', '#ff5d5d', '爱心'], ['hexagon', '#4ade80', '六边形'],
  ['diamond', '#ff9f45', '菱形'], ['flower', '#ff8fd0', '花朵'],
  ['circle', '#5b8cff', '蓝圆'], ['square', '#22d3ee', '青方'],
];

function heroesTheme() {
  const faces = HERO_COLORS.map(([stripe, eye], i) => ({
    id: `hero-${i}`,
    name: HERO_NAMES[i],
    svg: S.heroFace({ stripe, eye }),
    tint: stripe,
  }));
  return {
    id: 'heroes', name: '光之英雄', emoji: '⚡', kind: 'svg',
    palette: ['#5b8cff', '#ffd166'],
    faces,
    art: heroesScene,
  };
}

function monstersTheme() {
  const faces = MONSTER_COLORS.map(([body, horn], i) => ({
    id: `mon-${i}`,
    name: MONSTER_NAMES[i],
    svg: S.monsterFace({ body, horn, spikes: 1 + (i % 4) }),
    tint: body,
  }));
  return {
    id: 'monsters', name: '怪兽军团', emoji: '👹', kind: 'svg',
    palette: ['#7b5cff', '#22c55e'],
    faces,
    art: monstersScene,
  };
}

function animalsTheme() {
  const keys = ['cat', 'panda', 'fox', 'frog', 'penguin', 'lion', 'rabbit', 'bear', 'tiger', 'cow'];
  const names = ['小猫', '熊猫', '狐狸', '青蛙', '企鹅', '狮子', '兔子', '小熊', '老虎', '奶牛'];
  const faces = keys.map((k, i) => ({
    id: `ani-${k}`, name: names[i], svg: S.ANIMALS[k](), tint: ['#f7b267', '#fdfdfd', '#ff8f4d', '#5fd35f', '#2b3550', '#f2c14e', '#f3e8ff', '#a9743f', '#f0a24a', '#fdfdfd'][i],
  }));
  return {
    id: 'animals', name: '动物伙伴', emoji: '🐼', kind: 'svg',
    palette: ['#f2c14e', '#5fd35f'],
    faces,
    art: animalsScene,
  };
}

function spaceTheme() {
  const keys = Object.keys(S.SPACE);
  const names = ['星球', '火箭', '星星', '飞碟', '宇航员', '彗星', '月亮', '卫星'];
  const faces = keys.map((k, i) => ({
    id: `spa-${k}`, name: names[i] || k, svg: S.SPACE[k](), tint: ['#5b8cff', '#eef3fb', '#ffd166', '#8ea0c9', '#f1f5ff', '#6ee7ff', '#fff3cc', '#5b8cff'][i],
  }));
  return {
    id: 'space', name: '宇宙探险', emoji: '🚀', kind: 'svg',
    palette: ['#6ee7ff', '#b46bff'],
    faces,
    art: spaceScene,
  };
}

function shapesTheme() {
  const faces = SHAPE_LIST.map(([shape, color, name], i) => ({
    id: `shp-${i}`, name, svg: S.SHAPES[shape](color), tint: color,
  }));
  return {
    id: 'shapes', name: '几何图形', emoji: '🔷', kind: 'svg',
    palette: ['#6ee7ff', '#ff6b9d'],
    faces,
    art: shapesScene,
  };
}

function dinosTheme() {
  const keys = ['trex', 'bron', 'tric', 'steg', 'ptero', 'anky', 'para', 'spino', 'raptor', 'baby'];
  const names = ['霸王龙', '腕龙', '三角龙', '剑龙', '翼龙', '甲龙', '副栉龙', '棘龙', '迅猛龙', '恐龙宝宝'];
  const tints = ['#4ade80', '#2dd4bf', '#3b82f6', '#b46bff', '#6ee7ff', '#94a3b8', '#fb923c', '#f87171', '#facc15', '#86efac'];
  const faces = keys.map((k, i) => ({
    id: `dino-${k}`, name: names[i], svg: S.DINOS[k](), tint: tints[i],
  }));
  return {
    id: 'dinos', name: '小恐龙乐园', emoji: '🦕', kind: 'svg',
    palette: ['#4ade80', '#6ee7ff'],
    faces,
    art: () => S.dinoScene(),
  };
}

const BUILTIN = [heroesTheme(), monstersTheme(), animalsTheme(), spaceTheme(), shapesTheme(), dinosTheme()];

/* ---------------- 注册表 ---------------- */
const registry = new Map(BUILTIN.map((t) => [t.id, t]));

export function registerTheme(theme) {
  if (!theme?.id) throw new Error('主题缺少 id');
  registry.set(theme.id, theme);
  return theme;
}

export function listThemes() { return Array.from(registry.values()); }
export function getTheme(id) { return registry.get(id) || registry.get('heroes'); }

/** 取第 index 个图案的可直接使用的 URL（data URI 或图片路径） */
export function faceUrl(theme, index) {
  const f = theme.faces[index % theme.faces.length];
  if (f.img) return f.img;
  if (f.svg) return svgToDataUri(f.svg);
  return '';
}

/** 取该主题所有图案 URL */
export function faceUrls(theme, n = theme.faces.length) {
  return Array.from({ length: Math.min(n, theme.faces.length) }, (_, i) => faceUrl(theme, i));
}

/** 拼图用的完整大图 URL */
export function artUrl(theme) {
  if (theme.kind === 'image') return theme.art;
  return svgToDataUri(typeof theme.art === 'function' ? theme.art() : theme.art);
}

/** 卡片背面（全部主题共用，也可由主题覆盖 back 字段） */
export const CARD_BACK = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1b2a5e"/><stop offset="1" stop-color="#3a1d6e"/></linearGradient></defs>
  <rect width="100" height="140" rx="14" fill="url(#b)"/>
  <rect x="8" y="8" width="84" height="124" rx="10" fill="none" stroke="#6ee7ff" stroke-width="2" opacity=".7"/>
  <circle cx="50" cy="70" r="26" fill="none" stroke="#6ee7ff" stroke-width="3" opacity=".55"/>
  <circle cx="50" cy="70" r="14" fill="#6ee7ff" opacity=".28"/>
  <path d="M50 40 L54 62 L76 66 L54 70 L50 92 L46 70 L24 66 L46 62 Z" fill="#ffd166" opacity=".85"/>
</svg>`);

export { BUILTIN };
