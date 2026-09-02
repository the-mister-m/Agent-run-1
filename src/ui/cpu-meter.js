/**
 * P4 governor meter. Wraps `ui/shell.js`'s `createCpuMeter` (load bar, voice count,
 * `noCap` checkbox, audio-state/unlock) and adds the P4 breakdown: graph nodes, the
 * busiest channel's inserts and sends, and the graph's last refusal. `noCap` persists
 * across reload. §16.8 / §8.
 */

import { governor } from '../core/audio.js';
import { createCpuMeter as createBaseMeter, acquireShellStyle, releaseShellStyle } from './shell.js';
import { CAP_NODES, CAP_INSERTS, CAP_SENDS } from '../mixer/graph.js';

const STORE_KEY = 'cbdaw.governor.noCap';
const WALK_LIMIT = 32; // matches graph.js's own chain-walk safety bound
const STYLE_ID = 'cbdaw-gov-style';

const STYLE_TEXT = `
.cbdaw-gov { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-6); }
.cbdaw-gov__breakdown { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-5); font-size: var(--fs-sm); color: var(--text-dim); }
.cbdaw-gov__stat { display: var(--disp-flex); align-items: var(--align-center); gap: var(--sp-2); }
.cbdaw-gov__stat-value { color: var(--text); font-variant-numeric: var(--num-tabular); }
.cbdaw-gov__stat[data-hot="true"] .cbdaw-gov__stat-value { color: var(--meter-hot); font-weight: var(--w-bold); }
.cbdaw-gov__stat[data-nocap="true"] .cbdaw-gov__stat-value { color: var(--text-dim); }
.cbdaw-gov__refusal {
  display: none;
  color: var(--warn);
  font-size: var(--fs-sm);
  border: var(--bw) solid var(--edge-refused);
  border-radius: var(--r-sm);
  padding: var(--sp-1) var(--sp-3);
}
.cbdaw-gov__refusal[data-visible="true"] { display: var(--disp-flex); }
`;

let styleRefs = 0;

