"""The Sorting Floor's room pieces, drawn with PixelLab: assets/img/floor/<id>.webp (see CREDITS.md).

usage: floor_room_art.py OUT_DIR                 ask PixelLab (needs PIXELLAB_API_KEY): OUT_DIR/<id>-<n>.png, 4 versions each
       floor_room_art.py OUT_DIR --pick ID=N ...  trim pick N, scale it to its height below, save it as webp

One generate-image-v2 job per piece (6 jobs), with Incident Commander's clerk's desk (assets/img/ic-live/desk.webp) as
the style image, so the floor's own pieces sit with the desk, stools, rack, bin, gate and envelopes it borrows from there.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/floor')
PIECES = {  # id: (description, height in px)
    'chute': ('a slanted wooden mail chute coming down from a ceiling hatch, paper tags sliding down it, brass rivets', 64),
    'router': ('a brass pneumatic tube junction box on a wooden stand, one pipe in at the top and three pipes out, little dials and a sorting lever', 56),
    'bell': ('a big polished brass service bell on a small wooden stand, ringing, with sound lines', 40),
    'lever': ('a heavy brass pull lever on an iron post with a red wooden handle, mounted to a wooden floor plate', 60),
    'nightclerk': ('a sleepy old night clerk in a nightcap and long robe, slumped across three wooden stools, snoring, holding a stack of reports', 48),
    'mop': ('a wooden mop leaning in a dented tin bucket of water, a little puddle at its base', 48),
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
    im = Image.open(os.path.join(GAME, 'assets/img/ic-live/desk.webp')).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out):
    os.makedirs(out, exist_ok=True)
    st = style()
    for k, (desc, _) in PIECES.items():
        if os.path.exists(os.path.join(out, '%s-0.png' % k)): continue
        ims = job('generate-image-v2', dict(description='pixel art game prop, three-quarter view, warm lantern light: ' + desc,
                                            image_size=dict(width=64, height=64), seed=SEED, no_background=True, style_image=st))
        for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%d.png' % (k, n)))
        print(k, len(ims), flush=True)


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        k, n = p.split('=')
        im = Image.open(os.path.join(out, '%s-%s.png' % (k, n))).convert('RGBA')
        a = im.split()[3].point(lambda v: 255 if v > 96 else 0); im.putalpha(a)   # hard alpha edges
        im = im.crop(im.getbbox())
        h = min(PIECES[k][1], im.height)
        im = im.resize((max(1, round(im.width * h / im.height)), h), Image.NEAREST)
        im.save(os.path.join(OUT, '%s.webp' % k), 'WEBP', lossless=True)
        print('saved floor/%s.webp' % k, im.size)


if __name__ == '__main__':
    if '--pick' in sys.argv: pick(sys.argv[1], sys.argv[sys.argv.index('--pick') + 1:])
    else: generate(sys.argv[1])
