"""
Generates 8 synthetic drum-kit WAV files (real 16-bit PCM, hand-written header —
same no-library technique P0's recon-webaudio verified for §7's render path) standing
in for an 8-piece kit's samples, so decode/trigger cost can be measured on real files.
Durations chosen to resemble typical short percussion one-shots.
"""
import struct, math, random, os

SR = 44100
OUTDIR = os.path.join(os.path.dirname(__file__), "kit_samples")
os.makedirs(OUTDIR, exist_ok=True)

def write_wav(path, duration_s, gen_sample):
    n = int(SR * duration_s)
    data = bytearray()
    for i in range(n):
        s = gen_sample(i, n)
        s = max(-1.0, min(1.0, s))
        data += struct.pack('<h', int(s * 32767))
    byte_rate = SR * 2
    block_align = 2
    with open(path, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(data)))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, SR, byte_rate, block_align, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(data)))
        f.write(data)
    return n

random.seed(1)

def kick(i, n):
    t = i / SR
    env = math.exp(-t * 18)
    freq = 60 * math.exp(-t*10) + 40
    return math.sin(2*math.pi*freq*t) * env

def snare(i, n):
    t = i / SR
    env = math.exp(-t * 14)
    tone = math.sin(2*math.pi*180*t) * 0.4
    noise = (random.random()*2-1) * 0.8
    return (tone + noise) * env

def hihat_closed(i, n):
    t = i / SR
    env = math.exp(-t * 60)
    noise = (random.random()*2-1)
    return noise * env

def hihat_open(i, n):
    t = i / SR
    env = math.exp(-t * 6)
    noise = (random.random()*2-1)
    return noise * env

def clap(i, n):
    t = i / SR
    env = math.exp(-((t-0.01)**2)/0.0004) + math.exp(-t*10)*0.3
    noise = (random.random()*2-1)
    return noise * env * 0.8

def tom(freq):
    def f(i, n):
        t = i / SR
        env = math.exp(-t * 8)
        return math.sin(2*math.pi*freq*t) * env
    return f

def rim(i, n):
    t = i / SR
    env = math.exp(-t * 80)
    return math.sin(2*math.pi*900*t) * env

pieces = [
    ("01_kick.wav", 0.35, kick),
    ("02_snare.wav", 0.22, snare),
    ("03_hihat_closed.wav", 0.06, hihat_closed),
    ("04_hihat_open.wav", 0.45, hihat_open),
    ("05_clap.wav", 0.18, clap),
    ("06_tom_low.wav", 0.28, tom(110)),
    ("07_tom_high.wav", 0.24, tom(180)),
    ("08_rim.wav", 0.05, rim),
]

manifest = []
for fname, dur, gen in pieces:
    path = os.path.join(OUTDIR, fname)
    n = write_wav(path, dur, gen)
    size = os.path.getsize(path)
    manifest.append({"file": fname, "duration_s": dur, "frames": n, "bytes_on_disk": size})
    print(fname, dur, "s,", size, "bytes")

import json
with open(os.path.join(OUTDIR, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print("done, total bytes:", sum(m["bytes_on_disk"] for m in manifest))
