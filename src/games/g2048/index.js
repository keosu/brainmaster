/**
 * 2048 —— 滑动合并相同数字。方块是常驻 DOM，移动只改坐标，自带滑动 / 合并动画
 */
import { Game } from '../../core/Game.js';
import { el } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast, floatText } from '../../ui/modal.js';

const DIRS = {
  left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0],
};
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
};
const UNDO_LIMIT = 3;

export default class G2048Game extends Game {
  async mount() {
    this.n = Number(this.options.n || 4);
    this.goal = Number(this.options.goal || 2048);
    this.score = 0;
    this.moves = 0;
    this.reached = false;
    this.done = false;
    this.busy = false;
    this.undoLeft = UNDO_LIMIT;
    this.history = [];
    this.nextId = 1;
    this.grid = Array.from({ length: this.n }, () => Array(this.n).fill(null));

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.undoBtn = el('button.btn.btn--sm.btn--ghost', { onClick: () => this.undo() });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 新游戏', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, this.undoBtn, restart]));

    this.board = el('div.g2-board.fit-box', { style: { '--n': String(this.n) } });
    for (let i = 0; i < this.n * this.n; i++) {
      this.board.appendChild(el('div.g2-slot', { style: { '--r': String(Math.floor(i / this.n)), '--c': String(i % this.n) } }));
    }
    this.layer = el('div.g2-layer');
    this.board.appendChild(this.layer);
    this.tip = el('div.pill', { text: `滑动合并相同数字，目标 ${this.goal}` });
    this.root.append(this.board, this.tip);

    this.hud.set([
      { key: 'score', label: '得分', value: '0' },
      { key: 'max', label: '最大方块', value: '2' },
      { key: 'moves', label: '步数', value: '0' },
    ]);
    this.hud.show();

    this.bindInput();
    this.spawn();
    this.spawn();
    this.syncUndo();
  }

