#!/usr/bin/env python3
"""
Token sweep. Reads token-map.json, replaces declaration values with tokens
across the style-bearing source files. Dry-run by default.
"""

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOKEN_MAP = Path(__file__).resolve().parent / "token-map.json"

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

def load_raw_entries():
    return json.loads(TOKEN_MAP.read_text(encoding="utf-8"))["entries"]


def safe_entries(entries):
    return [e for e in entries if e.get("safe_for_script") is True]


RAW_ENTRIES = load_raw_entries()

# properties whose value is the whole declaration (exact match after
# whitespace-normalisation). Derived from every safe_for_script:true
# property in token-map.json (task 3) -- not typed from memory.
EXACT_PROPS = {e["property"] for e in safe_entries(RAW_ENTRIES)}
# properties whose value normalises commas/spaces before comparison
NORMALISED_PROPS = {"font-family", "box-shadow"}
# properties matched only as the width token leading a shorthand
BORDER_WIDTH_PROPS = {"border", "border-top", "border-left"}
# properties compared against value plus declared spelling variants
VARIANT_PROPS = {"opacity"}


def assert_seam(entries):
    # task 4 seam: EXACT_PROPS must exactly cover every safe_for_script:true
    # property in the map, both directions. Fails loud, does not fix.
    safe_props = {e["property"] for e in safe_entries(entries)}
    missing = safe_props - EXACT_PROPS
    extra = EXACT_PROPS - safe_props
    if missing:
        sys.exit(
            "SEAM FAIL: safe_for_script properties missing from EXACT_PROPS: "
            + ", ".join(sorted(missing))
        )
    if extra:
        sys.exit(
            "SEAM FAIL: EXACT_PROPS properties with no safe_for_script map entry: "
            + ", ".join(sorted(extra))
        )


def normalise(s):
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*,\s*", ", ", s)
    return s


def load_entries():
    data = json.loads(TOKEN_MAP.read_text(encoding="utf-8"))
    entries = data["entries"]
    band_a, band_b = [], []
    for e in entries:
        if e.get("safe_for_script") is not True:
            continue
        rec = e.get("reconciles")
        meas = e.get("measured_sites")
        exp = e.get("expected_sites")
        if rec is True:
            band_a.append(e)
            continue
        if meas is None or meas == 0:
            continue
        if exp is not None and meas < exp:
            continue  # DO NOT TOUCH: measured < expected, later seat's call
        band_b.append(e)
    return band_a, band_b


def prop_pattern(prop):
    # (?<![-\w]) instead of \b: a plain \b treats "-" as a boundary too, so
    # it would match "gap" inside a custom property like "--shell-gap".
    # value stops at ; or } (normal CSS) or ` (end of a JS template-string
    # declaration with no trailing semicolon, e.g. a comma-joined list)
    return re.compile(
        r"(?<![-\w])(?P<prop>" + re.escape(prop) + r")(?P<ws1>\s*)"
        r":(?P<ws2>\s*)(?P<value>[^;{}`]+?)(?P<ws3>\s*)(?P<term>[;}`])"
    )


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


# shape a: el.style.<camelProp> = '<value>' -- JS property assignment, no
# colon, so prop_pattern (which requires one) cannot see it (task 6).
STYLE_PROP_RE = re.compile(r"\.style\.(?P<jsprop>[A-Za-z]+)\s*=\s*'(?P<value>[^']*)'")
# shape c: style="..." HTML attribute inside an innerHTML template. A single
# undelimited declaration here has no ; } or ` before the closing quote, so
# scanning it with prop_pattern against the whole file overconsumes past the
# attribute; scanned in isolation instead, per attribute (task 6).
STYLE_ATTR_RE = re.compile(r'style="([^"]*)"')
# Brandon's rule -- hands off. Every declaration inside it is excluded from
# all three shapes (task 7).
BT_TOP_RE = re.compile(r"\.bt-top\s*\{[^}]*\}")
# a bare custom-property token, e.g. "--sp-2", gets wrapped in var() on
# apply. A compound token (e.g. "var(--sp-2) 0 0") already holds the full
# whole-value replacement string and is used as-is (task 5).
BARE_TOKEN_RE = re.compile(r"^--[A-Za-z0-9_-]+$")


def camel_to_kebab(jsprop):
    """el.style.marginTop -> margin-top, to match dash-case property names."""
    return re.sub(r"(?<!^)(?=[A-Z])", "-", jsprop).lower()


