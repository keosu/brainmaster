/**
 * 荣誉殿堂：个人档案、打卡日历、能力分布、成就徽章、称号之路、最佳纪录
 */
import { el, clear } from '../core/utils.js';
import { save, levelOf, LEVELS, localDay, todayKey } from '../core/storage.js';
import { snapshot, listAchievements, ACHIEVEMENT_GROUPS } from '../core/honors.js';
import { GAMES, CATEGORY_META } from '../games/manifest.js';
import * as router from '../core/router.js';
import { sound } from '../core/audio.js';

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function card(title, extra, body, cls = '') {
  return el(`section.hn-card${cls ? `.${cls}` : ''}`, {}, [
    title ? el('div.hn-card__head', {}, [el('h3.hn-card__title', { text: title }), extra || null]) : null,
    body,
  ]);
}

export function renderHonor(content) {
  clear(content);
  const s = snapshot();
  const power = save.brain.power;
  const lv = levelOf(power);
  const achievements = listAchievements(s);
  const doneCount = achievements.filter((a) => a.done).length;

  /* ---------- 个人档案 ---------- */
  const stat = (v, k) => el('div.hn-stat', {}, [el('b', { text: String(v) }), el('span', { text: k })]);
  const profile = el('section.hn-card.hn-profile', {}, [
    el('div.hn-profile__main', {}, [
      el('div.hn-profile__badge', { text: lv.emoji }),
      el('div.hn-profile__info', {}, [
        el('div.hn-profile__title', {}, [el('b', { text: lv.title }), el('span', { text: `Lv.${lv.lv}` })]),
        el('div.hn-profile__power', { html: `🧠 脑力 <b>${power}</b>` }),
        el('div.levelbar', {}, [el('div.levelbar__fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })]),
        el('div.hn-profile__next', { text: lv.next ? `再获得 ${lv.remain} 点脑力，晋升「${lv.next.emoji} ${lv.next.title}」` : '已经是最高称号，传奇大脑！' }),
      ]),
    ]),
    el('div.hn-stats', {}, [
      stat(s.plays, '累计游戏'),
      stat(s.stars, '获得星星'),
      stat(s.days, '打卡天数'),
      stat(`${s.streak}`, `连续打卡 · 最长 ${s.bestStreak}`),
      stat(`${doneCount}/${achievements.length}`, '解锁成就'),
      stat(`${s.played.length}/${GAMES.length}`, '玩过游戏'),
    ]),
  ]);

  /* ---------- 打卡日历 ---------- */
  let offset = 0;
  const calBody = el('div');
  const calLabel = el('span.hn-cal__label');
  const prevBtn = el('button.hn-cal__nav', { text: '‹', 'aria-label': '上个月', onClick: () => { offset -= 1; drawCal(); } });
  const nextBtn = el('button.hn-cal__nav', { text: '›', 'aria-label': '下个月', onClick: () => { offset += 1; drawCal(); } });
  function drawCal() {
    clear(calBody);
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    calLabel.textContent = `${first.getFullYear()} 年 ${first.getMonth() + 1} 月`;
    nextBtn.disabled = offset >= 0;
    const today = todayKey();
    const days = save.days;
    const grid = el('div.hn-cal__grid', {}, WEEK.map((w) => el('span.hn-cal__wk', { text: w })));
    for (let i = 0; i < first.getDay(); i++) grid.appendChild(el('span'));
    let monthCount = 0;
    for (let d = 1; d <= daysIn; d++) {
      const key = localDay(new Date(first.getFullYear(), first.getMonth(), d));
      const rec = days[key];
      if (rec) monthCount += 1;
      const heat = rec ? (rec.n >= 6 ? 3 : rec.n >= 3 ? 2 : 1) : 0;
      grid.appendChild(el(`span.hn-cal__day${rec ? `.is-on.h${heat}` : ''}${key === today ? '.is-today' : ''}${key > today ? '.is-future' : ''}`, {
        title: rec ? `${key}：玩了 ${rec.n} 局，获得 ${rec.s} 颗星` : key,
      }, [el('i', { text: String(d) })]));
    }
    calBody.append(grid, el('div.hn-cal__foot', {}, [
      el('span', { html: `本月打卡 <b>${monthCount}</b> 天` }),
      el('span.hn-cal__legend', {}, [el('i.h1'), el('i.h2'), el('i.h3'), el('span', { text: '玩得越多颜色越深' })]),
    ]));
  }
  drawCal();
  const calendar = card('📅 打卡日历', el('div.hn-cal__ctl', {}, [prevBtn, calLabel, nextBtn]), calBody, 'hn-cal');

  /* ---------- 能力分布 ---------- */
  const cats = Object.entries(CATEGORY_META);
  const maxStars = Math.max(30, ...cats.map(([c]) => s.catStars[c] || 0));
  const radar = card('🧠 能力分布', el('span.hn-card__hint', { text: '各类游戏获得的星星' }), el('div.hn-bars', {}, cats.map(([c, m]) => {
    const v = s.catStars[c] || 0;
    return el('div.hn-bar', {}, [
      el('span.hn-bar__k', { text: `${m.emoji} ${c}` }),
      el('span.hn-bar__track', {}, [el('i', { style: { width: `${Math.max(v ? 4 : 0, Math.round((v / maxStars) * 100))}%` } })]),
      el('span.hn-bar__v', { text: `${v}★` }),
    ]);
  })));

  /* ---------- 成就徽章 ---------- */
  const badgeList = el('div.hn-badges');
  ACHIEVEMENT_GROUPS.forEach((g) => {
    const list = achievements.filter((a) => a.group === g);
    badgeList.appendChild(el('div.hn-badges__group', { text: `${g} · ${list.filter((a) => a.done).length}/${list.length}` }));
    list.forEach((a) => {
      badgeList.appendChild(el(`div.hn-badge${a.done ? '.is-done' : ''}`, { title: a.desc }, [
        el('span.hn-badge__ico', { text: a.emoji }),
        el('div.hn-badge__body', {}, [
          el('b', { text: a.name }),
          el('span', { text: a.desc }),
          a.done
            ? el('small.hn-badge__date', { text: `${new Date(a.at).toLocaleDateString('zh-CN')} 解锁` })
            : el('span.hn-badge__prog', {}, [
              el('i', {}, [el('em', { style: { width: `${Math.round((a.cur / a.goal) * 100)}%` } })]),
              el('small', { text: `${a.cur}/${a.goal}` }),
            ]),
        ]),
      ]));
    });
  });
  const badges = card('🏅 成就徽章', el('span.hn-card__hint', { text: `已解锁 ${doneCount}/${achievements.length}` }), badgeList, 'hn-wide');

  /* ---------- 称号之路 ---------- */
  const titles = card('👑 称号之路', el('span.hn-card__hint', { text: '玩游戏攒脑力，晋升更高称号' }), el('div.hn-titles', {}, LEVELS.map((l) => {
    const state = l.lv < lv.lv ? 'is-done' : l.lv === lv.lv ? 'is-now' : 'is-lock';
    return el(`div.hn-title.${state}`, {}, [
      el('span.hn-title__ico', { text: l.emoji }),
      el('b', { text: l.title }),
      el('small', { text: state === 'is-now' ? '当前称号' : state === 'is-done' ? '已获得' : `${l.need} 脑力` }),
    ]);
  })));

  /* ---------- 最佳纪录 ---------- */
  const played = GAMES.filter((g) => save.plays(g.id) > 0)
    .sort((a, b) => save.plays(b.id) - save.plays(a.id));
  const records = card('📜 最佳纪录', el('span.hn-card__hint', { text: '点一下再去挑战' }), played.length
    ? el('div.hn-records', {}, played.map((g) => {
      const best = save.best(g.id);
      const st = s.bestStars[g.id] || 0;
      return el('button.hn-record', { style: { '--glow': g.glow }, onClick: () => { sound.play('go'); router.openGame(g.id, {}); } }, [
        el('span.hn-record__ico', { text: g.emoji }),
        el('span.hn-record__name', {}, [el('b', { text: g.name }), el('small', { text: `玩过 ${save.plays(g.id)} 次` })]),
        el('span.hn-record__best', {}, [
          el('b', { text: best ? `${best.score}${g.unit}` : '—' }),
          el('small', { text: '★'.repeat(st) + '☆'.repeat(3 - st) }),
        ]),
      ]);
    }))
    : el('p.hn-empty', { text: '还没有成绩，快去玩一局吧！' }), 'hn-wide');

  const page = el('div.honor', {}, [profile, calendar, radar, titles, badges, records]);
  content.appendChild(page);
  return page;
}
