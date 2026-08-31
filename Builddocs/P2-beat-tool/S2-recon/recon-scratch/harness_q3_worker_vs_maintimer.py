"""
recon-scheduler Q3 harness, part 2: does moving the tick off the main thread (a Worker)
behave differently from setInterval when the MAIN THREAD is synchronously blocked?
This is the actual architectural question — not raw idle jitter (already measured in
harness_q1_q3.py, and a worker was NOT better idle: p95 28.52ms vs setInterval's 26.1ms).

Method: burn synthetic main-thread work (busy-wait) of fixed durations inside the pass
callback, same load shape as P0's t1/t2 (findings-webaudio.md Q1). Compare:
  (a) setInterval(25) — pass work runs INSIDE the timer callback, on the main thread.
  (b) Worker(setInterval 25) posting ticks — the worker keeps ticking on its own thread
      regardless of the main thread; the SAME synthetic pass work runs in the main-thread
      onmessage handler, so the work still has to land on the (blocked) main thread.
Records: interval between actual pass executions, and whether messages queue up and
fire in a burst once the main thread frees (a real behavioral difference from setInterval,
which Chrome coalesces/reschedules rather than bursts).
"""
import json
from playwright.sync_api import sync_playwright

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGE = """
<!doctype html><html><body>
<script>
function burn(ms) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) { /* busy wait, simulates DSP/layout work */ }
}

window.__runIntervalUnderLoad = (blockMs, totalMs) => {
  return new Promise(resolve => {
    const gaps = [];
    let last = performance.now();
    const t0 = last;
    const id = setInterval(() => {
      const fireTime = performance.now();
      gaps.push(fireTime - last);
      last = fireTime;
      burn(blockMs);
      if (performance.now() - t0 >= totalMs) { clearInterval(id); resolve(gaps); }
    }, 25);
  });
};

window.__runWorkerUnderLoad = (blockMs, totalMs) => {
  return new Promise(resolve => {
    const code = `setInterval(() => postMessage(performance.now()), 25);`;
    const blob = new Blob([code], {type:'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));
    const gaps = [];
    const burstSizes = [];
    let last = null;
    let pendingBatch = 0;
    const t0 = performance.now();
    let processing = false;
    const queue = [];
    worker.onmessage = (e) => {
      queue.push(e.data);
      if (processing) return;
      processing = true;
      // drain queue synchronously (simulates: main thread was blocked, now catches up)
      while (queue.length) {
        const nominalFireTime = queue.shift();
        const processedAt = performance.now();
        if (last !== null) gaps.push(processedAt - last);
        last = processedAt;
        burn(blockMs);
      }
      processing = false;
      if (performance.now() - t0 >= totalMs) { worker.terminate(); resolve(gaps); }
    };
  });
};
</script>
</body></html>
"""

def summarize(gaps):
    if not gaps: return {}
    g = sorted(gaps)
    n = len(g)
    def pct(p):
        k=(n-1)*p; f=int(k); c=min(f+1,n-1)
        return g[f] if f==c else g[f]+(g[c]-g[f])*(k-f)
    late = [x for x in gaps if x > 30]  # more than 5ms over nominal 25ms = "late"
    return {"n": n, "p50": round(pct(0.5),1), "p95": round(pct(0.95),1),
            "max": round(max(g),1), "late_count_over_30ms": len(late)}

def main():
    results = {"setInterval": {}, "worker": {}}
    loads = [0, 50, 100, 150, 250]
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        page = browser.new_page()
        page.set_content(PAGE)
        for load in loads:
            print(f"setInterval, block={load}ms per pass...")
            gaps = page.evaluate(f"window.__runIntervalUnderLoad({load}, 3000)")
            results["setInterval"][str(load)] = summarize(gaps)
            print(results["setInterval"][str(load)])
        for load in loads:
            print(f"worker-driven, block={load}ms per pass (work still runs on main thread)...")
            gaps = page.evaluate(f"window.__runWorkerUnderLoad({load}, 3000)")
            results["worker"][str(load)] = summarize(gaps)
            print(results["worker"][str(load)])
        browser.close()

    out = "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S2-recon/recon-scratch/results_q3_worker_vs_main.json"
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print("Wrote", out)

if __name__ == "__main__":
    main()
