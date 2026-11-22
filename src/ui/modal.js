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
  const dismiss = () => { closeModal(); onClose?.(); };
  const overlay = el('div.overlay', { onClick: (e) => { if (dismissable && e.target === overlay) dismiss(); } }, [node]);
  overlay._dismiss = dismissable ? dismiss : null;
  root().appendChild(overlay);
  return { node, close: dismiss };
}

/** 关闭最上层可关闭的弹窗（安卓返回键用），返回是否有弹窗被关掉 */
export function dismissTop() {
  const overlay = root().querySelector('.overlay');
  if (!overlay?._dismiss) return false;
  overlay._dismiss();
  return true;
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
    typeof r.score === 'number'
      ? el('div.modal__score', {}, [String(r.score), r.unit ? el('small.modal__unit', { text: r.unit }) : null])
      : null,
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
  if (!r.quiet) {
    sound.play(stars >= 3 ? 'win' : stars >= 1 ? 'great' : 'lose');
    if (stars >= 3 || r.newBest) confetti();
  }

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

/* ---------------- 彩纸庆祝 ---------------- */
const CONFETTI_COLORS = ['#6ee7ff', '#5b8cff', '#b46bff', '#ff6b9d', '#ffd166', '#4ade80'];

export function confetti({ count = 110, duration = 2200 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = el('canvas.confetti');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.38,
    vx: (Math.random() - 0.5) * 13,
    vy: -6 - Math.random() * 9,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));
  const t0 = performance.now();
  const step = (now) => {
    const t = now - t0;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - duration * 0.6) / (duration * 0.4));
    parts.forEach((p) => {
      p.vy += 0.32; p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      ctx.restore();
    });
    if (t < duration) requestAnimationFrame(step);
    else canvas.remove();
  };
  requestAnimationFrame(step);
}

/** 在指定元素上方飘出一段文字（如 +10、+2 秒） */
export function floatText(anchor, text, color = 'var(--c-amber)') {
  if (!anchor?.getBoundingClientRect) return;
  const r = anchor.getBoundingClientRect();
  const node = el('div.float-text', {
    text,
    style: { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height * 0.3}px`, color },
  });
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 900);
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
