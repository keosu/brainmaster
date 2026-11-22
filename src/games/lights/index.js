/**
 * 点亮全屏（Lights Out 变体）—— 点一盏灯会切换它和上下左右四盏灯，目标是全部点亮
 * 出题：从全亮状态随机按若干下，因此必然有解；按键可交换且按两次抵消，
 * 所以"出题按过的集合 ⊕ 玩家按过的集合"就是剩余解，提示直接取其中一格
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle, formatTime } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

export default class LightsGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 3);
    this.presses = Number(this.options.presses || 3);
    this.moves = 0;
    this.hints = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const hintBtn = el('button.btn.btn--sm.btn--ghost', { text: '💡 提示', onClick: () => this.hint() });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 换一题', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, hintBtn, restart]));

    this.board = el('div.lt-board.fit-box', { style: { '--n': String(this.n) } });
    this.tip = el('div.pill', { text: '点一下会切换这盏灯和上下左右的灯' });
    this.root.append(this.board, this.tip);

    this.generate();
    this.cells = this.on_.map((_, i) => {
      const b = el('button.lt-cell', { 'aria-label': `灯 ${i + 1}` }, [el('span.lt-bulb')]);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.press(i); });
      this.board.appendChild(b);
      return b;
    });

    this.hud.set([
      { key: 'moves', label: '步数', value: '0' },
      { key: 'par', label: '参考步数', value: String(this.solution.size) },
      { key: 'lit', label: '已点亮', value: '' },
    ]);
    this.hud.show();
    this.render();
  }

  start() { this.timer.startCountUp(); }

  neighbors(i) {
    const n = this.n;
    const r = Math.floor(i / n), c = i % n;
    const out = [i];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  generate() {
    const total = this.n * this.n;
    do {
      this.on_ = new Array(total).fill(true);
      this.solution = new Set(shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, this.presses));
      this.solution.forEach((i) => this.neighbors(i).forEach((j) => { this.on_[j] = !this.on_[j]; }));
    } while (this.on_.every(Boolean));
  }

  press(i) {
    if (this.done) return;
    this.neighbors(i).forEach((j) => { this.on_[j] = !this.on_[j]; });
    if (this.solution.has(i)) this.solution.delete(i); else this.solution.add(i);
    this.moves += 1;
    this.cells[i].classList.remove('is-press');
    void this.cells[i].offsetWidth;
    this.cells[i].classList.add('is-press');
    this.cells.forEach((c) => c.classList.remove('is-hint'));
    this.sound.tone(this.on_[i] ? 660 : 440, 0.08, 'sine', 0.14);
    this.render();
    if (this.on_.every(Boolean)) this.win();
  }

  render() {
    this.cells.forEach((c, i) => c.classList.toggle('is-on', this.on_[i]));
    const lit = this.on_.filter(Boolean).length;
    this.hud.patch('moves', this.moves);
    this.hud.patch('lit', `${lit}/${this.on_.length}`);
  }

  hint() {
    if (this.done || !this.solution.size) return;
    const i = Array.from(this.solution)[0];
    this.hints += 1;
    this.cells.forEach((c) => c.classList.remove('is-hint'));
    this.cells[i].classList.add('is-hint');
    this.sound.play('flip');
    this.tip.textContent = `试试点闪烁的那盏灯（还差 ${this.solution.size} 下就能全亮）`;
  }

  win() {
    this.done = true;
    this.timer.stop();
    this.board.classList.add('is-win');
    this.sound.play('win');
    const par = Math.max(1, this.presses);
    let stars = this.moves <= par ? 3 : this.moves <= par * 2 ? 2 : 1;
    if (this.hints) stars = Math.max(1, stars - 1);
    this.later(() => this.finish({
      score: this.moves,
      mode: 'min',
      stars,
      title: '全部点亮啦！',
      message: `用了 ${this.moves} 步 · 参考 ${par} 步`,
      speak: `全部点亮，用了 ${this.moves} 步`,
      stats: [
        { label: '步数', value: this.moves },
        { label: '用时', value: formatTime(this.timer.ms || 0) },
        { label: '提示', value: this.hints },
      ],
    }), 500);
  }
}
