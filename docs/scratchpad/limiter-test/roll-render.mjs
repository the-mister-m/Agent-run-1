// Drives roll-render.html in headless Chromium for each synth: gain curve, then audio off/now.
// Run from the repo root with a server up:  python3 -m http.server 8766
// then:  node docs/scratchpad/limiter-test/roll-render.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const runs = [];
const offRms = {};
const only = process.argv[2]; // optional: one inst
for (const inst of (only ? [only] : ['simple', 'overtone', 'wave', 'drum'])) {
  runs.push(`inst=${inst}&mode=gain`, `inst=${inst}&mode=audio&lim=off`, `inst=${inst}&mode=audio&lim=now`);
}
for (const qs of runs) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:8766/docs/scratchpad/limiter-test/roll-render.html?${qs}`);
  await page.waitForFunction(() => window.result, null, { timeout: 90000 }).catch(() => {});
  const result = await page.evaluate(() => window.result || null);
  // limiter effect: now vs off, per 100 ms window with sound (> -50 dB), in dB
  if (result && result.rms100) {
    if (result.lim === 'off') offRms[result.inst] = result.rms100;
    else if (offRms[result.inst]) {
      const d = [];
      result.rms100.forEach((r, i) => { const o = offRms[result.inst][i]; if (o > 0.00316 && r > 0) d.push(20 * Math.log10(r / o)); });
      result.limEffectDb = { min: +Math.min(...d).toFixed(2), max: +Math.max(...d).toFixed(2), windows: d.length };
    }
    delete result.rms100;
  }
  console.log(JSON.stringify(result), errors.length ? 'ERRORS ' + errors.slice(0, 3).join(' | ') : '');
  await page.close();
}
await browser.close();
