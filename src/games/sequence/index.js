/**
 * 找规律 —— 数列 / 图案序列填空。三档题库，答错时讲解规律
 */
import { Game } from '../../core/Game.js';
import { el, randInt, shuffle, pick } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { floatText } from '../../ui/modal.js';

const EMOJI_SETS = [
  ['🍎', '🍌', '🍇', '🍓'], ['🐶', '🐱', '🐰', '🐻'], ['🔴', '🔵', '🟡', '🟢'],
  ['⭐', '🌙', '☀️', '☁️'], ['🚗', '🚌', '🚲', '🚀'], ['🔺', '🟦', '⚪', '💠'],
];

/* ---------------- 题目生成器：返回 { seq, answer, rule, kind } ---------------- */
function emojiPattern(patterns) {
  const set = shuffle(pick(EMOJI_SETS));
  const pat = pick(patterns);
  const len = Math.max(7, pat.length * 2 + 1);
  const seq = Array.from({ length: len }, (_, i) => set[pat.charCodeAt(i % pat.length) - 65]);
  return { seq, rule: `按「${pat.split('').map((ch) => set[ch.charCodeAt(0) - 65]).join('')}」的顺序一直重复`, kind: 'emoji', pool: set.slice(0, new Set(pat).size + 1) };
}

function arith(startMin, startMax, dChoices, len = 5) {
  const d = pick(dChoices);
  let a = randInt(startMin, startMax);
  if (d < 0) a += Math.abs(d) * len;
  const seq = Array.from({ length: len }, (_, i) => a + d * i);
  return { seq, rule: d > 0 ? `每次加 ${d}` : `每次减 ${-d}` };
}

const TIER = {
  1: [
    () => emojiPattern(['AB', 'ABC', 'AAB', 'ABB']),
    () => arith(1, 10, [1, 2, 5, 10]),
    () => arith(1, 6, [-1, -2]),
    () => arith(0, 5, [2, 3]),
  ],
  2: [
    () => emojiPattern(['ABCD', 'AABB', 'ABAC', 'ABBC']),
    () => arith(1, 20, [3, 4, 6, 7, 9]),
    () => arith(1, 10, [-3, -4, -5]),
    () => {
      const a = randInt(1, 4);
      const r = pick([2, 2, 3]);
      return { seq: Array.from({ length: 5 }, (_, i) => a * r ** i), rule: `每次乘 ${r}` };
    },
    () => {
      const x = randInt(1, 5), y = randInt(1, 5);
      const seq = [randInt(1, 9)];
      for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? x : y));
      return { seq, rule: x === y ? `每次加 ${x}` : `轮流加 ${x}、加 ${y}` };
    },
    () => {
      const a = randInt(1, 6);
      const seq = [a];
      for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + i);
      return { seq, rule: '加的数一次比一次多 1（+1、+2、+3…）' };
    },
  ],
  3: [
    () => {
      const s = randInt(1, 4);
      return { seq: Array.from({ length: 5 }, (_, i) => (s + i) ** 2), rule: '依次是平方数（n×n）' };
    },
    () => {
      const seq = [randInt(1, 3), randInt(1, 4)];
      while (seq.length < 7) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      return { seq, rule: '每个数等于前两个数之和' };
    },
    () => {
      const a = randInt(1, 3);
      const seq = [a];
      for (let i = 1; i < 5; i++) seq.push(seq[i - 1] * 2 + 1);
      return { seq, rule: '每次乘 2 再加 1' };
    },
    () => {
      const a = randInt(10, 20), b = randInt(1, 5);
      const seq = [];
      for (let i = 0; i < 7; i++) seq.push(i % 2 === 0 ? a - i : b + i);
      return { seq, rule: '单数位和双数位是两串数：一串每次减 2，一串每次加 2' };
    },
    () => {
      const r = pick([2, 3]);
      const a = randInt(2, 4) * r ** 4;
      return { seq: Array.from({ length: 5 }, (_, i) => a / r ** i), rule: `每次除以 ${r}` };
    },
    () => {
      const a = randInt(1, 5);
      const seq = [a];
      for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + 2 * i);
      return { seq, rule: '加的数依次是 2、4、6、8…' };
    },
  ],
};

