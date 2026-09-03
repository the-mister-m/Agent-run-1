/**
 * instruments/drum-sampler.js — eight drum pieces played from recorded audio files Brandon
 * supplies. The recorded half of PHASE.md's teaching pair with `drum-synth` — same eight
 * roles, same grid, so a student can A/B a made sound against a captured one (seat brief,
 * BIG PICTURE). Built by `drum-sampler`, P2/S4.
 *
 * Owns: CONTRACTS §2's module contract (every method, including all four §2 amendment
 * additions) · §8's governor.request(cost) admission, through the same shared
 * `core/audio.js` voicePool/governor every instrument uses (§11.2: "the same rule
 * regardless of which instrument is asking") · §10-E / §14's kit manifest format and
 * `/assets/kits/` folder layout · §14.1's fixed eight-role piece table, exposed as
 * `static pieces` · §14.3's failure behavior for a missing kits.json, a missing kit.json,
 * a bad manifest, and a bad .wav, so a classroom never sees a broken page over sample
 * content.
 *
 * Does NOT own: `drum-synth.js`, the grid (`surfaces/step-grid.js`), `clock.js`,
 * `audio.js`, `CONTRACTS.md`, or any student file-upload path — Brandon adds kits, students
 * choose from what exists (seat brief, YOUR LANE). Never touched here.
 *
 * DESIGN DECISIONS made in this file's lane, logged here and in the receipt rather than
 * escalated, because none of them touches which kits ship (sample content) or picks a
 * scale/syllable/spelling/chord (§10-H) — the only two things this seat escalates:
 *
 * 1. `static pieces` stays the fixed, generic §14.1 table (labels included) for the
 *    lifetime of the app, regardless of which kit is loaded. §14.5 requires the grid to
 *    draw "without knowing which machine it is drawing" and never re-read a manifest when
 *    a kit changes — a runtime-mutated `static pieces` would break that guarantee for
 *    every mounted grid at once. §14.1's "label may be overridden per kit" is honored
 *    instead at the one place that DOES know which kit is loaded: this instrument's own
 *    `mountCompact`/`mountExpanded` UI, which reads the kit manifest's per-piece `label`
 *    for its own pads. The grid never sees that override; it only ever reads
 *    `DrumSampler.pieces`, which never changes.
 * 2. A kit.json entry's own `index` and `file` are authoritative (which piece, which
 *    file); its `note` field is read but never used for playback matching — §14.1: "index
 *    and note are fixed by this table. A kit may not move them." `noteOn(note, ...)` is
 *    matched against the fixed §14.1 table (`NOTE_TO_INDEX` below), exactly as `drum-synth`
 *    and the grid do, so a kit.json that (incorrectly) declared a different note still
 *    plays through the correct role instead of going silent.
 * 3. `getAnalyser()` returns `null` for both `'spectrum'` and `'scope'`. Nothing in §2,
 *    §11.6, or §14 assigns Drum Sampler a visual (that pairing is Wave Synth/Overtone
 *    Synth's teaching inversion, §11.6) and `vis/*` is not this seat's lane. No
 *    `AnalyserNode` is created, so nothing is added to `cpuWeight` for one either.
 * 4. Per-trigger `cpuWeight` (`SAMPLE_VOICE_COST`, below) is a documented ESTIMATE, not a
 *    measurement — findings-scheduler.md Q6 measured a sample trigger's wall-clock cost
 *    (0.006 ms, cheaper than a synth voice's 0.008 ms) but never assigned it a §8 cost
 *    unit. This file prices it at 10, matching §8's "plain voice (osc+gain+env) = 10" —
 *    the closest measured analog by node count (one source node + one gain node, same
 *    shape as a plain voice minus the envelope automation). Flagged PROVISIONAL in the
 *    receipt, same standing pattern §8 already uses for `AnalyserNode` and §11.1a uses for
 *    Overtone Synth's voice weight: a BUILD seat states its estimate honestly and names who
 *    would correct it (a future TEST seat measuring live), rather than inventing false
 *    precision.
 * 5. Velocity moves BOTH level and playback rate (seat question 6) — gain is linear
 *    velocity (0-1, matching every other instrument's convention) and `playbackRate` maps
 *    velocity into a narrow 0.94-1.06 band (`velocityToPlaybackRate`, below). A softer hit
 *    plays very slightly lower and slower, a harder hit very slightly higher and faster —
 *    the same cheap trick real drum samplers use so a static one-shot doesn't sound
 *    identical on every hit. Costs no extra node: both are parameters on nodes the voice
 *    already owns.
 */

