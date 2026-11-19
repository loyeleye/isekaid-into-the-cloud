// Night Watch castle floors (HD repaint, Nov 19) and the room popups (Mira's Kitchen style).
// Written by tools/watch_art/castle/export_castle.py. Every number is in engine units (layer 360 tall, ground 300).
// floors[f] has the same shape as WATCH_ART.floors[f]; popupRooms open interiors[room] instead of being walked through.
window.WATCH_ART_CASTLE = {
 "floors": {
  "ground": {
   "width": 2614,
   "ground": 300,
   "rooms": [
    [
     "gate",
     191,
     782
    ],
    [
     "hall",
     823,
     1174
    ],
    [
     "post-room",
     1484,
     2036
    ]
   ],
   "doors": {},
   "popupRooms": [],
   "links": {
    "stair-left": 239,
    "stair-right": 2336,
    "ladder": 1280
   },
   "walls": [
    26,
    2589
   ],
   "layers": [
    {
     "img": "assets/img/watch/floors/ground/far.webp",
     "speed": 0.2
    },
    {
     "img": "assets/img/watch/floors/ground/wall-v2.webp",
     "speed": 1
    }
   ],
   "trapdoor": [
    1200,
    1360
   ]
  },
  "cellars": {
   "width": 2614,
   "ground": 300,
   "rooms": [
    [
     "archive",
     478,
     670
    ],
    [
     "strongroom",
     836,
     1027
    ],
    [
     "barracks",
     1550,
     1742
    ],
    [
     "tavern",
     1908,
     2099
    ]
   ],
   "doors": {
    "archive": 574,
    "strongroom": 931,
    "barracks": 1646,
    "tavern": 2004
   },
   "popupRooms": [
    "archive",
    "strongroom",
    "barracks",
    "tavern"
   ],
   "links": {
    "stair-left": 185,
    "ladder": 1273
   },
   "walls": [
    26,
    2589
   ],
   "layers": [
    {
     "img": "assets/img/watch/floors/cellars/far.webp",
     "speed": 0.2
    },
    {
     "img": "assets/img/watch/floors/cellars/wall-v2.webp",
     "speed": 1
    }
   ]
  },
  "upper": {
   "width": 2614,
   "ground": 300,
   "rooms": [
    [
     "wardrobe",
     536,
     728
    ],
    [
     "ledger",
     919,
     1111
    ],
    [
     "bridge-tower",
     1676,
     1867
    ]
   ],
   "doors": {
    "wardrobe": 632,
    "ledger": 1015,
    "bridge-tower": 1771
   },
   "popupRooms": [
    "wardrobe",
    "ledger",
    "bridge-tower"
   ],
   "links": {
    "stair-right": 2394,
    "back-stair": 198,
    "ladder": 1280,
    "bridge-door": 1771
   },
   "walls": [
    26,
    2589
   ],
   "layers": [
    {
     "img": "assets/img/watch/floors/upper/far.webp",
     "speed": 0.2
    },
    {
     "img": "assets/img/watch/floors/upper/wall-v2.webp",
     "speed": 1
    }
   ],
   "trapdoor": [
    1200,
    1360
   ]
  },
  "towers": {
   "width": 2614,
   "ground": 300,
   "rooms": [
    [
     "watchtower",
     236,
     428
    ],
    [
     "lookout",
     1411,
     1602
    ],
    [
     "captain",
     1683,
     1874
    ]
   ],
   "doors": {
    "watchtower": 332,
    "lookout": 1506,
    "captain": 1778
   },
   "popupRooms": [
    "watchtower",
    "lookout",
    "captain"
   ],
   "links": {
    "back-stair": 2419,
    "ladder": 1277
   },
   "walls": [
    26,
    2589
   ],
   "layers": [
    {
     "img": "assets/img/watch/floors/towers/far.webp",
     "speed": 0.2
    },
    {
     "img": "assets/img/watch/floors/towers/wall-v2.webp",
     "speed": 1
    }
   ],
   "trapdoor": [
    1194,
    1360
   ]
  }
 },
 "interiors": {
  "archive": {
   "img": "assets/img/watch/rooms/archive.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    1039,
    485
   ],
   "floorY": 714
  },
  "strongroom": {
   "img": "assets/img/watch/rooms/strongroom.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    1028,
    430
   ],
   "floorY": 714
  },
  "barracks": {
   "img": "assets/img/watch/rooms/barracks.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    974,
    550
   ],
   "floorY": 714
  },
  "tavern": {
   "img": "assets/img/watch/rooms/tavern.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    974,
    507
   ],
   "floorY": 714
  },
  "wardrobe": {
   "img": "assets/img/watch/rooms/wardrobe.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    952,
    441
   ],
   "floorY": 714
  },
  "ledger": {
   "img": "assets/img/watch/rooms/ledger.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    952,
    376
   ],
   "floorY": 714
  },
  "bridge-tower": {
   "img": "assets/img/watch/rooms/bridge-tower.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    1017,
    419
   ],
   "floorY": 714
  },
  "watchtower": {
   "img": "assets/img/watch/rooms/watchtower.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    887,
    485
   ],
   "floorY": 714
  },
  "lookout": {
   "img": "assets/img/watch/rooms/lookout.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    1061,
    485
   ],
   "floorY": 714
  },
  "captain": {
   "img": "assets/img/watch/rooms/captain.webp",
   "w": 1600,
   "h": 900,
   "focus": [
    1104,
    616
   ],
   "floorY": 714
  }
 }
};
