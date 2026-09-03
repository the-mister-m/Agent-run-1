// =========================================================================================
// core/roll-scheduler.js — THE ROLL SCHEDULER
// =========================================================================================
// Schedules noteOn/noteOff for melodic (piano-roll) regions. Subscribes to the clock's own
// 'tick' pass — the one loop in the app that schedules sound (core/clock.js). Mirrors the
// half-open window pattern in src/surfaces/step-grid.js's `_onTick` (~line 1009): every
// absolute tick belongs to exactly one pass window, so a note fires exactly once with no
// separate "already scheduled" bookkeeping.
// =========================================================================================

import { clock, ticksPerBeat, ticksPerBar } from './clock.js';
import { tracks } from './tracks.js';
import { regions } from './regions.js';

/** True if `tick` belongs to this pass's half-open window. */
function inWindow(tick, fromTick, toTick) {
  return tick >= fromTick && tick < toTick;
}

/** One scheduler pass. Every track with a live instrument, every unmuted region on that
 *  track's lane, every note whose start lands in this window: noteOn and noteOff both
 *  fire here, noteOff pre-computed from n.length. */
function onTick({ fromTick, toTick, timeOf, bpm }) {
  const secondsPerTick = 60 / (bpm * ticksPerBeat());
  // note ticks are region-local; a region's startBar places them on the song's timeline
  const barTicks = ticksPerBar();

  for (const track of tracks.all) {
    const instrument = track.instrument;
    if (!instrument) continue;

    for (const region of regions.forLane(track.id)) {
      if (region.muted) continue;
      const notes = region.notes;
      if (!Array.isArray(notes)) continue; // a step-grid pattern object, not this shape

      const offset = (region.startBar - 1) * barTicks;

      for (const n of notes) {
        const at = offset + n.tick;
        if (inWindow(at, fromTick, toTick)) {
          const onTime = timeOf(at);
          instrument.noteOn(n.note, n.velocity, onTime);
          instrument.noteOff(n.note, onTime + n.length * secondsPerTick);
        }
      }
    }
  }
}

/** Transport stop. Silence every track's instrument — SPEC §5. */
function onStateChange({ to }) {
  if (to !== 'stopped') return;
  for (const track of tracks.all) {
    track.instrument?.allNotesOff();
  }
}

/** → a roll scheduler bound to the shared clock/tracks/regions singletons. One instance per
 *  page — a second would double-fire every note. */
export function createRollScheduler() {
  clock.on('tick', onTick);
  clock.on('statechange', onStateChange);

  return {
    dispose() {
      clock.off('tick', onTick);
      clock.off('statechange', onStateChange);
    },
  };
}

export default createRollScheduler;
