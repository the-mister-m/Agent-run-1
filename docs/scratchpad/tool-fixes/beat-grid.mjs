// Jobs 4 and 5 check: step-grid triplet toggle and the beat tool's Clear button, both twins;
// plus a load check of every other page the step grid or keyboard reaches.
// Run from the repo root with  python3 -m http.server 8765  up:
//   node docs/scratchpad/tool-fixes/beat-grid.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
for (const path of ['tools/desktop/beat.html', 'tools/mobile/beat.html']) {
  const errors = [];
  const page = await browser.newPage({ viewport: path.includes('mobile') ? { width: 420, height: 900 } : { width: 1366, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/' + path);
  await page.waitForTimeout(800);
  const read = () => page.evaluate(() => {
    const g = window.cbdawBeat.grid;
    const root = document.querySelector('.cbdaw-grid');
    const p = g.getPattern();
    return {
      laneButtons: root.querySelectorAll('[data-lane-act]').length,
      toggle: root.querySelector('[data-act="triplet"]').getAttribute('aria-pressed'),
      divisions: p.lanes.map((l) => l.division).join(''),
      rulerDivision: g.rulerDivision,
      cellsLane0: root.querySelectorAll('.cbdaw-grid__row[data-lane="0"] .cbdaw-grid__cell').length,
      bars: p.bars,
      stepsOn: p.lanes.reduce((n, l) => n + l.steps.filter(Boolean).length, 0),
      cellsOn: root.querySelectorAll('.cbdaw-grid__cell[data-on="true"]').length,
    };
  });
  const out = { load: await read() };
  await page.click('.cbdaw-grid [data-act="triplet"]');
  out.tripletOn = await read();
  await page.click('.cbdaw-grid [data-act="triplet"]');
  out.tripletOff = await read();
  // a loaded pattern with mixed lane divisions
  await page.evaluate(() => {
    const g = window.cbdawBeat.grid;
    const p = g.getPattern();
    p.lanes[2].division = 3;
    p.lanes[2].steps = new Array(p.bars * 4 * 3).fill(null);
    g.setPattern(p);
  });
  out.mixed = await read();
  await page.click('.cbdaw-grid [data-act="triplet"]');
  out.mixedThenClick = await read();
  // turn steps on by tapping cells, then Clear
  for (const sel of ['.cbdaw-grid__row[data-lane="0"] .cbdaw-grid__cell[data-step="0"]', '.cbdaw-grid__row[data-lane="1"] .cbdaw-grid__cell[data-step="3"]']) {
    await page.click(sel);
  }
  await page.click('.cbdaw-grid__toolbar [data-act="bars+"]');
  out.beforeClear = await read();
  if (!path.includes('mobile')) await page.screenshot({ path: 'docs/scratchpad/tool-fixes/beat-before-clear.png', fullPage: false });
  await page.click('.cbdaw-panel button[title="Turn every step off"]');
  out.afterClear = await read();
  console.log(path, JSON.stringify(out, null, 1));
  console.log('errors:', errors.length ? errors : 'none');
  await page.close();
}

// load checks for the other pages the step grid / keyboard reach
for (const path of ['tools/daw.html', 'tools/desktop/dev-splash.html', 'tools/desktop/sound-lab.html', 'tools/desktop/overtone-synth.html', 'tools/desktop/wave-synth.html', 'tools/desktop/harmony.html']) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/' + path);
  await page.waitForTimeout(1000);
  const seen = await page.evaluate(() => ({
    grids: document.querySelectorAll('.cbdaw-grid').length,
    laneButtons: document.querySelectorAll('[data-lane-act]').length,
    kbds: document.querySelectorAll('.cbdaw-kbd').length,
    kbdButton: document.querySelector('.cbdaw-kbd [data-overlay-button]')?.textContent ?? null,
  }));
  console.log(path, JSON.stringify(seen), 'errors:', errors.length ? errors : 'none');
  await page.close();
}
await browser.close();
