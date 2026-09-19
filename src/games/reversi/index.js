/**
 * 黑白棋 —— 可选择先后手，电脑难度 = 搜索深度
 */
import { Game } from '../../core/Game.js';
import { el, sleep } from '../../core/utils.js';
import { levelBar, controlRow, segment } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';
import { save } from '../../core/storage.js';
import {
  BLACK, WHITE, EMPTY, SIZE, createBoard, legalMoves, applyMove, count, hasMove, isOver,
} from './engine.js';
import { chooseMove } from './ai.js';

const COLOR_NAME = { [BLACK]: '黑', [WHITE]: '白' };

export default class ReversiGame extends Game {
  async mount() {
    this.board = createBoard();
    // 先后手：黑棋永远先手；玩家默认执黑，选“后手”则执白由电脑开局
    this.human = this.options.order === 'second' ? WHITE : BLACK;
    this.ai = this.human === BLACK ? WHITE : BLACK;
    this.turn = BLACK;
    this.depth = Number(this.options.depth || 2);
    this.busy = false;
    this.over = false;
    this.lastMove = null;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const orderSeg = segment({
      items: [
        { id: 'first', name: '我先手 · 黑' },
        { id: 'second', name: '我后手 · 白' },
      ],
      value: this.human === BLACK ? 'first' : 'second',
      onChange: (id) => this.ctx.reload({ order: id }),
    });
    const hintBtn = el('button.btn.btn--sm.btn--ghost', {
      text: save.settings.hints ? '💡 提示开' : '💡 提示关',
      onClick: () => {
        const v = save.toggleSetting('hints');
        hintBtn.textContent = v ? '💡 提示开' : '💡 提示关';
        this.render();
      },
    });
    const restartBtn = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, orderSeg, hintBtn, restartBtn]));

    /* ---------- 棋盘 ---------- */
    const wrap = el('div.rev-wrap');
    this.grid = el('div.rev-board.fit-box');
    this.cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = el('button.rev-cell', { onClick: () => this.play(r, c) });
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.appendChild(el('span.rev-disc'));
        this.grid.appendChild(cell);
        this.cells.push(cell);
      }
    }
    // 四个星位：锚在格线交叉点 (2,2)(2,6)(6,2)(6,6) 上——即对应格子左上角的缝隙处（CSS 内做半个 gap 偏移）
    [[2, 2], [2, 6], [6, 2], [6, 6]].forEach(([r, c]) => {
      this.cells[r * SIZE + c].appendChild(el('span.rev-star'));
    });
    wrap.appendChild(this.grid);

    /* 底部状态条：当前回合 + 可落点 */
    this.turnDot = el('span.rev-turn-dot.is-black');
    this.tipText = el('span', { text: '轮到你，点击发光的落点下棋' });
    wrap.appendChild(el('div.pill.rev-tip', {}, [this.turnDot, this.tipText]));
    this.root.appendChild(wrap);

    this.hud.set([
      { key: 'me', label: `你（${COLOR_NAME[this.human]}）`, value: '2' },
      { key: 'ai', label: `电脑（${COLOR_NAME[this.ai]}）`, value: '2' },
      { key: 'state', label: '状态', value: '轮到你' },
    ]);
    this.hud.show();
    this.render();

    if (this.turn === this.ai) {
      // 玩家选后手：电脑执黑先行
      this.busy = true;
      this.say('电脑先手，轮到你时点击发光的落点');
      this.later(() => this.aiTurn(), 500);
    } else {
      this.say('黑白棋开始，你先下');
    }
  }

  render() {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const disc = cell.querySelector('.rev-disc');
      const v = this.board[i];
      const prev = cell.dataset.v;
      cell.classList.remove('is-black', 'is-white', 'is-legal');
      disc.className = 'rev-disc';
      if (v === BLACK) { cell.classList.add('is-black'); disc.classList.add('is-black'); }
      if (v === WHITE) { cell.classList.add('is-white'); disc.classList.add('is-white'); }
      // 动画：空→有子 是落子，有子→变色 是被吃翻面
      if (prev !== undefined && prev !== String(v)) {
        const cls = prev === String(EMPTY) ? 'is-drop' : 'is-flip';
        disc.classList.add(cls);
        this.later(() => disc.classList.remove(cls), 460);
      }
      cell.dataset.v = String(v);
      cell.classList.toggle('is-last', !!this.lastMove && this.lastMove.i === i);
    }

    let legalCount = 0;
    if (!this.over && this.turn === this.human) {
      const moves = legalMoves(this.board, this.human);
      legalCount = moves.length;
      if (save.settings.hints) moves.forEach((m) => this.cells[m.r * SIZE + m.c].classList.add('is-legal'));
    }

    const { black, white } = count(this.board);
    this.hud.patch('me', this.human === BLACK ? black : white);
    this.hud.patch('ai', this.ai === BLACK ? black : white);

    this.turnDot.classList.toggle('is-black', this.turn === BLACK);
    this.turnDot.classList.toggle('is-white', this.turn === WHITE);
    if (this.over) this.tipText.textContent = '本局结束';
    else if (this.turn === this.human) this.tipText.textContent = `轮到你 · 可落点 ${legalCount} 处`;
    else this.tipText.textContent = '电脑思考中…';
  }

  async play(r, c) {
    if (this.over || this.busy || this.turn !== this.human) return;
    const move = legalMoves(this.board, this.human).find((m) => m.r === r && m.c === c);
    if (!move) return;
    this.busy = true;
    const res = applyMove(this.board, r, c, this.human);
    this.board = res.board;
    this.lastMove = { i: r * SIZE + c };
    this.sound.play('place');
    this.render();
    await sleep(280);

    this.turn = this.ai;
    this.hud.patch('state', '电脑思考');
    this.render();
    await this.aiTurn();
  }

  async aiTurn() {
    let guard = 0;
    while (!this.over && guard++ < 4) {
      if (this.turn === this.ai) {
        if (!hasMove(this.board, this.ai)) {
          toast('电脑无子可下，跳过');
          this.turn = this.human;
          continue;
        }
        await sleep(420);
        const mv = chooseMove(this.board, this.ai, this.depth);
        if (!mv) { this.turn = this.human; continue; }
        const res = applyMove(this.board, mv.r, mv.c, this.ai);
        this.board = res.board;
        this.lastMove = { i: mv.r * SIZE + mv.c };
        this.sound.play('place');
        this.render();
        this.turn = this.human;
        await sleep(220);
      }
      if (!hasMove(this.board, this.human)) {
        toast('你无子可下，自动跳过');
        this.turn = this.ai;
        await sleep(400);
        continue;
      }
      break;
    }
    this.busy = false;
    if (isOver(this.board)) { this.gameOver(); return; }
    this.hud.patch('state', '轮到你');
    this.render();
  }

  gameOver() {
    this.over = true;
    const { black, white } = count(this.board);
    const mine = this.human === BLACK ? black : white;
    const theirs = this.ai === BLACK ? black : white;
    const win = mine > theirs;
    const draw = mine === theirs;
    const diff = Math.abs(mine - theirs);
    const score = win ? 400 + diff * 15 : draw ? 220 : Math.max(60, 100 + mine * 5);
    this.render();
    this.hud.patch('state', win ? '你赢了' : draw ? '平局' : '电脑赢');
    this.finish({
      score,
      stars: win ? 3 : draw ? 2 : 1,
      mode: 'max',
      title: win ? '漂亮的围剿！' : draw ? '势均力敌' : '再来一局？',
      message: win ? `你以 ${mine} : ${theirs} 获胜` : draw ? `${mine} : ${theirs} 打平` : `${mine} : ${theirs} 惜败`,
      speak: win ? '你赢啦' : draw ? '平局' : '这局输了，再来一次吧',
      stats: [
        { label: '你的棋子', value: mine },
        { label: '电脑棋子', value: theirs },
        { label: '难度', value: this.meta.levels.find((l) => l.id === this.options.level)?.name || '-' },
      ],
    });
  }

  destroy() {}
}
