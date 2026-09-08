// Region loop + note figures — headed Playwright verification.
import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/reports/loop-figures-shots';
fs.mkdirSync(SHOTS, { recursive: true });

const results = {};

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

  await page.goto('http://localhost:8080/tools/daw.html');
  await page.waitForTimeout(800);

  // (a) add track, assign Simple Synth, make a one-bar region, open it, place four notes
  await page.click('button:has-text("+ TRACK")');
  await page.waitForTimeout(200);
  const laneSelect = page.locator('.cbdaw-arr__lane-instrument').last();
  await laneSelect.selectOption('simple-synth');
  await page.waitForTimeout(200);

  const regionRow = page.locator('.cbdaw-arr__lane-regions').last();
  const rowBox = await regionRow.boundingBox();
  await page.mouse.dblclick(rowBox.x + 20, rowBox.y + rowBox.height / 2);
  await page.waitForTimeout(300);

  // roll pane should now be showing (arrangement 'select' -> showRegion)
  await page.waitForSelector('#dwn-pane-roll .cbdaw-roll__row-cell', { timeout: 5000 });
  const cells = page.locator('#dwn-pane-roll .cbdaw-roll__row-cell');
  const cellCount = await cells.count();
  const cellBoxes = [];
  for (const idx of [2, 5, 8, 11].map((i) => Math.min(i, cellCount - 1))) {
    const box = await cells.nth(idx).boundingBox();
    if (box) { await page.mouse.click(box.x + 2, box.y + 2); cellBoxes.push(idx); }
    await page.waitForTimeout(100);
  }
  results.notesPlacedAt = cellBoxes;
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/01-region-with-notes.png` });

  // read the region id + note count from the store directly
  const afterNotes = await page.evaluate(() => {
    const mod = window.__cbdawDebug;
    return null;
  });

  // pull live state via a small in-page probe using the modules already loaded
  const probe1 = await page.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    const all = regions.all;
    const r = all[all.length - 1];
    return r ? { id: r.id, lengthBars: r.lengthBars, notes: Array.isArray(r.notes) ? r.notes.length : null, loop: r.loop, loopBars: r.loopBars } : null;
  });
  results.probe1_afterFourNotes = probe1;

  // (b) figures appear on the block
  const regionId = probe1.id;
  const regionEl = page.locator(`.cbdaw-arr__region[data-id="${regionId}"]`);
  await regionEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const figureCount = await page.locator(`.cbdaw-arr__region[data-id="${regionId}"] .cbdaw-arr__region-note`).count();
  results.figuresOnBlockBeforeLoop = figureCount;
  await page.screenshot({ path: `${SHOTS}/02-figures-on-block.png` });

  // (c) click loop button, loop on
  const loopBtn = page.locator(`.cbdaw-arr__region[data-id="${regionId}"] .cbdaw-arr__region-loop`);
  const loopBox = await loopBtn.boundingBox();
  await page.mouse.click(loopBox.x + loopBox.width / 2, loopBox.y + loopBox.height / 2);
  await page.waitForTimeout(200);
  const probe2 = await page.evaluate(async (id) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    return r ? { loop: r.loop, loopBars: r.loopBars, lengthBars: r.lengthBars } : null;
  }, regionId);
  results.probe2_afterLoopClick = probe2;
  await page.screenshot({ path: `${SHOTS}/03-loop-on.png` });

  // region did not move from the click — startBar unchanged, checked via probe
  const probe2b = await page.evaluate(async (id) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    return r ? r.startBar : null;
  }, regionId);
  results.startBarAfterLoopClick = probe2b;

  // (d) drag loop handle right two cycles
  const loopBox2 = await loopBtn.boundingBox();
  const barPxProbe = await page.evaluate(() => {
    const el = document.querySelector('.cbdaw-arr__lane-regions');
    return getComputedStyle(document.documentElement).getPropertyValue('--arr-bar-w');
  });
  // measure actual bar width from two region widths is fragile; use ruler cell width instead
  const oneBarWidth = await page.evaluate(() => {
    const probeEl = document.querySelector('.cbdaw-arr__region');
    if (!probeEl) return 60;
    const w = probeEl.getBoundingClientRect().width;
    return w; // this region is currently 1 bar wide (loopBars=1, lengthBars=1)
  });
  await page.mouse.move(loopBox2.x + loopBox2.width / 2, loopBox2.y + loopBox2.height / 2);
  await page.mouse.down();
  await page.mouse.move(loopBox2.x + loopBox2.width / 2 + oneBarWidth * 2 + 4, loopBox2.y + loopBox2.height / 2, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const probe3 = await page.evaluate(async (id) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    return r ? { lengthBars: r.lengthBars, loopBars: r.loopBars, loop: r.loop } : null;
  }, regionId);
  results.probe3_afterLoopDragRight2Cycles = probe3;
  await page.screenshot({ path: `${SHOTS}/04-loop-drag-3bars.png` });

  // (e) end-grip shrink to two bars
  const regionEl2 = page.locator(`.cbdaw-arr__region[data-id="${regionId}"]`);
  const endGrip = regionEl2.locator('.cbdaw-arr__region-edge[data-edge="end"]');
  const gripBox = await endGrip.boundingBox();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2 - oneBarWidth, gripBox.y + gripBox.height / 2, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const probe4 = await page.evaluate(async (id) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    return r ? { lengthBars: r.lengthBars, loopBars: r.loopBars } : null;
  }, regionId);
  results.probe4_afterEndGripShrinkTo2 = probe4;
  await page.screenshot({ path: `${SHOTS}/05-shrink-2bars.png` });

  // (f) end-grip grow a NON-looped region — make a second track/region for this
  await page.click('button:has-text("+ TRACK")');
  await page.waitForTimeout(200);
  const laneSelect2 = page.locator('.cbdaw-arr__lane-instrument').last();
  await laneSelect2.selectOption('simple-synth');
  await page.waitForTimeout(200);
  const regionRow2 = page.locator('.cbdaw-arr__lane-regions').last();
  const rowBox2 = await regionRow2.boundingBox();
  await page.mouse.dblclick(rowBox2.x + 20, rowBox2.y + rowBox2.height / 2);
  await page.waitForTimeout(300);
  const probe5a = await page.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    const all = regions.all;
    const r = all[all.length - 1];
    return r ? { id: r.id, lengthBars: r.lengthBars } : null;
  });
  const region2Id = probe5a.id;
  const region2El = page.locator(`.cbdaw-arr__region[data-id="${region2Id}"]`);
  const endGrip2 = region2El.locator('.cbdaw-arr__region-edge[data-edge="end"]');
  const gripBox2 = await endGrip2.boundingBox();
  await page.mouse.move(gripBox2.x + gripBox2.width / 2, gripBox2.y + gripBox2.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox2.x + gripBox2.width / 2 + oneBarWidth * 2, gripBox2.y + gripBox2.height / 2, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const probe5 = await page.evaluate(async (id) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    return r ? { lengthBars: r.lengthBars, loop: r.loop, notes: r.notes.length } : null;
  }, region2Id);
  results.probe5_nonLoopedGrowBlankBars = probe5;
  await page.screenshot({ path: `${SHOTS}/06-nonloop-grow-blank.png` });

  // (g) FIGURES button cycles and the label changes
  const figBtn = page.locator('#dwn-figures');
  const labels = [];
  for (let i = 0; i < 4; i++) {
    labels.push(await figBtn.textContent());
    await figBtn.click();
    await page.waitForTimeout(150);
  }
  results.figuresButtonLabels = labels;
  await page.screenshot({ path: `${SHOTS}/07-figures-cycle.png` });

  // (h) play from bar 1, count noteOn calls per bar by patching instrument noteOn
  const countProbe = await page.evaluate(async (id) => {
    const { tracks } = await import('/src/core/tracks.js');
    const { clock } = await import('/src/core/clock.js');
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(id);
    const track = tracks.get(r.laneId);
    const counts = [];
    let noteOnCount = 0;
    const inst = track.instrument;
    if (!inst) return { error: 'no instrument on track' };
    const origNoteOn = inst.noteOn.bind(inst);
    inst.noteOn = (...args) => { noteOnCount += 1; return origNoteOn(...args); };
    clock.seek(1, 1, 0);
    clock.play();
    await new Promise((res) => setTimeout(res, 4000));
    clock.stop();
    inst.noteOn = origNoteOn;
    return { noteOnCount };
  }, regionId);
  results.probe6_playbackNoteOnCount = countProbe;
  await page.screenshot({ path: `${SHOTS}/08-playback-done.png` });

  results.pageErrorsMainPage = pageErrors.slice();

  // (3) confirm beat.html and simple-synth.html / wave-synth.html still load clean
  const page2Errors = [];
  const page2 = await browser.newPage();
  page2.on('pageerror', (e) => page2Errors.push(String(e)));
  page2.on('console', (m) => { if (m.type() === 'error') page2Errors.push(m.text()); });
  await page2.goto('http://localhost:8080/tools/desktop/beat.html');
  await page2.waitForTimeout(1000);
  results.beatHtmlLoaded = true;

  const page3Errors = [];
  const page3 = await browser.newPage();
  page3.on('pageerror', (e) => page3Errors.push(String(e)));
  page3.on('console', (m) => { if (m.type() === 'error') page3Errors.push(m.text()); });
  let simpleSynthUrl = 'http://localhost:8080/tools/desktop/simple-synth.html';
  let resp = await page3.goto(simpleSynthUrl).catch(() => null);
  if (!resp || resp.status() >= 400) {
    simpleSynthUrl = 'http://localhost:8080/tools/desktop/wave-synth.html';
    resp = await page3.goto(simpleSynthUrl);
  }
  await page3.waitForTimeout(1000);
  results.simpleSynthUrlUsed = simpleSynthUrl;
  results.page2Errors = page2Errors;
  results.page3Errors = page3Errors;

  fs.writeFileSync('/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/docs/scratchpad/loop-figures/verify-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
