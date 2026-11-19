import subprocess, shutil, numpy as np
from PIL import Image, ImageDraw
import winedit
K = ' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left.'
def step(src, x0, prompt, seed, name, keep=(256, 1792)):
    import os
    if os.path.exists(f'hd/{name}.png'): return f'hd/{name}.png'
    for t in range(4):
        try:
            out = winedit.run(src, f'hd/{name}.png', x0, prompt + K, [seed + 100 * t], keep=keep, tag='hd-' + name)[0]; break
        except FileNotFoundError: continue
    shutil.copy(out, f'hd/{name}.png'); return f'hd/{name}.png'
def room(src, rx0, rx1, prompt, seed, name):
    x0 = min(max(0, (rx0 + rx1) // 2 - 1024), 2048)
    return step(src, x0, prompt, seed, name, keep=(rx0 - x0 + 24, rx1 - x0 - 24))
s = 'steps/H0.png'
s = step(s, 0, 'Add only one staircase, at the far left just inside the left outer wall, in strict side view: a stone staircase against the back wall that starts on the floor and climbs up to the left, through a dark opening in the ceiling, with a wooden handrail. Nothing else added.', 801, 'h1')
s = step(s, 2048, 'Add only one staircase, at the far right just inside the right outer wall, in strict side view: a stone staircase against the back wall that starts on the floor and climbs up to the right, through a dark opening in the ceiling, with a wooden handrail. Nothing else added.', 802, 'h2')
s = step(s, 1024, 'Add only one thing, in the exact middle of the hall: a closed square wooden trapdoor with iron bands and an iron ring, set flush into the stone floor, seen in strict side view as a thin wooden edge in the floor line, about as wide as a person. Nothing on the ceiling. Nothing else added.', 803, 'h3')
W = 'Add only windows, in strict side view: three tall narrow arched windows set high in the back wall of this part of the hall, evenly spaced, each with a dressed-stone frame and a flat stone sill, the glass filled with plain bright green (#00FF00). The bottom of every window is a little above the middle of the wall. Nothing else added.'
s = step(s, 0, W, 804, 'h4a'); s = step(s, 2048, W, 805, 'h4')
g = Image.open(s).convert('RGB'); d = ImageDraw.Draw(g)
for x in (1250, 2300, 3215): d.rectangle([x - 26, 40, x + 26, 486], fill=(150, 146, 140))
g.save('hd/h4g.png'); s = 'hd/h4g.png'
P = 'Turn each flat light-grey bar into a real square stone pillar running from the floor up to the ceiling beams, in strict side view, with a carved base and capital, built of dressed stone and shaded. Nothing else added.'
s = step(s, 0, P, 806, 'h5a'); s = step(s, 2048, P, 807, 'h5')
F = ' Everything stands on the floor, in strict side view, sized for people (a person is about as tall as the bottom of the windows), and nothing covers the windows. Nothing in the other rooms.'
s = room(s, 300, 1225, "Furnish only the room between the left staircase and the first stone pillar as the castle's gatehouse room: a guard's wooden desk with an open ledger and a small bell, a weapon rack with two spears and a shield against the wall, a wooden bench, a wall torch." + F, 811, 'f1')
s = room(s, 1275, 2275, "Furnish only the room between the first and second stone pillars as the castle's great hall: a long wooden dining table with a white cloth, candlesticks and plates, wooden chairs at both ends, a red banner hanging on the wall between two windows. Leave the floor clear around the trapdoor in the floor." + F, 812, 'f2')
s = room(s, 2325, 3190, "Furnish only the room between the second and third stone pillars as the castle's post room: a wooden sorting counter with a brass scale, a low cabinet of pigeonholes stuffed with letters standing below the windows, a few parcels and a mail sack on the floor." + F, 813, 'f3')
s = room(s, 3240, 3790, "Furnish only the room between the third stone pillar and the right staircase as the castle's tavern: a wooden bar counter with mugs, two barrels on a rack, a small round table with two stools, a hanging lantern. Keep the staircase clear." + F, 814, 'f4')
print('done', s)
