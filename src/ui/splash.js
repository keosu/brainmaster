/**
 * 开屏：炫酷 Logo 闪现 —— 不需要任何点击，自动播放完自动消失。
 * 同一个浏览会话只出现一次（刷新后再进不再打扰）。
 */
import { el, svgToDataUri } from '../core/utils.js';
import { iconSvg } from './logo.js';

const KEY = 'brainmaster.splash.shown';

export function showSplash({ duration = 2000 } = {}) {
  try {
    if (sessionStorage.getItem(KEY)) return null;
    sessionStorage.setItem(KEY, '1');
  } catch { /* 隐私模式忽略 */ }

  // 挂在 body 上：避免被 clearOverlays() 连带清掉
  const root = document.body;

  const logo = el('div.splash__logo', {}, [
    el('div.splash__ring'),
    el('div.splash__ring.splash__ring--2'),
    el('img.splash__core', { src: svgToDataUri(iconSvg({ bg: 'none', scale: 0.92 })), alt: '' }),
  ]);

  const title = el('h1.splash__title', {},
    '脑力大师'.split('').map((ch, i) =>
      el('span', {
        text: ch,
        style: { animationDelay: `${420 + i * 90}ms` },
      })));

  const bar = el('div.splash__bar', {}, [el('i')]);

  const node = el('div.splash', {}, [
    logo,
    title,
    el('p.splash__sub', { text: 'B R A I N · M A S T E R' }),
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
