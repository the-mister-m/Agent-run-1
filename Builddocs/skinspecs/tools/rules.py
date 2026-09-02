"""Shared tables for classify.py and build_entries.py. Import, do not copy."""

# --- the full --sp-* scale, px -> token name ---
# rebuilt against src/ui/tokens.css directly (--sp-unit: 2px, every --sp-N
# token is calc(var(--sp-unit) * N)) -- the previous table stopped at 40px
# and silently under-matched every step above it. See
# docs/reports/2026-08-31-seat4b-map-rewrite.md task 5.
SP_SCALE = {
    0: "--sp-0", 1: "--sp-hair", 2: "--sp-1", 3: "--sp-1h", 4: "--sp-2",
    5: "--sp-2h", 6: "--sp-3", 7: "--sp-3h", 8: "--sp-4", 9: "--sp-4h",
    10: "--sp-5", 11: "--sp-5h", 12: "--sp-6", 14: "--sp-7", 15: "--sp-7h",
    16: "--sp-8", 18: "--sp-9", 20: "--sp-10", 22: "--sp-11", 24: "--sp-12",
    26: "--sp-13", 28: "--sp-14", 30: "--sp-15", 32: "--sp-16", 34: "--sp-17",
    36: "--sp-18", 40: "--sp-20", 46: "--sp-23", 56: "--sp-28", 60: "--sp-30",
    62: "--sp-31", 66: "--sp-33", 74: "--sp-37", 78: "--sp-39", 120: "--sp-60",
    130: "--sp-65", 168: "--sp-84", 190: "--sp-95", 460: "--sp-230",
    620: "--sp-310",
}
# padding's own worked-example ruling: the 9px component -> --sp-4 (8px), not --sp-4h.
# already-established in token-map.json; applies to padding only.

# --- live check against src/ui/tokens.css, for the "no token exists" guard ---
# task 6: before either fallthrough writes "value is a variable, nothing to
# replace", assert no token in tokens.css has a matching value. Resolves
# calc(var(--X) * N) the same way the --sp-*/--r-*/--fs-*/--bw-*/--stroke-*
# families are actually defined, so a computed match (e.g. --sp-37 -> 74px)
# counts even though the literal string "74px" never appears in the file.
import re as _re
from pathlib import Path as _Path

_TOKENS_CSS = _Path(__file__).resolve().parents[3] / "src/ui/tokens.css"
_DECL_RE = _re.compile(r'^\s*(--[a-zA-Z0-9_-]+):\s*([^;]+);', _re.MULTILINE)
_CALC_RE = _re.compile(r'calc\(var\((--[a-zA-Z0-9_-]+)\)\s*\*\s*([0-9.]+)\)')
_NUM_RE = _re.compile(r'^(-?[0-9.]+)(px)?$')

def _load_raw_map():
    text = _TOKENS_CSS.read_text()
    return dict(_DECL_RE.findall(text))

def _resolve(name, raw_map, seen=None):
    seen = seen or set()
    if name in seen:
        return None
    seen.add(name)
    v = raw_map.get(name)
    if v is None:
        return None
    m = _CALC_RE.match(v)
    if m:
        base_val = _resolve(m.group(1), raw_map, seen)
        if base_val is not None:
            _, bnum, bunit = base_val
            return (f"{bnum * float(m.group(2)):g}{bunit}", bnum * float(m.group(2)), bunit)
        return None
    nm = _NUM_RE.match(v)
    if nm:
        return (v, float(nm.group(1)), nm.group(2) or "")
    return None

def matching_tokens(value):
    """Return the list of token names in tokens.css whose value -- literal or
    calc()-resolved -- exactly equals `value`. Empty list means no token
    exists for it (the only case build_entries.py/classify.py may write
    "value is a variable, nothing to replace")."""
    raw_map = _load_raw_map()
    hits = []
    for name, raw_v in raw_map.items():
        if raw_v == value:
            hits.append(name)
            continue
        r = _resolve(name, raw_map)
        if r is not None:
            s, num, unit = r
            if abs(num - round(num)) < 1e-9 and f"{int(round(num))}{unit}" == value:
                hits.append(name)
    return hits

def assert_no_token_match(value, context=""):
    """Fail loud (exit non-zero) if a token in tokens.css already matches
    `value` -- guards the "value is a variable, nothing to replace" fallback
    from silently mislabeling a literal that already has a token. See
    docs/reports/2026-08-31-seat4b-map-rewrite.md task 6."""
    hits = matching_tokens(value)
    if hits:
        raise SystemExit(
            f"ASSERTION FAILED ({context}): value {value!r} matches existing "
            f"token(s) {hits} in tokens.css -- this must not be written as "
            f"'value is a variable, nothing to replace'. Fix the map entry "
            f"instead of writing this reason."
        )
