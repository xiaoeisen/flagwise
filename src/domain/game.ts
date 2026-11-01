import { isCorrect } from './matching';
import type { Rng } from './rng';
import { buildOptions } from './selection';
import type { Clock, ModeId } from './types';

export const BLITZ_MS = 60_000;
export const BLITZ_PENALTY_MS = 3_000;
export const STREAK_LIVES = 3;

export interface GameConfig {
  mode: ModeId;
  /** Flag codes in the order they will be asked. */
  queue: readonly string[];
  lookalikes: boolean;
  /** Source of random distractors for multiple choice. */
  pool: readonly string[];
  rng: Rng;
  /** Set for the daily challenge. */
  dateKey?: string;
}

export interface Question {
  index: number;
  code: string;
  /** Four flag codes for multiple choice, or null when the player types the answer. */
  options: readonly string[] | null;
}

export interface AnswerRecord {
  code: string;
  correct: boolean;
  /** Country name picked or text typed. Empty when skipped. */
  given: string;
  skipped: boolean;
}

export interface GameStats {
  index: number;
  total: number;
  score: number;
  run: number;
  bestRun: number;
  lives: number;
}

export interface GameResult {
  mode: ModeId;
  dateKey?: string;
  score: number;
  total: number;
  accuracy: number;
  bestRun: number;
  elapsedMs: number;
  livesLeft: number;
  answers: readonly AnswerRecord[];
}

/**
 * Rules for one round. Pure state machine: no DOM, no storage, no timers.
 * Time comes from the injected clock, so rounds can be driven by tests.
 */
export class GameSession {
  readonly mode: ModeId;
  readonly dateKey?: string;
  readonly answers: AnswerRecord[] = [];

  private index = 0;
  private score = 0;
  private run = 0;
  private bestRun = 0;
  private lives = STREAK_LIVES;
  private current: Question;
  private done = false;
  private readonly startedAt: number;
  private endsAt: number | null;

  constructor(
    private readonly cfg: GameConfig,
    private readonly clock: Clock,
  ) {
    this.mode = cfg.mode;
    this.dateKey = cfg.dateKey;
    this.startedAt = clock.now();
    this.endsAt = cfg.mode === 'blitz' ? this.startedAt + BLITZ_MS : null;
    this.current = this.makeQuestion(0);
  }

  get question(): Question {
    return this.current;
  }

  /** True once the current question has been answered. */
  get answered(): boolean {
    return this.done;
  }

  get stats(): GameStats {
    return {
      index: this.index,
      total: this.cfg.queue.length,
      score: this.score,
      run: this.run,
      bestRun: this.bestRun,
      lives: this.lives,
    };
  }

  /** Code of the following flag, used to preload its image. */
  get nextCode(): string | null {
    return this.cfg.queue[this.index + 1] ?? null;
  }

  /** Milliseconds left in a blitz round, or null in other modes. */
  msLeft(): number | null {
    return this.endsAt === null ? null : Math.max(0, this.endsAt - this.clock.now());
  }

  get timeUp(): boolean {
    return this.endsAt !== null && this.clock.now() >= this.endsAt;
  }

  /** True when no question follows the current one. */
  get isLast(): boolean {
    return (
      this.index + 1 >= this.cfg.queue.length || (this.mode === 'streak' && this.lives <= 0) || this.timeUp
    );
  }

  answerChoice(code: string): AnswerRecord | null {
    return this.commit(code === this.current.code, code, false);
  }

  answerText(text: string): AnswerRecord | null {
    const given = text.trim();
    if (!given) return null;
    return this.commit(isCorrect(this.current.code, given), given, false);
  }

  skip(): AnswerRecord | null {
    return this.commit(false, '', true);
  }

  /** Moves to the next question. Returns false when the round is over. */
  advance(): boolean {
    if (!this.done) return false;
    if (this.isLast) return false;
    this.index++;
    this.done = false;
    this.current = this.makeQuestion(this.index);
    return true;
  }

  result(): GameResult {
    const total = this.answers.length;
    const rawElapsed = this.clock.now() - this.startedAt;
    return {
      mode: this.mode,
      dateKey: this.dateKey,
      score: this.score,
      total,
      accuracy: total ? Math.round((this.score / total) * 100) : 0,
      bestRun: this.bestRun,
      elapsedMs: this.mode === 'blitz' ? Math.min(rawElapsed, BLITZ_MS) : rawElapsed,
      livesLeft: this.lives,
      answers: this.answers.slice(),
    };
  }

  private commit(correct: boolean, given: string, skipped: boolean): AnswerRecord | null {
    if (this.done) return null;
    this.done = true;
    const record: AnswerRecord = { code: this.current.code, correct, given, skipped };
    this.answers.push(record);
    if (correct) {
      this.score++;
      this.run++;
      this.bestRun = Math.max(this.bestRun, this.run);
    } else {
      this.run = 0;
      if (this.mode === 'streak') this.lives--;
      if (this.endsAt !== null) this.endsAt -= BLITZ_PENALTY_MS;
    }
    return record;
  }

  private makeQuestion(index: number): Question {
    const code = this.cfg.queue[index]!;
    const options =
      this.mode === 'type'
        ? null
        : buildOptions(code, { lookalikes: this.cfg.lookalikes, pool: this.cfg.pool }, this.cfg.rng);
    return { index, code, options };
  }
}
