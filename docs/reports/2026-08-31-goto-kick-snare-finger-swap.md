# Kick/snare finger swap — drum-synth.js

EDITS
- [src/instruments/drum-synth.js:183-190](../../src/instruments/drum-synth.js#L183-L190) — kick moved off F/J (index fingers) onto D/K (middle fingers); snare moved onto F/J. Both `normal` and `switched` layouts updated, mirror relationship preserved.
- [src/instruments/drum-synth.js:645](../../src/instruments/drum-synth.js#L645) — layout comment corrected to match new key assignment.

OMITTED
- No save/reload persistence added for this or any layout choice. No such mechanism exists anywhere in the app — `state.js` is memory-only, the only precedent is `devbox.js`'s one-off `localStorage` pair, which is dev-tool-only and not wired to any instrument. Watch for effects: layout resets to default (kick on D/K) on every reload. Not filed to TODO.md — Brandon's call to leave it off.

NOT DONE
- Click-a-pad-to-remap toggle discussed but not built this pass — scope was cut to the finger swap only.
