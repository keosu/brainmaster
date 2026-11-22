/**
 * 游戏运行器：负责加载 / 挂载 / 结算 / 卸载 的整个生命周期。
 * 游戏本身只关心玩法，平台能力全部通过 ctx 注入。
 *
 * 横竖屏适配：
 *  - 竖屏：HUD → 控件 → 棋盘 → 提示，自上而下；
 *  - 横屏（宽高比 ≥ 1.2）：棋盘独占右侧，HUD 与游戏里除棋盘以外的控件/提示自动挪到左侧栏。
 *    挪动的是 DOM 节点本身，游戏里持有的引用依然有效，游戏代码无需感知。
 */
import { el, clear } from '../core/utils.js';
import { getGameMeta } from '../games/manifest.js';
import { save } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import { getTheme } from '../themes/index.js';
import { Hud } from './hud.js';
import { showResult, showModal, closeModal, toast } from './modal.js';
import * as router from '../core/router.js';

const SIDE_MARK = Symbol('sideMark');

export function isLandscape() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w >= 600 && w / h >= 1.2;
}

export class Runner {
  /**
   * @param {{hudArea:HTMLElement, gameArea:HTMLElement, stage?:HTMLElement, sideSlot?:HTMLElement}} host
   */
  constructor(host) {
    this.host = host;
    this.current = null; // { meta, game, hud, link, id, query, onFinish }
    this.lastResult = null;
    this.peekNode = null;
    this.pauseNode = null;
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

    // 切到后台：冻结计时；回来时若游戏还在计时，弹出「继续」而不是直接开跑
    document.addEventListener('visibilitychange', () => {
      const c = this.current;
      if (!c || !c.started) return;
      if (document.hidden) {
        c.wasRunning = c.game.hasRunningClock;
        c.game._suspend();
        voice.cancel();
      } else if (c.wasRunning && !this._isOverlayOpen()) {
        this._showPaused();
      } else if (!this._isOverlayOpen()) {
        c.game._resume();
      }
    });
  }

  _isOverlayOpen() {
    return !!document.querySelector('#overlay-root .overlay');
  }

  /** 游戏已开始且还没结算（此时离开需要确认） */
  get inProgress() {
    const c = this.current;
    return !!(c && c.started && !c.finished);
  }

  /** 离开前确认：弹窗期间暂停计时，选择继续则恢复 */
  confirmLeave(onLeave) {
    const c = this.current;
    if (!c) { onLeave(); return; }
    c.game._suspend();
    const stay = () => { if (this.current === c) c.game._resume(); };
    showModal({
      emoji: '🤔',
      title: '要离开这局游戏吗？',
      sub: '这一局还没完成，离开后本局进度不会保存',
      actions: [
        { label: '继续游戏', primary: true, onClick: stay },
        { label: '离开', onClick: onLeave },
      ],
      onClose: stay,
    });
  }

