# RECEIPT — spec-scale (P3/S1)

Seat: `spec-scale`, SPEC. Opened **2026-08-24 14:48 EDT**.
Last update: **2026-08-24 16:19 EDT** — **SEAT REOPENED A SECOND TIME.** Three defects from
`redpen-theory`'s report fixed in §15. See the FIX PASS block immediately below.
Prior updates: **15:32 EDT** (Brandon ruled all fifteen open decisions; §15 amended to match)
and **15:11 EDT** (first close, after seat question 10 of 10 — Q7 was taken before Q6, because
Q6's numeral names are built on Q7's scale numbers, so Q7's section had to exist first).
Lane: [CONTRACTS.md](../../CONTRACTS.md) **§15 (Theory)**, append only. §1–§14 untouched —
**re-verified by diff after every pass, including the 16:19 fix pass: lines 1–1799
byte-identical, matching md5.**

> # ⚠ 2026-08-24 16:19 EDT — FIX PASS. **THREE DEFECTS CLOSED. THIRTEEN STILL OPEN.**
>
> `redpen-theory` (P3/S2) checked §15 against the curriculum and **PASSED the phase** — no
> error in the colour rule and no error in the numeral-case rule, so it did not stop P3. It
> listed **sixteen mismatches**
> ([theory-report.md](../S2-theory-check/theory-report.md)), three of which it marked
> *"blocks a build seat on day one."*
>
> **Brandon authorised fixing exactly those three, on one condition: each fix must be
> COMPELLED by a contract already on record, not a new invented decision.** That condition
> is met for all three, and the compelling text is cited inside each fix.
>
> | Fix | Mismatch | What was broken | What compelled the fix |
> |---|---|---|---|
> | **F1** | **M-15** | `letterHead` · `spellingOfPc` · `chordName` called or listed and **never defined**, and `SUFFIX['minor'] = ''` would print Brandon's own `Dm/F` as **`D/F`** | **A10 — Brandon's own ruling and his own example**, *"labeled as if the lowest note was the bass (III/M6, **D/F#**, etc)"*. Deferring the letter system to P4 would contradict a standing ruling. |
> | **F2** | **M-2** | `resetScaleDegree` a **silent no-op** wherever an altered scale back-matched another preset (Dorian→Mixolydian, Phrygian→Aeolian), because A8 made `name` chase `degrees` and `originDegrees` read `name` | **Frozen §4**: *"needs to see that they moved it **and get back**."* Reset-to-major does not get the student back to where they started. |
> | **F3** | **M-16** | §15.2 claimed `altered`/`preset` are *"never read by any function in this section"* — **false three times over**, and a seat obeying it would strip the `+/-` of its state | **Frozen §4's actual words**: *"never read by **the audio path**."* §15.2 overstated §4. A factual correction, not a decision. |
>
> **THIRTEEN MISMATCHES ARE UNTOUCHED AND STILL OPEN**, and none of them was re-litigated:
> **M-1, M-9, M-14** contradict frozen sections and **only Brandon can close them**; the rest
> (M-3 … M-8, M-10 … M-13) are curriculum-facing or engineering findings that are his per
> `redpen-theory`'s brief — *"everything you find is Brandon's to resolve."*
>
> **Nothing `redpen-theory` passed was reopened.** The colour rule and the numeral-case rule
> stand exactly as they were.
>
> **Landed as** a new dated sub-block in §15's amendment area —
> `[AMENDED 2026-08-24 16:19 EDT]` · **F1 · F2 · F3**, sitting after A11 — **plus the body
> edits that make each fix real**, listed in FILE LOCATIONS. A pointer at every corrected body
> location leads back to its F entry; nothing was left standing silently and nothing was
> deleted.
>
> ### One thing F1 found and deliberately did NOT decide
>
> In `tonic: 6` only, A1's enharmonic tie makes a spelling a **composite face** (`'F♯/G♭'`),
> so a letter slash label in that one key reads `F♯/G♭/A♯` — two meanings for one `/`.
> **This is the same composite-label question `redpen-theory` raised as M-1 against frozen
> §6, and §6 is Brandon's.** Recorded in §15 and escalated, per §10-H. **Not decided here.**

> # ⚠ 2026-08-24 15:32 EDT — BRANDON RULED. **D-16 IS REVERSED.**
>
> **All fifteen ODs are closed.** §15 carries an
> `[AMENDED 2026-08-24]` block (A1 … A11) at its head, and every body location built on a
> reversed assumption carries an inline superseding note pointing at it.
>
> **The reversal, flagged loudest because it is Brandon overriding his own prior explicit
> ruling:** D-16 read **"FIXED FUCKING DO"**. It is now **movable do** — *"moveable DO, the
> key of the scale is always Do."* §15.2c's `FIXED_DO` constant is struck.
> [open-decisions.md](../../P0-run-open/open-decisions.md) D-16 is stamped SUPERSEDED with
> a pointer to §15.
>
> **Everything in this receipt below the DELIVERABLE STATE table is the 15:11 text**, kept
> as the record of what was handed off before the rulings, **except**: the DONE-CHECK worked
> example (rebuilt for movable do), the NEXT ACTION list, and the OPEN DECISIONS section
> (all fifteen marked resolved). Where a 15:11 paragraph is now wrong, it carries a struck
> correction rather than being deleted.

> ### ⚠ ENVIRONMENT — READ FIRST
> **The 15:32 amendment pass wrote DIRECTLY to the shared checkout — no worktree, no copy
> back.** The worktree problem below applies to the 14:48–15:11 pass only, and it is
> resolved: both deliverables are landed at their intended destinations. Paths in FILE
> LOCATIONS.
>
> *(15:11 text, kept as the record:)*
> This seat was launched **isolated in a git worktree** at
> `/Users/moth3rship/Desktop/AI Design/.claude/worktrees/agent-a5e4a0ce31d6945f9`.
> The harness **refuses every write to the shared checkout**, and that worktree is checked
> out at an older commit that contains **no `Agent run 1` folder at all**.
> **Resolution:** `Builddocs/` was copied into the worktree byte-identical (verified with
> `diff`), and all work was done on that copy. **The deliverables must be copied back to
> the shared checkout to land.** Exact paths in FILE LOCATIONS.

---

## DELIVERABLE STATE

| Seat question | State | Where it landed |
|---|---|---|
| 1 · What is the scale API? | **DONE** | CONTRACTS §15.0–§15.2 |
| 2 · How is the circle laid out? | **DONE** | CONTRACTS §15.3 |
| 3 · What is the color rule, computed? | **DONE** | CONTRACTS §15.4 |
| 4 · 12 scales and the +/- | **DONE** | CONTRACTS §15.5 |
| 5 · Skip method as a function | **DONE** | CONTRACTS §15.6 |
| 6 · Roman numeral → notes | **DONE** | CONTRACTS §15.8 |
| 7 · Chord numbering vs scale numbering | **DONE** | CONTRACTS §15.7 |
| 8 · Inversions and comping | **DONE** | CONTRACTS §15.9 |
| 9 · The note bank | **DONE** | CONTRACTS §15.10 |
| 10 · OPEN DECISIONS | **DONE** | CONTRACTS, `OPEN DECISIONS — spec-scale, §15` |
| **— · Brandon's rulings, OD-1…OD-15** | **DONE 15:32** | CONTRACTS §15 `[AMENDED 2026-08-24]` **A1–A11**, plus superseding notes through the §15 body |

**All ten answered, plus the ruling pass.** §15's heading is still at **line 1800**; after
the 15:32 amendment its subsections run to line **3366**, the end of the file. §15.0 ·15.1
·15.2 ·15.3 ·15.4 ·15.5 ·15.6 ·15.7 ·15.8 ·15.9 ·15.10 + `OPEN DECISIONS — spec-scale,
§15` (now at line 3199), with the `[AMENDED 2026-08-24]` block **A1–A11** sitting between
the §15 heading and §15.0 so nobody reads the body before the rulings.

**Append-only, verified by `diff` twice — at 15:11 and again at 15:32:** lines 1–1796 —
every byte of §1–§14 — are **identical** to how this seat found the file. Nothing frozen was
edited. **§9 in particular was NOT edited**, even though OD-6 was about a missing §9 token:
the fix went into a `theory/scale.js` indirection instead.

**Q1 — answered.** §15.0 sets the three authority marks this whole section runs on —
**CONFIRMED** (Brandon's words or a frozen section, cited inline), **DERIVED** (a
consequence of a confirmed statement, with the derivation shown so it is overturnable in
one line), and **⛔ BRANDON** (not sourced; no seat may pick a value). §15.1 fixes the
vocabulary and restates nothing of §4's 7-stored/8-shown ruling beyond binding to it.
§15.2 is the API itself: `pitchClassOf` / `pitchClasses` / `isInKey` / `degreeIndexOf`
(pure functions of `degrees` and `tonic`, per §4), `spellingOf`, and `label()` for all four
§6 overlay modes.

**Three things worth the Troubleshooter's eye:**

1. **Spelling is now 11/12 settled from one word of Brandon's.** D-18 says "key signatuer".
   A key signature never carries a double accidental, which kills D♯/G♯/A♯ major outright —
   so E♭, A♭, B♭ are **forced**, not chosen. Only `tonic: 6` is genuinely open (F♯ = 6
   sharps vs G♭ = 6 flats, an exact tie) and `tonic: 1` rests on a fewer-accidentals
   tiebreak (D♭ 5♭ vs C♯ 7♯). ~~**I picked neither of those two; they are OD-1 and
   OD-1a.**~~ **✅ 15:32 — Brandon: *"enharmonics follow key signature or show both."***
   `tonic: 1` → **D♭**, now CONFIRMED. `tonic: 6` is the one exact tie → **both faces**, so
   every degree in that key spells twice (`F♯/G♭`, `G♯/A♭`, …). **All twelve keys settled;
   the `letter` overlay works everywhere. OD-1 + OD-1a closed → §15 `A1`.**
2. ~~**Fixed do (D-16) and no-chromatic-solfege (D-17) collide with the outline's "1/8 for
   Do".** Under fixed do, degree 1 is `Do` only in C; in B major only two of seven degrees
   get a syllable at all. §15.2c implements both rulings exactly as Brandon wrote them and
   states the consequence in the open as **OD-3**.~~
   **✅ 15:32 — DEAD. Brandon reversed D-16 to movable do.** The collision does not exist:
   the syllable now binds to the degree index, all seven degrees speak in every key, the
   tonic is always `Do`, and "1/8 for Do" is literally true everywhere. **OD-3 is void.**
   D-17 is untouched. → §15 `[AMENDED 2026-08-24] · A2`.
3. **Degree collisions are preserved, not repaired.** If a student's `+/-` moves one degree
   onto another, `pitchClasses` carries the repeat and nothing sorts or dedupes it — §4
   makes `degrees` the source of truth in stored order, and hiding the collision would hide
   what the student just did.

**Q2 — answered.** §15.3 gives `scale-circle` (P3/S5) **one call** — `circlePositions(scale,
octave)` — returning eight finished rows (position, degree index, pc, midi, number, letter,
solfege, quality, color token, altered flag). The surface draws what it gets and computes
nothing, which is how §4's "no surface computes its own colors" and §6's "no surface builds
its own label strings" stop being hopes.

**Position 8 is position 1**, differing in exactly two ways — the `number` label (`'8'` per
§6) and the sounding pitch (+12). Same degree index, letter, syllable, quality, colour.

**The rule I would most want `redpen-theory` to check: position 8 carries no `+/-` of its
own.** §4's own amendment says why — `altered` is `[bool × 7]`, so an eighth control "moves
the octave off the tonic. Nothing musical happens; the scale breaks and no surface has a
way to say so." `setScaleDegree(7, …)` must be rejected by `scale-engine`.

~~**Two things I did not decide.**~~ **✅ 15:32 — both ruled, and `scale-circle` (P3/S5) is
unblocked.** Brandon: *"circle draws 7 slots, labels Do 1/8"* and *"Do is 12-o-clock, top
center of circle."* **Seven drawn slots**, the Do slot carrying both the `1` and the `8`;
Do at 12 o'clock. `circlePositions()` still returns 8 entries and **its shape did not
change** — entry 8 survives only to carry the octave pitch. Direction was not ruled:
**clockwise** ships as one flippable constant, and the merged Do slot sounds the lower tonic
— both my easiest-to-undo calls. **OD-4 + OD-5 closed → §15 `A4` · `A3`.**

**Q3 — answered, and this is the section to red-pen hardest.** §15.4 computes the quality
of degree `i` from two intervals of the skip triad `(i, i+2, i+4)` mod 7: `(4,3)` major ·
`(3,4)` minor · `(3,3)` diminished · `(4,4)` augmented · **anything else `'altered'`**.
Five values, exactly as the brief names them. `'altered'` is not a fifth chord type — it is
the honest answer when a student's `+/-` has produced a stack that is **not a triad at
all**, which takes two presses.

**Written into the contract as a prohibition, not a preference:** a per-key lookup table of
diatonic qualities is **drift**. It is right in twelve keys and wrong the instant the `+/-`
is touched — the exact moment the device is supposed to teach. Also stated: nothing sorts
the three offsets (a non-ascending stack must read `'altered'`, not be quietly repaired);
the colour always uses the **three-note triad** however many tones are sounding (§4's own
words); and `tonic` is not an input, so a transposed scale is the same colours.

§15.4 carries the **C major reference table** — all seven degrees, offsets, intervals,
quality, token, numeral — derived by running the formula, not recalled. `test-p3` can
assert it verbatim.

**The gap I could not close: §9 defines four degree colour tokens and there are five
qualities.** §9 is frozen inside §1–§10; only Brandon can add a token. Worse, **the word
`altered` means two different things in this codebase** — §15's "not a recognizable triad"
and §4's `state.scale.altered` "the student moved this degree off the preset" — and they
are not the same degrees (in the worked example, degree 3 is `scale.altered[2] === true`
but its triad is a clean augmented). §15 reads `--deg-altered` as the quality, because §9
lists it beside three other qualities, and files the whole thing as **OD-6**.

**✅ 15:32 — Brandon handed this one back: *"augmented and diminished seem to have none,
have the agents make a decision."* I made it, in the SPEC seat rather than in a BUILD seat**
— `degreeColor` has six callers, and if S3/S4/S5 each decide, they drift. Augmented shares
`--deg-dim` through a five-row `QUALITY_TOKEN` object, so changing it later is **one string
in one object**. §9 is **not** edited — I cannot edit it and did not. The word collision is
resolved by source rather than by renaming: `--deg-altered` is the **quality**; "the student
moved this degree" is read from §4's `scale.altered[i]`, which `circlePositions()` already
returns on every entry. **What I would have recommended asking Brandon: add `--deg-aug` to
§9.** Only he can. **OD-6 closed → §15 `A5`. `redpen-theory`'s second STOP condition is
cleared.**

**Q4 — answered.** §15.5 gives a four-row table of exactly what each §4 mutation touches
(`setScaleTonic`, `setScalePreset`, `setScaleDegree`, `resetScaleDegree` × `tonic`,
`degrees`, `altered`, `preset`), so `scale-engine` has no judgement calls left.

~~**The answer to "how does a scale get named after a student alters it into something
unnamed" is: it doesn't — it is called `'Custom'`.** §15 refuses to invent a descriptive
label, and refuses to match an altered array back against the preset list and silently
rename it "Aeolian.~~"

**✅ 15:32 — REVERSED BY BRANDON.** *"follow the rules for modes and variations on minor
scales. Anything else put 'scale unknown' and I'll go back and label them myself."*
`scaleName()` **does** back-match now — a student who bends C major into `[0,2,3,5,7,9,10]`
is told **"Dorian"** — and anything unrecognised reads the literal **`'scale unknown'`**.
§4's `state.scale.preset` still goes to `'Custom'` and is untouched: `preset` is provenance,
`name` is the display label. `name` still carries no key, per §7's `"name": "Major"`.
**OD-12 closed → §15 `[AMENDED 2026-08-24] · A8`**, which also carries the step-by-step
relabel procedure Brandon asked for by name.

**One gap closed without touching a frozen section.** §7 saves `{tonic, degrees, name}` and
**not** `altered` or `preset`, so a reloaded project has no idea which degrees the student
moved and `resetScaleDegree` has no target. Instead of asking for a §7 schema change I
reconstruct both: `originDegrees = PRESETS[name] ?? MAJOR`, then
`altered[i] = degrees[i] !== origin[i]`. **The `?? MAJOR` fallback is D-1** — every one of
the twelve keys is generated from the major pattern, so major is where the student started.

~~**The preset list is ⛔ and I left it empty.**~~ **✅ 15:32 — Brandon filled it:** *"make
presets that are easy to change later"* + *"follow the rules for modes and variations on
minor scales."* **Nine ship** — Major, Dorian, Phrygian, Lydian, Mixolydian, Aeolian,
Locrian, Harmonic Minor, Melodic Minor — as **one plain data object**, with the mechanism
stated so that changing the list is a data edit and never a logic change. No seat may write
`if (preset === 'Dorian')`. **OD-11 closed → §15 `[AMENDED 2026-08-24] · A8`.**

**Also flagged: OD-10** — whether picking a new key should reset the degrees to major
(D-1's literal wording) or transpose the student's current shape (what `degrees`-as-offsets
does for free). Two different products, both defensible from the record.

**Q5 — answered.** `skipStack(scale, root, count = 3)` walks `k += 2` over the degree array
in stored order, mod 7, `+12` per wrap — **the identical `stackOffset` the colour rule
uses**. One implementation, two callers, stated as a requirement: if they ever diverge the
circle's colour stops matching the chord the student hears, which is the one failure the
device cannot have.

**`count = 3` is the default and §15 records it as a curriculum requirement, not a
convenience** — outline "they do not LEARN about 7th chords, but I do show them", PHASE.md
"build them; do not foreground them". A four-tone chord is something a student reaches for.

**Brandon's term is the term the code uses.** "Upper overtone chord" is written into the
contract with an explicit prohibition on substituting "seventh chord", "extended chord" or
"tetrad" in any variable, label or tooltip.

**Noted for the numeral section:** `count` 4 and 5 are covered by D-19 ("major and minor
7-9 variations"); `count` 6 and 7 compute correctly and have **no name Brandon has given**.

**Module boundary written down** so `scale-engine` and `chord-engine` can run in parallel
without a lane collision: `stackOffset`/`skipTriad`/`degreeQuality`/`degreeColor` live in
`scale.js` (because §4 puts the colour rule there), and `chord.js` imports them.
**`chord.js` → `scale.js`, one direction, no cycle.**

**Q7 — answered, and it is the cleanest result in the deliverable.** The outline's "numbers
refer to scale info — the 7th of the chord is the 7th note of that root's scale" is made
true **by construction, not by a check**:

- `rootScaleNote(scale, root, n) = stackOffset(scale, root, n-1) - degrees[root]` — the
  current scale rotated onto that degree, read live from `degrees`.
- `skipStack` builds tone `j` with `k = 2j`; `rootScaleNote` reaches scale number `n` with
  `k = n-1`; so `n = 2j+1`. **The 4th tone of the stack IS the 7th note of the root's
  scale** because both walk the same array with the same index.

**Consequence, written into the contract: §15 contains no chord-formula table anywhere.**
No `maj7 = [0,4,7,11]`. A formula table is right in major and wrong in every scale a
student builds with the `+/-`, and it makes the numbers refer to chord shapes instead of
scale information — the opposite of the outline's clause.

**Worked in §15.7 on an altered scale**, since major proves nothing here: in
`[0,2,3,5,7,9,11]` the 7th note of degree 5's scale is **F**, so the four-tone chord on
degree 5 is **G B D F** — where plain C major gives F♯. One number moved in an array; the
seventh followed it; **no line of code changed.**

**Q6 — answered, and this is the one where I had to derive rather than cite. Read it
before signing anything off.**

**In:** `parseNumeral` ignores case. The outline's builder lets a student "**pick** the
roman numeral" — case is what the app *tells* them, not what they assert. Honouring a typed
`iv` in C major would be a borrowed chord, which is nowhere in the curriculum and which the
`degrees` array cannot express (**OD-14**).

**Out:** `numeralOf(scale, root, count)` = cased roman + quality suffix + extension, where
the case comes straight from `degreeQuality` — **the colour rule's own output**. The numeral
and the circle's colour are the same computation read twice, so they cannot disagree. A
per-key numeral table is written into the contract as **drift**.

**⚠ THE DERIVATION `redpen-theory` MUST RULE ON — this is a STOP-condition section for
that seat.** The outline gives case for major and minor and gives **no case for anything
else**. What separates those two rows is the chord's **third**: 4 semitones in the
upper-case row, 3 in the lower-case row. So §15 carries **case is carried by the third** —
augmented shares major's third and takes upper case, diminished shares minor's and takes
lower case. It is a strict generalisation of Brandon's own two rows, it is computed from
the two intervals the colour rule already has, and it lets this seat hold no opinion about
what a diminished chord "should" look like. **It is still a derivation and it is OD-13.**
A stack with no third at all (`'altered'`) has nothing to carry a case and §15 **stops
there** rather than picking one.

~~**The suffixes are mostly ⛔ and I did not fill them.**~~ **✅ 15:32 — Brandon filled
them.** *"have them use the superscript + and either the already superscript circle or
superscript a lowercase o (I imagine that all of the chord qualities will need to be
superscript to the chord label)"* and *"no names needed past 9."*
`SUFFIX['augmented'] = '+'` · `SUFFIX['diminished'] = '°'` (chosen over `o` because U+00B0
is Latin-1 and carries zero font risk — one character to swap) · `EXT[6] = EXT[7] = ''`.
`SUFFIX['altered'] = '?'` is **my** easiest-to-undo call, flagged. **And the general rule:
every quality marker and extension digit is SUPERSCRIPT to the chord label** — so
`numeralParts()` was added beside `numeralOf()`, additively, and no consumer breaks.
**OD-7 closed → §15 `A9` · `A6`.**

**✅ 15:32 — the derivation above is RATIFIED, not overturned.** Brandon, asked whether the
case/superscript system was fully specified: *"yes, and if the system is drawn correctly
(including the ability to go back and change things, flexibility is key here), everything
else will have proper logic to understand and follow (easy to change later)."*
**Case-carried-by-the-third is now CONFIRMED, no longer DERIVED. `redpen-theory`'s STOP
condition on OD-13 is cleared.**

**Q8 — answered.** §15.9 states the reason the shape matters, not just the shape: **a pitch
class set cannot express an inversion.** `{C,E,G}` and `{E,G,C}` are the same set and the
entire lesson is that they are not the same chord to hear. So **a voicing is a list of
actual midi pitches**; pitch classes stay on the labelling/colouring side.

Four functions, all returning new arrays: `voicing(scale, root, count, octave)` (root
position, off `skipStack` + the Chord Module's octave selector, **A47**), `invert(v, n)`
(the lowest tone up an octave, n times — clamped at `count-1`, never silently wrapping),
`spread(v, offsets)` (one primitive for all of "spacing them out"), and `bassOf(v)`.

**Two rules a builder would otherwise get wrong:** a voicing stays in **sounding order,
never sorted** — after `spread`, `v[0]` is still the chord's first tone even if it is no
longer the lowest pitch, and sorting throws away which tone is which. And an inversion is
identified by its **bass**, which the curriculum's own skills list already writes that way
(`C/E`, `Dm/F`, `Bb/F`).

~~**Left alone deliberately:** the inversion *label string*…~~ **✅ 15:32 — Brandon supplied
it, and banned the thing this paragraph called an "inversion".** *"no inversion labels, on
the chord builder itself have them labeled as if the lowest note was the bass (III/M6,
D/F#, etc)."* **There is no inversion numbering anywhere a student can see.** Every voicing
labels `head/bass`; root in the bass means no slash. Letter form `D/F♯` is settled and
matches the skills list's own `C/E`. Numeral form's bass is read as the **interval from the
chord root to the bass** (`III/M6`) — my reading of his example, flagged with its
one-expression change point. **`invert()` survives — the label was banned, not the
operation.** Named comping patterns stay out, unchanged; his ruling was about labels.
**OD-15 closed → §15 `A10`.**

**Nothing new was added to §2 or §7.** A voicing plays through `noteOn` per pitch — the
Chord Module already has `static emitsNotes` (§2, forced by A19) — and saves as N notes at
one tick in frozen §7, which is also why P5's `.mid` export gets a real chord with no
special case.

**Q9 — answered.** `noteBank(scale, {root, count, octave, inversion, offsets})` returns one
object whose two halves are literally the curriculum's sentence — "**runs the logic of the
scale with the logic of the numeral they input**". The numeral side is
`degreeQuality` + `numeralOf`; the scale side is one entry per tone carrying its
**scaleNumber** (1, 3, 5, 7, 9 …), degree index, pc, midi, letter, solfege, degree digit,
and that degree's colour token. Plus the voicing and its bass.

**What a student sees:** the tones of the chord they picked, each labelled with its own
scale number — so "the 7th of the chord is the 7th note of that root's scale" is printed on
the note rather than told to them — each in its degree's colour from §9's single palette,
under a correctly-cased numeral. **This is also where 7ths are shown but not learned**:
raising `count` to 4 makes a tone appear labelled `scaleNumber: 7`, visible and explained,
and not the default.

**The note bank computes nothing.** §4 and §6 forbid a surface computing its own colours or
building its own label strings, and this is the surface those rules were aimed at. Layout,
sizing and animation are `chord-module`'s (P3/S6), not this contract's.

**Q10 — answered.** Fifteen open decisions, a named decider on every one, written into
CONTRACTS under **`OPEN DECISIONS — spec-scale, §15`**, grouped by what they block:
the two that decide whether the phase is *right* (OD-13, OD-6 — `redpen-theory` STOPs on
either), the two that block a *surface* (OD-4, OD-1), Brandon's remaining nine, and two
that are engineering. **Thirteen of the fifteen are Brandon's.** I answered none of them.

---

## DONE-CHECK — the worked example, by hand from §15 alone

**REBUILT 2026-08-24 15:32 EDT for movable do, superscript suffixes, and back-matched scale
names.** The 15:11 version of this example is superseded; the differences are called out
inline so the reversal is visible rather than quietly corrected.

**C major, degree 3 lowered by one semitone.**
`setScaleDegree(2, -1)` on §4's default.

```js
tonic:   0                              // C
degrees: [0, 2, 3, 5, 7, 9, 11]         // was [0,2,4,5,7,9,11]; degrees[2] 4 → 3
altered: [false, false, TRUE, false, false, false, false]
preset:  'Custom'                       // §4, frozen — a degree moved
name:    'Melodic Minor'                // ← CHANGED. Was 'Custom'. scaleName() back-matches
                                        //   the array against PRESETS. §15 A8.
```

> **This one line is Brandon's OD-12 ruling working.** `[0,2,3,5,7,9,11]` **is** the
> ascending melodic minor on C, and the app now says so instead of shrugging `'Custom'` at a
> student who found a real scale by ear. Had the shape matched nothing, `name` would read
> the literal **`'scale unknown'`** — Brandon's words — and A8's four-step procedure says
> exactly how he relabels it later. **`preset` is still `'Custom'`; frozen §4 governs that
> and it was not touched.** Provenance and display label are different fields.

**Pitch classes:** `0 · 2 · 3 · 5 · 7 · 9 · 11`
**Letters** (§15.2b — the letter is kept, the accidental moves): **C · D · E♭ · F · G · A · B**

**Solfège — MOVABLE DO, rebuilt (§15.2c as amended by A2):**

| Degree | 1 | 2 | **3** | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| `degrees[i]` | 0 | 2 | **3** | 5 | 7 | 9 | 11 | — |
| `MAJOR[i]` | 0 | 2 | **4** | 5 | 7 | 9 | 11 | — |
| deviation | 0 | 0 | **−1** | 0 | 0 | 0 | 0 | — |
| **syllable** | **Do** | **Re** | **Mi♭** | **Fa** | **Sol** | **La** | **Ti** | **Do** |

**Under the struck fixed-do rule this line read `Do · Re · — · Fa · Sol · La · Ti`** — degree
3 silent, because its letter carried an accidental. **It is not silent now.** Every degree
speaks, the tonic is `Do`, degree 8 is `Do`, and the one degree that left the major pattern
is **marked** — which is exactly what Brandon asked for: *"anything not following the major
pattern needs to be marked accordingly."*

**Note the trap a builder must not fall into:** the `♭` on **Mi♭** is measured against
`MAJOR[2]`, **not** against the letter. In D major degree 3 is **F♯** — an accidental in the
spelling — but its deviation from major is `0`, so its syllable is a plain **`Mi`** with no
mark. Two different subtractions, and merging them is a bug.

**Numbers** (§6, as amended by A4): **1/8 · 2 · 3 · 4 · 5 · 6 · 7** across **seven drawn
slots**, `Do` at 12 o'clock. *(Was: eight slots numbered 1…8.)*

### All seven degrees — colour and numeral

Every row is `stackOffset` run on `[0,2,3,5,7,9,11]`. Nothing here was recalled.

| Deg | Skip triad `(i, i+2, i+4)` mod 7 | offsets | `b−a`, `c−b` | **Quality** | **§9 token** | **Numeral** | tones |
|---|---|---|---|---|---|---|---|
| **1** | 0, 2, 4 | 0, 3, 7 | 3, 4 | **minor** | `--deg-minor` | **i** | C E♭ G |
| **2** | 1, 3, 5 | 2, 5, 9 | 3, 4 | **minor** | `--deg-minor` | **ii** | D F A |
| **3** | 2, 4, 6 | 3, 7, 11 | **4, 4** | **augmented** | `--deg-dim` | **III⁺** | E♭ G B |
| **4** | 3, 5, 0′ | 5, 9, 12 | 4, 3 | **major** | `--deg-major` | **IV** | F A C |
| **5** | 4, 6, 1′ | 7, 11, 14 | 4, 3 | **major** | `--deg-major` | **V** | G B D |
| **6** | 5, 0′, 2′ | 9, 12, 15 | 3, 3 | **diminished** | `--deg-dim` | **vi°** | A C E♭ |
| **7** | 6, 1′, 3′ | 11, 14, 17 | 3, 3 | **diminished** | `--deg-dim` | **vii°** | B D F |

**The suffixes in that column are new at 15:32 and every one of them is SUPERSCRIPT** —
`numeralParts()` returns `{base:'III', sup:'+'}`, `{base:'vii', sup:'°'}`. At 15:11 this
column read **III · vi · vii** with the suffixes ⛔ and empty.

`′` = wrapped past the top of the array, `+12` semitones (§15.4's `stackOffset`).

**Case, degree by degree, and where each one comes from:**

- **i, ii** — minor → lower case. **Brandon's words, verbatim.**
- **IV, V** — major → upper case. **Brandon's words, verbatim.**
- **III⁺** — augmented. Its third is **4**, the same third that makes a major chord upper
  case, so upper case. **CONFIRMED at 15:32 — Brandon ratified the derivation** (*"yes, and
  if the system is drawn correctly … everything else will have proper logic"*). *(Was
  DERIVED, OD-13.)* Superscript `+`: Brandon's word.
- **vi°, vii°** — diminished. Their third is **3**, the same third that makes a minor chord
  lower case, so lower case. **CONFIRMED at 15:32**, same ratification. Superscript `°`.
- **`--deg-dim` on the augmented degree is now a RULING, not a gap** — mine, on Brandon's
  authorisation, carried in a five-row `QUALITY_TOKEN` object so it is one string to change.
  Degree 3 is also `altered[2] === true`, which is a *different* thing from quality
  `'altered'` — and that is now read from §4's boolean, never from the colour. **OD-6
  closed.**

**Independent check.** `[0,2,3,5,7,9,11]` is the ascending melodic minor on C, whose
published triad series is **i · ii · III+ · IV · V · vi° · vii°**. The seven rows above
match it exactly — **and not one of them was looked up.** They fall out of two subtractions
per degree on an array a student edited. **At 15:32 the suffixes match that published series
too**, because Brandon ruled the two glyphs the check was already using.

**Slash labels on this scale ([A10](../../CONTRACTS.md), OD-15).** Take **V** (`root = 4`,
`count = 3`, voicing `G B D`). Rotate the bass up once → `B D G`; `bassOf` is **B**.
- **Letter system:** `G/B` — the form the curriculum's own skills list already writes.
- **Numeral system:** bass B is **4 semitones** above the chord root G → `M3`, so **`V/M3`**.
- Root in the bass → **no slash at all**, just `V`.
**No "1st inversion" string exists anywhere.** Brandon: *"no inversion labels."*

**The Q7 clause, on this same scale.** Four tones on degree 5 (`root = 4`, `count = 4`):
scale numbers `1 · 3 · 5 · 7` → offsets `7 · 11 · 14 · 17` → **G · B · D · F**. The 7th of
the chord is `rootScaleNote(scale, 4, 7)` = **F**, which is the 7th note of G's scale inside
this altered key. Plain C major gives F♯ there. **The `+/-` moved one array entry and the
seventh followed it.**

**The spec produced this example. The example did not produce the spec.**

## NEXT ACTION — rewritten 2026-08-24 15:32 EDT, amended 16:19 EDT

> ### ⚠ 16:19 EDT — WHAT THE FIX PASS CHANGES FOR THE BUILD SEATS
>
> **`scale-engine` (P3/S3) and `chord-engine` (P3/S4) can start clean on M-15, M-2 and
> M-16 — those three are closed.** Concretely:
> - **S4 has the letter path it was missing.** `chordName`, `chordNameParts`,
>   `LETTER_SUFFIX` and `spellingOfPc` are defined; **`letterHead` no longer exists and must
>   not be written.** `SUFFIX` (numerals) and `LETTER_SUFFIX` (letters) are two tables and
>   must stay two.
> - **S3 has a working `resetScaleDegree`.** Build `originName` as session state on
>   `state.scale` — **written only by `setScalePreset`** — and have `originDegrees` read it.
>   **Do not add it to §7.** §7 is frozen and stays `{tonic, degrees, name}`.
> - **S3 may read `altered` and `preset` in the labelling and drawing functions.** The old
>   "never read by any function in this section" sentence is gone; the prohibition is on the
>   **audio path** only. `circlePositions()` returning `altered` is correct.
>
> **They are NOT clear of the other thirteen mismatches, which are unchanged and Brandon's.**
> A seat that hits M-1 (composite labels vs frozen §6), M-9 (transpose vs reset) or M-14
> (the fifth colour token) **escalates under §10-H and does not decide.**

**Handoff, and this seat stops.** §15 is complete, every seat question is answered, and
**every one of the fifteen open decisions is closed.** Nothing in §15 is ⛔.

- **`redpen-theory` (P3/S2) still reads §15 next, before any code exists — but its two STOP
  conditions are cleared.** OD-13 (numeral case) was **ratified** by Brandon and is now
  CONFIRMED; OD-6 (the fifth colour token) was **handed to the agents** and decided here.
  **Point it instead at the `[AMENDED 2026-08-24]` block A1–A11 and at the seven
  easiest-to-undo calls listed below** — those are the only places §15 now speaks without a
  Brandon citation.
- **⚠ Point it hardest at the D-16 reversal.** Brandon overrode his own prior explicit
  ruling. `redpen-theory` should confirm no fixed-do text survives anywhere in §15 and that
  D-17 was not damaged in the process.
- **`scale-circle` (P3/S5) is unblocked** — seven slots, Do at 12 o'clock, `'1/8'` on the Do
  slot, all twelve keys spelled.
- **`scale-engine` (P3/S3)** builds §15.2, §15.3, §15.4, §15.5. It still **owns OD-8's
  enforcement**; §15 now names the value (`DEGREE_CLAMP = 2`) so two seats do not each
  invent one. It also builds `PRESETS`, `EXTRA_NAMES`, `QUALITY_TOKEN`, `GLYPH` — **four
  plain data objects, and the whole flexibility Brandon asked for lives in them.**
- **`chord-engine` (P3/S4)** builds §15.6–§15.10, now including `numeralParts()`,
  `chordLabel()` and `chordLabelParts()`. Read §15.6's module boundary first: `chord.js`
  imports `scale.js` and never the reverse.
- **The S5 surface seats** call `circlePositions()`, `label()`, `numeralParts()` and
  `chordLabelParts()` and compute nothing. **OD-9 is no longer theirs** — the glyph table
  moved into §15, which is what "one table, not three" always meant. They own the
  `--font-music` stack in `ui/tokens.css` and the superscript rendering.

### ▶ FOR BRANDON — what I decided for him, all reversible

Seven calls, made under his standing instruction rather than referred back. Each one's
change point is named in §15's amendment block; the full list with reversal instructions is
in OPEN DECISIONS below.

| | Shipped | Would have asked |
|---|---|---|
| **OD-2** | out-of-key letters spelled in the key signature's direction | should they show a letter at all? |
| **OD-8** | clamp at ±2 semitones off major | may a degree cross its neighbour? |
| **OD-10** | picking a key **transposes**, does not reset | D-1's wording reads as *reset* |
| **OD-14** | numeral case ignored on input | do borrowed chords exist? |
| **A2** | altered degrees marked with the accidental glyph (`Mi♭`) | chromatic syllables (`Me`, `Ra`, `Fi`)? |
| **A3 · A4** | circle runs clockwise; merged Do slot sounds the lower tonic | which direction; should the Do slot sound the octave? |
| **A9** | `SUFFIX['altered'] = '?'`, superscript | print "chord unknown", like "scale unknown"? |

## FOUND, NOT FIXED — not my lane

**CONTRACTS.md still has no `## 12 ·` section header.** `spec-clock` reported this on
2026-08-23 and it is unchanged: `### 12.1`–`### 12.3` sit directly under §11, so §12 is
referenced by number throughout the file — including by the FREEZE NOTICE and by this
seat's own brief — with no heading to find it by. §1–§12 are frozen and only Brandon may
edit them. **Reported again, untouched**, so the Closer knows it survived a second seat.

**§7 cannot round-trip `altered` or `preset`.** Frozen §7 stores
`scale: {tonic, degrees, name}` only, so a reloaded project does not know which degrees the
student moved. **This is handled, not outstanding** — §15.5 reconstructs both from
`PRESETS[name] ?? MAJOR`, which needs no schema change and no frozen edit. Recorded here
only so no later seat re-discovers it as a bug.

## TROUBLESHOOTER CLOSURE — M-1, M-9, M-14, 2026-08-24 16:30 EDT

`redpen-theory`'s three "contradicts a frozen section" findings (theory-report.md), closed
against rulings Brandon had already given — no new decision made:

- **M-1** — CONTRACTS §6 amended (`[AMENDED 2026-08-24]`, cited to Brandon's "1/8 for Do"
  and "enharmonics follow key signature or show both"). Two composite forms now legal:
  `number` on the circle only (`'1/8'`, 7 slots), `letter` only where A1's spelling
  genuinely ties (`'F♯/G♭'`). The three-way tie at `tonic: 6` is **not** covered — still
  open, still Brandon's, same note left in §6.
- **M-9** — **not a contradiction.** §4 permits either "resets to major" or "transposes";
  OD-10 already picked transpose under Brandon's standing delegation, with a one-statement
  undo path on record (`receipt-spec-scale.md`, "answered by me, easiest route to undo").
  Closed, no file change needed.
- **M-14** — **not a real gap.** §4's "diminished/augmented → flagged distinctly" is one
  clause; §9's four tokens already map onto it as `{major, minor, dim+aug, altered}`. The
  earlier ask to add `--deg-aug` to §9 is withdrawn — §9 stays untouched. Closed, no file
  change needed.

## OPEN DECISIONS — ✅ ALL FIFTEEN CLOSED, 2026-08-24 15:32 EDT

Full text in [CONTRACTS.md](../../CONTRACTS.md) §15, `OPEN DECISIONS — spec-scale, §15`, and
the rulings themselves in the `[AMENDED 2026-08-24]` block **A1–A11** at the head of §15.

**Eleven were ruled by Brandon. Four I answered myself** under his standing instruction:
*"for any other blockers, have the agents take the easiest route to undo and list the
decisions they would have recommended later as well as instructions to make it easy for
other agents to make the changes."*

### ⚠ THE REVERSAL — Brandon overriding his own prior explicit ruling

**D-16 · "FIXED FUCKING DO" → MOVABLE DO.** This is the only place in the docset where a
Brandon answer replaces a Brandon answer, and it is the reason §15.2c was rewritten rather
than annotated.

> *"moveable DO, the key of the scale is always Do"*
> *"Do is whatever the tonal center is. If the scale's tonal center is D, D is do. This
> means that anything not following the major pattern needs to be marked accordingly. If
> this is confusing, have the agent make a decision that's easy to undo."*

- **What was built on it and had to change:** `solfegeOf()` — fixed do bound the syllable to
  the **letter**, which silenced five of seven degrees in most keys. It now binds to the
  **degree index** and always speaks. `FIXED_DO` is struck and does not exist.
- **Also touched:** §15.2's API list, §15.2c in full, §15.3's `circlePositions` comment,
  §15.4's C-major reference, §15.10's `noteBank` field, and this receipt's worked example.
- **Not touched, deliberately: D-17.** "Chromatic notes get solfege? NO" still holds — a
  pitch outside the seven degrees returns `''`, which under movable do is the only silent
  case and is exactly what D-17 named.
- **`open-decisions.md` D-16 is stamped SUPERSEDED** with the date, the verbatim new ruling,
  and a pointer to CONTRACTS §15.
- **OD-3 is VOID, not deferred** — its premise was the fixed-do collision.

### ✅ Ruled by Brandon — eleven

| OD | Brandon's ruling | Landed |
|---|---|---|
| **OD-1** · F♯ or G♭ | *"enharmonics follow key signature or show both"* — the one exact tie, so **both faces**: `F♯/G♭`, `G♯/A♭`, … | §15 **A1**, §15.2b table + superseding note |
| **OD-1a** · D♭ or C♯ | same ruling; not a tie (5♭ vs 7♯), so the key signature decides → **D♭**, CONFIRMED | §15 **A1**, §15.2b table row |
| **OD-3** · fixed do vs "1/8 for Do" | **VOID** — movable do removed the premise | §15 **A2**, §15.2c struck block |
| **OD-4** · seven slots or eight | *"circle draws 7 slots, labels Do 1/8"* — **seven**, Do slot carries both digits | §15 **A4**, §15.3 |
| **OD-5** · circle orientation | *"Do is 12-o-clock, top center of circle"* | §15 **A3**, §15.3 |
| **OD-6** · the fifth colour token | *"augmented and diminished seem to have none, have the agents make a decision"* — **I decided**, see below | §15 **A5**, §15.4 |
| **OD-7** · numeral suffixes | *"superscript +"*, *"the already superscript circle"*, *"no names needed past 9"* | §15 **A9** · **A6**, §15.8 tables |
| **OD-9** · accidental glyphs | *"there should be symbol fonts that can cover the natural sign or all of them, italic # and lowercase b if not…"* | §15 **A7** |
| **OD-11** · the preset list | *"make presets that are easy to change later"* + *"follow the rules for modes and variations on minor scales"* — **nine ship** | §15 **A8**, §15.5 |
| **OD-12** · naming an altered scale | *"…Anything else put 'scale unknown' and I'll go back and label them myself"* — back-matching **reversed into** the spec | §15 **A8**, §15.5 |
| **OD-13** · numeral case | *"yes, and if the system is drawn correctly … everything else will have proper logic"* — **ratified**, now CONFIRMED | §15 **A9**, §15.8 |
| **OD-15** · inversion label | *"no inversion labels … labeled as if the lowest note was the bass (III/M6, D/F#, etc)"* | §15 **A10**, §15.9 |

### ✅ Answered by me, easiest route to undo — the four Brandon delegated wholesale

Each row is **(a) what I decided · (b) what I would have recommended asking him ·
(c) exactly how a future agent changes it.**

**OD-2 · The `letter` label for a pitch that is NOT in the key.**
**(a)** Spell it in the **key signature's direction** — flats in a flat key, sharps in a
sharp key, both faces in `tonic: 6`. Chosen because it reuses OD-1's own rule and introduces
no second principle; it is the cheapest thing to remove.
**(b)** I would have asked whether an out-of-key row should carry a letter **at all**, or
stay blank the way `number` and `solfege` are forced to. The chromatic piano roll shades
correctly either way.
**(c)** `chromaticSpelling(scale, pc)` in **`src/theory/scale.js`**. It has **one caller** —
`label()`'s `'letter'` branch — so to blank it, return `{text: ''}`; to show both faces
everywhere, return the pair. **Depends on it:** the chromatic piano roll's row labels, and
nothing else. No engine reads it.

**OD-8 · The `setScaleDegree` clamp.**
**(a)** **±2 semitones from the degree's `MAJOR` value.** Not an arbitrary number: past ±2
there is **no spelling** (§15.2b returns `text: null`) and **no solfège mark** (A2 falls
through to `'*'`), so ±2 is exactly the range the labels can describe. Shipping the number
the labels already imply is the smallest possible commitment.
**(b)** I would have asked Brandon whether a degree may **cross its neighbour** — that half
is a teaching question, not engineering, and §10-H makes it his.
**(c)** `DEGREE_CLAMP = 2` in **`src/theory/scale.js`**. **`scale-engine` (P3/S3) still owns
the enforcement** and reports it to the Troubleshooter. **Depends on it:** `spellingOf`'s
`text: null` branch and `solfegeOf`'s `'*'` fallback both become reachable if the clamp is
loosened — so loosening it means deciding what those two print, not just changing a number.

**OD-10 · Does picking a new key reset the degrees to major?**
**(a)** **Transpose.** `setScaleTonic(pc)` touches `tonic` and nothing else. `degrees` holds
offsets, so this is what the code already does — **zero new code**, which makes it the
cheapest of the two to reverse.
**(b)** I would have asked Brandon directly. **D-1's wording — "students pick the key from
the 12 notes, and the scale degrees that are generated follow the major scale pattern" —
reads as *reset*,** and reset and transpose are genuinely different products: one says "the
key picker is a starting point", the other says "the key picker is a transpose knob".
**(c)** In **`src/theory/scale.js`**, inside `setScaleTonic`, add
`degrees = [...MAJOR]; altered.fill(false); preset = 'Major';`. **One statement, one
function.** **Depends on it:** nothing computes from the choice — every other function reads
`degrees` and `tonic` as it finds them.

**OD-14 · May a student enter a numeral whose case contradicts the scale?**
**(a)** **Case ignored on input.** `parseNumeral('iv')` and `parseNumeral('IV')` both give
`{root: 3}`. Zero code, and the outline has the student *pick* a degree while the app
*tells* them the case.
**(b)** I would have asked whether **borrowed chords** exist in this curriculum at all. They
appear nowhere in the docset and the `degrees` array cannot express one.
**(c)** `parseNumeral` in **`src/theory/chord.js`**. To honour case, return a `borrowed`
boolean beside `root` and give `numeralOf` a branch that skips `applyCase`. **Depends on
it:** `numeralPitchClasses` and the whole chord builder would then need a source of pitches
outside `degrees` — which is why this is a product decision, not a parser tweak.

### ✅ Three smaller easiest-to-undo calls made *inside* a Brandon ruling

**A2 · How an off-major degree is "marked".** Brandon ruled movable do and explicitly
delegated the marking mechanism (*"If this is confusing, have the agent make a decision
that's easy to undo"*).
**(a)** The syllable carries the **deviation from `MAJOR` as an accidental glyph** — `Mi♭`,
`Fa♯` — reusing §15.2b's existing `GLYPH` constant. Return type stays a **string**, so no
consumer changes.
**(b)** I would have asked whether an altered degree should take a **chromatic solfège
syllable** (`Me`, `Ra`, `Fi`, `Le`, `Te`). That is a syllable system and §10-H makes
syllables his, so I did not ship one.
**(c)** Delete `+ MARK(scale, i)` from `solfegeOf` in **`src/theory/scale.js`**. Nothing
else reads `MARK`. `solfegeDeviation()` stays available as the signed integer.

**A3 · Circle direction.** Brandon ruled the **position** (12 o'clock), not the direction.
**(a)** Clockwise. **(b)** I would have asked; it is one word.
**(c)** `CIRCLE_DIRECTION = +1` in **`src/theory/scale.js`** — flip to `-1`. Nothing
computes from it; it is geometry only.

**A4 · What the merged Do slot sounds.** Brandon ruled the **drawing** (seven slots), not
the click.
**(a)** It emits `entries[0].midi`, the lower tonic. **(b)** I would have asked whether the
outer half of the Do slot should sound the octave, since drawing seven slots removes the
only click that ever reached it.
**(c)** One line in `scale-circle`'s (P3/S5) click handler. The octave pitch is still on
`entries[7].midi` — `circlePositions()` still returns eight entries and its shape did not
change, precisely so this stays a one-line decision.

**A9 · `SUFFIX['altered']`.** Brandon ruled `+` and `°`; a stack that is not a triad at all
has no convention and he did not name one.
**(a)** Superscript **`?`** on the stored upper-case roman, with `applyCase` as the identity
there so there is no transform to unwind. Honest, one character, and it mirrors his own
`'scale unknown'` device.
**(b)** I would have asked whether an unrecognisable stack should print the words **"chord
unknown"** beside the numeral, the way a scale prints "scale unknown".
**(c)** `SUFFIX['altered']` in **`src/theory/chord.js`**. Only `numeralOf` reads it.

### One thing I recommend Brandon rule later, that nothing is waiting on

**Add a fifth degree colour token `--deg-aug` to §9.** Augmented currently shares
`--deg-dim`, which is a real ruling I made on his authorisation, not a placeholder — but §9
is frozen and **only he can edit it**. If he does: change the `augmented` row of
`QUALITY_TOKEN` in `src/theory/scale.js`. **One string, one object, nothing else.**

## FILE LOCATIONS

**LANDED — written directly to the shared checkout in the 15:32 and 16:19 passes. No worktree,
no copy back pending:**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/CONTRACTS.md` — §15 amended (A1–A11 + superseding notes through the body + the OPEN DECISIONS list). **§1–§14 byte-identical, diff-verified.**

**16:19 FIX PASS — the exact edits inside `CONTRACTS.md`, all in §15, none before line 1800:**

| Location | Fix | Edit |
|---|---|---|
| after A11 | F1 · F2 · F3 | **NEW** `[AMENDED 2026-08-24 16:19 EDT]` FIX BLOCK — the three entries, each citing the contract that compelled it |
| §15.2 lead paragraph | **F3** | *"never read by any function in this section"* → **"never read by the audio path"**, §4's own words, with a ⚠ CORRECTED note naming the three real readers |
| §15.2 API list + its ⚠ note | F1 | `spellingOfPc` added and marked new |
| §15.5 mutation table | F2 | `originName` column added — written only by `setScalePreset`, untouched by `setScaleDegree` |
| §15.5 `originDegrees` | **F2** | `PRESETS[scale.name]` → **`PRESETS[scale.originName]`**, under a ⚠ CORRECTED banner |
| §15.5 `?? MAJOR` paragraph | F2 | the reload claim corrected — §7 saves no origin, so a reloaded project's `+/-` history is gone; stated, not hidden |
| §15.5 `preset`-after-reset paragraph | F2 | names `originName` as the memory this sentence already required |
| A8's `originDegrees` bullet | **F2** | struck and corrected — **this bullet was the defect** |
| §15.6 module-boundary table | F1 | `spellingOfPc` `chromaticSpelling` added to `scale.js`; `numeralParts` `chordName` `chordNameParts` to `chord.js` |
| §15.8 | **F1** | **NEW** subsection — `LETTER_SUFFIX` (`minor: 'm'`), `chordName`, `chordNameParts`, and the two-table comparison. `SUFFIX` is **not** edited |
| A10 `chordLabel` | F1 | `letterHead(...)` → `chordName(...)`; `letterHead` struck as a call-site invention, since §15.6's table already named the function |
| A10 letter-form bullet | F1 | ⚠ CORRECTED banner pointing at F1 |
| §15.9 function list | F1 | example updated to `'Dm/F'`; `chordLabelParts`'s sources named |

**Diff verification, 16:19:** `diff` of lines 1–1799 (everything before `## 15 · THEORY`)
against the pre-edit snapshot is **empty**, and both halves hash `0ec6621f5d64126073e1a522b179bee4`.
**The first changed line in the whole file is 2087 — inside §15's amendment area.** File grew
3366 → 3650 lines; 334 lines added or changed, all in §15.
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P0-run-open/open-decisions.md` — **D-16 stamped SUPERSEDED**, movable do, with Brandon's verbatim ruling and a pointer to CONTRACTS §15. **The only entry touched; D-17, D-18, D-19 and every other item are untouched.**
- `/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P3-harmony-tool/S1-spec/receipt-spec-scale.md` — this file.

*(15:11 pass, now historical: work was done in the worktree
`/Users/moth3rship/Desktop/AI Design/.claude/worktrees/agent-a5e4a0ce31d6945f9/…` and has
since landed at the paths above.)*

**Read, not written:** the [outline](../../../../outline),
[qa-transcript.md](../../../../qa-transcript.md), [buildmap.md](../../../../buildmap.md),
CONTRACTS §1–§14, BUILDPLAN, ROSTER, PHASE.md, STAGE.md, and `redpen-theory`'s brief.

**No `/src` file written. Nothing outside §15 and D-16 touched.**
