/**
 * vis/scope.js — the oscilloscope. **Overtone Synth's visual, and only Overtone Synth's.**
 * Built by `scopes`, P1/S3.
 *
 * THE INVERSION (PHASE.md, and the whole point of P1):
 *   Overtone Synth lets you stack FREQUENCIES and shows you the SHAPE they add up to.
 *   Wave Synth lets you pick a SHAPE and shows you the frequencies inside it.
 *   Each synth shows the view it is not letting you touch. Do not "fix" this by giving
 *   either synth both. This file enforces its half mechanically: it binds to
 *   `getAnalyser('scope')` and nothing else, and an instrument that returns `null` for that
 *   tap (Wave Synth does, per CONTRACTS §11.4) cannot be wired to this visual.
 *
 * WHAT THE CURRICULUM ASKS FOR, exactly: "what gain of a sound wave looks like over the
 * course of ONE REPETITION." That is the hard requirement in this file and it is why more
 * than half of it is period detection and triggering. A free-running trace that slides
 * across the screen is not an oscilloscope, it is a screensaver — the shape has to hold
 * still long enough for a student to look at it and say "that is a saw."
 *
 * Owns: CONTRACTS §1's `vis/scope.js` layout entry. Reads §2's `getAnalyser(which)`
 * amendment and §11.6's placement of that node. Draws with §9's tokens only.
 *
 * Does NOT own and never touches: any instrument's nodes, `vis/meter.js` or
 * `vis/gain-reduction.js` (P4's), `vis/spectrum.js`'s job, any HTML page, CONTRACTS.md.
 * Per §2 a visual "never inserts a node, never reconnects anything, and never calls
 * dispose()" — this file also never mutates the analyser's own properties. Reads on rAF
 * only, never on the scheduler (§3).
 */

// ---------------------------------------------------------------------------------------
// 0 · TOKENS — CONTRACTS §9, resolved from ui/tokens.css at mount
// ---------------------------------------------------------------------------------------
// Fallbacks exist only for a page that forgot to link tokens.css. They are not a second
// palette; keep them identical to tokens.css.

