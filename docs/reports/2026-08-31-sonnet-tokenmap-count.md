# token-map.json count — Sonnet seat, 2026-08-31

Script: `/private/tmp/claude-501/-Users-moth3rship-Desktop-AI-Design-School-stuff-Chromebook-DAW-Agent-run-1/a9db8ac8-bc24-4423-86ff-03e2b5ec3145/scratchpad/count_tokenmap.py`
(throwaway, scratchpad only, not part of the repo)

Counted against `Builddocs/skinspecs/token-map.json` `entries` array as it exists now.

## 1. Total entries
310 array items. **Of these, 2 are not token-map entries at all** — they are
annotation/comment objects mixed into the `entries` array:
`$orphans` and `$sweep-leftovers`, each a single key/string note left by
earlier seats. They carry no `token`, `axis`, `property`, etc.
Real token-map entries: **308**.

## 2. Non-null "token"
**151**

## 3. "token": null
**157**

## 4. Neither bucket
**2** — the `$orphans` and `$sweep-leftovers` annotation objects (item 1).
151 + 157 + 2 = 310. Checksum holds.

## 5. Of the 151 non-null-token entries
- safe_for_script: true — **109**
- safe_for_script: false — **42**

## 6. Of the 42 token-carrying, safe_for_script:false entries
- Reason text contains "COMPOUND" / "COMPOUND SHORTHAND" — **33**
  (3 border-radius, 1 two-value gap, 2 box-shadow, 27 padding)
- Everything else — **9**:
  - 1 "OFF-SCALE but RULED" (padding 9px, duplicate of S1 §5's own worked example)
  - 1 transition-timing-function (only ever a shorthand component)
  - 1 CanvasRenderingContext2D.lineWidth (Job 2 / FENCE 1, JS property assign)
  - 6 `_fade()` alpha argument (Job 2, canvas helper's 2nd argument)

**Handoff's "42" is correct. Handoff's "27 compound" is wrong — actual is 33.**

## 7. expected_sites
- numeric — **64**
- null — **246**
- missing the key entirely — **2** (the same 2 annotation objects)

## 8. measured_sites < expected_sites
**0**. No entry in the file has measured_sites strictly less than expected_sites.
(There are entries where measured > expected — over-measurement, `reconciles:false`
— but that is a different flag than the one asked for, and none go the other way.)

## 9. axis distribution
- space — 148
- type — 57
- shape — 36
- depth — 31
- misc — 24
- motion — 12
- (no axis key — the 2 annotation objects) — 2

## Size/no-axis vs em/ch, among the 157 token:null entries
- Reason text is literally "off the --sp-* scale; no exact step, no snap
  authorized," on a size property (width/height/min-width/max-width/
  max-height/top/inset) — **24 entries**. This is the closest match in the
  file to "no size axis" — per Brandon's ruling (size now rides --sp-*),
  these are unblocked in principle.
- Reason text is "relative unit (em/ch); compounds through nesting..." or the
  one summary entry it references ("19 em-based font-size sites...") —
  **25 entries** (24 + 1 summary entry covering 19 measured sites). These
  stay escalated per Brandon's own ruling (em/ch still blocked).
- No entry's reason contains the literal phrase "size axis" or "no axis" —
  that exact wording does not appear in the file. The 24-entry group above is
  the nearest match, not a literal string hit.

## Escalation count — neither source matches
"Escalation" is not a single JSON field. Two candidate readings:
- token:null (all 157) — literal escalations by field.
- Reason text containing the literal word "ESCALATION" — only **38** of the
  157 use that word; the other 119 are worded as flat rulings ("0 stays 0,"
  "not part of the axes S1 named," "off the --sp-* scale," etc.) with no
  ESCALATION tag.

Under either reading, **HOWTO.md's 130 does not match. The handoff's 159 is
close but also does not match exactly** — 157 (token:null) is 2 short of 159.
GUESS, not shown by the JSON: 157 + the 2 annotation objects = 159, i.e. the
handoff may have counted `$orphans`/`$sweep-leftovers` as escalations. Not
confirmed — flagging as a guess only.

## Which source was wrong

- **Token count (65 vs 151):** HOWTO.md's 65 is wrong. Handoff's 151 is exactly right.
- **Escalation count (130 vs 159):** Neither matches exactly. HOWTO.md's 130
  is far off. Handoff's 159 is 2 over the literal token:null count of 157 —
  closer, but not exact as stated.
- **Total entries (310):** both sources say 310 and the array length is
  literally 310 — but 2 of those 310 are not token-map entries, they're
  carried-over annotation strings. Neither source flags that.

---

SESSION REVIEW — Chromebook DAW skin sweep — [timestamps: ask Brandon]
EDITS
- [docs/reports/2026-08-31-sonnet-tokenmap-count.md](2026-08-31-sonnet-tokenmap-count.md) — this receipt, token-map.json count
STRAY FILES
- [none in repo] — counting script lives only in scratchpad (path above), throwaway, not moved into docs/
GOALS DONE
- Counted token-map.json entries against HOWTO.md and the handoff's disagreement — settled with numbers, not guesses
BRANDON'S TODOS
- Rule which escalation figure (157 token:null, or 38 literally-worded "ESCALATION") is the one steps 4-8 should use
- Rule whether the 2 annotation objects ($orphans, $sweep-leftovers) should be pulled out of the `entries` array so 310 stops meaning two different things
- Rule the 24 size/no-axis entries into the sweep now that size rides --sp-*
CLOSER REVIEW
- Verify the 33/9 compound split and the 24/25 size-vs-em/ch split against token-map.json directly — who: Closer
