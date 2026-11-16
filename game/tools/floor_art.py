"""The Sorting Floor's claimants, drawn with PixelLab: assets/img/monsters/floor-<id>.webp (see CREDITS.md).

usage: floor_art.py OUT_DIR                 ask PixelLab (needs PIXELLAB_API_KEY): OUT_DIR/<id>-<n>.png, 4 versions each
       floor_art.py OUT_DIR --pick ID=N ...  trim pick N, scale it to the monster sprites' height, save it as webp

One generate-image-v2 job per claimant (7 jobs), with the game's own Mail Storm sprite as the style reference, so they
sit with the existing incident monsters. Each one shows what it does to the request path.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/monsters')
CLAIMANTS = {
    'rush': 'a stampede of tiny paper envelope creatures with legs, piled into one big shoving crowd, all running forward at once, panicked faces',
    'bell': 'a small impatient goblin clerk in a waistcoat, slamming a big brass service bell on a stand, foot tapping, pocket watch in hand',
    'poison': 'a cursed purple envelope creature with a skull-shaped wax seal, dripping ink, sly grin, a quill pen like a dagger',
    'double': 'two identical little paper ghosts holding the same receipt, one a mirror copy of the other, both waving it',
    'ledger': 'a tall stack of numbered ledger books on stubby legs, a pair of spectacles on the top book, a pencil behind its ear, very fussy',
    'crowd': 'a crowd of three small hooded travellers huddled together, one carrying a green leaf banner, one carrying an orange flame banner, all talking at once',
    'alibi': 'a sneaky hooded figure in a long dark coat with a fake name badge and a forged golden key, hiding behind a raised collar',
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


def style():
    im = Image.open(os.path.join(OUT, 'mailstorm.webp')).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out):
    os.makedirs(out, exist_ok=True)
    st = style()
    for k, desc in CLAIMANTS.items():
        if os.path.exists(os.path.join(out, '%s-0.png' % k)): continue
        ims = job('generate-image-v2', dict(description='pixel art game monster, front view, full body, cute and comedic: ' + desc,
                                            image_size=dict(width=96, height=96), seed=SEED, no_background=True, style_image=st))
        for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%d.png' % (k, n)))
        print(k, len(ims), flush=True)


def pick(out, picks):
    for p in picks:
        k, n = p.split('=')
        im = Image.open(os.path.join(out, '%s-%s.png' % (k, n))).convert('RGBA')
        im = im.crop(im.getbbox())
        h = 90
        im = im.resize((max(1, round(im.width * h / im.height)), h), Image.NEAREST)
        im.save(os.path.join(OUT, 'floor-%s.webp' % k), 'WEBP', lossless=True)
        print('saved floor-%s.webp' % k, im.size)


if __name__ == '__main__':
    if '--pick' in sys.argv: pick(sys.argv[1], sys.argv[sys.argv.index('--pick') + 1:])
    else: generate(sys.argv[1])
