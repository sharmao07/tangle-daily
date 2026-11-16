# PRISM: Daily Light & Color Synthesis 💎
### Reddit’s Game of the Day Hackathon 2026 Submission

> *"Bend light. Synthesize color. Awaken the ancient crystals."*

**PRISM** is a completely unique, handcrafted daily optical routing and additive color synthesis puzzle built natively for Reddit using **Devvit Web** (React 19, TypeScript, Tailwind CSS 4, Hono, Devvit Redis, and Web Audio API).

- **App Name / Slug:** `windward-daily` (Active on Developer Platform)
- **App Title for Subreddit & Hackathon:** **PRISM: Daily Light Synthesis**
- **Developer / Pilot:** u/shaemaondc
- **Devvit App Listing:** [developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
- **Demo Subreddit:** [r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
- **Deployed Version:** `v0.0.4` (Active on `r/windward_daily_dev`)

---

## 🎮 The Core Premise & Mechanics

Every day at 00:00 UTC, an ancient optical chamber unlocks on Reddit. Laser emitters along the perimeter shoot primary light beams (**Red, Green, Blue**). Dormant crystals on the grid must be energized by specific **synthesized wavelengths**:

* **Primary Beams:** Red (`🔴`), Green (`🟢`), Blue (`🔵`)
* **Secondary Synthesized Wavelengths:**
  * **Violet (Magenta):** Red + Blue (`🟣`)
  * **Amber (Yellow):** Red + Green (`🟡`)
  * **Cyan:** Green + Blue (`🔵`)
* **Tertiary Radiance (White):** Red + Green + Blue (`⚪`)

### How to Play:
1. **Inventory of Mirrors:** You are given 2–4 angle mirrors (`/` and `\`) each day.
2. **Place & Rotate:** Tap a mirror in your inventory, then tap any empty cell on the grid to position it. Tap placed mirrors on the grid to rotate their reflective angle 90° in real time.
3. **Additive Ray Tracing:** Lasers reflect and intersect across the grid with real-time SVG neon glow rendering.
4. **Awaken the Crystals:** When the target crystal receives the required light combination, it pulses with celestial resonance!

---

## 🏆 Hackathon Alignment & Judging Criteria

### 1. Delightful UX & Artisanal Visual Craft
* **Zero AI-slop aesthetic:** Bespoke obsidian chamber styling with glowing neon laser beams, realistic light bloom, and animated beam rings.
* **Procedural Web Audio API:** Zero external audio assets, zero loading latency. Synthesizes tactile mirror rotation clicks, crystal resonance chimes (tuned to D5, E5, G5, A5), and a celestial E Major 9 victory chord. Includes a 1-tap mute toggle.
* **Responsive Viewport Budgeting:** Specifically built to fit cleanly within Reddit's mobile feed and webview without vertical clipping or awkward scrollbars.

### 2. Calibrated Daily Content
* **Deterministic Synchronized Puzzles:** Seeded by calendar day number so all Reddit players experience the exact same puzzle today.
* **Curated Progression:** Handcrafted master chambers for introductory days, followed by calibrated procedural generation.
* **Chamber Archive:** Players can revisit and practice the past 7 daily chambers without waiting 24 hours.

### 3. Native Reddit Community Integration
* **Community Lumens Awakened:** Devvit Redis tracks the collective count of crystals energized worldwide and daily solves.
* **Spoiler-Free Reddit Comment Card:** 1-click clipboard copy of formatted emoji optical results designed for Reddit discussion threads:
  ```
  💎 PRISM #018 ⭐⭐⭐
  Awakened in 2 moves (Par: 2)
  🔴 ➔ 🪞 ➔ 💎 (Magenta)
  Score: 1,500 · Streak: 5 🔥

  Solve today on r/windward_daily_dev!
  ```
* **Streaks & Records:** Redis persists daily consecutive completions, highest streak, and personal best records per Reddit username (`u/username`).

---

## 🛠️ Development & Deployment Commands

```bash
# Type check TypeScript
npm run test:types

# Run ESLint
npm run lint

# Run Unit Tests (Physics & level solver tests)
npm run test:unit

# Build Client & Server
npm run build

# Deploy & Upload to Devvit
npm run deploy
```
