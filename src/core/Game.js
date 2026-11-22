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
    this._clocks = new Set();
    this.suspended = false;
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
  /** 暂停期间到点的 later 会被推迟到恢复后执行；every 在暂停期间直接跳过 */
  later(fn, ms) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      if (this.destroyed) return;
      if (this.suspended) (this._deferred ||= []).push(fn);
      else fn();
    }, ms);
    this._timers.add(id);
    return id;
  }
  every(fn, ms) {
    const id = setInterval(() => { if (!this.destroyed && !this.suspended) fn(); }, ms);
    this._intervals.add(id);
    return id;
  }
  frame(fn) {
    let stop = false;
    const step = () => {
      if (stop || this.destroyed) return;
      if (!this.suspended) fn();
      const id = requestAnimationFrame(step);
      this._frames.add(id);
    };
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
  finish(result) {
    this._clocks.forEach((t) => t.stop());
    this.ctx.finish(result);
  }

  /** 是否有正在走的计时器（运行器据此决定切后台回来时要不要弹「继续」） */
  get hasRunningClock() {
    for (const t of this._clocks) if (t.running) return true;
    return false;
  }

  /** 运行器调用：切后台 / 打开玩法说明时冻结所有 Timer，再交给子类的 pause() */
  _suspend() {
    if (this.suspended || this.destroyed) return;
    this.suspended = true;
    this._clocks.forEach((t) => t.pause());
    try { this.pause(); } catch (e) { console.warn(e); }
  }
  _resume() {
    if (!this.suspended || this.destroyed) return;
    this.suspended = false;
    this._clocks.forEach((t) => t.resume());
    const queued = this._deferred || [];
    this._deferred = [];
    queued.forEach((fn) => fn());
    try { this.resume(); } catch (e) { console.warn(e); }
  }

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
  constructor(game) {
    this.game = game;
    this.mode = null; // 'down' | 'up'
    this.endAt = 0; this.left = 0; this.total = 0;
    this.ms = 0; this._acc = 0; this._t0 = 0;
    this.running = false; this.paused = false;
    this.onTick = null; this.onEnd = null;
    game._clocks?.add(this);
  }
  startCountdown(ms, onTick, onEnd) {
    this.mode = 'down';
    this.total = ms;
    this.left = ms; this.endAt = performance.now() + ms;
    this.onTick = onTick; this.onEnd = onEnd; this.running = true; this.paused = false;
    onTick?.(this.left);
    this.game.every(() => {
      if (!this.running) return;
      this.left = Math.max(0, this.endAt - performance.now());
      this.onTick?.(this.left);
      if (this.left <= 0) { this.running = false; this.onEnd?.(); }
    }, 100);
  }
  /** 正计时，累计毫秒保存在 this.ms（暂停期间不计时） */
  startCountUp(onTick) {
    this.mode = 'up';
    this._acc = 0;
    this._t0 = performance.now();
    this.running = true; this.paused = false;
    this.ms = 0;
    this.onTick = onTick;
    this.game.every(() => {
      if (!this.running) return;
      this.ms = this._acc + performance.now() - this._t0;
      this.onTick?.(this.ms);
    }, 100);
  }
  /** 倒计时加减时间（负数为扣时），不超过 max */
  addTime(delta, max = Infinity) {
    if (this.mode !== 'down') return;
    const now = performance.now();
    const cur = this.running ? Math.max(0, this.endAt - now) : this.left;
    this.left = Math.max(0, Math.min(max, cur + delta));
    this.endAt = now + this.left;
  }
  pause() {
    if (!this.running) return;
    if (this.mode === 'up') { this._acc += performance.now() - this._t0; this.ms = this._acc; }
    else this.left = Math.max(0, this.endAt - performance.now());
    this.running = false;
    this.paused = true;
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.mode === 'up') { this._t0 = performance.now(); this.running = true; }
    else if (this.left > 0) { this.endAt = performance.now() + this.left; this.running = true; }
  }
  stop() {
    if (this.running && this.mode === 'up') this.ms = this._acc + performance.now() - this._t0;
    this.running = false; this.paused = false;
  }
}
