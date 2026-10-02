// Drives master-render.html in headless Chromium: limiter off / now / old, band x1 and x3.
// Run from the repo root with a server up:  python3 -m http.server 8766
// then:  node docs/scratchpad/limiter-test/master-render.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
for (const stack of [1, 3]) {
  for (const lim of ['off', 'now', 'old']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:8766/docs/scratchpad/limiter-test/master-render.html?lim=${lim}&stack=${stack}`);
    await page.waitForFunction(() => window.result, null, { timeout: 60000 }).catch(() => {});
    const result = await page.evaluate(() => window.result || null);
    console.log(JSON.stringify(result), errors.length ? 'ERRORS ' + errors.join(' | ') : '');
    await page.close();
  }
}
await browser.close();
