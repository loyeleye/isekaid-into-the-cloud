# Bru in the Monster Hunt street: key the green from Gemini renders (body-<pose>.png, <pose>-<mood>.png), crop every pose to one box, cut feathered face patches.
# Usage: python3 tools/bru_pose.py <renders dir> <out dir>   (out goes to assets/img/hunt/bru/; prints the face boxes for POSE in js/hunt-board.js)
import sys, numpy as np, json
from PIL import Image
D, O = sys.argv[1], sys.argv[2]
POSES = {'front': ['blink','talk','smile','wince','frown','grin'], 'three': ['blink','talk','smile','wince','frown','grin'], 'side': ['blink','talk','smile','wince','frown','grin']}
def load(f): return np.asarray(Image.open(f'{D}/{f}.png').convert('RGB')).astype(float)
def key(a):
    r,g,b = a[...,0],a[...,1],a[...,2]
    m = g - np.maximum(r,b)                     # green dominance
    al = np.clip(1 - (m - 40) / 80, 0, 1)        # >120 fully transparent, <40 opaque
    out = a.copy(); sp = np.maximum(g - np.maximum(r,b), 0)
    out[...,1] = g - sp * (1 - al) - np.where(al < 1, sp * .5, 0) * al   # despill edges
    out[...,1] = np.minimum(out[...,1], np.maximum(r,b) + 10 + (g - np.maximum(r,b)).clip(0) * (al >= 1))
    return np.dstack([out.clip(0,255), al*255]).astype(np.uint8)
def green(a): return (a[...,1]>150)&(a[...,0]<120)&(a[...,2]<120)
bodies = {p: load('body-'+p) for p in POSES}
alphas = {p: key(bodies[p])[...,3] for p in POSES}
ys, xs = np.nonzero(np.maximum.reduce([alphas[p] for p in POSES]) > 20)
x0, y0, x1, y1 = max(xs.min()-6,0), max(ys.min()-6,0), xs.max()+7, ys.max()+7
H = 900; s = H / (y1 - y0); W = round((x1 - x0) * s)
meta = {'w': W, 'h': H, 'faces': {}}
for p, moods in POSES.items():
    b = bodies[p]; box = None
    for m in moods:
        e = load(f'{p}-{m}')
        d = (np.abs(e - b).sum(2) > 150) & ~(green(e) & green(b))
        hd = d[:int(d.shape[0]*.3)]
        c = np.nonzero(hd.sum(0) > 4)[0]; r = np.nonzero(hd.sum(1) > 4)[0]
        bb = [c.min(), r.min(), c.max(), r.max()]
        if p == 'side' and m == 'wince': continue    # its hair moved too; clip it to the others' box
        box = bb if box is None else [min(box[0],bb[0]), min(box[1],bb[1]), max(box[2],bb[2]), max(box[3],bb[3])]
    P = 14; bx0, by0, bx1, by1 = box[0]-P, box[1]-P, box[2]+P, box[3]+P
    Image.fromarray(key(b)[y0:y1, x0:x1]).resize((W, H), Image.LANCZOS).save(f'{O}/body-{p}.webp', quality=88)
    fw, fh = bx1 - bx0, by1 - by0
    yy, xx = np.mgrid[0:fh, 0:fw]
    F = 9; fe = np.minimum.reduce([xx, yy, fw-1-xx, fh-1-yy]).clip(0, F) / F
    for m in ['neutral'] + moods:
        e = b if m == 'neutral' else load(f'{p}-{m}')
        k = key(e)[by0:by1, bx0:bx1].astype(float); k[...,3] *= fe
        sw, sh = round(fw * s), round(fh * s)
        Image.fromarray(k.astype(np.uint8)).resize((sw, sh), Image.LANCZOS).save(f'{O}/face-{p}-{m}.webp', quality=90)
    meta['faces'][p] = [round((bx0-x0)/(x1-x0)*100, 2), round((by0-y0)/(y1-y0)*100, 2), round(fw/(x1-x0)*100, 2), round(fh/(y1-y0)*100, 2)]
print(json.dumps(meta))
