import { useState } from 'react';
import { fmt, useI18n } from '../i18n';
import type { ModeId, Profile, StatsLog } from '../types';
import { localDay } from '../types';
import { ACHIEVEMENTS } from '../game/progression';
import Keyboard from './Keyboard';

interface Props {
  profile: Profile;
  stats: StatsLog;
}

const MODE_FILTERS: (ModeId | 'all')[] = ['all', 'time', 'sprint', 'quotes', 'zen', 'falling'];

function TrendChart({ stats }: { stats: StatsLog }) {
  const t = useI18n();
  const [filter, setFilter] = useState<ModeId | 'all'>('all');
  const rounds = stats.rounds.filter((r) => filter === 'all' || r.mode === filter).slice(0, 100).reverse();

  if (rounds.length < 2) {
    return (
      <>
        <FilterPills filter={filter} setFilter={setFilter} />
        <p className="tb-empty">{t.dash.trendEmpty}</p>
      </>
    );
  }

  const W = 640;
  const H = 200;
  const PAD = 28;
  const maxWpm = Math.max(40, ...rounds.map((r) => r.wpm));
  const x = (i: number) => PAD + (i / (rounds.length - 1)) * (W - PAD * 2);
  const yWpm = (v: number) => H - PAD - (v / maxWpm) * (H - PAD * 2);
  const yAcc = (v: number) => H - PAD - (v / 100) * (H - PAD * 2);

  const wpmPts = rounds.map((r, i) => `${x(i).toFixed(1)},${yWpm(r.wpm).toFixed(1)}`).join(' ');
  const accPts = rounds.map((r, i) => `${x(i).toFixed(1)},${yAcc(r.accuracy).toFixed(1)}`).join(' ');
  const areaPts = `${PAD},${H - PAD} ${wpmPts} ${x(rounds.length - 1).toFixed(1)},${H - PAD}`;

  return (
    <>
      <FilterPills filter={filter} setFilter={setFilter} />
      <div className="tb-chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} className="tb-trend" role="img" aria-label={t.dash.wpmTrend}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={PAD} x2={W - PAD} y1={yWpm(maxWpm * f)} y2={yWpm(maxWpm * f)} className="grid" />
              <text x={PAD - 6} y={yWpm(maxWpm * f) + 4} className="tick" textAnchor="end">
                {Math.round(maxWpm * f)}
              </text>
            </g>
          ))}
          <polygon points={areaPts} className="area" />
          <polyline points={accPts} className="acc-line" />
          <polyline points={wpmPts} className="wpm-line" />
          <circle
            cx={x(rounds.length - 1)}
            cy={yWpm(rounds[rounds.length - 1].wpm)}
            r={4}
            className="last-dot"
          />
        </svg>
      </div>
      <div className="tb-legend">
        <span className="lg wpm">— {t.dash.wpmLine}</span>
        <span className="lg acc">— {t.dash.accLine}</span>
      </div>
    </>
  );
}

function FilterPills({ filter, setFilter }: { filter: ModeId | 'all'; setFilter: (f: ModeId | 'all') => void }) {
  const t = useI18n();
  return (
    <div className="tb-filter-pills">
      {MODE_FILTERS.map((f) => (
        <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
          {f === 'all' ? t.dash.filterAll : t.modes[f].name}
        </button>
      ))}
    </div>
  );
}

function ActivityCalendar({ stats }: { stats: StatsLog }) {
  const t = useI18n();
  // 12 weeks ending today, columns = weeks, rows = weekday (Mon-first).
  const today = new Date();
  const cells: { day: string; ms: number }[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 83);
  for (let i = 0; i < 84; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDay(d);
    cells.push({ day: key, ms: stats.days[key]?.timeMs ?? 0 });
  }
  const intensity = (ms: number) => (ms === 0 ? 0 : ms < 5 * 60000 ? 1 : ms < 15 * 60000 ? 2 : ms < 45 * 60000 ? 3 : 4);

  return (
    <div className="tb-calendar" title={t.dash.activityHint}>
      {cells.map((c) => (
        <span
          key={c.day}
          className={`cal-cell i${intensity(c.ms)}`}
          title={`${c.day}: ${Math.round(c.ms / 60000)} min`}
        />
      ))}
    </div>
  );
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardView({ profile, stats }: Props) {
  const t = useI18n();
  const bests = Object.entries(profile.bests);
  const haveKeys = Object.keys(stats.keys).length > 0;

  return (
    <div className="tb-dash">
      <h1>{t.dash.heading}</h1>
      <p className="tb-sub">{t.dash.sub}</p>

      <section className="tb-card">
        <h2>{t.dash.wpmTrend}</h2>
        <TrendChart stats={stats} />
      </section>

      <div className="tb-dash-cols">
        <section className="tb-card">
          <h2>{t.dash.heatmap}</h2>
          <p className="tb-hint">{t.dash.heatmapHint}</p>
          {haveKeys ? <Keyboard keys={stats.keys} /> : <p className="tb-empty">{t.dash.heatmapEmpty}</p>}
        </section>

        <section className="tb-card">
          <h2>{t.dash.activity}</h2>
          <p className="tb-hint">{t.dash.activityHint}</p>
          <ActivityCalendar stats={stats} />
          <h2 className="tb-totals-heading">{t.dash.totals}</h2>
          <div className="tb-totals">
            <div className="tb-total">
              <span className="v">{profile.totals.rounds}</span>
              <span className="l">{t.dash.totalRounds}</span>
            </div>
            <div className="tb-total">
              <span className="v">{formatDuration(profile.totals.timeMs)}</span>
              <span className="l">{t.dash.totalTime}</span>
            </div>
            <div className="tb-total">
              <span className="v">{profile.totals.keystrokes.toLocaleString()}</span>
              <span className="l">{t.dash.totalKeystrokes}</span>
            </div>
            <div className="tb-total">
              <span className="v">{profile.totals.words.toLocaleString()}</span>
              <span className="l">{t.dash.totalWords}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="tb-card">
        <h2>{t.dash.bests}</h2>
        {bests.length === 0 ? (
          <p className="tb-empty">{t.dash.bestsEmpty}</p>
        ) : (
          <div className="tb-bests">
            {bests.map(([slot, b]) => (
              <div key={slot} className="tb-best-card">
                <span className="slot">{t.bestSlots[slot] ?? slot}</span>
                <span className="v">{slot === 'falling' ? (b.score ?? 0) : `${Math.round(b.wpm)} WPM`}</span>
                <span className="sub">
                  {slot === 'falling' ? `${Math.round(b.wpm)} WPM · ` : ''}
                  {b.accuracy.toFixed(1)}% · {b.date.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="tb-card">
        <h2>
          {t.dash.achievements}{' '}
          <span className="tb-count">
            {fmt(t.dash.achievementsCount, {
              have: Object.keys(profile.achievements).length,
              total: ACHIEVEMENTS.length,
            })}
          </span>
        </h2>
        <div className="tb-ach-grid">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.id in profile.achievements;
            const text = t.achievements[a.id];
            return (
              <div key={a.id} className={`tb-ach-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <span className="tb-ach-icon">{a.icon}</span>
                <span className="tb-ach-name">{text?.name ?? a.id}</span>
                <span className="tb-ach-desc">{unlocked ? text?.desc : (text?.desc ?? t.dash.lockedAchievement)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
