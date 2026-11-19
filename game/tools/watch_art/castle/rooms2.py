import shutil, winedit
K=' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left, strict side view.'
def room(src, rx0, rx1, p, seeds, name):
    x0=min(max(0,(rx0+rx1)//2-1024),2048)
    for t in range(3):
        try: outs=winedit.run(src,f'hd/{name}.png',x0,p+K,[s+100*t for s in seeds],keep=(rx0-x0+24,rx1-x0-24),tag='hd-'+name); break
        except FileNotFoundError: continue
    shutil.copy(outs[0],f'hd/{name}.png'); print(name,outs,flush=True); return f'hd/{name}.png'
SIGN=' Also hang a small wooden shop sign on iron chains from the ceiling beam in the middle of this room, showing only a simple painted picture of {}, no letters or text.'
s='hd/G.png'
s=room(s,300,1225,"In this room only, replace the spear rack with a heavy iron-bound wooden double gate set into the back wall between the two windows, with a raised iron portcullis above it, so the room clearly reads as the castle's gatehouse. Keep the guard desk and the bench."+SIGN.format('two crossed swords'),[841,842],'r1')
s=room(s,1290,1840,"In this room only, replace the red banner with a big stone fireplace with a crackling fire, built into the back wall behind the long dining table, and hang an iron candle chandelier from the ceiling above the table, so the room clearly reads as the castle's great hall. Keep the table, the chairs and the trapdoor in the floor."+SIGN.format('a golden crown'),[843,844],'r2')
s=room(s,2330,3190,"In this room only, keep the counter, the scale, the pigeonhole cabinet and the parcels."+SIGN.format('a white envelope'),[845,846],'r3')
s=room(s,3235,3860,"Turn this end of the hall into a small tavern. In the free floor space left of the staircase, add a short wooden bar counter with two beer taps and mugs on top. Fill the solid stone wedge under the staircase with a wooden rack of stacked wine and ale barrels lying on their sides, so the barrels sit under the stairs. Keep the staircase itself, its handrail and the hanging lantern exactly as they are, and keep the stairs clear to walk on."+SIGN.format('a foaming beer mug'),[847,848],'r4')
print('done',s)
