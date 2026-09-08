// L6 — proves the §3 destination path by opening a take on the lane's own Capture,
// and takes the dev-splash Master shot the rail hides behind a closed group.

const { chromium } = require('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = path.join(ROOT, 'docs/reports/L6-shots');
const BASE = 'http://localhost:8080';
const out = { errors: [] };

const shot = (n) => path.join(SHOTS, n);

// opens a take on every lane Capture, plays notes through `input`, stops the transport
async function takeThrough(page, notes) {
  return page.evaluate(async (ns) => {
    const { input } = await import('/src/core/input.js');
    const clock = window.dwn.clock;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    clock.seek(1);
    clock.record();
    for (const lane of window.dwn.arrangement.lanes) lane.capture.record();
    const barMs = (60 / clock.bpm) * clock.timeSignature.top * 1000;
    for (const n of ns) {
      await wait(barMs / 2);
      input.emitNoteOn({ note: n, velocity: 0.8, source: 'midi' });
      await wait(90);
      input.emitNoteOff({ note: n, source: 'midi' });
    }
    await wait(300);
    const barAtStop = clock.position.bar;
    clock.stop();
    await wait(200);
    return barAtStop;
  }, notes);
}

const snapshot = (page) => page.evaluate(async () => {
  const { regions } = await import('/src/core/regions.js');
  return regions.all.map((r) => ({
    id: r.id, lane: r.laneId, startBar: r.startBar, len: r.lengthBars,
    notes: Array.isArray(r.notes) ? r.notes.length : 'pattern',
  }));
});

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  // ---- §3 on daw.html ---------------------------------------------------------------
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctxA.newPage();
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push(`[daw] ${m.text()}`); });
  page.on('pageerror', (e) => out.errors.push(`[daw] pageerror: ${e.message}`));
  await page.goto(`${BASE}/tools/daw.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    [...document.querySelectorAll('.cbdaw-arr__toolbar button')]
      .find((x) => /track/i.test(x.textContent || ''))?.click();
  });
  await page.waitForTimeout(250);
  await page.locator('select.cbdaw-arr__lane-instrument').last().selectOption('wave-synth');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.cbdaw-arr__arm')];
    b[b.length - 1]?.click();
  });
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    window.__c = [];
    for (const lane of window.dwn.arrangement.lanes) {
      lane.capture.on('commit', (r) => window.__c.push({ kind: r.kind, noteCount: r.noteCount }));
    }
  });

  // A — no editor open, no region anywhere: expect one new region at the playhead bar
  out.before_A = await snapshot(page);
  out.barAtStop_A = await takeThrough(page, [60, 64, 67]);
  await page.waitForTimeout(400);
  out.after_A = await snapshot(page);
  out.commits_A = await page.evaluate(() => window.__c);
  await page.screenshot({ path: shot('13-s3-no-editor.png') });

  // B — same lane, take again with the transport landing on the same bar: expect the
  // existing region to take the notes, not a second region
  out.barAtStop_B = await takeThrough(page, [72, 74]);
  await page.waitForTimeout(400);
  out.after_B = await snapshot(page);
  await page.screenshot({ path: shot('14-s3-same-region.png') });

  // C — an editor open on a different region: expect the editor's region to take them
  const madeId = await page.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    const lane = window.dwn.tracks.all[0].id;
    const r = regions.add({ laneId: lane, startBar: 9, lengthBars: 1, name: 'editor target' });
    window.dwn.arrangement._emit('open', r);
    return r ? r.id : null;
  });
  await page.waitForTimeout(400);
  out.editorRegion = madeId;
  out.editorOpen_C = await page.evaluate(
    () => Boolean(document.querySelector('div[style*="9999"]')),
  );
  await page.screenshot({ path: shot('15-s3-editor-open.png') });
  out.barAtStop_C = await takeThrough(page, [55, 57]);
  await page.waitForTimeout(400);
  out.after_C = await snapshot(page);
  await page.evaluate(() => {
    [...document.querySelectorAll('div[style*="9999"] button')]
      .find((b) => b.textContent.trim() === 'CLOSE')?.click();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('16-s3-after-editor.png') });
  out.after_C_closed = await snapshot(page);

  await page.waitForTimeout(3000);
  await ctxA.close();

  // ---- dev-splash Master ------------------------------------------------------------
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctxB.newPage();
  p2.on('console', (m) => { if (m.type() === 'error') out.errors.push(`[dev-splash] ${m.text()}`); });
  p2.on('pageerror', (e) => out.errors.push(`[dev-splash] pageerror: ${e.message}`));
  await p2.goto(`${BASE}/tools/desktop/dev-splash.html`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(900);

  out.railDump = await p2.evaluate(() =>
    [...document.querySelectorAll('#dsp-rail button')]
      .slice(0, 30).map((b) => `${b.className}|${(b.textContent || '').trim().slice(0, 24)}`));

  out.groupClick = await p2.evaluate(() => {
    const hit = [...document.querySelectorAll('#dsp-rail button, #dsp-rail [role="button"], .dsp-rail__group > *')]
      .find((e) => /MIXER/i.test((e.textContent || '').slice(0, 40)));
    if (!hit) return 'no MIXER group control';
    hit.click();
    return `clicked ${hit.className || hit.tagName}`;
  });
  await p2.waitForTimeout(800);

  out.masterPick = await p2.evaluate(() => {
    const b = [...document.querySelectorAll('.dsp-rail__item')]
      .find((x) => x.dataset.pieceId === 'strip' && x.dataset.channel === 'master');
    if (!b) return 'no master strip rail item';
    b.click();
    return 'clicked Strip / master';
  });
  await p2.waitForTimeout(1200);

  out.devSplashMasterCount = await p2.locator('.cbdaw-strip--master').count();
  if (out.devSplashMasterCount) {
    await p2.locator('.cbdaw-strip--master').first()
      .screenshot({ path: shot('06-master-devsplash-after.png') });
  } else {
    await p2.screenshot({ path: shot('06-master-devsplash-after.png') });
  }
  await p2.waitForTimeout(3000);
  await ctxB.close();

  await browser.close();
  fs.writeFileSync(path.join(ROOT, 'docs/scratchpad/L6/verify-s3.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  out.errors.push(`FATAL: ${e.stack}`);
  console.log(JSON.stringify(out, null, 2));
});
