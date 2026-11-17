"""Monster Hunt's board monsters, drawn with PixelLab: assets/img/hunt/<monster>.webp (see CREDITS.md).

usage: hunt_art.py OUT_DIR [NAME ...]        ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<name>-<n>.png
       hunt_art.py OUT_DIR --pick NAME=N ...  trim pick N and save it in assets/img/hunt (places: place-<tile>, cards: card-<id>)

Also the board's places (Ladi, Nov 16: "I don't want them to be another boring text based game"): each tile of a board
drawn as a spot on the night street (PLACES, 128 px scenes), and an item icon for every card in the hand (CARDS, 64 px).

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
    'phantom': 'a horror ghost: a pale tattered shroud floating over a broken wooden workbench stool, a cracked pocket watch for a face with its hands spinning, long thin smoky fingers trailing glitching red error sparks, hollow and flickering',
    'warden': 'a horror mimic: a tall iron dungeon door standing upright with long thin clawed arms, a slot of glowing eyes in its grille, holding a dripping red wax seal stamp, a ring of rusty keys rattling at its hinge',
}
PLACES = {
    'callers': 'a crowd of small hooded townsfolk with lanterns queueing at the mouth of a cobbled alley, holding parcels',
    'gate': 'an old stone shrine gate across a cobbled street, a wooden bucket of glowing blue marbles hanging from its beam',
    'queue': 'a wooden handcart heaped with stacked shipping crates under a lantern, parked against a wall',
    'fn': 'a small cluttered workshop with a workbench, wooden stools and tools, lit by a lamp through an open door',
    'table': 'a dark archive hall with tall iron filing cabinets in a row, one cabinet glowing red hot',
    'door': 'a heavy iron vault door set into a stone wall, a big wax seal across it, a ring of keys on a nail',
}
CARDS = {
    'dlq': 'a glass specimen jar with a cork lid, holding a crumpled letter',
    'dlqfifo': 'a glass specimen jar with a cork lid and a numbered tag, holding a crumpled letter',
    'vislong': 'a brass hourglass with sand running',
    'vis6x': 'a brass hourglass with six notches on its frame',
    'longpoll': 'a long fishing rod with a lantern on the line',
    'purge': 'a burning broom sweeping papers',
    'batch10': 'a wooden crate tied with rope holding ten letters',
    'fntimeout': 'a brass pocket watch, open',
    'condwrite': 'a wax seal stamp pressing a checkmark',
    'backoff': 'a curved snail shell with a small clock face',
    'retrymore': 'a fist knocking on a door, motion lines',
    'burstup': 'a red bursting balloon',
    'quota': 'a long scroll of paper with a big rubber stamp',
    'lambdaconc': 'a row of three small wooden stools with a reserved sign',
    'usage': 'a brass key with a speed limit tag',
    'shard': 'a broken clay tablet split into three pieces',
    'unique': 'a ring of many different small keys',
    'wcuup': 'a tall stack of coins with an up arrow',
    'ondemand': 'a brass tap faucet pouring coins',
    'dax': 'a small treasure chest full of glowing scrolls',
    'idallow': 'a name badge on a lanyard with a green tick',
    'resallow': 'a wooden door hanger sign with a green tick',
    'admin': 'a gold crown with a skeleton key through it',
    'undeny': 'a red X sign being torn in half',
    'trust': 'two hands shaking over a scroll',
    'stsallow': 'a mask on a stick, a masquerade mask',
    'roleadmin': 'a gold crown on a mask',
    'tmo15': 'a large brass alarm clock with its hands turned forward',
    'mem1g': 'a glass jar overflowing with glowing blue marbles',
    'rcup': 'a long wooden bench with many seats and a reserved sign',
    'provconc': 'a row of five lit lanterns kept warm on a shelf',
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
        if name.startswith('place-'):
            desc, size, bg = 'pixel art dark fantasy horror RPG location tile, three-quarter top-down view, moody night palette lit by warm lantern light, eerie, no people unless described, no text: %s' % PLACES[name[6:]], 128, False
        elif name.startswith('card-'):
            desc, size, bg = 'pixel art RPG inventory item icon, single object centred, bold dark outline, warm lantern-lit palette, no text: %s' % CARDS[name[5:]], 64, True
        else:
            desc, size, bg = 'pixel art dark fantasy horror RPG monster sprite, full body, front three-quarter view, bold dark outline, moody night palette lit by warm lantern light from one side, eerie and creepy, not gory: %s' % MONSTERS[name], SIZE, True
        ims = job('generate-image-v2', dict(description=desc, image_size=dict(width=size, height=size), seed=SEED, no_background=bg, style_image=style()))
        for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%d.png' % (name, n)))
        print(name, len(ims), flush=True)


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        name, n = p.split('=')
        im = Image.open(os.path.join(out, '%s-%s.png' % (name, n))).convert('RGBA')
        if name.startswith('place-'):   # a scene: kept whole
            im.save(os.path.join(OUT, name + '.webp'), lossless=True, method=6); print(name, im.size); continue
        a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
        im.putalpha(a)
        im = im.crop(a.getbbox())
        im.save(os.path.join(OUT, name + '.webp'), lossless=True, method=6)
        print(name, im.size)


if __name__ == '__main__':
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == '--pick': pick(out, sys.argv[3:])
    else: generate(out, sys.argv[2:] or list(MONSTERS))  # e.g. place-queue card-dlq
