
  import { mountStandaloneTool } from '../../src/ui/shell.js';
  import WaveSynth from '../../src/instruments/wave-synth.js';
  import Spectrum from '../../src/vis/spectrum.js';

  // One visual: the spectrum tap. The scope tap is null on this instrument.
  mountStandaloneTool({
    toolId: 'wave-synth',
    layout: 'mobile',
    Instrument: WaveSynth,
    Visual: Spectrum,
    tap: 'spectrum',
    lesson:
      'Two oscillators, one filter, two envelopes, two LFOs and a mod matrix. ' +
      'Stack voices with unison and detune them apart.',
    visualTitle: 'Spectrum analyzer',
    visualNote:
      'every frequency in the sound right now — pulse width, detune and the filter ' +
      'each move a different part of this picture',
  });