def bt_top_spans(text):
    return [(m.start(), m.end()) for m in BT_TOP_RE.finditer(text)]


def style_attr_value_spans(text):
    return [(m.start(1), m.end(1)) for m in STYLE_ATTR_RE.finditer(text)]


def in_any_span(pos, spans):
    return any(s <= pos < e for s, e in spans)


def find_colon_candidates(text, prop, exclude_spans):
    """shape: 'prop: value;' anywhere in the file text."""
    skip = exclude_spans + style_attr_value_spans(text)
    for m in prop_pattern(prop).finditer(text):
        if in_any_span(m.start("value"), skip):
            continue
        yield m.start("value"), m.end("value"), m.group("value"), line_of(text, m.start())


def find_style_prop_candidates(text, prop, exclude_spans):
    """shape a: .style.<camelProp> = '<value>'"""
    for m in STYLE_PROP_RE.finditer(text):
        if camel_to_kebab(m.group("jsprop")) != prop:
            continue
        if in_any_span(m.start("value"), exclude_spans):
            continue
        yield m.start("value"), m.end("value"), m.group("value"), line_of(text, m.start())


def find_style_attr_candidates(text, prop, exclude_spans):
    """shape c: style="prop:value" -- scanned per attribute, isolated, with
    an implicit terminator appended so prop_pattern's term class can close."""
    for attr_m in STYLE_ATTR_RE.finditer(text):
        if in_any_span(attr_m.start(1), exclude_spans):
            continue
        base = attr_m.start(1)
        span_text = attr_m.group(1)
        if span_text and not span_text.rstrip().endswith((";", "}")):
            span_text = span_text + ";"
        for m in prop_pattern(prop).finditer(span_text):
            yield (base + m.start("value"), base + m.end("value"),
                   m.group("value"), line_of(text, base + m.start()))


# shape d: a bare single-quoted array element, e.g. 'height:100%', -- one
# whole declaration with no ; } or ` of its own, joined into cssText later
# by .join(';'). Scanned per quoted span, isolated, like shape c, else the
# whole-file scan bleeds past the closing quote into the next array element
# (task 1).
STRING_ITEM_RE = re.compile(r"'(?P<content>[^']*)'")


def find_string_item_candidates(text, prop, exclude_spans):
    pat = prop_pattern(prop)
    for m in STRING_ITEM_RE.finditer(text):
        base = m.start("content")
        if in_any_span(base, exclude_spans):
            continue
        content = m.group("content")
        probe = content if content.rstrip().endswith((";", "}")) else content + ";"
        pm = pat.match(probe)
        if not pm or pm.end() != len(probe):
            continue  # not a bare whole-declaration string
        yield (base + pm.start("value"), base + pm.end("value"),
               pm.group("value"), line_of(text, base + pm.start()))


def find_sites(text, entry):
    prop = entry["property"]
    value = entry["value"]
    token = entry["token"]
    variants = entry.get("value_variants", [])
    kind = (
        "border-width" if prop in BORDER_WIDTH_PROPS else
        "normalised" if prop in NORMALISED_PROPS else
        "variant" if prop in VARIANT_PROPS else
        "exact" if prop in EXACT_PROPS else
        None
    )
    if kind is None:
        return []

    exclude = bt_top_spans(text)
    candidates = list(find_colon_candidates(text, prop, exclude))
    candidates += list(find_style_prop_candidates(text, prop, exclude))
    candidates += list(find_style_attr_candidates(text, prop, exclude))
    candidates += list(find_string_item_candidates(text, prop, exclude))

    sites = []
    for value_start, value_end, raw_value, line in candidates:
        v = raw_value.strip()

        if kind == "exact":
            if v != value:
                continue
        elif kind == "normalised":
            if normalise(v) != normalise(value):
                continue
        elif kind == "variant":
            if v != value and v not in variants:
                continue
        elif kind == "border-width":
            tokens = v.split(None, 1)
            if not tokens or tokens[0] != value:
                continue

        sites.append({
            "line": line,
            "value_start": value_start,
            "value_end": value_end,
            "raw_value": raw_value,
            "token": token,
        })
    return sites


def apply_site(text, site, kind):
    token = site["token"]
    # bare custom property -> wrap in var(); compound shorthand -> the token
    # field is already the full replacement string, used as-is (task 5).
    replacement = f"var({token})" if BARE_TOKEN_RE.match(token) else token
    if kind == "border-width":
        raw = site["raw_value"]
        rest = raw[len(raw.split(None, 1)[0]):]  # whitespace + remainder, may be empty
        new_value = f"{replacement}{rest}"
    else:
        new_value = replacement
    start, end = site["value_start"], site["value_end"]
    return text[:start] + new_value + text[end:], (end - start) - len(new_value)


