// The Rush (prototype), six claims: draws js/rush-core.js on a canvas over Ladi's Sogni cellar (the Slow Courier and the Picky Bell play in a loading dock, the Hot Shelf in the Records Vault), and takes the player's hands.
// The room is the screen: tickets slide down the painted chute, sit on Mira's stools, bounce back up on a 429,
// splat into the puddle, and the tank on the wall fills. You drag tools off the toolbelt into the room while it runs.
// Before each claim the player pins one of two Night Orders, twists that stack for the rest of the run. One of them
// is letters: questions sent as mail between waves. The pick and the letters are plain screens (#q).
(function () {
  const R = SD.rushCore;
  const cv = document.getElementById('rush'), cx = cv.getContext('2d'), qEl = document.getElementById('q');
  const IMG = {}, SRC = {
    'room-wide': 'assets/img/rush/room-wide.webp', 'room-tall': 'assets/img/rush/room-tall.webp',
    'dock-wide': 'assets/img/rush/dock-wide.webp', 'dock-tall': 'assets/img/rush/dock-tall.webp',
    'vault-wide': 'assets/img/rush/vault-wide.webp', 'vault-tall': 'assets/img/rush/vault-tall.webp',
    desk: 'assets/img/rush/desk.webp', stool: 'assets/img/rush/stool.webp', bolted: 'assets/img/rush/stool-bolted.webp',
    rack: 'assets/img/rush/rack.webp', clerk: 'assets/img/rush/nightclerk.webp', tank: 'assets/img/rush/tank.webp',
    bin: 'assets/img/rush/bin.webp', bell: 'assets/img/rush/bell.webp', puddle: 'assets/img/rush/puddle.webp',
    env: 'assets/img/rush/envelope.webp', env429: 'assets/img/rush/envelope-bounced.webp', envDone: 'assets/img/rush/envelope-done.webp',
    // The Records Vault's own props: Ladi's Sogni renders, packed by tools/rush_vault_pack.py (tools/rush_vault_art.js drew the first placeholders).
    'v-folder': 'assets/img/rush/vault/folder.webp', 'v-folder-done': 'assets/img/rush/vault/folder-done.webp', 'v-folder-bounced': 'assets/img/rush/vault/folder-bounced.webp',
    'v-drawer': 'assets/img/rush/vault/drawer.webp', 'v-cart': 'assets/img/rush/vault/cart.webp', 'v-cart-bolted': 'assets/img/rush/vault/cart-bolted.webp',
    'v-desk': 'assets/img/rush/vault/desk.webp',
    'dutch-neutral': 'assets/img/portraits/dutch-neutral.webp', 'dutch-smile': 'assets/img/portraits/dutch-smile.webp',
    'dutch-tired': 'assets/img/portraits/dutch-tired.webp', 'dutch-surprised': 'assets/img/portraits/dutch-surprised.webp', 'dutch-angry': 'assets/img/portraits/dutch-angry.webp'
  };
  const qs = new URLSearchParams(location.search);
  const SEED = +qs.get('seed') || (Date.now() % 100000) + 1;

  // ---- Layouts: one per backdrop, in that backdrop's pixels ----
  // A layout's art names the room's own set of props (ART below); without one, the room uses the cellar's.
  const WIDE = {
    W: 1344, H: 768, bg: 'room-wide',
    chute: [[240, 158], [628, 566]], foot: [690, 612], hatch: [190, 120],
    lever: { x: 100, y: 430, r: 125, pivot: [95, 450], label: [118, 585] },
    clerk: { x: 360, y: 628, h: 190 }, puddle: { x: 520, y: 652 },
    rack: { x: 720, y: 630, h: 200 }, stools: { xs: [1080, 1030, 980, 930, 880, 830], y: 636, h: 72 },
    desk: { x: 1215, y: 632, h: 180 }, tank: { x: 1190, y: 290, h: 230, feed: 140 }, bin: { x: 1272, y: 742, h: 104 },
    bell: { x: 606, y: 652, h: 64 }, tray: [462, 606], reports: [1250, 96],
    belt: { h: 100, slot: 116 }, title: [36, 26], handled: [1250, 46], say: { x: 400, y: 36, w: 600 }, fs: 1
  };
  const TALL = {
    W: 768, H: 1344, bg: 'room-tall',
    chute: [[560, 330], [338, 676]], foot: [330, 968], hatch: [300, 150],
    lever: { x: 118, y: 660, r: 140, pivot: [120, 750], label: [118, 470] },
    clerk: { x: 108, y: 1048, h: 170 }, puddle: { x: 300, y: 1020 },
    rack: { x: 470, y: 1016, h: 176 }, stools: { xs: [706, 648, 590, 532, 474, 416], y: 1176, h: 66 },
    desk: { x: 660, y: 1024, h: 160 }, tank: { x: 700, y: 600, h: 170, feed: 470, feedTo: 768 }, bin: { x: 104, y: 1222, h: 92 },
    bell: { x: 268, y: 1104, h: 60 }, tray: [206, 1168], filterLabel: [140, 962], reports: [690, 120],
    belt: { h: 150, slot: 162 }, coinsAt: [470, 50], title: [24, 24], handled: [690, 50], say: { x: 16, y: 196, w: 736 }, fs: 1.7
  };
  // The loading dock (claim 4 on): the same floor, chute and lever, a new back wall with the alley behind the shutter.
  const DOCK_WIDE = Object.assign({}, WIDE, { bg: 'dock-wide', tank: { x: 1150, y: 196, h: 190, feed: 0 } });
  const DOCK_TALL = Object.assign({}, TALL, { bg: 'dock-tall', chute: [[660, 250], [525, 455]], foot: [400, 990], tank: { x: 330, y: 478, h: 150, feed: 214 } });
  const DOCK = new Set(['slow', 'picky']);
  // Claim 6 has two rooms, and each shows the other in a small live window (inset: where it sits on this room, and
  // which part of the other room it shows). Tap it, or press Tab or Q, to switch. The PULL label moves clear of it.
  const INSET_WIDE = { r: [14, 588, 280, 160], src: [0, 0, 1344, 768] }, INSET_TALL = { r: [12, 852, 228, 190], src: [0, 620, 768, 640] };
  const LEVER_WIDE = Object.assign({}, WIDE.lever, { label: [118, 282] }), LEVER_TALL = TALL.lever;
  // The Records Vault (claim 6): a room of its own. Tickets are manila folders that drop down a brass pneumatic tube
  // (chute: the tube's top and mouth; it's straight down), wait in a filing drawer (rack), and Mira works them from
  // wheeled step stools by her records desk. The night starts with a turn of the vault-door wheel (lever, wheel: true).
  // Four cabinets on the back wall are the table's partitions (cabs: each one's centre and floor line), and the
  // on-demand dial sits by them.
  // The vault's door, wheel, cabinets, tube, basket and desk are painted into the backdrop (painted: true), so they sit
  // in the room; the positions below are measured off the painting. Only the pieces that move or get bought are sprites.
  // Drawn to one scale: a standing person is about 300 px tall in the wide room (about 224 in the tall one), so a
  // three-drawer cabinet comes to chest height and the Night Clerk, slumped on his stools, to about two thirds of that.
  const VAULT_WIDE = {
    W: 1344, H: 768, bg: 'vault-wide', art: 'vault', painted: true,
    chute: [[1150, 250], [1150, 455]], foot: [1150, 560], hatch: [1150, 430],
    lever: { x: 192, y: 449, r: 50, wheel: true, label: [192, 545] },
    clerk: { x: 1250, y: 662, h: 210 }, puddle: { x: 360, y: 712 },
    rack: { x: 900, y: 656, h: 160 }, stools: { xs: [800, 728, 656, 584, 512, 440], y: 652, h: 66 },
    desk: { x: 329, y: 645, h: 115 }, tank: { x: 470, y: 330, h: 150 }, bin: { x: 1100, y: 745, h: 90 },
    bell: { x: 1150, y: 744, h: 64 }, tray: [1090, 716], reports: [1040, 110],
    cabs: { at: [[610, 598], [711, 598], [813, 598], [914, 598]], w: 84, h: 184 }, dial: [762, 368], inset: INSET_WIDE,
    belt: { h: 100, slot: 116 }, title: [36, 26], handled: [1250, 46], say: { x: 400, y: 36, w: 600 }, fs: 1
  };
  const VAULT_TALL = {
    W: 768, H: 1344, bg: 'vault-tall', art: 'vault', painted: true,
    chute: [[712, 420], [712, 645]], foot: [712, 800], hatch: [712, 620],
    lever: { x: 258, y: 623, r: 68, wheel: true, label: [258, 722] },
    clerk: { x: 300, y: 1172, h: 150 }, puddle: { x: 130, y: 1120 },
    rack: { x: 460, y: 1172, h: 110 }, stools: { xs: [420, 368, 316, 264, 212, 160], y: 1010, h: 48 },
    desk: { x: 197, y: 918, h: 150 }, tank: { x: 548, y: 470, h: 150 }, bin: { x: 470, y: 1165, h: 70 },
    bell: { x: 560, y: 1104, h: 60 }, tray: [560, 960], filterLabel: [320, 820], reports: [690, 120],
    cabs: { at: [[370, 857], [447, 857], [524, 857], [601, 857]], w: 74, h: 161 }, dial: [548, 600], inset: { r: [528, 985, 228, 190], src: INSET_TALL.src },
    belt: { h: 150, slot: 162 }, coinsAt: [470, 50], title: [24, 24], handled: [690, 50], say: { x: 16, y: 196, w: 736 }, fs: 1.7
  };
  // Each room's props by the name the cellar uses for them. A missing file falls back to the cellar's.
  const ART = { vault: { env: 'v-folder', envDone: 'v-folder-done', env429: 'v-folder-bounced', envPoison: 'v-folder-poison', envRefund: 'v-folder-refund', rack: 'v-drawer', stool: 'v-cart', bolted: 'v-cart-bolted', desk: 'v-desk' } };
  const ROOM_WORD = { vault: { rack: 'Drawer', lever: 'TURN' } };
  function word(k, d) { const m = L.art && ROOM_WORD[L.art]; return m && m[k] || d; }
  // The review room: the cellar of claims 1 to 3, as it was.
  // asks: the row on the wall where review questions wait (x, y of the first, dx between them, how many show), its
  // label, and where the intern stands.
  const REVIEW_WIDE = Object.assign({}, WIDE, { inset: INSET_WIDE, lever: LEVER_WIDE, asks: { x: 812, y: 350, dx: 84, max: 4, label: [938, 278], intern: [742, 392] } });
  // On the phone the tank moves to the left wall to make room for the questions.
  const REVIEW_TALL = Object.assign({}, TALL, { inset: INSET_TALL, lever: LEVER_TALL, tank: { x: 300, y: 452, h: 140, feed: 352 }, asks: { x: 600, y: 640, dx: 70, max: 3, label: null, intern: [640, 790] } });
  const VAULT = new Set(['hot']);
  // ==== Claim 9 (the New Sorter): the freight yard's layouts ====
  // The yard is drawn in code for now (yardArt() below paints a placeholder backdrop and props). The positions are the
  // anchors a painted backdrop and Sogni props will use (project files real-game/v3/claims/claim-9/sogni-prompts.md):
  // mb = middle-bottom of the sprite, in stage pixels, at real human scale (a standing adult is about 300 px tall at the
  // front of the wide yard, 224 in the tall one). Things on the rail line stand further back, at about 0.45 of that.
  // painted: false, so every fixture is drawn over the backdrop; set it true once the backdrop has them painted in.
  const YARD_WIDE = {
    W: 1344, H: 768, bg: 'yard-wide', yard: true, painted: false, rail: 436, wall: [228, 404],
    conveyor: { x0: 0, x1: 312, y: 598 }, gate: { x: 18, y: 640, h: 170 },
    whistle: { x: 112, y: 640, h: 256 }, lever: { x: 112, y: 470, r: 80, label: [112, 352] },
    points: { x: 362, y: 642, h: 210, dial: [362, 478], r: 54 }, rlever: { x: 240, y: 646, h: 130 },
    rack: { x: 486, y: 560, h: 128, w: 140 }, sorters: [{ x: 646, y: 560, h: 180 }, { x: 806, y: 560, h: 180 }],
    stools: { xs: [590, 690, 790, 890], y: 648, h: 96, w: 92 }, bin: { x: 1218, y: 650, h: 96, w: 150 },
    tank: { x: 1262, y: 436, h: 280 }, mast: { x: 1140, y: 444, h: 300 }, office: { x: 1010, y: 438, h: 140 },
    siding: { x0: 130, x1: 310, y: 438 }, train: { y: 438, stop: 900 }, board: { x: 950, y: 92, w: 300, h: 96 },
    counter: { x: 236, y: 390, w: 92, h: 66 }, ledger: { x: 966, y: 646, h: 52 }, depot: { x: 560, y: 170 },
    inset: { r: [20, 150, 240, 136], src: [0, 0, 1344, 768] }, hatch: [24, 560], foot: [330, 598],
    belt: { h: 100, slot: 116 }, title: [36, 26], handled: [1250, 46], say: { x: 330, y: 16, w: 470 }, fs: 1
  };
  const YARD_TALL = {
    W: 768, H: 1344, bg: 'yard-tall', yard: true, painted: false, rail: 606, wall: [436, 578],
    conveyor: { x0: 0, x1: 236, y: 968 }, gate: { x: 14, y: 1004, h: 130 },
    whistle: { x: 60, y: 1004, h: 196 }, lever: { x: 60, y: 870, r: 76, label: [96, 796] },
    points: { x: 340, y: 1112, h: 160, dial: [340, 990], r: 50 }, rlever: { x: 150, y: 1162, h: 100 },
    rack: { x: 156, y: 880, h: 100, w: 116 }, sorters: [{ x: 336, y: 868, h: 140 }, { x: 488, y: 868, h: 140 }],
    stools: { xs: [432, 516, 600, 684], y: 1114, h: 76, w: 76 }, bin: { x: 668, y: 884, h: 80, w: 118 },
    tank: { x: 700, y: 606, h: 210 }, mast: { x: 604, y: 612, h: 190 }, office: { x: 486, y: 608, h: 104 },
    siding: { x0: 20, x1: 196, y: 608 }, train: { y: 608, stop: 336 }, board: { x: 384, y: 392, w: 360, h: 92 },
    counter: { x: 330, y: 560, w: 84, h: 60 }, ledger: { x: 86, y: 1172, h: 40 }, depot: { x: 655, y: 646 },
    inset: { r: [12, 642, 150, 125], src: INSET_TALL.src }, hatch: [16, 930], foot: [270, 968],
    belt: { h: 150, slot: 162 }, coinsAt: [470, 50], title: [24, 24], handled: [690, 50], say: { x: 16, y: 196, w: 736 }, fs: 1.7
  };
  const YARD = new Set(['sorter']);
  // ==== end claim 9 layouts ====

  // ---- Sound (js/audio.js): recorded samples the game already has, the synth for the rest, and the Sorting Floor's
  // loop and stings until the Rush's own tracks come in (project files real-game/v3/audio/mureka-prompts.md) ----
  const AU = SD.audio;
  if (AU) AU.add({
    songs: { rushCellar: 'm-rush-cellar', rushDock: 'm-rush-dock' },
    jingles: { rushWin: 'j-rush-closed', rushLose: 'j-rush-flooded' },
    samples: { rLever: 's-x-lever', rBell: 's-x-bell', rStamp: 's-x-stamp', rPage: 's-x-page', rThud: 's-thud', rLock: 's-x-lock', rTick: 's-x-tick', rChime: 's-x-chime', rClank: 's-clank2' }
  });
  // A busy floor makes a lot of noise: each sound waits a moment before it can play again.
  const quiet = {}, GAP = { rPage: .18, rTick: .12, rThud: .15, splat: .2, coin: .1 };
  function sfx(name) {
    if (!AU) return;
    const now = performance.now() / 1000;
    if (quiet[name] && now < quiet[name]) return;
    quiet[name] = now + (GAP[name] || .05); AU.sfx(name);
  }
  function roomSound() {
    if (!AU) return;
    // The vault is the cellar with filing cabinets: the cellar's loop, and no rain.
    const dock = DOCK.has(S.claim);
    AU.music(dock ? 'rushDock' : 'rushCellar');
    AU.weather(dock ? 'drizzle' : null);
  }
  let L = WIDE, LM = WIDE, LR = REVIEW_WIDE, scale = 1, ox = 0, oy = 0, dpr = 1;

  // ---- State ----
  let S, fx, pops, drops = [], drag, sayQ, said, saying, stamp, endAt, last, flashT, leverT, coinPulse, ringT, letters, letterAnim, letterOpen, letterClock;
  // A review card (a question from the cellar, or a check of the intern's answer) is open. The rooms keep running.
  let reviewOpen = null;
  // The Hot Shelf: each cabinet's red flash when a write to it is throttled, and the tickets whose write gave up.
  let cabFlash = [0, 0, 0, 0], gaveUp = new Set();
  // Two rooms (claim 6): M is the claim's state and M.review the second room's. view is the room on screen. Each
  // room keeps its own floating numbers and splashes, and an alarm that makes its window glow when it's in trouble.
  // S, L, pops and fx are the room being drawn or handled: the one on screen, except inside withRoom().
  let M, view = 'main', RC = {};
  const room = v => v === 'review' && M.review ? M.review : M;
  const layout = v => v === 'review' && M.review ? LR : LM;
  const freshRooms = () => ({ main: { pops: [], fx: [], alarm: 0 }, review: { pops: [], fx: [], alarm: 0 } });
  function home() { S = M; L = layout(view); pops = RC[view].pops; fx = RC[view].fx; }
  function withRoom(v, f) {
    S = room(v); L = layout(v); pops = RC[v].pops; fx = RC[v].fx;
    try { f(); } finally { RC[v].pops = pops; RC[v].fx = fx; home(); }
  }
  function switchRoom() {
    if (!M.review) return;
    view = view === 'main' ? 'review' : 'main'; drag = null; RC[view].alarm = 0; home(); sfx('rPage');
    if (view === 'review') say('cellar', 'neutral', LINES.cellar);
  }
  // Carried across claims: a wrong answer tears an option off the next letter, wherever it arrives.
  const carry = { torn: false };
  // The run: the Night Orders pinned so far. The pick before the Rush takes them all down.
  // bank: coins left over at the end of a won claim, carried into the next one.
  // book: the run's answer book (rush-core's answer()), one record per letter, carried from claim to claim.
  const run = { orders: [], bank: 0, offered: {}, book: new Map() };
  function reset(seed, claim) {
    S = M = R.create(seed, claim || 'rush', run.orders, run.bank, run.book); view = 'main'; RC = freshRooms(); ringT = 0; letters = run.orders.includes('letters') ? pickLetters(S.claim) : []; letterAnim = null; letterOpen = false; reviewOpen = null; fx = RC.main.fx; pops = RC.main.pops; drag = null; sayQ = []; said = {}; saying = null; stamp = null; endAt = 0;
    flashT = 0; leverT = 0; coinPulse = 0; cabFlash = [0, 0, 0, 0]; gaveUp = new Set(); resize(); roomSound();
    qEl.className = ''; qEl.innerHTML = '';
    // The cellar's review questions: letters from the earlier claims, the ones you've solved first.
    if (S.review) S.review.qpool = reviewPool();
    if (S.claim === 'sorter') yardReset();
    else if (S.claim === 'hot') {
      say('intro', 'neutral', 'The Hot Shelf. Mira files every ticket in one of four cabinets, and the caller\'s number picks which. Tonight one caller sends most of them, the red ones. A cabinet only files so many a second.', 9);
      say('twoRooms', 'neutral', 'And the cellar\'s open too, same tank. That little window is the other room. Tap it, or press Tab, to go and look.', 7);
    }
    else    if (S.claim === 'picky') say('intro', 'neutral', 'The Picky Bell. The bell rings for every ticket now, and Reports only wants the refunds, the gold ones. It still has to open every copy to find out.', 9);
    else if (S.claim === 'slow') say('intro', 'neutral', 'The Slow Courier. Heavy parcels take a while, and some never finish. The rack only hides a ticket for 3 seconds. Take longer and it\'s back up for someone else.', 9);
    else if (S.claim === 'double') say('intro', 'neutral', 'Nervous lot tonight. They send the same ticket twice. Do one twice and we pay out twice, and that comes out of the tank.', 9);
    else if (S.claim === 'bell') say('intro', 'neutral', 'Tonight the Night Clerk does Reports. Ribboned tickets need Mira and Reports both. The bell\'s yours now.', 9);
    else say('intro', 'neutral', 'Tickets slide down the chute. Mira handles them at her stools. Build what you like, then pull the lever.', 9);
    // The extra buys on tonight's belt: a word from Dutch on each, the first time it's offered in a run.
    for (const t of S.belt) if (OFFER[t] && (R.CLAIMS[S.claim].extra || []).includes(t) && !run.offered[S.claim + t]) { run.offered[S.claim + t] = 1; say('offer-' + t, 'neutral', OFFER[t]); }
  }

  // ---- Dutch: one line per lesson, once per claim ----
  // A long line goes out as a few short bubbles, a sentence or two each, so nobody has to read a wall of text mid-wave.
  const BUBBLE = 120;
  function bubbles(text) {
    const out = [];
    for (const s of text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)) {
      if (out.length && out[out.length - 1].length + 1 + s.length <= BUBBLE) out[out.length - 1] += ' ' + s; else out.push(s);
    }
    // A scrap like "Worth it." joins its shorter neighbour rather than getting a bubble of its own.
    for (let i = 0; i < out.length && out.length > 1; i++) if (out[i].length < 40) {
      const j = i === 0 ? 1 : i === out.length - 1 ? i - 1 : out[i - 1].length <= out[i + 1].length ? i - 1 : i + 1;
      out.splice(Math.min(i, j), 2, j < i ? out[j] + ' ' + out[i] : out[i] + ' ' + out[j]); i = -1;
    }
    return out;
  }
  function say(key, mood, text, secs) {
    if (said[key]) return; said[key] = 1;
    for (const p of bubbles(text)) sayQ.push({ mood, text: p, secs: Math.max(4, p.length / 16, secs ? secs * p.length / text.length : 0) });
  }
  const LINES = {
    rack: 'A queue. Tickets wait on the rack for a free stool instead of bouncing. It may hand you the same one twice.',
    reserve: 'Reserved stools. Four are bolted down for Mira and nobody else can sit on them. She can\'t use more than four, either.',
    bin: 'A dead-letter bin. A ticket that fails three times off the rack goes in here instead of going round forever.',
    binNoRack: 'It only catches tickets that fail off the rack. A caller at the desk gets the error straight back.',
    bellLocked: 'The bell is for the next claim.',
    bell: 'A bell. Ring it once and everyone who signed up gets their own copy. Mira stops copying them out for Reports.',
    ribbon: 'Ribboned ones go to Reports too. Mira copies each one out by hand, so her stool\'s tied up twice as long.',
    tray: 'Reports\' copies wait in its tray until one of its stools is free. Nobody bounces.',
    resend: 'That\'s a resend. Same ticket, sent again because they didn\'t hear back fast enough.',
    twice: 'Paid that one twice. Same ticket, done twice. That\'s coming out of the tank.',
    hourglass: 'An hourglass on the rack. Once someone takes a ticket, it stays hidden 9 seconds, longer than any honest job. That\'s the visibility timeout.',
    stopwatch: 'A stopwatch for Mira. Any job past 6 seconds gets cut off and goes back on the rack. That\'s the function timeout. Keep it shorter than the hourglass.',
    reappear: 'That one came back on the rack while Mira was still on it. Now two of us are doing the same job.',
    stuck: 'That one\'s stuck. It\'ll sit on that stool till closing unless something cuts it off.',
    timedOut: 'Cut off. Over the time limit, so it failed and goes back on the rack.',
    batchFail: 'One bad ticket in the batch, so the whole batch goes back. Both of them.',
    heavy: 'Heavy parcel, the strapped ones. Four seconds a go.',
    filter: 'A filter card on Reports\' subscription: refunds only. The bell still rings for everything, but Reports only hears the refunds. That\'s a filter policy.',
    tossed: 'Reports opened that one, saw it wasn\'t a refund and binned it. A whole stool\'s worth of time for nothing.',
    aged: 'A refund sat in Reports\' tray too long and got thrown out. That\'s the maximum event age. Lost.',
    filtered: 'Not a refund, so the bell didn\'t bother Reports with it. Mira still gets it.',
    dedup: 'The rack\'s seen that ticket already and dropped the copy. A FIFO queue deduplicates.',
    ledger: 'A ledger. Mira writes each ticket\'s number first, and only if it isn\'t there yet. A repeat fails the write and goes straight out.',
    close: 'Shutters down. Whatever\'s still in the room is lost.',
    throttle: 'Bounced. Two free stools, more people than that. Do the sums.',
    splat: 'Third bounce and they give up. That\'s a lost request, and it goes in the tank.',
    poison: 'That one\'s poison. It fails every time, however often you try it.',
    poisonRack: 'That one\'s poison. It fails every time, and off the rack it just comes back for another go.',
    twin: 'Same ticket twice. A standard queue delivers at least once. Make the job safe to do twice.',
    clog: 'Those will never clear. Nothing takes a bad ticket off the rack.',
    coin: 'Halfway. Have another coin.',
    cold: 'Cold stool. Mira had to warm it up before she could start. A busy stool stays warm.',
    herd: 'There they all go at once. And they\'ve brought a friend. A queue would let them wait instead.',
    expired: 'That one sat on the rack too long and went off. Lost.',
    // The Hot Shelf.
    shard: 'A suffix stamp. Mira adds a number, one to four, worked out from the ticket, to the busy caller\'s key before she files it. Different key, different hash, different cabinet. That\'s write sharding. Reading them back means asking all four. Worth it.',
    ondemand: 'On-demand. Every cabinet can take more now, right up to the most one cabinet can ever take. The red caller wants more than that. You\'ll see.',
    hotThrottle: 'Cabinet {c} is full up for this second, so the write\'s throttled. The other three are twiddling their thumbs. Same caller, same hash, same cabinet.',
    retry: 'The SDK tries a throttled write again by itself, waiting a bit longer each time. Very patient. Meanwhile it\'s sitting on Mira\'s stool.',
    hotLost: 'Three throttles and the SDK gives up. That ticket\'s lost, and it goes in the tank.',
    hotRack: 'Three throttles and the write failed, so that ticket goes back on the rack. It\'ll hash to the same cabinet next time, mind.',
    ondemandHot: 'Still throttled. On-demand raises what the table can take, not the ceiling on one cabinet. A thousand writes a second per partition, and that\'s that.',
    spread: 'Look at that. All four cabinets working, none of them sweating.',
    stale: 'Stale read. She looked it up a moment too soon and the write wasn\'t showing yet. Look again and it is.',
    // Two rooms.
    cellar: 'The cellar. Like old times: two stools, a chute, and callers who won\'t wait. Poison later on, too. Same tank as the vault, mind. You know what goes here.',
    alarmReview: 'Trouble in the cellar. Might want to look.',
    ask: 'A review question, on the wall by Mira. Tap it and answer before its clock runs out. Nothing waits while you read.',
    intern: 'An intern. Keen. It answers any review question you\'ve already got right, and gets about one in four wrong. Its answers come stamped. Tap one to check it. Leave it be and its mistakes go in the files.',
    internFirst: 'The intern\'s had a go. Stamped and everything. Worth a look.',
    internMiss: 'Nobody checked that one, and it was wrong. It\'s in the files now, leaking into the tank. Tap it to fix it.',
    caught: 'Caught one. That\'s what checking is for.',
    unanswered: 'A question sat there until it gave up. That\'s a lost request.',
    wrongYou: 'Wrong answer. Happens to the best of us. Goes in the tank all the same.',
    alarmMain: 'The vault\'s throttling. Back you go.',
    // The extra buys: when each goes in, and what happens because of it.
    memory: 'More memory for Mira. Lambda hands out CPU in proportion to memory, so every job goes quicker. You pay for it every wave, busy or not.',
    warm: 'A warm stool. The lamp\'s always on, so whoever sits there never waits for a cold start. That\'s provisioned concurrency, and it bills every wave, empty or not.',
    jitter: 'A jitter dial. Each caller waits its own backoff plus a random bit, so far fewer land together. And they\'re back to three tries, not four.',
    handoff: 'A hand-off tray. Mira drops Reports\' copy in its tray and gets on with it: an async invoke. Lambda says "got it" straight away. It still takes a bit of her time.',
    ttl: 'TTL on the ledger. Each key gets an expiry, and DynamoDB deletes it after that, for free. Real ones can take a day or two to go; ours go at twelve seconds. Longer than any resend, I hope.',
    partial: 'Partial batch response. If one ticket in a batch fails, Mira says which one, and only that one goes back. ReportBatchItemFailures.',
    dest: 'A failure crate for Reports. A refund that ages out or fails every retry lands here with a note saying why, instead of vanishing. Tap the crate on the belt to replay one, a coin a go.',
    retries: 'The retry dial on Reports. Two retries is the default; one or none if you like. Tap it on the belt to turn it.',
    upkeep: 'Upkeep\'s due. That comes off the coins at the start of every wave.',
    debt: 'We\'re in the red. Nothing new until the coins are back above zero.',
    bill: 'The ledger\'s storage bill. Every key we\'ve ever written is still sitting there, and we pay for the lot.',
    ttlTwice: 'Paid twice. That key had expired before the repeat came in. A TTL has to outlast the retries.',
    partialOk: 'One bad ticket, and only it went back. The good one\'s done.',
    reportFail: 'Reports choked on that refund. Lambda will try it again, if the dial lets it.',
    discarded: 'Lambda gave up on that refund. Out of retries, and nobody kept a record.',
    crated: 'Into the crate. Not lost yet: replay it before the shutters come down.',
    handoffDone: 'Handed to Reports. Mira didn\'t wait for it.'
  };
  // Dutch on each extra buy, the first time it's on the belt.
  const OFFER = {
    memory: 'New on the belt: memory. Faster jobs, but a coin every wave. Buy it too early and you can\'t afford the rest.',
    warm: 'New on the belt, with cold stools pinned: a warm stool. No cold starts on Mira\'s first stool, for a coin every wave.',
    jitter: 'New on the belt, because of the stampede: the jitter dial. It costs about what the stampede costs you. Your call.',
    handoff: 'New on the belt: the hand-off. Mira passes ribboned copies to Reports without waiting on them. Not as good as the bell, mind.',
    ttl: 'New on the belt: TTL. The ledger keeps every key forever and bills us for the storage. TTL clears the old ones out.',
    ledger: 'The ledger\'s on the belt again, two coins at the dock. Duplicates off the rack don\'t pay twice with it.',
    partial: 'New on the belt, with batching pinned: partial batch response. One bad ticket stops dragging the good one back.',
    dest: 'New on the belt: a failure crate for Reports, an on-failure destination. Like the bin, but for Reports\' tray, and it keeps the reason.',
    retries: 'New on the belt: a retry dial for Reports. Some refunds jam once and some never go through. Retries save one and waste time on the other.'
  };

  // ---- Night Orders: one of two pinned before each claim from claim 2 on. Dutch explains each when it goes up ----
  const ORDER = {
    letters: { name: 'Letters', tag: 'Letters', aws: 'Exam-style questions',
      rule: 'Between waves the Post Office sends a question, and the room waits while you read. Wrong: the next letter arrives torn, one option missing.', up: 'A coin for every right answer.',
      dutch: 'The Post Office wants proof we know what we\'re doing, so they\'ll be writing in. They write like the exam does: a situation, then the best fix. Get one wrong and the next arrives torn. Could be the bit with the answer on it. Very dramatic people, the Post Office.' },
    cold: { name: 'Cold stools', tag: 'Cold stools', aws: 'Lambda cold starts',
      rule: 'A stool nobody has sat on for 2 seconds goes cold. The next ticket there takes three times as long.',
      up: 'A coin at the start of every wave from wave 2.',
      dutch: 'Cold stools. Leave one empty for a bit and Mira has to warm it up again: lamp on, coat off, find the good pen. That\'s a Lambda cold start. A new execution environment boots and runs your setup code before the handler sees the event. The good news: Lambda only bills while it runs, so an empty stool costs nothing. You keep the savings, a coin a wave. I checked. It\'s not a trick.' },
    herd: { name: 'The stampede', tag: 'Stampede', aws: 'Retries and jitter',
      rule: 'Bounced callers all come back at the same moment. Every four that land together bring a new caller with them.',
      up: 'Callers try 4 times before giving up, not 3.',
      dutch: 'The callers have started talking to each other. Bounce them and they agree to come back at the same moment, so they all bounce again, together. That\'s a thundering herd. And a crowd draws a crowd: every four that land together bring a new caller. That\'s a retry storm, more load on top of the load. Real clients add jitter, a random bit of extra wait on each retry, so they spread out. Ours haven\'t read the docs. On the bright side, a herd is stubborn: four tries before they give up, not three. The AWS SDKs let you set the number of attempts too.' },
    shelf: { name: 'Shelf life', tag: 'Shelf life', aws: 'SQS message retention',
      rule: 'A ticket that has waited on the rack for 20 seconds expires, and that\'s a lost request.',
      up: 'The rack is free.',
      dutch: 'Tickets on the rack go off now, like milk. Twenty seconds and it\'s gone. SQS does the same: a queue keeps a message for its retention period, four days unless you change it and fourteen at most, then deletes it, read or not. Ours is stricter. To make up for it, the rack is free. SQS gives you your first million requests a month for nothing, and I\'m passing that on.' },
    batch: { name: 'Batching', tag: 'Batching', aws: 'Lambda batch size on SQS',
      rule: 'If one ticket in a batch fails, both go back on the rack.', up: 'Each stool takes two tickets off the rack per trip, and does both in 1.5 times the time of one.',
      dutch: 'Mira\'s started taking tickets off the rack two at a time. Faster, I\'ll give her that. That\'s batch size on an SQS trigger: Lambda hands your function several messages in one go. The catch: if one of them fails, the whole batch goes back on the rack, the good one too. Unless your function reports which ones failed. Ours doesn\'t. Ours barely reports for work.' },
    fifo: { name: 'First in, first out', tag: 'FIFO', aws: 'SQS FIFO queue',
      rule: 'On the rack, each caller\'s tickets go out one at a time, in order. While one is out, that caller\'s next one waits.',
      up: 'The rack drops any ticket it has already been sent, and never hands out the same one twice.',
      dutch: 'The rack\'s gone strict. Every caller gets a little line of their own, and their tickets come off in order, one at a time. While one of theirs is out, the next one waits, even if a stool\'s free. That\'s an SQS FIFO queue: order is kept per message group, one group at a time. The bright side: it remembers what it\'s been sent, so a resend of the same ticket gets dropped at the door. Five minutes, it remembers. Longer than I do.' },
    stakes: { name: 'High stakes', tag: 'Stakes', aws: 'Exam tip: never leave a blank',
      needs: 'letters', rule: 'Bet up to 2 coins on each letter. A wrong answer loses the bet.', up: 'A right answer pays the bet back double.',
      dutch: 'You can bet on the letters now. Sure of yourself? Put coins down. Not sure? Put nothing down, and still answer. The real exam works like that: a blank scores the same as a wrong answer, so never leave one. In here a wrong answer costs you. I\'ll mind the coins.' },
    eventual: { name: 'Eventually consistent', tag: 'Eventual', aws: 'DynamoDB read consistency',
      rule: 'Before closing a ticket, Mira looks it up. Now and then the lookup comes back stale, missing what was just written, and she has to look again. Her stool stays busy meanwhile.',
      up: 'Reads at half price: an extra coin at the start of every claim.',
      dutch: 'Mira\'s switched to the cheap lookups. Before she closes a ticket she checks its record, and now and then it comes back without the thing written a second ago. So she checks again. That\'s an eventually consistent read, DynamoDB\'s default: it might not show a write that only just finished, and if you ask again shortly, it will. Want the latest every time? Set ConsistentRead and pay full price. Eventually consistent reads cost half, and the savings are yours. A coin a claim. Eventually.' },
    timeout: { name: 'Timeout', tag: 'Timeout', aws: 'Lambda and API Gateway timeouts',
      needs: 'letters', rule: 'Each letter has 20 seconds on the clock. Run out and it counts as wrong.', up: 'Answer right in under 10 seconds for an extra coin.',
      dutch: 'The Post Office has put a clock on its letters. Twenty seconds, then it gives up on you. Lambda does that to every function: 3 seconds unless you set it, 15 minutes at most, and then the invocation fails. Put API Gateway in front and you get about 29 seconds. Be quick, though, and there\'s an extra coin in it. Lambda bills by the millisecond, so fast is cheap.' }
  };
  const LETTER_SECS = 20;
  // Two notices from the orders not pinned yet, so one you pass on can come back before a later claim. The first pick
  // of a run always offers letters. Stakes and the timeout only come up once letters are pinned.
  function offer(claim) {
    // A claim's own orders (ORDER[o].only) are offered before that claim and no other.
    const pool = shuffle(R.ORDERS.filter(o => !run.orders.includes(o) && (!ORDER[o].needs || run.orders.includes(ORDER[o].needs)) && (!ORDER[o].only || ORDER[o].only === claim)), Math.random);
    if (claim === 'sorter') { const own = pool.filter(o => ORDER[o].only === 'sorter'); if (own.length) return own.slice(0, 2); }
    if (claim === 'rush' && pool.includes('letters')) return ['letters', pool.find(o => o !== 'letters')].filter(Boolean);
    return pool.slice(0, 2);
  }
  function showPick(claim, opts) {
    if (claim === 'rush') { run.orders = []; run.bank = 0; run.book = new Map(); }
    const two = opts || offer(claim), title = R.CLAIMS[claim].title;
    if (!two.length) { reset(SEED + Math.floor(Math.random() * 1000), claim); return; }
    qEl.className = 'on orders';
    const have = run.orders.length ? `<p class="no-have">Already pinned: ${run.orders.map(o => ORDER[o].name).join(', ')}</p>` : '';
    qEl.innerHTML = `<div class="no-board"><p class="no-kind">Night Orders · before ${title}</p>
      <h2 id="q-h">Pin one up. It stays for the rest of the night.</h2>
      <div class="no-cards">${two.map((o, n) => `<button type="button" class="no-card" data-o="${o}"><kbd>${n + 1}</kbd><b>${ORDER[o].name}</b><span>${ORDER[o].rule}</span><span class="no-up">Upside: ${ORDER[o].up}</span><small>${ORDER[o].aws}</small></button>`).join('')}</div>${have}</div>`;
    qEl.querySelectorAll('.no-card').forEach(b => b.addEventListener('click', () => explainOrder(claim, b.dataset.o, two)));
    qEl.querySelector('.no-card').focus();
  }
  // Dutch explains the order, with the AWS idea behind it, before it goes up.
  function explainOrder(claim, o, two) {
    const other = two.find(x => x !== o);
    qEl.className = 'on orders';
    qEl.innerHTML = `<div class="no-board"><p class="no-kind">Night Orders · ${ORDER[o].aws}</p>
      <h2 id="q-h">${ORDER[o].name}</h2>
      <div class="no-dutch"><img src="${SRC['dutch-' + (o === 'herd' ? 'surprised' : o === 'stakes' ? 'smile' : 'tired')]}" alt="Dutch"><p>${ORDER[o].dutch}</p></div>
      <p class="no-rule">${ORDER[o].rule}<br><span class="no-up">Upside: ${ORDER[o].up}</span></p>
      <button type="button" class="no-go">Pin it up</button>${other ? `<button type="button" class="no-back">I'll take ${ORDER[other].name.replace(/^The /, 'the ')} instead</button>` : ''}</div>`;
    const go = qEl.querySelector('.no-go');
    go.addEventListener('click', () => { run.orders.push(o); reset(SEED + Math.floor(Math.random() * 1000), claim); });
    const back = qEl.querySelector('.no-back'); if (back) back.addEventListener('click', () => explainOrder(claim, other, two));
    go.focus();
  }

  // ---- Images ----
  function shade(im) {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, c.height * .45, 0, c.height);
    gr.addColorStop(0, 'rgba(20,10,4,0)'); gr.addColorStop(1, 'rgba(20,10,4,.5)');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c;
  }
  function load() {
    return Promise.all(Object.keys(SRC).map(k => new Promise(res => {
      const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = SRC[k];
    }))).then(() => {
      // The poison ticket: the envelope tinted violet.
      const e = IMG.env; if (!e) return;
      const c = document.createElement('canvas'); c.width = e.width; c.height = e.height;
      const g = c.getContext('2d'); g.drawImage(e, 0, 0); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(120, 40, 170, .62)'; g.fillRect(0, 0, c.width, c.height); IMG.envPoison = c;
      // A refund: the envelope tinted gold.
      const c2 = document.createElement('canvas'); c2.width = e.width; c2.height = e.height;
      const g2 = c2.getContext('2d'); g2.drawImage(e, 0, 0); g2.globalCompositeOperation = 'source-atop';
      g2.fillStyle = 'rgba(255, 186, 40, .55)'; g2.fillRect(0, 0, c2.width, c2.height); IMG.envRefund = c2;
      // Floor props: the lantern light falls off toward the floor, so their feet sit in shade like the boards.
      // The vault's folder gets the same tints.
      const f = IMG['v-folder'];
      if (f) [['v-folder-poison', 'rgba(120, 40, 170, .62)'], ['v-folder-refund', 'rgba(255, 186, 40, .55)']].forEach(([k, col]) => {
        const c3 = document.createElement('canvas'); c3.width = f.width; c3.height = f.height;
        const g3 = c3.getContext('2d'); g3.drawImage(f, 0, 0); g3.globalCompositeOperation = 'source-atop'; g3.fillStyle = col; g3.fillRect(0, 0, c3.width, c3.height); IMG[k] = c3;
      });
      ['desk', 'rack', 'stool', 'bolted', 'bin', 'bell', 'clerk', 'v-desk', 'v-drawer', 'v-cart', 'v-cart-bolted'].forEach(k => { if (IMG[k]) IMG[k] = shade(IMG[k]); });
      IMG.ledger = IMG.ledger || drawLedger();
      IMG.hourglass = IMG.hourglass || drawHourglass();
      IMG.stopwatch = IMG.stopwatch || drawStopwatch();
      IMG.filter = IMG.filter || drawFilter();
      for (const k of Object.keys(ICONS)) IMG[k] = IMG[k] || drawIcon(k);
      IMG.shard = IMG.shard || drawShard();
      IMG.ondemand = IMG.ondemand || drawDial();
      IMG.intern = IMG.intern || drawIntern();
      yardArt(); // claim 9's code-drawn yard
    });
  }

  // The ledger, drawn in code until its Sogni prop arrives: an open book with ruled pages and a quill.
  function drawLedger() {
    const c = document.createElement('canvas'); c.width = 220; c.height = 150; const g = c.getContext('2d');
    g.lineJoin = 'round';
    g.fillStyle = '#5a2e1c'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(8, 40); g.quadraticCurveTo(110, 18, 212, 40); g.lineTo(212, 132); g.quadraticCurveTo(110, 112, 8, 132); g.closePath(); g.fill(); g.stroke();
    for (const side of [-1, 1]) {
      g.fillStyle = '#f4e8c8'; g.beginPath();
      g.moveTo(110, 30); g.quadraticCurveTo(110 + side * 50, 14, 110 + side * 96, 30); g.lineTo(110 + side * 96, 118); g.quadraticCurveTo(110 + side * 50, 102, 110, 120); g.closePath(); g.fill();
      g.lineWidth = 3; g.stroke();
      g.strokeStyle = 'rgba(90,60,30,.45)'; g.lineWidth = 2;
      for (let y = 44; y < 108; y += 12) { g.beginPath(); g.moveTo(110 + side * 12, y); g.lineTo(110 + side * 84, y - 6); g.stroke(); }
      g.strokeStyle = '#1e0f08';
    }
    g.strokeStyle = '#2a7a3e'; g.lineWidth = 4;
    for (let y = 46; y < 100; y += 12) { g.beginPath(); g.moveTo(26, y); g.lineTo(32, y + 5); g.lineTo(42, y - 5); g.stroke(); }
    g.strokeStyle = '#e8e2d4'; g.lineWidth = 6; g.beginPath(); g.moveTo(150, 92); g.quadraticCurveTo(178, 40, 206, 6); g.stroke();
    return c;
  }

  // The hourglass and the stopwatch, drawn in code like the ledger.
  function drawHourglass() {
    const c = document.createElement('canvas'); c.width = 120; c.height = 180; const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.fillStyle = '#6b3d1e'; g.fillRect(8, 6, 104, 18); g.strokeRect(8, 6, 104, 18); g.fillRect(8, 156, 104, 18); g.strokeRect(8, 156, 104, 18);
    g.fillStyle = 'rgba(220,240,255,.55)'; g.beginPath(); g.moveTo(22, 24); g.lineTo(98, 24); g.quadraticCurveTo(98, 70, 64, 90); g.quadraticCurveTo(98, 110, 98, 156); g.lineTo(22, 156); g.quadraticCurveTo(22, 110, 56, 90); g.quadraticCurveTo(22, 70, 22, 24); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e6b84a'; g.beginPath(); g.moveTo(34, 44); g.lineTo(86, 44); g.quadraticCurveTo(80, 70, 60, 86); g.quadraticCurveTo(40, 70, 34, 44); g.fill();
    g.beginPath(); g.moveTo(60, 92); g.lineTo(88, 152); g.lineTo(32, 152); g.closePath(); g.fill(); g.fillRect(58, 86, 4, 40);
    g.fillStyle = '#4a2a12'; for (const x of [14, 100]) { g.fillRect(x, 24, 6, 132); }
    return c;
  }
  function drawStopwatch() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 170; const g = c.getContext('2d');
    g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.fillStyle = '#c9a23a'; g.fillRect(62, 4, 26, 18); g.strokeRect(62, 4, 26, 18); g.fillRect(52, 18, 46, 10); g.strokeRect(52, 18, 46, 10);
    g.beginPath(); g.arc(75, 100, 64, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#f7f0dc'; g.beginPath(); g.arc(75, 100, 52, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgba(214,72,60,.8)'; g.beginPath(); g.moveTo(75, 100); g.arc(75, 100, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.8); g.closePath(); g.fill();
    g.strokeStyle = '#1e0f08'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(75 + Math.cos(a) * 44, 100 + Math.sin(a) * 44); g.lineTo(75 + Math.cos(a) * 50, 100 + Math.sin(a) * 50); g.stroke(); }
    g.lineWidth = 5; g.beginPath(); g.moveTo(75, 100); g.lineTo(75 + Math.cos(0.3) * 40, 100 + Math.sin(0.3) * 40); g.stroke();
    return c;
  }

  // The filter card: a brass funnel with a gold tag, the refunds-only rule on Reports' subscription.
  function drawFilter() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 170; const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    const br = g.createLinearGradient(14, 0, 136, 0); br.addColorStop(0, '#8a6726'); br.addColorStop(.45, '#e2bd62'); br.addColorStop(1, '#6b4e1c');
    g.fillStyle = br; g.beginPath(); g.moveTo(14, 20); g.lineTo(136, 20); g.lineTo(88, 96); g.lineTo(88, 150); g.lineTo(62, 162); g.lineTo(62, 96); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3a2a14'; g.beginPath(); g.ellipse(75, 20, 61, 10, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(30,15,8,.55)'; g.lineWidth = 2; for (let x = 30; x < 125; x += 12) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 26); g.stroke(); }
    // The tag: a red stamp, refunds only.
    g.strokeStyle = '#1e0f08'; g.lineWidth = 3; g.beginPath(); g.moveTo(112, 40); g.lineTo(128, 74); g.stroke();
    g.fillStyle = '#f4ead2'; g.fillRect(104, 72, 42, 34); g.strokeRect(104, 72, 42, 34);
    g.fillStyle = '#f2b52a'; g.fillRect(113, 79, 24, 20); g.lineWidth = 2; g.strokeRect(113, 79, 24, 20);
    return c;
  }
  // The extra buys' props, drawn in code like the ledger: one small picture each, on a 150 x 150 canvas.
  const ICONS = {
    memory: g => { // a memory stick with gold pins
      g.fillStyle = '#2f7a4a'; g.fillRect(10, 50, 130, 50); g.strokeRect(10, 50, 130, 50);
      g.fillStyle = '#1b1b1b'; for (let x = 22; x < 130; x += 28) { g.fillRect(x, 58, 20, 26); g.strokeRect(x, 58, 20, 26); }
      g.fillStyle = '#e2bd62'; for (let x = 16; x < 136; x += 9) g.fillRect(x, 100, 5, 14);
    },
    warm: g => { // a stool with a lamp glowing over it
      const gr = g.createRadialGradient(75, 46, 4, 75, 46, 60); gr.addColorStop(0, 'rgba(255,190,80,.9)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 150, 120);
      g.fillStyle = '#7a4a22'; g.fillRect(40, 92, 70, 14); g.strokeRect(40, 92, 70, 14); g.fillRect(48, 106, 10, 36); g.fillRect(92, 106, 10, 36);
      g.fillStyle = '#c9a23a'; g.beginPath(); g.moveTo(52, 46); g.lineTo(98, 46); g.lineTo(86, 22); g.lineTo(64, 22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff2b0'; g.beginPath(); g.arc(75, 52, 8, 0, Math.PI * 2); g.fill();
    },
    jitter: g => { // a dial with a wobbly trace
      g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(75, 80, 60, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#f7f0dc'; g.beginPath(); g.arc(75, 80, 48, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#b23a2f'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.1 + i * 0.08), r = 34 + (i % 2 ? 8 : -4); g.lineTo(75 + Math.cos(a) * r, 80 + Math.sin(a) * r); } g.stroke();
      g.strokeStyle = '#1e0f08'; g.lineWidth = 6; g.beginPath(); g.moveTo(75, 80); g.lineTo(110, 52); g.stroke();
    },
    handoff: g => { // an in-tray with a letter dropping in
      g.fillStyle = '#8a5a32'; g.fillRect(14, 92, 122, 34); g.strokeRect(14, 92, 122, 34);
      g.fillStyle = '#f4e8c8'; g.save(); g.translate(78, 60); g.rotate(-0.25); g.fillRect(-36, -22, 72, 44); g.strokeRect(-36, -22, 72, 44);
      g.beginPath(); g.moveTo(-36, -22); g.lineTo(0, 4); g.lineTo(36, -22); g.stroke(); g.restore();
      g.strokeStyle = '#3f7fe0'; g.lineWidth = 6; g.beginPath(); g.moveTo(120, 20); g.quadraticCurveTo(138, 50, 118, 82); g.stroke();
    },
    ttl: g => { // a tag with a little clock: the expiry
      g.fillStyle = '#f4ead2'; g.beginPath(); g.moveTo(20, 40); g.lineTo(110, 40); g.lineTo(136, 75); g.lineTo(110, 110); g.lineTo(20, 110); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(112, 75, 6, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(58, 75, 26, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(58, 75); g.lineTo(58, 56); g.moveTo(58, 75); g.lineTo(72, 82); g.stroke();
    },
    partial: g => { // a clipboard: a tick and a cross
      g.fillStyle = '#8a5a32'; g.fillRect(24, 14, 102, 128); g.strokeRect(24, 14, 102, 128);
      g.fillStyle = '#f7f0dc'; g.fillRect(34, 30, 82, 104); g.fillStyle = '#c9a23a'; g.fillRect(56, 6, 38, 18); g.strokeRect(56, 6, 38, 18);
      g.lineWidth = 7; g.strokeStyle = '#2a7a3e'; g.beginPath(); g.moveTo(46, 62); g.lineTo(60, 76); g.lineTo(84, 48); g.stroke();
      g.strokeStyle = '#b23a2f'; g.beginPath(); g.moveTo(50, 96); g.lineTo(76, 122); g.moveTo(76, 96); g.lineTo(50, 122); g.stroke();
    },
    dest: g => { // a wooden crate with a red-crossed label
      g.fillStyle = '#9a6a3a'; g.fillRect(14, 40, 122, 96); g.strokeRect(14, 40, 122, 96);
      g.strokeStyle = 'rgba(30,15,8,.6)'; g.lineWidth = 3; for (let y = 64; y < 136; y += 24) { g.beginPath(); g.moveTo(14, y); g.lineTo(136, y); g.stroke(); }
      g.strokeStyle = '#1e0f08'; g.lineWidth = 5; g.beginPath(); g.moveTo(14, 40); g.lineTo(136, 136); g.stroke();
      g.fillStyle = '#f4e8c8'; g.fillRect(52, 18, 46, 30); g.strokeRect(52, 18, 46, 30);
      g.strokeStyle = '#b23a2f'; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 24); g.lineTo(86, 42); g.moveTo(86, 24); g.lineTo(64, 42); g.stroke();
    },
    retries: g => { // a dial marked 0, 1, 2
      g.fillStyle = '#5a6a7a'; g.beginPath(); g.arc(75, 82, 58, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#f7f0dc'; g.beginPath(); g.arc(75, 82, 44, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e0f08'; g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      [['0', -2.4], ['1', -1.57], ['2', -0.74]].forEach(([n, a]) => g.fillText(n, 75 + Math.cos(a) * 30, 82 + Math.sin(a) * 30));
      g.lineWidth = 6; g.beginPath(); g.moveTo(75, 82); g.lineTo(75, 52); g.stroke();
    }
  };
  function drawIcon(k) {
    const c = document.createElement('canvas'); c.width = 150; c.height = 150; const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5; ICONS[k](g); return c;
  }
  // The suffix stamp: a rubber stamp on a wooden handle with a number wheel, for write sharding.
  function drawShard() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 170; const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.fillStyle = '#8a4a22'; g.beginPath(); g.ellipse(75, 30, 26, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#6b3a1a'; g.fillRect(64, 46, 22, 44); g.strokeRect(64, 46, 22, 44);
    const br = g.createLinearGradient(20, 0, 130, 0); br.addColorStop(0, '#8a6726'); br.addColorStop(.45, '#e2bd62'); br.addColorStop(1, '#6b4e1c');
    g.fillStyle = br; g.fillRect(20, 88, 110, 34); g.strokeRect(20, 88, 110, 34);
    g.fillStyle = '#f4ead2'; g.fillRect(48, 94, 54, 22); g.lineWidth = 3; g.strokeRect(48, 94, 54, 22);
    g.fillStyle = '#2a1d10'; g.font = '700 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('#1-4', 75, 106);
    g.fillStyle = '#c8473b'; g.fillRect(16, 122, 118, 18); g.lineWidth = 5; g.strokeRect(16, 122, 118, 18);
    g.fillStyle = 'rgba(200,71,59,.55)'; for (let i = 0; i < 4; i++) g.fillRect(22 + i * 30, 150, 20, 10);
    return c;
  }
  // The on-demand dial: a brass gauge with the needle pinned at the red line, the most one cabinet can take.
  function drawDial() {
    const c = document.createElement('canvas'); c.width = 150; c.height = 150; const g = c.getContext('2d');
    g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.fillStyle = '#c9a23a'; g.beginPath(); g.arc(75, 80, 64, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#f7f0dc'; g.beginPath(); g.arc(75, 80, 52, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.stroke();
    g.lineWidth = 9; g.strokeStyle = '#3c9a58'; g.beginPath(); g.arc(75, 80, 42, Math.PI * .8, Math.PI * 1.75); g.stroke();
    g.strokeStyle = '#c8473b'; g.beginPath(); g.arc(75, 80, 42, Math.PI * 1.75, Math.PI * 2.2); g.stroke();
    g.strokeStyle = '#1e0f08'; g.lineWidth = 5; g.beginPath(); g.moveTo(75, 80); g.lineTo(75 + Math.cos(Math.PI * 1.72) * 40, 80 + Math.sin(Math.PI * 1.72) * 40); g.stroke();
    g.fillStyle = '#1e0f08'; g.beginPath(); g.arc(75, 80, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6b4e1c'; g.fillRect(60, 2, 30, 16); g.strokeRect(60, 2, 30, 16);
    return c;
  }
  // ---- Geometry ----
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const arc = (p, q, h, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t) - h * 4 * t * (1 - t)];
  function stoolPos(i) { return [L.stools.xs[i], L.stools.y - L.stools.h - 14]; }
  function rackSlot(n) {
    const r = L.rack, cols = 3, w = r.h * 0.2, hgt = r.h * 0.22;
    const c = n % cols, row = Math.floor(n / cols);
    return [r.x + (c - 1) * w, r.y - r.h * 0.78 + row * hgt];
  }
  const RACK_SLOTS = 9;
  // Where a filed ticket goes in: the cabinet's top drawer.
  function cabMouth(i) { const c = L.cabs, a = c.at[i]; return [a[0], a[1] - c.h * .78]; }
  function chutePos(t) {
    const [a, b] = L.chute;
    if (t < 0.8) { const u = t / 0.8; return [lerp(a[0], b[0], u * u), lerp(a[1], b[1], u * u)]; }
    const u = (t - 0.8) / 0.2; return arc(b, L.foot, -10, u);
  }
  function chuteAngle() {
    const [a, b] = L.chute; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
    return ang;
  }
  function spot(tool) {
    if (tool === 'rack') { const r = L.rack, w = r.h * 0.72; return [r.x - w / 2, r.y - r.h - 6, w, r.h + 12]; }
    if (tool === 'bin') { const b = L.bin, w = b.h * 0.95; return [b.x - w / 2, b.y - b.h - 6, w, b.h + 12]; }
    if (tool === 'hourglass') { const r = L.rack, w = r.h * 0.72; return [r.x - w / 2, r.y - r.h - 6, w, r.h + 12]; }
    if (tool === 'stopwatch') { const d = L.desk; return [d.x - d.h * .62, d.y - d.h * 1.02, d.h * 1.1, d.h * .62]; }
    if (tool === 'filter') { const w = 120; return [L.tray[0] - w / 2 + 20, L.tray[1] - 120, w, 130]; }
    if (tool === 'ledger') { const d = L.desk; return [d.x - d.h * .62, d.y - d.h * 1.02, d.h * 1.1, d.h * .62]; }
    if (tool === 'bell') { const b = L.bell, w = b.h * 1.5; return [b.x - w / 2, b.y - b.h - 8, w, b.h + 16]; }
    if (tool === 'memory' || tool === 'ttl') { const d = L.desk; return [d.x - d.h * .62, d.y - d.h * 1.02, d.h * 1.1, d.h * .62]; }
    if (tool === 'warm' || tool === 'partial') { const xs = L.stools.xs.slice(0, 2), h = L.stools.h; return [Math.min(...xs) - 34, L.stools.y - h - 30, Math.max(...xs) - Math.min(...xs) + 68, h + 42]; }
    if (tool === 'jitter') return [L.hatch[0] - 60, L.hatch[1] - 50, 200, 140];
    if (tool === 'handoff' || tool === 'dest' || tool === 'retries') { const w = 140; return [L.tray[0] - w / 2 + 20, L.tray[1] - 120, w, 140]; }
    if (tool === 'shard') { const d = L.desk; return [d.x - d.h * .62, d.y - d.h * 1.02, d.h * 1.1, d.h * .62]; }
    if (tool === 'ondemand') { const c = L.cabs || VAULT_WIDE.cabs, xs = c.at.map(a => a[0]), ys = c.at.map(a => a[1]); return [Math.min(...xs) - c.w / 2 - 10, Math.min(...ys) - c.h - 10, Math.max(...xs) - Math.min(...xs) + c.w + 20, Math.max(...ys) - Math.min(...ys) + c.h + 20]; }
    if (tool === 'intern' && L.asks) { const a = L.asks, xs = [a.intern[0], a.x, a.x + (a.max - 1) * a.dx], ys = [a.intern[1] - 80, a.y - 40, a.y + 40, a.intern[1]]; return [Math.min(...xs) - 50, Math.min(...ys), Math.max(...xs) - Math.min(...xs) + 100, Math.max(...ys) - Math.min(...ys)]; }
    if (tool === 'reserve') { const xs = L.stools.xs.slice(0, 4), h = L.stools.h; return [Math.min(...xs) - 34, L.stools.y - h - 30, Math.max(...xs) - Math.min(...xs) + 68, h + 42]; }
    return null;
  }
  // The belt's four slots change with the claim (the Double-claimer swaps the bell for the ledger).
  // The belt is the room on screen's (the coins are the claim's, shared by both rooms).
  const V = () => room(view);
  const TOOLS = { get length() { return V().belt.length; }, forEach: f => V().belt.forEach(f) };
  const tool = i => V().belt[i];
  const TOOL_IMG = { rack: 'rack', reserve: 'bolted', bin: 'bin', bell: 'bell', ledger: 'ledger', hourglass: 'hourglass', stopwatch: 'stopwatch', filter: 'filter', shard: 'shard', ondemand: 'ondemand', intern: 'intern' };
  const TOOL_LABEL = { rack: 'Rack', reserve: 'Bolt 4', bin: 'Bin', bell: 'Bell', ledger: 'Ledger', hourglass: 'Hourglass', stopwatch: 'Stopwatch', filter: 'Filter card', shard: 'Suffix', ondemand: 'On-demand', intern: 'Intern' };
  Object.assign(TOOL_IMG, { memory: 'memory', warm: 'warm', jitter: 'jitter', handoff: 'handoff', ttl: 'ttl', partial: 'partial', dest: 'dest', retries: 'retries' });
  Object.assign(TOOL_LABEL, { memory: 'Memory', warm: 'Warm 1', jitter: 'Jitter', handoff: 'Hand-off', ttl: 'TTL', partial: 'Partial', dest: 'Crate', retries: 'Retries' });
  // A placed tool you can still use from the belt: the retry dial turns, the crate replays.
  const USE_LABEL = { retries: () => 'Retries ' + V().retryN, dest: () => V().crate.length ? `Replay (${V().crate.length})` : 'Crate empty' };
  function used0(t) { return V()[t] && USE_LABEL[t] ? USE_LABEL[t]() : ''; }
  // An image URL for a tool, for the letters (the code-drawn ones as data URLs).
  function toolSrc(t) { const k = TOOL_IMG[t]; return SRC[k] || (IMG[k] && IMG[k].toDataURL ? IMG[k].toDataURL() : ''); }
  // Six tools on a phone: the slots narrow to fit the stage.
  function slotW() { return Math.min(L.belt.slot, (L.W - 24 - (L.coinsAt ? 16 : 150)) / TOOLS.length); }
  function beltRect() {
    const n = TOOLS.length, s = slotW(), w = n * s + 24, h = L.belt.h;
    return [(L.W - w) / 2, L.H - h - 12, w, h];
  }
  function slotRect(i) { const [bx, by, , bh] = beltRect(), s = slotW(); return [bx + 12 + i * s + 4, by + 8, s - 8, bh - 16]; }
  const inRect = (p, r, pad) => p[0] >= r[0] - (pad || 0) && p[0] <= r[0] + r[2] + (pad || 0) && p[1] >= r[1] - (pad || 0) && p[1] <= r[1] + r[3] + (pad || 0);

  // ---- Where each ticket is, from its phase ----
  function ticketDraw(k) {
    const u = k.dur ? Math.min(1, k.t / k.dur) : 0;
    const qi = S.queue.indexOf(k.id);
    const fromRack = () => rackSlot(Math.min(RACK_SLOTS - 1, 4));
    switch (k.phase) {
      case 'slide': return { p: chutePos(ease(u)), rot: u < 0.8 ? chuteAngle() : chuteAngle() * (1 - (u - .8) / .2) };
      case 'shelf': return qi < RACK_SLOTS ? { p: rackSlot(Math.max(0, qi)), s: 0.42 } : null;
      case 'hidden': return { p: [L.rack.x + L.rack.h * 0.32, L.rack.y - L.rack.h * 0.95], s: 0.42, a: 0.35 };
      case 'tray': return null;
      case 'drop': return { p: stoolPos(k.seat || 0), a: Math.max(0, 1 - u), s: lerp(.5, .2, u) };
      case 'walk': { const src = k.from === 'rack' ? fromRack() : k.from === 'tray' ? L.tray : L.foot; return { p: arc(src, stoolPos(k.stool), 60, ease(u)), s: lerp(k.from === 'rack' ? .42 : .5, .5, u) }; }
      case 'work': return { p: stoolPos(k.stool), ring: u };
      case 'retry': return { p: stoolPos(k.stool), wait: u };
      case 'ride': { const p = stoolPos(k.seat || 0); return { p: [p[0] + 18, p[1] - 30], s: .38 }; }
      case 'done': if (k.quiz) return { p: arc(askPos(k), L.handled, 100, ease(u)), s: lerp(.5, .3, u), img: 'envDone' };
        return { p: arc(stoolPos(k.seat || 0), k.cabAt != null && L.cabs ? cabMouth(k.cabAt) : k.desk === 'reports' ? L.reports : L.handled, 120, ease(u)), s: lerp(.5, .3, u), img: 'envDone' };
      case 'bounce': return { p: arc(L.foot, L.hatch, 180, ease(u)), rot: -0.6 + u * 4, img: 'env429' };
      case 'splat': return { p: arc(L.foot, [L.puddle.x, L.puddle.y - 6], 60, u), rot: u * 2, img: 'env429', a: 1 - u * .3 };
      case 'tobin': return { p: arc(stoolPos(k.seat || 0), [L.bin.x, L.bin.y - L.bin.h * .7], 140, ease(u)), rot: u * 6, s: lerp(.5, .3, u) };
      case 'back': return { p: arc(stoolPos(k.seat || 0), fromRack(), 50, ease(u)), s: .45 };
    }
    return null;
  }

  // ---- The loop ----
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
    if (M.started && !M.over && !letterOpen) R.step(M, dt);
    withRoom('main', () => { for (const e of R.drain(M)) onEvent(e, 'main'); });
    if (M.review) withRoom('review', () => { for (const e of R.drain(M.review)) onEvent(e, 'review'); });
    tick(dt);
    draw();
    requestAnimationFrame(frame);
  }
  const tr0 = () => L.tray[0];
  function popAt(p, text, col, size) { pops.push({ x: Math.max(130, Math.min(L.W - 130, p[0])), y: p[1], text, col, size: size || 34, t: 0 }); }
  // The second room's own waves, coins and ending belong to the claim, so they're left to the first room's events.
  const ROOM_ONLY = new Set(['wave', 'coin', 'saved', 'win', 'lose', 'lever', 'answer']);
  const TROUBLE = new Set(['throttle', 'spill', 'poisonFail', 'hotThrottle', 'clog', 'internMiss', 'unanswered']);
  function onEvent(e, where) {
    if (where === 'review' && ROOM_ONLY.has(e.type)) return;
    if (S.yard && yardEvent(e)) return; // claim 9
    // Off screen: no red flash, but the room's window glows, and Dutch says so once.
    const away = where !== view;
    if (TROUBLE.has(e.type)) {
      RC[where].alarm = 2.5;
      if (away && M.started) say(where === 'review' ? 'alarmReview' : 'alarmMain', 'surprised', where === 'review' ? LINES.alarmReview : LINES.alarmMain);
    }
    const k = S.tickets.find(x => x.id === e.id);
    switch (e.type) {
      case 'lever': sfx('rLever'); leverT = 1; if (saying && said.intro && sayQ.indexOf(saying) < 0 && /pull the lever/.test(saying.text)) saying = null; break;
      case 'wave': sfx('rChime'); popAt([L.W / 2, L.H * 0.36], 'Wave ' + e.wave, '#ffe6a8', 56); if (e.wave >= 2 && letters.length) letterAnim = { t: 0, L: letters.shift() }; break;
      case 'coin': sfx('coin'); coinPulse = 1.5; say('coin', 'smile', LINES.coin); break;
      case 'saved': sfx('coin'); coinPulse = 1.5; popAt([L.W / 2, L.H * 0.36 + 60], '+1 coin, idle stools saved', '#ffdc78', 30); break;
      case 'throttle': sfx('rThud'); popAt([L.foot[0] + 20 + (Math.random() - .5) * 60, L.foot[1] - 70 - Math.random() * 40], '429', '#ff8a7a', 40); if (!away) flashT = .25; if (!away) say('throttle', 'tired', LINES.throttle); break;
      case 'spill':
        sfx('splat');
        popAt([L.puddle.x, L.puddle.y - 60], '-1', '#9cc8ff', 36);
        popAt([L.tank.x - 70, L.tank.y - L.tank.h * .2], '+1', '#9cc8ff', 28);
        drops.push({ t: 0 });
        for (let i = 0; i < 8; i++) fx.push({ x: L.puddle.x, y: L.puddle.y - 4, vx: (Math.random() - .5) * 220, vy: -120 - Math.random() * 160, t: 0 });
        if (e.why === 'throttled') { if (gaveUp.has(e.id)) say('hotLost', 'tired', LINES.hotLost); else say('splat', 'tired', LINES.splat); }
        if (e.why === 'twice') { popAt([L.desk.x - 60, L.desk.y - L.desk.h - 40], 'paid twice', '#ffd666', 30); if (S.ledger && S.ttl) say('ttlTwice', 'angry', LINES.ttlTwice); else say('twice', 'angry', LINES.twice); }
        break;
      case 'poisonFail': if (k && k.stool == null) popAt(k.from === 'rack' ? rackSlot(4) : L.foot, 'fail', '#d59cff', 30); say('poison', 'surprised', S.rack && !S.bin ? LINES.poisonRack : LINES.poison); break;
      case 'twin': popAt(rackSlot(0), 'x2', '#ffb27a', 38); say('twin', 'neutral', LINES.twin); break;
      case 'binned': sfx('rClank'); popAt([L.bin.x, L.bin.y - L.bin.h - 20], 'binned', '#d59cff', 28); break;
      case 'clog': say('clog', 'tired', LINES.clog); break;
      case 'resend': popAt([L.hatch[0] + 120, L.hatch[1] + 40], 'Sending again!', '#ffb27a', 26); say('resend', 'surprised', LINES.resend); break;
      case 'dropped': if (k) popAt([stoolPos(k.seat || 0)[0], stoolPos(k.seat || 0)[1] - 40], 'already done', '#9be59b', 24); break;
      case 'cold': { const p = stoolPos(e.stool); popAt([p[0], p[1] - 40], 'cold start', '#9fd8ff', 24); say('cold', 'tired', LINES.cold); break; }
      case 'herd': popAt([L.hatch[0] + 130, L.hatch[1] + 70], 'Stampede! x' + e.n, '#ff9a8a', 34); if (e.n >= 4) popAt([L.hatch[0] + 130, L.hatch[1] + 115], '+' + Math.floor(e.n / 4) + ' new caller', '#ffb27a', 26); say('herd', 'surprised', LINES.herd); break;
      case 'expired': popAt(rackSlot(1), 'expired', '#e2c48a', 28); say('expired', 'tired', LINES.expired); break;
      case 'reappear': sfx('wrong'); popAt(rackSlot(2), 'back on the rack!', '#ffc95a', 26); say('reappear', 'surprised', LINES.reappear); break;
      case 'timedOut': sfx('rTick'); if (k) { const p = stoolPos(k.seat || 0); popAt([p[0], p[1] - 44], 'timed out', '#ff9a8a', 24); } say('timedOut', 'neutral', LINES.timedOut); break;
      case 'stuck': say('stuck', 'tired', LINES.stuck); break;
      case 'tossed': sfx('rPage'); if (k) { const p = stoolPos(k.seat || 0); popAt([p[0], p[1] - 40], 'not a refund', '#c9c0b0', 22); } if (S.tossed >= 3) say('tossed', 'tired', LINES.tossed); break;
      case 'aged': if (e.want) { sfx('wrong'); popAt([L.tray[0] + 20, L.tray[1] - 70], 'too old!', '#ff9a8a', 26); say('aged', 'angry', LINES.aged); } break;
      case 'filtered': if (S.filtered >= 2) say('filtered', 'smile', LINES.filtered); break;
      case 'dedup': popAt(rackSlot(0), 'duplicate dropped', '#9be59b', 24); say('dedup', 'smile', LINES.dedup); break;
      case 'batchFail': if (k) { const p = stoolPos(k.seat || 0); popAt([p[0], p[1] - 60], 'batch failed: both back', '#d59cff', 24); } say('batchFail', 'tired', LINES.batchFail); break;
      case 'upkeep': coinPulse = 1; popAt([L.coinsAt ? L.coinsAt[0] + 30 : beltRect()[0] + beltRect()[2] + 50, (L.coinsAt ? L.coinsAt[1] : beltRect()[1]) + 40], '-' + e.n + ' upkeep', '#ff9a8a', 26);
        say(S.ledger && !S.ttl && S.belt.includes('ttl') ? 'bill' : 'upkeep', 'tired', S.ledger && !S.ttl && S.belt.includes('ttl') ? LINES.bill : LINES.upkeep); if (M.coins < 0) say('debt', 'angry', LINES.debt); break;
      case 'partial': if (k) { const p = stoolPos(k.seat || 0); popAt([p[0], p[1] - 60], 'only the bad one back', '#9be59b', 24); } say('partialOk', 'smile', LINES.partialOk); break;
      case 'reportFail': if (k) { const p = stoolPos(k.seat || 0); popAt([p[0], p[1] - 40], e.bad ? 'failed again' : 'jammed', '#d59cff', 22); } say('reportFail', 'neutral', LINES.reportFail); break;
      case 'discarded': if (e.want) { popAt([tr0(), L.tray[1] - 70], 'given up', '#ff9a8a', 24); say('discarded', 'angry', LINES.discarded); } break;
      case 'crated': popAt([tr0() - 76, L.tray[1] - 70], 'into the crate', '#ffd666', 24); say('crated', 'neutral', LINES.crated); break;
      case 'replay': popAt([tr0(), L.tray[1] - 70], 'replay', '#9be59b', 26); break;
      case 'dial': popAt([tr0() + 120, L.tray[1] - 80], 'retries ' + e.n, '#cfe0ff', 26); break;
      case 'handoff': if (S.handed <= 3) popAt([L.desk.x - 60, L.desk.y - L.desk.h - 40], 'handed off', '#9fc8ff', 24); say('handoffDone', 'smile', LINES.handoffDone); break;
      case 'ring': sfx('rBell'); ringT = 1; if (S.tray.length > 1) say('tray', 'neutral', LINES.tray); break;
      case 'close': if (e.n) { popAt([L.W / 2, L.H * .3], 'Shutters down', '#ffb27a', 46); say('close', 'tired', LINES.close); } break;
      case 'win': sfx('rStamp'); if (AU) AU.jingle('rushWin', null); stamp = { text: 'CLOSED', col: '#3c9a58', t: 0 }; endAt = 1.8; break;
      case 'lose': sfx('rStamp'); if (AU) AU.jingle('rushLose', null); stamp = { text: 'FLOODED', col: '#c8473b', t: 0 }; endAt = 1.8; break;
      case 'handled': if (e.desk !== 'reports') sfx('rTick'); break;
      case 'hotThrottle': {
        cabFlash[e.cab] = .6; sfx('rThud');
        if (L.cabs) { const a = L.cabs.at[e.cab]; popAt([a[0], a[1] - L.cabs.h - 26 * L.fs], 'throttled', '#ff8a7a', 24); }
        say('hotThrottle', 'tired', LINES.hotThrottle.replace('{c}', 'ABCD'[e.cab]));
        if (e.n === 1) say('retry', 'neutral', LINES.retry);
        if (S.ondemand) say('ondemandHot', 'tired', LINES.ondemandHot);
        break;
      }
      case 'writeFail': { gaveUp.add(e.id); sfx('wrong'); const kk = S.tickets.find(x => x.id === e.id); if (kk && kk.from === 'rack') say('hotRack', 'tired', LINES.hotRack); break; }
      case 'ask': sfx('rPage'); say('ask', 'neutral', LINES.ask); break;
      case 'internAnswer': sfx('rStamp'); say('internFirst', 'smile', LINES.internFirst); break;
      case 'internMiss': { sfx('wrong'); const p = askPos(k); popAt([p[0], p[1] - 50], 'filed wrong!', '#ff8a7a', 24); say('internMiss', 'angry', LINES.internMiss); break; }
      case 'caught': { sfx('right'); const p = askPos(k); popAt([p[0], p[1] - 50], 'caught!', '#9be59b', 26); say('caught', 'smile', LINES.caught); break; }
      case 'checked': sfx('rTick'); break;
      case 'unanswered': popAt([L.asks.x, L.asks.y - 50], 'too late', '#ff9a8a', 24); say('unanswered', 'tired', LINES.unanswered); break;
      case 'replied': if (!e.right) say('wrongYou', 'tired', LINES.wrongYou); break;
      case 'stale': { sfx('rPage'); const p = stoolPos(e.stool || 0); popAt([p[0], p[1] - 44], 'stale read', '#9fd8ff', 22); say('stale', 'neutral', LINES.stale); break; }
    }
  }
  function tick(dt) {
    for (const v of Object.keys(RC)) {
      const r = RC[v];
      r.pops.forEach(p => p.t += dt); r.pops = r.pops.filter(p => p.t < 1.2);
      r.fx.forEach(f => { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 600 * dt; }); r.fx = r.fx.filter(f => f.t < .8);
      r.alarm = Math.max(0, r.alarm - dt);
    }
    // The room off screen also glows while callers are bouncing there or its rack is piling up.
    if (M.review) { const o = view === 'main' ? 'review' : 'main', T2 = room(o); if (T2.tickets.some(k => ['bounce', 'wait', 'splat', 'retry', 'leak'].includes(k.phase)) || T2.queue.length > 6) RC[o].alarm = Math.max(RC[o].alarm, .4); }
    home();
    drops.forEach(d => d.t += dt); drops = drops.filter(d => d.t < .7);
    flashT = Math.max(0, flashT - dt); coinPulse = Math.max(0, coinPulse - dt);
    if (leverT) leverT = Math.max(0, leverT - dt * 0.7);
    if (ringT) ringT = Math.max(0, ringT - dt * 1.6);
    if (S.started && !S.bell && S.tickets.some(k => k.ribbon && k.phase === 'work')) say('ribbon', 'tired', LINES.ribbon);
    if (S.started && S.tickets.some(k => k.heavy && k.phase === 'work')) say('heavy', 'neutral', LINES.heavy);
    if (!saying && sayQ.length) saying = Object.assign(sayQ.shift(), { t: 0 });
    if (saying) { saying.t += dt; if (saying.t > saying.secs) saying = null; }
    if (stamp) stamp.t += dt;
    for (let i = 0; i < cabFlash.length; i++) cabFlash[i] = Math.max(0, cabFlash[i] - dt);
    // Sharded: once all four cabinets have filed a fair few, Dutch notices.
    if (S.vault && S.shard && S.cabs.every(c => c.filed >= 4)) say('spread', 'smile', LINES.spread);
    tickReview();
    if (M.yard) yardTick(dt); // claim 9
    if (letterAnim && !letterOpen && !reviewOpen && !S.over) { letterAnim.t += dt; if (letterAnim.t >= 1.4) { const l = letterAnim.L; letterAnim = null; sfx('rPage'); openLetter(l); } }
    if (letterOpen && letterClock && !letterClock.done) {
      letterClock.left -= dt; const bar = qEl.querySelector('.lt-clock i'); if (bar) bar.style.width = Math.max(0, 100 * letterClock.left / LETTER_SECS) + '%';
      if (letterClock.left <= 0) { letterClock.done = true; letterClock.timeUp(); }
    }
    if (endAt) { endAt -= dt; if (endAt <= 0) { endAt = 0; reviewOpen = null; showEnd(); } }
  }

  // ---- Drawing ----
  function img(k, x, y, h, anchor, alpha, rot, w) {
    const m = L.art && ART[L.art], im = IMG[m && m[k] && IMG[m[k]] ? m[k] : k]; if (!im) return;
    const ww = w || im.width * h / im.height, hh = w ? im.height * w / im.width : h;
    cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha; cx.translate(x, y); if (rot) cx.rotate(rot);
    const ax = anchor === 'mb' ? -ww / 2 : -ww / 2, ay = anchor === 'mb' ? -hh : -hh / 2;
    cx.drawImage(im, ax, ay, ww, hh); cx.restore();
  }
  // A soft pool under a prop with a darker core where its feet meet the floor, so it stands on the boards.
  function shadow(x, y, w) {
    cx.save(); cx.translate(x, y); cx.scale(1, .16);
    const g = cx.createRadialGradient(0, 0, 0, 0, 0, w * .62);
    g.addColorStop(0, 'rgba(8,4,2,.62)'); g.addColorStop(.55, 'rgba(8,4,2,.4)'); g.addColorStop(1, 'rgba(8,4,2,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, w * .62, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  function rrect(x, y, w, h, r) { cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); }
  function text(t, x, y, size, col, align, weight) {
    size *= L.fs; cx.save(); cx.font = `${weight || 700} ${size}px Fredoka, "Trebuchet MS", system-ui, sans-serif`; cx.textAlign = align || 'center'; cx.textBaseline = 'middle';
    cx.lineJoin = 'round'; cx.lineWidth = Math.max(3, size / 6); cx.strokeStyle = 'rgba(0,0,0,.9)'; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); cx.restore();
  }
  function plaque(t, x, y) {
    const f = 15 * L.fs; cx.save(); cx.font = `700 ${f}px Nunito, "Segoe UI", system-ui, sans-serif`; const w = cx.measureText(t).width + 16; x = Math.max(w / 2 + 4, Math.min(L.W - w / 2 - 4, x));
    rrect(x - w / 2, y - f * .75, w, f * 1.5, 8); cx.fillStyle = 'rgba(32,24,18,.82)'; cx.fill(); cx.strokeStyle = 'rgba(214,178,84,.9)'; cx.lineWidth = 1.5; cx.stroke();
    cx.fillStyle = '#f6e7c4'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y + 1); cx.restore();
  }
  function glowSpot(r, strong) {
    const pulse = .5 + .5 * Math.sin(performance.now() / 220);
    cx.save(); rrect(r[0], r[1], r[2], r[3], 14);
    cx.fillStyle = `rgba(255,214,102,${(strong ? .22 : .1) + pulse * .08})`; cx.fill();
    cx.setLineDash([10, 8]); cx.lineWidth = 4; cx.strokeStyle = `rgba(255,214,102,${strong ? .95 : .6})`; cx.stroke(); cx.restore();
  }
  function wrap(t, maxW) {
    const words = t.split(' '), lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (cx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur); return lines;
  }
  function draw() {
    const cw = cv.width, ch = cv.height;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    // The backdrop fills the whole screen behind the stage, dimmed, so there are no bars.
    const bg = IMG[L.bg];
    if (bg) {
      const cs = Math.max(cw / bg.width, ch / bg.height);
      cx.drawImage(bg, (cw - bg.width * cs) / 2, (ch - bg.height * cs) / 2, bg.width * cs, bg.height * cs);
      cx.fillStyle = 'rgba(10,8,14,.55)'; cx.fillRect(0, 0, cw, ch);
    } else { cx.fillStyle = '#120e16'; cx.fillRect(0, 0, cw, ch); }
    cx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    withRoom(view, () => (L.yard ? drawYard : drawRoom)(drag && drag.moved ? drag.tool : null, false));
    if (M.review) drawInset();
    drawHud(); drawBelt(); drawSay();
    if (drag && drag.moved) img(TOOL_IMG[drag.tool], drag.x, drag.y, drag.tool === 'rack' ? L.rack.h * .9 : 110, 'mm', .85, 0, drag.tool === 'ledger' ? 150 : 0);
    if (stamp) drawStamp();
  }
  // The other room, live, in a small window. It glows red while that room is in trouble.
  function drawInset() {
    const other = view === 'main' ? 'review' : 'main', r = L.inset.r, src = L.inset.src, k = r[2] / src[2], al = RC[other].alarm;
    cx.save(); rrect(r[0], r[1], r[2], r[3], 12); cx.fillStyle = '#0c0a10'; cx.fill(); cx.clip();
    cx.translate(r[0] - src[0] * k, r[1] - src[1] * k); cx.scale(k, k);
    withRoom(other, () => { const bg = IMG[L.bg]; if (bg) cx.drawImage(bg, 0, 0, L.W, L.H); (L.yard ? drawYard : drawRoom)(null, true); });
    cx.restore();
    const pulse = .5 + .5 * Math.sin(performance.now() / 160);
    cx.save(); rrect(r[0], r[1], r[2], r[3], 12); cx.lineWidth = al ? 5 + pulse * 3 : 4;
    cx.strokeStyle = al ? `rgba(255,${80 + pulse * 40},60,.95)` : 'rgba(214,178,84,.95)'; cx.stroke();
    if (al) { cx.shadowColor = 'rgba(255,70,50,.9)'; cx.shadowBlur = 18 + pulse * 10; cx.stroke(); }
    cx.restore();
    plaque((other === 'review' ? 'Cellar · review' : M.yard ? 'Yard' : 'Vault') + ' · tap to switch', r[0] + r[2] / 2, r[1] - 14 * L.fs);
  }
  // One room: its backdrop, props, pieces and tickets. mini: drawn small in the other room's window.
  function drawRoom(dragging, mini) {
    const bg = IMG[L.bg];
    if (bg && !mini) cx.drawImage(bg, 0, 0, L.W, L.H);
    // The lever: glows until it's pulled.
    if (!S.started) {
      const p = .5 + .5 * Math.sin(performance.now() / 260);
      cx.save(); const g = cx.createRadialGradient(L.lever.x, L.lever.y, 10, L.lever.x, L.lever.y, L.lever.r);
      g.addColorStop(0, `rgba(255,214,102,${.35 + p * .2})`); g.addColorStop(1, 'rgba(255,214,102,0)'); cx.fillStyle = g;
      cx.beginPath(); cx.arc(L.lever.x, L.lever.y, L.lever.r, 0, Math.PI * 2); cx.fill(); cx.restore();
      text(word('lever', 'PULL'), L.lever.label[0], L.lever.label[1], 30, '#ffe08a');
    } else if (leverT && !L.lever.wheel) {
      const [px, py] = L.lever.pivot, Rr = 120;
      cx.save(); cx.globalAlpha = leverT; cx.strokeStyle = '#ffe066'; cx.lineWidth = 7; cx.beginPath(); cx.arc(px, py, Rr, -1.3, 0.45); cx.stroke(); cx.restore();
    }
    // The vault's wheel turns half a turn when the night starts. The tube is its entry.
    if (L.lever.wheel && bg && !mini && S.started && leverT > 0) { // the painted wheel turns: a round cut of the backdrop, rotated
      const { x, y, r } = L.lever; cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.clip(); cx.translate(x, y); cx.rotate((1 - leverT) * Math.PI);
      cx.drawImage(bg, -x, -y, L.W, L.H); cx.restore();
    }
    // The Night Clerk, with his four stools' worth of papers.
    shadow(L.clerk.x, L.clerk.y + 2, L.clerk.h * .9); img('clerk', L.clerk.x, L.clerk.y + 6, L.clerk.h, 'mb');
    // The puddle grows with every lost request.
    if (S.spill) img('puddle', L.puddle.x, L.puddle.y, 0, 'mm', .92, 0, 110 + S.spill * 22);
    // The tank (error budget) and its water.
    drawTank();
    // The Hot Shelf: the four cabinets on the back wall, and the on-demand dial by them.
    if (L.cabs) drawCabs(dragging);
    // The rack, or its glowing spot.
    if (S.rack) {
      shadow(L.rack.x, L.rack.y + 2, L.rack.h * .62); img('rack', L.rack.x, L.rack.y + 6, L.rack.h, 'mb');
      const n = S.queue.length; if (n > RACK_SLOTS) text('+' + (n - RACK_SLOTS), L.rack.x + L.rack.h * .42, L.rack.y - L.rack.h * .6, 26, '#ffe6a8');
      plaque(word('rack', 'Rack') + ' · SQS queue', L.rack.x, L.rack.y - L.rack.h - 16 * L.fs);
    } else if (dragging === 'rack' || (!drag && !S.started && !S.placed.length)) glowSpot(spot('rack'), dragging === 'rack');
    // Mira's desk and the six stools.
    if (!L.painted) { shadow(L.desk.x, L.desk.y + 2, L.desk.h * 1.05); img('desk', L.desk.x, L.desk.y + 8, L.desk.h, 'mb'); }
    plaque('Mira', L.desk.x, L.desk.y - L.desk.h - 4);
    if (S.ledger) {
      const d = L.desk; img('ledger', d.x - d.h * (S.stopwatch ? -.18 : .1), d.y - d.h * .78, 0, 'mm', 1, -0.05, d.h * .62);
      plaque('Ledger · DynamoDB', d.x, d.y - d.h - 30 * L.fs);
    } else if (dragging === 'ledger' || (!drag && !S.started && S.belt.includes('ledger') && !S.placed.length)) glowSpot(spot('ledger'), dragging === 'ledger');
    // The Slow Courier's pieces: the hourglass by the rack, the stopwatch on Mira's desk.
    if (S.stopwatch) {
      const d = L.desk; img('stopwatch', d.x - d.h * .38, d.y - d.h * .5, d.h * .32, 'mb');
      plaque('Stopwatch · timeout 6s', d.x - d.h * .38, d.y - d.h * .5 - d.h * .32 - 12 * L.fs);
    } else if (dragging === 'stopwatch' || (!drag && !S.started && S.belt.includes('stopwatch') && !S.placed.length)) glowSpot(spot('stopwatch'), dragging === 'stopwatch');
    if (S.hourglass) {
      const r = L.rack; img('hourglass', r.x - r.h * .56, r.y + 4, r.h * .42, 'mb');
      plaque('Visibility 9s', r.x - r.h * .62, r.y - r.h * .42 - 14 * L.fs);
    } else if (dragging === 'hourglass' || (!drag && !S.started && S.belt.includes('hourglass') && !S.placed.length)) glowSpot(spot('hourglass'), dragging === 'hourglass');
    if (S.shard) {
      const d = L.desk; img('shard', d.x - d.h * .12, d.y - d.h * .6, d.h * .42, 'mb');
      plaque('Suffix stamp · write sharding', d.x, d.y - d.h - 30 * L.fs);
    } else if (dragging === 'shard' || (!drag && !S.started && S.belt.includes('shard') && !S.placed.length)) glowSpot(spot('shard'), dragging === 'shard');
    drawStools(dragging === 'reserve');
    // The bell, or its glowing spot, and the Reports tray.
    if (S.bell) {
      const b = L.bell, wob = ringT ? Math.sin(ringT * 40) * .25 * ringT : 0;
      shadow(b.x, b.y + 2, b.h); img('bell', b.x, b.y + 4, b.h, 'mb', 1, wob);
      if (ringT) text('ding', b.x + b.h * 1.1, b.y - b.h * .7 - (1 - ringT) * 20, 22, '#ffe08a');
      plaque('Bell · SNS topic', b.x, b.y - b.h - 16 * L.fs);
    } else if (dragging === 'bell' || (!drag && !S.started && S.claim === 'bell' && !S.placed.length)) glowSpot(spot('bell'), dragging === 'bell');
    const trayN = S.tray.length;
    if (S.claim === 'picky') {
      if (S.filter) { img('filter', L.tray[0] + 52, L.tray[1] + 6, 70, 'mb'); plaque('Filter · refunds only', ...(L.filterLabel || [L.tray[0] + 40, L.tray[1] - 80 * L.fs])); }
      else if (dragging === 'filter' || (!drag && !S.started && !S.placed.length)) glowSpot(spot('filter'), dragging === 'filter');
      for (let i = 0; i < Math.min(trayN, 6); i++) {
        const k = S.tickets.find(x => x.id === S.tray[i]), p = [L.tray[0] + (i % 2) * 6, L.tray[1] - i * 7];
        // Old copies blink: about to pass the maximum event age.
        const old = k && S.time - k.trayAt > R.T.maxAge - 1.5, a = old ? .35 + .65 * Math.abs(Math.sin(performance.now() / 110)) : 1;
        img(k && k.want ? 'envRefund' : 'env', p[0], p[1], 0, 'mm', a, (i % 2 ? .08 : -.06), 46);
      }
      if (trayN > 6) text('+' + (trayN - 6), L.tray[0] + 34, L.tray[1] - 44, 22, '#cfe0ff');
      plaque('Reports', L.clerk.x, L.clerk.y - L.clerk.h - 12 * L.fs);
    }
    if (S.claim === 'bell') {
      for (let i = 0; i < Math.min(trayN, 6); i++) { const p = [L.tray[0] + (i % 2) * 6, L.tray[1] - i * 7]; img('env', p[0], p[1], 0, 'mm', 1, (i % 2 ? .08 : -.06), 46); ribbon(p, 46, 0); }
      if (trayN > 6) text('+' + (trayN - 6), L.tray[0] + 34, L.tray[1] - 44, 22, '#cfe0ff');
      plaque('Reports', L.clerk.x, L.clerk.y - L.clerk.h - 12 * L.fs);
    }
    drawExtras(dragging);
    // The bin.
    if (S.bin) { shadow(L.bin.x, L.bin.y + 2, L.bin.h * .8); img('bin', L.bin.x, L.bin.y + 4, L.bin.h, 'mb'); plaque('Bin · DLQ', L.bin.x, L.bin.y - L.bin.h - 14); if (S.binned) text(String(S.binned), L.bin.x + L.bin.h * .4, L.bin.y - L.bin.h * .55, 24, '#e5b8ff'); }
    else if (dragging === 'bin') glowSpot(spot('bin'), true);
    // Tickets.
    const waitN = S.tickets.filter(k => k.phase === 'wait').length;
    for (const k of S.tickets) {
      const d = ticketDraw(k); if (!d) continue;
      const key = d.img || (k.poison ? 'envPoison' : k.refund || k.want ? 'envRefund' : 'env'), ew = 110 * (d.s || .5);
      // Shelf life: a ticket about to expire blinks on the rack.
      const old = k.phase === 'shelf' && S.orders.has('shelf') && S.time - k.queuedAt > R.T.retain - 6;
      img(key, d.p[0], d.p[1], 0, 'mm', old ? .3 + .7 * Math.abs(Math.sin(performance.now() / 110)) : d.a, d.rot || 0, ew);
      if ((k.ribbon || (k.desk === 'reports' && !S.picky)) && !d.img) ribbon(d.p, ew, d.rot || 0, d.a);
      if (k.twin && k.phase !== 'done' && k.phase !== 'drop') text('x2', d.p[0] + 26, d.p[1] - 20, 18, '#ffb27a');
      // The busy caller's tickets wear a red band; with the suffix stamp, the number it adds.
      if (k.hot && !d.img) { ribbon(d.p, ew, d.rot || 0, d.a, '#c8473b'); if (S.shard) text('#' + (R.cabOf(S, k) + 1), d.p[0] + 24, d.p[1] - 18, 16, '#ffd0c8'); }
      // A throttled write waiting to try again: an amber arc running down, and the try it's on.
      if (d.wait != null) {
        cx.save(); cx.lineWidth = 5; cx.strokeStyle = '#ffb04a'; cx.setLineDash([6, 5]); cx.beginPath();
        cx.arc(d.p[0], d.p[1], 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - d.wait)); cx.stroke(); cx.restore();
        text('retry ' + (k.wthrottles + 1), d.p[0], d.p[1] - 44, 16, '#ffd08a');
      }
      // Heavy parcels: a brown strap both ways.
      if (k.heavy && !d.img) { ribbon(d.p, ew, (d.rot || 0), d.a, '#7a4a22'); ribbon(d.p, ew * .7, (d.rot || 0) + Math.PI / 2, d.a, '#7a4a22'); }
      // A stuck job: it isn't going anywhere.
      if (k.stuck && k.phase === 'work' && !isFinite(k.dur)) text('...', d.p[0], d.p[1] - 44, 26, '#e5b8ff');
      // Visibility: an amber arc for how long the rack keeps a taken ticket hidden.
      if (S.visibility && k.takenAt != null && k.reappearedAt !== k.takenAt && (k.phase === 'work' || k.phase === 'walk')) {
        const vis = S.hourglass ? R.T.visHourglass : R.T.vis, left = Math.max(0, 1 - (S.time - k.takenAt) / vis);
        cx.save(); cx.lineWidth = 4; cx.strokeStyle = left < .3 ? '#ff7a5a' : '#ffc95a'; cx.beginPath();
        cx.arc(d.p[0], d.p[1], 41, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); cx.stroke(); cx.restore();
      }
      if (d.ring != null) {
        cx.save(); cx.lineWidth = 6; cx.strokeStyle = k.poison ? '#d59cff' : '#8fe68f'; cx.beginPath();
        cx.arc(d.p[0], d.p[1], 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.ring); cx.stroke(); cx.restore();
      }
    }
    if (waitN) text('↺ ' + waitN, L.hatch[0] + 60, L.hatch[1] + 10, 28, '#ff9a8a');
    if (L.asks) drawAsks(dragging);
    // Splashes and floating numbers.
    cx.save(); cx.fillStyle = 'rgba(120,180,255,.85)';
    fx.forEach(f => { cx.beginPath(); cx.arc(f.x, f.y, 5 * (1 - f.t), 0, Math.PI * 2); cx.fill(); }); cx.restore();
    pops.forEach(p => { cx.save(); cx.globalAlpha = Math.min(1, 2.4 - p.t * 2); text(p.text, p.x, p.y - p.t * 50, p.size, p.col); cx.restore(); });
    if (mini) return;
    if (flashT) { cx.save(); cx.fillStyle = `rgba(255,80,60,${flashT * .35})`; cx.fillRect(0, 0, L.W, L.H); cx.restore(); }
    if (letterAnim && S === M) {
      const u = Math.min(1, letterAnim.t / 1.1), p = chutePos(ease(u)), bob = u >= 1 ? Math.sin(performance.now() / 120) * 4 : 0;
      cx.save(); cx.shadowColor = 'rgba(255,214,102,.9)'; cx.shadowBlur = 24;
      img('env', p[0], p[1] - 10 + bob, 0, 'mm', 1, u < .8 ? chuteAngle() : 0, 92); cx.restore();
      cx.save(); cx.beginPath(); cx.arc(p[0], p[1] - 10 + bob, 13, 0, Math.PI * 2); cx.fillStyle = '#d6a73a'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#5a3c0a'; cx.stroke(); cx.restore();
      text('A letter!', p[0], p[1] - 62 + bob, 26, '#ffe08a');
    }
  }
  // The Records Vault's four cabinets (the table's partitions): a letter, how many each has filed, and a heat bar for
  // how hard it's being written to against what it can take. A throttled write flashes it red.
  function drawCabs(dragging) {
    const c = L.cabs, rate = R.cabRate(S);
    if (!S.ondemand && (dragging === 'ondemand' || (!drag && !S.started && !S.placed.length))) glowSpot(spot('ondemand'), dragging === 'ondemand');
    c.at.forEach((a, i) => {
      const cab = S.cabs[i], x0 = a[0] - c.w / 2, y0 = a[1] - c.h, load = Math.min(1.5, cab.heat / (rate * 1.5)), hot = load > 1;
      cx.save();
      if (!L.painted) shadow(a[0], a[1] + 2, c.w * 1.1);
      const g = cx.createLinearGradient(x0, 0, x0 + c.w, 0); g.addColorStop(0, '#1f3a30'); g.addColorStop(.5, '#2f5646'); g.addColorStop(1, '#1a3128');
      if (L.painted) { if (hot) { rrect(x0, y0, c.w, c.h, 6); cx.lineWidth = 4; cx.strokeStyle = '#e0644f'; cx.stroke(); } }
      else rrect(x0, y0, c.w, c.h, 6), cx.fillStyle = g, cx.fill(), cx.lineWidth = 4, cx.strokeStyle = hot ? '#e0644f' : '#0d1a14', cx.stroke();
      // Without the sprite: three drawers with brass pulls.
      for (let j = 0; !L.painted && j < 3; j++) {
        const dy = y0 + 8 + j * (c.h - 16) / 3, dh = (c.h - 16) / 3 - 6;
        rrect(x0 + 7, dy, c.w - 14, dh, 4); cx.fillStyle = 'rgba(10,22,16,.45)'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = 'rgba(160,200,170,.25)'; cx.stroke();
        cx.fillStyle = '#c9a23a'; rrect(a[0] - 14, dy + dh * .62, 28, 6, 3); cx.fill();
      }
      if (cabFlash[i]) { rrect(x0, y0, c.w, c.h, 6); cx.fillStyle = `rgba(230,70,50,${cabFlash[i] * .7})`; cx.fill(); }
      // The heat bar along the bottom: green under its rate, red over it.
      const bw = c.w - 16, bx = x0 + 8, by = a[1] - 12;
      rrect(bx, by, bw, 8, 3); cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fill();
      if (load > .02) { rrect(bx, by, bw * Math.min(1, load / 1.5), 8, 3); cx.fillStyle = hot ? '#ff6a4f' : load > .7 ? '#f2c14a' : '#6fd38a'; cx.fill(); }
      cx.restore();
      const tz = L.W < L.H ? .6 : 1; // the phone's cabinets are small: smaller marks, so the painted drawers still show
      text('ABCD'[i], a[0], y0 + 22 * L.fs * tz, 24 * tz, hot ? '#ffb0a0' : '#f6e7c4');
      text(String(cab.filed), a[0], y0 + c.h * .55, 22 * tz, '#bff5b4');
    });
    const xs = c.at.map(a => a[0]), top = Math.min(...c.at.map(a => a[1])) - c.h;
    plaque(S.ondemand ? 'Cabinets · partitions · on-demand' : 'Cabinets · DynamoDB partitions', (Math.min(...xs) + Math.max(...xs)) / 2, top - 16 * L.fs);
    if (S.ondemand) img('ondemand', L.dial[0], L.dial[1], 70, 'mm');
  }
  // ---- Review questions (the cellar in claim 6) ----
  const ASKING = ['ask', 'stamped', 'leak'];
  function askList() { return S.tickets.filter(k => k.quiz && ASKING.includes(k.phase)); }
  // Where a waiting question sits on the wall; one that's leaving keeps the spot it last had.
  function askPos(k) {
    const a = L.asks; if (!a || !k) return L.asks ? [L.asks.x, L.asks.y] : L.foot;
    const i = askList().indexOf(k);
    if (i >= 0) k.rowP = [a.x + Math.min(i, a.max - 1) * a.dx, a.y];
    return k.rowP || [a.x, a.y];
  }
  function drawAsks(dragging) {
    const a = L.asks, list = askList(), now = performance.now();
    if (S.intern) { img('intern', a.intern[0], a.intern[1], 74, 'mb'); plaque('Intern', a.intern[0], a.intern[1] - 74 - 12 * L.fs); }
    else if (dragging === 'intern' || (!drag && !S.started && !S.placed.length && S.belt.includes('intern') && false)) glowSpot(spot('intern'), dragging === 'intern');
    if (list.length && a.label) plaque('Review questions · tap one', ...a.label);
    list.slice(0, a.max).forEach(k => {
      const p = askPos(k), leak = k.phase === 'leak', st = k.phase === 'stamped';
      const left = k.phase === 'ask' ? 1 - (S.time - k.askAt) / R.T.askWait : st ? 1 - (S.time - k.stampAt) / R.T.checkWindow : 0;
      const blink = leak ? .45 + .55 * Math.abs(Math.sin(now / 120)) : 1;
      img('env', p[0], p[1], 0, 'mm', blink, 0, 58);
      if (k.phase === 'ask') {
        cx.save(); cx.beginPath(); cx.arc(p[0] + 18, p[1] - 14, 12, 0, Math.PI * 2); cx.fillStyle = '#3f7fe0'; cx.fill(); cx.lineWidth = 2.5; cx.strokeStyle = '#0d1a33'; cx.stroke(); cx.restore();
        text('?', p[0] + 18, p[1] - 13, 16, '#ffffff');
      } else {
        // The intern's stamp, red and crooked.
        cx.save(); cx.translate(p[0], p[1] + 2); cx.rotate(-.22); cx.strokeStyle = leak ? '#ff5a3a' : '#c8473b'; cx.lineWidth = 2.5; rrect(-30, -10, 60, 20, 3); cx.stroke();
        cx.font = `800 ${12}px Nunito, "Segoe UI", sans-serif`; cx.fillStyle = leak ? '#ff5a3a' : '#c8473b'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('INTERN', 0, 1); cx.restore();
      }
      if (left > 0) { cx.save(); cx.lineWidth = 5; cx.strokeStyle = left < .3 ? '#ff7a5a' : st ? '#ffb04a' : '#8fc0ff'; cx.beginPath(); cx.arc(p[0], p[1], 33, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); cx.stroke(); cx.restore(); }
      if (leak) { const u = (now / 900) % 1; cx.save(); cx.fillStyle = `rgba(120,180,255,${1 - u})`; cx.beginPath(); cx.arc(p[0], p[1] + 30 + u * 40, 5, 0, Math.PI * 2); cx.fill(); cx.restore(); text('leaking', p[0], p[1] + 46, 14, '#ff9a8a'); }
      else if (st) text('check', p[0], p[1] + 46, 14, '#ffd08a');
    });
    if (list.length > a.max) text('+' + (list.length - a.max), a.x + a.max * a.dx - 10, a.y, 24, '#cfe0ff');
  }
  // The intern, drawn in code: a clipboard with a name badge.
  function drawIntern() {
    const c = document.createElement('canvas'); c.width = 120; c.height = 160; const g = c.getContext('2d');
    g.lineJoin = 'round'; g.strokeStyle = '#1e0f08'; g.lineWidth = 5;
    g.fillStyle = '#8a5a2c'; g.fillRect(14, 14, 92, 132); g.strokeRect(14, 14, 92, 132);
    g.fillStyle = '#f7f0dc'; g.fillRect(24, 30, 72, 104); g.lineWidth = 3; g.strokeRect(24, 30, 72, 104);
    g.fillStyle = '#c9a23a'; g.fillRect(40, 6, 40, 18); g.strokeRect(40, 6, 40, 18);
    g.strokeStyle = 'rgba(90,60,30,.5)'; g.lineWidth = 2; for (let y = 48; y < 100; y += 12) { g.beginPath(); g.moveTo(32, y); g.lineTo(88, y); g.stroke(); }
    g.strokeStyle = '#2a7a3e'; g.lineWidth = 4; g.beginPath(); g.moveTo(34, 52); g.lineTo(40, 58); g.lineTo(50, 44); g.stroke();
    g.strokeStyle = '#c8473b'; g.beginPath(); g.moveTo(34, 66); g.lineTo(46, 78); g.moveTo(46, 66); g.lineTo(34, 78); g.stroke();
    g.fillStyle = '#c8473b'; g.fillRect(30, 104, 60, 24); g.strokeStyle = '#1e0f08'; g.lineWidth = 3; g.strokeRect(30, 104, 60, 24);
    g.fillStyle = '#fff'; g.font = '800 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INTERN', 60, 117);
    return c;
  }
  // Every letter's id (claim.format.n), and the letter for an id.
  const LETTER_BY_ID = {};
  function idLetters() {
    const tag = (claim, set) => ['a', 'b', 'c'].forEach(f => (set[f] || []).forEach((Lt, i) => { Lt.id = Lt.id || `${claim}.${f}${i}`; Lt.claim = Lt.claim || claim; LETTER_BY_ID[Lt.id] = Lt; }));
    Object.keys(LETTERS).forEach(c => tag(c, LETTERS[c])); tag('fifo', FIFO_LETTERS); tag('eventual', EVENTUAL_LETTERS);
  }
  // The cellar's review questions: up to 12 letters from claims 1 to 5, the ones you've solved first (only those can
  // go to the intern), mixed up.
  function reviewPool() {
    const old = Object.keys(LETTER_BY_ID).filter(id => LETTER_BY_ID[id].claim !== 'hot');
    const done = new Set(R.solved(M).filter(id => LETTER_BY_ID[id] && LETTER_BY_ID[id].claim !== 'hot'));
    const pool = shuffle([...done], Math.random).concat(shuffle(old.filter(id => !done.has(id)), Math.random)).slice(0, 12);
    return shuffle(pool, Math.random);
  }
  // A review card: answer a question waiting on the wall (mode 'ask'), or check the intern's answer ('check').
  // It doesn't stop the rooms. The first option is the answer, as in the letters.
  function openReview(k, mode) {
    const Lt = LETTER_BY_ID[k.q], S2 = M.review;
    if (!Lt) { if (mode === 'ask') R.reply(S2, k.id, true); return; }
    drag = null;
    const opts = (Lt.f === 'b' ? Lt.tools.map(t => `<img src="${toolSrc(t)}" alt=""><b>${TOOL_LABEL[t]}</b><small>${R.TOOLS[t].aws}</small>`) : Lt.opts).map((html, i) => ({ i, html }));
    // The intern's pick: the answer if it got it right, otherwise one of the others (the same one each time you look).
    if (mode === 'check' && k.pick == null) k.pick = k.internRight ? 0 : 1 + Math.floor(Math.random() * (opts.length - 1));
    const shown = shuffle(opts.slice(), Math.random), from = (R.CLAIMS[Lt.claim] || { title: Lt.claim === 'fifo' ? 'First in, first out' : 'Eventually consistent' }).title;
    const head = mode === 'ask' ? `Review · from ${from}` : 'Check the intern\'s answer';
    qEl.className = 'on letter review fmt-' + Lt.f;
    qEl.innerHTML = `<div class="lt-card"><div class="lt-seal" aria-hidden="true"></div>
      <p class="lt-kind">${head}</p><div class="lt-clock" aria-hidden="true"><i></i></div>
      <p class="lt-text" id="q-h">${Lt.q}</p>
      <div class="lt-opts">${shown.map((o, n) => `<button type="button" data-i="${o.i}"${mode === 'check' ? ' disabled' : ''}${mode === 'check' && o.i === k.pick ? ' class="pick"' : ''}><kbd>${n + 1}</kbd><span>${o.html}</span>${mode === 'check' && o.i === k.pick ? '<em class="lt-intern">INTERN</em>' : ''}</button>`).join('')}</div>
      ${mode === 'check' ? '<div class="lt-verdict"><button type="button" data-v="ok">Looks right</button><button type="button" data-v="wrong">It\'s wrong</button></div>' : ''}
      <p class="lt-why"></p><button type="button" class="lt-go">Back to the floor</button></div>`;
    reviewOpen = { k, mode };
    const why = qEl.querySelector('.lt-why'), goBtn = qEl.querySelector('.lt-go');
    const reveal = () => qEl.querySelectorAll('.lt-opts button').forEach(x => { x.disabled = true; if (+x.dataset.i === 0) x.classList.add('right'); });
    const finish = (head, body) => { why.innerHTML = `<b>${head}</b> ${body || ''}`; why.classList.add('on'); goBtn.classList.add('on'); goBtn.focus(); reviewOpen.done = true; };
    if (mode === 'ask') qEl.querySelectorAll('.lt-opts button').forEach(b => b.addEventListener('click', () => {
      if (b.disabled || reviewOpen.done) return;
      const right = +b.dataset.i === 0;
      if (!R.reply(S2, k.id, right)) { reveal(); finish('Too late.', 'That one ran out before you answered.'); return; }
      reveal(); if (!right) b.classList.add('wrong'); sfx(right ? 'right' : 'wrong');
      finish(right ? 'Right. Filed.' : 'Not quite. That\'s a lost request.', Lt.why);
    }));
    qEl.querySelectorAll('.lt-verdict button').forEach(b => b.addEventListener('click', () => {
      if (reviewOpen.done) return;
      const res = R.check(S2, k.id, b.dataset.v);
      qEl.querySelectorAll('.lt-verdict button').forEach(x => { x.disabled = true; });
      reveal(); const pickB = qEl.querySelector('.lt-opts button.pick'); if (pickB && k.pick !== 0) pickB.classList.add('wrong');
      if (res === 'caught') finish('Caught it. The intern was wrong, and the ticket\'s saved.', Lt.why);
      else if (res === 'right') finish(b.dataset.v === 'ok' ? 'It was right. Filed.' : 'It was right, actually. Filed anyway.', '');
      else if (res === 'missed') { sfx('wrong'); finish('It was wrong. Now it\'s in the files, leaking.', 'Tap it on the wall again to catch it.'); }
      else finish('Already sorted.', '');
    }));
    goBtn.addEventListener('click', closeReview);
    const first = qEl.querySelector(mode === 'ask' ? '.lt-opts button' : '.lt-verdict button'); if (first) first.focus();
  }
  function closeReview() { reviewOpen = null; qEl.className = ''; qEl.innerHTML = ''; }
  // The review card's clock: the question's time (or the check window) running down. Gone: the card says so.
  function tickReview() {
    if (!reviewOpen || reviewOpen.done) return;
    const k = reviewOpen.k, bar = qEl.querySelector('.lt-clock i');
    const left = reviewOpen.mode === 'ask' ? 1 - (M.review.time - k.askAt) / R.T.askWait : k.phase === 'stamped' ? 1 - (M.review.time - k.stampAt) / R.T.checkWindow : 1;
    if (bar) bar.style.width = Math.max(0, 100 * left) + '%';
    const gone = reviewOpen.mode === 'ask' ? k.phase !== 'ask' : !['stamped', 'leak'].includes(k.phase);
    if (gone) { qEl.querySelectorAll('.lt-opts button, .lt-verdict button').forEach(x => { x.disabled = true; }); const w = qEl.querySelector('.lt-why'); w.innerHTML = '<b>Too late.</b> That one\'s gone.'; w.classList.add('on'); qEl.querySelector('.lt-go').classList.add('on'); reviewOpen.done = true; }
  }
  // The extra buys in the room: each one's prop and plaque once placed, its glowing spot while it's dragged.
  function drawExtras(dragging) {
    const d = L.desk, st = L.stools, tr = L.tray;
    for (const t of S.belt) {
      if (!R.TOOLS[t].upkeep && !R.TOOLS[t].order && !['handoff', 'ttl', 'dest', 'retries'].includes(t)) continue;
      if (!S[t]) { if (dragging === t && spot(t)) glowSpot(spot(t), true); continue; }
      if (t === 'memory') { img('memory', d.x + d.h * .42, d.y - d.h * .62, 0, 'mm', 1, -0.1, d.h * .42); plaque('Memory · more CPU', d.x, d.y + 22 * L.fs); }
      if (t === 'warm') {
        for (const i of [0]) { const g = cx.createRadialGradient(st.xs[i], st.y - st.h * .6, 4, st.xs[i], st.y - st.h * .6, st.h * .9); g.addColorStop(0, 'rgba(255,180,70,.45)'); g.addColorStop(1, 'rgba(255,180,70,0)'); cx.fillStyle = g; cx.fillRect(st.xs[i] - st.h, st.y - st.h * 1.6, st.h * 2, st.h * 2); }
        if (L.W > L.H) plaque('Warm 1 · provisioned', st.xs[0], st.y + 22 * L.fs); // on phone it rides on the stools' own label
      }
      if (t === 'partial') plaque('Partial batch replies', (st.xs[2] + st.xs[3]) / 2, st.y + 22 * L.fs);
      if (t === 'jitter') { img('jitter', L.hatch[0] + 40, L.hatch[1] + 70, 0, 'mm', 1, 0, 64); plaque('Jitter · spread retries', L.hatch[0] + 40, L.hatch[1] + 116); }
      if (t === 'handoff') { img('handoff', tr[0] + 4, tr[1] - 6, 0, 'mm', 1, 0, 70); plaque('Hand-off · async invoke', tr[0], tr[1] - 62 * L.fs); }
      if (t === 'dest') {
        img('dest', tr[0] - 76, tr[1] - 8, 0, 'mm', 1, 0, 66);
        if (S.crate.length) text(String(S.crate.length), tr[0] - 50, tr[1] - 34, 24, '#ffd666');
        plaque('Crate · on failure', tr[0] - 76, tr[1] + 40 * L.fs);
      }
      if (t === 'retries') { img('retries', tr[0] + 120, tr[1] - 30, 0, 'mm', 1, 0, 50); plaque('Retries ' + S.retryN, tr[0] + 120, tr[1] + 8 * L.fs); }
    }
    // The ledger's keys: with TTL they come and go; without it the pile (and the bill) grows.
    if (S.ledger && S.belt.includes('ttl')) {
      const bill = Math.floor(S.keys.size / R.T.perBill);
      plaque(S.ttl ? `TTL ${R.T.ttl}s · ${S.keys.size} keys` : `${S.keys.size} keys · bill ${bill}/wave`, d.x, d.y - d.h - 58 * L.fs);
    }
  }
  // A ribbon across an envelope: this one goes to Reports too.
  function ribbon(p, w, rot, a, col) {
    cx.save(); cx.globalAlpha = a == null ? 1 : a; cx.translate(p[0], p[1]); if (rot) cx.rotate(rot);
    cx.fillStyle = col || '#3f7fe0'; cx.strokeStyle = '#13294d'; cx.lineWidth = 1.5;
    cx.fillRect(-w * .5, -w * .07, w, w * .14); cx.strokeRect(-w * .5, -w * .07, w, w * .14); cx.restore();
  }
  function drawTank() {
    const t = L.tank, im = IMG.tank; if (!im) return;
    const w = im.width * t.h / im.height, x0 = t.x - w / 2, y0 = t.y - t.h / 2, px = x0 + w * .5;
    const brass = (x, y, ww, hh, across) => {
      const g = across ? cx.createLinearGradient(0, y, 0, y + hh) : cx.createLinearGradient(x, 0, x + ww, 0);
      g.addColorStop(0, '#6b4e1c'); g.addColorStop(.45, '#d8b25a'); g.addColorStop(1, '#5a3f14'); cx.fillStyle = g; cx.fillRect(x, y, ww, hh);
    };
    cx.save();
    // Its feed pipe: up from the cap into the room's pipe, the ceiling, or across to the side wall, so it's plumbed in.
    if (t.feed != null) {
      const top = y0 + t.h * .01;
      brass(px - 6, t.feed - (t.feedTo ? 6 : 0), 12, top - t.feed + 4 + (t.feedTo ? 6 : 0));
      if (t.feedTo) brass(px, t.feed - 6, t.feedTo - px, 12, true);
      cx.fillStyle = '#8a6726'; [t.feed + 4, (t.feed + top) / 2].forEach(yy => { rrect(px - 9, yy - 4, 18, 8, 3); cx.fill(); });
    }
    // Its backplate sits flat on the wall: a soft shadow just behind it.
    cx.fillStyle = 'rgba(0,0,0,.38)'; rrect(x0 + 5, y0 + t.h * .06 + 7, w, t.h * .88, w * .28); cx.fill();
    cx.restore();
    img('tank', t.x, t.y, t.h, 'mm');
    // Lost requests running in: a drop rides the pipe down into the glass.
    for (const d of drops) {
      const yy = lerp(Math.max(0, t.feed == null ? y0 - 40 : t.feed), y0 + t.h * .32, d.t / .7), xx = t.feedTo && d.t < .25 ? lerp(t.feedTo, px, d.t / .25) : px;
      cx.save(); cx.fillStyle = 'rgba(120,180,255,.95)'; cx.beginPath(); cx.arc(xx, t.feedTo && d.t < .25 ? t.feed : yy, 7, 0, Math.PI * 2); cx.fill(); cx.restore();
    }
    const lvl = Math.min(1, M.spill / M.cap);
    if (lvl) {
      const gx0 = x0 + w * .17, gx1 = x0 + w * .83, gy0 = y0 + t.h * .27, gy1 = y0 + t.h * .71, top = gy1 - (gy1 - gy0) * lvl;
      cx.save(); rrect(gx0, top, gx1 - gx0, gy1 - top, 6); cx.fillStyle = lvl > .75 ? 'rgba(230,90,80,.75)' : 'rgba(60,130,230,.72)'; cx.fill(); cx.restore();
    }
    plaque(`Error budget ${M.spill}/${M.cap}`, t.x, y0 + t.h + 16);
  }
  function drawStools(hot) {
    const seats = R.seats(S), own = R.owners(S), st = L.stools;
    if (hot && !S.reserve) glowSpot(spot('reserve'), true);
    seats.forEach((s, i) => {
      const x = st.xs[i];
      shadow(x, st.y + 2, st.h * .8);
      img(S.reserve && own[i] === 'mira' ? 'bolted' : 'stool', x, st.y + 6, st.h, 'mb', own[i] === 'clerk' ? .9 : 1);
      // Cold stools: frost on any stool that's been empty too long.
      if (S.orders.has('cold') && !(own[i] === 'clerk' && S.clerk === 'papers') && s.ticket == null && S.time - S.lastFree[i] > R.T.coldAfter) frost(x, st.y - st.h * .62, st.h * .26);
      if (own[i] === 'clerk' && S.clerk === 'papers') {
        // The Night Clerk's papers hold this stool.
        cx.save(); for (let j = 0; j < 3; j++) { cx.fillStyle = j % 2 ? '#e8dcc0' : '#f7efdc'; cx.strokeStyle = '#6b5a3a'; cx.lineWidth = 1.5; rrect(x - 18 + j * 2, st.y - st.h - 4 - j * 5, 36, 10, 2); cx.fill(); cx.stroke(); }
        cx.fillStyle = '#5a7fc0'; cx.fillRect(x - 3, st.y - st.h - 18, 6, 16); cx.restore();
      }
    });
    const mira = own.filter(o => o === 'mira').length;
    const other = S.clerk === 'reports' ? 'Reports' : 'Night Clerk';
    plaque((S.reserve ? `Mira ${mira} reserved · ${other} ${6 - mira}` : `${other} ${6 - mira} · Mira ${mira}`) + (S.warm && L.W < L.H ? ' · warm 1' : ''), (st.xs[0] + st.xs[st.xs.length - 1]) / 2, st.y - st.h - 44 - 10 * L.fs);
  }
  function frost(x, y, r) {
    cx.save(); cx.fillStyle = 'rgba(170,220,255,.28)'; cx.beginPath(); cx.arc(x, y, r * 1.25, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = 'rgba(223,243,255,.85)'; cx.lineWidth = 2.5; cx.lineCap = 'round';
    for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3, dx = Math.cos(t) * r, dy = Math.sin(t) * r; cx.beginPath(); cx.moveTo(x - dx, y - dy); cx.lineTo(x + dx, y + dy); cx.stroke(); }
    cx.restore();
  }
  // The pinned Night Orders, as small notices under the title.
  function drawOrders() {
    if (!run.orders.length) return;
    const f = 13 * L.fs; cx.save(); cx.font = `800 ${f}px Nunito, "Segoe UI", system-ui, sans-serif`; cx.textBaseline = 'middle';
    // Their own row under the wave dots (on the phone, between those and Dutch's box).
    // A long run's orders wrap to a second row before they reach Dutch's box (or the edge, on the phone).
    let x = L.title[0], y = L.title[1] + (L.coinsAt ? 90 : 92) * L.fs; const edge = L.coinsAt ? L.W - 16 : L.say.x - 10;
    for (const t of run.orders.map(o => ORDER[o].tag)) {
      const w = cx.measureText(t).width + 18;
      if (x > L.title[0] && x + w > edge) { x = L.title[0]; y += f * 2.2; }
      const x0 = x;
      rrect(x0, y - f * .8, w, f * 1.6, 6); cx.fillStyle = '#f1e2bd'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#6b4e24'; cx.stroke();
      cx.fillStyle = '#b23a2f'; cx.beginPath(); cx.arc(x0 + w / 2, y - f * .8, 4 * L.fs, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#2a1d10'; cx.textAlign = 'center'; cx.fillText(t, x0 + w / 2, y + 1);
      x = x0 + w + 8;
    }
    cx.restore();
  }
  function drawHud() {
    drawOrders();
    const maxW = (L.coinsAt ? L.coinsAt[0] - 30 : L.say.x - 10) - L.title[0];
    cx.font = `700 ${32 * L.fs}px Fredoka, "Trebuchet MS", system-ui, sans-serif`;
    const tw = cx.measureText(S.name).width, tsz = tw > maxW ? 32 * maxW / tw : 32;
    // In the second room the title says where you are.
    text(view === 'review' && M.review ? 'THE CELLAR' : S.name, L.title[0], L.title[1] + 16 * L.fs, tsz, '#fff0d2', 'left');
    for (let i = 0; i < 4; i++) {
      const x = L.title[0] + 12 * L.fs + i * 28 * L.fs, y = L.title[1] + 56 * L.fs;
      cx.save(); cx.beginPath(); cx.arc(x, y, 10 * L.fs, 0, Math.PI * 2); cx.fillStyle = i < S.wave ? '#ffd666' : 'rgba(50,44,60,.9)'; cx.fill();
      cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
    }
    img('envDone', L.handled[0] - 30 - 16 * L.fs, L.handled[1], 0, 'mm', 1, 0, (L.art === 'vault' ? 40 : 52) * L.fs);
    text(String(S.handled), L.handled[0], L.handled[1], 34, '#bff5b4', 'left');
    if (S.claim === 'bell' || S.claim === 'picky') { plaque('Reports ' + S.reports, L.reports[0] - 10, L.reports[1]); }
    if (S.started && S.close) {
      const left = Math.max(0, Math.ceil(S.close - S.time));
      text(`Shutters in ${left}s`, L.title[0] + 128 * L.fs, L.title[1] + 56 * L.fs, 18, left <= 10 ? '#ff9a8a' : '#e8dcc4', 'left');
    }
  }
  function drawBelt() {
    const [bx, by, bw, bh] = beltRect();
    cx.save(); rrect(bx, by, bw, bh, 22); cx.fillStyle = 'rgba(24,20,30,.92)'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#be9650'; cx.stroke(); cx.restore();
    TOOLS.forEach((t, i) => {
      const r = slotRect(i), use = used0(t), used = V()[t] && !use, locked = V().locked.includes(t), cost = R.costOf(V(), t), poor = !V()[t] && !locked && M.coins < cost;
      const hot = drag && drag.tool === t;
      cx.save(); rrect(r[0], r[1], r[2], r[3], 14); cx.fillStyle = used ? 'rgba(30,26,34,1)' : 'rgba(58,48,62,1)'; cx.fill();
      cx.lineWidth = hot ? 4 : 2; cx.strokeStyle = hot ? '#ffd666' : '#64566e'; cx.stroke(); cx.restore();
      if (!used) img(TOOL_IMG[t], r[0] + r[2] / 2, r[1] + r[3] / 2 - 8 * L.fs, 52 * L.fs, 'mm', locked || poor ? .4 : 1);
      // The label shrinks to fit a narrow slot.
      const label = use || (used ? 'placed' : locked ? 'next claim' : TOOL_LABEL[t]);
      cx.save(); cx.font = `700 ${14 * L.fs}px Nunito, "Segoe UI", sans-serif`; const lw = cx.measureText(label).width;
      if (lw > r[2] - 6) cx.font = `700 ${14 * L.fs * (r[2] - 6) / lw}px Nunito, "Segoe UI", sans-serif`;
      cx.textAlign = 'center'; cx.fillStyle = used ? '#8a7f92' : '#f2e6cc';
      cx.fillText(label, r[0] + r[2] / 2, r[1] + r[3] - 6); cx.restore();
      if (!S[t] && !locked) {
        cx.save(); cx.beginPath(); cx.arc(r[0] + r[2] - 10, r[1] + 10, 13 * L.fs, 0, Math.PI * 2); cx.fillStyle = '#d6b254'; cx.fill(); cx.lineWidth = 2.5; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
        text(String(cost), r[0] + r[2] - 10, r[1] + 11, 15, '#2b1a08');
      }
      if (!used && !locked) text(String(i + 1), r[0] + 12, r[1] + 12, 14, '#9d90a8');
      // Upkeep: a small red tag with what it bills each wave.
      if (R.TOOLS[t].upkeep && !locked) text(`-${R.TOOLS[t].upkeep}/wave`, r[0] + r[2] / 2, r[1] + r[3] - 24 * L.fs, 11, '#ff9a8a');
    });
    const cxp = L.coinsAt ? L.coinsAt[0] : bx + bw + 26, cyp = L.coinsAt ? L.coinsAt[1] : by + bh / 2, puls = coinPulse ? 1 + .2 * Math.sin(coinPulse * 12) : 1;
    cx.save(); cx.translate(cxp + 14, cyp); cx.scale(puls, puls); cx.beginPath(); cx.arc(0, 0, 16 * L.fs, 0, Math.PI * 2); cx.fillStyle = '#d6b254'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
    text(String(M.coins), cxp + 22 + 22 * L.fs, cyp, 30, M.coins < 0 ? '#ff7a6a' : '#ffdc78', 'left');
    // Upkeep due at the next wave, under the coins.
    const due = R.upkeep(M);
    if (due && !M.over && M.wave < 4) text(`upkeep -${due}/wave`, cxp + 2, cyp + 30 * L.fs, 14, '#ff9a8a', 'left');
  }
  function drawSay() {
    if (!saying) return;
    const s = L.say, a = Math.min(1, saying.t * 5, (saying.secs - saying.t) * 3);
    cx.save(); cx.globalAlpha = Math.max(0, a);
    const fz = 20 * Math.min(L.fs, 1.45), lh = fz * 1.35; cx.font = `700 ${fz}px Nunito, "Segoe UI", system-ui, sans-serif`;
    const pw = 76 * Math.min(L.fs, 1.4), lines = wrap(saying.text, s.w - pw - 40), h = Math.max(pw + 12, 24 + lines.length * lh);
    rrect(s.x, s.y, s.w, h, 16); cx.fillStyle = 'rgba(255,250,238,.96)'; cx.fill(); cx.lineWidth = 4; cx.strokeStyle = '#111'; cx.stroke();
    const face = IMG['dutch-' + saying.mood] || IMG['dutch-neutral'];
    if (face) { cx.save(); rrect(s.x + 8, s.y + 6, pw, pw, 10); cx.clip(); cx.fillStyle = '#efe2c4'; cx.fillRect(s.x + 8, s.y + 6, pw, pw); cx.drawImage(face, s.x + 8, s.y + 6, pw, pw); cx.restore(); }
    cx.fillStyle = '#1e160f'; cx.textBaseline = 'top';
    lines.forEach((l, i) => cx.fillText(l, s.x + pw + 24, s.y + 14 + i * lh));
    cx.restore();
  }
  function drawStamp() {
    const u = Math.min(1, stamp.t / .35), sc = lerp(2.2, 1, ease(u));
    cx.save(); cx.translate(L.W / 2, L.H * .4); cx.rotate(-0.17); cx.scale(sc, sc); cx.globalAlpha = u;
    cx.lineWidth = 10; cx.strokeStyle = stamp.col; rrect(-250, -70, 500, 140, 14); cx.stroke();
    cx.lineWidth = 4; rrect(-236, -56, 472, 112, 8); cx.stroke();
    cx.font = '700 76px Fredoka, "Trebuchet MS", sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = stamp.col; cx.fillText(stamp.text, 0, 4);
    cx.restore();
  }

  // ---- Scenario questions (they were the end-of-claim popup; now they're among the letters) ----
  const QS = {
    slow: {
      q: 'An SQS queue triggers a Lambda function whose timeout is 5 minutes. The queue\'s visibility timeout is 1 minute, and some orders are processed twice. What should you change?',
      opts: ['Raise the queue\'s visibility timeout to at least six times the function\'s timeout', 'Lower the function\'s memory so it is cheaper to run twice', 'Turn on long polling on the queue', 'Add a dead-letter queue to the function'],
      why: 'While the function is still running, the message becomes visible again after 1 minute and another invocation picks it up. AWS recommends a visibility timeout of at least six times the function\'s timeout. Long polling and a dead-letter queue don\'t stop a message reappearing mid-run.'
    },
    rack: {
      q: 'A checkout API calls a Lambda function synchronously. During flash sales, callers get 429 errors, and some orders are lost once their retries run out. Orders can be processed a few seconds late. What is the best fix?',
      opts: ['Put an SQS queue in front of the function and let Lambda poll it', 'Configure a dead-letter queue on the function', 'Raise the function\'s timeout to 15 minutes', 'Give the function more memory'],
      why: 'A queue soaks up the burst. Messages wait until a concurrent execution is free, and Lambda\'s poller takes them as fast as it can. A function\'s dead-letter queue only catches failed asynchronous invocations, and neither the timeout nor memory adds concurrency.'
    },
    reserve: {
      q: 'Two Lambda functions share one account. A nightly batch function sometimes takes most of the account\'s concurrency, and the checkout function gets throttled. What guarantees checkout always has capacity?',
      opts: ['Set reserved concurrency on the checkout function', 'Turn on provisioned concurrency for the batch function', 'Increase the checkout function\'s memory', 'Turn on X-Ray tracing for the checkout function'],
      why: 'Reserved concurrency sets aside that many concurrent executions for one function, and no other function can use them. It is also that function\'s ceiling. Provisioned concurrency keeps environments initialised to cut cold starts; it doesn\'t stop one function from using capacity another needs.'
    },
    double: {
      q: 'A payment function behind API Gateway sometimes charges a customer twice, because the client retries when a response is slow even though the first request went through. What stops the double charges?',
      opts: ['Have the client send an idempotency key, and record it in DynamoDB with a conditional write before charging, skipping any key that already exists', 'Put an SQS standard queue in front of the function', 'Set the function\'s reserved concurrency to 1', 'Raise the function\'s timeout'],
      why: 'A conditional write (attribute_not_exists on the key) succeeds only the first time, so a retried request finds its key already recorded and skips the charge. An SQS standard queue delivers at least once, so it can add duplicates rather than remove them. Running one at a time or waiting longer still lets the second request charge again.'
    },
    bell: {
      q: 'Every time an order is placed, an order function must tell a billing function and an analytics function. Today it calls both itself, one after the other, so orders slow down and fail whenever analytics is down. Which change decouples them with the least code?',
      opts: ['Publish each order to an SNS topic with both functions subscribed', 'Send each order to one SQS queue that both functions poll', 'Raise the order function\'s timeout', 'Set reserved concurrency on the order function'],
      why: 'Publishing once to an SNS topic delivers a copy to every subscriber, and SNS invokes each subscribed Lambda function asynchronously, so the order function no longer waits on either one. With one SQS queue polled by both, each message goes to only one of them. A longer timeout or reserved concurrency still leaves the order function calling both itself.'
    },
    bin: {
      q: 'A Lambda function processes messages from an SQS standard queue. One malformed message fails every time, reappears after its visibility timeout and is retried over and over. What should you configure?',
      opts: ['A redrive policy that moves a message to a dead-letter queue after a set maxReceiveCount', 'A visibility timeout of 0 seconds', 'Long polling on the queue', 'A larger batch size on the event source mapping'],
      why: 'A redrive policy on the source queue moves a message to the dead-letter queue once it has been received maxReceiveCount times without being deleted. A shorter visibility timeout only brings it back sooner, and long polling and batch size don\'t change what happens to a message that keeps failing.'
    }
  };
  const PICKY_QS = {
    q: 'An SNS topic sends every ticket to two Lambda functions. The Reports function only needs tickets whose ticket_type message attribute is "refund". Today it is invoked for every ticket and throws most away, and some refund events age out before they run. What is the best fix?',
    opts: ['Add a filter policy to the Reports subscription that matches ticket_type "refund"', 'Raise the Reports function\'s maximum age of event to 6 hours', 'Set reserved concurrency on the Reports function', 'Check ticket_type at the top of the Reports handler and return early'],
    why: 'A filter policy on Reports\' subscription makes SNS deliver only the messages that match, so Reports is invoked only for refunds. It sits on the subscription, so the other function still gets every ticket. A longer maximum event age only lets events wait longer in a queue still full of unwanted ones. Reserved concurrency caps Reports, so the backlog grows. Returning early still costs one invocation per ticket.'
  };
  const PICKY_LETTERS = {
    a: [
      { f: 'a', q: 'Reports\' subscription has the filter policy {"ticket_type": ["refund"]}, but a day later no refunds reach it. The publisher puts ticket_type inside the JSON message body and sends no message attributes. What should you change?', opts: ['Set the subscription\'s FilterPolicyScope to MessageBody', 'Turn on raw message delivery for the subscription', 'Move the filter policy from the subscription to the topic', 'Change the policy to {"ticket_type": [{"anything-but": ["refund"]}]}'], why: 'By default a filter policy is matched against message attributes. With FilterPolicyScope set to MessageBody, SNS matches it against the JSON body instead. Raw message delivery isn\'t needed for filtering, filter policies belong to subscriptions, not topics, and anything-but would let through everything except refunds.' },
      Object.assign({ f: 'a' }, PICKY_QS)
    ],
    b: [
      { f: 'b', tools: ['filter', 'rack', 'reserve', 'bin'], q: 'The bell rings Reports for every ticket, and Reports throws most of them away. Its pile of waiting events grows until the refunds it wants get too old and are dropped. Which piece makes the bell ring Reports only for refunds?', why: 'The filter card is a filter policy on Reports\' subscription. SNS checks each message against it and sends Reports only the matches. A rack would hold the flood, but Reports would still get every ticket.' },
      { f: 'b', tools: ['rack', 'filter', 'reserve', 'bin'], q: 'The filter card is on, and Reports only hears refunds now. But on busy nights the refunds come in bursts Reports can\'t keep up with, and some still age out of Lambda\'s event queue. Filing them late is fine. Which piece goes between the bell and Reports?', why: 'Subscribe an SQS queue to the topic and let Reports poll it. Messages wait on the rack instead of in Lambda\'s own event queue, which drops an event once it passes its maximum age (6 hours at most). The filter card is already doing its job; it can\'t cut refunds Reports needs.' }
    ],
    c: [
      { f: 'c', q: 'Three of these are true of SNS filter policies. Which one is false?', opts: ['A filter policy goes on the topic and applies to every subscriber', 'A subscription with no filter policy gets every message', 'By default, a filter policy is matched against message attributes', 'A change to a filter policy can take up to 15 minutes to fully take effect'], why: 'A filter policy goes on one subscription, so each subscriber can filter differently. Subscriptions without one still get everything.' },
      { f: 'c', q: 'Three of these are true of Lambda\'s asynchronous invocation settings. Which one is false?', opts: ['An event that fails every retry stays in the queue until you delete it', 'Retry attempts can be set from 0 to 2', 'Maximum age of event can be set from 60 seconds to 6 hours', 'SNS invokes a subscribed Lambda function asynchronously'], why: 'When an event fails all its retries or passes its maximum age, Lambda discards it. To keep a copy, configure a dead-letter queue or an on-failure destination.' }
    ]
  };
  const FIFO_LETTERS = {
    a: [
      { f: 'a', q: 'Each customer\'s order events must be handled in the order they were sent, but different customers can be handled at the same time. The events go on an SQS FIFO queue. What should the producer use as the message group ID?', opts: ['The customer ID', 'The same fixed value for every message', 'A new random value for every message', 'Leave it out and set the deduplication ID to the customer ID'], why: 'Order is kept within a message group, and different groups can be processed in parallel, so one group per customer fits. One fixed group puts every customer in a single line. A random group per message keeps no order. A FIFO send without a group ID fails, and reusing one deduplication ID would make that customer\'s later messages within 5 minutes count as duplicates.' },
      { f: 'a', q: 'A producer\'s SendMessage call to a FIFO queue times out, and it sends the same order again 30 seconds later. Content-based deduplication is off, and the producer makes a new random deduplication ID for every attempt. Some orders now appear twice. What fixes it?', opts: ['Send the retry with the same deduplication ID as the first attempt', 'Give the retry a new message group ID', 'Wait at least 5 minutes before retrying', 'Turn on long polling on the queue'], why: 'If a message with the same deduplication ID was sent in the last 5 minutes, SQS treats the new one as a duplicate and delivers only one copy. A new random ID looks like a new message. Waiting 5 minutes puts the retry outside the deduplication interval, so it would be added again, and a new group ID or long polling doesn\'t change deduplication.' }
    ],
    b: [],
    c: [
      { f: 'c', q: 'Three of these are true of SQS FIFO queues. Which one is false?', opts: ['Two consumers can work on messages from the same message group at the same time', 'A message sent without a message group ID fails', 'Content-based deduplication hashes the message body, not its attributes', 'A FIFO queue\'s name must end in .fifo'], why: 'Messages in one group are processed one at a time, in order. Until the received messages are deleted or become visible again, no more from that group are handed out. For parallel work, use more message groups.' }
    ]
  };
  QS.picky = PICKY_QS;
  // The Hot Shelf's letters, and Eventually consistent's (they join the pool once it's pinned). Checked against the
  // DynamoDB developer guide (docs.aws.amazon.com/amazondynamodb/latest/developerguide/...):
  //   HowItWorks.Partitions.html (the partition key's hash picks the partition; the sort key orders items within it),
  //   bp-partition-key-design.html (3,000 read units and 1,000 write units a second per partition),
  //   bp-partition-key-uniform-load.html (hot partition keys throttle; many distinct key values spread the load),
  //   bp-partition-key-sharding.html (random and calculated suffixes; reading back means querying every suffix),
  //   burst-adaptive-capacity.html (adaptive capacity is on for every table at no cost, and can isolate one hot item
  //     on its own partition, which still tops out at the partition maximum),
  //   on-demand-capacity-mode.html (on-demand scales the table; throttling still happens past the limits),
  //   Programming.Errors.html (ProvisionedThroughputExceededException; the SDKs retry it with exponential backoff),
  //   HowItWorks.ReadConsistency.html (eventually consistent is the default and costs half; ConsistentRead; global
  //     secondary indexes only support eventually consistent reads).
  QS.hot = {
    q: 'A table of match events uses match_id as its partition key. During a final, almost every write goes to one match_id, and those writes are throttled even though the table\'s total write capacity is barely used. What is the best fix?',
    opts: ['Add a suffix calculated from each event (for example, a hash of the event ID modulo 10) to that match_id, so its writes spread across partitions', 'Switch the table to on-demand capacity mode', 'Add a global secondary index with match_id as its partition key', 'Raise the SDK\'s maximum number of retries'],
    why: 'Each partition takes at most 1,000 write units a second, so one key\'s writes throttle on their partition while the rest of the table sits idle. A suffix turns one key into many, and the hash spreads them across partitions. On-demand mode scales the table, not one partition\'s ceiling. An index keyed on match_id would have the same hot key, and more retries only wait longer.'
  };
  const HOT_LETTERS = {
    a: [
      { f: 'a', q: 'How does DynamoDB decide which partition stores an item?', opts: ['It hashes the item\'s partition key value', 'It sorts items by sort key and fills partitions in order', 'It puts each new item on the partition with the most free space', 'It uses the item\'s size'], why: 'DynamoDB feeds the partition key value to an internal hash function, and the result picks the partition. The sort key only orders items that share a partition key value.' },
      { f: 'a', q: 'One item gets far more writes than any other, and adaptive capacity has moved it onto a partition of its own. At most how many write units a second can that item now get?', opts: ['1,000, the most one partition can serve', 'As many as the table\'s total provisioned write capacity', 'No limit in on-demand mode', '40,000, the default table quota'], why: 'Adaptive capacity can isolate a busy item on its own partition, but a partition still tops out at 3,000 read units and 1,000 write units a second, in either capacity mode.' },
      Object.assign({ f: 'a' }, QS.hot)
    ],
    b: [
      { f: 'b', tools: ['shard', 'ondemand', 'rack', 'reserve'], q: 'One caller sends most of tonight\'s tickets, and their key always hashes to the same cabinet. That cabinet throttles while the other three sit idle. Which piece spreads that caller\'s tickets over all four?', why: 'The suffix stamp is write sharding: a number added to the key gives one caller several keys, and the hash sends them to different partitions. The on-demand dial can\'t lift one cabinet past its ceiling.' },
      { f: 'b', tools: ['rack', 'shard', 'ondemand', 'reserve'], q: 'The suffix stamp is on, and the four cabinets keep up on average. But tickets arrive in bursts, Mira\'s two stools fill up, and callers bounce at the door. Filing a few seconds late is fine. Which piece lets them wait instead?', why: 'The rack is an SQS queue in front of the function. Tickets wait on it until a stool is free instead of being throttled at the door. The cabinets aren\'t the problem any more, so more sharding or on-demand wouldn\'t help.' }
    ],
    c: [
      { f: 'c', q: 'Three of these are true of DynamoDB partitions. Which one is false?', opts: ['On-demand capacity mode removes the per-partition throughput limit', 'One partition can serve up to 3,000 read units and 1,000 write units a second', 'An item\'s partition is chosen by hashing its partition key', 'Adaptive capacity is on for every table at no extra cost'], why: 'The per-partition maximum applies in both capacity modes. On-demand scales the table as traffic grows, so a hot key can still throttle on its partition.' },
      { f: 'c', q: 'Three of these are true of write sharding. Which one is false?', opts: ['With a random suffix, you can still read one item back with a single GetItem', 'It adds a suffix to the partition key value so writes spread over more values', 'A suffix calculated from an attribute, like an order ID, lets you rebuild the key to read an item', 'To read everything for the original key, you query every suffix and merge the results'], why: 'With a random suffix you don\'t know which one an item got, so a single GetItem can\'t find it. That\'s why a calculated suffix is easier to read back.' }
    ]
  };
  const EVENTUAL_LETTERS = {
    a: [
      { f: 'a', q: 'A function writes an item to a DynamoDB table and reads it back straight away with GetItem. Now and then the read doesn\'t show the write. What makes the read return the latest data?', opts: ['Set ConsistentRead to true on the GetItem call', 'Read it from a global secondary index instead', 'Switch the table to on-demand capacity mode', 'Use a Scan instead of GetItem'], why: 'Reads are eventually consistent by default, and may not reflect a write that only just finished. A strongly consistent read (ConsistentRead true) reflects every write that succeeded before it. Global secondary indexes only support eventually consistent reads, the capacity mode doesn\'t change consistency, and a Scan is eventually consistent by default too.' }
    ],
    b: [],
    c: [
      { f: 'c', q: 'Three of these are true of DynamoDB read consistency. Which one is false?', opts: ['A global secondary index supports strongly consistent reads', 'Reads are eventually consistent unless you ask otherwise', 'An eventually consistent read costs half as much as a strongly consistent one', 'A strongly consistent read reflects every write that succeeded before it'], why: 'Reads from a global secondary index are always eventually consistent. Strongly consistent reads work on tables and local secondary indexes.' }
    ]
  };
  // ---- Letters: the questions arrive as mail between waves (Ladi, Nov 16: not the same popup every claim) ----
  // Three formats, one of each per claim (waves 2 to 4), in a random order: a letter (pick the answer), "which piece
  // fixes it?" (answer with a belt tool) and "find the false one". The room waits while you read. Right: a coin.
  // Wrong: the next letter, even in the next claim, arrives torn, with one option missing at random. If the torn
  // strip held the answer, "None of these" (or "They're all true") is right.
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function pickLetters(claim) {
    const base = LETTERS[claim] || LETTERS.rush, pick = a => a[Math.floor(Math.random() * a.length)];
    // With FIFO pinned, its letters join the pool.
    // So do Eventually consistent's.
    let pool = base;
    for (const [o, X] of [['fifo', FIFO_LETTERS], ['eventual', EVENTUAL_LETTERS]]) if (run.orders.includes(o)) pool = { a: pool.a.concat(X.a), b: pool.b.concat(X.b), c: pool.c.concat(X.c) };
    return shuffle([pick(pool.a), pick(pool.b), pick(pool.c)], Math.random);
  }
  function openLetter(Lt) {
    letterOpen = true; drag = null;
    const fmt = Lt.f;
    const base = fmt === 'b'
      ? Lt.tools.map(t => ({ html: `<img src="${toolSrc(t)}" alt=""><b>${TOOL_LABEL[t]}</b><small>${R.TOOLS[t].aws}</small>` }))
      : Lt.opts.map(o => ({ html: o }));
    let opts = base.map((o, i) => Object.assign({ i }, o)), answer = 0, torn = null;
    if (carry.torn) {
      carry.torn = false;
      const k = Math.floor(Math.random() * opts.length); torn = opts[k]; opts = opts.filter((_, x) => x !== k);
      if (torn.i === answer) answer = -1;
      opts.push({ i: -1, none: true, html: fmt === 'c' ? 'They\'re all true' : 'None of these' });
    }
    const shown = shuffle(opts.filter(o => !o.none), Math.random).concat(opts.filter(o => o.none));
    const head = { a: 'A letter for the floor', b: 'Which piece fixes it?', c: 'Find the false one' }[fmt];
    const stakes = S.orders.has('stakes'), maxBet = Math.min(2, S.coins); let bet = 0;
    qEl.className = 'on letter fmt-' + fmt;
    qEl.innerHTML = `<div class="lt-card"><div class="lt-seal" aria-hidden="true"></div>
      <p class="lt-kind">${head}${torn ? ' <span class="lt-torn-tag">torn</span>' : ''}</p>
      ${S.orders.has('timeout') ? '<div class="lt-clock" aria-label="20 seconds to answer"><i></i></div>' : ''}
      ${stakes ? `<div class="lt-bet"><span>Your bet</span>${[0, 1, 2].map(n => `<button type="button" data-bet="${n}"${n === 0 ? ' class="on"' : ''}${n > maxBet ? ' disabled' : ''}>${n}</button>`).join('')}<small>${maxBet ? 'Right pays it back double.' : 'No coins to bet.'}</small></div>` : ''}
      <p class="lt-text" id="q-h">${Lt.q}</p>
      <div class="lt-opts">${shown.map((o, n) => `<button type="button" data-i="${o.i}"${o.none ? ' class="none"' : ''}><kbd>${n + 1}</kbd><span>${o.html}</span></button>`).join('')}</div>
      ${torn ? '<p class="lt-rip">A strip of this letter is torn off. One option is missing.</p>' : ''}
      <p class="lt-why"></p><button type="button" class="lt-go">Back to the floor</button></div>`;
    const why = qEl.querySelector('.lt-why'), goBtn = qEl.querySelector('.lt-go');
    qEl.querySelectorAll('.lt-bet button').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return; bet = +b.dataset.bet; qEl.querySelectorAll('.lt-bet button').forEach(x => x.classList.toggle('on', x === b));
    }));
    // b: the button picked, or null when the clock ran out.
    function settle(b) {
      const right = !!b && +b.dataset.i === answer;
      qEl.querySelectorAll('.lt-opts button, .lt-bet button').forEach(x => { x.disabled = true; if (x.dataset.i != null && +x.dataset.i === answer) x.classList.add('right'); });
      if (b && !right) b.classList.add('wrong');
      if (letterClock) letterClock.done = true;
      const tornNote = torn && answer === -1 ? ' The answer was on the strip that got torn off.' : '';
      const s = n => n + (n > 1 ? ' coins' : ' coin');
      const quick = right && letterClock && letterClock.left >= LETTER_SECS / 2 ? 1 : 0;
      const head = right ? (bet ? `Right. A coin, and your ${s(bet)} back double.` : 'Right. Here\'s a coin.') + (quick ? ' Quick, too: one more.' : '')
        : (b ? 'Not quite.' : 'Time\'s up.') + (bet ? ` That's ${s(bet)} gone.` : '') + ' The next letter will arrive torn.';
      why.innerHTML = `<b>${head}</b> ${Lt.why}${tornNote}`; why.classList.add('on');
      goBtn.classList.add('on'); goBtn.focus();
      sfx(right ? 'right' : 'wrong');
      if (Lt.id) R.answer(S, Lt.id, right, 'player');
      if (right) { S.coins += 1 + bet + quick; coinPulse = 1.5; S.lettersRight = (S.lettersRight || 0) + 1; } else { S.coins -= bet; carry.torn = true; S.lettersWrong = (S.lettersWrong || 0) + 1; }
    }
    qEl.querySelectorAll('.lt-opts button').forEach(b => b.addEventListener('click', () => { if (!b.disabled) settle(b); }));
    letterClock = S.orders.has('timeout') ? { left: LETTER_SECS, done: false, timeUp: () => settle(null) } : null;
    goBtn.addEventListener('click', closeLetter);
    const first = qEl.querySelector('.lt-opts button'); if (first) first.focus();
  }
  function closeLetter() { letterOpen = false; letterClock = null; qEl.className = ''; qEl.innerHTML = ''; last = 0; }
  // The end of a claim: the stamp stays on the room, with a small strip along the bottom.
  function showEnd() {
    const won = S.over === 'win';
    // Coins left over from a win carry into the next claim. Losing keeps what you started this claim with.
    if (won) run.bank = S.next ? Math.max(0, S.coins) : 0;
    // Won with a claim after it: on to that one. Lost: this claim again. Won the last: back to the start.
    const nextClaim = won ? (S.next || 'rush') : S.claim;
    const againLabel = won && S.next ? 'Next claim: ' + R.CLAIMS[S.next].title : won && S.claim !== 'rush' ? 'Play again from the Rush' : 'Try ' + R.CLAIMS[S.claim].title + ' again';
    const bits = [`${S.handled} handled`];
    if (S.claim === 'bell') bits.push(`${S.reports} reports`);
    if (S.claim === 'double') bits.push(`${S.paidTwice} paid twice`, `${S.dropped} repeats stopped`);
    if (S.claim === 'picky') bits.push(`${S.reports} refunds reported`, `${S.tossed} opened for nothing`, `${S.aged} refunds too old`);
    if (S.deduped) bits.push(`${S.deduped} duplicates dropped`);
    if (S.review) { const V2 = S.review; bits.push(`cellar: ${V2.handled} handled, ${V2.binned} binned, ${V2.lost} lost`, `review: ${V2.byYou} by you, ${V2.byIntern} by the intern, ${V2.caught} caught, ${V2.missed} missed`); }
    if (S.claim === 'hot') bits.push(`filed ${S.cabs.map((c, i) => 'ABCD'[i] + ' ' + c.filed).join(', ')}`, `${S.hotThrottles} writes throttled`, `${S.writeLost} gave up`);
    if (S.stale) bits.push(`${S.stale} stale reads`);
    if (S.yard) bits.push(...yardBits()); // claim 9
    if (S.claim === 'slow') bits.push(`${S.reappeared} reappeared`, `${S.paidTwice} paid twice`, `${S.timedOut} cut off`);
    const nl = (S.lettersRight || 0) + (S.lettersWrong || 0);
    bits.push(`${S.lost} lost`); if (nl) bits.push(`letters ${S.lettersRight || 0} of ${nl}`);
    if (S.upkeepPaid) bits.push(`${S.upkeepPaid} coin${S.upkeepPaid > 1 ? 's' : ''} of upkeep` + (S.coins < 0 ? ', debt written off' : ''));
    if (S.handed) bits.push(`${S.handed} handed off`);
    if (S.partials) bits.push(`${S.partials} partial batches`); if (S.crated) bits.push(`${S.crated} into the crate, ${S.replayed} replayed`);
    if (won && S.next && S.coins > 0) bits.push(`${S.coins} coin${S.coins > 1 ? 's' : ''} carried over`);
    if (S.colds) bits.push(`${S.colds} cold starts`); if (S.expired) bits.push(`${S.expired} expired`);
    qEl.className = 'on end';
    qEl.innerHTML = `<div class="end-strip"><div><b id="q-h">${won ? 'Claim closed.' : 'The floor flooded.'}</b><span>${bits.join(' · ')}</span></div><button type="button" class="end-go">${againLabel}</button></div>`;
    const b = qEl.querySelector('.end-go'); b.addEventListener('click', () => won ? showPick(nextClaim) : reset(SEED + Math.floor(Math.random() * 1000), nextClaim)); b.focus();
  }
  // The letters. Written for this game from the AWS docs, none copied from practice exams. The first option (or
  // first tool) is the answer; the order is shuffled when the letter opens.
  const LETTERS = {
    rush: {
      a: [
        { f: 'a', q: 'Every concurrent execution of a Lambda function is busy, and another synchronous request arrives. What does the caller get back?', opts: ['A 429 throttling error (TooManyRequestsException)', 'Nothing yet: the request waits in Lambda\'s internal queue for up to 6 hours', 'A 504 gateway timeout', 'A new execution beyond the concurrency limit'], why: 'A synchronous call that finds no free concurrency is throttled with a 429, and the caller decides whether to retry. Lambda\'s internal queue is for asynchronous invocations.' },
        { f: 'a', q: 'A function has reserved concurrency of 4, and a fifth synchronous request arrives while four are running. What happens?', opts: ['It\'s throttled', 'It borrows a slot from the account\'s unreserved pool', 'It waits until one of the four finishes', 'It runs on provisioned concurrency'], why: 'Reserved concurrency is a guarantee and a ceiling. Past it, requests are throttled, even if the account has spare concurrency.' },
        Object.assign({ f: 'a' }, QS.rack), Object.assign({ f: 'a' }, QS.reserve), Object.assign({ f: 'a' }, QS.bin)
      ],
      b: [
        { f: 'b', tools: ['rack', 'reserve', 'bin', 'bell'], q: 'Tickets arrive faster than Mira can sit, but the callers don\'t mind waiting a few seconds. Which piece lets them wait instead of bouncing?', why: 'The rack is an SQS queue. Tickets wait on it, and Lambda takes them as stools free up.' },
        { f: 'b', tools: ['reserve', 'rack', 'bin', 'bell'], q: 'Another function keeps taking the stools Mira needs. Which piece guarantees her some?', why: 'Bolted stools are reserved concurrency: set aside for one function, and nobody else can use them.' },
        { f: 'b', tools: ['bin', 'rack', 'reserve', 'bell'], q: 'One ticket fails every time and keeps coming back off the rack. Which piece takes it out of the loop?', why: 'The bin is a dead-letter queue. After maxReceiveCount failed receives, the redrive policy moves the message there.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of an SQS standard queue. Which one is false?', opts: ['A message is deleted as soon as a consumer receives it', 'The same message can be delivered more than once', 'Messages can arrive out of order', 'A received message stays hidden for the visibility timeout'], why: 'Receiving a message only hides it for the visibility timeout. The consumer has to delete it, or it comes back.' },
        { f: 'c', q: 'Three of these are true of Lambda concurrency. Which one is false?', opts: ['Provisioned concurrency raises the account\'s concurrency limit', 'Reserved concurrency guarantees capacity for one function', 'Reserved concurrency also caps that function', 'Functions without a reservation share what\'s left of the account\'s pool'], why: 'Provisioned concurrency keeps environments initialised to cut cold starts. It comes out of the account\'s concurrency; it doesn\'t add to it.' }
      ]
    },
    bell: {
      a: [
        { f: 'a', q: 'An SNS topic has a Lambda function subscribed. How does SNS invoke the function?', opts: ['Asynchronously', 'Synchronously, waiting for the function\'s response', 'By putting the message on an SQS queue it creates for you', 'The function polls the topic for new messages'], why: 'SNS invokes subscribed Lambda functions asynchronously, so the events wait in Lambda\'s own queue and failed ones are retried.' },
        Object.assign({ f: 'a' }, QS.bell)
      ],
      b: [
        { f: 'b', tools: ['bell', 'rack', 'reserve', 'bin'], q: 'Two desks each need their own copy of every order, and the order desk shouldn\'t wait on either. Which piece does that?', why: 'The bell is an SNS topic. One publish, and every subscriber gets its own copy.' },
        { f: 'b', tools: ['rack', 'bell', 'reserve', 'bin'], q: 'Reports gets its copies in bursts it can\'t keep up with, and it\'s fine to file them a little late. Which piece would you put in front of Reports?', why: 'An SQS queue subscribed to the topic holds the burst until Reports can take it. That SNS-to-SQS fan-out is a common pattern.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of SNS. Which one is false?', opts: ['A message waits in the topic until a subscriber polls for it', 'One publish reaches every subscriber', 'A filter policy can limit which messages a subscriber gets', 'An SQS queue can subscribe to a topic'], why: 'SNS pushes to its subscribers; nothing polls a topic. For messages that wait, subscribe an SQS queue to the topic.' }
      ]
    },
    double: {
      a: [
        { f: 'a', q: 'What delivery does an SQS standard queue promise?', opts: ['At least once, and not always in order', 'Exactly once, in order', 'Exactly once, in any order', 'At most once'], why: 'Standard queues deliver at least once and make a best effort at order. FIFO queues add exactly-once processing and order within a message group.' },
        Object.assign({ f: 'a' }, QS.double)
      ],
      b: [
        { f: 'b', tools: ['ledger', 'rack', 'reserve', 'bin'], q: 'Callers resend when they\'re nervous, and doing one ticket twice pays out twice. Which piece stops the double payouts?', why: 'The ledger is an idempotency record: a conditional write of the ticket\'s key that only succeeds the first time.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true about making a handler idempotent. Which one is false?', opts: ['An SQS standard queue removes duplicate messages for you', 'A conditional write fails if its condition isn\'t met', 'attribute_not_exists on the key lets only the first write succeed', 'Doing an idempotent operation twice has the same effect as doing it once'], why: 'Standard queues can deliver duplicates. Deduplication is a FIFO queue feature, and even then the handler should be safe to repeat.' }
      ]
    },
    picky: PICKY_LETTERS,
    hot: HOT_LETTERS,
    slow: {
      a: [
        { f: 'a', q: 'What is the longest timeout you can set on a Lambda function?', opts: ['15 minutes', '5 minutes', '1 hour', '30 seconds'], why: 'A Lambda function can run for up to 15 minutes (900 seconds). The default timeout is 3 seconds.' },
        Object.assign({ f: 'a' }, QS.slow)
      ],
      b: [
        { f: 'b', tools: ['hourglass', 'stopwatch', 'bin', 'reserve'], q: 'Heavy parcels keep coming back on the rack while Mira\'s still working on them, and they get done twice. Which piece stops that?', why: 'The hourglass is the visibility timeout: how long a received message stays hidden. Make it longer than the longest job.' },
        { f: 'b', tools: ['stopwatch', 'hourglass', 'bin', 'reserve'], q: 'One ticket never finishes and holds a stool all night. Which piece cuts it off so it can fail and move on?', why: 'The stopwatch is the function timeout. Past it, the invocation fails, and the message goes back to the queue (and to the dead-letter queue once it runs out of receives).' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of an SQS queue\'s visibility timeout. Which one is false?', opts: ['When the visibility timeout ends, the message is deleted', 'The default is 30 seconds', 'It can be up to 12 hours', 'A consumer can extend it for one message with ChangeMessageVisibility'], why: 'When the visibility timeout ends, the message becomes visible again for another consumer. Only the consumer deleting it removes it from the queue.' },
        { f: 'c', q: 'Three of these are true of Lambda reading from SQS in batches. Which one is false?', opts: ['If one message in a batch fails, Lambda only retries that one, whatever you return', 'Batch size sets how many messages one invocation can receive', 'Reporting batch item failures lets the successful messages be deleted', 'The function\'s timeout covers the whole batch'], why: 'By default, a failed batch goes back as a whole. To retry only the failed messages, turn on ReportBatchItemFailures and return the failed message IDs.' }
      ]
    }
  };
  // Letters for the extra buys, written for this game from the AWS docs (sources in js/rush-core.js's header). They
  // join each claim's pools, so a claim's three letters can be about its new buys too.
  const EXTRA_LETTERS = {
    rush: {
      a: [
        { f: 'a', q: 'A Lambda function that resizes images is CPU-bound and runs slowly. Which change gives it more CPU?', opts: ['Raise its memory setting', 'Raise its timeout', 'Set reserved concurrency on it', 'Move it to a larger Region'], why: 'Lambda allocates CPU power in proportion to the memory you configure, from 128 MB up to 10,240 MB. Timeout and reserved concurrency don\'t change how fast one invocation runs.' },
        { f: 'a', q: 'A web API on Lambda is slow for the first requests after quiet periods because new execution environments are starting. Which setting keeps environments initialized before requests arrive?', opts: ['Provisioned concurrency on an alias or version', 'Reserved concurrency on the function', 'A longer function timeout', 'A larger batch size'], why: 'Provisioned concurrency pre-initializes execution environments, so they answer without a cold start. It is billed while configured, even when idle. Reserved concurrency only guarantees and caps capacity.' }
      ],
      b: [
        { f: 'b', tools: ['memory', 'reserve', 'rack', 'bin'], q: 'Mira has her stools and nobody else takes them, but every job is slow because her function is short of CPU. Which piece makes each job quicker?', why: 'Memory: Lambda hands out CPU in proportion to memory, so more memory means faster jobs. You pay for it all the same, busy or not.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of retrying throttled calls to AWS. Which one is false?', opts: ['Retrying straight away with no wait is the best way to clear a throttle', 'The SDKs\' standard retry mode uses exponential backoff with jitter', 'Jitter spreads out retries from many clients so they don\'t land together', 'You can change the maximum number of attempts the SDK makes'], why: 'Retrying with no wait adds load to a service that is already throttling. Backoff waits longer each time, and jitter randomizes the wait so clients don\'t retry in step.' }
      ]
    },
    bell: {
      a: [
        { f: 'a', q: 'An order function must pass each order to a reporting function and shouldn\'t wait for it to finish. Without adding another service, how should it call the reporting function?', opts: ['Invoke it with the Event invocation type (asynchronous)', 'Invoke it with the RequestResponse invocation type', 'Invoke it with the DryRun invocation type', 'Put both functions behind the same API Gateway stage'], why: 'With the Event invocation type, Lambda queues the event and returns straight away, then runs the function and retries errors itself. RequestResponse waits for the result, and DryRun only checks that the call would be allowed.' }
      ],
      b: [
        { f: 'b', tools: ['handoff', 'reserve', 'rack', 'bin'], q: 'There\'s no bell tonight. Mira copies ribboned tickets out for Reports herself, and her stool is tied up twice as long. Which piece lets her pass them on without waiting?', why: 'The hand-off is an asynchronous invoke: Lambda queues the event for Reports and answers Mira at once. The bell does better still, because Mira doesn\'t need to know Reports exists.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of invoking a Lambda function asynchronously. Which one is false?', opts: ['The caller gets the function\'s return value in the response', 'Lambda puts the event in a queue before the function runs', 'By default Lambda retries a function error twice', 'An on-failure destination can receive events that fail every attempt'], why: 'An asynchronous invoke returns as soon as the event is queued, so the caller never sees the result. To capture results, use destinations.' }
      ]
    },
    double: {
      a: [
        { f: 'a', q: 'A DynamoDB table of idempotency keys keeps growing, because every key is kept forever. Keys are only needed for 24 hours. What is the simplest fix?', opts: ['Store an expiry time (epoch seconds) in each item and turn on TTL for that attribute', 'Run a scheduled Scan that deletes old items', 'Switch the table to provisioned capacity', 'Add a global secondary index on the key'], why: 'TTL deletes expired items for you, without using write throughput, usually within a few days of expiry. A scheduled Scan works, but you pay for the reads and the deletes.' }
      ],
      b: [
        { f: 'b', tools: ['ttl', 'ledger', 'rack', 'bin'], q: 'The ledger stops the double payouts, but it keeps every key it has ever seen, and its storage bill grows every wave. Which piece clears out the old keys for free?', why: 'TTL: each key carries an expiry, and DynamoDB deletes expired items without charging write throughput. Make the TTL longer than any retry, or a late repeat gets through.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of an idempotency check in DynamoDB. Which one is false?', opts: ['Reading the key with GetItem, then writing it with PutItem if it\'s missing, is safe when two copies arrive at once', 'A PutItem with attribute_not_exists on the key fails if the key is already there', 'A conditional write checks and writes in a single operation', 'A request and its retries should carry the same idempotency key'], why: 'Between the read and the write, a second copy can read the same "missing" key, and both go ahead. A conditional write does the check and the write in one step, so only one can succeed.' }
      ]
    },
    slow: {
      a: [
        { f: 'a', q: 'A Lambda function reads batches of 10 messages from an SQS queue. When one message fails, all 10 come back and the other 9 are processed again. What should you configure?', opts: ['ReportBatchItemFailures on the event source mapping, returning the failed message IDs', 'A larger batch size', 'A shorter visibility timeout', 'A dead-letter queue on the function'], why: 'With ReportBatchItemFailures turned on, the function returns the IDs of the failed messages in batchItemFailures, and only those become visible again. A function\'s dead-letter queue is for asynchronous invocations, not SQS batches.' }
      ],
      b: [
        { f: 'b', tools: ['ledger', 'hourglass', 'stopwatch', 'bin'], q: 'The hourglass is up and the stopwatch too, but the rack still hands out the odd parcel twice (it delivers at least once), and those get paid twice. Which piece makes doing one twice harmless?', why: 'The ledger: an idempotency record written with a conditional write, so a duplicate is spotted and dropped. With an SQS event source, AWS recommends making the function idempotent.' }
      ],
      c: []
    },
    picky: {
      a: [
        { f: 'a', q: 'An SNS topic invokes a Lambda function. For each event that fails every attempt, the team wants a record sent to an EventBridge event bus, including details of the function\'s response. What should they configure?', opts: ['An on-failure destination on the function\'s asynchronous invocation', 'A dead-letter queue on the function', 'A redrive policy on the SNS subscription', 'Reserved concurrency on the function'], why: 'On-failure destinations can be an SQS queue, an SNS topic, an S3 bucket, a Lambda function or an EventBridge bus, and the record includes the response. A function\'s dead-letter queue takes only SQS or SNS and gets the event without the response. A subscription\'s redrive policy only catches messages SNS couldn\'t deliver.' }
      ],
      b: [
        { f: 'b', tools: ['retries', 'dest', 'filter', 'rack'], q: 'A few refunds are malformed and fail every time. Reports tries each one three times, and its stools are busy with them while good refunds wait. Which piece cuts down the wasted tries?', why: 'The retry dial: retry attempts for asynchronous invocation go from 2 (the default) down to 0. Fewer retries means a failure is given up sooner, so add a destination to keep a record of it.' }
      ],
      c: [
        { f: 'c', q: 'Three of these are true of a Lambda function\'s on-failure destination for asynchronous invocation. Which one is false?', opts: ['It can be an SQS FIFO queue', 'It also receives events that pass the maximum event age', 'It can be an EventBridge event bus', 'The record it receives includes details of the function\'s response'], why: 'A FIFO queue or FIFO topic isn\'t supported as a destination; Lambda reports those as delivery failures. Use a standard queue or topic.' }
      ]
    }
  };
  for (const c of Object.keys(EXTRA_LETTERS)) for (const f of ['a', 'b', 'c']) LETTERS[c][f] = LETTERS[c][f].concat(EXTRA_LETTERS[c][f]);
  // ==== Claim 9 (the New Sorter): the freight yard ====
  // The rules are in js/rush-yard.js (SD.rushYard). This block draws the yard, takes the player's hands there, and runs
  // its cards: the blueprint before the whistle, the manifest slip and the hotfix choice (non-pausing, docked in
  // #ycard), and the weighbridge inspection cards between waves (spot the line in real config; the yard waits).
  const YD = SD.rushYard;
  const YLINES = {
    intro: 'Opening day. The new sorter comes in crates on the goods train, one a wave. The mail doesn\'t stop while we change over.',
    intro2: 'Tick the blueprint and sam deploy builds the yard as one stack. Then pull the whistle chain.',
    built: 'Built, all in one go. That\'s a stack. Pull the whistle when you\'re ready.',
    rack: 'The waiting platform. Waybills wait here for a free bay, and a failed one comes back for another go. A queue.',
    bin: 'The returns wagon. Three failures off the platform and a waybill goes in here. Each one counts in the tank.',
    ledger: 'The ledger. Callers send the same waybill twice when they\'re nervous. The ledger spots the repeat and drops it.',
    board: 'A timetable. The yard shifts the mail to the new sorter by itself: a tenth first, then the lot. Tap the board to change it.',
    wire: 'The signal\'s wired to the switchover. It goes red while a crate goes live, and the yard puts the old sorter back. Watch what it watches.',
    tests: 'A test track. The new sorter does a test waybill before anyone\'s mail touches it, and two after. Tests only know what they test.',
    manifest: 'The manifest. Every crate shows what it\'ll change before it changes it. Look for the word Replacement.',
    amend: 'A change to the blueprint goes out as a small stack update. Two seconds.',
    train: 'Here\'s the train. A new crate, a new version. We don\'t know what\'s in it till it runs.',
    sealed: 'Sealed. Nobody opens a sealed one. If it\'s wrong, the next crate fixes it.',
    split: 'Ten percent\'s a rough guess at this hour. Fewer callers, wilder split.',
    scale: 'Minutes on the board, seconds in the yard. It\'s opening day; nobody\'s got all morning.',
    hand: 'No timetable, so the dial\'s yours. Tap it to send the new sorter another tenth. That\'s a manual update-alias.',
    rollback: 'Back to the old one. One pull. The alias is just a pointer.',
    alarm: 'Red signal, so the switchover stopped and the old sorter\'s back. A rollback is a new deployment, see the number.',
    alarmLive: 'Rolled back a good one. The signal\'s watching every sorter, and that poison waybill fails on all of them. Have it watch the new one.',
    hook: 'The test caught it before any real mail did. Stopped, rolled back.',
    hookOk: 'Test passed. The hook told CodeDeploy so itself: PutLifecycleEventHookExecutionStatus, Succeeded. Say nothing and it fails after an hour.',
    snag: 'Crate didn\'t fit, so the whole yard put itself back how it was. That\'s a stack rollback. Nothing lost, nothing gained.',
    paper: 'Looked fine on paper. The paper doesn\'t promise.',
    replace: 'That platform\'s new. The old one went, and everything on it went too. It said Replacement: True.',
    noWindow: 'All at once, and it\'s already over. Nothing left for the signal to stop. That one\'s yours to pull.',
    hotfix: 'Hotfix! New refund forms, the blue-cornered ones, and nothing we\'ve got can read them. The points take one rollout at a time.',
    hotfixFree: 'Hotfix! New refund forms, the blue-cornered ones, and nothing we\'ve got can read them. The points are free: send it.',
    counter: 'New forms come over the counter. The caller stands there waiting, so an error goes straight back to them. No platform, no second go.',
    busy: 'One at a time. The switchover\'s got one crew, and it\'s busy. Wait for it, or stop it.',
    forced: 'Quick, I\'ll give you that. But the deployment ended the moment it started, so the signal isn\'t watching it. If it\'s bad, that lever\'s yours.',
    innocent: 'The signal stopped that one. It wasn\'t its fault, the forms broke everything. Alarms count errors, not reasons.',
    followUp: 'A hotfix for the hotfix. Rushed jobs, eh.',
    wireDark: 'No coin for the signal\'s bill, so it\'s gone dark. It\'ll come back on when there\'s a coin at the start of a wave.',
    testsSkipped: 'No coin for the test track, so that crate goes out untested.',
    upkeep: 'The signal bills a coin a wave. CloudWatch alarms cost while they exist.',
    poison: 'That one\'s poison. It fails on every sorter, old and new.',
    bent: 'Refunds failing on the new sorter, the gold ones. The old one does them fine.',
    cracked: 'Everything that sorter touches fails. Cracked.',
    ship: 'Fully live by the end of its wave. That\'s a ship coin.',
    expressFail: 'Half-built. Express doesn\'t roll back, so whatever broke stays broken. Retry it or put it back.',
    depot: 'The parcel depot took the new version too. Watch what it did to the benches.',
    sentBack: 'Sent back. No new version, no risk, no coin.',
    held: 'The crate\'s at the office. Read the slip, then say when.',
    inspect: 'The weighbridge inspector. Read it like it\'s yours, because it is.'
  };
  Object.assign(ORDER, {
    depot: { name: 'The parcel depot', tag: 'Depot', aws: 'Elastic Beanstalk deployment policies', only: 'sorter',
      rule: 'Every crate also goes onto the parcel depot\'s four benches, with the policy you pick on the blueprint. A bad crate on unprotected benches loses parcels.',
      up: 'Each wave the depot finishes with no bounces and no losses pays a coin.',
      dutch: 'Parcels are on the old machines, the ones you rent by the hour. Beanstalk, they call it. Same new version, different ways to put it on. All at once is cheap and blind: the benches go down together. Rolling does a couple at a time. Rolling with an extra batch rents a bench first so nothing drops. Immutable puts up a whole fresh set and bins it if it\'s bad. Traffic splitting sends a slice to a fresh set first. The safe ones cost a bench or two for an hour.' },
    express: { name: 'Express mode', tag: 'Express', aws: 'CloudFormation express mode, rollback off', only: 'sorter',
      rule: 'A crate unpacks in half a second instead of two. But a failed stack update doesn\'t roll back: the piece it broke stays broken until you Retry (a coin) or Roll back (free, 3 seconds).',
      up: 'Faster crates: good versions go live sooner.',
      dutch: 'Express. Bolts it all down as fast as it can and doesn\'t look back. Which means if something breaks halfway, it stays broken until somebody says retry or put it back. That\'s what you get when rollback\'s off.' }
  });
  Object.assign(TOOL_IMG, { board: 'y-i-board', wire: 'y-i-wire', tests: 'y-i-tests', manifest: 'y-i-manifest' });
  // The belt's words: the long names on the wide yard, short ones on the phone (its seven slots are narrow).
  for (const [t, wide, tall] of [['board', 'Timetable', 'Board'], ['wire', 'Alarm wire', 'Alarm'], ['tests', 'Test track', 'Tests'], ['manifest', 'Manifest', 'Papers']])
    Object.defineProperty(TOOL_LABEL, t, { get: () => L.W > L.H ? wide : tall, enumerable: true, configurable: true });
  const CFG_WORD = { canary: 'Canary', linear: 'Linear', all: 'All at once' };
  Object.assign(USE_LABEL, {
    board: () => V().yard ? (L.W > L.H ? CFG_WORD[V().cfg] + ' ▸' : { canary: 'Canary', linear: 'Linear', all: 'At once' }[V().cfg]) : '',
    wire: () => V().yard ? (V().wireOn ? (L.W > L.H ? 'Watch: ' : 'On ') + (V().watch === 'new' ? 'new' : 'LIVE') : (L.W > L.H ? 'Dark (no coin)' : 'No coin')) : '',
    tests: () => V().yard ? 'Tests ' + (V().testsOn ? (L.W > L.H ? 'on' : '✓') : (L.W > L.H ? 'off' : '✗')) : ''
  });
  // The letters for claim 9 (design section 11), the alarm buy renamed to the alarm wire.
  QS.sorter = {
    q: 'A team uses SAM. On every code change they want 10% of traffic to go to the new version for five minutes, then all of it, rolling back automatically if errors appear, with as little custom code as possible. What should they add to the function?',
    opts: ['AutoPublishAlias plus DeploymentPreference with Type: Canary10Percent5Minutes and an error alarm under Alarms', 'A Step Functions workflow that calls UpdateAlias every minute', 'Route 53 weighted records pointing at two function URLs', 'Type: Linear10PercentEvery1Minute with no alarms'],
    why: 'SAM creates the CodeDeploy application and deployment group for you. The canary type shifts 10% and then the remaining 90% five minutes later, and the listed alarms roll it back. The others need custom code, or give no automatic rollback.'
  };
  LETTERS.sorter = {
    a: [
      { f: 'a', q: 'A SAM function uses AutoPublishAlias: live and DeploymentPreference Type AllAtOnce, with an alarm on the new version\'s errors. A release that fails only on refunds goes out, and the alarm fires two minutes later, but nothing rolls back. Why?', opts: ['With all at once, the deployment had already finished; the alarm only stops a deployment while it is running', 'Alarms only work with Linear deployments', 'The alias can\'t point to a version that has errors', 'The alarm needed to watch $LATEST'], why: 'CodeDeploy watches the alarms while a deployment is in progress. All at once shifts everything at the start and ends, so a fault that appears later has no deployment to stop. A canary or linear shift (or a post-traffic hook) keeps the deployment open while only part of the traffic sees the new version.' },
      { f: 'a', q: 'A team is adding gradual deployments to a SAM function that has never been deployed. CodeDeploy needs an earlier version to shift traffic from. How should they do the first deployment?', opts: ['Deploy once with AutoPublishAlias only, then add DeploymentPreference and deploy again', 'Point the alias at $LATEST first', 'Use Linear instead of Canary for the first deploy', 'Add a PostTraffic hook'], why: 'CodeDeploy needs an earlier version to shift traffic from, so the first gradual deployment is done in two steps: publish a version and create the alias, then deploy gradually.' },
      Object.assign({ f: 'a' }, QS.sorter),
      { f: 'a', q: 'A canary deployment of a Lambda function is three minutes into its 10-minute window when a critical bug is found in production. A fixed build is ready, and the team runs sam deploy for it. What\'s the quickest safe way to get the fix out?', opts: ['The deployment group allows one deployment at a time: stop the current deployment with rollback (or cancel the stack update), then deploy the fix', 'Nothing: CodeDeploy starts a second deployment and splits traffic three ways', 'Nothing: CodeDeploy queues the new deployment and starts it when the canary ends', 'The new deployment replaces the running one and inherits its traffic weights'], why: 'CodeDeploy allows one concurrent deployment per deployment group, and a weighted alias can point to only two versions. Stopping with rollback returns traffic to the current version, and then the fix can go out, with a canary if there\'s time or with AllAtOnce if there isn\'t (which gives up the alarm window).' }
    ],
    b: [
      { f: 'b', tools: ['wire', 'board', 'tests', 'manifest'], q: 'The canary sends a bad crate one waybill in ten, it fails, and nobody\'s in the yard to pull the red lever. Which piece rolls it back by itself?', why: 'The alarm wire is a CloudWatch alarm on the deployment. When it goes off during a deployment, CodeDeploy stops it and rolls back.' },
      { f: 'b', tools: ['tests', 'wire', 'board', 'manifest'], q: 'A hotfix has to go out all at once, right now, in the middle of a rush. With all at once, the signal has no time to watch it. Which piece still checks it before any waybill touches it?', why: 'The test track is the pre-traffic hook. It runs before traffic shifts in every deployment, whatever the timetable says. The alarm only acts while a deployment is still shifting.' },
      { f: 'b', tools: ['manifest', 'wire', 'board', 'tests'], q: 'The next crate quietly rebuilds the waiting platform, and everything on it goes with the old one. Which piece would have shown you that before it happened?', why: 'The weighbridge office is a change set. It lists each change and whether it means Replacement: True, a new resource with the old one deleted.' }
    ],
    c: [
      { f: 'c', q: 'Three of these are true of Lambda aliases. Which one is false?', opts: ['A weighted alias can split traffic between up to three versions', 'An alias is a pointer to a version that you can update', 'Each weighted invocation is routed by chance, so a small share can be uneven at low traffic', 'A synchronous response says which version ran in the x-amz-executed-version header'], why: 'An alias can point to at most two versions: the one it points to, and one more that gets an additional weight.' },
      { f: 'c', q: 'Three of these are true of Lambda versions. Which one is false?', opts: ['You can update a published version\'s code if the update comes from CodeDeploy', 'Lambda never reuses a version number, even after the function is deleted and recreated', 'A qualified ARN ends with the version number', '$LATEST is the unpublished version you can still edit'], why: 'A published version\'s code and most of its settings can\'t be changed by anyone. You publish a new version from $LATEST.' }
    ]
  };
  // ---- State for the yard's screen ----
  let yUI = {};
  const ycardEl = (() => { const d = document.createElement('div'); d.id = 'ycard'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-live', 'polite'); document.body.appendChild(d); return d; })();
  function yardFresh() { return { slip: false, choice: false, express: false, boardFlash: 0, boardMsg: '', whistle: 0, cards: [], cardQ: [], cardN: 0, trainOut: 0, lamp: [0, 0, 0, 0], lampCol: ['', '', '', ''], drag: null, depotFlash: 0, dialT: 0 }; }
  function yardReset() {
    yUI = yardFresh(); ycard('');
    say('intro', 'neutral', YLINES.intro, 8); say('intro2', 'neutral', YLINES.intro2, 6);
    if (qs.has('fresh')) YD.setCrates(S, ['good', S.y.crates[2].kind]);
    // Three inspection cards a claim, between waves.
    yUI.cards = shuffle(YD.CARDS.slice(), Math.random).slice(0, 3);
    if (S.review) S.review.qpool = yardPool();
    showBlueprint();
  }
  // The cellar's questions in the finale: from every claim so far, the ones you got wrong first, then the ones you've
  // solved (the intern can take those), then the rest.
  function yardPool() {
    const all = Object.keys(LETTER_BY_ID).filter(id => !['fifo', 'eventual'].includes(LETTER_BY_ID[id].claim) || run.orders.includes(LETTER_BY_ID[id].claim));
    const book = M.book, missed = all.filter(id => { const r = book.get(id); return r && r.wrong > 0; }), solved = all.filter(id => { const r = book.get(id); return r && r.solved && !missed.includes(id); });
    const rest = all.filter(id => !missed.includes(id) && !solved.includes(id));
    return shuffle(shuffle(missed, Math.random).slice(0, 6).concat(shuffle(solved, Math.random), shuffle(rest, Math.random)).slice(0, 12), Math.random);
  }
  // ---- The blueprint: template.yaml before the whistle ----
  const BP = [
    ['rack', 'Waiting platform', 'SQS queue · claim 1'], ['bin', 'Returns wagon', 'Dead-letter queue · claim 1'], ['ledger', 'Ledger', 'DynamoDB idempotency · claim 3'],
    ['board', 'Timetable', 'DeploymentPreference.Type'], ['wire', 'Alarm wire', 'DeploymentPreference.Alarms · 1 coin a wave'],
    ['tests', 'Test track', 'Hooks: PreTraffic, PostTraffic · 1 coin a crate'], ['manifest', 'Manifest', 'Change sets: sam deploy --confirm-changeset']
  ];
  function bpYaml(t) {
    const L2 = ['Transform: AWS::Serverless-2016-10-31', 'Resources:', '  Sorter:', '    Type: AWS::Serverless::Function', '    Properties:', '      AutoPublishAlias: live'];
    if (t.board) { L2.push('      DeploymentPreference:', '        Type: Canary10Percent5Minutes'); if (t.wire) L2.push('        Alarms: [!Ref NewVersionErrors]'); if (t.tests) L2.push('        Hooks:', '          PreTraffic: !Ref PreTrafficTest', '          PostTraffic: !Ref PostTrafficTest'); }
    if (t.rack) { L2.push('  WaitingPlatform:', '    Type: AWS::SQS::Queue'); if (t.bin) L2.push('    Properties:', '      RedrivePolicy:', '        deadLetterTargetArn: !GetAtt Returns.Arn', '        maxReceiveCount: 3', '  Returns:', '    Type: AWS::SQS::Queue'); }
    if (t.ledger) L2.push('  Ledger:', '    Type: AWS::DynamoDB::Table');
    return L2.join('\n');
  }
  function showBlueprint() {
    const t = {}, coins = () => M.coins - BP.reduce((n, [k]) => n + (t[k] ? R.costOf(M, k) : 0), 0);
    let policy = 'all';
    qEl.className = 'on orders blueprint';
    const depot = M.orders.has('depot');
    qEl.innerHTML = `<div class="no-board bp-sheet"><p class="no-kind">Opening day · the blueprint</p><h2 id="q-h">template.yaml</h2>
      <p class="bp-help">Tick what the yard is built with. <b>sam deploy</b> builds the lot as one stack. You can add a line later, as a two-second stack update.</p>
      <div class="bp-lines">${BP.map(([k, name, aws]) => `<button type="button" class="bp-line" data-t="${k}" aria-pressed="false"><i class="bp-box" aria-hidden="true"></i><span><b>${name}</b><small>${aws}</small></span><em class="bp-cost">${R.costOf(M, k)}</em></button>`).join('')}</div>
      ${depot ? `<div class="bp-depot"><b>Parcel depot policy</b><div>${Object.keys(YD.DEPOT).map(p => `<button type="button" data-p="${p}"${p === 'all' ? ' class="on"' : ''}>${{ all: 'All at once', rolling: 'Rolling', additional: 'Rolling + batch', immutable: 'Immutable', split: 'Traffic splitting' }[p]}${YD.DEPOT[p] ? ' · 1/crate' : ''}</button>`).join('')}</div></div>` : ''}
      <details class="bp-yaml-d"><summary>Show template.yaml</summary><pre class="bp-yaml"></pre></details>
      <p class="bp-coins"></p><button type="button" class="no-go bp-go">$ sam deploy</button></div>`;
    const sync = () => {
      qEl.querySelectorAll('.bp-line').forEach(b => {
        const k = b.dataset.t, need = R.TOOLS[k].needs, blocked = need && !t[need];
        b.setAttribute('aria-pressed', t[k] ? 'true' : 'false'); b.classList.toggle('on', !!t[k]);
        b.disabled = !t[k] && (blocked || coins() < R.costOf(M, k));
        b.querySelector('small').textContent = blocked && !t[k] ? 'Needs the timetable first' : BP.find(x => x[0] === k)[2];
      });
      qEl.querySelector('.bp-yaml').textContent = bpYaml(t);
      qEl.querySelector('.bp-coins').textContent = `Coins ${M.coins} · left after sam deploy: ${coins()}`;
      qEl.querySelector('.bp-go').textContent = t.manifest ? '$ sam deploy --confirm-changeset' : '$ sam deploy';
    };
    qEl.querySelectorAll('.bp-line').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.t; t[k] = !t[k];
      if (k === 'board' && !t.board) { t.wire = false; t.tests = false; }
      sync();
    }));
    qEl.querySelectorAll('.bp-depot button').forEach(b => b.addEventListener('click', () => { policy = b.dataset.p; qEl.querySelectorAll('.bp-depot button').forEach(x => x.classList.toggle('on', x === b)); }));
    qEl.querySelector('.bp-go').addEventListener('click', () => {
      if (depot) YD.setDepot(M, policy);
      const order = BP.map(x => x[0]).filter(k => t[k]);
      YD.blueprint(M, order);
      qEl.className = ''; qEl.innerHTML = '';
    });
    sync(); qEl.querySelector('.bp-line').focus();
  }
  // ---- The docked card (#ycard): the manifest slip, the hotfix choice, express mode's half-built yard ----
  function ycard(html, kind) {
    ycardEl.className = html ? 'on ' + (kind || '') : ''; ycardEl.innerHTML = html || '';
    yUI.cardKind = html ? kind : '';
  }
  // Closing one card leaves another alone: the half-built yard outranks the hotfix card, which outranks the slip.
  function yclear(kind) { if (yUI.cardKind === kind) ycard(''); }
  function showSlip() {
    const H = S.y.held; if (!H || yUI.choice) return;
    const c = H.crate, rows = YD.slip(c), next = S.versions.length;
    yUI.slip = true;
    ycard(`<p class="yc-h">Change set · crate ${c.slot} · version ${next} if it runs</p>
      <div class="yc-rows">${rows.map((r, i) => `<button type="button" class="yc-row${r.rep === 'True' ? ' rep' : ''}" data-i="${i}"><span>${r.act}</span><code>${r.id}</code><em>${r.rep ? 'Replacement: ' + r.rep : 'new'}</em></button>`).join('')}</div>
      <p class="yc-note">Tap a line to read it. A change set shows what will change. It doesn't promise it'll work.</p>
      <div class="yc-btns"><button type="button" data-x="now">Execute now</button><button type="button" data-x="empty">Execute when the platform's empty</button><button type="button" data-x="back">Send it back</button></div>`, 'slip');
    const note = ycardEl.querySelector('.yc-note');
    ycardEl.querySelectorAll('.yc-row').forEach(b => b.addEventListener('click', () => {
      const r = rows[+b.dataset.i];
      note.textContent = r.rep === 'True' ? `${r.id} (${r.type}): Replacement True. CloudFormation makes a new one and deletes the old one, with whatever's on it.`
        : r.rep === 'False' ? `${r.id} (${r.type}): updated in place. Replacement False.` : `${r.id} (${r.type}): a new resource. Nothing replaced.`;
    }));
    ycardEl.querySelectorAll('.yc-btns button').forEach(b => b.addEventListener('click', () => {
      const x = b.dataset.x;
      if (x === 'back') YD.sendBack(M); else YD.execute(M, x);
      yUI.slip = false; yclear('slip');
      popAt([L.office.x, L.office.y - L.office.h - 30], x === 'back' ? 'sent back' : x === 'empty' ? 'when it\'s empty' : 'executing', '#ffe6a8', 24);
    }));
  }
  function showChoice(e) {
    const H = S.y.hf, d = S.y.dep, v = d && d.v ? 'v' + d.v : 'the crate', cfg = S.board ? CFG_WORD[S.cfg].toLowerCase() : 'the hand dial';
    yUI.choice = true; yUI.slip = false;
    const left = Math.max(0, Math.ceil(YD.shiftLeft(S))), wait = d && d.cfg === 'hand' ? 'when you finish the dial' : `about ${left} s, then ${cfg}`;
    const opts = e.busy ? [['wait', `Wait for ${v}, then send the hotfix`, wait], ['stop', `Stop ${v} (roll back), send the hotfix with ${cfg}`, '2 s, then ' + cfg], ['force', `Stop ${v}, ship the hotfix ALL AT ONCE`, '2 s · no alarm window']]
      : [['wait', `Send the hotfix with ${cfg}`, '2 s, then ' + cfg], ['force', 'Ship it ALL AT ONCE', '2 s · no alarm window']];
    ycard(`<p class="yc-h hot">Hotfix: new refund forms are failing</p>
      <p class="yc-sub">${e.busy ? `${v} is still going out. The deployment group takes one at a time.` : 'Every sorter we have fails the new forms.'}</p>
      <div class="yc-clock" aria-hidden="true"><i></i></div>
      <div class="yc-btns col">${opts.map(([c, t, s2]) => `<button type="button" data-c="${c}"><b>${t}</b><small>${s2}</small></button>`).join('')}</div>
      <p class="yc-note">Do nothing and it waits.</p>`, 'choice');
    ycardEl.querySelectorAll('.yc-btns button').forEach(b => b.addEventListener('click', () => YD.choose(M, b.dataset.c)));
    H.cardOpen = true;
  }
  function showExpress(piece) {
    yUI.express = true;
    const word = { rack: 'waiting platform', bin: 'returns wagon', ledger: 'ledger' }[piece] || 'yard';
    ycard(`<p class="yc-h hot">UPDATE_FAILED · express mode</p><p class="yc-sub">The update broke halfway and rollback is off: the ${word} is gone until you fix it.</p>
      <div class="yc-btns"><button type="button" data-f="retry">Retry · 1 coin</button><button type="button" data-f="rollback">Roll back · free, 3 s</button></div>`, 'express');
    ycardEl.querySelectorAll('.yc-btns button').forEach(b => b.addEventListener('click', () => {
      const r = YD.fixStack(M, b.dataset.f);
      if (r === 'coins') { popAt([L.W / 2, L.H * .3], 'No coins', '#ffdc78', 28); return; }
      yUI.express = false; yclear('express');
    }));
  }
  // ---- The weighbridge inspection: a card between waves. The yard waits while it's open. ----
  function openInspection(card) {
    letterOpen = true; drag = null;
    const right = i => YD.cardRight(card, i);
    const code = card.lines.map((l, i) => card.kind === 'line'
      ? `<button type="button" class="yc-line" data-i="${i}"><span class="yc-n">${i + 1}</span><code>${escHtml(l)}</code></button>`
      : `<div class="yc-line ro"><span class="yc-n">${i + 1}</span><code>${escHtml(l)}</code></div>`).join('');
    const opts = card.kind === 'fix' ? shuffle(card.opts.map((o, i) => ({ o, i })), Math.random) : [];
    qEl.className = 'on letter yinsp';
    qEl.innerHTML = `<div class="lt-card"><div class="lt-seal" aria-hidden="true"></div>
      <p class="lt-kind">Weighbridge inspection · ${card.file}</p><p class="lt-text" id="q-h">${card.q}</p>
      <div class="yc-code">${code}</div>
      ${opts.length ? `<div class="lt-opts">${opts.map((x, n) => `<button type="button" data-i="${x.i}"><kbd>${n + 1}</kbd><span><code>${escHtml(x.o).replace(/\n/g, '<br>')}</code></span></button>`).join('')}</div>` : ''}
      <p class="lt-why"></p><button type="button" class="lt-go">Back to the yard</button></div>`;
    const why = qEl.querySelector('.lt-why'), go = qEl.querySelector('.lt-go');
    const settle = b => {
      const i = +b.dataset.i, ok = right(i);
      qEl.querySelectorAll('.yc-line, .lt-opts button').forEach(x => { x.disabled = true; if (x.dataset.i != null && right(+x.dataset.i) && (x.classList.contains('yc-line') === (card.kind === 'line'))) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      sfx(ok ? 'right' : 'wrong');
      const fix = card.kind === 'line' ? `<br><span class="yc-fix">Fix: <code>${escHtml(card.fix)}</code></span>` : '';
      why.innerHTML = `<b>${ok ? 'Signed off. A coin.' : 'Not that one.'}</b> ${card.why}${fix}`; why.classList.add('on');
      go.classList.add('on'); go.focus();
      R.answer(M, card.id, ok, 'player');
      if (ok) { M.coins++; coinPulse = 1.5; M.cardsRight = (M.cardsRight || 0) + 1; } else M.cardsWrong = (M.cardsWrong || 0) + 1;
    };
    qEl.querySelectorAll(card.kind === 'line' ? '.yc-line' : '.lt-opts button').forEach(b => b.addEventListener('click', () => { if (!b.disabled) settle(b); }));
    go.addEventListener('click', () => { closeLetter(); yUI.cardOpen = false; });
    yUI.cardOpen = true;
    const first = qEl.querySelector('.yc-line:not(.ro), .lt-opts button'); if (first) first.focus();
  }
  function escHtml(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // ---- Events from the yard's rules ----
  function yardEvent(e) {
    const vName = n => 'v' + n;
    switch (e.type) {
      case 'deploy': sfx('rClank'); popAt([L.W / 2, L.H * .42], 'Stack created', '#bff5b4', 40); if (e.tools.length) say('built', 'smile', YLINES.built); return true;
      case 'lever': yUI.whistle = 1.2; return false;
      case 'train': sfx('rChime'); say('train', 'neutral', YLINES.train); return true;
      case 'crate': return true;
      case 'held': sfx('rPage'); showSlip(); say('held', 'neutral', YLINES.held); return true;
      case 'stack': yUI.boardMsg = e.hotfix ? 'HOTFIX · STACK UPDATE' : 'STACK UPDATE'; yUI.boardFlash = 0; return true;
      case 'publish': sfx('rStamp'); { const p = sorterPos(1); popAt([p[0], p[1] - L.sorters[1].h - 30], vName(e.v) + ' sealed', '#ffd0a0', 30); } say('sealed', 'neutral', YLINES.sealed); return true;
      case 'hook': yUI.trolley = { stage: e.stage, t: 0 }; return true;
      case 'hookResult': popAt([L.W > L.H ? (L.siding.x0 + L.siding.x1) / 2 + 40 : L.W / 2, L.siding.y - 70], (e.stage === 'pre' ? 'Pre-traffic: ' : 'Post-traffic: ') + (e.ok ? 'Succeeded' : 'Failed'), e.ok ? '#9be59b' : '#ff8a7a', 24);
        if (e.ok) say('hookOk', 'neutral', YLINES.hookOk); else say('hook', 'smile', YLINES.hook); return true;
      case 'shift':
        if (e.cfg === 'canary') { say('scale', 'neutral', YLINES.scale); say('split', 'neutral', YLINES.split); }
        if (e.cfg === 'linear') say('scale', 'neutral', YLINES.scale);
        if (e.cfg === 'hand') say('hand', 'neutral', YLINES.hand);
        return true;
      case 'deployed': sfx('right'); { const p = sorterPos(0); popAt([p[0], p[1] - L.sorters[0].h - 30], vName(e.v) + ' is LIVE', '#bff5b4', 30); } return true;
      case 'noWindow': say('noWindow', 'tired', e.hotfix ? YLINES.forced : YLINES.noWindow); return true;
      case 'rollback':
        sfx('wrong'); yUI.boardMsg = `STOPPED · ROLLED BACK · ${e.dep}`; yUI.boardFlash = 2.5;
        popAt([L.points.dial[0], L.points.dial[1] - L.points.r - 30], 'rolled back to ' + vName(S.alias.cur), '#ffb27a', 28);
        if (e.why === 'alarm') { say('alarm', 'surprised', YLINES.alarm); if (e.good && e.poison && S.watch === 'live') say('alarmLive', 'tired', YLINES.alarmLive); else if (e.good && e.form2) say('innocent', 'tired', YLINES.innocent); }
        else if (e.why === 'lever') say('rollback', 'neutral', YLINES.rollback);
        return true;
      case 'stackRollback': sfx('rThud'); yUI.boardMsg = 'UPDATE_ROLLBACK_COMPLETE'; yUI.boardFlash = 3; say('snag', 'tired', YLINES.snag); if (S.manifest) say('paper', 'tired', YLINES.paper); return true;
      case 'updateFailed': sfx('wrong'); yUI.boardMsg = 'UPDATE_FAILED'; yUI.boardFlash = 4; showExpress(e.piece); say('expressFail', 'angry', YLINES.expressFail); return true;
      case 'stackFixing': yUI.boardMsg = 'ROLLING BACK'; yUI.boardFlash = 3; return true;
      case 'stackFixed': sfx('rClank'); yUI.boardMsg = e.how === 'retry' ? 'UPDATE_COMPLETE' : 'UPDATE_ROLLBACK_COMPLETE'; yUI.boardFlash = 2; if (yUI.express) { yUI.express = false; yclear('express'); } return true;
      case 'replaced': if (e.n) { sfx('splat'); popAt([L.rack.x, L.rack.y - L.rack.h - 30], e.n + ' lost with the old platform', '#ff9a8a', 26); say('replace', 'angry', YLINES.replace); } return true;
      case 'hotfix': sfx('rBell'); yUI.hfEv = e; if (!yUI.express) showChoice(e); say('hotfix', 'surprised', e.busy ? YLINES.hotfix : YLINES.hotfixFree); return true;
      case 'choice': yUI.choice = false; yUI.hfEv = null; yclear('choice'); if (e.choice === 'force') say('forced', 'tired', YLINES.forced); if (S.y.held) showSlip(); return true;
      case 'busy': sfx('rThud'); yUI.boardMsg = 'ONE AT A TIME · GROUP BUSY'; yUI.boardFlash = 2; say('busy', 'tired', YLINES.busy); return true;
      case 'parked': popAt([(L.siding.x0 + L.siding.x1) / 2, L.siding.y - 60], 'hotfix waits', '#ffb27a', 24); return true;
      case 'followUp': say('followUp', 'tired', YLINES.followUp); return true;
      case 'ship': sfx('coin'); coinPulse = 1.5; popAt([L.W / 2, L.H * .3], '+1 ship coin · ' + (e.hotfix ? 'hotfix' : 'crate ' + e.slot), '#ffdc78', 30); say('ship', 'smile', YLINES.ship); return true;
      case 'upkeep': coinPulse = 1; popAt([L.mast.x, L.mast.y - L.mast.h - 20], '-1 signal', '#ff9a8a', 24); say('upkeep', 'neutral', YLINES.upkeep); return true;
      case 'wireDark': say('wireDark', 'tired', YLINES.wireDark); return true;
      case 'wireBack': return true;
      case 'testsSkipped': say('testsSkipped', 'tired', YLINES.testsSkipped); return true;
      case 'amend': popAt([L.board.x, L.board.y + L.board.h], 'stack update · 2 s', '#cfe0ff', 24); say('amend', 'neutral', YLINES.amend); return true;
      case 'place': if (e.amend) { sfx('rClank'); say(e.tool, 'neutral', YLINES[e.tool] || ''); } return true;
      case 'card': return true; case 'watch': return true; case 'tests': return true; case 'dial': return true;
      case 'execute': return true; case 'superseded': return true; case 'depotPolicy': return true;
      case 'sentBack': say('sentBack', 'neutral', YLINES.sentBack); return true;
      case 'yardError': {
        const k = S.tickets.find(x => x.id === e.id);
        if (k && k.stool != null) { yUI.lamp[k.stool] = .8; }
        const v = S.versions[e.ver];
        if (e.poison) say('poison', 'surprised', YLINES.poison);
        else if (e.form2) say('counter', 'surprised', YLINES.counter);
        else if (v && v.kind === 'bent') say('bent', 'surprised', YLINES.bent);
        else if (v && v.kind === 'cracked') say('cracked', 'surprised', YLINES.cracked);
        return true;
      }
      case 'poisonFail': return true;
      case 'spill':
        sfx('splat'); drops.push({ t: 0 });
        popAt([L.tank.x - 60, L.tank.y - L.tank.h * .6], '+1', '#9cc8ff', 28);
        if (e.why === 'error') popAt([L.counter.x, L.counter.y - L.counter.h], 'error', '#ff8a7a', 22);
        return true;
      case 'binned': sfx('rClank'); popAt([L.bin.x, L.bin.y - L.bin.h - 20], 'returned', '#d59cff', 24); return true;
      case 'depot': yUI.depotFlash = 2; popAt([L.depot.x, L.depot.y + 50], e.lost ? `depot: ${e.lost} parcel${e.lost > 1 ? 's' : ''} lost` : 'depot: ' + e.policy, e.lost ? '#ff9a8a' : '#cfe0ff', 22); say('depot', 'neutral', YLINES.depot); return true;
      case 'depotCoin': sfx('coin'); coinPulse = 1; popAt([L.depot.x, L.depot.y + 80], '+1 depot', '#ffdc78', 24); return true;
      case 'depotPoor': return true;
      case 'yardGap': {
        const card = yUI.cards[yUI.cardN++]; if (!card) return true;
        if (letterOpen || reviewOpen || letterAnim) yUI.cardQ.push(card); else { sfx('rPage'); say('inspect', 'neutral', YLINES.inspect); openInspection(card); }
        return true;
      }
      case 'win': case 'lose': YD.settle(M); ycard(''); return false;
    }
    return false;
  }
  function yardTick(dt) {
    yUI.whistle = Math.max(0, (yUI.whistle || 0) - dt);
    yUI.boardFlash = Math.max(0, yUI.boardFlash - dt);
    yUI.depotFlash = Math.max(0, yUI.depotFlash - dt);
    for (let i = 0; i < 4; i++) yUI.lamp[i] = Math.max(0, yUI.lamp[i] - dt);
    if (yUI.trolley) { yUI.trolley.t += dt; if (yUI.trolley.t > 3) yUI.trolley = null; }
    const H = M.y && M.y.hf;
    // The hotfix card's clock, and the slip going away once the crate's dealt with.
    if (yUI.choice && H) { const bar = ycardEl.querySelector('.yc-clock i'); if (bar) bar.style.width = Math.max(0, 100 * (H.deadline - M.time) / YD.YT.card) + '%'; if (H.state !== 'card') { yUI.choice = false; yUI.hfEv = null; yclear('choice'); } }
    if (yUI.slip && !M.y.held) { yUI.slip = false; yclear('slip'); }
    // A card that was waiting behind another comes back once that one's gone.
    if (!yUI.cardKind && !M.over) { if (yUI.express && M.y.broken) showExpress(M.y.broken); else if (yUI.hfEv && H && H.state === 'card') showChoice(yUI.hfEv); }
    if (!yUI.slip && !yUI.choice && !yUI.express && M.y.held && !M.y.held.when && yUI.cardKind !== 'slip' && !M.over && yUI.slipAuto !== M.y.held.crate.slot) { yUI.slipAuto = M.y.held.crate.slot; showSlip(); }
    // An inspection card that came while a letter was open.
    if (yUI.cardQ.length && !letterOpen && !reviewOpen && !letterAnim && !M.over) openInspection(yUI.cardQ.shift());
  }
  // ---- The yard's belt: before the whistle a piece is placed at once; after it, it's a stack update. A placed
  // switch flips: the timetable's card, what the alarm watches, the test track on or off. ----
  function yardPlace(tool, where) {
    const T2 = V(); if (!T2.yard) return false;
    const at = where || [L.W / 2, beltRect()[1] - 20];
    if (T2[tool]) {
      if (tool === 'board') { YD.setCard(T2); popAt([L.board.x, L.board.y + L.board.h], CFG_WORD[T2.cfg], '#ffe6a8', 28); }
      else if (tool === 'wire') { YD.setAlarm(T2); popAt([L.mast.x, L.mast.y - L.mast.h - 20], 'watching ' + (T2.watch === 'new' ? 'the new version' : 'LIVE (all)'), '#ffe6a8', 24); }
      else if (tool === 'tests') { YD.setTests(T2); popAt([(L.siding.x0 + L.siding.x1) / 2, L.siding.y - 60], 'tests ' + (T2.testsOn ? 'on' : 'off'), '#ffe6a8', 24); }
      else if (tool === 'manifest' && T2.y.held) showSlip();
      else popAt(at, 'Already built', '#e8dcc4', 24);
      return true;
    }
    if (T2.y.amends.some(a => a.tool === tool)) { popAt(at, 'Building…', '#cfe0ff', 24); return true; }
    const why = YD.amend(T2, tool);
    if (why === 'needs') { popAt(at, 'Needs the timetable first', '#ffdc78', 26); return true; }
    if (why === 'coins') { popAt(at, 'No coins', '#ffdc78', 28); return true; }
    if (why) return true;
    if (!T2.started) { sfx('rClank'); say(tool, 'neutral', YLINES[tool]); }
    return true;
  }
  // ---- The yard's hands: the red lever, the hand dial, the board, the signal's switch, the test track's switch, the
  // office, and dragging the hotfix crate onto the points. ----
  const near = (p, q, r) => Math.hypot(p[0] - q[0], p[1] - q[1]) < r;
  function hotfixCratePos() {
    const H = S.y.hf;
    if (H.state === 'card') return wagonCratePos();
    if (S.y.queue.some(c => c.hotfix)) return [L.siding.x0 + 60, L.siding.y - 26];
    return null;
  }
  function yardDown(p, e) {
    if (S.over) return false;
    const rl = L.rlever;
    if (S.started && near(p, [rl.x, rl.y - rl.h * .55], 64 * Math.max(1, L.fs * .8))) {
      const r = YD.lever(S); if (r) popAt([rl.x, rl.y - rl.h - 20], 'Nothing to roll back', '#e8dcc4', 22); else { sfx('rLever'); yUI.leverT = 1; }
      return true;
    }
    const hc = hotfixCratePos();
    if (S.started && hc && near(p, hc, 60)) { yUI.drag = { x: p[0], y: p[1] }; cv.setPointerCapture(e.pointerId); return true; }
    if (S.started && near(p, L.points.dial, L.points.r + 16)) {
      const d = S.y.dep;
      if (d && d.cfg === 'hand' && d.phase === 'shift') { YD.dial(S, S.alias.w + 0.1); sfx('rTick'); yUI.dialT = .4; }
      else popAt([L.points.dial[0], L.points.dial[1] - L.points.r - 24], S.alias.next ? `v${S.alias.cur} ${Math.round(100 - S.alias.w * 100)}% · v${S.alias.next} ${Math.round(S.alias.w * 100)}%` : `LIVE → v${S.alias.cur}`, '#cfe0ff', 24);
      return true;
    }
    const b = L.board;
    if (inRect(p, [b.x - b.w / 2, b.y - b.h / 2, b.w, b.h])) { if (S.board) yardPlace('board'); else popAt([b.x, b.y + b.h], 'No timetable: the dial is yours', '#e8dcc4', 22); return true; }
    const m = L.mast;
    if (inRect(p, [m.x - 50, m.y - m.h, 100, m.h])) { if (S.wire) yardPlace('wire'); else popAt([m.x, m.y - m.h - 20], 'Not wired', '#e8dcc4', 22); return true; }
    const sd = L.siding;
    if (S.tests && inRect(p, [sd.x0, sd.y - 70, sd.x1 - sd.x0, 90])) { yardPlace('tests'); return true; }
    const o = L.office;
    if (inRect(p, [o.x - 70, o.y - o.h, 140, o.h]) && S.y.held) { showSlip(); return true; }
    return false;
  }
  cv.addEventListener('pointermove', e => { if (!yUI.drag) return; const p = toStage(e); yUI.drag.x = p[0]; yUI.drag.y = p[1]; });
  cv.addEventListener('pointerup', () => {
    const d = yUI.drag; if (!d) return; yUI.drag = null;
    if (near([d.x, d.y], L.points.dial, L.points.r + 80)) {
      const r = YD.execute(M, 'hotfix');
      if (r === '') popAt([L.points.dial[0], L.points.dial[1] - L.points.r - 30], 'hotfix going out', '#bff5b4', 26);
    }
  });
  addEventListener('keydown', e => {
    if (!M || !M.yard || qEl.classList.contains('on') || view !== 'main') return;
    if (e.key === 'r' || e.key === 'R') { if (!YD.lever(M)) { sfx('rLever'); yUI.leverT = 1; } }
    if (e.key === 'd' || e.key === 'D') { const d = M.y.dep; if (d && d.cfg === 'hand') YD.dial(M, M.alias.w + 0.1); }
    if (yUI.choice && ['w', 's', 'f'].includes(e.key)) YD.choose(M, { w: 'wait', s: 'stop', f: 'force' }[e.key]);
  });
  function yardBits() {
    const out = [`${S.shipped} ship coin${S.shipped === 1 ? '' : 's'}`, `${S.rollbacks} rollback${S.rollbacks === 1 ? '' : 's'}`];
    if (S.falseAlarms) out.push(`${S.falseAlarms} good crate${S.falseAlarms > 1 ? 's' : ''} rolled back by the signal`);
    if (S.replaced) out.push(`${S.replaced} lost with the old platform`);
    if (S.snags) out.push(`${S.snags} stack rollback${S.snags > 1 ? 's' : ''}`);
    if (S.incident) out.push(`${S.incident} new forms failed`);
    if (S.hotfixChoice) out.push('hotfix: ' + S.hotfixChoice);
    if (S.busyTaps) out.push(`${S.busyTaps} "one at a time"`);
    const nc = (S.cardsRight || 0) + (S.cardsWrong || 0); if (nc) out.push(`inspections ${S.cardsRight || 0} of ${nc}`);
    if (S.depotCoins || S.depotLost) out.push(`depot: ${S.depotCoins} coins, ${S.depotLost} parcels lost`);
    return out;
  }
  // ---- Geometry ----
  function sorterPos(i) { const s = L.sorters[i]; return [s.x, s.y]; }
  function bayTop(i) { const st = L.stools; return [st.xs[i], st.y - st.h - 18 * Math.min(L.fs, 1.2)]; }
  function wagonCratePos() { const t = L.train; return [t.stop + trainSlide() , t.y - 34 * (L.W > L.H ? 1 : .7)]; }
  // The train slides in from the right edge while a crate's on its way, and waits while anything's on the wagon.
  function trainSlide() {
    const Y2 = S.y; if (Y2.train) { const u = Math.min(1, Y2.train.t / YD.YT.train); return (1 - ease(u)) * (L.W + 200 - L.train.stop); }
    return 0;
  }
  function trainHere() { const Y2 = S.y; return !!(Y2.train || Y2.held || Y2.hf.state === 'card' || (Y2.dep && Y2.dep.phase === 'stack')); }
  function yRackSlot(n) {
    const r = L.rack, cols = 3, c = n % cols, row = Math.floor(n / cols);
    return [r.x + (c - 1) * r.w * .28, r.y - r.h * .78 + row * r.h * .24];
  }
  function conveyorPos(u) { const c = L.conveyor; return [lerp(c.x0 + 10, c.x1, u), c.y - 16 * Math.min(L.fs, 1.3)]; }
  function yardTicketDraw(k) {
    const u = k.dur ? Math.min(1, k.t / k.dur) : 0, qi = S.queue.indexOf(k.id), foot = L.foot;
    const bay = i => bayTop(i == null ? 0 : i), fromRack = () => yRackSlot(4);
    switch (k.phase) {
      case 'slide': return { p: conveyorPos(u) };
      case 'shelf': return qi < 9 ? { p: yRackSlot(Math.max(0, qi)), s: .85 } : null;
      case 'hidden': return { p: [L.rack.x + L.rack.w * .45, L.rack.y - L.rack.h * .95], s: .8, a: .35 };
      case 'walk': { const src = k.from === 'rack' ? fromRack() : foot; return { p: arc(src, bay(k.stool), 50, ease(u)) }; }
      case 'work': return { p: bay(k.stool), ring: u };
      case 'counter': return { p: [L.counter.x, L.counter.y - L.counter.h * .45], ring: u };
      case 'drop': return { p: bay(k.seat), a: Math.max(0, 1 - u), s: lerp(1, .5, u) };
      case 'done': return { p: arc(k.from === 'counter' ? [L.counter.x, L.counter.y - 30] : bay(k.seat), L.handled, 120, ease(u)), s: lerp(1, .6, u), img: 'y-waybill-done' };
      case 'bounce': return { p: arc(foot, L.hatch, 120, ease(u)), rot: -0.6 + u * 4 };
      case 'splat': { const src = k.from === 'counter' ? [L.counter.x, L.counter.y - 30] : k.stool != null || k.seat != null ? bay(k.seat) : foot; return { p: arc(src, [L.tank.x, L.tank.y - L.tank.h * .7], 140, u), rot: u * 3, img: 'y-waybill-error', a: 1 - u * .4 }; }
      case 'tobin': return { p: arc(bay(k.seat), [L.bin.x, L.bin.y - L.bin.h * .75], 120, ease(u)), rot: u * 5, s: lerp(1, .7, u), img: 'y-waybill-error' };
      case 'back': return { p: arc(bay(k.seat), fromRack(), 50, ease(u)), s: .85, img: 'y-waybill-error' };
    }
    return null;
  }
  // ---- Drawing ----
  const VCOL = { cur: '#4f86d9', next: '#ef8a3a', old: '#8a8f9a', bad: '#d8473b' };
  function verCol(n) { return n === S.alias.cur ? VCOL.cur : n === S.alias.next ? VCOL.next : VCOL.old; }
  function drawYard(dragging, mini) {
    const bg = IMG[L.bg], Y2 = S.y, now = performance.now();
    if (bg && !mini) cx.drawImage(bg, 0, 0, L.W, L.H);
    const k1 = L.W > L.H ? 1 : .78; // the tall yard's props are a little smaller
    // The departure board: the timetable and what the deployment is doing.
    drawBoard();
    // The test track's siding and trolley.
    drawSiding();
    // The goods train with the crate (or the red-tagged hotfix).
    if (trainHere() || yUI.drag) drawTrain();
    // The weighbridge office (the manifest).
    { const o = L.office; if (!L.painted) img('y-office', o.x, o.y, o.h, 'mb', S.manifest ? 1 : .55); if (S.manifest) { if (Y2.held) glowSpot([o.x - o.h * .5, o.y - o.h - 6, o.h, o.h + 12], true); if (!mini && L.W > L.H) plaque('Office · change set', o.x, o.y + 16 * L.fs); } }
    // The water tower is the error budget.
    drawTower();
    drawMast();
    // The counter hatch, where the new forms come in (synchronous).
    { const c = L.counter; cx.save(); rrect(c.x - c.w / 2, c.y - c.h, c.w, c.h, 6); cx.fillStyle = '#2b2018'; cx.fill(); cx.lineWidth = 4; cx.strokeStyle = '#7a5530'; cx.stroke();
      rrect(c.x - c.w / 2 + 8, c.y - c.h + 8, c.w - 16, c.h - 24, 4); cx.fillStyle = Y2.form2 ? '#f6d68a' : '#5a4632'; cx.fill(); cx.fillStyle = '#7a5530'; cx.fillRect(c.x - c.w / 2 - 6, c.y - 14, c.w + 12, 10); cx.restore();
      if (Y2.form2 && !mini) plaque('Counter · sync', c.x, c.y - c.h - 14 * L.fs); }
    // The waiting platform (rack), or its glowing spot.
    if (S.rack) {
      const r = L.rack; shadow(r.x, r.y + 2, r.w); img('y-platform', r.x, r.y + 4, r.h, 'mb');
      const n = S.queue.length; if (n > 9) text('+' + (n - 9), r.x + r.w * .5, r.y - r.h * .9, 24, '#ffe6a8');
      if (!mini) plaque(L.W > L.H ? 'Platform · SQS queue' : 'Platform · SQS', r.x, r.y + 16 * L.fs);
    } else if (dragging === 'rack') glowSpot([L.rack.x - L.rack.w / 2, L.rack.y - L.rack.h, L.rack.w, L.rack.h], true);
    if (Y2.amends.some(a => a.tool === 'rack')) glowSpot([L.rack.x - L.rack.w / 2, L.rack.y - L.rack.h, L.rack.w, L.rack.h], false);
    drawSorters(mini);
    drawBays();
    // The ledger on its stand by the bays.
    if (S.ledger) { const lg = L.ledger; img('ledger', lg.x, lg.y - lg.h * .5, 0, 'mm', 1, -0.05, lg.h * 1.5); if (!mini && L.W > L.H) plaque('Ledger', lg.x, lg.y + 14 * L.fs); }
    // The returns wagon (bin).
    if (S.bin) { const b = L.bin; shadow(b.x, b.y + 2, b.w); img('y-returns', b.x, b.y + 4, b.h, 'mb'); if (S.binned) text(String(S.binned), b.x + b.w * .32, b.y - b.h * .62, 24, '#e5b8ff'); if (!mini) plaque('Returns · DLQ', b.x, b.y - b.h - 14 * L.fs); }
    else if (dragging === 'bin') glowSpot([L.bin.x - L.bin.w / 2, L.bin.y - L.bin.h, L.bin.w, L.bin.h], true);
    // The conveyor through the gate, the whistle, the points with the LIVE dial, the red lever.
    { const c = L.conveyor; img('y-conveyor', (c.x0 + c.x1) / 2, c.y + 40 * k1, 0, 'mb', 1, 0, c.x1 - c.x0 + 20); img('y-gate', L.gate.x, L.gate.y, L.gate.h, 'mb'); }
    drawWhistle(mini);
    drawPoints(mini);
    { const rl = L.rlever, t = yUI.leverT || 0; shadow(rl.x, rl.y + 2, rl.h * .5); img('y-lever', rl.x, rl.y, rl.h, 'mb', 1, t ? -0.5 * Math.sin(t * Math.PI) : 0); if (!mini && S.started) text('↶', rl.x + rl.h * .36, rl.y - rl.h * .82, 22, '#ffb0a0'); if (!mini) plaque('Reverse lever', rl.x, rl.y - rl.h - 18 * L.fs); }
    if (yUI.leverT) yUI.leverT = Math.max(0, yUI.leverT - 1 / 30);
    // Waybills.
    const waitN = S.tickets.filter(k => k.phase === 'wait').length;
    for (const k of S.tickets) {
      const d = yardTicketDraw(k); if (!d) continue;
      const key = d.img || (k.poison ? 'y-waybill-poison' : k.refund ? 'y-waybill-gold' : 'y-waybill'), w = 42 * (d.s || 1) * (L.W > L.H ? 1 : 1.05);
      img(key, d.p[0], d.p[1], 0, 'mm', d.a, d.rot || 0, w);
      if (k.form2 && !d.img) { cx.save(); cx.globalAlpha = d.a == null ? 1 : d.a; cx.translate(d.p[0], d.p[1]); cx.rotate(d.rot || 0); cx.fillStyle = '#2f6fe0'; cx.beginPath(); cx.moveTo(w * .5, -w * .34); cx.lineTo(w * .5, w * .02); cx.lineTo(w * .14, -w * .34); cx.closePath(); cx.fill(); cx.restore(); }
      if (k.twin && !['done', 'drop'].includes(k.phase)) text('x2', d.p[0] + 22, d.p[1] - 16, 16, '#ffb27a');
      if (d.ring != null) { cx.save(); cx.lineWidth = 5; cx.strokeStyle = k.ver ? verCol(k.ver) : '#8fe68f'; cx.beginPath(); cx.arc(d.p[0], d.p[1], 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.ring); cx.stroke(); cx.restore(); }
    }
    if (waitN) text('↺ ' + waitN, L.hatch[0] + 40, L.hatch[1] - 30, 24, '#ff9a8a');
    // The hotfix crate, dragged.
    if (yUI.drag) { img('y-crate', yUI.drag.x, yUI.drag.y, 0, 'mm', .9, 0, 110 * k1); hotTag(yUI.drag.x, yUI.drag.y - 20); glowSpot([L.points.dial[0] - L.points.r - 20, L.points.dial[1] - L.points.r - 20, L.points.r * 2 + 40, L.points.r * 2 + 40], true); }
    if (S.y.depot) drawDepot();
    // Glows on the belt's targets before the claim starts are on the blueprint instead. Floating numbers.
    cx.save(); cx.fillStyle = 'rgba(120,180,255,.85)'; fx.forEach(f => { cx.beginPath(); cx.arc(f.x, f.y, 5 * (1 - f.t), 0, Math.PI * 2); cx.fill(); }); cx.restore();
    pops.forEach(p => { cx.save(); cx.globalAlpha = Math.min(1, 2.4 - p.t * 2); text(p.text, p.x, p.y - p.t * 50, p.size, p.col); cx.restore(); });
    if (mini) return;
    if (flashT) { cx.save(); cx.fillStyle = `rgba(255,80,60,${flashT * .35})`; cx.fillRect(0, 0, L.W, L.H); cx.restore(); }
    if (letterAnim && S === M) { const p = [L.W / 2, L.H * .4 + Math.sin(now / 120) * 4]; img('y-waybill-gold', p[0], p[1], 0, 'mm', 1, 0, 90); text('A letter!', p[0], p[1] - 56, 26, '#ffe08a'); }
  }
  function hotTag(x, y) { const k = yk(); cx.save(); rrect(x - 34 * k, y - 12 * k, 68 * k, 24 * k, 4); cx.fillStyle = '#c8302a'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#3a0c08'; cx.stroke(); cx.font = `800 ${13 * k}px Nunito, sans-serif`; cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('HOTFIX', x, y + 1); cx.restore(); }
  // Small canvas words in the tall yard: scaled up so none draws under about 11 CSS px on a 390 px phone.
  function yk() { return L.W > L.H ? 1 : L.fs; }
  function drawBoard() {
    const b = L.board, Y2 = S.y, d = Y2.dep, x0 = b.x - b.w / 2, y0 = b.y - b.h / 2;
    // Two chains up to the roof, the frame, then two rows of flaps.
    cx.save(); cx.strokeStyle = '#3a3026'; cx.lineWidth = 3; for (const dx of [-b.w * .36, b.w * .36]) { cx.beginPath(); cx.moveTo(b.x + dx, 0); cx.lineTo(b.x + dx, y0); cx.stroke(); }
    rrect(x0, y0, b.w, b.h, 8); cx.fillStyle = '#2a2622'; cx.fill(); cx.lineWidth = 5; cx.strokeStyle = S.board ? '#c9a24e' : '#6b5d4a'; cx.stroke(); cx.restore();
    const flaps = (str, y, h, col, minF) => {
      const n = Math.max(14, str.length), cw = (b.w - 20) / n;
      cx.save(); cx.font = `700 ${Math.max(h * .72, minF || 0)}px "Courier New", monospace`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) { const xx = x0 + 10 + i * cw; rrect(xx + 1, y - h / 2, cw - 2, h, 2); cx.fillStyle = '#141210'; cx.fill(); cx.fillStyle = 'rgba(255,255,255,.07)'; cx.fillRect(xx + 1, y - 1, cw - 2, 2); cx.fillStyle = col; cx.fillText(str[i] || '', xx + cw / 2, y + 1); }
      cx.restore();
    };
    const row1 = !S.board ? 'HAND DIAL' : { canary: 'CANARY 10% 5', linear: 'LINEAR 10% EVERY 1', all: 'ALL AT ONCE' }[S.cfg];
    let row2 = '';
    if (yUI.boardFlash && yUI.boardMsg) row2 = yUI.boardMsg;
    else if (d) row2 = d.phase === 'stack' ? (d.crate.hotfix ? 'HOTFIX · ' : '') + 'STACK UPDATE' : d.phase === 'pre' ? 'PRE-TRAFFIC TEST' : d.phase === 'post' ? 'POST-TRAFFIC TEST' : d.phase === 'shift' ? `v${d.v} ${Math.round(S.alias.w * 100)}%` + (d.cfg === 'canary' && S.alias.w < 1 ? ` · ${Math.max(0, Math.ceil(YD.YT.canary - d.t))}s` : d.cfg === 'hand' ? ' · BY HAND' : '') : '';
    else if (Y2.held) row2 = 'CRATE AT THE OFFICE';
    else if (!S.started) row2 = '1 MIN = 1.5 S';
    else row2 = `LIVE v${S.alias.cur}`;
    const fh = b.h * .34;
    flaps(row1, y0 + b.h * .3, fh, S.board ? '#ffe6a8' : '#9d907c');
    // The phone's board holds 24 flaps at a readable size: a long message drops its last ' · ' part.
    let r2 = row2.slice(0, 26); if (L.W < L.H) { while (r2.length > 24 && r2.includes(' · ')) r2 = r2.slice(0, r2.lastIndexOf(' · ')); r2 = r2.slice(0, 24); }
    flaps(r2, y0 + b.h * .72, fh * .78, yUI.boardFlash ? '#ff9a7a' : '#9fe0a8', L.W < L.H ? 22.5 : 0);
    if (L.W > L.H) plaque(S.board ? 'Timetable · tap to change' : 'Timetable · not bought', b.x, y0 + b.h + 14 * L.fs);
  }
  function drawSiding() {
    const sd = L.siding, k1 = L.W > L.H ? 1 : .7;
    img('y-siding', (sd.x0 + sd.x1) / 2, sd.y + 6, 0, 'mb', S.tests ? 1 : .6, 0, sd.x1 - sd.x0);
    // The test trolley runs out along the siding during a hook, with a blue test waybill (and a gold one after).
    const tr = yUI.trolley, u = tr ? Math.min(1, tr.t / 1.5) : 0, x = lerp(sd.x0 + 40 * k1, sd.x1 - 30 * k1, tr ? Math.sin(u * Math.PI) : 0);
    if (S.tests) {
      img('y-trolley', x, sd.y, 30 * k1 + 10, 'mb');
      if (tr) { img('y-waybill-test', x - 8, sd.y - 38 * k1, 0, 'mm', 1, -.1, 34); if (tr.stage === 'post') img('y-waybill-gold', x + 14, sd.y - 40 * k1, 0, 'mm', 1, .1, 30); }
      if (L.W > L.H) plaque('Test track · ' + (S.testsOn ? 'hooks on' : 'off'), (sd.x0 + sd.x1) / 2, sd.y + 18 * L.fs);
    }
    const parked = S.y.queue.find(c => c.hotfix);
    if (parked) { img('y-crate', sd.x0 + 60, sd.y, 70 * k1, 'mb'); hotTag(sd.x0 + 60, sd.y - 74 * k1); }
  }
  function drawTrain() {
    const t = L.train, k1 = L.W > L.H ? 1 : .62, off = trainSlide(), wx = t.stop + off;
    img('y-flat', wx, t.y, 0, 'mb', 1, 0, 190 * k1);
    img('y-engine', wx + 175 * k1, t.y, 140 * k1, 'mb');
    // The crate on the wagon: the held one, the arriving one, or the hotfix.
    const Y2 = S.y, H = Y2.hf;
    const onWagon = H.state === 'card' ? 'hot' : Y2.held || Y2.train ? 'crate' : '';
    if (onWagon && !(H.state === 'card' && yUI.drag)) { img('y-crate', wx, t.y - 22 * k1, 86 * k1, 'mb'); if (onWagon === 'hot') hotTag(wx, t.y - 120 * k1); else { const c = (Y2.held || Y2.train).crate; tagLabel(wx + 26 * k1, t.y - 70 * k1, 'crate ' + c.slot); } }
  }
  function tagLabel(x, y, t) { const k = yk(); cx.save(); cx.font = `800 ${13 * k}px Nunito, sans-serif`; const w = cx.measureText(t).width + 10; rrect(x - w / 2, y - 10 * k, w, 20 * k, 3); cx.fillStyle = '#f4e8c8'; cx.fill(); cx.strokeStyle = '#5a4026'; cx.lineWidth = 1.5; cx.stroke(); cx.fillStyle = '#2a1d10'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y + 1); cx.restore(); }
  function drawTower() {
    const t = L.tank, im = IMG['y-tower']; if (!im) return;
    img('y-tower', t.x, t.y, t.h, 'mb');
    // The tank's gauge: the glass strip on the side fills with every lost waybill.
    const w = im.width * t.h / im.height, tx0 = t.x - w * .4, ty0 = t.y - t.h * .97, th = t.h * .36, lvl = Math.min(1, M.spill / M.cap);
    const gx = t.x + w * .18, gw = w * .14;
    cx.save(); rrect(gx, ty0 + th * .1, gw, th * .8, 4); cx.fillStyle = 'rgba(20,30,40,.75)'; cx.fill();
    if (lvl) { const h = th * .8 * lvl; rrect(gx, ty0 + th * .9 - h, gw, h, 4); cx.fillStyle = lvl > .75 ? '#e65a50' : '#3c82e6'; cx.fill(); }
    cx.restore();
    for (const d of drops) { const yy = lerp(ty0 - 40, ty0 + th * .5, d.t / .7); cx.save(); cx.fillStyle = 'rgba(120,180,255,.95)'; cx.beginPath(); cx.arc(gx + gw / 2, yy, 6, 0, Math.PI * 2); cx.fill(); cx.restore(); }
    void tx0;
    plaque(`Error budget ${M.spill}/${M.cap}`, t.x, t.y + 14 * L.fs);
  }
  function drawMast() {
    const m = L.mast, red = S.y.mastRed > 0, wired = S.wire && S.wireOn;
    img('y-mast', m.x, m.y, m.h, 'mb');
    const lx = m.x, ly = m.y - m.h * .9, r = m.h * .075;
    cx.save(); cx.beginPath(); cx.arc(lx, ly, r, 0, Math.PI * 2);
    cx.fillStyle = !S.wire ? '#2a2a2a' : !wired ? '#3a3a3a' : red ? '#ff3b2f' : '#38d26b'; cx.fill();
    if (wired) { cx.shadowColor = red ? 'rgba(255,60,40,.95)' : 'rgba(60,220,110,.8)'; cx.shadowBlur = red ? 30 : 16; cx.fill(); }
    cx.restore();
    if (red) { const p = .5 + .5 * Math.sin(performance.now() / 90); cx.save(); cx.strokeStyle = `rgba(255,80,60,${.5 + p * .5})`; cx.lineWidth = 4; cx.beginPath(); cx.arc(lx, ly, r * 1.9, 0, Math.PI * 2); cx.stroke(); cx.restore(); text('ALARM', lx, ly - r * 2.4, 24, '#ff7a6a'); }
    if (S.wire) {
      // The switch plate: what the alarm watches.
      const py = m.y - m.h * .3, w = 70 * yk(), h = 26 * yk();
      cx.save(); rrect(m.x - w / 2, py - h / 2, w, h, 6); cx.fillStyle = '#f1e2bd'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#5a4026'; cx.stroke();
      cx.font = `800 ${13 * yk()}px Nunito, sans-serif`; cx.fillStyle = S.watch === 'new' ? '#c4561c' : '#2c5aa8'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(S.wireOn ? (S.watch === 'new' ? 'NEW' : 'LIVE') : 'DARK', m.x, py + 1); cx.restore();
    }
    if (L.W > L.H) plaque(S.wire ? 'Signal · alarm' : 'Signal · not wired', m.x, m.y + 14 * L.fs);
  }
  function drawSorters(mini) {
    const Y2 = S.y, d = Y2.dep, sp = L.sorters;
    const sorter = (i, n, key, label, alpha) => {
      const s = sp[i]; shadow(s.x, s.y + 2, s.h * .7); img(key, s.x, s.y + 4, s.h, 'mb', alpha);
      // The engraved plate, and the wax seal (published, immutable).
      const pw = s.h * .36, py = s.y - s.h * .32;
      const pk = Math.min(yk(), 1.4); cx.save(); rrect(s.x - pw / 2, py - 13 * pk, pw, 26 * pk, 4); cx.fillStyle = '#e8cf86'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#5a4016'; cx.stroke();
      cx.font = `800 ${18 * pk}px Fredoka, sans-serif`; cx.fillStyle = '#2a1d10'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('v' + n, s.x, py + 1); cx.restore();
      img('y-seal', s.x + pw / 2 + 12, py, 26, 'mm');
      if (label && !mini) text(label, s.x, s.y - s.h - 16, 18, '#f6e7c4');
    };
    sorter(0, S.alias.cur, 'y-sorter-old', S.alias.next ? `${Math.round(100 - S.alias.w * 100)}%` : 'LIVE 100%');
    if (d && d.phase === 'stack') {
      // The crate at the unpack spot while its change set executes.
      const s = sp[1], u = Math.min(1, d.t / (S.orders.has('express') ? YD.YT.express : YD.YT.stack));
      img(d.crate.slot === 'H' || d.crate.hotfix ? 'y-crate' : 'y-crate', s.x + Math.sin(d.t * 30) * (d.crate.kind === 'snag' && u > .8 ? 4 : 0), s.y, s.h * .55, 'mb');
      if (d.crate.hotfix) hotTag(s.x, s.y - s.h * .62);
      cx.save(); rrect(s.x - 50, s.y + 10, 100, 10, 5); cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fill(); rrect(s.x - 50, s.y + 10, 100 * u, 10, 5); cx.fillStyle = '#9fe0a8'; cx.fill(); cx.restore();
    } else if (d && d.v) sorter(1, d.v, 'y-sorter-new', d.phase === 'shift' ? `${Math.round(S.alias.w * 100)}%` : d.phase === 'pre' ? 'testing' : d.phase === 'post' ? 'testing' : '');
    else {
      // No deployment: the last version that didn't stay live sits on its spur, sealed and grey.
      const last = S.versions.length - 1;
      if (last > 1 && last !== S.alias.cur) sorter(1, last, 'y-sorter-old', mini ? '' : 'rolled back', .45);
      else if (!mini) { const s = sp[1]; cx.save(); cx.setLineDash([8, 6]); cx.lineWidth = 3; cx.strokeStyle = 'rgba(255,214,102,.55)'; rrect(s.x - s.h * .36, s.y - s.h * .8, s.h * .72, s.h * .8, 10); cx.stroke(); cx.restore(); if (!S.started || last <= 1) { text('new sorter', s.x, s.y - s.h * .5, 14, '#ffe6a8'); text('unpacks here', s.x, s.y - s.h * .5 + 18 * L.fs, 14, '#ffe6a8'); } }
    }
    // Every sealed version so far, as a row of little seals: the old ones are still there to roll back to.
    if (S.versions.length > 2 && !mini) {
      const s0 = sp[0], s1 = sp[1], y = s0.y - s0.h - 44 * Math.min(L.fs, 1.2);
      const vs = S.versions.filter(Boolean).map(v => v.n), sk = L.W > L.H ? 1 : 1.35, w = 30 * sk;
      vs.forEach((n, i) => { const x = (s0.x + s1.x) / 2 + (i - (vs.length - 1) / 2) * w; img('y-seal', x, y, 22 * sk, 'mm', n === S.alias.cur || n === S.alias.next ? 1 : .55); text(String(n), x, y + 1, L.W > L.H ? 11 : 13, '#fff'); });
    }
  }
  function drawBays() {
    const st = L.stools, seats = R.seats(S);
    for (let i = 0; i < 4; i++) {
      const x = st.xs[i]; shadow(x, st.y + 2, st.w);
      img('y-bay', x, st.y + 4, st.h, 'mb');
      const k = seats[i] && seats[i].ticket != null ? S.tickets.find(t => t.id === seats[i].ticket) : null;
      const lx = x + st.w * .36, ly = st.y - st.h * 1.02, col = yUI.lamp[i] ? VCOL.bad : k && k.ver && k.phase === 'work' ? verCol(k.ver) : null;
      cx.save(); cx.beginPath(); cx.arc(lx, ly, 8 * Math.min(L.fs, 1.2), 0, Math.PI * 2); cx.fillStyle = col || '#3a332a'; cx.fill(); if (col) { cx.shadowColor = col; cx.shadowBlur = 14; cx.fill(); } cx.lineWidth = 2; cx.strokeStyle = '#1a140e'; cx.stroke(); cx.restore();
      if (S.orders.has('cold') && !k && S.time - S.lastFree[i] > R.T.coldAfter) frost(x, st.y - st.h * .6, st.h * .22);
    }
    plaque('Bays · 4 · concurrency', (st.xs[0] + st.xs[3]) / 2, st.y + 16 * L.fs);
  }
  function drawWhistle(mini) {
    const w = L.whistle, lv = L.lever;
    img('y-whistle', w.x, w.y, w.h, 'mb', 1, 0);
    if (yUI.whistle) { const u = yUI.whistle; for (let i = 0; i < 4; i++) { cx.save(); cx.globalAlpha = Math.max(0, u - i * .2) * .7; cx.fillStyle = '#f4f4f4'; cx.beginPath(); cx.arc(w.x + 10 + i * 14, w.y - w.h - 10 - i * 22 - (1.2 - u) * 30, 12 + i * 6, 0, Math.PI * 2); cx.fill(); cx.restore(); } text('TOOT', w.x + 60, w.y - w.h - 30, 24, '#fff6d6'); }
    if (!S.started && !mini) {
      const p = .5 + .5 * Math.sin(performance.now() / 260);
      cx.save(); const g = cx.createRadialGradient(lv.x, lv.y, 10, lv.x, lv.y, lv.r); g.addColorStop(0, `rgba(255,214,102,${.35 + p * .2})`); g.addColorStop(1, 'rgba(255,214,102,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(lv.x, lv.y, lv.r, 0, Math.PI * 2); cx.fill(); cx.restore();
      text('PULL', lv.label[0], lv.label[1], 28, '#ffe08a');
    }
  }
  function drawPoints(mini) {
    const pt = L.points, [dx, dy] = pt.dial, r = pt.r, a = S.alias;
    img('y-points', pt.x, pt.y, pt.h, 'mb');
    // The dial: the current version's blue, the new one's orange slice.
    cx.save(); cx.beginPath(); cx.arc(dx, dy, r, 0, Math.PI * 2); cx.fillStyle = '#f6efdc'; cx.fill(); cx.lineWidth = 5; cx.strokeStyle = '#2a241c'; cx.stroke();
    cx.beginPath(); cx.moveTo(dx, dy); cx.arc(dx, dy, r - 7, -Math.PI / 2, Math.PI * 1.5); cx.closePath(); cx.fillStyle = VCOL.cur; cx.fill();
    if (a.next && a.w > 0) { cx.beginPath(); cx.moveTo(dx, dy); cx.arc(dx, dy, r - 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.w); cx.closePath(); cx.fillStyle = VCOL.next; cx.fill(); }
    cx.beginPath(); cx.arc(dx, dy, r * .42, 0, Math.PI * 2); cx.fillStyle = '#f6efdc'; cx.fill(); cx.lineWidth = 2; cx.stroke();
    cx.restore();
    text(a.next ? Math.round(a.w * 100) + '%' : 'v' + a.cur, dx, dy + 1, 17, '#2a1d10');
    const d = S.y.dep, hand = d && d.cfg === 'hand' && d.phase === 'shift';
    if (hand && !mini) { const p = .5 + .5 * Math.sin(performance.now() / 200); cx.save(); cx.strokeStyle = `rgba(255,214,102,${.5 + p * .5})`; cx.lineWidth = 5; cx.setLineDash([8, 6]); cx.beginPath(); cx.arc(dx, dy, r + 10, 0, Math.PI * 2); cx.stroke(); cx.restore(); text('tap +10%', dx, dy + r + 22, 16, '#ffe08a'); }
    if (!mini) plaque('LIVE · alias', dx, dy - r - 18 * L.fs);
  }
  function drawDepot() {
    const D = S.y.depot, p = L.depot, tall = L.W < L.H, w = tall ? 210 : 150, h = tall ? 96 : 54;
    cx.save(); rrect(p.x - w / 2, p.y, w, h, 8); cx.fillStyle = 'rgba(32,24,18,.85)'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = yUI.depotFlash ? '#ffd666' : '#be9650'; cx.stroke();
    for (let i = 0; i < 4; i++) { const bx = p.x - w / 2 + 12 + i * (w - 24) / 4; rrect(bx + 2, p.y + h * .45, (w - 24) / 4 - 4, h * .38, 3); cx.fillStyle = D.bench === 'bad' ? '#c8473b' : '#7a5a3a'; cx.fill(); }
    cx.font = `800 ${tall ? 22 : 11}px Nunito, sans-serif`; cx.fillStyle = '#f6e7c4'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const pol = { all: 'all at once', rolling: 'rolling', additional: 'rolling + batch', immutable: 'immutable', split: 'splitting' }[D.policy];
    if (tall) { cx.fillText('Depot', p.x, p.y + 16); cx.fillText(pol, p.x, p.y + 40); } else cx.fillText('Depot · ' + pol, p.x, p.y + h * .24); cx.restore();
  }
  // ---- The yard's art, drawn in code until the painted backdrop and Sogni props come in. Each prop is drawn on its
  // own canvas at about twice its size on the wide stage. A painted file in SRC under the same key replaces it. ----
  function cvs(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#1e140c'; g.lineWidth = 5; f(g, w, h); return c; }
  function yardBackdrop(LY) {
    return cvs(LY.W, LY.H, (g, W, H) => {
      const [wt, wb] = LY.wall, rail = LY.rail;
      const sky = g.createLinearGradient(0, 0, 0, wt); sky.addColorStop(0, '#8eaed6'); sky.addColorStop(.55, '#e9b8b0'); sky.addColorStop(1, '#f6cf92'); g.fillStyle = sky; g.fillRect(0, 0, W, wt);
      g.fillStyle = 'rgba(255,240,230,.45)'; for (const [cx2, cy, r] of [[.2, .12, 60], [.55, .08, 80], [.8, .18, 50]]) { g.beginPath(); g.ellipse(W * cx2, wt * cy + 30, r * 2, r * .32, 0, 0, Math.PI * 2); g.fill(); }
      // The goods shed: slate roofline, then the brick wall with two big arched doors.
      g.fillStyle = '#4b4f5c'; g.fillRect(0, wt - 26, W, 30); g.fillStyle = '#5e6371'; g.fillRect(0, wt - 26, W, 6);
      g.fillStyle = '#9a4c38'; g.fillRect(0, wt, W, wb - wt);
      g.strokeStyle = 'rgba(60,24,16,.35)'; g.lineWidth = 1.5;
      for (let y = wt + 12, row = 0; y < wb; y += 12, row++) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (row % 2) * 16; x < W; x += 32) { g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x, y); g.stroke(); } }
      g.fillStyle = 'rgba(40,20,14,.55)'; for (const fx2 of [.36, .7]) { const dw = Math.min(150, W * .16), x = W * fx2 - dw / 2; g.beginPath(); g.moveTo(x, wb); g.lineTo(x, wt + 40); g.quadraticCurveTo(x + dw / 2, wt + 4, x + dw, wt + 40); g.lineTo(x + dw, wb); g.closePath(); g.fill(); }
      // Gravel and the rail line.
      g.fillStyle = '#6a5d52'; g.fillRect(0, wb, W, rail + 18 - wb);
      g.fillStyle = 'rgba(30,22,16,.35)'; for (let i = 0; i < W * .7; i++) { const x = (i * 97) % W, y = wb + ((i * 53) % (rail + 18 - wb)); g.fillRect(x, y, 3, 2); }
      g.fillStyle = '#3d2c20'; for (let x = 6; x < W; x += 26) g.fillRect(x, rail - 4, 14, 12);
      g.fillStyle = '#b8bcc4'; g.fillRect(0, rail - 9, W, 5); g.fillStyle = '#5a5f68'; g.fillRect(0, rail - 4, W, 2);
      // Cobbles to the front, and a lighter worn lane.
      const cob = g.createLinearGradient(0, rail + 18, 0, H); cob.addColorStop(0, '#6e6863'); cob.addColorStop(1, '#4e4844'); g.fillStyle = cob; g.fillRect(0, rail + 18, W, H - rail - 18);
      g.strokeStyle = 'rgba(25,20,18,.35)'; g.lineWidth = 2;
      for (let y = rail + 30, row = 0; y < H; y += 18 + row * .8, row++) { const sw = 26 + row * 1.6; for (let x = (row % 2) * sw / 2; x < W; x += sw) { g.beginPath(); g.ellipse(x, y, sw * .45, 7 + row * .25, 0, 0, Math.PI * 2); g.stroke(); } }
      g.fillStyle = 'rgba(255,220,170,.06)'; g.fillRect(0, (rail + H) / 2, W, 60);
      // The fence on the left.
      g.fillStyle = '#6b4a2c'; for (let x = 0; x < 80; x += 18) g.fillRect(x, rail - 120, 12, 140);
      g.fillRect(0, rail - 100, 90, 10); g.fillRect(0, rail - 50, 90, 10);
      // Warm low light from the right, and a vignette.
      const lit = g.createLinearGradient(0, 0, W, 0); lit.addColorStop(0, 'rgba(20,20,60,.18)'); lit.addColorStop(1, 'rgba(255,190,110,.12)'); g.fillStyle = lit; g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .3, W / 2, H * .5, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,4,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    });
  }
  function yardArt() {
    const put = (k, c) => { if (!IMG[k]) IMG[k] = c; };
    put('yard-wide', yardBackdrop(YARD_WIDE)); put('yard-tall', yardBackdrop(YARD_TALL));
    const tag = (fill, extra) => cvs(92, 68, g => {
      g.fillStyle = fill; g.beginPath(); g.moveTo(14, 6); g.lineTo(86, 6); g.lineTo(86, 62); g.lineTo(14, 62); g.lineTo(4, 50); g.lineTo(4, 18); g.closePath(); g.fill(); g.lineWidth = 4; g.stroke();
      g.fillStyle = '#f7efdc'; g.beginPath(); g.arc(16, 34, 6, 0, Math.PI * 2); g.fill(); g.lineWidth = 2.5; g.stroke();
      g.strokeStyle = 'rgba(60,40,20,.55)'; g.lineWidth = 3; for (const y of [26, 40]) { g.beginPath(); g.moveTo(32, y); g.lineTo(74, y); g.stroke(); }
      g.fillStyle = '#c0302a'; g.beginPath(); g.arc(74, 52, 7, 0, Math.PI * 2); g.fill();
      if (extra) extra(g);
    });
    put('y-waybill', tag('#e8d3a4')); put('y-waybill-gold', tag('#f3c443')); put('y-waybill-poison', tag('#a46ad0'));
    put('y-waybill-test', tag('#9ccaf2', g => { g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.moveTo(30, 62); g.lineTo(70, 6); g.stroke(); }));
    put('y-waybill-error', tag('#e8b9a4', g => { g.strokeStyle = '#b8261d'; g.lineWidth = 7; g.beginPath(); g.moveTo(40, 14); g.lineTo(70, 54); g.moveTo(70, 14); g.lineTo(40, 54); g.stroke(); g.fillStyle = '#1e140c'; g.beginPath(); g.moveTo(86, 30); g.lineTo(76, 36); g.lineTo(86, 42); g.fill(); }));
    put('y-waybill-done', tag('#e8d3a4', g => { g.strokeStyle = '#2a8a4a'; g.lineWidth = 5; g.beginPath(); g.arc(56, 34, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(46, 34); g.lineTo(54, 42); g.lineTo(68, 26); g.stroke(); }));
    put('y-whistle', cvs(80, 400, g => {
      g.fillStyle = '#2b2b2f'; g.fillRect(32, 70, 16, 326); g.strokeRect(32, 70, 16, 326); g.fillRect(18, 380, 44, 16);
      const br = g.createLinearGradient(20, 0, 60, 0); br.addColorStop(0, '#8a6726'); br.addColorStop(.5, '#f0cb6a'); br.addColorStop(1, '#6b4e1c');
      g.fillStyle = br; g.beginPath(); g.moveTo(26, 70); g.lineTo(54, 70); g.lineTo(50, 14); g.quadraticCurveTo(40, 2, 30, 14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6b4e1c'; g.fillRect(22, 64, 36, 12); g.strokeRect(22, 64, 36, 12);
      g.strokeStyle = '#a8261d'; g.lineWidth = 3; g.beginPath(); g.moveTo(54, 76); g.lineTo(62, 200); g.stroke();
      g.fillStyle = '#c0302a'; g.fillRect(55, 198, 16, 30); g.strokeStyle = '#1e140c'; g.lineWidth = 2.5; g.strokeRect(55, 198, 16, 30);
    }));
    put('y-points', cvs(120, 360, g => {
      g.fillStyle = '#2b2b2f'; g.fillRect(52, 80, 16, 270); g.strokeRect(52, 80, 16, 270);
      g.fillStyle = '#5a4026'; g.fillRect(20, 336, 80, 20); g.strokeRect(20, 336, 80, 20);
      g.fillStyle = '#c9a23a'; g.fillRect(36, 30, 48, 18); g.strokeRect(36, 30, 48, 18);
      g.strokeStyle = '#2b2b2f'; g.lineWidth = 10; g.beginPath(); g.moveTo(60, 300); g.lineTo(98, 270); g.stroke();
    }));
    put('y-lever', cvs(90, 200, g => {
      g.fillStyle = '#4a4f57'; g.beginPath(); g.arc(45, 184, 36, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = '#5a4026'; g.fillRect(4, 182, 82, 16); g.strokeRect(4, 182, 82, 16);
      g.strokeStyle = '#2b2b2f'; g.lineWidth = 10; g.beginPath(); g.moveTo(45, 184); g.lineTo(56, 40); g.stroke();
      g.fillStyle = '#d8342a'; g.strokeStyle = '#1e140c'; g.lineWidth = 4; g.beginPath(); g.ellipse(57, 30, 12, 24, .1, 0, Math.PI * 2); g.fill(); g.stroke();
    }));
    put('y-platform', cvs(280, 256, g => {
      g.fillStyle = '#8a6038'; g.fillRect(14, 30, 252, 210); g.strokeRect(14, 30, 252, 210);
      g.strokeStyle = 'rgba(40,24,12,.6)'; g.lineWidth = 3; for (let y = 90; y < 240; y += 56) { g.beginPath(); g.moveTo(14, y); g.lineTo(266, y); g.stroke(); }
      for (let x = 98; x < 266; x += 84) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 240); g.stroke(); }
      g.fillStyle = '#6b4a2c'; g.fillRect(0, 22, 280, 14); g.strokeStyle = '#1e140c'; g.lineWidth = 4; g.strokeRect(0, 22, 280, 14);
      g.fillStyle = '#3b2a1a'; for (const x of [20, 250]) g.fillRect(x, 240, 12, 16);
    }));
    const sorterArt = (paint, dark) => cvs(240, 330, g => {
      g.fillStyle = '#2b2b2f'; g.fillRect(30, 300, 26, 28); g.fillRect(184, 300, 26, 28);
      g.fillStyle = paint; g.fillRect(16, 80, 208, 224); g.strokeRect(16, 80, 208, 224);
      g.fillStyle = dark; g.fillRect(16, 80, 208, 22);
      g.fillStyle = '#c9a23a'; g.beginPath(); g.moveTo(60, 80); g.lineTo(180, 80); g.lineTo(150, 22); g.lineTo(90, 22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#1b1712'; for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { g.fillRect(34 + i * 36, 122 + j * 46, 26, 34); }
      g.strokeStyle = '#d8b25a'; g.lineWidth = 3; g.strokeRect(24, 112, 192, 100);
      g.fillStyle = '#d8b25a'; for (const [x, y] of [[26, 92], [214, 92], [26, 292], [214, 292]]) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
    });
    put('y-sorter-old', sorterArt('#4f7fc8', '#335a96')); put('y-sorter-new', sorterArt('#ec8a3c', '#b8622a'));
    put('y-seal', cvs(60, 60, g => { g.fillStyle = '#b3241c'; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 26 : 28; g.lineTo(30 + Math.cos(a) * r, 30 + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 3; g.stroke(); g.fillStyle = '#d8463a'; g.beginPath(); g.arc(30, 30, 15, 0, Math.PI * 2); g.fill(); }));
    put('y-crate', cvs(220, 172, g => {
      g.fillStyle = '#c99a5c'; g.fillRect(10, 10, 200, 152); g.strokeRect(10, 10, 200, 152);
      g.strokeStyle = 'rgba(70,40,16,.7)'; g.lineWidth = 4; for (let y = 48; y < 162; y += 38) { g.beginPath(); g.moveTo(10, y); g.lineTo(210, y); g.stroke(); }
      g.strokeStyle = '#7a5226'; g.lineWidth = 10; g.beginPath(); g.moveTo(16, 156); g.lineTo(204, 16); g.stroke();
      g.strokeStyle = '#1e140c'; g.lineWidth = 5; g.strokeRect(10, 10, 200, 152);
      g.fillStyle = '#4a4f57'; for (const [x, y] of [[10, 10], [186, 10], [10, 138], [186, 138]]) g.fillRect(x, y, 24, 24);
    }));
    put('y-bay', cvs(184, 192, g => {
      g.fillStyle = '#9a6a3a'; g.beginPath(); g.moveTo(8, 60); g.lineTo(176, 40); g.lineTo(176, 70); g.lineTo(8, 84); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6b4a2c'; for (const x of [18, 150]) { g.fillRect(x, 80, 16, 108); g.strokeRect(x, 80, 16, 108); }
      g.fillRect(18, 140, 148, 12); g.strokeRect(18, 140, 148, 12);
      g.strokeStyle = '#2b2b2f'; g.lineWidth = 5; g.beginPath(); g.moveTo(160, 44); g.lineTo(160, 10); g.stroke();
    }));
    put('y-returns', cvs(300, 192, g => {
      g.fillStyle = '#6c737c'; g.fillRect(14, 20, 272, 128); g.strokeRect(14, 20, 272, 128);
      g.strokeStyle = 'rgba(20,24,30,.5)'; g.lineWidth = 3; for (let x = 60; x < 280; x += 46) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 148); g.stroke(); }
      g.strokeStyle = '#e8e2d4'; g.lineWidth = 8; g.beginPath(); g.arc(150, 86, 22, -2.6, 1.6); g.stroke(); g.fillStyle = '#e8e2d4'; g.beginPath(); g.moveTo(118, 58); g.lineTo(142, 62); g.lineTo(124, 80); g.fill();
      g.fillStyle = '#2b2b2f'; g.strokeStyle = '#1e140c'; g.lineWidth = 4; for (const x of [62, 238]) { g.beginPath(); g.arc(x, 160, 26, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }));
    put('y-tower', cvs(240, 560, g => {
      g.strokeStyle = '#2b2b2f'; g.lineWidth = 10; for (const [a, b] of [[40, 70], [200, 170], [70, 40], [170, 200]]) { g.beginPath(); g.moveTo(a, 556); g.lineTo(b, 210); g.stroke(); }
      g.lineWidth = 5; for (let y = 300; y < 556; y += 90) { g.beginPath(); g.moveTo(52, y); g.lineTo(188, y + 70); g.moveTo(188, y); g.lineTo(52, y + 70); g.stroke(); }
      g.strokeStyle = '#1e140c'; g.fillStyle = '#7a5532'; g.fillRect(20, 60, 200, 160); g.strokeRect(20, 60, 200, 160);
      g.strokeStyle = 'rgba(40,24,12,.6)'; g.lineWidth = 3; for (let x = 44; x < 220; x += 24) { g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 220); g.stroke(); }
      g.strokeStyle = '#2b2b2f'; g.lineWidth = 7; for (const y of [86, 194]) { g.beginPath(); g.moveTo(20, y); g.lineTo(220, y); g.stroke(); }
      g.strokeStyle = '#1e140c'; g.lineWidth = 5; g.fillStyle = '#4b4f5c'; g.beginPath(); g.moveTo(10, 62); g.lineTo(120, 8); g.lineTo(230, 62); g.closePath(); g.fill(); g.stroke();
    }));
    put('y-mast', cvs(100, 600, g => {
      g.fillStyle = '#2b2b2f'; g.fillRect(42, 70, 16, 526); g.strokeRect(42, 70, 16, 526);
      g.strokeStyle = '#4a4f57'; g.lineWidth = 3; for (let y = 120; y < 590; y += 26) { g.beginPath(); g.moveTo(30, y); g.lineTo(42, y); g.stroke(); } g.beginPath(); g.moveTo(30, 110); g.lineTo(30, 596); g.stroke();
      g.strokeStyle = '#1e140c'; g.lineWidth = 5; g.fillStyle = '#1e1e22'; g.beginPath(); g.arc(50, 60, 46, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#2b2b2f'; g.beginPath(); g.arc(50, 52, 50, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(96, 44); g.fill();
    }));
    put('y-office', cvs(260, 280, g => {
      g.fillStyle = '#a8794a'; g.fillRect(24, 90, 212, 186); g.strokeRect(24, 90, 212, 186);
      g.strokeStyle = 'rgba(60,34,14,.5)'; g.lineWidth = 3; for (let x = 48; x < 236; x += 24) { g.beginPath(); g.moveTo(x, 90); g.lineTo(x, 276); g.stroke(); }
      g.strokeStyle = '#1e140c'; g.lineWidth = 5; g.fillStyle = '#5a3a2a'; g.beginPath(); g.moveTo(6, 96); g.lineTo(130, 16); g.lineTo(254, 96); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#f2d790'; g.fillRect(70, 126, 120, 70); g.strokeRect(70, 126, 120, 70); g.fillStyle = '#6b4a2c'; g.fillRect(62, 196, 136, 14); g.strokeRect(62, 196, 136, 14);
      g.fillStyle = '#f4ead2'; g.fillRect(200, 214, 28, 38); g.lineWidth = 3; g.strokeRect(200, 214, 28, 38);
      g.fillStyle = '#3b2a1a'; g.fillRect(190, 26, 18, 40); g.strokeRect(190, 26, 18, 40);
    }));
    put('y-siding', cvs(380, 60, g => {
      g.fillStyle = '#3d2c20'; for (let x = 20; x < 370; x += 26) g.fillRect(x, 34, 14, 14);
      g.fillStyle = '#b8bcc4'; g.fillRect(0, 28, 380, 6);
      g.fillStyle = '#c0302a'; g.fillRect(4, 6, 24, 40); g.strokeRect(4, 6, 24, 40); g.fillStyle = '#e8e2d4'; g.fillRect(8, 14, 16, 6);
    }));
    put('y-trolley', cvs(100, 60, g => { g.fillStyle = '#8a6038'; g.fillRect(8, 14, 84, 22); g.strokeRect(8, 14, 84, 22); g.fillStyle = '#2b2b2f'; for (const x of [24, 76]) { g.beginPath(); g.arc(x, 44, 12, 0, Math.PI * 2); g.fill(); g.stroke(); } g.strokeStyle = '#2b2b2f'; g.lineWidth = 5; g.beginPath(); g.moveTo(84, 14); g.lineTo(96, 0); g.stroke(); }));
    put('y-engine', cvs(400, 280, g => {
      g.fillStyle = '#23252b'; g.fillRect(20, 120, 300, 110); g.strokeRect(20, 120, 300, 110);
      g.fillRect(230, 40, 110, 190); g.strokeRect(230, 40, 110, 190); g.fillStyle = '#f2d790'; g.fillRect(250, 66, 64, 50); g.strokeRect(250, 66, 64, 50);
      g.fillStyle = '#23252b'; g.fillRect(50, 60, 36, 64); g.strokeRect(50, 60, 36, 64); g.fillStyle = '#c9a23a'; g.beginPath(); g.ellipse(150, 118, 26, 20, 0, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = '#c0302a'; g.fillRect(4, 196, 24, 26); g.strokeRect(4, 196, 24, 26);
      g.fillStyle = '#3a3d45'; for (const x of [80, 170, 270]) { g.beginPath(); g.arc(x, 236, 34, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }));
    put('y-flat', cvs(380, 100, g => { g.fillStyle = '#7a5532'; g.fillRect(6, 20, 368, 30); g.strokeRect(6, 20, 368, 30); g.fillStyle = '#3a3d45'; for (const x of [70, 310]) { g.beginPath(); g.arc(x, 66, 28, 0, Math.PI * 2); g.fill(); g.stroke(); } }));
    put('y-conveyor', cvs(640, 140, g => {
      g.fillStyle = '#6b4a2c'; g.fillRect(0, 34, 640, 26); g.strokeRect(0, 34, 640, 26);
      g.fillStyle = '#c8ccd4'; for (let x = 10; x < 640; x += 30) { g.beginPath(); g.arc(x, 34, 9, 0, Math.PI * 2); g.fill(); g.lineWidth = 2.5; g.stroke(); }
      g.lineWidth = 5; g.fillStyle = '#4a3420'; for (let x = 30; x < 640; x += 150) { g.fillRect(x, 60, 14, 80); g.strokeRect(x, 60, 14, 80); }
    }));
    put('y-gate', cvs(80, 340, g => { g.fillStyle = '#7a5532'; g.fillRect(10, 0, 20, 340); g.strokeRect(10, 0, 20, 340); g.fillRect(50, 0, 20, 340); g.strokeRect(50, 0, 20, 340); g.fillRect(0, 40, 80, 18); g.strokeRect(0, 40, 80, 18); }));
    // Belt icons.
    put('y-i-board', cvs(150, 150, g => { g.fillStyle = '#2a2622'; g.fillRect(10, 40, 130, 70); g.strokeRect(10, 40, 130, 70); g.fillStyle = '#ffe6a8'; for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { g.fillStyle = r ? '#9fe0a8' : '#ffe6a8'; g.fillRect(18 + i * 19, 52 + r * 28, 15, 18); } g.strokeStyle = '#3a3026'; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 0); g.lineTo(40, 40); g.moveTo(110, 0); g.lineTo(110, 40); g.stroke(); }));
    put('y-i-wire', cvs(150, 150, g => { g.fillStyle = '#2b2b2f'; g.fillRect(66, 50, 14, 96); g.beginPath(); g.arc(73, 40, 30, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#38d26b'; g.beginPath(); g.arc(73, 40, 18, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#e8c04a'; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 90); g.bezierCurveTo(120, 80, 110, 130, 146, 120); g.stroke(); }));
    put('y-i-tests', cvs(150, 150, g => { g.fillStyle = '#b8bcc4'; g.fillRect(0, 110, 150, 8); g.fillStyle = '#c0302a'; g.fillRect(8, 74, 22, 40); g.strokeRect(8, 74, 22, 40); g.fillStyle = '#8a6038'; g.fillRect(50, 80, 80, 22); g.strokeRect(50, 80, 80, 22); g.fillStyle = '#9ccaf2'; g.save(); g.translate(90, 56); g.rotate(-.15); g.fillRect(-26, -18, 52, 36); g.strokeRect(-26, -18, 52, 36); g.restore(); }));
    put('y-i-manifest', cvs(150, 150, g => { g.fillStyle = '#8a5a2c'; g.fillRect(28, 14, 94, 128); g.strokeRect(28, 14, 94, 128); g.fillStyle = '#f7f0dc'; g.fillRect(38, 30, 74, 104); g.fillStyle = '#c9a23a'; g.fillRect(56, 6, 38, 16); g.strokeRect(56, 6, 38, 16); g.fillStyle = '#2a1d10'; g.font = '800 13px sans-serif'; for (let i = 0; i < 4; i++) { g.fillRect(44, 44 + i * 20, 40, 4); } g.fillStyle = '#c0302a'; g.fillRect(70, 104, 30, 10); }));
  }
  // ==== end claim 9 ====

  idLetters();

  // ---- Hands ----
  function toStage(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - ox) / scale, (e.clientY - r.top - oy) / scale]; }
  function tryPlace(tool, where) {
    if (V().yard && yardPlace(tool, where)) return; // claim 9: blueprint changes and switches
    // A placed tool with a use: the retry dial turns, the crate replays a refund for a coin.
    if (V()[tool] && USE_LABEL[tool]) {
      const u = R.turn(V(), tool), at = where || [L.W / 2, beltRect()[1] - 20];
      if (u === 'coins') { popAt(at, 'No coins', '#ffdc78', 28); if (M.coins < 0) say('debt', 'angry', LINES.debt); }
      else if (u === 'empty') popAt(at, 'Crate empty', '#e8dcc4', 26);
      return;
    }
    const why = R.canPlace(V(), tool);
    if (why === 'needs') { popAt(where || [L.W / 2, beltRect()[1] - 20], 'Needs the ' + TOOL_LABEL[R.TOOLS[tool].needs].toLowerCase() + ' first', '#ffdc78', 26); return; }
    if (why === 'coins' && M.coins < 0) say('debt', 'angry', LINES.debt);
    if (why === 'locked') { say('bellLocked', 'neutral', LINES.bellLocked); said.bellLocked = 0; return; }
    if (why === 'coins') { popAt(where || [L.W / 2, beltRect()[1] - 20], 'No coins', '#ffdc78', 28); return; }
    if (why) return;
    R.place(V(), tool);
    sfx(tool === 'reserve' || tool === 'ondemand' ? 'rLock' : tool === 'bell' ? 'rBell' : tool === 'shard' ? 'rStamp' : 'rClank');
    say(tool, 'neutral', LINES[tool]);
    if (tool === 'bin' && !V().rack) say('binNoRack', 'neutral', LINES.binNoRack);
  }
  cv.addEventListener('pointerdown', e => {
    if (qEl.classList.contains('on')) return;
    const p = toStage(e);
    if (M.review && inRect(p, L.inset.r)) { switchRoom(); return; }
    // In the cellar: tap a review question to answer it, or one of the intern's to check it.
    if (view === 'review' && M.review) {
      let hit = null; withRoom('review', () => { hit = askList().slice(0, L.asks.max).find(k => Math.hypot(p[0] - askPos(k)[0], p[1] - askPos(k)[1]) < 40); });
      if (hit) { openReview(hit, hit.phase === 'ask' ? 'ask' : 'check'); return; }
    }
    if (view === 'main' && L.yard && yardDown(p, e)) return; // claim 9: the yard's levers, dial, board and crates
    for (let i = 0; i < TOOLS.length; i++) if (inRect(p, slotRect(i))) {
      drag = { tool: tool(i), x: p[0], y: p[1], sx: p[0], sy: p[1], moved: false };
      cv.setPointerCapture(e.pointerId); return;
    }
    if (Math.hypot(p[0] - L.lever.x, p[1] - L.lever.y) < L.lever.r) { R.start(S); return; }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const p = toStage(e); drag.x = p[0]; drag.y = p[1];
    if (Math.hypot(p[0] - drag.sx, p[1] - drag.sy) > 12) drag.moved = true;
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved) { tryPlace(d.tool, [d.x, d.y - 60]); return; }
    const r = spot(d.tool);
    if (!r || inRect([d.x, d.y], r, 90)) tryPlace(d.tool, [d.x, d.y]);
  });
  cv.addEventListener('pointercancel', () => { drag = null; });
  addEventListener('keydown', e => {
    // M (or V, as in the main game) mutes and unmutes everything.
    if ((e.key === 'm' || e.key === 'v') && AU) { AU.toggleMute(); return; }
    if ((e.key === 'Tab' || e.key === 'q' || e.key === 'Q') && M.review && !qEl.classList.contains('on')) { e.preventDefault(); switchRoom(); return; }
    if (letterOpen || reviewOpen) { const n = +e.key, b = qEl.querySelectorAll(reviewOpen && reviewOpen.mode === 'check' ? '.lt-verdict button' : '.lt-opts button')[n - 1]; if (b) b.click(); return; }
    if (qEl.classList.contains('orders')) { const b = qEl.querySelectorAll('.no-card')[+e.key - 1]; if (b) b.click(); return; }
    if (qEl.classList.contains('on')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); R.start(S); }
    const n = +e.key; if (n >= 1 && n <= V().belt.length) tryPlace(tool(n - 1));
  });

  // ---- Size: the stage fits the screen; the backdrop fills the rest ----
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const tall = qs.has('tall') || w < h * 0.85, dock = S && DOCK.has(S.claim), vault = S && VAULT.has(S.claim);
    LM = S && YARD.has(S.claim) ? (tall ? YARD_TALL : YARD_WIDE) : dock ? (tall ? DOCK_TALL : DOCK_WIDE) : vault ? (tall ? VAULT_TALL : VAULT_WIDE) : (tall ? TALL : WIDE);
    LR = tall ? REVIEW_TALL : REVIEW_WIDE;
    if (M) home(); else L = LM;
    scale = Math.min(w / L.W, h / L.H); ox = (w - L.W * scale) / 2; oy = (h - L.H * scale) / 2;
  }
  addEventListener('resize', resize);
  // Every claim opens on its pick. ?claim=bell starts on claim 2; ?orders=cold,shelf pins those and skips the pick.
  resize();
  const first = qs.get('claim') || 'rush';
  if (qs.get('orders')) run.orders = qs.get('orders').split(',').filter(o => ORDER[o]);
  reset(SEED, first);
  if (!qs.get('orders')) showPick(first);
  // For tools/rush_check.js: where things are on screen, in CSS pixels.
  const toClient = p => [ox + p[0] * scale, oy + p[1] * scale];
  window.SD_RUSH = {
    get S() { return M; }, get run() { return run; }, get view() { return view; }, switchRoom, reset, showPick, place: tryPlace, start: () => R.start(M), turn: t => R.turn(M, t),
    at: { slot: i => { const r = slotRect(i); return toClient([r[0] + r[2] / 2, r[1] + r[3] / 2]); }, spot: t => { const r = spot(t); return toClient([r[0] + r[2] / 2, r[1] + r[3] / 2]); }, lever: () => toClient([L.lever.x, L.lever.y]), inset: () => { const r = L.inset.r; return toClient([r[0] + r[2] / 2, r[1] + r[3] / 2]); },
      ask: id => { let q = null; withRoom('review', () => { const k = M.review.tickets.find(x => x.id === id); q = k && toClient(askPos(k)); }); return q; } }
  };
  // ==== Claim 9: for tools/rush_check_yard.js, where the yard's handles are (CSS pixels) ====
  SD_RUSH.yard = { get ui() { return yUI; }, open: card => openInspection(card),
    at: { rlever: () => toClient([L.rlever.x, L.rlever.y - L.rlever.h * .55]), dial: () => toClient(L.points.dial), board: () => toClient([L.board.x, L.board.y]),
      mast: () => toClient([L.mast.x, L.mast.y - L.mast.h / 2]), office: () => toClient([L.office.x, L.office.y - L.office.h / 2]),
      siding: () => toClient([(L.siding.x0 + L.siding.x1) / 2, L.siding.y - 20]), hotfix: () => { const p = hotfixCratePos(); return p && toClient(p); } } };
  // ==== end claim 9 ====
  load().then(() => requestAnimationFrame(frame));
})();
