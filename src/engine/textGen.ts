import { WORDS } from '../data/words.en';
import { QUOTES, type Quote } from '../data/quotes';

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
