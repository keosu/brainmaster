/**
 * 舒尔特方格 —— 按 1 → N² 的顺序把数字点完，练的是视觉广度与专注力
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

export default class SchulteGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 4);
    this.total = this.n * this.n;
    this.next = 1;
    this.wrong = 0;
    this.done = false;
    this.started = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.board = el('div.sc-board.fit-box');
    this.board.style.setProperty('--cols', String(this.n));
    this.root.appendChild(this.board);

    this.tip = el('div.pill', { text: `从 1 开始，按顺序点到 ${this.total}` });
    this.root.appendChild(this.tip);

    this.hud.set([
      { key: 'next', label: '下一个', value: '1' },
      { key: 'time', label: '用时', value: '0.0s' },
      { key: 'wrong', label: '点错', value: '0' },
    ]);
    this.hud.show();

    this.deal();
  }

  deal() {
    const nums = shuffle(Array.from({ length: this.total }, (_, i) => i + 1));
    this.board.innerHTML = '';
    nums.forEach((num) => {
      const cell = el('button.sc-cell', {
        text: String(num),
        onClick: () => this.tap(num, cell),
      });
      cell.classList.add('pop-in');
      cell.style.animationDelay = `${(num % 7) * 22}ms`;
      this.board.appendChild(cell);
    });
  }

  tap(num, cell) {
    if (this.done) return;
    if (!this.started) {
      this.started = true;
      this.timer.startCountUp((ms) => this.hud.patch('time', `${(ms / 1000).toFixed(1)}s`));
    }
    if (num === this.next) {
      cell.classList.add('is-done');
      cell.disabled = true;
      this.next += 1;
      this.sound.tone(420 + Math.min(12, this.next) * 45, 0.09, 'sine', 0.14);
      this.hud.patch('next', this.next > this.total ? '✓' : String(this.next));
      if (this.next > this.total) this.later(() => this.over(), 260);
    } else {
      this.wrong += 1;
      this.hud.patch('wrong', this.wrong);
      this.sound.play('bad');
      cell.classList.remove('shake');
      void cell.offsetWidth; // 重启动画
      cell.classList.add('shake');
      this.later(() => cell.classList.remove('shake'), 340);
    }
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer.stop();
    const sec = (this.timer.ms || 0) / 1000;
    // 参考用时：每格约 1.1 秒（含识别成本）
    const par = this.total * 1.1;
    const stars = sec <= par * 0.7 ? 3 : sec <= par ? 2 : 1;
    this.tip.textContent = `完成！用时 ${sec.toFixed(1)} 秒`;
    this.finish({
      score: Number(sec.toFixed(1)),
      mode: 'min',
      stars,
      title: sec <= par * 0.7 ? '眼疾手快！' : sec <= par ? '稳扎稳打' : '完成啦！',
      message: `${this.n}×${this.n} 方格 · 用时 ${sec.toFixed(1)} 秒 · 点错 ${this.wrong} 次`,
      speak: `用时 ${sec.toFixed(1)} 秒`,
      stats: [
        { label: '用时', value: `${sec.toFixed(1)}s` },
        { label: '点错', value: this.wrong },
        { label: '格数', value: `${this.n}×${this.n}` },
      ],
    });
  }

  destroy() { this.timer.stop(); }
}
