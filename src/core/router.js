/** 极简 hash 路由：#/ , #/game/:id?theme=x&level=y , #/training */
const subs = new Set();
let guard = null;
let lastHash = '';
let restoring = false;

export function parse(hash = location.hash) {
  const raw = String(hash).replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const seg = path.split('/').filter(Boolean);
  return { path: '/' + seg.join('/'), seg, query };
}

export function current() { return parse(); }

export function go(path, { replace = false } = {}) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (location.hash === target) { emit(); return; }
  if (replace) location.replace(target);
  else location.hash = target;
}

export function home() { go('/'); }
export function openGame(id, query = {}) {
  const qs = new URLSearchParams(query).toString();
  go(`/game/${id}${qs ? `?${qs}` : ''}`);
}

export function onRoute(fn) { subs.add(fn); return () => subs.delete(fn); }

/**
 * 离开守卫：每次 hash 变化（包括浏览器 / 系统返回手势）都会先问它。
 * fn(nextHash) 返回 false 时撤销这次跳转，停留在原页面。
 */
export function setGuard(fn) { guard = fn; }

function emit() { const r = current(); subs.forEach((fn) => fn(r)); }

function onHashChange() {
  if (restoring) { restoring = false; lastHash = location.hash; return; }
  const next = location.hash;
  if (guard && lastHash && next !== lastHash && guard(next) === false) {
    restoring = true;
    location.replace(lastHash);
    return;
  }
  lastHash = next;
  emit();
}

export function start() {
  window.addEventListener('hashchange', onHashChange);
  if (!location.hash) location.replace('#/');
  lastHash = location.hash;
  emit();
}

export function back(fallback = '#/') {
  if (history.length > 1) history.back();
  else location.hash = fallback;
}
