"""
Repair seat (P2/S6) verification driver for the clock.js fixes.

Same shape, same browser, same standard as the `clock` seat's own
Builddocs/P2-beat-tool/S3-clock/clock-testdriver.py — real Google Chrome, headless, the
project root served over http (§10: never assume file://), real AudioContext.

Usage:  python3 fix-clock-testdriver.py fix     # bugs A + B and the seam/drift regressions
        python3 fix-clock-testdriver.py hold    # the 5-minute A-clock.md DONE-CHECK
"""
import sys, json, os, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PORT = 8894
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE = "http://127.0.0.1:%d/Builddocs/P2-beat-tool/S6-shell/fix-clock-testpage.html" % PORT

BATCHES = {
    "fix": ["__b2Loop()", "__b2Record()", "__b1Seam()", "__b1Gate()",
            "__regLoopSeam(40)", "__regDrift()", "__aLoad()"],
    "hold": ["__regHold(5)"],
    "redo": ["__regDrift()", "__aLoad()"],
}


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    batch = sys.argv[1] if len(sys.argv) > 1 else "fix"
    calls = BATCHES[batch]
    httpd = serve()
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROME,
                headless=True,
                args=["--autoplay-policy=no-user-gesture-required"],
            )
            page = browser.new_page()
            page.set_default_timeout(0)
            page.on("console", lambda m: print("  [console:%s] %s" % (m.type, m.text)))
            page.on("pageerror", lambda e: print("  [PAGEERROR] %s" % e))
            for call in calls:
                # Fresh document per probe: one AudioContext, one clock module instance,
                # no state carried in from the probe before it. The first run of this
                # driver reused one page and Chrome's renderer died partway through —
                # isolating each probe removes that as a variable entirely.
                # Cache-bust: the page and clock.js are edited between runs and Chrome
                # was observed answering 304 for them across reloads.
                page.goto("%s?probe=%d" % (PAGE, len(results)))
                page.wait_for_function("window.__ready === true")
                print("\n=== %s ===  (ctx %s)" % (call, page.evaluate("window.__unlock()")),
                      flush=True)
                r = page.evaluate("window.%s" % call)
                results.append(r)
                print("%-64s %s" % (r["name"], "PASS" if r["pass"] else "FAIL"))
                for line in r["lines"]:
                    print("    " + line)
            browser.close()
    finally:
        httpd.shutdown()

    out = os.path.join(os.path.dirname(__file__), "fix-clock-results-%s.json" % batch)
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    bad = [r["name"] for r in results if not r["pass"]]
    print("\n--- %d/%d PASS ---" % (len(results) - len(bad), len(results)))
    for b in bad:
        print("FAILED: " + b)
    print("results -> " + out)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
