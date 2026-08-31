/**
 * vis/spectrum.js — the spectrum analyzer. **Wave Synth's visual, and only Wave Synth's.**
 * Built by `scopes`, P1/S3.
 *
 * THE INVERSION (PHASE.md, and the whole point of P1):
 *   Wave Synth lets you pick a shape and shows you the FREQUENCIES in it  → spectrum.
 *   Overtone Synth lets you pick frequencies and shows you the SHAPE      → oscilloscope.
 *   Each synth shows the view it is not letting you touch. Do not "fix" this by giving
 *   either synth both. This file enforces its half mechanically: it binds to
 *   `getAnalyser('spectrum')` and nothing else, and an instrument that returns `null` for
 *   that tap (Overtone Synth does, per CONTRACTS §11.5) cannot be wired to this visual —
 *   the constructor refuses.
 *
 * Owns: CONTRACTS §1's `vis/spectrum.js` layout entry. Reads §2's `getAnalyser(which)`
 * amendment and §11.6's placement of that node. Draws with §9's tokens only.
 *
 * Does NOT own and never touches: any instrument's nodes, `vis/meter.js` or
 * `vis/gain-reduction.js` (P4's), `vis/scope.js`'s job (the oscilloscope), any HTML page,
 * CONTRACTS.md. Per §2: a visual "never inserts a node, never reconnects anything, and
 * never calls dispose()" on the analyser — this file also never mutates the analyser's
 * own properties (`fftSize`, `minDecibels`, `maxDecibels`, `smoothingTimeConstant`), it
 * only reads them and adapts. Those belong to the instrument that created the node.
 *
 * Reads on rAF only, never on the scheduler (§3: "visuals read from rAF, audio reads from
 * the scheduler. These are two different loops and they never cross.").
 */

// ---------------------------------------------------------------------------------------
// 0 · TOKENS — CONTRACTS §9, resolved from ui/tokens.css at mount
// ---------------------------------------------------------------------------------------
// A canvas needs real color strings, not `var(--x)`. Tokens are therefore resolved once
// per mount (and on resize) via getComputedStyle, so `ui/tokens.css` stays the single
// definition and this file stays a consumer. The fallbacks exist only so the module is
// usable in a page that forgot to link tokens.css; they are not a second palette and must
// be kept identical to tokens.css if that file changes.

const TOKEN_FALLBACK = {
  '--bg': '#0a0d13',
  '--panel': '#1b2332',
  '--line': '#3a485f',
  '--text': '#f2f6fc',
  '--text-dim': '#93a1b8',
  '--accent': '#34e5b4',
  '--warn': '#ff7a1a',
};

