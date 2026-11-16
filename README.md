# WINDWARD: A Daily Migration 🕊️
### Reddit’s Game of the Day Hackathon Submission

> *"You don't control the birds. You control the wind."*

**Windward** is a contemplative, handcrafted daily routing puzzle designed natively for Reddit using **Devvit Web** (React 19, TypeScript, Tailwind CSS 4, Hono, Devvit Redis, and Web Audio API).

- **App Name:** `windward-daily`
- **Owner / Developer:** u/shaemaondc
- **Devvit App Listing:** [developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
- **Demo Subreddit:** [r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
- **Tech Stack:** Devvit Web, React 19, Hono, Tailwind CSS 4, Devvit Redis, Web Audio API

---

## 🎮 The Premise & Gameplay

Every calendar day, a unique migratory flight corridor opens across a 7×7 topographic grid. Players direct prevailing wind gusts (**North, South, East, West**) to steer a vulnerable flock of 5 birds across mountainous barriers and dangerous turbulence toward their northern sanctuary nest.

### Key Elements:
* **The Flock (`🕊️`):** Starts with 5 birds. Your mission is to bring as many home safely as possible.
* **Wind Gusts (`💨`):** Limited gust budget per flight. Efficient routing is rewarded.
* **Jet Streams (`↗`):** High-altitude currents that glide the flock an extra tile along their vector without spending an extra gust.
* **Storm Cells (`ϟ`):** Severe low-pressure hazards that scatter 1 bird from the flock upon impact.
* **Waypoints (`✧`):** Optional resting sanctuaries. Reaching both waypoints awards bonus points and 3-star par status.
* **Sanctuary Nest (`⌂`):** The final destination tile. Reaching it completes the day's flight!
* **Mountains (`◆`):** Impassable terrain ridges that block the wind.

---

## 🏆 Hackathon Alignment & Judging Criteria

### 1. Delightful UX & Artisanal Visual Craft
* **Zero AI-slop aesthetic:** Handcrafted cartographic dark-sky palette, responsive viewport budgeting (zero clipping or awkward scrollbars on mobile or desktop feeds).
* **Bespoke procedural sound design:** Built entirely with the Web Audio API—zero external audio assets, zero network latency. Includes gentle wind whooshes, crystal chord chimes for waypoints, thunder rumbles for storm cells, and pentatonic harp victory arpeggios. Includes 1-tap mute toggle.
* **Intuitive Controls:** On-screen D-Pad, direct click/tap on adjacent board tiles, WASD and Arrow key keyboard shortcuts, and full **Undo Gust** (`Ctrl+Z`) support.

### 2. Daily Content & Procedural Generator
* **Deterministic Synchronized Puzzles:** Powered by a seeded Mulberry32 PRNG tied to the UTC calendar day number. Every player across Reddit encounters the exact same migration corridor each day.
* **Guaranteed Solvability:** Automated pathfinding validation calculates par moves and allocates calibrated gust budgets.
* **Flight Archive:** Players can revisit and practice the past 7 daily flights without waiting 24 hours.

### 3. Native Reddit Community Integration
* **Community Migration Ledger:** Devvit Redis tracks the collective total of birds safely guided home each day and community survival rate.
* **Spoiler-Free Reddit Comment Card:** 1-click clipboard copy of formatted emoji flight results designed to spark lively subreddit discussion without giving away puzzle solutions:
  ```
  🕊️ WINDWARD #042 ⭐⭐⭐
  5/5 flock saved · 2/2 waypoints
  4 gusts left (6 moves) · Score: 1,300

  🟩 ↗ 🟩 ✧ 🟩 ⌂

  Fly today on r/windward_daily_dev!
  ```
* **Streaks & Records:** Redis persists daily consecutive completions, highest streak, and personal best records per Reddit username (`u/username`).

---

## 🛠️ Development & Deployment Commands

```bash
# Type check TypeScript
npm run test:types

# Run ESLint
npm run lint

# Run Unit Tests (Seeded generator tests)
npm run test:unit

# Build Client & Server
npm run build

# Deploy & Upload to Devvit
npm run deploy

# Start local Devvit playtest session
npm run dev
```

---

## 📜 Devpost Hackathon Submission Copy

- **Submission Title:** Windward: A Daily Migration
- **Short Pitch:** An atmospheric daily weather-routing puzzle for Reddit. You don't control the birds—you control the prevailing wind.
- **Subreddit:** `r/windward_daily_dev`
- **App Listing:** `https://developers.reddit.com/apps/windward-daily`
