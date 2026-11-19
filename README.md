# TANGLE: A Daily Knot 🧵
### Reddit’s Game of the Day Hackathon 2026 Submission

> *"Drag the pins to untangle the threads. Leave zero lines crossing."*

**Tangle** is an original daily planar graph puzzle built natively for Reddit using **Devvit Web** (React 19, TypeScript, Tailwind CSS 4, Hono, Devvit Redis, and Web Audio API).

- **App Name / Slug:** `windward-daily` (Active on Developer Platform)
- **App Title for Subreddit & Hackathon:** **Tangle: A Daily Knot**
- **GitHub Repository:** [github.com/sharmao07/tangle-daily](https://github.com/sharmao07/tangle-daily)
- **Developer / Pilot:** u/shaemaondc
- **Devvit App Listing:** [developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
- **Demo Subreddit:** [r/Tangle_daily](https://www.reddit.com/r/Tangle_daily)
- **Deployed Version:** `v0.0.9` (Active on `r/Tangle_daily`)

---

## 🎮 The Core Premise & Mechanics

Tangle is **not a grid game**. It is an organic, tactile planar knot puzzle grounded in Graph Theory:

* **The Knot:** Every day at 00:00 UTC, a new scrambled planar graph unlocks across three rotating mathematical archetypes:
  * **Radial Wheel ($W_n$):** Center hub connected to an outer polygon rim.
  * **Prismatic Cage ($Y_n$):** Concentric inner and outer rings with radial ladder rungs.
  * **Faceted Gem:** Triangulated convex polygon with fan chords dividing the interior into non-crossing facets.
* **The Goal:** Untangle the threads until **zero lines cross**.
* **Direct Tactile Drag:** Touch/click and drag any brass pin across the drafting board. As you drag, intersecting threads are calculated in real time using 2D cross-product line intersection math.
* **Subreddit Daily Leaderboard:** Powered by Devvit Redis Sorted Sets (`zAdd`, `zRange`), ranking the top 10 daily solvers by algorithmic score, move economy, and solve duration with rank medals (🥇, 🥈, 🥉).
* **Automated Daily Scheduler:** Native Devvit Cron Trigger (`0 0 * * *`) scheduled on app install/upgrade to automatically generate and submit the daily knot puzzle post at 00:00 UTC.
* **Reddit Subreddit User Flair Rewards:** Dynamically awards and upgrades players' subreddit user flairs via `reddit.setUserFlair` based on their topological rank and current daily streak (e.g., `🧵 Knot Apprentice · 3d streak`).
* **Reddit Snoovatar Integration:** Live integration with Reddit's Avatar API (`reddit.getSnoovatarUrl`) rendering players' authentic Reddit Snoovatar icons on both the feed preview card and the daily leaderboard.
* **Weekly Habit Streak Tracker:** Interactive 7-day calendar row displaying current week completion status (completed knots highlighted, remaining days marked) directly in feed previews and post-game stats.
* **Live Speedrun Timer & Par Metrics:** Real-time solve timer with millisecond precision and calibrated par-move benchmarks for each topological archetype.
* **Tactile Multi-Layer Pins:** Milled outer bezel, metallic cap gradient, center rivet, and an enlarged 32px touch-hit hitbox for zero-miss mobile drag.
* **Real-Time Visual & Auditory Feedback:**
  * **Tension Lines:** Crossed lines appear dashed with warm amber tension, active stroke crawling animation, and orange intersection nodes.
  * **Cleared Lines:** Uncrossed lines immediately turn solid silver/bone white.
  * **Spark Bursts & Victory Wave:** Disentangling an intersection triggers a crisp burst of spark particles; solving the puzzle triggers an expanding green victory shockwave.
  * **Tension Hint:** A tactical button highlights the pin connected to the most crossed threads, offering mathematical intuition without spoiling the solution.
  * **Acoustic Feedback:** Procedural Web Audio synthesizer plays a tactile peg lift on grab, soft placement tap on release, ascending pentatonic scale chimes as crossings decrease, and a radiant D Major 9 chord upon full solve.

---

## 🏆 Hackathon Alignment & Unslopped Design

### 1. Completely Unslopped UI Craft
* Built following the CC-BY-4.0 `unslop` design guidelines:
  * Strict **graphite neutral ramp** (`#0e1114`, `#14181c`, `#1c2127`, `#252c34`, `#8a9ba8`, `#eef2f6`).
  * **Zero AI-slop tropes:** No purple gradients, no glowing blobs, no emoji decorations in headings or buttons, no gradient text, no uppercase tracked labels.
  * Clean sentence case typography with `@fontsource-variable/geist`.
  * Responsive viewport budgeting with `touch-action: none` ensuring smooth 60 FPS mobile dragging without page scrolling.
  * Dual input support: zero-latency touch drag + keyboard arrow nudging for accessibility.

### 2. Guaranteed Solvability & Par Moves
* Every daily knot is mathematically generated from a guaranteed planar embedding and scrambled with a deterministic Mulberry32 PRNG seed.
* Includes a **7-Day Past Knots Archive** for practice and replayability.

### 3. Native Reddit Community Integration
* **Community Counter:** Devvit Redis tracks the collective count of knots untangled worldwide today.
* **Topological Ranks & Streaks:** Progression from *Wanderer* $\to$ *Knot Apprentice* $\to$ *Thread Weaver* $\to$ *Planar Scholar* $\to$ *Topology Grandmaster*.
* **Spoiler-Free Reddit Comment Card:** 1-click clipboard copy of formatted results designed for Reddit discussion threads:
  ```
  TANGLE #042 · Daily Knot ⭐⭐⭐
  Rank: Thread Weaver · Streak: 4 days
  Solved in 4 moves (Par: 4) · 0m 38s
  Crossings: 9 ➔ 0 · Score: 1,400

  Untangle today on r/Tangle_daily
  ```

---

## 🛠️ Development & Deployment Commands

```bash
# Type check TypeScript
npm run test:types

# Run ESLint
npm run lint

# Run Unit Tests (Computational geometry & generator tests)
npm run test:unit

# Build Client & Server
npm run build

# Deploy & Upload to Devvit
npx devvit upload
```
