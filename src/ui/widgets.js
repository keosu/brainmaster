/** 可复用 UI 小部件：分段控件、难度条、主题条、控制行 */
import { el, clear } from '../core/utils.js';
import { listThemes } from '../themes/index.js';

/** 分段控件 */
export function segment({ items, value, onChange, className = '' }) {
  const node = el(`div.seg${className ? '.' + className : ''}`);
  items.forEach((it) => {
    const b = el('button.seg__item', { text: it.name, onClick: () => { set(it.id); onChange?.(it.id); } });
    if (it.id === value) b.classList.add('is-on');
    node.appendChild(b);
  });
  function set(id) {
    Array.from(node.children).forEach((c, i) => c.classList.toggle('is-on', items[i].id === id));
  }
  return Object.assign(node, { set });
}

/** 难度条（来自 manifest.levels） */
export function levelBar(meta, currentId, onChange) {
  if (!meta?.levels?.length) return null;
  return segment({ items: meta.levels, value: currentId, onChange });
}

/** 主题选择条 */
export function themeBar(currentId, onChange, { label = '🎨 主题' } = {}) {
  const node = el('div.themes');
  listThemes().forEach((t) => {
    const chip = el('button.chip.chip--theme', {
      onClick: () => { onChange?.(t.id); },
    }, [
      el('span', { text: t.emoji }),
      el('span', { text: t.name }),
    ]);
    if (t.id === currentId) chip.classList.add('is-on');
    chip.dataset.theme = t.id;
    node.appendChild(chip);
  });
  // 默认带一个标签，让它在游戏内也能一眼看出是"换皮肤"
  const wrap = el('div.ctrl-group.ctrl-group--theme', {}, [
    el('span.ctrl-group__k', { text: label }),
    node,
  ]);
  return Object.assign(wrap, {
    set(id) { Array.from(node.children).forEach((c) => c.classList.toggle('is-on', c.dataset.theme === id)); },
  });
}

/** 一行控件容器 */
export function controlRow(children, cls = '') {
  return el(`div.controls${cls ? '.' + cls : ''}`, { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' } }, children);
}

/** 进度点：用于关卡指示 */
export function dots(total, active) {
  const node = el('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center' } });
  for (let i = 0; i < total; i++) {
    node.appendChild(el('span', {
      style: {
        width: '9px', height: '9px', borderRadius: '50%',
        background: i < active ? 'var(--c-cyan)' : 'rgba(255,255,255,.18)',
        boxShadow: i === active - 1 ? '0 0 12px var(--c-cyan)' : 'none',
      },
    }));
  }
  return node;
}

export { clear };
