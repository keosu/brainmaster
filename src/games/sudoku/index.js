/**
 * 数独小格 —— 4×4 / 6×6 / 9×9，程序生成保证唯一解
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle, formatTime, randInt } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const SHAPES = {
  easy: { size: 4, boxR: 2, boxC: 2 },
  normal: { size: 6, boxR: 2, boxC: 3 },
  hard: { size: 9, boxR: 3, boxC: 3 },
};

/* ---------------- 生成器 ---------------- */
function boxOf(i, size, boxR, boxC) {
  const r = Math.floor(i / size), c = i % size;
  return Math.floor(r / boxR) * (size / boxC) + Math.floor(c / boxC);
}

function peersOf(size, boxR, boxC) {
  const peers = [];
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size), c = i % size, b = boxOf(i, size, boxR, boxC);
    const set = new Set();
    for (let j = 0; j < size * size; j++) {
      if (j === i) continue;
      const r2 = Math.floor(j / size), c2 = j % size;
      if (r2 === r || c2 === c || boxOf(j, size, boxR, boxC) === b) set.add(j);
    }
    peers.push(Array.from(set));
  }
  return peers;
}

function fillGrid(size, peers) {
  const g = new Array(size * size).fill(0);
  const bt = (pos) => {
    if (pos === g.length) return true;
    const cand = shuffle(Array.from({ length: size }, (_, k) => k + 1));
    for (const v of cand) {
      if (peers[pos].some((p) => g[p] === v)) continue;
      g[pos] = v;
      if (bt(pos + 1)) return true;
      g[pos] = 0;
    }
    return false;
  };
  bt(0);
  return g;
}

function countSolutions(grid, size, peers, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const bt = () => {
    if (count >= limit) return;
    let idx = -1, best = size + 1;
    for (let i = 0; i < g.length; i++) {
      if (g[i] === 0) {
        let c = 0;
        for (let v = 1; v <= size; v++) if (!peers[i].some((p) => g[p] === v)) c++;
        if (c < best) { best = c; idx = i; if (c === 0) break; }
      }
    }
    if (idx === -1) { count++; return; }
    for (let v = 1; v <= size; v++) {
      if (peers[idx].some((p) => g[p] === v)) continue;
      g[idx] = v;
      bt();
      g[idx] = 0;
      if (count >= limit) return;
    }
  };
  bt();
  return count;
}

export function generate(shape, holes) {
  const { size, boxR, boxC } = shape;
  const peers = peersOf(size, boxR, boxC);
  const solution = fillGrid(size, peers);
  const puzzle = solution.slice();
  const order = shuffle(Array.from({ length: puzzle.length }, (_, i) => i));
  let removed = 0;
  for (const i of order) {
    if (removed >= holes) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, size, peers, 2) === 1) removed++;
    else puzzle[i] = keep;
  }
  return { puzzle, solution };
}

