"""
recon-scheduler Q2 harness: what happens to the scheduler when the tab is backgrounded.
P0's recon-webaudio tried this and could not reproduce it under automation (both
bring_to_front() switching and CDP Page.setWebLifecycleState('frozen') failed to move
document.visibilityState off "visible"). This harness re-attempts with headed real
Chrome (not headless) and two real windows, to see if genuine OS-level focus loss
reproduces the throttle P0 couldn't get.
"""
import json, time
from playwright.sync_api import sync_playwright

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGE = """
<!doctype html><html><body><h1>page A - scheduler under test</h1>
<script>
window.__log = [];
window.__vis = [];
document.addEventListener('visibilitychange', () => {
  window.__vis.push({t: performance.now(), state: document.visibilityState});
});
window.__start = () => {
  window.__log = [];
  let last = performance.now();
  const t0 = last;
  window.__id = setInterval(() => {
    const now = performance.now();
    window.__log.push(now - last);
    last = now;
  }, 25);
  window.__t0 = t0;
};
window.__stop = () => { clearInterval(window.__id); return {log: window.__log, vis: window.__vis}; };
</script>
</body></html>
"""

PAGE_B = "<!doctype html><html><body><h1>page B - grabs focus</h1></body></html>"

def main():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=False,
                                     args=["--window-position=0,0", "--window-size=400,300"])
        ctx = browser.new_context(viewport={"width":400,"height":300})
        pageA = ctx.new_page()
        pageA.set_content(PAGE)
        pageA.evaluate("window.__start()")
        pageA.wait_for_timeout(500)

        print("visibilityState right after A starts, A focused:", pageA.evaluate("document.visibilityState"))

        # open page B as a second TAB in the same context/window — this is the
        # realistic classroom case: a student switches tabs, not windows.
        pageB = ctx.new_page()
        pageB.set_content(PAGE_B)
        pageB.bring_to_front()
        print("brought B to front, waiting 4s with A backgrounded...")
        pageB.wait_for_timeout(4000)

        vis_during = pageA.evaluate("document.visibilityState")
        print("A's visibilityState while B focused:", vis_during)

        # bring A back
        pageA.bring_to_front()
        pageA.wait_for_timeout(500)
        result = pageA.evaluate("window.__stop()")
        results["twowindow_attempt"] = {
            "visibilityState_while_B_focused": vis_during,
            "gap_stats_ms": result["log"][:5] + ["...", ] + result["log"][-5:] if len(result["log"])>10 else result["log"],
            "gap_max": max(result["log"]) if result["log"] else None,
            "gap_count": len(result["log"]),
            "visibilitychange_events": result["vis"],
        }
        print(json.dumps(results["twowindow_attempt"], indent=2))

        browser.close()

    out = "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S2-recon/recon-scratch/results_q2.json"
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print("Wrote", out)

if __name__ == "__main__":
    main()
