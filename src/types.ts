export type Language = 'en' | 'pl';

export type ModeId = 'time' | 'sprint' | 'falling' | 'zen' | 'quotes';

export interface Settings {
  version: 1;
  language: Language;
  sound: boolean;
  volume: number; // 0..1
  timeAttackSeconds: 15 | 30 | 60;
  sprintWords: 10 | 25 | 50;
}

export interface PersonalBest {
  wpm: number;
  accuracy: number;
  score?: number; // falling mode only
  date: string; // ISO
}

export interface StreakState {
  current: number;
  best: number;
  lastDay: string | null; // local 'YYYY-MM-DD'
}

export interface Totals {
  rounds: number;
  timeMs: number;
  keystrokes: number;
  errors: number;
  words: number;
}

export interface Profile {
  version: 1;
  xp: number;
  streak: StreakState;
  achievements: Record<string, string>; // achievement id -> unlockedAt ISO
  bests: Record<string, PersonalBest>; // PB slot ('time-30', 'sprint-25', 'falling', 'quotes')
  modesPlayed: ModeId[];
  totals: Totals;
}

export interface KeyStat {
  hits: number;
  misses: number;
}

export interface DayStats {
  rounds: number;
  timeMs: number;
  keystrokes: number;
  errors: number;
  words: number;
  bestWpm: number;
}

export interface RoundSample {
  mode: ModeId;
  wpm: number;
  accuracy: number;
  at: string; // ISO
}

export interface StatsLog {
  version: 1;
  days: Record<string, DayStats>; // local 'YYYY-MM-DD'
  rounds: RoundSample[]; // newest first, capped
  keys: Record<string, KeyStat>; // intended char (lowercased) -> lifetime stat
}

/** Runtime output of a finished round — folded into the stores by recordRound. */
export interface RoundResult {
  mode: ModeId;
  wpm: number;
  accuracy: number; // 0..100
  correct: number; // correctly typed chars
  errors: number;
  words: number;
  durationMs: number;
  maxCombo: number;
  score?: number; // falling
  wave?: number; // falling
  bestSlot?: string; // PB slot this round competes in ('time-30', 'falling', …)
  keys: Record<string, KeyStat>;
}

/** What recordRound reports back for the summary screen. */
export interface RoundOutcome {
  recorded: boolean; // false for discarded rounds (e.g. too-short zen)
  xpGained: number;
  levelBefore: number; // player level
  levelAfter: number;
  newBests: string[]; // PB slots beaten this round
  newAchievements: string[]; // achievement ids unlocked this round
}

/** Local calendar day as 'YYYY-MM-DD' (not UTC — streaks follow the user's clock). */
export function localDay(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
