Written 2026-08-24 — session agent, at Brandon's ask

# GLYPH AND COLOR RULES — for Brandon to rule on

This doc exists so an agent can read it, read the code, and close five drift items without
asking. Nothing here is decided. Every section is a question with options and one line of
consequence. Rule in the margin or out loud; a seat writes the code.

Covers TODO.md items 6, 7, 8, 9, 13 and the open chord-spelling thread.

---

## CORRECTION 2026-08-24 — who actually has to close these

The session agent originally put all seven questions on Brandon's desk. **That was wrong for
three of them** and Brandon called it:

> what the fuck is so hard about an agent going in, figure out the best version, and making
> it consistent?

He is right. Honest split:

- **Q1, Q3, Q5 are agent work.** Markup living inside a label string is not a taste question
  — it forces `innerHTML` at every call site, and the circle is SVG where `innerHTML` does
  not render `<i>` at all. There is a determinable best version. No ruling required.
- **Q2, Q4, Q6, Q7 are Brandon's.** Which accidentals are italic, whether label follows
  colour or colour follows label, and what a ninth chord is called are teaching decisions.
  An agent picking one is writing curriculum.

**Brandon is taking all seven anyway**, and said why:

> I'll look at the glyph plumbing, it's agent work but at this point I should have known
> that this was the stopping point and it's taste work (half of what I'm confident telling
> you is from clicking around a little bit)

So this doc stays whole and stays his. The split above is recorded so the seat that
eventually implements knows which answers were rulings and which were just cleanups.

## WHERE TO STAND WHILE READING THIS

Everything in Parts One and Two is on **[tools/harmony.html](tools/harmony.html)**.

- **Raw `<i>x</i>` tags** — click any degree's `+` on the scale circle **twice**. The degree
  goes double-sharp and the circle prints the literal tag. The piano roll beside it renders
  the same string correctly.
- **Label vs. colour** — move a degree with `+`, then read a diatonic key's number against
  its colour. After `setScaleDegree(1, +2)` the key that is degree 3 shows `2`/`Re` in
  degree 3's colour.
- **`positionShift`** — **not reachable here.** `harmony.html` has no position control. The
  `−`/`+` buttons are drawn by `keyboard.js` (lines 514-516) on the synth pages,
  [tools/wave-synth.html](tools/wave-synth.html) and
  [tools/overtone-synth.html](tools/overtone-synth.html), which mount the keyboard through
  `shell.js`.

