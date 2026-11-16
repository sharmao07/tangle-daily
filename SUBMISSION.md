# Devpost Submission Details
### Reddit’s Game of the Day Hackathon 2026

---

### Project Title
**Windward: A Daily Migration**

### Tagline / Elevator Pitch
*You don’t control the birds. You control the wind. A handcrafted, atmospheric daily routing puzzle built for Reddit's Developer Platform.*

---

### App Links & Submissions Required
* **Reddit Developer App Listing:** [https://developers.reddit.com/apps/windward-daily](https://developers.reddit.com/apps/windward-daily)
* **Subreddit Community & Demo Post:** [https://www.reddit.com/r/windward_daily_dev](https://www.reddit.com/r/windward_daily_dev)
* **Installed Version:** `v0.0.3` (Uploaded and installed in `r/windward_daily_dev`)

---

### Inspiration
Most daily games on social platforms are either word-deduction clones, trivia bots, or repetitive twitch-reaction games. We wanted to design something that felt like a contemplative indie darling—reminiscent of *A Short Hike*, *Monument Valley*, and *Dorfromantik*—distilled into a bite-sized, 3-minute daily ritual that brings the Reddit community together.

The migratory flight of birds is a beautiful natural phenomenon. Birds rely on thermal updrafts and jet streams while avoiding turbulence. In Windward, you don’t tell the flock where to fly; you summon prevailing wind gusts to steer them across a treacherous topographic landscape to safety.

---

### What It Does
* **Daily Topographic Puzzle:** Each day at 00:00 UTC, a new 7×7 flight corridor unlocks for all Reddit players worldwide.
* **Vector Winds & Jet Streams:** Blowing North, South, East, or West moves the flock. Landing in high-altitude jet streams propels the birds along the current's vector across mountain barriers.
* **Risk vs. Reward Hazards:** Storm cells threaten to scatter members of your 5-bird flock, while optional waypoints offer bonus points and 3-star par status for bold navigators.
* **Procedural Soundscape:** Web Audio API delivers responsive acoustic wind sweeps, crystal chord chimes for waypoints, rumble for turbulence, and pentatonic harp victory chords without any downloaded audio assets.
* **Community Migration Ledger:** Uses Devvit Redis to track collective daily totals of birds safely delivered home and community survival rate.
* **Spoiler-Free Reddit Comment Sharing:** One-click copy formats a spoiler-free emoji flight result designed for posting in Reddit discussion threads.
* **Streaks, Records & Archive:** Tracks personal streaks and provides a 7-day flight archive for practice and replayability.

---

### How We Built It
* **Devvit Web Platform:** Built using Reddit's next-generation Devvit Web framework, integrating React 19, TypeScript, and Vite.
* **Hono Backend on Serverless Devvit:** High-performance REST endpoints interfacing directly with Devvit context, Reddit user identity, and Devvit Redis.
* **Mulberry32 PRNG & Seeded Generator:** Guarantees deterministic, globally synchronized daily boards with pathfinding verification ensuring solvability and calibrated par moves.
* **Tailwind CSS 4 & Viewport Budgeting:** Crafted with strict mobile and desktop viewport constraints to ensure no clipping or unsightly scrollbars inside Reddit's feed or webview.
* **Procedural Web Audio API:** Zero external asset latency with custom audio synthesis algorithms for responsive game feedback.

---

### Challenges We Ran Into
* **Balancing Viewport Constraints in Reddit Embeds:** Reddit interactive posts display both in an inline feed view (Splash) and an expanded webview mode. Ensuring the 7×7 board, live HUD, legend, and D-pad controls fit comfortably across varied mobile screens without vertical scroll clutter required meticulous CSS geometry and responsive clamp units.
* **Deterministic Solvability:** Procedural generation had to feel natural and topographic while mathematically guaranteeing that every daily puzzle has at least one valid route to safety without mandatory bird loss.

---

### Accomplishments That We're Proud Of
* **The Atmospheric Vibe:** The parchment-and-slate dark palette, topographic styling, and procedural wind sounds create a genuine sense of calm focus.
* **Zero AI-Slop Craft:** Handcrafted components, typography with `@fontsource-variable/geist`, and tactile micro-interactions.
* **Full Devvit Redis Integration:** Seamless synchronization of community flight stats and user streaks directly to Reddit's persistence layer.

---

### What's Next for Windward
* **Seasonal Migration Passes:** Thematic corridors (Autumn Mountain Passes, Arctic Crossings, Island Archipelagos).
* **Community Level Builder:** Enabling subreddit moderators to design custom weekend corridors for their communities.
* **Subreddit Flair Rewards:** Awarding custom migration flair (e.g. "Flock Captain", "Storm Dodger") for 7-day and 30-day streaks.
