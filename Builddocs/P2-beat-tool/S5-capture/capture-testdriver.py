"""
capture seat (P2/S5) verification driver.

Walks the seat brief's DONE-CHECK against the real /src/core/capture.js, the real clock,
the real grid and the real drum machine — served over http (§10: never assume file://),
in real Google Chrome, headless, no audio device. Same harness shape as the `clock` seat's
clock-testdriver.py and recon-scheduler's S2 harnesses.

DONE-CHECK, item by item:
  D1  arm a drum machine
  D2  hear a count-in (and write nothing during it)
  D3  play a backbeat in from QWERTY and from MIDI
  D4  loop four bars and overdub across passes
  D4r replace mode, and a silent pass replacing nothing
  D5  punch over one piece without touching the others
  D6  undo the last take
  D7  capture velocity from MIDI
  D8  zero audio recorded anywhere

Usage:  python3 capture-testdriver.py
"""
import sys, json, os, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PORT = 8895
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE = "http://127.0.0.1:%d/Builddocs/P2-beat-tool/S5-capture/capture-testpage.html" % PORT

# Each entry: (name, async JS body returning {pass, lines}). `C` is window.__cap.
CHECKS = [

("D1 · arm a drum machine — the grid drives 8 §14.1 roles, capture maps note->lane", """
  const C = window.__cap;
  const lines = [];
  C.capture.arm('all');
  const pieces = C.drum.constructor.pieces.map(p => `${p.index}:${p.note}:${p.label}`);
  lines.push('pieces ' + pieces.join(' '));
  lines.push('armed  ' + JSON.stringify(C.capture.armedLanes));
  lines.push('grid lanes ' + C.grid.getPattern().lanes.length + ', bars ' + C.grid.getPattern().bars);
  return { pass: pieces.length === 8 && C.capture.armedLanes === 'all'
                 && C.grid.getPattern().lanes.length === 8, lines };
"""),

("D2 · count-in gates the start — 1 bar, nothing written across it", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 1; C.clock.metronome = true; C.clock.bpm = 120;
  C.capture.arm('all'); C.capture.quantize.on = true;
  C.capture.record();
  lines.push('countingIn right after record(): ' + C.clock.countingIn);
  const wasCounting = C.clock.countingIn;
  // Play four hits DURING the count-in. Every one must be dropped and counted.
  for (let i = 0; i < 4; i++) { C.hit(36); await new Promise(r => setTimeout(r, 120)); }
  const droppedIn = C.capture.dropped.duringCountIn;
  lines.push('hits during count-in: 4, dropped.duringCountIn = ' + droppedIn);
  lines.push('capture.state while counting: ' + (wasCounting ? 'countingIn' : '(count-in already over)'));
  // Wait out the count-in (1 bar @120 = 2 s), then one hit that MUST land.
  await new Promise(r => setTimeout(r, 2200));
  lines.push('countingIn after 2.2 s: ' + C.clock.countingIn);
  C.hit(36);
  await new Promise(r => setTimeout(r, 200));
  const rep = C.capture.stopTake();
  lines.push('committed notes: ' + rep.noteCount + ' (expected 1)');
  C.clock.stop();
  return { pass: wasCounting && droppedIn === 4 && !C.clock.countingIn && rep.noteCount === 1, lines };
"""),

("D3 · a backbeat in from QWERTY and from MIDI — same bus, same result", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.loop = {on:false, startBar:1, endBar:5};
  C.grid.setPattern({bars:1, lanes: C.grid.getPattern().lanes.map(l => ({...l, steps: l.steps.map(()=>null)}))});
  C.capture.arm('all'); C.capture.quantize.on = true; C.capture.quantize.strength = 1;
  C.clock.bpm = 120; // one bar = 2 s, one beat = 500 ms
  C.capture.record();
  const beat = 500;
  const t0 = performance.now();
  // kick on 1 and 3 from QWERTY, snare on 2 and 4 from MIDI.
  const plan = [[0,36,'key'],[1,38,'midi'],[2,36,'key'],[3,38,'midi']];
  for (const [b, note, src] of plan) {
    const due = t0 + b * beat;
    await new Promise(r => setTimeout(r, Math.max(0, due - performance.now())));
    C.hit(note, src === 'midi' ? 0.95 : 0.8, src);
  }
  await new Promise(r => setTimeout(r, 300));
  const rep = C.capture.stopTake();
  C.clock.stop();
  lines.push('kick lane  (0): ' + JSON.stringify(C.lane(0)));
  lines.push('snare lane (1): ' + JSON.stringify(C.lane(1)));
  lines.push('sources: ' + JSON.stringify(rep.sources));
  lines.push('snap summary: ' + JSON.stringify(rep.summary));
  const kick = C.lane(0).map(s => s[0]), snare = C.lane(1).map(s => s[0]);
  // 16ths at 4/4: beats land on steps 0,4,8,12.
  const ok = kick.includes(0) && kick.includes(8) && snare.includes(4) && snare.includes(12)
             && rep.sources.key === 2 && rep.sources.midi === 2;
  return { pass: ok, lines };
"""),

("D4 · loop four bars and OVERDUB across passes", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.bpm = 200;   // one bar = 1.2 s, four bars = 4.8 s
  C.clock.loop = {on:true, startBar:1, endBar:5};
  C.grid.bars = 4;
  C.grid.setPattern({bars:4, lanes: C.grid.getPattern().lanes.map(l => ({...l, steps: l.steps.map(()=>null)}))});
  C.capture.arm('all'); C.capture.loopMode = 'overdub';
  C.capture.record();
  const bar = 1200;
  await new Promise(r => setTimeout(r, 40));
  C.hit(36);                                     // pass 1: kick near bar 1
  await new Promise(r => setTimeout(r, bar * 4)); // wrap into pass 2
  C.hit(38);                                     // pass 2: snare near bar 1
  await new Promise(r => setTimeout(r, bar * 4)); // wrap into pass 3
  C.hit(42);                                     // pass 3: hat near bar 1
  await new Promise(r => setTimeout(r, 300));
  const rep = C.capture.stopTake();
  C.clock.stop();
  lines.push('passes counted: ' + rep.passes);
  lines.push('kick  ' + JSON.stringify(C.lane(0)));
  lines.push('snare ' + JSON.stringify(C.lane(1)));
  lines.push('hat   ' + JSON.stringify(C.lane(2)));
  const ok = C.lane(0).length === 1 && C.lane(1).length === 1 && C.lane(2).length === 1
             && rep.passes >= 2;
  lines.push('overdub kept all three passes: ' + ok);
  return { pass: ok, lines };
"""),

("D4r · REPLACE mode — last playing pass wins, and a SILENT pass replaces nothing", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.bpm = 200;
  C.clock.loop = {on:true, startBar:1, endBar:5};
  C.grid.bars = 4;
  C.grid.setPattern({bars:4, lanes: C.grid.getPattern().lanes.map(l => ({...l, steps: l.steps.map(()=>null)}))});
  C.capture.arm('all'); C.capture.loopMode = 'replace';
  C.capture.record();
  const bar = 1200;
  await new Promise(r => setTimeout(r, 40));
  C.hit(36);                                      // pass 1: kick
  await new Promise(r => setTimeout(r, bar * 4));
  C.hit(38);                                      // pass 2: snare — must ERASE the kick
  await new Promise(r => setTimeout(r, bar * 4));
  const afterReplace = { kick: C.lane(0).length, snare: C.lane(1).length };
  lines.push('after a playing pass: kick=' + afterReplace.kick + ' snare=' + afterReplace.snare);
  await new Promise(r => setTimeout(r, bar * 4)); // pass 3: SILENT
  const afterSilent = { kick: C.lane(0).length, snare: C.lane(1).length };
  lines.push('after a silent pass:  kick=' + afterSilent.kick + ' snare=' + afterSilent.snare);
  const rep = C.capture.stopTake();
  C.clock.stop();
  C.capture.loopMode = 'overdub';
  const ok = afterReplace.kick === 0 && afterReplace.snare === 1
             && afterSilent.snare === 1;
  lines.push('replace erased the earlier pass, silent pass erased nothing: ' + ok);
  return { pass: ok, lines };
"""),

("D5 · punch bars 3-4 on ONE piece, everything else untouched", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.bpm = 200; C.clock.loop = {on:false, startBar:1, endBar:5};
  C.grid.bars = 4;
  // Lay down a pattern by hand first — this is the material the punch must NOT touch.
  const p = C.grid.getPattern();
  for (const l of p.lanes) l.steps = l.steps.map(() => null);
  p.lanes[0].steps[0]  = { v: 0.8 };   // kick, bar 1
  p.lanes[0].steps[32] = { v: 0.8 };   // kick, bar 3
  p.lanes[2].steps[8]  = { v: 0.5 };   // hat,  bar 1
  C.grid.setPattern(p);
  const before = { kick: JSON.stringify(C.lane(0)), hat: JSON.stringify(C.lane(2)) };
  lines.push('before — kick ' + before.kick + ' | hat ' + before.hat);

  C.capture.disarm('all');
  C.capture.arm({ note: 38 });     // the snare, and only the snare
  C.capture.punchIn(3, 5);         // bars 3-4, endBar exclusive
  C.capture.record();
  const bar = 1200;
  C.hit(38);                                     // bar 1 — OUTSIDE the punch, must be dropped
  C.hit(36);                                     // bar 1 — UNARMED lane, must be dropped
  await new Promise(r => setTimeout(r, bar * 2 + 60));
  C.hit(38);                                     // bar 3 — inside the punch, must land
  await new Promise(r => setTimeout(r, 300));
  const rep = C.capture.stopTake();
  C.clock.stop();
  C.capture.punchOff(); C.capture.arm('all');
  const after = { kick: JSON.stringify(C.lane(0)), hat: JSON.stringify(C.lane(2)) };
  lines.push('after  — kick ' + after.kick + ' | hat ' + after.hat);
  lines.push('snare  ' + JSON.stringify(C.lane(1)));
  lines.push('dropped ' + JSON.stringify(rep.dropped));
  const snareSteps = C.lane(1).map(s => s[0]);
  const ok = before.kick === after.kick && before.hat === after.hat
             && rep.dropped.outsidePunch === 1 && rep.dropped.unarmedLane === 1
             && snareSteps.length === 1 && snareSteps[0] >= 32;
  return { pass: ok, lines };
"""),

("D6 · undo the last take — pattern and notes both come back", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.bpm = 200; C.clock.loop = {on:false, startBar:1, endBar:5};
  C.capture.arm('all'); C.capture.punchOff();
  const p = C.grid.getPattern();
  for (const l of p.lanes) l.steps = l.steps.map(() => null);
  p.lanes[0].steps[0] = { v: 0.8 };
  C.grid.setPattern(p);
  const baseline = JSON.stringify(C.grid.getPattern());
  const notesBefore = C.notes().length;

  C.capture.record();
  await new Promise(r => setTimeout(r, 40));
  C.hit(38); C.hit(42);
  await new Promise(r => setTimeout(r, 300));
  C.capture.stopTake();
  C.clock.stop();
  const afterTake = JSON.stringify(C.grid.getPattern());
  lines.push('take added notes: ' + (C.notes().length - notesBefore));
  lines.push('pattern changed by take: ' + (afterTake !== baseline));

  const u = C.capture.undo();
  const afterUndo = JSON.stringify(C.grid.getPattern());
  lines.push('undo returned: ' + JSON.stringify(u));
  lines.push('pattern restored byte for byte: ' + (afterUndo === baseline));
  lines.push('notes back to ' + C.notes().length + ' (was ' + notesBefore + ')');

  const r2 = C.capture.redo();
  const afterRedo = JSON.stringify(C.grid.getPattern());
  lines.push('redo restored the take: ' + (afterRedo === afterTake));
  C.capture.undo(); // leave it undone
  const ok = afterTake !== baseline && afterUndo === baseline
             && C.notes().length === notesBefore && afterRedo === afterTake && !!u && !!r2;
  return { pass: ok, lines };
"""),

("D7 · velocity captured from MIDI, fixed fallback from QWERTY", """
  const C = window.__cap, lines = [];
  C.clock.stop(); C.clock.seek(1,1,0);
  C.clock.countIn = 0; C.clock.bpm = 120; C.clock.loop = {on:false, startBar:1, endBar:5};
  C.grid.bars = 1;
  C.grid.setPattern({bars:1, lanes: C.grid.getPattern().lanes.map(l => ({...l, steps: l.steps.map(()=>null)}))});
  C.capture.arm('all');
  C.capture.record();
  await new Promise(r => setTimeout(r, 30));
  C.hit(36, 20/127, 'midi');   // soft stick
  await new Promise(r => setTimeout(r, 260));
  C.hit(38, 127/127, 'midi');  // hard stick
  await new Promise(r => setTimeout(r, 260));
  C.hit(42, 0.8, 'key');       // QWERTY — §12.1's fixed fallback
  await new Promise(r => setTimeout(r, 300));
  const rep = C.capture.stopTake();
  C.clock.stop();
  const v = {};
  for (const n of rep.notes) v[n.note] = Number(n.velocity.toFixed(3));
  lines.push('velocities by note: ' + JSON.stringify(v));
  lines.push('velocityRange: ' + JSON.stringify(rep.velocityRange));
  lines.push('kick lane fill: ' + JSON.stringify(C.lane(0)) + ' snare: ' + JSON.stringify(C.lane(1)));
  const ok = Math.abs(v[36] - 20/127) < 0.002 && Math.abs(v[38] - 1) < 0.002
             && Math.abs(v[42] - 0.8) < 0.002 && v[36] !== v[38];
  lines.push('MIDI velocity survived to the §13.5 step: ' + ok);
  return { pass: ok, lines };
"""),

("D8 · ZERO audio recorded anywhere", """
  const C = window.__cap, lines = [];
  lines.push('navigator.mediaDevices.getUserMedia ever called: ' + C.micAsked());
  const src = await (await fetch('/src/core/capture.js')).text();
  const code = src.split('\\n').filter(l => {
    const t = l.trim();
    return !(t.startsWith('*') || t.startsWith('//') || t.startsWith('/*'));
  }).join('\\n');
  const banned = ['getUserMedia','MediaRecorder','MediaStream','AudioWorklet',
                  'ScriptProcessor','AudioBuffer','decodeAudioData','createMediaElementSource',
                  'AudioContext','captureStream'];
  const hits = banned.filter(b => code.includes(b));
  lines.push('banned audio-capture identifiers in capture.js CODE (comments stripped): ' +
             (hits.length ? hits.join(', ') : 'none'));
  const imports = [...src.matchAll(/^import .*from '(.+)';/gm)].map(m => m[1]);
  lines.push('imports: ' + JSON.stringify(imports));
  lines.push("what a take stores: " + JSON.stringify(C.notes().slice(0,2)));
  const ok = !C.micAsked() && hits.length === 0 && !imports.includes('./audio.js');
  return { pass: ok, lines };
"""),
]


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    httpd = serve()
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROME,
                headless=True,
                args=["--autoplay-policy=no-user-gesture-required"],
            )
            page = browser.new_page()
            page.set_default_timeout(0)
            page.on("console", lambda m: print("  [console:%s] %s" % (m.type, m.text))
                    if m.type in ("error", "warning") else None)
            page.on("pageerror", lambda e: print("  [PAGEERROR] %s" % e))
            page.goto(PAGE)
            page.wait_for_function("window.__ready === true")
            print("ctx state after unlock:", page.evaluate("window.__unlock()"))
            for name, body in CHECKS:
                print("\n=== %s ===" % name, flush=True)
                r = page.evaluate("async () => { %s }" % body)
                r["name"] = name
                results.append(r)
                print("%s" % ("PASS" if r["pass"] else "FAIL"))
                for line in r["lines"]:
                    print("   " + line)
            browser.close()
    finally:
        httpd.shutdown()

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "capture-testresults.json")
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    failed = [r["name"] for r in results if not r["pass"]]
    print("\n%d/%d passed. %s" % (len(results) - len(failed), len(results),
                                  ("FAILED: " + ", ".join(failed)) if failed else "All green."))
    print("wrote", out)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
