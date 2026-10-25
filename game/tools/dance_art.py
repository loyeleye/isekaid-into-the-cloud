"""Dances for the Emote button's actions, drawn with PixelLab: assets/img/emote/<action>-<lead>.webp (see CREDITS.md).

usage: dance_art.py OUT_DIR ACTION[:LEAD,...] ...    ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<action>-<lead>-<n>.png
       dance_art.py OUT_DIR --strip ACTION-LEAD ...  join the frames (FRAMES + 1, the first the lead's own sprite) into one
                                                    strip, each frame on the padded canvas (PAD), feet on the bottom

The leads' pixel full bodies are one picture, so js/emote.js moves them as a whole; with these frames a lead really
dances in the party room (Ladi, 2026-10-25: "code now, PixelLab dances later"). Each starts from the lead's own standing
sprite (assets/img/lead/<lead>.webp) as the first frame, so it's the same person at the same size. Only the base body
dances: a lead wearing a look keeps the code moves.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/emote')
LEADS = ['kai', 'mira', 'seoyeon', 'dutch']
ACTIONS = {
    'dance': 'energetic happy party dance: both arms thrown up above the head, hips swaying left and right, bouncing on the spot',
    # 'groove' (a disco point) was tried on 2026-10-25 and dropped: Kai's and Seo-yeon's came out as a brow wipe and a
    # sword swing, so Groove keeps the code moves.
    'wave': 'cheerful wave hello: one hand raised high beside the head waving side to side, big smile',
    'cheer': 'jumping for joy: crouches then leaps up with both fists raised high in celebration, big open smile',
}
FRAMES = 8
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


PAD = (1.8, 1.25)            # the dance canvas, as a multiple of the standing sprite's width and height


def pad(im):
    c = Image.new('RGBA', (round(im.width * PAD[0]) // 2 * 2, round(im.height * PAD[1]) // 2 * 2), (0, 0, 0, 0))
    c.alpha_composite(im, ((c.width - im.width) // 2, c.height - im.height))
    return c


def generate(out, wants):
    os.makedirs(out, exist_ok=True)
    for want in wants:
        act, _, leads = want.partition(':')
        for lead in (leads.split(',') if leads else LEADS):
            if os.path.exists(os.path.join(out, '%s-%s-0.png' % (act, lead))): continue
            # Room to move: the body on a wider, taller canvas (PAD), feet on the bottom.
            im = pad(Image.open(os.path.join(GAME, 'assets/img/lead/%s.webp' % lead)).convert('RGBA'))
            b = io.BytesIO(); im.save(b, 'PNG')
            frame = {'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}
            ims = job('animate-with-text-v3', dict(first_frame=frame, action=ACTIONS[act], frame_count=FRAMES, seed=SEED, no_background=True, enhance_prompt=True))
            for n, f in enumerate(ims): f.save(os.path.join(out, '%s-%s-%d.png' % (act, lead, n)))
            print(act, lead, len(ims), flush=True)


def strip(out, names):
    os.makedirs(OUT, exist_ok=True)
    for name in names:
        act, lead = name.split('-', 1)
        base = pad(Image.open(os.path.join(GAME, 'assets/img/lead/%s.webp' % lead)).convert('RGBA'))
        fs, n = [], 0
        while os.path.exists(os.path.join(out, '%s-%d.png' % (name, n))):
            f = Image.open(os.path.join(out, '%s-%d.png' % (name, n))).convert('RGBA')
            if f.size != base.size: f = f.resize(base.size, Image.NEAREST)
            fs.append(f); n += 1
        assert len(fs) == FRAMES + 1, (name, len(fs))
        # The first frame is the lead's own sprite, padded: the strip starts exactly where the seat's picture is.
        fs[0] = base
        s = Image.new('RGBA', (base.width * len(fs), base.height), (0, 0, 0, 0))
        for i, f in enumerate(fs): s.alpha_composite(f, (i * base.width, 0))
        s.save(os.path.join(OUT, name + '.webp'), lossless=True, method=6)
        print(name, len(fs), s.size)


if __name__ == '__main__':
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == '--strip': strip(out, sys.argv[3:])
    else: generate(out, sys.argv[2:] or list(ACTIONS))
