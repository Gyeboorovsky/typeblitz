import { useCallback, useEffect, useRef, useState } from 'react';
import { I18nProvider, useI18n } from './i18n';
import type { ModeId, Profile, RoundOutcome, RoundResult, StatsLog } from './types';
import { localDay } from './types';
import {
  buildExport,
  DEFAULT_SETTINGS,
  emptyProfile,
  emptyStats,
  loadProfile,
  loadSettings,
  loadStats,
  parseExport,
  PROFILE_KEY,
  SETTINGS_KEY,
  STATS_KEY,
  save,
} from './storage';
import { useAutosaved } from './usePersistence';
import {
  isFolderSupported,
  loadStoredHandle,
  pickDataFolder,
  forgetStoredHandle,
  verifyPermission,
  writeBackup,
  type FolderStatus,
} from './localFolder';
import { levelById, starsFor } from './game/levels';
import { evaluateAchievements, playerLevel, updateStreak, xpForRound } from './game/progression';
import { configureSound } from './game/sound';
import HomeView from './components/HomeView';
import LevelsView from './components/LevelsView';
import TypingView from './components/TypingView';
import FallingView from './components/FallingView';
import SummaryView from './components/SummaryView';
import DashboardView from './components/DashboardView';
import OptionsDrawer from './components/OptionsDrawer';

type View =
  | { name: 'home' }
  | { name: 'levels' }
  | { name: 'dashboard' }
  | { name: 'round'; mode: ModeId; levelId?: string }
  | { name: 'summary'; result: RoundResult; outcome: RoundOutcome };

const ROUND_SAMPLES_CAP = 300;

