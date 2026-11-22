/**
 * 一眼数清 —— 图案只闪现一下，凭印象说出有几个（混合档只数指定的那一种）
 */
import { Game } from '../../core/Game.js';
import { el, randInt, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const EMOJIS = ['🍎', '🐟', '⭐', '🎈', '🐞', '🍓', '🚗', '🌸', '🦋', '🍩', '🐤', '⚽'];
const GRID_C = 6;
const GRID_R = 5;

export default class QuickCountGame extends Game {
  async mount() {
    this.min = Number(this.options.min || 3);
    this.max = Number(this.options.max || 7);
    this.showMs = Number(this.options.show || 1500);
    this.mix = !!this.options.mix;
    this.rounds = Number(this.options.rounds || 10);
    this.idx = 0;
    this.right = 0;
    this.score = 0;
    this.phase = 'idle';

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.stageEl = el('div.qc-stage.fit-box');
    this.field = el('div.qc-field');
    this.ask = el('div.qc-ask');
    this.opts = el('div.qc-opts');
    this.stageEl.append(this.field, this.ask, this.opts);
    this.tip = el('div.pill', { text: '图案只出现一下下，看准了！' });
    this.root.append(this.stageEl, this.tip);

    this.hud.set([
      { key: 'q', label: '题目', value: `1/${this.rounds}` },
      { key: 'right', label: '答对', value: '0' },
      { key: 'score', label: '得分', value: '0' },
    ]);
    this.hud.show();
  }

  start() { this.later(() => this.next(), 500); }

  next() {
    if (this.idx >= this.rounds) return this.over();
    this.phase = 'ready';
    const [target, other] = shuffle(EMOJIS);
    const count = randInt(this.min, this.max);
    const extra = this.mix ? randInt(2, Math.max(3, Math.round(count * 0.6))) : 0;
    this.answer = count;
    this.target = target;

    const slots = shuffle(Array.from({ length: GRID_C * GRID_R }, (_, i) => i)).slice(0, count + extra);
    const items = shuffle([...Array(count).fill(target), ...Array(extra).fill(other)]);
    this.field.innerHTML = '';
    this.field.classList.remove('is-hidden');
    this.ask.innerHTML = '';
    this.opts.innerHTML = '';
    this.ask.append(el('span.qc-ready', { text: '准备…' }));
    this.hud.patch('q', `${this.idx + 1}/${this.rounds}`);

    this.later(() => {
      this.ask.innerHTML = '';
      this.ask.append(el('span.qc-ready', { text: '看！' }));
      slots.forEach((s, k) => {
        const r = Math.floor(s / GRID_C), c = s % GRID_C;
        const x = ((c + 0.5 + (Math.random() - 0.5) * 0.5) / GRID_C) * 100;
        const y = ((r + 0.5 + (Math.random() - 0.5) * 0.5) / GRID_R) * 100;
        this.field.appendChild(el('span.qc-item', {
          text: items[k],
          style: { left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${randInt(-20, 20)}deg) scale(${(0.85 + Math.random() * 0.3).toFixed(2)})` },
        }));
      });
      this.sound.play('flip');
      this.later(() => this.askQuestion(), this.showMs);
    }, 700);
  }

  askQuestion() {
    this.field.classList.add('is-hidden');
    this.phase = 'answer';
    this.ask.innerHTML = '';
    this.ask.append(
      el('span', { text: this.mix ? '刚才有几个' : '刚才一共有几个' }),
      el('b.qc-emoji', { text: this.target }),
      el('span', { text: '？' }),
    );
    const set = new Set([this.answer]);
    for (const d of shuffle([-2, -1, 1, 2, 3, -3])) {
      if (set.size >= 4) break;
      if (this.answer + d >= 1) set.add(this.answer + d);
    }
    Array.from(set).sort((a, b) => a - b).forEach((v) => {
      const b = el('button.qc-opt', { text: String(v), onClick: () => this.choose(v, b) });
      this.opts.appendChild(b);
    });
    this.t0 = performance.now();
  }

  choose(v, btn) {
    if (this.phase !== 'answer') return;
    this.phase = 'idle';
    this.idx += 1;
    this.field.classList.remove('is-hidden');
    this.field.classList.add('is-review');
    Array.from(this.field.children).forEach((it) => { if (it.textContent !== this.target) it.classList.add('is-dim'); });
    if (v === this.answer) {
      this.right += 1;
      const sec = (performance.now() - this.t0) / 1000;
      const gain = 10 + Math.max(0, Math.round(5 - sec));
      this.score += gain;
      btn.classList.add('is-right');
      floatText(btn, `+${gain}`);
      this.sound.play('good');
      this.tip.textContent = '好眼力！';
    } else {
      btn.classList.add('is-wrong');
      Array.from(this.opts.children).find((b) => Number(b.textContent) === this.answer)?.classList.add('is-right');
      this.sound.play('bad');
      this.tip.textContent = `是 ${this.answer} 个，再看看刚才的画面`;
    }
    this.hud.patch('right', this.right);
    this.hud.patch('score', this.score);
    this.later(() => { this.field.classList.remove('is-review'); this.next(); }, v === this.answer ? 900 : 1800);
  }

  over() {
    const stars = this.right >= this.rounds - 1 ? 3 : this.right >= Math.ceil(this.rounds * 0.6) ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      title: stars === 3 ? '火眼金睛！' : '挑战完成',
      message: `${this.rounds} 题答对 ${this.right} 题`,
      speak: `答对 ${this.right} 题`,
      stats: [
        { label: '答对', value: `${this.right}/${this.rounds}` },
        { label: '得分', value: this.score },
        { label: '闪现时间', value: `${(this.showMs / 1000).toFixed(1)}s` },
      ],
    });
  }
}
