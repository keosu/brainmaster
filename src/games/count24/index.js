/**
 * 24 点 —— 四张牌用 + − × ÷ 算出 24
 * 交互：点两张牌 → 选运算符 → 合并成一张，最后剩 24 即通关
 */
import { Game, Timer } from '../../core/Game.js';
import { el } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';
import { dealCards } from './solvers.js';

const OPS = [
  { id: '+', label: '＋', fn: (a, b) => a + b },
  { id: '-', label: '－', fn: (a, b) => a - b },
  { id: '×', label: '×', fn: (a, b) => a * b },
  { id: '÷', label: '÷', fn: (a, b) => (b !== 0 && a % b === 0 ? a / b : null) },
];

export default class Count24Game extends Game {
  async mount() {
    this.max = Number(this.options.max || 9);
    this.cards = dealCards(4, this.max);
    this.exprs = this.cards.map((v) => String(v)); // 每张牌对应的算式字符串
    this.history = [];
    this.steps = 0;
    this.undos = 0;
    this.sel = [];        // 选中的牌下标
    this.done = false;
    this.target = Number(this.options.target || 24);
    this.timer = new Timer(this);

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const undoBtn = el('button.btn.btn--sm.btn--ghost', { text: '↩️ 撤销', onClick: () => this.undo() });
    const restartBtn = el('button.btn.btn--sm.btn--ghost', { text: '🔄 换一题', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, undoBtn, restartBtn]));

    this.targetRow = el('div.c24-target', {}, [
      el('span.c24-target__k', { text: '目标' }),
      el('span.c24-target__v', { text: String(this.target) }),
    ]);
    this.root.appendChild(this.targetRow);

    this.stage = el('div.c24-stage.fit-box');
    this.cardRow = el('div.c24-cards');
    this.opRow = el('div.c24-ops');
    OPS.forEach((op) => {
      this.opRow.appendChild(el('button.c24-op', {
        text: op.label,
        onClick: () => this.applyOp(op),
      }));
    });
    this.stage.append(this.cardRow, this.opRow);
    this.root.appendChild(this.stage);

    this.tip = el('div.pill', { text: '选两张牌，再选一个运算，把它们合成一张' });
    this.root.appendChild(this.tip);

    this.hud.set([
      { key: 'left', label: '剩余牌', value: '4' },
      { key: 'steps', label: '已合并', value: '0' },
      { key: 'time', label: '用时', value: '0s' },
    ]);
    this.hud.show();

    this.render();
    this.say('二十四点开始');
  }

  start() {
    this.timer.startCountUp((ms) => this.hud.patch('time', `${Math.round(ms / 1000)}s`));
  }

  render() {
    this.cardRow.innerHTML = '';
    this.cards.forEach((v, i) => {
      const isSel = this.sel.includes(i);
      const card = el(`button.c24-card${isSel ? '.is-sel' : ''}`, {
        text: String(v),
        onClick: () => this.pick(i),
      });
      if (isSel) card.classList.add('pop-in');
      this.cardRow.appendChild(card);
    });
    this.opRow.classList.toggle('is-on', this.sel.length === 2);
    this.hud.patch('left', this.cards.length);
    this.hud.patch('steps', this.steps);
    if (this.sel.length === 2) {
      this.tip.textContent = `${this.cards[this.sel[0]]} 和 ${this.cards[this.sel[1]]} —— 选一个运算`;
    } else if (this.sel.length === 1) {
      this.tip.textContent = '再选另一张牌';
    } else if (this.cards.length === 1) {
      this.tip.textContent = this.cards[0] === this.target ? '就是 24！' : `现在只剩 ${this.cards[0]}，可以撤销重来`;
    } else {
      this.tip.textContent = '选两张牌，再选一个运算，把它们合成一张';
    }
  }

  pick(i) {
    if (this.done) return;
    const at = this.sel.indexOf(i);
    if (at >= 0) { this.sel.splice(at, 1); this.sound.play('tap'); this.render(); return; }
    if (this.sel.length >= 2) this.sel = [];
    this.sel.push(i);
    this.sound.play('tap');
    this.render();
  }

  applyOp(op) {
    if (this.done || this.sel.length !== 2) return;
    const [i, j] = this.sel;
    const a = this.cards[i];
    const b = this.cards[j];
    const v = op.fn(a, b);
    if (v === null) {
      toast('除不尽，换一个运算吧');
      this.sound.play('bad');
      return;
    }
    this.history.push({ cards: this.cards.slice(), exprs: this.exprs.slice(), steps: this.steps });
    const expr = `(${this.exprs[i]} ${op.id} ${this.exprs[j]})`;
    this.cards = this.cards.filter((_, k) => k !== i && k !== j);
    this.exprs = this.exprs.filter((_, k) => k !== i && k !== j);
    this.cards.splice(Math.min(i, j), 0, v);
    this.exprs.splice(Math.min(i, j), 0, expr);
    this.steps += 1;
    this.sel = [];
    this.sound.play('good');
    this.render();

    if (this.cards.length === 1) {
      if (this.cards[0] === this.target) this.later(() => this.over(), 300);
      else this.later(() => toast(`得到 ${this.cards[0]}，不是 ${this.target}，可以撤销重来`), 320);
    }
  }

  undo() {
    if (this.done || !this.history.length) return;
    const prev = this.history.pop();
    this.cards = prev.cards;
    this.exprs = prev.exprs;
    this.steps = prev.steps;
    this.undos += 1;
    this.sel = [];
    this.sound.play('tap');
    this.render();
  }

  over() {
    if (this.done) return;
    this.done = true;
    this.timer.stop();
    const sec = (this.timer.ms || 0) / 1000;
    const stars = sec <= 25 ? 3 : sec <= 60 ? 2 : 1;
    const exprText = `${this.exprs[0].replace(/^\((.*)\)$/, '$1')} = ${this.target}`;
    this.tip.textContent = `${exprText} · 用时 ${sec.toFixed(1)} 秒`;
    this.sound.play('win');
    this.finish({
      score: Number(sec.toFixed(1)),
      mode: 'min',
      stars,
      title: '算出来了！',
      message: `${exprText}　·　用时 ${sec.toFixed(1)} 秒`,
      speak: `用时 ${sec.toFixed(1)} 秒算出二十四`,
      stats: [
        { label: '算式', value: exprText },
        { label: '合并次数', value: this.steps },
        { label: '撤销次数', value: this.undos },
      ],
    });
  }

  destroy() { this.timer.stop(); }
}
