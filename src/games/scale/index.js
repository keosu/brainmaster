/**
 * 天平称重 —— 根据几架天平的倾斜方向，推理出最重 / 最轻的物品
 * 出题：给 K 件物品随机排出轻重，再把相邻名次两两放上天平，信息恰好足够推出全序
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const ITEMS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍', '🥕', '🍩', '🎁', '⚽', '🧸', '🦆', '🐢', '🍄', '🧁', '🎲'];

export default class ScaleGame extends Game {
  async mount() {
    this.k = Number(this.options.k || 3);
    this.mix = this.options.ask === 'mix';
    this.duration = Number(this.options.time || 60000);
    this.right = 0;
    this.wrong = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.done = false;
    this.locked = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.root.appendChild(controlRow([lv]));

    this.stageEl = el('div.sc-stage.fit-box');
    this.scalesEl = el('div.sc-scales');
    this.askEl = el('div.sc-ask');
    this.optsEl = el('div.sc-opts');
    this.stageEl.append(this.scalesEl, this.askEl, this.optsEl);
    this.tip = el('div.pill', { text: '天平往下沉的那一边更重' });
    this.root.append(this.stageEl, this.tip);

    this.hud.set([
      { key: 'time', label: '剩余', value: `${Math.round(this.duration / 1000)}s` },
      { key: 'right', label: '答对', value: '0' },
      { key: 'streak', label: '连对', value: 'x0' },
    ]);
    this.hud.show();
    this.next();
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`, left <= 10000);
    }, () => this.over());
  }

  next() {
    if (this.done) return;
    this.locked = false;
    const items = shuffle(ITEMS).slice(0, this.k);         // 按从轻到重排好
    const pairs = [];
    for (let i = 0; i < this.k - 1; i++) pairs.push([items[i], items[i + 1]]); // [轻, 重]
    this.ask = this.mix && Math.random() < 0.5 ? 'light' : 'heavy';
    this.answer = this.ask === 'heavy' ? items[this.k - 1] : items[0];

    this.scalesEl.innerHTML = '';
    this.scalesEl.style.setProperty('--cols-p', String(Math.min(pairs.length, 2)));
    this.scalesEl.style.setProperty('--cols-l', String(Math.min(pairs.length, 4)));
    shuffle(pairs).forEach(([light, heavy], i) => {
      const heavyRight = Math.random() < 0.5;
      const [l, r] = heavyRight ? [light, heavy] : [heavy, light];
      const scale = el('div.sc-scale', { style: { '--tilt': '0deg' } }, [
        el('div.sc-post'),
        el('div.sc-beam', {}, [
          el('div.sc-pan.sc-pan--l', {}, [el('span.sc-item', { text: l })]),
          el('div.sc-pan.sc-pan--r', {}, [el('span.sc-item', { text: r })]),
        ]),
        el('div.sc-base'),
      ]);
      this.scalesEl.appendChild(scale);
      // 先水平再倾斜，制造"称一称"的动感
      this.later(() => scale.style.setProperty('--tilt', heavyRight ? '13deg' : '-13deg'), 120 + i * 90);
    });

    this.askEl.innerHTML = '';
    this.askEl.append(
      el('span', { text: '哪个' }),
      el('b', { class: this.ask === 'heavy' ? 'is-heavy' : 'is-light', text: this.ask === 'heavy' ? '最重' : '最轻' }),
      el('span', { text: '？' }),
    );

    this.optsEl.innerHTML = '';
    shuffle(items).forEach((it) => {
      const b = el('button.sc-opt', { text: it, onClick: () => this.choose(it, b) });
      this.optsEl.appendChild(b);
    });
  }

  choose(it, btn) {
    if (this.done || this.locked) return;
    this.locked = true;
    if (it === this.answer) {
      this.right += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      btn.classList.add('is-right');
      this.sound.play(this.streak >= 4 ? 'great' : 'good');
      floatText(btn, '✓', 'var(--c-green)');
      this.hud.patch('right', this.right);
      this.hud.patch('streak', `x${this.streak}`);
      this.later(() => this.next(), 450);
    } else {
      this.wrong += 1;
      this.streak = 0;
      btn.classList.add('is-wrong');
      Array.from(this.optsEl.children).find((b) => b.textContent === this.answer)?.classList.add('is-right');
      this.sound.play('bad');
      this.timer.addTime(-3000);
      floatText(btn, '-3秒', 'var(--c-red)');
      this.hud.patch('streak', 'x0');
      this.tip.textContent = `${this.ask === 'heavy' ? '最重' : '最轻'}的是 ${this.answer}，它在每架天平上都${this.ask === 'heavy' ? '往下沉' : '被翘起来'}`;
      this.later(() => this.next(), 1400);
    }
  }

  over() {
    if (this.done) return;
    this.done = true;
    const par = { 3: 14, 4: 11, 5: 9 }[this.k] || 10;
    const stars = this.right >= par ? 3 : this.right >= Math.ceil(par * 0.55) ? 2 : 1;
    const total = this.right + this.wrong;
    this.finish({
      score: this.right,
      mode: 'max',
      stars,
      title: stars === 3 ? '推理小侦探！' : '时间到！',
      message: `答对 ${this.right} 题 · 正确率 ${total ? Math.round((this.right / total) * 100) : 0}%`,
      speak: `答对 ${this.right} 题`,
      stats: [
        { label: '答对', value: this.right },
        { label: '答错', value: this.wrong },
        { label: '最高连对', value: `x${this.bestStreak}` },
      ],
    });
  }
}
