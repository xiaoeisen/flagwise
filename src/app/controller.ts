import { codesIn, ALL_CODES } from '../domain/catalog';
import { GameSession, type AnswerRecord, type GameResult } from '../domain/game';
import { applyAnswer, dateKey, reviewList } from '../domain/progress';
import { hashString, mulberry32, shuffle } from '../domain/rng';
import { weightedOrder } from '../domain/selection';
import type { Clock, ModeId, Prefs, Progress } from '../domain/types';
import type { StoragePort } from '../services/storage';
import { defaultSnapshot } from '../services/storage';
import { Emitter } from './emitter';

export const DAILY_COUNT = 10;

/** A finished round plus the effects it had on the player's progress. */
export interface RoundSummary extends GameResult {
  newlyMastered: number;
  newRecord: boolean;
  /** True when this round set the day's recorded daily score. */
  firstDaily: boolean;
}

export interface AnswerEvent {
  record: AnswerRecord;
  /** No question follows. The UI should offer "See results". */
  last: boolean;
  /** Blitz moves on by itself, so no Next button is needed. */
  autoAdvance: boolean;
}

interface Events {
  /** Prefs or progress changed. */
  change: undefined;
  question: GameSession;
  answered: AnswerEvent;
  tick: number;
  finished: RoundSummary;
}

/**
 * Application layer. Owns prefs, progress and the active round, applies the
 * domain rules, persists changes, and tells the UI what happened through events.
 * It never touches the DOM.
 */
export class AppController {
  readonly events = new Emitter<Events>();
  prefs: Prefs;
  progress: Progress;
  session: GameSession | null = null;
  summary: RoundSummary | null = null;

  private ticker: ReturnType<typeof setInterval> | null = null;
  private newlyMastered = 0;
  private finished = false;

  constructor(
    private readonly storage: StoragePort,
    private readonly clock: Clock,
  ) {
    const snap = storage.load();
    this.prefs = snap.prefs;
    this.progress = snap.progress;
  }

  get today(): string {
    return dateKey(new Date(this.clock.now()));
  }

  get active(): boolean {
    return !!this.session && !this.finished;
  }

  /** Flags the player got wrong and has not yet answered correctly twice. */
  get reviewCodes(): string[] {
    return reviewList(this.progress);
  }

  /* ---- preferences and progress ---- */

  setPrefs(patch: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...patch };
    this.persist();
    this.events.emit('change', undefined);
  }

  resetProgress(): void {
    this.progress = defaultSnapshot().progress;
    this.persist();
    this.events.emit('change', undefined);
  }

  /* ---- rounds ---- */

  /** Starts a round. Returns false if the mode cannot start (e.g. nothing to review). */
  start(mode: ModeId): boolean {
    this.stopTicker();
    const p = this.prefs;
    const regionPool = codesIn(p.region);
    let queue: string[];
    let pool: readonly string[] = regionPool;
    let lookalikes = p.lookalikes;
    let rng = Math.random;
    let key: string | undefined;

    if (mode === 'daily') {
      key = this.today;
      rng = mulberry32(hashString(`flagwise:${key}`));
      queue = shuffle(ALL_CODES, rng).slice(0, DAILY_COUNT);
      pool = ALL_CODES;
      lookalikes = true;
    } else if (mode === 'missed') {
      queue = shuffle(this.reviewCodes);
      pool = ALL_CODES;
      if (!queue.length) return false;
    } else if (mode === 'streak' || mode === 'blitz') {
      queue = weightedOrder(regionPool, this.progress);
    } else {
      queue = weightedOrder(regionPool, this.progress);
      if (p.count !== 'all') queue = queue.slice(0, p.count);
    }

    this.session = new GameSession({ mode, queue, lookalikes, pool, rng, dateKey: key }, this.clock);
    this.summary = null;
    this.finished = false;
    this.newlyMastered = 0;
    if (mode === 'blitz') this.ticker = setInterval(() => this.tick(), 100);
    this.events.emit('question', this.session);
    return true;
  }

  chooseOption(code: string): void {
    this.afterAnswer(this.session?.answerChoice(code) ?? null);
  }

  submitText(text: string): void {
    this.afterAnswer(this.session?.answerText(text) ?? null);
  }

  skip(): void {
    this.afterAnswer(this.session?.skip() ?? null);
  }

  /** Next question, or the results screen after the last one. */
  next(): void {
    const s = this.session;
    if (!s || this.finished) return;
    if (s.advance()) this.events.emit('question', s);
    else this.finish();
  }

  /** Abandon the round. Answers already given stay recorded. */
  quit(): void {
    this.stopTicker();
    this.session = null;
    this.summary = null;
    this.finished = false;
  }

  /* ---- internals ---- */

  private afterAnswer(record: AnswerRecord | null): void {
    const s = this.session;
    if (!record || !s) return;
    const outcome = applyAnswer(this.progress, record.code, record.correct);
    this.progress = outcome.progress;
    if (outcome.newlyMastered) this.newlyMastered++;
    const best = s.stats.bestRun;
    if (best > this.progress.bestRun) this.progress = { ...this.progress, bestRun: best };
    this.persist();
    const autoAdvance = s.mode === 'blitz' && !s.isLast;
    this.events.emit('answered', { record, last: s.isLast, autoAdvance });
    if (autoAdvance) {
      setTimeout(() => {
        if (this.session === s && !this.finished) this.next();
      }, record.correct ? 500 : 1000);
    }
  }

  private tick(): void {
    const s = this.session;
    if (!s || this.finished) return this.stopTicker();
    const left = s.msLeft();
    if (left === null) return this.stopTicker();
    if (left <= 0) return this.finish();
    this.events.emit('tick', left);
  }

  private finish(): void {
    const s = this.session;
    if (!s || this.finished) return;
    this.stopTicker();
    this.finished = true;
    const result = s.result();
    let newRecord = false;
    let firstDaily = false;
    if (result.mode === 'blitz' && result.score > this.progress.bestBlitz) {
      this.progress = { ...this.progress, bestBlitz: result.score };
      newRecord = true;
    }
    if (result.mode === 'daily' && result.dateKey && !this.progress.daily[result.dateKey]) {
      this.progress = {
        ...this.progress,
        daily: { ...this.progress.daily, [result.dateKey]: { score: result.score, results: result.answers.map((a) => a.correct) } },
      };
      firstDaily = true;
    }
    this.persist();
    this.summary = { ...result, newlyMastered: this.newlyMastered, newRecord, firstDaily };
    this.events.emit('finished', this.summary);
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  private persist(): void {
    this.storage.save({ version: 2, prefs: this.prefs, progress: this.progress });
  }
}
