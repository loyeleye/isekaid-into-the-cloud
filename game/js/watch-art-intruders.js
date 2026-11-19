// The Night Watch's castle intruders, the feast staff and Hollis's new walk (Nov 19), built by tools/watch_art/build_people.py
// from the renders in jobs/jobs-intruders-*.json (and Seo-yeon's day-5 raincoat, jobs-seoyeon-rain*.json) and merged over WATCH_ART.people. who: intruder-<kind>, staff-cook, staff-porter.
(function () {
  const A = window.WATCH_ART = window.WATCH_ART || {}; A.people = A.people || {};
  Object.assign(A.people, {
 "seoyeon-rain": {"sheet": "assets/img/watch/people/seoyeon-rain.png", "w": 114, "h": 224, "anchor": [57, 212], "anims": {"idle": [0, 0, 0, 0, 6, 6, 6, 6], "walk": [1, 2, 3, 4], "talk": [0, 5]}, "fps": 8, "scale": 0.5},
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
