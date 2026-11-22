/**
 * 找不同 —— 经典左右两幅图：随机生成场景，右图（或左图）藏着若干处差异
 * 差异类型：消失 / 变色 / 换成别的 / 少了细节 / 左右翻转 / 变小，难度越高越细微
 */
import { Game, Timer } from '../../core/Game.js';
import { el, pick, shuffle } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText, toast } from '../../ui/modal.js';
import { KINDS, KIND_IDS, BACKDROPS, drawObject } from './art.js';

const VB_W = 400;
const VB_H = 300;
const ZONES = { sky: [14, 104], ground: [146, 280] };
const NS = 'http://www.w3.org/2000/svg';

/* 各档可用的差异类型及权重（细节 / 翻转 / 缩小更难发现） */
const DIFF_WEIGHTS = {
  easy: { gone: 3, color: 3, swap: 2 },
  normal: { gone: 2, color: 2, swap: 1, part: 3, flip: 2 },
  hard: { gone: 1, color: 2, swap: 1, part: 4, flip: 3, size: 2 },
};

function weighted(table) {
  const list = Object.entries(table);
  let r = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of list) { r -= w; if (r < 0) return k; }
  return list[0][0];
}

function canApply(type, o) {
  const k = KINDS[o.kind];
  if (type === 'color') return k.colors.length > 1;
  if (type === 'part') return k.parts.length > 0;
  if (type === 'flip') return !!k.flip;
  return true;
}

function layout(count, sizeRange, night) {
  const skyN = Math.round(count * 0.38);
  const objs = [];
  const used = {};
  const kinds = (zone) => KIND_IDS.filter((id) => KINDS[id].zone === zone
    && !(night && id === 'sun') && !(!night && id === 'moon')
    && (used[id] || 0) < KINDS[id].max);
  for (let i = 0; i < count; i++) {
    const zone = i < skyN ? 'sky' : 'ground';
    const opts = kinds(zone);
    if (!opts.length) continue;
    const kind = pick(opts);
    const s = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    const r = 20 * s;
    const y0 = Math.max(ZONES[zone][0], r + 4);
    const y1 = Math.min(ZONES[zone][1], VB_H - r - 4);
    let spot = null;
    for (let t = 0; t < 160 && !spot; t++) {
      const x = r + 4 + Math.random() * (VB_W - 2 * r - 8);
      const y = y0 + Math.random() * (y1 - y0);
      if (objs.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 5)) spot = { x, y };
    }
    if (!spot) continue;
    used[kind] = (used[kind] || 0) + 1;
    objs.push({ kind, ...spot, s, r, color: pick(KINDS[kind].colors), flip: Math.random() < 0.5, hide: new Set() });
  }
  return objs.sort((a, b) => a.y - b.y);
}

const clone = (o) => ({ ...o, hide: new Set(o.hide) });

/** 在 copy 上施加一处差异，返回描述（命中半径等） */
function applyDiff(type, o) {
  const k = KINDS[o.kind];
  if (type === 'gone') return { gone: true };
  if (type === 'color') { o.color = pick(k.colors.filter((c) => c !== o.color)); return {}; }
  if (type === 'part') { o.hide.add(pick(k.parts)); return {}; }
  if (type === 'flip') { o.flip = !o.flip; return {}; }
  if (type === 'size') { o.s *= 0.7; return {}; }
  // swap：换成同区域的另一种物件
  const others = KIND_IDS.filter((id) => id !== o.kind && KINDS[id].zone === k.zone && id !== 'sun' && id !== 'moon');
  o.kind = pick(others);
  const nk = KINDS[o.kind];
  if (!nk.colors.includes(o.color)) o.color = nk.colors[0];
  o.hide = new Set();
  return {};
}

