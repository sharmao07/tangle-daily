# Devpost Submission Details
### Reddit’s Game of the Day Hackathon 2026

---

### Project Title
**Tangle: A Daily Knot**

### Tagline / Elevator Pitch
*Drag the pins to untangle the threads. Leave zero lines crossing. A tactile, handcrafted daily planar knot puzzle built natively for Reddit's Developer Platform.*

---

### App Links & Submissions Required
* **GitHub Repository:** [https://github.com/sharmao07/tangle-daily](https://github.com/sharmao07/tangle-daily)
* **Reddit Developer App Listing:** [https://developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
* **Subreddit Community & Demo Post:** [https://www.reddit.com/r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
* **Installed Version:** `v0.0.8` (Active on `r/windward_daily_dev`)

---

### Inspiration
Most daily games are grid-based clones, word guessers, or trivia apps. We wanted to move completely away from 2D grids and create a tactile, organic spatial puzzle based on planar graph theory.

Tangle draws inspiration from classic string-and-pin physical puzzles. It offers a calm, focused 2-minute mental ritual: you are presented with an intricately tangled web of pins and threads, and by strategically repositioning the pins, you untangle the network until no lines intersect.

---

### What It Does
* **Daily Planar Knot:** Every calendar day at 00:00 UTC, a fresh scrambled planar knot unlocks for all Reddit players worldwide, cycling through three mathematical archetypes: Radial Wheel, Prismatic Cage, and Faceted Gem.
* **Direct Tactile Drag-and-Drop:** Intuitive pointer controls with pointer capture: grab any brass pin with finger or mouse, drag it across the board, and watch the lines flex and uncross in real time at 60 FPS.
* **Enlarged Touch Hitboxes:** Pins feature 32px touch hitboxes with `touch-action: none` to guarantee zero-miss dragging on mobile Reddit webviews without triggering page scrolling.
* **Real-Time Cross-Product Geometry:** Computes line intersections in real time. Crossed lines show warm dashed amber tension with crawling stress animations; cleared lines snap to solid bone silver.
* **Spark Particle Bursts & Victory Shockwave:** Disentangling an intersection triggers a delightful burst of spark particles; solving triggers an expanding green victory shockwave.
* **Mathematical Tension Hint:** Highlights the pin connected to the greatest number of crossing threads, offering intuition without spoiling the solution.
* **Procedural Soundscape:** Web Audio API delivers quiet wooden peg clicks on grab/drop, ascending pentatonic scale chimes as intersections decrease, and a radiant D Major 9 chord on zero crossings without downloading external sound assets.
* **Subreddit Daily Leaderboard:** Powered by Devvit Redis Sorted Sets (`zAdd`, `zRange`), ranking the top 10 daily solvers across the subreddit by algorithmic score, move economy, and speedrun time with rank medals (🥇, 🥈, 🥉).
* **Reddit Snoovatar Integration:** Uses Reddit's Avatar API (`reddit.getSnoovatarUrl`) to display real Snoovatar avatars on both the feed post preview and the in-game community leaderboard.
* **Weekly Habit Streak Tracker:** Visual 7-day strip tracking the player's daily solves across Monday through Sunday.
* **Live Speedrun Timer:** Real-time solving timer with second/millisecond accuracy and calibrated par-move benchmarks.
* **Community Ledger & Streaks:** Uses Devvit Redis to track collective daily totals of knots untangled by the Reddit community, alongside player streaks and topological ranks (*Wanderer* to *Topology Grandmaster*).
* **Spoiler-Free Reddit Comment Sharing:** One-click copy formats a clean result with rank, moves, par, time, crossings, and score designed for posting in Reddit discussion threads.
* **Streaks, Records & Archive:** Tracks personal streaks and provides a 7-day archive for practice and replayability.

---

### How We Built It
* **Devvit Web Platform:** Built using Reddit's Devvit Web framework with React 19, TypeScript, Vite, and Tailwind CSS 4.
* **Hono Backend on Serverless Devvit:** High-performance REST endpoints interfacing directly with Devvit context, Reddit user identity, and Devvit Redis.
* **Planar Graph Theory Engine:** Mathematical generation guaranteeing that every puzzle is planar (proven to have a 0-crossing solution across Radial, Prismatic, and Faceted families), then scrambled using a deterministic Mulberry32 PRNG seed.
* **Unslopped UI System:** Built adhering to the CC-BY-4.0 `unslop` design guidelines—quiet graphite neutral ramp, 4px grid spacing, sentence case typography, zero emoji decoration in chrome, and zero purple/glowing gradients.
* **Touch-Action None & Pointer Capture:** Eliminates touch latency and prevents page scrolling while dragging on mobile Reddit webviews.
* **Accessibility:** Full keyboard arrow navigation to nudge pins and Tab focus cycling.

---

### Accomplishments That We're Proud Of
* **Not a Grid Game:** Completely breaks away from generic 2D grid/tile tropes with an organic, tactile graph puzzle.
* **Controls That Just Work:** Native pointer capture and touch-action optimization ensure seamless dragging on iOS, Android, and desktop.
* **Zero AI-Slop Aesthetics:** Restrained, editorial, drafting-table art direction.
* **100% Tested & Deployed:** Full unit test coverage for computational geometry, clean linting, and live deployment on Reddit.
