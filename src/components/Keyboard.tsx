import type { KeyStat } from '../types';

/** Visual QWERTY keyboard painting lifetime miss ratios (dashboard heatmap). */

const ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '?'],
];

interface Props {
  keys?: Record<string, KeyStat>;
}

export default function Keyboard({ keys }: Props) {
  function heatRatio(k: string): number {
    const s = keys?.[k];
    if (!s || s.hits + s.misses < 5) return 0; // too few samples to judge
    return s.misses / (s.hits + s.misses);
  }

  return (
    <div className="tb-keyboard heat" aria-hidden="true">
      {ROWS.map((row, ri) => (
        <div className="tb-krow" key={ri}>
          {row.map((k) => {
            const heat = heatRatio(k);
            const s = keys?.[k];
            const title =
              s && s.hits + s.misses >= 5
                ? `${k} — ${Math.round(heat * 100)}% miss (${s.misses}/${s.hits + s.misses})`
                : undefined;
            return (
              <span
                key={k}
                title={title}
                className="tb-key"
                style={heat > 0 ? ({ '--heat': heat } as React.CSSProperties) : undefined}
              >
                {k}
              </span>
            );
          })}
        </div>
      ))}
      <div className="tb-krow">
        <span className="tb-key space">␣</span>
      </div>
    </div>
  );
}
