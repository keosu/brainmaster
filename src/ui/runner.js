/**
 * 游戏运行器：负责加载 / 挂载 / 结算 / 卸载 的整个生命周期。
 * 游戏本身只关心玩法，平台能力全部通过 ctx 注入。
 */
import { el, clear } from '../core/utils.js';
import { getGameMeta } from '../games/manifest.js';
import { save } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import { getTheme } from '../themes/index.js';
import { Hud } from './hud.js';
import { showResult, toast } from './modal.js';
import * as router from '../core/router.js';

export class Runner {
  /**
   * @param {{hudArea:HTMLElement, gameArea:HTMLElement}} host
   */
  constructor(host) {
    this.host = host;
    this.current = null; // { meta, game, hud, link, id, query, onFinish }
    this.lastResult = null;
    this.peekNode = null;
    // 视口变化后重新计算棋盘可用空间
    let pending = false;
    this._onViewport = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; this.fit(); });
    };
    window.addEventListener('resize', this._onViewport);
    window.addEventListener('orientationchange', this._onViewport);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onViewport);
  }

  /**
   * 自适应：把「棋盘能用的宽高」写成 --fit-w / --fit-h 交给游戏 CSS 使用。
   * 约定：游戏里主棋盘加 .fit-box，它的尺寸就能随可用空间自动放大到填满屏幕。
   */
  fit() {
    const c = this.current;
    if (!c || !c.rootEl) return;
    const host = this.host.gameArea;
    if (!host || !host.isConnected) return;

    const hostCs = getComputedStyle(host);
    const availW = Math.max(160, host.clientWidth
      - parseFloat(hostCs.paddingLeft || 0) - parseFloat(hostCs.paddingRight || 0));
    const availH = Math.max(160, host.clientHeight
      - parseFloat(hostCs.paddingTop || 0) - parseFloat(hostCs.paddingBottom || 0));

    // 除 .fit-box 之外的一切占的高度：用「整体 - 棋盘」反推，
    // 这样即使棋盘被包在若干层容器里（含内边距）也不会算漏或算重。
    const fitEl = c.rootEl.querySelector('.fit-box');
    let used = 0;
    if (fitEl) {
      used = Math.max(0, c.rootEl.offsetHeight - fitEl.offsetHeight);
    } else {
      const kids = Array.from(c.rootEl.children);
      const gap = parseFloat(getComputedStyle(c.rootEl).rowGap || 0) || 0;
      used = gap * Math.max(0, kids.length - 1)
        + kids.reduce((a, k) => a + k.getBoundingClientRect().height, 0);
    }

    const fitH = Math.max(200, availH - used);
    c.rootEl.style.setProperty('--fit-w', `${Math.round(availW)}px`);
    c.rootEl.style.setProperty('--fit-h', `${Math.round(fitH)}px`);
    try { c.game.onResize?.(); } catch (e) { console.warn(e); }
  }

  /** 加载并启动一个游戏 */
  async load(id, query = {}, { onFinish, onExit, onReady, onScore } = {}) {
    this.unload();
    const meta = getGameMeta(id);
    if (!meta) { toast('找不到这个游戏'); router.home(); return; }

    // 主题
    const themeId = query.theme || save.settings.theme;
    const theme = meta.theme ? getTheme(themeId) : null;

    // CSS（懒加载，卸载时移除）
    const link = el('link', { rel: 'stylesheet', href: `./src/games/${id}/style.css` });
    document.head.appendChild(link);

    const hud = new Hud(this.host.hudArea);
    hud.hide();
    const root = el('div.game-root');
    clear(this.host.gameArea);
    this.host.gameArea.appendChild(root);

    let GameClass;
    try {
      const mod = await meta.load();
      GameClass = mod.default;
    } catch (e) {
      console.error(e);
      toast('游戏加载失败');
      return;
    }

    const level = meta.levels?.find((l) => l.id === query.level) || meta.levels?.[0] || {};
    const game = new GameClass({
      root,
      meta,
      hud,
      theme,
      options: { ...level, level: level.id, theme: theme?.id, ...query },
      sound, voice, save,
      finish: (r) => this._finish(r, { meta, query, onFinish }),
      quit: () => router.home(),
      restart: () => this.restart(),
      /** 用新的参数重新载入（如切换难度 / 主题） */
      reload: (patch = {}) => this.load(id, { ...query, ...patch }, { onFinish }),
    });

    this.current = { id, meta, game, hud, link, rootEl: root, query, onFinish, onExit, onScore, theme };

    try {
      await game.mount();
      if (this.current?.game !== game) return; // 已被切换
      this.fit();
      // 字体 / 首屏布局稳定后再量一次，避免算小
      requestAnimationFrame(() => { if (this.current?.game === game) this.fit(); });
      game.start();
      onReady?.(meta);
    } catch (e) {
      console.error('[Runner] 游戏启动失败', e);
    }
    return game;
  }

  restart() {
    const c = this.current;
    if (!c) return;
    this.load(c.id, c.query, { onFinish: c.onFinish });
  }

  /** 结算：写存档 → 加脑力 → 弹面板 */
  _finish(result, { meta, query, onFinish }) {
    const c = this.current;
    if (!c) return;
    const mode = result.mode || meta.scoreMode || 'max';
    const score = Number(result.score ?? 0);
    const stars = result.stars ?? 0;

    const { isBest, prev } = save.submitBest(meta.id, score, result.meta || {}, mode);
    save.addPlay(meta.id);
    save.markTrained(meta.id);
    save.pushHistory({ game: meta.id, score, level: query.level });

    const gained = Math.max(2, Math.round((result.power ?? (4 + stars * 4)) * (isBest ? 1.4 : 1)));
    const power = save.addPower(gained);
    const lv = result.levelInfo || null;
    c.onScore?.({ id: meta.id, score, stars, isBest });

    const bestText = mode === 'min'
      ? `历史最快：${prev ?? '—'}${meta.unit}`
      : `历史最佳：${prev ?? '—'}${meta.unit}`;

    const actions = [];
    if (onFinish) actions.push({ label: onFinish.label || '继续', primary: true, onClick: () => onFinish.onNext?.() });
    actions.push({ label: onFinish ? '重玩本关' : '再来一次', primary: !onFinish, onClick: () => this.restart() });
    actions.push({ label: '返回首页', onClick: () => router.home() });

    // 训练流程必须走"下一个"，不允许点空白关掉；单局可以随时关掉回去看棋盘
    const payload = {
      title: result.title,
      emoji: result.emoji,
      message: result.message,
      score: result.showScore === false ? null : score,
      stars,
      stats: [
        ...(result.stats || []),
        { label: '脑力 +', value: gained },
        { label: '等级', value: lv ? lv.title : 'Lv.' + (result.level || 1) },
      ],
      newBest: isBest && prev != null,
      bestText: prev != null ? bestText : '',
      speak: result.speak,
      actions,
      dismissable: !onFinish,
      onClose: () => this._peekResult(),
    };
    this.lastResult = payload;
    showResult(payload);

    if (gained) toast(`脑力 +${gained} 💡 当前 ${power}`);
  }

  /** 成绩面板被点空白关掉后，在角落留一个"再看一眼"的入口 */
  _peekResult() {
    this._clearPeek();
    if (!this.lastResult) return;
    const btn = el('button.result-peek', {
      text: '🏆 看成绩',
      onClick: () => {
        this._clearPeek();
        showResult({ ...this.lastResult, speak: null });
      },
    });
    document.body.appendChild(btn);
    this.peekNode = btn;
  }

  _clearPeek() {
    this.peekNode?.remove();
    this.peekNode = null;
  }

  unload() {
    const c = this.current;
    this._clearPeek();
    if (!c) return;
    try { c.game.teardown(); } catch (e) { console.warn(e); }
    c.hud.destroy();
    c.link.remove();
    clear(this.host.gameArea);
    clear(this.host.hudArea);
    this.current = null;
    this.lastResult = null;
    voice.cancel();
  }
}
