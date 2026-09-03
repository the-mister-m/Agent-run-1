# S6 — passes

## Pass 1 — what the five references actually show

1. Night City, moonlit — dead teal-grey sky is most of the frame. Light is
   sparse. One amber chevron strip, one red underglow. High ground-to-lit ratio.
2. Night City, dense — same rule, more sources. Sign red dominates, saturated,
   emitting outward. Cyan and pink secondary. Wet surfaces double every light.
3. Moog modular — black anodized faces, walnut cheeks, silver knob caps. Panel
   is dark and matte. The CABLES are the colour. White silkscreen, tiny.
4. TONTO — same language at wall scale. Wood frames, black faces.
5. API 2448 — grey-beige faces. Amber backlit VU row is the largest colour block
   in any of the five. Blue fader LEDs, coded button caps, wood rails.

Common thread: dark or neutral ground, colour reserved for state, light as
emission not fill, one wood/metal seam.

## Pass 2 — three approaches

**A · Neon over black.** Push 2077 hard. Near-black ground, saturated emitting
colour everywhere, glow on every lit token, big shadows.
Cost: colour stops meaning state because everything is lit. Fights the degree
palette, which needs to be the brightest thing on the chord surface.

**B · Console grey.** Push API 2448. Grey-beige panel, dark chassis, colour only
in caps and meters.
Cost: a light panel raises the floor for every lit colour and the amber VU
becomes hard to separate from --deg-major. Also least like the 2077 half.

**C · Anodized panel, emitted state.** Moog panel as the ground, 2077 as the
lighting model. Dark matte faces, hairline seams, silkscreen text. Nothing is
lit unless it is on. When it is on it emits.
Cost: nearly invisible at default motion settings — needs the glow token to
carry, and needs --r-unit near 0 or it reads as software.

## Pass 3 — principles, fewest steps most effect

1. **Ground is anodized panel, not sky.** One dark neutral, one step up for
   panel, one hairline for line. Three values do 80% of the work.
2. **Colour is state, never decoration.** Every hue in the file is either a
   degree, a lamp, or a cable. Nothing is coloured for mood.
3. **Corners are hardware.** --r-unit 0 is the single highest-leverage move for
   "this is a panel" — it hits every button, cell, and clip at once.
4. **Light emits, it does not fill.** Depth comes from --glow on lit tokens and
   deep black shadows, not from lighter panels.
5. **The degree palette is already the reference.** Template defaults are amber
   / cyan / magenta / red / violet — that IS pictures 2 and 5. Do not touch.
   Fewest steps: change nothing that is already right.

Principle 5 is why this build is short. Four dials, five ground values, motion,
depth. The teaching colours stay at default because the reference agrees with
them.
