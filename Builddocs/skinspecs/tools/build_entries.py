#!/usr/bin/env python3
"""Build the full list of new token-map.json entries from the classified
missing declarations, plus the 5 Job-2 canvas/z-index/text-transform/
outline-offset entries. Prints the JSON fragment for review before it is
pasted into the real file via the Write tool."""
import re, json
from pathlib import Path
from collections import defaultdict
from rules import SP_SCALE, assert_no_token_match

ROOT = Path("/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1")
TOKEN_MAP = ROOT / "Builddocs/skinspecs/token-map.json"
data = json.loads(TOKEN_MAP.read_text())
entries = data["entries"]
by_prop = defaultdict(list)
for e in entries:
    if "property" not in e:
        continue
    by_prop[e["property"]].append(e)

def covered(prop, value):
    for e in by_prop.get(prop, []):
        v = e["value"]
        if v == value:
            return e
        if "|" in v and value in v.split("|"):
            return e
        if v.startswith("<") and v.endswith(">"):
            continue
    return None

exec(open(ROOT / "Builddocs/skinspecs/tools/measure2.py").read().split("print(f\"\\n# distinct")[0])

px_re = re.compile(r"^(-?\d+)px$")

def px_to_sp(n, prop):
    if prop == "padding" and n == 9:
        return "--sp-4"
    return SP_SCALE.get(n)

def axis_for(prop):
    if prop in ("padding","padding-left","padding-right","padding-top","padding-bottom",
                "gap","width","height","min-width","min-height","max-width","max-height",
                "top","left","right","bottom","inset",
                "margin","margin-top","margin-bottom","margin-left","margin-right"):
        return "space"
    if prop in ("font-size","font-weight","font-family","font","letter-spacing",
                "line-height","text-transform","font-style","font-variant-numeric","text-align"):
        return "type"
    if prop in ("border","border-top","border-left","border-radius",
                "border-left-width","border-left-style","border-left-color"):
        return "shape"
    if prop in ("box-shadow","opacity","outline","outline-offset","z-index"):
        return "depth"
    if prop in ("transition","animation"):
        return "motion"
    return "misc"

new_entries = []

for (prop, val), locs in sorted(sites.items(), key=lambda x: (-len(x[1]), x[0])):
    if covered(prop, val) is not None:
        continue
    n = len(locs)
    e = {"axis": axis_for(prop), "property": prop, "value": val}

    if prop == "outline-offset":
        tok = "--ring-off" if val == "1px" else ("--ring-off-lg" if val == "2px" else None)
        e.update(token=tok, expected_sites=None, measured_sites=n, reconciles=None,
                 safe_for_script=tok is not None,
                 note="Job 2 token, new. Always pairs with an outline: var(--ring-w) solid ... focus ring.")
        if tok is None:
            e.update(reason="value is a variable, nothing to replace")
    elif prop == "z-index":
        ztok = {"40": "--z-popover", "30": "--z-sticky", "2": "--z-raise-2",
                "1": "--z-raise-1", "-1": "--z-behind"}.get(val)
        e.update(token=ztok, expected_sites=None, measured_sites=n, reconciles=None,
                 safe_for_script=ztok is not None,
                 note="Job 2 token, new. See tokens.css --z-* stack for the role each layer plays.")
    elif prop == "text-transform" and val == "uppercase":
        e.update(token="--tt-label", expected_sites=None, measured_sites=n, reconciles=None,
                 safe_for_script=True,
                 note="Job 2 token, new. Always paired with letter-spacing: var(--track-label).")
    else:
        parts = val.split()
        if parts and all(px_re.match(p) or p == "0" for p in parts):
            mapped = []
            ok = True
            for p in parts:
                if p == "0":
                    mapped.append("0")
                    continue
                n_px = int(px_re.match(p).group(1))
                tok = px_to_sp(n_px, prop)
                if tok is None:
                    ok = False
                    break
                mapped.append(f"var({tok})")
            if ok:
                compound = len(parts) > 1
                if compound:
                    e.update(token=" ".join(mapped), expected_sites=None, measured_sites=n,
                              reconciles=None, safe_for_script=True,
                              reason="COMPOUND SHORTHAND. Each component maps individually onto the --sp-* scale (S1 SS5 worked-example pattern); token field carries the full replacement string.")
                else:
                    tok = mapped[0][4:-1]  # strip var(...)
                    e.update(token=tok, expected_sites=None, measured_sites=n,
                              reconciles=None, safe_for_script=True,
                              note="Exact --sp-* scale match. Size uses the existing spacing dial, not a new knob (Brandon's ruling).")
            else:
                assert_no_token_match(val, context=f"{prop} (px-list fallthrough)")
                e.update(token=None, expected_sites=None, measured_sites=n, reconciles=None,
                          safe_for_script=False,
                          reason="value is a variable, nothing to replace")
        else:
            assert_no_token_match(val, context=f"{prop} (outer fallthrough)")
            e.update(token=None, expected_sites=None, measured_sites=n, reconciles=None,
                      safe_for_script=False, reason="value is a variable, nothing to replace")
    new_entries.append(e)

