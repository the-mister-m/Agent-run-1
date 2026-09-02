// =========================================================================================
// core/tracks.js — THE TRACK STORE
// =========================================================================================
// WHAT THIS FILE IS
//   The place tracks live, and the bus that tells the mixer, the graph and the timeline
//   they changed. A track is a named slot that can hold one instrument instance. The
//   mixer strip, the graph node and the channel node all belong to the track, not to the
//   instrument — swapping an instrument leaves them in place.
//
// IT OWNS THE RECORD. IT OWNS NO INSTRUMENT LIFECYCLE, NO CHANNEL, NO REGIONS.
//   `instrument` is stored as a plain reference. This file never constructs one and never
//   disposes one — the caller builds the instance, hands it in, and is responsible for
//   tearing it down before replacing or removing a track. No clock import, no audio
//   import: this store counts nothing and caps nothing.
//
// TRACKS ARE REPLACED, NEVER EDITED IN PLACE
//   Every getter hands back a frozen record. Mutators build a new one and swap it in, then
//   publish. Editing a returned record would move it under every other reader without
//   firing an event.
//
// KIND IS DERIVED, NEVER ACCEPTED
//   `kind` comes only from `instrumentType`, through one lookup table in this file.
//   Setting `instrumentType` re-derives it; there is no way to set `kind` directly.
//
// A TRACK IS BORN EMPTY
//   `add()` never takes an instrument or an instrumentType. Both start null. Assigning an
//   instrument is a separate call, made after the track exists.
//
// TRACKS ARE ORDERED
//   Order is list position, held here, independent of insertion id. `all` reads it back;
//   `reorder` changes it.
// =========================================================================================

// -----------------------------------------------------------------------------------------
// 1 · THE EVENTS
// -----------------------------------------------------------------------------------------
/** Closed list — a typo'd event name throws at the call site instead of never firing.
 *  Every mutation publishes its own name and then 'change', so a view that only redraws
 *  subscribes once to 'change'. */
const EVENTS = ['add', 'remove', 'update', 'change'];

/** instrumentType → kind. The only place this mapping is made. */
const INSTRUMENT_KIND = {
  'wave-synth': 'pitched',
  'overtone-synth': 'pitched',
  'chord-module': 'pitched',
  'patch-synth': 'pitched',
  'drum-synth': 'drum',
  'drum-sampler': 'drum',
};

function deriveKind(instrumentType) {
  return INSTRUMENT_KIND[instrumentType] || null;
}

let _seq = 0;

function nextId() {
  _seq += 1;
  return `trk${_seq}`;
}

// -----------------------------------------------------------------------------------------
// 2 · THE STORE
// -----------------------------------------------------------------------------------------

/** → a track store. Independent of any other; a test or a second timeline calls this
 *  rather than sharing the page instance. */
export function createTrackStore() {
  const listeners = Object.fromEntries(EVENTS.map((name) => [name, new Set()]));
  /** id -> frozen track */
  const tracks = new Map();
  /** list order, by id — separate from Map iteration order */
  const order = [];

  /** Publish. Iterates a COPY: a subscriber that unsubscribes inside its own callback must
   *  not cause the next one to be skipped. */
  function emit(event, payload) {
    for (const fn of [...listeners[event]]) fn(payload);
  }

  function publish(event, track) {
    emit(event, track);
    emit('change', { event, track });
  }

  function freeze(t) {
    return Object.freeze({ ...t });
  }

  function commit(next, event) {
    const frozen = freeze(next);
    tracks.set(frozen.id, frozen);
    publish(event, frozen);
    return frozen;
  }

  return {
    // ——— the read side ————————————————————————————————————————————————————————————————
    /** Every track, in list order. Frozen. */
    get all() {
      return order.map((id) => tracks.get(id)).filter(Boolean);
    },

    get size() {
      return tracks.size;
    },

    /** One track by id, or null. Frozen — read it, never write into it. */
    get(id) {
      return tracks.get(id) || null;
    },

    // ——— the subscribe side ———————————————————————————————————————————————————————————
    /** Returns an UNSUBSCRIBE, the same shape `core/regions.js` and `core/state.js`
     *  return, so a view's `dispose()` drops a track subscription the same way. */
    on(event, fn) {
      if (!listeners[event]) throw new Error(`tracks.on: no such event "${event}"`);
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    },
    off(event, fn) {
      if (listeners[event]) listeners[event].delete(fn);
    },

    // ——— the mutations ————————————————————————————————————————————————————————————————
    /** Add an empty track to the end of the list. `instrumentType`, `instrument` and
     *  `kind` all start null — assigning an instrument is a separate call. */
    add({ name = null, color = null } = {}) {
      const id = nextId();
      const frozen = commit({
        id, name, instrumentType: null, instrument: null, kind: null, color,
      }, 'add');
      order.push(id);
      return frozen;
    },

    /** Drop a track's record. Does not touch its regions, channel, strip, graph node or
     *  instrument — those belong to the caller. */
    remove(id) {
      const t = tracks.get(id);
      if (!t) return false;
      tracks.delete(id);
      const i = order.indexOf(id);
      if (i !== -1) order.splice(i, 1);
      publish('remove', t);
      return true;
    },

    /** Write `instrumentType` and re-derive `kind` from it. Does not touch `instrument` —
     *  construct or dispose the instance, then call `setInstrument`. */
    setInstrumentType(id, instrumentType) {
      const t = tracks.get(id);
      if (!t) return null;
      const type = instrumentType ?? null;
      return commit({ ...t, instrumentType: type, kind: deriveKind(type) }, 'update');
    },

    /** Store the live instance, or null to clear it. Never constructs, never disposes. */
    setInstrument(id, instrument) {
      const t = tracks.get(id);
      if (!t) return null;
      return commit({ ...t, instrument: instrument ?? null }, 'update');
    },

    /** Non-derived fields only — `name`, `color`. `instrumentType`/`kind` go through
     *  `setInstrumentType` so nothing can set `kind` directly. */
    update(id, patch = {}) {
      const t = tracks.get(id);
      if (!t) return null;
      const next = { ...t };
      if ('name' in patch) next.name = patch.name;
      if ('color' in patch) next.color = patch.color;
      return commit(next, 'update');
    },

    /** Move a track to `toIndex` in the list, clamped to the list's bounds. */
    reorder(id, toIndex) {
      const t = tracks.get(id);
      if (!t) return null;
      const from = order.indexOf(id);
      if (from === -1) return null;
      order.splice(from, 1);
      const at = Math.max(0, Math.min(Math.round(Number(toIndex)) || 0, order.length));
      order.splice(at, 0, id);
      publish('update', t);
      return t;
    },

    // ——— introspection, for views and for the done-checks ——————————————————————————————
    get listenerCount() {
      return EVENTS.reduce((n, name) => n + listeners[name].size, 0);
    },

    /** Drops every subscription. The tracks themselves are left alone — a store that is
     *  disposed and re-subscribed still holds the same list. */
    dispose() {
      let listenersDropped = 0;
      for (const name of EVENTS) {
        listenersDropped += listeners[name].size;
        listeners[name].clear();
      }
      return { listenersDropped, tracksHeld: tracks.size };
    },
  };
}

// -----------------------------------------------------------------------------------------
// 3 · THE SHARED INSTANCE
// -----------------------------------------------------------------------------------------
/** The store the DAW page gets for free, so the mixer, the graph and the timeline are
 *  looking at one track list without the page wiring anything. A test or a second
 *  timeline calls `createTrackStore()` and passes the result in. */
export const tracks = createTrackStore();

export default tracks;
