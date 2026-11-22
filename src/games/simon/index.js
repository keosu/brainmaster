/**
 * 声光序列（Simon）—— 按钮依次亮起并发出音符，按相同顺序弹回去，每关加长一个
 */
import { Game } from '../../core/Game.js';
import { el, randInt } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const PADS = [
  { color: '#ff5d7a', glow: '#ffb3c1', freq: 261.63, name: '哆' },
  { color: '#ffb02e', glow: '#ffe2a8', freq: 329.63, name: '咪' },
  { color: '#4ade80', glow: '#b9f5c9', freq: 392.0, name: '嗦' },
  { color: '#38bdf8', glow: '#b3e6ff', freq: 523.25, name: '高哆' },
  { color: '#a78bfa', glow: '#ddd0ff', freq: 440.0, name: '啦' },
  { color: '#f472b6', glow: '#ffc4e1', freq: 587.33, name: '高来' },
];

export default class SimonGame extends Game {
  async mount() {
    this.padCount = Number(this.options.pads || 4);
    this.speed = Number(this.options.speed || 560);
    this.maxLives = Number(this.options.lives || 1);
    this.lives = this.maxLives;
    this.seq = [];
    this.pos = 0;
    this.best = 0;
    this.phase = 'idle';

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.board = el('div.sm-board.fit-box', { style: { '--cols': this.padCount === 6 ? '3' : '2' } });
    this.board.classList.toggle('is-six', this.padCount === 6);
    this.pads = PADS.slice(0, this.padCount).map((p, i) => {
      const b = el('button.sm-pad', { style: { '--c': p.color, '--g': p.glow }, 'aria-label': p.name });
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.press(i); });
      this.board.appendChild(b);
      return b;
    });
    this.center = el('div.sm-center', {}, [el('b', { text: '0' }), el('span', { text: '准备' })]);
    this.board.appendChild(this.center);
    this.tip = el('div.pill', { text: '看清楚、听清楚亮起的顺序' });
    this.root.append(this.board, this.tip);

    this.on(window, 'keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= this.padCount) this.press(n - 1);
    });

    this.hud.set([
      { key: 'len', label: '序列长度', value: '0' },
      { key: 'best', label: '最长记住', value: '0' },
      ...(this.maxLives > 1 ? [{ key: 'lives', label: '机会', value: this.livesText() }] : []),
    ]);
    this.hud.show();
  }

  livesText() { return '❤️'.repeat(this.lives) + '🤍'.repeat(this.maxLives - this.lives); }

  start() { this.later(() => this.extend(), 700); }

  setCenter(num, text) {
    this.center.children[0].textContent = String(num);
    this.center.children[1].textContent = text;
  }

  extend() {
    this.seq.push(randInt(0, this.padCount - 1));
    this.hud.patch('len', this.seq.length);
    this.playback();
  }

  playback() {
    this.phase = 'show';
    this.board.classList.add('is-show');
    this.setCenter(this.seq.length, '看');
    this.tip.textContent = `记住这 ${this.seq.length} 个音`;
    // 序列越长，播放越快一点（但不低于下限）
    const step = Math.max(260, this.speed - this.seq.length * 12);
    this.seq.forEach((p, i) => this.later(() => this.flash(p, step * 0.62), 400 + i * step));
    this.later(() => {
      this.phase = 'input';
      this.pos = 0;
      this.board.classList.remove('is-show');
      this.setCenter(this.seq.length, '轮到你');
      this.tip.textContent = '按同样的顺序弹出来';
    }, 400 + this.seq.length * step);
  }

  flash(i, ms = 300) {
    const pad = this.pads[i];
    pad.classList.add('is-lit');
    this.sound.tone(PADS[i].freq, Math.max(0.18, ms / 1000), 'triangle', 0.22);
    this.later(() => pad.classList.remove('is-lit'), ms);
  }

  press(i) {
    if (this.phase !== 'input') return;
    this.flash(i, 220);
    if (i === this.seq[this.pos]) {
      this.pos += 1;
      if (this.pos === this.seq.length) {
        this.phase = 'idle';
        this.best = Math.max(this.best, this.seq.length);
        this.hud.patch('best', this.best);
        this.setCenter(this.seq.length, '✓');
        this.tip.textContent = this.seq.length % 5 === 0 ? `太厉害了，已经 ${this.seq.length} 个了！` : '对啦！再加一个';
        this.later(() => this.sound.play('good'), 200);
        this.later(() => this.extend(), 950);
      }
      return;
    }
    // 弹错
    this.phase = 'idle';
    this.lives -= 1;
    this.sound.play('bad');
    this.board.classList.add('shake');
    this.later(() => this.board.classList.remove('shake'), 340);
    const right = this.seq[this.pos];
    this.later(() => this.pads[right].classList.add('is-hint'), 300);
    this.later(() => this.pads[right].classList.remove('is-hint'), 1100);
    if (this.maxLives > 1) this.hud.patch('lives', this.livesText(), this.lives <= 1);
    if (this.lives > 0) {
      this.setCenter(this.seq.length, '再听一遍');
      this.tip.textContent = '弹错了，没关系，再听一遍';
      this.later(() => this.playback(), 1400);
    } else {
      this.setCenter(this.best, '结束');
      this.tip.textContent = '序列记忆结束';
      this.later(() => this.over(), 1200);
    }
  }

  over() {
    const best = this.best;
    const stars = best >= 10 ? 3 : best >= 6 ? 2 : 1;
    this.finish({
      score: best,
      mode: 'max',
      stars,
      title: best >= 10 ? '小小音乐家！' : '序列挑战结束',
      message: `最长记住了 ${best} 个音`,
      speak: `最长记住了 ${best} 个音`,
      stats: [
        { label: '最长序列', value: best },
        { label: '按键数', value: this.padCount },
        { label: '难度', value: this.meta.levels.find((l) => l.id === this.options.level)?.name || '-' },
      ],
    });
  }
}
