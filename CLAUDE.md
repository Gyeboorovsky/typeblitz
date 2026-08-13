# TypeBlitz — a game-like touch-typing trainer

## What this repo is

A standalone hobby app that appears as one **tile** on the Gyeboorovsky
portfolio hub (https://gyeboorovsky.github.io/). The hub is a separate repo
(`Gyeboorovsky/Gyeboorovsky.github.io`) that renders a grid of tiles from a
JSON config — it does **not** import or build this app. Apps are fully
independent; the hub just links to this app's live URL with a plain `<a href>`
(no iframes, no shared build).

This repo owns everything about the app. It has no dependency on the hub.

## FIRST-RUN TASK — keep the `io_typeblitz/` handoff folder in sync

**Ensure a folder named `io_typeblitz/` exists at the repo root** (recreate it
any time it's missing). It's the self-contained bundle the portfolio hub needs;
the hub owner drops it into the hub's `APPS/` folder. Keep it in sync whenever
the app's title/description/links/status change. It contains exactly two things:
`app.json` (content metadata, strict JSON) and `grid-thumbnail.png` (~1200×900
cover image; source SVG kept alongside as `thumbnail.svg` — re-rasterize after
editing it).

## What the app does

Typing practice as a game. Five modes: Time Attack (15/30/60 s), Word Sprint
(10/25/50 words), Word Rain (arcade — type falling words, lives/waves/combo),
Zen (endless, untimed; rounds under 30 s / 10 words are discarded), and Quotes.
Gamification: XP + player level, daily streak, 16 achievements, personal
bests, WebAudio sound (synthesized, no assets).
Dashboard: WPM/accuracy trend (inline SVG), per-key error heatmap on a visual
keyboard, 12-week activity calendar, lifetime totals. UI is i18n'd (en/pl);
practice content is English.

## Data & persistence (no backend)

Three localStorage stores, versioned keys, runtime-guarded loads
([storage.ts](src/storage.ts)):

- `typeblitz:settings:v1` → Settings
- `typeblitz:profile:v1` → Profile (xp, streak, achievements, PBs, totals)
- `typeblitz:stats:v1` → StatsLog (per-day stats, last 300 round samples, per-key hit/miss)

Autosave is debounced 400 ms with a beforeunload flush
([usePersistence.ts](src/usePersistence.ts)). `navigator.storage.persist()` is
requested on load. Optional live folder backup via the File System Access API
([localFolder.ts](src/localFolder.ts), Chrome/Edge only): the user picks a
folder once, the app mirrors `typeblitz-data.json` there on every change;
directory handle lives in IndexedDB (`typeblitz-folder`). Manual JSON
export/import is always available in Options. All rounds funnel through
`recordRound` in [App.tsx](src/App.tsx) — the single place stores are updated.

## Key modules

- `src/engine/` — pure typing engine (`typing.ts`), keystroke-capture hook
  (`useTypingRound.ts` — reads a hidden input's `input` events, not keydown, so
  AltGr/dead keys/IMEs work; paste is blocked), text generation (`textGen.ts`).
- `src/game/` — `progression.ts` (XP/streak/achievements), `sound.ts`
  (oscillator synth).
- `src/data/` — English word pools and public-domain quotes.
- `src/components/` — one file per view; `FallingView` runs its own rAF loop
  with all mutable state in a ref (StrictMode-safe).

## Hosting (must respect — this is what keeps it free)

- **GitHub Pages, public repo, static only.** No server code, no secrets.
- **Base path:** deploys to `https://gyeboorovsky.github.io/typeblitz/`, so
  `vite.config.ts` MUST keep `base: '/typeblitz/'` or assets 404. Never
  hardcode absolute asset paths.
- **Deploy** via `.github/workflows/deploy.yml` on push to `main`: build →
  `upload-pages-artifact` → `deploy-pages`. CDN caches ~10 min; hard-refresh
  when verifying.
- Hash routing only if routing is ever added (Pages has no server rewrites);
  currently in-memory view state, no router.

## Design / consistency with the hub

`src/tokens.css` and `src/base.css` are copied verbatim from the hub's
`shared/` folder and imported before `src/styles.css`. All app-specific values
live in the `--tb-*` block at the top of `styles.css`. **Never hardcode a
color** — add or override a token. Responsive from ~360 px phones to desktop.

## Code style

Human-readable, small surface area, zero runtime deps beyond react/react-dom.
`npm run build` runs strict `tsc --noEmit` then vite. Keep this CLAUDE.md lean
and current.

## How this app shows up on the hub

Content → `io_typeblitz/` (above), copied by the hub owner into the hub's
`APPS/`. Presentation → one entry in the hub's `grid-config.json`:

```json
,
    { "name": "typeblitz", "size": "2x1", "accentHue": 45, "accentHue2": 190, "glow": 1 }
```

Do not edit hub files from this repo.
