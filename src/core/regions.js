// =========================================================================================
// core/regions.js — THE REGION STORE
// =========================================================================================
// WHAT THIS FILE IS
//   The place arrangement regions live, and the bus that tells the timeline they moved.
//   A region is one block on one lane: where it starts, how long it runs, and the note
//   payload it carries.
//
// IT OWNS PLACEMENT. IT OWNS NO NOTES AND NO TRANSPORT.
//   `notes` is stored and handed back untouched — this file never reads inside a note, so
//   it holds a piano roll's notes and a step grid's steps with the same code. Bars are
//   1-based, matching `clock.seek`. Nothing here imports the clock: song length is the
//   caller's business, so a region can be placed past the end and the caller decides.
//
// REGIONS ARE REPLACED, NEVER EDITED IN PLACE
//   Every getter hands back a frozen object. Mutators build a new one and swap it in, then
//   publish. Editing a returned region would move it under every other reader without
//   firing an event, which is the one failure this bus exists to prevent.
//
// ONE REGION PER BAR PER LANE
//   Regions on a lane may touch but never overlap. `move` and `resize` clamp against their
//   neighbours rather than refusing outright, so a drag stops at the wall instead of
//   snapping back.
// =========================================================================================

// -----------------------------------------------------------------------------------------
// 1 · THE EVENTS
// -----------------------------------------------------------------------------------------
/** Closed list — a typo'd event name throws at the call site instead of never firing.
 *  Every mutation publishes its own name and then 'change', so a view that only redraws
 *  subscribes once to 'change'. */
const EVENTS = ['add', 'remove', 'update', 'change'];

const MIN_LENGTH_BARS = 1;

let _seq = 0;

function nextId() {
  _seq += 1;
  return `r${_seq}`;
}

function clampInt(n, min, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, v);
}

/** `notes` is opaque — a piano roll's note array or a step grid's pattern object, stored
 *  and handed back as given. A shallow copy so a caller's own array/object can't drift the
 *  stored region after the fact. */
function copyNotes(notes) {
  if (Array.isArray(notes)) return [...notes];
  if (notes && typeof notes === 'object') return { ...notes };
  return [];
}

/** Half-open span, in bars: a region occupies [startBar, startBar + lengthBars). */
function endBar(r) {
  return r.startBar + r.lengthBars;
}

// -----------------------------------------------------------------------------------------
// 2 · THE STORE
// -----------------------------------------------------------------------------------------

/** → a region store. Independent of any other; a test or a second timeline calls this
 *  rather than sharing the page instance. */
