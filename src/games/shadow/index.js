/**
 * 影子观察 —— 灯从正上方 / 左前方 / 右前方照向一堆积木，选出地面或墙上的影子
 * 挑战档混入反问：给出几个影子，找出「不可能」照出来的那个
 *
 * 坐标：x 向右前，y 向左前，z 向上；P() 为等轴测投影（与「数积木」一致）
 *   右墙 = y=0 平面（左前方的灯照到这里）  影子 = 每个 x 上的最高高度
 *   左墙 = x=0 平面（右前方的灯照到这里）  影子 = 每个 y 上的最高高度
 *   地面 = z=0 平面（顶灯）                影子 = 有积木的格子
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
const P = (x, y, z) => [(x - y) * COS, (x + y) * 0.5 - z];
const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

const PLANES = {
  floor: { name: '地面', light: '正上方', ask: '灯从正上方照下来，地面上的影子是？' },
  wallR: { name: '右墙', light: '左前方', ask: '灯从左前方照过来，右边墙上的影子是？' },
  wallL: { name: '左墙', light: '右前方', ask: '灯从右前方照过来，左边墙上的影子是？' },
};

/* ---------------- 结构生成 ---------------- */
function connected(h, w, d) {
  const cells = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) if (h[x][y] > 0) cells.push([x, y]);
  if (!cells.length) return false;
  const seen = new Set([cells[0].join()]);
  const stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= d || !h[nx][ny] || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      stack.push([nx, ny]);
    }
  }
  return seen.size === cells.length;
}

/** 从这个视角看过去，每根柱子的顶面都不会被前面更高的柱子整个挡住 */
function visible(h, w, d) {
  const at = (x, y) => (x < w && y < d ? h[x][y] : 0);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < d; y++) {
      if (at(x + 1, y + 1) > h[x][y]) return false;
      if (at(x + 1, y) > h[x][y] && at(x, y + 1) > h[x][y]) return false;
    }
  }
  return true;
}

function shadows(h, w, d) {
  const floor = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) floor.push(h[x][y] > 0 ? 1 : 0);
  const wallR = Array.from({ length: w }, (_, x) => Math.max(...h[x]));
  const wallL = Array.from({ length: d }, (_, y) => Math.max(...h.map((col) => col[y])));
  return { floor, wallR, wallL };
}

function makeStructure(w, d, H) {
  for (let t = 0; t < 600; t++) {
    const h = Array.from({ length: w }, () => Array.from({ length: d }, () => (Math.random() < 0.28 ? 0 : randInt(1, H))));
    if (!visible(h, w, d) || !connected(h, w, d)) continue;
    const s = shadows(h, w, d);
    const total = h.flat().reduce((a, b) => a + b, 0);
    if (total < Math.max(3, w * d * 0.6)) continue;
    // 至少要有点看头：地面不是满格，或者墙上的影子高低不一
    const varied = (arr) => new Set(arr).size > 1;
    if (!s.floor.includes(0) && !varied(s.wallR) && !varied(s.wallL)) continue;
    return { h, s };
  }
  return { h: [[2, 1], [1, 0]], s: shadows([[2, 1], [1, 0]], 2, 2) };
}

/* ---------------- 干扰项 ---------------- */
const keyOf = (plane, data) => `${plane}:${data.join('')}`;

function floorVariants(data, w, d) {
  const get = (x, y) => data[x * d + y];
  const build = (fn) => { const out = []; for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) out.push(fn(x, y)); return out; };
  const list = [
    { data: build((x, y) => get(w - 1 - x, y)), why: 'mirror' },
    { data: build((x, y) => get(x, d - 1 - y)), why: 'mirror' },
    { data: build((x, y) => get(w - 1 - x, d - 1 - y)), why: 'mirror' },
  ];
  for (let i = 0; i < 6; i++) {
    const out = data.slice();
    const flips = randInt(1, 2);
    for (let k = 0; k < flips; k++) { const j = randInt(0, out.length - 1); out[j] = out[j] ? 0 : 1; }
    if (out.some(Boolean)) list.push({ data: out, why: 'count' });
  }
  return list;
}

