// Job 2 check: cycles the 12-note keyboard's label button and reads key labels.
// Run from the repo root with  python3 -m http.server 8765  up:
//   node docs/scratchpad/tool-fixes/keyboard-labels.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const errors = [];
for (const path of ['tools/desktop/simple-synth.html', 'tools/mobile/simple-synth.html', 'tools/desktop/patch-synth.html', 'tools/desktop/dev-splash.html']) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', (e) => errors.push(path + ': ' + String(e)));
  await page.goto('http://127.0.0.1:8765/' + path);
  await page.waitForTimeout(800);
  const kbd = page.locator('.cbdaw-kbd').first();
  if (!(await kbd.count())) { console.log(path, 'no .cbdaw-kbd on load'); await page.close(); continue; }
  const read = () => page.evaluate(() => {
    const root = document.querySelector('.cbdaw-kbd');
    const btn = root.querySelector('[data-overlay-button]');
    const lab = (pc) => root.querySelector(`.cbdaw-kbd__key[data-pc="${pc}"] .cbdaw-kbd__label`)?.textContent;
    return { overlay: root.dataset.overlay, button: btn ? btn.textContent : null, C: lab(0), Cs: lab(1), E: lab(4), Bb: lab(10),
             seam: !!root.querySelector('.cbdaw-kbd__seam') };
  });
  const states = [await read()];
  const btn = page.locator('.cbdaw-kbd [data-overlay-button]').first();
  if (await btn.count()) {
    for (let i = 0; i < 4; i++) {
      await btn.click();
      states.push(await read());
      if (states.at(-1).overlay === 'both' && path === 'tools/desktop/simple-synth.html') {
        await kbd.screenshot({ path: 'docs/scratchpad/tool-fixes/keyboard-both.png' });
      }
    }
  }
  console.log(path, JSON.stringify(states));
  await page.close();
}
console.log('page errors:', errors.length ? errors : 'none');
await browser.close();
