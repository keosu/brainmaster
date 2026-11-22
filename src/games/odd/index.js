/**
 * 找不同 —— 一堆相同图案里藏着一个"变了样"的
 * 图案来自主题包（换成奥特曼等素材即自动生效）
 */
import { Game, Timer } from '../../core/Game.js';
import { el, pick, randInt } from '../../core/utils.js';
import { levelBar, themeBar, controlRow } from '../../ui/widgets.js';
import { faceUrl } from '../../themes/index.js';
import { save } from '../../core/storage.js';
import { floatText } from '../../ui/modal.js';

/* 异类的"变身"方式：差异要一眼能看出来 */
const DIFFS = {
  // 标准：明显小一圈
  normal: () => [{ transform: `scale(${randInt(66, 74) / 100})` }],
  // 困难：镜像 / 黑白 / 反色 / 变色，随机抽一种
  hard: () => [pick([
    { transform: 'scaleX(-1)' },
    { filter: 'grayscale(1)' },
    { filter: `hue-rotate(${randInt(100, 160)}deg)` },
    { filter: 'invert(.92)' },
  ])],
  // 大师：差异更细微（轻微旋转 / 小幅缩放 / 淡色）
  master: () => [pick([
    { transform: `rotate(${pick([-1, 1]) * randInt(16, 24)}deg)` },
    { transform: `scale(${randInt(80, 86) / 100})` },
    { filter: `hue-rotate(${randInt(50, 80)}deg)` },
    { transform: 'scaleX(-1)' },
  ])],
};

export default class OddGame extends Game {
  async mount() {
    const theme = this.theme;
    this.count = Number(this.options.count || 6);
    this.duration = Number(this.options.time || 30000);
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.right = 0;
    this.wrong = 0;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const th = themeBar(theme.id, (id) => {
      save.setSetting('theme', id);
      this.ctx.reload({ theme: id });
    });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, th, restart]));

    this.grid = el('div.odd-grid.fit-box');
    this.root.appendChild(this.grid);
    this.tip = el('div.pill', { text: '找出那个不一样的图案' });
    this.root.appendChild(this.tip);

    this.cols = Math.ceil(Math.sqrt(this.count));
    this.rows = Math.ceil(this.count / this.cols);
    this.grid.style.setProperty('--cols', String(this.cols));
    this.grid.style.setProperty('--rows', String(this.rows));

    this.hud.set([
      { key: 'time', label: '剩余', value: '30s' },
      { key: 'score', label: '得分', value: '0' },
      { key: 'streak', label: '连对', value: 'x0' },
    ]);
    this.hud.show();

    this.next();
  }

  next() {
    if (this.done) return;
    const theme = this.theme;
    const faceIndex = randInt(0, theme.faces.length - 1);
    const url = faceUrl(theme, faceIndex);
    const oddAt = randInt(0, this.count - 1);
    const [diff] = (DIFFS[this.options.level] || DIFFS.normal)();

    this.grid.innerHTML = '';
    for (let i = 0; i < this.count; i++) {
      const item = el('button.odd-item', { onClick: () => this.choose(i, item) });
      item.style.backgroundImage = `url("${url}")`;
      if (i === oddAt) Object.assign(item.style, diff);
      // 只做透明度入场：transform/filter 动画会盖掉异类自己的变身样式
      item.style.animationDelay = `${i * 24}ms`;
      this.grid.appendChild(item);
    }
    this.oddAt = oddAt;
  }

  choose(i, item) {
    if (this.done) return;
    if (i === this.oddAt) {
      this.right += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += 10 + Math.min(20, this.streak * 2);
      this.sound.play(this.streak >= 4 ? 'great' : 'good');
      item.classList.add('is-right');
      this.hud.patch('score', this.score);
      this.hud.patch('streak', `x${this.streak}`);
      // 连对奖励时间
      if (this.streak % 4 === 0) {
        this.timer.addTime(2000, this.duration);
        floatText(item, '+2秒', 'var(--c-green)');
      }
      this.later(() => this.next(), 380);
    } else {
      this.wrong += 1;
      this.streak = 0;
      this.score = Math.max(0, this.score - 5);
      this.sound.play('bad');
      item.classList.add('is-wrong');
      this.hud.patch('streak', 'x0');
      this.hud.patch('score', this.score);
      this.later(() => item.classList.remove('is-wrong'), 400);
    }
  }

  start() {
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`);
      this.hud.warn('time', left <= 8000);
    }, () => this.over());
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer.stop();
    const total = this.right + this.wrong;
    const acc = total ? this.right / total : 0;
    const stars = this.score >= 220 ? 3 : this.score >= 120 ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars: Math.max(1, stars),
      title: '时间到！',
      message: `找到 ${this.right} 个 · 正确率 ${Math.round(acc * 100)}%`,
      speak: `得分 ${this.score}`,
      stats: [
        { label: '找到', value: this.right },
        { label: '正确率', value: `${Math.round(acc * 100)}%` },
        { label: '最高连对', value: `x${this.bestStreak}` },
      ],
    });
  }

  destroy() { this.timer.stop(); }
}
