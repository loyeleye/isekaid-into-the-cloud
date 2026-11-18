# Furnish one room of a 4096x512 floor: edit a 2048 window around it, paste back only the room's x range.
import sys, numpy as np
from PIL import Image
import winedit
src, dst, rx0, rx1, tag, seeds = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], [int(s) for s in sys.argv[6].split(',')]
x0 = min(max(0, (rx0 + rx1) // 2 - 1024), 2048)
outs = winedit.run(src, dst, x0, sys.stdin.read().strip(), seeds, keep=(rx0 - x0 + 24, rx1 - x0 - 24), tag=tag)
print(outs)
