# Tangle: A Daily Knot

**Untangle threads. Leave zero lines crossing.**  
Tangle is a daily planar graph puzzle running inside Reddit interactive posts via Devvit Web.

[**Play Live on r/Tangle_daily**](https://www.reddit.com/r/Tangle_daily) · [**Devvit App Listing**](https://developers.reddit.com/apps/tangle-daily) · [**Watch 37s Demo Video**](https://raw.githubusercontent.com/sharmao07/tangle-daily/main/public/tangle-demo-video.mp4)

---

## Quick Facts

| Property | Value |
| :--- | :--- |
| **App Slug** | `tangle-daily` |
| **Target Subreddit** | [r/Tangle_daily](https://www.reddit.com/r/Tangle_daily) |
| **Active Version** | `v0.0.8` (Installed & Playtesting) |
| **Tech Stack** | React 19, TypeScript, Vite, Tailwind CSS 4, Hono, Devvit Redis, Web Audio API |
| **Entrypoint** | `game.html` (`height: tall`, responsive 375px mobile to 4K desktop) |
| **Developer** | u/sharmao07 |

---

## The Core Loop

Every calendar day at **00:00 UTC**, a fresh planar knot unlocks for players worldwide.

1. **Touch and drag any drafting pin** to relocate it on the grid.
2. **Watch thread tension in real time:**
   - **Amber dashed lines:** Threads crossing each other.
   - **Emerald solid lines:** Clean paths with zero intersections.
3. **Reach zero crossings** to solve the knot. Solve at or under **Par moves** to earn **3 stars**.

```
TANGLE #024 · Daily Knot ⭐⭐⭐
Rank: Planar Scholar · Streak: 8 days · Daily Rank: #1
Solved in 3 moves (Par: 4) · 0m 18s · Accolades: [Pure Geometry, Swift Hand]
Crossings: 8 ➔ 0 · Score: 1,450

Untangle today on r/Tangle_daily
```

---

## Mathematical Architecture

Every puzzle is **mathematically guaranteed to be planar**. The engine embeds an uncrossed canonical graph, validates planarity with cross-product line intersection math, and scrambles node positions using a deterministic **Mulberry32 PRNG seed** keyed to the day number.

### 1. Rotating Topological Archetypes
- **Radial Wheel ($W_n$):** A central hub anchored to an outer polygonal perimeter with radial spokes.
- **Prismatic Cage ($Y_n$):** Concentric inner and outer rings linked by non-intersecting ladder rungs.
- **Faceted Gem:** A triangulated convex polygon divided by fan chords into distinct planar facets.

### 2. Calibrated 7-Day Difficulty Curve
- **Monday & Tuesday (Accessible):** 6 pins, Par 3–4. Welcoming first-step puzzles.
- **Wednesday & Thursday (Focus):** 7–8 pins, Par 4–5. Balanced mid-week depth.
- **Friday through Sunday (Crucible):** 8–10 pins, Par 6–8. Intricate multi-layer lattices.

---

## Native Reddit Integration

Tangle integrates directly into Reddit’s platform capabilities without relying on gimmicks:

- **Authenticated Snoovatars:** Pulls live avatar URLs via `reddit.getSnoovatarUrl` for player profile badges and daily leaderboard rankings.
- **Dynamic Subreddit User Flair:** Upgrades player flair automatically on victory via `reddit.setUserFlair` (e.g. `Planar Scholar • 8d Streak`).
- **Devvit Redis Sorted Sets:** Powers real-time community leaderboards ranked by score, move count, and solve duration.
- **Daily Automated Scheduler:** A native Devvit Cron trigger (`0 0 * * *`) builds and submits each morning’s puzzle post automatically.
- **Moderator Discussion Thread:** Posts an automated sticky comment on every daily thread detailing par benchmarks and rules, formatted for spoiler-tagged discussion (`>!like this!<`).
- **Community Next-Steps Loop:** The post-game result card provides a direct subscription link to r/Tangle_daily with a countdown to the next midnight unlock.

---

## Sensory Craft & Tactile Web Audio

Zero audio files. Zero asset latency. All sound synthesis runs purely in client-side code via the **Web Audio API**:

- **Tactile Pin Grab & Drop:** Physical sine/triangle wave pulses simulating peg lifts and wooden board taps.
- **Acoustic String Plucks:** Multi-harmonic acoustic resonance triggering on every resolved crossing.
- **Dynamic Tension Drone:** A continuous sub-bass drone (65 Hz to 135 Hz) that pitch-bends upward as lines stretch and line tension increases.
- **Ascending Victory Chime:** Resolving all crossings strikes an expanding pentatonic chord with particle sparks.

### Visual Themes
- **Architectural Graphite (Default):** Deep dark mode with precision blueprint grid lines.
- **Light Parchment:** High-contrast editorial drafting paper for bright environments.
- **Blueprint Navy:** Classic cyan architectural drafting canvas.

---

## Repository Structure

```
├── devvit.json               # Devvit configuration, tall viewport entry, and cron triggers
├── package.json              # Project dependencies and deployment scripts
├── vite.config.ts            # Vite client build pipeline
├── src/
│   ├── client/
│   │   ├── game.tsx          # Main interactive drafting board & UI state machine
│   │   ├── tangle-audio.ts   # Web Audio physical sound synthesizer
│   │   └── index.css         # Unslopped typography, graphite ramp, and animations
│   ├── server/
│   │   ├── index.ts          # Server entrypoint mounting Hono routes
│   │   ├── core/post.ts      # Automated daily post & sticky comment generation
│   │   └── routes/           # REST endpoints (/api/init, /api/complete, /scheduler)
│   └── shared/
│       ├── tangle-engine.ts  # Planar graph generator, 2D cross-product math, daily seeds
│       └── tangle-types.ts   # Shared TypeScript domain contracts
└── public/
    ├── tangle-logo.svg       # Geometric vector knot logo
    ├── tangle-banner.svg     # Clean editorial vector banner
    └── tangle-demo-video.mp4 # 37-second gameplay demo video
```

---

## Local Development & Commands

```bash
# Type check TypeScript codebase
npm run test:types

# Run ESLint (zero-warning strict standard)
npm run lint

# Run Unit Tests (computational geometry, planarity, daily generator)
npm run test:unit

# Build production assets with Vite
npm run build

# Upload latest version to Reddit Dev Platform
npx devvit upload

# Install or upgrade on test subreddit
npx devvit install Tangle_daily tangle-daily@latest
```

---

## License

BSD-3-Clause License. Built for Reddit’s Game of the Day Hackathon 2026.
