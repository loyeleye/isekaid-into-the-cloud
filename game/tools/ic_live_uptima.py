"""Uptima for the Live shift, painted with Gemini (see CREDITS.md): assets/img/ic-live/uptima-<frame>.webp and the
watch room without her asleep at the desk (assets/img/ic-live/room-wide.webp, room-tall.webp).

usage: ic_live_uptima.py OUT_DIR base [N]            paint the standing Uptima on flat green, N takes (needs GEMINI_API_KEY)
       ic_live_uptima.py OUT_DIR frame NAME BASE.png  edit the base into one frame (blink, talk, happy, ...)
       ic_live_uptima.py OUT_DIR room                 paint the empty room from the card still
       ic_live_uptima.py --key IN.png OUT.webp [H]    key out the green, trim, scale to height H, save lossless WebP
       ic_live_uptima.py --pack DIR BASE.png           the game's files: uptima-body.webp (the whole base, keyed) and one
                                                       face patch per frame (uptima-face-<frame>.webp), feathered, at FACE

Ladi, 2026-11-16: "draw full sized characters in the setting ... see Uptima as a backdrop in the setting talking to you
(living, breathing, blinking and reacting to you)". Every frame is an edit of one base, so they line up exactly and the
game swaps them in place: blink, the mouth open for talking, and her moods.
"""
import base64, json, os, sys, urllib.request
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = 'gemini-3-pro-image'
STYLE = ('Anime visual-novel character art, soft painted cel shading, the same art style, palette and warm lantern '
         'lighting as the reference room painting. ')
UPTIMA = ('Uptima, exactly as on the reference persona sheet: a young woman with very long straight peach-blonde hair with '
          'blunt bangs, warm amber eyes, a white frilled maid headband, a white collar with a red ribbon bow, a long black '
          'dress to the ankles with puffed shoulders and long sleeves ending in white cuffs, and a long white frilled apron '
          'tied with a bow at the back. ')
# Ladi's persona sheet for her (2026-11-16, given in the Fire Drill thread); the room scenes draw her from it.
SHEET = os.environ.get('UPTIMA_SHEET', '/mnt/project-files/game-modes/ic-live-assets/uptima-persona-sheet.png')
FRAMES = {
    'blink': 'Change only her eyes: both eyes gently closed in a natural blink. Everything else stays exactly the same, pixel for pixel.',
    'talk': 'Change only her mouth: slightly open as if mid-word while speaking. Everything else stays exactly the same, pixel for pixel.',
    'happy': 'Change only her face: smug and self-satisfied, taking all the credit: eyes half-lidded, a pleased little smirk, a light blush. Everything else stays exactly the same.',
    'stern': 'Change only her face: lazy and bored, eyelids drooping heavily, a flat unimpressed mouth, as if this is all beneath her. Everything else stays exactly the same.',
    'worried': 'Change only her face: caught out and panicking but trying to look calm: eyes wide and darting to the side, a big anime sweat drop on her temple, a nervous toothy grin. Everything else stays exactly the same.',
}


def img_part(path):
    mime = 'image/png' if path.endswith('.png') else 'image/webp' if path.endswith('.webp') else 'image/jpeg'
    return {'inline_data': {'mime_type': mime, 'data': base64.b64encode(open(path, 'rb').read()).decode()}}


def ask(parts, out, aspect=None):
    cfg = {'responseModalities': ['IMAGE']}
    if aspect: cfg['imageConfig'] = {'aspectRatio': aspect}
    body = {'contents': [{'parts': parts}], 'generationConfig': cfg}
    r = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % MODEL,
                               data=json.dumps(body).encode(), headers={'x-goog-api-key': os.environ['GEMINI_API_KEY'], 'Content-Type': 'application/json'})
    res = json.load(urllib.request.urlopen(r, timeout=300))
    for p in res['candidates'][0]['content']['parts']:
        d = p.get('inlineData') or p.get('inline_data')
        if d:
            open(out, 'wb').write(base64.b64decode(d['data'])); print('wrote', out); return out
    sys.exit('no image: ' + json.dumps(res)[:400])


