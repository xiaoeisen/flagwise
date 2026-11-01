import type { CatalogEntry } from '../../domain/catalog';
import { flagUrl } from '../../domain/catalog';
import { h } from '../dom';

export interface TileOptions {
  /** Hide the name until the player reveals it. */
  covered?: boolean;
  mastered?: boolean;
  onClick: () => void;
}

/** A flag thumbnail with its name. Used by the Learn grid, results and stats. */
export function flagTile(c: CatalogEntry, opts: TileOptions): HTMLButtonElement {
  const covered = !!opts.covered;
  return h(
    'button',
    { class: 'tile', type: 'button', 'aria-label': covered ? 'Hidden flag, tap to reveal' : c.name, on: { click: opts.onClick } },
    opts.mastered ? h('span', { class: 'star', title: 'Mastered' }) : null,
    h(
      'div',
      { class: 'tf' },
      h('img', {
        src: flagUrl(c.code),
        alt: covered ? 'Flag' : `Flag of ${c.name}`,
        loading: 'lazy',
        decoding: 'async',
        width: 640,
        height: 480,
      }),
    ),
    h('span', { class: `tn${covered ? ' cov' : ''}` }, covered ? 'Tap to reveal' : c.name),
  );
}
