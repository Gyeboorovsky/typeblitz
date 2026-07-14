import { fmt, useI18n } from '../i18n';
import type { Language, Profile } from '../types';
import { isUnlocked, LEVELS } from '../game/levels';

interface Props {
  profile: Profile;
  language: Language;
  onPlay: (levelId: string) => void;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="tb-stars" aria-label={`${n}/3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function LevelsView({ profile, language, onPlay }: Props) {
  const t = useI18n();

  return (
    <div className="tb-levels">
      <h1>{t.levels.heading}</h1>
      <p className="tb-sub">{t.levels.sub}</p>
      <div className="tb-level-grid">
        {LEVELS.map((level) => {
          const progress = profile.levels[level.id];
          const unlocked = isUnlocked(level, profile.levels);
          const stars = progress?.stars ?? 0;
          return (
            <button
              key={level.id}
              className={`tb-level-tile ${level.boss ? 'boss' : ''} ${unlocked ? '' : 'locked'} ${stars > 0 ? 'done' : ''}`}
              disabled={!unlocked}
              onClick={() => onPlay(level.id)}
              title={unlocked ? undefined : t.levels.locked}
            >
              <span className="tb-level-num">{unlocked ? level.n : '🔒'}</span>
              <span className="tb-level-title">{level.title[language]}</span>
              <Stars n={stars} />
              <span className="tb-level-meta">
                {progress && stars > 0
                  ? fmt(t.levels.best, { wpm: Math.round(progress.bestWpm), acc: progress.bestAccuracy.toFixed(0) })
                  : fmt(t.levels.target, { wpm: level.targetWpm })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
