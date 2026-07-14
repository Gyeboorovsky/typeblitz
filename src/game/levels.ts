import type { LevelProgress, Profile, RoundResult } from '../types';

/** Career-mode curriculum: 31 levels from home row to a full-text final boss. */

export type LevelKind =
  | 'drill' // nonsense drills + real words from the unlocked charset
  | 'words' // real words only (filtered by charset)
  | 'top100' // most common English words, for speed
  | 'capitals'
  | 'numbers'
  | 'punct'
  | 'sentences'
  | 'quote'
  | 'mixed';

export interface Level {
  id: string; // 'l01'..'l31'
  n: number; // 1-based position
  boss?: boolean;
  title: { en: string; pl: string };
  kind: LevelKind;
  newChars: string; // keys introduced by this level (drilled hardest)
  charset: string; // cumulative letters unlocked so far
  targetWpm: number; // 2-star speed bar
  length: number; // approx generated text length in chars
}

const HOME = 'asdfghjkl;';
const TOP = 'qwertyuiop';
const BOTTOM = 'zxcvbnm,.';
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function lvl(n: number, partial: Omit<Level, 'id' | 'n'>): Level {
  return { id: `l${String(n).padStart(2, '0')}`, n, ...partial };
}

export const LEVELS: Level[] = [
  lvl(1, { title: { en: 'F & J — the anchors', pl: 'F i J — kotwice' }, kind: 'drill', newChars: 'fj', charset: 'fj', targetWpm: 12, length: 90 }),
  lvl(2, { title: { en: 'D & K', pl: 'D i K' }, kind: 'drill', newChars: 'dk', charset: 'fjdk', targetWpm: 13, length: 100 }),
  lvl(3, { title: { en: 'S & L', pl: 'S i L' }, kind: 'drill', newChars: 'sl', charset: 'fjdksl', targetWpm: 14, length: 110 }),
  lvl(4, { title: { en: 'A & the semicolon', pl: 'A i średnik' }, kind: 'drill', newChars: 'a;', charset: 'fjdksla;', targetWpm: 15, length: 110 }),
  lvl(5, { title: { en: 'G & H — reach in', pl: 'G i H — sięgnij' }, kind: 'drill', newChars: 'gh', charset: HOME, targetWpm: 16, length: 120 }),
  lvl(6, { boss: true, title: { en: 'BOSS: Home row mastery', pl: 'BOSS: Rząd podstawowy' }, kind: 'drill', newChars: '', charset: HOME, targetWpm: 18, length: 160 }),
  lvl(7, { title: { en: 'R & U', pl: 'R i U' }, kind: 'drill', newChars: 'ru', charset: HOME + 'ru', targetWpm: 18, length: 120 }),
  lvl(8, { title: { en: 'E & I', pl: 'E i I' }, kind: 'drill', newChars: 'ei', charset: HOME + 'ruei', targetWpm: 19, length: 130 }),
  lvl(9, { title: { en: 'T & Y', pl: 'T i Y' }, kind: 'drill', newChars: 'ty', charset: HOME + 'rueity', targetWpm: 20, length: 130 }),
  lvl(10, { title: { en: 'W & O', pl: 'W i O' }, kind: 'drill', newChars: 'wo', charset: HOME + 'rueitywo', targetWpm: 21, length: 140 }),
  lvl(11, { title: { en: 'Q & P — the corners', pl: 'Q i P — narożniki' }, kind: 'drill', newChars: 'qp', charset: HOME + TOP, targetWpm: 22, length: 140 }),
  lvl(12, { boss: true, title: { en: 'BOSS: Two rows, real words', pl: 'BOSS: Dwa rzędy, prawdziwe słowa' }, kind: 'words', newChars: '', charset: HOME + TOP, targetWpm: 24, length: 180 }),
  lvl(13, { title: { en: 'N & M', pl: 'N i M' }, kind: 'drill', newChars: 'nm', charset: HOME + TOP + 'nm', targetWpm: 22, length: 140 }),
  lvl(14, { title: { en: 'V & C', pl: 'V i C' }, kind: 'drill', newChars: 'vc', charset: HOME + TOP + 'nmvc', targetWpm: 23, length: 140 }),
  lvl(15, { title: { en: 'B & X', pl: 'B i X' }, kind: 'drill', newChars: 'bx', charset: HOME + TOP + 'nmvcbx', targetWpm: 24, length: 150 }),
  lvl(16, { title: { en: 'Z, comma & period', pl: 'Z, przecinek i kropka' }, kind: 'drill', newChars: 'z,.', charset: HOME + TOP + BOTTOM, targetWpm: 26, length: 150 }),
  lvl(17, { boss: true, title: { en: 'BOSS: The full alphabet', pl: 'BOSS: Cały alfabet' }, kind: 'words', newChars: '', charset: ALPHA, targetWpm: 28, length: 200 }),
  lvl(18, { title: { en: 'Capital letters', pl: 'Wielkie litery' }, kind: 'capitals', newChars: '', charset: ALPHA, targetWpm: 26, length: 160 }),
  lvl(19, { title: { en: 'Pangram sentences', pl: 'Zdania-pangramy' }, kind: 'sentences', newChars: '', charset: ALPHA, targetWpm: 28, length: 180 }),
  lvl(20, { title: { en: 'Apostrophes & hyphens', pl: 'Apostrofy i myślniki' }, kind: 'punct', newChars: "'-", charset: ALPHA, targetWpm: 26, length: 160 }),
  lvl(21, { title: { en: 'Numbers 1–5', pl: 'Cyfry 1–5' }, kind: 'numbers', newChars: '12345', charset: ALPHA, targetWpm: 22, length: 140 }),
  lvl(22, { title: { en: 'Numbers 6–0', pl: 'Cyfry 6–0' }, kind: 'numbers', newChars: '67890', charset: ALPHA, targetWpm: 24, length: 140 }),
  lvl(23, { boss: true, title: { en: 'BOSS: Letters meet numbers', pl: 'BOSS: Litery i cyfry' }, kind: 'numbers', newChars: '0123456789', charset: ALPHA, targetWpm: 28, length: 190 }),
  lvl(24, { title: { en: 'Quotes & questions', pl: 'Cudzysłowy i pytania' }, kind: 'punct', newChars: '"?\'', charset: ALPHA, targetWpm: 26, length: 160 }),
  lvl(25, { title: { en: 'Brackets & colons', pl: 'Nawiasy i dwukropki' }, kind: 'punct', newChars: '!:;()', charset: ALPHA, targetWpm: 28, length: 160 }),
  lvl(26, { boss: true, title: { en: 'BOSS: Punctuated prose', pl: 'BOSS: Proza z interpunkcją' }, kind: 'sentences', newChars: '', charset: ALPHA, targetWpm: 30, length: 220 }),
  lvl(27, { title: { en: 'The common hundred', pl: 'Sto najczęstszych' }, kind: 'top100', newChars: '', charset: ALPHA, targetWpm: 32, length: 200 }),
  lvl(28, { title: { en: 'Common words: speed run', pl: 'Częste słowa: na czas' }, kind: 'top100', newChars: '', charset: ALPHA, targetWpm: 36, length: 220 }),
  lvl(29, { title: { en: 'Full sentences', pl: 'Pełne zdania' }, kind: 'sentences', newChars: '', charset: ALPHA, targetWpm: 38, length: 240 }),
  lvl(30, { title: { en: 'A classic quote', pl: 'Klasyczny cytat' }, kind: 'quote', newChars: '', charset: ALPHA, targetWpm: 40, length: 200 }),
  lvl(31, { boss: true, title: { en: 'FINAL BOSS: Everything at once', pl: 'FINAŁOWY BOSS: Wszystko naraz' }, kind: 'mixed', newChars: '', charset: ALPHA, targetWpm: 45, length: 380 }),
];

export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** Level N is playable once level N-1 has at least one star (L1 always open). */
export function isUnlocked(level: Level, progress: Record<string, LevelProgress>): boolean {
  if (level.n === 1) return true;
  const prev = LEVELS[level.n - 2];
  return (progress[prev.id]?.stars ?? 0) >= 1;
}

/**
 * Star rating: <85% accuracy fails the level outright; speed bars sit on top.
 * 1★ finish at ≥85% · 2★ ≥92% and target WPM · 3★ ≥97% and target×1.25.
 */
export function starsFor(result: RoundResult, level: Level): 0 | 1 | 2 | 3 {
  if (result.accuracy < 85) return 0;
  if (result.accuracy >= 97 && result.wpm >= level.targetWpm * 1.25) return 3;
  if (result.accuracy >= 92 && result.wpm >= level.targetWpm) return 2;
  return 1;
}

export function totalStars(profile: Profile): number {
  return LEVELS.reduce((sum, l) => sum + (profile.levels[l.id]?.stars ?? 0), 0);
}
