import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { getTangleLevelForDay } from '../src/shared/tangle-engine.ts';

const CLIENT_DIR = path.resolve('/Users/ojussharma/windward-daily/dist/client');
const FRAMES_DIR = path.resolve('/Users/ojussharma/windward-daily/record_frames');
const OUTPUT_VIDEO = path.resolve('/Users/ojussharma/windward-daily/public/tangle-demo-video.mp4');
const ARTIFACT_VIDEO = '/Users/ojussharma/.gemini/antigravity/brain/45b70600-d645-4f17-b888-7e5721b8e40f/tangle-demo-video.mp4';

// Clean frames dir
if (fs.existsSync(FRAMES_DIR)) {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}
fs.mkdirSync(FRAMES_DIR, { recursive: true });

// Setup Mock HTTP Server
let activeDay = 24;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  
  if (url.pathname === '/api/init') {
    const level = getTangleLevelForDay(activeDay);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      type: 'tangle_init',
      postId: 'demo_post',
      username: 'sharmao07',
      avatarUrl: '/snoo.png',
      dayNumber: activeDay,
      dateString: 'Nov 24, 2026',
      level,
      communityStats: { totalSolved: 4820, averageMoves: 4 },
      userStats: {
        username: 'sharmao07',
        avatarUrl: '/snoo.png',
        currentStreak: 7,
        maxStreak: 14,
        totalSolved: 21,
        todayCompleted: false,
        rankTitle: 'Planar Scholar',
      },
      leaderboard: [
        { username: 'sharmao07', rank: 1, score: 1450, moves: 3, timeSeconds: 18, rankTitle: 'Planar Scholar', avatarUrl: '/snoo.png' },
        { username: 'topologist_alex', rank: 2, score: 1300, moves: 4, timeSeconds: 24, rankTitle: 'Thread Weaver', avatarUrl: null },
      ],
    }));
  }

  if (url.pathname.startsWith('/api/knot/')) {
    const day = parseInt(url.pathname.split('/').pop() || '1', 10);
    const level = getTangleLevelForDay(day);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'success', dayNumber: day, level }));
  }

  if (url.pathname === '/api/complete') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      type: 'tangle_submitted',
      success: true,
      dayNumber: activeDay,
      newStreak: 8,
      totalKnotsUntangled: 4821,
      shareText: `TANGLE #${activeDay} · Daily Knot ⭐⭐⭐`,
      rankTitle: 'Planar Scholar',
      userDailyRank: 1,
      userFlairAwarded: 'Planar Scholar • 8d Streak',
      leaderboard: [],
    }));
  }

  let filePath = path.join(CLIENT_DIR, url.pathname === '/' ? 'game.html' : url.pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(CLIENT_DIR, 'game.html');
  }

  const ext = path.extname(filePath);
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  };

  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Demo server running on port ${port}`);

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=max'],
    defaultViewport: { width: 900, height: 1050, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/game.html`, { waitUntil: 'networkidle0' });

  // Inject sleek visible cursor overlay
  await page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));">
        <path d="M4 3L18 10L11 12L8 19L4 3Z" fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
      </svg>
      <div id="demo-cursor-ripple"></div>
    `;
    const style = document.createElement('style');
    style.innerHTML = `
      #demo-cursor {
        position: fixed;
        left: 450px;
        top: 500px;
        z-index: 9999999;
        pointer-events: none;
        transition: transform 0.04s linear;
      }
      #demo-cursor-ripple {
        position: absolute;
        left: 4px;
        top: 3px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #38bdf8;
        opacity: 0;
        transform: scale(0.5);
      }
      #demo-cursor.clicking #demo-cursor-ripple {
        animation: cursorClick 0.35s ease-out;
      }
      @keyframes cursorClick {
        0% { transform: scale(0.5); opacity: 1; border-color: #38bdf8; }
        100% { transform: scale(2.8); opacity: 0; border-color: #4ade80; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(cursor);
  });

  let frameCount = 0;
  async function captureFrame(repeats = 1) {
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 90 });
    for (let r = 0; r < repeats; r++) {
      const filename = path.join(FRAMES_DIR, `frame_${String(frameCount).padStart(5, '0')}.jpg`);
      fs.writeFileSync(filename, screenshot);
      frameCount++;
    }
  }

  // Smooth mouse mover & clicker
  let currentMouse = { x: 450, y: 500 };
  async function moveMouse(toX, toY, steps = 16) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = 1 - Math.pow(1 - t, 3);
      const curX = currentMouse.x + (toX - currentMouse.x) * ease;
      const curY = currentMouse.y + (toY - currentMouse.y) * ease;
      
      await page.evaluate((x, y) => {
        const c = document.getElementById('demo-cursor');
        if (c) {
          c.style.left = `${x}px`;
          c.style.top = `${y}px`;
        }
      }, curX, curY);

      await page.mouse.move(curX, curY);
      await captureFrame(1);
    }
    currentMouse = { x: toX, y: toY };
  }

  async function clickMouse() {
    await page.evaluate(() => {
      const c = document.getElementById('demo-cursor');
      if (c) c.classList.add('clicking');
    });
    await captureFrame(3);
    await page.mouse.down();
    await captureFrame(3);
    await page.mouse.up();
    await page.evaluate(() => {
      const c = document.getElementById('demo-cursor');
      if (c) c.classList.remove('clicking');
    });
    await captureFrame(4);
  }

  // ==========================================
  // SCENE 1: Welcome & Onboarding Modal (0s - 7s)
  // ==========================================
  console.log('Scene 1: Onboarding Modal Display');
  await captureFrame(70);

  const continueBtn = await page.$('.continue-play-btn');
  if (continueBtn) {
    const box = await continueBtn.boundingBox();
    if (box) {
      await moveMouse(box.x + box.width / 2, box.y + box.height / 2, 24);
      await clickMouse();
    }
  }
  await captureFrame(45); // Board reveal with breathing cyan beacon

  // Helper to untangle current board
  async function solveCurrentBoard(dayNum) {
    const level = getTangleLevelForDay(dayNum);
    const solMap = new Map();
    for (const sn of (level.solutionNodes || [])) {
      solMap.set(sn.id, sn);
    }

    // Move each displaced pin to its canonical planar position
    const pinsToSolve = level.nodes.map(n => n.id);
    for (const pinId of pinsToSolve) {
      const target = solMap.get(pinId);
      if (!target) continue;

      // Re-read current pin position from DOM
      const pinCurrent = await page.evaluate((id) => {
        const board = document.querySelector('.board-container');
        const pinEl = document.querySelector(`[aria-label="Pin ${id}"]`);
        if (!board || !pinEl) return null;
        const bRect = board.getBoundingClientRect();
        const pRect = pinEl.getBoundingClientRect();
        return {
          boardRect: { left: bRect.left, top: bRect.top, width: bRect.width, height: bRect.height },
          pinX: pRect.left + pRect.width / 2,
          pinY: pRect.top + pRect.height / 2,
        };
      }, pinId);

      if (!pinCurrent) continue;

      const { boardRect, pinX, pinY } = pinCurrent;
      const targetScreenX = boardRect.left + target.x * boardRect.width;
      const targetScreenY = boardRect.top + target.y * boardRect.height;

      const dist = Math.hypot(targetScreenX - pinX, targetScreenY - pinY);
      if (dist > 18) {
        // Move cursor to pin
        await moveMouse(pinX, pinY, 16);
        await page.mouse.down();
        await page.evaluate(() => {
          const c = document.getElementById('demo-cursor');
          if (c) c.classList.add('clicking');
        });
        await captureFrame(3);

        // Smoothly drag pin to target
        const dragSteps = 26;
        for (let s = 1; s <= dragSteps; s++) {
          const t = s / dragSteps;
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const curX = pinX + (targetScreenX - pinX) * ease;
          const curY = pinY + (targetScreenY - pinY) * ease;
          await page.mouse.move(curX, curY);
          await page.evaluate((x, y) => {
            const c = document.getElementById('demo-cursor');
            if (c) {
              c.style.left = `${x}px`;
              c.style.top = `${y}px`;
            }
          }, curX, curY);
          currentMouse = { x: curX, y: curY };
          await captureFrame(1);
        }

        // Release pin
        await page.mouse.up();
        await page.evaluate(() => {
          const c = document.getElementById('demo-cursor');
          if (c) c.classList.remove('clicking');
        });
        await captureFrame(8);
      }
    }
  }

  // ==========================================
  // SCENE 2: Knot #24 (Faceted Gem) (7s - 18s)
  // ==========================================
  console.log('Scene 2: Solving Knot #24 (Faceted Gem)');
  activeDay = 24;
  await solveCurrentBoard(24);

  // Victory celebration hold
  console.log('Victory Celebration #24');
  await captureFrame(70);

  // ==========================================
  // SCENE 3: Knot #23 (Prismatic Cage) (18s - 29s)
  // ==========================================
  console.log('Scene 3: Loading Knot #23 (Prismatic Cage)');
  const archiveBtn = await page.$('button[title="Daily Archives"]');
  if (archiveBtn) {
    const box = await archiveBtn.boundingBox();
    if (box) {
      await moveMouse(box.x + box.width / 2, box.y + box.height / 2, 18);
      await clickMouse();
      await captureFrame(25);

      // Select second item (yesterday's knot)
      const archiveItems = await page.$$('.archive-item');
      if (archiveItems && archiveItems.length > 1) {
        const itemBox = await archiveItems[1].boundingBox();
        if (itemBox) {
          await moveMouse(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, 18);
          await clickMouse();
          await captureFrame(35);
        }
      }
    }
  }

  // Solve Knot #23
  activeDay = 23;
  await solveCurrentBoard(23);
  console.log('Victory Celebration #23');
  await captureFrame(60);

  // ==========================================
  // SCENE 4: Knot #22 (Radial Wheel) (29s - 39s)
  // ==========================================
  console.log('Scene 4: Loading Knot #22 (Radial Wheel)');
  if (archiveBtn) {
    const box = await archiveBtn.boundingBox();
    if (box) {
      await moveMouse(box.x + box.width / 2, box.y + box.height / 2, 18);
      await clickMouse();
      await captureFrame(22);

      const archiveItems = await page.$$('.archive-item');
      if (archiveItems && archiveItems.length > 2) {
        const itemBox = await archiveItems[2].boundingBox();
        if (itemBox) {
          await moveMouse(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2, 18);
          await clickMouse();
          await captureFrame(35);
        }
      }
    }
  }

  // Solve Knot #22
  activeDay = 22;
  await solveCurrentBoard(22);
  console.log('Victory Celebration #22');
  await captureFrame(60);

  // ==========================================
  // SCENE 5: Leaderboard, Themes & Subreddit CTA (39s - 46s)
  // ==========================================
  console.log('Scene 5: Leaderboard Modal');
  const lbBtn = await page.$('button[title="Subreddit Leaderboard"]');
  if (lbBtn) {
    const lbox = await lbBtn.boundingBox();
    if (lbox) {
      await moveMouse(lbox.x + lbox.width / 2, lbox.y + lbox.height / 2, 18);
      await clickMouse();
      await captureFrame(50); // Show leaderboard with Snoovatars & rankings
      const closeBtn = await page.$('.modal-dialog .close-btn');
      if (closeBtn) {
        const cbox = await closeBtn.boundingBox();
        if (cbox) {
          await moveMouse(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2, 14);
          await clickMouse();
          await captureFrame(18);
        }
      }
    }
  }

  console.log('Theme Switching & Subreddit CTA');
  const themeBtn = await page.$('button[title="Switch visual theme"]');
  if (themeBtn) {
    const tbox = await themeBtn.boundingBox();
    if (tbox) {
      await moveMouse(tbox.x + tbox.width / 2, tbox.y + tbox.height / 2, 18);
      await clickMouse(); // Light Parchment
      await captureFrame(40);
      await clickMouse(); // Blueprint Navy
      await captureFrame(40);
      await clickMouse(); // Architectural Graphite
      await captureFrame(25);
    }
  }

  // Hover over Reddit Community CTA button
  const communityLink = await page.$('.community-join-link');
  if (communityLink) {
    const clBox = await communityLink.boundingBox();
    if (clBox) {
      await moveMouse(clBox.x + clBox.width / 2, clBox.y + clBox.height / 2, 20);
      await captureFrame(55);
    }
  }

  await browser.close();
  server.close();

  console.log(`Total captured: ${frameCount} frames (${(frameCount / 30).toFixed(1)} seconds). Encoding MP4 video...`);
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -framerate 30 -i "${FRAMES_DIR}/frame_%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart "${OUTPUT_VIDEO}"`,
    { stdio: 'inherit' }
  );

  // Copy to artifact directory
  fs.copyFileSync(OUTPUT_VIDEO, ARTIFACT_VIDEO);
  console.log(`Video generated successfully at: ${OUTPUT_VIDEO}`);
  console.log(`Artifact video saved at: ${ARTIFACT_VIDEO}`);
});
