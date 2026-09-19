/**
 * 音效：全部用 WebAudio 实时合成，零资源依赖。
 * 游戏里统一调用 sound.play('flip') 等，后期可替换为音频文件。
 *
 * 语音：优先用 Capacitor 原生 TTS 插件（安卓 WebView 没有 speechSynthesis，
 * 必须走原生桥接才能出声）；浏览器里回退到 Web Speech API。
 *
 * 注意：Capacitor 相关包通过「运行时动态 import + 原生判断」加载，绝不在顶层
 * 静态 import。这样纯浏览器开发（python serve.py + src 直读）不会触发裸模块
 * 说明符解析失败；打包时 esbuild 再把插件内联进 app.js。
 */
const TONES = {
  tap: [{ f: 520, d: 0.06, type: 'triangle', g: 0.16 }],
  flip: [{ f: 660, d: 0.09, type: 'sine', g: 0.2 }, { f: 880, d: 0.08, type: 'sine', g: 0.14, t: 0.05 }],
  place: [{ f: 300, d: 0.09, type: 'square', g: 0.12 }],
  good: [{ f: 660, d: 0.1, type: 'sine', g: 0.2 }, { f: 990, d: 0.14, type: 'sine', g: 0.18, t: 0.08 }],
  great: [{ f: 523, d: 0.1, type: 'sine', g: 0.2 }, { f: 784, d: 0.1, type: 'sine', g: 0.2, t: 0.09 }, { f: 1046, d: 0.2, type: 'sine', g: 0.2, t: 0.18 }],
  bad: [{ f: 200, d: 0.16, type: 'sawtooth', g: 0.14 }, { f: 150, d: 0.18, type: 'sawtooth', g: 0.12, t: 0.1 }],
  tick: [{ f: 1200, d: 0.03, type: 'square', g: 0.06 }],
  win: [{ f: 523, d: 0.12, type: 'triangle', g: 0.2 }, { f: 659, d: 0.12, type: 'triangle', g: 0.2, t: 0.12 }, { f: 784, d: 0.12, type: 'triangle', g: 0.2, t: 0.24 }, { f: 1046, d: 0.3, type: 'triangle', g: 0.22, t: 0.36 }],
  lose: [{ f: 392, d: 0.16, type: 'sine', g: 0.16 }, { f: 311, d: 0.2, type: 'sine', g: 0.16, t: 0.15 }, { f: 233, d: 0.34, type: 'sine', g: 0.16, t: 0.32 }],
  go: [{ f: 880, d: 0.14, type: 'square', g: 0.12 }],
};

/** 是否运行在原生壳（安卓/iOS）里：原生运行时会在 window 上挂 Capacitor。 */
function isNative() {
  return typeof window !== 'undefined'
    && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/** 安卓 WebView 的 AudioContext 默认是 suspended，必须在用户手势里 resume 一次。 */
let _audioUnlocked = false;
function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try { sound._ac(); } catch { /* 忽略 */ }
}
if (typeof window !== 'undefined') {
  const evs = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handler = () => {
    unlockAudio();
    evs.forEach((e) => window.removeEventListener(e, handler));
  };
  evs.forEach((e) => window.addEventListener(e, handler, { passive: true }));
}

class Sound {
  constructor() { this.ctx = null; this.enabled = true; }

  _ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** 播放预置音效 */
  play(name) {
    if (!this.enabled) return;
    const seq = TONES[name] || TONES.tap;
    const ac = this._ac();
    if (!ac) return;
    const now = ac.currentTime;
    seq.forEach(({ f, d, type = 'sine', g = 0.15, t = 0 }) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(g, now + t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + t);
      osc.stop(now + t + d + 0.02);
    });
  }

  /** 自定义音高（如钢琴键、序列记忆） */
  tone(freq, dur = 0.14, type = 'sine', gain = 0.16) {
    if (!this.enabled) return;
    const ac = this._ac();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  setEnabled(v) { this.enabled = !!v; }
}

export const sound = new Sound();

/* ---------------- 语音朗读（儿童友好） ---------------- */
class Voice {
  constructor() {
    this.enabled = true;
    this.rate = 1.0;
    this.pitch = 1.1;
    this.lang = 'zh-CN';
    this._ttsPromise = null;
  }

  /** 首次进入原生环境时预加载 TTS 插件（动态 import，浏览器开发时不触发）。 */
  init() {
    if (isNative()) this._ensureTTS();
  }

  _ensureTTS() {
    if (this._ttsPromise) return this._ttsPromise;
    this._ttsPromise = (async () => {
      if (!isNative()) return null;
      try {
        const mod = await import('@capacitor-community/text-to-speech');
        return mod.TextToSpeech || null;
      } catch (e) {
        console.warn('[voice] 原生 TTS 加载失败', e);
        return null;
      }
    })();
    return this._ttsPromise;
  }

  /**
   * 朗读文字。
   * 原生环境（安卓/iOS）走 Capacitor 原生 TTS —— 这是安卓能出声的关键；
   * 浏览器回退到 Web Speech API（安卓 WebView 不支持，故原生必须走上面的桥接）。
   */
  async speak(text, { interrupt = true } = {}) {
    if (!this.enabled || !text) return;
    const str = String(text);

    // 1) 原生平台：优先用系统 TTS 引擎（离线、稳定、不受 WebView 限制）
    if (isNative()) {
      const tts = await this._ensureTTS();
      if (tts) {
        try {
          await tts.speak({
            text: str,
            lang: this.lang,
            rate: this.rate,
            pitch: this.pitch,
            volume: 1.0,
            category: 'playback', // iOS：静音键/后台仍可播
          });
          return;
        } catch (e) {
          console.warn('[voice] 原生 TTS 播音失败，回退 Web Speech', e);
        }
      }
    }

    // 2) Web 回退：Web Speech API
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(str);
    u.lang = this.lang;
    u.rate = this.rate;
    u.pitch = this.pitch;
    synth.speak(u);
  }

  cancel() {
    if (isNative()) {
      this._ensureTTS().then((tts) => { try { tts && tts.stop(); } catch { /* ignore */ } }).catch(() => {});
    }
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }

  setEnabled(v) { this.enabled = !!v; if (!v) this.cancel(); }
}

export const voice = new Voice();
