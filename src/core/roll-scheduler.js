// =========================================================================================
// core/roll-scheduler.js — THE ROLL SCHEDULER
// =========================================================================================
// Schedules region playback: piano-roll note lists and step-grid patterns. Subscribes to the clock's own
// 'tick' pass — the one loop in the app that schedules sound (core/clock.js). Mirrors the
// half-open window pattern in src/surfaces/step-grid.js's `_onTick` (~line 1009): every
// absolute tick belongs to exactly one pass window, so a note fires exactly once with no
// separate "already scheduled" bookkeeping.
// =========================================================================================

import { clock, ticksPerBeat, ticksPerBar, ticksPerStep } from './clock.js';
import { tracks } from './tracks.js';
import { regions } from './regions.js';
import { pieceFor } from '../surfaces/step-grid.js';

/** True if `tick` belongs to this pass's half-open window. */
function inWindow(tick, fromTick, toTick) {
  return tick >= fromTick && tick < toTick;
}

/** True for a step-grid pattern object rather than a note list. */
function isPattern(notes) {
  return Boolean(notes) && !Array.isArray(notes) && Array.isArray(notes.lanes);
}

/** One drum region's pass: every lane, every step that is on, inside the window. */
function schedulePattern(pattern, instrument, timeSignature, span) {
  const { offset, endTick, cycle, fromTick, toTick, timeOf } = span;
  for (const lane of pattern.lanes) {
    if (!lane || !Array.isArray(lane.steps)) continue;
    const tps = ticksPerStep(lane.division, timeSignature);
    if (!(tps > 0)) continue;
    const piece = pieceFor(instrument, lane.piece);
    if (!piece) continue;

    for (let i = 0; i < lane.steps.length; i++) {
      const step = lane.steps[i];
      if (!step) continue;
      const local = i * tps;
      if (cycle !== null && local >= cycle) continue;
      const stride = cycle !== null ? cycle : endTick;
      for (let at = offset + local; at < endTick; at += stride) {
        if (inWindow(at, fromTick, toTick)) {
          instrument.noteOn(piece.note, Math.max(0, Math.min(1, Number(step.v) || 0)), timeOf(at));
        }
        if (cycle === null) break;
      }
    }
  }
}

/** One scheduler pass. Every track with a live instrument, every unmuted region on that
 *  track's lane, every note whose start lands in this window: noteOn and noteOff both
 *  fire here, noteOff pre-computed from n.length. */
function onTick({ fromTick, toTick, timeOf, bpm, timeSignature }) {
  const secondsPerTick = 60 / (bpm * ticksPerBeat());
  // note ticks are region-local; a region's startBar places them on the song's timeline
  const barTicks = ticksPerBar();

  for (const track of tracks.all) {
    const instrument = track.instrument;
    if (!instrument) continue;

    for (const region of regions.forLane(track.id)) {
      if (region.muted) continue;
      const notes = region.notes;

      const offset = (region.startBar - 1) * barTicks;
      const endTick = offset + region.lengthBars * barTicks;
      const cycle = region.loop ? (region.loopBars || region.lengthBars) * barTicks : null;

      if (isPattern(notes)) {
        const span = { offset, endTick, cycle, fromTick, toTick, timeOf };
        schedulePattern(notes, instrument, timeSignature, span);
        continue;
      }
      if (!Array.isArray(notes)) continue;

      for (const n of notes) {
        if (cycle !== null && n.tick >= cycle) continue;
        const step = cycle !== null ? cycle : endTick;
        for (let at = offset + n.tick; at < endTick; at += step) {
          if (inWindow(at, fromTick, toTick)) {
            const onTime = timeOf(at);
            instrument.noteOn(n.note, n.velocity, onTime);
            instrument.noteOff(n.note, onTime + n.length * secondsPerTick);
          }
          if (cycle === null) break;
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
