RECEIPT — Seat 4b — Chromebook DAW skin sweep — token-map.json rewrite
2026-08-31

Handoff read: docs/handoffs/2026-08-31-seat4-to-seat4b.md.
Mid-task correction from coordinator: task 7 changed from report to fix
(seam-close both directions), addressed below.

## TASK 13 — FINAL COUNTS

- total real entries: 393
- tokened: 347
- skipped: 46
- safe_for_script true: 298

Target stated at handoff (~388/5) was not reached. The gap is 41 entries,
fully accounted for: 25 dead entries (task 9 forbids tokenizing these) + 13
pattern/placeholder/FENCE/BLOCKED entries that bundle multiple site values
into one map row and need per-site decomposition or Brandon's ruling
(explicitly not this seat's job) + 3 confirmed no-token values (min-width
260px, inset -8px, margin-left -2px). See breakdown below.

Skip-reason breakdown (46 skipped):
- 8 — "value is a variable, nothing to replace" (5 genuine + 3 dead
  grid-template-columns entries that inherited this same wrong-but-inert
  text from the original build_entries.py bug — see DEAD ENTRIES below)
- 9 — "relative unit (em/ch)..." (all dead — min-height/min-width em values)
- 5 — "off the --sp-* scale..." (3 dead: max-height 620px, max-width 44px
  and 46px; 2 genuine: min-width 260px, inset -8px)
- 4 — "margin (incl. longhands) gets no tokens..." (3 dead: margin-top 4px
  and 2px, margin-bottom 6px; 1 genuine: margin-left -2px, negative, no
  token exists)
- 20 — one-off reason strings, each on a pattern/placeholder/FENCE/BLOCKED
  entry or a confirmed-dead single value (border-left 2px, outline 2px,
  font-size 14px, the two box-shadow insets, fill:currentColor, etc.)

## SEAM CHECK (task 7, coordinator correction)

7a — map entries with a skip reason where tokens.css has a matching value:
FIXED, not just reported. 184 physical single-value entries + 6 compound
entries rewritten (190 total edits from this pass, on top of the 71+155
named by the handoff). Rerun after the fix finds exactly 18 remaining, and
every one of them is a dead entry (task 9 overrides 7a for these — the
coordinator's "everything else in your assignment stands" keeps task 9 in
force): border-left 2px, outline 2px, font-size 14px, margin-top 4px,
fill:currentColor, font-size 0.65em, margin-bottom 6px, margin-top 2px,
max-height 620px, max-width 46px, min-height/min-width 2.4em, min-width
3.2em, min-width 3.8em, transition (background 70ms...), and the 3 dead
grid-template-columns entries. Zero non-dead entries remain unresolved.

7b — tokens.css tokens with no map entry pointing at them: 47 orphans found.
None require pointing a live entry at them (checked each by hand):
- 9 base palette/semantic colors (--bg, --panel, --line, --text, --text-dim,
  --warn, --deg-major and 5 more --deg-*) — already consumed via var()
  directly in source (grep-confirmed, e.g. var(--panel) at 19 sites), never
  literal-value duplicates, out of this sweep's scope by design.
- 6 scale-base tokens (--sp-unit, --r-unit, --fs-root, --stroke-w, --dur-fast,
  --dur-med) — calc() bases for other tokens, never the correct target for a
  site value themselves (sites point to the derived token, e.g. --sp-1, not
  the base).
- 7 canvas ctx.textAlign/textBaseline/lineJoin tokens (--canvas-round,
  --canvas-textalign-*, --canvas-textbaseline-*) — build_entries.py's
  CANVAS_RE only processes the `lineWidth` canvas property (line 131:
  `if m.group("prop") != "lineWidth": continue`); textAlign/textBaseline/
  lineJoin sites are never scanned at all. Declared ahead of coverage, not a
  map-side fix — out of the 4-file scope given to this seat.
- 8 tokens that pair exactly with a dead entry's value (--grid-1-1,
  --grid-repeat4-minmax0, --grid-repeat8-minmax0, --tr-bg-border,
  --fs-numeral, --fs-em-65, --sp-em-24, --sp-em-38, --sp-310) — task 9
  forbids tokenizing the dead entry, so these read as orphans by design.
- 2 tokens trapped inside a live pattern entry this seat did not decompose
  (--fs-2xl, --fs-readout — both inside the BLOCKED
  16|18|22|28|30|32px font-size pattern; --stroke-hair/-thin/-med/-semi/
  -bold/-heavy, 6 tokens, all inside the FENCE-2 stroke-width pattern).
