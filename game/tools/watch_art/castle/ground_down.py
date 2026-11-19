# Ground floor's way down to the cellars, strict side view (Ladi, Nov 19): the old up-stair is walled over (G5a, from
# ground_stair.py) and a stair is cut into the floor at the same x, its steps (cut from the floor's own stone) dropping
# to the left into the dark below the floor line, with a wooden handrail like the other stairs. Output is 4096x564
# (the layer's full 360 engine px), so the steps show below the floor.
import numpy as np
from PIL import Image
g = np.asarray(Image.open('hd/G5a.png').convert('RGB')).astype(float)
H = 564; FL = 470; out = np.zeros((H, 4096, 3)); out[:] = (24, 20, 26); out[:512] = g
x0, x1 = 230, 520                  # the opening in the floor (stairs leave the floor at x1 and drop to the left)
out[FL - 2:H, x0:x1] = (14, 11, 16)                                  # dark stairwell
stone = g[482:510, 2820:3300]                                       # floor stone to cut steps from
n = 5; run = (x1 - x0) // n; rise = 20
for i in range(n):                                                    # step i: top at FL + i*rise, from x1 - (i+1)*run
    xa, xb = x1 - (i + 1) * run, x1 - i * run; yt = FL + i * rise
    for yy in range(yt, H):
        k = (yy - yt) % stone.shape[0]; row = stone[k, (i * 37) % 200:(i * 37) % 200 + (xb - xa)]
        shade = 1.0 if yy < yt + 5 else 0.7 - 0.004 * (yy - yt)               # light tread, darker riser, darker further down
        out[yy, xa:xb] = row[:xb - xa] * max(0.25, shade - 0.05 * i)
    if yt < H: out[yt, xa:xb] = out[yt, xa:xb] * 1.15                            # nosing highlight
    pass
out[FL - 2:FL + 1, x0:x1] = (70, 62, 58)                              # floor edge
# handrail: posts every other step and a rail parallel to the steps, wood colours from the existing stairs
wood, dark, lite = np.array((112, 60, 34.)), np.array((62, 32, 18.)), np.array((150, 86, 50.))
def post(x, ytop, ybot):
    out[ytop:ybot, x:x + 6] = wood; out[ytop:ybot, x] = dark; out[ytop:ybot, x + 5] = dark; out[ytop:ybot, x + 2] = lite
for i in range(0, n, 2):
    xa = x1 - i * run - run // 2; yt = FL + i * rise; post(xa, yt - 64, yt)
for x in range(x0 + 10, x1 + 30):                                    # rail: from above the top step down to the left
    t = (x1 + 30 - x) / run; y = int(FL - 66 + t * rise)
    if y < H - 4: out[y:y + 7, x] = wood; out[y, x] = lite; out[y + 6, x] = dark
post(x1 + 24, FL - 70, FL)                                            # newel post at the top
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save('hd/G5.png')