function readTokens(el) {
  const cs = getComputedStyle(el);
  const out = {};
  for (const key of Object.keys(TOKEN_FALLBACK)) {
    const v = cs.getPropertyValue(key).trim();
    out[key] = v || TOKEN_FALLBACK[key];
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// 1 · MODE BUDGETS — CONTRACTS §9: "Standalone views may animate. DAW views stay still."
// ---------------------------------------------------------------------------------------
// Same data, two budgets (seat question 6). "Still" is read as: nothing moves that is not
// the data itself — no peak-hold decay, no glow, no eased transitions — plus a throttled
// redraw so a DAW full of compact visuals does not spend the frame budget on decoration.
// Compact still updates; a frozen analyzer would be useless. This reading is logged in the
// receipt as an interpretation, not a contract change.

const MODES = {
  compact: {
    height: 96,
    fps: 20,          // throttled: the DAW view is still, and cheap
    peakHold: false,  // a decaying peak line is motion that is not the data
    overtoneMarks: false,
    dbAxis: false,
    ticks: [100, 1000, 10000],
    lineWidth: 1,
    fontScale: 0.85,
  },
  expanded: {
    height: 300,
    fps: 0,           // 0 = every rAF frame, uncapped: the standalone tool animates
    peakHold: true,
    overtoneMarks: true,
    dbAxis: true,
    ticks: [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 16000],
    lineWidth: 2,
    fontScale: 1,
  },
};

// The curriculum's stated range (PHASE.md → outline → Frequency Spectrum):
// "vibrations per second (Hz), the ~30 Hz-16 kHz human range".
const DEFAULT_MIN_HZ = 30;
const DEFAULT_MAX_HZ = 16000;

// A peak within this many dB of the loudest peak counts as "significant" when hunting the
// fundamental. The curriculum's definition is "fundamental = lowest and loudest"; for a
// harmonic tone the lowest significant peak is the fundamental, which is what this finds.
const FUNDAMENTAL_WINDOW_DB = 20;

// Below this byte value the bin is treated as the noise floor, not a partial.
const NOISE_FLOOR_BYTE = 12;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function formatHz(hz) {
  if (hz >= 10000) return `${(hz / 1000).toFixed(0)}k`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(hz)}`;
}

export default class Spectrum {
  static id = 'spectrum';
  static label = 'Spectrum Analyzer';

  /** The one tap this visual reads (§2's `getAnalyser(which)`). Never 'scope'. */
  static tap = 'spectrum';

  /**
   * @param {object} instrument  Any object implementing CONTRACTS §2's `getAnalyser(which)`.
   *   The instrument is the ONLY thing this visual is handed — never an AudioNode, never
   *   the AudioContext, never the instrument's internals. It calls `getAnalyser('spectrum')`
   *   exactly once, here, and reads that node for the rest of its life.
   * @param {object} [options]
   * @param {number} [options.minHz=30]   low edge of the axis
   * @param {number} [options.maxHz=16000] high edge of the axis
   * @param {number} [options.height]     override the mode's canvas height in CSS px
   *
   * @throws if the instrument does not offer the 'spectrum' tap. That is not a defensive
   *   nicety — it is how the P1 teaching inversion is kept from being "fixed" by accident.
   *   Overtone Synth returns `null` here by contract (§11.5) and therefore cannot be given
   *   a spectrum analyzer.
   */
  constructor(instrument, options = {}) {
    if (!instrument || typeof instrument.getAnalyser !== 'function') {
      throw new TypeError(
        'Spectrum: needs an object implementing CONTRACTS §2 getAnalyser(which). ' +
          'A visual is handed the instrument, never its nodes.'
      );
    }

    const analyser = instrument.getAnalyser(Spectrum.tap);
    if (!analyser) {
      const id = instrument.constructor?.id ?? instrument.id ?? 'this instrument';
      throw new Error(
        `Spectrum: ${id} returned null for getAnalyser('spectrum'), so it does not offer ` +
          'the spectrum tap and must not be given a spectrum analyzer. This is the P1 ' +
          'teaching inversion (PHASE.md): the spectrum analyzer belongs to Wave Synth ' +
          'ONLY. Overtone Synth\'s visual is the oscilloscope — use vis/scope.js.'
      );
    }

    this.instrument = instrument;
    this.analyser = analyser;

    this.minHz = options.minHz ?? DEFAULT_MIN_HZ;
    this.maxHz = options.maxHz ?? DEFAULT_MAX_HZ;
    this.heightOverride = options.height ?? null;

    // Allocated once and reused every frame — never per-frame garbage in a 60 Hz loop.
    this.bins = new Uint8Array(analyser.frequencyBinCount);

    this.el = null;
    this.wrap = null;
    this.canvas = null;
    this.g = null;
    this.tokens = { ...TOKEN_FALLBACK };
    this._mode = null;
    this._raf = 0;
    this._ro = null;
    this._io = null;
    this._visible = true;
    this._lastDrawAt = 0;
    this._cols = null;      // cached per-column bin ranges, rebuilt on resize/fftSize change
    this._colVals = null;
    this._hold = null;      // peak-hold, expanded only
    this._dpr = 1;
    this._w = 0;
    this._h = 0;

    this._fundamentalHz = null;
    this._partials = [];
    this._saturated = false;

    // Live cost accounting. §8 prices AnalyserNode at 2 units and says plainly that the
    // number is "a floor, not a measurement" because recon's offline render never called
    // the read function. §11.6 assigns this seat the job of measuring the real
    // read-every-frame cost and reporting it. These counters are how.
    this._frames = 0;
    this._reads = 0;
    this._readMs = 0;
    this._drawMs = 0;
  }

  // -------------------------------------------------------------------------------------
  // 2 · LIFECYCLE
  // -------------------------------------------------------------------------------------

  /** DAW view: small, still, legible. */
  mountCompact(el) {
    this._mount(el, 'compact');
  }

  /** Standalone view: larger, animated, built to hold a classroom's attention. */
  mountExpanded(el) {
    this._mount(el, 'expanded');
  }

  _mount(el, mode) {
    if (this._mode) this.unmount();
    if (!el) throw new TypeError('Spectrum.mount*: needs a container element');

    this.el = el;
    this._mode = mode;
    const cfg = MODES[mode];

    const wrap = document.createElement('div');
    wrap.className = `vis vis-spectrum vis-${mode}`;
    wrap.style.cssText =
      'position:relative;width:100%;box-sizing:border-box;' +
      `height:${this.heightOverride ?? cfg.height}px;`;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      'Spectrum analyzer: how much of each frequency is in the sound, ' +
        `${formatHz(this.minHz)} hertz to ${formatHz(this.maxHz)} hertz.`
    );

    wrap.appendChild(canvas);
    el.appendChild(wrap);

    this.wrap = wrap;
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });

    this.tokens = readTokens(wrap);
    this._resize();

    // Container resize → recompute the backing store and the column→bin map.
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(wrap);
    }

    // Seat question 7, second half: "a hidden visual must not burn frames." rAF already
    // stops for a hidden TAB; it does not stop for an element scrolled out of view or in a
    // collapsed panel — which is exactly the DAW case. This pauses the loop when the
    // canvas is not intersecting and resumes it when it is.
    if (typeof IntersectionObserver === 'function') {
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) this._visible = e.isIntersecting;
      });
      this._io.observe(wrap);
    }

    this._lastDrawAt = 0;
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /**
   * Stops the animation loop and removes everything this visual put in the DOM.
   * After this returns, `frameCount` never increases again until a re-mount — that is the
   * property the DONE-CHECK verifies by count, not by eye.
   */
  unmount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;

    if (this._ro) this._ro.disconnect();
    this._ro = null;
    if (this._io) this._io.disconnect();
    this._io = null;

    if (this.wrap && this.wrap.parentNode) this.wrap.parentNode.removeChild(this.wrap);
    this.wrap = null;
    this.canvas = null;
    this.g = null;
    this.el = null;
    this._mode = null;
    this._cols = null;
    this._colVals = null;
    this._hold = null;
  }

  /**
   * Unmount, then drop every reference. Per CONTRACTS §2 this **never** disconnects or
   * disposes the analyser: the instrument owns that node and the visual only ever read it.
   */
  dispose() {
    this.unmount();
    this.analyser = null;
    this.instrument = null;
    this.bins = null;
  }

  // -------------------------------------------------------------------------------------
  // 3 · STATE FOR CALLERS AND FOR THE GOVERNOR
  // -------------------------------------------------------------------------------------

  get mounted() {
    return this._mode !== null;
  }

  get mode() {
    return this._mode;
  }

  /** Frames actually drawn. The DONE-CHECK's unmount proof reads this. */
  get frameCount() {
    return this._frames;
  }

  /** Last detected fundamental in Hz, or null when there is no signal. */
  get fundamentalHz() {
    return this._fundamentalHz;
  }

  /** The partials found above the fundamental: [{k, hz, value}]. The harmonic series the
   *  curriculum names — fundamental ×1, ×2, ×3, ×4 — as the display actually found it. */
  get partials() {
    return this._partials;
  }

  /** True when the instrument's analyser range is clipping the signal (see _analyse). */
  get saturated() {
    return this._saturated;
  }

  /**
   * Live cost figures for the Troubleshooter — §8's `AnalyserNode = 2` is explicitly a
   * floor because the FFT never ran in recon's offline render. `avgReadMs` is the real
   * per-frame cost of `getByteFrequencyData()` on this machine.
   */
  get stats() {
    return {
      frames: this._frames,
      reads: this._reads,
      readMsTotal: this._readMs,
      avgReadMs: this._reads ? this._readMs / this._reads : 0,
      drawMsTotal: this._drawMs,
      avgDrawMs: this._frames ? this._drawMs / this._frames : 0,
      fftSize: this.analyser ? this.analyser.fftSize : 0,
      mode: this._mode,
    };
  }

  // -------------------------------------------------------------------------------------
  // 4 · GEOMETRY
  // -------------------------------------------------------------------------------------

  _resize() {
    if (!this.canvas || !this.wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this._dpr = dpr;
    this._w = w;
    this._h = h;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.tokens = readTokens(this.wrap);
    this._buildColumnMap();
    this._hold = null;
  }

  _plot() {
    const cfg = MODES[this._mode];
    const font = Math.round(clamp(this._h / 18, 10, 15) * cfg.fontScale);
    const padL = this._mode === 'expanded' ? Math.round(font * 2.6) : 4;
    const padR = 6;
    const padT = this._mode === 'expanded' ? Math.round(font * 1.9) : 4;
    const padB = Math.round(font * 1.7);
    return {
      font,
      x0: padL,
      y0: padT,
      w: Math.max(1, this._w - padL - padR),
      h: Math.max(1, this._h - padT - padB),
    };
  }

  _xOf(hz, p) {
    const lo = Math.log(this.minHz);
    const hi = Math.log(this.maxHz);
    return p.x0 + ((Math.log(clamp(hz, this.minHz, this.maxHz)) - lo) / (hi - lo)) * p.w;
  }

  _hzOfX(x, p) {
    const lo = Math.log(this.minHz);
    const hi = Math.log(this.maxHz);
    return Math.exp(lo + ((x - p.x0) / p.w) * (hi - lo));
  }

  /**
   * Log-frequency axes and linear FFT bins do not line up: at the low end many pixels
   * share one bin, at the high end one pixel covers dozens. Precomputing each column's bin
   * range once per resize turns the per-frame work into a flat scan, and taking the MAX
   * over each column's bins (not the mean) is what keeps a real partial from being
   * averaged into invisibility up top.
   */
  _buildColumnMap() {
    if (!this.analyser || !this._mode) return;
    const p = this._plot();
    const cols = Math.max(1, Math.round(p.w));
    const binHz = this.analyser.context.sampleRate / this.analyser.fftSize;
    const nBins = this.analyser.frequencyBinCount;

    const lo = new Int32Array(cols);
    const hi = new Int32Array(cols);
    for (let c = 0; c < cols; c++) {
      const f0 = this._hzOfX(p.x0 + c, p);
      const f1 = this._hzOfX(p.x0 + c + 1, p);
      let b0 = Math.ceil(f0 / binHz);
      let b1 = Math.floor(f1 / binHz);
      if (b1 < b0) {
        // Fewer than one bin in this column (the low end) — use the nearest bin.
        b0 = b1 = clamp(Math.round(((f0 + f1) / 2) / binHz), 0, nBins - 1);
      }
      lo[c] = clamp(b0, 0, nBins - 1);
      hi[c] = clamp(b1, 0, nBins - 1);
    }
    this._cols = { lo, hi, count: cols, binHz };
    this._colVals = new Float32Array(cols);
    if (this.bins.length !== nBins) this.bins = new Uint8Array(nBins);
  }

  // -------------------------------------------------------------------------------------
  // 5 · THE LOOP
  // -------------------------------------------------------------------------------------

  _loop(now) {
    // Re-arm FIRST so an exception in draw cannot silently kill the loop, but never
    // re-arm if unmount() already ran — that is what makes unmount cost exactly zero.
    if (!this._mode) return;
    this._raf = requestAnimationFrame(this._loop);

    // Not on screen (collapsed panel, scrolled away): skip the analyser read and the
    // draw entirely. The rAF tick itself is the browser's, not ours.
    if (!this._visible) return;

    const cfg = MODES[this._mode];
    if (cfg.fps > 0) {
      const interval = 1000 / cfg.fps;
      if (now - this._lastDrawAt < interval) return;
      this._lastDrawAt = now;
    }

    const t0 = performance.now();
    this.analyser.getByteFrequencyData(this.bins);
    const t1 = performance.now();
    this._readMs += t1 - t0;
    this._reads++;

    this._draw();

    this._drawMs += performance.now() - t1;
    this._frames++;
  }

  // -------------------------------------------------------------------------------------
  // 6 · ANALYSIS — reading frequencies, not decoration (seat question 3)
  // -------------------------------------------------------------------------------------

  /** Byte 0..255 maps linearly across the analyser's own declared dB window. */
  _byteToDb(b) {
    const lo = this.analyser.minDecibels;
    const hi = this.analyser.maxDecibels;
    return lo + (b / 255) * (hi - lo);
  }

  _dbPerByte() {
    return (this.analyser.maxDecibels - this.analyser.minDecibels) / 255;
  }

  /**
   * Finds the fundamental and, above it, the partials of the harmonic series.
   *
   * The curriculum defines the fundamental as "lowest and loudest" and the overtones as
   * "fundamental x1, x2, x3, x4 — each one a partial". So: collect every local maximum
   * that stands within FUNDAMENTAL_WINDOW_DB of the loudest one, and take the LOWEST of
   * those. For a sine there is exactly one and it is the answer; for a saw or a square the
   * lowest is also the loudest and it is still the answer. Then walk k = 2..8 looking for a
   * peak near k x f0 so the display can label the harmonic series the curriculum names.
   */
  _analyse() {
    const bins = this.bins;
    const binHz = this.analyser.context.sampleRate / this.analyser.fftSize;
    const first = Math.max(1, Math.floor(this.minHz / binHz));
    const last = Math.min(bins.length - 2, Math.ceil(this.maxHz / binHz));

    let peakBin = -1;
    let peakVal = 0;
    let pinned = 0;
    for (let i = first; i <= last; i++) {
      if (bins[i] > peakVal) {
        peakVal = bins[i];
        peakBin = i;
      }
      if (bins[i] >= 255) pinned++;
    }

    // Byte 255 means "at or above the analyser's `maxDecibels`" — the value is clipped and
    // whatever was above it is gone before this file ever sees it.
    //
    // MEASURED, in this browser, 2048-point FFT (see receipt-scopes.md): Blink normalises
    // the FFT by fftSize, so a single unity-gain saw voice peaks at only about −19.6 dBFS
    // per bin, not near 0. Web Audio's DEFAULT maxDecibels of −30 therefore survives ONE
    // voice with just its very top flattened — but a six-note chord peaks near −14.6 dBFS
    // and pins 36 of 1024 bins, and the loudest partials merge into a flat ceiling exactly
    // when a student is looking at the loudest thing on screen. Fixing it means changing a
    // property on the instrument's own node, which a visual may not do (§2). So: detect it
    // and say so on screen instead of drawing a silent lie.
    this._saturated = pinned > Math.max(2, (last - first) * 0.02);

    if (peakBin < 0 || peakVal < NOISE_FLOOR_BYTE) {
      this._fundamentalHz = null;
      this._partials = [];
      this._saturated = false;
      return;
    }

    const windowBytes = FUNDAMENTAL_WINDOW_DB / this._dbPerByte();
    const threshold = Math.max(NOISE_FLOOR_BYTE, peakVal - windowBytes);

    let f0Bin = peakBin;
    for (let i = first; i <= last; i++) {
      if (bins[i] < threshold) continue;
      if (bins[i] >= bins[i - 1] && bins[i] >= bins[i + 1]) {
        f0Bin = i;
        break; // the lowest significant peak
      }
    }

    const f0 = this._interpolatedHz(f0Bin, binHz);
    this._fundamentalHz = f0;

    // The harmonic series above it. Tolerance widens with frequency because the FFT's bin
    // width is fixed while the spacing between partials is not.
    const partials = [];
    for (let k = 2; k <= 8; k++) {
      const target = f0 * k;
      if (target > this.maxHz) break;
      const tolHz = Math.max(binHz * 1.5, target * 0.03);
      const b0 = Math.max(first, Math.floor((target - tolHz) / binHz));
      const b1 = Math.min(last, Math.ceil((target + tolHz) / binHz));
      let bestVal = 0;
      let bestBin = -1;
      for (let i = b0; i <= b1; i++) {
        if (bins[i] > bestVal) {
          bestVal = bins[i];
          bestBin = i;
        }
      }
      if (bestBin > 0 && bestVal >= NOISE_FLOOR_BYTE && bestVal >= peakVal * 0.12) {
        partials.push({ k, hz: this._interpolatedHz(bestBin, binHz), value: bestVal });
      }
    }
    this._partials = partials;
  }

  /** Parabolic interpolation across the peak, so the readout is not quantised to a bin. */
  _interpolatedHz(bin, binHz) {
    const y0 = this.bins[bin - 1] ?? 0;
    const y1 = this.bins[bin];
    const y2 = this.bins[bin + 1] ?? 0;
    const denom = y0 - 2 * y1 + y2;
    const delta = denom !== 0 ? clamp((0.5 * (y0 - y2)) / denom, -0.5, 0.5) : 0;
    return (bin + delta) * binHz;
  }

  // -------------------------------------------------------------------------------------
  // 7 · DRAW
  // -------------------------------------------------------------------------------------

  _draw() {
    const g = this.g;
    const t = this.tokens;
    const cfg = MODES[this._mode];
    const p = this._plot();
    if (!this._cols || this._cols.count !== Math.max(1, Math.round(p.w))) {
      this._buildColumnMap();
    }

    g.fillStyle = t['--panel'];
    g.fillRect(0, 0, this._w, this._h);

    this._analyse();
    this._drawGrid(g, t, cfg, p);

    // Column maxima: the log axis compressed onto real pixels.
    const { lo, hi, count } = this._cols;
    const vals = this._colVals;
    for (let c = 0; c < count; c++) {
      let m = 0;
      for (let b = lo[c]; b <= hi[c]; b++) if (this.bins[b] > m) m = this.bins[b];
      vals[c] = m;
    }

    const yOf = (v) => p.y0 + p.h - (v / 255) * p.h;

    // Filled body first, then the crisp top edge over it.
    g.beginPath();
    g.moveTo(p.x0, p.y0 + p.h);
    for (let c = 0; c < count; c++) g.lineTo(p.x0 + c, yOf(vals[c]));
    g.lineTo(p.x0 + count - 1, p.y0 + p.h);
    g.closePath();
    g.fillStyle = this._fade(t['--accent'], 0.22);
    g.fill();

    g.beginPath();
    for (let c = 0; c < count; c++) {
      const y = yOf(vals[c]);
      if (c === 0) g.moveTo(p.x0 + c, y);
      else g.lineTo(p.x0 + c, y);
    }
    g.strokeStyle = t['--accent'];
    g.lineWidth = cfg.lineWidth;
    g.lineJoin = 'round';
    g.stroke();

    if (cfg.peakHold) this._drawPeakHold(g, t, p, vals, count, yOf);
    this._drawMarkers(g, t, cfg, p, yOf);
  }

  _drawPeakHold(g, t, p, vals, count, yOf) {
    if (!this._hold || this._hold.length !== count) this._hold = new Float32Array(count);
    const hold = this._hold;
    const decay = 1.6; // byte units per frame ~ 96/s at 60fps
    g.beginPath();
    for (let c = 0; c < count; c++) {
      hold[c] = vals[c] >= hold[c] ? vals[c] : Math.max(vals[c], hold[c] - decay);
      const y = yOf(hold[c]);
      if (c === 0) g.moveTo(p.x0 + c, y);
      else g.lineTo(p.x0 + c, y);
    }
    g.strokeStyle = this._fade(t['--text-dim'], 0.55);
    g.lineWidth = 1;
    g.stroke();
  }

  _drawGrid(g, t, cfg, p) {
    g.lineWidth = 1;
    g.strokeStyle = t['--line'];
    g.fillStyle = t['--text-dim'];
    g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.textBaseline = 'top';

    // Gridlines always draw. Their LABELS get dropped when they would collide, because a
    // label sitting on top of another label is worse than no label at ten feet — which is
    // the test this whole file is built against (§9).
    //
    // The unit rides on the highest tick ("16k Hz") rather than floating separately, and
    // that label is placed FIRST so it can never be the one that loses a collision. An
    // axis of bare numbers is decoration; the unit is the lesson.
    const ticks = cfg.ticks.filter((hz) => hz >= this.minHz && hz <= this.maxHz);
    for (const hz of ticks) {
      const x = Math.round(this._xOf(hz, p)) + 0.5;
      g.beginPath();
      g.moveTo(x, p.y0);
      g.lineTo(x, p.y0 + p.h);
      g.stroke();
    }

    const lastIdx = ticks.length - 1;
    const order = [lastIdx, 0, ...ticks.map((_, i) => i)]; // unit first, then low edge
    const placed = [];
    for (const i of order) {
      if (i < 0 || placed.some((b) => b.i === i)) continue;
      const hz = ticks[i];
      const text = i === lastIdx ? `${formatHz(hz)} Hz` : formatHz(hz);
      const tw = g.measureText(text).width;
      const align = i === lastIdx ? 'right' : i === 0 ? 'left' : 'center';
      const cx = clamp(Math.round(this._xOf(hz, p)), p.x0, p.x0 + p.w);
      const left = align === 'left' ? cx : align === 'right' ? cx - tw : cx - tw / 2;
      const right = left + tw;
      if (placed.some((b) => left < b.right + 5 && right > b.left - 5)) continue;
      placed.push({ i, left, right });
      g.textAlign = align;
      g.fillText(text, cx, p.y0 + p.h + 3);
    }

    if (cfg.dbAxis) {
      const hiDb = this.analyser.maxDecibels;
      const loDb = this.analyser.minDecibels;
      const step = (hiDb - loDb) / 4;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      for (let i = 0; i <= 4; i++) {
        const db = loDb + step * i;
        const y = Math.round(p.y0 + p.h - (i / 4) * p.h) + 0.5;
        g.beginPath();
        g.moveTo(p.x0, y);
        g.lineTo(p.x0 + p.w, y);
        g.strokeStyle = this._fade(t['--line'], 0.55);
        g.stroke();
        if (i > 0) g.fillText(`${Math.round(db)}`, p.x0 - 5, y);
      }
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText('dB', 2, p.y0 - p.font * 1.6);
      g.textAlign = 'right';
      g.fillText('human hearing ≈ 30 Hz – 16 kHz', p.x0 + p.w, p.y0 - p.font * 1.6);
      g.textBaseline = 'top';
    }
  }

  _drawMarkers(g, t, cfg, p, yOf) {
    g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    if (this._fundamentalHz === null) {
      g.fillStyle = t['--text-dim'];
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText('no signal', p.x0 + 6, p.y0 + 4);
      return;
    }

    // Overtones first, so the fundamental's marker draws on top of them.
    if (cfg.overtoneMarks) {
      g.strokeStyle = this._fade(t['--text-dim'], 0.7);
      g.fillStyle = t['--text-dim'];
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.lineWidth = 1;
      // Leader lines for every partial found; labels only where one fits. Above ×5 or so
      // the harmonics crowd together on a log axis, and "×6×7×8" printed on top of itself
      // is noise. Lower partials win, because they are the ones a student is counting.
      const taken = [];
      for (const partial of this._partials) {
        const x = Math.round(this._xOf(partial.hz, p)) + 0.5;
        const y = yOf(partial.value);
        g.beginPath();
        g.moveTo(x, y - 4);
        g.lineTo(x, p.y0 + 2);
        g.stroke();

        const text = `×${partial.k}`;
        const tw = g.measureText(text).width;
        const left = x - tw / 2;
        const right = left + tw;
        if (taken.some((b) => left < b.right + 4 && right > b.left - 4)) continue;
        taken.push({ left, right });
        g.fillText(text, x, p.y0 + 2);
      }
    }

    const fx = Math.round(this._xOf(this._fundamentalHz, p)) + 0.5;
    g.strokeStyle = t['--text'];
    g.lineWidth = cfg.lineWidth;
    g.beginPath();
    g.moveTo(fx, p.y0);
    g.lineTo(fx, p.y0 + p.h);
    g.stroke();

    const hz = this._fundamentalHz;
    const label =
      this._mode === 'expanded'
        ? `FUNDAMENTAL ${hz < 1000 ? hz.toFixed(1) : formatHz(hz)} Hz`
        : `${hz < 1000 ? Math.round(hz) : formatHz(hz)} Hz`;

    g.font = `${this._mode === 'expanded' ? 'bold ' : ''}${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const wLabel = g.measureText(label).width;
    const flip = fx + wLabel + 12 > p.x0 + p.w;
    const lx = flip ? fx - wLabel - 8 : fx + 6;

    // Sit below the ×2/×3 overtone row rather than on top of it.
    const ly = p.y0 + (cfg.overtoneMarks ? p.font + 7 : 2);
    g.fillStyle = this._fade(t['--bg'], 0.82);
    g.fillRect(lx - 3, ly, wLabel + 6, p.font + 5);
    g.fillStyle = t['--text'];
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText(label, lx, ly + 2);

    if (this._saturated) {
      g.fillStyle = t['--warn'];
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText(
        'signal above analyser maxDecibels — raise it on the instrument',
        p.x0 + p.w / 2,
        p.y0 + p.h - 3
      );
    }
  }

  /**
   * Alpha-blends a token color without needing it to be in any particular notation:
   * the 2D context parses whatever CSS color the token holds, and globalAlpha does the
   * rest. Keeps tokens.css free to use hex, rgb(), or color() as Brandon prefers.
   */
  _fade(color, alpha) {
    const g = this.g;
    const prev = g.globalAlpha;
    // Cheap path: cache one offscreen parse per (color, alpha) pair.
    this._fadeCache ??= new Map();
    const key = `${color}|${alpha}`;
    let out = this._fadeCache.get(key);
    if (out) return out;
    const probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = color;
    const parsed = probe.fillStyle; // normalised to #rrggbb or rgba(...)
    if (parsed.startsWith('#') && parsed.length === 7) {
      const r = parseInt(parsed.slice(1, 3), 16);
      const gg = parseInt(parsed.slice(3, 5), 16);
      const b = parseInt(parsed.slice(5, 7), 16);
      out = `rgba(${r},${gg},${b},${alpha})`;
    } else {
      out = parsed;
    }
    g.globalAlpha = prev;
    this._fadeCache.set(key, out);
    return out;
  }
}
