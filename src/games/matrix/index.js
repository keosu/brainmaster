/**
 * 记忆矩阵 —— 一组格子亮起后熄灭，凭记忆全部点出来
 * 成功：下一关多亮一格（格子盘随之变大）；点错：本关失败、扣一条命、亮格减一
 */
import { Game } from '../../core/Game.js';
import { el, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const MAX_N = 7;
const LIVES = 3;

export default class MatrixGame extends Game {
  async mount() {
    this.n0 = Number(this.options.n || 3);
    this.k0 = Number(this.options.k || 3);
    this.n = this.n0;
    this.k = this.k0;
    this.lives = LIVES;
    this.round = 0;
    this.best = 0;
    this.perfect = 0;
    this.cleared = 0;
    this.phase = 'idle';

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.board = el('div.mx-board.fit-box');
    this.tip = el('div.pill', { text: '看清楚哪些格子会亮起来' });
    this.root.append(this.board, this.tip);

    this.hud.set([
      { key: 'round', label: '关卡', value: '1' },
      { key: 'k', label: '亮格', value: String(this.k) },
      { key: 'lives', label: '生命', value: this.livesText() },
    ]);
    this.hud.show();
  }

  livesText() { return '❤️'.repeat(this.lives) + '🤍'.repeat(LIVES - this.lives); }

  start() { this.later(() => this.nextRound(), 500); }

  nextRound() {
    if (this.phase === 'over') return;
    this.round += 1;
    // 亮格超过一半时扩大棋盘，保证不会一眼铺满
    this.n = this.n0;
    while (this.k > Math.floor(this.n * this.n * 0.45) && this.n < MAX_N) this.n += 1;
    const total = this.n * this.n;
    this.targets = new Set(shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, this.k));
    this.found = 0;
    this.miss = false;

    this.board.innerHTML = '';
    this.board.style.setProperty('--n', String(this.n));
    this.cells = Array.from({ length: total }, (_, i) => {
      const c = el('button.mx-cell', { 'aria-label': `格子 ${i + 1}` });
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(i); });
      this.board.appendChild(c);
      return c;
    });

    this.hud.patch('round', this.round);
    this.hud.patch('k', this.k);
    this.phase = 'show';
    this.tip.textContent = `记住亮起的 ${this.k} 个格子`;
    this.later(() => {
      this.targets.forEach((i) => this.cells[i].classList.add('is-lit'));
      this.sound.play('flip');
    }, 350);
    const showMs = 900 + this.k * 110;
    this.later(() => {
      this.targets.forEach((i) => this.cells[i].classList.remove('is-lit'));
      this.phase = 'input';
      this.tip.textContent = `把刚才亮起的 ${this.k} 个格子点出来`;
    }, 350 + showMs);
  }

  tap(i) {
    if (this.phase !== 'input') return;
    const cell = this.cells[i];
    if (cell.classList.contains('is-hit') || cell.classList.contains('is-miss')) return;
    if (this.targets.has(i)) {
      cell.classList.add('is-hit');
      this.found += 1;
      this.sound.tone(440 + this.found * 60, 0.1, 'sine', 0.14);
      if (this.found === this.k) this.success();
    } else {
      cell.classList.add('is-miss');
      this.fail();
    }
  }

  success() {
    this.phase = 'idle';
    this.best = Math.max(this.best, this.k);
    this.perfect += 1;
    this.cleared += 1;
    this.sound.play('great');
    this.tip.textContent = this.perfect % 3 === 0 ? '太厉害了！连续过关！' : '全对！下一关多一个格子';
    this.k += 1;
    this.later(() => this.nextRound(), 800);
  }

  fail() {
    this.phase = 'idle';
    this.perfect = 0;
    this.lives -= 1;
    this.hud.patch('lives', this.livesText(), this.lives <= 1);
    this.sound.play('bad');
    this.targets.forEach((t) => { if (!this.cells[t].classList.contains('is-hit')) this.cells[t].classList.add('is-reveal'); });
    if (this.lives <= 0) {
      this.phase = 'over';
      this.tip.textContent = '生命用完啦';
      this.later(() => this.over(), 700);
      return;
    }
    this.tip.textContent = '点错了，看看正确答案，再来一次';
    this.k = Math.max(this.k0, this.k - 1);
    this.later(() => this.nextRound(), 1300);
  }

  over() {
    const best = this.best;
    const gain = best - this.k0;
    const stars = best === 0 ? 0 : gain >= 5 ? 3 : gain >= 2 ? 2 : 1;
    this.finish({
      score: best,
      mode: 'max',
      stars: Math.max(1, stars),
      title: gain >= 5 ? '超强记忆！' : '记忆挑战结束',
      message: best ? `最多一次记住了 ${best} 个格子` : '没关系，多练几次就能记住更多',
      speak: `最多记住 ${best} 个格子`,
      stats: [
        { label: '最多记住', value: `${best} 块` },
        { label: '成功关卡', value: this.cleared },
        { label: '棋盘', value: `${this.n}×${this.n}` },
      ],
    });
  }
}
