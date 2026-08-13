import type { Profile, Settings, StatsLog } from './types';

export const SETTINGS_KEY = 'typeblitz:settings:v1';
export const PROFILE_KEY = 'typeblitz:profile:v1';
export const STATS_KEY = 'typeblitz:stats:v1';

export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };

function loadRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    const quota = err instanceof DOMException && err.name === 'QuotaExceededError';
    return { ok: false, reason: quota ? 'quota' : 'unavailable' };
  }
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  language: 'en',
  sound: true,
  volume: 0.5,
  timeAttackSeconds: 30,
  sprintWords: 25,
};

export function emptyProfile(): Profile {
  return {
    version: 1,
    xp: 0,
    streak: { current: 0, best: 0, lastDay: null },
    achievements: {},
    bests: {},
    modesPlayed: [],
    totals: { rounds: 0, timeMs: 0, keystrokes: 0, errors: 0, words: 0 },
  };
}

export function emptyStats(): StatsLog {
  return { version: 1, days: {}, rounds: [], keys: {} };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function loadSettings(): Settings {
  const parsed = loadRaw(SETTINGS_KEY);
  if (!isRecord(parsed) || parsed.version !== 1) return DEFAULT_SETTINGS;
  // Merge over defaults so new fields added later get sane values.
  return { ...DEFAULT_SETTINGS, ...(parsed as Partial<Settings>), version: 1 };
}

export function loadProfile(): Profile {
  const parsed = loadRaw(PROFILE_KEY);
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    typeof parsed.xp !== 'number' ||
    !isRecord(parsed.streak) ||
    !isRecord(parsed.achievements) ||
    !isRecord(parsed.bests) ||
    !isRecord(parsed.totals)
  ) {
    return emptyProfile();
  }
  const p = parsed as unknown as Profile;
  return { ...emptyProfile(), ...p, modesPlayed: Array.isArray(p.modesPlayed) ? p.modesPlayed : [] };
}

export function loadStats(): StatsLog {
  const parsed = loadRaw(STATS_KEY);
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !isRecord(parsed.days) ||
    !Array.isArray(parsed.rounds) ||
    !isRecord(parsed.keys)
  ) {
    return emptyStats();
  }
  return parsed as unknown as StatsLog;
}

/* ---------- full-data JSON export / import (backup file format) ---------- */

export interface AppExport {
  format: 'typeblitz-data';
  version: 1;
  exportedAt: string;
  settings: Settings;
  profile: Profile;
  stats: StatsLog;
}

export function buildExport(settings: Settings, profile: Profile, stats: StatsLog): AppExport {
  return { format: 'typeblitz-data', version: 1, exportedAt: new Date().toISOString(), settings, profile, stats };
}

export function downloadExport(payload: AppExport): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'typeblitz-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** Parses an exported backup. Throws Error with a message on bad input. */
export function parseExport(text: string): AppExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('not valid JSON');
  }
  if (!isRecord(parsed) || parsed.format !== 'typeblitz-data' || parsed.version !== 1) {
    throw new Error('not a TypeBlitz backup file');
  }
  const o = parsed as unknown as AppExport;
  if (!isRecord(o.settings) || !isRecord(o.profile) || !isRecord(o.stats)) {
    throw new Error('backup file is incomplete');
  }
  return o;
}

/** Opens a file picker and resolves with the chosen file's text (null if cancelled). */
export function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
