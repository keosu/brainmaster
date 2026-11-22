/**
 * 迷宫探险 —— 随机生成的完美迷宫（任意两点间只有一条路）
 * 滑一下 / 方向键 / 方向按钮：小老鼠会沿通道一直跑，直到岔路口或死胡同才停
 */
import { Game, Timer } from '../../core/Game.js';
import { el, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';

const N = 1, E = 2, S = 4, W = 8;
const DIR = {
  up: { bit: N, dr: -1, dc: 0, opp: S },
  right: { bit: E, dr: 0, dc: 1, opp: W },
  down: { bit: S, dr: 1, dc: 0, opp: N },
  left: { bit: W, dr: 0, dc: -1, opp: E },
};
const KEYMAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
};

/** 迭代式深度优先生成迷宫，cells[i] 的位表示该方向是"通的" */
function generate(n) {
  const cells = new Array(n * n).fill(0);
  const seen = new Array(n * n).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / n), c = cur % n;
    const opts = shuffle(Object.values(DIR)).filter((d) => {
      const rr = r + d.dr, cc = c + d.dc;
      return rr >= 0 && rr < n && cc >= 0 && cc < n && !seen[rr * n + cc];
    });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[0];
    const nxt = (r + d.dr) * n + c + d.dc;
    cells[cur] |= d.bit;
    cells[nxt] |= d.opp;
    seen[nxt] = true;
    stack.push(nxt);
  }
  return cells;
}

function renderWalls(cells, n) {
  const segs = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = cells[r * n + c];
      if (!(v & N)) segs.push(`M${c} ${r}h1`);
      if (!(v & W)) segs.push(`M${c} ${r}v1`);
      if (r === n - 1 && !(v & S)) segs.push(`M${c} ${r + 1}h1`);
      if (c === n - 1 && !(v & E)) segs.push(`M${c + 1} ${r}v1`);
    }
  }
  return segs.join('');
}

export default class MazeGame extends Game {
  async mount() {
    this.n = Number(this.options.n || 8);
    this.cells = generate(this.n);
    this.pos = 0;
    this.goal = this.n * this.n - 1;
    this.path = [0];
    this.moves = 0;
    this.busy = false;
    this.queued = null;
    this.done = false;
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 换一个迷宫', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    const n = this.n;
    const sw = n <= 8 ? 0.14 : n <= 12 ? 0.12 : 0.1;
    this.board = el('div.mz-board.fit-box', { style: { '--n': String(n) } });
    this.board.innerHTML = `<svg class="mz-svg" viewBox="-0.2 -0.2 ${n + 0.4} ${n + 0.4}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${n - 1}" y="${n - 1}" width="1" height="1" rx="0.2" fill="rgba(255,209,102,.18)"/>
      <rect x="0" y="0" width="1" height="1" rx="0.2" fill="rgba(110,231,255,.14)"/>
      <polyline class="mz-trail" fill="none" stroke="rgba(110,231,255,.55)" stroke-width="${Math.max(0.16, sw * 1.6)}" stroke-linecap="round" stroke-linejoin="round" points="0.5,0.5"/>
      <path d="${renderWalls(this.cells, n)}" fill="none" stroke="#8fb4ff" stroke-width="${sw}" stroke-linecap="round"/>
    </svg>`;
    this.trail = this.board.querySelector('.mz-trail');
    this.goalEl = el('div.mz-sprite.mz-goal', { text: '🧀', style: { '--r': String(n - 1), '--c': String(n - 1) } });
    this.hero = el('div.mz-sprite.mz-hero', { text: '🐭', style: { '--r': '0', '--c': '0' } });
    this.board.append(this.goalEl, this.hero);

    const pad = el('div.mz-pad', {}, ['up', 'left', 'right', 'down'].map((d) => el(`button.mz-key.mz-key--${d}`, {
      'aria-label': d,
      text: { up: '▲', down: '▼', left: '◀', right: '▶' }[d],
      onPointerdown: (e) => { e.preventDefault(); this.go(d); },
    })));
    this.tip = el('div.pill', { text: '在迷宫上滑动，或用方向键，帮小老鼠找到奶酪' });
    this.root.append(this.board, pad, this.tip);

    this.hud.set([
      { key: 'time', label: '用时', value: '0.0s' },
      { key: 'moves', label: '滑动次数', value: '0' },
      { key: 'size', label: '迷宫', value: `${n}×${n}` },
    ]);
    this.hud.show();
    this.bindInput();
  }

