import { useEffect, useRef } from 'react';
import { fmt, useI18n } from '../i18n';
import type { Profile, RoundOutcome, RoundResult } from '../types';
import { ACHIEVEMENTS } from '../game/progression';
import { LEVELS, levelById } from '../game/levels';
import { play } from '../game/sound';

interface Props {
  result: RoundResult;
  outcome: RoundOutcome;
  profile: Profile;
  onRetry: () => void;
  onNext: (nextLevelId: string) => void;
  onHome: () => void;
}

/** One-shot confetti burst on a fixed-position canvas. */
function Confetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const style = getComputedStyle(document.documentElement);
    const colors = ['--accent', '--cat-game', '--cat-app', '--cat-tool', '--cat-mobile']
      .map((v) => style.getPropertyValue(v).trim())
      .filter(Boolean);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const parts = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 320,
      vy: -180 - Math.random() * 240,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: Math.random() * Math.PI * 2,
    }));
    let raf = 0;
    let last = performance.now();
    const started = last;
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 560 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += dt * 6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - (now - started) / 2400);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (now - started < 2500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="tb-confetti" aria-hidden="true" />;
}

export default function SummaryView({ result, outcome, profile, onRetry, onNext, onHome }: Props) {
  const t = useI18n();
  const level = result.levelId ? levelById(result.levelId) : undefined;
  const stars = outcome.stars ?? null;
  const failed = level !== undefined && stars === 0;
  const leveledUp = outcome.levelAfter > outcome.levelBefore;
  const celebrate = outcome.newBests.length > 0 || stars === 3 || leveledUp;

  // Celebration sound, once (StrictMode-safe via ref).
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    if (failed) play('error');
    else if (leveledUp) play('fanfare');
    else if (celebrate) play('star');
    else if (stars !== null && stars > 0) play('star');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextLevel = level && stars !== null && stars > 0 ? LEVELS[level.n] : undefined;
  const prevBest = result.bestSlot ? profile.bests[result.bestSlot] : undefined;

  return (
    <div className="tb-summary">
      {celebrate && !failed && <Confetti />}
      <h1 className={failed ? 'failed' : ''}>{failed ? t.summary.failedTitle : t.summary.title}</h1>

      {stars !== null && (
        <div className="tb-summary-stars">
          {[1, 2, 3].map((i) => (
            <span key={i} className={`big-star ${i <= stars ? 'on' : ''}`} style={{ animationDelay: `${i * 0.25}s` }}>
              ★
            </span>
          ))}
        </div>
      )}
      {failed && <p className="tb-failed-hint">{t.summary.failedHint}</p>}
      {!outcome.recorded && <p className="tb-failed-hint">{t.summary.discardedHint}</p>}

      <div className="tb-summary-grid">
        <div className="tb-sum-stat main">
          <span className="v">{Math.round(result.wpm)}</span>
          <span className="l">{t.round.wpm}</span>
        </div>
        <div className="tb-sum-stat">
          <span className="v">{result.accuracy.toFixed(1)}%</span>
          <span className="l">{t.round.acc}</span>
        </div>
        {result.mode === 'falling' ? (
          <>
            <div className="tb-sum-stat">
              <span className="v">{result.score}</span>
              <span className="l">{t.summary.finalScore}</span>
            </div>
            <div className="tb-sum-stat">
              <span className="v">{result.wave}</span>
              <span className="l">{fmt(t.round.wave, { n: '' }).trim()}</span>
            </div>
          </>
        ) : (
          <>
            <div className="tb-sum-stat">
              <span className="v">{result.correct}</span>
              <span className="l">{t.summary.chars}</span>
            </div>
            <div className="tb-sum-stat">
              <span className="v">{result.errors}</span>
              <span className="l">{t.summary.errors}</span>
            </div>
          </>
        )}
        <div className="tb-sum-stat">
          <span className="v">{result.maxCombo}</span>
          <span className="l">{t.summary.maxCombo}</span>
        </div>
        <div className="tb-sum-stat">
          <span className="v">{(result.durationMs / 1000).toFixed(0)}s</span>
          <span className="l">{t.summary.duration}</span>
        </div>
      </div>

      {outcome.newBests.length > 0 && <div className="tb-record-banner">🏅 {t.summary.newRecord}</div>}
      {outcome.newBests.length === 0 && prevBest && result.mode === 'falling' && (
        <p className="tb-prev-best">{fmt(t.summary.bestScore, { score: prevBest.score ?? 0 })}</p>
      )}
      {level && stars !== null && stars > 0 && stars < 3 && (
        <p className="tb-prev-best">
          {fmt(t.summary.starsToBeat, {
            wpm: stars === 1 ? level.targetWpm : Math.round(level.targetWpm * 1.25),
            acc: stars === 1 ? 92 : 97,
          })}
        </p>
      )}

      {outcome.recorded && outcome.xpGained > 0 && (
        <div className="tb-xp-gain">{fmt(t.summary.xpGained, { xp: outcome.xpGained })}</div>
      )}
      {leveledUp && <div className="tb-levelup-banner">🎉 {fmt(t.summary.levelUp, { n: outcome.levelAfter })}</div>}

      {outcome.newAchievements.length > 0 && (
        <div className="tb-new-achievements">
          <span className="tb-ach-heading">{t.summary.achievementUnlocked}</span>
          {outcome.newAchievements.map((id) => {
            const meta = ACHIEVEMENTS.find((a) => a.id === id);
            const text = t.achievements[id];
            return (
              <div key={id} className="tb-ach-card unlocked">
                <span className="tb-ach-icon">{meta?.icon ?? '🏆'}</span>
                <span className="tb-ach-name">{text?.name ?? id}</span>
                <span className="tb-ach-desc">{text?.desc ?? ''}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="tb-summary-actions">
        <button className="tb-secondary" onClick={onHome}>
          {t.summary.backHome}
        </button>
        <button className="tb-primary" onClick={onRetry}>
          {t.summary.retry}
        </button>
        {nextLevel && (
          <button className="tb-primary next" onClick={() => onNext(nextLevel.id)}>
            {t.summary.nextLevel} →
          </button>
        )}
      </div>
    </div>
  );
}
