/**
 * 通用工具函数
 * 所有游戏模块都可以 import { ... } from '../../core/utils.js'
 */

/** 创建 DOM 元素：el('div.foo', {text}, [children]) */
export function el(spec = 'div', attrs = {}, children = []) {
  const [tagAndClass, id] = String(spec).split('#');
  const parts = tagAndClass.split('.');
  const tag = parts[0] || 'div';
  const node = document.createElement(tag);
  if (id) node.id = id;
  parts.slice(1).forEach((c) => c && node.classList.add(c));
  applyAttrs(node, attrs);
  toNodes(children).forEach((c) => node.appendChild(c));
  return node;
}

function applyAttrs(node, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') node.className += (node.className ? ' ' : '') + v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') setStyle(node, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
}

/** 支持 CSS 变量（--foo）与普通属性 */
function setStyle(node, obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('--')) node.style.setProperty(k, v);
    else node.style[k] = v;
  }
}

function toNodes(children) {
  const list = Array.isArray(children) ? children : [children];
  return list
    .flat(Infinity)
    .filter((c) => c != null && c !== false)
    .map((c) => (c instanceof Node ? c : document.createTextNode(String(c))));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** 清空节点 */
export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* ---------------- 数学 / 随机 ---------------- */
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 可复现随机（用于主题图案生成） */
export function seeded(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- 时间 ---------------- */
export function formatTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatMs(ms) {
  return `${Math.round(ms)}ms`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 循环计时器（基于 rAF，页面隐藏时暂停） */
export function rafLoop(fn) {
  let raf = 0;
  let stop = false;
  const step = () => {
    if (stop) return;
    fn();
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    stop = true;
    cancelAnimationFrame(raf);
  };
}

/* ---------------- 颜色 ---------------- */
export function shade(hex, amount) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = clamp(((n >> 16) & 255) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ---------------- 杂项 ---------------- */
export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把 SVG 源码转成可直接用于 <img src> / CSS url() 的 data URI */
export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim())}`;
}

/** 简单的事件总线 */
export class Emitter {
  constructor() { this.map = new Map(); }
  on(type, fn) {
    if (!this.map.has(type)) this.map.set(type, new Set());
    this.map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, payload) { this.map.get(type)?.forEach((fn) => fn(payload)); }
}

/** 防抖 */
export function debounce(fn, ms = 120) {
  let t = 0;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** 触觉反馈（支持的设备） */
export function haptic(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

/** 把数字转成等级评星 0-3 */
export function stars(value, good, great) {
  if (value >= great) return 3;
  if (value >= good) return 2;
  if (value > 0) return 1;
  return 0;
}
