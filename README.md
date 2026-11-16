# TANGLE: A Daily Knot 🧵
### Reddit’s Game of the Day Hackathon 2026 Submission

> *"Drag the pins to untangle the threads. Leave zero lines crossing."*

**Tangle** is an original daily planar graph puzzle built natively for Reddit using **Devvit Web** (React 19, TypeScript, Tailwind CSS 4, Hono, Devvit Redis, and Web Audio API).

- **App Name / Slug:** `windward-daily` (Active on Developer Platform)
- **App Title for Subreddit & Hackathon:** **Tangle: A Daily Knot**
- **GitHub Repository:** [github.com/sharmao07/tangle-daily](https://github.com/sharmao07/tangle-daily)
- **Developer / Pilot:** u/shaemaondc
- **Devvit App Listing:** [developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
- **Demo Subreddit:** [r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
- **Deployed Version:** `v0.0.6` (Active on `r/windward_daily_dev`)

---

## 🎮 The Core Premise & Mechanics

Tangle is **not a grid game**. It is an organic, tactile planar knot puzzle grounded in Graph Theory:

* **The Knot:** Every day at 00:00 UTC, a new scrambled planar graph unlocks with 6 to 9 brass pins and interconnected silk threads.
* **The Goal:** Untangle the threads until **zero lines cross**.
* **Direct Tactile Drag:** Touch/click and drag any brass pin across the drafting board. As you drag, intersecting threads are calculated in real time using 2D cross-product line intersection math.
* **Tactile Multi-Layer Pins:** Milled outer bezel, metallic cap gradient, center rivet, and an enlarged 32px touch-hit hitbox for zero-miss mobile drag.
* **Real-Time Visual & Auditory Feedback:**
  * **Tension Lines:** Crossed lines appear dashed with warm amber tension and orange intersection nodes.
  * **Cleared Lines:** Uncrossed lines immediately turn solid silver/bone white.
  * **Spark Bursts:** Disentangling an intersection triggers a crisp burst of spark particles.
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
* **Spoiler-Free Reddit Comment Card:** 1-click clipboard copy of formatted results designed for Reddit discussion threads:
  ```
  TANGLE #042 · Daily Knot ⭐⭐⭐
  Solved in 4 moves (Par: 4)
  Crossings: 9 ➔ 0
  Score: 1,400 · Streak: 5 days

  Untangle today on r/windward_daily_dev
  ```
* **Streaks & Records:** Redis persists daily consecutive completions and personal best move records per Reddit username (`u/username`).

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
npm run deploy
```
