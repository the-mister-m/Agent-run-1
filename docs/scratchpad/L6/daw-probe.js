// L6 headed probe — daw.html. Phase arg: "before" | "after".
// Writes screenshots to docs/reports/L6-shots/ and a JSON summary to this folder.

const { chromium } = require('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = path.join(ROOT, 'docs/reports/L6-shots');
const BASE = 'http://localhost:8080';
const PHASE = process.argv[2] === 'after' ? 'after' : 'before';

const out = { phase: PHASE, counts: {}, notes: {}, errors: [] };

function shotPath(name) {
  return path.join(SHOTS, `${name}-${PHASE}.png`);
}

function attachErrors(page, tag) {
  page.on('console', (m) => {
    if (m.type() === 'error') out.errors.push(`[${tag}] console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => out.errors.push(`[${tag}] pageerror: ${e.message}`));
}

const regionCount = async (page) =>
  page.evaluate(async () => (await import('/src/core/regions.js')).regions.all.length);

async function recordTake(page, { bars = 2, notes = [60, 64, 67], stopEarly = false } = {}) {
  return page.evaluate(async (cfg) => {
    const { input } = await import('/src/core/input.js');
    const clock = window.dwn.clock;
    clock.seek(1);
    clock.record();
    const barMs = (60 / clock.bpm) * clock.timeSignature.top * 1000;
    const step = (cfg.bars * barMs) / (cfg.notes.length + 1);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const n of cfg.notes) {
      await wait(step);
      input.emitNoteOn({ note: n, velocity: 0.8, source: 'midi' });
      await wait(60);
      input.emitNoteOff({ note: n, source: 'midi' });
    }
    if (!cfg.stopEarly) await wait(step);
    const posAtStop = { ...clock.position, state: clock.state };
    clock.stop();
    return posAtStop;
  }, { bars, notes, stopEarly });
}

// double-click empty lane-row space at an x offset, returns the new region id or null
async function makeRegion(page, offsetPx) {
  const box = await page.locator('.cbdaw-arr__lane-regions').first().boundingBox();
  await page.mouse.dblclick(box.x + offsetPx, box.y + box.height / 2);
  await page.waitForTimeout(120);
  return page.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    const all = regions.all;
    return all.length ? all[all.length - 1].id : null;
  });
}

async function openEditorOn(page, regionId) {
  const el = page.locator(`.cbdaw-arr__region[data-id="${regionId}"]`).first();
  await el.dblclick();
  await page.waitForTimeout(200);
  return page.evaluate(() => Boolean(document.querySelector('div[style*="9999"]')));
}

async function closeEditor(page) {
  const btn = page.locator('div[style*="9999"] button', { hasText: 'CLOSE' }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(150);
  }
}

async function addTrackAndAssign(page) {
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.cbdaw-arr__toolbar button')];
    const b = btns.find((x) => /track/i.test(x.textContent || ''));
    if (b) { b.click(); return b.textContent.trim(); }
    window.dwn.shell.addTrack();
    return '(no button — shell.addTrack())';
  });
  await page.waitForTimeout(200);
  const id = await page.evaluate(() => window.dwn.tracks.all.at(-1)?.id || null);
  const sel = page.locator('select.cbdaw-arr__lane-instrument').last();
  await sel.selectOption('wave-synth');
  await page.waitForTimeout(250);
  return { id, addButton: clicked };
}

// the floating panel can sit over the lane head, so this fires the handler directly
async function armLane(page) {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.cbdaw-arr__arm')];
    btns[btns.length - 1]?.click();
  });
  await page.waitForTimeout(150);
}

async function closePanel(page) {
  await page.evaluate(() => {
    for (const bar of document.querySelectorAll('.dwn-panel__bar')) {
      const x = [...bar.querySelectorAll('button')].find((b) => b.textContent.trim() === '×');
      x?.click();
    }
  });
  await page.waitForTimeout(150);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  // ---- pass A: load, surface tap test, trough, master -------------------------------
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctxA.newPage();
  attachErrors(page, 'daw');
  await page.goto(`${BASE}/tools/daw.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shotPath('01-load') });
  out.counts.load = await regionCount(page);

  const track = await addTrackAndAssign(page);
  out.notes.track = track;
  await armLane(page);

  // §2 — the Surface pane. Probe input, every bus, and the track's instrument.
  const surfaceChip = page.locator('[data-bottom="surface"]');
  out.notes.surfaceChipPresent = (await surfaceChip.count()) > 0;
  if (out.notes.surfaceChipPresent) {
    await surfaceChip.click();
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      const { input } = await import('/src/core/input.js');
      window.__probe = { input: 0, buses: 0, instrument: 0 };
      input.on('noteon', () => { window.__probe.input++; });
      for (const bus of window.dwn.shell.buses.values()) {
        bus.on('noteon', () => { window.__probe.buses++; });
      }
      for (const inst of window.dwn.shell.instruments.values()) {
        const orig = inst.noteOn.bind(inst);
        inst.noteOn = (...a) => { window.__probe.instrument++; return orig(...a); };
      }
    });
    const key = page.locator('#dwn-pane-surface .cbdaw-kbd__key').first();
    out.notes.surfaceKeys = await page.locator('#dwn-pane-surface .cbdaw-kbd__key').count();
    if (out.notes.surfaceKeys > 0) {
      await key.hover();
      await page.mouse.down();
      await page.waitForTimeout(250);
      await page.screenshot({ path: shotPath('02-surface-tap') });
      await page.mouse.up();
      await page.waitForTimeout(150);
      out.notes.probe = await page.evaluate(() => window.__probe);
    } else {
      await page.screenshot({ path: shotPath('02-surface-tap') });
      out.notes.probe = 'no keys in the Surface pane';
    }
  } else {
    await page.screenshot({ path: shotPath('02-surface-tap') });
    out.notes.probe = 'Surface chip absent';
  }

  // §4 — trough beside a bottom-rack strip, current --sp-95 then a temporary 325px
  await page.locator('[data-bottom="strips-all"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotPath('03-trough-sp95') });
  const styleTag = await page.addStyleTag({
    content: '.dwn-strip .cbdaw-strip__fadermeter { max-height: 325px !important; }',
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shotPath('04-trough-325') });
  await page.evaluate((el) => el.remove(), styleTag);
  await page.waitForTimeout(200);

  // §6 — Master on daw.html: the left column's master slot
  const master = page.locator('#dwn-strip-master');
  await master.screenshot({ path: shotPath('05-master-daw') });

  await page.waitForTimeout(4000);
  await ctxA.close();

  // ---- pass B: the six duplicate-region steps, fresh page ---------------------------
  const ctxB = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p2 = await ctxB.newPage();
  attachErrors(p2, 'dupes');
  await p2.goto(`${BASE}/tools/daw.html`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);

  // 1 — fresh load
  out.counts.step1 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('07-dupes-step1') });

  // 2 — track, wave synth, panel, Keyboard, ARM; record two bars, no editor open
  const t2 = await addTrackAndAssign(p2);
  out.notes.dupesTrack = t2;
  await p2.locator(`[data-panel="${t2.id}"]`).click();
  await p2.waitForTimeout(200);
  const kbChip = p2.locator('.dwn-panel__bar button', { hasText: 'Keyboard' }).first();
  out.notes.keyboardChip = await kbChip.count();
  if (out.notes.keyboardChip) { await kbChip.click(); await p2.waitForTimeout(250); }
  out.notes.surfaceTypeAfterChip = await p2.evaluate(
    () => window.dwn.tracks.all.at(-1)?.surfaceType || null,
  );
  await armLane(p2);
  // the panel floats over the lane row; the take goes in through `input`, not the panel
  await closePanel(p2);

  // every lane Capture's commit event, for the life of the run
  await p2.evaluate(() => {
    window.__commits = [];
    const watch = () => {
      for (const lane of window.dwn.arrangement.lanes) {
        if (lane.capture.__watched) continue;
        lane.capture.__watched = true;
        lane.capture.on('commit', (r) => {
          window.__commits.push({ lane: lane.id, kind: r.kind, noteCount: r.noteCount });
        });
      }
    };
    watch();
    window.dwn.tracks.on('add', () => setTimeout(watch, 0));
  });
  out.notes.step2Stop = await recordTake(p2);
  await p2.waitForTimeout(250);
  out.counts.step2 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('08-dupes-step2') });

  // 3 — make a region, open its editor, record two bars, CLOSE
  const r3 = await makeRegion(p2, 500);
  out.notes.step3Region = r3;
  out.notes.step3EditorOpen = await openEditorOn(p2, r3);
  out.notes.step3Stop = await recordTake(p2);
  await p2.waitForTimeout(250);
  await closeEditor(p2);
  out.counts.step3 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('09-dupes-step3') });

  // 4 — same again, two takes without closing between them
  const r4 = await makeRegion(p2, 800);
  out.notes.step4Region = r4;
  out.notes.step4EditorOpen = await openEditorOn(p2, r4);
  await recordTake(p2);
  await p2.waitForTimeout(200);
  await recordTake(p2);
  await p2.waitForTimeout(250);
  out.counts.step4 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('10-dupes-step4') });
  await closeEditor(p2);

  // 5 — remove the track, add a new one, repeat 3
  await p2.evaluate(() => {
    const heads = [...document.querySelectorAll('.cbdaw-arr__lane-head')];
    const head = heads[heads.length - 1];
    [...head.querySelectorAll('button')].find((b) => b.textContent.trim() === 'DELETE')?.click();
  });
  await p2.waitForTimeout(300);
  out.notes.afterRemoveCount = await regionCount(p2);
  const t5 = await addTrackAndAssign(p2);
  out.notes.step5Track = t5;
  await armLane(p2);
  const r5 = await makeRegion(p2, 500);
  out.notes.step5Region = r5;
  out.notes.step5EditorOpen = r5 ? await openEditorOn(p2, r5) : false;
  await recordTake(p2);
  await p2.waitForTimeout(250);
  await closeEditor(p2);
  out.counts.step5 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('11-dupes-step5') });

  // 6 — stop the transport mid-record
  out.notes.step6Stop = await recordTake(p2, { stopEarly: true });
  await p2.waitForTimeout(250);
  out.counts.step6 = await regionCount(p2);
  await p2.screenshot({ path: shotPath('12-dupes-step6') });

  out.notes.finalRegions = await p2.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    return regions.all.map((r) => ({
      id: r.id, lane: r.laneId, startBar: r.startBar, len: r.lengthBars,
      notes: Array.isArray(r.notes) ? r.notes.length : 'pattern',
    }));
  });
  out.notes.trackCount = await p2.evaluate(() => window.dwn.tracks.all.length);
  out.notes.commitEvents = await p2.evaluate(() => window.__commits);
  out.notes.surfacePaneInDom = await p2.evaluate(
    () => Boolean(document.getElementById('dwn-pane-surface')),
  );
  await p2.waitForTimeout(4000);
  await ctxB.close();

  // ---- pass C: dev-splash master ----------------------------------------------------
  const ctxC = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const p3 = await ctxC.newPage();
  attachErrors(p3, 'dev-splash');
  await p3.goto(`${BASE}/tools/desktop/dev-splash.html`, { waitUntil: 'networkidle' });
  await p3.waitForTimeout(800);
  // dev-splash mounts nothing until a rail entry is picked
  out.notes.devSplashPick = await p3.evaluate(() => {
    for (const g of document.querySelectorAll('.dsp-rail__group')) {
      if (/MIXER/i.test(g.textContent || '')) g.dataset.open = 'true';
    }
    const item = [...document.querySelectorAll('.dsp-rail__item')]
      .find((x) => /All 7 Strips/i.test(x.textContent || ''));
    if (!item) return 'no "All 7 Strips" rail item';
    item.click();
    return 'clicked "All 7 Strips"';
  });
  await p3.waitForTimeout(1200);
  const dsMaster = p3.locator('.cbdaw-strip--master').first();
  out.notes.devSplashMasterCount = await p3.locator('.cbdaw-strip--master').count();
  if (out.notes.devSplashMasterCount) {
    await dsMaster.scrollIntoViewIfNeeded();
    await p3.waitForTimeout(400);
    await dsMaster.screenshot({ path: shotPath('06-master-devsplash') });
    out.notes.devSplashMaster = 'master strip element shot';
  } else {
    await p3.screenshot({ path: shotPath('06-master-devsplash') });
    out.notes.devSplashMaster = 'no master strip mounted on load — viewport shot';
  }
  await p3.waitForTimeout(4000);
  await ctxC.close();

  await browser.close();

  fs.writeFileSync(
    path.join(ROOT, `docs/scratchpad/L6/probe-${PHASE}.json`),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  out.errors.push(`FATAL: ${e.stack}`);
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
});
