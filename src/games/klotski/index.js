/**
 * 华容道 —— 拖动棋子，让曹操从底部出口逃走
 * 交互：按住棋子朝空位方向拖（可连续拖多格）；轻点只有一个方向能走的棋子也会自动移动
 */
import { Game, Timer } from '../../core/Game.js';
import { el, formatTime } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';
import { LAYOUTS, BEST, COLS, parseLayout, canMove, isSolved, solve, DIRS } from './solver.js';

export default class KlotskiGame extends Game {
  async mount() {
    this.layoutId = LAYOUTS[this.options.layout] ? this.options.layout : 'easy';
    this.pieces = parseLayout(LAYOUTS[this.layoutId]);
    this.best = BEST[this.layoutId];
    this.steps = 0;
    this.hints = 0;
    this.history = [];
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const hintBtn = el('button.btn.btn--sm.btn--ghost', { text: '💡 提示', onClick: () => this.hint() });
    const undoBtn = el('button.btn.btn--sm.btn--ghost', { text: '↩️ 撤销', onClick: () => this.undo() });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重来', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, hintBtn, undoBtn, restart]));

    this.board = el('div.kl-board.fit-box');
    this.grid = el('div.kl-grid');
    this.board.append(this.grid, el('div.kl-exit', { text: '出 口' }));
    this.nodes = this.pieces.map((p, i) => {
      const node = el(`div.kl-piece.kl-piece--${p.kind}`, {}, [el('span.kl-piece__name', { text: p.name })]);
      node.addEventListener('pointerdown', (e) => this.onDown(e, i));
      this.grid.appendChild(node);
      return node;
    });
    this.on(window, 'pointermove', (e) => this.onMove(e));
    this.on(window, 'pointerup', () => this.onUp());
    this.on(window, 'pointercancel', () => { this.drag = null; });

    this.tip = el('div.pill', { text: '按住棋子往空位拖，帮曹操（红色大块）从下面出口逃走' });
    this.root.append(this.board, this.tip);

    this.hud.set([
      { key: 'steps', label: '步数', value: '0' },
      { key: 'best', label: '最少步数', value: String(this.best) },
      { key: 'time', label: '用时', value: '00:00' },
    ]);
    this.hud.show();
    this.render();
  }

  start() {
    this.timer.startCountUp((ms) => this.hud.patch('time', formatTime(ms)));
  }

  render() {
    this.pieces.forEach((p, i) => {
      const n = this.nodes[i];
      n.style.setProperty('--r', String(p.r));
      n.style.setProperty('--c', String(p.c));
      n.style.setProperty('--w', String(p.w));
      n.style.setProperty('--h', String(p.h));
    });
    this.hud.patch('steps', this.steps);
  }

  tryMove(i, dr, dc) {
    if (this.done || !canMove(this.pieces, i, dr, dc)) return false;
    this.history.push({ i, dr, dc });
    const p = this.pieces[i];
    this.pieces[i] = { ...p, r: p.r + dr, c: p.c + dc };
    this.steps += 1;
    this.sound.play('slide');
    this.render();
    if (isSolved(this.pieces)) this.win();
    return true;
  }

  onDown(e, i) {
    if (this.done) return;
    e.preventDefault();
    this.drag = { i, x: e.clientX, y: e.clientY, moved: false };
    this.nodes[i].classList.add('is-drag');
  }

  onMove(e) {
    const d = this.drag;
    if (!d) return;
    const cell = this.grid.clientWidth / COLS;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const th = cell * 0.42;
    if (Math.abs(dx) >= th && Math.abs(dx) >= Math.abs(dy)) {
      const s = Math.sign(dx);
      if (this.tryMove(d.i, 0, s)) { d.x += s * cell; d.moved = true; }
      else { d.x = e.clientX - s * th * 0.5; d.blocked = true; }
    } else if (Math.abs(dy) >= th) {
      const s = Math.sign(dy);
      if (this.tryMove(d.i, s, 0)) { d.y += s * cell; d.moved = true; }
      else { d.y = e.clientY - s * th * 0.5; d.blocked = true; }
    }
  }

  onUp() {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.nodes[d.i]?.classList.remove('is-drag');
    if (d.moved || this.done) return;
    // 轻点：只有一个方向可走时自动走
    const opts = DIRS.filter(([dr, dc]) => canMove(this.pieces, d.i, dr, dc));
    if (opts.length === 1) this.tryMove(d.i, opts[0][0], opts[0][1]);
    else if (!opts.length || d.blocked) this.bump(d.i);
  }

  bump(i) {
    const n = this.nodes[i];
    n.classList.remove('is-bump');
    void n.offsetWidth;
    n.classList.add('is-bump');
    this.sound.play('tap');
  }

  undo() {
    if (this.done || !this.history.length) return;
    const { i, dr, dc } = this.history.pop();
    const p = this.pieces[i];
    this.pieces[i] = { ...p, r: p.r - dr, c: p.c - dc };
    this.steps = Math.max(0, this.steps - 1);
    this.sound.play('tap');
    this.render();
  }

  hint() {
    if (this.done) return;
    this.tip.textContent = '电脑思考中…';
    // 让提示文字先渲染出来，再开始搜索
    this.later(() => {
      const res = solve(this.pieces);
      if (!res || !res.first) { toast('这个局面走不通了，试试撤销或重来'); return; }
      const i = this.pieces.findIndex((p) => p.id === res.first.id);
      this.hints += 1;
      const node = this.nodes[i];
      node.classList.add('is-hint');
      this.later(() => node.classList.remove('is-hint'), 700);
      this.tryMove(i, res.first.dr, res.first.dc);
      this.tip.textContent = `离成功还有 ${Math.max(0, res.steps - 1)} 步（已用提示 ${this.hints} 次）`;
    }, 30);
  }

  win() {
    this.done = true;
    this.timer.stop();
    const cao = this.nodes[this.pieces.findIndex((p) => p.kind === 'C')];
    cao.classList.add('is-escape');
    this.sound.play('win');
    const ratio = this.steps / this.best;
    let stars = ratio <= 1.3 ? 3 : ratio <= 2 ? 2 : 1;
    stars = Math.max(1, stars - Math.min(2, Math.ceil(this.hints / 5)));
    this.later(() => this.finish({
      score: this.steps,
      mode: 'min',
      stars,
      title: '曹操成功脱身！',
      message: `用了 ${this.steps} 步 · 最少 ${this.best} 步${this.hints ? ` · 提示 ${this.hints} 次` : ''}`,
      speak: `成功，用了 ${this.steps} 步`,
      stats: [
        { label: '步数', value: this.steps },
        { label: '用时', value: formatTime(this.timer.ms || 0) },
        { label: '提示', value: this.hints },
      ],
    }), 600);
  }
}