**Keyboard typing rows, as built** — never specified by Brandon, recorded here because he
will be clicking around ([keyboard.js:81-90](src/surfaces/keyboard.js#L81-L90)):

```
LOWER ROW — left hand, C4:   Z X C V B N M , . /    blacks:  S D   G H J   L ;
UPPER ROW — right hand, C5:  Q W E R T Y U I O P    blacks:  2 3   5 6 7   9 0
```

Keyed by physical key code, not letter, so the shape survives layout and Shift.
`positionShift` never rotates this map — it changes only what is drawn.

**Voicing is not in this doc.** Brandon ruled it 2026-08-24 and it reopened P3 — see
[TODO.md](TODO.md), first section.

---

## PART ONE — ACCIDENTAL GLYPHS

### The situation

`theory/scale.js` has two glyph tables. Both mix plain characters with HTML markup:

- `GLYPH`      — `-2: <i>bb</i>` · `-1: ♭` · `0: ` · `1: ♯` · `2: <i>x</i>`
- `GLYPH_ASCII` — `-2: <i>bb</i>` · `-1: b` · `0: ` · `1: <i>#</i>` · `2: <i>x</i>`

Because the strings contain markup, every surface that prints a label has to use
`innerHTML`. Three do. One does not:

- `piano-roll.js` line 1183 — `innerHTML`, correct, with the reason written in-file
- `diatonic-keys.js` line 437 — `innerHTML`, correct
- `harmony.html` line 268 — `textContent` on a `<b>`, **prints raw tags**
- `scale-circle.js` line 633 — `textContent` on an SVG `<text>`, **prints raw tags**

The circle's is reachable in two clicks of its own `+`.

### Q1 — Should a label string carry HTML at all?

- **(a) Yes, keep markup in the string.** Every surface must use `innerHTML`. The circle
  is SVG — `innerHTML` on an SVG `<text>` node does not render `<i>`, so the circle needs
  a real `<tspan>` build, not a one-word swap.
- **(b) No, strings go plain; styling moves to CSS.** Labels return plain text
  (`bb`, `b`, `#`, `x`) plus a data attribute naming the accidental; a CSS rule italicizes.
  All four surfaces then use `textContent` and the circle stops being a special case.

Consequence: (a) is a smaller edit today and keeps the bug class alive. (b) is a wider edit
and kills it permanently.

### Q2 — Which accidentals are italic?

Today's tables say: doubles italic, single flat upright, single sharp italic in `GLYPH_ASCII`
only. That is the inconsistency `piano-roll` flagged — it reads as a typo.

- **(a) Doubles only.** `bb` and `x` italic; `b` and `#` upright. Makes `GLYPH_ASCII`'s
  `1: '<i>#</i>'` a mistake to correct.
- **(b) All accidentals italic.** `b`, `#`, `bb`, `x` all italic. Makes `GLYPH_ASCII`'s
  `-1: 'b'` the mistake.
- **(c) None italic.** Both tables go plain; italics stop being a signal.

Consequence: whichever you pick, one of the two rows in `GLYPH_ASCII` changes. Right now
they contradict each other and no rule in CONTRACTS settles it.

### Q3 — Does the unicode table follow the same rule?

`GLYPH` uses real `♭`/`♯` characters for singles but markup `<i>bb</i>`/`<i>x</i>` for
doubles — it never had a double-flat or double-sharp unicode character to use.

- **(a) Yes, same rule as Q2, and doubles use `𝄫`/`𝄪` unicode.** One table, no markup at
  all. Font support on a Chromebook is unverified.
- **(b) No, `GLYPH` keeps ASCII fallback for doubles.** The tables stay different shapes
  and Q1's answer has to cover both.

---

## PART TWO — COLOR AND LABEL

### The situation

`diatonic-keys.js` `keySpecFor()` builds a key from two different sources:

- **color** — `row.colorToken`, where `row = circlePositions(scale)[degreeIndex]`.
  Follows the DEGREE INDEX.
- **label** — `scaleLabel(scale, pc, overlay, { position })`. Follows the PITCH CLASS.

They agree until a degree is moved. After `setScaleDegree(1, +2)`, the key that is degree 3
shows the text `2` / `Re` painted in degree 3's color. The label says one thing, the color
says another, on the same key, to a student.

### Q4 — When label and color disagree, which one is telling the truth?

- **(a) Color follows the label.** Color is computed from the pitch class, same as the text.
  A moved degree changes color with its name. Student sees one consistent object.
- **(b) Label follows the color.** Text is computed from the degree index. A moved degree
  keeps its slot's name and color; the pitch underneath changes silently.
- **(c) They are allowed to disagree, and that IS the lesson.** The mismatch is the visible
  sign the student altered something. Then it needs a third mark so it does not read as a
  bug — an outline, a texture, something the `altered` flag already knows about.

Consequence: this is the only one of the five with real teaching content. (c) is more work
and possibly the honest answer for a teaching tool.

### Q5 — Where does the quality-to-color map live?

`QUALITY_TOKEN` in `theory/scale.js` is the single source: five rows, `major` → `--deg-major`
and so on, with `--deg-aug` added when you ruled M-14. But `diatonic-keys.js` also carries
five CSS rules that duplicate it by hand. They match today only because the CSS was written
after M-14. The next color ruling changes one and not the other.

- **(a) One source.** Delete the CSS copy; the surface reads `QUALITY_TOKEN` like the others.
- **(b) Keep the copy, add a test.** Faster to render, needs something that fails when they
  drift.

---

## PART THREE — CHORD SPELLING PAST THE SEVENTH

### The situation

You ruled six 7th-chord letter names (CONTRACTS §15 F4). `SEVENTH_NAME` in `theory/chord.js`
is that ruling verbatim. Two things are still unnamed and the code says so in-file:

- **Ninths and up.** `chordName` at count 5 today would produce `LETTER_SUFFIX + EXT[5]` —
  `C9` for C E G B D. `chord.js` line 389 flags that "is C E G B D `Cmaj9`?" is a further
  decision. The hook is already there: a `NINTH_NAME` table beside `SEVENTH_NAME`.
- **Numerals at count 4.** `numeralOf`/`numeralParts` have no seventh table at all.
  `chord.js` line 319 names the shape: a `NUMERAL_SEVENTH` table keyed the same way.

Pitches are correct in both cases. Only the names are missing.

### Q6 — Ninth-chord letter names

Nine cells, same shape as `SEVENTH_NAME` — triad quality × seventh class, now with the ninth.
The practical set for a major-scale tool:

| stack | today prints | candidate |
|---|---|---|
| major triad + major 7th + 9th | `C9` | `Cmaj9` |
| major triad + minor 7th + 9th | `C9` | `C9` |
| minor triad + minor 7th + 9th | `C9` | `Cm9` |
| diminished triad + minor 7th + 9th | `C9` | `Cm7b5(9)` |

- **(a) Rule the candidates above** and I have a seat build `NINTH_NAME`.
- **(b) Rule your own set** — write four to nine strings and the seat uses them verbatim.
- **(c) Don't name ninths yet.** Then `chordName` must refuse at count 5 rather than print
  a wrong `C9`. That is a code change too, and a smaller one.

### Q7 — Numeral names at count 4

- **(a) Numerals get sevenths.** `V7`, `ii7`, `viiø7` — a `NUMERAL_SEVENTH` table.
- **(b) Numerals stay triads.** At count 4 the numeral overlay shows the triad numeral
  unchanged, and letters carry the seventh information alone.

---

## WHAT HAPPENS AFTER YOU RULE

One seat takes this doc and closes, in `/src` only:

- Q1–Q3 → `theory/scale.js` glyph tables, `scale-circle.js` line 633,
  `harmony.html` line 268 · TODO items 6, 7, 13
- Q4 → `diatonic-keys.js` `keySpecFor()` · TODO item 8
- Q5 → `diatonic-keys.js` CSS · TODO item 9
- Q6–Q7 → `theory/chord.js`, new tables only, no logic change

No CONTRACTS edit is proposed here. §15 is append-only and owned by `spec-scale`; whatever
you rule gets appended by that seat, not by the one doing the code.
