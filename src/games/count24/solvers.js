/**
 * 24 点求解器 —— 只用整数运算（除法必须整除），用于发牌时保证题目有解。
 */
const EPS = 1e-9;

/** 判断一组数字能否算出 target（默认 24） */
export function solvable(nums, target = 24) {
  return search(nums.slice(), target);
}

function search(list, target) {
  if (list.length === 1) return Math.abs(list[0] - target) < EPS;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const rest = list.filter((_, k) => k !== i && k !== j);
      const a = list[i];
      const b = list[j];
      const next = [
        a + b,
        a - b,
        b - a,
        a * b,
        ...(b !== 0 && a % b === 0 ? [a / b] : []),
        ...(a !== 0 && b % a === 0 ? [b / a] : []),
      ];
      for (const v of next) {
        if (search([...rest, v], target)) return true;
      }
    }
  }
  return false;
}

/**
 * 求一条解法：返回步骤数组 [{ i, j, op, v }]（i/j 为当前列表中的下标），无解返回 null
 * 用于"提示"——只需要第一步告诉玩家先合并哪两张牌
 */
export function solution(nums, target = 24) {
  if (nums.length === 1) return Math.abs(nums[0] - target) < EPS ? [] : null;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const a = nums[i];
      const b = nums[j];
      const cands = [['+', a + b], ['-', a - b], ['×', a * b]];
      if (b !== 0 && a % b === 0) cands.push(['÷', a / b]);
      for (const [op, v] of cands) {
        if (op === '+' && i > j) continue;
        if (op === '×' && i > j) continue;
        const rest = nums.filter((_, k) => k !== i && k !== j);
        const tail = solution([...rest, v], target);
        if (tail) return [{ i, j, op, a, b, v }, ...tail];
      }
    }
  }
  return null;
}

/** 发一手保证有解（且不要一眼就看出答案）的牌 */
export function dealCards(count = 4, max = 9, rng = Math.random) {
  for (let tries = 0; tries < 400; tries++) {
    const cards = Array.from({ length: count }, () => 1 + Math.floor(rng() * max));
    if (solvable(cards)) return cards;
  }
  return [8, 3, 3, 3]; // 兜底：8×3=24
}
