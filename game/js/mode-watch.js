// The Night Watch (Ladi, Nov 17: one game per exam domain; storyboard 2A in "One game per exam domain: storyboards").
// Domain 2, Security, only. Seo-yeon runs the castle's night watch, and Uptima has copied the order system again: this
// time every break is a lock, a key or a badge. The Fire Drill's loop, as it is: the trace map, each station's metrics
// and the pager are the clues, up to 3 changes a deploy and 3 deploys a drill, against the night's error budget. A
// too-wide fix (AdministratorAccess, Action "*", Principal "*") contains nothing, or costs budget on every run.
//   - Its drills (D.WATCH_ROWS in js/drill-core.js): four from the Fire Drill (The Forged Pass, The Wrong Badge, The
//     Locked Drawer, The Locked Vault) and four of its own (The Borrowed Cloak, The Neighbour's Bucket, The Big Letter,
//     Loose Lips), then the boss, The Long Night. Night 1 is one path, later nights fork.
//   - The debrief: one verified Domain 2 question on the drill's cause, else any verified Domain 2 question.
//   - The screen is js/mode-drill.js (SD.drillMode), with its own save (S.save.watch, S.save.watchKeep). The stage is the
//     Fire Drill's war room after dark (js/mode-stage.js PLATE_OF).
// Covers tasks 2.1 (trust policies, cross-account access, identity and resource policies, least privilege, an API
// Gateway authorizer), 2.2 (KMS key policies, envelope encryption and data keys, SSE-KMS) and 2.3 (environment
// variables, Secrets Manager and Parameter Store, rotation, sanitising logs).
(function () {
  if (!SD.drillMode || !SD.drill || !SD.drill.WATCH_ROWS) return;
  SD.watchUi = SD.drillMode({
    id: 'watch', title: 'THE NIGHT WATCH', name: 'The Night Watch', host: 'Seo-yeon', minutes: 'about 20',
    blurb: 'Locks, keys and badges. Somebody can\'t get in, or somebody got in who shouldn\'t have. Find it and fix it, least privilege only.',
    rows: SD.drill.WATCH_ROWS, save: 'watch', domain: 2, pip: 'The Night Watch',
    open: ['seoyeon', 'tired', 'Somebody can\'t get in. Or somebody got in who shouldn\'t have. Possibly both. It\'s been a night.'],
    say: {
      arrive: 'Behold, mortals! Thy goddess hath copied the order system once more, and this time... okay, I locked things. Doors, keys, badges. Some of them on the wrong people. Find them before the error budget runs out.',
      again: 'Another night, another lock. I\'d tell you which one, but I hid the key. Metaphorically. Possibly literally.',
      next: 'Next door! This one\'s definitely secure. Too secure, maybe. Or not at all. One of those.',
      won: 'Every lock checked! The castle sleeps safely. Thanks to me. And them. Mostly me.',
      pm: 'Postmortem time! One security question, and tell me how sure you are. If you\'re right, I\'m taking the credit.',
      zero: 'The budget\'s gone. In a real breach, this is where the auditors arrive. Please don\'t tell the auditors about me. We\'ll try again tomorrow.'
    }
  });
  // After dark: the war room's plate, the board and the room under a night wash.
  const css = document.createElement('style');
  css.textContent = `
    body.in-mode[data-stage="watch"] #mode-stage .ms-bg { filter: brightness(.55) saturate(.75) hue-rotate(-12deg); }
    body.in-mode[data-stage="watch"] #mode-stage .ms-wash { background: linear-gradient(180deg, rgba(10, 18, 48, .55), rgba(6, 10, 28, .7)); }
    body.in-mode[data-stage="watch"] #panel .win.dr-win .rm :is(.rm-back, .rm-plate) { filter: brightness(.78) saturate(.8) hue-rotate(-10deg); }
    body.in-mode[data-stage="watch"] #panel .win.dr-win:has(.dr-board) { box-shadow: inset 0 0 0 100vmax rgba(8, 14, 40, .38); }
  `;
  document.head.appendChild(css);
})();
