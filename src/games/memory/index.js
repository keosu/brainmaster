/**
 * 翻牌记忆 —— 主题驱动的配对游戏
 * 牌面素材来自主题包（可换成奥特曼 / 动物 / 任意图片）
 */
import { Game } from '../../core/Game.js';
import { el, shuffle, formatTime } from '../../core/utils.js';
import { CARD_BACK, faceUrl } from '../../themes/index.js';
import { levelBar, themeBar, controlRow } from '../../ui/widgets.js';
import { save } from '../../core/storage.js';

export default class MemoryGame extends Game {
  async mount() {
    const theme = this.theme;
    const faces = theme.faces;

    // 依据主题素材数量决定实际盘面（素材少的主题自动降规格）
    const wantCols = Number(this.options.cols || 4);
    const wantRows = Number(this.options.rows || 4);
    let pairs = Math.min(Math.floor((wantCols * wantRows) / 2), faces.length);
    let total = pairs * 2;
    let cols = wantCols;
    while (total % cols !== 0 && cols > 2) cols -= 1;
    const rows = total / cols;

    this.pairs = pairs;
    this.total = total;
    this.matched = 0;
    this.moves = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.locked = false;
    this.first = null;
    this.startedAt = 0;
    this.cards = [];
    this.status = 'ready';

    /* ---------- 控件 ---------- */
    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const th = themeBar(theme.id, (id) => {
      save.setSetting('theme', id);
      this.ctx.reload({ theme: id });
    });
    const restartBtn = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新开始', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, th, restartBtn]));

    /* ---------- 棋盘 ---------- */
    const deck = shuffle(faces.map((f, i) => i).slice(0, pairs).flatMap((i) => [i, i]));
    const board = el('div.mem-board.fit-box', { style: { '--cols': String(cols), '--rows': String(rows) } });
    deck.forEach((faceIndex, i) => {
      const inner = el('div.mem-card__inner', {}, [
        el('div.mem-card__face.mem-card__back', { style: { backgroundImage: `url("${CARD_BACK}")` } }),
        el('div.mem-card__face.mem-card__front', { style: { backgroundImage: `url("${faceUrl(theme, faceIndex)}")` } }),
      ]);
      const card = el('button.mem-card', { onClick: () => this.flip(card) }, [inner]);
      card.dataset.face = String(faceIndex);
      card.dataset.name = faces[faceIndex].name;
      card.dataset.index = String(i);
      board.appendChild(card);
      this.cards.push(card);
    });
    this.board = board;
    this.root.appendChild(board);

    /* ---------- HUD ---------- */
    this.hud.set([
      { key: 'time', label: '用时', value: '00:00' },
      { key: 'left', label: '剩余', value: `${pairs} 对` },
      { key: 'moves', label: '翻牌', value: '0' },
      { key: 'combo', label: '连击', value: 'x0' },
    ]);
    this.hud.show();

    /* ---------- 开始提示 ---------- */
    const tip = el('div.pill', { text: `主题：${theme.name} · 找出 ${pairs} 对相同的图案` });
    this.root.appendChild(tip);
    this.say(`翻牌记忆，${theme.name}，开始`);
  }

  start() {
    this.startedAt = performance.now();
    this.every(() => {
      if (this.status === 'done') return;
      const ms = performance.now() - this.startedAt;
      this.hud.patch('time', formatTime(ms));
      this.hud.warn('time', ms > this.pairs * 12000);
    }, 250);
  }

  flip(card) {
    if (this.locked || this.status === 'done') return;
    if (card.classList.contains('is-open') || card.classList.contains('is-done')) return;

    card.classList.add('is-open');
    this.sound.play('flip');

    if (!this.first) { this.first = card; return; }

    const a = this.first;
    const b = card;
    this.moves += 1;
    this.first = null;
    this.hud.patch('moves', this.moves);

    if (a.dataset.face === b.dataset.face) {
      this.locked = true;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matched += 1;
      this.hud.patch('combo', `x${this.combo}`);
      this.hud.patch('left', `${this.pairs - this.matched} 对`);
      this.sound.play(this.combo >= 3 ? 'great' : 'good');
      this.say(b.dataset.name);
      this.later(() => {
        a.classList.add('is-done');
        b.classList.add('is-done');
        this.locked = false;
        if (this.matched === this.pairs) this.finishGame();
      }, 320);
    } else {
      this.combo = 0;
      this.hud.patch('combo', 'x0');
      this.locked = true;
      this.sound.play('bad');
      a.classList.add('is-wrong');
      b.classList.add('is-wrong');
      this.later(() => {
        a.classList.remove('is-open', 'is-wrong');
        b.classList.remove('is-open', 'is-wrong');
        this.locked = false;
      }, 780);
    }
  }

  finishGame() {
    this.status = 'done';
    const elapsed = performance.now() - this.startedAt;
    const sec = elapsed / 1000;
    const target = this.pairs * 7;
    const timeBonus = Math.max(0, Math.round((target - sec) * 12));
    const comboBonus = this.maxCombo * 15;
    const movePenalty = Math.max(0, this.moves - this.pairs) * 6;
    const score = Math.max(10, this.pairs * 100 + timeBonus + comboBonus - movePenalty);
    const stars = this.moves <= this.pairs * 1.4 ? 3 : this.moves <= this.pairs * 2 ? 2 : 1;

    this.finish({
      score,
      stars,
      mode: 'max',
      title: stars === 3 ? '记忆力爆表！' : '全部配对完成',
      message: `${this.pairs} 对图案 · 用了 ${this.moves} 次翻牌`,
      speak: `完成！得分 ${score}`,
      stats: [
        { label: '用时', value: formatTime(elapsed) },
        { label: '翻牌次数', value: this.moves },
        { label: '最高连击', value: `x${this.maxCombo}` },
      ],
    });
  }

  destroy() { /* 资源由基类统一清理 */ }
}
