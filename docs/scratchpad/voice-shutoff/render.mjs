// Drives render.html in headless Chromium for each synth and prints the channel gain stats.
// Run from the repo root with a server up:  python3 -m http.server 8765
// then:  node docs/scratchpad/voice-shutoff/render.mjs
// Playwright is not in this repo; this imports the copy in the local npx cache.
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
for (const synth of ['simple-synth', 'overtone-synth', 'wave-synth']) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:8765/docs/scratchpad/voice-shutoff/render.html?synth=${synth}`);
  await page.waitForFunction(() => window.result, null, { timeout: 20000 }).catch(() => {});
  const result = await page.evaluate(() => window.result || null);
  console.log(JSON.stringify(result), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
  await page.close();
}
await browser.close();
