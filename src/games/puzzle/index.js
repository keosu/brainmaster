/**
 * 拼图挑战 —— 主题大图切片
 * 两种玩法：slide（滑块，留一个空位）/ swap（点两块交换）
 * 换素材 = 换主题，图片主题只需给一张 art 大图
 */
import { Game } from '../../core/Game.js';
import { el, formatTime, randInt } from '../../core/utils.js';
import { levelBar, themeBar, controlRow } from '../../ui/widgets.js';
import { artUrl } from '../../themes/index.js';
import { showModal, closeModal } from '../../ui/modal.js';
import { save } from '../../core/storage.js';

export default class PuzzleGame extends Game {
  async mount() {
    const theme = this.theme;
    this.n = Number(this.options.n || 3);
    this.mode = this.options.mode || 'slide';
    this.art = artUrl(theme);
    this.moves = 0;
    this.startedAt = 0;
    this.selected = null;
    this.showNumbers = false;
    this.done = false;

    /* 控件 */
    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const th = themeBar(theme.id, (id) => {
      save.setSetting('theme', id);
      this.ctx.reload({ theme: id });
    });
    const peek = el('button.btn.btn--sm.btn--ghost', { text: '👁 看原图', onClick: () => this.peek() });
    const nums = el('button.btn.btn--sm.btn--ghost', { text: '# 编号', onClick: () => { this.showNumbers = !this.showNumbers; this.render(); } });
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新打乱', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, th, peek, nums, restart]));

    /* 棋盘 */
    this.board = el('div.pz-board.fit-box', { style: { '--n': String(this.n) } });
    this.root.appendChild(this.board);

    this.build();

    this.hud.set([
      { key: 'moves', label: '步数', value: '0' },
      { key: 'time', label: '用时', value: '00:00' },
      { key: 'left', label: '未归位', value: String(this.n * this.n - (this.mode === 'slide' ? 1 : 0)) },
    ]);
    this.hud.show();
    this.root.appendChild(el('div.pill', {
      text: this.mode === 'slide' ? '点击空格旁边的图块滑动它' : '点两块交换位置，把画面拼回来',
    }));
    this.say('拼图开始');
  }

  build() {
    const n = this.n;
    const total = n * n;
    this.tiles = Array.from({ length: total }, (_, i) => ({ id: i, r: Math.floor(i / n), c: i % n }));
    this.blank = { r: n - 1, c: n - 1 };

    if (this.mode === 'slide') {
      // 从完成态倒着走随机合法步，保证一定有解
      const last = total - 1;
      this.tiles[last].hidden = true;
      let prev = null;
      const steps = total * 24;
      for (let s = 0; s < steps; s++) {
        const cand = this.neighbors(this.blank).filter((p) => !prev || !(p.r === prev.r && p.c === prev.c));
        const pickOne = cand[randInt(0, cand.length - 1)];
        const tile = this.tileAt(pickOne.r, pickOne.c);
        prev = { r: this.blank.r, c: this.blank.c };
        tile.r = this.blank.r; tile.c = this.blank.c;
        this.blank = { r: pickOne.r, c: pickOne.c };
      }
    } else {
      // 交换模式：随机排列（确保不是已完成）
      const order = this.tiles.map((t) => t.id);
      do {
        for (let i = order.length - 1; i > 0; i--) {
          const j = randInt(0, i);
          [order[i], order[j]] = [order[j], order[i]];
        }
      } while (order.every((id, i) => id === i));
      this.tiles.forEach((t, i) => {
        const id = order[i];
        const src = this.tiles[id];
        t.r = Math.floor(i / n); t.c = i % n;
        t.imgId = id;
      });
      // 用 imgId 承载显示图像，id 承载正确位置
      this.tiles.forEach((t) => { t.imgId = t.imgId ?? t.id; });
    }

    this.board.innerHTML = '';
    this.nodes = this.tiles.map((t) => {
      const node = el('button.pz-tile', { onClick: () => this.tap(t) }, [
        el('span.pz-num'),
      ]);
      node.style.backgroundImage = `url("${this.art}")`;
      this.board.appendChild(node);
      return node;
    });
    this.render();
  }

