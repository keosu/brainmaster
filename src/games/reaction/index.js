/**
 * 闪电反应 —— 灯一亮就点，测测反应速度
 */
import { Game } from '../../core/Game.js';
import { el, randInt } from '../../core/utils.js';
import { levelBar, controlRow } from '../../ui/widgets.js';
import { toast } from '../../ui/modal.js';

export default class ReactionGame extends Game {
  async mount() {
    this.rounds = Number(this.options.rounds || 5);
    this.results = [];
    this.idx = 0;
    this.state = 'idle';
    this.pending = null;

    const lv = levelBar(this.meta, this.options.level, (id) => this.ctx.reload({ level: id }));
    const restart = el('button.btn.btn--sm.btn--ghost', { text: '🔄 重新测', onClick: () => this.ctx.restart() });
    this.root.appendChild(controlRow([lv, restart]));

    this.pad = el('button.rc-pad.fit-box', { onClick: () => this.hit() }, [
      el('div.rc-pad__inner', {}, [
        el('div.rc-pad__title'),
        el('div.rc-pad__sub'),
      ]),
    ]);
    this.root.appendChild(this.pad);

    this.list = el('div.rc-list');
    this.root.appendChild(this.list);

    this.hud.set([
      { key: 'round', label: '进度', value: `0/${this.rounds}` },
      { key: 'last', label: '上次', value: '—' },
      { key: 'avg', label: '平均', value: '—' },
    ]);
    this.hud.show();
  }

  start() {
    this.say('灯一亮就点，准备好了吗');
    this.later(() => this.nextRound(), 600);
  }

  nextRound() {
    if (this.idx >= this.rounds) return this.over();
    this.state = 'wait';
    this.pad.className = 'rc-pad fit-box is-wait';
    this.pad.querySelector('.rc-pad__title').textContent = '等待亮灯…';
    this.pad.querySelector('.rc-pad__sub').textContent = `第 ${this.idx + 1} / ${this.rounds} 次`;
    this.hud.patch('round', `${this.idx}/${this.rounds}`);
    this.pending = this.later(() => {
      this.state = 'go';
      this.pad.className = 'rc-pad fit-box is-go';
      this.pad.querySelector('.rc-pad__title').textContent = '点！';
      this.pad.querySelector('.rc-pad__sub').textContent = '';
      this.sound.play('go');
      this.t0 = performance.now();
    }, randInt(1200, 3600));
  }

  hit() {
    if (this.state === 'wait') {
      // 抢跑
      this.clearLater(this.pending);
      this.state = 'idle';
      this.pad.className = 'rc-pad fit-box is-false';
      this.pad.querySelector('.rc-pad__title').textContent = '太早啦！';
      this.pad.querySelector('.rc-pad__sub').textContent = '等灯变绿再点';
      this.sound.play('bad');
      toast('抢跑了，这一下不算');
      this.later(() => this.nextRound(), 1100);
      return;
    }
    if (this.state !== 'go') return;
    const dt = Math.round(performance.now() - this.t0);
    this.state = 'done';
    this.results.push(dt);
    this.idx += 1;
    this.pad.className = 'rc-pad fit-box is-hit';
    this.pad.querySelector('.rc-pad__title').textContent = `${dt} ms`;
    this.pad.querySelector('.rc-pad__sub').textContent = dt < 300 ? '快得惊人！' : dt < 450 ? '很棒' : '还不错';
    this.sound.play('good');
    this.hud.patch('last', `${dt}`);
    this.hud.patch('avg', `${Math.round(this.results.reduce((a, b) => a + b, 0) / this.results.length)}`);
    this.renderList();
    this.later(() => this.nextRound(), 900);
  }

  renderList() {
    this.list.innerHTML = '';
    this.results.forEach((v, i) => {
      this.list.appendChild(el('span.rc-item', {
        text: `${i + 1}. ${v}ms`,
        style: { color: v < 300 ? 'var(--c-green)' : v < 450 ? 'var(--c-cyan)' : 'var(--ink-2)' },
      }));
    });
  }

  over() {
    const avg = Math.round(this.results.reduce((a, b) => a + b, 0) / Math.max(1, this.results.length));
    const best = Math.min(...this.results);
    const stars = avg < 300 ? 3 : avg < 450 ? 2 : 1;
    this.pad.className = 'rc-pad fit-box';
    this.pad.querySelector('.rc-pad__title').textContent = `${avg} ms`;
    this.pad.querySelector('.rc-pad__sub').textContent = '平均反应时间';
    this.finish({
      score: avg,
      mode: 'min',
      stars,
      title: avg < 300 ? '闪电般的反应！' : '测试完成',
      message: `平均 ${avg} 毫秒 · 最快 ${best} 毫秒`,
      speak: `平均反应 ${avg} 毫秒`,
      stats: [
        { label: '平均', value: `${avg}ms` },
        { label: '最快', value: `${best}ms` },
        { label: '次数', value: this.results.length },
      ],
    });
  }

  destroy() {}
}