# --- canvas lineWidth + _fade opacity, Job 2 ---
CANVAS_PROPS = ["lineWidth", "font", "strokeStyle", "fillStyle", "globalAlpha",
                "lineCap", "lineJoin", "textAlign", "textBaseline", "shadowBlur",
                "shadowColor", "lineDashOffset"]
CANVAS_RE = re.compile(
    r"\b(?P<recv>\w+)\.(?P<prop>" + "|".join(CANVAS_PROPS) + r")\s*=\s*"
    r"(?P<value>[^;\n]+);"
)
canvas_sites2 = defaultdict(list)
for rel in ["src/vis/spectrum.js", "src/vis/scope.js"]:
    text = read_file(ROOT / rel)
    for m in CANVAS_RE.finditer(text):
        if m.group("prop") != "lineWidth":
            continue
        v = normalise(m.group("value"))
        canvas_sites2[v].append((rel, line_of(text, m.start())))

for v, locs in canvas_sites2.items():
    n = len(locs)
    if v == "1":
        new_entries.append({
            "axis": "shape", "property": "CanvasRenderingContext2D.lineWidth", "value": "1",
            "token": "--canvas-lw", "expected_sites": None, "measured_sites": n,
            "reconciles": None, "safe_for_script": False,
            "reason": "Job 2 token, new. FENCE 1-style: a JS property assignment, not CSS. Reachable by the extended sweep.py canvas-assignment regex, but the replacement needs the TOKENS getComputedStyle plumbing (see spectrum.js:48 / scope.js:46), not a bare value swap -- hand work."})
    else:
        new_entries.append({
            "axis": "shape", "property": "CanvasRenderingContext2D.lineWidth", "value": v,
            "token": None, "expected_sites": None, "measured_sites": n,
            "reconciles": None, "safe_for_script": False,
            "reason": "value is a variable, nothing to replace"})

FADE_RE = re.compile(r"_fade\([^,]+,\s*([0-9.]+)\s*\)")
fade_sites2 = defaultdict(list)
for rel in ["src/vis/spectrum.js", "src/vis/scope.js"]:
    text = read_file(ROOT / rel)
    for m in FADE_RE.finditer(text):
        line = line_of(text, m.start())
        fade_sites2[m.group(1)].append((rel, line))

FADE_TOKEN = {
    "0.22": "--fade-faint", "0.5": "--fade-half", "0.55": "--fade-mid",
    "0.7": "--fade-strong", "0.82": "--fade-label", "0.9": "--fade-near",
}
for v, locs in fade_sites2.items():
    n = len(locs)
    new_entries.append({
        "axis": "depth", "property": "_fade() alpha argument", "value": v,
        "token": FADE_TOKEN[v], "expected_sites": None, "measured_sites": n,
        "reconciles": None, "safe_for_script": False,
        "reason": "Job 2 token, new. Second argument to the canvas _fade(color, alpha) helper (spectrum.js/scope.js) -- a JS call argument, not a CSS declaration; hand work, not a script substitution."})

print(f"total new entries: {len(new_entries)}")
real = [e for e in new_entries if e.get("token")]
esc = [e for e in new_entries if not e.get("token")]
print(f"with a real token: {len(real)} / {sum(e['measured_sites'] for e in real)} sites")
print(f"escalated (token null): {len(esc)} / {sum(e['measured_sites'] for e in esc)} sites")

out_path = ROOT / "Builddocs/skinspecs/tools/new-entries.json"
out_path.write_text(json.dumps(new_entries, indent=2))
print(f"written: {out_path}")
