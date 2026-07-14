import { useCallback, useEffect, useRef, useState } from 'react';
import {
  accuracy,
  createRound,
  extendRound,
  grossWpm,
  isDone,
  pressBackspace,
  pressChar,
  type RoundState,
} from './typing';

export interface TypingRoundOptions {
  text: string;
  /** Endless modes: called when the caret nears the end; returns text to append. */
  extend?: () => string;
  /** Per-keystroke feedback hook (sound/animation). */
  onChar?: (hit: boolean, combo: number) => void;
  onEscape?: () => void;
}

export interface TypingRoundApi {
  state: RoundState;
  elapsedMs: number;
  liveWpm: number;
  liveAcc: number;
  done: boolean;
  focused: boolean;
  focusInput: () => void;
  reset: (text: string) => void;
  /** Spread onto the hidden <input> that captures keystrokes. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputHandlers: {
    onInput: React.FormEventHandler<HTMLInputElement>;
    onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
    onPaste: React.ClipboardEventHandler<HTMLInputElement>;
    onFocus: () => void;
    onBlur: () => void;
  };
}

const EXTEND_MARGIN = 80; // append more text when this close to the end

/**
 * Keystroke capture for prompt modes. Characters are read by diffing the hidden
 * input's value on `input` events (not keydown) so AltGr combos, dead keys and
 * IMEs behave — users may be on a Polish layout even with English content.
 */
export function useTypingRound(opts: TypingRoundOptions): TypingRoundApi {
  const [state, setState] = useState<RoundState>(() => createRound(opts.text));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [focused, setFocused] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevValue = useRef('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reset = useCallback((text: string) => {
    const fresh = createRound(text);
    stateRef.current = fresh;
    setState(fresh);
    setElapsedMs(0);
    prevValue.current = '';
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const onInput = useCallback<React.FormEventHandler<HTMLInputElement>>((e) => {
    const value = e.currentTarget.value;
    const prev = prevValue.current;
    prevValue.current = value;

    // Diff against the previous value: common prefix, then deletions, then additions.
    let common = 0;
    const max = Math.min(prev.length, value.length);
    while (common < max && prev[common] === value[common]) common++;

    let s = stateRef.current;
    const { onChar, extend } = optsRef.current;
    for (let i = 0; i < prev.length - common; i++) s = pressBackspace(s);
    const now = performance.now();
    for (let i = common; i < value.length; i++) {
      if (s.pos >= s.cells.length) break;
      const before = s;
      s = pressChar(s, value[i], now);
      onChar?.(s.errors === before.errors, s.combo);
    }
    if (extend && !isDone(s) && s.cells.length - s.pos < EXTEND_MARGIN) {
      s = extendRound(s, ' ' + extend());
    }
    stateRef.current = s;
    setState(s);
  }, []);

  const onKeyDown = useCallback<React.KeyboardEventHandler<HTMLInputElement>>((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      optsRef.current.onEscape?.();
      return;
    }
    // The value diff assumes append/delete at the end — block caret movement.
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Delete', 'Enter', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  const running = state.startedAt !== null && !isDone(state);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const started = stateRef.current.startedAt;
      if (started !== null) setElapsedMs(performance.now() - started);
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  return {
    state,
    elapsedMs,
    liveWpm: grossWpm(state.correct, elapsedMs),
    liveAcc: accuracy(state.correct, state.errors),
    done: isDone(state),
    focused,
    focusInput,
    reset,
    inputRef,
    inputHandlers: {
      onInput,
      onKeyDown,
      onPaste: (e) => e.preventDefault(), // pasting the prompt is not typing it
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
