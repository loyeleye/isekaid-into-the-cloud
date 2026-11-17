# Packs the Sorting Floor hall's art (js/rush-hall.js) into assets/img/rush/hall/.
# Sources: Sogni renders (z_image_turbo_bf16, Nov 17) saved in project files sogni/rush-hall/, and Dutch cut from the
# Fire Drill's war-room plate with its matte (assets/img/drill/room.webp, room-leads-matte.png).
#   python3 tools/rush_hall_pack.py <folder with the renders>
import sys, os
from PIL import Image, ImageDraw, ImageFilter
SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, '..', 'assets', 'img')
OUT = os.path.join(IMG, 'rush', 'hall')
os.makedirs(OUT, exist_ok=True)

def plate(name):
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGB').resize((1344, 768), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=84)

def cut(name, h, tol=26, keep_grey=False):
    # Flood the flat grey background from the border, then feather the edge a little.
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
    w0, h0 = im.size
    mark = im.copy()
    seeds = [(x, y) for x in range(0, w0, 32) for y in (0, h0 - 1)] + [(x, y) for y in range(0, h0, 32) for x in (0, w0 - 1)]
    for s in seeds:
        if mark.getpixel(s) != (255, 0, 255):
            ImageDraw.floodfill(mark, s, (255, 0, 255), thresh=tol)
    a = Image.new('L', im.size, 255)
    px, pa, ipx = mark.load(), a.load(), im.load()
    for y in range(h0):
        for x in range(w0):
            if px[x, y] == (255, 0, 255): pa[x, y] = 0
            else:
                # Background showing through closed shapes (between spokes) and the grey drop shadow: neutral greys.
                r_, g_, b_ = ipx[x, y]
                if max(r_, g_, b_) - min(r_, g_, b_) < 9 and 150 <= r_ <= 252 and keep_grey is False: pa[x, y] = 0
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(a)
    im = im.crop(im.getbbox())
    r = h / im.height
    im = im.resize((max(1, int(im.width * r)), h), Image.LANCZOS)
    im.save(os.path.join(OUT, name.replace('p-', '') + '.webp'), quality=88)

def dutch():
    room = Image.open(os.path.join(IMG, 'drill', 'room.webp')).convert('RGBA')
    m = Image.open(os.path.join(IMG, 'drill', 'room-leads-matte.png')).split()[-1].resize(room.size)
    room.putalpha(m)
    c = room.crop((1405, 40, 1910, 690))      # Dutch, cut above the counter's bell and mug
    c = c.crop(c.getbbox())
    r = 720 / c.height
    c.resize((int(c.width * r), 720), Image.LANCZOS).save(os.path.join(OUT, 'dutch.webp'), quality=88)

for p in ('wing-cellar', 'wing-dock', 'wing-upstairs'): plate(p)
cut('p-stamp', 260); cut('p-ticket', 200); cut('p-cart', 420); cut('p-lantern', 200); cut('p-crate', 220)
dutch()
print(sorted(os.listdir(OUT)))