  /** 横屏时把棋盘以外的元素挪到侧栏，竖屏时放回原位 */
  arrange() {
    const c = this.current;
    const { stage, sideSlot } = this.host;
    if (!c || !c.rootEl || !stage || !sideSlot) return;
    const root = c.rootEl;
    const hasBoard = !!root.querySelector('.fit-box');
    const land = hasBoard && isLandscape();
    stage.classList.toggle('is-land', land);
    if (land) {
      Array.from(root.children).forEach((node) => {
        if (node.classList.contains('fit-box') || node.querySelector('.fit-box')) return;
        const mark = document.createComment('side');
        node.before(mark);
        node[SIDE_MARK] = mark;
        sideSlot.appendChild(node);
      });
    } else {
      Array.from(sideSlot.children).forEach((node) => {
        const mark = node[SIDE_MARK];
        if (mark && mark.parentNode) mark.replaceWith(node);
        else root.appendChild(node);
        node[SIDE_MARK] = null;
      });
    }
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
    this.arrange();

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

    const fitH = Math.max(180, availH - used);
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
    const cssReady = new Promise((resolve) => {
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 1200);
    });
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
      reload: (patch = {}) => this.load(id, { ...query, ...patch }, { onFinish, onScore }),
    });

    this.current = { id, meta, game, hud, link, rootEl: root, query, onFinish, onExit, onScore, theme, started: false };

    try {
      await cssReady;
      if (this.current?.game !== game) return;
      await game.mount();
      if (this.current?.game !== game) return; // 已被切换
      this.fit();
      // 字体 / 首屏布局稳定后再量一次，避免算小
      requestAnimationFrame(() => { if (this.current?.game === game) this.fit(); });
      const go = () => {
        if (this.current?.game !== game) return;
        this.current.started = true;
        game.start();
        onReady?.(meta);
      };
      if (!save.hasSeen(id) && meta.how) {
        save.markSeen(id);
        this.showHelp({ onDone: go, first: true });
      } else {
        go();
      }
    } catch (e) {
      console.error('[Runner] 游戏启动失败', e);
    }
    return game;
  }

  /** 玩法说明（首次进入自动弹出；游戏中点 ❓ 也能打开，打开期间暂停计时） */
  showHelp({ onDone, first = false } = {}) {
    const c = this.current;
    if (!c) return;
    const { meta, game } = c;
    const midGame = c.started && !first;
    if (midGame) game._suspend();
    const steps = (meta.how || []).map((t, i) => el('li.howto__step', {}, [
      el('span.howto__no', { text: String(i + 1) }),
      el('span', { text: t }),
    ]));
    const body = el('div.howto', {}, [
      el('div.howto__head', {}, [
        el('div.howto__icon', { text: meta.emoji, style: { '--glow': meta.glow } }),
        el('div', {}, [
          el('div.modal__title', { text: meta.name }),
          el('div.howto__sub', { text: first ? '第一次玩？先看看怎么玩' : '玩法说明' }),
        ]),
      ]),
      el('ol.howto__list', {}, steps),
      meta.skill ? el('div.howto__skill', { text: `🧠 锻炼：${meta.skill}` }) : null,
    ]);
    const done = () => {
      if (midGame) game._resume();
      onDone?.();
    };
    showModal({
      body,
      actions: [{ label: first ? '我知道了，开始！' : '继续游戏', primary: true, onClick: done }],
      dismissable: !first,
      onClose: done,
    });
    if (first) voice.speak(`${meta.name}。${(meta.how || [])[0] || ''}`);
  }

  _showPaused() {
    const c = this.current;
    if (!c) return;
    showModal({
      emoji: '⏸️',
      title: '游戏已暂停',
      sub: '刚才离开了一会儿，计时已经帮你停住了',
      actions: [
        { label: '继续游戏', primary: true, onClick: () => c.game._resume() },
        { label: '重新开始', onClick: () => this.restart() },
      ],
      dismissable: true,
      onClose: () => c.game._resume(),
    });
  }

  restart() {
    const c = this.current;
    if (!c) return;
    this.load(c.id, c.query, { onFinish: c.onFinish, onScore: c.onScore });
  }

  /** 结算：写存档 → 加脑力 → 弹面板 */
  _finish(result, { meta, query, onFinish }) {
    const c = this.current;
    if (!c) return;
    c.finished = true;
    const mode = result.mode || meta.scoreMode || 'max';
    const score = Number(result.score ?? 0);
    const stars = result.stars ?? 0;

    // noRecord：失败的一局（如扫雷踩雷）不参与最佳成绩
    const { isBest, prev } = result.noRecord
      ? { isBest: false, prev: save.best(meta.id)?.score ?? null }
      : save.submitBest(meta.id, score, result.meta || {}, mode);
    save.addPlay(meta.id);
    save.markTrained(meta.id);
    save.pushHistory({ game: meta.id, score, level: query.level });

    const gained = Math.max(2, Math.round((result.power ?? (4 + stars * 4)) * (isBest ? 1.4 : 1)));
    const power = save.addPower(gained);
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
      unit: meta.unit,
      stars,
      stats: [
        ...(result.stats || []),
        { label: '脑力 +', value: gained },
      ],
      newBest: isBest && prev != null,
      bestText: prev != null ? bestText : '',
      speak: result.speak,
      actions,
      dismissable: !onFinish,
      onClose: () => this._peekResult(),
    };
    this.lastResult = payload;
    // 让最后一步的动画先播完再弹面板
    setTimeout(() => {
      if (this.current !== c) return;
      showResult(payload);
      if (gained) toast(`脑力 +${gained} 💡 当前 ${power}`);
    }, result.delay ?? 260);
  }

  /** 成绩面板被点空白关掉后，在角落留一个"再看一眼"的入口 */
  _peekResult() {
    this._clearPeek();
    if (!this.lastResult) return;
    const btn = el('button.result-peek', {
      text: '🏆 看成绩',
      onClick: () => {
        this._clearPeek();
        showResult({ ...this.lastResult, speak: null, quiet: true });
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
    if (this.host.sideSlot) clear(this.host.sideSlot);
    this.host.stage?.classList.remove('is-land');
    this.current = null;
    this.lastResult = null;
    closeModal();
    voice.cancel();
  }
}
