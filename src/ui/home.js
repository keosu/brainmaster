/** 首页：脑力档案 + 每日训练 + 最近玩过 + 游戏大厅 */
import { el, clear, shuffle } from '../core/utils.js';
import { save, levelOf } from '../core/storage.js';
import { GAMES, quickGames, getGameMeta, CATEGORY_META } from '../games/manifest.js';
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
      el('span.hero__stat', { html: `🎯 今日 <b>${Math.min(trained, 99)}</b>` }),
      el('span.hero__stat', { html: `🏆 <b>${totalPlays}</b> 次` }),
      el('button.btn.btn--pop.btn--sm.hero__daily', {
        text: dailyDone ? '✅ 再来一组' : '🎯 每日训练',
        title: dailyDone ? '今日训练已完成，可继续加练' : '随机 3 个小游戏连做，完成额外奖励脑力',
        onClick: () => { sound.play('go'); router.go('/training'); },
      }),
    ]),
    el('div.levelbar', {}, [el('div.levelbar__fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })]),
    el('div.hero__tip', { text: heroTip }),
  ]);

  const hidden = new Set(save.settings.hidden || []);
  const pool = GAMES.filter((g) => !hidden.has(g.id));

  /* ---------- 最近玩过 ---------- */
  const recentIds = [];
  for (const h of save.history) {
    if (!recentIds.includes(h.game) && getGameMeta(h.game) && !hidden.has(h.game)) recentIds.push(h.game);
    if (recentIds.length >= 6) break;
  }
  const recent = recentIds.length
    ? el('section.recent', {}, [
      el('span.recent__k', { text: '最近玩过' }),
      el('div.recent__list', {}, recentIds.map((id) => {
        const g = getGameMeta(id);
        return el('button.recent__item', {
          style: { '--glow': g.glow },
          onClick: () => { sound.play('go'); router.openGame(g.id, {}); },
        }, [el('span.recent__ico', { text: g.emoji }), el('span', { text: g.name })]);
      })),
    ])
    : null;

  /* ---------- 游戏列表 ---------- */
  const cats = ['全部', ...new Set(pool.map((g) => g.category))];
  if (!cats.includes(filterCat)) filterCat = '全部';
  const catRow = el('div.cats');
  cats.forEach((c) => {
    const n = c === '全部' ? pool.length : pool.filter((g) => g.category === c).length;
    const chip = el('button.chip.cats__chip', {
      onClick: () => { filterCat = c; sound.play('tap'); syncCats(); renderGrid(); },
    }, [
      el('span', { text: c === '全部' ? '✨' : CATEGORY_META[c]?.emoji || '•' }),
      el('span', { text: c }),
      el('small', { text: String(n) }),
    ]);
    chip.dataset.cat = c;
    if (c === filterCat) chip.classList.add('is-on');
    catRow.appendChild(chip);
  });
  function syncCats() {
    Array.from(catRow.children).forEach((b) => b.classList.toggle('is-on', b.dataset.cat === filterCat));
  }

  const grid = el('div.grid-games');
  function renderGrid() {
    clear(grid);
    const list = filterCat === '全部' ? pool : pool.filter((g) => g.category === filterCat);
    list.forEach((g, i) => {
      const card = gameCard(g);
      card.style.animationDelay = `${Math.min(i, 16) * 18}ms`;
      grid.appendChild(card);
    });
  }
  renderGrid();

  const gamesSection = el('section', {}, [
    el('div.section__head', {}, [
      el('h2.section__title', { text: '🎮 游戏大厅' }),
      el('span.section__hint', { text: `${pool.length} 个项目 · 点开即玩` }),
    ]),
    catRow,
    el('div', { style: { height: '12px' } }),
    grid,
  ]);

  home.append(...[hero, recent, gamesSection].filter(Boolean));
  content.appendChild(home);
  return home;
}

function gameCard(g) {
  const best = save.best(g.id);
  const played = save.plays(g.id) > 0;
  const card = el('button.gcard', {
    style: { '--glow': g.glow },
    onClick: () => {
      sound.play('go');
      router.openGame(g.id, {});
    },
  }, [
    g.isNew && !played ? el('span.gcard__new', { text: 'NEW' }) : null,
    el('div.gcard__top', {}, [
      el('div.gcard__icon', { text: g.emoji }),
      el('div', {}, [
        el('div.gcard__name', { text: g.name }),
        el('div.gcard__cat', { text: `${CATEGORY_META[g.category]?.emoji || ''} ${g.category}${g.theme ? ' · 可换皮' : ''}` }),
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
          ? el('span.gcard__best', { text: `🏅 ${best.score}${g.unit}` })
          : el('span', { text: '未挑战', style: { color: 'var(--ink-3)' } }),
      ]),
    ]),
  ]);
  return card;
}

/** 每日训练抽 3 个（优先没玩过的、尽量不同类别；排除被隐藏的游戏） */
export function pickTrainingSet(n = 3) {
  const hidden = new Set(save.settings.hidden || []);
  const quick = quickGames().filter((g) => !hidden.has(g.id));
  const pool = quick.length ? quick : quickGames(); // 全隐藏时退回全部，保证可用
  const done = save.trainedToday;
  const ordered = [...shuffle(pool.filter((g) => !done.includes(g.id))), ...shuffle(pool.filter((g) => done.includes(g.id)))];
  const picked = [];
  const cats = new Set();
  for (const g of ordered) {
    if (picked.length >= n) break;
    if (cats.has(g.category)) continue;
    picked.push(g); cats.add(g.category);
  }
  for (const g of ordered) {
    if (picked.length >= n) break;
    if (!picked.includes(g)) picked.push(g);
  }
  return picked;
}

export function themeName(id) {
  return listThemes().find((t) => t.id === id)?.name || id;
}
