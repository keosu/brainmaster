/**
 * Brain Master · 入口
 * 同步设置 → 平台适配（PWA / 全屏 / 返回键）→ 启动外壳 → 启动路由
 */
import { save } from './core/storage.js';
import { sound, voice } from './core/audio.js';
import * as router from './core/router.js';
import { initPlatform } from './core/platform.js';
import { initHonors } from './core/honors.js';
import { boot } from './ui/shell.js';
import { showSplash } from './ui/splash.js';

sound.setEnabled(save.settings.sound);
voice.setEnabled(save.settings.voice);
voice.init(); // 原生环境下预加载 TTS 插件（浏览器开发时自动跳过）
initHonors(); // 老存档迁移 + 按已有数据补发成就

const shell = boot(document.getElementById('app'));
initPlatform({ onBack: () => shell.handleBack() });
router.start();
showSplash(); // 开屏 Logo：自动播放、自动消失

// 便于调试与二次开发
window.BrainMaster = { save, sound, voice, router, runner: shell.runner };
