# Tangle: Developer & Agent Guide

Guidelines for AI agents and developers working on the Tangle codebase.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, `@fontsource-variable/geist`
- **Backend:** Node.js serverless runtime on Reddit Devvit Web, Hono
- **Storage:** Devvit Redis (Sorted Sets for leaderboards, string keys for user stats/streaks)
- **Audio:** Web Audio API (procedural real-time physical synthesis)

## Project Structure

- `/src/client`: Frontend application rendered inside an iframe on reddit.com
  - `game.html`: Main React entrypoint (configured with `"height": "tall"` in `devvit.json`)
  - `game.tsx`: Core game canvas, pointer capture, drag logic, and modal dialogs
  - `tangle-audio.ts`: Web Audio procedural synthesizer (pin taps, plucks, tension drone)
  - `index.css`: Unslopped design system (graphite ramp, themes, responsive layout)
- `/src/server`: Backend code executed in Devvit's serverless environment
  - `index.ts`: Hono HTTP server mounting `/api` and `/internal` routes
  - `core/post.ts`: Automated daily post creation and sticky moderator comment formatting
  - `routes/api.ts`: `/api/init` and `/api/complete` handling Redis state and Reddit user flairs
  - `routes/scheduler.ts`: Cron handler for daily midnight posts (`0 0 * * *`)
  - `routes/menu.ts`: Moderator menu action to manually trigger daily posts
- `/src/shared`: Shared TypeScript code between client and server
  - `tangle-engine.ts`: 2D cross-product line intersection math, planar graph generation, daily PRNG seeds
  - `tangle-types.ts`: Graph data structures and API contract interfaces

## Core Rules & Constraints

1. **Anti-AI Slop Design:**
   - Adhere strictly to the graphite neutral ramp (`#0b0e14` to `#eef2f6`).
   - Do NOT introduce emoji decorations into UI chrome, buttons, or accolades. Use clean inline SVG icons.
   - Maintain sentence case typography.
2. **Reddit Integration:**
   - Use `navigateTo` from `@devvit/web/client` rather than `window.location`.
   - Never use blocking `window.alert`; use toast notifications (`showToast`).
   - All Reddit API operations (`reddit.getSnoovatarUrl`, `reddit.setUserFlair`) must be guarded with try/catch to prevent unauthenticated fallback crashes.
3. **Viewport Budgeting:**
   - All interactive layouts must fit 375px mobile viewports without horizontal clipping.
   - Canvas interactions must use `touch-action: none` to prevent mobile swipe interference.

## Verification Commands

```bash
npm run test:types   # Type check
npm run lint         # ESLint validation
npm run test:unit    # Unit tests
npm run build        # Vite production build
```
