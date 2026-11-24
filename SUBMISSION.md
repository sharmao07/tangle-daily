# Reddit Game of the Day Hackathon 2026 — Official Submission

### Project Title
**Tangle: A Daily Knot**

### Tagline / Elevator Pitch
**Untangle threads. Leave zero lines crossing.**  
A daily planar knot puzzle built natively for Reddit's Developer Platform with real-time computational geometry, tactile physical sound synthesis, and organic subreddit integration.

---

### Project Links & Artifacts
- **App Listing URL:** [developers.reddit.com/apps/tangle-daily](https://developers.reddit.com/apps/tangle-daily)
- **Subreddit Community:** [r/Tangle_daily](https://www.reddit.com/r/Tangle_daily)
- **Live Demo Post:** [Tangle Daily Knot #020 (The Dual Orbit)](https://www.reddit.com/r/Tangle_daily/comments/1y115q3/tangle_daily_knot_020_the_dual_orbit_planar_knot/)
- **Demo Video (37s MP4):** [Direct MP4 Link](https://raw.githubusercontent.com/sharmao07/tangle-daily/main/public/tangle-demo-video.mp4)
- **GitHub Repository:** [github.com/sharmao07/tangle-daily](https://github.com/sharmao07/tangle-daily)
- **Current Installed Version:** `v0.0.8` (Installed on `r/Tangle_daily`)
- **Developer:** u/sharmao07

---

### Inspiration
Most daily games on social platforms rely on tile grids, word banks, or trivia scrapers. We took a different path: **Graph Theory**.

Tangle transforms planar geometry into a satisfying 2-minute daily ritual. Players slide drafting pins across an interactive board to eliminate line crossings until the graph untangles. It offers clean spatial reasoning, immediate tactile feedback, and natural community debate over optimal move sequences.

---

### What It Does
- **Daily Procedural Knots:** Generates a new scrambled planar graph every morning at **00:00 UTC** using a deterministic Mulberry32 PRNG seed derived from the calendar day.
- **Calibrated Weekly Curve:** Schedules difficulty intentionally across the week—approachable 6-pin puzzles on Mondays scaling to intricate 10-pin planar lattices on weekends.
- **Three Topological Archetypes:** Cycles continuously through *Radial Wheels*, *Prismatic Cages*, and *Faceted Gems*.
- **Touch & Pointer Precision:** Implements native pointer capture with generous 32px touch hitboxes. Operates with `touch-action: none` to prevent viewport dragging on mobile screens.
- **Web Audio Physical Synthesis:** Generates all audio procedurally without external audio assets. Features wooden peg tap acoustics, plucked string harmonics, an elastic tension drone (65 Hz–135 Hz), and pentatonic victory chimes.
- **Real-Time Line Geometry:** Evaluates 2D cross-product line intersections at 60 FPS. Highlights crossing threads under amber tension and turns untangled threads solid emerald.
- **Native Reddit Identity:** Integrates authenticated Snoovatar profile avatars (`reddit.getSnoovatarUrl`) across victory scorecards and daily leaderboards.
- **Dynamic Subreddit User Flair:** Upgrades player community flair automatically upon solve via `reddit.setUserFlair` (e.g., `Planar Scholar • 8d Streak`).
- **Community Re-Engagement:** Concludes each session with a single victory card displaying Par efficiency, speedrun time, accolades, and a direct link to r/Tangle_daily for tomorrow's knot.
- **Inclusive Accessibility:** Ships three handcrafted visual themes: *Architectural Graphite*, *Light Parchment*, and *Blueprint Navy*.

---

### How We Built It
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, `@fontsource-variable/geist`.
- **Backend:** Devvit Web server environment, Hono router, Devvit Redis Sorted Sets.
- **Math Engine:** Custom computational geometry engine calculating line segment intersection math via 2D cross-products in $O(E^2)$ time.
- **Devvit Integration:** Configured with tall inline entrypoints (`devvit.json` `"height": "tall"`) so feed posts never collapse, backed by automated Devvit Cron triggers (`0 0 * * *`) for daily 00:00 UTC publishing.

---

### What We Are Proud Of
1. **Zero AI Slop:** Built with restrained editorial design—graphite neutral palette, bespoke geometric vector SVGs, and human-first typography. No cheap neon gradients or emoji-stuffed buttons.
2. **Contextual First-Move Affordance:** Highlights the highest-tension pin with an ambient breathing ring at move 0 instead of forcing players through blocking tutorial dialogues.
3. **Flawless Mobile Viewport:** Fully responsive across 375px mobile screens up to desktop monitors with zero horizontal overflow or feed clipping.
4. **100% Solvability Guarantee:** Every knot embeds a verified planar graph before scrambling, ensuring mathematically proven fair solutions every day.
