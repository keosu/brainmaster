/**
 * Game 基类 —— 所有小游戏继承它。
 *
 * 生命周期： new → mount(root) → start() → [pause/resume] → destroy()
 * 子类只需要实现 mount()，其余按需覆盖。
 *
 * 通过 this.ctx 可以访问平台能力（HUD、结算、存档、音效、语音、主题）。
 */
export class Game {
  /**
   * @param {object} ctx 由运行器注入的上下文
   *   ctx.root      {HTMLElement}  游戏挂载节点
   *   ctx.meta      {object}       来自 manifest 的元数据
   *   ctx.options   {object}       路由参数（难度、主题等）
   *   ctx.hud       {Hud}          顶部信息条
   *   ctx.finish()  结算
   *   ctx.quit()    返回
   *   ctx.sound / ctx.voice / ctx.save / ctx.theme
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.root = ctx.root;
    this.meta = ctx.meta;
    this.options = ctx.options || {};
    this.destroyed = false;
    this._timers = new Set();
    this._intervals = new Set();
    this._frames = new Set();
    this._listeners = [];
  }

  /* ---------- 必须实现 ---------- */
  /** 构建界面（异步可选）。返回后运行器调用 start() */
  async mount() { throw new Error('mount() 未实现'); }

  /* ---------- 可选实现 ---------- */
  start() {}
  pause() {}
  resume() {}
  onResize() {}
  destroy() {}

  /* ---------- 受管资源（自动清理，避免内存泄漏） ---------- */
  later(fn, ms) {
    const id = setTimeout(() => { this._timers.delete(id); if (!this.destroyed) fn(); }, ms);
    this._timers.add(id);
    return id;
  }
  every(fn, ms) {
    const id = setInterval(() => { if (!this.destroyed) fn(); }, ms);
    this._intervals.add(id);
    return id;
  }
  frame(fn) {
    let stop = false;
    const step = () => { if (stop || this.destroyed) return; fn(); const id = requestAnimationFrame(step); this._frames.add(id); };
    const id = requestAnimationFrame(step);
    this._frames.add(id);
    return () => { stop = true; };
  }
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._listeners.push([target, type, fn, opts]);
    return fn;
  }
  clearLater(id) { clearTimeout(id); this._timers.delete(id); }
  clearEvery(id) { clearInterval(id); this._intervals.delete(id); }

  /* ---------- 便捷访问 ---------- */
  get hud() { return this.ctx.hud; }
  get sound() { return this.ctx.sound; }
  get voice() { return this.ctx.voice; }
  get save() { return this.ctx.save; }
  /** 当前主题（若游戏支持主题），否则为 null */
  get theme() { return this.ctx.theme || null; }

  /** 说话（受设置控制） */
  say(text, opts) { this.ctx.voice?.speak(text, opts); }

  /** 结算并弹出结果面板 */
  finish(result) { this.ctx.finish(result); }

  /** 统一清理：子类覆盖 destroy 时请先调用 super.destroy() */
  teardown() {
    this.destroyed = true;
    this._timers.forEach(clearTimeout);
    this._intervals.forEach(clearInterval);
    this._frames.forEach(cancelAnimationFrame);
    this._listeners.forEach(([t, type, fn, opts]) => t.removeEventListener(type, fn, opts));
    this._timers.clear(); this._intervals.clear(); this._frames.clear(); this._listeners.length = 0;
    try { this.destroy(); } catch (e) { console.warn('[Game] destroy 出错', e); }
  }
}

/**
 * 计时器工具：正计时 / 倒计时都用它，destroy 时自动停止
 * const t = new Timer(this); t.startCountdown(60000, onTick, onEnd)
 */
export class Timer {
  constructor(game) { this.game = game; this.endAt = 0; this.left = 0; this.running = false; this.onTick = null; this.onEnd = null; }
  startCountdown(ms, onTick, onEnd) {
    this.left = ms; this.endAt = performance.now() + ms;
    this.onTick = onTick; this.onEnd = onEnd; this.running = true;
    onTick?.(this.left);
    this.game.every(() => {
      if (!this.running) return;
      this.left = Math.max(0, this.endAt - performance.now());
      this.onTick?.(this.left);
      if (this.left <= 0) { this.running = false; this.onEnd?.(); }
    }, 100);
  }
  /** 正计时，累计毫秒保存在 this.ms */
  startCountUp(onTick) {
    const t0 = performance.now();
    this.running = true;
    this.ms = 0;
    this.game.every(() => { if (this.running) { this.ms = performance.now() - t0; onTick?.(this.ms); } }, 100);
  }
  /** 暂停/继续（倒计时专用） */
  pause() { if (this.running) { this.left = Math.max(0, this.endAt - performance.now()); this.running = false; } }
  resume() { if (!this.running && this.left > 0) { this.endAt = performance.now() + this.left; this.running = true; } }
  stop() { this.running = false; }
  get elapsedMs() { return performance.now(); }
}
