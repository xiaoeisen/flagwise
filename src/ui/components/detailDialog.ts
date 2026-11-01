import type { AppController } from '../../app/controller';
import { country, flagUrl, regionName } from '../../domain/catalog';
import { lookalikesOf } from '../../domain/lookalikes';
import { isMastered } from '../../domain/progress';
import { h, mount } from '../dom';
import { flagTile } from './flagTile';

/** Modal with one country's flag, capital, your record and the flags it is confused with. */
export class DetailDialog {
  private readonly overlay: HTMLElement;
  private readonly img: HTMLImageElement;
  private readonly title: HTMLElement;
  private readonly facts: HTMLElement;
  private readonly similar: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private opener: HTMLElement | null = null;

  constructor(private readonly ctl: AppController) {
    this.img = h('img', { alt: '', width: 640, height: 480, decoding: 'async' });
    this.title = h('h3', { id: 'dlg-title' });
    this.facts = h('dl');
    this.similar = h('div');
    this.closeBtn = h('button', { class: 'close', type: 'button', 'aria-label': 'Close', on: { click: () => this.close() } }, '×');
    this.overlay = h(
      'div',
      {
        class: 'overlay',
        hidden: true,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dlg-title',
        on: { click: (e) => e.target === this.overlay && this.close() },
      },
      h(
        'div',
        { class: 'sheet' },
        this.closeBtn,
        h('div', { class: 'sheet-flag' }, h('div', { class: 'flagbox' }, this.img)),
        h('div', { class: 'sheet-body' }, this.title, this.facts, this.similar),
      ),
    );
    document.body.appendChild(this.overlay);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.overlay.hidden;
  }

  open(code: string, from?: HTMLElement): void {
    if (from) this.opener = from;
    const c = country(code);
    const f = this.ctl.progress.flags[code];
    const record = f ? `Named ${f.right}×, missed ${f.wrong}×` : 'Not seen in a quiz yet';
    this.img.src = flagUrl(code);
    this.img.alt = `Flag of ${c.name}`;
    this.title.textContent = c.name;
    mount(
      this.facts,
      h('dt', null, 'Capital'),
      h('dd', null, c.capital),
      h('dt', null, 'Region'),
      h('dd', null, regionName(c.region)),
      h('dt', null, 'Record'),
      h('dd', null, record + (isMastered(this.ctl.progress, code) ? ' · mastered' : '')),
    );
    const sims = lookalikesOf(code);
    mount(
      this.similar,
      sims.length ? h('p', { class: 'lbl', style: 'margin-bottom:8px' }, 'Often confused with') : null,
      sims.length
        ? h(
            'div',
            { class: 'mini-grid' },
            sims.map((s) => flagTile(country(s), { mastered: isMastered(this.ctl.progress, s), onClick: () => this.open(s) })),
          )
        : null,
    );
    this.overlay.hidden = false;
    this.closeBtn.focus();
  }

  close(): void {
    this.overlay.hidden = true;
    if (this.opener?.isConnected) this.opener.focus();
  }
}
