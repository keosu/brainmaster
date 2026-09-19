/** 顶部信息条：分数 / 时间 / 步数 … 由游戏自由配置 */
import { el, clear } from '../core/utils.js';

export class Hud {
  constructor(parent) {
    this.node = el('div.hud');
    this.slots = [];
    parent.appendChild(this.node);
  }
  /** slots: [{ key, label, value, warn }] */
  set(slots) {
    this.slots = slots;
    clear(this.node);
    slots.forEach((s, i) => {
      if (i) this.node.appendChild(el('div.hud__sep'));
      const v = el('div.hud__v', { text: String(s.value ?? '-') });
      const box = el('div.hud__slot', {}, [
        el('div.hud__k', { text: s.label || '' }),
        v,
      ]);
      box.dataset.key = s.key;
      this.node.appendChild(box);
      if (s.warn) v.classList.add('hud__v--warn');
    });
    return this;
  }
  patch(key, value, warn = false) {
    const box = this.node.querySelector(`[data-key="${key}"] .hud__v`);
    if (!box) return;
    box.textContent = String(value);
    box.classList.toggle('hud__v--warn', !!warn);
  }
  warn(key, on) {
    const box = this.node.querySelector(`[data-key="${key}"] .hud__v`);
    box?.classList.toggle('hud__v--warn', !!on);
  }
  show() { this.node.classList.remove('u-hide'); }
  hide() { this.node.classList.add('u-hide'); }
  destroy() { this.node.remove(); }
}
