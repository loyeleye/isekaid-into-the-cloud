// The Night Watch's castle intruders, the feast staff and Hollis's new walk (Nov 19), built by tools/watch_art/build_people.py
// from the renders in jobs/jobs-intruders-*.json (Seo-yeon's day-5 raincoat, jobs-seoyeon-rain*.json, and the townsfolk's rain gear, jobs-people-rain-*.json, built as <who>-rain; Seymour and Kagemaru keep their usual look) and merged over WATCH_ART.people. who: intruder-<kind>, staff-cook, staff-porter.
(function () {
  const A = window.WATCH_ART = window.WATCH_ART || {}; A.people = A.people || {};
  Object.assign(A.people, {
 "aigerim-rain": {"sheet": "assets/img/watch/people/rain/aigerim-rain.png", "w": 126, "h": 224, "anchor": [63, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "ayo-rain": {"sheet": "assets/img/watch/people/rain/ayo-rain.png", "w": 130, "h": 224, "anchor": [65, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "bru-rain": {"sheet": "assets/img/watch/people/rain/bru-rain.png", "w": 102, "h": 224, "anchor": [51, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "chad-rain": {"sheet": "assets/img/watch/people/rain/chad-rain.png", "w": 120, "h": 224, "anchor": [60, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "coo-rain": {"sheet": "assets/img/watch/people/rain/coo-rain.png", "w": 146, "h": 224, "anchor": [73, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "doug-rain": {"sheet": "assets/img/watch/people/rain/doug-rain.png", "w": 106, "h": 224, "anchor": [53, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "dutch-rain": {"sheet": "assets/img/watch/people/rain/dutch-rain.png", "w": 126, "h": 224, "anchor": [63, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "fennel-rain": {"sheet": "assets/img/watch/people/rain/fennel-rain.png", "w": 106, "h": 224, "anchor": [53, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "hobb-rain": {"sheet": "assets/img/watch/people/rain/hobb-rain.png", "w": 122, "h": 224, "anchor": [61, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "hollis-rain": {"sheet": "assets/img/watch/people/rain/hollis-rain.png", "w": 122, "h": 224, "anchor": [61, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "kai-rain": {"sheet": "assets/img/watch/people/rain/kai-rain.png", "w": 112, "h": 224, "anchor": [56, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "lexi-rain": {"sheet": "assets/img/watch/people/rain/lexi-rain.png", "w": 106, "h": 224, "anchor": [53, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "mira-rain": {"sheet": "assets/img/watch/people/rain/mira-rain.png", "w": 104, "h": 224, "anchor": [52, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "odu-rain": {"sheet": "assets/img/watch/people/rain/odu-rain.png", "w": 128, "h": 224, "anchor": [64, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "tess-rain": {"sheet": "assets/img/watch/people/rain/tess-rain.png", "w": 158, "h": 224, "anchor": [79, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "wen-rain": {"sheet": "assets/img/watch/people/rain/wen-rain.png", "w": 104, "h": 224, "anchor": [52, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "townsfolk-1-rain": {"sheet": "assets/img/watch/people/rain/townsfolk-1-rain.png", "w": 104, "h": 224, "anchor": [52, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "townsfolk-2-rain": {"sheet": "assets/img/watch/people/rain/townsfolk-2-rain.png", "w": 130, "h": 224, "anchor": [65, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "townsfolk-3-rain": {"sheet": "assets/img/watch/people/rain/townsfolk-3-rain.png", "w": 124, "h": 224, "anchor": [62, 212], "anims": {"idle": [0, 0, 0, 0, 5, 5, 5, 5], "walk": [1, 2, 3, 4]}, "fps": 8, "scale": 0.5},
 "seoyeon-rain": {"sheet": "assets/img/watch/people/seoyeon-rain.png", "w": 130, "h": 224, "anchor": [65, 212], "anims": {"idle": [0, 0, 0, 0, 10, 10, 10, 10], "walk": [1, 2, 3, 4, 5, 6, 7, 8], "talk": [0, 9]}, "fps": 8, "scale": 0.5, "stride": 17},
 "intruder-pickpocket": {
  "sheet": "assets/img/watch/people/intruders/pickpocket.png",
  "w": 98,
  "h": 224,
  "anchor": [
   49,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-snuffer": {
  "sheet": "assets/img/watch/people/intruders/snuffer.png",
  "w": 160,
  "h": 224,
  "anchor": [
   80,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-spiller": {
  "sheet": "assets/img/watch/people/intruders/spiller.png",
  "w": 108,
  "h": 224,
  "anchor": [
   54,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-jailer": {
  "sheet": "assets/img/watch/people/intruders/jailer.png",
  "w": 118,
  "h": 224,
  "anchor": [
   59,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-eavesdropper": {
  "sheet": "assets/img/watch/people/intruders/eavesdropper.png",
  "w": 124,
  "h": 224,
  "anchor": [
   62,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-rummager": {
  "sheet": "assets/img/watch/people/intruders/rummager.png",
  "w": 102,
  "h": 224,
  "anchor": [
   51,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "staff-porter": {
  "sheet": "assets/img/watch/people/intruders/porter.png",
  "w": 112,
  "h": 224,
  "anchor": [
   56,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-replayer": {
  "sheet": "assets/img/watch/people/intruders/replayer.png",
  "w": 108,
  "h": 224,
  "anchor": [
   54,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-escalator": {
  "sheet": "assets/img/watch/people/intruders/escalator.png",
  "w": 188,
  "h": 224,
  "anchor": [
   94,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-forger": {
  "sheet": "assets/img/watch/people/intruders/forger.png",
  "w": 108,
  "h": 224,
  "anchor": [
   54,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-secrethunter": {
  "sheet": "assets/img/watch/people/intruders/secrethunter.png",
  "w": 96,
  "h": 224,
  "anchor": [
   48,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-exfiltrator": {
  "sheet": "assets/img/watch/people/intruders/exfiltrator.png",
  "w": 116,
  "h": 224,
  "anchor": [
   58,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-turncloak": {
  "sheet": "assets/img/watch/people/intruders/turncloak.png",
  "w": 112,
  "h": 224,
  "anchor": [
   56,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-turncloak-bare": {
  "sheet": "assets/img/watch/people/intruders/turncloak-bare.png",
  "w": 106,
  "h": 224,
  "anchor": [
   53,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "staff-cook": {
  "sheet": "assets/img/watch/people/intruders/cook.png",
  "w": 126,
  "h": 224,
  "anchor": [
   63,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "intruder-impersonator": {
  "sheet": "assets/img/watch/people/intruders/impersonator.png",
  "w": 96,
  "h": 224,
  "anchor": [
   48,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    5,
    5,
    5,
    5
   ],
   "walk": [
    1,
    2,
    3,
    4
   ]
  },
  "fps": 8,
  "scale": 0.5
 },
 "hollis": {
  "sheet": "assets/img/watch/people/hollis.png",
  "w": 104,
  "h": 224,
  "anchor": [
   52,
   212
  ],
  "anims": {
   "idle": [
    0,
    0,
    0,
    0,
    6,
    6,
    6,
    6
   ],
   "walk": [
    1,
    2,
    3,
    4
   ],
   "talk": [
    0,
    5
   ]
  },
  "fps": 8,
  "scale": 0.5
 }
});
})();
