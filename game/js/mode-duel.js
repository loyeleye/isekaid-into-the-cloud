// The Look-Alike Cup (Counter-Pick Duel, storyboard v7, Nov 16): the board-game mode. After the market shuts,
// Kagemaru plays one game a night with one regular on a felt board of nine squares. Name the real service on a card
// and you place a stone; get it wrong and he takes the square he wants most. Three in a line wins a board.
//   - Cards: CASE (a bank question, exam style) or COMPARE (a formats-engine Compare item, js/qformats.js: name the
//     service from memory, then the table opens for the row that decided it). Each board's deck is 6 cards:
//     2 Compare, 2 lead cases, 1 partner case and 1 due case. A hand of 3, at most one missed or Wall card per hand
//     and per refill. A card held 4 turns (DU.HOLD) is overdue, and so is a missed or Wall card in the board's last
//     2 casts (DU.LASTW): Kagemaru casts it on his square, chalk or not. (Sim tuning, Nov 16: v7 said 3 turns and 1
//     Compare from night 4; with those the safest route dodged a quarter of weak cards and the board matched the
//     plain tally on 95% of boards. Hard-squares tuning, Nov 16: at 2 turns every cast after a board's second was
//     overdue, so he chose two squares in three and where you placed stones didn't matter; see below.)
//   - Hard squares (from night 1, with the board itself): the centre and the four corners are chalked with one of the
//     board's look-alike sets (DU.SETS: the rivals' lead sets and the partner sets, by their own topic matchers),
//     drawn from the board's own cards: missed and Wall cards' sets first, then the lead set, the partner set and
//     any other set dealt; the centre takes the first and the corners go round the list (DU.label). A stone settles
//     on a chalked square only with a card of that set; edges take any card (and when no square left fits, any
//     empty square does: never a dead hand). His pieces go anywhere. No line by the last cast: the count, where a
//     chalked square counts 4 (DU.HARDW). Taught by first use: a card tried on the wrong chalk won't settle, and one
//     line says why. A card's set shows on its face. Boards saved before this have no chalk and play as before.
//   - His next square is shown face up before you cast: his hand over the square, with the words "his next"
//     (DU.nextSq, b.next: DU.rule with any tie rolled ahead and kept, so the square shown is the one he takes). The
//     cast sheet names it, and a Parry is a visible choice: "Parry the <square> and cast" or "Cast, keep the Parry".
//   - Tuning (tools/duel_squares_check.js; honest confidence, a good RNG, 2,000 nights a cell; double or halve one
//     number at a time). Greedy placement's lead over random in Cup won at p = 0.6 / 0.7, in points: chalk alone
//     +3 / +3; HOLD 2 -> 4, +8 / +1; HARDW 1 -> 2, +10 / +11; LASTW 1 -> 2 (at HOLD 4 the safest route had slipped
//     under 80% of weak cards faced), +12 / +10; HARDW 2 -> 4, +11 / +11. Now Cup won at p = 0.6 / 0.7 / 0.8: greedy
//     43 / 62 / 82%, random 32 / 51 / 71%. (Halving NCMP to 1 also widened it, but pushed the longest nights to
//     19.8 minutes; kept at 2.)
//   - A board won with casts to spare pays +1 a cast left, so dragging a board out never pays.
//   - His rule (printed under the board, DU.rule): his winning square, else block your two-in-a-line, else a square
//     that gives him two in a line, else the square on the most lines he can still win. Ties break at random, rolled
//     before you cast (above).
//   - A case miss: he takes his square, unless a Parry was raised. A Compare hit: your stone, then he takes his square
//     too (a trade). A Compare name and row both right: a spark; 2 sparks make a Parry (from night 2, hold at most 2).
//   - The unpaid tab: your line doesn't win while you hold a missed or Wall card.
//   - A miss comes back changed (a twin with a different right answer, or the Compare item's sibling or linked case),
//     tonight 1 to 3 cards later if there's room, otherwise first tomorrow.
//   - The night: board 1 (pick 1 of 2 rivals), board 2 (the loser counter-picks), and at 1–1 the Last Stand: 3 cases
//     from tonight's misses, first to 2. Nights 1 and 2 are one board each (one new rule a night).
//   - A clock in minutes (paused while the tab is hidden): board 2 is 4 casts if it starts after minute 6, and after
//     minute 14 the Last Stand is one sudden-death card.
//   - Saves after every step (S.save.duel). Record, pins and calibration count cases only.
// Host: Kagemaru. Barks have no numbers and no AWS claims; the contrast line is always the plain verdict.
(function () {
  if (!SD.modes) return;
  const M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam;
  const esc = s => U.esc(s);
  const ID = 'duel', TITLE = 'THE LOOK-ALIKE CUP';
  const DU = SD.duel = {};
  const sv = () => S.save;
  const store = () => {
    const d = sv().duel = sv().duel || {};
    ['rec', 'pins', 'cmp'].forEach(k => { d[k] = d[k] || {}; });
    d.carry = d.carry || []; d.nights = d.nights | 0;
    return d;
  };
  const night = () => store().night || null;
  // Music (Mureka, Ladi's account, Nov 15): the table under the board, a tenser loop for the Last Stand, a short sting
  // when the Cup is won. Whatever was
  // playing before the night comes back when you stand up.
  const AU = () => (SD.audio && SD.audio.music ? SD.audio : null);
  if (AU() && SD.audio.add) SD.audio.add({ songs: { duel: 'm-duel-table', duelbill: 'm-duel-bill', duellast: 'm-duel-last' }, jingles: { duelcup: 'j-duel-cup' } });
  let before = null;
  const tune = name => { const a = AU(); if (!a) return; if (before === null) before = a.loopName && !/^duel/.test(a.loopName) ? a.loopName : ''; a.music(name); };
  const untune = () => { const a = AU(); if (!a || before === null) return; a.music(before || null); before = null; };
  const today = () => new Date().toDateString();

  // ---- Rivals (by exam domain) and partner sets ----
  const text = q => [q.q].concat(q.opts || [], (q.items || []).map(i => i.t)).join(' ');
  const topic = (...t) => q => t.includes(String(q.topic || '').toLowerCase());
  const rx = r => q => r.test(text(q));
  const rightText = q => (q.type === 'mc' ? (q.opts || [])[q.a] || '' : (q.items || []).filter(i => i.ok).map(i => i.t).join(' '));
  const OFF = ['dva-4-125', 'dva-2-315', 'dva-3-213', 'dva-3-933', 'saa-2-201', 'dva-1-109'];
  const C = n => 'fmt-compare-' + String(n).padStart(2, '0');
  DU.RIVALS = [
    { id: 'dq', name: 'Dupli-Queue', dom: 1, w: 32, what: 'SQS, SNS, EventBridge, Kinesis. Mostly queue settings, some look-alikes.',
      match: q => (topic('sqs', 'sns', 'eventbridge', 'kinesis')(q) || q.id === 'dva-1-965') && q.id !== 'dva-4-961',
      fam: [/Kinesis/, /\bSNS\b/, /EventBridge/, /\bSQS\b/], cmp: [1, 3, 4, 20, 22].map(C), partner: 'ddb' },
    { id: 'kr', name: 'Keyring', dom: 2, w: 26, what: 'Mostly KMS key handling, some Secrets Manager vs Parameter Store.',
      match: topic('kms', 'secrets', 'ssm'), fam: [/Secrets Manager/, /Parameter Store|SecureString/, /\bKMS\b|key policy|data key/i],
      cmp: [6, 7, 13, 17].map(C), partner: 'dq' },
    { id: 'sc', name: 'Shift Change', dom: 3, w: 24, what: 'Deployment strategies: CodeDeploy configs and Beanstalk policies.',
      match: rx(/\b(?:canary|linear|all[- ]at[- ]once|blue\/green|immutable|rolling)\b/i),
      fam: [/canary/i, /linear/i, /all[- ]at[- ]once/i, /immutable/i, /rolling with/i, /rolling/i, /traffic splitting/i, /blue\/green/i],
      cmp: [8, 9, 10, 11].map(C), partner: 'alias' },
    { id: 'tw', name: 'Three Watchers', dom: 4, w: 18, what: 'CloudTrail vs CloudWatch vs X-Ray, mostly cases.',
      match: q => topic('cloudtrail', 'cloudwatch', 'xray')(q) || q.id === 'dva-4-961', fam: [/CloudTrail/, /X-Ray/, /CloudWatch/],
      cmp: [21].map(C), partner: 'kk' }
  ];
  DU.PARTNERS = {
    ddb: { name: 'DynamoDB', match: q => topic('dynamodb')(q) && E().domainOf(q) === 1 },
    alias: { name: 'Lambda versions and aliases', match: q => topic('lambda', 'codedeploy', 'sam')(q) && /\balias(es)?\b/i.test(text(q)) },
    kk: { name: 'Kept Kettles (reserved vs provisioned concurrency)', match: rx(/\b(?:reserved|provisioned) concurrency\b/i) }
  };
  const rival = id => DU.RIVALS.find(r => r.id === id);
  const partnerOf = r => (r.partner === 'dq' ? { name: 'Dupli-Queue', match: rival('dq').match } : DU.PARTNERS[r.partner]);
  const inRival = (r, q) => !!q && !OFF.includes(q.id) && r.match(q);
  // Look-alike sets, for the hard squares: each rival's lead set and each partner set, by their own topic matchers.
  // short: the label printed on a hard square (no new AWS facts, only the names above).
  DU.SETS = { dq: 'Dupli-Queue', kr: 'Keyring', sc: 'Shift Change', tw: 'Watchers', ddb: 'DynamoDB', alias: 'Aliases', kk: 'Kettles' };
  DU.setName = id => (rival(id) ? rival(id).name : DU.PARTNERS[id] ? DU.PARTNERS[id].name : '');
  // A case's set: the first rival whose matcher takes it, else the first partner set.
  DU.setOfQ = q => {
    if (!q) return null;
    const r = DU.RIVALS.find(x => inRival(x, q));
    if (r) return r.id;
    const p = Object.keys(DU.PARTNERS).find(k => !OFF.includes(q.id) && DU.PARTNERS[k].match(q));
    return p || null;
  };
  // Linked cases (AWS review, Nov 16): verified bank questions on each Compare item's contrast, least similar first.
  DU.LINKS = {
    [C(1)]: ['dva-1-979', 'dva-1-965'], [C(3)]: ['dva-1-219', 'dva-1-06'], [C(4)]: ['dva-1-05', 'dva-1-978'],
    [C(20)]: ['dva-1-118', 'dva-1-116'], [C(22)]: ['dva-1-02', 'dva-1-216'], [C(6)]: ['dva-2-11', 'dva-2-953'],
    [C(7)]: ['dva-2-224'], [C(13)]: ['dva-2-229'], [C(17)]: ['dva-2-201', 'dva-2-951'], [C(8)]: ['dva-3-01', 'dva-3-808'],
    [C(9)]: ['dva-3-209'], [C(10)]: ['dva-3-215', 'dva-3-951'], [C(11)]: ['dva-3-214', 'dva-3-918'], [C(21)]: ['dva-4-962', 'dva-4-12']
  };
  DU.SIBLING = { [C(3)]: C(4), [C(4)]: C(3), [C(6)]: C(7), [C(7)]: C(6), [C(8)]: C(9), [C(9)]: C(8), [C(10)]: C(11), [C(11)]: C(10) };
  const PRACTICE = [C(12), C(18)];   // night 1's practice Compare, from outside the roster

  // ---- The board and Kagemaru's rule ----
  DU.LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  DU.SQ = ['top-left', 'top-middle', 'top-right', 'left edge', 'centre', 'right edge', 'bottom-left', 'bottom-middle', 'bottom-right'];
  const cnt = (b, l, w) => l.filter(i => b[i] === w).length;
  // { step: 1 win, 2 block, 3 threat, 4 most lines, squares: the tied squares }
  DU.rule = function (b) {
    const empty = b.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    if (!empty.length) return { step: 0, squares: [] };
    const on = (i, f) => DU.LINES.some(l => l.includes(i) && f(l));
    const win = empty.filter(i => on(i, l => cnt(b, l, 'him') === 2 && cnt(b, l, 'me') === 0));
    if (win.length) return { step: 1, squares: win };
    const block = empty.filter(i => on(i, l => cnt(b, l, 'me') === 2 && cnt(b, l, 'him') === 0));
    if (block.length) return { step: 2, squares: block };
    const threat = empty.filter(i => on(i, l => cnt(b, l, 'him') === 1 && cnt(b, l, 'me') === 0));
    const live = i => DU.LINES.filter(l => l.includes(i) && cnt(b, l, 'me') === 0).length;
    const pool = threat.length ? threat : empty, top = Math.max(...pool.map(live));
    return { step: threat.length ? 3 : 4, squares: pool.filter(i => live(i) === top) };
  };
  DU.STEP = ['', 'his winning square', 'a square that blocks your two in a line', 'a square that gives him two in a line', 'the square on the most lines he can still win'];
  DU.line = (b, w) => DU.LINES.find(l => cnt(b, l, w) === 3) || null;

  // ---- Lines (Story review, Nov 16: soft, helpful, sinister; no numbers or AWS claims; "Ah ha ha" at most once a board) ----
  const SAY = {
    walkup: 'Shop\'s shut. I play one game a night, with one regular. Tonight that\'s you. Sit. It\'s free. Most things are, at first.',
    sit: 'Three look-alikes in your hand. Name the real thing and the square is yours. Pick a look-alike, and I\'ll help myself.',
    practice: 'A practice round. On the house. I\'m told it builds trust.',
    move: 'Mine, then. I\'ll take the one that hurts.',
    trade: 'Right. And now my turn. Nothing\'s free at this table.',
    tab: 'Lovely line. You still owe me a card, though.',
    overdue: 'You\'ve been holding that one a while. Let me help. I\'m always helpful.',
    hit: 'Fine. Keep it. I have more.',
    threat: 'Oh. You\'ve seen it. Clever customer.',
    parryHold: 'A shield? How sensible. I\'ll pretend I didn\'t see it.',
    parryWaste: 'Insured, and right. Thank you for the premium.',
    sureMiss: 'You were Sure. Ah ha ha. Let me hang that on your Wall for you.',
    rowMiss: 'Right shelf. Wrong reason. I\'ll allow it. This once.',
    back: 'Remember this one? It\'s had a little work done.',
    tie: 'Ties go to the house. I am the house.',
    myPick: 'Your pick? Bold. Or desperate. They look alike from here.',
    hisPick: 'My pick. I know exactly what you\'re bad at. I keep a ledger.',
    last: 'Three cards. I picked them out for you myself. You\'ll recognise them.',
    closing: 'Closing time. One card. Make it a good one.',
    pin: 'A pin. Free. Ah ha ha. No, that one hurt.',
    sold: 'Sold out? Of my own stock? I\'ll restock. Dearer.',
    won: 'Won, have you. How dull. I\'ll have to start pricing you properly.',
    wonGuess: 'A guess. Ah ha ha. Luck is the one thing I can\'t sell you.',
    lost: 'Come back tomorrow. The stock rotates. Your mistakes don\'t. Ah ha ha.',
    boardHim: 'That one\'s mine. Shall we go again?',
    boardMe: 'Hm. You checked the label. How rude.',
    resume: 'Oh, you\'re back. I kept your seat. And your cards, exactly as you left them.'
  };

  // ---- Cards ----
  const find = id => (SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : E().find(id));
  const conceptOf = q => (q && (q.c || (SD.today && SD.today.conceptOf ? SD.today.conceptOf(q) : null))) || null;
  const onWall = id => (Array.isArray(sv().wall) ? sv().wall : []).some(w => w.id === id || ((SD.twins && SD.twins[w.id]) || []).includes(id));
  function caseTag(q) {
    if (onWall(q.id)) return 'wall';
    const c = conceptOf(q), x = c && sv().concepts && sv().concepts[c], h = x && x.hist && x.hist[x.hist.length - 1];
    return !h ? 'new' : h.ok ? 'right' : 'missed';
  }
  function cmpTag(id) { const r = store().cmp[id]; return !r || !r.n ? 'new' : r.last ? 'right' : 'missed'; }
  const TAG = { new: 'New', right: 'Right last time', missed: 'Missed last time', wall: 'On your Wall' };
  const weakTag = t => t === 'missed' || t === 'wall';
  DU.caseCard = (q, rid, extra) => Object.assign({ k: 'case', id: q.id, r: rid, tag: caseTag(q), held: 0, set: DU.setOfQ(q) }, extra || {});
  DU.cmpCard = (id, rid, extra) => Object.assign({ k: 'cmp', id, r: rid, tag: cmpTag(id), held: 0, set: rival(rid) ? rid : null }, extra || {});
  const isWeak = c => !!c && (c.ret || weakTag(c.tag));
  // A card's look-alike set (a card saved before the hard squares has none stored: worked out from its question).
  DU.cardSet = c => {
    if (!c) return null;
    if (c.set !== undefined) return c.set;
    return c.k === 'cmp' ? (rival(c.r) ? c.r : null) : DU.setOfQ(find(c.id));
  };

  // A miss's return: a twin whose right answer is a different service or setting (a flip), never the same answer.
  DU.flipTwin = function (q, r, avoid) {
    const ids = ((SD.twins && SD.twins[q.id]) || []).filter(id => !avoid.includes(id));
    const fam = t => (r ? r.fam.findIndex(f => f.test(t)) : -1);
    const mine = rightText(q), fq = fam(mine);
    const list = ids.map(id => E().find(id)).filter(t => t && E().allowed(t) && rightText(t) !== mine && (fq < 0 || fam(rightText(t)) !== fq));
    return list[0] || null;
  };
  // A Compare miss's return: its sibling grid, else a linked case.
  DU.cmpReturn = function (id, avoid) {
    const sib = DU.SIBLING[id];
    if (sib && !avoid.includes(sib) && M.fmtItem(sib) && !(store().cmp[sib] || {}).retired) return { k: 'cmp', id: sib };
    const l = (DU.LINKS[id] || []).find(x => !avoid.includes(x) && E().find(x) && E().allowed(E().find(x)));
    return l ? { k: 'case', id: l } : null;
  };

  // ---- A night: the state machine the UI and the simulator share ----
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const rnd = s => (s && s.rng) || Math.random;
  const pickOne = (a, R) => a[Math.floor(R() * a.length)];
  DU.recRate = id => { const r = store().rec[id]; return r && r[1] >= 6 ? r[0] / r[1] : null; };
  // Two offers, weighted by exam domain; a rival you're under 50% on is swapped for another while one is left.
  DU.offers = function (s, not) {
    const R = rnd(s), pool = DU.RIVALS.filter(r => !(not || []).includes(r.id));
    const ok = r => s.sim || DU.recRate(r.id) === null || DU.recRate(r.id) >= 0.5;
    const out = [];
    for (let k = 0; k < 2 && pool.length; k++) {
      const pref = pool.filter(r => !out.includes(r) && ok(r)), from = pref.length ? pref : pool.filter(r => !out.includes(r));
      if (!from.length) break;
      let x = R() * from.reduce((a, r) => a + r.w, 0);
      out.push(from.find(r => (x -= r.w) < 0) || from[0]);
    }
    return out.map(r => r.id);
  };
  DU.newNight = function (opts) {
    opts = opts || {};
    const st = store(), n = opts.sim ? (opts.night || 4) : st.nights + 1;
    const s = {
      v: 1, sim: !!opts.sim, rng: opts.rng, n, t0: Date.now(), el: 0, tick: Date.now(), secs: 0,
      phase: 'pick', boards: [], score: [0, 0], b: null, parry: n >= 2 ? DU.PARRY0 : 0, sparks: 0, tally: M.newTally(),
      used: [], log: [], pend: [], left: [], cmpTonight: [], linkFor: {}, msg: n === 1 ? SAY.walkup : SAY.sit, since: '',
      edge: opts.sim ? !!opts.edge : !!st.cupLast, offers: null, stand: null, faced: [0, 0], parries: [0, 0],
      returns: [0, 0], cmpStat: [0, 0, 0], practiced: n !== 1, weakIn: 0, weakHand: 0
    };
    s.offers = DU.offers(s);
    if (!s.sim) { st.night = s; S.persist(); }
    return s;
  };
  DU.boardsTonight = s => (s.n >= 3 ? 2 : 1);
  // The tuned numbers (sim, tools/duel_check.js and tools/duel_squares_check.js): Compare cards a deck, casts a board,
  // board 2's casts when it starts after DU.LATE minutes, and the Parries a night starts with (from night 2).
  DU.NCMP = 2; DU.CAP = 6; DU.CAP2 = 4; DU.LATE = 6; DU.PARRY0 = 1;
  DU.minutes = s => (s.sim ? s.secs / 60 : (s.el + (document.hidden ? 0 : Date.now() - s.tick)) / 60000);
  const save = s => {
    if (s.sim) return;
    const now = Date.now();
    if (!document.hidden) s.el += now - s.tick;
    s.tick = now;
    S.persist();
  };

  // Deal one board's 6-card deck for rival r.
  DU.deal = function (s, r) {
    const R = rnd(s), cards = [];
    const nCmp = DU.NCMP;
    if (s.sim) {
      // Synthetic cards: weak with the share a real deck has, no bank needed.
      const w = s.simWeak == null ? 0.3 : s.simWeak;
      // Sets by role, as a real deck: Compare and 2 lead cases in the lead set, 1 partner case, 1 due case from another rival.
      const others = DU.RIVALS.filter(x => x.id !== r.id && x.id !== r.partner).map(x => x.id);
      const roleSet = k => (k < nCmp + 2 ? r.id : k === nCmp + 2 ? r.partner : pickOne(others, R));
      for (let k = 0; k < 6; k++) cards.push({ k: k < nCmp ? 'cmp' : 'case', id: 'sim-' + (s.used.length + k), r: r.id, tag: R() < w ? 'missed' : 'new', held: 0, set: roleSet(k) });
      s.used.push(...cards.map(c => c.id));
    } else {
      // First the misses still owed from earlier nights (board 1 only), then Compare, lead, partner and due.
      const st = store();
      if (!s.boards.length) {
        st.carry.splice(0, 3).forEach(x => {
          const q = x.k === 'case' ? find(x.id) : null;
          const set = x.set !== undefined ? { set: x.set } : {};
          if (x.k === 'case' && q && E().allowed(E().find(x.id) || q)) cards.push(DU.caseCard(q, x.r || r.id, Object.assign({ ret: x.ret | 0, sure: x.sure | 0 }, set)));
          if (x.k === 'cmp' && M.fmtItem(x.id)) cards.push(DU.cmpCard(x.id, x.r || r.id, Object.assign({ ret: x.ret | 0 }, set)));
        });
      }
      const ok = id => { const c = st.cmp[id]; return M.fmtItem(id) && !s.cmpTonight.includes(id) && !(c && (c.retired || (c.night && s.n - c.night < 2))); };
      const cmps = r.cmp.filter(ok);
      for (let k = 0; k < nCmp && cards.length < 6; k++) {
        if (cmps.length) { const id = cmps.splice(Math.floor(R() * cmps.length), 1)[0]; s.cmpTonight.push(id); cards.push(DU.cmpCard(id, r.id)); }
        else {
          // No eligible Compare item: its linked case instead.
          const l = r.cmp.map(id => (DU.LINKS[id] || [])).flat().find(id => !s.used.includes(id) && E().find(id) && E().allowed(E().find(id)));
          if (l) { s.used.push(l); cards.push(DU.caseCard(find(l), r.id, { set: r.id })); }
        }
      }
      const avoid = s.used.concat(OFF, cards.map(c => c.id));
      const lead = M.pick({ match: q => inRival(r, q), n: 3, mix: 1 / 3, avoid });
      lead.items.forEach(it => { const q = find(it.q); if (q && cards.length < 6) cards.push(DU.caseCard(q, it.other ? 'due' : r.id, it.other ? {} : { set: r.id })); });
      const p = partnerOf(r);
      if (cards.length < 6) {
        const pa = M.pick({ match: q => !OFF.includes(q.id) && p.match(q), n: 1, mix: 0, avoid: avoid.concat(cards.map(c => c.id)) });
        pa.items.forEach(it => { const q = find(it.q); if (q) cards.push(DU.caseCard(q, 'partner', { set: r.partner })); });
      }
      if (cards.length < 6) {
        const more = M.pick({ match: q => inRival(r, q), n: 6 - cards.length, mix: 0, avoid: avoid.concat(cards.map(c => c.id)) });
        more.items.forEach(it => { const q = find(it.q); if (q) cards.push(DU.caseCard(q, r.id, { set: r.id })); });
      }
      cards.forEach(c => { if (c.k === 'case') s.used.push(c.id); });
    }
    // Missed and Wall cards are dealt early; the rest shuffled.
    const weak = cards.filter(isWeak), rest = cards.filter(c => !isWeak(c));
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return weak.concat(rest);
  };
  // Draw up to 3. A weak card comes in only while the hand holds none, and at most one per refill; when the deck has
  // nothing else left, the weak card comes in anyway.
  DU.draw = function (b, s) {
    let weakIn = 0;
    while (b.hand.length < 3 && b.deck.length) {
      let i = 0;
      if (weakIn || b.hand.some(isWeak)) { i = b.deck.findIndex(c => !isWeak(c)); if (i < 0) i = 0; }
      const c = b.deck.splice(i, 1)[0];
      if (isWeak(c)) { weakIn++; if (s) s.weakHand++; }
      b.hand.push(c);
    }
  };
  DU.startBoard = function (s, rid) {
    const r = rival(rid), k = s.boards.length;
    const cap = k === 1 && DU.minutes(s) > DU.LATE ? DU.CAP2 : DU.CAP;
    const b = { r: rid, cells: Array(9).fill(null), deck: DU.deal(s, r), hand: [], casts: 0, cap, res: null, hist: [] };
    s.weakIn += b.deck.filter(isWeak).length;
    // Hand cards left from the board before carry over with their timers.
    if (s.left.length) { b.hand = s.left.splice(0, 3); }
    DU.draw(b, s);
    // House edge: after a won Cup he opens the next night on the centre (not against a rival you're under 50% on).
    if (k === 0 && s.edge && !(DU.recRate(rid) !== null && DU.recRate(rid) < 0.5)) { b.cells[4] = 'him'; b.edge = 1; }
    b.hard = DU.label(b, r);
    DU.nextSq(s, b);
    s.b = b; s.phase = 'board';
    if (k === 0) s.msg = SAY.sit;
    s.since = b.edge ? 'He opens on the centre tonight: you won the Cup last time.' : '';
    return b;
  };
  // The card Kagemaru casts for you this turn, if any.
  // Also the board's last cast, while you hold a missed or Wall card: you can't run the clock out on what you owe.
  DU.HOLD = 4; DU.LASTW = 2;
  DU.forced = b => b.hand.find(c => c.held >= DU.HOLD) || (b.cap - b.casts <= DU.LASTW ? b.hand.find(isWeak) : null) || null;
  // The hard squares: the centre and the corners, each labelled with one of the board's look-alike sets. Sets come
  // from the board's own cards: missed and Wall cards' sets first, then the lead set, the partner set and any other
  // set in the deck; the centre takes the first and the corners go round the list. b.hard[i] is a set id, or null on
  // an edge (any card). A board saved before the hard squares has no b.hard: every square takes any card.
  DU.HARD = [4, 0, 8, 2, 6];
  DU.label = function (b, r) {
    const cards = b.hand.concat(b.deck), have = id => cards.some(c => DU.cardSet(c) === id);
    const list = [];
    const add = id => { if (id && DU.SETS[id] && !list.includes(id) && have(id)) list.push(id); };
    cards.filter(isWeak).forEach(c => add(DU.cardSet(c)));
    add(r.id); add(r.partner);
    cards.forEach(c => add(DU.cardSet(c)));
    if (!list.length) list.push(r.id);
    const hard = Array(9).fill(null);
    DU.HARD.forEach((i, k) => { hard[i] = list[k % list.length]; });
    return hard;
  };
  // Can this card place a stone on square i? Edges take any card; a hard square takes its own set only.
  // (If the edges are full and no hard square left fits the card, any empty square takes it: never a dead hand.)
  const fit1 = (b, c, i) => !b.cells[i] && (!b.hard || !b.hard[i] || DU.cardSet(c) === b.hard[i]);
  DU.legal = (b, c) => {
    const empty = b.cells.map((x, i) => (x ? -1 : i)).filter(i => i >= 0), ok = empty.filter(i => fit1(b, c, i));
    return ok.length ? ok : empty;
  };
  DU.fits = (b, c, i) => DU.legal(b, c).includes(i);
  // His next square, shown face up before you cast: DU.rule with any tie rolled now and kept (b.next), so the square
  // shown is the square he takes. Re-rolled only when the board changes under it.
  DU.nextSq = (s, b) => {
    const r = DU.rule(b.cells);
    if (!r.squares.length) return (b.next = -1);
    if (!r.squares.includes(b.next)) b.next = pickOne(r.squares, rnd(s));
    return b.next;
  };
  DU.hisSquare = (s, b) => DU.nextSq(s, b);

  // Settle one cast. card: from the hand; sq: the square; r: { ok, conf, pts, sureMiss, row: { ok } }; parried: bool.
  // Returns the events for the board's sequence: [{ who, sq, why }].
  DU.settle = function (s, card, sq, r, parried) {
    const b = s.b, R = rnd(s), ev = [], notes = [];
    b.hand.splice(b.hand.indexOf(card), 1);
    b.hand.forEach(c => { c.held++; });
    b.casts++;
    const weak = isWeak(card);
    if (weak) { s.faced[0]++; }
    if (parried) { s.parry--; s.parries[0]++; }
    if (card.ret) { s.returns[0]++; if (r.ok) s.returns[1]++; }
    const ok = !!r.ok, conf = [0, 1, 2].includes(r.conf) ? r.conf : 0;
    s.log.push({ k: card.k, id: card.id, r: card.r, ok, conf, row: r.row ? !!r.row.ok : null, ret: card.ret | 0, weak: weak ? 1 : 0, sq, bi: s.boards.length });
    const his = why => {
      const x = DU.hisSquare(s, b);
      if (x >= 0) { b.cells[x] = 'him'; b.next = -1; ev.push({ who: 'him', sq: x, why }); }
    };
    if (card.k === 'case') {
      if (ok) { b.cells[sq] = 'me'; ev.push({ who: 'me', sq }); if (parried) notes.push('Parry spent on a right answer'); }
      else if (parried) { s.parries[1]++; ev.push({ who: 'parry', sq: DU.nextSq(s, b) }); notes.push('your Parry held: he doesn\'t move'); }
      else his('miss');
      if (!s.sim && DU.rivalOfCase(card)) { const rec = store().rec[DU.rivalOfCase(card)] = store().rec[DU.rivalOfCase(card)] || [0, 0]; rec[1]++; if (ok) rec[0]++; }
      // A linked case answered right after its Compare item retires that item.
      if (ok && s.linkFor[card.id] && !s.sim) { const c = store().cmp[s.linkFor[card.id]]; if (c) c.retired = 1; }
    } else {
      s.cmpStat[0]++;
      if (ok) {
        s.cmpStat[1]++;
        b.cells[sq] = 'me'; ev.push({ who: 'me', sq });
        if (r.row && r.row.ok) {
          s.cmpStat[2]++;
          if (s.n >= 2) { s.sparks++; notes.push('⚡ a spark'); if (s.sparks >= 2) { s.sparks = 0; if (s.parry < 2) { s.parry++; notes.push('two sparks make a Parry'); } } }
        }
        if (!DU.line(b.cells, 'me') || isTab(b)) his('trade');
      } else if (parried) { s.parries[1]++; ev.push({ who: 'parry', sq: DU.nextSq(s, b) }); notes.push('your Parry held: he doesn\'t move'); }
      else his('miss');
      if (!s.sim) {
        const c = store().cmp[card.id] = store().cmp[card.id] || { n: 0, full: 0 };
        c.n++; c.last = ok ? 1 : 0; c.night = s.n; if (ok && r.row && r.row.ok) c.full++;
        // Its linked case comes 1 to 3 cards later, in place of the partner case if that's still in the deck.
        const l = (DU.LINKS[card.id] || []).find(x => !s.used.includes(x) && E().find(x) && E().allowed(E().find(x)));
        if (l && ok) {
          const pi = b.deck.findIndex(c2 => c2.r === 'partner');
          if (pi >= 0) b.deck.splice(pi, 1);
          b.deck.splice(Math.min(b.deck.length, 1 + Math.floor(R() * 2)), 0, DU.caseCard(find(l), card.r, { set: DU.cardSet(card) }));
          s.used.push(l); s.linkFor[l] = card.id;
        }
      }
    }
    // A miss comes back changed: tonight if there's room, else first tomorrow.
    if (!ok) {
      let back = null;
      if (s.sim) back = R() < 0.35 ? { k: 'case', id: card.id + 'b' } : null;
      else if (card.k === 'case') { const q = E().find(card.id), t = q && DU.flipTwin(q, rival(DU.rivalOfCase(card) || card.r), s.used); if (t) back = { k: 'case', id: t.id }; }
      else back = DU.cmpReturn(card.id, s.used.concat(s.cmpTonight));
      if (back) {
        // It comes back in the same look-alike set, so it still fits the squares it fitted.
        const set = DU.cardSet(card);
        const nc = s.sim ? { k: 'case', id: back.id, r: card.r, tag: 'missed', held: 0, ret: 1, sure: conf === 2 ? 1 : 0, set }
          : back.k === 'case' ? DU.caseCard(find(back.id), card.r, { ret: 1, sure: conf === 2 ? 1 : 0, set }) : DU.cmpCard(back.id, card.r, { ret: 1, set });
        if (back.k === 'case') s.used.push(back.id); else s.cmpTonight.push(back.id);
        // Room tonight: at least 2 casts left on this board.
        if (b.cap - b.casts >= 2) { b.deck.splice(Math.min(b.deck.length, 1 + Math.floor(R() * 2)), 0, nc); s.weakIn++; }
        else s.pend.push(nc);
      } else if (!s.sim && card.k === 'case') s.pend.push(Object.assign({}, card, { ret: 1, sure: conf === 2 ? 1 : 0, same: 1 }));
    }
    DU.draw(b, s);
    DU.nextSq(s, b);
    s.since = notes.length ? notes.join(' · ') : '';
    return ev;
  };
  DU.rivalOfCase = c => (DU.RIVALS.some(r => r.id === c.r) ? c.r : null);
  const isTab = b => b.hand.some(isWeak);
  DU.tab = isTab;
  // The count when no line is made by the last cast: a square counts 1, a hard square DU.HARDW.
  DU.HARDW = 4;
  DU.count = (b, w) => b.cells.reduce((a, x, i) => a + (x === w ? (b.hard && b.hard[i] ? DU.HARDW : 1) : 0), 0);
  // After a cast: 'me' or 'him' when the board is decided, else null.
  DU.decide = function (s) {
    const b = s.b;
    if (DU.line(b.cells, 'him')) return 'him';
    if (DU.line(b.cells, 'me') && !isTab(b)) return 'me';
    const full = b.cells.every(Boolean), out = !b.hand.length && !b.deck.length;
    if (b.casts >= b.cap || full || out) {
      const me = DU.count(b, 'me'), him = DU.count(b, 'him');
      b.byCount = 1;
      return me > him ? 'me' : 'him';
    }
    return null;
  };
  // A board is over: record it and move the night on. Returns the next phase.
  DU.endBoard = function (s, who) {
    const b = s.b;
    b.res = who; s.score[who === 'me' ? 0 : 1]++;
    // Won with casts to spare: he pays the rest of the round, +SPARE a cast left (no reason to drag a board out).
    const spare = who === 'me' && !b.byCount ? Math.max(0, b.cap - b.casts) : 0;
    s.bonus = (s.bonus | 0) + spare * DU.SPARE;
    s.boards.push({ r: b.r, res: who, byCount: b.byCount | 0, spare });
    // Leftovers: hand cards carry their timers to the next board; deck leftovers that are weak wait for the Last Stand.
    s.left = b.hand.slice();
    b.deck.filter(isWeak).forEach(c => s.pend.push(c));
    s.msg = who === 'me' ? SAY.boardMe : b.byCount && b.cells.filter(x => x === 'me').length === b.cells.filter(x => x === 'him').length ? SAY.tie : SAY.boardHim;
    // Pins: a board won against a rival you're under 65% on, once a day per rival.
    if (who === 'me' && !s.sim) s.pin = DU.payPin(b.r) || s.pin;
    if (DU.boardsTonight(s) === 1 || s.score[0] === 2 || s.score[1] === 2) return (s.phase = 'done');
    if (s.boards.length === 2) return (s.phase = 'last');
    return (s.phase = 'counter');
  };
  DU.SPARE = 1;
  DU.payPin = function (rid) {
    const rate = DU.recRate(rid), st = store(), p = st.pins[rid] = st.pins[rid] || [];
    if (rate === null || rate >= 0.65 || p.includes(today())) return '';
    p.push(today());
    return p.length >= 2 ? 'sold' : 'pin';
  };
  // The loser counter-picks: you pick from 2, or he picks your weakest rival.
  DU.counter = function (s) {
    const last = s.boards[s.boards.length - 1];
    if (last.res === 'him') return { who: 'me', offers: DU.offers(s, [last.r]) };
    const pool = DU.RIVALS.filter(r => r.id !== last.r);
    const rate = r => (s.sim ? rnd(s)() : DU.recRate(r.id) === null ? 0.6 : DU.recRate(r.id));
    const pick = pool.slice().sort((a, b) => rate(a) - rate(b))[0];
    return { who: 'him', pick: pick.id };
  };
  // The Last Stand: tonight's returns not yet dealt (Sure misses first), leftover weak cards, then due cases.
  DU.startLast = function (s) {
    const n = DU.minutes(s) > 14 ? 1 : 3;
    const pend = s.pend.filter(c => c.k === 'case').sort((a, b) => (b.sure | 0) - (a.sure | 0));
    const left = s.left.filter(c => c.k === 'case' && isWeak(c));
    let cards = pend.concat(left).filter((c, i, a) => a.findIndex(x => x.id === c.id) === i).slice(0, n);
    s.weakIn += cards.filter(c => pend.includes(c) && isWeak(c)).length;
    s.weakHand += cards.filter(c => !left.includes(c) && isWeak(c)).length;
    if (cards.length < n && !s.sim) {
      const due = M.pick({ match: q => DU.RIVALS.some(r => inRival(r, q)), n: n - cards.length, mix: 1, avoid: s.used.concat(OFF) });
      due.items.forEach(it => { const q = find(it.q); if (q) { cards.push(DU.caseCard(q, 'due')); s.used.push(q.id); } });
    }
    while (cards.length < n && s.sim) cards.push({ k: 'case', id: 'sim-ls-' + cards.length, r: 'due', tag: 'new', held: 0 });
    s.pend = s.pend.filter(c => !cards.includes(c));
    s.stand = { cards, i: 0, me: 0, him: 0, need: n === 1 ? 1 : 2, sudden: n === 1 };
    s.phase = 'last';
    s.msg = n === 1 ? SAY.closing : SAY.last;
    return s.stand;
  };
  DU.settleLast = function (s, r) {
    const L = s.stand, card = L.cards[L.i];
    L.i++;
    if (r.ok) L.me++; else L.him++;
    if (card.ret) { s.returns[0]++; if (r.ok) s.returns[1]++; }
    if (isWeak(card)) s.faced[0]++;
    s.log.push({ k: 'case', id: card.id, r: card.r, ok: !!r.ok, conf: r.conf | 0, last: 1, ret: card.ret | 0 });
    if (!s.sim && DU.rivalOfCase(card)) { const rec = store().rec[card.r] = store().rec[card.r] || [0, 0]; rec[1]++; if (r.ok) rec[0]++; }
    if (L.me >= L.need) { s.score[0]++; return (s.phase = 'done'); }
    if (L.him >= L.need || L.i >= L.cards.length) { if (L.me < L.need) s.score[1]++; return (s.phase = 'done'); }
    return 'last';
  };
  DU.cupWon = s => s.score[0] > s.score[1];
  DU.points = s => s.log.reduce((a, l) => a + M.stake(l.ok, l.conf), 0) + (s.bonus | 0);
  // The night is over: carry what's owed to tomorrow, count the night.
  DU.finish = function (s) {
    if (s.sim) return;
    const st = store();
    const owed = s.pend.concat(s.left.filter(isWeak), s.b ? s.b.deck.filter(c => c.ret) : []);
    st.carry = st.carry.concat(owed.map(c => ({ k: c.k, id: c.id, r: c.r, ret: 1, sure: c.sure | 0, set: DU.cardSet(c) }))).filter((x, i, a) => a.findIndex(y => y.id === x.id) === i).slice(-9);
    st.nights = s.n; st.cupLast = DU.cupWon(s) ? 1 : 0;
    s.paid = M.pay(ID);
    s.phase = 'done'; s.ended = Date.now();
    st.last = { n: s.n, won: DU.cupWon(s) ? 1 : 0, t: s.ended };
    S.persist();
  };

  // ---- Art (placeholders drawn in code; generated art comes after the exam) ----
  const INK = '#17131f', BONE = '#e2dbcb', CHALK = '#ece6d8', PLUM = '#5d4d85';
  const svgStone = () => `<svg viewBox="0 0 92 92" aria-hidden="true"><ellipse cx="46" cy="50" rx="28" ry="23" fill="${BONE}" stroke="${INK}" stroke-width="3"/><ellipse cx="38" cy="42" rx="9" ry="5" fill="#fff" opacity=".6"/></svg>`;
  const svgHis = () => `<svg viewBox="0 0 92 92" aria-hidden="true"><rect x="22" y="16" width="48" height="62" rx="5" fill="${PLUM}" stroke="${INK}" stroke-width="3" transform="rotate(-6 46 47)"/><line x1="46" y1="22" x2="46" y2="58" stroke="#cfc6e0" stroke-width="3"/><circle cx="46" cy="22" r="9" fill="#c9b6f0" stroke="${INK}" stroke-width="2.5"/></svg>`;
  const EMB = {
    dq: '<svg viewBox="0 0 40 40" aria-hidden="true"><line x1="20" y1="4" x2="20" y2="34" stroke="#2b2340" stroke-width="2.5"/><rect x="8" y="30" width="24" height="5" rx="2" fill="#5a3c25"/><rect x="11" y="9" width="18" height="5" fill="#e2dbcb" stroke="#17131f"/><rect x="11" y="15" width="18" height="5" fill="#e2dbcb" stroke="#17131f"/><rect x="11" y="21" width="18" height="5" fill="#c7bca4" stroke="#17131f"/></svg>',
    kr: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 q8 0 8 7 q0 6 -8 7" fill="none" stroke="#b8923a" stroke-width="2.5"/><rect x="11" y="18" width="4" height="16" fill="#b8923a"/><rect x="18" y="18" width="4" height="18" fill="#b8923a"/><rect x="25" y="18" width="4" height="14" fill="#c7bca4"/></svg>',
    sc: '<svg viewBox="0 0 40 40" aria-hidden="true"><line x1="20" y1="3" x2="20" y2="12" stroke="#17131f" stroke-width="2"/><path d="M8 12 L20 12 L20 32 L8 30 Z" fill="#4f7f5c" stroke="#17131f" stroke-width="2"/><path d="M20 12 L30 14 L30 30 L20 32 Z" fill="#9e3a34" stroke="#17131f" stroke-width="2"/></svg>',
    tw: '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="30" width="34" height="4" rx="2" fill="#5a3c25"/><g fill="#a8652d" stroke="#17131f" stroke-width="1.5"><ellipse cx="9" cy="23" rx="5" ry="7"/><ellipse cx="20" cy="23" rx="5" ry="7"/><ellipse cx="31" cy="23" rx="5" ry="7"/></g><rect x="5" y="19" width="8" height="3" fill="#17131f"/><rect x="14" y="20" width="3" height="5" fill="#17131f"/><rect x="23" y="20" width="3" height="5" fill="#17131f"/><rect x="28" y="25" width="6" height="3" fill="#17131f"/></svg>'
  };
  const emb = id => EMB[id] || EMB.dq;
  // Freya's ring stays under his glove until he shows it in chapter 6's bunker (as js/vec-cast.js's portraits).
  const kage = () => { const c6 = SD.state.save && SD.state.save.c6; return `assets/img/portraits/kagemaru-${c6 && c6.w && c6.w.x && c6.w.x.reveal ? 'neutral' : 'gloved'}.webp`; };
  const say = t => `<div class="du-say" data-vo="${esc('kagemaru|' + t)}"><img src="${kage()}" alt="" width="52" height="60"><p><b>Kagemaru:</b> "${esc(t)}"</p></div>`;
  const rname = id => (rival(id) ? rival(id).name : id === 'partner' ? 'Partner' : 'Due');
  const setShort = id => DU.SETS[id] || 'any edge';
  const hw = () => ['one', 'two', 'three', 'four'][DU.HARDW - 1] || String(DU.HARDW);
  // His hand hovering over his next square: a gloved shadow, the word under it for everyone.
  const svgHand = () => `<svg viewBox="0 0 60 44" aria-hidden="true"><ellipse cx="30" cy="40" rx="20" ry="4" fill="#000" opacity=".35"/><path d="M14 30 q-4 -10 2 -12 l2 -10 q2 -4 5 0 l1 8 l2 -12 q3 -4 5 0 l1 12 l2 -10 q3 -4 5 0 l0 12 l3 -6 q4 -2 4 3 l-4 12 q-3 6 -10 6 h-10 q-6 0 -8 -3 z" fill="${PLUM}" stroke="${INK}" stroke-width="2"/></svg>`;

  // ---- The board screen ----
  let sel = null, pickSq = null, seq = null, asking = false, nofit = '';
  const bump = i => { const el = document.querySelector(`#panel [data-sq="${i}"]`); if (el) { el.classList.add('slide'); setTimeout(() => el.classList.remove('slide'), 400); } };
  function cardFace(c, i, chosen, forced) {
    const kind = c.k === 'cmp' ? 'COMPARE' : 'CASE', rid = rival(c.r) ? c.r : (night().b && night().b.r);
    const due = c.held >= DU.HOLD - 1 ? '<span class="du-due">Due next turn</span>' : '';
    return `<button class="du-card${c.k === 'cmp' ? ' cmp' : ''}${chosen ? ' on' : ''}" data-card="${i}" aria-pressed="${chosen}" ${forced ? 'disabled' : ''}
      aria-label="${kind}, ${esc(rname(c.r))}, fits ${esc(setShort(DU.cardSet(c)))} squares, ${esc(TAG[c.tag] || '')}${c.held >= DU.HOLD - 1 ? ', due next turn' : ''}">
      <span class="du-kind">${kind}</span>${due}<span class="du-emb">${emb(rid)}</span><span class="du-rn">${esc(setShort(DU.cardSet(c)))}</span>
      <span class="du-tag">${esc(TAG[c.tag] || '')}</span></button>`;
  }
  // The felt: hard squares chalked with their set's name (and chalk ticks: they count DU.HARDW at the count), his
  // hand hovering over the square he takes on a miss. With a card picked, a square it can't settle on is dimmed.
  function boardHtml(s, hidden, card) {
    const b = s.b, rule = DU.rule(b.cells), nx = hidden && hidden.length ? -1 : DU.nextSq(s, b), next = nx >= 0 ? [nx] : [];
    const ok = card ? DU.legal(b, card) : null;
    const cells = b.cells.map((x, i) => {
      const show = hidden && hidden.includes(i) ? null : x, hard = b.hard && b.hard[i];
      const chalk = hard ? `<span class="du-chalk">${esc(DU.SETS[hard])}<span class="du-ticks" aria-hidden="true">${"|".repeat(DU.HARDW)}</span></span>` : '';
      const mark = !show && next.includes(i) ? `<span class="du-hand-m">${svgHand()}<span class="du-word">his next</span></span>` : '';
      const label = `${DU.SQ[i]}${hard ? `, chalked ${DU.SETS[hard]}, counts ${hw()}` : ''}: ${show === 'me' ? 'your stone' : show === 'him' ? 'his piece' : 'empty'}${!show && next.includes(i) ? ', his next square' : ''}${!show && ok && !ok.includes(i) ? ', this card won\'t settle here' : ''}`;
      const cls = `du-sq${show ? ' taken' : ''}${hard ? ' hard' : ''}${pickSq === i ? ' on' : ''}${!show && ok && !ok.includes(i) ? ' nofit' : ''}${!show && next.includes(i) ? ' next' : ''}`;
      return `<button class="${cls}" data-sq="${i}" ${show ? 'disabled' : ''} aria-label="${esc(label)}">${show === 'me' ? svgStone() : show === 'him' ? svgHis() : chalk + mark}</button>`;
    }).join('');
    const ml = DU.line(b.cells, 'me'), hl = DU.line(b.cells, 'him'), L = hl || (ml && !isTab(b) ? ml : null);
    const stroke = L ? (() => { const c = i => [17 + (i % 3) * 33, 17 + Math.floor(i / 3) * 33]; const [a, z] = [c(L[0]), c(L[2])]; return `<svg class="du-stroke" viewBox="0 0 100 100" aria-hidden="true"><line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}" stroke="${CHALK}" stroke-width="2.5" stroke-linecap="round"/></svg>`; })() : '';
    const tab = ml && isTab(b) ? '<p class="du-tabline"><span class="du-slate">TAB</span> Your line is made, but you hold a missed card. Face it and the line pays.</p>' : '';
    return `<div class="du-felt"><div class="du-grid">${cells}</div>${stroke}</div>${tab}
      <p class="small du-rule">On a miss he takes ${esc(DU.STEP[rule.step] || '')}: <b>${next.map(i => DU.SQ[i]).join(' or ') || 'nothing left'}</b>.</p>`;
  }
  // A card tried on a chalked square of another set: one short line on why the stone won't settle.
  function nofitLine(b, c, i) {
    return `That square is chalked ${DU.SETS[b.hard[i]]}. Only a ${DU.SETS[b.hard[i]]} card settles there; this one is ${setShort(DU.cardSet(c))}. Edges take any card.`;
  }
  function listHtml(s) {
    const b = s.b, rule = DU.rule(b.cells);
    const mine = b.cells.map((x, i) => (x === 'me' ? DU.SQ[i] : null)).filter(Boolean), his = b.cells.map((x, i) => (x === 'him' ? DU.SQ[i] : null)).filter(Boolean);
    return `<ul class="du-list"><li>You hold: ${mine.join(', ') || 'nothing yet'}. He holds: ${his.join(', ') || 'nothing yet'}.</li>
      <li>His next square on a miss: <b>${DU.nextSq(s, b) >= 0 ? DU.SQ[DU.nextSq(s, b)] : 'none'}</b> (${esc(DU.STEP[rule.step] || '')}).</li>
      ${b.hard ? `<li>Chalked squares (a stone settles only with a card of that set; each counts ${hw()} at the count): ${DU.HARD.map(i => `${DU.SQ[i]} ${DU.SETS[b.hard[i]]}`).join(', ')}. Edges take any card.</li>` : ''}
      ${isTab(b) ? '<li>Unpaid tab: you hold a missed or Wall card, so your line can\'t win yet.</li>' : ''}</ul>`;
  }
  function hud(s) {
    const b = s.b, k = s.boards.length + 1, nb = DU.boardsTonight(s);
    return `<p class="du-hud"><span><b>Board ${k}${nb > 1 ? ' of ' + nb : ''}</b> · ${esc(rname(b.r))}</span><span>Cast ${Math.min(b.casts + 1, b.cap)} of ${b.cap}</span>${nb > 1 ? `<span>Boards ${s.score[0]}–${s.score[1]}</span>` : ''}${s.n >= 2 ? `<span>Parry ${s.parry}</span><span>Spark ${s.sparks} of 2</span>` : ''}</p>`;
  }
  DU.board = function (anim) {
    const s = night();
    if (!s) return;
    if (s.phase === 'pick') return pickPanel(s);
    if (s.phase === 'counter') return counterPanel(s);
    tune(s.phase === 'last' ? 'duellast' : 'duel');
    if (s.phase === 'last') return lastPanel(s);
    if (s.phase === 'done') return results(s);
    const b = s.b, forced = DU.forced(b);
    const hidden = anim ? anim.filter(e => e.who === 'him').map(e => e.sq) : null;
    if (forced) { sel = b.hand.indexOf(forced); pickSq = null; }
    const c = sel != null ? b.hand[sel] : null;
    let sheet = '';
    const nx = DU.nextSq(s, b), nxName = nx >= 0 ? DU.SQ[nx] : '';
    if (forced) {
      sheet = `<div class="du-sheet"><p><b>Overdue.</b> ${esc(SAY.overdue)}</p><p class="small">He casts your ${forced.k === 'cmp' ? 'Compare card' : 'case'} on his square (the ${esc(nxName)}, chalk or not). Right: your stone goes there. Wrong: he takes it.</p>
        <div class="row"><button class="primary" id="du-cast">Face it</button></div></div>`;
    } else if (c && pickSq != null) {
      const hit = c.k === 'cmp' ? `your stone on the ${DU.SQ[pickSq]}, then he takes his square` : `your stone on the ${DU.SQ[pickSq]}`;
      const par = s.n >= 2 && s.parry > 0;
      sheet = `<div class="du-sheet"><p><b>${c.k === 'cmp' ? 'Compare' : 'Case'} → ${esc(DU.SQ[pickSq])}.</b> Hit: ${esc(hit)}. Miss: he takes his square, the ${esc(nxName)}${par ? ', unless you Parry it' : ''}.</p>
        <div class="row">${par ? `<button class="ghost" id="du-parry">Parry the ${esc(nxName)} and cast</button>` : ''}<button class="primary" id="du-cast">${par ? 'Cast, keep the Parry' : 'Cast'}</button></div></div>`;
    } else sheet = `<p class="small du-hint${nofit ? ' du-nofit' : ''}" ${nofit ? 'role="status"' : ''}>${nofit ? esc(nofit) : c ? 'Now tap an empty square.' : 'Tap a card, then a square.'}</p>`;
    const body = U.panel(`${say(s.msg || SAY.sit)}
      ${s.since ? `<p class="small du-since">${esc(s.since)}</p>` : ''}
      ${hud(s)}
      <div class="du-view" role="region" aria-label="The board">${boardHtml(s, hidden, forced ? null : c)}</div>
      <div class="du-hand" role="group" aria-label="Your hand">${b.hand.map((x, i) => cardFace(x, i, i === sel, !!forced)).join('')}</div>
      ${sheet}
      <details class="du-asl"><summary class="small">Board as list</summary>${listHtml(s)}</details>
      <div class="row"><button class="ghost" id="du-how">How to play</button><button class="ghost" id="du-stop">Stop for now</button></div>
      <p class="sr" aria-live="polite" id="du-live"></p>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
    nofit = '';
    body.querySelectorAll('[data-card]').forEach(el => el.onclick = () => { const i = +el.dataset.card; sel = sel === i ? null : i; pickSq = null; DU.board(); });
    body.querySelectorAll('[data-sq]').forEach(el => el.onclick = () => {
      if (sel == null) return;
      const i = +el.dataset.sq, card = b.hand[sel];
      // The stone won't settle on a chalked square of another set: it slides off, and one line says why.
      if (card && !DU.fits(b, card, i)) { pickSq = null; const line = nofitLine(b, card, i); nofit = line; DU.board(); bump(i); return; }
      pickSq = i; DU.board();
    });
    const cast = body.querySelector('#du-cast'), par = body.querySelector('#du-parry');
    if (cast) cast.onclick = () => play(false);
    if (par) par.onclick = () => play(true);
    body.querySelector('#du-stop').onclick = () => { U.closePanel(); stopNow(); };
    body.querySelector('#du-how').onclick = () => M.walk(ID, walkScreens()).then(() => DU.board());
    // The board's sequence: your stone, a beat, then his piece. Nothing moves while a question is open.
    if (anim && anim.length) {
      const live = body.querySelector('#du-live');
      live.textContent = anim.map(e => (e.who === 'me' ? `Your stone on the ${DU.SQ[e.sq]}.` : e.who === 'him' ? `He takes the ${DU.SQ[e.sq]}.` : 'Your Parry holds.')).join(' ');
      if (hidden && hidden.length) {
        clearTimeout(seq);
        seq = setTimeout(() => { if (!asking && night() === s && s.phase === 'board') DU.board(); }, 650);
      }
    }
  };
  function stopNow() { const s = night(); if (s) save(s); untune(); if (SD.today) SD.today.render(); }

  async function play(parried) {
    const s = night(), b = s.b, forced = DU.forced(b);
    const card = forced || b.hand[sel];
    if (!card) return;
    let sq = pickSq;
    if (forced) { sq = DU.nextSq(s, b); parried = false; }
    sel = null; pickSq = null;
    // A beat still pending from the last move must not redraw the board over the question.
    clearTimeout(seq); asking = true;
    const r = await ask(s, card, sq).finally(() => { asking = false; });
    if (!r || r.closed || r.skipped) return DU.board();
    if (r.stopped && !r.committed) return stopNow();
    const ev = DU.settle(s, card, sq, r, parried);
    // Kagemaru's line for what just happened.
    const hisMove = ev.find(e => e.who === 'him');
    s.msg = card.ret && r.ok ? SAY.back : r.sureMiss ? SAY.sureMiss : forced && !r.ok ? SAY.move : parried && r.ok ? SAY.parryWaste
      : ev.some(e => e.who === 'parry') ? SAY.parryHold : card.k === 'cmp' && r.ok && r.row && !r.row.ok ? SAY.rowMiss
      : card.k === 'cmp' && r.ok && hisMove ? SAY.trade : hisMove ? SAY.move
      : DU.line(b.cells, 'me') && isTab(b) ? SAY.tab : threatNow(b) ? SAY.threat : SAY.hit;
    const who = DU.decide(s);
    if (who) { DU.endBoard(s, who); save(s); if (s.phase === 'done') return end(s); return boardOver(s, ev); }
    save(s);
    if (r.stopped) return stopNow();
    DU.board(ev);
  }
  const threatNow = b => DU.LINES.some(l => cnt(b.cells, l, 'me') === 2 && cnt(b.cells, l, 'him') === 0);

  async function ask(s, card, sq) {
    const where = sq != null ? ` · on the ${DU.SQ[sq]}` : '';
    if (card.k === 'case') {
      const q = find(card.id);
      if (!q) return null;
      return M.ask(q, { title: TITLE, tally: s.tally, context: `Case · ${rname(card.r)}${where}`, progress: `Board ${s.boards.length + 1}`, onStop: () => {} });
    }
    const item = M.fmtItem(card.id);
    if (!item) return null;
    const r = await M.askFormat(item, {
      title: TITLE, context: `Compare · ${rname(card.r)}${where}`, mode: 'scored', colFirst: true, gradeOn: 'col', shuffleCols: true,
      note: 'On the board: a right name places your stone, and then Kagemaru takes his square too. The name and the row together earn a spark.'
    });
    return r;
  }

  function boardOver(s, ev) {
    const last = s.boards[s.boards.length - 1];
    const b = U.panel(`${say(s.msg)}
      ${hud(Object.assign({}, s, { b: s.b }))}
      <div class="du-view">${boardHtml(s)}</div>
      <p class="td-big">${last.res === 'me' ? 'Board ' + s.boards.length + ' to you.' : 'Board ' + s.boards.length + ' to Kagemaru.'}</p>
      ${last.spare ? `<p class="small">Won with ${plural(last.spare, 'cast')} to spare: he pays the rest of the round, ${M.sgn(last.spare * DU.SPARE)}.</p>` : ''}
      ${last.byCount ? `<p class="small">No line by the last cast, so it went to whoever held more squares (a chalked square counts ${hw()}); a tie goes to the house.</p>` : ''}
      ${s.pin ? `<p class="small">${esc(s.pin === 'sold' ? SAY.sold : SAY.pin)}</p>` : ''}
      <div class="row"><button class="primary" id="du-next">${s.phase === 'counter' ? 'Counter-pick board 2' : 'The Last Stand'}</button></div>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
    void ev;
    b.querySelector('#du-next').onclick = () => { if (s.phase === 'last') DU.startLast(s); save(s); DU.board(); };
  }

  // ---- Picks ----
  function rivalBtn(id) {
    const r = rival(id), rec = store().rec[id], rate = DU.recRate(id);
    return `<button class="opt du-rival" data-rival="${id}"><span class="du-medal">${emb(id)}</span><span><b>${esc(r.name)}</b><br>
      <span class="small">${esc(r.what)} Partner: ${esc(partnerOf(r).name)}.</span><br>
      <span class="small">You: ${rec ? `<b>${rec[0]} of ${rec[1]}</b> on cases` : 'new'}${rate !== null && rate < 0.65 ? ' · a pin if you win' : ''}</span></span></button>`;
  }
  function pickPanel(s) {
    const b = U.panel(`${say(s.n === 1 ? SAY.walkup : SAY.sit)}
      <p><b>Who do you face first?</b></p>
      <div class="opts">${s.offers.map(rivalBtn).join('')}</div>
      <p class="muted small">Night ${s.n}. ${DU.boardsTonight(s) > 1 ? 'Two boards, and at one each, the Last Stand.' : 'One board tonight.'}</p>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
    b.querySelectorAll('[data-rival]').forEach(el => el.onclick = async () => {
      if (!s.practiced) { s.practiced = true; save(s); await practice(); }
      DU.startBoard(s, el.dataset.rival); save(s); DU.board();
    });
  }
  async function practice() {
    const id = PRACTICE.find(x => M.fmtItem(x));
    if (!id) return;
    U.system('KAGEMARU', esc(SAY.practice), '', 2500);
    await M.askFormat(M.fmtItem(id), { title: TITLE, context: 'Practice Compare · not scored', practice: true, colFirst: true, gradeOn: 'col', shuffleCols: true, note: 'On the board, a right name places your stone. This one is practice.' });
  }
  function counterPanel(s) {
    const c = s.counter = s.counter || DU.counter(s);
    if (c.who === 'him') {
      const b = U.panel(`${say(SAY.hisPick)}<p>He lost board 1, so he picks: <b>${esc(rival(c.pick).name)}</b>.</p>
        <div class="row"><button class="primary" id="du-go">Board 2</button></div>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
      b.querySelector('#du-go').onclick = () => { DU.startBoard(s, c.pick); s.counter = null; save(s); DU.board(); };
      return;
    }
    const b = U.panel(`${say(SAY.myPick)}<p><b>You lost board 1, so you pick board 2.</b></p><div class="opts">${c.offers.map(rivalBtn).join('')}</div>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
    b.querySelectorAll('[data-rival]').forEach(el => el.onclick = () => { DU.startBoard(s, el.dataset.rival); s.counter = null; save(s); DU.board(); });
  }
  function lastPanel(s) {
    const L = s.stand || DU.startLast(s);
    const cards = L.cards.map((c, i) => `<div class="du-lcard${i < L.i ? ' done' : i === L.i ? ' on' : ''}">${i < L.i ? 'Played' : i === L.i ? `CASE<br>${esc(rname(c.r))}` : 'Face down'}</div>`).join('');
    const b = U.panel(`${say(s.msg)}
      <div class="du-lrow">${cards}</div>
      <p>${L.sudden ? 'One card decides the Cup.' : 'First to 2 right wins the Cup. A miss is a point to him.'} No Parries here.</p>
      <p class="du-hud"><span>You ${L.me}</span><span>Kagemaru ${L.him}</span></p>
      <div class="row"><button class="primary" id="du-face">Face card ${L.i + 1}</button><button class="ghost" id="du-stop">Stop for now</button></div>`, { title: TITLE, onClose: stopNow, cls: 'du-win' });
    b.querySelector('#du-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#du-face').onclick = async () => {
      const card = L.cards[L.i], q = find(card.id);
      if (!q) { L.i++; save(s); return DU.board(); }
      const r = await M.ask(q, { title: TITLE, tally: s.tally, context: 'The Last Stand', onStop: () => {} });
      if (r.stopped && !r.committed) return stopNow();
      if (r.closed) return DU.board();
      const ph = DU.settleLast(s, r);
      s.msg = card.ret && r.ok ? SAY.back : r.sureMiss ? SAY.sureMiss : r.ok ? SAY.hit : SAY.move;
      save(s);
      if (ph === 'done') return end(s);
      DU.board();
    };
  }

  // ---- The end of a night ----
  function end(s) {
    DU.finish(s);
    sel = null; pickSq = null;
    results(s);
  }
  // Calibration across every mode, cases only (formats aren't noted there), advice at 15 answers per button.
  function calib() {
    const t = (sv().modes && sv().modes.cal) || M.newTally();
    const rows = [0, 1, 2].map(c => {
      const [r, n] = t[c] || [0, 0];
      const read = n < 15 ? 'Too few to tell' : c === 2 ? (r / n >= 2 / 3 ? '✓ On target' : '↓ Too sure: each miss costs 3') : c === 1 ? (r / n > 2 / 3 ? '↑ Some of these were Sure' : r / n < 0.5 ? '↓ These were guesses' : '✓ On target') : (r / n >= 0.5 ? '↑ You knew more: try Think so' : '✓ On target');
      return `<tr><th scope="row">${M.CONF[c]}</th><td>${n ? `${r} of ${n}` : 'not used'}</td><td>${read}</td></tr>`;
    }).join('');
    return `<table class="md-calt"><caption class="small">Cases, all modes</caption><tbody>${rows}</tbody></table>`;
  }
  function results(s) {
    const cases = s.log.filter(l => l.k === 'case'), right = cases.filter(l => l.ok).length;
    const won = DU.cupWon(s), sureWin = s.log.length && s.log[s.log.length - 1].ok && s.log[s.log.length - 1].conf === 0;
    const missed = cases.filter(l => !l.ok).map(l => { const q = E().find(l.id); return q && q.topic ? String(q.topic) : null; }).filter(Boolean);
    const top = missed.sort((a, b) => missed.filter(x => x === b).length - missed.filter(x => x === a).length)[0];
    const mins = Math.max(1, Math.round(DU.minutes(s)));
    const b = U.panel(`${say(won ? (sureWin ? SAY.wonGuess : SAY.won) : SAY.lost)}
      <div class="du-cup" aria-hidden="true">${won ? '<span class="du-slate">' + esc((sv().name || 'You').toUpperCase()) + '</span>' : ''}</div>
      <p class="td-big">${won ? 'The tin cup is yours until tomorrow night.' : 'The cup stays on his shelf tonight.'}</p>
      <p class="small"><b>Points ${M.sgn(DU.points(s))}</b>${s.bonus ? ` (${M.sgn(s.bonus)} for casts to spare)` : ''}.</p>
      <p class="small"><b>His ledger.</b> Cases ${right} of ${cases.length} · ${DU.boardsTonight(s) > 1 ? `boards ${s.boards.filter(x => x.res === 'me').length}–${s.boards.filter(x => x.res === 'him').length}${s.stand ? `, Last Stand ${s.stand.me}–${s.stand.him}` : ''} · ` : ''}Compare: names ${s.cmpStat[1]} of ${s.cmpStat[0]}, rows ${s.cmpStat[2]} · misses back tonight ${s.returns[0]}, right ${s.returns[1]} · missed and Wall cards faced ${s.faced[0]} · Parries raised ${s.parries[0]}, ${s.parries[1]} saved a square · ${mins} ${mins === 1 ? 'minute' : 'minutes'}.</p>
      ${s.pin ? `<p class="small">${esc(s.pin === 'sold' ? SAY.sold : SAY.pin)}</p>` : ''}
      ${top ? `<p class="small"><b>Missed most:</b> ${esc(top.replace(/-/g, ' '))}. Tomorrow, the first cards are tonight's misses, changed.</p>` : ''}
      ${calib()}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      ${won ? '<p class="muted small">Tomorrow he opens on the centre.</p>' : ''}
      <div class="row"><button class="primary" id="du-walk">Walk back</button></div>`, { title: 'HIS LEDGER', onClose: stopNow, cls: 'du-win' });
    b.querySelector('#du-walk').onclick = () => walkBack(s);
    if (won && !s.jingled && AU() && SD.audio.jingle) { s.jingled = 1; save(s); SD.audio.jingle('duelcup', ''); }
  }
  function walkBack() {
    const b = U.panel(`<p class="small muted">Walking back from the market.</p>${M.pipHtml()}
      <div class="row"><button class="primary" id="du-done">Done</button></div>`, { title: 'WALKING BACK', onClose: stopNow });
    M.pipWire(b, 'The Look-Alike Cup');
    b.querySelector('#du-done').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- First run and resume ----
  function walkScreens() {
    return [
      { title: 'His table', html: `<p data-vo="${esc('kagemaru|' + SAY.walkup)}"><b>Kagemaru:</b> "${esc(SAY.walkup)}"</p><p>A felt board of nine squares. Three in a line wins a board. You hold three cards.</p>
        <p class="small"><b>CASE</b> cards are exam questions. <b>COMPARE</b> cards show three look-alikes: name the one that fits from memory, then the table opens and you pick the row that decided it.</p>` },
      { title: 'Stones and his move', html: `<p>Tap a card, then an empty square. Right: your stone goes there. Wrong: he takes his square, by a rule printed under the board.</p>
        ${M.stakeTable()}<p class="small">Win a board with casts to spare and he pays +1 for each one left. A Compare card is a trade: on a right name you place a stone, and then he takes his square too. Name and row both right earn a spark; two sparks make a Parry, which stops his move on a miss.</p>` },
      { title: 'No dodging', html: `<p>Missed and Wall cards come early. Hold any card for ${DU.HOLD} turns, or a missed card into a board's last ${DU.LASTW} casts, and he casts it for you. And your line won't win while you hold one: he calls it an unpaid tab.</p>
        <p class="small">A miss comes back changed, tonight if there's room, first thing tomorrow if not. It saves after every step: stop any time.</p>` }
    ];
  }
  // From Nov 16 the Cup is the Counterfeit Table (js/mode-table.js). A night saved under these old rules finishes
  // the old way; every new night opens the table.
  DU.oldNight = () => { const s = night(); return !!(s && s.v === 1 && s.phase !== 'done' && s.n === store().nights + 1); };
  DU.start = async function () {
    if (!DU.oldNight() && SD.duelTable && !DU.forceOld) return SD.duelTable.start();
    let s = night();
    if (s && s.v === 1 && s.phase !== 'done' && s.n === store().nights + 1) {
      s.tick = Date.now();
      const b = U.panel(`${say(SAY.resume)}<p class="small">Night ${s.n}${s.b ? `, board ${s.boards.length + 1} against ${esc(rname(s.b.r))}, cast ${Math.min(s.b.casts + 1, s.b.cap)} of ${s.b.cap}` : ''}, as you left it. The clock paused while you were away.</p>
        <div class="row"><button class="primary" id="du-sit">Sit back down</button><button class="ghost" id="du-new">Start a new night</button></div>`, { title: 'BACK AT THE TABLE', onClose: stopNow, cls: 'du-win' });
      b.querySelector('#du-sit').onclick = () => DU.board();
      b.querySelector('#du-new').onclick = () => { store().night = null; DU.start(); };
      return;
    }
    s = DU.newNight();
    await M.walkFirst(ID, walkScreens());
    DU.board();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    const s = night();
    if (!s || s.phase === 'done') return;
    const now = Date.now();
    if (document.hidden) s.el += now - s.tick;
    s.tick = now;
  });

  // ---- Simulator hook (tools/modes_sim.js, tools/duel_check.js): a whole night on the real state machine ----
  // policy: { p, conf, route: 'near' (safest card first) | 'far' (missed cards first), square: 'greedy' | 'hard' | 'centre' |
  // 'random', parry: 'shaky' | 'never', night, edge, cmpBoost }. Compare names are easier by cmpBoost (default 0.1);
  // a missed card is harder by 0.15. Time: a case 100 s, a Compare card 70 s, 3 s per board tap.
  DU.SIM = { CASE: 100, CMP: 70, TAP: 3 };
  DU.greedy = function (b, card) {
    const empty = card ? DU.legal(b, card) : b.cells.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    return empty.slice().sort((a, z) => DU.sqScore(b, z) - DU.sqScore(b, a))[0];
  };
  // A square's worth to you: a line now, else taking his shown square, live lines and two-in-a-lines made.
  DU.sqScore = function (b, i) {
    const t = b.cells.slice(); t[i] = 'me';
    if (DU.line(t, 'me')) return 100;
    const r = DU.rule(b.cells), his = b.next != null && b.next >= 0 ? [b.next] : r.squares;
    let v = his.includes(i) ? (r.step === 1 ? 60 : r.step === 2 ? 5 : 20) : 0;
    v += DU.LINES.filter(l => l.includes(i) && cnt(b.cells, l, 'him') === 0).length * 3;
    v += DU.LINES.filter(l => l.includes(i) && cnt(t, l, 'me') === 2 && cnt(t, l, 'him') === 0).length * 8;
    return v;
  };
  DU.sim = async function (policy, rng) {
    const R = rng || Math.random, s = DU.newNight({ sim: true, rng: R, night: policy.night || 4, edge: !!policy.edge });
    s.simWeak = policy.weak == null ? 0.3 : policy.weak;
    const boost = policy.cmpBoost == null ? 0.1 : policy.cmpBoost;
    let taps = 0, guard = 0;
    const pOf = c => Math.max(0.05, Math.min(0.97, policy.p + (c.k === 'cmp' ? boost : 0) - (isWeak(c) ? 0.15 : 0)));
    const answer = c => {
      const a = M.simAnswer(null, Object.assign({}, policy, { p: pOf(c) }), R);
      s.secs += c.k === 'cmp' ? DU.SIM.CMP : DU.SIM.CASE;
      if (c.k === 'cmp') a.row = { ok: a.ok && R() < 0.7 };
      a.sureMiss = !a.ok && a.conf === 2;
      return a;
    };
    s.phase = 'pick';
    DU.startBoard(s, s.offers[0]);
    while (++guard < 300) {
      if (s.phase === 'board') {
        const b = s.b, f = DU.forced(b);
        let card = f, sq, par = false;
        if (!card) {
          const order = b.hand.slice().sort((a, z) => (policy.route === 'far' ? (isWeak(z) - isWeak(a)) : (isWeak(a) - isWeak(z)) || ((a.k === 'cmp') - (z.k === 'cmp'))));
          card = order[0];
          // 'hard': hard squares when sure. The route's card, if you'd mark it Sure and it fits a hard square, goes on
          // the best hard square it fits; otherwise on the best square it fits.
          const hardSq = policy.square === 'hard' && b.hard && pOf(card) > 2 / 3 ? DU.legal(b, card).filter(i => b.hard[i]) : [];
          if (hardSq.length) sq = hardSq.sort((a, z) => DU.sqScore(b, z) - DU.sqScore(b, a))[0];
          else if (policy.square === 'centre') sq = [4, 0, 2, 6, 8, 1, 3, 5, 7].find(i => DU.legal(b, card).includes(i));
          else if (policy.square === 'random') sq = pickOne(DU.legal(b, card), R);
          else sq = DU.greedy(b, card);
          const step = DU.rule(b.cells).step;
          par = s.parry > 0 && policy.parry !== 'never' && pOf(card) < 0.7 && step <= 3;
          taps += 3; s.secs += 3 * DU.SIM.TAP;
        } else { sq = DU.nextSq(s, b); taps += 1; s.secs += DU.SIM.TAP; }
        const a = answer(card);
        DU.settle(s, card, sq, a, par);
        const who = DU.decide(s);
        if (who) {
          DU.endBoard(s, who);
          if (s.phase === 'counter') { const c = DU.counter(s); DU.startBoard(s, c.who === 'him' ? c.pick : c.offers[0]); taps += 2; s.secs += 2 * DU.SIM.TAP; }
          else if (s.phase === 'last') DU.startLast(s);
        }
      } else if (s.phase === 'last') {
        const c = s.stand.cards[s.stand.i];
        const a = answer(c); taps += 1; s.secs += DU.SIM.TAP;
        DU.settleLast(s, a);
      } else break;
    }
    s.secs += 20;   // plus the sit-down, ledger and walk back
    const casts = s.log.length, mapSecs = taps * DU.SIM.TAP;
    return {
      pts: DU.points(s), minutes: s.secs / 60, mapShare: mapSecs / s.secs, questions: casts, zero: !DU.cupWon(s), won: DU.cupWon(s),
      boards: s.boards, last: !!s.stand, faced: s.faced[0], weakDealt: s.weakIn, weakHand: s.weakHand, log: s.log, state: s
    };
  };

  M.register({
    id: ID, name: 'The Look-Alike Cup', minutes: '15 to 20', host: 'Kagemaru, after the market shuts',
    blurb: 'A board game at his stall. Every square is a job: lay a service pin that really does it, or call his pin a fake. Three in a line wins.',
    start: DU.start, sim: DU.sim,
    status: () => { const s = night(); return DU.oldNight() ? `Resume · night ${s.n}${s.b ? `, board ${s.boards.length + 1}` : ''}` : SD.duelTable ? SD.duelTable.status() : ''; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .du-win { --du-felt: #2f5a3f; }
    .du-say { display: grid; grid-template-columns: 52px 1fr; gap: 8px; align-items: start; margin: 0 0 6px; }
    .du-say img { width: 52px; height: 60px; object-fit: cover; object-position: top; border-radius: 6px; background: #3a3746; }
    .du-say p { margin: 0; }
    .du-since { margin: 0 0 6px; padding: 4px 8px; border-left: 4px solid var(--ink, #222); }
    .du-hud { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: 14px; margin: 4px 0; }
    .du-felt { position: relative; background: #5a3c25; border-radius: 14px; padding: 8px; max-width: 360px; margin: 0 auto; }
    .du-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; background: var(--du-felt); border-radius: 8px;
      background-image: linear-gradient(90deg, transparent calc(33.33% - 1px), rgba(236,230,216,.7) calc(33.33% - 1px), rgba(236,230,216,.7) calc(33.33% + 1px), transparent calc(33.33% + 1px), transparent calc(66.66% - 1px), rgba(236,230,216,.7) calc(66.66% - 1px), rgba(236,230,216,.7) calc(66.66% + 1px), transparent calc(66.66% + 1px)),
        linear-gradient(180deg, transparent calc(33.33% - 1px), rgba(236,230,216,.7) calc(33.33% - 1px), rgba(236,230,216,.7) calc(33.33% + 1px), transparent calc(33.33% + 1px), transparent calc(66.66% - 1px), rgba(236,230,216,.7) calc(66.66% - 1px), rgba(236,230,216,.7) calc(66.66% + 1px), transparent calc(66.66% + 1px)); }
    .du-sq { aspect-ratio: 1; min-height: 64px; background: transparent; border: 0; padding: 4px; display: grid; place-items: center; color: #ece6d8; font: 800 12px var(--f-body, sans-serif); box-shadow: none; }
    .du-sq svg { width: 100%; height: 100%; }
    .du-sq.on { outline: 3px solid #cfdbe8; outline-offset: -6px; border-radius: 8px; }
    .du-sq:disabled { opacity: 1; cursor: default; }
    .du-sq { position: relative; align-content: center; }
    .du-chalk { display: block; font: 700 12px/1.1 var(--f-body, sans-serif); color: #ece6d8; opacity: .85; letter-spacing: .02em; text-align: center; max-width: 100%; overflow-wrap: anywhere; font-style: italic; text-shadow: 0 0 1px #ece6d8; }
    .du-ticks { display: block; font-style: normal; letter-spacing: .1em; opacity: .8; }
    .du-sq.hard:not(.taken) { box-shadow: inset 0 0 0 2px rgba(236,230,216,.28); border-radius: 10px; }
    .du-sq.nofit .du-chalk { opacity: .35; text-decoration: line-through; }
    .du-sq.nofit { cursor: not-allowed; }
    .du-sq.slide { animation: du-slide .35s ease-out; }
    @keyframes du-slide { 0%, 100% { transform: none; } 30% { transform: translateX(-5px); } 60% { transform: translateX(4px); } }
    .du-hand-m { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; }
    .du-sq.hard .du-hand-m { justify-content: flex-start; padding-top: 2px; }
    .du-hand-m svg { width: 52%; height: auto; opacity: .9; filter: drop-shadow(0 3px 2px rgba(0,0,0,.45)); }
    .du-word { font: 800 11px var(--f-body, sans-serif); background: rgba(23,19,31,.75); color: #ece6d8; border-radius: 4px; padding: 0 4px; }
    .du-sq.hard.next .du-hand-m svg { width: 40%; }
    .du-sq.hard.next .du-chalk { margin-top: 52%; }
    .du-nofit { border-left: 4px solid var(--sun, #b8923a); padding-left: 6px; }
    .du-stroke { position: absolute; inset: 8px; width: calc(100% - 16px); height: calc(100% - 16px); pointer-events: none; }
    .du-tabline { margin: 6px 0 0; font-size: 14px; }
    .du-slate { display: inline-block; background: #3a3746; color: #ece6d8; border: 2px solid #ece6d8; border-radius: 5px; padding: 0 6px; font-weight: 800; letter-spacing: .06em; }
    .du-rule { margin: 6px 0; }
    .du-hand { display: flex; gap: 6px; align-items: flex-end; margin: 8px 0; }
    .du-card { position: relative; flex: 1; min-width: 0; min-height: 120px; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0 0 6px; overflow: hidden; border-radius: 8px; text-align: center; }
    .du-card.on { transform: translateY(-6px); outline: 3px solid var(--sun, #b8923a); }
    .du-kind { width: 100%; background: #c7bca4; font: 800 11px var(--f-body, sans-serif); letter-spacing: .06em; padding: 3px 0; }
    .du-card.cmp .du-kind { background: var(--blue, #3f5f80); color: #fff; }
    .du-due { position: absolute; top: 0; right: 0; background: var(--red, #9e3a34); color: #fff; font: 800 10px var(--f-body, sans-serif); padding: 1px 4px; border-bottom-left-radius: 6px; }
    .du-emb, .du-medal { width: 38px; height: 38px; border-radius: 50%; background: #c7bca4; border: 2px solid var(--ink, #222); padding: 3px; display: inline-block; flex: none; }
    .du-rn { font: 800 12px var(--f-body, sans-serif); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; padding: 0 2px; }
    .du-tag { font-size: 11px; line-height: 1.2; padding: 0 3px; }
    .du-sheet { border: 2px solid var(--ink, #222); border-radius: 10px; padding: 8px 10px; margin: 6px 0; }
    .du-sheet p { margin: 0 0 6px; }
    .du-sheet button, .du-win .row button { min-height: 44px; }
    .du-rival { display: flex; gap: 10px; align-items: center; text-align: left; }
    .du-list { padding-left: 18px; }
    .du-lrow { display: flex; gap: 6px; margin: 8px 0; }
    .du-lcard { flex: 1; min-height: 90px; border: 2.5px solid var(--sun, #b8923a); border-radius: 8px; background: #5d4d85; color: #fff; display: grid; place-items: center; text-align: center; font-weight: 800; font-size: 13px; }
    .du-lcard.on { background: var(--bone, #e2dbcb); color: var(--ink, #222); }
    .du-lcard.done { opacity: .5; }
    .du-cup { text-align: center; margin: 6px 0; }
    .du-cup .du-slate { font-size: 20px; padding: 6px 14px; }
    @media (prefers-reduced-motion: reduce) { .du-card.on { transform: none; } }`;
  document.head.appendChild(css);
})();
