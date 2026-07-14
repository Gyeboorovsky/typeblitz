import { WORDS, TOP_100 } from '../data/words.en';
import { QUOTES, type Quote } from '../data/quotes';
import type { Level } from '../game/levels';

/** Deterministic PRNG — boss lesson texts are stable, free practice is varied. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** `count` random words from the pool, joined by single spaces. */
export function wordStream(count: number, rng: () => number = Math.random, pool: string[] = WORDS): string {
  const out: string[] = [];
  let last = '';
  for (let i = 0; i < count; i++) {
    let w = pick(pool, rng);
    if (w === last) w = pick(pool, rng); // avoid immediate repeats (best effort)
    out.push(w);
    last = w;
  }
  return out.join(' ');
}

export function randomQuote(rng: () => number = Math.random): Quote {
  return pick(QUOTES, rng);
}

/* ---------- lesson text synthesis ---------- */

/** True when every letter of the word is in the allowed charset. */
function usesOnly(word: string, charset: Set<string>): boolean {
  for (const ch of word) if (!charset.has(ch)) return false;
  return true;
}

/** Nonsense drill "word" (2–5 chars) built from the newest + known keys. */
function drillWord(newChars: string, allChars: string, rng: () => number): string {
  const len = 2 + Math.floor(rng() * 4);
  let out = '';
  for (let i = 0; i < len; i++) {
    // Bias toward the newly introduced keys so the lesson actually drills them.
    const pool = rng() < 0.6 && newChars.length > 0 ? newChars : allChars;
    out += pool[Math.floor(rng() * pool.length)];
  }
  return out;
}

const SENTENCES: string[] = [
  'The quick brown fox jumps over the lazy dog.',
  'Pack my box with five dozen liquor jugs.',
  'How vexingly quick daft zebras jump!',
  'Sphinx of black quartz, judge my vow.',
  'The five boxing wizards jump quickly.',
  'Bright vixens jump; dozy fowl quack.',
  'Jackdaws love my big sphinx of quartz.',
  'We promptly judged antique ivory buckles for the next prize.',
];

function numberGroup(digits: string, rng: () => number): string {
  const len = 2 + Math.floor(rng() * 3);
  let out = '';
  for (let i = 0; i < len; i++) out += digits[Math.floor(rng() * digits.length)];
  return out;
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Builds the practice text for a level, ~level.length chars long. */
export function lessonText(level: Level, rng?: () => number): string {
  const r = rng ?? (level.boss ? mulberry32(level.n * 1013) : Math.random);
  const charset = new Set(level.charset);
  const realWords = WORDS.filter((w) => usesOnly(w, charset));
  const parts: string[] = [];
  let len = 0;

  const push = (w: string) => {
    parts.push(w);
    len += w.length + 1;
  };

  while (len < level.length) {
    switch (level.kind) {
      case 'drill':
        // Mix real words in once enough exist for this charset.
        if (realWords.length >= 15 && r() < 0.6) push(pick(realWords, r));
        else push(drillWord(level.newChars, level.charset, r));
        break;
      case 'words':
        push(pick(realWords.length >= 30 ? realWords : WORDS, r));
        break;
      case 'top100':
        push(pick(TOP_100, r));
        break;
      case 'capitals':
        push(capitalize(pick(WORDS, r)));
        break;
      case 'numbers':
        push(r() < 0.5 ? numberGroup(level.newChars, r) : pick(realWords.length >= 15 ? realWords : WORDS, r));
        break;
      case 'punct': {
        const w = pick(WORDS, r);
        const marks = level.newChars;
        const m = marks[Math.floor(r() * marks.length)];
        if (m === '(') push(`(${w})`);
        else if (m === '"') push(`"${w}"`);
        else if (m === "'") push(`${w}'s`);
        else if (m === '-') push(`${w}-${pick(WORDS, r)}`);
        else push(`${w}${m}`);
        break;
      }
      case 'sentences':
        push(pick(SENTENCES, r));
        break;
      case 'mixed': {
        const roll = r();
        if (roll < 0.5) push(pick(WORDS, r));
        else if (roll < 0.65) push(capitalize(pick(WORDS, r)));
        else if (roll < 0.8) push(numberGroup('0123456789', r));
        else push(pick(SENTENCES, r));
        break;
      }
    }
  }
  return parts.join(' ');
}
