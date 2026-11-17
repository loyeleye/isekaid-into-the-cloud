# Pingsby's Quarter, living world: Sogni prompts (Nov 17)

These repaint the Quarter map in Architect's Draft, where every blueprint you seal stands on a plot. Today it's drawn on a canvas: flat boxes for buildings, a dashed ghost under a "DELETE" tag for an empty plot, and a blue strip for the river. The Renovation's living world uses the same style, so these follow the same rules as `sogni-prompts.md`. Every prompt opens with the same style line and has no text or letters. Sprites go on plain flat white, whole and centred, with no ground and no shadow. Save picks in `living-world/sogni/` under the names below.

**Count: 29 renders.** That's more than the 16 I guessed earlier. In the game a building belongs to its client, not to its exam domain. Mira's is always an infirmary and Kai's always a kitchen annex, and the domain only shows as a shape tag (▲ ■ ● ◆) on the plot. So it's 7 client buildings in 3 sizes (21), plus 8 other pieces. Only 7 of the 21 are text to image. The other 14 are quick image edits from that pick.

**How it plays on screen:**
- **Each plot** is a small square of ground (`lot`) in a 5 × 6 grid. The river runs between rows 3 and 4 (`river`).
- **A building grows with its floors.** In the game a building has 1 to 6 storeys. 1–2 storeys shows `-small`, 3–4 shows `-mid` and 5–6 shows `-tall`, so a building visibly grows as you earn floors.
- **A building with a wrong slot** stands under `scaffold`, laid over the building and stretched to its height. Cracks from a Sure miss stay as thin dark lines drawn in code, so they need no render.
- **An empty plot** shows a faded copy of a small building as the "ghost of the old house", with `delete-marker` hung on it. The game writes DELETE on the blank placard.
- **Landmarks:** one per domain once five of its buildings stand.
- **The plots are small,** about 64 px on a phone. Every building needs a bold silhouette, a clear roof colour and one stand-out feature, so you can tell them apart at that size.

---

## 1. The client buildings (21)

**How to render each set:**
1. Render `-mid` with text to image at 768×1024.
2. Image edit `-tall` from that pick, and `-small` from the same pick.
3. Keep the same front width and the same ground-floor door in all three, so the building grows upward and doesn't change shape.

Every building is seen straight from the front at standing height, like the Beanstalk Row houses.

**Image edit prompt for the other two sizes.** Swap in the storey count:
- `-tall`: "five storeys, with the same ground floor, the same roof and the same feature on top, the extra storeys stacked in between with matching windows"
- `-small`: "only one storey and the roof, the same ground floor with its door, the same roof and feature sitting directly on it"

```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. The same building seen straight from the front, in the same style, colours and width, now [STOREYS]. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `mira-mid` (Mira's infirmary)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A small three-storey village infirmary seen straight from the front at standing height: clean pale grey-white plastered walls with dark slate-blue timber trim, a steep dark slate-blue tiled roof, tall narrow windows with crisp white curtains, a neat green door with bundles of drying herbs hung over it and a small window box of white flowers. Calm, tidy and precise. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing, no cross symbol.
```

### `seoyeon-mid` (Seo-yeon's gatehouse)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A three-storey village gatehouse seen straight from the front at standing height: cream plastered walls on a grey stone base, a deep crimson tiled roof with elegant upturned curved eaves, a heavy arched wooden gate studded with iron as the ground-floor door, small lattice windows above, and a pair of red paper lanterns hanging at the gate. Proud and formal. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `dutch-mid` (Dutch's night office)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A three-storey village night office seen straight from the front at standing height: weathered grey-beige stone walls, a deep navy-blue slate roof with a crooked chimney, closed dark wooden shutters on every window except one warmly lamplit window on the top floor, a plain heavy door with a brass knocker, and an iron lantern burning beside it. Quiet, watchful, a little noir. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `kai-mid` (Kai's kitchen annex)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A three-storey village kitchen annex seen straight from the front at standing height: bright white plastered walls with honey-wood beams, a bright tomato-red tiled roof, a fat brick chimney puffing warm smoke, a red-and-white striped awning over a wide open serving hatch on the ground floor with copper pots and a string of garlic hanging inside, and herbs growing in pots on the sills. Busy, warm and loud. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `marrow-mid` (Goodwife Marrow's bell house)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A three-storey village bell house seen straight from the front at standing height: warm cream stone walls, a deep plum-purple tiled roof topped by a small open wooden belfry holding one polished bronze bell with a rope hanging down, round-arched windows, and a sturdy plum-painted door. Steady and dependable. The whole building centred and complete from belfry to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `pip-mid` (Pip's lost and found)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A narrow, cosy three-storey village lost-and-found shop seen straight from the front at standing height: very pale sky-blue plastered walls, a bright sky-blue tiled roof, small round porthole windows, a little blue door with a bell above it, and beside the door a wicker basket overflowing with odd lost things: a single mitten, an umbrella, a toy boat and a ball of yarn. Small, shy and sweet. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

