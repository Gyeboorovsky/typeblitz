import type { Profile, RoundResult, StreakState } from '../types';
import { LEVELS } from './levels';

/* ---------- XP and player level ---------- */

/**
 * XP for a recorded round. Accuracy is squared so sloppy speed pays poorly;
 * level stars and bosses pay a visible bonus. Zen pays half (no pressure, less XP).
 */
export function xpForRound(result: RoundResult, newStars: number, boss: boolean): number {
  if (result.mode === 'falling') return Math.round((result.score ?? 0) / 50);
  const acc = result.accuracy / 100;
  let xp = Math.round(result.words * 2 * acc * acc);
  if (result.maxCombo >= 25) xp += 10;
  xp += 15 * newStars;
  if (boss && newStars > 0) xp += 25;
  if (result.mode === 'zen') xp = Math.round(xp / 2);
  return Math.max(0, xp);
}

/** Total XP required to *reach* level n (level 1 = 0). Quadratic ramp. */
function xpThreshold(n: number): number {
  return 75 * (n - 1) * n;
}

export interface PlayerLevel {
  level: number;
  into: number; // XP earned inside the current level
  needed: number; // XP span of the current level
}

export function playerLevel(xp: number): PlayerLevel {
  let level = 1;
  while (xpThreshold(level + 1) <= xp) level++;
  const base = xpThreshold(level);
  return { level, into: xp - base, needed: xpThreshold(level + 1) - base };
}

/* ---------- daily streak ---------- */

function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Called on every recorded round; only the first round of a day moves the streak. */
export function updateStreak(streak: StreakState, today: string): StreakState {
  if (streak.lastDay === today) return streak;
  const current = streak.lastDay === shiftDay(today, -1) ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}

/* ---------- achievements ---------- */

export interface Achievement {
  id: string;
  icon: string; // emoji — titles/descriptions live in i18n
  /** Checked after the round has been folded into the profile. */
  check: (profile: Profile, result: RoundResult) => boolean;
}

const longEnough = (r: RoundResult) => r.durationMs >= 30000 || r.words >= 25;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-round', icon: '🐣', check: (p) => p.totals.rounds >= 1 },
  { id: 'wpm-40', icon: '🚴', check: (_p, r) => longEnough(r) && r.wpm >= 40 },
  { id: 'wpm-60', icon: '🏎️', check: (_p, r) => longEnough(r) && r.wpm >= 60 },
  { id: 'wpm-80', icon: '🚀', check: (_p, r) => longEnough(r) && r.wpm >= 80 },
  { id: 'perfect', icon: '💎', check: (_p, r) => r.errors === 0 && r.words >= 25 },
  { id: 'combo-50', icon: '🔥', check: (_p, r) => r.maxCombo >= 50 },
  { id: 'combo-100', icon: '⚡', check: (_p, r) => r.maxCombo >= 100 },
  { id: 'streak-3', icon: '🕯️', check: (p) => p.streak.current >= 3 },
  { id: 'streak-7', icon: '🗓️', check: (p) => p.streak.current >= 7 },
  { id: 'streak-30', icon: '🏆', check: (p) => p.streak.current >= 30 },
  { id: 'words-1k', icon: '📚', check: (p) => p.totals.words >= 1000 },
  { id: 'words-10k', icon: '🏛️', check: (p) => p.totals.words >= 10000 },
  { id: 'hour-club', icon: '⏰', check: (p) => p.totals.timeMs >= 3_600_000 },
  { id: 'marathon-10h', icon: '🏃', check: (p) => p.totals.timeMs >= 36_000_000 },
  { id: 'graduate', icon: '🎓', check: (p) => LEVELS.every((l) => (p.levels[l.id]?.stars ?? 0) >= 1) },
  { id: 'star-collector', icon: '🌟', check: (p) => LEVELS.filter((l) => p.levels[l.id]?.stars === 3).length >= 10 },
  { id: 'wave-10', icon: '🌊', check: (_p, r) => r.mode === 'falling' && (r.wave ?? 0) >= 10 },
  { id: 'explorer', icon: '🧭', check: (p) => p.modesPlayed.length >= 6 },
];

/** Ids newly unlocked by this round (profile already updated, minus achievements). */
export function evaluateAchievements(profile: Profile, result: RoundResult): string[] {
  return ACHIEVEMENTS.filter((a) => !(a.id in profile.achievements) && a.check(profile, result)).map((a) => a.id);
}
