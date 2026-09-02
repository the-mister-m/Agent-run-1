// Playwright DONE-CHECK driver for automation.js. Run with the project served over HTTP.
// node automation-verify.mjs
import { chromium } from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profileDir = mkdtempSync(join(tmpdir(), 'cbdaw-automation-pw-'));
const URL = 'http://127.0.0.1:8000/docs/scratchpad/automation-test.html';

function ok(label, cond, detail = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? ' — ' + detail : ''));
  if (!cond) process.exitCode = 1;
}

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  channel: undefined, // Playwright's own bundled Chromium, never the system Chrome
});
const page = context.pages()[0] ?? (await context.newPage());
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// Chrome's console mirrors every failed resource load as a generic, URL-less error text;
// the 'response' listener below already identifies the real URL and allow-lists favicon only.
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
});
page.on('response', (res) => {
  if (res.status() === 404 && !res.url().endsWith('/favicon.ico')) errors.push(`404 ${res.url()}`);
});

await page.goto(URL);
await page.click('#unlock');
await page.waitForFunction(() => window.__mods && window.__mods.ctx.state === 'running');
await page.click('#run');

// mid-fade fader grab: hold at ~40% through the 2s ramp, release, confirm hold-then-resume.
await page.waitForTimeout(800);
const faderBox = await page.locator('#stripHost .cbdaw-strip__fader').boundingBox();
await page.mouse.move(faderBox.x + faderBox.width / 2, faderBox.y + faderBox.height * 0.5);
await page.mouse.down();
await page.waitForTimeout(60); // let the click's own grab-to-this-position settle first
const heldGain1 = await page.evaluate(() => window.__strip.gain);
await page.waitForTimeout(350);
const heldGain2 = await page.evaluate(() => window.__strip.gain);
await page.mouse.up();
await page.waitForTimeout(600);
const afterReleaseGain = await page.evaluate(() => window.__strip.gain);

await page.waitForFunction(() => window.__done === true, null, { timeout: 8000 });

const result = await page.evaluate(() => ({
  samples: window.__samples,
  rafViolation: window.__rafWriteViolation,
  gainPoints: window.__gainLane.getPoints(),
  gainState: window.__gainLane.getState(),
  emptyLaneState: window.__panLane.constructor ? null : null,
}));

const { samples, rafViolation, gainState } = result;

ok('no page/console errors', errors.length === 0, errors.join(' | '));
ok('rAF never wrote a strip target', rafViolation === false);

const early = samples.slice(0, 3);
const late = samples.slice(-3);
const earlyGain = Math.max(...early.map((s) => s.gain));
const lateGain = Math.min(...late.map((s) => s.gain));
ok('gain lane fades over the 4 bars', earlyGain < 0.3 && lateGain > 0.9,
  `early=${earlyGain.toFixed(3)} late=${lateGain.toFixed(3)}`);

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const earlyPeakWindow = samples.slice(0, 12).map((s) => s.peak);
const latePeakWindow = samples.slice(-12).map((s) => s.peak);
const earlyPeak = mean(earlyPeakWindow);
const latePeak = mean(latePeakWindow);
ok('audible level rises with the gain lane (masterAnalyser)', latePeak > earlyPeak * 1.5,
  `earlyPeak(mean of 12)=${earlyPeak.toFixed(4)} latePeak(mean of 12)=${latePeak.toFixed(4)}`);

const earlyPan = early[0].pan;
const latePan = late[late.length - 1].pan;
ok('pan lane moves the image', earlyPan < -0.5 && latePan > 0.5,
  `earlyPan=${earlyPan.toFixed(2)} latePan=${latePan.toFixed(2)}`);

// bar = 480*4 = 1920 ticks at 4/4. mute lane: on at tick 1920, off at tick 3840.
const bar = 1920;
const duringMute = samples.filter((s) => s.tick > bar + 100 && s.tick < 2 * bar - 100);
const beforeMute = samples.filter((s) => s.tick < bar - 100);
const afterMute = samples.filter((s) => s.tick > 2 * bar + 100 && s.tick < 3 * bar);
ok('mute lane switches on at the point, no ramp', duringMute.length > 0 && duringMute.every((s) => s.mute === true));
ok('mute lane clear before/after its window', beforeMute.every((s) => s.mute === false) && afterMute.every((s) => s.mute === false));

ok('fader-grab: hand wins while held', Math.abs(heldGain2 - heldGain1) < 0.01,
  `heldGain1=${heldGain1.toFixed(3)} heldGain2=${heldGain2.toFixed(3)}`);
ok('fader-grab: lane resumes after release', afterReleaseGain > heldGain2 + 0.01,
  `heldGain2=${heldGain2.toFixed(3)} afterRelease=${afterReleaseGain.toFixed(3)}`);

ok('getState() schema matches §7', gainState && gainState.target === 'strip.gain'
  && Array.isArray(gainState.points) && gainState.points.every((p) => 'tick' in p && 'value' in p));

const roundTrip = await page.evaluate(() => {
  const { AutomationLane } = window.__mods;
  const src = window.__gainLane.getState();
  const json = JSON.parse(JSON.stringify(src));
  const dummyStrip = new window.__mods.Strip(window.__mods.ctx, { id: 'ch2', label: 'RT' });
  const lane2 = new AutomationLane(dummyStrip, 'strip.gain');
  lane2.setState(json);
  const back = lane2.getState();
  lane2.dispose();
  dummyStrip.dispose();
  return JSON.stringify(back) === JSON.stringify(src);
});
ok('round-trips through JSON with no loss', roundTrip);

const emptyLaneOmitted = await page.evaluate(() => {
  const s = new window.__mods.Strip(window.__mods.ctx, { id: 'ch3', label: 'Empty' });
  const chan = window.__mods.createChannelAutomation(s);
  const empty = chan.getState().length === 0;
  chan.dispose();
  s.dispose();
  return empty;
});
ok('an empty lane is not written to the project file', emptyLaneOmitted);

console.log('---');
console.log('exitCode', process.exitCode || 0);
await context.close();