  neighbors(p) {
    return [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dr, dc]) => ({ r: p.r + dr, c: p.c + dc }))
      .filter((q) => q.r >= 0 && q.r < this.n && q.c >= 0 && q.c < this.n);
  }

  tileAt(r, c) { return this.tiles.find((t) => t.r === r && t.c === c && !t.hidden); }

  /** 该图块显示的原始图块序号 */
  imgIndexOf(t) { return t.id; }

  render() {
    const n = this.n;
    this.tiles.forEach((t, i) => {
      const node = this.nodes[i];
      const sizePct = 100 / n;
      node.style.width = `${sizePct}%`;
      node.style.height = `${sizePct}%`;
      node.style.left = `${t.c * sizePct}%`;
      node.style.top = `${t.r * sizePct}%`;
      const img = this.imgIndexOf(t);
      const ir = Math.floor(img / n);
      const ic = img % n;
      const px = n > 1 ? (ic / (n - 1)) * 100 : 0;
      const py = n > 1 ? (ir / (n - 1)) * 100 : 0;
      node.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      node.style.backgroundPosition = `${px}% ${py}%`;
      node.classList.toggle('is-hidden', !!t.hidden);
      node.classList.toggle('is-ok', t.id === t.r * n + t.c);
      node.classList.toggle('is-sel', this.selected === t);
      const num = node.querySelector('.pz-num');
      num.textContent = this.showNumbers ? String(img + 1) : '';
      num.classList.toggle('u-hide', !this.showNumbers);
    });
    const okCount = this.tiles.filter((t) => t.id === t.r * this.n + t.c).length;
    const target = this.mode === 'slide' ? this.n * this.n - 1 : this.n * this.n;
    this.hud.patch('left', Math.max(0, target - okCount));
  }

  tap(t) {
    if (this.done) return;
    if (!this.startedAt) this.startedAt = performance.now();
    if (this.mode === 'slide') {
      if (t.hidden) return;
      const nb = this.neighbors({ r: t.r, c: t.c });
      if (!nb.some((p) => p.r === this.blank.r && p.c === this.blank.c)) {
        this.sound.play('bad');
        return;
      }
      const br = this.blank.r, bc = this.blank.c;
      this.blank = { r: t.r, c: t.c };
      t.r = br; t.c = bc;
      this.moves += 1;
      this.sound.play('tap');
      this.render();
    } else {
      if (!this.selected) { this.selected = t; this.sound.play('tap'); this.render(); return; }
      if (this.selected === t) { this.selected = null; this.render(); return; }
      const a = this.selected;
      const ar = a.r, ac = a.c;
      a.r = t.r; a.c = t.c;
      t.r = ar; t.c = ac;
      this.selected = null;
      this.moves += 1;
      this.sound.play('flip');
      this.render();
    }
    this.hud.patch('moves', this.moves);
    if (this.checkWin()) this.win();
  }

  checkWin() {
    const n = this.n;
    return this.tiles.every((t) => t.id === t.r * n + t.c && (this.mode === 'slide' || !t.hidden));
  }

  start() {
    this.every(() => {
      if (!this.startedAt || this.done) return;
      this.hud.patch('time', formatTime(performance.now() - this.startedAt));
    }, 250);
  }

  peek() {
    const img = el('img', { src: this.art, style: { width: 'min(74vw,340px)', borderRadius: '18px', boxShadow: '0 20px 50px rgba(0,0,0,.5)' } });
    showModal({
      title: '目标图案',
      body: img,
      actions: [{ label: '继续拼', primary: true, onClick: () => closeModal() }],
    });
  }

  win() {
    this.done = true;
    const elapsed = this.startedAt ? performance.now() - this.startedAt : 0;
    const cells = this.n * this.n;
    const par = this.mode === 'slide' ? cells * 3 : cells * 1.2;
    const stars = this.moves <= par ? 3 : this.moves <= par * 1.7 ? 2 : 1;
    this.render();
    this.finish({
      score: this.moves,
      mode: 'min',
      stars,
      title: '拼好啦！',
      message: `${this.n}×${this.n} · 用了 ${this.moves} 步`,
      speak: `完成，用了 ${this.moves} 步`,
      showScore: true,
      stats: [
        { label: '步数', value: this.moves },
        { label: '用时', value: formatTime(elapsed) },
        { label: '玩法', value: this.mode === 'slide' ? '滑块' : '交换' },
      ],
    });
  }

  destroy() {}
}