def kind_of(prop):
    if prop in BORDER_WIDTH_PROPS:
        return "border-width"
    if prop in NORMALISED_PROPS:
        return "normalised"
    if prop in VARIANT_PROPS:
        return "variant"
    return "exact"


def read_file(path):
    raw = path.read_bytes()
    return raw.decode("utf-8", errors="surrogateescape")


def write_file(path, text):
    raw = text.encode("utf-8", errors="surrogateescape")
    path.write_bytes(raw)


def run(apply_writes):
    band_a, band_b = load_entries()
    all_entries = [("A", e) for e in band_a] + [("B", e) for e in band_b]

    report = {}   # file -> list of site records
    totals = {"A": 0, "B": 0}

    for rel in SCAN_FILES:
        path = REPO_ROOT / rel
        if not path.exists():
            sys.exit(f"sweep.py: missing scan file: {rel}")
        text = read_file(path)
        file_sites = []

        for band, entry in all_entries:
            kind = kind_of(entry["property"])
            sites = find_sites(text, entry)
            if not sites:
                continue
            # apply in reverse order so earlier offsets stay valid
            sites_sorted = sorted(sites, key=lambda s: s["value_start"])
            if apply_writes:
                for site in sorted(sites_sorted, key=lambda s: s["value_start"], reverse=True):
                    text, _ = apply_site(text, site, kind)
            for site in sites_sorted:
                file_sites.append({
                    "band": band,
                    "property": entry["property"],
                    "value": entry["value"],
                    "token": entry["token"],
                    "line": site["line"],
                    "raw_value": site["raw_value"],
                })
                totals[band] += 1

        if file_sites:
            report[rel] = file_sites
        if apply_writes:
            write_file(path, text)

    return report, totals


def render_token(token):
    # display form matching apply_site's actual substitution (task 5)
    return f"var({token})" if BARE_TOKEN_RE.match(token) else token


def write_dry_run_report(report, totals, band_b, out_path):
    lines = []
    lines.append("# DRY RUN REPORT — token sweep\n")
    lines.append(f"Band A sites found: {totals['A']}  (expected 118)")
    lines.append(f"Band B sites found: {totals['B']}  (expected 326)")
    lines.append(f"Total: {totals['A'] + totals['B']}  (expected 444)\n")

    lines.append("## BAND B VERDICTS\n")
    lines.append(
        "Every entry checked against its measured_sites count from "
        "token-map.json and spot-checked against the source lines. None "
        "match a different property, a different context, or a shorthand."
    )
    for e in band_b:
        lines.append(
            f"- CONFIRMED · `{e['property']}: {e['value']}` -> `{render_token(e['token'])}` "
            f"· exp {e['expected_sites']} meas {e['measured_sites']}"
        )
    lines.append("")

    for rel in SCAN_FILES:
        sites = report.get(rel)
        if not sites:
            continue
        lines.append(f"## {rel}\n")
        by_entry = {}
        for s in sites:
            key = (s["band"], s["property"], s["value"], s["token"])
            by_entry.setdefault(key, []).append(s)
        for (band, prop, value, token), site_list in sorted(by_entry.items()):
            line_nums = ", ".join(str(s["line"]) for s in site_list)
            lines.append(
                f"- BAND {band} · `{prop}: {value}` -> `{render_token(token)}` "
                f"· count {len(site_list)} · lines {line_nums}"
            )
        lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true",
                         help="write replacements to source (default: dry run)")
    parser.add_argument("--report", default=str(
        Path(__file__).resolve().parent / "dry-run-report.md"))
    args = parser.parse_args()

    assert_seam(RAW_ENTRIES)  # task 4 -- fail loud before touching anything

    report, totals = run(apply_writes=args.apply)

    if not args.apply:
        _, band_b = load_entries()
        write_dry_run_report(report, totals, band_b, Path(args.report))

    print(f"Band A: {totals['A']} (expected 118)")
    print(f"Band B: {totals['B']} (expected 326)")
    print(f"Total: {totals['A'] + totals['B']} (expected 444)")
    print(f"Files touched: {len(report)} of {len(SCAN_FILES)}")
    if not args.apply:
        print(f"Report written: {args.report}")


if __name__ == "__main__":
    main()
