// Job 3 check: Controllers palette group on both patch-synth pages, and none in a compact mount.
// Run from the repo root with  python3 -m http.server 8765  up:
//   node docs/scratchpad/tool-fixes/patch-controllers.mjs
import { chromium } from '/Users/moth3rship/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
for (const path of ['tools/desktop/patch-synth.html', 'tools/mobile/patch-synth.html']) {
  const errors = [];
  const page = await browser.newPage({ viewport: path.includes('mobile') ? { width: 420, height: 900 } : { width: 1366, height: 900 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8765/' + path);
  await page.waitForTimeout(800);
  const read = () => page.evaluate(() => {
    const groups = [...document.querySelectorAll('.ps[data-view="expanded"] .ps-group-head')].map((h) => h.textContent);
    const btns = [...document.querySelectorAll('[data-group="controllers"] .ps-add')].map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}`);
    const panels = [...document.querySelectorAll('.cbdaw-panel')].map((p) => `${p.querySelector('.cbdaw-panel__title')?.textContent}:${p.hidden ? 'hidden' : 'shown'}`);
    return { groups, btns, panels, kbd: document.querySelectorAll('.cbdaw-kbd').length, circle: document.querySelectorAll('.cbdaw-circle').length };
  });
  const out = { load: await read() };
  await page.click('[data-controller="circle"]');
  out.circleOn = await read();
  // press the first inner-ring zone and see the synth take a note
  out.circleNote = await page.evaluate(() => {
    const zone = document.querySelector('.cbdaw-circle [data-ring="inner"], .cbdaw-circle [data-zone], .cbdaw-circle path');
    if (!zone) return 'no zone found';
    const r = zone.getBoundingClientRect();
    const opts = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1, isPrimary: true };
    zone.dispatchEvent(new PointerEvent('pointerdown', opts));
    const held = window.cbdawPatchSynth.synth._heldNote;
    zone.dispatchEvent(new PointerEvent('pointerup', opts));
    return { held };
  });
  if (!path.includes('mobile')) await page.screenshot({ path: 'docs/scratchpad/tool-fixes/patch-controllers.png', fullPage: true });
  await page.click('[data-controller="keyboard"]');
  out.keysOff = await read();
  await page.click('[data-controller="keyboard"]');
  out.keysOn = await read();
  // a compact mount the page did not hand controllers to
  out.compact = await page.evaluate(async () => {
    const { default: PatchSynth } = await import('/src/instruments/patch-synth.js');
    const { ctx, createChannel } = await import('/src/core/audio.js');
    const host = document.createElement('div');
    host.style.height = '300px';
    document.body.appendChild(host);
    const s = new PatchSynth(ctx, createChannel());
    s.mountCompact(host);
    const n = host.querySelectorAll('[data-group="controllers"]').length;
    const heads = [...host.querySelectorAll('.ps-group-head')].map((h) => h.textContent);
    s.dispose();
    host.remove();
    return { controllersGroups: n, heads };
  });
  out.dispose = await page.evaluate(() => JSON.stringify(window.cbdawPatchSynth.dispose()));
  console.log(path, JSON.stringify(out, null, 1));
  console.log('errors:', errors.length ? errors : 'none');
  await page.close();
}
await browser.close();