function acquireGovStyle() {
  styleRefs++;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

function releaseGovStyle() {
  styleRefs = Math.max(0, styleRefs - 1);
  if (styleRefs > 0) return;
  document.getElementById(STYLE_ID)?.remove();
}

/** Reads persisted `noCap`. A guest-mode Chromebook can throw on localStorage access. */
function loadNoCap() {
  try {
    return localStorage.getItem(STORE_KEY) === '1';
  } catch (err) {
    return false;
  }
}

/** Persists `noCap`. Silent on quota or access failure. */
function saveNoCap(value) {
  try {
    localStorage.setItem(STORE_KEY, value ? '1' : '0');
  } catch (err) {
    /* no persistence available */
  }
}

/**
 * Applies the persisted `noCap` to the live governor. Exported standalone so it can run
 * before any `createCpuMeter()` call anywhere in the app reads `governor.noCap`.
 */
export function restoreNoCap() {
  governor.noCap = loadNoCap();
  return governor.noCap;
}

/** Insert-chain length off a channel node, following the port-0 chain. Mirrors graph.js's
 * own `_serialChain` using only the graph's public `nodes`/`edges`. */
function insertChainLength(nodes, edges, channelId) {
  let cursor = channelId;
  let n = 0;
  for (let i = 0; i < WALK_LIMIT; i++) {
    const edge = edges.find((e) => e.from === cursor && e.toPort === 0);
    if (!edge) break;
    const next = nodes.get(edge.to);
    if (!next || next.type !== 'insert') break;
    n++;
    cursor = next.id;
  }
  return n;
}

/** Sends leaving a channel node directly — edges with `fromPort > 0`, per graph.js's own
 * `connect()` cap check. */
function sendCount(edges, channelId) {
  return edges.filter((e) => e.from === channelId && e.fromPort > 0).length;
}

/** Busiest-channel inserts/sends plus the total node count, from one graph snapshot. */
function readGraph(graph) {
  const nodes = graph.nodes instanceof Map ? graph.nodes : new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = graph.edges;
  let maxInserts = 0;
  let maxSends = 0;
  for (const n of nodes.values()) {
    if (n.type !== 'channel') continue;
    maxInserts = Math.max(maxInserts, insertChainLength(nodes, edges, n.id));
    maxSends = Math.max(maxSends, sendCount(edges, n.id));
  }
  return { nodeCount: graph.nodeCount, maxInserts, maxSends };
}

function statEl(root, name) {
  return {
    stat: root.querySelector(`[data-stat="${name}"]`),
    value: root.querySelector(`[data-stat="${name}"] [data-stat-value]`),
  };
}

/**
 * The transport-bar governor meter. `graph` is optional and duck-typed (§16.9 bind
 * shape): unbound, the breakdown reads as "—" and only the wrapped base meter is live.
 */
export function createGovernorMeter({ instrument = null, graph = null } = {}) {
  restoreNoCap();
  acquireShellStyle();
  acquireGovStyle();

  const base = createBaseMeter({ instrument });

  const root = document.createElement('div');
  root.className = 'cbdaw-gov';
  root.innerHTML = `
    <div class="cbdaw-gov__breakdown">
      <span class="cbdaw-gov__stat" data-stat="nodes" title="mixer graph nodes / CAP_NODES">
        nodes <span class="cbdaw-gov__stat-value" data-stat-value>—/${CAP_NODES}</span>
      </span>
      <span class="cbdaw-gov__stat" data-stat="inserts" title="busiest channel's inserts / CAP_INSERTS">
        inserts <span class="cbdaw-gov__stat-value" data-stat-value>—/${CAP_INSERTS}</span>
      </span>
      <span class="cbdaw-gov__stat" data-stat="sends" title="busiest channel's sends / CAP_SENDS">
        sends <span class="cbdaw-gov__stat-value" data-stat-value>—/${CAP_SENDS}</span>
      </span>
    </div>
    <div class="cbdaw-gov__refusal" data-refusal></div>
  `;
  root.insertBefore(base.el, root.firstChild);

  const nodesStat = statEl(root, 'nodes');
  const insertsStat = statEl(root, 'inserts');
  const sendsStat = statEl(root, 'sends');
  const refusalEl = root.querySelector('[data-refusal]');

  function paint(name, elPair, count, cap) {
    const noCap = governor.noCap;
    elPair.value.textContent = noCap ? `${count}/∞` : `${count}/${cap}`;
    elPair.stat.dataset.hot = String(!noCap && count >= cap);
    elPair.stat.dataset.nocap = String(noCap);
  }

  function recalc() {
    if (!graph) return;
    const { nodeCount, maxInserts, maxSends } = readGraph(graph);
    paint('nodes', nodesStat, nodeCount, CAP_NODES);
    paint('inserts', insertsStat, maxInserts, CAP_INSERTS);
    paint('sends', sendsStat, maxSends, CAP_SENDS);
  }

  function showRefusal({ reason }) {
    refusalEl.textContent = reason;
    refusalEl.dataset.visible = 'true';
  }

  function clearRefusal() {
    refusalEl.dataset.visible = 'false';
  }

  const noCapInput = root.querySelector('[data-nocap]');
  noCapInput.addEventListener('change', () => {
    saveNoCap(governor.noCap);
    recalc();
  });

  // graph.js's `on(event, fn)` returns `this`, not an unsubscribe — pair every `on` with
  // the matching `off(event, fn)` using the same function reference.
  const onChange = () => {
    clearRefusal();
    recalc();
  };
  let boundGraph = null;

  function bindGraph(nextGraph) {
    unbindGraph();
    graph = nextGraph;
    boundGraph = nextGraph;
    boundGraph.on('change', onChange);
    boundGraph.on('refused', showRefusal);
    recalc();
    return api;
  }

  function unbindGraph() {
    boundGraph?.off('change', onChange);
    boundGraph?.off('refused', showRefusal);
    boundGraph = null;
    graph = null;
  }

  const api = {
    el: root,
    bindGraph,
    unbindGraph,
    /** Frames drawn by the wrapped base meter — teardown proof, same shape as shell.js. */
    get frameCount() {
      return base.frameCount;
    },
    dispose() {
      unbindGraph();
      const dropped = base.dispose();
      root.remove();
      releaseGovStyle();
      releaseShellStyle();
      return dropped;
    },
  };

  if (graph) bindGraph(graph);
  else recalc();

  return api;
}
