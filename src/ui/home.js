/** 首页：脑力档案 + 每日训练 + 主题选择 + 游戏列表 */
import { el, clear, shuffle } from '../core/utils.js';
import { save, levelOf } from '../core/storage.js';
import { GAMES, quickGames, themedGames } from '../games/manifest.js';
import * as router from '../core/router.js';
import { listThemes } from '../themes/index.js';
import { sound } from '../core/audio.js';

let filterCat = '全部';

export function renderHome(content) {
  clear(content);
  const home = el('div.home');

  /* ---------- Hero（一行轻量状态条） ---------- */
  const power = save.brain.power;
  const lv = levelOf(power);
  const totalPlays = Object.values(save.all.plays).reduce((a, b) => a + b, 0);
  const trained = save.trainedToday.length;

  const heroTip = lv.next
    ? `再获得 ${lv.remain} 点脑力可晋升「${lv.next.title}」`
    : '已达最高称号，你就是光之智者！';
  const dailyDone = trained >= 3;
  const hero = el('section.hero', { title: heroTip }, [
    el('div.hero__row', {}, [
      el('span.hero__stat', { html: `🧠 脑力 <b>${power}</b>` }),
      el('span.hero__stat', { text: `${lv.emoji} ${lv.title}` }),
      el('span.hero__stat', { html: `🎯 今日 <b>${trained}/3</b>` }),
      el('span.hero__stat', { html: `🏆 <b>${totalPlays}</b> 次` }),
      el('button.btn.btn--pop.btn--sm.hero__daily', {
        text: dailyDone ? '✅ 再来一组' : '🎯 开始训练',
        title: dailyDone ? '今日训练已完成，可继续加练' : '随机 3 个小游戏，全部完成脑力翻倍',
        onClick: () => { sound.play('go'); router.go('/training'); },
      }),
    ]),
    el('div.levelbar', {}, [el('div.levelbar__fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })]),
  ]);

  /* ---------- 游戏列表 ---------- */
  const cats = ['全部', ...new Set(GAMES.map((g) => g.category))];
  const catRow = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
  cats.forEach((c) => {
    const chip = el('button.chip', { text: c, onClick: () => { filterCat = c; syncCats(); renderGrid(); } });
    if (c === filterCat) chip.classList.add('is-on');
    catRow.appendChild(chip);
  });
  function syncCats() {
    Array.from(catRow.children).forEach((b) => b.classList.toggle('is-on', b.textContent === filterCat));
  }

  const grid = el('div.grid-games');
  function renderGrid() {
    clear(grid);
    const hidden = new Set(save.settings.hidden || []);
    const pool = GAMES.filter((g) => !hidden.has(g.id));
    const list = filterCat === '全部' ? pool : pool.filter((g) => g.category === filterCat);
    list.forEach((g) => grid.appendChild(gameCard(g)));
  }
  renderGrid();

  const hidden = save.settings.hidden || [];
  const visibleCount = GAMES.filter((g) => !hidden.includes(g.id)).length;
  const gamesSection = el('section', {}, [
    el('div.section__head', {}, [
      el('h2.section__title', { text: '🎮 游戏大厅' }),
      el('span.section__hint', { text: `${visibleCount} 个项目 · 点开即玩` }),
    ]),
    catRow,
    el('div', { style: { height: '12px' } }),
    grid,
  ]);

  home.append(hero, gamesSection);
  content.appendChild(home);
  return home;
}

function gameCard(g) {
  const best = save.best(g.id);
  const card = el('button.gcard', {
    style: { '--glow': g.glow },
    onClick: () => {
      sound.play('go');
      // 主题不再由首页决定：支持换皮的游戏会在自己的界面里提供切换
      router.openGame(g.id, {});
    },
  }, [
    el('div.gcard__top', {}, [
      el('div.gcard__icon', { text: g.emoji }),
      el('div', {}, [
        el('div.gcard__name', { text: g.name }),
        el('div.gcard__cat', { text: `${g.category}${g.theme ? ' · 可换皮' : ''}` }),
      ]),
    ]),
    el('div.gcard__desc', { text: g.desc }),
    el('div.gcard__foot', {}, [
      el('div.gcard__tags', {}, [
        g.quick ? el('span.tag', { text: '每日训练' }) : null,
        g.levels ? el('span.tag', { text: `${g.levels.length} 档难度` }) : null,
      ].filter(Boolean)),
      el('div', {}, [
        best
          ? el('span.gcard__best', { text: `最佳 ${best.score}${g.unit}` })
          : el('span', { text: '未挑战', style: { color: 'var(--ink-3)' } }),
      ]),
    ]),
  ]);
  return card;
}

/** 每日训练抽 3 个（优先没玩过的；排除被隐藏的游戏） */
export function pickTrainingSet(n = 3) {
  const hidden = new Set(save.settings.hidden || []);
  const quick = quickGames().filter((g) => !hidden.has(g.id));
  const pool = quick.length ? quick : quickGames(); // 全隐藏时退回全部，保证可用
  const done = save.trainedToday;
  const fresh = shuffle(pool.filter((g) => !done.includes(g.id)));
  const rest = shuffle(pool.filter((g) => done.includes(g.id)));
  return [...fresh, ...rest].slice(0, n);
}

export function themeName(id) {
  return listThemes().find((t) => t.id === id)?.name || id;
}
