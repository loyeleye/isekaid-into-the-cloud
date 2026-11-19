# Room popups, Mira's Kitchen style (Ladi, Nov 18): one interior painting per room, 1600x900 (rendered 1600x896, padded).
# Engine draws Seo-yeon on the floor in the left third (floor line ~y=780) and the breach marker on the focal object.
# Shown as small as 340x190 on a phone: one clear focal object, big readable shapes.
import json, subprocess
S = ('High-detail pixel art interior of a room in a medieval stone castle at night, warm candlelight, strict side view straight on, '
     'eye level, empty of people, big simple readable shapes. The painting fills the whole frame edge to edge: no border, no rounded corners, no black vignette. The stone floor runs across the whole picture near the bottom. '
     'The left third is clear open floor in front of rough stone wall with a wall torch, no frames or empty panels on it. Right of centre stands one large clear focal object: {f} '
     'Around it, smaller and darker, {d} No text, no letters.')
ROOMS = {
 'archive': ('a tall iron-bound scroll vault cabinet with a big padlock and a small clock above it.', 'shelves of scrolls and bound ledgers, a reading desk with a candle.'),
 'strongroom': ('a huge round iron vault door with a big tumbler dial, set in the back wall.', 'iron-bound chests and coin sacks behind a grille, one lantern.'),
 'barracks': ("a big stack of merchants' wooden crates, each tied with a different coloured ribbon, piled in one store corner.", 'bunk beds, a small glowing iron stove, a spear rack.'),
 'tavern': ('a wooden bar counter with a big open log book and a lantern on it, and a board of hanging room keys behind it.', 'ale barrels on racks under a brick vault, a round table with stools.'),
 'wardrobe': ('a rail of red and blue cloaks, each with a dangling paper tag.', 'tall wooden wardrobes, a standing mirror, a small chest.'),
 'ledger': ("a tall cabinet of many small locked drawers with brass keyholes.", "a long clerk's desk with open ledgers and an inkpot, a notice board."),
 'bridge-tower': ('an open arched doorway onto a night stone bridge, with sealed wooden crates stacked by it.', 'a guard post bench, a lantern on a hook, rope coils.'),
 'watchtower': ('a big brass bell hanging in a timber frame.', 'a brass telescope on a tripod by an open arch onto the night sky and battlements.'),
 'lookout': ('a wooden desk with an open guest book and a stack of wooden passes.', 'open arches onto the starry night sky over the town rooftops, a rack of signal flags.'),
 'captain': ("a heavy desk with a red wax seal, a stick of sealing wax, a candle and a stack of letters.", 'a high-backed red chair, a bookcase, a framed town map, a suit of armour.'),
}
jobs = [{'out': f'hd/rooms/{rid}.png', 'w': 1600, 'h': 896, 'seed': 1200 + i, 'prompt': S.format(f=f, d=d)} for i, (rid, (f, d)) in enumerate(ROOMS.items())]
json.dump(jobs, open('jobs-rooms.json', 'w'), indent=1)
subprocess.run(['python3', 'render.py', 'jobs-rooms.json', '1'])
