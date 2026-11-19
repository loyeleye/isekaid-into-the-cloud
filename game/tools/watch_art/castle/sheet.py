# Step sheet: python3 sheet.py out.png "label1:file1" "label2:file2" ... (each floor scaled to 2048 wide)
import sys
from PIL import Image, ImageDraw, ImageFont
items=[a.rsplit(':',1) for a in sys.argv[2:]]
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
except Exception: font=ImageFont.load_default()
H=256+36; c=Image.new('RGB',(2048,H*len(items)),(24,22,28)); d=ImageDraw.Draw(c)
for i,(lab,f) in enumerate(items):
    d.text((10,i*H+6),lab,fill=(240,220,170),font=font)
    c.paste(Image.open(f).convert('RGB').resize((2048,256)),(0,i*H+34))
c.save(sys.argv[1])
