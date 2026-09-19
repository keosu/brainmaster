/**
 * Brain Master · 入口
 * 只做三件事：同步设置 → 启动外壳 → 启动路由
 */
import { save } from './core/storage.js';
import { sound, voice } from './core/audio.js';
import * as router from './core/router.js';
import { boot } from './ui/shell.js';
import { showSplash } from './ui/splash.js';

sound.setEnabled(save.settings.sound);
voice.setEnabled(save.settings.voice);
voice.init(); // 原生环境下预加载 TTS 插件（浏览器开发时自动跳过）

boot(document.getElementById('app'));
router.start();
showSplash(); // 开屏 Logo：自动播放、自动消失

// 便于调试与二次开发
window.BrainMaster = { save, sound, voice, router };
