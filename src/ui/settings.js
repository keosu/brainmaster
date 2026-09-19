/**
 * 设置面板：隐藏/显示游戏、导出/导入存档数据
 */
import { el } from '../core/utils.js';
import { save } from '../core/storage.js';
import { GAMES } from '../games/manifest.js';
import { showModal, closeModal, toast } from './modal.js';

const APP_VERSION = '0.9.0';

/** 打开设置弹窗 */
export function openSettings() {
  const hidden = new Set(save.settings.hidden || []);

  const list = el('div.settings__games');
  GAMES.forEach((g) => {
    const cb = el('input.settings__cb', { type: 'checkbox' });
    cb.checked = !hidden.has(g.id);
    cb.addEventListener('change', () => {
      if (cb.checked) hidden.delete(g.id);
      else hidden.add(g.id);
    });
    list.appendChild(el('label.settings__game', {}, [
      cb,
      el('span.settings__emoji', { text: g.emoji }),
      el('span', { text: g.name }),
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

  const body = el('div', {}, [
    el('p.settings__hint', { text: '关闭的游戏不会出现在首页和「每日训练」里。' }),
    list,
    el('div.settings__data-title', { text: '数据备份与恢复' }),
    el('div.settings__data', {}, [btnExport, btnImport, btnCopy, fileInput]),
    el('p.settings__hint', {
      text: '「导出数据」会把存档 JSON 文件下载到系统「下载」文件夹（文件名 brain-master-data-日期.json）；换机、重装或清理前先导出，之后点「导入数据」选回该文件即可恢复。若手机上没有出现下载文件，可用「复制存档文本」把 JSON 粘贴到备忘录保存。',
    }),
    el('p.settings__ver', { text: `Brain Master · v${APP_VERSION}` }),
  ]);

  showModal({
    title: '⚙️ 设置',
    body,
    actions: [{
      label: '完成', primary: true, onClick: () => {
        save.setSetting('hidden', Array.from(hidden));
        window.dispatchEvent(new CustomEvent('bm:settings-changed'));
      },
    }],
  });
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
      toast('数据已导入');
      closeModal();
      // 通知外壳刷新（首页会按隐藏列表重新渲染）
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
