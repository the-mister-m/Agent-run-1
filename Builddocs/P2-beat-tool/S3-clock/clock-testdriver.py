"""
clock seat (P2/S3) verification driver.

Serves the project root over http (§10: never assume file://) and runs the seat questions
in Builddocs/P2-beat-tool/S3-clock/clock-testpage.html against the real /src/core/clock.js
and /src/core/audio.js. Same browser, same host, same standard as recon-scheduler's
harnesses in S2-recon/recon-scratch/ — real Google Chrome, headless, no audio device.

Usage:  python3 clock-testdriver.py fast     # Q2,Q3,Q5,Q6,Q7,Q8   (~30 s)
        python3 clock-testdriver.py loop     # Q4, 100 loop passes (~3.5 min)
        python3 clock-testdriver.py hold     # the 5-minute DONE-CHECK
"""
import sys, json, os, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PORT = 8893
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PAGE = ("http://127.0.0.1:%d/Builddocs/P2-beat-tool/S3-clock/clock-testpage.html" % PORT)

BATCHES = {
    "fast": ["__q2()", "__q3()", "__q5()", "__q6()", "__q7()", "__q8()"],
    "loop": ["__q4(100)"],
    "hold": ["__q9(5)"],
}


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    batch = sys.argv[1] if len(sys.argv) > 1 else "fast"
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
            page.goto(PAGE)
            page.wait_for_function("window.__ready === true")
            print("ctx state after unlock:", page.evaluate("window.__unlock()"))
            for call in calls:
                print("\n=== %s ===" % call, flush=True)
                r = page.evaluate("window.%s" % call)
                results.append(r)
                print("%-60s %s" % (r["name"], "PASS" if r["pass"] else "FAIL"))
                for line in r["lines"]:
                    print("   " + line)
            browser.close()
    finally:
        httpd.shutdown()

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "clock-testresults-%s.json" % batch)
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    failed = [r["name"] for r in results if not r["pass"]]
    print("\n%d/%d passed. %s" % (len(results) - len(failed), len(results),
                                  ("FAILED: " + ", ".join(failed)) if failed else "All green."))
    print("wrote", out)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
