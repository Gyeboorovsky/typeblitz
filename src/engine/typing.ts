import type { KeyStat } from '../types';

/** Pure typing-round engine shared by every prompt mode. No React, no DOM. */

export type CellState = 'pending' | 'correct' | 'wrong';

export interface CharCell {
  char: string;
  state: CellState;
}

export interface RoundState {
  cells: CharCell[];
  pos: number; // index of the next char to type
  correct: number; // correct keystrokes (a corrected wrong char still counts its error)
  errors: number;
  combo: number; // consecutive correct chars
  maxCombo: number;
  startedAt: number | null; // performance.now() of the first keystroke
  keys: Record<string, KeyStat>; // intended char (lowercased) -> hits/misses
}

export function createRound(text: string): RoundState {
  return {
    cells: Array.from(text, (char) => ({ char, state: 'pending' as CellState })),
    pos: 0,
    correct: 0,
    errors: 0,
    combo: 0,
    maxCombo: 0,
    startedAt: null,
    keys: {},
  };
}

/** Appends more prompt text (endless modes extend near the end). */
export function extendRound(s: RoundState, text: string): RoundState {
  return { ...s, cells: [...s.cells, ...Array.from(text, (char) => ({ char, state: 'pending' as CellState }))] };
}

function bumpKey(keys: Record<string, KeyStat>, char: string, hit: boolean): Record<string, KeyStat> {
  const k = char.toLowerCase();
  const prev = keys[k] ?? { hits: 0, misses: 0 };
  return { ...keys, [k]: { hits: prev.hits + (hit ? 1 : 0), misses: prev.misses + (hit ? 0 : 1) } };
}

export function pressChar(s: RoundState, ch: string, now: number): RoundState {
  if (s.pos >= s.cells.length) return s;
  const expected = s.cells[s.pos].char;
  const hit = ch === expected;
  const cells = s.cells.slice();
  cells[s.pos] = { char: expected, state: hit ? 'correct' : 'wrong' };
  const combo = hit ? s.combo + 1 : 0;
  return {
    cells,
    pos: s.pos + 1,
    correct: s.correct + (hit ? 1 : 0),
    errors: s.errors + (hit ? 0 : 1),
    combo,
    maxCombo: Math.max(s.maxCombo, combo),
    startedAt: s.startedAt ?? now,
    keys: bumpKey(s.keys, expected, hit),
  };
}

/** Steps back one char (its cell returns to pending; recorded errors stay counted). */
export function pressBackspace(s: RoundState): RoundState {
  if (s.pos === 0) return s;
  const pos = s.pos - 1;
  const cells = s.cells.slice();
  const wasCorrect = cells[pos].state === 'correct';
  cells[pos] = { char: cells[pos].char, state: 'pending' };
  return { ...s, cells, pos, correct: wasCorrect ? s.correct - 1 : s.correct, combo: 0 };
}

export function isDone(s: RoundState): boolean {
  return s.pos >= s.cells.length && s.cells.length > 0;
}

/** Standard gross WPM: correct chars / 5 per minute. */
export function grossWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (correctChars / 5) / (elapsedMs / 60000);
}

export function accuracy(correct: number, errors: number): number {
  const total = correct + errors;
  return total === 0 ? 100 : (correct / total) * 100;
}

/** Words completed = correctly typed chars / 5 (standard word unit), floored. */
export function wordsTyped(correctChars: number): number {
  return Math.floor(correctChars / 5);
}
