# Builds one sprite sheet per person from the picked renders: cut out, scaled to a set height, feet on one line, soft shadow.
import json, os, sys, numpy as np
from PIL import Image, ImageDraw
from cutout import cutout
OUT = sys.argv[1] if len(sys.argv) > 1 else 'out/people'
os.makedirs(OUT, exist_ok=True)
# bbox height in px for the standing frame (hats, plumes and props included), on a 360-tall view with people ~75-92 px
HT = dict(seoyeon=76, mira=82, kai=84, dutch=92, coo=74, bru=80, kagemaru=90, lexi=79, wen=76, ayo=90, aigerim=84, chad=86,
          seymour=96, hobb=74, pell=140, tess=60, doug=82, hollis=84, odu=86, fennel=84, captain=88, kevin=88,
          **{'townsfolk-1': 80, 'townsfolk-2': 84, 'townsfolk-3': 80})
RES = 2                      # sheets are drawn at 2x and tagged scale 1/RES, so they stay sharp on high-res screens
FH0, FOOT0 = 112, 106        # frame height and feet line at 1x (taller people get a taller frame)
def frames_for(k):
    if k == 'seoyeon': return ['stand', 'walkA', 'walkB', 'walkC', 'walkD', 'talk', 'lantern', 'lanternwalk', 'lanternwalkB']
    if k.startswith('townsfolk') or k == 'kevin': return ['stand', 'walkA', 'walkB', 'walkC', 'walkD']
    return ['stand', 'walkA', 'walkB', 'walkC', 'walkD', 'talk']
def src(k, f): return f'base/{k}.png' if f == 'stand' else f'pose/{k}-{f}.png'
WIDE = dict(tess=1.25)       # Tess drawn broader: a short, sturdy woman rather than a child (Ladi, Nov 18)
def prep(path, scale, wide=1.0):
    im = cutout(path)
    a = np.asarray(im)[:, :, 3] > 0
    ys, xs = np.where(a); top, bot = ys.min(), ys.max()
    # horizontal reference: centre of the head/shoulder band (top 30% of the figure), ignoring long props
    band = a[top: top + int(0.3 * (bot - top))]
    cols = np.where(band.any(0))[0]; cx = (cols.min() + cols.max()) / 2
    w2, h2 = max(1, round(im.width * scale * wide)), max(1, round(im.height * scale))
    sm = im.convert('RGBa').resize((w2, h2), Image.LANCZOS).convert('RGBA')
    arr = np.asarray(sm).copy(); al = arr[:, :, 3]
    arr[:, :, 3] = np.where(al > 110, 255, 0)   # hard pixel edges, no halo
    return Image.fromarray(arr, 'RGBA'), cx * scale * wide, bot * scale
meta = {}
for k in HT:
    fs = [f for f in frames_for(k) if os.path.exists(src(k, f))]
    if 'stand' not in fs: continue
    FH = RES * max(FH0, HT[k] + 10); FOOT = FH - RES * (FH0 - FOOT0)
    st = cutout(src(k, 'stand')); bb = st.getbbox(); scale = RES * HT[k] / (bb[3] - bb[1])
    parts = [prep(src(k, f), scale, WIDE.get(k, 1.0)) for f in fs]
    half = 0
    for im, cx, bot in parts:
        b = im.getbbox(); half = max(half, cx - b[0], b[2] - cx)
    FW = int(2 * half + 6) // 2 * 2; ax = FW // 2
    order = []   # frame order in the sheet
    for f in fs: order.append(f)
    sheet = Image.new('RGBA', (FW * len(order), FH), (0, 0, 0, 0))
    for i, (im, cx, bot) in enumerate(parts):
        fr = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(fr)
        sw = int(RES * HT[k] * 0.36)
        d.ellipse([ax - sw // 2, FOOT - 3 * RES, ax + sw // 2, FOOT + 3 * RES], fill=(20, 16, 30, 70))
        fr.alpha_composite(im, (round(ax - cx), round(FOOT - bot)))
        sheet.alpha_composite(fr, (i * FW, 0))
    # breathing: copy the standing (and lantern) frame with the upper body lifted 1 px; the waist row is repeated
    def breathe(src_i):
        cell = sheet.crop((src_i * FW, 0, (src_i + 1) * FW, FH)); a = np.asarray(cell).copy()
        solid = np.where((a[:, :, 3] == 255).any(1))[0]; top = solid.min(); waist = top + int(0.52 * (FOOT - top))
        a[top - RES: waist, :] = a[top: waist + RES, :]
        return Image.fromarray(a, 'RGBA')
    extra = [('breathe', breathe(order.index('stand')))]
    if 'lantern' in order: extra.append(('lanternBreathe', breathe(order.index('lantern'))))
    big = Image.new('RGBA', (FW * (len(order) + len(extra)), FH)); big.alpha_composite(sheet, (0, 0))
    for j, (nm, im) in enumerate(extra): big.alpha_composite(im, ((len(order) + j) * FW, 0)); order.append(nm)
    sheet = big
    sheet.save(f'{OUT}/{k}.png', optimize=True)
    idx = {f: i for i, f in enumerate(order)}
    def g(*names): return [idx[n] for n in names if n in idx]
    anims = {'idle': g('stand', 'stand', 'stand', 'stand', 'breathe', 'breathe', 'breathe', 'breathe'), 'walk': g('walkA', 'stand', 'walkB', 'stand') if 'walkA' in idx else g('stand')}
    if 'walkA' in idx and 'walkB' in idx: anims['walk'] = [idx['walkA'], idx['walkB'], idx.get('walkC', idx['walkA']), idx.get('walkD', idx['walkB'])]
    if 'talk' in idx: anims['talk'] = g('stand', 'talk')
    if 'lantern' in idx: anims['lantern'] = g('lantern', 'lantern', 'lantern', 'lantern', 'lanternBreathe', 'lanternBreathe', 'lanternBreathe', 'lanternBreathe'); anims['lanternWalk'] = g('lanternwalk', 'lantern', 'lanternwalkB', 'lanternBreathe') if 'lanternwalkB' in idx else g('lanternwalk', 'lantern')
    meta[k] = {'w': FW, 'h': FH, 'anchor': [ax, FOOT], 'scale': 1 / RES, 'frames': order, 'anims': anims}
    print(k, FW, order)
json.dump(meta, open(f'{OUT}/meta.json', 'w'), indent=1)