function wallVariants(data, H, other) {
  const list = [{ data: data.slice().reverse(), why: 'mirror' }];
  if (other && other.length === data.length) list.push({ data: other.slice(), why: 'other' });
  for (let i = 0; i < 6; i++) {
    const out = data.slice();
    const n = randInt(1, 2);
    for (let k = 0; k < n; k++) {
      const j = randInt(0, out.length - 1);
      out[j] = Math.max(0, Math.min(H, out[j] + pick([-1, 1])));
    }
    if (out.some(Boolean)) list.push({ data: out, why: 'count' });
  }
  return list;
}

function variants(plane, s, w, d, H) {
  if (plane === 'floor') return floorVariants(s.floor, w, d);
  return wallVariants(s[plane], H, plane === 'wallR' ? s.wallL : s.wallR);
}

/* ---------------- 绘制 ---------------- */
function planeCells(plane, w, d, H) {
  const cells = [];
  if (plane === 'floor') {
    for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) cells.push([P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)]);
  } else if (plane === 'wallR') {
    for (let x = 0; x < w; x++) for (let z = 0; z < H; z++) cells.push({ i: x, z, poly: [P(x, 0, z), P(x + 1, 0, z), P(x + 1, 0, z + 1), P(x, 0, z + 1)] });
  } else {
    for (let y = 0; y < d; y++) for (let z = 0; z < H; z++) cells.push({ i: y, z, poly: [P(0, y, z), P(0, y + 1, z), P(0, y + 1, z + 1), P(0, y, z + 1)] });
  }
  return cells;
}

function planeOutline(plane, w, d, H) {
  if (plane === 'floor') return [P(0, 0, 0), P(w, 0, 0), P(w, d, 0), P(0, d, 0)];
  if (plane === 'wallR') return [P(0, 0, 0), P(w, 0, 0), P(w, 0, H), P(0, 0, H)];
  return [P(0, 0, 0), P(0, d, 0), P(0, d, H), P(0, 0, H)];
}

/** 一块墙 / 地面，data 给出时把影子格涂黑 */
function planeSvg(plane, w, d, H, data, cls = '') {
  const cells = planeCells(plane, w, d, H);
  const filled = (c, idx) => {
    if (!data) return false;
    if (plane === 'floor') return !!data[idx];
    return c.z < data[c.i];
  };
  const body = cells.map((c, idx) => {
    const poly = plane === 'floor' ? c : c.poly;
    return `<polygon points="${pts(poly)}" class="${filled(c, idx) ? 'sh-dark' : 'sh-cell'}"/>`;
  }).join('');
  return `<g class="sh-plane ${cls}"><polygon points="${pts(planeOutline(plane, w, d, H))}" class="sh-base"/>${body}</g>`;
}

function bounds(points, pad) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs) - pad; const minY = Math.min(...ys) - pad;
  return `${minX.toFixed(3)} ${minY.toFixed(3)} ${(Math.max(...xs) - minX + pad).toFixed(3)} ${(Math.max(...ys) - minY + pad).toFixed(3)}`;
}

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = []; const upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function lampParts(plane, w, d, H) {
  const zc = H * 0.5 + 0.3;
  if (plane === 'floor') {
    const lamp = P(w / 2, d / 2, H + 2.4);
    const face = [P(0, 0, H), P(w, 0, H), P(w, d, H), P(0, d, H)];
    return { lamp, face };
  }
  if (plane === 'wallR') {
    const lamp = P(w / 2, d + 2.8, zc);
    const face = [P(0, d, 0), P(w, d, 0), P(w, d, H), P(0, d, H)];
    return { lamp, face };
  }
  const lamp = P(w + 2.8, d / 2, zc);
  const face = [P(w, 0, 0), P(w, d, 0), P(w, d, H), P(w, 0, H)];
  return { lamp, face };
}

