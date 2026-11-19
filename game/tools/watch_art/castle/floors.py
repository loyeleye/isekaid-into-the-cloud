# Build a castle floor from an empty hall, one Sogni edit per feature (same method as the ground floor's run.py).
# Usage: python3 floors.py cellars|upper|towers   -> writes hd/<floor>-*.png, one per step; step sheet made separately.
import sys, os, shutil
import winedit
K = ' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left, strict side view.'
F = ' Everything stands on the floor, in strict side view, sized for people (a person is about as tall as the bottom of the windows), and nothing covers the windows, the stairs or the trapdoor. Nothing in the other rooms.'
def step(src, x0, prompt, seed, name, keep=(256, 1792)):
    if os.path.exists(f'hd/{name}.png'): return f'hd/{name}.png'
    for t in range(4):
        try: out = winedit.run(src, f'hd/{name}.png', x0, prompt + K, [seed + 100 * t], keep=keep, tag='hd-' + name)[0]; break
        except FileNotFoundError: continue
    shutil.copy(out, f'hd/{name}.png'); print(name, flush=True); return f'hd/{name}.png'
def room(src, rx0, rx1, prompt, seed, name):
    x0 = min(max(0, (rx0 + rx1) // 2 - 1024), 2048)
    return step(src, x0, prompt, seed, name, keep=(rx0 - x0 + 24, rx1 - x0 - 24))
STAIR = 'Add only one staircase, at the far {side} just inside the {side} outer wall, in strict side view: a stone staircase against the back wall that starts on the floor and climbs {dir} to the {side}, through a dark opening in the ceiling, with a wooden handrail. Nothing else added.'
TRAP = 'Add only one thing, in the exact middle of the hall: a closed square wooden trapdoor with iron bands and an iron ring, set flush into the stone floor, seen in strict side view as a thin wooden edge in the floor line, about as wide as a person. Nothing on the ceiling. Nothing else added.'
SIGN = ' Also hang a small wooden sign on iron chains from the ceiling beam in the middle of this room, showing only a simple painted picture of {}, no letters or text.'
# Rooms keep clear of the trapdoor (x ~1880-2130) and the stairs (x <300, >3790).
# Floors are corridors; each room is an archway doorway (Ladi, Nov 18) and its interior is a popup painting (rooms.py).
# Room ids follow js/watch-world.js; the tavern moves to the cellars (Ladi's choice).
FLOORS = {
 'cellars': dict(base='Turn this whole hall into the castle cellars below ground, keeping its size, floor line and the outer walls: low round brick vaults springing from thick stone piers instead of the flat ceiling beams, rougher darker stone walls, no windows at all, a few iron wall torches. Empty of furniture. Nothing else added.',
   up=True, rooms=[(420, 1000, 'archive', 'a rolled scroll'), (1100, 1780, 'strongroom', 'a golden key'),
                   (2200, 2900, 'barracks', 'a crossed spear and shield'), (2980, 3380, 'tavern', 'a foaming beer mug')]),
 'upper': dict(base=None, up=True, down=True, rooms=[(420, 1300, 'wardrobe', 'a hanging cloak'), (1350, 1830, 'ledger', 'an open book'),
                   (2230, 3350, 'bridge-tower', 'a stone bridge')]),
 'towers': dict(base='Turn this hall into the top floor of the castle under the roof: open sky through tall open arches in the back wall instead of glass windows, the openings filled with plain bright green (#00FF00) where the sky would be, wooden roof beams above. Empty of furniture. Nothing else added.',
   down=True, rooms=[(420, 1300, 'watchtower', 'a brass bell'), (1350, 1830, 'lookout', 'an eye'), (2230, 3350, 'captain', "a captain's plumed helmet")]),
}
fl = sys.argv[1]; c = FLOORS[fl]; s = 'steps/H0.png'; n = {'cellars': 900, 'upper': 950, 'towers': 990}[fl]
if c.get('base'):
    s = step(s, 0, c['base'], n, f'{fl}-0a'); s = step(s, 2048, c['base'], n + 1, f'{fl}-0b')
    # middle pass: the two halves leave x 1792-2304 untouched
    s = step(s, 1024, c['base'].replace('Turn this whole hall', 'Make the middle of this hall match both sides').replace('Turn this hall', 'Make the middle of this hall match both sides'), n + 5, f'{fl}-0', keep=(600, 1450))
# H0 already has no stairs; stairs go up from the left end and down from the right end (matching the ground floor).
if c.get('up'): s = step(s, 0, STAIR.format(side='left', dir='up'), n + 2, f'{fl}-1')
if c.get('down'): s = step(s, 2048, STAIR.format(side='right', dir='down').replace('climbs down to the right, through a dark opening in the ceiling', 'goes down to the right, through a dark opening in the floor'), n + 3, f'{fl}-2')
# Cellars: no floor trapdoor; the middle stays clear for the ladder prop that climbs up to the ground-floor trapdoor.
if fl != 'cellars': s = step(s, 1024, TRAP, n + 4, f'{fl}-3')
# Rooms are doorways on the floor (Ladi, Nov 18); each interior is a separate popup painting (rooms.py).
DOOR = 'Add only one thing, centred in this stretch of the back wall: an open stone archway doorway set into the wall, about one and a half times as tall as a person, its sill on the floor line, showing a softly lit room beyond. Above the arch hang a small wooden sign on iron chains showing only a simple painted picture of {}, no letters or text. Nothing else added.'
for i, (a, b, rid, sign) in enumerate(c['rooms']):
    s = room(s, a, b, DOOR.format(sign), n + 10 + i, f'{fl}-d{i+1}')
print('done', s)
