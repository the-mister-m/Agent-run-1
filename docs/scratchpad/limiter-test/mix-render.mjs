// Drives mix-render.html in headless Chromium: lane sets x limiter off / now / old.
// Run from the repo root with a server up:  python3 -m http.server 8766
// then:  node docs/scratchpad/limiter-test/mix-render.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const only = process.argv[2]; // optional: one lane set
for (const lanes of (only ? [only] : ['drum,simple', 'drum,simple,overtone,wave'])) {
  let offRms = null;
  for (const lim of ['off', 'now', 'old']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:8766/docs/scratchpad/limiter-test/mix-render.html?lanes=${lanes}&lim=${lim}`);
    await page.waitForFunction(() => window.result, null, { timeout: 180000 }).catch(() => {});
    const r = await page.evaluate(() => window.result || null);
    // limiter effect: on vs off, per 100 ms window with sound (> -50 dB), in dB
    if (r) {
      if (lim === 'off') offRms = r.rms100;
      else if (offRms) {
        const d = [];
        r.rms100.forEach((x, i) => { const o = offRms[i]; if (o > 0.00316 && x > 0) d.push(20 * Math.log10(x / o)); });
        d.sort((a, b) => a - b);
        r.limEffectDb = { min: +d[0].toFixed(2), median: +d[d.length >> 1].toFixed(2), max: +d[d.length - 1].toFixed(2), windows: d.length };
      }
      delete r.rms100;
    }
    console.log(JSON.stringify(r), errors.length ? 'ERRORS ' + errors.slice(0, 3).join(' | ') : '');
    await page.close();
  }
}
await browser.close();