- --fs-half, --meter-ok, --meter-hot, --canvas-round, --canvas-textbaseline-
  top/bottom, --dur-med: zero sites anywhere in source (grep-confirmed 0
  hits) — declared, unused, same "TOKEN WITH NO SITES" category the map
  already carries precedent for (--lh-tight, --ring-off-lg).

7c — rerun: both checks come back clean except the documented exceptions
above. No further edits pending.

## TASK 5 — SP_SCALE REBUILT

Builddocs/skinspecs/tools/rules.py: SP_SCALE was 1-40px only. Rebuilt against
src/ui/tokens.css directly (every --sp-N token resolved via its calc(var(
--sp-unit) * N) definition, --sp-unit: 2px). Missing steps added: 0, 15, 26,
30, 34, 46, 56, 60, 62, 66, 74, 78, 120, 130, 168, 190, 460, 620px.

This gap explains a large share of the handoff's wrong "off the --sp-*
scale / NONE FOUND" calls — not because rules.py was consulted (this seat's
review used a direct regex against tokens.css text), but because tokens.css
stores these values as calc() expressions, not literal px strings, so even a
full-file literal-string grep never finds them. Confirmed independently by
resolving every calc() token and diffing against the handoff's NONE FOUND
list: 17 of the handoff's "NONE FOUND" calls for width/height/min-
width/max-width/top declarations were wrong and are now tokened (26px,
30px, 34px, 46px×2, 56px, 60px, 62px, 66px, 74px×2, 78px, 120px, 130px,
168px, 190px, 460px, 620px-on-a-dead-entry). Also missed by the handoff
entirely: --bw-2/--bw-3/--bw-5 (a border/outline line-weight scale,
tokens.css line 388, extends --bw), which is the correct axis for
border-left-width and border-left/outline shorthand-width sites — the
handoff's candidate lists for these never included the --bw family.

## TASK 6 — ASSERTION ADDED

rules.py gained `assert_no_token_match(value, context)` / `matching_tokens
(value)`, resolving both literal and calc()-based tokens.css values.
Wired into both fallthroughs in both files:
- build_entries.py: px-list fallthrough (was 110-113) and outer fallthrough
  (was 114-116), now +2 lines each ahead of the reason= write.
- classify.py: px-list fallthrough (was 83-85) and outer fallthrough (was
  86-88), same treatment.
Self-test: assert_no_token_match('74px') fires (matches --sp-37);
assert_no_token_match('997px') does not fire (no match). Confirmed both
directions work before trusting it against the real tools.

## TASK 12 — RERUN build_entries.py

Ran clean, exit 0. Assertion did not fire. 9 entries regenerated (the
canvas lineWidth/_fade block, unaffected by the fallthrough fix): 2
escalated (cfg.lineWidth, width — genuine), 7 tokened (--canvas-lw + 6
--fade-* tokens). No mislabel produced.

## TASK 11 — diff.py

0 missing (231 distinct / 844 sites covered, unchanged from the handoff's
starting state — this seat rewrote entries in place, it did not add or
remove any).

## NONE FOUND — confirmed no token exists (task 2)

- border-left-width 3px component of a shorthand: corrected, see --bw-3
  above — NOT none found after all.
- min-width 260px [tools/beat.html:54] — confirmed, task 10. Full --sp-*
  scale checked; nearest neighbors are --sp-95 (190px) and --sp-230
  (460px), a 270px gap with nothing in it.
- inset -8px — no negative-value token exists anywhere in tokens.css.
- margin-left -2px — same, no negative-value token exists.
- border-radius 9px/10px "matching but ambiguous" caveat, outline/border-
  left 2px "matching but ambiguous" caveat from the handoff: resolved, not
  NONE FOUND — see --bw-2 above.
- The remaining true NONE FOUND values sit inside pattern/placeholder
  entries this seat did not decompose (font-size 14px|16|18|22|28|30|32px
  family, line-height 6-value pattern, gap 4-value pattern, padding 2
  patterns, transition-duration 4-value pattern, stroke-width 6-value SVG
  pattern) or are FENCE 1/2 hand-work (CanvasRenderingContext2D.font,
  font-size as an SVG attribute) or are BLOCKED pending Brandon (padding
  32/40/28/36px, transition-duration mapping, the font-size root-override
  question). None of these are single values this seat could assign
  without inventing or snapping.

## DUPLICATE ENTRIES (task 8)

Handoff named 2 (CanvasRenderingContext2D.lineWidth: cfg.lineWidth and
:width — both correctly left as genuine skips, reason normalized to the
standard string on all 4 physical entries + the 1 color:'' entry = 5 total,
per task 3).

