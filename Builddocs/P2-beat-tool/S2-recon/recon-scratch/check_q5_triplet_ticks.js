// recon-scheduler Q5: does triplet-to-tick conversion at PPQ 480 stay exact over 64 bars?
// Checks both eighth-note triplets and 16th-note triplets, using integer tick
// accumulation (the correct implementation) AND a naive per-event round() formula
// (a plausible wrong implementation), to see whether either produces drift.

const PPQ = 480;
const BAR_TICKS = PPQ * 4; // 4/4, 4 quarter notes per bar
const BARS = 64;
const BAR_END_TICKS = BAR_TICKS * BARS; // expected final tick

function checkSubdivision(name, notesPerBar, tickPerNote) {
  // Method A: integer accumulation (nextTick += tickPerNote every event)
  let tick = 0;
  let events = 0;
  const totalEvents = notesPerBar * BARS;
  for (let i = 0; i < totalEvents; i++) {
    tick += tickPerNote;
    events++;
  }
  const drift_A = tick - BAR_END_TICKS;

  // Method B: naive absolute formula per event, tick = round(i * (BAR_TICKS/notesPerBar))
  // this is how a naive "position from index" implementation might compute it
  const exactPerNote = BAR_TICKS / notesPerBar;
  let maxAbsError_B = 0;
  let lastTick_B = 0;
  for (let i = 1; i <= totalEvents; i++) {
    const t = Math.round(i * exactPerNote);
    lastTick_B = t;
  }
  const drift_B = lastTick_B - BAR_END_TICKS;

  return {
    name,
    tickPerNote,
    isInteger: Number.isInteger(tickPerNote),
    totalEvents,
    finalTick_integerAccumulation: tick,
    expectedFinalTick: BAR_END_TICKS,
    drift_ticks_integerAccumulation: drift_A,
    finalTick_naiveRoundFormula: lastTick_B,
    drift_ticks_naiveRoundFormula: drift_B,
  };
}

const results = [
  checkSubdivision('quarter-note triplet (3 in space of 2 quarters)', 4 * (2/3), BAR_TICKS/4/ (3/2)), // sanity: not typical, skip weird one
];

// Standard triplet subdivisions actually used on a drum grid:
const eighthTriplet = checkSubdivision('eighth-note triplet', 12, PPQ/3);       // 12 per bar, PPQ/3=160
const sixteenthTriplet = checkSubdivision('16th-note triplet', 24, PPQ/6);      // 24 per bar, PPQ/6=80
const straightSixteenth = checkSubdivision('straight 16th (control)', 16, PPQ/4); // 16 per bar, PPQ/4=120

console.log(JSON.stringify({ eighthTriplet, sixteenthTriplet, straightSixteenth }, null, 2));

// Also: prime factorization sanity check, states WHY it's exact
function factorize(n) {
  const f = {};
  let d = 2;
  while (n > 1) {
    while (n % d === 0) { f[d] = (f[d]||0)+1; n/=d; }
    d++;
  }
  return f;
}
console.log('PPQ 480 factorization:', JSON.stringify(factorize(480)));
