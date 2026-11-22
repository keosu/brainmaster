/**
 * 平台适配：PWA（Service Worker / 安装）、全屏、震动、安卓原生返回键。
 *
 * 原生（Capacitor）环境下沉浸式全屏由 MainActivity 负责；
 * 浏览器 / PWA 里用 Fullscreen API，在手机上首次点击时自动进入全屏以隐藏状态栏。
 * Capacitor 插件一律运行时动态 import，浏览器开发时不会触发裸模块解析。
 */
import { save } from './storage.js';

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

/** 是否以已安装的 PWA 形式运行（全屏 / 独立窗口） */
export function isStandalone() {
  return mq('(display-mode: fullscreen)') || mq('(display-mode: standalone)') || navigator.standalone === true;
}

export function isTouch() {
  return mq('(pointer: coarse)') || 'ontouchstart' in window;
}

/* ---------------- 全屏 ---------------- */
const docEl = () => document.documentElement;

export function canFullscreen() {
  if (isNative()) return false;
  const el = docEl();
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement) || mq('(display-mode: fullscreen)');
}

export async function enterFullscreen() {
  if (!canFullscreen() || isFullscreen()) return false;
  const el = docEl();
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else el.webkitRequestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  try {
    if (document.exitFullscreen && document.fullscreenElement) await document.exitFullscreen();
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch { /* ignore */ }
}

export function toggleFullscreen() {
  return isFullscreen() ? exitFullscreen() : enterFullscreen();
}

/* ---------------- 震动 ---------------- */
let hapticsPlugin = null;
const HAPTIC_MS = { tap: 8, flip: 8, place: 10, good: 14, great: 22, bad: [30, 40, 30], win: [20, 60, 30], lose: 60 };

export function haptic(kind = 'tap') {
  if (!save.settings.haptics) return;
  const pattern = HAPTIC_MS[kind];
  if (pattern == null) return;
  if (hapticsPlugin) {
    const style = kind === 'bad' || kind === 'lose' ? 'HEAVY' : kind === 'great' || kind === 'win' ? 'MEDIUM' : 'LIGHT';
    hapticsPlugin.impact({ style }).catch(() => {});
    return;
  }
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

/* ---------------- PWA 安装 ---------------- */
let deferredPrompt = null;

export function canInstall() { return !!deferredPrompt; }

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const p = deferredPrompt;
  deferredPrompt = null;
  p.prompt();
  const { outcome } = await p.userChoice.catch(() => ({ outcome: 'dismissed' }));
  return outcome === 'accepted';
}

/** iOS Safari 没有安装事件，只能提示「分享 → 添加到主屏幕」 */
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* ---------------- 初始化 ---------------- */
/**
 * @param {{ onBack?: () => boolean }} hooks onBack 返回 true 表示已处理（否则退到后台）
 */
export function initPlatform({ onBack } = {}) {
  const root = docEl();
  root.classList.toggle('is-native', isNative());
  root.classList.toggle('is-standalone', isStandalone());
  root.classList.toggle('is-touch', isTouch());

  if (isNative()) {
    initNative(onBack);
    return;
  }

  registerServiceWorker();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('bm:installable'));
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; });

  // 手机浏览器：第一次触摸时进入全屏，隐藏系统状态栏（浏览器要求必须由用户手势触发）
  const auto = () => {
    if (save.settings.fullscreen && isTouch() && !isStandalone()) enterFullscreen();
  };
  window.addEventListener('pointerup', auto, { once: true });

  const sync = () => root.classList.toggle('is-fullscreen', isFullscreen());
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
}

function registerServiceWorker() {
  // 只在打包产物里注册：开发时（vite 直读 src）注册 SW 会缓存旧代码
  if (typeof __BUILD__ === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('bm:update-ready'));
          }
        });
      });
    }).catch((e) => console.warn('[sw] 注册失败', e));
  });
}

async function initNative(onBack) {
  try {
    const mod = await import('@capacitor/haptics');
    hapticsPlugin = mod.Haptics || null;
  } catch { /* 可选 */ }
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      if (onBack?.()) return;
      App.minimizeApp().catch(() => App.exitApp());
    });
  } catch (e) {
    console.warn('[platform] App 插件加载失败', e);
  }
}
