import { country } from '../../domain/catalog';
import { dailyStreak, isMastered } from '../../domain/progress';
import type { ModeId } from '../../domain/types';
import { flagTile } from '../components/flagTile';
import type { ViewContext } from '../context';
import { h, mount } from '../dom';
import type { View } from '../router';

const MODE_NAME: Record<ModeId, string> = {
  classic: 'Classic',
  type: 'Type it',
  streak: 'Three lives',
  blitz: 'Blitz',
  daily: 'Daily',
  missed: 'Missed flags',
};

const fmtTime = (ms: number): string => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export class ResultsView implements View {
  readonly id = 'results' as const;
  readonly el = h('section');

  constructor(private readonly ctx: ViewContext) {}

  render(): void {
    const { ctl, go, detail } = this.ctx;
    const r = ctl.summary;
    if (!r) return;
    const missed = r.answers.filter((a) => !a.correct);

    let big: HTMLElement;
    let note: string;
    if (r.mode === 'streak') {
      big = h('div', { class: 'big-num' }, String(r.score), h('small', null, 'named'));
      note = r.livesLeft <= 0 ? `Out of lives after ${r.total} flags · Best run ${r.bestRun}` : `All flags cleared · Best run ${r.bestRun}`;
    } else if (r.mode === 'blitz') {
      big = h('div', { class: 'big-num' }, String(r.score), h('small', null, 'in 60s'));
      note = r.newRecord ? 'New personal best' : `Best score ${ctl.progress.bestBlitz}`;
    } else {
      big = h('div', { class: 'big-num' }, String(r.score), h('small', null, `/ ${r.total}`));
      note =
        r.accuracy === 100
          ? 'Clean sweep'
          : r.accuracy >= 80
            ? 'Strong round'
            : r.accuracy >= 50
              ? 'Keep practicing'
              : 'Try look-alike mode';
    }

    const facts: readonly (readonly [string, string])[] = [
      ['Accuracy', `${r.accuracy}%`],
      ['Time', fmtTime(r.elapsedMs)],
      ['Longest run', String(r.bestRun)],
      ['Newly mastered', String(r.newlyMastered)],
    ];

    const again = h('button', { class: 'btn primary', type: 'button', on: { click: () => ctl.start(r.mode) && go('play') } }, 'Play again');
    const actions = h('div', { class: 'actions' }, again);
    if (ctl.reviewCodes.length && r.mode !== 'missed') {
      actions.append(h('button', { class: 'btn', type: 'button', on: { click: () => ctl.start('missed') && go('play') } }, 'Practice missed flags'));
    }
    actions.append(h('button', { class: 'btn ghost', type: 'button', on: { click: () => go('home') } }, 'Home'));

    mount(
      this.el,
      h(
        'div',
        { class: 'res-head' },
        h('p', { class: 'eyebrow' }, r.mode === 'daily' ? `${MODE_NAME.daily} ${r.dateKey ?? ''}` : MODE_NAME[r.mode]),
        big,
        h('p', { class: 'res-note' }, note, r.newRecord ? h('span', { class: 'tag' }, 'Record') : null),
      ),
      h(
        'div',
        { class: 'facts' },
        facts.map(([k, v]) => h('div', { class: 'fact' }, h('div', { class: 'v mono' }, v), h('div', { class: 'k' }, k))),
      ),
      r.mode === 'daily' ? this.shareBlock() : null,
      missed.length ? h('h3', { class: 'section-title' }, `Flags to review (${missed.length})`) : null,
      missed.length
        ? h(
            'div',
            { class: 'mini-grid' },
            missed.map((a) => {
              const tile = flagTile(country(a.code), { mastered: isMastered(ctl.progress, a.code), onClick: () => detail.open(a.code, tile) });
              return tile;
            }),
          )
        : null,
      actions,
    );
  }

  private shareBlock(): HTMLElement {
    const { ctl } = this.ctx;
    const r = ctl.summary!;
    const pattern = r.answers.map((a) => (a.correct ? '1' : '0')).join('');
    const text = `Flagwise Daily ${r.dateKey}\n${r.score}/${r.total}\nResults: ${pattern}`;
    const area = h('textarea', { rows: 3, readonly: true, 'aria-label': 'Share text' });
    area.value = text;
    const copy = h('button', { class: 'btn', type: 'button' }, 'Copy result');
    copy.addEventListener('click', () => {
      const done = () => {
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy result'), 1500);
      };
      // Clipboard access can be refused (embedded views, older apps): fall back to selecting the text.
      navigator.clipboard?.writeText(text).then(done, () => area.select()) ?? area.select();
    });
    const streak = dailyStreak(ctl.progress, ctl.today);
    return h(
      'div',
      null,
      h('div', { class: 'share' }, area, copy),
      h('p', { class: 'muted', style: 'margin-top:12px' }, `Daily streak: ${streak} ${streak === 1 ? 'day' : 'days'}${r.firstDaily ? '' : ' · First try counts'}`),
    );
  }
}