function buildScene(cfg, level) {
  const bg = pick(BACKDROPS);
  const objs = layout(cfg.objects, cfg.size, bg.night);
  const left = objs.map(clone);
  const right = objs.map(clone);
  const diffs = [];
  const table = DIFF_WEIGHTS[level] || DIFF_WEIGHTS.normal;
  const cap = Math.max(1, Math.ceil(cfg.diffs / 3));
  const usedType = {};
  const ok = (type, o) => canApply(type, o) && (usedType[type] || 0) < cap;
  const order = shuffle(objs.map((_, i) => i));
  for (const i of order) {
    if (diffs.length >= cfg.diffs) break;
    let type = weighted(table);
    for (let t = 0; t < 10 && !ok(type, objs[i]); t++) type = weighted(table);
    if (!ok(type, objs[i])) continue;
    usedType[type] = (usedType[type] || 0) + 1;
    const side = Math.random() < 0.5 ? left : right;
    const info = applyDiff(type, side[i]);
    if (info.gone) side[i] = null;
    diffs.push({ x: objs[i].x, y: objs[i].y, r: Math.max(24, objs[i].r + 8), type, found: false });
  }
  return { bg, left: left.filter(Boolean), right: right.filter(Boolean), diffs };
}

function sceneSvg(bg, objs, side) {
  return `<svg viewBox="0 0 ${VB_W} ${VB_H}" xmlns="${NS}" preserveAspectRatio="xMidYMid meet">
    ${bg.svg.replaceAll('sdSky', `sdSky${side}`)}
    <g>${objs.map(drawObject).join('')}</g>
    <g class="sd-marks"></g>
  </svg>`;
}

function mark(svg, x, y, r, cls) {
  const g = svg.querySelector('.sd-marks');
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', x.toFixed(1));
  c.setAttribute('cy', y.toFixed(1));
  c.setAttribute('r', r.toFixed(1));
  c.setAttribute('class', cls);
  g.appendChild(c);
  return c;
}

export default class OddGame extends Game {
  async mount() {
    this.level = this.options.level || 'easy';
    this.cfg = {
      objects: Number(this.options.objects || 10),
      diffs: Number(this.options.diffs || 3),
      size: this.options.size || [0.95, 1.25],
    };
    this.rounds = Number(this.options.rounds || 3);
    this.duration = Number(this.options.time || 50000);
    this.round = 0;
    this.score = 0;
    this.found = 0;
    this.misses = 0;
    this.hints = 3;
    this.hintsUsed = 0;
    this.done = false;
    this.locked = true;
    this.timer = null;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    this.hintBtn = el('button.btn.btn--sm.btn--ghost', { text: `💡 提示 ×${this.hints}`, onClick: () => this.hint() });
    this.root.appendChild(controlRow([lv, this.hintBtn]));

    this.stageEl = el('div.sd-stage.fit-box');
    this.panels = [el('div.sd-panel'), el('div.sd-panel')];
    this.panels.forEach((p) => {
      this.stageEl.appendChild(p);
      this.on(p, 'pointerdown', (e) => this.tap(p, e));
    });
    this.tip = el('div.pill', { text: '两幅图有几处不一样，点任意一幅都算' });
    this.root.append(this.stageEl, this.tip);

    this.hud.set([
      { key: 'time', label: '剩余', value: `${Math.round(this.duration / 1000)}s` },
      { key: 'found', label: '找到', value: `0/${this.cfg.diffs}` },
      { key: 'score', label: '得分', value: '0' },
    ]);
    this.hud.show();
    this.load();
  }

  start() { this.beginRound(); }

  load() {
    let scene = buildScene(this.cfg, this.level);
    for (let t = 0; t < 8 && scene.diffs.length < this.cfg.diffs; t++) scene = buildScene(this.cfg, this.level);
    this.scene = scene;
    this.panels[0].innerHTML = sceneSvg(scene.bg, scene.left, 'L');
    this.panels[1].innerHTML = sceneSvg(scene.bg, scene.right, 'R');
    this.panels.forEach((p) => { p.classList.remove('pop-in'); void p.offsetWidth; p.classList.add('pop-in'); });
    this.hud.patch('found', `0/${scene.diffs.length}`);
    this.tip.textContent = `第 ${this.round + 1}/${this.rounds} 关 · 找出 ${scene.diffs.length} 处不同，点任意一幅都算`;
  }

  beginRound() {
    this.locked = false;
    this.timer?.stop();
    this.timer = new Timer(this);
    this.timer.startCountdown(this.duration, (left) => {
      this.hud.patch('time', `${Math.ceil(left / 1000)}s`, left <= 10000);
    }, () => this.timeUp());
  }

