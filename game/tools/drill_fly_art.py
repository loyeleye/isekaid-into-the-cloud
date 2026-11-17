"""Uptima flying between her cloud and the desk in the Fire Drill (Ladi, 2026-11-17: "Draw a sprite of Uptima flying
towards and away ... from the camera for the transition"). Two Sogni image edits of uptima-smug.webp (FLUX 3 Image
Klein, Unlimited plan, subscription-only billing), keyed off green. See CREDITS.md.

usage: drill_fly_art.py WORK_DIR [render]   (render: call Sogni first; then pack into assets/img/drill)
writes assets/img/drill/uptima-fly-{in,out}.webp, 640x1008 (the talking poses' shape, .635 wide per tall)
"""
import os, subprocess, sys
import numpy as np
from PIL import Image
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRILL = os.path.join(GAME, 'assets/img/drill')
W, H = 640, 1008
KEEP = ('The same anime girl as the first image: black and white long maid dress with a white apron and red ribbon bow, '
        'white frilled headband, very long straight peach-blonde hair, same face, same line art and flat anime coloring, '
        'whole body visible from head to shoes, on the same flat pure green background, nothing else in the frame.')
FRAMES = {
    'in': 'She is flying through the air toward the camera, body tilted forward and slightly foreshortened, arms stretched '
          'out in front of her, a happy smug grin, her long hair and skirt streaming backward behind her from the wind, '
          'feet trailing behind, a few small motion lines. ',
    'out': 'She is flying backward away from the camera while still facing the camera, her body leaning back as if pulled '
           'away, arms swept forward toward the viewer, a lazy smug smile, her long hair and skirt blown forward toward the '
           'camera by the wind, feet leading away, a few small motion lines. ',
}


def render(work):
    im = Image.open(os.path.join(DRILL, 'uptima-smug.webp')).convert('RGBA')
    g = Image.new('RGBA', (W, H), (0, 255, 0, 255)); g.alpha_composite(im.resize((302, 976), Image.LANCZOS), (169, 16))
    ref = os.path.join(work, 'ref.png'); g.convert('RGB').save(ref)
    for n, p in FRAMES.items():
        subprocess.run(['sogni-agent-claude-code', '--billing-mode', 'subscription', '--json', '-m', 'flux3_image_klein_sd_int8_convrot',
                        '-c', ref, '-w', str(W), '-h', str(H), '-o', os.path.join(work, n + '.png'), p + KEEP],
                       env=dict(os.environ, NODE_USE_ENV_PROXY='1'), stdout=subprocess.DEVNULL)


def pack(work):
    for n in FRAMES:
        a = np.asarray(Image.open(os.path.join(work, n + '.png')).convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float32)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        k = (g - np.maximum(r, b)) / np.maximum(g, 1)
        al = np.clip(1 - (k - .08) / .17, 0, 1) * 255
        out = np.dstack([r, np.minimum(g, np.maximum(r, b) + 6), b, al])
        p = os.path.join(DRILL, 'uptima-fly-%s.webp' % n)
        Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(p, 'WEBP', quality=86, method=6); print(p, os.path.getsize(p))


if __name__ == '__main__':
    if 'render' in sys.argv[2:]: render(sys.argv[1])
    pack(sys.argv[1])
