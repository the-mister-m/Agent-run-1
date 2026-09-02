#!/usr/bin/env python3
"""Job 1 measurement: every distinct literal 'prop: value' CSS declaration
across the 18 scanned files, with real site counts. Skips values that are
already var()-based (already tokenized). Uses surrogateescape decode so the
NUL byte in chord-module.js:1624 does not silently drop that file."""
import re
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path("/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1")

SCAN_FILES = [
    "tools/beat.html", "src/ui/shell.js",
    "src/instruments/drum-sampler.js", "src/instruments/drum-synth.js",
    "src/instruments/wave-synth.js", "src/instruments/overtone-synth.js",
    "src/surfaces/step-grid.js", "src/surfaces/keyboard.js",
    "src/surfaces/piano-roll.js", "src/surfaces/diatonic-keys.js",
    "src/surfaces/scale-circle.js", "src/surfaces/comp-builder.js",
    "tools/harmonyNEW.html", "tools/overtone-synth.html",
    "tools/wave-synth.html", "src/vis/spectrum.js", "src/vis/scope.js",
]

# every CSS-visual property observed in the codebase (JS object keys excluded
# by manual inspection of the raw scan_props.py output)
PROPS = [
    "color", "background", "background-color", "border-color", "border-radius",
    "border", "border-top", "border-left", "border-left-color", "border-left-style",
    "border-left-width", "border-style", "font-size", "font-weight", "font",
    "font-family", "font-variant-numeric", "font-style", "line-height",
    "letter-spacing", "text-align", "text-transform", "text-decoration",
    "text-overflow", "gap", "padding", "padding-left", "padding-right",
    "padding-top", "padding-bottom", "margin", "margin-top", "margin-bottom",
    "margin-left", "opacity", "box-shadow", "outline", "outline-offset",
    "z-index", "transition", "stroke", "stroke-width", "stroke-dasharray",
    "fill", "width", "height", "min-width", "min-height", "max-width",
    "max-height", "top", "left", "right", "bottom", "inset", "transform",
    "animation", "filter", "aspect-ratio", "accent-color", "text-anchor",
    "dominant-baseline",
]
PROPS_SORTED = sorted(PROPS, key=len, reverse=True)
PROP_ALT = "|".join(re.escape(p) for p in PROPS_SORTED)

DECL_RE = re.compile(
    r"(?<![-\w])(?P<prop>" + PROP_ALT + r")(?P<ws1>\s*)"
    r":(?P<ws2>\s*)(?P<value>[^;{}`]+?)(?P<ws3>\s*)(?P<term>[;}`])"
)

LAYOUT_MATH = re.compile(r"%|(?<!\d)fr\b|\bauto\b|vh\b|vw\b")


def read_file(path):
    return path.read_bytes().decode("utf-8", errors="surrogateescape")


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def normalise(s):
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


sites = defaultdict(list)  # (prop, norm_value) -> [(file, line)]
raw_total = 0
skipped_var_total = 0

for rel in SCAN_FILES:
    text = read_file(REPO_ROOT / rel)
    for m in DECL_RE.finditer(text):
        prop = m.group("prop")
        raw_value = m.group("value")
        v = normalise(raw_value)
        if "var(--" in v:
            skipped_var_total += 1
            continue
        if LAYOUT_MATH.search(v):
            continue  # layout math, ruled to stay raw
        sites[(prop, v)].append((rel, line_of(text, m.start())))
        raw_total += 1

print(f"# distinct literal declarations: {len(sites)}")
print(f"# raw sites (post layout-math filter): {raw_total}")
print(f"# already-var sites skipped: {skipped_var_total}")
print()
for (prop, val), locs in sorted(sites.items(), key=lambda x: (-len(x[1]), x[0])):
    print(f"{len(locs):4d}  {prop}: {val}")