function sceneSvg(h, w, d, H, pal, target) {
  const cubes = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) for (let z = 0; z < h[x][y]; z++) cubes.push([x, y, z]);
  cubes.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
  const faces = cubes.map(([x, y, z]) => {
    const top = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    const right = [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)];
    const left = [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
    return `<polygon points="${pts(left)}" fill="${pal.left}"/><polygon points="${pts(right)}" fill="${pal.right}"/><polygon points="${pts(top)}" fill="${pal.top}"/>`;
  }).join('');

  const all = [...planeOutline('floor', w, d, H), ...planeOutline('wallR', w, d, H), ...planeOutline('wallL', w, d, H),
    P(w, d, 0), P(w, 0, H), P(0, d, H)];
  let extra = '';
  let beamSvg = '';
  if (target) {
    const { lamp, face } = lampParts(target, w, d, H);
    all.push(lamp);
    const out = planeOutline(target, w, d, H);
    const c = out.reduce((a, p) => [a[0] + p[0] / out.length, a[1] + p[1] / out.length], [0, 0]);
    // 光束画在积木下面：只在积木外沿露出一圈，像灯光照过来
    beamSvg = `<polygon points="${pts(hull([lamp, ...face]))}" fill="url(#shBeam)" opacity=".5"/>`;
    extra = `<circle cx="${lamp[0]}" cy="${lamp[1]}" r="0.9" fill="url(#shGlow)"/>
      <circle cx="${lamp[0]}" cy="${lamp[1]}" r="0.36" fill="#fff4c2" stroke="#ffd166" stroke-width="0.08"/>
      ${target === 'floor' ? '' : `<text x="${c[0]}" y="${c[1]}" class="sh-q-mark" text-anchor="middle" dominant-baseline="central">?</text>`}`;
  }
  const targetOutline = target
    ? `<polygon points="${pts(planeOutline(target, w, d, H))}" class="sh-target"/>` : '';
  const [lx, ly] = target ? lampParts(target, w, d, H).lamp : [0, 0];
  return `<svg viewBox="${bounds(all, 0.5)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <radialGradient id="shGlow"><stop offset="0" stop-color="#ffe27a" stop-opacity=".95"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
      <radialGradient id="shBeam" gradientUnits="userSpaceOnUse" cx="${lx}" cy="${ly}" r="${w + d + H}"><stop offset="0" stop-color="#ffe9a3" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a3" stop-opacity="0"/></radialGradient>
    </defs>
    ${planeSvg('wallL', w, d, H)}${planeSvg('wallR', w, d, H)}${planeSvg('floor', w, d, H)}
    ${targetOutline}${beamSvg}
    <g stroke="rgba(8,14,40,.55)" stroke-width="0.035" stroke-linejoin="round">${faces}</g>
    ${extra}
  </svg>`;
}

function optionSvg(plane, w, d, H, data) {
  const outline = planeOutline(plane, w, d, H);
  return `<svg viewBox="${bounds(outline, 0.25)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${planeSvg(plane, w, d, H, data)}</svg>`;
}

/* ---------------- 游戏 ---------------- */
export default class ShadowGame extends Game {
  async mount() {
    this.w = Number(this.options.w || 3);
    this.d = Number(this.options.d || 2);
    this.H = Number(this.options.h || 2);
    this.optCount = Number(this.options.opts || 3);
    this.notRate = Number(this.options.not || 0);
    this.rounds = Number(this.options.rounds || 8);
    this.idx = 0;
    this.right = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.locked = false;
    this.lastPlane = null;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.stageEl = el('div.sh-stage.fit-box');
    this.view = el('div.sh-view');
    this.ask = el('div.sh-ask');
    this.opts = el('div.sh-opts');
    this.stageEl.append(this.view, el('div.sh-side', {}, [this.ask, this.opts]));
    this.tip = el('div.pill', { text: '灯在哪边，影子就在对面' });
    this.root.append(this.stageEl, this.tip);

    this.hud.set([
      { key: 'q', label: '题目', value: `1/${this.rounds}` },
      { key: 'right', label: '答对', value: '0' },
      { key: 'score', label: '得分', value: '0' },
    ]);
    this.hud.show();
    this.next();
  }

