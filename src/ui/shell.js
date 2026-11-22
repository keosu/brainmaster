/** 应用外壳：顶栏 + 路由 + 舞台 + 每日训练流程 */
import { el, clear, svgToDataUri } from '../core/utils.js';
import { save, levelOf } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import * as router from '../core/router.js';
import { canFullscreen, toggleFullscreen, isFullscreen } from '../core/platform.js';
import { renderHome, pickTrainingSet } from './home.js';
import { Runner } from './runner.js';
import { getGameMeta } from '../games/manifest.js';
import { showModal, dismissTop, clearOverlays, toast } from './modal.js';
import { openSettings } from './settings.js';
import { iconSvg } from './logo.js';
import { renderHonor } from './honor.js';
import { evaluateAchievements } from '../core/honors.js';

export const LOGO_URL = svgToDataUri(iconSvg({ bg: 'rounded', scale: 0.9 }));

export function boot(app) {
  clear(app);

  /* ---------- 顶栏 ---------- */
  const back = el('button.topbar__back', {
    onClick: () => router.home(),
    'aria-label': '返回首页',
  }, [
    el('span.topbar__back-ico', { text: '‹' }),
    el('span.topbar__back-label', { text: '首页' }),
  ]);

  const titleBox = el('div.topbar__titlebox', {}, [
    el('span.topbar__title', { text: 'Brain Master' }),
    el('span.topbar__sub', { text: '脑力训练营' }),
  ]);

  const brand = el('div.topbar__brand', {}, [
    el('img.topbar__logo', { src: LOGO_URL, alt: '' }),
    el('div.topbar__brandtext', {}, [
      el('div.topbar__title.topbar__title--brand', { text: '脑力大师' }),
      el('span.topbar__slogan', { text: 'Brain Master · 每天 5 分钟' }),
    ]),
  ]);

  const btnHelp = iconBtn('❓', '玩法说明', () => runner.showHelp());

  const btnFull = iconBtn('⛶', '全屏', () => toggleFullscreen());
  btnFull.classList.toggle('u-hide', !canFullscreen());
  const syncFull = () => {
    btnFull.classList.toggle('is-on', isFullscreen());
    btnFull.title = isFullscreen() ? '退出全屏' : '全屏';
  };
  document.addEventListener('fullscreenchange', syncFull);
  document.addEventListener('webkitfullscreenchange', syncFull);

  const btnSound = iconBtn(save.settings.sound ? '🔊' : '🔇', '音效', () => {
    const v = save.toggleSetting('sound');
    sound.setEnabled(v);
    btnSound.textContent = v ? '🔊' : '🔇';
    btnSound.classList.toggle('is-off', !v);
    if (v) sound.play('tap');
  });
  btnSound.classList.toggle('is-off', !save.settings.sound);

  const btnSettings = iconBtn('⚙️', '设置', () => openSettings({ onChange: syncSettings }));
  const btnHonor = iconBtn('🏆', '荣誉殿堂', () => router.go('/honor'));

  function syncSettings() {
    btnSound.textContent = save.settings.sound ? '🔊' : '🔇';
    btnSound.classList.toggle('is-off', !save.settings.sound);
  }

  const topbar = el('header.topbar', {}, [
    back, brand, titleBox,
    el('div.topbar__spacer'),
    el('div.topbar__actions', {}, [btnHelp, btnHonor, btnFull, btnSound, btnSettings]),
  ]);

  const content = el('div.shell__content');
  const shell = el('div.shell', {}, [topbar, content]);
  app.appendChild(shell);

  const runner = new Runner({ hudArea: null, gameArea: null });
  let trainState = null;
  let onHome = true;

  function setTopbar(mode, opts = {}) {
    const home = mode === 'home';
    back.classList.toggle('u-hide', home);
    brand.classList.toggle('u-hide', !home);
    titleBox.classList.toggle('u-hide', home);
    btnHelp.classList.toggle('u-hide', home || !opts.help);
    btnHonor.classList.toggle('u-hide', !home);
    shell.classList.toggle('is-home', home);
    if (!home) {
      titleBox.children[0].textContent = opts.title || '';
      titleBox.children[1].textContent = opts.sub || '';
    }
  }

  /* ---------- 首页 ---------- */
  function showHome() {
    runner.unload();
    clearOverlays();
    clear(content);
    setTopbar('home');
    onHome = true;
    renderHome(content);
    content.scrollTo?.({ top: 0 });
  }

  /* ---------- 荣誉殿堂 ---------- */
  function showHonorPage() {
    runner.unload();
    clearOverlays();
    clear(content);
    setTopbar('page', { title: '🏆 荣誉殿堂', sub: '称号 · 打卡 · 成就' });
    onHome = false;
    renderHonor(content);
    content.scrollTo?.({ top: 0 });
  }

  /* ---------- 单游戏 ---------- */
  function ensureStage() {
    clear(content);
    const hudArea = el('div.stage__hud');
    const sideSlot = el('div.stage__slot');
    const side = el('aside.stage__side', {}, [hudArea, sideSlot]);
    const trainArea = el('div.stage__train');
    const body = el('div.stage__body');
    const stage = el('main.stage', {}, [trainArea, side, body]);
    content.appendChild(stage);
    const host = { hudArea, gameArea: body, trainArea, stage, sideSlot };
    runner.host = host;
    return host;
  }

  function showGame(id, query = {}) {
    const meta = getGameMeta(id);
    if (!meta) { showHome(); return; }
    const h = ensureStage();
    clear(h.trainArea);
    onHome = false;
    trainState = null;
    setTopbar('game', { title: `${meta.emoji} ${meta.name}`, sub: meta.category, help: !!meta.how });
    runner.load(id, query);
  }

  /* ---------- 每日训练 ---------- */
  function showTraining() {
    const set = pickTrainingSet(3);
    if (!set.length) { showHome(); return; }
    const h = ensureStage();
    h.stage.classList.add('has-train');
    clearOverlays();
    onHome = false;
    setTopbar('game', { title: '🎯 每日训练', sub: '3 个项目连做', help: true });
    trainState = { list: set, i: 0, scores: [] };

    const renderBar = () => {
      clear(h.trainArea);
      const bar = el('div.trainbar');
      set.forEach((g, idx) => {
        const done = idx < trainState.i - 1;
        const now = idx === trainState.i - 1;
        bar.appendChild(el(`div.trainbar__chip${done ? '.is-done' : now ? '.is-now' : ''}`, {
          text: `${done ? '✓ ' : ''}${g.emoji} ${g.name}`,
        }));
      });
      h.trainArea.appendChild(bar);
    };

    const next = () => {
      if (trainState.i >= set.length) return finishTraining();
      const g = set[trainState.i];
      const idx = trainState.i;
      trainState.i += 1;
      renderBar();
      runner.load(g.id, g.theme ? { theme: save.settings.theme } : {}, {
        onFinish: {
          label: idx === set.length - 1 ? '查看总结' : '下一个 ›',
          onNext: () => next(),
        },
        onScore: (r) => {
          trainState.scores.push({ name: g.name, score: r.score, stars: r.stars, emoji: g.emoji, unit: g.unit });
        },
      });
    };
    next();
  }

  function finishTraining() {
    const starsTotal = trainState.scores.reduce((a, b) => a + (b.stars || 0), 0);
    const bonus = 20 + starsTotal * 6;
    const power = save.addPower(bonus);
    const lv = levelOf(power);
    save.addTraining();
    const unlocked = evaluateAchievements();
    clearOverlays();
    showModal({
      emoji: '🏅',
      title: '今日训练完成！',
      sub: `三个项目全部完成，额外奖励脑力 ${bonus} 点。当前称号：${lv.emoji} ${lv.title} · 连续打卡 ${save.streak} 天`,
      body: el('div', {}, [
        el('div.modal__stats', {}, trainState.scores.map((s) => el('div.modal__stat', {}, [
          el('b', { text: `${s.score}${s.unit || ''}` }),
          el('span', { text: `${s.emoji} ${s.name} ${'⭐'.repeat(s.stars || 0)}` }),
        ]))),
        unlocked.length ? el('div.modal__honors', {}, unlocked.map((a) => el('div.honor-pop', {}, [
          el('span.honor-pop__ico', { text: a.emoji }),
          el('span', {}, [el('small', { text: '解锁成就' }), el('b', { text: a.name })]),
        ]))) : null,
      ]),
      actions: [
        { label: '再来一组', primary: true, onClick: () => router.go('/training') },
        { label: '返回首页', onClick: () => router.home() },
      ],
      dismissable: false,
    });
    sound.play('win');
    voice.speak(`训练完成，奖励脑力 ${bonus} 点`);
  }

  /* ---------- 路由 ---------- */
  // 游戏进行中离开（返回键、Esc、系统返回手势）先确认，防止误触退出
  let allowLeave = false;
  router.setGuard((nextHash) => {
    if (allowLeave) { allowLeave = false; return true; }
    if (!runner.inProgress) return true;
    runner.confirmLeave(() => {
      allowLeave = true;
      location.hash = nextHash;
    });
    return false;
  });

  router.onRoute(({ seg, query }) => {
    const [root, param] = seg;
    if (!root) return showHome();
    if (root === 'game') return showGame(param, query);
    if (root === 'training') return showTraining();
    if (root === 'honor') return showHonorPage();
    showHome();
  });

  // Esc 返回首页（游戏中）
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && runner.current && !document.querySelector('#overlay-root .overlay')) router.home();
  });

  // 设置里隐藏/导入游戏后，若停留在首页则原地刷新
  window.addEventListener('bm:settings-changed', () => {
    syncSettings();
    if (onHome) { clear(content); renderHome(content); }
  });

  window.addEventListener('bm:update-ready', () => toast('✨ 新版本已下载，下次打开自动生效', 3200));

  /** 安卓返回键：先关弹窗，再回首页；已在首页则交给系统（退到后台） */
  function handleBack() {
    if (dismissTop()) return true;
    if (document.querySelector('#overlay-root .overlay')) {
      if (!onHome) router.home();
      return true;
    }
    if (!onHome) { router.home(); return true; }
    return false;
  }

  return { runner, showHome, handleBack };
}

function iconBtn(emoji, label, onClick) {
  return el('button.icon-btn', { text: emoji, title: label, 'aria-label': label, onClick });
}
