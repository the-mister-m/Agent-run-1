#!/usr/bin/env python3
"""Classify every MISSING (property, value) declaration into a token-map
entry: a real token (exact --sp-*/--fs-* scale match, or a Job-2 new token),
or an escalation (token: null) with a stated reason. Prints proposed entries
for review -- does not write token-map.json."""
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

proposed = []   # list of dict entries (token-map shape) with a source note
skipped_covered = 0

for (prop, val), locs in sorted(sites.items(), key=lambda x: (-len(x[1]), x[0])):
    if covered(prop, val) is not None:
        skipped_covered += 1
        continue
    n = len(locs)
    entry = {"property": prop, "value": val, "measured_sites": n, "_locs": locs[:3]}

    if prop == "outline-offset":
        tok = "--ring-off" if val == "1px" else ("--ring-off-lg" if val == "2px" else None)
        entry.update(token=tok, safe_for_script=tok is not None, _job2=True)
        if tok is None:
            entry.update(reason="value is a variable, nothing to replace")
    elif prop == "z-index":
        entry.update(token=None, safe_for_script=False, _job2_zindex=True)
    elif prop == "text-transform" and val == "uppercase":
        entry.update(token="--tt-label", safe_for_script=True, _job2=True)
    else:
        # px-valued size/position -- try exact --sp-* match, component-wise for compounds
        parts = val.split()
        if parts and all(px_re.match(p) or p == "0" for p in parts):
            mapped = []
            ok = True
            for p in parts:
                if p == "0":
                    mapped.append("0")
                    continue
                mnum = px_re.match(p)
                n_px = int(mnum.group(1))
                tok = px_to_sp(n_px, prop)
                if tok is None:
                    ok = False
                    break
                mapped.append(f"var({tok})")
            if ok:
                new_value = " ".join(mapped)
                compound = len(parts) > 1
                entry.update(token=new_value if compound else mapped[0].replace("var(", "").replace(")", ""),
                              safe_for_script=not compound,
                              _sp_mapped=True, _compound=compound, _new_value=new_value)
            else:
                assert_no_token_match(val, context=f"{prop} (px-list fallthrough)")
                entry.update(token=None, safe_for_script=False,
                              reason="value is a variable, nothing to replace")
        else:
            assert_no_token_match(val, context=f"{prop} (outer fallthrough)")
            entry.update(token=None, safe_for_script=False,
                          reason="value is a variable, nothing to replace")
    proposed.append(entry)

print(f"covered (skipped): {skipped_covered}")
print(f"proposed entries: {len(proposed)}  sites: {sum(e['measured_sites'] for e in proposed)}")
print()
real_token = [e for e in proposed if e.get("token") or e.get("_job2") or e.get("_job2_zindex")]
escalated = [e for e in proposed if not e.get("token") and not e.get("_job2") and not e.get("_job2_zindex")]
print(f"-> real token / job2: {len(real_token)} distinct / {sum(e['measured_sites'] for e in real_token)} sites")
print(f"-> escalated (token: null): {len(escalated)} distinct / {sum(e['measured_sites'] for e in escalated)} sites")
unclassified = [e for e in proposed if e.get("reason") == "value is a variable, nothing to replace"]
print(f"-> skipped, value is a variable: {len(unclassified)}")
print()
print("=== REAL TOKEN / JOB2 ===")
for e in real_token:
    print(f"{e['measured_sites']:4d}  {e['property']}: {e['value']}  ->  {e.get('token') or ('JOB2:' + e['property'])}   [{e['_locs']}]")
print()
print("=== ESCALATED ===")
for e in escalated:
    print(f"{e['measured_sites']:4d}  {e['property']}: {e['value']}  ::  {e['reason']}")