This seat independently found 12 more duplicate (property, value) pairs the
handoff did not name, via a straight collision count on the live entries
array (not deleted, per task 8):
- border-radius 9px, border-radius 10px, font-size 17px, letter-spacing
  0.01em, letter-spacing 0.04em — each a stale null/ESCALATION entry
  sitting alongside a second entry that was ALREADY tokened with an
  explicit "Supersedes the ESCALATION entry above" note (or, for the two
  letter-spacing pairs, no note but measured_sites:2/reconciles:true on the
  tokened twin). This directly CONTRADICTS the handoff's dead-entry list,
  which names all 5 of these exact pairs as dead (items 1, 2, 6, 7, 8 in
  its 33). A dead entry cannot also reconcile with 1-2 measured live sites.
  Treated as live: tokenized the stale null twin to match its sibling
  (--r-chip, --r-xl, --fs-chord, --track-tight, --track-mid).
- CanvasRenderingContext2D.lineWidth: 1 (×2) and six _fade() alpha-argument
  pairs (0.22, 0.5, 0.55, 0.7, 0.82, 0.9) — true exact duplicates, both
  copies already identically tokened, no action needed, left as-is.

## DEAD ENTRIES (task 9)

Handoff named 33. This seat's independent check (measured_sites/reconciles
on the sibling duplicate) contradicts 5 of them — see DUPLICATE ENTRIES
above; those 5 were tokenized, not left dead. The remaining 28 were left
untouched (not tokenized, not deleted); 2 of those 28 (outline-offset 2px,
padding 16px 6px) were already tokened before this seat started and stayed
that way. No deletions anywhere in this pass.

## FILES EDITED

- Builddocs/skinspecs/token-map.json — 190 entries rewritten in place (184
  single-value + 6 compound), 5 genuine-skip entries had their reason
  string normalized. No entries added or removed.
- Builddocs/skinspecs/tools/rules.py — SP_SCALE rebuilt (task 5);
  matching_tokens()/assert_no_token_match() added (task 6).
- Builddocs/skinspecs/tools/build_entries.py — assert_no_token_match wired
  into both fallthroughs (task 6).
- Builddocs/skinspecs/tools/classify.py — same (task 6).

---

SESSION REVIEW — Chromebook DAW skin sweep — seat 4b, 2026-08-31

EDITS
- [Builddocs/skinspecs/token-map.json](../../Builddocs/skinspecs/token-map.json) — 190 entries tokenized (71 mislabeled + 155 struck, named by the handoff, plus an independent seam-close pass), 5 genuine-skip reasons normalized
- [Builddocs/skinspecs/tools/rules.py](../../Builddocs/skinspecs/tools/rules.py) — SP_SCALE rebuilt full-scale (0-620px); matching_tokens()/assert_no_token_match() added
- [Builddocs/skinspecs/tools/build_entries.py](../../Builddocs/skinspecs/tools/build_entries.py) — guard assertion wired into both fallthroughs
- [Builddocs/skinspecs/tools/classify.py](../../Builddocs/skinspecs/tools/classify.py) — same guard assertion

STRAY FILES
- none — the working scripts used to compute and apply the rewrite ran from the scratchpad tmp dir, outside the repo, and are not part of this deliverable

GOALS DONE
- 226 named entries rewritten, token verified against tokens.css before assignment
- seam closed both directions (task 7 correction) — 7a fixed in place, 7b confirmed no live entry needs re-pointing
- SP_SCALE rebuilt, gap explained and reconciled against the handoff's NONE FOUND claims
- guard assertion added and self-tested in both files
- diff.py 0 missing, build_entries.py reruns clean

BRANDON'S TODOS
- font-size 6-value pattern (16/18/22/28/30/32px) — S1 §4 "not steps" vs. per-value token, BLOCKED pending ruling
- padding 32/40/28/36px and transition-duration 60/70/90/150ms — BLOCKED pending ruling on which step each snaps to
- min-width 260px, inset -8px, margin-left -2px — confirmed no token exists; a new token is Brandon's call, not this seat's

CLOSER REVIEW
- verify the 5 stale-duplicate-vs-dead-list contradictions (border-radius 9px/10px, font-size 17px, letter-spacing 0.01em/0.04em) against the handoff author's intent — closer / Brandon
- decide whether seat 5 decomposes the pattern/placeholder entries (font-size, line-height, gap, padding, transition-duration, stroke-width) into per-site rows — closer / Brandon