export default function App() {
  const [settings, setSettings, settingsStatus] = useAutosaved(SETTINGS_KEY, loadSettings);
  const [profile, setProfile, profileStatus] = useAutosaved(PROFILE_KEY, loadProfile);
  const [stats, setStats, statsStatus] = useAutosaved(STATS_KEY, loadStats);
  const [view, setView] = useState<View>({ name: 'home' });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [folder, setFolder] = useState<FolderStatus>({ state: isFolderSupported() ? 'none' : 'unsupported' });
  const [backupFailing, setBackupFailing] = useState(false);

  useEffect(() => configureSound(settings.sound, settings.volume), [settings.sound, settings.volume]);

  // Ask the browser to protect this origin's storage from eviction ("persist for years").
  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);

  // Restore the backup-folder handle saved in IndexedDB (silent permission check only).
  useEffect(() => {
    if (!isFolderSupported()) return;
    let cancelled = false;
    void (async () => {
      const handle = await loadStoredHandle();
      if (cancelled || !handle) return;
      const ok = await verifyPermission(handle, false);
      setFolder(
        ok
          ? { state: 'active', handle, name: handle.name }
          : { state: 'need-permission', handle, name: handle.name },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live folder backup: mirror all data into the chosen folder shortly after any change.
  useEffect(() => {
    if (folder.state !== 'active') return;
    const id = window.setTimeout(() => {
      void writeBackup(folder.handle, buildExport(settings, profile, stats)).then((ok) => setBackupFailing(!ok));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [folder, settings, profile, stats]);

  const recordRound = useCallback(
    (result: RoundResult): RoundOutcome => {
      const before = playerLevel(profile.xp);
      const base: RoundOutcome = {
        recorded: true,
        xpGained: 0,
        levelBefore: before.level,
        levelAfter: before.level,
        newBests: [],
        newAchievements: [],
      };

      // Anti-farm: a zen round must be a real practice session to count.
      if (result.mode === 'zen' && (result.durationMs < 30000 || result.words < 10)) {
        return { ...base, recorded: false };
      }

      const level = result.levelId ? levelById(result.levelId) : undefined;
      const stars = level ? starsFor(result, level) : undefined;
      const starsBefore = level ? (profile.levels[level.id]?.stars ?? 0) : undefined;
      const gainedStars = stars !== undefined && starsBefore !== undefined ? Math.max(0, stars - starsBefore) : 0;
      const xpGained = xpForRound(result, gainedStars, level?.boss ?? false);

      const next: Profile = {
        ...profile,
        xp: profile.xp + xpGained,
        streak: updateStreak(profile.streak, localDay()),
        levels: { ...profile.levels },
        bests: { ...profile.bests },
        achievements: { ...profile.achievements },
        modesPlayed: profile.modesPlayed.includes(result.mode)
          ? profile.modesPlayed
          : [...profile.modesPlayed, result.mode],
        totals: {
          rounds: profile.totals.rounds + 1,
          timeMs: profile.totals.timeMs + result.durationMs,
          keystrokes: profile.totals.keystrokes + result.correct + result.errors,
          errors: profile.totals.errors + result.errors,
          words: profile.totals.words + result.words,
        },
      };

      if (level && stars !== undefined) {
        const prev = next.levels[level.id] ?? { stars: 0 as const, bestWpm: 0, bestAccuracy: 0 };
        next.levels[level.id] = {
          stars: Math.max(prev.stars, stars) as 0 | 1 | 2 | 3,
          bestWpm: Math.max(prev.bestWpm, stars > 0 ? result.wpm : prev.bestWpm),
          bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
        };
      }

      const newBests: string[] = [];
      if (result.bestSlot) {
        const prev = next.bests[result.bestSlot];
        const better =
          result.mode === 'falling' ? (result.score ?? 0) > (prev?.score ?? 0) : result.wpm > (prev?.wpm ?? 0);
        if (better) {
          next.bests[result.bestSlot] = {
            wpm: result.wpm,
            accuracy: result.accuracy,
            score: result.score,
            date: new Date().toISOString(),
          };
          newBests.push(result.bestSlot);
        }
      }

      const newAchievements = evaluateAchievements(next, result);
      const unlockedAt = new Date().toISOString();
      for (const id of newAchievements) next.achievements[id] = unlockedAt;

      const today = localDay();
      const day = stats.days[today] ?? { rounds: 0, timeMs: 0, keystrokes: 0, errors: 0, words: 0, bestWpm: 0 };
      const keys = { ...stats.keys };
      for (const [k, stat] of Object.entries(result.keys)) {
        const prev = keys[k] ?? { hits: 0, misses: 0 };
        keys[k] = { hits: prev.hits + stat.hits, misses: prev.misses + stat.misses };
      }
      const nextStats: StatsLog = {
        version: 1,
        days: {
          ...stats.days,
          [today]: {
            rounds: day.rounds + 1,
            timeMs: day.timeMs + result.durationMs,
            keystrokes: day.keystrokes + result.correct + result.errors,
            errors: day.errors + result.errors,
            words: day.words + result.words,
            bestWpm: Math.max(day.bestWpm, result.wpm),
          },
        },
        rounds: [
          { mode: result.mode, wpm: result.wpm, accuracy: result.accuracy, at: new Date().toISOString() },
          ...stats.rounds,
        ].slice(0, ROUND_SAMPLES_CAP),
        keys,
      };

      setProfile(() => next);
      setStats(() => nextStats);

      return {
        recorded: true,
        xpGained,
        levelBefore: before.level,
        levelAfter: playerLevel(next.xp).level,
        newBests,
        newAchievements,
        stars,
        starsBefore,
      };
    },
    [profile, stats, setProfile, setStats],
  );

  const finishRound = useCallback(
    (result: RoundResult) => {
      const outcome = recordRound(result);
      setView({ name: 'summary', result, outcome });
    },
    [recordRound],
  );

  const pickFolder = useCallback(async () => {
    const handle = await pickDataFolder();
    if (!handle) return;
    setBackupFailing(false);
    setFolder({ state: 'active', handle, name: handle.name });
  }, []);

  const reauthorizeFolder = useCallback(async () => {
    if (folder.state !== 'need-permission') return;
    if (await verifyPermission(folder.handle, true)) {
      setFolder({ state: 'active', handle: folder.handle, name: folder.name });
    }
  }, [folder]);

  const forgetFolder = useCallback(async () => {
    await forgetStoredHandle();
    setBackupFailing(false);
    setFolder({ state: 'none' });
  }, []);

  const importData = useCallback(
    (text: string) => {
      const data = parseExport(text); // throws with a message on bad input
      setSettings(() => ({ ...DEFAULT_SETTINGS, ...data.settings, version: 1 }));
      setProfile(() => ({ ...emptyProfile(), ...data.profile, version: 1 }));
      setStats(() => ({ ...emptyStats(), ...data.stats, version: 1 }));
    },
    [setSettings, setProfile, setStats],
  );

  const resetAll = useCallback(() => {
    setSettings(() => DEFAULT_SETTINGS);
    setProfile(() => emptyProfile());
    setStats(() => emptyStats());
    save(SETTINGS_KEY, DEFAULT_SETTINGS);
    save(PROFILE_KEY, emptyProfile());
    save(STATS_KEY, emptyStats());
    setView({ name: 'home' });
  }, [setSettings, setProfile, setStats]);

  const saveError = [settingsStatus, profileStatus, statsStatus].find((s) => !s.ok);

  return (
    <I18nProvider language={settings.language}>
      <Shell
        view={view}
        setView={setView}
        settings={settings}
        profile={profile}
        stats={stats}
        finishRound={finishRound}
        optionsOpen={optionsOpen}
        setOptionsOpen={setOptionsOpen}
        saveErrorReason={saveError && !saveError.ok ? saveError.reason : null}
      />
      {optionsOpen && (
        <OptionsDrawer
          settings={settings}
          setSettings={setSettings}
          folder={folder}
          backupFailing={backupFailing}
          onPickFolder={pickFolder}
          onReauthorizeFolder={reauthorizeFolder}
          onForgetFolder={forgetFolder}
          exportPayload={() => buildExport(settings, profile, stats)}
          onImport={importData}
          onReset={resetAll}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </I18nProvider>
  );
}

interface ShellProps {
  view: View;
  setView: (v: View) => void;
  settings: ReturnType<typeof loadSettings>;
  profile: Profile;
  stats: StatsLog;
  finishRound: (result: RoundResult) => void;
  optionsOpen: boolean;
  setOptionsOpen: (open: boolean) => void;
  saveErrorReason: 'quota' | 'unavailable' | null;
}

function Shell({ view, setView, settings, profile, stats, finishRound, setOptionsOpen, saveErrorReason }: ShellProps) {
  const t = useI18n();
  const inRound = view.name === 'round';
  const navRef = useRef<HTMLDivElement | null>(null);

  const startMode = (mode: ModeId, levelId?: string) => setView({ name: 'round', mode, levelId });

  return (
    <div className="tb-app">
      {!inRound && (
        <header className="tb-header">
          <button className="tb-wordmark" onClick={() => setView({ name: 'home' })}>
            Type<span>Blitz</span>
          </button>
          <nav className="tb-nav" ref={navRef}>
            <button className={view.name === 'home' ? 'active' : ''} onClick={() => setView({ name: 'home' })}>
              {t.nav.home}
            </button>
            <button className={view.name === 'levels' ? 'active' : ''} onClick={() => setView({ name: 'levels' })}>
              {t.nav.levels}
            </button>
            <button
              className={view.name === 'dashboard' ? 'active' : ''}
              onClick={() => setView({ name: 'dashboard' })}
            >
              {t.nav.dashboard}
            </button>
          </nav>
          <button className="tb-gear" onClick={() => setOptionsOpen(true)} aria-label={t.nav.options}>
            ⚙
          </button>
        </header>
      )}

      {saveErrorReason && (
        <div className="tb-banner" role="alert">
          {saveErrorReason === 'quota' ? t.options.storageQuota : t.options.storageUnavailable}
        </div>
      )}

      <main className="tb-main">
        {view.name === 'home' && <HomeView profile={profile} settings={settings} onStart={startMode} onCareer={() => setView({ name: 'levels' })} />}
        {view.name === 'levels' && (
          <LevelsView profile={profile} language={settings.language} onPlay={(levelId) => startMode('level', levelId)} />
        )}
        {view.name === 'dashboard' && <DashboardView profile={profile} stats={stats} />}
        {view.name === 'round' &&
          (view.mode === 'falling' ? (
            <FallingView onFinish={finishRound} onQuit={() => setView({ name: 'home' })} />
          ) : (
            <TypingView
              mode={view.mode}
              levelId={view.levelId}
              settings={settings}
              onFinish={finishRound}
              onQuit={() => setView(view.mode === 'level' ? { name: 'levels' } : { name: 'home' })}
            />
          ))}
        {view.name === 'summary' && (
          <SummaryView
            result={view.result}
            outcome={view.outcome}
            profile={profile}
            onRetry={() => startMode(view.result.mode, view.result.levelId)}
            onNext={(nextLevelId) => startMode('level', nextLevelId)}
            onHome={() => setView(view.result.mode === 'level' ? { name: 'levels' } : { name: 'home' })}
          />
        )}
      </main>
    </div>
  );
}