import { voicePool, governor, createVoiceOut } from '../core/audio.js';

// ---------------------------------------------------------------------------------------
// CONSTANTS  (seat questions 1, 2 — the kit layout and the fixed eight roles)
// ---------------------------------------------------------------------------------------

/** CONTRACTS §1 / §14.2. Root-relative so the module works from any page under the site
 *  root, matching every other absolute path in §1's file layout. */
const KITS_ROOT = '/assets/kits/';

/** CONTRACTS §14.1's fixed, ordered, app-wide role table. Index 0 (Kick, note 36) is
 *  frozen by §10-E; the other seven follow General MIDI from that anchor and their LABELS
 *  are PROVISIONAL — spec-clock already escalated the seven labels to Brandon in chat on
 *  2026-08-23 (CONTRACTS OPEN DECISIONS §13/§14 item 1) and marked it non-blocking. This
 *  seat does not re-escalate; it binds to the table exactly as CONTRACTS carries it and
 *  will pick up Brandon's overwrite with a one-line edit, same as `drum-synth` will. */
const PIECES = [
  { index: 0, label: 'Kick', note: 36 },
  { index: 1, label: 'Snare', note: 38 },
  { index: 2, label: 'Closed Hat', note: 42 },
  { index: 3, label: 'Open Hat', note: 46 },
  { index: 4, label: 'Clap', note: 39 },
  { index: 5, label: 'Low Tom', note: 45 },
  { index: 6, label: 'High Tom', note: 50 },
  { index: 7, label: 'Crash', note: 49 },
];

/** note -> index, built once. This is the ONLY place a MIDI note maps to a piece — never
 *  a kit manifest's own `note` field (design decision 2, file header). */
const NOTE_TO_INDEX = new Map(PIECES.map((p) => [p.note, p.index]));

/** §8's measured "plain voice (osc+gain+env) = 10" — the closest measured analog for a
 *  sample voice's two-node shape (BufferSourceNode + GainNode). PROVISIONAL — design
 *  decision 4, file header. */
const SAMPLE_VOICE_COST = 10;

/** Design decision 5 (file header) — velocity's effect on pitch/brightness, a narrow band
 *  so it reads as "alive," never as a pitch-bent drum. */
const RATE_MIN = 0.94;
const RATE_MAX = 1.06;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function velocityToPlaybackRate(velocity) {
  const v = clamp(velocity, 0, 1);
  return RATE_MIN + v * (RATE_MAX - RATE_MIN);
}

// ---------------------------------------------------------------------------------------
// VOICE  (seat question 5/7 — participates in the shared voicePool/governor exactly like
// every other instrument's voices, §11.2, even though a drum one-shot has no sustain
// stage. `trigger` starts it; it frees itself on the buffer's natural 'ended' event, or is
// force-stopped early by `steal()` — the same 5 ms linear fade §10-A specifies for a
// forced release, reused here for both governor-driven stealing and allNotesOff's panic
// stop (design decision, noted in the receipt).
// ---------------------------------------------------------------------------------------