  bindInput() {
    this.on(window, 'keydown', (e) => {
      const d = KEYMAP[e.key];
      if (!d) return;
      e.preventDefault();
      this.go(d);
    });
    let sx = 0, sy = 0, active = false;
    this.on(this.board, 'pointerdown', (e) => { active = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); });
    this.on(window, 'pointermove', (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      // 拖动中也能连续转向：每超过阈值就触发一次，并以当前位置为新起点
      this.go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      sx = e.clientX; sy = e.clientY;
    });
    this.on(window, 'pointerup', () => { active = false; });
  }

  open(i, d) { return (this.cells[i] & DIR[d].bit) !== 0; }

  degree(i) {
    let k = 0;
    for (const d of Object.keys(DIR)) if (this.open(i, d)) k += 1;
    return k;
  }

  step(i, d) { return i + DIR[d].dr * this.n + DIR[d].dc; }

  go(d) {
    if (this.done) return;
    if (this.busy) { this.queued = d; return; }
    if (!this.open(this.pos, d)) {
      this.hero.classList.remove('is-bump');
      void this.hero.offsetWidth;
      this.hero.classList.add('is-bump');
      this.sound.play('tap');
      return;
    }
    if (!this.timer.running) this.timer.startCountUp((ms) => this.hud.patch('time', `${(ms / 1000).toFixed(1)}s`));
    // 沿通道一路跑：遇到拐角自动转弯，遇到岔路 / 死胡同 / 终点停下
    const route = [];
    let cur = this.pos;
    let dir = d;
    for (let guard = 0; guard < this.n * this.n; guard++) {
      const nxt = this.step(cur, dir);
      route.push(nxt);
      cur = nxt;
      if (cur === this.goal || this.degree(cur) !== 2) break;
      const back = Object.keys(DIR).find((k) => DIR[k].bit === DIR[dir].opp);
      dir = Object.keys(DIR).find((k) => k !== back && this.open(cur, k));
    }
    this.moves += 1;
    this.hud.patch('moves', this.moves);
    this.sound.play('slide');
    this.busy = true;
    const stepMs = 55;
    route.forEach((cell, k) => this.later(() => this.moveTo(cell), k * stepMs));
    this.later(() => {
      this.busy = false;
      if (this.pos === this.goal) return this.win();
      if (this.queued) { const q = this.queued; this.queued = null; this.go(q); }
    }, route.length * stepMs + 10);
  }

  moveTo(cell) {
    this.pos = cell;
    // 原路返回时把轨迹收回来，只显示当前这条路
    if (this.path.length > 1 && this.path[this.path.length - 2] === cell) this.path.pop();
    else this.path.push(cell);
    const r = Math.floor(cell / this.n), c = cell % this.n;
    this.hero.style.setProperty('--r', String(r));
    this.hero.style.setProperty('--c', String(c));
    this.trail.setAttribute('points', this.path.map((p) => `${(p % this.n) + 0.5},${Math.floor(p / this.n) + 0.5}`).join(' '));
  }

  win() {
    this.done = true;
    this.timer.stop();
    this.goalEl.classList.add('is-eaten');
    this.hero.classList.add('is-win');
    this.sound.play('win');
    const sec = Number(((this.timer.ms || 0) / 1000).toFixed(1));
    const par = { 8: 15, 12: 32, 16: 55 }[this.n] || this.n * 3;
    const stars = sec <= par ? 3 : sec <= par * 1.8 ? 2 : 1;
    this.later(() => this.finish({
      score: sec,
      mode: 'min',
      stars,
      title: '找到奶酪啦！',
      message: `${this.n}×${this.n} 迷宫 · 用时 ${sec} 秒 · 滑动 ${this.moves} 次`,
      speak: `找到奶酪，用时 ${sec} 秒`,
      stats: [
        { label: '用时', value: `${sec}s` },
        { label: '滑动次数', value: this.moves },
        { label: '路线长度', value: this.path.length - 1 },
      ],
    }), 500);
  }
}
