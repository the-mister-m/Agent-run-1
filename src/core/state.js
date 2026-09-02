// =========================================================================================
// core/state.js — THE STATE OWNER
// =========================================================================================
// Written 2026-08-24. Binds to: CONTRACTS §1 (file layout — "project state, scale state,
// pub/sub"), §4 (SCALE STATE, FROZEN, plus its 2026-08-22 and 2026-08-24 amendments),
// §15.5 (the four mutations and what each one touches), F2 (`originName`).
//
// WHAT THIS FILE IS
//   The place `state.scale` lives, and the bus that tells surfaces it moved. §4: "state.on
//   ('scale', fn) — every surface subscribes." Three P3/S5 surfaces were built against this
//   call surface before it existed and each carried a local stand-in; this file is the real
//   one, and those stand-ins are deleted.
//
// IT OWNS STORAGE AND NOTIFICATION. IT OWNS NO THEORY.
//   Every mutation here is `theory/scale.js`'s own PURE transform (§15.5's table, run by
//   `scale-engine`): scale in, NEW scale out. This file stores the result and publishes.
//   It computes no degree, clamps no value, names no scale, and knows no preset by name —
//   A8: "no seat may write `if (preset === 'Dorian')`." If a music question can be asked of
//   this file, the answer is in `theory/scale.js` and the call belongs there.
//
// THE SCALE OBJECT IS REPLACED, NEVER EDITED IN PLACE
//   `state.scale` hands back the current object. A subscriber may read it and hold it as a
//   snapshot; nobody may write to it. Mutating it in place would move the value under every
//   other surface without firing 'scale', which is the one failure the bus exists to
//   prevent. Every mutator below rebinds `scale` to a new object and then publishes.
//
// SCALE STATE ONLY, ON PURPOSE
//   §1 also names "project state" — that is P4's, and P4 is not built. Nothing that exists
//   today reads it, so nothing here invents it. What IS built for it is the bus: `EVENTS`,
//   `on`/`off`, and `emit` are slice-agnostic, so the project slice lands as one more event
//   name and one more group of mutators, with no surface changing its subscription shape.
//
// ONE PER TOOL, NOT ONE PER APP
//   §4: "in the DAW, the project header owns `state.scale` and every instrument inherits
//   it. In a standalone tool, that tool owns its own `state.scale`." So `createState()` is
//   the real export and `state` is the shared instance a page gets for free. Two tools on
//   two pages each get their own; two surfaces on ONE page share one and stay in step.
// =========================================================================================

import {
  createScale,
  setScaleTonic as pureSetScaleTonic,
  setScalePreset as pureSetScalePreset,
  setScaleDegree as pureSetScaleDegree,
  resetScaleDegree as pureResetScaleDegree,
} from '../theory/scale.js';

// -----------------------------------------------------------------------------------------
// 1 · THE EVENTS
// -----------------------------------------------------------------------------------------
/**
 * The closed list, the same guard `core/input.js` uses so a typo'd event name throws at the
 * call site instead of silently never firing.
 *
 * ONE ENTRY TODAY. §4 names 'scale' and nothing built subscribes to anything else. P4's
 * project slice adds its name to this array and its mutators to section 3; no subscriber
 * anywhere changes shape when it does.
 */
const EVENTS = ['scale', 'project'];

// -----------------------------------------------------------------------------------------
// 2 · THE STORE
// -----------------------------------------------------------------------------------------

/**
 * → a state store. `initialScale` is a §4 scale object, i.e. `theory/scale.js`'s
 * `createScale(tonic, presetName)`; omitted, the store opens on C Major, which is §7's
 * saved default and D-1's starting point.
 *
 * @param {object} [initialScale] a §4 `{tonic, degrees, name, altered, preset, originName}`
 */