FACE = (230, 130, 520, 380)     # the face box on the base's 768 x 1376 canvas (the persona-sheet base, 2026-11-16): the frames differ only inside it
SCALE = 0.75
PACK = ['neutral', 'blink', 'talk', 'happy', 'happy-talk', 'stern', 'stern-talk', 'worried', 'worried-talk']


def keyed(im):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if g > 140 and g > r * 1.35 and g > b * 1.35: px[x, y] = (0, 0, 0, 0)
            elif g > r and g > b: px[x, y] = (r, max(r, b), b, a)
    return im


def pack(d, base):
    from PIL import Image, ImageFilter
    out = os.path.join(GAME, 'assets/img/ic-live')
    b = Image.open(base)
    body = keyed(b); W, H = round(body.width * SCALE), round(body.height * SCALE)
    body.resize((W, H), Image.LANCZOS).save(os.path.join(out, 'uptima-body.webp'), 'WEBP', quality=88)
    x0, y0, x1, y1 = FACE
    mask = Image.new('L', (x1 - x0, y1 - y0), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).rectangle((14, 14, x1 - x0 - 15, y1 - y0 - 15), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(7))
    for f in PACK:
        src = base if f == 'neutral' else os.path.join(d, f + '.png')
        patch = keyed(Image.open(src).resize(b.size).crop(FACE))
        a = Image.composite(patch.getchannel('A'), Image.new('L', patch.size, 0), mask)
        patch.putalpha(a)
        patch.resize((round(patch.width * SCALE), round(patch.height * SCALE)), Image.LANCZOS).save(os.path.join(out, 'uptima-face-%s.webp' % f), 'WEBP', quality=90)
    print('body', (W, H), 'face box %', [round(v * 100 / s, 3) for v, s in zip(FACE, (b.width, b.height, b.width, b.height))])


def key(src, dst, h=None):
    from PIL import Image
    im = Image.open(src).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if g > 140 and g > r * 1.35 and g > b * 1.35: px[x, y] = (0, 0, 0, 0)
            elif g > r and g > b:   # green spill on the edge: pull it back to grey
                px[x, y] = (r, max(r, b), b, a)
    box = im.getchannel('A').getbbox(); im = im.crop(box)
    if h: im = im.resize((round(im.width * int(h) / im.height), int(h)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=90); print(dst, im.size)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--pack': pack(a[1], a[2]); sys.exit()
    if a and a[0] == '--key': key(a[1], a[2], a[3] if len(a) > 3 else None); sys.exit()
    out, what = a[0], a[1]; os.makedirs(out, exist_ok=True)
    room = os.path.join(GAME, 'assets/video/cards/ic.webp'); face = os.path.join(GAME, 'assets/img/portraits/uptima-neutral.webp')
    if what == 'base':
        for n in range(int(a[2]) if len(a) > 2 else 2):
            ask([img_part(room), img_part(SHEET), {'text': 'The first image is the room she stands in (for lighting and style only); the second is her persona sheet. ' + STYLE + UPTIMA + 'Draw her standing, three-quarter view facing slightly to the left, from the head down to just below the knees, full figure centred with space around her, arms relaxed, one hand holding a small brass pager, a calm, slightly bored expression, eyes open looking at the viewer, mouth closed. Plain flat pure green (#00FF00) background, no floor, no shadow on the background, no text.'}],
                os.path.join(out, 'base-%d.png' % n), '9:16')
    elif what == 'frame':
        name = a[4] if len(a) > 4 else a[2]
        ask([img_part(a[3]), {'text': FRAMES[a[2]] + ' Keep the plain flat pure green (#00FF00) background.'}], os.path.join(out, name + '.png'), '9:16')
    elif what == 'room':
        ask([img_part(room), {'text': 'Repaint this exact room with the sleeping girl removed: the desk is empty except for the open book, the coffee mug, the brass pager box and the lamp, all where they are. Same map, lanterns, lighting and art style. No people, no text.'}], os.path.join(out, 'room-wide.png'), '16:9')
        ask([img_part(os.path.join(out, 'room-wide.png')), {'text': 'Extend this exact room painting into a tall portrait frame: same room, the wall map and lanterns above, the desk with the mug, pager box and lamp below. No people, no text. Same art style.'}], os.path.join(out, 'room-tall.png'), '9:16')
