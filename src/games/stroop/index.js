/**
 * 色词干扰（Stroop）—— 只看"字的颜色"，不要被字的意思骗了
 */
import { Game, Timer } from '../../core/Game.js';
import { el, pick, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const COLORS = [
  { name: '红', hex: '#ff4757' },
  { name: '蓝', hex: '#4d8bff' },
  { name: '绿', hex: '#3ddc84' },
  { name: '黄', hex: '#ffd166' },
  { name: '紫', hex: '#b46bff' },
  { name: '橙', hex: '#ff9f45' },
];

export default class StroopGame extends Game {
  async mount() {
    this.pool = COLORS.slice(0, Number(this.options.options || 4));
    this.duration = Number(this.options.time || 45000);
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.right = 0;
    this.wrong = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.root.appendChild(controlRow([lv]));

    this.tipNode = el('div.pill', { text: '选「字的颜色」，不是字的意思！' });
    this.stage = el('div.st-stage.fit-box');
    this.wordNode = el('div.stroop-word');
    this.btnNode = el('div.stroop-btns');
    this.stage.append(this.wordNode, this.btnNode);
    this.root.append(this.tipNode, this.stage);

    this.hud.set([
      { key: 'time', label: '剩余', value: '45s' },
      { key: 'score', label: '得分', value: '0' },
      { key: 'combo', label: '连击', value: 'x0' },
    ]);
    this.hud.show();

    this.buildButtons();
    this.next();
  }

  buildButtons() {
    this.btnNode.innerHTML = '';
    shuffle(this.pool.slice()).forEach((c) => {
      const b = el('button.stroop-btn', {
        text: c.name,
        style: { background: c.hex },
        onClick: () => this.pickColor(c, b),
      });
      b.dataset.name = c.name;
      this.btnNode.appendChild(b);
    });
  }

  next() {
    if (this.done) return;
    const word = pick(this.pool);
    const others = this.pool.filter((c) => c.name !== word.name);
    const ink = pick(others.length ? others : this.pool);
    this.current = { ink };
    this.wordNode.textContent = word.name;
    this.wordNode.style.color = ink.hex;
    this.wordNode.classList.remove('pop-in');
    void this.wordNode.offsetWidth;
    this.wordNode.classList.add('pop-in');
    this.say(word.name); // 故意读出字义，制造干扰
  }

  pickColor(c, btn) {
    if (this.done) return;
    if (c.name === this.current.ink.name) {
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.right += 1;
      this.score += 10 + Math.min(20, this.combo * 2);
      this.sound.play(this.combo >= 5 ? 'great' : 'good');
      btn.classList.add('is-right');
      this.later(() => btn.classList.remove('is-right'), 180);
    } else {
      this.combo = 0;
      this.wrong += 1;
      this.score = Math.max(0, this.score - 5);
      this.sound.play('bad');
      this.wordNode.classList.add('shake');
      this.later(() => this.wordNode.classList.remove('shake'), 320);
      this.timer.left = Math.max(0, this.timer.left - 1500);
      this.timer.endAt = performance.now() + this.timer.left;
    }
    this.hud.patch('score', this.score);
    this.hud.patch('combo', `x${this.combo}`);
    this.next();
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`);
      this.hud.warn('time', left <= 10000);
    }, () => this.over());
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer.stop();
    const total = this.right + this.wrong;
    const acc = total ? this.right / total : 0;
    const stars = this.score >= 320 ? 3 : this.score >= 180 ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars: Math.max(1, stars),
      title: '挑战结束',
      message: `正确率 ${Math.round(acc * 100)}% · 最高连击 x${this.bestCombo}`,
      speak: `得分 ${this.score}`,
      stats: [
        { label: '答对', value: this.right },
        { label: '正确率', value: `${Math.round(acc * 100)}%` },
        { label: '最高连击', value: `x${this.bestCombo}` },
      ],
    });
  }

  destroy() { this.timer.stop(); }
}
