/** 黑白棋规则引擎（纯函数式，无 DOM 依赖，可单独测试 / 复用） */
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const SIZE = 8;

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const idx = (r, c) => r * SIZE + c;
const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
export const opponent = (p) => (p === BLACK ? WHITE : BLACK);

export function createBoard() {
  const b = new Int8Array(SIZE * SIZE);
  b[idx(3, 3)] = WHITE; b[idx(4, 4)] = WHITE;
  b[idx(3, 4)] = BLACK; b[idx(4, 3)] = BLACK;
  return b;
}

export function cloneBoard(b) { return Int8Array.from(b); }

/** 在 (r,c) 落子能翻转的棋子坐标数组，不能落则返回空数组 */
export function flipsFor(b, r, c, player) {
  if (b[idx(r, c)] !== EMPTY) return [];
  const foe = opponent(player);
  const out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (inside(rr, cc) && b[idx(rr, cc)] === foe) {
      line.push(idx(rr, cc));
      rr += dr; cc += dc;
    }
    if (line.length && inside(rr, cc) && b[idx(rr, cc)] === player) out.push(...line);
  }
  return out;
}

/** 所有合法落点：[{ r, c, flips }] */
export function legalMoves(b, player) {
  const out = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[idx(r, c)] !== EMPTY) continue;
      const f = flipsFor(b, r, c, player);
      if (f.length) out.push({ r, c, flips: f });
    }
  }
  return out;
}

export function hasMove(b, player) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (b[idx(r, c)] === EMPTY && flipsFor(b, r, c, player).length) return true;
    }
  }
  return false;
}

/** 返回新棋盘（不修改原棋盘） */
export function applyMove(b, r, c, player) {
  const flips = flipsFor(b, r, c, player);
  if (!flips.length) return null;
  const nb = cloneBoard(b);
  nb[idx(r, c)] = player;
  flips.forEach((i) => { nb[i] = player; });
  return { board: nb, flips };
}

export function count(b) {
  let black = 0, white = 0, empty = 0;
  for (let i = 0; i < b.length; i++) {
    if (b[i] === BLACK) black++;
    else if (b[i] === WHITE) white++;
    else empty++;
  }
  return { black, white, empty };
}

export function isOver(b) {
  return !hasMove(b, BLACK) && !hasMove(b, WHITE);
}
