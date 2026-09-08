// Sequence roll — headed verification, part B: the record wire, and beat.html unchanged.
import { chromium } from '/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.mjs';
import fs from 'fs';

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = `${ROOT}/docs/reports/sequence-roll-shots`;
fs.mkdirSync(SHOTS, { recursive: true });

const out = {};
const errs = [];

const regionSnapshot = async () => {
  return null;
};

(async () => {
  const browser = await chromium.launch({
    headless: false, slowMo: 300, args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errs.push('daw pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('daw console: ' + m.text()); });

  await page.goto('http://localhost:8080/tools/daw.html');
  await page.waitForTimeout(800);

  const regionList = () => page.evaluate(async () => {
    const { regions } = await import('/src/core/regions.js');
    return regions.all.map((r) => ({
      id: r.id, lane: r.laneId, startBar: r.startBar, lengthBars: r.lengthBars,
      notes: Array.isArray(r.notes) ? r.notes.length : 'pattern',
    }));
  });

  // three notes through the shared input, the path a MIDI keyboard uses
  const playNotes = async (notes) => {
    for (const n of notes) {
      await page.evaluate((note) => window.dwn.input.emitNoteOn({ note, velocity: 0.8, source: 'midi' }), n);
      await page.waitForTimeout(350);
      await page.evaluate((note) => window.dwn.input.emitNoteOff({ note, source: 'midi' }), n);
      await page.waitForTimeout(150);
    }
  };

  const addTrack = async (type) => {
    await page.click('button:has-text("+ TRACK")');
    await page.waitForTimeout(300);
    await page.locator('.cbdaw-arr__lane-instrument').last().selectOption(type);
    await page.waitForTimeout(500);
    return page.evaluate(() => window.dwn.tracks.all[window.dwn.tracks.all.length - 1].id);
  };

  const setArmed = async (id, on) => {
    await page.evaluate(([tid, val]) => window.dwn.tracks.setArmed(tid, val), [id, on]);
    await page.waitForTimeout(300);
  };

  const recordPass = async (startBar, notes, seconds = 3) => {
    await page.evaluate((bar) => window.dwn.clock.seek(bar), startBar);
    await page.waitForTimeout(200);
    await page.click('[data-role="record"]');
    await page.waitForTimeout(300);
    const stateIn = await page.evaluate(() => window.dwn.clock.state);
    await playNotes(notes);
    await page.waitForTimeout(seconds * 100);
    const barAtStop = await page.evaluate(() => window.dwn.clock.position.bar);
    await page.click('[data-role="stop"]').catch(async () => {
      await page.evaluate(() => window.dwn.clock.stop());
    });
    await page.waitForTimeout(600);
    return { stateIn, barAtStop };
  };

  // --- 8a: pitched lane, armed --------------------------------------------------
  const pitchedId = await addTrack('simple-synth');
  await setArmed(pitchedId, true);
  out.a_before = await regionList();
  out.a_pass = await recordPass(2, [60, 64, 67]);
  out.a_after = await regionList();
  await page.screenshot({ path: `${SHOTS}/13-record-pitched-armed.png` });

  // --- 8b: drum lane, armed -----------------------------------------------------
  const drumId = await addTrack('drum-synth');
  await setArmed(drumId, true);
  await setArmed(pitchedId, false);
  out.b_before = await regionList();
  out.b_pass = await recordPass(9, [36, 38, 42]);
  out.b_after = await regionList();
  await page.screenshot({ path: `${SHOTS}/14-record-drum-armed.png` });

  // --- 8c: both lanes unarmed ---------------------------------------------------
  await setArmed(drumId, false);
  out.c_armed = await page.evaluate(() => window.dwn.tracks.all.map((t) => [t.id, t.armed]));
  out.c_before = await regionList();
  out.c_pass = await recordPass(13, [60, 62, 64]);
  out.c_after = await regionList();
  await page.screenshot({ path: `${SHOTS}/15-record-unarmed.png` });

  // --- 8d: a drum region with a pattern under the playhead ----------------------
  await setArmed(drumId, true);
  const g = await page.evaluate(() => {
    const ruler = document.querySelector('.cbdaw-arr__ruler');
    const rows = document.querySelectorAll('.cbdaw-arr__lane-regions');
    const br = rows[rows.length - 1].getBoundingClientRect();
    return {
      barPx: ruler.offsetWidth / window.dwn.clock.songLengthBars,
      left: ruler.getBoundingClientRect().left, rowY: br.top + br.height / 2,
    };
  });
  await page.mouse.dblclick(g.left + g.barPx * 4 + g.barPx / 2, g.rowY);
  await page.waitForTimeout(600);
  const padCell = page.locator('#dwn-pane-roll .cbdaw-grid__row[data-lane="0"] .cbdaw-grid__cell[data-step="0"]');
  if (await padCell.count()) {
    const box = await padCell.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);
  }
  out.d_before = await regionList();
  out.d_pass = await recordPass(5, [36, 38]);
  out.d_after = await regionList();
  await page.screenshot({ path: `${SHOTS}/16-record-onto-pattern.png` });

  out.dawErrors = [...errs];
  await page.close();

  // --- test 10: beat.html unchanged ---------------------------------------------
  const beatErrs = [];
  const beat = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  beat.on('pageerror', (e) => beatErrs.push('pageerror: ' + String(e)));
  beat.on('console', (m) => { if (m.type() === 'error') beatErrs.push('console: ' + m.text()); });
  await beat.goto('http://localhost:8080/tools/desktop/beat.html');
  await beat.waitForTimeout(1200);

  out.beat_gridPresent = await beat.locator('.cbdaw-grid').count();
  out.beat_rulerBarTags = await beat.locator('.cbdaw-grid__ruler-bar').count();
  out.beat_originTick = await beat.evaluate(() => {
    const el = document.querySelector('.cbdaw-grid');
    return el ? true : false;
  });

  // place two steps, then play and watch the playhead wrap
  const cells = beat.locator('.cbdaw-grid__row[data-lane="0"] .cbdaw-grid__cell');
  if (await cells.count()) {
    const b1 = await cells.nth(0).boundingBox();
    await beat.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
    await beat.waitForTimeout(200);
    const b2 = await cells.nth(8).boundingBox();
    await beat.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await beat.waitForTimeout(200);
  }
  await beat.click('button:has-text("Play")');
  const heads = [];
  for (let i = 0; i < 8; i++) {
    await beat.waitForTimeout(500);
    heads.push(await beat.evaluate(() => {
      const ph = document.querySelector('.cbdaw-grid__playhead');
      return ph ? ph.style.left : null;
    }));
  }
  out.beat_playheadSamples = heads;
  await beat.screenshot({ path: `${SHOTS}/17-beat-html.png` });
  await beat.evaluate(() => document.querySelector('button.bt-btn') && null);
  out.beatErrors = beatErrs;

  fs.writeFileSync(`${ROOT}/docs/scratchpad/sequence-roll/verify-b.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await beat.waitForTimeout(3000);
  await browser.close();
})();
