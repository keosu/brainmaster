/**
 * 黑白棋 —— 玩家执黑先手，电脑执白（难度 = 搜索深度）
 */
import { Game } from '../../core/Game.js';
import { el, sleep } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';
import { save } from '../../core/storage.js';
import {
  BLACK, WHITE, EMPTY, SIZE, createBoard, legalMoves, applyMove, count, hasMove, isOver,
} from './engine.js';
import { chooseMove } from './ai.js';

const HUMAN = BLACK;
const AI = WHITE;

export default class ReversiGame extends Game {
  async mount() {
    this.board = createBoard();
    this.turn = HUMAN;
    this.depth = Number(this.options.depth || 2);
    this.busy = false;
    this.over = false;
    this.lastMove = null;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const hintBtn = el('button.btn.btn--sm.btn--ghost', {
      text: save.settings.hints ? '💡 提示开' : '💡 提示关',
      onClick: () => {
        const v = save.toggleSetting('hints');
        hintBtn.textContent = v ? '💡 提示开' : '💡 提示关';
        this.render();
      },
    });
    const restartBtn = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重开', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, hintBtn, restartBtn]));

    /* ---------- 棋盘 ---------- */
    const wrap = el('div.rev-wrap');
    this.grid = el('div.rev-board.fit-box');
    // 四个星位（8×8 棋盘的 2/8、6/8 交叉点）
    [[2, 2], [2, 6], [6, 2], [6, 6]].forEach(([r, c]) => {
      this.grid.appendChild(el('span.rev-star', {
        style: { left: `${(c / SIZE) * 100}%`, top: `${(r / SIZE) * 100}%` },
      }));
    });
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
    wrap.appendChild(this.grid);

    /* 底部状态条：当前回合 + 可落点 */
    this.turnDot = el('span.rev-turn-dot.is-black');
    this.tipText = el('span', { text: '轮到你，点击发光的落点下棋' });
    wrap.appendChild(el('div.pill.rev-tip', {}, [this.turnDot, this.tipText]));
    this.root.appendChild(wrap);

    this.hud.set([
      { key: 'me', label: '你（黑）', value: '2' },
      { key: 'ai', label: '电脑（白）', value: '2' },
      { key: 'state', label: '状态', value: '轮到你' },
    ]);
    this.hud.show();
    this.render();
    this.say('黑白棋开始，你先下');
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
    if (!this.over && this.turn === HUMAN) {
      const moves = legalMoves(this.board, HUMAN);
      legalCount = moves.length;
      if (save.settings.hints) moves.forEach((m) => this.cells[m.r * SIZE + m.c].classList.add('is-legal'));
    }

    const { black, white } = count(this.board);
    this.hud.patch('me', black);
    this.hud.patch('ai', white);

    this.turnDot.classList.toggle('is-black', this.turn === HUMAN);
    this.turnDot.classList.toggle('is-white', this.turn !== HUMAN);
    if (this.over) this.tipText.textContent = '本局结束';
    else if (this.turn === HUMAN) this.tipText.textContent = `轮到你 · 可落点 ${legalCount} 处`;
    else this.tipText.textContent = '电脑思考中…';
  }

  async play(r, c) {
    if (this.over || this.busy || this.turn !== HUMAN) return;
    const move = legalMoves(this.board, HUMAN).find((m) => m.r === r && m.c === c);
    if (!move) return;
    this.busy = true;
    const res = applyMove(this.board, r, c, HUMAN);
    this.board = res.board;
    this.lastMove = { i: r * SIZE + c };
    this.sound.play('place');
    this.render();
    await sleep(280);

    this.turn = AI;
    this.hud.patch('state', '电脑思考');
    this.render();
    await this.aiTurn();
  }

  async aiTurn() {
    let guard = 0;
    while (!this.over && guard++ < 4) {
      if (this.turn === AI) {
        if (!hasMove(this.board, AI)) {
          toast('电脑无子可下，跳过');
          this.turn = HUMAN;
          continue;
        }
        await sleep(420);
        const mv = chooseMove(this.board, AI, this.depth);
        if (!mv) { this.turn = HUMAN; continue; }
        const res = applyMove(this.board, mv.r, mv.c, AI);
        this.board = res.board;
        this.lastMove = { i: mv.r * SIZE + mv.c };
        this.sound.play('place');
        this.render();
        this.turn = HUMAN;
        await sleep(220);
      }
      if (!hasMove(this.board, HUMAN)) {
        toast('你无子可下，自动跳过');
        this.turn = AI;
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
    const win = black > white;
    const draw = black === white;
    const diff = Math.abs(black - white);
    const score = win ? 400 + diff * 15 : draw ? 220 : Math.max(60, 100 + black * 5);
    this.render();
    this.hud.patch('state', win ? '你赢了' : draw ? '平局' : '电脑赢');
    this.finish({
      score,
      stars: win ? 3 : draw ? 2 : 1,
      mode: 'max',
      title: win ? '漂亮的围剿！' : draw ? '势均力敌' : '再来一局？',
      message: win ? `你以 ${black} : ${white} 获胜` : draw ? `${black} : ${white} 打平` : `${black} : ${white} 惜败`,
      speak: win ? '你赢啦' : draw ? '平局' : '这局输了，再来一次吧',
      stats: [
        { label: '你的棋子', value: black },
        { label: '电脑棋子', value: white },
        { label: '难度', value: this.meta.levels.find((l) => l.id === this.options.level)?.name || '-' },
      ],
    });
  }

  destroy() {}
}