export function createState(initialScale = createScale()) {
  // ——— the pub/sub core. Generic over EVENTS; it knows nothing about scales ————————————
  const listeners = Object.fromEntries(EVENTS.map((name) => [name, new Set()]));

  /** Publish. Iterates a COPY: a subscriber that unsubscribes inside its own callback (the
   *  dispose path every surface has) must not skip the next one. */
  function emit(event, payload) {
    for (const fn of [...listeners[event]]) fn(payload);
  }

  // ——— the scale slice ————————————————————————————————————————————————————————————————
  let scale = initialScale;

  /** Store the transform's result and publish it. THE ONLY WRITER OF `scale` IN THIS FILE.
   *  A transform that REFUSED — an unknown preset name, a degree index outside 0-6 — hands
   *  back the very object it was given, and nothing is published. Those refusals are
   *  `theory/scale.js`'s to make (§15.3: "the index is out of range and scale-engine must
   *  reject it"); the identity check here only keeps a refusal from waking every surface on
   *  the page. A move that CLAMPED still publishes: scale.js returns a new object, the
   *  degree is unchanged but `altered` and `preset` may not be, and a surface that draws a
   *  +/- as disabled at the clamp needs that redraw. */
  function commit(next) {
    if (next === scale) return scale;
    scale = next;
    emit('scale', scale);
    return scale;
  }

  /** punch: {on, startBar, endBar}. Timeline range, global. Arm is per-lane — see
   *  `ui/arrangement.js`'s Capture instances; no global arm state lives here. */
  let project = { punch: { on: false, startBar: 1, endBar: 5 } };

  function commitProject(next) {
    if (next === project) return project;
    project = next;
    emit('project', project);
    return project;
  }

  return {
    // ——— §4's read side ——————————————————————————————————————————————————————————————
    /** §4's `state.scale`. Read it; never write into it — see the header. */
    get scale() {
      return scale;
    },

    // ——— §4's subscribe side —————————————————————————————————————————————————————————
    /**
     * §4: "state.on('scale', fn) — every surface subscribes."
     * Returns an UNSUBSCRIBE, the same shape `core/input.js`'s `on` returns, so a surface's
     * §12.1 `dispose()` drops a store subscription exactly the way it drops a bus one.
     * The callback is handed the new scale; it may also read `state.scale`, which is the
     * same object.
     */
    on(event, fn) {
      if (!listeners[event]) throw new Error(`state.on: no such event "${event}"`);
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    },
    off(event, fn) {
      if (listeners[event]) listeners[event].delete(fn);
    },

    // ——— §4 + §15.5's four mutations. Each returns the resulting scale ————————————————
    //
    //   call                  tonic     degrees        altered      preset      originName
    //   setScaleTonic(pc)     ← pc      untouched      untouched    untouched   untouched
    //   setScalePreset(name)  untouched ← all 7        all false    ← name      ← name
    //   setScaleDegree(i,n)   untouched degrees[i]+=n  [i] = true   ← 'Custom'  untouched
    //   resetScaleDegree(i)   untouched ← origin[i]    [i] = false  see §15.5   untouched
    //
    // Every row is executed by `theory/scale.js`. This file supplies no cell of it.

    /** OD-10 — transpose. `degrees` holds offsets FROM the tonic, so the shape survives. */
    setScaleTonic(pc) {
      return commit(pureSetScaleTonic(scale, pc));
    },

    /** §4 — "writes all 7 degrees at once; clears `altered`." */
    setScalePreset(name) {
      return commit(pureSetScalePreset(scale, name));
    },

    /** §4 — "the +/- on the circle and diatonic keys." Clamped by DEGREE_CLAMP, in scale.js. */
    setScaleDegree(i, semitones) {
      return commit(pureSetScaleDegree(scale, i, semitones));
    },

    /** §4 — "one degree back to the preset value." F2: back to `originName`'s value, which
     *  is what "and get back" means — the student returns where they actually started. */
    resetScaleDegree(i) {
      return commit(pureResetScaleDegree(scale, i));
    },

    get project() {
      return project;
    },
    setPunch(patch) {
      return commitProject({ ...project, punch: { ...project.punch, ...patch } });
    },

    // ——— introspection, for surfaces and for the done-checks ——————————————————————————
    get listenerCount() {
      return EVENTS.reduce((n, name) => n + listeners[name].size, 0);
    },

    /** Drops every subscription this store holds. The scale itself is left alone — a store
     *  that is disposed and re-subscribed is on the same scale, not back at C Major.
     *  Mirrors `core/input.js`'s `dispose()` return shape. */
    dispose() {
      let listenersDropped = 0;
      for (const name of EVENTS) {
        listenersDropped += listeners[name].size;
        listeners[name].clear();
      }
      return { listenersDropped };
    },
  };
}

// -----------------------------------------------------------------------------------------
// 3 · THE SHARED INSTANCE
// -----------------------------------------------------------------------------------------
/**
 * The store a page gets for free — §4's "that tool owns its own `state.scale`", built once
 * so that two surfaces on one page are looking at ONE scale without the page wiring
 * anything. `surfaces/diatonic-keys.js` imports it directly; `surfaces/scale-circle.js`
 * takes a store as its third constructor argument (§12.1 keeps a surface from importing
 * singletons on its own) and a page hands it THIS one. Both then move together.
 *
 * A tool that wants an independent scale — a test, a second scale on one page — calls
 * `createState()` and passes the result in.
 */
export const state = createState();

export default state;
