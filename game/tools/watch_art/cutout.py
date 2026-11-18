# Cut a figure out of a near-white render: flood the background (and the soft grey drop shadow under the feet) from the edges.
import numpy as np
from PIL import Image
from collections import deque
def cutout(path, shadow=True):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    H, W, _ = a.shape
    mx, mn = a.max(2), a.min(2); sat = mx - mn
    bg = (mn > 215) & (sat < 30)                      # paper white
    # rows that hold the drop shadow: bottom area; allow light low-saturation greys/lavenders there
    shad = (mn > 120) & (sat < 60) & (a[:, :, 2] >= a[:, :, 0] - 6)
    rows = np.arange(H)[:, None]
    # foot line: lowest row with a dark pixel
    dark = (mx < 110)
    ys = np.where(dark.any(1))[0]; foot = ys.max() if len(ys) else H
    ok = bg | (shadow & shad & (rows > foot - 0.06 * H))
    seen = np.zeros((H, W), bool); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if ok[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if ok[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            v, u = y + dy, x + dx
            if 0 <= v < H and 0 <= u < W and ok[v, u] and not seen[v, u]: seen[v, u] = True; q.append((v, u))
    band = (rows > foot - 0.06 * H) & np.ones((1, W), bool)
    cand = band & shad & seen
    if shadow and cand.sum() > 50:
        med = np.median(a[cand], axis=0)
        near = (np.abs(a - med).sum(2) < 24) & band
        seen = seen | near
    for _ in range(2):
        grow = seen.copy()
        pure = (mn > 238) & (sat < 12)
        cand2 = pure & ~seen
        # pixels of paper white touching removed area
        nb = np.zeros_like(seen); nb[1:] |= seen[:-1]; nb[:-1] |= seen[1:]; nb[:, 1:] |= seen[:, :-1]; nb[:, :-1] |= seen[:, 1:]
        q = deque(zip(*np.where(cand2 & nb)))
        for y, x in q: grow[y, x] = True
        while q:
            y, x = q.popleft()
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                v, u = y + dy, x + dx
                if 0 <= v < H and 0 <= u < W and pure[v, u] and not grow[v, u]: grow[v, u] = True; q.append((v, u))
        seen = grow
    # enclosed pockets of untouched paper (e.g. between a pole and a leg): flat near-255 white, a decent size
    paper = (mn > 246) & (sat < 8) & ~seen
    lab = np.zeros((H, W), bool)
    for y0, x0 in zip(*np.where(paper)):
        if lab[y0, x0]: continue
        comp = [(y0, x0)]; lab[y0, x0] = True; q = deque(comp)
        while q:
            y, x = q.popleft()
            for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                v, u = y + dy, x + dx
                if 0 <= v < H and 0 <= u < W and paper[v, u] and not lab[v, u]: lab[v, u] = True; q.append((v, u)); comp.append((v, u))
        if len(comp) > 600:
            ys_, xs_ = zip(*comp); seen[list(ys_), list(xs_)] = True
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    # drop small islands of leftover light pixels (enclosed white specks stay: they are inside the figure)
    out = np.dstack([np.asarray(im), alpha])
    return Image.fromarray(out, 'RGBA')
