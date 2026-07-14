import { useEffect, useRef, useState } from 'react';
import { save, type SaveResult } from './storage';

const DEBOUNCE_MS = 400;

/**
 * State that autosaves (debounced) to a localStorage key. Loading/seeding
 * happens in the lazy initializer (StrictMode-safe — runs once per mount).
 * Pending writes are flushed on beforeunload so a quick tab close loses nothing.
 */
export function useAutosaved<T>(
  key: string,
  init: () => T,
): [T, (updater: (prev: T) => T) => void, SaveResult] {
  const [value, setValue] = useState<T>(init);
  const [status, setStatus] = useState<SaveResult>({ ok: true });
  const pending = useRef<T | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    pending.current = value;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      pending.current = null;
      setStatus(save(key, value));
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [key, value]);

  useEffect(() => {
    const flush = () => {
      if (pending.current !== null) save(key, pending.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [key]);

  return [value, setValue as (updater: (prev: T) => T) => void, status];
}
