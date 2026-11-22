/**
 * 数字记忆 —— 数字闪一下就消失，按从小到大顺序点出来
 */
import { Game } from '../../core/Game.js';
import { el, shuffle, pick } from '../../core/utils.js';
import { levelBar, controlRow, dots } from '../../ui/widgets.js';

export default class NumbersGame extends Game {
  async mount() {
    this.startN = Number(this.options.start || 4);
    this.showMs = Number(this.options.show || 800);
    this.round = 0;
    this.cleared = 0;
    this.phase = 'idle'; // idle | memorize | input | over
    this.expected = 1;
    this.lives = 3;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.tip = el('div.pill', { text: '记住数字的位置，然后按 1、2、3… 的顺序点出来' });
    this.grid = el('div.num-grid.fit-box');
    this.dots = el('div');
    this.root.append(this.tip, this.dots, this.grid);

    this.hud.set([
      { key: 'round', label: '关卡', value: '1' },
      { key: 'next', label: '下一个', value: '1' },
      { key: 'cleared', label: '通过', value: '0' },
      { key: 'lives', label: '生命', value: '❤️❤️❤️' },
    ]);
    this.hud.show();

    this.later(() => this.nextRound(), 400);
  }

  nextRound() {
    if (this.phase === 'over') return;
    this.round += 1;
    this.expected = 1;
    const n = this.startN + this.round - 1;
    this.n = n;
    const extra = Math.min(1200, n * 180); // 数字越多，给的记忆时间越长

    // 布点：尽量排成接近正方形的格子，避免只有一行、显得空荡
    const total = (() => {
      const c = Math.max(2, Math.ceil(Math.sqrt(Math.max(n, 2))));
      return c * Math.ceil(n / c);
    })();
    const cols = Math.max(2, Math.round(Math.sqrt(total)));
    const spots = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, n);

    this.grid.innerHTML = '';
    this.grid.style.setProperty('--cols', String(cols));
    this.grid.style.setProperty('--rows', String(Math.ceil(total / cols)));
    this.cells = [];
    for (let i = 0; i < total; i++) {
      const cell = el('button.num-cell', { onClick: () => this.tap(cell) });
      const hasNum = spots.includes(i);
      cell.dataset.num = hasNum ? String(spots.indexOf(i) + 1) : '';
      this.grid.appendChild(cell);
      this.cells.push(cell);
    }

    this.phase = 'memorize';
    this.cells.forEach((c) => { if (c.dataset.num) { c.textContent = c.dataset.num; c.classList.add('is-show'); } });
    this.tip.textContent = `记住这 ${n} 个数字的位置（${Math.round((this.showMs + extra) / 1000 * 10) / 10} 秒）…`;
    this.say(`记住 ${n} 个数字`);
    this.hud.patch('round', this.round);
    this.hud.patch('next', 1);
    this.dots.innerHTML = '';
    this.dots.appendChild(dots(n, 0));

    this.later(() => {
      this.phase = 'input';
      this.cells.forEach((c) => { c.textContent = ''; c.classList.remove('is-show'); });
      this.tip.textContent = '现在按 1、2、3… 的顺序点出来！';
    }, this.showMs + extra);
  }

  tap(cell) {
    if (this.phase !== 'input') return;
    const v = Number(cell.dataset.num);
    if (!v) { this.sound.play('bad'); return; }
    if (cell.classList.contains('is-done')) return;

    if (v === this.expected) {
      cell.classList.add('is-done');
      cell.textContent = String(v);
      this.sound.play('good');
      this.expected += 1;
      this.hud.patch('next', this.expected);
      this.dots.innerHTML = '';
      this.dots.appendChild(dots(this.n, this.expected - 1));
      if (this.expected > this.n) {
        this.cleared += 1;
        this.hud.patch('cleared', this.cleared);
        this.sound.play('great');
        this.tip.textContent = '太棒了！下一关数字更多哦';
        this.phase = 'idle';
        this.later(() => this.nextRound(), 900);
      }
    } else {
      this.wrong();
    }
  }

  wrong() {
    this.lives -= 1;
    this.hud.patch('lives', '❤️'.repeat(this.lives) + '🤍'.repeat(3 - this.lives), this.lives <= 1);
    this.cells.forEach((c) => {
      if (c.dataset.num && !c.classList.contains('is-done')) { c.textContent = c.dataset.num; c.classList.add('is-reveal'); }
    });
    if (this.lives > 0) {
      // 还有生命：看一眼答案，同样数量重来一次
      this.phase = 'idle';
      this.sound.play('bad');
      this.tip.textContent = `点错了，还剩 ${this.lives} 次机会，同样 ${this.n} 个数字再来一次`;
      this.round -= 1;
      this.later(() => this.nextRound(), 1600);
      return;
    }
    this.phase = 'over';
    this.sound.play('lose');
    const stars = this.cleared >= 8 ? 3 : this.cleared >= 5 ? 2 : this.cleared >= 2 ? 1 : 1;
    this.finish({
      score: this.cleared,
      mode: 'max',
      stars: Math.max(1, stars),
      title: '记忆挑战结束',
      message: `通过了 ${this.cleared} 关，最多一次记住 ${this.startN + this.cleared - 1} 个数字`,
      speak: `通过了 ${this.cleared} 关`,
      stats: [
        { label: '通过关卡', value: this.cleared },
        { label: '最高数字量', value: Math.max(0, this.startN + this.cleared - 1) },
        { label: '关卡', value: this.round },
      ],
    });
  }

  destroy() {}
}