### `coo-mid` (Postmaster Coo's post office)
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A three-storey village post office seen straight from the front at standing height: warm parchment-coloured plastered walls with dark timber framing, a terracotta tiled roof, a row of small wooden pigeonholes under the eaves with two grey pigeons perched on them, a red wooden post box with a brass slot by the door, and neat bundles of tied parcels on the sill. Orderly and official. The whole building centred and complete from roof to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no signs with writing.
```

---

## 2. Plots, river and repair work (4)

`lot`, 1024×1024 (text to image). This is the ground tile every plot stands on:
```
2D anime background art, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A single square village building plot seen from slightly above, filling the whole frame edge to edge: soft trampled grass with a few small wildflowers, a worn border of old cobblestones around the edge, and a patch of bare packed earth in the middle where a house would stand. Warm golden evening light. Nothing standing on it. No people, no buildings, no text, no letters.
```

`river`, 1344×768 (text to image). I crop a strip from it for the river between rows 3 and 4:
```
2D anime background art, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A gentle village river seen from slightly above, flowing straight from left to right across the whole frame: clear blue water with soft ripples and small glints of golden evening light, low grassy banks with reeds and a few smooth stones along the top and bottom edges. The water fills the middle of the frame from edge to edge. No bridge, no boats, no people, no text, no letters.
```

`scaffold`, 768×1024 (text to image). It's laid over a building, so the openings between the poles must show plain white:
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A free-standing wooden building scaffold seen straight from the front: two tall honey-wood poles on each side lashed with rope, four evenly spaced horizontal plank walkways between them, one long diagonal brace, a loose blue-grey canvas tarp draped over the top plank, and a small yellow-and-black striped warning board leaning at the bottom. Open frame, with the white background showing clearly through every gap. The whole scaffold centred and complete from top to bottom, on a plain flat white background, no ground, no shadow. No building behind it, no people, no text, no letters.
```

`delete-marker`, 768×1024 (text to image):
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A small wooden stake driven upright with a blank rectangular red-painted wooden placard nailed across its top, the paint a little worn, a strip of red cloth tied around the stake. The placard face is completely blank. The whole marker centred and complete from placard to the stake's point, on a plain flat white background, no ground, no shadow. No text, no letters, no symbols.
```

---

## 3. Landmarks (4)

One per exam domain, shown on the Quarter once five buildings of that domain stand. Each is 768×1024 text to image, seen from the front at standing height like the buildings, and a little grander.

`landmark-fountain` (The Sorting Fountain):
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A grand round stone village fountain seen straight from the front: a wide carved basin, a central pillar with three tiers of smaller bowls, and clear water spilling from the top bowl into channels that split neatly into four separate streams. Golden evening light on pale stone. The whole fountain centred and complete, on a plain flat white background, no ground, no shadow. No people, no text, no letters.
```

`landmark-arch` (The Keystone Arch):
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A tall free-standing stone archway seen straight from the front: two square pale stone pillars joined by a rounded arch of fitted blocks, with one large golden keystone carved with a keyhole shape at the very top. Strong and solid. The whole arch centred and complete, on a plain flat white background, no ground, no shadow. No people, no text, no letters.
```

`landmark-clock` (The Clock Tower):
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A slender village clock tower seen straight from the front: cream stone walls, a steep slate-blue pointed roof, one large round clock face with two hands and no numbers near the top, a small arched door at the base. The whole tower centred and complete from spire to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no numbers.
```

`landmark-lantern` (The Lantern Tower):
```
2D anime game sprite, hand-painted cel-style fantasy village, soft painterly light, clean shapes, not photoreal. A tall tapering white lantern tower seen straight from the front, like a small lighthouse: whitewashed walls with three bold red bands, a glass lantern room at the top glowing warm golden amber, and a small wooden door at the base. The whole tower centred and complete from top to doorstep, on a plain flat white background, no ground, no shadow. No people, no text, no letters, no green light.
```
