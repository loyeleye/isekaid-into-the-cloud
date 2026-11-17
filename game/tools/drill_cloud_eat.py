"""Uptima eating her cookie on the cloud (Ladi, 2026-11-17: "A still would look a little weird"). Three Sogni image
edits of uptima-cloud.webp (FLUX 3 Image Klein, Unlimited plan, subscription-only billing), cut back into the base
pose so only her head and cookie hand change. See CREDITS.md.

usage: drill_cloud_eat.py WORK_DIR [render]   (render: call Sogni first; then pack into assets/img/drill)
writes assets/img/drill/uptima-cloud-{bite,chew,smug}.webp, 900x620, lined up with uptima-cloud.webp
"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRILL = os.path.join(GAME, 'assets/img/drill')
KEEP = ('Everything else stays exactly the same as the first image: the same anime girl in a black and white maid dress '
        'with a white frilled headband and long blonde hair, lying on her side on the same fluffy white cloud, propping '
        'her head on her left hand, the same pose, framing, colors, line art and the same flat pure green background.')
FRAMES = {
    'bite': 'The first image with one change: she opens her mouth wide and takes a big bite of the chocolate chip cookie, '
            'the cookie pressed to her open mouth with a semicircle bite missing from its edge, a couple of crumbs falling, '
            'her eyes half closed in delight. ',
    'chew': 'The first image with one change: she is chewing happily with her mouth closed and one cheek puffed out, eyes '
            'closed in contented upward arcs, her right hand lowered a little to hold the chocolate chip cookie just below '
            'her chin, the cookie now with a semicircle bite missing from its edge. ',
    'smug': 'The first image with one change: her right hand rests lower, near her chest, loosely holding the chocolate chip '
            'cookie with a semicircle bite missing from its edge, her mouth closed in a small smug smile with a crumb on '
            'her cheek, eyes open and sleepy. ',
}
BOX = (95, 0, 500, 330)   # head and cookie hand, in the 900x620 pose; feathered into the base


def render(work):
    base = Image.open(os.path.join(DRILL, 'uptima-cloud.webp')).convert('RGBA')
    g = Image.new('RGBA', base.size, (0, 255, 0, 255)); g.alpha_composite(base)
    ref = os.path.join(work, 'base.png'); g.convert('RGB').resize((896, 624), Image.LANCZOS).save(ref)
    for n, p in FRAMES.items():
        subprocess.run(['sogni-agent-claude-code', '--billing-mode', 'subscription', '--json', '-m', 'flux3_image_klein_sd_int8_convrot',
                        '-c', ref, '-w', '896', '-h', '624', '-o', os.path.join(work, n + '.png'), p + KEEP],
                       env=dict(os.environ, NODE_USE_ENV_PROXY='1'), stdout=subprocess.DEVNULL)


def pack(work):
    base = np.asarray(Image.open(os.path.join(DRILL, 'uptima-cloud.webp')).convert('RGBA')).astype(np.float32)
    h, w = base.shape[:2]
    m = Image.new('L', (w, h), 0); m.paste(255, BOX); m = m.filter(ImageFilter.GaussianBlur(14))
    m = np.asarray(m).astype(np.float32)[..., None] / 255
    for n in FRAMES:
        a = np.asarray(Image.open(os.path.join(work, n + '.png')).convert('RGB').resize((w, h), Image.LANCZOS)).astype(np.float32)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        k = (g - np.maximum(r, b)) / np.maximum(g, 1)
        al = np.clip(1 - (k - .08) / .17, 0, 1) * 255
        f = np.dstack([r, np.minimum(g, np.maximum(r, b) + 6), b, al])
        out = base * (1 - m) + f * m
        p = os.path.join(DRILL, 'uptima-cloud-%s.webp' % n)
        Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(p, 'WEBP', quality=86, method=6); print(p, os.path.getsize(p))


if __name__ == '__main__':
    if 'render' in sys.argv[2:]: render(sys.argv[1])
    pack(sys.argv[1])
