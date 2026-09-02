#!/usr/bin/env python3
"""Diff measured declarations against existing token-map.json entries to find
which measured (property, value) pairs already have an entry and which are
genuinely new. Simple-value entries only (property/value keyed); compound
shorthand and pattern-valued entries (e.g. '3px|5px|7px|22px') are matched by
membership so they don't get treated as missing."""
import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1")
TOKEN_MAP = ROOT / "Builddocs/skinspecs/token-map.json"

data = json.loads(TOKEN_MAP.read_text())
entries = data["entries"]

# build lookup: property -> list of (value_or_pattern, entry)
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
            # pattern placeholder e.g. <2-4 value shorthand>, <non-zero one-offs>
            continue
    return None


# re-run measure2.py's extraction inline (import would re-print) -- instead
# read its printed table isn't reusable, so just recompute here directly.
exec(open(ROOT / "Builddocs/skinspecs/tools/measure2.py").read().split("print(f\"\\n# distinct")[0])

missing = []
found = []
for (prop, val), locs in sites.items():
    e = covered(prop, val)
    if e is None:
        missing.append((prop, val, len(locs), locs))
    else:
        found.append((prop, val, len(locs), e.get("token")))

missing.sort(key=lambda x: (-x[2], x[0]))
print(f"COVERED (already an entry): {len(found)} distinct / {sum(x[2] for x in found)} sites")
print(f"MISSING (no entry yet): {len(missing)} distinct / {sum(x[2] for x in missing)} sites")
print()
print("=== MISSING, by count ===")
for prop, val, n, locs in missing:
    loc0 = locs[0]
    print(f"{n:4d}  {prop}: {val}    [{loc0[0]}:{loc0[1]}]")
