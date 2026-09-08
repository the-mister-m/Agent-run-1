// Headed load check: opens each page, records pageerrors and console errors, screenshots.
const pw = await import('/Users/moth3rship/Desktop/AI Design/Wayfinder/node_modules/playwright/index.js');
const chromium = (pw.default ?? pw).chromium;

const ROOT = '/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1';
const SHOTS = ROOT + '/docs/reports/wave-synth-port-shots';
const BASE = 'http://localhost:8080';

const pages = process.argv.slice(3);
const prefix = process.argv[2];

const browser = await chromium.launch({
  headless: false,
  slowMo: 300,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });

let n = 0;
for (const rel of pages) {
  n++;
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text());
  });
  await page.goto(BASE + rel, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const shot = `${SHOTS}/${prefix}-${String(n).padStart(2, '0')}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  console.log(`${rel}  errors=${errs.length}  shot=${shot.split('/').pop()}`);
  for (const e of errs) console.log('   ' + e);
  await page.waitForTimeout(1200);
  await page.close();
}

await browser.close();
