# RECEIPT — clock (P2/S3)

Seat: `clock`, BUILD. Brief: [A-clock.md](A-clock.md).
Last update: **2026-08-23 18:40 EDT** — receipt write 8 of 8. **All eight seat questions
VERIFIED. DONE-CHECK PASSED.** Seat complete.

---

## VERIFIED — 8 of 8 seat questions, measured not asserted

Harness: `clock-testpage.html` driven by `clock-testdriver.py`. Real Google Chrome,
headless, no audio device, project root served over `http://127.0.0.1` — the same browser,
host and standard `recon-scheduler` used in `S2-recon/recon-scratch/`. Raw output:
`clock-testresults-fast.json`.

Click times are captured by wrapping `ctx.createOscillator` in the test page, so every
timing number below is the **actual AudioContext start time of real scheduled audio**, not
a proxy for it. No test hook was added to `clock.js`.

| Seat question | Result | The measurement |
|---|---|---|
| **2 · audio and visual loops separate** | **PASS** | `clock.js` contains **0** `requestAnimationFrame` call sites. rAF sampled 60.3/s, scheduler ran 40.7/s (the 25 ms interval) — two independent cadences. Playhead ran backwards **0×** and passed the scheduler's leading edge **0×**. Window tiling: 0 gaps, 0 overlaps |
| **3 · tempo change while playing** | **PASS** | 120 → 200 BPM mid-playback. `clock.bpm` reads back **200 immediately**. Commit latency **100.1 ms**. Click spacing before **500.00 ms** (max dev **0.000 ms**), after **300.00 ms** (max dev **0.000 ms**). 0 gaps, 0 overlaps across the change — a stutter would be one or the other |
| **4 · loop region, 100 passes** | **PASS** | 4 bars (bars 1→5, `endBar` exclusive) at 480 BPM. **100 seams crossed.** 0 gaps, 0 overlaps, 0 zero-width windows. 16 distinct beat ticks covered, **0** outside the region, coverage spread ≤ 1. **1604 clicks against 1604 covered beat ticks — exactly equal.** And the sharpest number in the whole seat: **every click gap in the run was 125.000–125.000 ms.** A dropped seam event would leave a 250 ms gap; a doubled one, a 0 ms gap. Across 100 seams, neither appears |
| **5 · count-in** | **PASS** | 2 bars at 240 BPM, recording from bar 3. `state` = `'recording'` and `countingIn` = true at once; position **pinned at tick 3840** throughout; **6 clicks heard and 0 `'tick'` events emitted** during the count-in — nothing plays and nothing records. First `'tick'` window starts at **exactly tick 3840** |
| **6 · metronome is here** | **PASS** | Master-chain peak amplitude **0.316** — real signal reached the master chain. Click spacing median **250.00 ms**, max deviation **0.000 ms**. Accents at 1800 Hz on indices **[0, 4, 8]** — every 4th click and only every 4th; 8 unaccented at 1200 Hz; **0** clicks at any other pitch. Connects via `createChannel()`, never `ctx.destination` |
| **7 · tab-background recovery** | **PASS**, on a **PROXY** | See OPEN DECISIONS 1 — the trigger is untestable, the recovery path is not. 1.5 s main-thread starvation: **1** `'resync'` fired, transport landed **4.3 ticks (9 ms of musical time)** from where wall-clock says, **0 catch-up bursts**, scheduler running again with the leading edge back ahead of the playhead |
| **8 · triplet-to-tick over 64 bars** | **PASS** | **Accumulated error: ZERO ticks.** Three divisions × three methods. 16ths (1024 steps × 120), 8th triplets (768 × 160), 16th triplets (1536 × 80) — every one lands on 122,880 by integer accumulation AND by `clock.js`'s own exported `stepToTicks()`. 0 non-integer ticks, 0 bar/beat round-trip errors |

### THE DONE-CHECK — five minutes of metronome. **PASS.**

Test page: `Builddocs/P2-beat-tool/S3-clock/clock-testpage.html`. Raw:
`clock-testresults-hold.json`.

