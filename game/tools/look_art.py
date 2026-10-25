"""Reskins ("looks") for the leads' full bodies, drawn with PixelLab: assets/img/wear/look/<look>-<lead>.webp (see CREDITS.md).

usage: look_art.py OUT_DIR LOOK[:LEAD,...] ...      ask PixelLab (needs PIXELLAB_API_KEY), saving OUT_DIR/<look>-<lead>-<n>.png
       look_art.py OUT_DIR --pick LOOK-LEAD=N ...   fit pick N to the lead's standing sprite and save it in assets/img/wear/look

Each look starts from the lead's own standing sprite (assets/img/lead/<lead>.webp) as the reference, so it's the same
person in the same pose with different clothes. Only the full body changes: the dialogue portraits stay as they are
(Ladi, 2026-10-24). generate-image-v2 returns four versions; a pick is trimmed and scaled to the standing sprite's
height on its canvas, feet on the same line, so js/wear.js can swap it in wherever the standing sprite goes (a wider
look gets a wider canvas). LEADS' descriptions keep what makes each lead themselves, like Mira's wolf arm.
"""
import base64, io, json, os, sys, time, urllib.request
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/wear/look')
LEADS = {
    'kai': 'a young Black man with long dark locs, a chef in a dark grey chef jacket',
    'mira': 'a pale young woman with dark blue-grey hair, a hooded dark nun-like robe, her right arm a white furred wolf arm with claws (always keep the wolf arm, it is part of her body)',
    'seoyeon': 'a young Korean woman with a black bob haircut and a red ribbon, a dark swordswoman outfit',
    'dutch': 'a broad older man with slicked-back grey hair and stubble, a dark blue work coat',
}
LOOKS = {
    'look-zombie': 'dressed as a cartoon zombie for Halloween: greyish green skin, a torn and tattered version of the clothes, patched with stitches, friendly not scary',
    'look-santa': 'dressed as Santa Claus for the winter holidays: a red coat with white fur trim, a black belt with a gold buckle, a red Santa hat with a white pom-pom',
    'look-lantern': 'dressed for Lunar New Year: a red and gold silk outfit with gold embroidery, holding a small glowing red paper lantern',
    'look-blossom': 'dressed for spring: a pastel mint outfit with pink cherry blossom flowers on the shoulders and a flower crown',
    'look-glacier': 'dressed in icy pale blue crystal armour with frost on it, like a glacier, cold and calm',
    'look-spot': 'in a cheap grey hooded tracksuit with glitchy cyan pixel stripes, like a hologram that might switch off',
    'look-lambda': 'in a light flowing white and orange robe with a small lambda symbol on the chest, airy and quick',
    'look-veteran': 'in patched, battle-scarred steel and leather armour with a worn orange sash, a seasoned veteran',
    'look-guild': 'in a polished adventurers guild armour set, blue tabard with a gold crest, leather straps',
    'look-acolyte': 'in a white and gold temple acolyte robe with a sky blue stole',
    'look-tavern': 'as a tavern keeper: rolled-up sleeves, a brown leather apron over a cream shirt, a cloth over one shoulder',
    'look-restored': 'restored from backup: pale blue glowing clothes, soft feathered wings of light behind the back, a faint halo, serene',
}
SEED = 7


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


def ref(lead):
    im = Image.open(os.path.join(GAME, 'assets/img/lead/%s.webp' % lead)).convert('RGBA')
    b = io.BytesIO(); im.save(b, 'PNG')
    return im.size, dict(image={'type': 'base64', 'base64': base64.b64encode(b.getvalue()).decode(), 'format': 'png'}, size=dict(width=im.width, height=im.height))


def generate(out, wants):
    os.makedirs(out, exist_ok=True)
    for want in wants:
        look, _, leads = want.partition(':')
        for lead in (leads.split(',') if leads else LEADS):
            if os.path.exists(os.path.join(out, '%s-%s-0.png' % (look, lead))): continue
            (w, h), r = ref(lead)
            desc = 'pixel art full body game character, standing, front view, the same character and pose as the reference: %s, %s' % (LEADS[lead], LOOKS[look])
            ims = job('generate-image-v2', dict(description=desc, image_size=dict(width=w, height=h), seed=SEED, no_background=True,
                                                reference_images=[dict(r, usage_description='the same character, the same face, hair, body and pose')], style_image=r))
            for n, im in enumerate(ims): im.save(os.path.join(out, '%s-%s-%d.png' % (look, lead, n)))
            print(look, lead, len(ims), flush=True)


def pick(out, picks):
    os.makedirs(OUT, exist_ok=True)
    for p in picks:
        name, n = p.split('=')
        lead = name.split('-')[-1]
        base = Image.open(os.path.join(GAME, 'assets/img/lead/%s.webp' % lead)).convert('RGBA')
        bb = base.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        im = Image.open(os.path.join(out, '%s-%s.png' % (name, n))).convert('RGBA')
        a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
        im.putalpha(a)
        im = im.crop(a.getbbox())
        # As tall as the lead's own figure; anything wider (Restored's wings) widens the canvas, which js/wear.js allows for.
        k = (bb[3] - bb[1]) / im.height
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)
        c = Image.new('RGBA', (max(base.width, im.width), base.height), (0, 0, 0, 0))
        c.alpha_composite(im, ((c.width - im.width) // 2, bb[3] - im.height))
        c.save(os.path.join(OUT, name + '.webp'), lossless=True, method=6)
        print(name, c.size)


if __name__ == '__main__':
    out = sys.argv[1]
    if len(sys.argv) > 2 and sys.argv[2] == '--pick': pick(out, sys.argv[3:])
    else: generate(out, sys.argv[2:] or list(LOOKS))
