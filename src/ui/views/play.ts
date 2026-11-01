import type { AnswerEvent } from '../../app/controller';
import { country, flagUrl, regionName } from '../../domain/catalog';
import type { GameSession } from '../../domain/game';
import { BLITZ_MS, STREAK_LIVES } from '../../domain/game';
import { suggest } from '../../domain/matching';
import type { CatalogEntry } from '../../domain/catalog';
import type { ViewContext } from '../context';
import { h, mount } from '../dom';
import type { View } from '../router';

/** The round screen: flag, answer input, feedback. Reacts to controller events; holds no game rules. */
export class PlayView implements View {
  readonly id = 'play' as const;
  readonly el = h('section', { class: 'play-view' });

  private readonly progText = h('div', { class: 'prog-text mono' });
  private readonly progBar = h('i');
  private readonly score = h('b', null, '0');
  private readonly run = h('b', null, '0');
  private readonly runWrap = h('span', { hidden: true }, 'Streak ', this.run);
  private readonly lives = h('span', { hidden: true, 'aria-label': 'Lives left' });
  private readonly timeNum = h('b', null, '60');
  private readonly penalty = h('em', { class: 'pen' });
  private readonly timeWrap = h('span', { hidden: true }, this.timeNum, 's', this.penalty);
  private readonly flag = h('img', { alt: 'Flag to identify', width: 640, height: 480, decoding: 'async' });
  private readonly flagBox = h('div', { class: 'flagbox' }, this.flag);
  private readonly options = h('div', { class: 'options' });
  private readonly input = h('input', {
    id: 'ans',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'words',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    placeholder: 'Type the country name',
    role: 'combobox',
    'aria-expanded': 'false',
    'aria-controls': 'sug',
  });
  private readonly suggestions = h('ul', { id: 'sug', class: 'sug', role: 'listbox', hidden: true });
  private readonly hint = h('span', { class: 'hint' });
  private readonly typeForm = h('form', { class: 'typebox', hidden: true, autocomplete: 'off' });
  private readonly feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite', hidden: true });

  private nextBtn: HTMLButtonElement | null = null;
  private matches: CatalogEntry[] = [];
  private matchIdx = -1;
  private hasDisplayedFlag = false;

