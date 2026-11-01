import { CATALOG, REGIONS } from '../../domain/catalog';
import { search } from '../../domain/matching';
import { isMastered } from '../../domain/progress';
import type { RegionFilter } from '../../domain/types';
import { renderChips } from '../components/chips';
import { flagTile } from '../components/flagTile';
import type { ViewContext } from '../context';
import { h, mount } from '../dom';
import type { View } from '../router';

/** Browse every flag. "Cover names" turns the grid into a self-test: tap to reveal, tap again for details. */
export class LearnView implements View {
  readonly id = 'learn' as const;
  readonly el = h('section');

  private query = '';
  private region: RegionFilter = 'all';
  private cover = false;
  private revealed = new Set<string>();

  private readonly chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Region' });
  private readonly count = h('p', { class: 'mono muted count-note' });
  private readonly grid = h('div', { class: 'grid' });

  constructor(private readonly ctx: ViewContext) {
    const searchBox = h('input', { id: 'q', type: 'search', placeholder: 'Search by country or capital', autocomplete: 'off' });
    searchBox.addEventListener('input', () => {
      this.query = searchBox.value;
      this.renderGrid();
    });
    const coverBox = h('input', { type: 'checkbox', id: 'cover' });
    coverBox.addEventListener('change', () => {
      this.cover = coverBox.checked;
      this.revealed.clear();
      this.renderGrid();
    });
    this.el.append(
      h(
        'div',
        { class: 'page-head' },
        h('h2', null, 'Learn the flags'),
        h('p', { class: 'muted' }, 'Study all flags or cover names to quiz yourself'),
      ),
      h(
        'div',
        { class: 'toolbar' },
        h('div', null, h('label', { class: 'sr-only', for: 'q' }, 'Search countries'), searchBox),
        this.chips,
        h('label', { class: 'switch', for: 'cover' }, coverBox, h('span', null, 'Cover names')),
      ),
      this.count,
      this.grid,
    );
  }

  render(): void {
    const options: (readonly [RegionFilter, string])[] = [['all', 'World'], ...REGIONS.map((r) => [r.code, r.name] as const)];
    renderChips(this.chips, options, this.region, (region) => {
      this.region = region;
      this.render();
    });
    this.renderGrid();
  }

  private renderGrid(): void {
    const { ctl, detail } = this.ctx;
    const pool = CATALOG.filter((c) => this.region === 'all' || c.region === this.region);
    const items = search(this.query, pool);
    this.count.textContent = `${items.length} ${items.length === 1 ? 'flag' : 'flags'}`;
    if (!items.length) {
      mount(this.grid, h('div', { class: 'empty' }, 'No matches'));
      return;
    }
    mount(
      this.grid,
      items.map((c) => {
        const covered = this.cover && !this.revealed.has(c.code);
        const tile = flagTile(c, {
          covered,
          mastered: isMastered(ctl.progress, c.code),
          onClick: () => {
            if (covered) {
              this.revealed.add(c.code);
              this.renderGrid();
              this.focusTile(c.name);
            } else detail.open(c.code, tile);
          },
        });
        return tile;
      }),
    );
  }

  /** After a reveal the grid is rebuilt, so put keyboard focus back on the same flag. */
  private focusTile(name: string): void {
    const tile = [...this.grid.querySelectorAll<HTMLButtonElement>('.tile')].find((t) => t.getAttribute('aria-label') === name);
    tile?.focus({ preventScroll: true });
  }
}
