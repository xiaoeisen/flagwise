import { ALL_CODES, REGIONS, codesIn, regionName } from '../../domain/catalog';
import { masteredCount } from '../../domain/progress';
import type { ModeId, QuestionCount, RegionFilter } from '../../domain/types';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FlagGallery } from '../../components/ui/flag-gallery';
import { renderChips } from '../components/chips';
import type { ViewContext } from '../context';
import { h, mount } from '../dom';
import type { View } from '../router';

interface ModeCard {
  id: ModeId;
  name: string;
  desc: string;
  meta: (c: ViewContext['ctl']) => string;
}

const countLabel = (ctl: ViewContext['ctl']): string => {
  const pool = codesIn(ctl.prefs.region).length;
  const n = ctl.prefs.count === 'all' ? pool : Math.min(ctl.prefs.count, pool);
  return `${n} flags`;
};

const MODES: readonly ModeCard[] = [
  { id: 'classic', name: 'Classic', desc: 'Choose from four countries', meta: (c) => `${countLabel(c)} · multiple choice` },
  { id: 'type', name: 'Type it', desc: 'Type the country name', meta: (c) => `${countLabel(c)} · free text` },
  { id: 'streak', name: 'Three lives', desc: 'Play until you miss three flags', meta: (c) => `endless · ${codesIn(c.prefs.region).length} flags in play` },
  {
    id: 'blitz',
    name: 'Blitz',
    desc: 'Name as many as you can in 60 seconds',
    meta: (c) => (c.progress.bestBlitz ? `best ${c.progress.bestBlitz}` : '60 seconds · no record yet'),
  },
  {
    id: 'daily',
    name: 'Daily',
    desc: '10 shared flags each day',
    meta: (c) => {
      const d = c.progress.daily[c.today];
      return d ? `done today · ${d.score}/10` : '10 flags · new every day';
    },
  },
  {
    id: 'missed',
    name: 'Missed flags',
    desc: 'Practice flags you missed',
    meta: (c) => (c.reviewCodes.length ? `${c.reviewCodes.length} to review` : 'nothing to review yet'),
  },
];

const COUNT_OPTIONS: readonly (readonly [QuestionCount, string])[] = [
  [10, '10'],
  [20, '20'],
  [50, '50'],
  ['all', 'All'],
];

const HEADLINE = 'Name the flag';
const typedHeadline = () =>
  h(
    'h1',
    { 'aria-label': HEADLINE },
    h(
      'span',
      { class: 'typing-headline', 'aria-hidden': 'true' },
      Array.from(HEADLINE).map((char, index) =>
        h('span', { class: 'typing-char', style: `--char-index:${index}` }, char),
      ),
    ),
  );

export class HomeView implements View {
  readonly id = 'home' as const;
  readonly el = h('section');

  private readonly eyebrow = h('p', { class: 'eyebrow' });
  private readonly quick = h('button', { class: 'btn primary big', type: 'button' });
  private readonly masteredNum = h('span', { class: 'mono' });
  private readonly masteredBar = h('i');
  private readonly meter = h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Flags mastered' }, this.masteredBar);
  private readonly gallery = h('div', { class: 'flag-gallery-mount' });
  private readonly regionChips = h('div', { class: 'chips', role: 'radiogroup', 'aria-labelledby': 'l-region' });
  private readonly countChips = h('div', { class: 'chips', role: 'radiogroup', 'aria-labelledby': 'l-count' });
  private readonly choiceChips = h('div', { class: 'chips', role: 'radiogroup', 'aria-labelledby': 'l-choices' });
  private readonly auto = h('input', { type: 'checkbox', id: 's-auto' });
  private readonly poolNote = h('p', { class: 'muted mono pool-note' });
  private readonly modes = h('div', { class: 'modes' });

  constructor(private readonly ctx: ViewContext) {
    const { ctl } = ctx;
    createRoot(this.gallery).render(createElement(FlagGallery, { codes: ALL_CODES }));
    this.quick.addEventListener('click', () => this.play('classic'));
    this.auto.addEventListener('change', () => ctl.setPrefs({ autocomplete: this.auto.checked }));
    this.meter.setAttribute('aria-valuemin', '0');

    this.el.append(
      h(
        'div',
        { class: 'hero' },
        h(
          'div',
          { class: 'hero-copy' },
          this.eyebrow,
          typedHeadline(),
          h('p', { class: 'lede' }, 'Choose from four or type the country name'),
          h(
            'div',
            { class: 'hero-cta' },
            this.quick,
            h('button', { class: 'btn big', type: 'button', on: { click: () => this.play('daily') } }, "Today's daily"),
          ),
          h(
            'div',
            { class: 'meter' },
            h('div', { class: 'meter-top' }, h('span', null, 'Flags mastered'), this.masteredNum),
            this.meter,
          ),
        ),
        this.gallery,
      ),
      h(
        'div',
        { class: 'setup' },
        h('div', { class: 'grp wide' }, h('span', { class: 'lbl', id: 'l-region' }, 'Region'), this.regionChips),
        h('div', { class: 'grp' }, h('span', { class: 'lbl', id: 'l-count' }, 'Questions'), this.countChips),
        h('div', { class: 'grp' }, h('span', { class: 'lbl', id: 'l-choices' }, 'Answer choices'), this.choiceChips),
        h(
          'div',
          { class: 'grp' },
          h('span', { class: 'lbl' }, 'Type it mode'),
          h('label', { class: 'switch', for: 's-auto' }, this.auto, h('span', null, 'Suggest names while typing')),
        ),
        this.poolNote,
      ),
      this.modes,
      h('p', { class: 'credit' }, 'Flag artwork: flag-icons · MIT license'),
    );
  }