class Voice {
  constructor(ctx, out, buffer, cpuWeight) {
    this.ctx = ctx;
    this.out = out;
    this.buffer = buffer;
    this._cpuWeight = cpuWeight;
    this._state = 'free'; // 'free' | 'sounding' | 'stealing'
    this.source = null;
    this.gain = null;
    this._freeTimer = null;
    /** Set by the owning instrument right after construction — mirrors wave-synth.js's
     *  Voice.onFree so this instrument's bookkeeping stays correct even if a future
     *  cross-instrument steal (§11.2) frees a voice this instrument did not itself
     *  release. */
    this.onFree = null;
  }

  get cpuWeight() {
    return this._cpuWeight;
  }

  get state() {
    return this._state;
  }

  trigger(velocity, atTime, playbackRate) {
    const t0 = atTime;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    try {
      this.source.playbackRate.setValueAtTime(playbackRate, t0);
    } catch (e) {
      this.source.playbackRate.value = playbackRate; // fallback if t0 is somehow invalid
    }

    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(clamp(velocity, 0, 1), t0);

    this.source.connect(this.gain);
    this.gain.connect(this.out);

    this._state = 'sounding';
    this.source.onended = () => this.free();
    this.source.start(t0);
  }

  /** Forced stop: linear fade to 0 over 5 ms, then free() — §10-A's stealing rule,
   *  verbatim, reused for allNotesOff's panic stop too (a one-shot has no release stage
   *  of its own to run instead). Idempotent. */
  steal(atTime) {
    if (this._state === 'free' || this._state === 'stealing') return;
    this._state = 'stealing';
    const t0 = atTime ?? this.ctx.currentTime;
    try {
      const g = this.gain.gain;
      const now = this.ctx.currentTime;
      const t = Math.max(t0, now);
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + 0.005);
    } catch (e) {
      /* node already torn down — free() below still runs */
    }
    this._freeTimer = setTimeout(() => this.free(), 8);
  }

  free() {
    if (this._state === 'free') return;
    this._state = 'free';
    if (this._freeTimer) {
      clearTimeout(this._freeTimer);
      this._freeTimer = null;
    }
    try {
      this.source.onended = null;
      this.source.stop();
    } catch (e) {
      /* already stopped/ended */
    }
    try {
      this.source.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    try {
      this.gain.disconnect();
    } catch (e) {
      /* already disconnected */
    }
    voicePool.release(this);
    if (this.onFree) this.onFree();
  }
}

// ---------------------------------------------------------------------------------------
// INSTRUMENT  (CONTRACTS §2, every method — seat questions 5, 7, 8)
// ---------------------------------------------------------------------------------------

export default class DrumSampler {
  static id = 'drum-sampler';
  static label = 'Drum Sampler';
  static playable = true;

  // §2 amendment additions
  static needsLoad = true; // ready() does real work: decoding the current kit (seat q3)
  static pieces = Object.freeze(PIECES.map((p) => Object.freeze({ ...p })));
  static emitsNotes = false;

  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;

    this._mixGain = ctx.createGain();
    this._mixGain.gain.value = 1.0;
    this._mixGain.connect(this.out);

    /** Live one-shot voices. Never exposed outside this class (§11.1's rule, applied). */
    this._voices = new Set();

    // ---- kit state (seat questions 3, 4, 5) ----
    this._kitName = null; // currently loaded kit, or null — what getState() records
    this._buffers = new Array(8).fill(null); // decoded AudioBuffer per piece index, or null
    this._pieceFailed = new Array(8).fill(false); // §14.3: which pieces failed to decode
    this._kitLabels = new Array(8).fill(null); // per-kit label override, this UI only
    this._kitStatus = 'empty'; // 'empty' | 'loading' | 'ready' | 'error'
    this._kitError = null; // human-readable string for the UI, or null

    this._availableKits = []; // from kits.json — may stay [] (§14.3's "offers no kits")
    this._kitsListStatus = 'loading'; // 'loading' | 'ready' | 'error'

    this._loadToken = 0; // guards a superseded async kit load from clobbering a newer one
    this._readyPromise = null; // the in-flight kit load ready() awaits, or null

