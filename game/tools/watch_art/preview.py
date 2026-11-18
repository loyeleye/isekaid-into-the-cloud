import json, sys
from PIL import Image
L = json.load(open('out/layers.json')); P = json.load(open('out/people/meta.json'))
def view(kind, key, camx, vw=1280, night=False, people=()):
    sky = Image.open(f'out/sky/{"night" if night else "day"}.webp').convert('RGBA').crop((0, 0, vw, 360))
    out = sky.copy(); m = L[kind][key]
    for i, l in enumerate(m['layers']):
        im = Image.open('out/' + l['img'].split('watch/')[1]).convert('RGBA')
        out.alpha_composite(im.crop((round(camx * l['speed']), 0, round(camx * l['speed']) + vw, 360)) if True else im, (0, 0)) if l['speed'] <= 1 else None
        if l['speed'] == 1:
            for pid, x in people:
                pm = P[pid]; sh = Image.open(f'out/people/{pid}.png'); fr = sh.crop((0, 0, pm['w'], pm['h']))
                out.alpha_composite(fr, (round(x - camx - pm['anchor'][0]), 300 - pm['anchor'][1]))
        if l['speed'] > 1:
            o = round(camx * l['speed']); out.alpha_composite(im.crop((o, 0, o + vw, 360)), (0, 0))
    if night:
        dark = Image.new('RGBA', out.size, (20, 24, 60, 120)); out.alpha_composite(dark)
    return out
if __name__ == '__main__':
    kind, key, camx = sys.argv[1], sys.argv[2], int(sys.argv[3]); ppl = [(a.split(':')[0], int(a.split(':')[1])) for a in sys.argv[5:]]
    view(kind, key, camx, people=ppl).save(sys.argv[4])