  question() {
    const { w, d, H } = this;
    for (let t = 0; t < 40; t++) {
      const { h, s } = makeStructure(w, d, H);
      if (Math.random() < this.notRate) {
        const fakePlane = pick(Object.keys(PLANES));
        const truthKey = keyOf(fakePlane, s[fakePlane]);
        const fake = shuffle(variants(fakePlane, s, w, d, H)).find((v) => keyOf(fakePlane, v.data) !== truthKey);
        if (!fake) continue;
        const list = Object.keys(PLANES).map((p) => ({ plane: p, data: s[p], ok: false }));
        list.push({ plane: fakePlane, data: fake.data, ok: true, why: fake.why });
        return { h, mode: 'not', options: shuffle(list).slice(0, Math.max(this.optCount, 4)) };
      }
      const planes = Object.keys(PLANES).filter((p) => p !== this.lastPlane);
      const plane = pick(planes);
      const truth = { plane, data: s[plane], ok: true };
      const seen = new Set([keyOf(plane, truth.data)]);
      // 先放「镜像 / 另一面墙」这类迷惑项，再用改了格子的补齐
      const pool = variants(plane, s, w, d, H);
      const ordered = [...shuffle(pool.filter((v) => v.why !== 'count')), ...shuffle(pool.filter((v) => v.why === 'count'))];
      const decoys = [];
      for (const v of ordered) {
        if (decoys.length >= this.optCount - 1) break;
        const k = keyOf(plane, v.data);
        if (seen.has(k)) continue;
        seen.add(k);
        decoys.push({ plane, data: v.data, ok: false, why: v.why });
      }
      if (decoys.length < this.optCount - 1) continue;
      this.lastPlane = plane;
      return { h, mode: 'is', plane, options: shuffle([truth, ...decoys]) };
    }
    return null;
  }

  next() {
    if (this.idx >= this.rounds) return this.over();
    const q = this.question();
    if (!q) return this.over();
    this.q = q;
    this.locked = false;
    const { w, d, H } = this;
    this.view.innerHTML = sceneSvg(q.h, w, d, H, pick(PALETTES), q.mode === 'is' ? q.plane : null);
    this.view.classList.remove('pop-in');
    void this.view.offsetWidth;
    this.view.classList.add('pop-in');
    this.ask.innerHTML = q.mode === 'is'
      ? `💡 ${PLANES[q.plane].ask}`
      : '🤔 灯可以从<b>正上方、左前方、右前方</b>照，下面哪个影子<b>不可能</b>出现？';
    this.ask.classList.toggle('is-not', q.mode === 'not');

    this.opts.innerHTML = '';
    this.opts.style.setProperty('--n', String(q.options.length));
    this.stageEl.classList.toggle('is-4', q.options.length >= 4);
    q.options.forEach((o) => {
      const kids = [el('div.sh-opt__img', { html: optionSvg(o.plane, w, d, H, o.data) })];
      if (q.mode === 'not') kids.push(el('span.sh-opt__k', { text: `${PLANES[o.plane].name} · 灯在${PLANES[o.plane].light}` }));
      const b = el('button.sh-opt', { onClick: () => this.choose(o, b) }, kids);
      b.dataset.ok = o.ok ? '1' : '';
      this.opts.appendChild(b);
    });
    this.hud.patch('q', `${this.idx + 1}/${this.rounds}`);
    this.t0 = performance.now();
  }

  choose(o, btn) {
    if (this.locked) return;
    this.locked = true;
    this.idx += 1;
    if (o.ok) {
      this.right += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const sec = (performance.now() - this.t0) / 1000;
      const gain = 10 + Math.max(0, Math.round(12 - sec));
      this.score += gain;
      btn.classList.add('is-right');
      floatText(btn, `+${gain}`);
      this.sound.play(this.streak >= 4 ? 'great' : 'good');
      this.tip.textContent = sec < 5 ? '又快又准！' : '答对了！';
      this.later(() => this.next(), 700);
    } else {
      this.streak = 0;
      btn.classList.add('is-wrong');
      this.opts.querySelector('[data-ok="1"]')?.classList.add('is-right');
      this.sound.play('bad');
      this.tip.textContent = this.q.mode === 'not'
        ? `这个能照出来（${PLANES[o.plane].name}的影子），绿色那个才不可能`
        : ({ mirror: '方向反了，像照镜子一样，对照积木看看左右', other: '这是另一面墙上的影子哦', count: '格子不对，数一数每一列最高有几块' }[o.why] || '再仔细对照一下');
      this.later(() => this.next(), 2000);
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
      title: stars === 3 ? '影子侦探！' : '观察完毕',
      message: `${this.rounds} 题答对 ${this.right} 题`,
      speak: `答对 ${this.right} 题，得分 ${this.score}`,
      stats: [
        { label: '答对', value: `${this.right}/${this.rounds}` },
        { label: '得分', value: this.score },
        { label: '最高连对', value: `x${this.bestStreak}` },
      ],
    });
  }
}
