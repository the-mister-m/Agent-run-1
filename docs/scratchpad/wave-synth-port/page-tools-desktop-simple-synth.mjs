
  import { mountStandaloneTool } from '../../src/ui/shell.js';
  import SimpleSynth from '../../src/instruments/simple-synth.js';
  import Spectrum from '../../src/vis/spectrum.js';

  // One visual: the spectrum tap. The scope tap is null on this instrument.
  mountStandaloneTool({
    toolId: 'simple-synth',
    layout: 'desktop',
    Instrument: SimpleSynth,
    Visual: Spectrum,
    tap: 'spectrum',
    lesson:
      'Pick a shape and see how many frequencies are in it. ' +
      'Smoother wave = fewer overtones.',
    visualTitle: 'Spectrum analyzer',
    visualNote:
      'every frequency in the sound right now — the fundamental is the lowest and ' +
      'loudest, everything above it is an overtone (×2, ×3, ×4 …)',
  });