function makeQuestion(tier) {
  const pool = [...TIER[tier], ...(tier > 1 ? TIER[tier - 1].slice(1, 3) : [])];
  const q = pick(pool)();
  const blank = q.kind === 'emoji'
    ? randInt(q.seq.length - 3, q.seq.length - 1)
    : randInt(Math.min(2, q.seq.length - 1), q.seq.length - 1);
  const answer = q.seq[blank];
  let options;
  if (q.kind === 'emoji') {
    options = shuffle(q.pool.includes(answer) ? q.pool : [answer, ...q.pool.slice(0, 3)]).slice(0, 4);
    if (!options.includes(answer)) options[0] = answer;
  } else {
    const set = new Set([answer]);
    const deltas = shuffle([1, -1, 2, -2, 3, 5, -5, 10]);
    for (const d of deltas) { if (set.size >= 4) break; if (answer + d >= 0) set.add(answer + d); }
    options = Array.from(set);
  }
  return { ...q, blank, answer, options: shuffle(options) };
}

export default class SequenceGame extends Game {
  async mount() {
    this.tier = Number(this.options.tier || 1);
    this.rounds = Number(this.options.rounds || 10);
    this.idx = 0;
    this.right = 0;
    this.score = 0;
    this.locked = false;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.stageEl = el('div.sq-stage.fit-box');
    this.seqEl = el('div.sq-seq');
    this.optsEl = el('div.sq-opts');
    this.stageEl.append(el('div.sq-ask', { text: '问号处应该是什么？' }), this.seqEl, this.optsEl);
    this.tip = el('div.pill', { text: '找出这串数字（或图案）的变化规律' });
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
    const q = makeQuestion(this.tier);
    this.q = q;
    this.seqEl.innerHTML = '';
    this.seqEl.classList.toggle('is-emoji', q.kind === 'emoji');
    this.seqEl.style.setProperty('--count', String(q.seq.length));
    q.seq.forEach((v, i) => {
      const item = el(`div.sq-item${i === q.blank ? '.is-blank' : ''}`, { text: i === q.blank ? '?' : String(v) });
      item.style.animationDelay = `${i * 50}ms`;
      this.seqEl.appendChild(item);
    });
    this.optsEl.innerHTML = '';
    this.optsEl.classList.toggle('is-emoji', q.kind === 'emoji');
    q.options.forEach((v) => {
      const b = el('button.sq-opt', { text: String(v), onClick: () => this.choose(v, b) });
      this.optsEl.appendChild(b);
    });
    this.hud.patch('q', `${this.idx + 1}/${this.rounds}`);
    this.t0 = performance.now();
  }

  choose(v, btn) {
    if (this.locked) return;
    this.locked = true;
    this.idx += 1;
    const blankEl = this.seqEl.children[this.q.blank];
    blankEl.textContent = String(this.q.answer);
    blankEl.classList.add('is-filled');
    if (v === this.q.answer) {
      this.right += 1;
      const sec = (performance.now() - this.t0) / 1000;
      const gain = 10 + Math.max(0, Math.round(8 - sec));
      this.score += gain;
      btn.classList.add('is-right');
      floatText(btn, `+${gain}`);
      this.sound.play('good');
      this.tip.textContent = `答对了！规律：${this.q.rule}`;
      this.later(() => this.next(), 900);
    } else {
      btn.classList.add('is-wrong');
      Array.from(this.optsEl.children).find((b) => b.textContent === String(this.q.answer))?.classList.add('is-right');
      blankEl.classList.add('is-miss');
      this.sound.play('bad');
      this.tip.textContent = `规律是：${this.q.rule}`;
      this.later(() => this.next(), 2200);
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
      title: stars === 3 ? '规律大侦探！' : '挑战完成',
      message: `${this.rounds} 题答对 ${this.right} 题`,
      speak: `答对 ${this.right} 题`,
      stats: [
        { label: '答对', value: `${this.right}/${this.rounds}` },
        { label: '得分', value: this.score },
        { label: '难度', value: this.meta.levels.find((l) => l.id === this.options.level)?.name || '-' },
      ],
    });
  }
}
