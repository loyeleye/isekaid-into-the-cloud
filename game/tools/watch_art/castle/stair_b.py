# Option B: the Sogni take with an arched stairwell (G5-1601) had its right side cut off by the paste-back feather;
# complete it by mirroring the left jamb and the left half of the arch ring about the arch's centre (x=300).
from compose2 import A, paste, save
g = A('hd/G5-1601.png'); m = g[:, ::-1].copy()          # m[:, x] == g[:, 4095 - x]
def mx(x): return 4095 - x                               # column in m for column x of g
c = 300
# left jamb 110..190 -> right jamb 410..490 (mirror about c): source in g is x in [2c-490, 2c-410] = [110,190]
for (y0, y1, a, b, f) in ((140, 476, 110, 172, 8), (40, 150, 110, 300, 14)):
    xa, xb = 2 * c - b, 2 * c - a                        # target span
    paste(g, m, (mx(b - 1), y0, mx(a - 1), y1), (xa + 1, y0), f=f, fy=False)
save(g, 'hd/GB.png')