const TOKEN_FALLBACK = {
  '--bg': '#0a0d13',
  '--panel': '#1b2332',
  '--line': '#3a485f',
  '--text': '#f2f6fc',
  '--text-dim': '#93a1b8',
  '--accent': '#34e5b4',
  '--warn': '#ff7a1a',
  // _fade() alphas — CONTRACTS §16.10's P4 fade dials, read by value match against the
  // literals this file already drew with, so the substitution changes no pixel.
  '--fade-half': '0.5',
  '--fade-near': '0.9',
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
// the data itself — no phosphor persistence, no glow — plus a throttled redraw so a DAW
// full of compact visuals does not spend the frame budget on decoration.

const MODES = {
  compact: {
    height: 96,
    fps: 20,
    persistence: 0,     // no CRT after-image: that is motion which is not the data
    bracket: false,
    axisLabels: false,
    lineWidth: 1.5,
    fontScale: 0.85,
  },
  expanded: {
    height: 300,
    fps: 0,             // 0 = every rAF frame, uncapped
    persistence: 3,     // faint after-images: real scope behaviour, and it makes trigger
                        // stability *visible* — a locked trace has invisible ghosts
    bracket: true,
    axisLabels: true,
    lineWidth: 2.5,
    fontScale: 1,
  },
};

// Period-search bounds. The low edge matches the curriculum's ~30 Hz human floor; the high
// edge is a little above C8, past anything a student will play on the 12-note keyboard.
const MIN_F0_HZ = 30;
const MAX_F0_HZ = 4200;

// Below this peak amplitude there is nothing to trigger on and the scope says so rather
// than drawing noise as if it were a waveform.
const SILENCE_PEAK = 0.004;

// Normalised autocorrelation below this is not a periodic signal — do not claim a period.
const LOCK_CONFIDENCE = 0.3;

// Re-estimate the period every N frames once locked. The trigger re-locks every frame
// regardless; only the (more expensive) period search is throttled. A note change is
// caught immediately by the RMS-jump test, so this costs no responsiveness in practice.
const PERIOD_INTERVAL = 4;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export default class Scope {
  static id = 'scope';
  static label = 'Oscilloscope';

  /** The one tap this visual reads (§2's `getAnalyser(which)`). Never 'spectrum'. */
  static tap = 'scope';

  /**
   * @param {object} instrument  Any object implementing CONTRACTS §2's `getAnalyser(which)`.
   *   The instrument is the ONLY thing this visual is handed.
   * @param {object} [options]
   * @param {number} [options.cycles=1]  repetitions across the screen. The curriculum says
   *   ONE; this exists so a later phase can widen it deliberately, not by drift.
   * @param {boolean} [options.autoGain=true]  boost a quiet trace so the SHAPE stays
   *   legible, and say so on screen with a "×N" so the boost is never a lie.
   * @param {number} [options.height]  override the mode's canvas height in CSS px
   *
   * @throws if the instrument does not offer the 'scope' tap. Wave Synth returns `null`
   *   here by contract (§11.4) and therefore cannot be given an oscilloscope.
   */
  constructor(instrument, options = {}) {
    if (!instrument || typeof instrument.getAnalyser !== 'function') {
      throw new TypeError(
        'Scope: needs an object implementing CONTRACTS §2 getAnalyser(which). ' +
          'A visual is handed the instrument, never its nodes.'
      );
    }

    const analyser = instrument.getAnalyser(Scope.tap);
    if (!analyser) {
      const id = instrument.constructor?.id ?? instrument.id ?? 'this instrument';
      throw new Error(
        `Scope: ${id} returned null for getAnalyser('scope'), so it does not offer the ` +
          'scope tap and must not be given an oscilloscope. This is the P1 teaching ' +
          'inversion (PHASE.md): the oscilloscope belongs to Overtone Synth ONLY. Wave ' +
          "Synth's visual is the spectrum analyzer — use vis/spectrum.js."
      );
    }

    this.instrument = instrument;
    this.analyser = analyser;

    this.cycles = Math.max(1, options.cycles ?? 1);
    this.autoGain = options.autoGain !== false;
    this.heightOverride = options.height ?? null;

    const n = analyser.fftSize;
    this.raw = new Uint8Array(n);      // allocated once; no per-frame garbage
    this.samples = new Float32Array(n);
    this._dec = new Float32Array(Math.ceil(n / 2) + 2);
    this._corr = new Float32Array(Math.ceil(n / 2) + 2);

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
    this._dpr = 1;
    this._w = 0;
    this._h = 0;

    this._period = null;        // in samples, fractional, smoothed
    this._confidence = 0;
    this._lastRms = 0;
    this._sinceEstimate = PERIOD_INTERVAL; // force an estimate on the first frame
    this._peak = 0;
    this._gain = 1;
    this._clamped = false;

    this._trace = null;         // last drawn trace, y in -1..1 — read by tests
    this._ghosts = [];

    // Live cost accounting for the Troubleshooter — §8's `AnalyserNode = 2` is a floor,
    // not a measurement; §11.6 assigns this seat the real figure.
    this._frames = 0;
    this._reads = 0;
    this._readMs = 0;
    this._drawMs = 0;
    this._periodMs = 0;
    this._periodRuns = 0;
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
    if (!el) throw new TypeError('Scope.mount*: needs a container element');

    this.el = el;
    this._mode = mode;
    const cfg = MODES[mode];

    const wrap = document.createElement('div');
    wrap.className = `vis vis-scope vis-${mode}`;
    wrap.style.cssText =
      'position:var(--pos-relative);width:var(--pct-100);box-sizing:var(--box-border-box);' +
      `height:${this.heightOverride ?? cfg.height}px;`;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:var(--disp-block);width:var(--pct-100);height:var(--pct-100);';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      'Oscilloscope: the shape of one repetition of the sound wave.'
    );

    wrap.appendChild(canvas);
    el.appendChild(wrap);

    this.wrap = wrap;
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });

    this.tokens = readTokens(wrap);
    this._resize();

    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(wrap);
    }

    // Seat question 7: "a hidden visual must not burn frames." rAF stops for a hidden TAB
    // but not for a collapsed panel or an off-screen element — which is the DAW case.
    if (typeof IntersectionObserver === 'function') {
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) this._visible = e.isIntersecting;
      });
      this._io.observe(wrap);
    }

    this._lastDrawAt = 0;
    this._ghosts = [];
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  /**
   * Stops the animation loop and removes everything this visual put in the DOM. After this
   * returns, `frameCount` never increases again until a re-mount.
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
    this._ghosts = [];
  }

  /** Unmount, then drop references. Never disconnects or disposes the analyser (§2). */
  dispose() {
    this.unmount();
    this.analyser = null;
    this.instrument = null;
    this.raw = null;
    this.samples = null;
    this._dec = null;
    this._corr = null;
    this._trace = null;
  }

  // -------------------------------------------------------------------------------------
  // 3 · STATE FOR CALLERS AND FOR TESTS
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

  /** Detected fundamental of the trace, in Hz, or null when unlocked/silent. */
  get frequencyHz() {
    if (!this._period || !this.analyser) return null;
    return this.analyser.context.sampleRate / this._period;
  }

  /** Length of the one repetition on screen, in ms, or null. */
  get periodMs() {
    if (!this._period || !this.analyser) return null;
    return (this._period / this.analyser.context.sampleRate) * 1000;
  }

  /** True when the trace is period-locked rather than free-running. */
  get locked() {
    return this._period !== null && this._confidence >= LOCK_CONFIDENCE;
  }

  /**
   * The last drawn trace, one y per pixel column, in -1..1 before display gain.
   * Exposed so trigger stability can be verified by MEASUREMENT — compare this array
   * across consecutive frames — rather than by looking at it.
   */
  get lastTrace() {
    return this._trace;
  }

  get stats() {
    return {
      frames: this._frames,
      reads: this._reads,
      readMsTotal: this._readMs,
      avgReadMs: this._reads ? this._readMs / this._reads : 0,
      drawMsTotal: this._drawMs,
      avgDrawMs: this._frames ? this._drawMs / this._frames : 0,
      periodMsTotal: this._periodMs,
      avgPeriodMs: this._periodRuns ? this._periodMs / this._periodRuns : 0,
      periodRuns: this._periodRuns,
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
    this._ghosts = [];
  }

  _plot() {
    const cfg = MODES[this._mode];
    const font = Math.round(clamp(this._h / 18, 10, 15) * cfg.fontScale);
    const padL = this._mode === 'expanded' ? Math.round(font * 2.4) : 4;
    const padR = 6;
    const padT = this._mode === 'expanded' ? Math.round(font * 2.6) : 4;
    const padB = this._mode === 'expanded' ? Math.round(font * 1.6) : 4;
    return {
      font,
      x0: padL,
      y0: padT,
      w: Math.max(1, this._w - padL - padR),
      h: Math.max(1, this._h - padT - padB),
    };
  }

  // -------------------------------------------------------------------------------------
  // 5 · THE LOOP
  // -------------------------------------------------------------------------------------

  _loop(now) {
    if (!this._mode) return;
    this._raf = requestAnimationFrame(this._loop);
    if (!this._visible) return;

    const cfg = MODES[this._mode];
    if (cfg.fps > 0) {
      const interval = 1000 / cfg.fps;
      if (now - this._lastDrawAt < interval) return;
      this._lastDrawAt = now;
    }

    const t0 = performance.now();
    this.analyser.getByteTimeDomainData(this.raw);
    const t1 = performance.now();
    this._readMs += t1 - t0;
    this._reads++;

    this._prepare();
    this._draw();

    this._drawMs += performance.now() - t1;
    this._frames++;
  }

  // -------------------------------------------------------------------------------------
  // 6 · TRIGGER AND PERIOD — the half of this file that earns the word "oscilloscope"
  // -------------------------------------------------------------------------------------

  /**
   * Byte 128 is zero. Convert to -1..1, strip DC (a scope is AC-coupled; it also makes the
   * zero-crossing trigger honest), and take the peak and RMS in the same pass.
   */
  _prepare() {
    const raw = this.raw;
    const s = this.samples;
    const n = raw.length;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = (raw[i] - 128) / 128;
      s[i] = v;
      sum += v;
    }
    const mean = sum / n;

    let peak = 0;
    let sq = 0;
    for (let i = 0; i < n; i++) {
      const v = s[i] - mean;
      s[i] = v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      sq += v * v;
    }
    this._peak = peak;
    const rms = Math.sqrt(sq / n);

    if (peak < SILENCE_PEAK) {
      this._period = null;
      this._confidence = 0;
      this._lastRms = rms;
      this._gain = 1;
      return;
    }

    // A big level jump means a new note — re-lock now rather than at the next interval.
    const jumped =
      this._lastRms > 0 ? Math.abs(rms - this._lastRms) / this._lastRms > 0.4 : true;
    this._sinceEstimate++;
    if (jumped || this._period === null || this._sinceEstimate >= PERIOD_INTERVAL) {
      const pt0 = performance.now();
      const found = this._estimatePeriod(s, n);
      this._periodMs += performance.now() - pt0;
      this._periodRuns++;
      this._sinceEstimate = 0;

      if (found) {
        this._confidence = found.confidence;
        if (this._period === null || Math.abs(found.period - this._period) / this._period > 0.15) {
          this._period = found.period; // new note: snap, do not glide
        } else {
          this._period = this._period * 0.6 + found.period * 0.4; // same note: settle
        }
      } else {
        this._confidence = 0;
        this._period = null;
      }
    }
    this._lastRms = rms;

    // Display gain: only ever a boost, never a cut, and it is always labelled on screen.
    this._gain = this.autoGain && peak > 0 && peak < 0.25 ? Math.min(0.8 / peak, 24) : 1;
  }

  /**
   * Normalised autocorrelation, decimated for speed then refined at full rate.
   *
   * Cost matters here: this runs inside a rAF frame on a Chromebook. A naive full-rate
   * search over a 2048-sample buffer is ~1M multiply-adds per frame. Decimating to ~512
   * samples first cuts that by ~16x, and the full-rate refinement pass afterwards only
   * touches a ±1 decimated-lag neighbourhood, so high notes keep their precision.
   *
   * Dividing every lag by the zero-lag energy (rather than by the overlapping energy)
   * leaves the usual triangular taper in place on purpose: it biases the search toward the
   * SHORTEST period that explains the signal, which is what stops the classic
   * octave-down error where a scope locks onto two repetitions and draws them both.
   *
   * @returns {{period:number, confidence:number}|null} period in full-rate samples
   */
  _estimatePeriod(s, n) {
    const rate = this.analyser.context.sampleRate;
    const D = Math.max(1, Math.floor(n / 512));
    const m = Math.floor(n / D);
    const d = this._dec;

    for (let i = 0; i < m; i++) {
      let acc = 0;
      const base = i * D;
      for (let j = 0; j < D; j++) acc += s[base + j];
      d[i] = acc / D;
    }

    let r0 = 0;
    for (let i = 0; i < m; i++) r0 += d[i] * d[i];
    if (r0 <= 1e-9) return null;

    const decRate = rate / D;
    const minLag = Math.max(2, Math.floor(decRate / MAX_F0_HZ));
    const maxLag = Math.min(m - 2, Math.ceil(decRate / MIN_F0_HZ));
    if (maxLag <= minLag + 1) return null;

    const corr = this._corr;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let acc = 0;
      const lim = m - lag;
      for (let i = 0; i < lim; i++) acc += d[i] * d[i + lag];
      corr[lag] = acc / r0;
    }

    // Walk past the main lobe's descent before hunting the peak, or the answer is always
    // "lag = minLag".
    let lag = minLag;
    while (lag < maxLag && corr[lag + 1] < corr[lag]) lag++;

    let bestLag = -1;
    let best = -Infinity;
    for (let L = lag; L <= maxLag; L++) {
      if (corr[L] > best) {
        best = corr[L];
        bestLag = L;
      }
    }
    if (bestLag < 0 || best < LOCK_CONFIDENCE) return null;

    // Sub-lag peak position.
    const y0 = corr[bestLag - 1] ?? best;
    const y1 = best;
    const y2 = corr[bestLag + 1] ?? best;
    const denom = y0 - 2 * y1 + y2;
    const delta = denom !== 0 ? clamp((0.5 * (y0 - y2)) / denom, -0.5, 0.5) : 0;
    let period = (bestLag + delta) * D;

    // Full-rate refinement in the ±1 decimated-lag neighbourhood.
    if (D > 1) {
      const lo = Math.max(2, Math.floor(period) - D);
      const hi = Math.min(n - 2, Math.ceil(period) + D);
      let rBest = -Infinity;
      let rLag = -1;
      for (let L = lo; L <= hi; L++) {
        let acc = 0;
        const lim = n - L;
        for (let i = 0; i < lim; i++) acc += s[i] * s[i + L];
        if (acc > rBest) {
          rBest = acc;
          rLag = L;
        }
      }
      if (rLag > 0) period = rLag;
    }

    return { period, confidence: best };
  }

  /**
   * First rising zero crossing, with hysteresis and sub-sample interpolation.
   *
   * Hysteresis (the signal must dip below -h before a crossing counts) keeps noise and
   * wobble near zero from producing a different trigger point every frame. Sub-sample
   * interpolation removes the last source of shimmer: without it the window start jitters
   * by up to one sample per frame, which at a high note is a visible fraction of a cycle.
   * Those two things together are what make the trace hold still.
   *
   * @returns {number|null} fractional sample index of the crossing
   */
  _findTrigger(s, n, peak) {
    const hyst = Math.max(0.01, peak * 0.1);
    let armed = false;
    const limit = n - 2;
    for (let i = 1; i < limit; i++) {
      const v = s[i];
      if (v < -hyst) {
        armed = true;
      } else if (armed && s[i - 1] < 0 && v >= 0) {
        const denom = v - s[i - 1];
        const frac = denom !== 0 ? -s[i - 1] / denom : 0;
        return i - 1 + frac;
      }
    }
    return null;
  }

  /** Linear interpolation between samples, so the trace is drawn at pixel resolution. */
  _sampleAt(s, n, pos) {
    if (pos <= 0) return s[0];
    if (pos >= n - 1) return s[n - 1];
    const i = Math.floor(pos);
    const f = pos - i;
    return s[i] * (1 - f) + s[i + 1] * f;
  }

  // -------------------------------------------------------------------------------------
  // 7 · DRAW
  // -------------------------------------------------------------------------------------

  _draw() {
    const g = this.g;
    const t = this.tokens;
    const cfg = MODES[this._mode];
    const p = this._plot();
    const s = this.samples;
    const n = s.length;

    g.fillStyle = t['--panel'];
    g.fillRect(0, 0, this._w, this._h);

    const midY = p.y0 + p.h / 2;
    const halfH = (p.h / 2) * 0.92;

    this._drawGrid(g, t, cfg, p, midY, halfH);

    if (this._peak < SILENCE_PEAK) {
      this._trace = null;
      this._ghosts = [];
      g.strokeStyle = this._fade(t['--accent'], t['--fade-half']);
      g.lineWidth = cfg.lineWidth;
      g.beginPath();
      g.moveTo(p.x0, midY);
      g.lineTo(p.x0 + p.w, midY);
      g.stroke();
      g.fillStyle = t['--text-dim'];
      g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText('no signal', p.x0 + 6, p.y0 + 4);
      return;
    }

    const trigger = this._findTrigger(s, n, this._peak) ?? 0;

    // Window length = exactly the repetitions asked for. Falls back to a fixed 8 ms sweep
    // when nothing periodic was found, and says so on screen rather than pretending.
    const rate = this.analyser.context.sampleRate;
    let span;
    this._clamped = false;
    if (this._period) {
      span = this._period * this.cycles;
      const available = n - 1 - trigger;
      if (span > available) {
        span = available;
        this._clamped = true;
      }
    } else {
      span = Math.min(n - 1 - trigger, rate * 0.008);
    }
    span = Math.max(2, span);

    const cols = Math.max(2, Math.round(p.w));
    if (!this._trace || this._trace.length !== cols) this._trace = new Float32Array(cols);
    const trace = this._trace;
    for (let c = 0; c < cols; c++) {
      trace[c] = this._sampleAt(s, n, trigger + (c / (cols - 1)) * span);
    }

    // Expanded only: faint after-images of the last few traces. On a locked trace they sit
    // exactly underneath the live one and vanish; on an unlocked one they smear — which is
    // the honest thing for the display to show.
    if (cfg.persistence > 0) {
      for (let i = 0; i < this._ghosts.length; i++) {
        const alpha = 0.1 * (1 - i / (cfg.persistence + 1));
        this._strokeTrace(g, this._ghosts[i], cols, p, midY, halfH, this._fade(t['--accent'], alpha), 1.5);
      }
      this._ghosts.unshift(Float32Array.from(trace));
      if (this._ghosts.length > cfg.persistence) this._ghosts.length = cfg.persistence;
    }

    this._strokeTrace(g, trace, cols, p, midY, halfH, t['--accent'], cfg.lineWidth);
    this._drawReadout(g, t, cfg, p, span, rate);
  }

  _strokeTrace(g, trace, cols, p, midY, halfH, color, width) {
    const gain = this._gain;
    g.beginPath();
    for (let c = 0; c < cols; c++) {
      const y = midY - clamp(trace[c] * gain, -1.05, 1.05) * halfH;
      if (c === 0) g.moveTo(p.x0 + c, y);
      else g.lineTo(p.x0 + c, y);
    }
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }

  _drawGrid(g, t, cfg, p, midY, halfH) {
    g.lineWidth = 1;
    g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;

    // Amplitude gridlines: +1, +0.5, 0, -0.5, -1. "Gain of a sound wave" is the y axis,
    // so it gets labelled in the expanded view rather than being an unexplained grid.
    for (const level of [1, 0.5, 0, -0.5, -1]) {
      const y = Math.round(midY - level * halfH) + 0.5;
      g.strokeStyle = level === 0 ? t['--line'] : this._fade(t['--line'], t['--fade-half']);
      g.beginPath();
      g.moveTo(p.x0, y);
      g.lineTo(p.x0 + p.w, y);
      g.stroke();
      if (cfg.axisLabels) {
        g.fillStyle = t['--text-dim'];
        g.textAlign = 'right';
        g.textBaseline = 'middle';
        g.fillText(level > 0 ? `+${level}` : `${level}`, p.x0 - 5, y);
      }
    }
    if (cfg.axisLabels) {
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillStyle = t['--text-dim'];
      g.fillText('gain', 2, p.y0 - p.font * 2.4);
    }
  }

  _drawReadout(g, t, cfg, p, span, rate) {
    g.font = `${p.font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    g.textBaseline = 'top';

    if (cfg.bracket) {
      // The bracket is the teaching object: it says, in the picture, that what you are
      // looking at is ONE repetition and how long that repetition is.
      const y = p.y0 - Math.round(p.font * 0.9);
      const x1 = p.x0;
      const x2 = p.x0 + p.w;
      g.strokeStyle = this._fade(t['--text-dim'], t['--fade-near']);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x1 + 0.5, y + 5);
      g.lineTo(x1 + 0.5, y);
      g.lineTo(x2 - 0.5, y);
      g.lineTo(x2 - 0.5, y + 5);
      g.stroke();

      const ms = (span / rate) * 1000;
      const label = this._period
        ? this._clamped
          ? `${this.cycles === 1 ? 'one repetition' : `${this.cycles} repetitions`} — longer than the window`
          : `${this.cycles === 1 ? 'ONE REPETITION' : `${this.cycles} REPETITIONS`} — ${ms.toFixed(2)} ms`
        : `free running — ${ms.toFixed(2)} ms (no stable pitch found)`;

      g.fillStyle = this._period ? t['--text'] : t['--warn'];
      g.textAlign = 'center';
      const bw = g.measureText(label).width;
      g.fillStyle = t['--panel'];
      g.fillRect(p.x0 + p.w / 2 - bw / 2 - 4, y - 2, bw + 8, p.font + 4);
      g.fillStyle = this._period ? t['--text'] : t['--warn'];
      g.fillText(label, p.x0 + p.w / 2, y - 1);
    }

    const bits = [];
    const hz = this.frequencyHz;
    if (hz) bits.push(`${hz < 1000 ? hz.toFixed(1) : `${(hz / 1000).toFixed(2)}k`} Hz`);
    bits.push(`peak ${this._peak.toFixed(2)}`);
    if (this._gain > 1.02) bits.push(`×${this._gain.toFixed(1)}`);

    g.fillStyle = t['--text-dim'];
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.fillText(bits.join('   '), p.x0 + p.w - 2, p.y0 + p.h - 2);
  }

  /** See vis/spectrum.js — same helper, duplicated because a shared vis/ base module is
   *  outside this seat's lane (STAGE.md collision map). */
  _fade(color, alpha) {
    this._fadeCache ??= new Map();
    const key = `${color}|${alpha}`;
    let out = this._fadeCache.get(key);
    if (out) return out;
    const probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = color;
    const parsed = probe.fillStyle;
    if (parsed.startsWith('#') && parsed.length === 7) {
      const r = parseInt(parsed.slice(1, 3), 16);
      const gg = parseInt(parsed.slice(3, 5), 16);
      const b = parseInt(parsed.slice(5, 7), 16);
      out = `rgba(${r},${gg},${b},${alpha})`;
    } else {
      out = parsed;
    }
    this._fadeCache.set(key, out);
    return out;
  }
}
