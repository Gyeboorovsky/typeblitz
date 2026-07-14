import { useEffect, useRef, useState } from 'react';
import { fmt, useI18n } from '../i18n';
import type { ModeId, RoundResult, Settings } from '../types';
import { accuracy, grossWpm, wordsTyped } from '../engine/typing';
import { useTypingRound } from '../engine/useTypingRound';
import { lessonText, randomQuote, wordStream } from '../engine/textGen';
import { levelById } from '../game/levels';
import { play } from '../game/sound';
import Keyboard from './Keyboard';

interface Props {
  mode: Exclude<ModeId, 'falling'>;
  levelId?: string;
  settings: Settings;
  onFinish: (result: RoundResult) => void;
  onQuit: () => void;
}

export default function TypingView({ mode, levelId, settings, onFinish, onQuit }: Props) {
  const t = useI18n();
  const level = levelId ? levelById(levelId) : undefined;

  // Round content is fixed for the component's lifetime (App remounts per round).
  const [content] = useState(() => {
    if (mode === 'quotes') {
      const q = randomQuote();
      return { text: q.text, author: q.author };
    }
    if (mode === 'level' && level) return { text: lessonText(level), author: null };
    if (mode === 'sprint') return { text: wordStream(settings.sprintWords), author: null };
    return { text: wordStream(50), author: null }; // time + zen extend on the fly
  });
  const endless = mode === 'time' || mode === 'zen';

  const finished = useRef(false);
  const round = useTypingRound({
    text: content.text,
    extend: endless ? () => wordStream(20) : undefined,
    onChar: (hit, combo) => {
      if (!hit) play('error');
      else if (combo > 0 && combo % 25 === 0) play('combo', combo / 5);
      else play('click', combo);
    },
    onEscape: () => (mode === 'zen' ? finish() : onQuit()),
  });

  const durationLimitMs = mode === 'time' ? settings.timeAttackSeconds * 1000 : null;

  function finish() {
    if (finished.current) return;
    const s = round.state;
    if (s.startedAt === null) {
      onQuit(); // nothing typed — treat "finish" as quit
      return;
    }
    finished.current = true;
    const elapsed = durationLimitMs ?? performance.now() - s.startedAt;
    const wpm = grossWpm(s.correct, elapsed);
    const bestSlot =
      mode === 'time'
        ? `time-${settings.timeAttackSeconds}`
        : mode === 'sprint'
          ? `sprint-${settings.sprintWords}`
          : mode === 'quotes'
            ? 'quotes'
            : undefined;
    onFinish({
      mode,
      levelId,
      wpm,
      accuracy: accuracy(s.correct, s.errors),
      correct: s.correct,
      errors: s.errors,
      words: wordsTyped(s.correct),
      durationMs: elapsed,
      maxCombo: s.maxCombo,
      bestSlot,
      keys: s.keys,
    });
  }

  // Time Attack ends when the clock runs out; other prompt modes end on the last char.
  const timeUp = durationLimitMs !== null && round.elapsedMs >= durationLimitMs;
  useEffect(() => {
    if (timeUp || round.done) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, round.done]);

  useEffect(() => {
    round.focusInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingMs = durationLimitMs !== null ? Math.max(0, durationLimitMs - round.elapsedMs) : null;
  const started = round.state.startedAt !== null;
  const nextChar = round.state.cells[round.state.pos]?.char ?? null;

  // Auto-scroll the prompt so the caret stays visible on long lesson texts.
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const pos = round.state.pos;
  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [pos]);

  const combo = round.state.combo;

  return (
    <div className="tb-round" onMouseDown={(e) => { e.preventDefault(); round.focusInput(); }}>
      <div className="tb-round-top">
        <button className="tb-quit" onClick={onQuit} onMouseDown={(e) => e.stopPropagation()}>
          ← {t.round.escToQuit}
        </button>
        {mode === 'level' && level && (
          <div className="tb-level-heading">
            {level.boss && <span className="tb-boss-tag">{t.round.bossTag}</span>}
            <strong>{fmt(t.round.levelHeading, { n: level.n, title: level.title[settings.language] })}</strong>
            <span className="tb-level-target">{fmt(t.round.targetWpm, { wpm: level.targetWpm })}</span>
          </div>
        )}
        {mode === 'zen' && started && (
          <button className="tb-finish" onClick={finish} onMouseDown={(e) => e.stopPropagation()}>
            {t.round.finishZen}
          </button>
        )}
      </div>

      <div className="tb-pills">
        <div className="tb-pill">
          <span className="tb-pill-value">{Math.round(round.liveWpm)}</span>
          <span className="tb-pill-label">{t.round.wpm}</span>
        </div>
        <div className="tb-pill">
          <span className="tb-pill-value">{round.liveAcc.toFixed(0)}%</span>
          <span className="tb-pill-label">{t.round.acc}</span>
        </div>
        {mode !== 'zen' && (
          <div className={`tb-pill ${remainingMs !== null && remainingMs < 5000 && started ? 'urgent' : ''}`}>
            <span className="tb-pill-value">
              {remainingMs !== null ? Math.ceil(remainingMs / 1000) : Math.floor(round.elapsedMs / 1000)}
            </span>
            <span className="tb-pill-label">{t.round.time}</span>
          </div>
        )}
        <div className={`tb-pill combo ${combo >= 10 ? 'hot' : ''}`}>
          <span className="tb-pill-value">{combo}</span>
          <span className="tb-pill-label">{t.round.combo}</span>
        </div>
      </div>

      <div className={`tb-prompt-wrap ${round.focused ? '' : 'blurred'}`}>
        <div className="tb-prompt" aria-hidden="true">
          {round.state.cells.map((cell, i) => (
            <span
              key={i}
              ref={i === pos ? caretRef : undefined}
              className={
                i === pos ? 'cell current' : cell.state === 'correct' ? 'cell ok' : cell.state === 'wrong' ? 'cell bad' : 'cell'
              }
            >
              {cell.char === ' ' ? ' ' : cell.char}
            </span>
          ))}
        </div>
        {!round.focused && <div className="tb-focus-overlay">{t.round.clickToFocus}</div>}
        {round.focused && !started && <div className="tb-ready-hint">{t.round.getReady}</div>}
        <input
          ref={round.inputRef}
          className="tb-hidden-input"
          {...round.inputHandlers}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label={t.round.clickToFocus}
        />
      </div>

      {content.author && <div className="tb-quote-author">— {content.author}</div>}

      {mode === 'level' && settings.showKeyboard && <Keyboard mode="hint" nextKey={nextChar} />}
    </div>
  );
}
