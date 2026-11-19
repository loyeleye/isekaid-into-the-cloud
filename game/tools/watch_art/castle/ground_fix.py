import winedit, shutil
K=' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left, strict side view.'
p="Remove the wooden barrel on its stand standing between the stone pillar and the staircase, leaving plain stone wall and bare stone floor there. Keep the pillar, the window, the lantern and the staircase exactly as they are. Nothing else added."
for t in range(3):
    try: o=winedit.run('hd/G3.png','hd/G4.png',2048,p+K,[891+t*10,892+t*10],keep=(3225-2048,3420-2048),tag='hd-g4'); print(o); break
    except FileNotFoundError as e: print('retry',e)
