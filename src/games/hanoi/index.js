/**
 * 汉诺塔 —— 把整摞盘子从左边搬到右边，大盘不能压小盘
 * 交互：点一下柱子拿起顶部盘子，再点目标柱子放下
 */
import { Game } from '../../core/Game.js';
import { el } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';

const COLORS = [
  ['#ff6b9d', '#c2376a'], ['#ffd166', '#d99a1f'], ['#4ade80', '#1f9d56'],
  ['#6ee7ff', '#2b9dc4'], ['#b46bff', '#7b34c9'], ['#ff9f45', '#d26a15'],
  ['#5b8cff', '#2a55c9'], ['#ff5d5d', '#c62b2b'],
];

export default class HanoiGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 3);
    this.steps = 0;
    this.best = Math.pow(2, this.n) - 1;
    this.selected = -1;
    this.history = [];
    this.done = false;
    this.pegs = [Array.from({ length: this.n }, (_, i) => this.n - i), [], []];

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const undoBtn = el('button.btn.btn--sm.btn--ghost', { text: '↩️ 撤销', onClick: () => this.undo() });
    const hintBtn = el('button.btn.btn--sm.btn--ghost', { text: '💡 提示', onClick: () => this.hint() });
    const restartBtn = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, undoBtn, hintBtn, restartBtn]));
    this.hints = 0;

    /* ---------- 场景 ---------- */
    this.board = el('div.hn-board.fit-box');
    this.zoneRow = el('div.hn-zones');
    this.pegs.forEach((_, i) => {
      const zone = el('button.hn-zone', { onClick: () => this.tapPeg(i) });
      zone.appendChild(el('span.hn-zone__no', { text: String(i + 1) }));
      this.zoneRow.appendChild(zone);
      this.board.appendChild(el('div.hn-rod', { style: { left: this.pegCenter(i) } }));
    });
    this.board.appendChild(this.zoneRow);

    this.discLayer = el('div.hn-discs');
    this.board.appendChild(this.discLayer);

    // 每个盘子一个常驻 DOM，移动时只改位置 → 自带滑动动画
    this.discEls = new Map();
    for (let size = 1; size <= this.n; size++) {
      const [c1, c2] = COLORS[(size - 1) % COLORS.length];
      const d = el('div.hn-disc', {
        style: {
          // 宽度按"一个柱位"算，最宽的盘约占柱位 92%
          width: `${((0.34 + 0.58 * (size / this.n)) * (100 / 3)).toFixed(2)}%`,
          background: `linear-gradient(160deg, ${c1}, ${c2})`,
        },
      });
      this.discLayer.appendChild(d);
      this.discEls.set(size, d);
    }
    this.board.style.setProperty('--n', String(this.n));
    this.applySize();

    this.root.appendChild(this.board);
    this.tip = el('div.pill', { text: '点击柱子拿起盘子，再点另一根柱子放下' });
    this.root.appendChild(this.tip);

    this.hud.set([
      { key: 'steps', label: '步数', value: '0' },
      { key: 'best', label: '最少步数', value: String(this.best) },
      { key: 'moved', label: '已搬到右柱', value: '0' },
    ]);
    this.hud.show();

    this.layout();
    this.say(`把 ${this.n} 个盘子搬到右边，最少 ${this.best} 步`);
  }

  pegCenter(i) { return `${((i + 0.5) / 3) * 100}%`; }

  /**
   * 自适应缩放：盘子厚度随可用高度变化，保证竖屏 / 横屏都能撑满画面
   */
  applySize() {
    const cs = getComputedStyle(this.root);
    const fitW = parseFloat(cs.getPropertyValue('--fit-w')) || 0;
    const fitH = parseFloat(cs.getPropertyValue('--fit-h')) || 0;
    const availW = fitW || this.root.clientWidth || window.innerWidth;
    // 用棋盘真实渲染宽度（挂载后才有值，否则回退到可用宽度）
    const boardW = this.board.clientWidth
      || Math.min(availW, this.root.clientWidth || availW)
      || window.innerWidth;
    const pegW = boardW / 3;
    const wMin = (0.34 + 0.58 / this.n) * pegW; // 最窄盘（最小号）的宽度
    const reserve = 74;                          // 与 CSS 中 +74px 对齐：底座 + 顶部留白
    // 高度优先填满可用高度；但必须保证“最窄的盘”仍是扁盘（高 < 宽），
    // 否则小盘会被拉成球。byW 用最窄盘宽度乘一个扁率上限来约束。
    const byH = fitH ? (fitH - reserve) / this.n : 30;
    const byW = wMin * 0.58;                      // 扁率上限：盘厚不超过最窄盘宽度的 58%
    const discH = Math.max(16, Math.min(120, Math.floor(Math.min(byH, byW))));
    if (discH === this.discH) return;
    this.discH = discH;
    this.board.style.setProperty('--disc-h', `${discH}px`);
    this.layout();
  }

  onResize() { this.applySize(); }

  layout() {
    this.pegs.forEach((stack, p) => {
      stack.forEach((size, idx) => {
        const d = this.discEls.get(size);
        if (!d) return;
        d.style.left = this.pegCenter(p);
        d.style.bottom = `calc(var(--disc-h, 30px) * ${idx} + 44px)`;
        d.classList.toggle('is-up', this.selected === p && idx === stack.length - 1);
      });
    });
    this.hud.patch('steps', this.steps);
    this.hud.patch('moved', this.pegs[2].length);
  }

  tapPeg(i) {
    if (this.done) return;
    if (this.selected === -1) {
      if (!this.pegs[i].length) { this.sound.play('bad'); return; }
      this.selected = i;
      this.sound.play('tap');
      this.layout();
      return;
    }
    if (this.selected === i) { this.selected = -1; this.layout(); return; }
    this.move(this.selected, i);
  }

  move(from, to) {
    const stack = this.pegs[from];
    const target = this.pegs[to];
    const size = stack[stack.length - 1];
    if (target.length && target[target.length - 1] < size) {
      toast('大盘不能压在小盘上');
      this.sound.play('bad');
      this.selected = -1;
      this.layout();
      return;
    }
    stack.pop();
    target.push(size);
    this.history.push([from, to]);
    this.steps += 1;
    this.selected = -1;
    this.sound.play('place');
    this.layout();

    if (this.pegs[2].length === this.n) this.later(() => this.over(), 320);
  }

  /**
   * 任意局面下的最优下一步：要把 1..k 号盘都放到 target，
   * 若 k 号盘不在 target，就得先把 1..k-1 挪到第三根柱子，再搬 k 号盘
   */
  nextMove(k, target) {
    if (k === 0) return null;
    const p = this.pegs.findIndex((s) => s.includes(k));
    if (p === target) return this.nextMove(k - 1, target);
    return this.nextMove(k - 1, 3 - p - target) || [p, target];
  }

  hint() {
    if (this.done) return;
    const mv = this.nextMove(this.n, 2);
    if (!mv) return;
    this.hints += 1;
    this.selected = -1;
    this.layout();
    const zones = Array.from(this.zoneRow.children);
    zones.forEach((z) => z.classList.remove('is-from', 'is-to'));
    zones[mv[0]].classList.add('is-from');
    zones[mv[1]].classList.add('is-to');
    this.later(() => zones.forEach((z) => z.classList.remove('is-from', 'is-to')), 1800);
    this.tip.textContent = `💡 把第 ${mv[0] + 1} 根柱子最上面的盘子，移到第 ${mv[1] + 1} 根`;
    this.sound.play('flip');
  }

  undo() {
    if (this.done || !this.history.length) return;
    const [from, to] = this.history.pop();
    this.pegs[from].push(this.pegs[to].pop());
    this.steps = Math.max(0, this.steps - 1);
    this.selected = -1;
    this.sound.play('tap');
    this.layout();
  }

  over() {
    if (this.done) return;
    this.done = true;
    const perfect = this.steps === this.best;
    const good = this.steps <= this.best + Math.max(2, Math.round(this.best * 0.35));
    const score = this.steps;
    this.sound.play(perfect ? 'win' : 'great');
    this.finish({
      score,
      mode: 'min',
      stars: Math.max(1, (perfect ? 3 : good ? 2 : 1) - (this.hints ? 1 : 0)),
      title: perfect ? '完美解法！' : good ? '搬完啦！' : '成功搬到右边！',
      message: `用了 ${this.steps} 步 · 最优 ${this.best} 步`,
      speak: perfect ? '完美，一步不多' : `用了 ${this.steps} 步完成`,
      stats: [
        { label: '你的步数', value: this.steps },
        { label: '最优步数', value: this.best },
        { label: '提示', value: this.hints },
      ],
    });
  }

  destroy() {}
}
