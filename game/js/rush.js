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
    if (S.claim === 'hot') {
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
  function say(key, mood, text, secs) {
    if (said[key]) return; said[key] = 1;
    sayQ.push({ mood, text, secs: secs || Math.max(4.5, text.length / 16) });
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
    const pool = shuffle(R.ORDERS.filter(o => !run.orders.includes(o) && (!ORDER[o].needs || run.orders.includes(ORDER[o].needs))), Math.random);
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
    withRoom(view, () => drawRoom(drag && drag.moved ? drag.tool : null, false));
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
    withRoom(other, () => { const bg = IMG[L.bg]; if (bg) cx.drawImage(bg, 0, 0, L.W, L.H); drawRoom(null, true); });
    cx.restore();
    const pulse = .5 + .5 * Math.sin(performance.now() / 160);
    cx.save(); rrect(r[0], r[1], r[2], r[3], 12); cx.lineWidth = al ? 5 + pulse * 3 : 4;
    cx.strokeStyle = al ? `rgba(255,${80 + pulse * 40},60,.95)` : 'rgba(214,178,84,.95)'; cx.stroke();
    if (al) { cx.shadowColor = 'rgba(255,70,50,.9)'; cx.shadowBlur = 18 + pulse * 10; cx.stroke(); }
    cx.restore();
    plaque((other === 'review' ? 'Cellar · review' : 'Vault') + ' · tap to switch', r[0] + r[2] / 2, r[1] - 14 * L.fs);
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
  idLetters();

  // ---- Hands ----
  function toStage(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - ox) / scale, (e.clientY - r.top - oy) / scale]; }
  function tryPlace(tool, where) {
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
    LM = dock ? (tall ? DOCK_TALL : DOCK_WIDE) : vault ? (tall ? VAULT_TALL : VAULT_WIDE) : (tall ? TALL : WIDE);
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
  load().then(() => requestAnimationFrame(frame));
})();
