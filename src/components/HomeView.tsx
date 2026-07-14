import { fmt, useI18n } from '../i18n';
import type { ModeId, Profile, Settings } from '../types';
import { playerLevel } from '../game/progression';
import { LEVELS, totalStars } from '../game/levels';

interface Props {
  profile: Profile;
  settings: Settings;
  onStart: (mode: ModeId) => void;
  onCareer: () => void;
}

const MODE_ICONS: Record<ModeId, string> = {
  time: '⏱️',
  sprint: '🏁',
  falling: '☄️',
  zen: '🧘',
  quotes: '📜',
  level: '🎓',
};

export default function HomeView({ profile, settings, onStart, onCareer }: Props) {
  const t = useI18n();
  const pl = playerLevel(profile.xp);
  const xpPct = pl.needed > 0 ? Math.min(100, (pl.into / pl.needed) * 100) : 0;
  const bestWpm = Math.max(0, ...Object.values(profile.bests).map((b) => b.wpm));
  const stars = totalStars(profile);

  const modes: { id: ModeId; desc: string }[] = [
    { id: 'time', desc: fmt(t.modes.time.desc, { s: settings.timeAttackSeconds }) },
    { id: 'sprint', desc: fmt(t.modes.sprint.desc, { n: settings.sprintWords }) },
    { id: 'falling', desc: t.modes.falling.desc },
    { id: 'quotes', desc: t.modes.quotes.desc },
    { id: 'zen', desc: t.modes.zen.desc },
  ];

  return (
    <div className="tb-home">
      <p className="tb-tagline">{t.home.tagline}</p>

      <section className="tb-profile-strip">
        <div className="tb-level-ring" style={{ '--pct': xpPct } as React.CSSProperties}>
          <span>{pl.level}</span>
        </div>
        <div className="tb-profile-info">
          <strong>{fmt(t.home.playerLevel, { n: pl.level })}</strong>
          <div className="tb-xp-bar">
            <div className="tb-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="tb-xp-text">{fmt(t.home.xpToNext, { into: pl.into, needed: pl.needed })}</span>
        </div>
        <div className="tb-profile-side">
          <span className={`tb-streak ${profile.streak.current > 0 ? 'on' : ''}`}>
            🔥 {profile.streak.current > 0 ? fmt(t.home.streak, { n: profile.streak.current }) : t.home.noStreak}
          </span>
          {bestWpm > 0 && <span className="tb-best">{fmt(t.home.bestWpm, { wpm: Math.round(bestWpm) })}</span>}
        </div>
      </section>

      <section className="tb-mode-grid">
        <button className="tb-mode-card career" onClick={onCareer}>
          <span className="tb-mode-icon">{MODE_ICONS.level}</span>
          <span className="tb-mode-name">{t.modes.level.name}</span>
          <span className="tb-mode-desc">{t.modes.level.desc}</span>
          <span className="tb-career-progress">
            <span className="tb-career-fill" style={{ width: `${(stars / (LEVELS.length * 3)) * 100}%` }} />
          </span>
          <span className="tb-mode-meta">{fmt(t.home.careerProgress, { stars, total: LEVELS.length * 3 })}</span>
        </button>
        {modes.map((m) => (
          <button key={m.id} className={`tb-mode-card ${m.id}`} onClick={() => onStart(m.id)}>
            <span className="tb-mode-icon">{MODE_ICONS[m.id]}</span>
            <span className="tb-mode-name">{t.modes[m.id].name}</span>
            <span className="tb-mode-desc">{m.desc}</span>
          </button>
        ))}
      </section>
    </div>
  );
}
