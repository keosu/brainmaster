/**
 * 扫雷 —— 第一下必定安全（以第一下为中心的 3×3 不放雷）
 * 手机：轻点翻开，长按插旗，或切换到 🚩 模式；电脑：左键翻开，右键插旗
 * 点已翻开的数字，若周围旗子数正好相等，会自动翻开其余邻格
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const LONG_PRESS = 380;

export default class MinesGame extends Game {
  async mount() {
    this.R = Number(this.options.rows || 8);
    this.C = Number(this.options.cols || 8);
    this.M = Number(this.options.mines || 8);
    this.mine = null;            // 首次点击后才布雷
    this.open = new Array(this.R * this.C).fill(false);
    this.flag = new Array(this.R * this.C).fill(false);
    this.flagMode = false;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.modeBtn = el('button.btn.btn--sm.mn-mode', { onClick: () => this.toggleMode() });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, this.modeBtn, restart]));

    this.board = el('div.mn-board.fit-box', { style: { '--cols': String(this.C), '--rows': String(this.R) } });
    this.cells = Array.from({ length: this.R * this.C }, (_, i) => {
      const c = el('button.mn-cell');
      this.bindCell(c, i);
      this.board.appendChild(c);
      return c;
    });
    this.tip = el('div.pill', { text: '轻点翻开 · 长按插旗 🚩 · 第一下一定安全' });
    this.root.append(this.board, this.tip);

    this.hud.set([
      { key: 'left', label: '剩余雷', value: String(this.M) },
      { key: 'time', label: '用时', value: '0s' },
      { key: 'open', label: '已翻开', value: '0' },
    ]);
    this.hud.show();
    this.syncMode();
  }

  toggleMode() {
    this.flagMode = !this.flagMode;
    this.sound.play('tap');
    this.syncMode();
  }

  syncMode() {
    this.modeBtn.textContent = this.flagMode ? '🚩 插旗模式' : '⛏️ 翻开模式';
    this.modeBtn.classList.toggle('is-flag', this.flagMode);
  }

  bindCell(c, i) {
    let timer = 0;
    let long = false;
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    c.addEventListener('pointerdown', (e) => {
      if (e.button === 2) { e.preventDefault(); this.toggleFlag(i); return; }
      long = false;
      clearTimeout(timer);
      timer = setTimeout(() => { long = true; this.toggleFlag(i); }, LONG_PRESS);
    });
    const cancel = () => clearTimeout(timer);
    c.addEventListener('pointerleave', cancel);
    c.addEventListener('pointercancel', cancel);
    c.addEventListener('pointerup', (e) => {
      if (e.button === 2) return;
      clearTimeout(timer);
      if (long) return;
      if (this.flagMode && !this.open[i]) this.toggleFlag(i);
      else this.reveal(i);
    });
  }

  neighbors(i) {
    const r = Math.floor(i / this.C), c = i % this.C;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < this.R && cc >= 0 && cc < this.C) out.push(rr * this.C + cc);
      }
    }
    return out;
  }

  layMines(safe) {
    const banned = new Set([safe, ...this.neighbors(safe)]);
    const pool = shuffle(Array.from({ length: this.R * this.C }, (_, i) => i).filter((i) => !banned.has(i)));
    this.mine = new Array(this.R * this.C).fill(false);
    pool.slice(0, this.M).forEach((i) => { this.mine[i] = true; });
    this.count = this.mine.map((_, i) => this.neighbors(i).filter((j) => this.mine[j]).length);
    this.timer.startCountUp((ms) => this.hud.patch('time', `${Math.floor(ms / 1000)}s`));
  }

  toggleFlag(i) {
    if (this.done || this.destroyed || this.open[i]) return;
    this.flag[i] = !this.flag[i];
    this.sound.play(this.flag[i] ? 'place' : 'tap');
    this.paint(i);
    this.hud.patch('left', this.M - this.flag.filter(Boolean).length);
  }

  reveal(i) {
    if (this.done || this.flag[i]) return;
    if (!this.mine) this.layMines(i);
    if (this.open[i]) { this.chord(i); return; }
    if (this.mine[i]) { this.boom(i); return; }
    const stack = [i];
    let opened = 0;
    while (stack.length) {
      const k = stack.pop();
      if (this.open[k] || this.flag[k]) continue;
      this.open[k] = true;
      opened += 1;
      this.paint(k);
      if (this.count[k] === 0) this.neighbors(k).forEach((j) => { if (!this.open[j] && !this.mine[j]) stack.push(j); });
    }
    if (opened) this.sound.play(opened > 4 ? 'flip' : 'tap');
    this.afterOpen();
  }

  chord(i) {
    const nb = this.neighbors(i);
    if (!this.count[i] || nb.filter((j) => this.flag[j]).length !== this.count[i]) return;
    for (const j of nb) {
      if (this.flag[j] || this.open[j]) continue;
      if (this.mine[j]) { this.boom(j); return; }
      this.reveal(j);
      if (this.done) return;
    }
  }

  paint(i) {
    const c = this.cells[i];
    c.classList.toggle('is-open', this.open[i]);
    c.classList.toggle('is-flag', this.flag[i] && !this.open[i]);
    if (this.open[i]) {
      const n = this.count[i];
      c.textContent = n ? String(n) : '';
      c.dataset.n = String(n);
    } else {
      c.textContent = this.flag[i] ? '🚩' : '';
    }
  }

  afterOpen() {
    const opened = this.open.filter(Boolean).length;
    this.hud.patch('open', opened);
    if (opened === this.R * this.C - this.M) this.win();
  }

  boom(i) {
    this.done = true;
    this.timer.stop();
    this.cells[i].classList.add('is-boom');
    this.sound.play('lose');
    this.board.classList.add('shake');
    this.mine.forEach((m, k) => {
      if (m && !this.flag[k]) { this.cells[k].textContent = '💣'; this.cells[k].classList.add('is-mine'); }
      if (!m && this.flag[k]) this.cells[k].classList.add('is-wrongflag');
    });
    this.tip.textContent = '踩到地雷啦！数字是周围 8 格里雷的数量，再试一次吧';
    const opened = this.open.filter(Boolean).length;
    this.later(() => this.finish({
      score: Math.round((this.timer.ms || 0) / 1000),
      noRecord: true,
      mode: 'min',
      stars: 0,
      emoji: '💥',
      title: '踩到雷了',
      message: `已经翻开 ${opened} / ${this.R * this.C - this.M} 个安全格`,
      showScore: false,
      speak: '踩到雷了，再来一次吧',
      power: 3,
      stats: [
        { label: '安全格进度', value: `${Math.round((opened / (this.R * this.C - this.M)) * 100)}%` },
        { label: '用时', value: `${Math.round((this.timer.ms || 0) / 1000)}s` },
      ],
    }), 900);
  }

  win() {
    this.done = true;
    this.timer.stop();
    this.mine.forEach((m, k) => { if (m) { this.flag[k] = true; this.paint(k); } });
    this.hud.patch('left', 0);
    this.board.classList.add('is-win');
    const sec = Math.max(1, Math.round((this.timer.ms || 0) / 1000));
    const par = { 8: 50, 10: 110, 12: 200 }[this.R] || 120;
    const stars = sec <= par ? 3 : sec <= par * 2 ? 2 : 1;
    this.later(() => this.finish({
      score: sec,
      mode: 'min',
      stars,
      title: '排雷成功！',
      message: `${this.R}×${this.C} · ${this.M} 颗雷 · 用时 ${sec} 秒`,
      speak: `排雷成功，用时 ${sec} 秒`,
      stats: [
        { label: '用时', value: `${sec}s` },
        { label: '地雷', value: this.M },
        { label: '棋盘', value: `${this.R}×${this.C}` },
      ],
    }), 500);
  }
}