| | |
|---|---|
| ran | **300.01 s** of AudioContext time |
| clicks | **601**, expected 601 |
| **MAX deviation from a perfect 120 BPM grid, whole run** | **0.0000 ms** |
| mean deviation | **0.0000 ms** |
| every click gap | **500.000–500.000 ms** (expect 500.000) |
| scheduler windows | **12,001** · gaps **0** · overlaps **0** |
| unplanned resyncs | **0** — one would have meant the scheduler starved |
| final position | 150.4.465 = tick 287,985 against wall-clock's 288,005 |

**That 20-tick offset is `ARM_LEAD_S`, not drift** — 20 ticks at 120 BPM is 20.8 ms, the
same 20 ms the whole take is offset from the button press. Drift would grow across the run;
this is a constant, and the 0.0000 ms max deviation over 601 clicks is what proves it.

**The brief's DONE-CHECK, item by item:** plays a metronome that holds time for five
minutes ✓ · changes tempo mid-playback without stutter ✓ · loops four bars seamlessly for
100 passes ✓ · counts in ✓ · recovers from a backgrounded tab ✓ (on a proxy — see OPEN
DECISIONS 1) · reports zero tick drift over 64 bars in both 16ths and triplets ✓.

### Three real bugs the harness caught — two in `clock.js`, one in the test

Neither was a test artifact. Named because they are the kind a student would hear.

1. **The first beat of every playback landed 11–16 ms late.** `arm()` anchored tick 0 at
   `currentTime + 0.005`, but the next scheduler pass could be a full 25 ms interval away,
   by which time tick 0 was in the past and the click clamped to "now". One late downbeat
   at the top of every take. Fixed by `ARM_LEAD_S = 0.020` **and** running a pass
   synchronously from `play()`, `record()` and `seek()`. Deviation is now **0.000 ms**.
2. **`clock.bpm` read back the old value while a change was pending.** A BPM slider
   two-way-bound to it would snap backwards mid-drag for the ~100 ms before the commit
   landed. The getter now returns the requested tempo; the committed tempo is on the
   `'tick'` payload, where a consumer that needs it looks.
3. **In the TEST, not the clock — and named so nobody mistakes it for a clock fix.** Q4's
   first run reported FAIL on click count: it expected `16 × cycles = 1616` and got 1604.
   The run is cut mid-cycle, so the final cycle covers only its first four beats;
   `4×101 + 12×100 = 1604` — the clock was exactly right and the arithmetic in the
   assertion was not. Replaced with a stricter check (clicks must equal the beat ticks the
   scheduler actually covered) plus the min/max gap assertion, which needs no bookkeeping
   at all. Q6 had a second one: a `ctx.destination` grep that matched `clock.js`'s own
   comment saying never to call it. **Both were assertion errors; neither changed
   `clock.js`.** Every other FAIL in this seat was a real bug and was fixed in the code.

### One honest difference from findings-scheduler — NOT a contract amendment

Commit latency measured **100.1 ms** here against Q4's **115.7–153.0 ms** band. Not a
contradiction and not a §3 number: Q4's harness measured to the first newly-*created*
event, while this clock commits at the scheduler's leading edge, which is inside the
window by definition. **Lower than the finding, not higher.** Q4's architectural claim —
"the lookahead window IS the tempo-change responsiveness budget" — is confirmed exactly:
the number came out at the window size. Nothing in §3 changed. Reported, not buried.

---

## DELIVERABLE STATE

**Q1 — Does it implement CONTRACTS §3 exactly? YES, AND EXERCISED BY 8 PASSING TESTS.**

