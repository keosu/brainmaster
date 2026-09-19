/**
 * 心算冲刺 —— 限时答题，答错扣时间，连击加分
 */
import { Game, Timer } from '../../core/Game.js';
import { el, randInt, pick, shuffle, clamp } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

export default class MathGame extends Game {
  async mount() {
    this.ops = this.options.ops || ['+', '-'];
    this.max = Number(this.options.max || 20);
    this.duration = Number(this.options.time || 60000);
    this.correct = 0;
    this.wrong = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.root.appendChild(controlRow([lv]));

    this.stage = el('div.m-stage.fit-box');
    this.qNode = el('div.math-q');
    this.optNode = el('div.math-opts');
    this.stage.append(this.qNode, this.optNode);
    this.root.appendChild(this.stage);

    this.hud.set([
      { key: 'time', label: '剩余', value: '60s' },
      { key: 'right', label: '答对', value: '0' },
      { key: 'combo', label: '连击', value: 'x0' },
    ]);
    this.hud.show();

    this.next();
  }

  makeQuestion() {
    const op = pick(this.ops);
    let a, b, ans;
    if (op === '+') {
      a = randInt(1, this.max - 1); b = randInt(1, this.max - a); ans = a + b;
    } else if (op === '-') {
      a = randInt(2, this.max); b = randInt(1, a - 1); ans = a - b;
    } else {
      const hi = clamp(Math.round(this.max / 6), 5, 12);
      a = randInt(2, hi); b = randInt(2, 9); ans = a * b;
      // 偶尔交换，避免出现规律
      if (Math.random() < 0.5) [a, b] = [b, a];
    }
    return { a, b, op, ans };
  }

  next() {
    if (this.done) return;
    const q = this.makeQuestion();
    this.current = q;
    const text = `${q.a} ${q.op === '×' ? '×' : q.op} ${q.b} = ?`;
    this.qNode.textContent = text;
    this.qNode.classList.remove('pop-in');
    void this.qNode.offsetWidth;
    this.qNode.classList.add('pop-in');
    this.say(`${q.a} ${q.op === '+' ? '加' : q.op === '-' ? '减' : '乘以'} ${q.b} 等于几`);

    const opts = new Set([q.ans]);
    let guard = 0;
    while (opts.size < 4 && guard++ < 60) {
      const delta = pick([-10, -6, -3, -2, -1, 1, 2, 3, 6, 10]);
      const v = q.ans + delta;
      if (v >= 0 && !opts.has(v)) opts.add(v);
    }
    while (opts.size < 4) opts.add(q.ans + opts.size * 7);
    const list = shuffle(Array.from(opts));

    this.optNode.innerHTML = '';
    list.forEach((v) => {
      const b = el('button.math-opt', { text: String(v), onClick: () => this.answer(v, b) });
      this.optNode.appendChild(b);
    });
  }

  answer(v, btn) {
    if (this.done) return;
    const q = this.current;
    if (v === q.ans) {
      this.correct += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      btn.classList.add('is-right');
      this.sound.play(this.combo >= 5 ? 'great' : 'good');
      this.hud.patch('right', this.correct);
      this.hud.patch('combo', `x${this.combo}`);
      // 连击奖励：每 5 连 +2 秒
      if (this.combo % 5 === 0) {
        this.timer.left = Math.min(this.duration, this.timer.left + 2000);
        this.timer.endAt = performance.now() + this.timer.left;
        import('../../ui/modal.js').then((m) => m.toast('连击奖励 +2 秒！'));
      }
      this.later(() => this.next(), 160);
    } else {
      this.wrong += 1;
      this.combo = 0;
      this.hud.patch('combo', 'x0');
      btn.classList.add('is-wrong');
      this.qNode.classList.add('shake');
      this.later(() => this.qNode.classList.remove('shake'), 320);
      this.sound.play('bad');
      // 答错扣 2 秒
      this.timer.left = Math.max(0, this.timer.left - 2000);
      this.timer.endAt = performance.now() + this.timer.left;
      const rightBtn = Array.from(this.optNode.children).find((b) => Number(b.textContent) === q.ans);
      rightBtn?.classList.add('is-right');
    }
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`, left <= 10000);
      this.hud.warn('time', left <= 10000);
    }, () => this.over());
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer.stop();
    const acc = this.correct + this.wrong ? this.correct / (this.correct + this.wrong) : 0;
    const score = this.correct;
    const stars = score >= 30 ? 3 : score >= 18 ? 2 : score >= 8 ? 1 : Math.min(1, score > 0 ? 1 : 0);
    this.finish({
      score,
      mode: 'max',
      stars: Math.max(1, stars),
      title: '时间到！',
      message: `答对 ${this.correct} 题 · 正确率 ${Math.round(acc * 100)}%`,
      speak: `时间到，答对 ${this.correct} 题`,
      stats: [
        { label: '答对', value: this.correct },
        { label: '正确率', value: `${Math.round(acc * 100)}%` },
        { label: '最高连击', value: `x${this.bestCombo}` },
      ],
    });
  }

  destroy() { this.timer.stop(); }
}
