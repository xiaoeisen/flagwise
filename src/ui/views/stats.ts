import { ALL_CODES, CATALOG, REGIONS, codesIn, country } from '../../domain/catalog';
import { dailyStreak, isMastered, masteredCount } from '../../domain/progress';
import { flagTile } from '../components/flagTile';
import type { ViewContext } from '../context';
import { h, mount } from '../dom';
import type { View } from '../router';

export class StatsView implements View {
  readonly id = 'stats' as const;
  readonly el = h('section');
  private confirmReset = false;

  constructor(private readonly ctx: ViewContext) {}

  render(): void {
    const { ctl, go, detail } = this.ctx;
    const p = ctl.progress;
    const head = h(
      'div',
      { class: 'page-head' },
      h('h2', null, 'Your stats'),
      h('p', { class: 'muted' }, 'Saved in this browser'),
    );

    if (!p.answered) {
      mount(
        this.el,
        head,
        h(
          'div',
          { class: 'empty' },
          h('p', null, 'Play a round to start tracking your stats'),
          h('button', { class: 'btn primary', type: 'button', on: { click: () => go('home') } }, 'Start a round'),
        ),
      );
      return;
    }

    const tiles: readonly (readonly [string, string])[] = [
      ['Answered', String(p.answered)],
      ['Accuracy', `${Math.round((p.correct / p.answered) * 100)}%`],
      ['Longest run', String(p.bestRun)],
      ['Best blitz', p.bestBlitz ? String(p.bestBlitz) : '–'],
      ['Daily streak', String(dailyStreak(p, ctl.today))],
      ['Mastered', `${masteredCount(p)} / ${ALL_CODES.length}`],
    ];

    const toughest = CATALOG.filter((c) => (p.flags[c.code]?.wrong ?? 0) > 0)
      .sort((a, b) => p.flags[b.code]!.wrong - p.flags[a.code]!.wrong || p.flags[a.code]!.run - p.flags[b.code]!.run)
      .slice(0, 8);

    const resetBtn = h(
      'button',
      {
        class: 'btn ghost small',
        type: 'button',
        on: {
          click: () => {
            if (!this.confirmReset) {
              this.confirmReset = true;
              this.render();
              return;
            }
            this.confirmReset = false;
            ctl.resetProgress();
            this.render();
          },
        },
      },
      this.confirmReset ? 'Tap again to erase everything' : 'Reset progress',
    );

    mount(
      this.el,
      head,
      h(
        'div',
        { class: 'stat-tiles' },
        tiles.map(([k, v]) => h('div', { class: 'fact' }, h('div', { class: 'v mono' }, v), h('div', { class: 'k' }, k))),
      ),
      h('h3', { class: 'section-title' }, 'Mastery by region'),
      h(
        'div',
        { class: 'rows' },
        REGIONS.map((r) => {
          const codes = codesIn(r.code);
          const m = masteredCount(p, codes);
          return h(
            'div',
            { class: 'row-bar' },
            h('span', null, r.name),
            h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((m / codes.length) * 100)}%` })),
            h('span', { class: 'n mono' }, `${m} / ${codes.length}`),
          );
        }),
      ),
      toughest.length ? h('h3', { class: 'section-title' }, 'Toughest flags') : null,
      toughest.length
        ? h(
            'div',
            { class: 'mini-grid' },
            toughest.map((c) => {
              const tile = flagTile(country(c.code), { mastered: isMastered(p, c.code), onClick: () => detail.open(c.code, tile) });
              return tile;
            }),
          )
        : null,
      h('div', { class: 'actions' }, resetBtn),
    );
  }
}
