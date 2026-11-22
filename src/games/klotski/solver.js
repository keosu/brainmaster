/**
 * 华容道：关卡数据 + BFS 求解器（单格移动计步）。
 * 同类棋子互换视为同一局面，横刀立马的可达局面约 2.5 万，浏览器里几十毫秒就能搜完。
 */
export const COLS = 4;
export const ROWS = 5;
export const GOAL = { r: 3, c: 1 }; // 曹操左上角到达此处即出关

/** 同一字母 = 同一块棋子；'.' 为空位 */
export const LAYOUTS = {
  easy: [
    'DBBE',
    'FBBG',
    'HIJK',
    'A..C',
    'ALMC',
  ],
  normal: [
    'DBBF',
    'ABBC',
    'AEEC',
    'G..H',
    'IJKL',
  ],
  hard: [
    'ABBC',
    'ABBC',
    'DEEF',
    'DGHF',
    'I..J',
  ],
};
/** 各关单格计步的最少步数（BFS 预先算好，改关卡后需重算） */
export const BEST = { easy: 25, normal: 43, hard: 116 };

const GENERAL_NAMES = ['张飞', '赵云', '马超', '黄忠'];

/** 把关卡字符串解析成棋子列表 */
export function parseLayout(rows) {
  const seen = new Map();
  rows.forEach((line, r) => line.split('').forEach((ch, c) => {
    if (ch === '.') return;
    const p = seen.get(ch);
    if (!p) seen.set(ch, { ch, r, c, r2: r, c2: c });
    else { p.r2 = Math.max(p.r2, r); p.c2 = Math.max(p.c2, c); }
  }));
  let g = 0;
  return Array.from(seen.values()).map((p, id) => {
    const w = p.c2 - p.c + 1;
    const h = p.r2 - p.r + 1;
    let kind = 'S';
    let name = '兵';
    if (w === 2 && h === 2) { kind = 'C'; name = '曹操'; }
    else if (w === 2) { kind = 'H'; name = '关羽'; }
    else if (h === 2) { kind = 'V'; name = GENERAL_NAMES[g++ % GENERAL_NAMES.length]; }
    return { id, kind, name, w, h, r: p.r, c: p.c };
  });
}

function occupancy(pieces) {
  const g = new Array(ROWS * COLS).fill(-1);
  pieces.forEach((p, i) => {
    for (let dr = 0; dr < p.h; dr++) for (let dc = 0; dc < p.w; dc++) g[(p.r + dr) * COLS + p.c + dc] = i;
  });
  return g;
}

/** 局面指纹：每格写棋子种类，同类棋子互换视为同一局面 */
export function stateKey(pieces) {
  const g = new Array(ROWS * COLS).fill('.');
  pieces.forEach((p) => {
    for (let dr = 0; dr < p.h; dr++) for (let dc = 0; dc < p.w; dc++) g[(p.r + dr) * COLS + p.c + dc] = p.kind;
  });
  return g.join('');
}

export const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/** 棋子 i 能否朝 (dr,dc) 移动一格 */
export function canMove(pieces, i, dr, dc, occ = occupancy(pieces)) {
  const p = pieces[i];
  const nr = p.r + dr;
  const nc = p.c + dc;
  if (nr < 0 || nc < 0 || nr + p.h > ROWS || nc + p.w > COLS) return false;
  for (let r = nr; r < nr + p.h; r++) {
    for (let c = nc; c < nc + p.w; c++) {
      const o = occ[r * COLS + c];
      if (o !== -1 && o !== i) return false;
    }
  }
  return true;
}

export function isSolved(pieces) {
  const cao = pieces.find((p) => p.kind === 'C');
  return !!cao && cao.r === GOAL.r && cao.c === GOAL.c;
}

/**
 * BFS：返回 { steps, first }，first 为从当前局面出发的第一步 { id, dr, dc }；无解返回 null
 */
export function solve(start) {
  if (isSolved(start)) return { steps: 0, first: null };
  const startKey = stateKey(start);
  const seen = new Set([startKey]);
  let frontier = [{ pieces: start, first: null }];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next = [];
    for (const { pieces, first } of frontier) {
      const occ = occupancy(pieces);
      for (let i = 0; i < pieces.length; i++) {
        for (const [dr, dc] of DIRS) {
          if (!canMove(pieces, i, dr, dc, occ)) continue;
          const moved = pieces.slice();
          moved[i] = { ...pieces[i], r: pieces[i].r + dr, c: pieces[i].c + dc };
          const k = stateKey(moved);
          if (seen.has(k)) continue;
          seen.add(k);
          const f = first || { id: pieces[i].id, dr, dc };
          if (isSolved(moved)) return { steps: depth, first: f };
          next.push({ pieces: moved, first: f });
        }
      }
    }
    frontier = next;
  }
  return null;
}
