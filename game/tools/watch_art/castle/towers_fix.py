# Towers: copy the lookout doorway to the watchtower spot with its lighting matched to the wall there.
import numpy as np
from PIL import Image, ImageFilter
from compose2 import A, paste, sign, save
def blur(a, r=60): return np.asarray(Image.fromarray(a.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) + 1
t = A('hd/towers-v2.png')
paste(t, t, (1300, 0, 1800, 85), (1795, 0), fy=False)
src = t.copy(); g = blur(t) / blur(src)                      # identity; gain computed below on shifted copy
box = (2200, 112, 2516, 476); dx = 362 - 2200
patch = t[box[1]:box[3], box[0]:box[2]].copy()
# gain = local wall light at the target / local wall light at the source, from wide blurs of the plain wall
gt = blur(t)[box[1]:box[3], box[0] + dx:box[2] + dx]; gs = blur(t)[box[1]:box[3], box[0]:box[2]]
src2 = t.copy(); src2[box[1]:box[3], box[0]:box[2]] = patch * (gt / gs)
paste(t, src2, box, (362, 112), fy=False, f=24)
sign(t, 'bell', 520, 12, 110); sign(t, 'helmet', 2786, 12, 110); save(t, 'hd/towers-v5.png')