  bindInput() {
    this.on(window, 'keydown', (e) => {
      const dir = KEYMAP[e.key];
      if (!dir) return;
      e.preventDefault();
      this.move(dir);
    });
    let sx = 0, sy = 0, active = false;
    this.on(this.board, 'pointerdown', (e) => { active = true; sx = e.clientX; sy = e.clientY; });
    this.on(window, 'pointerup', (e) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    });
  }

  syncUndo() {
    this.undoBtn.textContent = `↩️ 撤销 ${this.undoLeft}`;
    this.undoBtn.disabled = !this.undoLeft || !this.history.length || this.done;
  }

  makeTile(r, c, v) {
    const t = { id: this.nextId++, r, c, v, node: el('div.g2-tile.is-new') };
    t.node.appendChild(el('span'));
    this.layer.appendChild(t.node);
    this.paint(t);
    this.later(() => t.node.classList.remove('is-new'), 200);
    this.grid[r][c] = t;
    return t;
  }

  paint(t) {
    t.node.style.setProperty('--r', String(t.r));
    t.node.style.setProperty('--c', String(t.c));
    t.node.dataset.v = String(Math.min(t.v, 8192));
    t.node.firstChild.textContent = String(t.v);
    t.node.classList.toggle('is-long', t.v >= 1024);
  }

  empties() {
    const out = [];
    for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) if (!this.grid[r][c]) out.push([r, c]);
    return out;
  }

  spawn() {
    const e = this.empties();
    if (!e.length) return;
    const [r, c] = e[Math.floor(Math.random() * e.length)];
    this.makeTile(r, c, Math.random() < 0.9 ? 2 : 4);
  }

  snapshot() {
    return { score: this.score, moves: this.moves, cells: this.grid.map((row) => row.map((t) => (t ? t.v : 0))) };
  }

  restore(s) {
    this.layer.innerHTML = '';
    this.grid = Array.from({ length: this.n }, () => Array(this.n).fill(null));
    s.cells.forEach((row, r) => row.forEach((v, c) => { if (v) this.makeTile(r, c, v); }));
    this.score = s.score;
    this.moves = s.moves;
    this.updateHud();
  }

  undo() {
    if (this.busy || this.done || !this.undoLeft || !this.history.length) return;
    this.undoLeft -= 1;
    this.restore(this.history.pop());
    this.sound.play('tap');
    this.syncUndo();
  }

  move(dir) {
    if (this.busy || this.done) return;
    const [dr, dc] = DIRS[dir];
    const n = this.n;
    const before = this.snapshot();
    let moved = false;
    let gained = 0;
    const next = Array.from({ length: n }, () => Array(n).fill(null));
    const dying = [];
    const grown = [];

    for (let line = 0; line < n; line++) {
      // 沿移动方向，从最前面的格子开始处理
      const cells = [];
      for (let k = 0; k < n; k++) {
        const idx = (dr + dc) > 0 ? n - 1 - k : k;
        cells.push(dr !== 0 ? [idx, line] : [line, idx]);
      }
      let pos = 0;
      let last = null;
      for (const [r, c] of cells) {
        const t = this.grid[r][c];
        if (!t) continue;
        if (last && last.v === t.v && !last.merged) {
          last.merged = true;
          last.v *= 2;
          gained += last.v;
          grown.push(last);
          t.r = last.r; t.c = last.c;
          dying.push(t);
          moved = true;
          continue;
        }
        const [tr, tc] = cells[pos++];
        if (tr !== r || tc !== c) moved = true;
        t.r = tr; t.c = tc;
        next[tr][tc] = t;
        last = t;
      }
    }
    if (!moved) { this.board.classList.remove('bump'); void this.board.offsetWidth; this.board.classList.add('bump'); return; }

    this.history.push(before);
    if (this.history.length > 20) this.history.shift();
    this.grid = next;
    this.moves += 1;
    this.score += gained;
    this.busy = true;
    // 先让所有方块滑到新位置（被吞掉的方块滑进目标格），再合并数值
    [...dying, ...this.grid.flat().filter(Boolean)].forEach((t) => {
      t.node.style.setProperty('--r', String(t.r));
      t.node.style.setProperty('--c', String(t.c));
    });
    dying.forEach((t) => t.node.classList.add('is-dying'));
    this.sound.play(gained ? 'merge' : 'slide');
    this.later(() => {
      dying.forEach((t) => t.node.remove());
      grown.forEach((t) => {
        t.merged = false;
        this.paint(t);
        t.node.classList.remove('is-merge');
        void t.node.offsetWidth;
        t.node.classList.add('is-merge');
      });
      this.spawn();
      this.updateHud();
      if (gained >= 64) floatText(this.board, `+${gained}`);
      this.busy = false;
      this.syncUndo();
      this.checkState();
    }, 110);
  }

  maxTile() {
    return Math.max(2, ...this.grid.flat().filter(Boolean).map((t) => t.v));
  }

  updateHud() {
    this.hud.patch('score', this.score);
    this.hud.patch('max', this.maxTile());
    this.hud.patch('moves', this.moves);
  }

  canMove() {
    if (this.empties().length) return true;
    for (let r = 0; r < this.n; r++) {
      for (let c = 0; c < this.n; c++) {
        const v = this.grid[r][c].v;
        if (c + 1 < this.n && this.grid[r][c + 1].v === v) return true;
        if (r + 1 < this.n && this.grid[r + 1][c].v === v) return true;
      }
    }
    return false;
  }

  checkState() {
    const max = this.maxTile();
    if (!this.reached && max >= this.goal) {
      this.reached = true;
      this.sound.play('win');
      toast(`🎉 合成 ${this.goal} 啦！可以继续挑战更高分`, 2600);
      this.say(`合成 ${this.goal}`);
      this.tip.textContent = '已达成目标！继续合成更大的数字吧';
    }
    if (!this.canMove()) {
      this.done = true;
      this.syncUndo();
      this.later(() => this.over(), 500);
    }
  }

  over() {
    const max = this.maxTile();
    const stars = max >= this.goal ? 3 : max >= this.goal / 4 ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      meta: { max },
      title: max >= this.goal ? `成功合成 ${this.goal}！` : '没有空位啦',
      message: `最大方块 ${max} · 共 ${this.moves} 步`,
      speak: `得分 ${this.score}，最大方块 ${max}`,
      stats: [
        { label: '最大方块', value: max },
        { label: '步数', value: this.moves },
        { label: '棋盘', value: `${this.n}×${this.n}` },
      ],
    });
  }
}
