# Chord naming — full combination tables

Brandon's ruling, 2026-08-30. Two tables: 4-part stacks (3rd/5th/7th/9th) and
plain triads (3rd/5th only). Root is always P1 — `chord.js`'s scale-degree
system, not a free pitch (§15.6).

## Root + 3rd + 5th + 7th + 9th (24 combinations)

```
#   | Root | 3rd | 5th | 7th | 9th | Name
----+------+-----+-----+-----+-----+----------------
1   |  P1  | M3  | P5  | M7  | M9  | Maj9
2   |  P1  | M3  | P5  | M7  | m9  | Maj7b9
3   |  P1  | M3  | P5  | m7  | M9  | 9
4   |  P1  | M3  | P5  | m7  | m9  | 7b9
5   |  P1  | M3  | +5  | M7  | M9  | Maj9#5
6   |  P1  | M3  | +5  | M7  | m9  | Maj7b9#5
7   |  P1  | M3  | +5  | m7  | M9  | 9#5
8   |  P1  | M3  | +5  | m7  | m9  | +7b9
9   |  P1  | M3  | °5  | M7  | M9  | Maj9b5
10  |  P1  | M3  | °5  | M7  | m9  | Maj7b9b5
11  |  P1  | M3  | °5  | m7  | M9  | 9b5
12  |  P1  | M3  | °5  | m7  | m9  | 7b9b5
13  |  P1  | m3  | P5  | M7  | M9  | Maj/Min9
14  |  P1  | m3  | P5  | M7  | m9  | Maj/Min7b9
15  |  P1  | m3  | P5  | m7  | M9  | min9
16  |  P1  | m3  | P5  | m7  | m9  | min7b9
17  |  P1  | m3  | +5  | M7  | M9  | minMaj9#5
18  |  P1  | m3  | +5  | M7  | m9  | minMaj7b9#5
19  |  P1  | m3  | +5  | m7  | M9  | min9#5
20  |  P1  | m3  | +5  | m7  | m9  | min7b9#5
21  |  P1  | m3  | °5  | M7  | M9  | °9Maj7
22  |  P1  | m3  | °5  | M7  | m9  | °Maj7b9
23  |  P1  | m3  | °5  | m7  | M9  | °9
24  |  P1  | m3  | °5  | m7  | m9  | °b9
```

## Root + 3rd + 5th only — plain triads (6 combinations)

```
#  | Root | 3rd | 5th | Name
---+------+-----+-----+------
1  |  P1  | M3  | P5  | Maj
2  |  P1  | M3  | +5  | Aug (+)
3  |  P1  | M3  | °5  | b5
4  |  P1  | m3  | P5  | min
5  |  P1  | m3  | +5  | min#5
6  |  P1  | m3  | °5  | dim (°)
```

Rows 3 and 5 were open at first pass — `chord.js`'s `SUFFIX` table
(`major / minor / augmented / diminished / altered`) had no slot for
M3+°5 or m3+5. Brandon named them (`b5`, `min#5`) after seeing the gap
flagged; both are wired (see below).

## Status vs. shipped code — ALL 24 + ALL 6 WIRED, 2026-08-30

Two new quality buckets added to `scale.js`'s `QUALITY` table
([scale.js:139](../../src/theory/scale.js#L139)) — `flatFive` (M3+°5) and
`sharpFive` (m3+5) — plus matching rows in `QUALITY_TOKEN`
([scale.js:78](../../src/theory/scale.js#L78)), and in `chord.js`'s `CASE`,
`SUFFIX`, `LETTER_SUFFIX`, and `NINTH_NAME`
([chord.js:79](../../src/theory/chord.js#L79) onward). This closed the last
8 rows of the 24-row table (9-12, 17-20) and both open triad rows.

Verified directly in `node` against a hand-built scale hitting both new
qualities: triad `Cb5` / `Dmin#5`, ninth-stack `CMaj9b5` / `Dmin9#5` —
character for character against Brandon's table.

**Count 4 (bare 7th, no 9th) — closed 2026-08-31.** `SEVENTH_NAME` got two
more rows: `flatFive: { maj: 'maj7b5', min: '7b5' }`,
`sharpFive: { maj: 'minMaj7#5', min: 'min7#5' }` — standard jazz symbols,
same shape as the original six. Verified in `node`: `Cmaj7b5` / `Dmin7#5`.
Every cell of both tables is now wired.

**Color tokens — `--deg-flat5` / `--deg-sharp5`, placeholder, not
CVD-validated to the same bar as `--deg-aug`.** Run through the dataviz
skill's `validate_palette.js` against the existing 5: the shipping
5-color palette already fails its own CVD-separation check (`--deg-minor`
↔ `--deg-altered`, ΔE 1.0 deutan — the same open finding from
[2026-08-25-closer-skinspecs.md](2026-08-25-closer-skinspecs.md)'s
3 flagged CVD gaps). Adding `#1fa855` (green) and `#4d7cff` (blue) does
**not** introduce a new worst pair — the worst pair in both light and dark
mode stays the pre-existing `--deg-minor`/`--deg-altered` one — but these
two new colors were not independently pushed through the full check the
way `--deg-aug` was. Fixing the palette itself is still open and still
Brandon's.
