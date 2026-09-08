// Sequence roll — headed verification, part A: pane, per-bar counts, resize, loop, pads, swap.
import { chromium } from '/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.mjs';
import fs from 'fs';

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = `${ROOT}/docs/reports/sequence-roll-shots`;
fs.mkdirSync(SHOTS, { recursive: true });

const out = {};
const errs = [];

const installProbe = (trackId) => {
  const rig = window.dwn;
  const inst = rig.shell.instruments.get(trackId);
  window.__hits = [];
  if (!window.__map) window.__map = [];
  if (!window.__mapSub) {
    window.__mapSub = (p) => window.__map.push({ t: p.timeOf(p.fromTick), tick: p.fromTick, spt: p.secPerTick });
    rig.clock.on('tick', window.__mapSub);
  }
  if (inst && !inst.__patched) {
    const orig = inst.noteOn.bind(inst);
    inst.noteOn = (note, vel, at) => { window.__hits.push({ note, at }); return orig(note, vel, at); };
    inst.__patched = true;
  }
  return { found: Boolean(inst), pieces: inst?.constructor?.pieces?.length ?? null };
};

const readHits = () => {
  const tpb = 480 * 4;
  const perBar = {};
  for (const h of window.__hits) {
    let seg = null;
    for (const m of window.__map) if (m.t <= h.at + 1e-6) seg = m;
    if (!seg) { perBar.unmapped = (perBar.unmapped || 0) + 1; continue; }
    const tick = seg.tick + (h.at - seg.t) / seg.spt;
    const bar = Math.floor(Math.round(tick) / tpb) + 1;
    perBar[bar] = (perBar[bar] || 0) + 1;
  }
  return { perBar, total: window.__hits.length };
};

