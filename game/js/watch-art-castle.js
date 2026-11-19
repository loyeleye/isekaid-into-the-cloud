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
    "stair-left": 128,
    "west-mid-stair": 306,
    "stair-right": 2234,
    "east-cellar-stair": 2487,
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
   ],
   "stairs": {
    "stair-left": {
     "x": [
      54,
      201
     ],
     "dir": "down",
     "use": 128,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       54,
       144,
       201,
       304
      ]
     }
    },
    "west-mid-stair": {
     "x": [
      38,
      357
     ],
     "dir": "up",
     "use": 306,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       255,
       211,
       364,
       303
      ]
     }
    },
    "stair-right": {
     "x": [
      2183,
      2572
     ],
     "dir": "up",
     "use": 2234,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       2183,
       211,
       2291,
       303
      ]
     }
    },
    "east-cellar-stair": {
     "x": [
      2413,
      2560
     ],
     "dir": "down",
     "use": 2487,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2413,
       144,
       2560,
       304
      ]
     }
    }
   }
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
    "stair-left": 300,
    "east-cellar-stair": 2314,
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
   ],
   "stairs": {
    "stair-left": {
     "x": [
      38,
      332
     ],
     "dir": "up",
     "use": 300,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       274,
       211,
       383,
       303
      ]
     }
    },
    "east-cellar-stair": {
     "x": [
      2231,
      2576
     ],
     "dir": "up",
     "use": 2314,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       2254,
       211,
       2363,
       303
      ]
     }
    }
   }
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
    "west-mid-stair": 128,
    "back-stair": 300,
    "stair-right": 2487,
    "east-tower-stair": 2314,
    "ladder": 1280
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
   ],
   "stairs": {
    "west-mid-stair": {
     "x": [
      54,
      201
     ],
     "dir": "down",
     "use": 128,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       54,
       144,
       201,
       304
      ]
     }
    },
    "back-stair": {
     "x": [
      38,
      383
     ],
     "dir": "up",
     "use": 300,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       274,
       211,
       383,
       303
      ]
     }
    },
    "stair-right": {
     "x": [
      2413,
      2560
     ],
     "dir": "down",
     "use": 2487,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2413,
       144,
       2560,
       304
      ]
     }
    },
    "east-tower-stair": {
     "x": [
      2231,
      2576
     ],
     "dir": "up",
     "use": 2314,
     "block": {
      "img": "assets/img/watch/floors/stair-block-up.webp",
      "box": [
       2254,
       211,
       2363,
       303
      ]
     }
    }
   }
  },
  "towers": {
   "width": 2614,
   "ground": 300,
   "rooms": [
    [
     "watchtower",
     424,
     616
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
    "watchtower": 520,
    "lookout": 1506,
    "captain": 1778
   },
   "popupRooms": [
    "watchtower",
    "lookout",
    "captain"
   ],
   "links": {
    "back-stair": 166,
    "east-tower-stair": 2457,
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
   ],
   "stairs": {
    "back-stair": {
     "x": [
      68,
      264
     ],
     "dir": "down",
     "use": 166,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       68,
       91,
       264,
       304
      ]
     }
    },
    "east-tower-stair": {
     "x": [
      2359,
      2556
     ],
     "dir": "down",
     "use": 2457,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2359,
       91,
       2556,
       304
      ]
     }
    }
   }
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
