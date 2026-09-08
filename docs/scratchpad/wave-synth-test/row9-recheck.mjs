const pw = await import('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.js');
const chromium = (pw.default ?? pw).chromium;
const BASE = 'http://localhost:8080';

const browser = await chromium.launch({
  headless: false,
  slowMo: 300,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
const log = [];
page.on('pageerror', (e) => log.push('PAGEERROR ' + e.message));
page.on('console', (m) => log.push(m.type().toUpperCase() + ' ' + m.text()));

await page.goto(BASE + '/tools/daw.html', { waitUntil: 'load' });
await page.waitForTimeout(2500);

const result = await page.evaluate(async () => {
  const t = await import('/src/core/tracks.js');
  const track = t.tracks.add({ name: 'WaveRecheck' });
  t.tracks.setInstrumentType(track.id, 'wave-synth');
  const snaps = [];
  for (const ms of [100, 300, 600, 1000, 2000, 3000]) {
    await new Promise((r) => setTimeout(r, ms === 100 ? 100 : ms - snaps.reduce((a, s) => a + s.waited, 0)));
    const after = t.tracks.get(track.id);
    snaps.push({
      waited: ms,
      instrumentType: after.instrumentType,
      kind: after.kind,
      hasInstrument: !!after.instrument,
      instrumentId: after.instrument ? after.instrument.constructor.id : null,
    });
  }
  return { trackId: track.id, snaps };
});

console.log(JSON.stringify(result, null, 2));
console.log('--- console/page log ---');
console.log(log.join('\n'));
await page.waitForTimeout(3000);
await browser.close();
