# TypeBlitz ⚡

A game-like touch-typing trainer that runs entirely in your browser.
**Live:** https://gyeboorovsky.github.io/typeblitz/

## Modes

- **Time Attack** — 15/30/60 seconds against the clock.
- **Word Sprint** — race through 10/25/50 words.
- **Word Rain** — arcade: type falling words before they hit the ground; lives, waves, combo multiplier.
- **Zen** — endless, no timer.
- **Quotes** — real quotes with capitals and punctuation.
- **Career** — 31 structured lessons from the home row to a final boss, with 0–3 stars and unlocks.

Plus XP and player levels, a daily streak, 18 achievements, personal bests,
synthesized sound effects, and a stats dashboard (WPM trend, per-key error
heatmap, practice calendar). UI in English and Polish.

## Your data

Everything is saved automatically in your browser (localStorage) — no account,
no server, no database. To make it survive for years:

- The app asks the browser for *persistent storage* so it won't be evicted.
- In Chrome/Edge you can pick a **backup folder** in Options; the app then
  keeps a live `typeblitz-data.json` copy there on every change.
- You can always **export/import** your data as JSON from Options.

Honest caveat: browsers can still clear site data (e.g. clearing history, or
storage pressure in incognito). If your progress matters to you, set up the
folder backup or export occasionally.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/typeblitz/
npm run build    # strict typecheck + production build to dist/
```

React 19 + Vite 7 + TypeScript, no other runtime dependencies. Deployed to
GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.
