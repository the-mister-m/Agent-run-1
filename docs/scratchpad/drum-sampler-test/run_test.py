"""
run_test.py — drum-sampler (P2/S4) DONE-CHECK harness. Real Chrome, real decodeAudioData,
served over http (fetch() is blocked by CORS on file://, same reason recon's harnesses use
a server — see harness_q6_kit_cost.py). Drives docs/scratchpad/drum-sampler-test/
test_page.html, which imports the real /src/instruments/drum-sampler.js and
/src/core/audio.js modules unmodified — this is not a mock, it is the shipped file.
"""
import json, http.server, threading, socketserver, os, sys
from playwright.sync_api import sync_playwright

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 8893


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


def main():
    os.chdir(REPO_ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), QuietHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    result = None
    console_errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
            page = browser.new_page()
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda exc: console_errors.append(f"pageerror: {exc}"))
            page.goto(f"http://127.0.0.1:{PORT}/docs/scratchpad/drum-sampler-test/test_page.html")
            result = page.evaluate("window.__runDoneCheck()")
            browser.close()
    finally:
        httpd.shutdown()

    print(json.dumps(result, indent=2))
    print("\n--- console errors captured ---")
    for c in console_errors:
        print(" ", c)

    out = os.path.join(os.path.dirname(__file__), "results.json")
    with open(out, "w") as f:
        json.dump({"result": result, "consoleErrors": console_errors}, f, indent=2)
    print("\nWrote", out)

    if not result or not result.get("allPassed"):
        sys.exit(1)


if __name__ == "__main__":
    main()
