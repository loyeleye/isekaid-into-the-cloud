# The overcast sky for rain and storm days (Ladi, Nov 19: no sun on a rainy day, add clouds). Built in code from the
# painted day sky (assets/img/watch/sky/day.webp): the sun covered with clear sky from beside it, the colour drained
# to grey, and banks of heavier cloud laid over the top, pixelated to match. Writes assets/img/watch/sky/overcast.webp.
import random
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
random.seed(19)
day = Image.open('assets/img/watch/sky/day.webp').convert('RGB')
W, H = day.size
patch = day.crop((330, 0, 330 + 330, H))            # clear sky right of the sun, same heights
mask = Image.new('L', patch.size, 0); ImageDraw.Draw(mask).ellipse([20, 20, 310, 250], fill=255)
day.paste(patch, (25, 0), mask.filter(ImageFilter.GaussianBlur(20)))
img = ImageEnhance.Color(day).enhance(0.12)
img = ImageEnhance.Brightness(img).enhance(0.72)
def bank(n, y0, y1, r0, r1, shade, blur, alpha):
    layer = Image.new('RGBA', (W, H), shade + (0,)); g = ImageDraw.Draw(layer)   # transparent in the cloud's colour: no dark rim
    for _ in range(n):
        x, y, r = random.uniform(-80, W + 80), random.uniform(y0, y1), random.uniform(r0, r1)
        v = random.randint(-6, 6); c = tuple(max(0, min(255, s + v)) for s in shade)
        for dx in (-W, 0, W):   # wrap so the sky tiles side to side
            g.ellipse([x + dx - r * 1.8, y - r * 0.6, x + dx + r * 1.8, y + r * 0.6], fill=c + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur))
for args in [(60, -30, 60, 40, 90, (82, 88, 98), 12, 230), (70, 20, 120, 30, 70, (112, 118, 128), 9, 200),
             (50, 90, 180, 25, 55, (138, 144, 152), 7, 150)]:
    img = Image.alpha_composite(img.convert('RGBA'), bank(*args)).convert('RGB')
img.resize((W // 3, H // 3), Image.BILINEAR).resize((W, H), Image.NEAREST).save('assets/img/watch/sky/overcast.webp', quality=90)
print('ok')
