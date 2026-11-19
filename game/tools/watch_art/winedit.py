# Edit a 2048x512 window of a 4096x512 wide floor with Sogni, then paste back the window's middle with feathered edges.
import json, sys, subprocess, numpy as np
from PIL import Image
def run(src, dst, x0, prompt, seeds, keep=(256, 1792), tag='w'):
    W = Image.open(src).convert('RGB'); win = W.crop((x0, 0, x0 + 2048, 512)); ref = f'steps/{tag}-ref.png'; win.save(ref)
    jobs = [{'out': f'steps/{tag}-{s}.png', 'ref': ref, 'w': 2048, 'h': 512, 'seed': s, 'prompt': prompt} for s in seeds]
    json.dump(jobs, open(f'jobs-{tag}.json', 'w')); subprocess.run(['python3', 'render.py', f'jobs-{tag}.json', str(len(seeds))])
    outs = []
    for s in seeds:
        e = np.asarray(Image.open(f'steps/{tag}-{s}.png').convert('RGB').resize((2048, 512))).astype(float)
        base = np.asarray(W).astype(float).copy(); w = np.zeros(2048); k0, k1 = keep; f = 48
        w[k0:k1] = 1
        if k0 >= f: w[k0 - f:k0] = np.linspace(0, 1, f)
        if k1 + f <= 2048: w[k1:k1 + f] = np.linspace(1, 0, f)
        if x0 == 0 and keep == (256, 1792): w[:k0] = 1
        if x0 + 2048 == W.width and keep == (256, 1792): w[k1:] = 1
        seg = base[:, x0:x0 + 2048]; base[:, x0:x0 + 2048] = seg * (1 - w[None, :, None]) + e * w[None, :, None]
        out = f'{dst[:-4]}-{s}.png'; Image.fromarray(base.astype(np.uint8)).save(out); outs.append(out)
    return outs
if __name__ == '__main__':
    src, dst, x0, tag = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]; seeds = [int(s) for s in sys.argv[5].split(',')]
    print(run(src, dst, x0, sys.stdin.read().strip(), seeds, tag=tag))
