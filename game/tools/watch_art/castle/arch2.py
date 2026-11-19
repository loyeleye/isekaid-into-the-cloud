# Archway down, v2 (Ladi, Nov 19): symmetric arch (left half of the Sogni arch mirrored, so no clipped corner), the
# upward steps inside removed, and a stair cut through the floor under the arch dropping into the dark below the floor
# line, steps made from the Sogni arch's own step stones. Returns an RGBA tile 300x(564-56) to place with its sill on y=476.
import numpy as np
from PIL import Image
from compose2 import A
G = A('hd/G5-1601.png')                                    # arch centred at x=300, sill 476, top ~55
c = 332; L0 = 107
left = G[50:476, L0:c].copy()
arch = np.concatenate([left, left[:, ::-1]], axis=1)       # 390 wide x 426 tall
W = arch.shape[1]; cx = W // 2
# interior mask: dark opening inside the stone ring (left interior: x 205..300 in G -> 100..195 here)
yy, xx = np.mgrid[0:arch.shape[0], 0:W]
R = 158; top = 195                                          # inner radius and the y where the inner arch springs
inner = (np.abs(xx - cx) <= R) & ((yy >= top) | ((xx - cx) ** 2 + (yy - top) ** 2 <= R * R))
# keep the torch on the left wall of the inside (and its mirror on the right)
dark = np.array((16, 12, 18.))
wd = np.minimum(xx - (cx - R), (cx + R) - xx).astype(float)          # distance from the inner side walls
f = np.clip(1 - wd / 150, 0, 1)[..., None]                            # lit near the walls, dark in the middle
low = np.clip((yy - 300) / 60, 0, 1)[..., None]                       # the old steps (lower part) go dark too
inside = arch * f * (1 - low) + dark * (1 - f * (1 - low))
arch[inner] = inside[inner]
# below the sill: a pit through the floor, with steps descending to the left, lit by the torches above
H2 = 88; pit = np.zeros((H2, W, 3)); pit[:] = dark
face = A('hd/upper-v3.png')[150:250, 3000:3280] * 0.8                                  # the wall's own stone for the step faces
tread = np.array((196, 168, 132.))                           # the arch ring's warm stone, lit by the torches
n = 4; run = (2 * R) // n; rise = 22
for i in range(n):                                          # step i: top at i*rise, from the right edge leftwards
    xb = cx + R - i * run if i else cx + R; xa = cx - R; yt = i * rise
    lit = 0.95 - 0.2 * i
    pit[yt:H2, xa:xb] = face[(np.arange(yt, H2) % 100)][:, (np.arange(xa, xb) - xa) % 280] * lit * 0.8
    pit[yt:yt + 4, xa:xb] = tread * lit; pit[yt + 4:yt + 6, xa:xb] *= 0.5
    pit[yt:H2, xb - 2:xb] *= 0.45                            # the nosing's shadow edge
alpha = np.zeros((arch.shape[0] + H2, W)); out = np.zeros((arch.shape[0] + H2, W, 3))
out[:arch.shape[0]] = arch; alpha[:arch.shape[0]] = 255
out[arch.shape[0]:] = dark; alpha[arch.shape[0]:] = 0
sel = np.abs(xx[:H2] - cx) <= R
out[arch.shape[0]:][sel] = pit[sel]; alpha[arch.shape[0]:][sel] = 255
# the floor edge either side of the pit, and soft fade at the sides of the tile
Ro = R + 64                                                # the stone ring's outer edge: wall outside it stays the floor's own
ring = np.clip((Ro + 4 - np.where(yy >= top, np.abs(xx - cx), np.sqrt((xx - cx) ** 2 + (yy - top) ** 2))) / 8, 0, 1)
alpha[:arch.shape[0]] *= ring
top30 = out[:34]; wood = (top30[..., 0] - top30[..., 2] > 22) & (top30.mean(-1) < 120) | (top30.mean(-1) < 60)
alpha[:34][wood] = 0                                          # the ceiling beam above the Sogni arch
img = np.dstack([out, alpha]).clip(0, 255).astype(np.uint8)
Image.fromarray(img, 'RGBA').save('hd/arch2.png'); print(img.shape)
