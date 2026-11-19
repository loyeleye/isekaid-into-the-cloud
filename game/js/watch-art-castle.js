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
    "stair-left": 104,
    "west-mid-stair": 306,
    "stair-right": 2234,
    "east-cellar-stair": 2505,
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
   "ladderArt": {
    "down": {
     "img": "assets/img/watch/floors/ground/ladder-down.webp",
     "box": [
      1215,
      132,
      1336,
      316
     ]
    },
    "up": {
     "img": "assets/img/watch/floors/ground/ladder-up.webp",
     "box": [
      1238,
      0,
      1317,
      300
     ]
    }
   },
   "stairs": {
    "stair-left": {
     "x": [
      38,
      182
     ],
     "dir": "down",
     "use": 104,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       34,
       227,
       184,
       333
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
      "img": "assets/img/watch/floors/ground/block-west-mid-stair.webp",
      "box": [
       201,
       181,
       316,
       290
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
      "img": "assets/img/watch/floors/ground/block-stair-right.webp",
      "box": [
       2164,
       175,
       2274,
       283
      ]
     }
    },
    "east-cellar-stair": {
     "x": [
      2433,
      2576
     ],
     "dir": "down",
     "use": 2505,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2429,
       227,
       2579,
       333
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
   "ladderArt": {
    "up": {
     "img": "assets/img/watch/floors/cellars/ladder-up.webp",
     "box": [
      1205,
      33,
      1409,
      313
     ]
    }
   },
   "stairs": {
    "stair-left": {
     "x": [
      38,
      332
     ],
     "dir": "up",
     "use": 300,
     "block": {
      "img": "assets/img/watch/floors/cellars/block-stair-left.webp",
      "box": [
       255,
       179,
       377,
       292
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
      "img": "assets/img/watch/floors/cellars/block-east-cellar-stair.webp",
      "box": [
       2237,
       179,
       2359,
       292
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
    "west-mid-stair": 104,
    "back-stair": 300,
    "stair-right": 2505,
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
   "ladderArt": {
    "down": {
     "img": "assets/img/watch/floors/upper/ladder-down.webp",
     "box": [
      1215,
      132,
      1336,
      316
     ]
    },
    "up": {
     "img": "assets/img/watch/floors/upper/ladder-up.webp",
     "box": [
      1238,
      0,
      1317,
      300
     ]
    }
   },
   "stairs": {
    "west-mid-stair": {
     "x": [
      38,
      182
     ],
     "dir": "down",
     "use": 104,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       34,
       227,
       184,
       333
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
      "img": "assets/img/watch/floors/upper/block-back-stair.webp",
      "box": [
       255,
       179,
       377,
       292
      ]
     }
    },
    "stair-right": {
     "x": [
      2433,
      2576
     ],
     "dir": "down",
     "use": 2505,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2429,
       227,
       2579,
       333
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
      "img": "assets/img/watch/floors/upper/block-east-tower-stair.webp",
      "box": [
       2237,
       179,
       2359,
       292
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
     608,
     800
    ],
    [
     "lookout",
     1436,
     1628
    ],
    [
     "captain",
     1901,
     2093
    ]
   ],
   "doors": {
    "watchtower": 704,
    "lookout": 1532,
    "captain": 1997
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
   "ladderArt": {
    "down": {
     "img": "assets/img/watch/floors/towers/ladder-down.webp",
     "box": [
      1211,
      132,
      1333,
      316
     ]
    }
   },
   "stairs": {
    "back-stair": {
     "x": [
      115,
      217
     ],
     "dir": "down",
     "use": 166,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       98,
       227,
       234,
       324
      ]
     }
    },
    "east-tower-stair": {
     "x": [
      2406,
      2509
     ],
     "dir": "down",
     "use": 2457,
     "block": {
      "img": "assets/img/watch/floors/stair-block-down.webp",
      "box": [
       2389,
       227,
       2525,
       324
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
