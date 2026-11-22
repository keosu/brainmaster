/**
 * 转一转 —— 心理旋转：哪个图形是原图旋转得到的（不是镜像翻面）
 * 图形是随机生成的多连方块；镜像档要求图形本身不对称，镜像版本才是有效干扰项
 */
import { Game, Timer } from '../../core/Game.js';
import { el, randInt, shuffle, pick } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const COLORS = ['#6ee7ff', '#ffd166', '#ff6b9d', '#4ade80', '#b46bff', '#ff9f45'];

/* ---------------- 多连方块工具 ---------------- */
const norm = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
};
const key = (cells) => norm(cells).map((c) => c.join(',')).join(';');
const rot = (cells) => norm(cells.map(([x, y]) => [-y, x]));
const mirror = (cells) => norm(cells.map(([x, y]) => [-x, y]));
const rotN = (cells, n) => { let c = cells; for (let i = 0; i < n; i++) c = rot(c); return c; };
const rotKeys = (cells) => new Set([0, 1, 2, 3].map((n) => key(rotN(cells, n))));

function randomShape(size) {
  const cells = [[0, 0]];
  const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
  while (cells.length < size) {
    const [x, y] = pick(cells);
    const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  return norm(cells);
}

/** 图形不对称：镜像后无论怎么转都和原图不一样，且四个朝向互不相同 */
function isChiral(cells) {
  const rk = rotKeys(cells);
  if (rk.size < 4) return false;
  for (let n = 0; n < 4; n++) if (rk.has(key(rotN(mirror(cells), n)))) return false;
  return true;
}

function buildQuestion(size, optCount, useMirror) {
  for (let tries = 0; tries < 200; tries++) {
    const base = randomShape(size);
    if (useMirror ? !isChiral(base) : rotKeys(base).size < 2) continue;
    const answer = rotN(base, randInt(1, 3));
    const banned = rotKeys(base);
    const decoys = [];
    const seen = new Set([key(answer)]);
    let guard = 0;
    while (decoys.length < optCount - 1 && guard++ < 80) {
      const d = useMirror ? rotN(mirror(base), randInt(0, 3)) : randomShape(size);
      const k = key(d);
      if (seen.has(k) || banned.has(k)) continue;
      if (!useMirror) {
        // 非镜像档的干扰项要是"完全不同"的形状，连镜像都不能是
        const m = mirror(d);
        if ([0, 1, 2, 3].some((n) => banned.has(key(rotN(m, n))))) continue;
      }
      seen.add(k);
      decoys.push(d);
    }
    if (decoys.length === optCount - 1) return { base, answer, decoys };
  }
  return null;
}

function shapeNode(cells, color, cls = '') {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const n = Math.max(w, h);
  const ox = (n - w) / 2;
  const oy = (n - h) / 2;
  const rects = cells.map(([x, y]) => `<rect x="${x + ox + 0.05}" y="${y + oy + 0.05}" width="0.9" height="0.9" rx="0.18"/>`).join('');
  return el(`div.rt-shape${cls ? `.${cls}` : ''}`, {
    html: `<svg viewBox="-0.15 -0.15 ${n + 0.3} ${n + 0.3}" xmlns="http://www.w3.org/2000/svg"><g fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="0.06">${rects}</g></svg>`,
  });
}

export default class RotateGame extends Game {
  async mount() {
    this.size = Number(this.options.cells || 4);
    this.optCount = Number(this.options.opts || 3);
    this.useMirror = !!this.options.mirror;
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

    this.stageEl = el('div.rt-stage.fit-box');
    this.targetBox = el('div.rt-target');
    this.optsEl = el('div.rt-opts');
    this.stageEl.append(this.targetBox, this.optsEl);
    this.tip = el('div.pill', { text: this.useMirror ? '只能转，不能翻面！小心镜子里的样子' : '哪个是把原图转一转得到的？' });
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
    const q = buildQuestion(this.size, this.optCount, this.useMirror);
    if (!q) { this.size = 5; return this.next(); }
    this.locked = false;
    const color = pick(COLORS);
    this.targetBox.innerHTML = '';
    this.targetBox.append(el('span.rt-target__k', { text: '原图' }), shapeNode(q.base, color, 'is-target'));

    this.optsEl.innerHTML = '';
    this.optsEl.style.setProperty('--n', String(this.optCount));
    const list = shuffle([{ cells: q.answer, ok: true }, ...q.decoys.map((cells) => ({ cells, ok: false }))]);
    list.forEach((o) => {
      const b = el('button.rt-opt', { onClick: () => this.choose(o.ok, b) }, [shapeNode(o.cells, color)]);
      b.dataset.ok = o.ok ? '1' : '';
      this.optsEl.appendChild(b);
    });
  }

  choose(ok, btn) {
    if (this.done || this.locked) return;
    this.locked = true;
    if (ok) {
      this.right += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      btn.classList.add('is-right');
      floatText(btn, '✓', 'var(--c-green)');
      this.sound.play(this.streak >= 4 ? 'great' : 'good');
      this.hud.patch('right', this.right);
      this.hud.patch('streak', `x${this.streak}`);
      this.later(() => this.next(), 420);
    } else {
      this.wrong += 1;
      this.streak = 0;
      btn.classList.add('is-wrong');
      this.optsEl.querySelector('[data-ok="1"]')?.classList.add('is-right');
      this.sound.play('bad');
      this.timer.addTime(-3000);
      floatText(btn, '-3秒', 'var(--c-red)');
      this.hud.patch('streak', 'x0');
      this.tip.textContent = this.useMirror ? '那个是翻面（镜像）后的样子，转不出来哦' : '再仔细比比形状';
      this.later(() => this.next(), 1300);
    }
  }

  over() {
    if (this.done) return;
    this.done = true;
    const par = { 4: 14, 5: 10, 6: 9, 7: 8 }[this.size] || 10;
    const stars = this.right >= par ? 3 : this.right >= Math.ceil(par * 0.55) ? 2 : 1;
    const total = this.right + this.wrong;
    this.finish({
      score: this.right,
      mode: 'max',
      stars,
      title: stars === 3 ? '空间转转王！' : '时间到！',
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
