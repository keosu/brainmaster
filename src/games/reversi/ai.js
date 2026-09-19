/** 黑白棋 AI：位置权重 + 行动力 + 角落，α-β 剪枝 */
import { SIZE, EMPTY, BLACK, WHITE, opponent, legalMoves, applyMove, count, isOver } from './engine.js';

export const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

function evaluate(b, player) {
  const foe = opponent(player);
  let positional = 0;
  let mine = 0, theirs = 0;
  for (let i = 0; i < b.length; i++) {
    if (b[i] === EMPTY) continue;
    if (b[i] === player) { positional += WEIGHTS[i]; mine++; }
    else { positional -= WEIGHTS[i]; theirs++; }
  }
  const myMob = legalMoves(b, player).length;
  const foeMob = legalMoves(b, foe).length;
  const mobility = 12 * (myMob - foeMob);
  const corners = [[0, 0], [0, 7], [7, 0], [7, 7]].reduce((s, [r, c]) => {
    const v = b[r * SIZE + c];
    return s + (v === player ? 60 : v === foe ? -60 : 0);
  }, 0);

  // 终局直接看子数差
  if (isOver(b)) {
    const d = mine - theirs;
    return d > 0 ? 10000 + d * 100 : d < 0 ? -10000 + d * 100 : 0;
  }
  return positional + mobility + corners + (mine - theirs) * 2;
}

function order(moves) {
  return moves.slice().sort((a, b) => WEIGHTS[b.r * SIZE + b.c] - WEIGHTS[a.r * SIZE + a.c]);
}

function minimax(b, player, depth, alpha, beta, me) {
  if (depth <= 0 || isOver(b)) return evaluate(b, me);
  const moves = legalMoves(b, player);
  if (!moves.length) {
    // 己方无子可下：若对手也无子可下则终局，否则让对手继续
    if (!legalMoves(b, opponent(player)).length) return evaluate(b, me);
    return minimax(b, opponent(player), Math.max(0, depth - 1), alpha, beta, me);
  }
  const maximizing = player === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of order(moves)) {
    const nb = applyMove(b, m.r, m.c, player)?.board;
    if (!nb) continue;
    const v = minimax(nb, opponent(player), depth - 1, alpha, beta, me);
    if (maximizing) {
      if (v > best) best = v;
      if (best > alpha) alpha = best;
    } else {
      if (v < best) best = v;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * 选一手棋
 * @param {Int8Array} board
 * @param {number} player AI 执子
 * @param {number} depth  搜索深度（1=菜鸟 2=普通 4=高手）
 */
export function chooseMove(board, player, depth = 2) {
  const moves = legalMoves(board, player);
  if (!moves.length) return null;
  let best = null;
  let bestVal = -Infinity;
  for (const m of order(moves)) {
    const nb = applyMove(board, m.r, m.c, player)?.board;
    if (!nb) continue;
    const v = minimax(nb, opponent(player), depth - 1, -Infinity, Infinity, player);
    // 轻微随机，避免每局完全一样
    const jitter = Math.random() * (depth >= 4 ? 1 : 6);
    if (v + jitter > bestVal) { bestVal = v + jitter; best = m; }
  }
  return best || moves[0];
}
