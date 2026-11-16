# Devpost Submission Details
### Reddit’s Game of the Day Hackathon 2026

---

### Project Title
**PRISM: Daily Light & Color Synthesis**

### Tagline / Elevator Pitch
*Bend light. Synthesize color. Awaken the ancient crystals. A handcrafted, atmospheric daily optical puzzle built natively for Reddit's Developer Platform.*

---

### App Links & Submissions Required
* **Reddit Developer App Listing:** [https://developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
* **Subreddit Community & Demo Post:** [https://www.reddit.com/r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
* **Installed Version:** `v0.0.4` (Active on `r/windward_daily_dev`)

---

### Inspiration
Most daily games on social platforms are word-guessing clones, trivia bots, or repetitive twitch-reaction games. We set out to design an experience that is immediately intuitive without words, visually arresting the moment you open it, and grounded in the tactile physics of light reflection and additive color theory.

PRISM turns additive color synthesis (Red + Blue = Violet, Red + Green = Amber, Green + Blue = Cyan, R+G+B = White) into a spatial deduction puzzle. It gives Reddit players a bite-sized, 2-minute daily mental ritual that feels both intellectually rewarding and calm.

---

### What It Does
* **Daily Optical Chamber:** Every calendar day at 00:00 UTC, a new 5×5 optical chamber unlocks for all Reddit players worldwide.
* **Laser Ray Tracing:** Emitters along the border fire primary laser beams. Real-time SVG ray tracing renders glowing neon beams with multi-layered optical bloom.
* **Movable Angle Mirrors:** Players position and rotate 90° angle mirrors to route beams around obsidian barriers.
* **Additive Color Mixing:** When different colored laser beams intersect and strike a dormant crystal, their wavelengths combine. Awakening all target crystals with their exact requested frequencies solves the chamber.
* **Procedural Soundscape:** Web Audio API delivers responsive acoustic clicks on mirror turns, resonant glass overtone chimes for crystal activation, and a celestial E-Major-9 victory chord without external audio downloads.
* **Community Lumens Ledger:** Uses Devvit Redis to track collective daily totals of crystals awakened by the Reddit community.
* **Spoiler-Free Reddit Comment Sharing:** One-click copy formats a spoiler-free emoji flight result designed for posting in Reddit discussion threads.
* **Streaks, Records & Archive:** Tracks personal streaks and provides a 7-day chamber archive for practice and replayability.

---

### How We Built It
* **Devvit Web Platform:** Built using Reddit's Devvit Web framework with React 19, TypeScript, Vite, and Tailwind CSS 4.
* **Hono Backend on Serverless Devvit:** High-performance REST endpoints interfacing directly with Devvit context, Reddit user identity, and Devvit Redis.
* **Custom Optical Ray Tracing Algorithm:** Deterministic ray-tracing simulation in pure TypeScript that computes reflections, color intersections, and crystal excitation in <1ms.
* **Tailwind CSS 4 & Viewport Budgeting:** Crafted with strict mobile and desktop viewport constraints to ensure no clipping or unsightly scrollbars inside Reddit's feed or webview.
* **Procedural Web Audio API:** Zero external asset latency with custom audio synthesis algorithms for responsive game feedback.

---

### Accomplishments That We're Proud Of
* **Instant Comprehension:** Zero text walls. Within 5 seconds of placing their first mirror, any player understands how to route and mix light.
* **Visual Craft:** The obsidian chamber, glowing lasers, pulsing crystal gems, and animated beam rings look designed and polished, avoiding generic AI-slop templates.
* **Rock-Solid Devvit Deployment:** Fully verified with unit tests, ESLint, and TypeScript strict mode, running live on Reddit.
