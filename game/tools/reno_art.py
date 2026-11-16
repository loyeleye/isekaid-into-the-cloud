"""The Renovation's sprites (Architect's Draft), drawn with PixelLab: assets/img/reno/<name>.webp (see CREDITS.md).

usage: reno_art.py OUT_DIR [NAME ...]          ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<name>-<n>.png
       reno_art.py OUT_DIR --pick NAME=N ...    trim pick N and save it as assets/img/reno/<name>.webp

Each item is one generate-image-v2 call (four versions back), with a Proving Road landmark
(assets/img/sprint/land/r1-03.webp) as the style image so the Quarter matches Exam Sprint's pixel art. The new,
scaffolded and broken houses also take the picked old house as a reference image, so they're one house in four states.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/reno')
HOUSE = 'a small two-storey timber-framed village cottage in a fantasy town, cream plaster walls, a door and two windows, front three-quarter view, standing on a little patch of grass'
ITEMS = {
    'house-old': (64, 64, HOUSE + ', a weathered dark slate-blue roof, a bit worn but tidy, warm lit windows'),
    'house-new': (64, 64, HOUSE + ', freshly renovated: a bright new golden-orange tiled roof, fresh paint, a small gold star sign over the door, warm lit windows'),
    'house-scaf': (64, 64, HOUSE + ', completely wrapped in wooden scaffolding with planks and ladders, a canvas sheet over half of it, closed for work'),
    'house-dark': (64, 64, HOUSE + ', broken: a big cracked roof beam, soot stains, dark windows, boards nailed across the door, a little smoke'),
    'lot-rented': (64, 64, 'an empty building plot of packed dirt with a small wooden "for rent" sign on a post and a neat stack of lumber planks, fantasy village'),
    'resident': (32, 32, 'a tiny cheerful villager in a brown tunic and cap walking home, full body, side view, chibi'),
    'resident-soot': (32, 32, 'a tiny villager in a brown tunic and cap covered in black soot, coughing, a little smoke puff, full body, side view, chibi, comic'),
    'bridge': (128, 64, 'a small arched stone footbridge over a stream leading to a little shrine, with a wooden signpost at the near end that has two arrow-shaped arms pointing two ways, side view'),
    'bell': (32, 32, 'a brass alarm bell hanging from a small wooden post, ringing, motion lines'),
    'jar': (32, 32, 'a glass storage jar with a cork lid, full of glowing rolled-up paper scrolls, a snapshot of records'),
    'well': (48, 48, 'a round stone well with a wooden roof and a bucket, ledgers and scrolls stacked beside it, a records well'),
    'ledger': (48, 48, 'a huge open leather ledger book on a wooden lectern, rows and rows of neat entries, a quill'),
    'board': (48, 48, 'a wooden notice board on two posts covered in pinned papers and posters'),
    # The scene pieces (the second pass, Nov 16: "I don't want it to be another basic text game").
    'street-bg': (256, 96, 'a wide side-view backdrop of a cobblestone village street at golden evening, warm sky, distant rooftops and chimneys far behind, a low stone kerb and lamp posts, the front of the street left open and empty for houses, no people'),
    'quarter-map': (256, 192, 'a top-down fantasy village quarter map, a small river crossing it with a stone bridge, dirt paths, a town gate on the left, a little shrine on a hill, a drafting office by the river, a market square with a stage, green grass, a few trees, cosy'),
    'blueprint': (48, 48, 'a rolled-up blue architect blueprint scroll tied with a red string, white technical lines visible on the blue paper'),
    'lever-off': (32, 32, 'a wooden floor lever with a brass knob, the handle pulled all the way down to the left, on a small iron base'),
    'lever-on': (32, 32, 'a wooden floor lever with a brass knob, the handle pushed all the way up to the right, on a small iron base, a little green glint'),
    'ribbon': (64, 40, 'a big red ceremonial ribbon with a large bow tied between two short golden posts, a grand opening ribbon'),
    'pin': (24, 24, 'a small red map pin flag on a wooden stake'),
    'gate': (48, 48, 'a small wooden town gate arch with a lantern and a little turnstile, a gatekeeper\'s slate hanging on it'),
}
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


def ref(name):
    im = Image.open(os.path.join(OUT, name + '.webp')).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def style():
    im = Image.open(os.path.join(GAME, 'assets/img/sprint/land/r1-03.webp')).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out, names):
    os.makedirs(out, exist_ok=True)
    st = style()
    for name in names or ITEMS:
        if os.path.exists(os.path.join(out, '%s-0.png' % name)): continue
        w, h, desc = ITEMS[name]
        extra = {}
        # The renovated, scaffolded and broken houses are the same house as the picked old one.
        if name.startswith('house-') and name != 'house-old' and os.path.exists(os.path.join(OUT, 'house-old.webp')):
            extra['reference_images'] = [dict(ref('house-old'), usage_description='the same house, the same shape, walls, windows and door')]
        ims = job('generate-image-v2', dict(description='pixel art game sprite, ' + desc, image_size=dict(width=w, height=h), seed=SEED, no_background=True, style_image=st, **extra))
        for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%d.png' % (name, n)))
        print(name, len(ims), flush=True)


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        name, n = p.split('=')
        im = Image.open(os.path.join(out, '%s-%s.png' % (name, n))).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
        im.putalpha(a)
        im = im.crop(a.getbbox())
        im.save(os.path.join(OUT, name + '.webp'), lossless=True, method=6)
        print(name, im.size)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == '--pick': pick(sys.argv[1], sys.argv[3:])
    else: generate(sys.argv[1], sys.argv[2:])
