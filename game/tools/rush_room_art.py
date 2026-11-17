"""The Rush's second room, painted with Gemini (see CREDITS.md): the loading dock the Slow Courier plays in,
assets/img/rush/dock-wide.webp and dock-tall.webp.

usage: rush_room_art.py OUT_DIR [wide|tall ...]     edit the cellar into the dock, one take each (needs GEMINI_API_KEY)
       rush_room_art.py --pack IN.png OUT.webp W H  scale to the game's size and save as WebP

Ladi, 2026-11-16: "change the scene at maybe claim 4 so we don't get stuck in monotony". Each dock is an edit of the
cellar at the same size, so the chute, the lever and the floor stay where the game's layout puts them.
"""
import base64, json, os, sys, urllib.request
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = 'gemini-3-pro-image'
PROMPT = (
    'Repaint this room as a different room: the night loading dock behind the same post office, where slow couriers '
    'drop off heavy parcels. Keep exactly: the camera, the perspective, the wooden floor and where it meets the wall, '
    'the wooden parcel chute in the same place, size and angle, and the brass lever with the red handle on its iron '
    'plate in the same place. Change the back wall: a wide corrugated rolling shutter door half raised, showing a '
    'rainy cobbled alley at night with a gas street lamp and wet reflections; a loading-bay doorframe with yellow and '
    'black chevron edges; a clock on the wall; a few stacked crates and a parcel trolley pushed against the far side '
    'walls only, leaving the middle and right of the floor empty and clear. Cooler blue moonlight from the alley mixed '
    'with warm lantern light inside. Same painted anime background style, brushwork and palette as the reference. '
    'No people, no text, no letters, no signs with writing.')
SRC = {'wide': ('room-wide.webp', '16:9'), 'tall': ('room-tall.webp', '9:16')}


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


def main(a):
    if a[0] == '--pack':
        from PIL import Image
        Image.open(a[1]).convert('RGB').resize((int(a[3]), int(a[4])), Image.LANCZOS).save(a[2], 'WEBP', quality=88)
        print('packed', a[2]); return
    out = a[0]; os.makedirs(out, exist_ok=True)
    for name in a[1:] or ['wide', 'tall']:
        src, aspect = SRC[name]
        data = base64.b64encode(open(os.path.join(GAME, 'assets/img/rush', src), 'rb').read()).decode()
        ask([{'inline_data': {'mime_type': 'image/webp', 'data': data}}, {'text': PROMPT}], os.path.join(out, 'dock-%s.png' % name), aspect)


if __name__ == '__main__':
    main(sys.argv[1:])