  render(): void {
    const { ctl } = this.ctx;
    const p = ctl.prefs;
    const pool = codesIn(p.region).length;
    const mastered = masteredCount(ctl.progress);

    this.eyebrow.textContent = `${ALL_CODES.length} flags · ${REGIONS.length} regions`;
    this.masteredNum.textContent = `${mastered} / ${ALL_CODES.length}`;
    this.masteredBar.style.width = `${Math.round((mastered / ALL_CODES.length) * 100)}%`;
    this.meter.setAttribute('aria-valuenow', String(mastered));
    this.meter.setAttribute('aria-valuemax', String(ALL_CODES.length));
    this.quick.textContent = `Start ${p.count === 'all' ? `all ${pool}` : Math.min(p.count, pool)} flags`;

    const regionOptions: (readonly [RegionFilter, string])[] = [['all', 'World'], ...REGIONS.map((r) => [r.code, r.name] as const)];
    renderChips(this.regionChips, regionOptions, p.region, (region) => this.set({ region }));
    renderChips(this.countChips, COUNT_OPTIONS, p.count, (count) => this.set({ count }));
    renderChips(this.choiceChips, [[false, 'Random'], [true, 'Look-alikes']], p.lookalikes, (lookalikes) => this.set({ lookalikes }));
    this.auto.checked = p.autocomplete;
    this.poolNote.textContent = `${pool} flags in ${p.region === 'all' ? 'the world' : regionName(p.region)} · Daily and Missed use all regions`;

    mount(
      this.modes,
      MODES.map((m) => {
        const disabled = m.id === 'missed' && ctl.reviewCodes.length === 0;
        return h(
          'button',
          {
            class: `mode${m.id === 'daily' ? ' daily' : ''}`,
            type: 'button',
            disabled,
            on: {
              click: () => this.play(m.id),
              pointerenter: (e) => this.sparkModeCard(e),
              pointermove: (e) => this.tiltModeCard(e),
              pointerleave: (e) => this.resetModeCard(e),
              pointerdown: (e) => this.rippleModeCard(e),
            },
          },
          h('h3', null, m.name),
          h('p', null, m.desc),
          h('span', { class: 'meta' }, m.meta(ctl)),
        );
      }),
    );

  }

  private set(patch: Parameters<ViewContext['ctl']['setPrefs']>[0]): void {
    this.ctx.ctl.setPrefs(patch);
    this.render();
  }

  private play(mode: ModeId): void {
    if (this.ctx.ctl.start(mode)) this.ctx.go('play');
  }

  private tiltModeCard(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    const card = e.currentTarget as HTMLButtonElement;
    if (card.disabled) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    card.style.setProperty('--pointer-x', `${x * rect.width}px`);
    card.style.setProperty('--pointer-y', `${y * rect.height}px`);
    card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
    card.style.setProperty('--magnet-x', `${(x - 0.5) * 4}px`);
    card.style.setProperty('--magnet-y', `${(y - 0.5) * 4}px`);
  }

  private resetModeCard(e: PointerEvent): void {
    const card = e.currentTarget as HTMLButtonElement;
    for (const property of ['--tilt-x', '--tilt-y', '--magnet-x', '--magnet-y']) card.style.removeProperty(property);
    card.style.removeProperty('--pointer-x');
    card.style.removeProperty('--pointer-y');
  }

  private sparkModeCard(e: PointerEvent): void {
    if (e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = e.currentTarget as HTMLButtonElement;
    if (card.disabled) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('span');
      particle.className = 'mode-particle';
      particle.setAttribute('aria-hidden', 'true');
      particle.style.left = `${x + (Math.random() - 0.5) * 64}px`;
      particle.style.top = `${y + (Math.random() - 0.5) * 40}px`;
      particle.style.setProperty('--spark-x', `${(Math.random() - 0.5) * 32}px`);
      particle.style.setProperty('--spark-y', `${-12 - Math.random() * 24}px`);
      particle.addEventListener('animationend', () => particle.remove(), { once: true });
      card.append(particle);
    }
  }

  private rippleModeCard(e: PointerEvent): void {
    const card = e.currentTarget as HTMLButtonElement;
    if (card.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.7;
    const ripple = document.createElement('span');
    ripple.className = 'mode-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    card.append(ripple);
  }
}
