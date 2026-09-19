/** 弹窗 / 结算面板 / Toast */
import { el, clear } from '../core/utils.js';
import { sound } from '../core/audio.js';
import { voice } from '../core/audio.js';

const root = () => document.getElementById('overlay-root');

export function closeModal() {
  root().querySelector('.overlay')?.remove();
}

/**
 * 通用弹窗
 * @returns {{close:Function, node:HTMLElement}}
 */
export function showModal({ title, sub, emoji, body, actions = [], dismissable = true, onClose }) {
  closeModal();
  const node = el('div.modal');
  const parts = [];
  if (emoji) parts.push(el('div.modal__emoji', { text: emoji }));
  if (title) parts.push(el('div.modal__title', { text: title }));
  if (sub) parts.push(el('div.modal__sub', { text: sub }));
  if (body) parts.push(body);
  if (actions.length) {
    const bar = el('div.modal__actions');
    actions.forEach((a) => {
      const btn = el(`button.btn${a.primary ? '.btn--primary' : a.pop ? '.btn--pop' : '.btn--ghost'}`, {
        text: a.label,
        onClick: () => { closeModal(); a.onClick?.(); },
      });
      bar.appendChild(btn);
    });
    parts.push(bar);
  }
  node.append(...parts);
  const overlay = el('div.overlay', { onClick: (e) => { if (dismissable && e.target === overlay) { closeModal(); onClose?.(); } } }, [node]);
  root().appendChild(overlay);
  return {
    node,
    close: () => { closeModal(); onClose?.(); },
  };
}

/**
 * 结算面板
 * @param {object} r
 *  r.title/r.emoji/r.message/r.score/r.stars(0-3)/r.stats[{label,value}]
 *  r.mode 'max'|'min'  r.newBest boolean r.bestValue
 *  r.actions [{label,onClick,primary}]
 */
export function showResult(r) {
  const stars = Math.max(0, Math.min(3, r.stars ?? 0));
  const dismissable = r.dismissable !== false;
  const starHtml = el('div.modal__stars', {
    html: Array.from({ length: 3 }, (_, i) => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join(''),
  });
  const body = el('div', {}, [
    typeof r.score === 'number' ? el('div.modal__score', { text: String(r.score) }) : null,
    starHtml,
    r.stats?.length
      ? el('div.modal__stats', {}, r.stats.map((s) => el('div.modal__stat', {}, [
        el('b', { text: String(s.value) }), el('span', { text: s.label }),
      ])))
      : null,
    r.newBest ? el('div.modal__newbest', { text: '🎉 新纪录！' }) : null,
    r.bestText ? el('div.modal__sub', { text: r.bestText }) : null,
    dismissable ? el('div.modal__hint', { text: '点击空白处的任意位置，可以回到刚才的画面' }) : null,
  ]);

  if (r.speak) voice.speak(r.speak);
  sound.play(stars >= 3 ? 'win' : stars >= 1 ? 'great' : 'lose');

  return showModal({
    title: r.title || '挑战完成',
    emoji: r.emoji || (stars >= 3 ? '🏆' : stars >= 1 ? '👏' : '💪'),
    sub: r.message,
    body,
    actions: r.actions?.length ? r.actions : [{ label: '再来一次', primary: true, onClick: r.onRetry }, { label: '返回首页', onClick: r.onHome }],
    dismissable,
    onClose: r.onClose,
  });
}

/* ---------------- Toast ---------------- */
let wrapNode = null;
export function toast(text, ms = 1600) {
  if (!wrapNode) {
    wrapNode = el('div.toast-wrap');
    document.body.appendChild(wrapNode);
  }
  const t = el('div.toast', { text });
  wrapNode.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .25s, transform .25s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 260);
  }, ms);
}

/** 开局提示：3 · 2 · 1 · 开始！ */
export function countdownThen(onGo, seconds = 3) {
  const node = el('div.overlay', {}, [
    el('div.modal', {}, [el('div.modal__score', { text: String(seconds) })]),
  ]);
  root().appendChild(node);
  let n = seconds;
  const num = node.querySelector('.modal__score');
  sound.play('go');
  voice.speak('准备');
  const id = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(id);
      num.textContent = '开始！';
      sound.play('go');
      setTimeout(() => { node.remove(); onGo(); }, 420);
    } else {
      num.textContent = String(n);
      sound.play('tick');
    }
  }, 620);
  return () => { clearInterval(id); node.remove(); };
}

/** 只清弹窗层，不要误删开屏这类独立节点 */
export function clearOverlays() {
  root().querySelectorAll('.overlay').forEach((n) => n.remove());
}
