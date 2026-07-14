import { useCallback, useEffect, useRef, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import type { KeyStat, RoundResult } from '../types';
import { WORDS } from '../data/words.en';
import { play } from '../game/sound';

interface Props {
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

interface FallingWord {
  id: number;
  text: string;
  typed: number; // chars already matched
  x: number; // 0..100 (% of play area width)
  y: number; // 0..100 (% of play area height)
  speed: number; // %/second
}

interface Sim {
  words: FallingWord[];
  nextId: number;
  lives: number;
  score: number;
  wave: number;
  spawnedInWave: number;
  spawnCooldown: number; // seconds until next spawn
  wordsDestroyed: number;
  comboWords: number; // words destroyed without a miss or a lost word
  keystrokeCombo: number;
  maxCombo: number;
  correct: number;
  errors: number;
  keys: Record<string, KeyStat>;
  targetId: number | null;
  startedAt: number;
  over: boolean;
}

const WAVE_SIZE = 10;
const BASE_SPEED = 4.2; // % of field height per second at wave 1
const BASE_SPAWN_GAP = 2.4; // seconds between spawns at wave 1

const POOL = WORDS.filter((w) => w.length >= 3 && w.length <= 8);

function newSim(): Sim {
  return {
    words: [],
    nextId: 1,
    lives: 3,
    score: 0,
    wave: 1,
    spawnedInWave: 0,
    spawnCooldown: 0.6,
    wordsDestroyed: 0,
    comboWords: 0,
    keystrokeCombo: 0,
    maxCombo: 0,
    correct: 0,
    errors: 0,
    keys: {},
    targetId: null,
    startedAt: performance.now(),
    over: false,
  };
}

function multiplier(sim: Sim): number {
  return Math.min(3, 1 + sim.comboWords / 10);
}

function bumpKey(keys: Record<string, KeyStat>, char: string, hit: boolean): void {
  const k = char.toLowerCase();
  const s = (keys[k] ??= { hits: 0, misses: 0 });
  if (hit) s.hits++;
  else s.misses++;
}

export default function FallingView({ onFinish, onQuit }: Props) {
  const t = useI18n();
  const [running, setRunning] = useState(false);
  const [, setFrame] = useState(0);
  const sim = useRef<Sim>(newSim());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevValue = useRef('');
  const finished = useRef(false);
  const narrow = typeof window !== 'undefined' && window.innerWidth < 480;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const s = sim.current;
    const elapsed = performance.now() - s.startedAt;
    const total = s.correct + s.errors;
    onFinish({
      mode: 'falling',
      wpm: elapsed > 0 ? (s.correct / 5) / (elapsed / 60000) : 0,
      accuracy: total === 0 ? 100 : (s.correct / total) * 100,
      correct: s.correct,
      errors: s.errors,
      words: s.wordsDestroyed,
      durationMs: elapsed,
      maxCombo: s.maxCombo,
      score: s.score,
      wave: s.wave,
      bestSlot: 'falling',
      keys: s.keys,
    });
  }, [onFinish]);

  // Simulation loop — all mutable state lives in the ref (StrictMode-safe),
  // React just re-renders the current snapshot once per animation frame.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;

      s.spawnCooldown -= dt;
      const maxLive = narrow ? 5 : 8;
      if (s.spawnCooldown <= 0 && s.words.length < maxLive) {
        const speedScale = Math.pow(1.08, s.wave - 1);
        const pool = narrow ? POOL.filter((w) => w.length <= 6) : POOL;
        const text = pool[Math.floor(Math.random() * pool.length)];
        s.words.push({
          id: s.nextId++,
          text,
          typed: 0,
          x: 6 + Math.random() * 78,
          y: -6,
          speed: BASE_SPEED * speedScale * (0.85 + Math.random() * 0.3),
        });
        s.spawnedInWave++;
        if (s.spawnedInWave >= WAVE_SIZE) {
          s.wave++;
          s.spawnedInWave = 0;
        }
        s.spawnCooldown = (BASE_SPAWN_GAP / Math.pow(1.08, s.wave - 1)) * (0.8 + Math.random() * 0.4);
      }

      for (const w of s.words) w.y += w.speed * dt;
      const landed = s.words.filter((w) => w.y >= 100);
      if (landed.length > 0) {
        s.words = s.words.filter((w) => w.y < 100);
        if (s.targetId !== null && landed.some((w) => w.id === s.targetId)) s.targetId = null;
        s.lives -= landed.length;
        s.comboWords = 0;
        s.keystrokeCombo = 0;
        play('boom');
        if (s.lives <= 0) {
          s.lives = 0;
          s.over = true;
          setRunning(false);
          finish();
          return;
        }
      }

      setFrame((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, narrow, finish]);

  const handleChar = useCallback((ch: string) => {
    const s = sim.current;
    if (s.over) return;
    const c = ch.toLowerCase();
    let target = s.targetId !== null ? s.words.find((w) => w.id === s.targetId) : undefined;

    if (!target) {
      // Lock onto the lowest word whose first letter matches.
      const candidates = s.words.filter((w) => w.text[0] === c).sort((a, b) => b.y - a.y);
      target = candidates[0];
      if (!target) {
        s.errors++;
        s.keystrokeCombo = 0;
        s.comboWords = 0;
        bumpKey(s.keys, c, false);
        play('error');
        return;
      }
      s.targetId = target.id;
    }

    const locked = target;
    const expected = locked.text[locked.typed];
    if (c === expected) {
      locked.typed++;
      s.correct++;
      s.keystrokeCombo++;
      s.maxCombo = Math.max(s.maxCombo, s.keystrokeCombo);
      bumpKey(s.keys, expected, true);
      if (locked.typed >= locked.text.length) {
        s.words = s.words.filter((w) => w.id !== locked.id);
        s.targetId = null;
        s.wordsDestroyed++;
        s.comboWords++;
        s.score += Math.round(locked.text.length * 10 * multiplier(s));
        play('combo', s.comboWords * 2);
      } else {
        play('click', s.keystrokeCombo);
      }
    } else {
      s.errors++;
      s.keystrokeCombo = 0;
      s.comboWords = 0;
      bumpKey(s.keys, expected, false);
      play('error');
    }
  }, []);

  const onInput = useCallback<React.FormEventHandler<HTMLInputElement>>(
    (e) => {
      const value = e.currentTarget.value;
      const prev = prevValue.current;
      let common = 0;
      const max = Math.min(prev.length, value.length);
      while (common < max && prev[common] === value[common]) common++;
      for (let i = common; i < value.length; i++) handleChar(value[i]);
      // Keep the buffer tiny — the diff only needs the tail.
      if (value.length > 40) {
        e.currentTarget.value = '';
        prevValue.current = '';
      } else {
        prevValue.current = value;
      }
    },
    [handleChar],
  );

  const onKeyDown = useCallback<React.KeyboardEventHandler<HTMLInputElement>>(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onQuit();
      }
      if (e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab') e.preventDefault();
    },
    [onQuit],
  );

  const start = () => {
    sim.current = newSim();
    prevValue.current = '';
    if (inputRef.current) inputRef.current.value = '';
    finished.current = false;
    setRunning(true);
    inputRef.current?.focus();
  };

  const s = sim.current;
  const mult = multiplier(s);

  return (
    <div className="tb-falling" onMouseDown={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
      <div className="tb-round-top">
        <button className="tb-quit" onClick={onQuit} onMouseDown={(e) => e.stopPropagation()}>
          ← {t.round.escToQuit}
        </button>
        <div className="tb-falling-hud">
          <span className="tb-hud-item">{fmt(t.round.wave, { n: s.wave })}</span>
          <span className="tb-hud-item score">{s.score}</span>
          {mult > 1 && <span className="tb-hud-item mult">{fmt(t.falling.multiplier, { m: mult.toFixed(1) })}</span>}
          <span className="tb-hud-item lives">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < s.lives ? 'life on' : 'life'}>
                ♥
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="tb-field">
        {!running && (
          <div className="tb-field-overlay">
            <p>{t.falling.ready}</p>
            <button className="tb-primary" onClick={start} onMouseDown={(e) => e.stopPropagation()}>
              {t.falling.start}
            </button>
          </div>
        )}
        {s.words.map((w) => (
          <span
            key={w.id}
            className={`tb-fword ${w.id === s.targetId ? 'target' : ''}`}
            style={{ left: `${w.x}%`, top: `${w.y}%` }}
          >
            <b>{w.text.slice(0, w.typed)}</b>
            {w.text.slice(w.typed)}
          </span>
        ))}
        <div className="tb-ground" />
        <input
          ref={inputRef}
          className="tb-hidden-input"
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={(e) => e.preventDefault()}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label={t.falling.ready}
        />
      </div>
    </div>
  );
}
