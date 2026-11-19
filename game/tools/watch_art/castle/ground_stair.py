# Ground floor: replace the left stair (it climbed up) with a way down to the cellars (Ladi, Nov 19).
# Step 1: cover the old stair with plain wall from the upper floor, colour-matched (G5a). Step 2 is ground_down.py.
# (A Sogni try at an arched opening with steps came out in 3D perspective and was not used.)
from compose2 import A, paste, save
g = A('hd/G4.png'); u = A('hd/upper-v3.png')
gain = g[150:300, 450:560].reshape(-1, 3).mean(0) / u[100:300, 3350:3480].reshape(-1, 3).mean(0)
src = u * gain
paste(g, src, (2930, 0, 3445, 345), (60, 0), fy=False, f=24)
paste(g, src, (2930, 330, 3490, 512), (60, 330), fy=False, f=24)
save(g, 'hd/G5a.png')
