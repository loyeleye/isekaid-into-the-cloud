"""Wearable cosmetics drawn with PixelLab, written to assets/img/wear/<id>.webp and <id>-s.webp (see CREDITS.md).

usage: wear_art.py OUT_DIR [ID ...]      ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<id>-<size>-<n>.png
       wear_art.py OUT_DIR --pick ID=N[,M] ...   trim pick N (big) and M (small, default N) into assets/img/wear

Each cosmetic is drawn twice on a clear background with Kai's 1x portrait as the style image: big (for the dialogue
portraits, which are 1x PixelLab busts shown 3x) and small (for the full-body leads in battle and the party room).
generate-image-v2 returns four versions; the picks are trimmed to their edges and saved at 1x. js/wear.js places them.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/wear')
STYLE = 'pixel art game accessory sprite, front view, isolated on a clear background, nothing else in the picture, no head, no person, '
ITEMS = {
    'hat-beanie': 'a cosy knitted teal beanie hat with a fold-up cuff and a cream pom-pom on top',
    'hat-crown': 'a small shiny gold crown with three points and red and blue gems',
    'hat-party': 'a striped pink and yellow cone party hat with a fluffy pom-pom on the tip',
    'hat-wizard': 'a tall floppy purple wizard hat with a wide brim and little gold stars',
    'hat-cloud': 'a fluffy white cloud worn as a hat, soft and puffy, with a pale blue shadow underneath',
    'hat-golden': 'a gleaming golden top hat with a dark band, polished and sparkling',
    'scarf-red': 'a red wool scarf wrapped once around a neck, the two ends hanging down in front',
    'scarf-knit': 'a chunky knitted scarf with cream and forest green stripes, wrapped around a neck, one end hanging down',
    'scarf-cloud': 'a soft sky-blue scarf with little white clouds on it, wrapped around a neck, one end hanging down',
    'scarf-golden': 'a shimmering golden silk scarf with a fringe, wrapped around a neck, one end hanging down',
}
SIZES = {'big': 96, 'small': 40}
SEED = 11


def call(url, data=None):
    r = urllib.request.Request('https://api.pixellab.ai/v2/' + url, data=json.dumps(data).encode() if data else None,
                               headers={'Authorization': 'Bearer ' + os.environ['PIXELLAB_API_KEY'], 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=180))


def job(url, data):
    j = call(url, data)['background_job_id']
    while True:
        r = call('background-jobs/' + j)
        if r['status'] == 'failed': sys.exit('PixelLab: ' + json.dumps(r)[:500])
        if r['status'] == 'completed':
            return [Image.open(io.BytesIO(base64.b64decode((i['base64'] if isinstance(i, dict) else i).split(',')[-1]))).convert('RGBA')
                    for i in r['last_response']['images']]
        time.sleep(5)


def style():
    im = Image.open(os.path.join(GAME, 'assets/img/portraits/kai-neutral.webp')).convert('RGBA')
    im = im.resize((im.width // 3, im.height // 3), Image.NEAREST)
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out, ids):
    os.makedirs(out, exist_ok=True)
    st = style()
    for id in ids:
        for size, px in SIZES.items():
            if os.path.exists(os.path.join(out, '%s-%s-0.png' % (id, size))): continue
            ims = job('generate-image-v2', dict(description=STYLE + ITEMS[id], image_size=dict(width=px, height=px), seed=SEED,
                                                no_background=True, style_image=st))
            for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%s-%d.png' % (id, size, n)))
            print(id, size, len(ims))


def open_neck(im):
    """A scarf is drawn as a loop seen from the front, its dark inside showing above the knot. Worn, the neck fills that
    loop, so clear the dark inside (the darkest patch in the top middle, flooded while it stays dark) and the back of the
    loop above it, leaving the scarf to wrap round the neck."""
    W, H = im.size
    px = im.load()
    lum = lambda p: 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]
    opaque = sorted(lum(px[x, y]) for x in range(W) for y in range(H) if px[x, y][3])
    dark = opaque[len(opaque) // 6]
    box = [(x, y) for x in range(int(W * .3), int(W * .7)) for y in range(int(H * .04), int(H * .45)) if px[x, y][3] and lum(px[x, y]) <= dark]
    if not box: return im
    seed = min(box, key=lambda p: lum(px[p[0], p[1]]))
    hole, todo = set(), [seed]
    while todo:
        x, y = todo.pop()
        if (x, y) in hole or not (0 <= x < W and 0 <= y < H) or not px[x, y][3] or lum(px[x, y]) > dark * 1.15: continue
        if y > H * .6: continue
        hole.add((x, y)); todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    if len(hole) < 6: return im
    for x, y in hole: px[x, y] = (0, 0, 0, 0)
    xs = sorted({x for x, _ in hole})
    for x in xs:
        top = min(y for hx, y in hole if hx == x)
        for y in range(top): px[x, y] = (0, 0, 0, 0)
    return im.crop(im.getchannel('A').getbbox())


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        id, ns = p.split('=')
        ns = ns.split(',')
        for size, n, suffix in (('big', ns[0], ''), ('small', ns[-1], '-s')):
            im = Image.open(os.path.join(out, '%s-%s-%s.png' % (id, size, n))).convert('RGBA')
            a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
            im.putalpha(a)
            im = im.crop(a.getbbox())
            if id.startswith('scarf-') and size == 'big': im = open_neck(im)
            im.save(os.path.join(OUT, id + suffix + '.webp'), lossless=True, method=6)
            print(id + suffix, im.size)


if __name__ == '__main__':
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == '--pick': pick(out, sys.argv[3:])
    else: generate(out, sys.argv[2:] or list(ITEMS))