export function createRegionStore() {
  const listeners = Object.fromEntries(EVENTS.map((name) => [name, new Set()]));
  /** id -> frozen region */
  const regions = new Map();

  /** Publish. Iterates a COPY: a subscriber that unsubscribes inside its own callback must
   *  not cause the next one to be skipped. */
  function emit(event, payload) {
    for (const fn of [...listeners[event]]) fn(payload);
  }

  function publish(event, region) {
    emit(event, region);
    emit('change', { event, region });
  }

  function freeze(r) {
    return Object.freeze({ ...r, notes: Object.freeze(copyNotes(r.notes)) });
  }

  /** Every region on a lane except `exceptId`, ordered by start. */
  function laneRegions(laneId, exceptId = null) {
    return [...regions.values()]
      .filter((r) => r.laneId === laneId && r.id !== exceptId)
      .sort((a, b) => a.startBar - b.startBar);
  }

  /** The free run of bars around `bar` on a lane: `[from, to)`, `to` Infinity if open-ended.
   *  If `bar` sits inside an occupied region, the gap that starts nearest below it wins. */
  function gapAround(laneId, bar, exceptId = null) {
    const others = laneRegions(laneId, exceptId);
    let from = 1;
    for (const r of others) {
      if (endBar(r) <= bar) { from = Math.max(from, endBar(r)); continue; }
      if (r.startBar > bar) return { from, to: r.startBar };
      // `bar` lands inside r — the usable gap is the one that ends where r begins.
      return { from, to: r.startBar };
    }
    return { from, to: Infinity };
  }

  function commit(next, event) {
    const frozen = freeze(next);
    regions.set(frozen.id, frozen);
    publish(event, frozen);
    return frozen;
  }

  return {
    // ——— the read side ————————————————————————————————————————————————————————————————
    /** Every region, ordered by lane then start. Frozen. */
    get all() {
      return [...regions.values()]
        .sort((a, b) => (a.laneId === b.laneId
          ? a.startBar - b.startBar
          : String(a.laneId).localeCompare(String(b.laneId))));
    },

    get size() {
      return regions.size;
    },

    /** One region by id, or null. Frozen — read it, never write into it. */
    get(id) {
      return regions.get(id) || null;
    },

    /** Every region on one lane, ordered by start. */
    forLane(laneId) {
      return laneRegions(laneId);
    },

    /** The region covering `bar` on `laneId`, or null. Bars are 1-based, spans half-open,
     *  so a region at bar 1 length 2 covers bars 1 and 2 and not bar 3. */
    at(laneId, bar) {
      const b = Number(bar);
      for (const r of regions.values()) {
        if (r.laneId === laneId && b >= r.startBar && b < endBar(r)) return r;
      }
      return null;
    },

    /** Whether `[startBar, startBar+lengthBars)` is clear on a lane. */
    isFree(laneId, startBar, lengthBars, exceptId = null) {
      const s = clampInt(startBar, 1, 1);
      const e = s + clampInt(lengthBars, MIN_LENGTH_BARS, MIN_LENGTH_BARS);
      return laneRegions(laneId, exceptId).every((r) => endBar(r) <= s || r.startBar >= e);
    },

    // ——— the subscribe side ———————————————————————————————————————————————————————————
    /** Returns an UNSUBSCRIBE, the same shape `core/state.js` returns, so a view's
     *  `dispose()` drops a region subscription the way it drops a scale one. */
    on(event, fn) {
      if (!listeners[event]) throw new Error(`regions.on: no such event "${event}"`);
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    },
    off(event, fn) {
      if (listeners[event]) listeners[event].delete(fn);
    },

    // ——— the mutations ————————————————————————————————————————————————————————————————
    /**
     * Place a new region. Returns it, or null if the span is already occupied — placement
     * refuses rather than clamping, because the caller chose the spot.
     *
     * `notes` is stored as given and never inspected.
     */
    add({ laneId, startBar = 1, lengthBars = 1, name = null, color = null, notes = [], muted = false } = {}) {
      if (laneId === undefined || laneId === null) throw new TypeError('regions.add: laneId required');
      const s = clampInt(startBar, 1, 1);
      const len = clampInt(lengthBars, MIN_LENGTH_BARS, MIN_LENGTH_BARS);
      if (!this.isFree(laneId, s, len)) return null;

      return commit({
        id: nextId(),
        laneId,
        startBar: s,
        lengthBars: len,
        name,
        color,
        muted: Boolean(muted),
        notes: copyNotes(notes),
      }, 'add');
    },

    remove(id) {
      const r = regions.get(id);
      if (!r) return false;
      regions.delete(id);
      publish('remove', r);
      return true;
    },

    /** Drops every region, or every region on one lane. Returns how many went. */
    clear(laneId = null) {
      const doomed = laneId === null ? [...regions.values()] : laneRegions(laneId);
      for (const r of doomed) {
        regions.delete(r.id);
        publish('remove', r);
      }
      return doomed.length;
    },

    /**
     * Move a region, keeping its length. `startBar` is clamped into the free run around the
     * requested bar, so a drag stops against its neighbour instead of snapping back. A move
     * to a lane with no room for it is refused and the region is returned unchanged.
     */
    move(id, { laneId = null, startBar = null } = {}) {
      const r = regions.get(id);
      if (!r) return null;
      const lane = laneId === null ? r.laneId : laneId;
      const want = startBar === null ? r.startBar : clampInt(startBar, 1, r.startBar);

      const gap = gapAround(lane, want, r.id);
      const room = gap.to - gap.from;
      if (room < r.lengthBars) return r;

      const s = Math.max(gap.from, Math.min(want, gap.to - r.lengthBars));
      if (s === r.startBar && lane === r.laneId) return r;
      return commit({ ...r, laneId: lane, startBar: s }, 'update');
    },

    /**
     * Resize by either edge. Pass `startBar` to drag the left edge (the right edge holds
     * still), `lengthBars` to drag the right. Both clamp against the neighbouring regions
     * and against a one-bar minimum.
     */
    resize(id, { startBar = null, lengthBars = null } = {}) {
      const r = regions.get(id);
      if (!r) return null;
      const others = laneRegions(r.laneId, r.id);
      const floor = others.reduce((m, o) => (endBar(o) <= r.startBar ? Math.max(m, endBar(o)) : m), 1);
      const ceiling = others.reduce((m, o) => (o.startBar >= endBar(r) ? Math.min(m, o.startBar) : m), Infinity);

      let s = r.startBar;
      let len = r.lengthBars;

      if (startBar !== null) {
        const right = endBar(r);
        s = Math.max(floor, Math.min(clampInt(startBar, 1, s), right - MIN_LENGTH_BARS));
        len = right - s;
      }
      if (lengthBars !== null) {
        const maxLen = ceiling === Infinity ? Infinity : ceiling - s;
        len = Math.min(clampInt(lengthBars, MIN_LENGTH_BARS, len), maxLen);
      }

      if (s === r.startBar && len === r.lengthBars) return r;
      return commit({ ...r, startBar: s, lengthBars: len }, 'update');
    },

    /** Replace a region's payload. Stored as given; never inspected. */
    setNotes(id, notes) {
      const r = regions.get(id);
      if (!r) return null;
      return commit({ ...r, notes: copyNotes(notes) }, 'update');
    },

    /** Append to a region's payload. Array-append only — a region whose notes are a
     *  pattern object (a step grid's save) has nothing appendable and is left alone. */
    addNotes(id, notes) {
      const r = regions.get(id);
      if (!r) return null;
      const add = Array.isArray(notes) ? notes : [];
      if (!add.length) return r;
      const base = Array.isArray(r.notes) ? r.notes : [];
      return commit({ ...r, notes: [...base, ...add] }, 'update');
    },

    /** Non-geometry fields only — `name`, `color`, `muted`. Placement goes through
     *  `move`/`resize` so nothing can sidestep the overlap rule. */
    update(id, patch = {}) {
      const r = regions.get(id);
      if (!r) return null;
      const next = { ...r };
      if ('name' in patch) next.name = patch.name;
      if ('color' in patch) next.color = patch.color;
      if ('muted' in patch) next.muted = Boolean(patch.muted);
      return commit(next, 'update');
    },

    /** An independent copy, placed at `startBar` on `laneId`. Notes are copied, not shared —
     *  editing the copy leaves the original alone. Returns null if the span is occupied. */
    duplicate(id, { laneId = null, startBar = null } = {}) {
      const r = regions.get(id);
      if (!r) return null;
      return this.add({
        laneId: laneId === null ? r.laneId : laneId,
        startBar: startBar === null ? endBar(r) : startBar,
        lengthBars: r.lengthBars,
        name: r.name,
        color: r.color,
        muted: r.muted,
        notes: r.notes,
      });
    },

    // ——— persistence ——————————————————————————————————————————————————————————————————
    /** Plain JSON, safe to stringify. */
    serialize() {
      return this.all.map((r) => ({ ...r, notes: copyNotes(r.notes) }));
    },

    /** Replaces everything. Ids are kept so a saved project reopens with the same handles.
     *  Fires one 'change' rather than one per region. */
    load(list = []) {
      regions.clear();
      for (const raw of Array.isArray(list) ? list : []) {
        if (!raw || raw.laneId === undefined) continue;
        const id = raw.id || nextId();
        _seq = Math.max(_seq, Number(String(id).replace(/^r/, '')) || 0);
        regions.set(id, freeze({
          id,
          laneId: raw.laneId,
          startBar: clampInt(raw.startBar, 1, 1),
          lengthBars: clampInt(raw.lengthBars, MIN_LENGTH_BARS, MIN_LENGTH_BARS),
          name: raw.name ?? null,
          color: raw.color ?? null,
          muted: Boolean(raw.muted),
          notes: copyNotes(raw.notes),
        }));
      }
      emit('change', { event: 'load', region: null });
      return regions.size;
    },

    // ——— introspection, for views and for the done-checks ——————————————————————————————
    get listenerCount() {
      return EVENTS.reduce((n, name) => n + listeners[name].size, 0);
    },

    /** Drops every subscription. The regions themselves are left alone — a store that is
     *  disposed and re-subscribed still holds the same arrangement. */
    dispose() {
      let listenersDropped = 0;
      for (const name of EVENTS) {
        listenersDropped += listeners[name].size;
        listeners[name].clear();
      }
      return { listenersDropped, regionsHeld: regions.size };
    },
  };
}

// -----------------------------------------------------------------------------------------
// 3 · THE SHARED INSTANCE
// -----------------------------------------------------------------------------------------
/** The store the DAW page gets for free, so the timeline and the editor are looking at one
 *  arrangement without the page wiring anything. A test or a second timeline calls
 *  `createRegionStore()` and passes the result in. */
export const regions = createRegionStore();

export default regions;
