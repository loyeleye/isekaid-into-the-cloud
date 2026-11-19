# Cellars rebuilt from one clean vault bay of the Sogni base (cellars-0a), tiled so a bay sits under the ground-floor trapdoor,
# then the doorway (from the Sogni pass) and the Sogni-rendered signs pasted on. Doors are at the 'doors' x values below.
import numpy as np
from PIL import Image
from compose2 import A, paste, sign, save
base = A('hd/cellars-0a.png'); v2 = A('hd/cellars-v2.png'); b = A('hd/cellars-0b.png')
P = 560; T0 = 516
tile = np.asarray(Image.fromarray(base[:, 610:1260].astype(np.uint8)).resize((P, 512), Image.LANCZOS)).astype(float)
out = v2.copy()
x = T0
while x < 4096:
    w = min(P, 4096 - x); out[:, x:x + w] = tile[:, :w]; x += P
paste(out, v2, (430, 0, 560, 512), (430, 0), fy=False, f=40)          # blend the stairs bay into the first tile
paste(out, b, (3990, 0, 4096, 512), (3990, 0), fy=False, f=24)         # right outer wall
torch = (1575, 135, 1645, 275)
bays = [T0 + i * P + 358 for i in range(7)]                            # 874, 1434, 1994, 2554, 3114, 3674, 4234
for cx in ():
    paste(out, base, torch, (cx - 35, 135), f=10)
doors = {'archive': (874, 'scroll'), 'strongroom': (1434, 'key'), 'barracks': (2554, 'shield'), 'tavern': (3114, 'mug')}
for rid, (cx, s) in doors.items():
    paste(out, v2, (2390, 160, 2690, 478), (cx - 150 + 25, 160), fy=False)
    sign(out, s, cx + 25, 28, 120)
save(out, 'hd/cellars-v5.png'); print(bays)
