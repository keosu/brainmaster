/**
 * 开屏：炫酷 Logo 闪现 —— 不需要任何点击，自动播放完自动消失。
 * 同一个浏览会话只出现一次（刷新后再进不再打扰）。
 */
import { el } from '../core/utils.js';

const KEY = 'brainmaster.splash.shown';

export function showSplash({ duration = 2100 } = {}) {
  try {
    if (sessionStorage.getItem(KEY)) return null;
    sessionStorage.setItem(KEY, '1');
  } catch { /* 隐私模式忽略 */ }

  // 挂在 body 上：避免被 clearOverlays() 连带清掉
  const root = document.body;

  const logo = el('div.splash__logo', {}, [
    el('div.splash__ring'),
    el('div.splash__ring.splash__ring--2'),
    el('div.splash__core', { text: '🧠' }),
  ]);

  const title = el('h1.splash__title', {},
    'BRAIN MASTER'.split('').map((ch, i) =>
      el('span', {
        text: ch === ' ' ? '\u00A0' : ch,
        style: { animationDelay: `${420 + i * 55}ms` },
      })));

  const bar = el('div.splash__bar', {}, [el('i')]);

  const node = el('div.splash', {}, [
    logo,
    title,
    el('p.splash__sub', { text: '脑 力 训 练 营' }),
    bar,
  ]);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 520);
  };

  // 播放完自动消失；中途点一下可立即跳过
  node.addEventListener('click', finish);
  const timer = setTimeout(finish, duration);

  root.appendChild(node);
  return { close: () => { clearTimeout(timer); finish(); } };
}
