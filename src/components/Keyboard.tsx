import type { KeyStat } from '../types';

/** Visual QWERTY keyboard. `hint` mode lights up the next key to press
 * (career lessons); `heat` mode paints lifetime miss ratios (dashboard). */

const ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '?'],
];

interface Props {
  mode: 'hint' | 'heat';
  nextKey?: string | null;
  keys?: Record<string, KeyStat>;
}

export default function Keyboard({ mode, nextKey, keys }: Props) {
  const target = nextKey?.toLowerCase() ?? null;
  const needsShift = nextKey !== null && nextKey !== undefined && nextKey !== target;

  function heatRatio(k: string): number {
    const s = keys?.[k];
    if (!s || s.hits + s.misses < 5) return 0; // too few samples to judge
    return s.misses / (s.hits + s.misses);
  }

  return (
    <div className={`tb-keyboard ${mode}`} aria-hidden="true">
      {ROWS.map((row, ri) => (
        <div className="tb-krow" key={ri}>
          {row.map((k) => {
            const heat = mode === 'heat' ? heatRatio(k) : 0;
            const s = keys?.[k];
            const title =
              mode === 'heat' && s && s.hits + s.misses >= 5
                ? `${k} — ${Math.round(heatRatio(k) * 100)}% miss (${s.misses}/${s.hits + s.misses})`
                : undefined;
            return (
              <span
                key={k}
                title={title}
                className={`tb-key ${mode === 'hint' && target === k ? 'lit' : ''}`}
                style={heat > 0 ? ({ '--heat': heat } as React.CSSProperties) : undefined}
              >
                {k}
              </span>
            );
          })}
        </div>
      ))}
      <div className="tb-krow">
        {mode === 'hint' && <span className={`tb-key wide ${needsShift ? 'lit' : ''}`}>shift</span>}
        <span className={`tb-key space ${mode === 'hint' && target === ' ' ? 'lit' : ''}`}>␣</span>
      </div>
    </div>
  );
}
