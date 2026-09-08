
  import { mountStandaloneTool } from '../../src/ui/shell.js';
  import OvertoneSynth from '../../src/instruments/overtone-synth.js';
  import Scope from '../../src/vis/scope.js';

  // ONE visual, named here and nowhere else. `vis/scope.js` binds to getAnalyser('scope');
  // Overtone Synth returns null for 'spectrum' (CONTRACTS §11.5), so this page
  // structurally cannot grow a spectrum analyzer — vis/spectrum.js would throw in its own
  // constructor if anyone tried.
  mountStandaloneTool({
    toolId: 'overtone-synth',
    layout: 'mobile',
    Instrument: OvertoneSynth,
    Visual: Scope,
    tap: 'scope',
    lesson:
      'Stack partials on the fundamental and watch the shape they add up to. ' +
      'More frequencies = a more complex wave.',
    visualTitle: 'Oscilloscope',
    visualNote:
      'the gain of the wave over the course of ONE repetition — raise a partial and the ' +
      'shape changes in front of you',
  });