`/src/core/clock.js` exists, ~640 lines, ES module, zero dependencies. Every §3 name is
present with §3's spelling: `state · bpm · timeSignature · songLengthBars · loop · countIn ·
metronome · play() · stop() · record() · seek(bar,beat,tick) · position · schedule(atTime,fn) ·
on('tick') · on('statechange')`. §13.1's four conversion functions live here and are
exported, because §13.1 says there is exactly one implementation of each and §13 never named
the file.

### The numbers, and the finding behind each

| §3 number | Verdict | Finding that decided it |
|---|---|---|
| PPQ 480 | KEPT | findings-scheduler Q5 — 0 ticks drift over 64 bars, both triplet subdivisions, because `480 = 2⁵·3·5` |
| `setInterval` 25 ms | KEPT, **and no Worker** | Q1: p50 25.1 / p95 26.1 / max 26.2 idle, identical under 32 voices + 2 rAF canvases. Q3: Worker is worse idle (p95 28.5) and ties under a blocked main thread — a Worker does not move the bottleneck |
| 100 ms lookahead | KEPT | Q4: this window IS the tempo-change budget — commit latency 115.7–153.0 ms, mean 127.8. Shrinking it trades against the late-event margin §3's amendment already measured |

**Nothing in `findings-scheduler.md` contradicts §3, so this seat has made no contract
amendment.** The one place the finding drives code §3 does not describe is Q2 (tab
backgrounding, UNVERIFIED) — built to recon's recommendation, see OPEN DECISIONS 1.

### Design decisions worth naming

- **Segment timeline, not a running counter.** `{startTime, startTick, secPerTick}`. Every
  event time is one multiply off its segment anchor, never accumulated pass to pass, so
  five minutes carries the error of one multiply. A new segment is pushed at a tempo change,
  a meter change, a loop wrap, a seek, and a background recovery.
- **`position` reads the AUDIBLE now**, up to 100 ms behind the scheduler's leading edge, so
  the playhead shows what is being heard and wraps a loop when the sound wraps.
- **Half-open `[fromTick, toTick)` windows.** Every tick belongs to exactly one window — the
  mechanism that makes "no dropped or doubled event at the seam" structural, not tested-for.
- **`loop.endBar` is EXCLUSIVE.** §7's `{startBar: 1, endBar: 5}` is the four-bar loop the
  DONE-CHECK asks for. Nothing in the docset says this out loud; stated in the file.
- **Metronome is here.** §3 lists `clock.metronome` on the transport. It takes no voice from
  §11.2's pool and no weight from §8's governor, and it connects through `createChannel()`,
  never `ctx.destination` (§10).

### Extensions to §3 — needed to make §3 usable, reported not assumed

§3 is a skeleton; five things it does not name had to exist. None contradicts it.

1. **`'tick'` payload shape** — `{fromTick, toTick, timeOf(tick), secPerTick, bpm,
   timeSignature, ticksPerBeat, ticksPerBar, state}`. §3 names the event and not its
   argument; without a tick→time function no consumer can schedule anything.
2. **`clock.positionTicks`** — the absolute 0-based tick. §13.1 makes it the only storage unit.
3. **`clock.countingIn` / `countInRemainingBars`** — §3 has no fourth state to carry a count-in.
4. **`clock.unschedule(id)`** — §3 gives no way to take a one-shot back.
5. **`clock.on('resync')`** — forced by findings-scheduler Q2, see OPEN DECISIONS 1.

Also present: `off()` (audio.js already sets that precedent), `dispose()` (§2's rule),
`leadingEdgeTicks` (diagnostics).

---

## HANDOFF — what S4, S5 and every later phase bind to

`import { clock } from '/src/core/clock.js'`. One module, no dependencies but `audio.js`.

**To play something on the grid, subscribe to `'tick'` and schedule inside the window:**

```js
clock.on('tick', ({ fromTick, toTick, timeOf }) => {
  for (const step of stepsBetween(fromTick, toTick))   // half-open [fromTick, toTick)
    instrument.noteOn(step.note, step.v, timeOf(step.tick));
});
```

That is the whole integration. Four rules that come with it:

1. **The range is half-open.** Never re-handle `toTick` — the next window owns it. This is
   what makes a loop seam produce neither a dropped nor a doubled event, and it is verified
   at 100 seams, not assumed.
2. **Schedule at `timeOf(tick)`, and only for ticks inside this window.** Do not compute
   your own tick→time; tempo and meter can change between windows.
3. **Never schedule audio from rAF** (§3, §10). rAF reads `clock.position` for drawing and
   nothing else. `clock.js` contains zero `requestAnimationFrame` call sites, verified.
4. **Do not re-implement §13.1's tick math.** `toTicks · fromTicks · stepToTicks ·
   ticksToStep · ticksPerBeat · ticksPerBar · ticksPerStep · stepsPerBar` are exported from
   this file. §13.1: "there is only one implementation of each."

**Three things a later seat must know rather than discover:**

- `loop.endBar` is **exclusive**. Bars 1→5 is a four-bar loop.
- A tempo change is audible ~100 ms after the write. That is the lookahead window and it is
  not a bug — findings-scheduler Q4, and Web Audio cannot un-schedule a started node.
- After a background gap the clock **reseeks and drops** what the gap missed, announcing it
  on `'resync'`. A consumer holding its own idea of "where we were" must re-read
  `clock.positionTicks` on that event.

---

## NEXT ACTION

**None for this seat. It is done and it stops here.** All eight seat questions and the
DONE-CHECK pass; the handoff is reported to the Troubleshooter.

For whoever picks this file up next (S4 `grid`, S5 `capture`, P3, P4) — the whole
regression suite is one command, from `Builddocs/P2-beat-tool/S3-clock/`:

```
python3 clock-testdriver.py fast     # Q2,Q3,Q5,Q6,Q7,Q8   ~30 s
python3 clock-testdriver.py loop     # Q4 · 100 loop passes ~3.5 min
python3 clock-testdriver.py hold     # the 5-minute DONE-CHECK
```

**If one fails, fix `clock.js`, not the assertion** — unless the assertion is provably
wrong on its own terms, which happened twice here and is written up under the bugs section
so the precedent is not abused.

**Not this seat's, and named so no one assumes it was missed:** swing (§13.2a) is not
built — see OPEN DECISIONS 6.

---

## OPEN DECISIONS

1. **Tab backgrounding — STILL OPEN, Brandon.** findings-scheduler Q2 is UNVERIFIED: three
   attempts across two seats could not make automated Chrome fire a real `hidden`
   transition. recon's recommendation — "do not assume ticks continue while hidden; treat
   resumed playback after a background gap as a reseek from the current transport position"
   — is what this file builds. Brandon has not overridden it. The knob is
   `RESEEK_THRESHOLD_S = 0.25` in `clock.js`. **Decider: Brandon.**
2. **Default BPM = 120.** CONTRACTS names no default. §7's header shows `96`, but inside an
   example project alongside example channel ids, so this seat read it as example content
   rather than a default and used the universal transport value. **Decider: Brandon**, one
   line to change. Not blocking — a loaded project sets it.
3. **The transport does not stop at `songLengthBars`.** Nothing in §3 or §7 says it should,
   and a transport that halts mid-take because a length field was stale is worse than one
   that runs on. **Decider: Brandon / Troubleshooter.**
4. **`stop()` leaves the playhead where it stopped** rather than returning to the start
   point. `seek(1,1,0)` is return-to-zero. Nothing in §3 or §7 rules on it. **Decider:
   Brandon.**
5. **`bottom = 2` versus §3's `position.tick` range** — spec-clock's OPEN DECISIONS item 3,
   handed to this seat. At 2/2 a beat is 960 ticks and §3 documents `position.tick` as
   `0..PPQ-1`. This file returns `0..ticksPerBeat-1` (0..959 at 2/2) and does **not** work
   around it — §3 is frozen and the fix would be §3 text. **Decider: Brandon**, per the
   FREEZE NOTICE. Not blocking: 4/4 is §7's default and the whole curriculum.
6. **Swing (§13.2a) is NOT built.** It is not in this seat's eight questions, not in the
   DONE-CHECK, and its amount and feel curve are spec-clock's OPEN DECISIONS item 4 with
   Brandon as decider. §13.2a puts the mechanism on the clock, so it lands on this file
   whenever it is assigned. **Decider: Brandon on feel; Troubleshooter on which seat builds it.**

---

## FILE LOCATIONS

Root = `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/`

- **THE DELIVERABLE:** `<root>src/core/clock.js` — the seat's one owned file
- **This receipt:** `<root>Builddocs/P2-beat-tool/S3-clock/receipt-clock.md`
- **Test page:** `<root>Builddocs/P2-beat-tool/S3-clock/clock-testpage.html` — also a
  working manual transport for Brandon: buttons, a live playhead, BPM/loop/count-in fields
- **Test driver:** `<root>Builddocs/P2-beat-tool/S3-clock/clock-testdriver.py`
- **Raw results:** `<root>Builddocs/P2-beat-tool/S3-clock/clock-testresults-{fast,loop,hold}.json`
  and `loop-run.log` / `hold-run.log` in the same folder
- **Read, not touched:** `src/core/audio.js` (P1, frozen — imported for `ctx` and
  `createChannel`) · `Builddocs/CONTRACTS.md` §3, §7, §10, §13 ·
  `Builddocs/P2-beat-tool/S2-recon/findings-scheduler.md`
