/**
 * 气球爆爆 —— 按从小到大的顺序戳破气球（灵感来自《灵活脑学校》）
 * 困难档气球上是算式，需要先心算再比较
 */
import { Game, Timer } from '../../core/Game.js';
import { el, randInt, shuffle, pick } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const COLORS = ['#ff5d7a', '#ffb02e', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#facc15', '#2dd4bf'];

/** 把数值 v 写成一个小学生能心算的算式 */
function exprFor(v) {
  const forms = [];
  if (v >= 2) { const a = randInt(1, v - 1); forms.push(`${a}+${v - a}`); }
  { const b = randInt(1, 9); forms.push(`${v + b}-${b}`); }
  for (let a = 2; a <= 9; a++) if (v % a === 0 && v / a <= 9 && v / a >= 2) forms.push(`${a}×${v / a}`);
  { const b = randInt(2, 4); if (v * b <= 48) forms.push(`${v * b}÷${b}`); }
  return pick(forms);
}

export default class BalloonGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 4);
    this.max = Number(this.options.max || 20);
    this.expr = !!this.options.expr;
    this.duration = Number(this.options.time || 60000);
    this.score = 0;
    this.popped = 0;
    this.rounds = 0;
    this.wrong = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.root.appendChild(controlRow([lv]));

    this.sky = el('div.bl-sky.fit-box');
    this.tip = el('div.pill', { text: this.expr ? '先算一算，再从小到大戳破气球' : '从最小的数开始，依次戳破气球' });
    this.root.append(this.sky, this.tip);

    this.hud.set([
      { key: 'time', label: '剩余', value: `${Math.round(this.duration / 1000)}s` },
      { key: 'score', label: '得分', value: '0' },
      { key: 'combo', label: '连击', value: 'x0' },
    ]);
    this.hud.show();
    this.deal();
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`, left <= 10000);
    }, () => this.over());
  }

  deal() {
    const values = new Set();
    const lo = this.expr ? 2 : 1;
    while (values.size < this.n) values.add(randInt(lo, this.max));
    const list = shuffle(Array.from(values));
    this.order = list.slice().sort((a, b) => a - b);
    this.next = 0;
    this.sky.innerHTML = '';
    const colors = shuffle(COLORS);
    // 横向均分槽位 + 纵向错落，保证气球不重叠
    list.forEach((v, i) => {
      const x = ((i + 0.5) / this.n) * 100 + randInt(-3, 3);
      const y = 30 + ((i % 2) ? 28 : 0) + randInt(-6, 6);
      const label = this.expr ? exprFor(v) : String(v);
      const b = el('button.bl-balloon', {
        style: {
          left: `${x}%`, top: `${y}%`,
          '--c': colors[i % colors.length],
          '--delay': `${-randInt(0, 2000)}ms`,
          '--fs': label.length > 4 ? '.72' : label.length > 2 ? '.86' : '1',
        },
      }, [el('span.bl-balloon__body', {}, [el('span.bl-balloon__label', { text: label })])]);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(v, b); });
      b.style.animationDelay = `${i * 60}ms`;
      this.sky.appendChild(b);
    });
  }

  tap(v, b) {
    if (this.done || b.classList.contains('is-pop')) return;
    if (v === this.order[this.next]) {
      this.next += 1;
      this.popped += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const gain = 10 + Math.min(10, Math.floor(this.combo / 3) * 2);
      this.score += gain;
      floatText(b, `+${gain}`);
      b.classList.add('is-pop');
      this.sound.play('pop');
      this.hud.patch('score', this.score);
      this.hud.patch('combo', `x${this.combo}`);
      if (this.next >= this.order.length) {
        this.rounds += 1;
        this.score += 5;
        this.hud.patch('score', this.score);
        this.sound.play('good');
        this.later(() => { if (!this.done) this.deal(); }, 380);
      }
    } else {
      this.wrong += 1;
      this.combo = 0;
      this.hud.patch('combo', 'x0');
      this.sound.play('bad');
      this.timer.addTime(-2000);
      floatText(b, '-2秒', 'var(--c-red)');
      b.classList.remove('is-wrong');
      void b.offsetWidth;
      b.classList.add('is-wrong');
      this.tip.textContent = `还有更小的数哦，现在该戳 ${this.expr ? '最小的那个' : this.order[this.next]}`;
    }
  }

  over() {
    if (this.done) return;
    this.done = true;
    const par = this.expr ? 22 : this.n >= 5 ? 30 : 36;
    const stars = this.popped >= par ? 3 : this.popped >= par * 0.55 ? 2 : 1;
    const acc = this.popped + this.wrong ? Math.round((this.popped / (this.popped + this.wrong)) * 100) : 0;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      title: stars === 3 ? '气球大师！' : '时间到！',
      message: `戳破 ${this.popped} 个气球 · 清空 ${this.rounds} 轮`,
      speak: `戳破 ${this.popped} 个气球，得分 ${this.score}`,
      stats: [
        { label: '戳破', value: this.popped },
        { label: '正确率', value: `${acc}%` },
        { label: '最高连击', value: `x${this.bestCombo}` },
      ],
    });
  }
}