  constructor(private readonly ctx: ViewContext) {
    const { ctl } = ctx;

    this.typeForm.append(
      h('label', { class: 'sr-only', for: 'ans' }, 'Country name'),
      h('div', { class: 'type-row' }, this.input, h('button', { class: 'btn primary', type: 'submit' }, 'Check')),
      this.suggestions,
      h(
        'div',
        { class: 'type-tools' },
        h('button', { type: 'button', class: 'linklike', on: { click: () => this.showHint() } }, 'Show a hint'),
        h('button', { type: 'button', class: 'linklike', on: { click: () => ctl.skip() } }, "I don't know"),
        this.hint,
      ),
    );
    this.typeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitTyped();
    });
    this.input.addEventListener('input', () => this.renderSuggestions());
    this.input.addEventListener('keydown', (e) => this.onInputKey(e));

    this.el.append(
      h(
        'div',
        { class: 'hud' },
        h('button', { class: 'btn ghost small', type: 'button', on: { click: () => this.quit() } }, 'Quit'),
        h('div', { class: 'prog' }, this.progText, h('div', { class: 'bar' }, this.progBar)),
        h('div', { class: 'hud-stats mono' }, h('span', null, 'Score ', this.score), this.runWrap, this.lives, this.timeWrap),
      ),
      h('div', { class: 'stage' }, this.flagBox),
      this.options,
      this.typeForm,
      this.feedback,
    );

    ctl.events.on('question', (s) => this.showQuestion(s));
    ctl.events.on('answered', (e) => this.showAnswer(e));
    ctl.events.on('tick', (left) => this.showTime(left));
    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  render(): void {
    /* Everything is driven by controller events; nothing to rebuild on show. */
  }

  /* ---- controller events ---- */

  private showQuestion(s: GameSession): void {
    const q = s.question;
    this.swapFlag(flagUrl(q.code));
    this.feedback.hidden = true;
    mount(this.feedback);
    this.nextBtn = null;

    this.runWrap.hidden = !(s.mode === 'streak' || s.mode === 'blitz');
    this.lives.hidden = s.mode !== 'streak';
    this.timeWrap.hidden = s.mode !== 'blitz';

    if (q.options) {
      this.typeForm.hidden = true;
      this.options.hidden = false;
      mount(
        this.options,
        q.options.map((code, i) =>
          h(
            'button',
            { class: 'opt', type: 'button', 'data-code': code, on: { click: () => this.ctx.ctl.chooseOption(code) } },
            h('span', { class: 'key mono' }, String(i + 1)),
            h('span', { class: 'nm' }, country(code).name),
          ),
        ),
      );
    } else {
      this.options.hidden = true;
      this.typeForm.hidden = false;
      this.input.value = '';
      this.input.disabled = false;
      this.hint.textContent = '';
      this.closeSuggestions();
      this.input.focus({ preventScroll: true });
    }

    const next = s.nextCode;
    if (next) new Image().src = flagUrl(next);
    this.updateHud(s);
  }

  private swapFlag(src: string): void {
    if (this.hasDisplayedFlag && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const outgoing = this.flag.cloneNode(false) as HTMLImageElement;
      outgoing.className = 'flag-swap-out';
      outgoing.alt = '';
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.addEventListener('animationend', () => outgoing.remove(), { once: true });
      this.flagBox.append(outgoing);
      // Also remove the outgoing layer if animations are interrupted by a tab change.
      window.setTimeout(() => outgoing.remove(), 600);

      this.flag.classList.remove('flag-swap-in');
      this.flag.classList.add('flag-swap-in');
      this.flag.addEventListener('animationend', () => this.flag.classList.remove('flag-swap-in'), { once: true });
    }

    this.flag.src = src;
    this.hasDisplayedFlag = true;
  }

  private showAnswer(e: AnswerEvent): void {
    const { record } = e;
    const s = this.ctx.ctl.session!;
    const c = country(record.code);
    this.updateHud(s);

    if (record.given && !record.correct && s.mode === 'blitz') this.flashPenalty();
    if (s.mode === 'type') {
      this.input.disabled = true;
      this.closeSuggestions();
    } else {
      this.options.querySelectorAll<HTMLButtonElement>('.opt').forEach((btn) => {
        const code = btn.dataset.code!;
        const key = btn.firstElementChild!;
        btn.disabled = true;
        if (code === record.code) {
          btn.classList.add('good');
          key.textContent = '✓';
        } else if (!record.correct && code === record.given) {
          btn.classList.add('bad');
          key.textContent = '✕';
        } else btn.classList.add('dim');
      });
    }

    const text = h(
      'div',
      { class: 'fb-text' },
      h('p', { class: 'fb-title' }, record.correct ? 'Correct' : c.name),
      h('p', { class: 'fb-sub' }, record.correct ? `${c.name} · capital ${c.capital}` : `Capital ${c.capital} · ${regionName(c.region)}`),
      !record.correct
        ? h(
            'p',
            { class: 'fb-sub' },
            record.skipped ? 'Skipped' : `Your answer: ${s.mode === 'type' ? record.given : country(record.given).name}`,
          )
        : null,
    );
    this.feedback.className = `feedback ${record.correct ? 'ok' : 'no'}`;
    this.feedback.hidden = false;
    mount(this.feedback, text);

    if (e.autoAdvance) return;
    this.nextBtn = h('button', { class: 'btn primary', type: 'button', on: { click: () => this.ctx.ctl.next() } }, e.last ? 'See results' : 'Next flag');
    this.feedback.append(this.nextBtn);
    this.nextBtn.focus({ preventScroll: true });
  }

  private showTime(msLeft: number): void {
    this.timeNum.textContent = String(Math.ceil(msLeft / 1000));
    this.progBar.style.width = `${(msLeft / BLITZ_MS) * 100}%`;
  }

  private flashPenalty(): void {
    this.penalty.textContent = '−3s';
    setTimeout(() => (this.penalty.textContent = ''), 800);
  }

  private updateHud(s: GameSession): void {
    const st = s.stats;
    this.score.textContent = String(st.score);
    this.run.textContent = String(st.run);
    if (s.mode === 'streak') {
      mount(
        this.lives,
        Array.from({ length: STREAK_LIVES }, (_, i) => h('span', { class: `pip${i < st.lives ? '' : ' off'}` })),
      );
    }
    if (s.mode === 'blitz') {
      this.progText.textContent = 'Answer fast';
      return;
    }
    this.progText.textContent = s.mode === 'streak' ? `Flag ${st.index + 1}` : `${st.index + 1} / ${st.total}`;
    this.progBar.style.width = `${Math.round((st.index / st.total) * 100)}%`;
  }

  /* ---- typed answers ---- */

  private submitTyped(): void {
    const v = this.input.value.trim();
    if (v) this.ctx.ctl.submitText(v);
  }

  private showHint(): void {
    const s = this.ctx.ctl.session;
    if (!s || s.answered) return;
    const name = country(s.question.code).name;
    this.hint.textContent = `Starts with ${name.charAt(0)} · ${name.replace(/[^A-Za-zÀ-ÿ]/g, '').length} letters`;
  }

  private renderSuggestions(): void {
    if (!this.ctx.ctl.prefs.autocomplete) return this.closeSuggestions();
    this.matches = suggest(this.input.value);
    this.matchIdx = -1;
    if (!this.matches.length) return this.closeSuggestions();
    mount(
      this.suggestions,
      this.matches.map((c, i) =>
        h(
          'li',
          {
            role: 'option',
            id: `sug-${i}`,
            'aria-selected': 'false',
            on: {
              mousedown: (e) => {
                e.preventDefault();
                this.input.value = c.name;
                this.submitTyped();
              },
            },
          },
          c.name,
        ),
      ),
    );
    this.suggestions.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  }

  private closeSuggestions(): void {
    this.matches = [];
    this.matchIdx = -1;
    mount(this.suggestions);
    this.suggestions.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  }

  private markSuggestion(): void {
    this.matches.forEach((_, i) => document.getElementById(`sug-${i}`)?.setAttribute('aria-selected', String(i === this.matchIdx)));
  }

  private onInputKey(e: KeyboardEvent): void {
    if (!this.matches.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = this.matches.length;
      this.matchIdx = (this.matchIdx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      this.markSuggestion();
    } else if (e.key === 'Enter' && this.matchIdx >= 0) {
      e.preventDefault();
      this.input.value = this.matches[this.matchIdx]!.name;
      this.submitTyped();
    } else if (e.key === 'Escape') this.closeSuggestions();
  }

  /* ---- keyboard shortcuts and exit ---- */

  private onKey(e: KeyboardEvent): void {
    const { ctl, detail } = this.ctx;
    const s = ctl.session;
    if (this.el.hidden || !s || detail.isOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!s.answered && s.question.options && /^[1-4]$/.test(e.key)) {
      const code = s.question.options[Number(e.key) - 1];
      if (code) ctl.chooseOption(code);
    } else if (s.answered && s.mode !== 'blitz' && (e.key === 'Enter' || e.key === ' ') && document.activeElement !== this.nextBtn) {
      e.preventDefault();
      ctl.next();
    }
  }

  private quit(): void {
    this.ctx.ctl.quit();
    this.ctx.go('home');
  }
}
