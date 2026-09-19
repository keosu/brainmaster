/** 应用外壳：顶栏 + 路由 + 舞台 + 每日训练流程 */
import { el, clear } from '../core/utils.js';
import { save } from '../core/storage.js';
import { sound, voice } from '../core/audio.js';
import * as router from '../core/router.js';
import { renderHome, pickTrainingSet } from './home.js';
import { Runner } from './runner.js';
import { getGameMeta } from '../games/manifest.js';
import { showModal, clearOverlays } from './modal.js';
import { levelOf } from '../core/storage.js';

export function boot(app) {
  clear(app);

  /* ---------- 顶栏 ---------- */
  const back = el('button.topbar__back', {
    onClick: () => router.home(),
  }, [el('span', { text: '←' }), el('span', { text: '首页' })]);

  const titleBox = el('div', {}, [
    el('div.topbar__title', { text: 'Brain Master' }),
    el('div.topbar__sub', { text: '脑力训练营' }),
  ]);

  const brand = el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
    el('div', {
      text: '🧠',
      style: { width: '36px', height: '36px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--grad-hero)', fontSize: '19px' },
    }),
    el('div.topbar__title', { text: 'Brain Master' }),
  ]);

  const btnSound = iconBtn('🔊', () => {
    const v = save.toggleSetting('sound');
    sound.setEnabled(v);
    btnSound.textContent = v ? '🔊' : '🔇';
    btnSound.classList.toggle('is-off', !v);
    if (v) sound.play('tap');
  }, !save.settings.sound);

  const btnVoice = iconBtn('🗣️', () => {
    const v = save.toggleSetting('voice');
    voice.setEnabled(v);
    btnVoice.classList.toggle('is-off', !v);
    if (v) voice.speak('语音已开启');
  }, !save.settings.voice);

  const topbar = el('header.topbar', {}, [
    back, brand, titleBox,
    el('div.topbar__spacer'),
    el('div.topbar__actions', {}, [btnSound, btnVoice]),
  ]);

  const content = el('div.shell__content');

  const shell = el('div.shell', {}, [topbar, content]);
  app.appendChild(shell);

  const runner = new Runner({ hudArea: null, gameArea: null });
  let host = null;
  let trainState = null;

  function setTopbar(mode, opts = {}) {
    back.classList.toggle('u-hide', mode === 'home');
    brand.classList.toggle('u-hide', mode !== 'home');
    titleBox.classList.toggle('u-hide', mode === 'home');
    if (mode !== 'home') {
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
    renderHome(content);
    window.scrollTo({ top: 0 });
  }

  /* ---------- 单游戏 ---------- */
  function ensureStage() {
    clear(content);
    const hudArea = el('div.stage__hud');
    const trainArea = el('div.stage__train');
    const body = el('div.stage__body');
    const stage = el('main.stage', {}, [trainArea, hudArea, body]);
    content.appendChild(stage);
    host = { hudArea, gameArea: body, trainArea };
    runner.host = host;
    return host;
  }

  function showGame(id, query = {}) {
    const meta = getGameMeta(id);
    if (!meta) { showHome(); return; }
    const h = ensureStage();
    clear(h.trainArea);
    setTopbar('game', { title: `${meta.emoji} ${meta.name}`, sub: meta.category });
    runner.load(id, query);
  }

  /* ---------- 每日训练 ---------- */
  function showTraining() {
    const set = pickTrainingSet(3);
    if (!set.length) { showHome(); return; }
    const h = ensureStage();
    clearOverlays();
    setTopbar('game', { title: '🎯 每日训练', sub: '3 个项目连做' });
    trainState = { list: set, i: 0, scores: [] };

    const renderBar = () => {
      clear(h.trainArea);
      const bar = el('div.trainbar');
      set.forEach((g, idx) => {
        const done = idx < trainState.i;
        const now = idx === trainState.i;
        bar.appendChild(el(`div.trainbar__chip${done ? '.is-done' : now ? '.is-now' : ''}`, {
          text: `${done ? '✓ ' : ''}${g.emoji} ${g.name}`,
        }));
      });
      h.trainArea.appendChild(bar);
    };
    renderBar();

    const next = () => {
      if (trainState.i >= set.length) return finishTraining();
      const g = set[trainState.i];
      const idx = trainState.i;
      trainState.i += 1;
      renderBar();
      runner.load(g.id, g.theme ? { theme: save.settings.theme } : {}, {
        onFinish: {
          label: idx === set.length - 1 ? '查看总结' : '下一个',
          onNext: () => next(),
        },
        onScore: (r) => {
          trainState.scores.push({ name: g.name, score: r.score, stars: r.stars, emoji: g.emoji });
        },
      });
    };
    next();
  }

  function finishTraining() {
    const total = trainState.scores.reduce((a, b) => a + b.score, 0);
    const bonus = Math.round(total * 0.5) + 20;
    const power = save.addPower(bonus);
    const lv = levelOf(power);
    clearOverlays();
    showModal({
      emoji: '🏅',
      title: '今日训练完成！',
      sub: `三个项目全部通关，额外奖励脑力 ${bonus} 点。当前称号：${lv.emoji} ${lv.title}`,
      body: el('div.modal__stats', {}, trainState.scores.map((s) => el('div.modal__stat', {}, [
        el('b', { text: String(s.score) }),
        el('span', { text: `${s.emoji} ${s.name}` }),
      ]))),
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
  router.onRoute(({ seg, query }) => {
    const [root, param] = seg;
    if (!root) return showHome();
    if (root === 'game') return showGame(param, query);
    if (root === 'training') return showTraining();
    showHome();
  });

  // Esc 返回首页（游戏中）
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && runner.current) router.home();
  });

  // 首次交互解锁音频
  const unlock = () => { sound.play('tap'); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock, { once: true });

  return { runner, showHome };
}

function iconBtn(emoji, onClick, off = false) {
  const b = el(`button.icon-btn${off ? '.is-off' : ''}`, { text: emoji, onClick });
  return b;
}
