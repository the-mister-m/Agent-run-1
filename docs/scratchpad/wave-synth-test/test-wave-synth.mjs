// SPEC-wave-synth-port.md §2e, all ten rows, run against the dial build.
// Rows 11-13 are the sonnet's additions per the task brief.
// Headed, slowMo, screenshots into docs/reports/wave-synth-test-shots/.

const pw = await import('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.js');
const chromium = (pw.default ?? pw).chromium;

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = ROOT + '/docs/reports/wave-synth-test-shots';
const BASE = 'http://localhost:8080';

const results = [];
let shotN = 0;

function say(row, text) {
  results.push('ROW ' + row + ' | ' + text);
  console.log('ROW ' + row + ': ' + text);
}

async function shot(page, name) {
  shotN++;
  const file = SHOTS + '/R' + String(shotN).padStart(2, '0') + '-' + name + '.png';
  await page.screenshot({ path: file });
  return file.split('/').pop();
}

function watch(page, bag) {
  page.on('pageerror', (e) => bag.push('PAGEERROR ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) bag.push('CONSOLE ' + m.text());
  });
}

const browser = await chromium.launch({
  headless: false,
  slowMo: 300,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

const poolCount = (page) =>
  page.evaluate(async () => {
    const m = await import('/src/core/audio.js');
    return m.voicePool.count;
  });

const setP = (page, path, value) =>
  page.evaluate(([p, v]) => window.cbdawShell.instrument.setParam(p, v), [path, value]);

// ------------------------------------------------------------------ rows 1, 2, 6, 7, 8
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = [];
  watch(page, errs);
  await page.goto(BASE + '/tools/desktop/wave-synth.html', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  say(1, 'desktop 1366x768 loaded, shot=' + (await shot(page, 'desktop-1366')));

  // ROW 2 — resize sweep
  for (const w of [1024, 1280, 1366, 1600, 1920]) {
    await page.setViewportSize({ width: w, height: 768 });
    await page.waitForTimeout(700);
    const over = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    const s = await shot(page, 'resize-' + w);
    say(2, w + ' wide, body overflow ' + over.body + 'px, doc overflow ' + over.doc + 'px, shot=' + s);
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.waitForTimeout(500);

  // ROW 6 — every control moved while a note holds
  await page.evaluate(() => window.cbdawShell.instrument.noteOn(60, 0.8));
  await page.waitForTimeout(400);

  const dials = await page.$$('.cbdaw-knob[data-path]');
  let dragged = 0;
  for (const d of dials.slice(0, 3)) {
    const box = await d.boundingBox();
    if (!box) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 60, { steps: 8 });
    await page.mouse.move(cx, cy + 40, { steps: 8 });
    await page.mouse.up();
    dragged++;
  }
  const dragShot = await shot(page, 'dial-drag');

  const sweep = await page.evaluate(() => {
    const inst = window.cbdawShell.instrument;
    const root = document.querySelector('.wv-expanded');
    const knobs = Array.from(root.querySelectorAll('.cbdaw-knob[data-path]'));
    const faders = Array.from(root.querySelectorAll('input[type="range"][data-path]'));
    let moves = 0;
    let mismatched = 0;
    const bad = [];

    const key = (el, k) => {
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      moves++;
    };

    for (const el of knobs) {
      const path = el.dataset.path;
      key(el, 'Home');
      const atMin = inst.getParam(path);
      const minShown = el.getAttribute('aria-valuetext');
      key(el, 'End');
      const atMax = inst.getParam(path);
      const maxShown = el.getAttribute('aria-valuetext');
      key(el, 'PageDown');
      key(el, 'ArrowUp');
      key(el, 'ArrowDown');
      const now = inst.getParam(path);
      const nowNum = Number(el.getAttribute('aria-valuenow'));

      if (typeof now === 'number') {
        if (Math.abs(nowNum - now) > Math.max(0.011, Math.abs(now) * 0.002)) {
          mismatched++;
          bad.push(path + ' dial ' + nowNum + ' vs patch ' + now);
        }
      } else if (String(atMin) === String(atMax)) {
        mismatched++;
        bad.push(path + ' enum did not move: ' + atMin);
      }
      if (minShown === null || maxShown === null) {
        mismatched++;
        bad.push(path + ' no aria-valuetext');
      }
      el.blur();
    }

    for (const el of faders) {
      const path = el.dataset.path;
      const min = Number(el.min);
      const max = Number(el.max);
      for (const frac of [0, 0.5, 1]) {
        const v = min + (max - min) * frac;
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        moves++;
        const got = Number(inst.getParam(path));
        if (Math.abs(got - Number(el.value)) > 0.011) {
          mismatched++;
          bad.push(path + ' fader ' + el.value + ' vs patch ' + got);
        }
      }
      el.blur();
    }

    return { knobs: knobs.length, faders: faders.length, moves, mismatched, bad: bad.slice(0, 6) };
  });
  await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
  await page.waitForTimeout(600);
  say(
    6,
    sweep.knobs +
      ' dials + ' +
      sweep.faders +
      ' envelope faders, ' +
      dragged +
      ' real pointer drags, ' +
      sweep.moves +
      ' value moves, patch mismatches ' +
      sweep.mismatched +
      (sweep.bad.length ? ' [' + sweep.bad.join('; ') + ']' : '') +
      ', console errors ' +
      errs.length +
      ', shots=' +
      dragShot +
      ',' +
      (await shot(page, 'knob-sweep'))
  );

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // ROW 7 — mono, two overlapping notes
  await setP(page, 'voice.mode', 'mono');
  await setP(page, 'voice.unison', 1);
  await page.waitForTimeout(200);
  await page.evaluate(() => window.cbdawShell.instrument.noteOn(60, 0.8));
  await page.waitForTimeout(500);
  const monoA = await poolCount(page);
  await page.evaluate(() => window.cbdawShell.instrument.noteOn(67, 0.8));
  await page.waitForTimeout(500);
  const monoB = await poolCount(page);
  const monoNote = await page.evaluate(() => {
    const inst = window.cbdawShell.instrument;
    const notes = Array.from(inst._notes.keys());
    const freqs = [];
    for (const g of inst._notes.values()) for (const v of g.voices) freqs.push(Math.round(v.freq));
    return { notes, freqs };
  });
  const monoShot = await shot(page, 'mono');
  await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
  await page.waitForTimeout(800);
  say(
    7,
    'mono: after note 1 count=' +
      monoA +
      ', after overlapping note 2 count=' +
      monoB +
      ', held notes=[' +
      monoNote.notes.join(',') +
      '] voice freq=[' +
      monoNote.freqs.join(',') +
      '] Hz (G4 is 392), shot=' +
      monoShot
  );

  // ROW 8 — pulse width sweep with the spectrum running
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await setP(page, 'osc1.wave', 'pulse');
  await setP(page, 'osc2.level', 0);
  await setP(page, 'filter.cutoff', 18000);
  for (const w of [0.1, 0.5, 0.9]) {
    await setP(page, 'osc1.pw', w);
    await page.evaluate(() => window.cbdawShell.instrument.noteOn(48, 0.9));
    await page.waitForTimeout(1400);
    const s = await shot(page, 'pw-' + String(w).replace('.', ''));
    await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
    await page.waitForTimeout(500);
    say(8, 'pulse width ' + w + ', spectrum shot=' + s);
  }

  say(1, 'desktop page errors total ' + errs.length + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  await page.close();
  await ctx.close();
}

// ------------------------------------------------------------------ rows 4, 5
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = [];
  watch(page, errs);
  await page.goto(BASE + '/tools/desktop/wave-synth.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  const chord = [60, 64, 67, 72];
  for (const u of [1, 2, 4]) {
    await setP(page, 'voice.unison', u);
    await page.waitForTimeout(200);
    await page.evaluate((notes) => {
      for (const n of notes) window.cbdawShell.instrument.noteOn(n, 0.8);
    }, chord);
    await page.waitForTimeout(700);
    const held = await poolCount(page);
    const s = await shot(page, 'unison-' + u);
    await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
    await page.waitForTimeout(1100);
    const after = await poolCount(page);
    say(
      4,
      'unison ' + u + ': 4 notes held -> voicePool.count=' + held + ' (expect ' + 4 * u +
        '), after release+0.5s count=' + after + ' (expect 0), shot=' + s
    );
  }

  await setP(page, 'voice.unison', 1);
  await page.waitForTimeout(200);
  const nine = [60, 61, 62, 63, 64, 65, 66, 67, 68];
  await page.evaluate((notes) => {
    for (const n of notes) window.cbdawShell.instrument.noteOn(n, 0.8);
  }, nine);
  await page.waitForTimeout(700);
  const capCount = await poolCount(page);
  const capNotes = await page.evaluate(() => Array.from(window.cbdawShell.instrument._notes.keys()));
  const capShot = await shot(page, 'poly-cap');
  await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
  await page.waitForTimeout(1000);
  say(
    5,
    'nine notes: voicePool.count=' + capCount + ' (expect 8), held notes=[' + capNotes.join(',') +
      '], first note 60 still held=' + capNotes.includes(60) + ' (expect false), shot=' + capShot
  );
  say(5, 'page errors ' + errs.length + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  await page.close();
  await ctx.close();
}

// ------------------------------------------------------------------ rows 1b, 3
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  watch(page, errs);
  await page.goto(BASE + '/tools/mobile/wave-synth.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  say(1, 'mobile 390x844 loaded, errors ' + errs.length + ', shot=' + (await shot(page, 'mobile-390')));

  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  await page.evaluate(() => {
    const k = document.querySelector('.cbdaw-shell__surface');
    if (k) k.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(900);
  const kbShot = await shot(page, 'mobile-keyboard');

  const taps = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.height = 'var(--tap-min)';
    probe.style.position = 'absolute';
    document.body.appendChild(probe);
    const tapMin = parseFloat(getComputedStyle(probe).height);
    probe.remove();

    const root = document.querySelector('.wv-root');
    const dials = Array.from(root.querySelectorAll('.cbdaw-knob'));
    const faders = Array.from(root.querySelectorAll('input[type="range"]'));
    let underD = 0;
    let minD = Infinity;
    for (const el of dials) {
      const h = el.querySelector('.cbdaw-knob__dial').getBoundingClientRect().height;
      minD = Math.min(minD, h);
      if (h < tapMin) underD++;
    }
    let minF = Infinity;
    for (const el of faders) minF = Math.min(minF, el.getBoundingClientRect().height);
    return {
      tapMin,
      dials: dials.length,
      faders: faders.length,
      dialSize: Math.round(minD),
      dialsUnder: underD,
      faderH: Math.round(minF),
    };
  });
  say(
    3,
    'mobile doc overflow ' + over + 'px, --tap-min=' + taps.tapMin + 'px, dials=' + taps.dials +
      ' at ' + taps.dialSize + 'px (below tap-min: ' + taps.dialsUnder + '), envelope faders=' +
      taps.faders + ' at ' + taps.faderH + 'px tall, shot=' + kbShot
  );

  const reach = await page.evaluate(() => {
    const root = document.querySelector('.wv-root');
    const els = Array.from(root.querySelectorAll('.cbdaw-knob, input[type="range"]'));
    let boxed = 0;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) boxed++;
    }
    return { total: els.length, boxed };
  });
  say(3, 'controls with a layout box: ' + reach.boxed + ' of ' + reach.total);
  await page.close();
  await ctx.close();
}

// ------------------------------------------------------------------ row 9 (daw.html may be mid-edit by Opus)
async function runRow9(attempt) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  watch(page, errs);
  let loadErr = null;
  try {
    await page.goto(BASE + '/tools/daw.html', { waitUntil: 'load', timeout: 20000 });
  } catch (e) {
    loadErr = e.message;
  }
  await page.waitForTimeout(2500);

  if (loadErr || errs.length) {
    const s = await shot(page, 'daw-error-attempt' + attempt);
    say(9, 'attempt ' + attempt + ' — daw.html trouble: loadErr=' + loadErr + ' pageerrors=[' + errs.join(' | ') + '], shot=' + s);
    await page.close();
    await ctx.close();
    return false;
  }

  const added = await page.evaluate(async () => {
    const t = await import('/src/core/tracks.js');
    const track = t.tracks.add({ name: 'Wave' });
    t.tracks.setInstrumentType(track.id, 'wave-synth');
    await new Promise((r) => setTimeout(r, 600));
    const after = t.tracks.get(track.id);
    return {
      id: track.id,
      instrumentType: after.instrumentType,
      kind: after.kind,
      hasInstrument: !!after.instrument,
      instrumentId: after.instrument ? after.instrument.constructor.id : null,
    };
  });
  await page.waitForTimeout(1200);
  const dawShot = await shot(page, 'daw-track');

  const played = await page.evaluate(async () => {
    const t = await import('/src/core/tracks.js');
    const a = await import('/src/core/audio.js');
    const row = t.tracks.all.find((r) => r.instrumentType === 'wave-synth');
    if (!row || !row.instrument) return { ok: false, why: 'no live instrument on the track' };
    const before = a.voicePool.count;
    row.instrument.noteOn(60, 0.8);
    row.instrument.noteOn(64, 0.8);
    row.instrument.noteOn(67, 0.8);
    await new Promise((r) => setTimeout(r, 500));
    const during = a.voicePool.count;
    row.instrument.allNotesOff();
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true, before, during, after: a.voicePool.count };
  });
  await page.waitForTimeout(800);
  const dawShot2 = await shot(page, 'daw-play');
  say(
    9,
    'DAW track: instrumentType=' + added.instrumentType + ' kind=' + added.kind +
      ' mounted instrument id=' + added.instrumentId + '; play ' + JSON.stringify(played) +
      '; page errors ' + errs.length + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : '') +
      ', shots=' + dawShot + ',' + dawShot2
  );
  await page.close();
  await ctx.close();
  return true;
}

