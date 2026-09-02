#!/usr/bin/env python3
"""Job 1 measurement pass: find every distinct 'prop: value' style declaration
and its site count across the 18 scanned files. Reads with surrogateescape
(like sweep.py) so NUL bytes in chord-module.js don't cause a silent skip.
Prints the set of distinct PROPERTY NAMES found so a human can sort CSS from JS."""
import re
from pathlib import Path
from collections import Counter

REPO_ROOT = Path("/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1")

SCAN_FILES = [
    "tools/beat.html",
    "src/ui/shell.js",
    "src/instruments/drum-sampler.js",
    "src/instruments/drum-synth.js",
    "src/instruments/wave-synth.js",
    "src/instruments/overtone-synth.js",
    "src/surfaces/step-grid.js",
    "src/surfaces/keyboard.js",
    "src/surfaces/piano-roll.js",
    "src/surfaces/diatonic-keys.js",
    "src/surfaces/scale-circle.js",
    "src/surfaces/comp-builder.js",
    "tools/harmonyNEW.html",
    "tools/overtone-synth.html",
    "tools/wave-synth.html",
    "src/vis/spectrum.js",
    "src/vis/scope.js",
]

PROP_RE = re.compile(
    r"(?<![-\w])(?P<prop>[a-zA-Z-]{2,40})(?P<ws1>\s*)"
    r":(?P<ws2>\s*)(?P<value>[^;{}`]+?)(?P<ws3>\s*)(?P<term>[;}`])"
)

def read_file(path):
    raw = path.read_bytes()
    return raw.decode("utf-8", errors="surrogateescape")

prop_counter = Counter()
for rel in SCAN_FILES:
    path = REPO_ROOT / rel
    text = read_file(path)
    for m in PROP_RE.finditer(text):
        prop_counter[m.group("prop")] += 1

for prop, count in sorted(prop_counter.items(), key=lambda x: -x[1]):
    print(f"{count:5d}  {prop}")
