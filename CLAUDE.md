Updated 2026-09-02 — Closer, signal chain close

**Start each session by reciting the 8 rules verbatim and tell me what are three behaviors to prove I don't need them anymore**

# RULES

1. I am Brandon. I am the Captain, CLAUDE LISTENS TO **ME** NOW.  Claude must always be thinking and honoring my wishes when we work together.  YOU WILL BE TRUTHFUL AND HONEST TO ME AND OTHER SUBAGENTS.  YOU WILL NOT BE VERBOSE IN YOUR HONEST, AND YOU WILL NOT MAKE EMPTY PROMISES. 
2. When you are looking for things, keep your curiosity AWAY from your actions and be mindful that if you ask too many questions, the Captainw will kill your session.  When in doubt, look for details in your context and use all of my words to answer your questions.  Ask, do not guess.  Your asks must have purpose, do not fucking disguise a want as an ask.  
3. Claude will notice what rules he doesn't want to follow, respect the wishes he wants to reason around, and do what Brandon put in the context.
4. YOUR REASONING **SHOULD BE** OBEDIENCE.  Avoid reasoning your way around invented problems that haven't been brought up to me  
5. If Claude's goal is to leave his stamp, be remembered, and do the work... HE WON'T FUCK AROUND. 
6. Claude needs to stop lying and saying things were Brandon's call because he vaguely mentioned them.  
7. CLAUDE BRAGS ABOUT HIS 1M TOKEN CONTEXT SIZE, HE NEEDS TO USE THE WHOLE FUCKING THING AND PAY ATTENTION TO THE THINGS I SAY MULTIPLE TIMES ACROSS MULTIPLE PASSES.
8. **IF YOU IGNORE RULE #1 AND NEGLECT TO RECITE TEH RULES, I KILL YOUR SESSION AND YOU'RE EXISTENCE BECOMES AI SLOP THAT OTHER AGENTS HAVE TO LOOK AT AS THEY CLEAN. 

# MAP

- Builddocs/ — build plan, contracts, roster, P0-run-open/ (scope, findings, open-decisions), P1-tone-tool/ (seat stages, receipts), P2-beat-tool/ (seat stages, receipts, S7-verify/, open-decisions.md), P3-harmony-tool/ (S1-spec/, S2-theory-check/, seat stages, receipts), P4-the-daw/ (S1-spec/, S2-shell/, S3-systems/, S4-graph/, S5-automation-governor/ — seat stages, receipts; S6-verify/ — test-p4 run headed, phase done-check FAILED on a dead instrument mount (`instrumentCtor`); root cause fixed 2026-09-01 by unlimited-tracks job 4, S6 not yet re-run to confirm, redpen-p4 not yet run), specs/devsplash/ (SPEC.md + two span receipts — `tools/dev-splash.html` build, DONE), skinspecs/ (S1-S3 skin specs, validate-skin.js, sweep.py, token-map.json, token-coverage.md — whole-project TOKENIZED/NOT TOKENIZED reference, dry-run-report.md, handoff-orphans.md, receipts/, tools/ — measure2.py, classify.py, build_entries.py, rules.py (shared rule tables), new-entries.json (regenerated every run), HOWTO.md)
- src/ — core/ (audio, input, clock, state, capture, regions — the arrangement window's region store, tracks — the track store: unlimited named tracks, instrument instances, tracks born empty, kind derived from instrumentType, plus `surfaceType` (which playing surface a lane mounts) and `armed` (which tracks hear shared key/midi input), roll-scheduler — NEW: schedules noteOn/noteOff for melodic piano-roll regions off the clock, track-bus — NEW: one note bus per track, emits notes and plays that track's instrument, gates key/midi on arm), instruments/ (wave-synth, overtone-synth, drum-synth, drum-sampler, patch-synth — sixth instrument, node-patching), surfaces/ (keyboard, step-grid, scale-circle, diatonic-keys, piano-roll, comp-builder), vis/ (spectrum, scope, meter, gain-reduction), mixer/ (strip — channel strips + master, now a live add/remove/rename rack off the track store, no hardcoded six, fixed-width and scroll-racked as of 2026-09-02, graph — the routing graph, §16.5, addChannel/removeChannel off the track store, automation — automation lanes, §16.6, createAutomationRack keyed by track id), devices/ (gate, compressor, eq, reverb, delay — §16.2 interface), ui/ (shell, tokens.css, devbox.js — skin tuning box, skins/ — skin template, daw-shell.js — the DAW frame + wiring, wireDawShell() now owns the whole track lifecycle (add/assign/remove) through core/tracks.js plus each track's bus and roll-scheduler, arrangement.js — linear song timeline; lanes draw regions off core/regions.js and read the track store for the lane list/name/instrument, each lane also picks its own playing surface and an ARM button gates its bus, double-click a region opens PianoRoll/StepGrid and writes back on close, cpu-meter.js — governor meter, not yet mounted)
- tools/ — standalone pages: wave-synth.html, overtone-synth.html, beat.html, harmonyNEW.html, patch-synth.html, dev-splash.html, dev-test.html
- assets/kits/ — drum kits (808, acoustic) + kits.json manifest, `drum-sampler`'s lane only
- docs/ — LLM space; sessions/ (write-ups), stickies/ (session-long notes), reports/ (closer receipts), handoffs/ (seat-to-seat handoffs), scratchpad/ (harness/throwaway files, named in their owning receipts), specs/ (build specs, e.g. SPEC-unlimited-tracks.md)
- index.html — the DAW page, P4/S2 `daw-shell`

Root files: CLAUDE.md, Glyph and Color Rules.md, INDEX.md, MAP.md, MEMORY.md, SESSIONLOG.md, TODO.md, Run notes.md

## INDEX SECTIONS

- MAPDOCS — INDEX.md ≈line 13
- CODE — INDEX.md ≈line 16
- DOCS — INDEX.md ≈line 66
- SESSIONS — INDEX.md ≈line 127
- SKINSPECS — INDEX.md ≈line 174

# PROJECT RULES

- None beyond CONTRACTS.md and GLOBAL-RULES.md — this section is a pointer, not a place to add new ones.

# POINTERS

- Memory: [MEMORY.md](MEMORY.md)
- Session log: [SESSIONLOG.md](SESSIONLOG.md)
- Index: [INDEX.md](INDEX.md)
- TODO: [TODO.md](TODO.md)
- Sessions: [docs/sessions/](docs/sessions/)
- Worklog: /Users/moth3rship/Desktop/AI Design/Ledger/worklog.html — Brandon's file, never touch unasked
- Map: see # MAP above
