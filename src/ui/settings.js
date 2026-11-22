/**
 * 设置面板：偏好开关、安装到桌面、显示的游戏、存档备份
 * 宽屏 / 横屏左右两栏，竖屏上下排列；所有改动即时生效，无需"保存"
 */
import { el } from '../core/utils.js';
import { save } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import { isNative, isStandalone, canInstall, promptInstall, isIOS, canFullscreen, enterFullscreen } from '../core/platform.js';
import { GAMES } from '../games/manifest.js';
import { showModal, closeModal, toast } from './modal.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/** 偏好开关：做成可点击的小方块，比一行行的开关更紧凑 */
function tile(icon, label, key, onChange) {
  const node = el('button.set-tile', { type: 'button' }, [
    el('span.set-tile__ico', { text: icon }),
    el('span.set-tile__label', { text: label }),
    el('span.set-tile__state'),
  ]);
  const sync = () => {
    const on = !!save.settings[key];
    node.classList.toggle('is-on', on);
    node.querySelector('.set-tile__state').textContent = on ? '开' : '关';
  };
  node.addEventListener('click', () => {
    const v = save.toggleSetting(key);
    sync();
    onChange?.(v);
  });
  sync();
  return node;
}

function section(title, extra, children) {
  return el('section.set-sec', {}, [
    el('div.set-sec__head', {}, [el('span.set-sec__title', { text: title }), extra]),
    children,
  ]);
}

/** 打开设置弹窗 */
export function openSettings({ onChange } = {}) {
  const changed = () => {
    onChange?.();
    window.dispatchEvent(new CustomEvent('bm:settings-changed'));
  };

  /* ---------- 偏好 ---------- */
  const tiles = el('div.set-tiles', {}, [
    tile('🔊', '音效', 'sound', (v) => { sound.setEnabled(v); if (v) sound.play('good'); changed(); }),
    tile('🗣️', '语音朗读', 'voice', (v) => { voice.setEnabled(v); if (v) voice.speak('语音已开启'); }),
    tile('📳', '震动反馈', 'haptics', (v) => { if (v) navigator.vibrate?.(20); }),
    !isNative() && canFullscreen()
      ? tile('⛶', '自动全屏', 'fullscreen', (v) => { if (v) enterFullscreen(); })
      : tile('💡', '黑白棋提示', 'hints'),
  ]);

  /* ---------- 显示的游戏 ---------- */
  const hidden = new Set(save.settings.hidden || []);
  const count = el('span.set-sec__badge');
  const chips = GAMES.map((g) => {
    const chip = el('button.set-chip', { type: 'button', title: g.desc }, [
      el('span.set-chip__ico', { text: g.emoji }),
      el('span.set-chip__name', { text: g.name }),
    ]);
    chip.dataset.id = g.id;
    chip.addEventListener('click', () => {
      if (hidden.has(g.id)) hidden.delete(g.id);
      else if (GAMES.length - hidden.size > 1) hidden.add(g.id);
      else { toast('至少保留一个游戏'); return; }
      sound.play('tap');
      commit();
    });
    return chip;
  });
  const syncChips = () => {
    chips.forEach((c) => c.classList.toggle('is-off', hidden.has(c.dataset.id)));
    count.textContent = `${GAMES.length - hidden.size}/${GAMES.length}`;
  };
  const commit = () => {
    save.setSetting('hidden', Array.from(hidden));
    syncChips();
    changed();
  };
  const allBtn = el('button.set-link', {
    type: 'button',
    text: '全部显示',
    onClick: () => { hidden.clear(); commit(); },
  });
  syncChips();

  /* ---------- 数据 ---------- */
  const fileInput = el('input', {
    type: 'file', accept: 'application/json,.json',
    style: { display: 'none' },
    onChange: (e) => doImport(e),
  });
  const dataBtn = (icon, label, onClick) => el('button.set-data__btn', { type: 'button', onClick }, [
    el('span', { text: icon }), el('span', { text: label }),
  ]);
  const data = el('div.set-data', {}, [
    dataBtn('⬇️', '导出存档', () => doExport()),
    dataBtn('⬆️', '导入存档', () => fileInput.click()),
    dataBtn('📋', '复制文本', () => doCopy()),
    fileInput,
  ]);

  const body = el('div.set', {}, [
    el('div.set__head', {}, [
      el('div.set__title', {}, [el('b', { text: '设置' }), el('span', { text: `v${APP_VERSION}` })]),
      el('button.set__close', { type: 'button', 'aria-label': '关闭', text: '✕', onClick: () => closeModal() }),
    ]),
    el('div.set__cols', {}, [
      el('div.set__col', {}, [
        section('偏好', null, tiles),
        buildInstall(),
        section('存档备份', null, el('div', {}, [
          data,
          el('p.set-note', { text: '换机或清理前先导出，之后导入同一文件即可恢复进度。' }),
        ])),
      ]),
      el('div.set__col', {}, [
        section('显示的游戏', el('span.set-sec__tools', {}, [count, allBtn]),
          el('div', {}, [
            el('div.set-games', {}, chips),
            el('p.set-note', { text: '点一下隐藏 / 显示；隐藏的游戏不会出现在首页和每日训练里。' }),
          ])),
      ]),
    ]),
  ]);

  showModal({ body, className: 'modal--settings' });
}

function buildInstall() {
  if (isNative() || isStandalone()) return null;
  if (canInstall()) {
    return el('div.set-install', {}, [
      el('span.set-install__ico', { text: '📲' }),
      el('div', {}, [el('b', { text: '安装到桌面' }), el('span', { text: '全屏打开，离线也能玩' })]),
      el('button.btn.btn--sm.btn--primary', {
        text: '安装',
        onClick: async () => {
          const ok = await promptInstall();
          if (ok) { toast('安装成功，可以从桌面打开啦'); closeModal(); }
        },
      }),
    ]);
  }
  if (isIOS()) {
    return el('div.set-install', {}, [
      el('span.set-install__ico', { text: '📲' }),
      el('div', {}, [el('b', { text: '添加到主屏幕' }), el('span', { text: 'Safari 底部「分享」→「添加到主屏幕」' })]),
    ]);
  }
  return null;
}

function doExport() {
  const blob = new Blob([save.exportString()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `brain-master-data-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出存档数据');
}

/** 复制存档 JSON（部分手机 WebView 不支持 Blob 下载时的兜底方案） */
async function doCopy() {
  const text = save.exportString();
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('存档文本已复制，可粘贴到备忘录保存');
  } catch (err) {
    console.warn(err);
    toast('复制失败，请用「导出存档」');
  }
}

function doImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result));
      save.importData(obj);
      sound.setEnabled(save.settings.sound);
      voice.setEnabled(save.settings.voice);
      toast('数据已导入');
      closeModal();
      window.dispatchEvent(new CustomEvent('bm:settings-changed'));
    } catch (err) {
      console.warn(err);
      toast('导入失败：文件不是有效的存档');
    }
  };
  reader.onerror = () => toast('导入失败：读取文件出错');
  reader.readAsText(file);
  e.target.value = ''; // 允许重复选择同一文件
}
