# Towers rooftop, part 2 (Ladi, Nov 19). Sogni's third window dropped the captain's turret, so copy the lookout's turret
# into the gap and hang the captain's own sign (cut from the old floor) on it. Then open every turret door: the wooden
# door leaf is replaced by the room glimpse from the old floor's doorway, so rooms read as open doorways like the other
# floors. Prints each door's centre x (native px) for the export.
# usage: python3 towers_turrets.py <after-c.png> <old towers.png> <out.png>
import sys, numpy as np
from PIL import Image
src, old, out = sys.argv[1:4]
A = np.asarray(Image.open(src).convert('RGB')).copy(); O = np.asarray(Image.open(old).convert('RGB'))
SX0, SX1, DX = 2211, 2640, 2936                          # lookout turret columns -> captain turret at DX
A[:468, DX:DX + SX1 - SX0] = A[:468, SX0:SX1]
A[:468, 2636:2700] = A[:468, 2700:2764]                  # a blurred seam right of the lookout turret -> clean sky and parapet
A[425:482, 2600:2960] = A[425:482, 1320:1680]            # a stray hatch and the old doorway's threshold -> plain walkway
A[18:482, 2642:2936] = A[18:482, 1340:1634]            # the stretch between lookout and captain: clean parapet
A[:18] = (0, 255, 0)                                     # bits of the old roof above the turret tops -> sky
eb = (2322 - SX0 + DX, 140, 2462 - SX0 + DX, 215)        # the copied eye board
hat = Image.fromarray(O[55:128, 2730:2838]).resize((eb[2] - eb[0], eb[3] - eb[1]), Image.LANCZOS)
A[eb[1]:eb[3], eb[0]:eb[2]] = np.asarray(hat)
room = O[150:450, 2700:2880]                             # an old doorway's room glimpse (captain's)
centres = []
for L, R, T in ((1045, 1162, 280), (2328, 2472, 265), (3058, 3200, 265)):   # each turret door's opening (measured), sill 466
    rad = (R - L) / 2; c = (L + R) / 2; centres.append(int(c))
    gy, gx = np.mgrid[T:466, L:R + 1]
    fill = ((gy >= T + rad)) | (np.hypot(gx - c, gy - (T + rad)) <= rad)
    gl = np.asarray(Image.fromarray(room).resize((R + 1 - L, 466 - T), Image.LANCZOS))
    reg = A[T:466, L:R + 1]; reg[fill] = gl[fill]
print('door centres', centres)
Image.fromarray(A).save(out)
