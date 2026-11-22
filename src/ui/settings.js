/**
 * 设置面板：声音 / 语音 / 震动 / 全屏、安装到桌面、隐藏游戏、导出导入存档
 */
import { el } from '../core/utils.js';
import { save } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import { isNative, isStandalone, canInstall, promptInstall, isIOS, canFullscreen, enterFullscreen } from '../core/platform.js';
import { GAMES } from '../games/manifest.js';
import { showModal, closeModal, toast } from './modal.js';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

function toggleRow(label, desc, key, onChange) {
  const input = el('input.switch__input', { type: 'checkbox' });
  input.checked = !!save.settings[key];
  input.addEventListener('change', () => {
    save.setSetting(key, input.checked);
    onChange?.(input.checked);
  });
  return el('label.switch', {}, [
    el('div.switch__text', {}, [el('b', { text: label }), desc ? el('span', { text: desc }) : null]),
    input,
    el('span.switch__track', {}, [el('i')]),
  ]);
}

/** 打开设置弹窗 */
export function openSettings({ onChange } = {}) {
  const changed = () => {
    onChange?.();
    window.dispatchEvent(new CustomEvent('bm:settings-changed'));
  };

  const toggles = el('div.settings__toggles', {}, [
    toggleRow('🔊 音效', '答对答错的提示音', 'sound', (v) => { sound.setEnabled(v); if (v) sound.play('good'); changed(); }),
    toggleRow('🗣️ 语音朗读', '读题目、报成绩', 'voice', (v) => { voice.setEnabled(v); if (v) voice.speak('语音已开启'); }),
    toggleRow('📳 震动反馈', '手机上点击时轻微震动', 'haptics', (v) => { if (v) navigator.vibrate?.(20); }),
    !isNative() && canFullscreen()
      ? toggleRow('⛶ 自动全屏', '手机浏览器里点一下就全屏，隐藏状态栏', 'fullscreen', (v) => { if (v) enterFullscreen(); })
      : null,
  ]);

  const installBox = buildInstall();

  const hidden = new Set(save.settings.hidden || []);
  const list = el('div.settings__games');
  GAMES.forEach((g) => {
    const cb = el('input.settings__cb', { type: 'checkbox' });
    cb.checked = !hidden.has(g.id);
    cb.addEventListener('change', () => {
      if (cb.checked) hidden.delete(g.id);
      else hidden.add(g.id);
      save.setSetting('hidden', Array.from(hidden));
      changed();
    });
    list.appendChild(el('label.settings__game', {}, [
      cb,
      el('span.settings__emoji', { text: g.emoji }),
      el('span', { text: g.name }),
      el('span.settings__cat', { text: g.category }),
    ]));
  });

  const fileInput = el('input', {
    type: 'file', accept: 'application/json,.json',
    style: { display: 'none' },
    onChange: (e) => doImport(e),
  });
  const btnExport = el('button.btn.btn--sm', { text: '⬇️ 导出数据', onClick: () => doExport() });
  const btnImport = el('button.btn.btn--sm', { text: '⬆️ 导入数据', onClick: () => fileInput.click() });
  const btnCopy = el('button.btn.btn--sm.btn--ghost', { text: '📋 复制存档文本', onClick: () => doCopy() });

  const body = el('div.settings', {}, [
    toggles,
    installBox,
    el('div.settings__data-title', { text: `🎮 显示的游戏（${GAMES.length} 个）` }),
    el('p.settings__hint', { text: '关闭的游戏不会出现在首页和「每日训练」里。' }),
    list,
    el('div.settings__data-title', { text: '💾 数据备份与恢复' }),
    el('div.settings__data', {}, [btnExport, btnImport, btnCopy, fileInput]),
    el('p.settings__hint', {
      text: '换机、重装或清理前先「导出数据」，之后用「导入数据」选回该文件即可恢复。手机上没有下载文件时，可用「复制存档文本」粘贴到备忘录保存。',
    }),
    el('p.settings__ver', { text: `Brain Master · 脑力大师 v${APP_VERSION}` }),
  ]);

  showModal({
    title: '⚙️ 设置',
    body,
    actions: [{ label: '完成', primary: true }],
  });
}

function buildInstall() {
  if (isNative() || isStandalone()) return null;
  if (canInstall()) {
    return el('div.settings__install', {}, [
      el('div', {}, [el('b', { text: '📲 安装到桌面' }), el('span', { text: '像 App 一样全屏打开，离线也能玩' })]),
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
    return el('div.settings__install', {}, [
      el('div', {}, [el('b', { text: '📲 添加到主屏幕' }), el('span', { text: '点 Safari 底部的「分享」按钮 →「添加到主屏幕」，即可全屏离线玩' })]),
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
    toast('复制失败，请用「导出数据」');
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
