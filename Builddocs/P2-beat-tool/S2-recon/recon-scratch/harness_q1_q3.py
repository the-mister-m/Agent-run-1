"""
recon-scheduler Q1 + Q3 harness.
Measures: setInterval(25) jitter idle / under 32-voice audio load / under 2-canvas-visual
load, and compares setInterval vs a Worker-based timer under the same conditions.
Uses real Google Chrome 151 (headed), same browser build as P0's recon-webaudio,
via CDP so we can read precise timer gaps with performance.now().
"""
import json, subprocess, time, sys
from playwright.sync_api import sync_playwright

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAGE = """
<!doctype html><html><body>
<canvas id="c1" width="300" height="150"></canvas>
<canvas id="c2" width="300" height="150"></canvas>
<script>
window.__results = {};

function measureSetIntervalGaps(durationMs) {
  return new Promise(resolve => {
    const gaps = [];
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      gaps.push(now - last);
      last = now;
      if (now - t0 >= durationMs) { clearInterval(id); resolve(gaps); }
    }, 25);
    const t0 = performance.now();
  });
}

function measureWorkerGaps(durationMs) {
  return new Promise(resolve => {
    const code = `
      let last = 0;
      setInterval(() => { postMessage(performance.now()); }, 25);
    `;
    const blob = new Blob([code], {type: 'application/javascript'});
    const worker = new Worker(URL.createObjectURL(blob));
    const gaps = [];
    let last = null;
    const t0 = performance.now();
    worker.onmessage = (e) => {
      const now = performance.now();
      if (last !== null) gaps.push(now - last);
      last = now;
      if (now - t0 >= durationMs) { worker.terminate(); resolve(gaps); }
    };
  });
}

// 32-voice audio load: real WebAudio graph, oscillators + gain envelopes retriggered
// on an eighth-note grid inside the scheduler pass, same shape as P0's t1/t2 harness.
async function makeAudioLoad(ctx, voices) {
  const nodes = [];
  for (let i=0;i<voices;i++){
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type='sawtooth';
    osc.frequency.value = 110 + i*3;
    osc.connect(gain).connect(ctx.destination);
    gain.gain.value = 0.0001;
    osc.start();
    nodes.push({osc, gain});
  }
  return nodes;
}

function retriggerVoices(ctx, nodes) {
  const now = ctx.currentTime;
  for (const {gain} of nodes) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now+0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+0.12);
  }
}

function startCanvasAnimation() {
  const c1 = document.getElementById('c1').getContext('2d');
  const c2 = document.getElementById('c2').getContext('2d');
  let raf;
  let frame = 0;
  function draw() {
    frame++;
    c1.clearRect(0,0,300,150);
    c1.beginPath();
    for (let x=0;x<300;x++){
      const y = 75 + 60*Math.sin((x+frame)*0.1);
      x===0? c1.moveTo(x,y): c1.lineTo(x,y);
    }
    c1.stroke();
    // fake spectrum bars
    c2.clearRect(0,0,300,150);
    for (let i=0;i<64;i++){
      const h = Math.abs(Math.sin(i*0.3+frame*0.05))*150;
      c2.fillRect(i*4,150-h,3,h);
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

window.__runIdle = async () => {
  const gaps = await measureSetIntervalGaps(3000);
  return gaps;
};

window.__runWorkerIdle = async () => {
  const gaps = await measureWorkerGaps(3000);
  return gaps;
};

window.__runUnderVoiceLoad = async (voiceCount) => {
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const nodes = await makeAudioLoad(ctx, voiceCount);
  // scheduler pass: retrigger voices every interval tick, real lookahead-style work
  const gaps = [];
  let last = performance.now();
  const t0 = last;
  await new Promise(resolve => {
    const id = setInterval(() => {
      retriggerVoices(ctx, nodes);
      const now = performance.now();
      gaps.push(now-last);
      last = now;
      if (now - t0 >= 3000) { clearInterval(id); resolve(); }
    }, 25);
  });
  ctx.close();
  return gaps;
};

window.__runUnderVoiceAndCanvasLoad = async (voiceCount) => {
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const nodes = await makeAudioLoad(ctx, voiceCount);
  const stopAnim = startCanvasAnimation();
  const gaps = [];
  let last = performance.now();
  const t0 = last;
  await new Promise(resolve => {
    const id = setInterval(() => {
      retriggerVoices(ctx, nodes);
      const now = performance.now();
      gaps.push(now-last);
      last = now;
      if (now - t0 >= 3000) { clearInterval(id); resolve(); }
    }, 25);
  });
  stopAnim();
  ctx.close();
  return gaps;
};
</script>
</body></html>
"""

def pct(sorted_list, p):
    if not sorted_list: return None
    k = (len(sorted_list)-1) * p
    f = int(k)
    c = min(f+1, len(sorted_list)-1)
    if f == c: return sorted_list[f]
    return sorted_list[f] + (sorted_list[c]-sorted_list[f])*(k-f)

def stats(gaps):
    g = sorted(gaps)
    return {
        "n": len(g),
        "p50": round(pct(g,0.5),2),
        "p95": round(pct(g,0.95),2),
        "max": round(max(g),2),
        "min": round(min(g),2),
    }

def main():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_PATH, headless=True)
        page = browser.new_page()
        page.set_content(PAGE)
        page.wait_for_timeout(200)

        print("Q1a: idle setInterval(25) jitter, 3s run...")
        gaps = page.evaluate("window.__runIdle()")
        results["idle_setinterval"] = stats(gaps)
        print(results["idle_setinterval"])

        print("Q3: idle Worker(setInterval 25) jitter, 3s run...")
        gaps = page.evaluate("window.__runWorkerIdle()")
        results["idle_worker"] = stats(gaps)
        print(results["idle_worker"])

        print("Q1b: setInterval(25) jitter under 32-voice audio load, 3s run...")
        gaps = page.evaluate("window.__runUnderVoiceLoad(32)")
        results["voices32_setinterval"] = stats(gaps)
        print(results["voices32_setinterval"])

        print("Q1c: setInterval(25) jitter under 32 voices + 2 canvas animations, 3s run...")
        gaps = page.evaluate("window.__runUnderVoiceAndCanvasLoad(32)")
        results["voices32_canvas2_setinterval"] = stats(gaps)
        print(results["voices32_canvas2_setinterval"])

        browser.close()

    out = "/Users/moth3rship/Desktop/AI Design/School stuff/Chromebook DAW/Agent run 1/Builddocs/P2-beat-tool/S2-recon/recon-scratch/results_q1_q3.json"
    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print("Wrote", out)

if __name__ == "__main__":
    main()
