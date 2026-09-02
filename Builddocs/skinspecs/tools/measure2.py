#!/usr/bin/env python3
"""Job 1 measurement, pass 2: restrict extraction to actual CSS-bearing text
(STYLE_TEXT backtick blocks, style.textContent / style.cssText backtick
blocks, <style> tags) so JS object literals (scope.js/spectrum.js preset
objects, SVG attrs objects) stop producing false-positive 'declarations'.
Canvas g.prop = value assignments (no CSS block exists in vis/*.js) are
measured separately, matching Job 3's scope."""
import re
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path("/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1")

CSS_JS_FILES = [
    "src/ui/shell.js",
    "src/instruments/drum-sampler.js", "src/instruments/drum-synth.js",
    "src/instruments/wave-synth.js",
    "src/surfaces/step-grid.js", "src/surfaces/keyboard.js",
    "src/surfaces/piano-roll.js", "src/surfaces/diatonic-keys.js",
    "src/surfaces/scale-circle.js", "src/surfaces/comp-builder.js",
]
HTML_FILES = [
    "tools/beat.html", "tools/harmonyNEW.html",
    "tools/overtone-synth.html", "tools/wave-synth.html",
]
OVERTONE_INLINE = "src/instruments/overtone-synth.js"  # scattered cssText, no STYLE_TEXT block
VIS_FILES = ["src/vis/spectrum.js", "src/vis/scope.js"]  # canvas assignments only, no CSS block

PROPS = [
    "color", "background", "background-color", "border-color", "border-radius",
    "border", "border-top", "border-left", "border-left-color", "border-left-style",
    "border-left-width", "border-style", "border-top-color", "font-size", "font-weight", "font",
    "font-family", "font-variant-numeric", "font-style", "line-height",
    "letter-spacing", "text-align", "text-transform", "text-decoration",
    "text-overflow", "gap", "padding", "padding-left", "padding-right",
    "padding-top", "padding-bottom", "margin", "margin-top", "margin-bottom",
    "margin-left", "margin-right", "opacity", "box-shadow", "outline", "outline-offset",
    "z-index", "transition", "stroke", "stroke-width", "stroke-dasharray",
    "fill", "width", "height", "min-width", "min-height", "max-width",
    "max-height", "top", "left", "right", "bottom", "inset", "transform",
    "animation", "filter", "aspect-ratio", "accent-color", "text-anchor",
    "dominant-baseline", "cursor", "white-space", "text-shadow",
    # added seat1 2026-08-31: scan_props.py hits verified against real
    # CSS-bearing lines (grep hit + line number each, see receipt).
    "display", "align-items", "flex-direction", "position", "box-sizing",
    "flex", "flex-wrap", "justify-content", "overflow", "overflow-x",
    "overflow-y", "pointer-events", "user-select", "touch-action",
    "-webkit-user-select", "grid-template-columns", "list-style",
    "will-change", "align-self", "content",
]
PROP_ALT = "|".join(re.escape(p) for p in sorted(PROPS, key=len, reverse=True))
DECL_RE = re.compile(
    r"(?<![-\w])(?P<prop>" + PROP_ALT + r")(?P<ws1>\s*)"
    r":(?P<ws2>\s*)(?P<value>[^;{}`]+?)(?P<ws3>\s*)(?P<term>[;}`])"
)
CANVAS_PROPS = ["lineWidth", "font", "strokeStyle", "fillStyle", "globalAlpha",
                "lineCap", "lineJoin", "textAlign", "textBaseline", "shadowBlur",
                "shadowColor", "lineDashOffset"]
CANVAS_RE = re.compile(
    r"\b(?P<recv>\w+)\.(?P<prop>" + "|".join(CANVAS_PROPS) + r")\s*=\s*"
    r"(?P<value>[^;\n]+);"
)
# color arg: token lookup expression, e.g. t['--accent']
FADE_RE = re.compile(r"_fade\(\s*(?P<color>[^,]+?)\s*,\s*(?P<alpha>[0-9.]+)\s*\)")

# shape a: el.style.<camelProp> = '<value>' — JS property assignment form.
STYLE_PROP_RE = re.compile(r"\.style\.(?P<jsprop>[A-Za-z]+)\s*=\s*'(?P<value>[^']*)'")
# shape b marker: el.style.cssText = '...' (single-quoted whole span)
CSSTEXT_QUOTE_MARKER = r"\.style\.cssText\s*=\s*'"
# shape b marker: el.style.cssText = [ ...joined array... ]
CSSTEXT_ARRAY_MARKER = r"\.style\.cssText\s*=\s*\["
# shape b: one element of a joined cssText array, single- or backtick-quoted
ARRAY_ELEM_RE = re.compile(r"'(?P<sq>[^']*)'|`(?P<bt>[^`]*)`")
# shape c: style="..." attribute inside an innerHTML template
STYLE_ATTR_RE = re.compile(r'style="([^"]*)"')


def read_file(path):
    return path.read_bytes().decode("utf-8", errors="surrogateescape")


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def normalise(s):
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