{
  const ok = await runRow9(1);
  if (!ok) {
    console.log('ROW 9: retrying in 2 minutes (daw.html looked mid-edit)...');
    await new Promise((r) => setTimeout(r, 120000));
    await runRow9(2);
  }
}

// ------------------------------------------------------------------ row 10 — simple-synth + DAW row still load/play
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  for (const rel of ['/tools/desktop/simple-synth.html', '/tools/mobile/simple-synth.html']) {
    const page = await ctx.newPage();
    const errs = [];
    watch(page, errs);
    await page.goto(BASE + rel, { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    const c0 = await poolCount(page);
    await page.evaluate(() => {
      window.cbdawShell.instrument.noteOn(60, 0.8);
      window.cbdawShell.instrument.noteOn(64, 0.8);
      window.cbdawShell.instrument.noteOn(67, 0.8);
    });
    await page.waitForTimeout(600);
    const c1 = await poolCount(page);
    const s = await shot(page, 'simple-' + rel.split('/')[2]);
    await page.evaluate(() => window.cbdawShell.instrument.allNotesOff());
    await page.waitForTimeout(900);
    const c2 = await poolCount(page);
    const id = await page.evaluate(() => window.cbdawShell.instrument.constructor.id);
    say(
      10,
      rel + ' id=' + id + ', count idle=' + c0 + ' holding 3 notes=' + c1 + ' after release=' + c2 +
        ', errors=' + errs.length + ', shot=' + s
    );
    await page.close();
  }
  await ctx.close();
}

// ------------------------------------------------------------------ row 11 — home-row chord, both simple-synth pages
{
  // KeyA=C4(60) KeyD=E4(64) KeyG=G4(67) KeyK=C5(72) — home-row white keys, no arm gate on standalone pages
  const chordKeys = ['KeyA', 'KeyD', 'KeyG', 'KeyK'];
  for (const [rel, vw] of [
    ['/tools/desktop/simple-synth.html', { width: 1366, height: 768 }],
    ['/tools/mobile/simple-synth.html', { width: 390, height: 844 }],
  ]) {
    const ctx = await browser.newContext({ viewport: vw });
    const page = await ctx.newPage();
    const errs = [];
    watch(page, errs);
    await page.goto(BASE + rel, { waitUntil: 'load' });
    await page.waitForTimeout(1600);
    await page.click('body');

    for (const k of chordKeys) await page.keyboard.down(k);
    await page.waitForTimeout(500);
    const held = await poolCount(page);
    const s1 = await shot(page, 'row11-hold-' + rel.split('/')[2]);

    for (const k of chordKeys) await page.keyboard.up(k);
    await page.waitForTimeout(700);
    const released = await poolCount(page);
    const s2 = await shot(page, 'row11-release-' + rel.split('/')[2]);

    say(
      11,
      rel + ' home-row chord (KeyA/KeyD/KeyG/KeyK) held=' + held + ' (expect 4), released=' +
        released + ' (expect 0), errors=' + errs.length + ', shots=' + s1 + ',' + s2
    );
    await page.close();
    await ctx.close();
  }
}

// ------------------------------------------------------------------ row 12 — sound-lab picker, Wave Synth, CHORD RUN
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = [];
  watch(page, errs);
  await page.goto(BASE + '/tools/desktop/sound-lab.html', { waitUntil: 'load' });
  await page.waitForTimeout(1800);

  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.lab__btn')).map((b) => b.textContent.trim())
  );
  const s0 = await shot(page, 'lab-picker');

  await page.click('#pickWave');
  await page.waitForTimeout(800);
  const s1 = await shot(page, 'lab-wave-picked');

  const c0 = await poolCount(page);
  await page.click('#chordRun');
  await page.waitForTimeout(400);
  const cDuring = await poolCount(page);
  await page.waitForTimeout(2500); // 4 chords x 1 beat @120bpm = 2s, plus release tail
  const cAfter = await poolCount(page);
  const s2 = await shot(page, 'lab-chord-run');

  say(
    12,
    'buttons=[' + buttons.join(', ') + '], Wave Synth picked, #chordRun clicked, count before=' +
      c0 + ' during=' + cDuring + ' after=' + cAfter + ' (expect >0 then back to 0), errors=' +
      errs.length + ', shots=' + s0 + ',' + s1 + ',' + s2
  );
  await page.close();
  await ctx.close();
}

await browser.close();

console.log('\n================ SUMMARY ================');
for (const r of results) console.log(r);
