/**
 * 数积木 —— 等轴测视角的一堆立方体，数出总块数（含被托在下面看不见的）
 * 生成规则：越靠近观察者的柱子越矮（高度单调不增），保证每根柱子的顶面都能看到
 */
import { Game } from '../../core/Game.js';
import { el, randInt, shuffle, pick } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const PALETTES = [
  { top: '#9fe3ff', left: '#4d9bff', right: '#2f6bd6' },
  { top: '#ffd9a0', left: '#ff9f45', right: '#d8711a' },
  { top: '#b9f5c9', left: '#4ade80', right: '#22a35a' },
  { top: '#f0c6ff', left: '#b46bff', right: '#8040d0' },
  { top: '#ffc2d4', left: '#ff6b9d', right: '#d63f72' },
];

const COS = Math.cos(Math.PI / 6);

function makeHeights(w, d, H) {
  for (let tries = 0; tries < 50; tries++) {
    const h = Array.from({ length: w }, () => Array(d).fill(0));
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < d; y++) {
        const cap = Math.min(x ? h[x - 1][y] : H, y ? h[x][y - 1] : H);
        h[x][y] = x === 0 && y === 0 ? randInt(Math.max(2, H - 1), H) : randInt(Math.max(0, cap - 2), cap);
      }
    }
    const total = h.flat().reduce((a, b) => a + b, 0);
    const minTotal = Math.max(3, Math.round(w * d * H * 0.3));
    if (total >= minTotal) return { h, total };
  }
  return { h: [[2, 1], [1, 0]], total: 4 };
}

function renderSvg(h, pal) {
  const w = h.length;
  const d = h[0].length;
  const P = (x, y, z) => [(x - y) * COS, (x + y) * 0.5 - z];
  const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
  const cubes = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) for (let z = 0; z < h[x][y]; z++) cubes.push([x, y, z]);
  cubes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const grow = ([px, py]) => { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); };
  const floor = [P(0, 0, 0), P(w, 0, 0), P(w, d, 0), P(0, d, 0)];
  floor.forEach(grow);

  const faces = cubes.map(([x, y, z]) => {
    const top = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const right = [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)];
    const left = [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    [...top, ...right, ...left].forEach(grow);
    return `<polygon points="${pts(left)}" fill="${pal.left}"/>`
      + `<polygon points="${pts(right)}" fill="${pal.right}"/>`
      + `<polygon points="${pts(top)}" fill="${pal.top}"/>`;
  }).join('');

  const grid = [];
  for (let i = 0; i <= w; i++) grid.push(`<line x1="${P(i, 0, 0)[0]}" y1="${P(i, 0, 0)[1]}" x2="${P(i, d, 0)[0]}" y2="${P(i, d, 0)[1]}"/>`);
  for (let j = 0; j <= d; j++) grid.push(`<line x1="${P(0, j, 0)[0]}" y1="${P(0, j, 0)[1]}" x2="${P(w, j, 0)[0]}" y2="${P(w, j, 0)[1]}"/>`);

  const pad = 0.3;
  const vb = [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2].map((v) => v.toFixed(3)).join(' ');
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <polygon points="${pts(floor)}" fill="rgba(255,255,255,.06)"/>
    <g stroke="rgba(255,255,255,.14)" stroke-width="0.02">${grid.join('')}</g>
    <g stroke="rgba(8,14,40,.55)" stroke-width="0.035" stroke-linejoin="round">${faces}</g>
  </svg>`;
}

export default class BlocksGame extends Game {
  async mount() {
    this.w = Number(this.options.w || 2);
    this.d = Number(this.options.d || 2);
    this.H = Number(this.options.h || 3);
    this.rounds = Number(this.options.rounds || 8);
    this.idx = 0;
    this.right = 0;
    this.score = 0;
    this.locked = false;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.stageEl = el('div.bk-stage.fit-box');
    this.view = el('div.bk-view');
    this.opts = el('div.bk-opts');
    this.stageEl.append(this.view, this.opts);
    this.tip = el('div.pill', { text: '一共有几块积木？被挡住的也要算哦' });
    this.root.append(this.stageEl, this.tip);

    this.hud.set([
      { key: 'q', label: '题目', value: `1/${this.rounds}` },
      { key: 'right', label: '答对', value: '0' },
      { key: 'score', label: '得分', value: '0' },
    ]);
    this.hud.show();
    this.next();
  }

  next() {
    if (this.idx >= this.rounds) return this.over();
    this.locked = false;
    const { h, total } = makeHeights(this.w, this.d, this.H);
    this.total = total;
    this.view.innerHTML = renderSvg(h, pick(PALETTES));
    this.view.classList.remove('pop-in');
    void this.view.offsetWidth;
    this.view.classList.add('pop-in');

    const opts = new Set([total]);
    const deltas = shuffle([-3, -2, -1, 1, 2, 3, 4]);
    for (const dlt of deltas) {
      if (opts.size >= 4) break;
      if (total + dlt >= 1) opts.add(total + dlt);
    }
    this.opts.innerHTML = '';
    Array.from(opts).sort((a, b) => a - b).forEach((v) => {
      const b = el('button.bk-opt', { text: String(v), onClick: () => this.choose(v, b) });
      this.opts.appendChild(b);
    });
    this.hud.patch('q', `${this.idx + 1}/${this.rounds}`);
    this.t0 = performance.now();
  }

  choose(v, btn) {
    if (this.locked) return;
    this.locked = true;
    this.idx += 1;
    if (v === this.total) {
      this.right += 1;
      const sec = (performance.now() - this.t0) / 1000;
      const gain = 10 + Math.max(0, Math.round(10 - sec));
      this.score += gain;
      btn.classList.add('is-right');
      floatText(btn, `+${gain}`);
      this.sound.play('good');
      this.tip.textContent = sec < 4 ? '又快又准！' : '答对了！';
      this.later(() => this.next(), 650);
    } else {
      btn.classList.add('is-wrong');
      Array.from(this.opts.children).find((b) => Number(b.textContent) === this.total)?.classList.add('is-right');
      this.sound.play('bad');
      this.tip.textContent = `是 ${this.total} 块。记得把下面托着的积木也数上`;
      this.later(() => this.next(), 1600);
    }
    this.hud.patch('right', this.right);
    this.hud.patch('score', this.score);
  }

  over() {
    const stars = this.right >= this.rounds - 1 ? 3 : this.right >= Math.ceil(this.rounds * 0.6) ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      title: stars === 3 ? '空间小天才！' : '数完啦',
      message: `${this.rounds} 题答对 ${this.right} 题`,
      speak: `答对 ${this.right} 题，得分 ${this.score}`,
      stats: [
        { label: '答对', value: `${this.right}/${this.rounds}` },
        { label: '得分', value: this.score },
        { label: '规模', value: `${this.w}×${this.d}×${this.H}` },
      ],
    });
  }
}
