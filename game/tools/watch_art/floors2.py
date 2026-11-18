import json, numpy as np
from PIL import Image, ImageDraw
FW = 1200
# floor line y in the 1600x450 preview space, and geometry measured on the renders (x in the 1200-wide floor)
G = {
 'towers':  {'floor': 343, 'cut': 95, 'rooms': [['watchtower', 166, 412], ['lookout', 412, 660], ['captain', 660, 1148]], 'doors': {'lookout': 562, 'captain': 810}},
 'upper':   {'floor': 402, 'cut': 115, 'rooms': [['wardrobe', 191, 600], ['ledger', 600, 806], ['bridge-tower', 806, 1016]], 'doors': {'ledger': 712, 'bridge-tower': 919}},
 'ground':  {'floor': 380, 'cut': 105, 'rooms': [['gate', 150, 375], ['hall', 375, 600], ['post-room', 600, 825], ['tavern', 825, 1050]], 'doors': {'hall': 431, 'post-room': 660, 'tavern': 885}},
 'cellars': {'floor': 350, 'cut': 110, 'rooms': [['archive', 161, 382], ['strongroom', 382, 600], ['barracks', 600, 1065]], 'doors': {'strongroom': 490, 'barracks': 712}},
}
def green_doors(a):
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (g > r + 22) & (g > b + 22) & (g > 90)
    # grow by one pixel to catch the anti-aliased rim
    m2 = m.copy(); m2[1:] |= m[:-1]; m2[:-1] |= m[1:]; m2[:, 1:] |= m[:, :-1]; m2[:, :-1] |= m[:, 1:]
    return m2 & (g > np.minimum(r, b) + 8)
def build(f):
    im = Image.open(f'pano/{f}-f.png').convert('RGB').resize((1600, 450), Image.LANCZOS)
    s = FW / 1600; im = im.resize((FW, round(450 * s)), Image.LANCZOS); a = np.asarray(im.convert('RGBA')).copy()
    m = green_doors(a)
    # green that reaches down to the floor is an open doorway: paint it as a dark passage; the rest are windows: transparent
    H = a.shape[0]; fl = round(G[f]['floor'] * s)
    ys, xs = np.where(m); door = ys >= fl - G[f]['cut']
    a[ys[door], xs[door], :3] = (22, 18, 24); a[ys[door], xs[door], 3] = 255
    a[ys[~door], xs[~door], 3] = 0
    out = Image.new('RGBA', (FW, 360), (0, 0, 0, 0) if f == 'towers' else (24, 20, 26, 255))
    out.paste(Image.fromarray(a, 'RGBA'), (0, 300 - fl))  # paste, not composite: windows stay see-through
    return out
if __name__ == '__main__':
    for f in G:
        o = build(f); o.save(f'test/floor2-{f}.png')
        d = ImageDraw.Draw(o)
        for n, a_, b_ in G[f]['rooms']: d.line([a_, 0, a_, 360], fill=(255, 0, 0, 255)); d.line([b_, 0, b_, 360], fill=(255, 0, 0, 255))
        for n, x in G[f]['doors'].items(): d.line([x, 200, x, 300], fill=(255, 255, 0, 255), width=3)
        d.line([0, 300, FW, 300], fill=(0, 255, 255, 255))
        o.save(f'test/floor2-{f}-guides.png')
