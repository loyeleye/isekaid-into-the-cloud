"""Monster Hunt's board monsters, drawn with PixelLab: assets/img/hunt/<monster>.webp (see CREDITS.md).

usage: hunt_art.py OUT_DIR [MONSTER ...]        ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<monster>-<n>.png
       hunt_art.py OUT_DIR --pick MONSTER=N ...  trim pick N and save it in assets/img/hunt

Each monster IS an AWS failure (js/hunt-core.js MONSTERS), drawn in a night-horror style to match the Monster Hunt card's
mimic video (Ladi, Nov 16), with the game's incident monsters (assets/img/monsters/echo.webp) as the style image so they sit with the rest of the bestiary. generate-image-v2 returns
four versions per call: one call per monster.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/hunt')
MONSTERS = {
    'poison': 'a horror mimic: a rotting sealed parchment envelope that has grown a gaping mouth of needle teeth and one bloodshot eye, black ooze dripping from a cracked skull wax seal, scratched tally marks carved into it, lurking',
    'gate': 'a horror mimic: a looming ancient stone shrine gate that has come alive, hollow glowing eye sockets, a long jaw of broken stone teeth, clutching a bucket of pale glowing marbles to its chest, moss and chains',
    'hydra': 'a horror creature: a three-headed hydra of rusted iron filing-cabinet drawers with drawer-mouths full of teeth, one head swollen, red-hot and steaming, the other two small and starved, lurching',
    'warden': 'a horror mimic: a tall iron dungeon door standing upright with long thin clawed arms, a slot of glowing eyes in its grille, holding a dripping red wax seal stamp, a ring of rusty keys rattling at its hinge',
}
SEED = 11
SIZE = 96


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
    im = Image.open(os.path.join(GAME, 'assets/img/monsters/echo.webp')).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out, names):
    os.makedirs(out, exist_ok=True)
    for name in names:
        if os.path.exists(os.path.join(out, '%s-0.png' % name)): continue
        desc = 'pixel art dark fantasy horror RPG monster sprite, full body, front three-quarter view, bold dark outline, moody night palette lit by warm lantern light from one side, eerie and creepy, not gory: %s' % MONSTERS[name]
        ims = job('generate-image-v2', dict(description=desc, image_size=dict(width=SIZE, height=SIZE), seed=SEED, no_background=True, style_image=style()))
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
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == '--pick': pick(out, sys.argv[3:])
    else: generate(out, sys.argv[2:] or list(MONSTERS))
