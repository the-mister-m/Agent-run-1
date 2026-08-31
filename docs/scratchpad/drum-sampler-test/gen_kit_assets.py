"""
gen_kit_assets.py — drum-sampler (P2/S4) test/demo asset generator.

Writes two REAL, permanent kits under /assets/kits/ (808, acoustic) plus kits.json —
these are the deliverable's "second kit folder... with no code edit" proof (DONE-CHECK).
Same hand-written-WAV-header technique P0/`recon-webaudio` and P2/`recon-scheduler`
(gen_kit_wavs.py) already verified — no library, real 16-bit PCM.

Also writes a THROWAWAY third kit, "_test-broken", used only by run_test.py to prove a
missing/undecodable file survives (CONTRACTS §14.3). run_test.py deletes it afterward —
it is not part of the shipped kit set.
"""
import struct, math, random, os, json

SR = 44100
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KITS_ROOT = os.path.join(REPO_ROOT, "assets", "kits")


def write_wav(path, duration_s, gen_sample):
    n = int(SR * duration_s)
    data = bytearray()
    for i in range(n):
        s = max(-1.0, min(1.0, gen_sample(i, n)))
        data += struct.pack('<h', int(s * 32767))
    byte_rate = SR * 2
    with open(path, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(data)))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, SR, byte_rate, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(data)))
        f.write(data)


# §14.1's fixed 8 roles: index, note. Two different-sounding generators per kit so the
# swap is audibly/structurally distinct, not just a relabeling.
ROLES = [
    (0, 36, "Kick"), (1, 38, "Snare"), (2, 42, "Closed Hat"), (3, 46, "Open Hat"),
    (4, 39, "Clap"), (5, 45, "Low Tom"), (6, 50, "High Tom"), (7, 49, "Crash"),
]


def gen_808(role_index):
    random.seed(100 + role_index)
    if role_index == 0:  # kick — long sine sweep, deep
        return 0.5, lambda i, n: math.sin(2*math.pi*(55*math.exp(-(i/SR)*9)+35)*(i/SR)) * math.exp(-(i/SR)*7)
    if role_index == 1:  # snare — synthetic tone + noise, tighter than acoustic
        return 0.2, lambda i, n: (math.sin(2*math.pi*220*(i/SR))*0.5 + (random.random()*2-1)*0.7) * math.exp(-(i/SR)*16)
    if role_index == 2:  # closed hat — short noise burst
        return 0.05, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*70)
    if role_index == 3:  # open hat — longer noise
        return 0.5, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*5)
    if role_index == 4:  # clap — three quick noise bursts
        return 0.22, lambda i, n: (random.random()*2-1) * sum(math.exp(-((i/SR - t)**2)/0.00015) for t in (0.0, 0.02, 0.04)) * 0.8
    if role_index == 5:  # low tom
        return 0.3, lambda i, n: math.sin(2*math.pi*95*(i/SR)) * math.exp(-(i/SR)*7)
    if role_index == 6:  # high tom
        return 0.26, lambda i, n: math.sin(2*math.pi*160*(i/SR)) * math.exp(-(i/SR)*7)
    if role_index == 7:  # crash — long bright noise
        return 1.4, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*2.2)


def gen_acoustic(role_index):
    random.seed(200 + role_index)
    if role_index == 0:  # kick — punchier, shorter, more click
        return 0.3, lambda i, n: (math.sin(2*math.pi*(140*math.exp(-(i/SR)*40)+60)*(i/SR)) * math.exp(-(i/SR)*22) + (random.random()*2-1)*0.15*math.exp(-(i/SR)*200))
    if role_index == 1:  # snare — noisier, more "wood"
        return 0.18, lambda i, n: (math.sin(2*math.pi*190*(i/SR))*0.25 + (random.random()*2-1)*0.9) * math.exp(-(i/SR)*20)
    if role_index == 2:  # closed hat
        return 0.045, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*90)
    if role_index == 3:  # open hat
        return 0.4, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*6.5)
    if role_index == 4:  # clap
        return 0.2, lambda i, n: (random.random()*2-1) * sum(math.exp(-((i/SR - t)**2)/0.0001) for t in (0.0, 0.015, 0.03, 0.045)) * 0.7
    if role_index == 5:  # low tom
        return 0.32, lambda i, n: math.sin(2*math.pi*118*(i/SR)) * math.exp(-(i/SR)*9)
    if role_index == 6:  # high tom
        return 0.27, lambda i, n: math.sin(2*math.pi*205*(i/SR)) * math.exp(-(i/SR)*9)
    if role_index == 7:  # crash
        return 1.1, lambda i, n: (random.random()*2-1) * math.exp(-(i/SR)*2.8)


def build_kit(name, label_prefix, gen_fn, filenames):
    kit_dir = os.path.join(KITS_ROOT, name)
    os.makedirs(kit_dir, exist_ok=True)
    pieces = []
    for (index, note, role_label), fname in zip(ROLES, filenames):
        dur, gen = gen_fn(index)
        write_wav(os.path.join(kit_dir, fname), dur, gen)
        pieces.append({
            "index": index,
            "label": f"{label_prefix} {role_label}" if label_prefix else role_label,
            "note": note,
            "file": fname,
        })
    manifest = {"format": "chromebook-daw-kit", "version": 1, "name": name, "pieces": pieces}
    with open(os.path.join(kit_dir, "kit.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"wrote kit '{name}' -> {kit_dir}")


def build_broken_kit():
    """Throwaway kit for run_test.py's missing-file survival check. 7 real files, one
    manifest entry pointing at a .wav that is never written — proves §14.3's 'one .wav
    fails to decode -> that piece is silent and drawn as failed, the other seven play.'"""
    name = "_test-broken"
    kit_dir = os.path.join(KITS_ROOT, name)
    os.makedirs(kit_dir, exist_ok=True)
    filenames = [f"p{i}.wav" for i in range(8)]
    pieces = []
    for (index, note, role_label), fname in zip(ROLES, filenames):
        pieces.append({"index": index, "label": role_label, "note": note, "file": fname})
        if index == 3:
            continue  # deliberately never written — the missing/undecodable file
        dur, gen = gen_808(index)
        write_wav(os.path.join(kit_dir, fname), dur, gen)
    manifest = {"format": "chromebook-daw-kit", "version": 1, "name": name, "pieces": pieces}
    with open(os.path.join(kit_dir, "kit.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"wrote throwaway broken-file test kit -> {kit_dir}")


if __name__ == "__main__":
    os.makedirs(KITS_ROOT, exist_ok=True)

    fnames_808 = ["kick.wav", "snare.wav", "hat-closed.wav", "hat-open.wav",
                  "clap.wav", "tom-low.wav", "tom-high.wav", "crash.wav"]
    build_kit("808", "808", gen_808, fnames_808)

    fnames_ac = ["kick.wav", "snare.wav", "hihat-closed.wav", "hihat-open.wav",
                 "clap.wav", "floor-tom.wav", "rack-tom.wav", "crash.wav"]
    build_kit("acoustic", "", gen_acoustic, fnames_ac)

    build_broken_kit()

    kits_list = {"format": "chromebook-daw-kits", "version": 1, "kits": ["808", "acoustic"]}
    with open(os.path.join(KITS_ROOT, "kits.json"), "w") as f:
        json.dump(kits_list, f, indent=2)
    print("wrote kits.json (808, acoustic — _test-broken deliberately NOT listed)")
