#!/usr/bin/env python3
"""Clean the edges of recorded voice lines (assets/audio/vo/*.mp3) without touching the words or the pitch.

Gemini TTS sometimes ends a take with a loud burst of static: a gap of near silence after the last word, then about
0.18 s of broadband noise near full level, cut off hard. silenceremove in tools/ic_live_vo.py and tools/reno_vo.py
can't catch it, because the burst is louder than its threshold. Other takes stop while the last word is still
ringing, so the hard cut clicks, or start with a few hundred ms of air before the first word, so the line lags the
text box.

For each file this:
  1. cuts a static burst at the end: the last stretch of sound after a gap of 40 ms or more below -50 dBFS, when it's
     100 to 260 ms long, within 8 dB of the line's peak, broadband (a good share of its energy under 1 kHz, where a
     final "s" or "t" has almost none) and noise-like (flat spectrum, where speech has harmonics);
  2. trims silence after the last sound to 60 ms, fades out over the last 40 ms and adds 50 ms of silence (so a hard
     cut doesn't click);
  3. trims silence before the first sound to 20 ms, with a 10 ms fade in.
Only files that need one of these are re-encoded (24 kHz mono, 40 kb/s, as recorded). Loudness isn't changed.

  python3 tools/vo_tail_fix.py            # report what would change
  python3 tools/vo_tail_fix.py --apply    # rewrite those files
  python3 tools/vo_tail_fix.py --apply kai-c1-01 uptima-mg-icl-ask   # only these lines
"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np

VO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'audio', 'vo')
SR, H = 24000, 240                 # 10 ms frames
QUIET, ON = -50.0, -45.0           # dBFS: a gap is below QUIET; a line starts at ON
LEAD_KEEP, TAIL_KEEP = 0.02, 0.06  # seconds of air kept before the first and after the last sound
FADE_IN, FADE_OUT = 0.01, 0.04
PAD = 0.05                         # seconds of true silence after the fade


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def frames_db(x):
    n = len(x) // H
    fr = x[:n * H].reshape(n, H)
    return 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)


def burst_features(seg):
    """Share of energy under 1 kHz, and spectral flatness from 150 Hz to 3 kHz (energy-weighted, 20 ms windows)."""
    W = 480
    if len(seg) < W: seg = np.pad(seg, (0, W - len(seg)))
    k = (len(seg) - W) // 120 + 1
    fr = np.stack([seg[i * 120:i * 120 + W] for i in range(k)]) * np.hanning(W)
    P = np.abs(np.fft.rfft(fr, axis=1)) ** 2 + 1e-12
    f = np.fft.rfftfreq(W, 1 / SR)
    tot = P.sum(1); w = tot / tot.sum()
    low = P[:, (f >= 80) & (f < 1000)].sum(1) / tot
    band = P[:, (f >= 150) & (f < 3000)]
    flat = np.exp(np.log(band).mean(1)) / band.mean(1)
    return float((low * w).sum()), float((flat * w).sum())


def plan(x):
    """What to do to one line: (start sample, end sample, burst cut, lead seconds, abrupt end)."""
    db = frames_db(x)
    if len(db) < 10: return None
    pk = db.max()
    on = np.where(db > QUIET)[0]
    if not len(on): return None
    # Segments of sound, split by gaps of 40 ms or more.
    segs, s, p = [], on[0], on[0]
    for i in on[1:]:
        if i - p > 4: segs.append((s, p)); s = i
        p = i
    segs.append((s, p))
    burst = None
    if len(segs) > 1:
        a, b = segs[-1]
        ms = (b - a + 1) * 10
        if 100 <= ms <= 260 and db[a:b + 1].max() >= pk - 8:
            low, flat = burst_features(x[a * H:(b + 1) * H])
            if low > 0.08 and flat > 0.35:
                burst = (a * H / SR, (b + 1) * H / SR)
                segs = segs[:-1]
    last = segs[-1][1]
    first = int(np.argmax(db > ON))
    end = min(len(x), (last + 1) * H + int(TAIL_KEEP * SR))
    start = max(0, first * H - int(LEAD_KEEP * SR))
    abrupt = db[-2:].max() > QUIET   # still sounding at the very end: the cut would click
    return dict(start=start, end=end, burst=burst, lead=first * H / SR, abrupt=bool(abrupt) and not burst)


def needs(p):
    return p and (p['burst'] or p['abrupt'] or p['lead'] > 0.06)


def fix(x, p):
    y = x[p['start']:p['end']].astype(np.float32).copy()
    if p['start'] > 0:
        n = int(FADE_IN * SR); y[:n] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    n = min(int(FADE_OUT * SR), len(y)); y[-n:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))
    return np.concatenate([y, np.zeros(int(PAD * SR), np.float32)])


def encode(y, path):
    tmp = path + '.tmp.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '40k', '-ar', str(SR), '-ac', '1', tmp],
                   input=y.tobytes(), check=True)
    os.replace(tmp, path)


def one(name, apply):
    path = os.path.join(VO, name + '.mp3')
    x = decode(path)
    p = plan(x)
    if not needs(p): return None
    why = []
    if p['burst']: why.append('static burst %.2f-%.2fs cut' % p['burst'])
    if p['abrupt']: why.append('hard cut faded')
    if p['lead'] > 0.06: why.append('lead %.2fs trimmed' % p['lead'])
    if apply: encode(fix(x, p), path)
    return name, why


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    apply = '--apply' in sys.argv
    names = args or sorted(f[:-4] for f in os.listdir(VO) if f.endswith('.mp3'))
    with ThreadPoolExecutor(os.cpu_count() or 4) as ex:
        res = [r for r in ex.map(lambda n: one(n, apply), names) if r]
    for name, why in res: print(name + ': ' + '; '.join(why))
    print('%d of %d lines %s' % (len(res), len(names), 'fixed' if apply else 'need a fix'))


if __name__ == '__main__':
    main()