def extract_quoted_spans(text, start_markers, end_char):
    """Return list of (span_text, base_offset) for spans introduced by any of
    the given regex start markers and closed by the first end_char found."""
    spans = []
    for marker in start_markers:
        for m in re.finditer(marker, text):
            start = m.end()  # just past the opening delimiter
            end = text.find(end_char, start)
            if end == -1:
                continue
            spans.append((text[start:end], start))
    return spans


def extract_backtick_spans(text, start_markers):
    """Return list of (span_text, base_offset) for backtick blocks introduced
    by any of the given regex start markers (e.g. r'STYLE_TEXT\\s*=\\s*`')."""
    return extract_quoted_spans(text, start_markers, "`")


def camel_to_kebab(jsprop):
    """el.style.marginTop -> margin-top, to match against dash-case PROPS."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", jsprop).lower()


def extract_style_tags(text):
    spans = []
    for m in re.finditer(r"<style[^>]*>", text):
        start = m.end()
        end = text.find("</style>", start)
        if end == -1:
            continue
        spans.append((text[start:end], start))
    return spans


sites = defaultdict(list)
canvas_sites = defaultdict(list)
fade_sites = defaultdict(list)
raw_total = 0


def scan_css_span(rel, full_text, span_text, base_offset):
    global raw_total
    for m in DECL_RE.finditer(span_text):
        prop = m.group("prop")
        v = normalise(m.group("value"))
        if "var(--" in v:
            continue
        pos = base_offset + m.start()
        sites[(prop, v)].append((rel, line_of(full_text, pos)))
        raw_total += 1


def scan_style_prop_assignments(rel, full_text):
    """shape a: el.style.<camelProp> = '<value>'"""
    global raw_total
    for m in STYLE_PROP_RE.finditer(full_text):
        prop = camel_to_kebab(m.group("jsprop"))
        if prop not in PROPS:
            continue
        v = normalise(m.group("value"))
        if "var(--" in v:
            continue
        pos = m.start()
        sites[(prop, v)].append((rel, line_of(full_text, pos)))
        raw_total += 1


def scan_style_attrs(rel, full_text):
    """shape c: style="..." attribute inside an innerHTML template"""
    for m in STYLE_ATTR_RE.finditer(full_text):
        span_text = m.group(1)
        if span_text and not span_text.rstrip().endswith((";", "}")):
            span_text = span_text + ";"
        scan_css_span(rel, full_text, span_text, m.start(1))


def scan_cssText_array_span(rel, full_text, span_text, base_offset):
    """shape b: el.style.cssText = [ '...', `...` ].join(';') — each element
    is its own quoted CSS fragment, scanned independently."""
    for m in ARRAY_ELEM_RE.finditer(span_text):
        if m.group("sq") is not None:
            elem, elem_pos = m.group("sq"), m.start("sq")
        else:
            elem, elem_pos = m.group("bt"), m.start("bt")
        if elem and not elem.rstrip().endswith((";", "}")):
            elem = elem + ";"
        scan_css_span(rel, full_text, elem, base_offset + elem_pos)


# --- self-test: each regex seeded with one real line, must match, else exit non-zero ---
SELF_TESTS = [
    ("DECL_RE", DECL_RE, "  flex-direction: column;", "src/ui/shell.js:152"),
    ("CANVAS_RE", CANVAS_RE, "      g.strokeStyle = this._fade(t['--accent'], 0.5);", "src/vis/scope.js:636"),
    ("FADE_RE", FADE_RE, "      g.strokeStyle = this._fade(t['--accent'], 0.5);", "src/vis/scope.js:636"),
    ("STYLE_PROP_RE", STYLE_PROP_RE, "    seam.style.marginTop = '8px';", "src/ui/shell.js:658"),
    ("CSSTEXT_QUOTE_MARKER", re.compile(CSSTEXT_QUOTE_MARKER), "      levelInput.style.cssText = 'flex:1;';", "src/instruments/overtone-synth.js:702"),
    ("CSSTEXT_ARRAY_MARKER", re.compile(CSSTEXT_ARRAY_MARKER), "    root.style.cssText = [", "src/instruments/overtone-synth.js:616"),
    ("ARRAY_ELEM_RE", ARRAY_ELEM_RE, "      `background: var(--panel, #1b2332)`,", "src/instruments/overtone-synth.js:617"),
    ("STYLE_ATTR_RE", STYLE_ATTR_RE, '      <div class="cbdaw-scale__row" style="align-items:flex-start">', "src/ui/shell.js:749"),
]
for name, rx, seed_line, source in SELF_TESTS:
    if not rx.search(seed_line):
        print(f"SELF-TEST FAILED: {name} did not match its seed line ({source})")
        raise SystemExit(1)
print(f"# self-test: {len(SELF_TESTS)} regexes matched their seeded lines\n")

for rel in CSS_JS_FILES:
    text = read_file(REPO_ROOT / rel)
    spans = extract_backtick_spans(text, [
        r"STYLE_TEXT\s*=\s*`",
        r"style\.textContent\s*=\s*`",
    ])
    if not spans:
        print(f"WARNING no CSS span found in {rel}")
    for span_text, base_offset in spans:
        scan_css_span(rel, text, span_text, base_offset)
    scan_style_prop_assignments(rel, text)
    scan_style_attrs(rel, text)

for rel in HTML_FILES:
    text = read_file(REPO_ROOT / rel)
    spans = extract_style_tags(text)
    if not spans:
        print(f"WARNING no <style> found in {rel}")
    for span_text, base_offset in spans:
        scan_css_span(rel, text, span_text, base_offset)
    scan_style_prop_assignments(rel, text)
    scan_style_attrs(rel, text)

# overtone-synth.js: many scattered `.style.cssText = \`...\`` — different attr name each time
text = read_file(REPO_ROOT / OVERTONE_INLINE)
spans = extract_backtick_spans(text, [r"\.style\.cssText\s*=\s*`"])
print(f"overtone-synth.js cssText spans found: {len(spans)}")
for span_text, base_offset in spans:
    scan_css_span(OVERTONE_INLINE, text, span_text, base_offset)
quote_spans = extract_quoted_spans(text, [CSSTEXT_QUOTE_MARKER], "'")
for span_text, base_offset in quote_spans:
    scan_css_span(OVERTONE_INLINE, text, span_text, base_offset)
array_spans = extract_quoted_spans(text, [CSSTEXT_ARRAY_MARKER], "]")
for span_text, base_offset in array_spans:
    scan_cssText_array_span(OVERTONE_INLINE, text, span_text, base_offset)
scan_style_prop_assignments(OVERTONE_INLINE, text)

# vis/*.js: canvas context property assignments + _fade() opacity calls + cssText
for rel in VIS_FILES:
    text = read_file(REPO_ROOT / rel)
    for m in CANVAS_RE.finditer(text):
        prop = m.group("prop")
        v = normalise(m.group("value"))
        canvas_sites[(prop, v)].append((rel, line_of(text, m.start())))
    for m in FADE_RE.finditer(text):
        alpha = m.group("alpha")
        fade_sites[("_fade-alpha", alpha)].append((rel, line_of(text, m.start())))
    quote_spans = extract_quoted_spans(text, [CSSTEXT_QUOTE_MARKER], "'")
    for span_text, base_offset in quote_spans:
        scan_css_span(rel, text, span_text, base_offset)
    array_spans = extract_quoted_spans(text, [CSSTEXT_ARRAY_MARKER], "]")
    for span_text, base_offset in array_spans:
        scan_cssText_array_span(rel, text, span_text, base_offset)

print(f"\n# distinct literal CSS declarations: {len(sites)}")
print(f"# raw CSS sites: {raw_total}")
print()
for (prop, val), locs in sorted(sites.items(), key=lambda x: (-len(x[1]), x[0])):
    print(f"{len(locs):4d}  {prop}: {val}    [{locs[0][0]}:{locs[0][1]}]")

print(f"\n# canvas assignment distinct: {len(canvas_sites)}")
total_canvas = sum(len(v) for v in canvas_sites.values())
print(f"# canvas assignment sites: {total_canvas}")
for (prop, val), locs in sorted(canvas_sites.items(), key=lambda x: (-len(x[1]), x[0])):
    print(f"{len(locs):4d}  .{prop} = {val}    [{locs[0][0]}:{locs[0][1]}]")

print(f"\n# _fade() distinct alpha: {len(fade_sites)}")
total_fade = sum(len(v) for v in fade_sites.values())
print(f"# _fade() sites: {total_fade}")
for (prop, val), locs in sorted(fade_sites.items(), key=lambda x: (-len(x[1]), x[0])):
    lines = ", ".join(f"{f}:{l}" for f, l in locs)
    print(f"{len(locs):4d}  alpha={val}    [{lines}]")

# per-file site count table — every scanned file, zeros included
ALL_SCAN_FILES = CSS_JS_FILES + HTML_FILES + [OVERTONE_INLINE] + VIS_FILES
file_counts = {rel: 0 for rel in ALL_SCAN_FILES}
for locs in sites.values():
    for f, _ in locs:
        if f in file_counts:
            file_counts[f] += 1
for locs in canvas_sites.values():
    for f, _ in locs:
        if f in file_counts:
            file_counts[f] += 1
for locs in fade_sites.values():
    for f, _ in locs:
        if f in file_counts:
            file_counts[f] += 1
print("\n# per-file site count (CSS + canvas + _fade sites, zeros included)")
for rel in ALL_SCAN_FILES:
    print(f"{file_counts[rel]:4d}  {rel}")

# per-property site count table — every entry in PROPS, zeros included
prop_counts = {p: 0 for p in PROPS}
for (prop, _), locs in sites.items():
    if prop in prop_counts:
        prop_counts[prop] += len(locs)
print("\n# per-property site count (PROPS list, zeros included)")
for p in PROPS:
    print(f"{prop_counts[p]:4d}  {p}")