  toVb(panel, e) {
    const svg = panel.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const k = Math.min(r.width / VB_W, r.height / VB_H);
    const ox = r.left + (r.width - VB_W * k) / 2;
    const oy = r.top + (r.height - VB_H * k) / 2;
    return { x: (e.clientX - ox) / k, y: (e.clientY - oy) / k };
  }

  tap(panel, e) {
    if (this.done || this.locked) return;
    const p = this.toVb(panel, e);
    const near = (d) => Math.hypot(d.x - p.x, d.y - p.y) <= d.r;
    const hit = this.scene.diffs
      .filter((d) => !d.found && near(d))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (hit) return this.hitDiff(hit, panel);
    if (this.scene.diffs.some((d) => d.found && near(d))) return;
    this.miss(panel, p);
  }

  hitDiff(d, panel) {
    d.found = true;
    this.found += 1;
    this.score += 10;
    this.panels.forEach((pn) => {
      pn.querySelectorAll('.sd-hint').forEach((n) => n.remove());
      mark(pn.querySelector('svg'), d.x, d.y, d.r, 'sd-ring');
    });
    floatText(panel, '+10', 'var(--c-green)');
    this.sound.play('good');
    const left = this.scene.diffs.filter((x) => !x.found).length;
    const total = this.scene.diffs.length;
    this.hud.patch('found', `${total - left}/${total}`);
    this.hud.patch('score', this.score);
    this.tip.textContent = left ? `还差 ${left} 处` : '全部找到啦！';
    if (!left) this.clearRound();
  }

  miss(panel, p) {
    this.misses += 1;
    this.sound.play('bad');
    this.timer?.addTime(-3000);
    const x = mark(panel.querySelector('svg'), p.x, p.y, 10, 'sd-miss');
    this.later(() => x.remove(), 600);
    floatText(panel, '-3秒', 'var(--c-red)');
    this.tip.textContent = '那里一样哦，再仔细比比';
  }

  hint() {
    if (this.done || this.locked || this.hints <= 0) return;
    const d = this.scene.diffs.find((x) => !x.found);
    if (!d) return;
    this.hints -= 1;
    this.hintsUsed += 1;
    this.hintBtn.textContent = `💡 提示 ×${this.hints}`;
    this.hintBtn.disabled = this.hints <= 0;
    this.timer?.addTime(-5000);
    this.panels.forEach((pn) => mark(pn.querySelector('svg'), d.x, d.y, d.r + 14, 'sd-hint'));
    this.tip.textContent = '看看发光的地方（扣 5 秒）';
  }

  clearRound() {
    this.locked = true;
    const sec = Math.ceil((this.timer?.left || 0) / 1000);
    this.timer?.stop();
    this.score += sec;
    this.hud.patch('score', this.score);
    this.sound.play('great');
    toast(`🎉 第 ${this.round + 1} 关完成，剩余时间 +${sec} 分`, 1400);
    this.later(() => this.nextRound(), 1500);
  }

  timeUp() {
    if (this.locked) return;
    this.locked = true;
    this.sound.play('bad');
    this.scene.diffs.filter((d) => !d.found).forEach((d) => {
      this.panels.forEach((pn) => mark(pn.querySelector('svg'), d.x, d.y, d.r, 'sd-reveal'));
    });
    this.tip.textContent = '时间到，橙色圈是没找到的地方';
    this.later(() => this.nextRound(), 2200);
  }

  nextRound() {
    if (this.done) return;
    this.round += 1;
    if (this.round >= this.rounds) return this.over();
    this.load();
    this.beginRound();
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer?.stop();
    const total = this.rounds * this.cfg.diffs;
    const ratio = this.found / total;
    const stars = ratio >= 1 && this.hintsUsed === 0 && this.misses <= this.rounds ? 3 : ratio >= 0.75 ? 2 : 1;
    this.finish({
      score: this.score,
      mode: 'max',
      stars,
      title: stars === 3 ? '火眼金睛！' : ratio >= 1 ? '全部找到！' : '挑战结束',
      message: `找到 ${this.found}/${total} 处不同`,
      speak: `找到 ${this.found} 处，得分 ${this.score}`,
      stats: [
        { label: '找到', value: `${this.found}/${total}` },
        { label: '点错', value: this.misses },
        { label: '提示', value: this.hintsUsed },
      ],
    });
  }

  destroy() { this.timer?.stop(); }
}
