"""The Live shift's machine, drawn with PixelLab: assets/img/ic-live/<name>.webp (see CREDITS.md).

usage: ic_live_art.py OUT_DIR [NAME ...]        ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<name>-<n>.png
       ic_live_art.py --pick OUT_DIR NAME:N ...  trim NAME-N.png, harden its alpha and save assets/img/ic-live/NAME.webp

Each part of the request path is a thing in Uptima's on-call camp (Ladi, 2026-11-16, "Art and music"): API Gateway is the
camp gate, a Lambda function is a clerk's desk, account concurrency is a row of stools (one per concurrent execution),
the SQS queue is an envelope rack, the dead-letter queue is a bin and the DynamoDB table is a vault. Requests are
envelopes that move between them. The parts keep their names in words; the art is beside the words, never instead.
The style image is Exam Sprint's Lamp House, so the camp matches the Proving Road.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/ic-live')
STYLE = os.path.join(GAME, 'assets/img/sprint/lamp-house.webp')
BASE = 'pixel art game object, three-quarter top-down view, cozy fantasy camp at night, warm lantern light, clean dark outline: '
ITEMS = {
    # name: (size, description)
    'gate': (64, 'a small wooden camp gate with a lantern on each post and a little ticket window, open in the middle'),
    'desk': (64, 'a small wooden clerk desk with a stack of papers, an ink pot and a quill, empty chair'),
    'reports': (64, 'a cluttered wooden desk piled high with ledgers and rolled reports, a big grey filing box beside it'),
    'rack': (64, 'a wooden wall rack of pigeonhole cubbies holding sealed paper envelopes'),
    'bin': (64, 'a dented iron bin with a lid ajar, a few crumpled envelopes inside, a small skull tag on the front'),
    'vault': (64, 'a squat iron vault door set in stone with a round wheel handle and brass rivets'),
    'stool': (32, 'a single empty round wooden stool'),
    'stool-orders': (32, 'a single round wooden stool with a small blue cushion and a quill resting on it'),
    'stool-reports': (32, 'a single round wooden stool with a grey cushion and a thick ledger resting on it'),
    'env': (32, 'a single sealed paper envelope with a red wax seal'),
    'env-429': (32, 'a single paper envelope stamped with a big red X, slightly crumpled'),
    'env-done': (32, 'a single opened paper envelope with a green check mark ribbon'),
    'env-poison': (32, 'a single black envelope with a green glowing skull wax seal, wisps of purple smoke'),
    'env-twice': (32, 'two identical overlapping paper envelopes with the same red wax seal'),
}
SEED = 23


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
    im = Image.open(STYLE).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out, names):
    os.makedirs(out, exist_ok=True)
    st = style()
    for name in names or ITEMS:
        if os.path.exists(os.path.join(out, name + '-0.png')): continue
        size, desc = ITEMS[name]
        ims = job('generate-image-v2', dict(description=BASE + desc, image_size=dict(width=size, height=size), seed=SEED,
                                            no_background=True, style_image=st))
        for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%d.png' % (name, n)))
        print(name, len(ims), flush=True)


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        name, _, n = p.partition(':')
        im = Image.open(os.path.join(out, '%s-%s.png' % (name, n or 0))).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
        im.putalpha(a)
        box = a.getbbox()
        if box: im = im.crop(box)
        im.save(os.path.join(OUT, name + '.webp'), 'WEBP', lossless=True)
        print(name, im.size)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == '--pick': pick(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) > 1: generate(sys.argv[1], sys.argv[2:])
    else: sys.exit(__doc__)
