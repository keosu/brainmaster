/**
 * 打地鼠 —— 地鼠冒头就敲；金地鼠高分，炸弹扣分。越到后面冒得越快
 */
import { Game, Timer } from '../../core/Game.js';
import { el, randInt } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const TYPES = {
  mole: { emoji: '🐹', score: 10 },
  gold: { emoji: '🐹', score: 30 },
  bomb: { emoji: '💣', score: -20 },
};

export default class MoleGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 3);
    this.speed = Number(this.options.speed || 1);
    this.bombs = !!this.options.bombs;
    this.duration = Number(this.options.time || 40000);
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.bombHits = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.root.appendChild(controlRow([lv]));

    this.field = el('div.ml-field.fit-box', { style: { '--n': String(this.n) } });
    this.holes = Array.from({ length: this.n * this.n }, (_, i) => {
      const mole = el('span.ml-mole');
      const hole = el('button.ml-hole', {}, [el('span.ml-pit'), el('span.ml-mask', {}, [mole]), el('span.ml-rim')]);
      hole.addEventListener('pointerdown', (e) => { e.preventDefault(); this.whack(i); });
      this.field.appendChild(hole);
      return { node: hole, mole, type: null, up: false, hideId: 0 };
    });
    this.tip = el('div.pill', { text: this.bombs ? '敲地鼠 🐹，金色的分更高，千万别碰 💣' : '地鼠冒出来就敲它！金色地鼠分更高' });
    this.root.append(this.field, this.tip);

    this.hud.set([
      { key: 'time', label: '剩余', value: `${Math.round(this.duration / 1000)}s` },
      { key: 'score', label: '得分', value: '0' },
      { key: 'combo', label: '连击', value: 'x0' },
    ]);
    this.hud.show();
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`, left <= 8000);
    }, () => this.over());
    this.later(() => this.loop(), 500);
  }

  /** 随时间加速：最后阶段比开局快 60% */
  pace() {
    const progress = 1 - this.timer.left / this.duration;
    return this.speed * (1 + progress * 0.6);
  }

  loop() {
    if (this.done) return;
    const pace = this.pace();
    const maxUp = this.n >= 4 ? 4 : 2 + (pace > 1.4 ? 1 : 0);
    const upCount = this.holes.filter((h) => h.up).length;
    if (upCount < maxUp) this.popUp();
    this.later(() => this.loop(), randInt(380, 760) / pace);
  }

  popUp() {
    const free = this.holes.filter((h) => !h.up);
    if (!free.length) return;
    const h = free[randInt(0, free.length - 1)];
    const r = Math.random();
    h.type = this.bombs && r < 0.18 ? 'bomb' : r > 0.9 ? 'gold' : 'mole';
    h.up = true;
    h.hit = false;
    h.mole.textContent = TYPES[h.type].emoji;
    h.node.className = `ml-hole is-up is-${h.type}`;
    const stay = randInt(850, 1350) / this.pace();
    h.hideId = this.later(() => this.hide(h, true), stay);
  }

  hide(h, escaped = false) {
    if (!h.up) return;
    h.up = false;
    h.node.classList.remove('is-up');
    if (escaped && h.type !== 'bomb' && !h.hit) {
      this.misses += 1;
      this.combo = 0;
      this.hud.patch('combo', 'x0');
    }
  }

  whack(i) {
    if (this.done) return;
    const h = this.holes[i];
    if (!h.up || h.hit) {
      h.node.classList.remove('is-thud');
      void h.node.offsetWidth;
      h.node.classList.add('is-thud');
      return;
    }
    h.hit = true;
    this.clearLater(h.hideId);
    const t = TYPES[h.type];
    if (h.type === 'bomb') {
      this.bombHits += 1;
      this.combo = 0;
      this.score = Math.max(0, this.score + t.score);
      this.sound.play('bad');
      this.field.classList.remove('shake');
      void this.field.offsetWidth;
      this.field.classList.add('shake');
      floatText(h.node, `${t.score}`, 'var(--c-red)');
      h.node.classList.add('is-boom');
    } else {
      this.hits += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const gain = t.score + Math.min(10, Math.floor(this.combo / 5) * 2);
      this.score += gain;
      this.sound.play(h.type === 'gold' ? 'great' : 'whack');
      floatText(h.node, `+${gain}`, h.type === 'gold' ? 'var(--c-amber)' : '#fff');
      h.node.classList.add('is-hit');
    }
    this.hud.patch('score', this.score);
    this.hud.patch('combo', `x${this.combo}`);
    this.later(() => { h.node.classList.remove('is-hit', 'is-boom'); this.hide(h); }, 260);
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.holes.forEach((h) => this.hide(h));
    const par = Math.round(320 * this.speed);
    const stars = this.score >= par ? 3 : this.score >= par * 0.55 ? 2 : 1;
    const total = this.hits + this.misses;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      title: stars === 3 ? '打地鼠高手！' : '时间到！',
      message: `敲中 ${this.hits} 只 · 命中率 ${total ? Math.round((this.hits / total) * 100) : 0}%${this.bombHits ? ` · 碰到炸弹 ${this.bombHits} 次` : ''}`,
      speak: `得分 ${this.score}`,
      stats: [
        { label: '敲中', value: this.hits },
        { label: '跑掉', value: this.misses },
        { label: '最高连击', value: `x${this.bestCombo}` },
      ],
    });
  }
}