/* ---------------- 游戏 ---------------- */
export default class SudokuGame extends Game {
  async mount() {
    const shape = SHAPES[this.options.level] || SHAPES.easy;
    this.shape = shape;
    this.size = shape.size;
    this.peers = peersOf(this.size, shape.boxR, shape.boxC);
    const holes = Number(this.options.holes || Math.round(this.size * this.size * 0.35));
    const { puzzle, solution } = generate(shape, holes);
    this.given = puzzle.map((v) => v !== 0);
    this.values = puzzle.slice();
    this.solution = solution;
    this.selected = -1;
    this.done = false;
    this.mistakes = 0;
    this.hints = 0;
    this.peerSet = this.peers.map((p) => new Set(p));
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const hintBtn = el('button.btn.btn--sm.btn--ghost', { text: '💡 提示一个', onClick: () => this.hint() });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 换一题', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, hintBtn, restart]));

    this.grid = el('div.sd-grid.fit-box', { style: { '--n': String(this.size) } });
    this.cells = [];
    for (let i = 0; i < this.size * this.size; i++) {
      const cell = el('button.sd-cell', { onClick: () => this.select(i) });
      this.grid.appendChild(cell);
      this.cells.push(cell);
    }
    this.root.appendChild(this.grid);

    const pad = el('div.sd-pad');
    this.padButtons = [];
    for (let v = 1; v <= this.size; v++) {
      const b = el('button.sd-num', { text: String(v), onClick: () => this.input(v) });
      pad.appendChild(b);
      this.padButtons.push(b);
    }
    const erase = el('button.sd-num.sd-num--erase', { text: '⌫', onClick: () => this.input(0) });
    pad.appendChild(erase);
    this.root.appendChild(pad);

    this.on(window, 'keydown', (e) => {
      if (/^[1-9]$/.test(e.key)) this.input(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') this.input(0);
    });

    this.hud.set([
      { key: 'time', label: '用时', value: '00:00' },
      { key: 'left', label: '剩余空格', value: String(this.values.filter((v) => !v).length) },
      { key: 'miss', label: '误填', value: '0' },
    ]);
    this.hud.show();
    this.render();
    this.say('数独开始');
  }

  start() {
    this.timer.startCountUp((ms) => this.hud.patch('time', formatTime(ms)));
  }

  select(i) {
    if (this.done || this.given[i]) return;
    this.selected = i;
    this.sound.play('tap');
    this.render();
  }

  input(v) {
    if (this.done || this.selected < 0) return;
    const i = this.selected;
    if (v) {
      this.values[i] = v;
      if (this.solution[i] !== v) {
        this.mistakes += 1;
        this.hud.patch('miss', this.mistakes);
        this.sound.play('bad');
      } else {
        this.sound.play('tap');
      }
    } else {
      this.values[i] = 0;
    }
    this.render();
    if (this.values.every((x) => x) && this.values.every((x, k) => x === this.solution[k])) this.win();
  }

  hint() {
    if (this.done) return;
    const empties = this.values.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empties.length) return;
    const i = empties[randInt(0, empties.length - 1)];
    this.values[i] = this.solution[i];
    this.given[i] = true;
    this.hints += 1;
    this.sound.play('flip');
    this.render();
    if (this.values.every((x) => x) && this.values.every((x, k) => x === this.solution[k])) this.win();
  }

  render() {
    this.cells.forEach((cell, i) => {
      const v = this.values[i];
      cell.textContent = v ? String(v) : '';
      cell.classList.toggle('is-given', !!this.given[i]);
      cell.classList.toggle('is-sel', this.selected === i);
      const bad = v && this.peers[i].some((p) => this.values[p] === v && p !== i);
      cell.classList.toggle('is-bad', !!bad);
      cell.classList.toggle('is-same', !!v && this.selected >= 0 && this.values[this.selected] === v && i !== this.selected);
      cell.classList.toggle('is-peer', this.selected >= 0 && this.peerSet[this.selected].has(i));
      // 宫格分隔线
      const r = Math.floor(i / this.size), c = i % this.size;
      cell.classList.toggle('br', (c + 1) % this.shape.boxC === 0 && c !== this.size - 1);
      cell.classList.toggle('bb', (r + 1) % this.shape.boxR === 0 && r !== this.size - 1);
    });
    this.hud.patch('left', this.values.filter((v) => !v).length);
    // 某个数字已经正确填满 n 个时，数字键变暗
    this.padButtons.forEach((b, k) => {
      const v = k + 1;
      const full = this.values.filter((x, idx) => x === v && x === this.solution[idx]).length === this.size;
      b.classList.toggle('is-full', full);
    });
  }

  win() {
    this.done = true;
    this.timer.stop();
    const sec = Math.max(1, Math.round((this.timer.ms || 0) / 1000));
    const par = { easy: 60, normal: 180, hard: 480 }[this.options.level] || 120;
    let stars = sec <= par ? 3 : sec <= par * 1.8 ? 2 : 1;
    if (this.hints >= 3) stars = Math.max(1, stars - 1);
    this.finish({
      score: sec,
      mode: 'min',
      stars,
      title: '全部填对啦！',
      message: `${this.size}×${this.size} · 用时 ${formatTime(sec * 1000)}`,
      speak: '数独完成',
      showScore: true,
      stats: [
        { label: '用时', value: formatTime(sec * 1000) },
        { label: '误填', value: this.mistakes },
        { label: '提示', value: this.hints },
      ],
    });
  }

  destroy() {}
}
