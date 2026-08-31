"""
recon-scheduler Q4 harness: how far ahead can events be committed before a BPM change
feels laggy? Builds the exact scheduler shape CONTRACTS §3 specifies (setInterval(25),
100ms lookahead, PPQ 480), runs it, applies a BPM change at a random phase mid-stream,
and measures the real gap between the BPM write and the first scheduled AudioContext
event whose start time reflects the new tempo. This is the actual commit-latency number,
not a guess — it is architecturally bounded by the lookahead window, and this confirms
that bound empirically rather than assuming it.
"""
import json, random
from playwright.sync_api import sync_playwright

PAGE = """
<!doctype html><html><body>
<script>
window.__runTrial = async (lookaheadMs, intervalMs, changeAtMs) => {
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const PPQ = 480;
  let bpm = 120;
  let secPerTick = () => 60 / bpm / PPQ;
  const stepTicks = PPQ / 4; // 16th notes

  let nextTick = 0;
  let nextTime = ctx.currentTime + 0.05; // small start offset
  const scheduledEvents = []; // {tick, time, bpmUsed}
  let bpmChangedAt = null;
  let bpmChangeWallTime = null;

  const startWall = performance.now();
  let done = false;

  function pass() {
    const now = performance.now();
    if (!bpmChangedAt && now - startWall >= changeAtMs) {
      bpm = 200; // student drags slider 120 -> 200
      bpmChangedAt = ctx.currentTime;      // AudioContext-time of the change
      bpmChangeWallTime = now;
    }
    const windowEnd = ctx.currentTime + lookaheadMs/1000;
    while (nextTime < windowEnd) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(ctx.destination);
      osc.start(nextTime);
      osc.stop(nextTime + 0.01);
      scheduledEvents.push({tick: nextTick, time: nextTime, bpmUsed: bpm});
      nextTick += stepTicks;
      nextTime += secPerTick() * stepTicks;
    }
  }

  return new Promise(resolve => {
    const id = setInterval(() => {
      pass();
      if (performance.now() - startWall >= changeAtMs + 400) {
        clearInterval(id);
        // find first event scheduled with the NEW bpm (200), and its time vs the change point
        const firstNew = scheduledEvents.find(e => e.bpmUsed === 200);
        const result = {
          bpmChangeAudioTime: bpmChangedAt,
          firstNewTempoEventTime: firstNew ? firstNew.time : null,
          commitLatencySec: firstNew ? (firstNew.time - bpmChangedAt) : null,
          totalEventsScheduled: scheduledEvents.length,
        };
        ctx.close();
        resolve(result);
      }
    }, intervalMs);
  });
};
</script>
</body></html>
"""

def main():
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless=True)
        page = browser.new_page()
        page.set_content(PAGE)
        # random phase offsets so the BPM change lands at different points in the pass cycle
        random.seed(42)
        offsets = [300 + random.randint(0, 24) for _ in range(15)]
        for off in offsets:
            r = page.evaluate(f"window.__runTrial(100, 25, {off})")
            results.append(r)
            print(f"changeAtMs={off}: commit latency = {r['commitLatencySec']*1000:.1f} ms" if r['commitLatencySec'] is not None else f"changeAtMs={off}: no new-tempo event captured")
        browser.close()

    latencies_ms = [r['commitLatencySec']*1000 for r in results if r['commitLatencySec'] is not None]
    summary = {
        "trials": len(results),
        "min_ms": round(min(latencies_ms),1) if latencies_ms else None,
        "max_ms": round(max(latencies_ms),1) if latencies_ms else None,
        "mean_ms": round(sum(latencies_ms)/len(latencies_ms),1) if latencies_ms else None,
        "raw": results,
    }
    out = "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S2-recon/recon-scratch/results_q4_tempo.json"
    with open(out, "w") as f:
        json.dump(summary, f, indent=2)
    print(json.dumps({k:v for k,v in summary.items() if k!='raw'}, indent=2))
    print("Wrote", out)

if __name__ == "__main__":
    main()
