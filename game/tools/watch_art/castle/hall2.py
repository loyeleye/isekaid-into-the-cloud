import winedit, sys
K=' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left, strict side view.'
p="Turn the flat light-grey block into a big stone fireplace built into the back wall, filling exactly that block: a chimney breast of dressed stone rising to the ceiling beams, a heavy stone mantel shelf with candles, and below the mantel the arched hearth opening with a crackling orange fire, partly hidden behind the long dining table standing in front of it. Keep the table, the chairs and the window. Hang an iron candle chandelier from the ceiling beam left of the fireplace. Keep the trapdoor in the floor exactly as it is."
x0=1565-1024
for t in range(3):
    try: print(winedit.run('hd/G2g.png','hd/r8.png',x0,p+K,[881+t*10,882+t*10],keep=(1290-x0+24,1840-x0-24),tag='hd-r8')); break
    except FileNotFoundError as e: print('retry',e)
