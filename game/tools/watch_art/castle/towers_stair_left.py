# Towers: the stair down moves to the left end so it lines up with the upper floor's stair up (Ladi, Nov 19).
# Mirror the right-end stair to the left end, move the watchtower doorway right (over the first battlement window,
# which becomes wall), and close the right end with a battlement window and plain wall.
import numpy as np
from compose2 import A, paste, save
t0 = A('hd/towers-v5.png'); t = t0.copy(); m = t0[:, ::-1].copy()
def mx(x): return 4095 - x
wall = t0[85:512, 1600:1860]                                   # plain wall + floor strip, 260 wide
def wall_fill(x0, x1, y0=85):
    for x in range(x0, x1, 236):
        w = min(260, x1 - x)
        if w < 30: break
        paste(t, np.pad(wall[:, :w], ((85, 0), (x, 4096 - x - w), (0, 0))), (x, 85, x + w, 512), (x, 85), fy=False, f=12)
# 1) left end: plain wall over the watchtower doorway and the first window, then the mirrored stair at 60..655
wall_fill(60, 1120)
paste(t, m, (mx(4035), 85, mx(3440), 512), (60, 85), fy=False, f=16)
paste(t, t0, (1300, 0, 1640, 85), (330, 0), fy=False, f=16)            # rafters over the old sign's chains
wall_fill(560, 700)                                                   # cover the window sliver right of the stair
# 2) watchtower doorway (with its bell sign) moved right, centred at 815
paste(t, t0, (360, 0, 680, 476), (655, 0), fy=False, f=16)
# 3) right end: window 3 rebuilt from window 2's cell, then plain wall to the end wall
paste(t, t0, (3290, 85, 3515, 476), (3485, 85), fy=False, f=8)
wall_fill(3696, 4040)
paste(t, t0, (3290, 470, 3540, 512), (3480, 470), fy=False, f=10)
save(t, 'hd/towers-v6.png')
