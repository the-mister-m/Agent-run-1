// L6 diagnostic — why the region dblclick did not open an editor, and what capture commits.

const { chromium } = require('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright');

const BASE = 'http://localhost:8080';
const out = { errors: [] };

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(m.text()); });
  page.on('pageerror', (e) => out.errors.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}/tools/daw.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cbdaw-arr__toolbar button')]
      .find((x) => /track/i.test(x.textContent || ''));
    b.click();
  });
  await page.waitForTimeout(200);
  await page.locator('select.cbdaw-arr__lane-instrument').last().selectOption('wave-synth');
  await page.waitForTimeout(250);

  out.trackKind = await page.evaluate(() => window.dwn.tracks.all.at(-1)?.kind);

  // probes: arrangement 'open', capture 'commit'
  await page.evaluate(() => {
    window.__d = { open: 0, commits: [] };
    window.dwn.arrangement.on('open', () => { window.__d.open++; });
    for (const lane of window.dwn.arrangement.lanes) {
      lane.capture.on('commit', (r) => {
        window.__d.commits.push({ kind: r.kind, noteCount: r.noteCount, dropped: r.dropped });
      });
    }
  });

  const box = await page.locator('.cbdaw-arr__lane-regions').first().boundingBox();
  await page.mouse.dblclick(box.x + 500, box.y + box.height / 2);
  await page.waitForTimeout(200);
  out.regionMade = await page.evaluate(async () =>
    (await import('/src/core/regions.js')).regions.all.map((r) => r.id));

  const id = out.regionMade[0];

  // A: playwright dblclick on the region element
  await page.locator(`.cbdaw-arr__region[data-id="${id}"]`).first().dblclick();
  await page.waitForTimeout(250);
  out.A = await page.evaluate(() => ({
    open: window.__d.open,
    editorHost: Boolean(document.querySelector('div[style*="9999"]')),
    sameNode: Boolean(document.querySelector('.cbdaw-arr__region')),
  }));

  // B: two clicks, hand-paced, on the region's own coordinates
  const rbox = await page.locator(`.cbdaw-arr__region[data-id="${id}"]`).first().boundingBox();
  const cx = rbox.x + rbox.width / 2;
  const cy = rbox.y + rbox.height / 2;
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(80);
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(250);
  out.B = await page.evaluate(() => ({
    open: window.__d.open,
    editorHost: Boolean(document.querySelector('div[style*="9999"]')),
  }));

  // does a click on a region replace the region node?
  out.nodeReplaced = await page.evaluate(async (rid) => {
    const sel = `.cbdaw-arr__region[data-id="${rid}"]`;
    const before = document.querySelector(sel);
    before.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));
    await new Promise((r) => setTimeout(r, 100));
    return document.querySelector(sel) !== before;
  }, id);

  // C: the event the page actually listens for
  await page.evaluate(async (rid) => {
    const { regions } = await import('/src/core/regions.js');
    window.dwn.arrangement._emit('open', regions.get(rid));
  }, id);
  await page.waitForTimeout(250);
  out.C = await page.evaluate(() => ({
    open: window.__d.open,
    editorHost: Boolean(document.querySelector('div[style*="9999"]')),
  }));

  // record a take with the editor open and see what capture reports
  await page.evaluate(async () => {
    const btns = [...document.querySelectorAll('.cbdaw-arr__arm')];
    btns[btns.length - 1]?.click();
  });
  await page.waitForTimeout(150);
  out.armed = await page.evaluate(() => window.dwn.tracks.all.at(-1)?.armed);

  await page.evaluate(async () => {
    const { input } = await import('/src/core/input.js');
    const clock = window.dwn.clock;
    clock.seek(1);
    clock.record();
    const barMs = (60 / clock.bpm) * clock.timeSignature.top * 1000;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const n of [60, 64, 67]) {
      await wait(barMs / 2);
      input.emitNoteOn({ note: n, velocity: 0.8, source: 'midi' });
      await wait(80);
      input.emitNoteOff({ note: n, source: 'midi' });
    }
    await wait(300);
    clock.stop();
  });
  await page.waitForTimeout(400);
  out.commits = await page.evaluate(() => window.__d.commits);
  out.regionsAfter = await page.evaluate(async () =>
    (await import('/src/core/regions.js')).regions.all.map(
      (r) => ({ id: r.id, notes: Array.isArray(r.notes) ? r.notes.length : 'pattern' })));

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  out.errors.push(`FATAL: ${e.stack}`);
  console.log(JSON.stringify(out, null, 2));
});