(async () => {
  const browser = await chromium.launch({
    headless: false, slowMo: 300, args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto('http://localhost:8080/tools/daw.html');
  await page.waitForTimeout(800);

  const geo = (last = false) => page.evaluate((useLast) => {
    const ruler = document.querySelector('.cbdaw-arr__ruler');
    const rows = document.querySelectorAll('.cbdaw-arr__lane-regions');
    const row = useLast ? rows[rows.length - 1] : rows[0];
    const br = row.getBoundingClientRect();
    return {
      barPx: ruler.offsetWidth / window.dwn.clock.songLengthBars,
      left: ruler.getBoundingClientRect().left,
      rowY: br.top + br.height / 2,
    };
  }, last);

  const readRegion = (id) => page.evaluate(async (rid) => {
    const { regions } = await import('/src/core/regions.js');
    const r = regions.get(rid);
    if (!r) return null;
    const pat = r.notes && !Array.isArray(r.notes) ? r.notes : null;
    return {
      startBar: r.startBar, lengthBars: r.lengthBars, loop: r.loop, loopBars: r.loopBars,
      patternBars: pat ? pat.bars : null,
      onSteps: pat
        ? pat.lanes.map((l, i) => [i, l.steps.map((s, j) => (s ? j : -1)).filter((j) => j >= 0)])
            .filter((e) => e[1].length)
        : null,
    };
  }, id);

  const lastRegionId = (exclude = []) => page.evaluate(async (skip) => {
    const { regions } = await import('/src/core/regions.js');
    const all = regions.all.filter((r) => !skip.includes(r.id));
    return all.length ? all[all.length - 1].id : null;
  }, exclude);

  const resize = async (id, bars) => {
    const g = await geo();
    const cur = (await readRegion(id)).lengthBars;
    const grip = page.locator(`.cbdaw-arr__region[data-id="${id}"] .cbdaw-arr__region-edge[data-edge="end"]`);
    const box = await grip.boundingBox();
    const dx = g.barPx * (bars - cur) + Math.sign(bars - cur) * 8;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 14 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(400);
  };

  const clickStep = async (lane, step) => {
    const cell = page.locator(`#dwn-pane-roll .cbdaw-grid__row[data-lane="${lane}"] .cbdaw-grid__cell[data-step="${step}"]`);
    await cell.scrollIntoViewIfNeeded();
    const b = await cell.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(180);
  };

  const play = async (seconds, trackId, shots = []) => {
    await page.evaluate(installProbe, trackId);
    await page.evaluate(() => { window.__hits = []; window.__map = []; window.dwn.clock.seek(1); });
    await page.evaluate(() => window.dwn.clock.play());
    const start = Date.now();
    for (const s of shots) {
      const wait = s.at * 1000 - (Date.now() - start);
      if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: `${SHOTS}/${s.name}` });
    }
    const left = seconds * 1000 - (Date.now() - start);
    if (left > 0) await page.waitForTimeout(left);
    await page.evaluate(() => window.dwn.clock.stop());
    await page.waitForTimeout(400);
    return page.evaluate(readHits);
  };

  // --- setup: one drum track ------------------------------------------------------
  await page.click('button:has-text("+ TRACK")');
  await page.waitForTimeout(300);
  await page.locator('.cbdaw-arr__lane-instrument').last().selectOption('drum-synth');
  await page.waitForTimeout(500);
  const drumId = await page.evaluate(() => window.dwn.tracks.all[0].id);
  out.drumTrack = drumId;
  out.probe = await page.evaluate(installProbe, drumId);

  // --- test 2: two-bar drum region at bar 3 --------------------------------------
  let g = await geo();
  await page.mouse.dblclick(g.left + g.barPx * 2 + g.barPx / 2, g.rowY);
  await page.waitForTimeout(500);
  const rA = await lastRegionId();
  out.regionA = rA;
  await resize(rA, 2);

  out.t2_region = await readRegion(rA);
  out.t2_gridInPane = await page.locator('#dwn-pane-roll .cbdaw-grid').count();
  out.t2_rulerBars = await page.locator('#dwn-pane-roll .cbdaw-grid__ruler-bar').allTextContents();
  out.t2_rows = await page.locator('#dwn-pane-roll .cbdaw-grid__row:not(.cbdaw-grid__row--ruler)').count();
  await page.screenshot({ path: `${SHOTS}/01-drum-region-bar3-grid.png` });

  await clickStep(0, 0);
  await clickStep(0, 16);
  await clickStep(1, 8);
  await page.waitForTimeout(400);
  out.t2_afterSteps = await readRegion(rA);
  await page.screenshot({ path: `${SHOTS}/02-steps-placed.png` });

  out.t2_counts = await play(13, drumId, [
    { at: 4.7, name: '03-playhead-bar3.png' },
    { at: 6.7, name: '04-playhead-bar4.png' },
  ]);

  // --- test 4: grow to four bars, then shrink to one ------------------------------
  await resize(rA, 4);
  out.t4_afterGrow = await readRegion(rA);
  out.t4_rulerGrown = await page.locator('#dwn-pane-roll .cbdaw-grid__ruler-bar').allTextContents();
  await page.screenshot({ path: `${SHOTS}/05-grown-four-bars.png` });
  out.t4_growCounts = await play(13, drumId);

  await resize(rA, 1);
  out.t4_afterShrink = await readRegion(rA);
  out.t4_rulerShrunk = await page.locator('#dwn-pane-roll .cbdaw-grid__ruler-bar').allTextContents();
  out.t4_dimCells = await page.locator('#dwn-pane-roll .cbdaw-grid__cell[data-dim="true"]').count();
  out.t4_dimOnCells = await page.locator('#dwn-pane-roll .cbdaw-grid__cell[data-dim="true"][data-on="true"]').count();
  out.t4_liveCells = await page.locator('#dwn-pane-roll .cbdaw-grid__cell[data-dim="false"]').count();
  await page.screenshot({ path: `${SHOTS}/06-shrunk-one-bar-dim.png` });
  out.t4_shrinkCounts = await play(11, drumId);

  await resize(rA, 2);
  out.t4_restored = await readRegion(rA);

  // --- test 5: loop the bar-3 region to three cycles ------------------------------
  await page.locator(`.cbdaw-arr__region[data-id="${rA}"]`).click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(400);
  const loopBtn = page.locator(`.cbdaw-arr__region[data-id="${rA}"] .cbdaw-arr__region-loop`);
  let lb = await loopBtn.boundingBox();
  await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.waitForTimeout(400);
  out.t5_afterLoopClick = await readRegion(rA);

  g = await geo();
  lb = await loopBtn.boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.mouse.move(lb.x + lb.width / 2 + g.barPx * 4 + 8, lb.y + lb.height / 2, { steps: 16 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(400);
  out.t5_afterLoopDrag = await readRegion(rA);
  await page.screenshot({ path: `${SHOTS}/08-loop-three-cycles.png` });
  out.t5_counts = await play(19, drumId);

  // --- test 3: loop off, back to two bars, a second drum region at bar 6 ----------
  lb = await loopBtn.boundingBox();
  await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.waitForTimeout(400);
  await resize(rA, 2);
  out.t3_regionAReset = await readRegion(rA);

  g = await geo();
  await page.mouse.dblclick(g.left + g.barPx * 5 + g.barPx / 2, g.rowY);
  await page.waitForTimeout(600);
  const rB = await lastRegionId([rA]);
  out.regionB = rB;
  await clickStep(2, 4);
  await clickStep(2, 12);
  await page.waitForTimeout(400);
  out.t3_regionB = await readRegion(rB);
  await page.screenshot({ path: `${SHOTS}/07-second-region-bar6.png` });
  out.t3_counts = await play(17, drumId);
  out.t3_regionA = await readRegion(rA);

  // --- test 6: pad click, lane unarmed, fires the instrument once -----------------
  out.t6_armed = await page.evaluate((id) => window.dwn.tracks.get(id).armed, drumId);
  out.t6_busAndPieces = await page.evaluate((id) => ({
    bus: Boolean(window.dwn.shell.trackBus(id)),
    pieces: window.dwn.shell.instruments.get(id)?.constructor?.pieces?.length ?? null,
  }), drumId);
  await page.evaluate(installProbe, drumId);
  await page.evaluate(() => { window.__hits = []; });
  await clickStep(3, 2);
  await page.waitForTimeout(400);
  out.t6_hits = await page.evaluate(() => window.__hits.length);
  await page.screenshot({ path: `${SHOTS}/09-pad-click-unarmed.png` });
  // undo the pad's own step toggle so the pattern is back where it was
  await clickStep(3, 2);

  // --- test 7: pitched region after a drum one ------------------------------------
  await page.click('button:has-text("+ TRACK")');
  await page.waitForTimeout(300);
  await page.locator('.cbdaw-arr__lane-instrument').last().selectOption('simple-synth');
  await page.waitForTimeout(500);
  const g2 = await geo(true);
  await page.mouse.dblclick(g2.left + g2.barPx * 2 + g2.barPx / 2, g2.rowY);
  await page.waitForTimeout(700);
  out.t7_roll = await page.locator('#dwn-pane-roll .cbdaw-roll').count();
  out.t7_gridLeft = await page.locator('#dwn-pane-roll .cbdaw-grid').count();
  await page.screenshot({ path: `${SHOTS}/10-swap-to-roll.png` });

  await page.locator(`.cbdaw-arr__region[data-id="${rA}"]`).click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(700);
  out.t7_backGrid = await page.locator('#dwn-pane-roll .cbdaw-grid').count();
  out.t7_rollLeft = await page.locator('#dwn-pane-roll .cbdaw-roll').count();
  await page.screenshot({ path: `${SHOTS}/11-swap-back-to-grid.png` });

  // --- test 9: double-click a region selects it and opens nothing ------------------
  const beforeFloat = await page.evaluate(() => document.querySelectorAll('body > div[style*="fixed"]').length);
  const blockA = page.locator(`.cbdaw-arr__region[data-id="${rA}"]`);
  const bb = await blockA.boundingBox();
  await page.mouse.dblclick(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(700);
  out.t9 = {
    floatingBefore: beforeFloat,
    floatingAfter: await page.evaluate(() => document.querySelectorAll('body > div[style*="fixed"]').length),
    selected: await page.locator(`.cbdaw-arr__region[data-id="${rA}"][data-selected="true"]`).count(),
    gridsInPage: await page.locator('.cbdaw-grid').count(),
    paneGrid: await page.locator('#dwn-pane-roll .cbdaw-grid').count(),
  };
  await page.screenshot({ path: `${SHOTS}/12-dblclick-region.png` });

  out.errors = errs;
  fs.writeFileSync(`${ROOT}/docs/scratchpad/sequence-roll/verify-a.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await page.waitForTimeout(3000);
  await browser.close();
})();
