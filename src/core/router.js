/** 极简 hash 路由：#/ , #/game/:id?theme=x&level=y , #/training */
const subs = new Set();

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

function emit() { const r = current(); subs.forEach((fn) => fn(r)); }

export function start() {
  window.addEventListener('hashchange', emit);
  if (!location.hash) location.replace('#/');
  emit();
}

export function back(fallback = '#/') {
  if (history.length > 1) history.back();
  else location.hash = fallback;
}
