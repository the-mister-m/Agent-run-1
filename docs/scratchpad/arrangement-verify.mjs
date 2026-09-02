// Run against `python3 -m http.server 8000` from the project root, playwright installed
// separately (not in this repo — see receipt-arrangement.md).
import { chromium } from 'playwright';

const errors = [];
const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

await page.goto('http://127.0.0.1:8000/docs/scratchpad/arrangement-test.html');
await page.waitForTimeout(300);

const result = {};

result.laneCount = await page.locator('.cbdaw-arr__lane-body').count();
result.laneHeadCount = await page.locator('.cbdaw-arr__lane-head').count();
result.laneLabels = await page.locator('.cbdaw-arr__lane-label').allTextContents();

// pitched lanes mount piano-roll (.cbdaw-roll), drum lanes mount step-grid (.cbdaw-grid)
result.rollMounts = await page.locator('.cbdaw-arr__lane-body .cbdaw-roll').count();
result.gridMounts = await page.locator('.cbdaw-arr__lane-body .cbdaw-grid').count();

// ruler ticks/labels present
result.tickCount = await page.locator('.cbdaw-arr__tick').count();
result.barTickCount = await page.locator('.cbdaw-arr__tick[data-bar="true"]').count();
result.firstLabels = await page.locator('.cbdaw-arr__label').allTextContents().then((a) => a.slice(0, 8));

// page body must never scroll horizontally
result.bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
result.bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
result.hostScrollWidth = await page.evaluate(() => document.querySelector('.cbdaw-arr__scroll').scrollWidth);

// playhead moves under rAF while playing, with no audio scheduling call from arrangement.js
const before = await page.locator('.cbdaw-arr__playhead').evaluate((el) => el.style.left);
await page.click('#btnPlay');
await page.waitForTimeout(900);
const after = await page.locator('.cbdaw-arr__playhead').evaluate((el) => el.style.left);
result.playheadBefore = before;
result.playheadAfter = after;
result.playheadMoved = before !== after;
await page.click('#btnStop');

// loop region: turn on, check wash visible and handles positioned
await page.click('#btnLoopOn');
await page.waitForTimeout(150);
result.loopWashHidden = await page.locator('.cbdaw-arr__loop-wash').evaluate((el) => el.hidden);
result.loopToggleOn = await page.locator('.cbdaw-arr__loop-toggle').getAttribute('data-on');

// arm + punch per lane, first lane only
const armBtn = page.locator('.cbdaw-arr__lane-head').nth(0).locator('button', { hasText: 'ARM' });
await armBtn.click();
result.armedAfterClick = await armBtn.getAttribute('data-on');

const punchBtn = page.locator('.cbdaw-arr__lane-head').nth(0).locator('button', { hasText: 'PUNCH' });
await punchBtn.click();
result.punchAfterClick = await punchBtn.getAttribute('data-punch');
result.punchWashHiddenAfterOn = await page.locator('.cbdaw-arr__punch-wash').first().evaluate((el) => el.hidden);

// record with lane 1 armed: exercise capture wiring end to end, no thrown error expected
await page.click('#btnRecord');
await page.waitForTimeout(200);
await page.click('#btnLog');
result.laneLogAfterRecord = await page.locator('#log').textContent();
await page.click('#btnStop');

// rebind channels — labels should change, no thrown error
await page.click('#btnRebind');
await page.waitForTimeout(150);
result.labelsAfterRebind = await page.locator('.cbdaw-arr__lane-label').allTextContents();

result.pageErrors = errors;
result.consoleErrors = consoleErrors;

await browser.close();
console.log(JSON.stringify(result, null, 2));