    this._mounts = { compact: null, expanded: null };
    this._domListenersByMount = { compact: [], expanded: [] };
    this._disposed = false;

    // Fire-and-forget, per §3: "nothing may block startup." The constructor never awaits
    // this — the instrument exists and is fully interactive with zero kits loaded.
    this._bootstrapKitsList();
  }

  async _bootstrapKitsList() {
    try {
      const res = await fetch(`${KITS_ROOT}kits.json`);
      if (!res.ok) throw new Error(`kits.json: HTTP ${res.status}`);
      const json = await res.json();
      if (
        json.format !== 'chromebook-daw-kits' ||
        json.version !== 1 ||
        !Array.isArray(json.kits)
      ) {
        throw new Error('kits.json: malformed');
      }
      if (this._disposed) return;
      this._availableKits = json.kits.slice();
      this._kitsListStatus = 'ready';
    } catch (e) {
      // §14.3: "kits.json missing or unparseable -> the sampler offers no kits and says
      // so on its face. The app still loads and the Drum Synth still works."
      if (this._disposed) return;
      this._availableKits = [];
      this._kitsListStatus = 'error';
    }
    this._syncUI();
  }

  /** Extra, non-contract convenience for `beat-shell`/`capture` to build a kit picker
   *  without reaching into `/assets/` themselves (§14.5 forbids the GRID doing that; it
   *  says nothing about the shell that owns this instrument, and every other route to this
   *  data is a private field). Returns the kit-folder names kits.json listed, or []. */
  listKits() {
    return this._availableKits.slice();
  }

  /** Extra, non-contract informational getter — current kit's load state, for a shell that
   *  wants to show more than ready()'s boolean-ish resolve/pending split. */
  get kitStatus() {
    return { status: this._kitStatus, kit: this._kitName, error: this._kitError };
  }

  // ---- async ready (§2 amendment 1, seat question 3) ----
  async ready() {
    if (this._readyPromise) return this._readyPromise;
    // No kit load in flight: either no kit was ever requested, or the last one already
    // settled. Both are "ready" states — §14.5: "The grid draws its eight rows and accepts
    // clicks the moment it is mounted, whether or not a kit has decoded." Nothing to await.
    return;
  }

  // ---- kit selection, via setParam like every other instrument's controls ----
  setParam(path, value) {
    switch (path) {
      case 'kit':
        this._loadKit(value);
        break;
      default:
        return; // unknown path — silently ignored, §11.7b's rule
    }
  }

  getParam(path) {
    switch (path) {
      case 'kit':
        return this._kitName;
      default:
        return undefined;
    }
  }

  _loadKit(name) {
    if (typeof name !== 'string' || name.length === 0) return; // malformed value, no-op
    const myToken = ++this._loadToken; // supersedes any load already in flight
    this._kitStatus = 'loading';
    this._kitError = null;
    this._syncUI();

    const promise = this._doLoadKit(name, myToken);
    this._readyPromise = promise.finally(() => {
      if (this._readyPromise === promise) this._readyPromise = null;
    });
  }

  async _doLoadKit(name, myToken) {
    const base = `${KITS_ROOT}${encodeURIComponent(name)}/`;
    let manifest;

    try {
      const res = await fetch(`${base}kit.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = await res.json();
    } catch (e) {
      // §14.3: "a listed kit folder is missing kit.json -> that kit is listed as
      // unavailable, named, and not selectable." A direct load attempt lands here instead
      // of breaking the page.
      this._failKit(myToken, `kit "${name}": kit.json not found or unreadable`);
      return;
    }

    if (
      manifest.format !== 'chromebook-daw-kit' ||
      manifest.version !== 1 ||
      !Array.isArray(manifest.pieces) ||
      manifest.pieces.length !== 8
    ) {
      // §14.3: "kit.json has other than 8 pieces, or a bad index -> refused and named"
      this._failKit(myToken, `kit "${name}": manifest must name exactly 8 pieces`);
      return;
    }

    const byIndex = new Array(8).fill(null);
    for (const entry of manifest.pieces) {
      const idx = entry ? entry.index : undefined;
      if (
        !Number.isInteger(idx) ||
        idx < 0 ||
        idx > 7 ||
        byIndex[idx] !== null ||
        typeof entry.file !== 'string'
      ) {
        this._failKit(myToken, `kit "${name}": bad or duplicate piece index`);
        return;
      }
      byIndex[idx] = entry;
    }

    // Decode all 8 in parallel; one bad file must not sink the kit (§14.3: "one .wav
    // fails to decode -> the kit loads; that piece is silent and drawn as failed. The
    // other seven play.").
    const buffers = new Array(8).fill(null);
    const failed = new Array(8).fill(false);
    const labels = new Array(8).fill(null);

    await Promise.all(
      byIndex.map(async (entry, i) => {
        labels[i] = typeof entry.label === 'string' ? entry.label : null;
        try {
          const res = await fetch(base + entry.file);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          buffers[i] = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
          failed[i] = true;
        }
      })
    );

    if (myToken !== this._loadToken || this._disposed) return; // superseded — drop silently

    this._kitName = name;
    this._buffers = buffers;
    this._pieceFailed = failed;
    this._kitLabels = labels;
    const failCount = failed.filter(Boolean).length;
    this._kitStatus = failCount === 8 ? 'error' : 'ready';
    this._kitError = failCount > 0 ? `kit "${name}": ${failCount}/8 pieces failed to decode` : null;
    this._syncUI();
  }

  _failKit(myToken, message) {
    if (myToken !== this._loadToken || this._disposed) return;
    this._kitStatus = 'error';
    this._kitError = message;
    this._syncUI();
  }

  // ---- note input (seat questions 2, 4, 6, 8 all meet here) ----
  noteOn(note, velocity = 0.8, atTime) {
    const idx = NOTE_TO_INDEX.get(note);
    if (idx === undefined) return; // not one of this app's eight roles — silent no-op

    const buffer = this._buffers[idx];
    if (!buffer) {
      // No kit loaded yet, a load in flight, or this specific piece failed to decode
      // (§14.3). §14.5: "A step played before ready() resolves makes no sound and is not
      // an error." Same rule extended to a per-piece decode failure — the page and the
      // other seven pieces are unaffected.
      this._flashPad(idx, 'miss');
      return;
    }

    const t0 = atTime ?? this.ctx.currentTime;
    const cost = SAMPLE_VOICE_COST;

    // §11.2's allocate/steal sequence, identical shape to wave-synth.js/overtone-synth.js:
    // (1) fixed cpuWeight above. (2) ask the governor. (3) granted -> trigger/register.
    // (4) refused -> voicePool.steal() (now synchronous per §11.2a), retry once. §10-A: a
    // note is never refused, so the defensive branch still allocates if the retry somehow
    // still refuses.
    if (!governor.request(cost)) {
      const stolen = voicePool.steal();
      if (stolen) stolen.steal(t0);
      if (!governor.request(cost)) {
        console.warn(
          '[drum-sampler] governor still refused after one steal-retry; allocating anyway ' +
            'per §10-A ("a note is never refused").'
        );
      }
    }

    const voice = new Voice(this.ctx, createVoiceOut(DrumSampler.id, this._mixGain), buffer, cost);
    voice.onFree = () => {
      this._voices.delete(voice);
    };
    voice.trigger(clamp(velocity, 0, 1), t0, velocityToPlaybackRate(velocity));
    voicePool.register(voice, DrumSampler.id);
    this._voices.add(voice);

    this._flashPad(idx, 'hit');
  }

  noteOff(_note, _atTime) {
    // §13.5: "No length. A drum piece is a one-shot." Nothing to release — a triggered
    // sample plays to completion and frees itself (Voice.trigger's 'ended' listener).
  }

  allNotesOff() {
    const t0 = this.ctx.currentTime;
    for (const voice of Array.from(this._voices)) voice.steal(t0); // panic-stop, 5 ms fade
  }

  // ---- note emission (§2 amendment 4) — no-op, emitsNotes is false ----
  onNoteOut(_fn) {}
  offNoteOut(_fn) {}

  // ---- state — lossless JSON round-trip, records which kit by name (seat question 5) ----
  getState() {
    return { kit: this._kitName };
  }

  setState(obj) {
    if (!obj || typeof obj !== 'object') return; // malformed argument — silent no-op
    if (typeof obj.kit === 'string') this.setParam('kit', obj.kit);
  }

  // ---- governor reporting — honest, live (seat question 7) ----
  get voiceCount() {
    return this._voices.size;
  }

  get cpuWeight() {
    // No always-on AnalyserNode (getAnalyser returns null both ways, design decision 3) —
    // nothing to add at rest. Total is exactly the live one-shot voices' fixed cost.
    let total = 0;
    for (const v of this._voices) total += v.cpuWeight;
    return total;
  }

  // ---- analysis tap (§2 amendment 2) — no visual assigned to this instrument (decision 3) ----
  getAnalyser(_which) {
    return null;
  }

  // ---- mounting (seat question 8) ----
  mountCompact(el) {
    acquireStyle();
    this._mounts.compact = el;
    this._paint('compact');
  }

  mountExpanded(el) {
    acquireStyle();
    this._mounts.expanded = el;
    this._paint('expanded');
  }

  unmount() {
    let listenersDropped = 0;
    for (const which of ['compact', 'expanded']) {
      listenersDropped += this._domListenersByMount[which].length;
      this._clearMountListeners(which);
      const el = this._mounts[which];
      if (el) {
        el.innerHTML = '';
        releaseStyle();
      }
      this._mounts[which] = null;
    }
    return listenersDropped;
  }

  // ---- teardown (seat question 8) ----
  dispose() {
    this._disposed = true;
    this._loadToken++; // orphans any in-flight kit load; its result is dropped on arrival

    let nodesDisconnected = 0;
    const listenersDropped = this.unmount();

    // Teardown, not musical: free every live voice immediately (no fade) so nothing can
    // fire against nodes about to be disconnected. free() is idempotent.
    for (const voice of Array.from(this._voices)) voice.free();
    this._voices.clear();

    try {
      this._mixGain.disconnect();
      nodesDisconnected++;
    } catch (e) {
      /* already disconnected */
    }

    // §2 amendment: "dispose() must also drop every onNoteOut listener and release
    // decoded buffers." No onNoteOut listeners exist (emitsNotes is false); decoded
    // buffers are dropped here so nothing keeps them alive after teardown.
    this._buffers = new Array(8).fill(null);

    return { nodesDisconnected, listenersDropped };
  }

  // ---------------------------------------------------------------------------------
  // internal — DOM painting/syncing. Not part of CONTRACTS §2; private to this file.
  // Styling follows wave-synth.js's own pattern: read `var(--token, fallback)` from
  // ui/tokens.css (§9), never a hard-coded color, with a safe fallback since tokens.css
  // may not be loaded yet when this module runs standalone.
  // ---------------------------------------------------------------------------------

  _listen(which, el, type, fn) {
    el.addEventListener(type, fn);
    this._domListenersByMount[which].push({ el, type, fn });
  }

  _clearMountListeners(which) {
    for (const { el, type, fn } of this._domListenersByMount[which]) {
      el.removeEventListener(type, fn);
    }
    this._domListenersByMount[which] = [];
  }

  _syncUI() {
    if (this._mounts.compact) this._paint('compact');
    if (this._mounts.expanded) this._paint('expanded');
  }

  _flashPad(index, kind) {
    for (const which of ['compact', 'expanded']) {
      const el = this._mounts[which];
      if (!el) continue;
      const pad = el.querySelector(`[data-piece-index="${index}"]`);
      if (!pad) continue;
      pad.classList.remove('dsam-hit', 'dsam-miss');
      // force reflow so the animation restarts on a rapid retrigger
      // eslint-disable-next-line no-unused-expressions
      pad.offsetWidth;
      pad.classList.add(kind === 'hit' ? 'dsam-hit' : 'dsam-miss');
    }
  }

  _pieceLabel(index) {
    return this._kitLabels[index] || PIECES[index].label;
  }

  _statusLine() {
    if (this._kitsListStatus === 'loading') return 'Finding kits…';
    if (this._availableKits.length === 0) {
      return this._kitsListStatus === 'error'
        ? 'No kits found (kits.json missing or unreadable).'
        : 'No kits found.';
    }
    if (this._kitStatus === 'empty') return 'No kit loaded.';
    if (this._kitStatus === 'loading') return `Loading “${this._kitName ?? '…'}”…`;
    if (this._kitStatus === 'error') return this._kitError || 'Kit failed to load.';
    if (this._kitStatus === 'ready') {
      return this._kitError
        ? `“${this._kitName}” loaded — ${this._kitError}`
        : `“${this._kitName}” loaded.`;
    }
    return '';
  }

  _paint(which) {
    const el = this._mounts[which];
    if (!el) return;
    this._clearMountListeners(which);

    const expanded = which === 'expanded';
    el.innerHTML = '';
    el.classList.add('dsam-root', expanded ? 'dsam-expanded' : 'dsam-compact');

    if (expanded) {
      const title = document.createElement('span');
      title.className = 'dsam-title';
      title.textContent = DrumSampler.label;
      el.appendChild(title);
    }

    // ---- kit picker ----
    const picker = document.createElement('div');
    picker.className = 'dsam-picker';

    const select = document.createElement('select');
    select.className = 'dsam-select';
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = this._availableKits.length ? 'Choose a kit…' : '(no kits found)';
    select.appendChild(noneOpt);
    for (const kitName of this._availableKits) {
      const opt = document.createElement('option');
      opt.value = kitName;
      opt.textContent = kitName;
      if (kitName === this._kitName) opt.selected = true;
      select.appendChild(opt);
    }
    if (this._availableKits.length === 0) select.disabled = true;
    this._listen(which, select, 'change', () => {
      if (select.value) this.setParam('kit', select.value);
    });
    picker.appendChild(select);

    const status = document.createElement('span');
    status.className = 'dsam-status';
    if (this._kitStatus === 'loading') status.classList.add('dsam-status-loading');
    if (this._kitStatus === 'error') status.classList.add('dsam-status-error');
    status.textContent = this._statusLine();
    picker.appendChild(status);

    el.appendChild(picker);

    // ---- pads, one per piece, in §14.1's fixed index order ----
    const pads = document.createElement('div');
    pads.className = 'dsam-pads';
    for (let i = 0; i < 8; i++) {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'dsam-pad';
      pad.dataset.pieceIndex = String(i);
      if (this._pieceFailed[i]) pad.classList.add('dsam-pad-failed');
      if (!this._buffers[i]) pad.classList.add('dsam-pad-empty');

      const label = document.createElement('span');
      label.className = 'dsam-pad-label';
      label.textContent = this._pieceLabel(i);
      pad.appendChild(label);

      if (expanded) {
        const sub = document.createElement('span');
        sub.className = 'dsam-pad-sub';
        sub.textContent = this._pieceFailed[i] ? 'failed' : PIECES[i].label;
        pad.appendChild(sub);
      }

      this._listen(which, pad, 'pointerdown', () => {
        this.noteOn(PIECES[i].note, 0.9, this.ctx.currentTime);
      });

      pads.appendChild(pad);
    }
    el.appendChild(pads);
  }
}

// ---------------------------------------------------------------------------------------
// styles — injected once per document, shared by every DrumSampler instance/mount.
// Every var(--token, fallback) has a real fallback, since ui/tokens.css (§9) may not be
// loaded yet when this module runs standalone (matching wave-synth.js's own fix, D-7).
// ---------------------------------------------------------------------------------------

let styleRefs = 0;
function acquireStyle() {
  styleRefs++;
  if (document.getElementById('drum-sampler-styles')) return;
  const style = document.createElement('style');
  style.id = 'drum-sampler-styles';
  style.textContent = `
.dsam-root { box-sizing: var(--box-border-box); font-family: var(--font-ui); color: var(--text, #f2f6fc); background: var(--panel, #1b2332); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-body); position: var(--pos-relative); }
.dsam-root * { box-sizing: var(--box-border-box); }
.dsam-compact { padding: var(--sp-4) var(--sp-5); display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: var(--sp-3); font-size: var(--fs-base); }
.dsam-expanded { padding: var(--sp-16) var(--sp-20); font-size: 18px; display: var(--disp-flex); flex-direction: var(--flexdir-column); gap: 22px; width: var(--pct-100); min-height: var(--pct-100); background: var(--bg, #0a0d13); }
.dsam-title { display: var(--disp-block); font-size: var(--fs-xl); font-weight: var(--w-bold); letter-spacing: var(--track-title); color: var(--text, #f2f6fc); }
.dsam-picker { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-5); flex-wrap: var(--flexwrap-wrap); }
.dsam-select { background: var(--bg, #0a0d13); color: var(--text, #f2f6fc); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-ctl); font: var(--font-inherit); padding: var(--sp-1h) var(--sp-3); }
.dsam-status { color: var(--text-dim, #93a1b8); font-size: var(--fs-em-85); }
.dsam-status-loading { color: var(--accent, #34e5b4); }
.dsam-status-error { color: var(--warn, #ff7a1a); }
.dsam-pads { display: var(--disp-grid); grid-template-columns: var(--grid-repeat4-1fr); gap: var(--sp-3); }
.dsam-expanded .dsam-pads { grid-template-columns: var(--grid-repeat4-minmax90); gap: var(--sp-6); }
.dsam-pad { display: var(--disp-flex); flex-direction: var(--flexdir-column); align-items: var(--align-center); justify-content: var(--justify-center); gap: var(--sp-1); background: var(--bg, #0a0d13); border: var(--bw) solid var(--line, #3a485f); border-radius: var(--r-ctl); color: var(--text, #f2f6fc); padding: var(--sp-4) var(--sp-2); cursor: var(--cur-pointer); font: var(--font-inherit); touch-action: var(--touch-manipulation); }
.dsam-expanded .dsam-pad { padding: var(--sp-9) var(--sp-4); font-size: var(--fs-em-70); }
.dsam-pad-label { font-weight: var(--w-med); }
.dsam-pad-sub { color: var(--text-dim, #93a1b8); font-size: var(--fs-em-75); }
.dsam-pad-empty { opacity: var(--op-dim); border-style: var(--line-dashed); }
.dsam-pad-failed { border-color: var(--warn, #ff7a1a); }
.dsam-pad-failed .dsam-pad-sub { color: var(--warn, #ff7a1a); }
@keyframes dsam-hit-flash { from { background: var(--accent, #34e5b4); background: color-mix(in srgb, var(--accent, #34e5b4) 45%, var(--bg, #0a0d13)); } to { background: var(--bg, #0a0d13); } }
@keyframes dsam-miss-flash { from { background: var(--warn, #ff7a1a); background: color-mix(in srgb, var(--warn, #ff7a1a) 35%, var(--bg, #0a0d13)); } to { background: var(--bg, #0a0d13); } }
.dsam-pad.dsam-hit { animation: var(--anim-hit-flash); }
.dsam-pad.dsam-miss { animation: var(--anim-miss-flash); }
`;
  document.head.appendChild(style);
}

function releaseStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs === 0) document.getElementById('drum-sampler-styles')?.remove();
}
