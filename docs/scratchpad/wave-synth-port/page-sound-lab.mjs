
import {
  ctx,
  audio,
  unlock,
  masterAnalyser,
  createChannel,
  releaseChannel,
  synthVoiceNorm,
  setMasterLimiter,
  getMasterLimiter,
} from '../../src/core/audio.js';
import { input } from '../../src/core/input.js';
import SimpleSynth from '../../src/instruments/simple-synth.js';
import WaveSynth from '../../src/instruments/wave-synth.js';
import OvertoneSynth from '../../src/instruments/overtone-synth.js';
import Meter from '../../src/vis/meter.js';
import Keyboard from '../../src/surfaces/keyboard.js';

// four eight-note chord voicings, root then extended stack, one beat each at 120bpm
const BEAT_S = 60 / 120;
const CHORD_INTERVALS = [0, 4, 7, 10, 14, 17, 21, 24];
const CHORD_ROOTS = [60, 65, 67, 60];

const LAYER_MODES = {
  channel: { mode: 'per-instrument', voiceLayer: false },
  voice: { mode: 'off', voiceLayer: true },
  both: { mode: 'per-instrument', voiceLayer: true },
  none: { mode: 'off', voiceLayer: false },
};

let instrument = null;
let channel = null;
let currentLayer = 'both';
let limiterOn = false;
let heldNotes = [];

const instHost = document.getElementById('instHost');
const ctxInfo = document.getElementById('ctxInfo');
const stateLine = document.getElementById('stateLine');
const liveReadout = document.getElementById('liveReadout');

// swap the live instrument, disposing the old one and its channel
function buildInstrument(Ctor) {
  if (instrument) {
    instrument.dispose();
    releaseChannel(channel);
    instrument = null;
    channel = null;
  }
  channel = createChannel(Ctor.id);
  instrument = new Ctor(ctx, channel);
  instrument.mountExpanded(instHost);
}

const PICKERS = '#pickSimple, #pickWave, #pickOvertone';

document.getElementById('pickSimple').addEventListener('click', (e) => {
  buildInstrument(SimpleSynth);
  document.querySelectorAll(PICKERS).forEach((b) => b.classList.remove('on'));
  e.target.classList.add('on');
});
document.getElementById('pickWave').addEventListener('click', (e) => {
  buildInstrument(WaveSynth);
  document.querySelectorAll(PICKERS).forEach((b) => b.classList.remove('on'));
  e.target.classList.add('on');
});
document.getElementById('pickOvertone').addEventListener('click', (e) => {
  buildInstrument(OvertoneSynth);
  document.querySelectorAll(PICKERS).forEach((b) => b.classList.remove('on'));
  e.target.classList.add('on');
});

// input bus to the live instrument, same wiring shell.js uses
input.on('noteon', (e) => {
  unlock();
  if (instrument) instrument.noteOn(e.note, e.velocity);
});
input.on('noteoff', (e) => {
  if (instrument) instrument.noteOff(e.note);
});
window.addEventListener('blur', () => input.allNotesOff());

audio.on('unlocked', () => { ctxInfo.textContent = 'audio running'; });

// on-screen key row plus the home row, one mount
const kb = new Keyboard();
kb.mountExpanded(document.getElementById('kbHost'));

// master analyser meter
const meter = new Meter(masterAnalyser, { orientation: 'horizontal' });
meter.mount(document.getElementById('meterHost'));

// layer radio
document.querySelectorAll('input[name=layer]').forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    const cfg = LAYER_MODES[radio.value];
    synthVoiceNorm.mode = cfg.mode;
    synthVoiceNorm.voiceLayer = cfg.voiceLayer;
    currentLayer = radio.value;
    updateStateLine();
  });
});

// limiter toggle
document.getElementById('limiterToggle').addEventListener('click', (e) => {
  limiterOn = !limiterOn;
  setMasterLimiter(limiterOn);
  e.target.textContent = limiterOn ? 'on' : 'off';
  e.target.classList.toggle('on', limiterOn);
  updateStateLine();
});

// exponent slider
const expSlider = document.getElementById('expSlider');
const expVal = document.getElementById('expVal');
expSlider.value = synthVoiceNorm.exponent;
expVal.textContent = synthVoiceNorm.exponent.toFixed(2);
expSlider.addEventListener('input', () => {
  synthVoiceNorm.exponent = parseFloat(expSlider.value);
  expVal.textContent = synthVoiceNorm.exponent.toFixed(2);
  updateStateLine();
});

// response slider
const respSlider = document.getElementById('respSlider');
const respVal = document.getElementById('respVal');
respSlider.value = Math.round(synthVoiceNorm.responseMs);
respVal.textContent = Math.round(synthVoiceNorm.responseMs) + ' ms';
respSlider.addEventListener('input', () => {
  synthVoiceNorm.responseMs = parseFloat(respSlider.value);
  respVal.textContent = Math.round(synthVoiceNorm.responseMs) + ' ms';
  updateStateLine();
});

// four chords back to back, one beat each at 120bpm, ctx clock only
function chordRun() {
  unlock();
  if (!instrument) return;
  const t0 = ctx.currentTime + 0.05;
  CHORD_ROOTS.forEach((root, i) => {
    const at = t0 + i * BEAT_S;
    const off = at + BEAT_S;
    const notes = CHORD_INTERVALS.map((iv) => root + iv);
    notes.forEach((n) => instrument.noteOn(n, 0.8, at));
    notes.forEach((n) => instrument.noteOff(n, off));
  });
}

// eight notes on, held until RELEASE
function heldChordOn() {
  unlock();
  if (!instrument) return;
  heldChordRelease();
  const t0 = ctx.currentTime;
  heldNotes = CHORD_INTERVALS.map((iv) => 60 + iv);
  heldNotes.forEach((n) => instrument.noteOn(n, 0.8, t0));
}

// releases every held note at once, at the current time
function heldChordRelease() {
  if (!instrument || heldNotes.length === 0) return;
  const t0 = ctx.currentTime;
  heldNotes.forEach((n) => instrument.noteOff(n, t0));
  heldNotes = [];
}

document.getElementById('chordRun').addEventListener('click', chordRun);
document.getElementById('heldChord').addEventListener('click', heldChordOn);
document.getElementById('chordRelease').addEventListener('click', heldChordRelease);

// one line, every control's current state
function updateStateLine() {
  stateLine.textContent =
    'layer=' + currentLayer +
    ' limiter=' + (limiterOn ? 'on' : 'off') +
    ' exp=' + synthVoiceNorm.exponent.toFixed(2) +
    ' resp=' + Math.round(synthVoiceNorm.responseMs);
}

// voice count, channel gain, exponent, limiter reduction — read every frame
function tick() {
  const limiter = getMasterLimiter();
  const reduction = limiter ? limiter.reduction : 0;
  const voices = instrument ? instrument.voiceCount : 0;
  const gain = channel ? channel.gain.value : 1;
  liveReadout.textContent =
    'voices ' + voices +
    ' · channel gain ' + gain.toFixed(2) +
    ' · exponent ' + synthVoiceNorm.exponent.toFixed(2) +
    ' · reduction ' + reduction.toFixed(1) + ' dB';
  requestAnimationFrame(tick);
}

buildInstrument(SimpleSynth);
updateStateLine();
requestAnimationFrame(tick);
