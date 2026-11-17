// Headless balance check for claim 7, the Locked Desk (js/rush-office.js on js/rush-core.js): plays each build over
// many seeds and prints win rates and spill. node tools/rush_sim_office.js [seeds] [orders, comma-separated] [only]
// SIM_COINS=n sets the coins carried into the claim (default 2: 6 at the start, a typical player's; see the design's
// section 6).
//
// A build is a list of steps:
//   badge pad cache param safe waiter   placed before the key is turned (r:rack r:intern r:bin r:reserve: in the cellar)
//   stamps=seal,file                    the badge's (or keyring's) stamps before the key; +read adds Read between waves 2 and 3
//   sign=anyone|office|riverside        the cabinet sign
//   shred=1                             shred the keyring 1 s after the first pickpocket (shred=0: before the key)
//   rot=14                              rotate the drawer by hand whenever the combination is 14 s old
//   keys                                tap the keyring to rotate it 1 s after each pickpocket (the keyring-only answer)
//   scope=topics                        the intern's scope
//   p:check (default) | p:solve | p:ignore | p:none   how the player handles review questions (see player())
// The player has one pair of hands. Answering a question means reading it all (SOLVE s; one they've solved before is
// KNOWN s; a desk letter, a short snippet, SPOT s); checking an intern's answer is a glance (CHECK). Going to the other room takes SWITCH s. Upstairs
// letters and the cellar's are in different rooms; the dumbwaiter brings the cellar's checks up and lets the intern
// take the desk's letters. Office chores (stamps, shredding, a rotation tap) cost TAP s of attention, wherever they are.
const R = require('../js/rush-core.js');
const O = require('../js/rush-office.js');
const N = +process.argv[2] || 200, ORDERS = (process.argv[3] || '').split(',').filter(Boolean), ONLY = process.argv[4] || '';
const SOLVE = 6, KNOWN = 6, SPOT = 5, CHECK = 1.5, NOTICE = 0.5, SWITCH = 0.6, TAP = 0.5;
// The cellar's pool: two letters from each of claims 1 to 6, nine of them solved (a player who's got most letters
// right so far). The desk's own letters are claim 7's spot-the-line cards, none solved yet.
const TOPICS = ['rush', 'bell', 'double', 'slow', 'picky', 'hot'];
const CELLAR = TOPICS.flatMap(t => [t + '.a0', t + '.a1']), UNSOLVED = new Set(['slow.a1', 'picky.a1', 'hot.a1']);
const DESK = Array.from({ length: 6 }, (_, i) => 'locked.s' + i);
// r:intern is the intern carried over from claim 6 (free); r:intern=buy pays for it.
const A = ['badge', 'stamps=seal,file', '+read', 'shred=1', 'sign=riverside', 'pad', 'param', 'rot=14', 'r:intern', 'r:rack', 'r:bin'];
const swap = (b, from, to) => b.flatMap(x => x === from ? (to ? [].concat(to) : []) : [x]);
const BUILDS = [
  ['Intended A', A],
  ['Intended B: the safe', swap(swap(A, 'param', 'safe'), 'rot=14', null)],
  ['Intended C: A + key tin', A.concat('cache')],
  ['Lazy star: keyring, *, Anyone, pad', ['pad', 'r:intern', 'r:rack']],
  ['Badge with the star', A.filter(x => !x.startsWith('stamps') && x !== '+read')],
  ['Badge, keyring never shredded', swap(A, 'shred=1', null)],
  ['Lock it all: Office only, no Read', swap(swap(A, 'sign=riverside', 'sign=office'), '+read', null)],
  ['No pad', swap(A, 'pad', null)],
  ['Key tin with the star', A.filter(x => !x.startsWith('stamps') && x !== '+read').concat('cache')],
  ['Sticky note left', swap(swap(A, 'param', null), 'rot=14', null)],
  ['Drawer never rotated', swap(A, 'rot=14', null)],
  ['No intern, the cellar by hand', swap(A, 'r:intern', null).concat('p:solve')],
  ['Solved topics, never checked', A.concat('scope=topics', 'p:ignore')],
  // More for the rules in the design's section 13.
  ['Keyring only: tight stamps, rotated', ['stamps=seal,file', '+read', 'keys', 'sign=riverside', 'pad', 'param', 'rot=14', 'r:intern', 'r:rack', 'r:bin']],
  ['A, solved topics, checked', A.concat('scope=topics')],
  ['A + dumbwaiter', A.concat('waiter')],
  ['A, intern bought (none carried)', swap(A, 'r:intern', 'r:intern=buy')],
  ['A, Office only', swap(A, 'sign=riverside', 'sign=office')],
  ['A, sign Anyone', swap(A, 'sign=riverside', 'sign=anyone')]
].filter(([n]) => !ONLY || n.toLowerCase().includes(ONLY.toLowerCase()));

function player(S, pol, me, waiter) {
  if (pol === 'none') return;
  const V = S.review;
  if (me.task) { if (V.time < me.task.at) return; const t = me.task; me.task = null; t.done(); }
  if (pol === 'ignore') return;
  const rooms = [['main', S], ['review', V]];
  const cost = where => where === me.room ? 0 : SWITCH;
  const go = (where, secs, done) => { const c = cost(where); if (c) me.room = where; me.task = { at: V.time + secs + c, done }; me.busy += secs + c; };
  // Checks first: the oldest stamped answer, in the cellar or (by the dumbwaiter, or by going up) on the desk.
  if (pol === 'check') {
    let best = null;
    for (const [where, X] of rooms) for (const k of X.tickets) if (k.quiz && (k.phase === 'stamped' || k.phase === 'leak') && X.time - (k.stampAt || 0) >= NOTICE) {
      const w = where === 'review' && waiter() ? me.room : where;
      if (!best || k.stampAt < best.k.stampAt) best = { k, X, w };
    }
    if (best) { const { k, X, w } = best; go(w, CHECK, () => R.check(X, k.id, k.internRight ? 'ok' : 'wrong')); return; }
  }
  // Then answer the oldest question there's still time to finish that the intern won't take.
  let best = null;
  for (const [where, X] of rooms) for (const k of X.tickets) {
    if (!k.quiz || k.phase !== 'ask' || X.time - k.askAt < NOTICE) continue;
    const solved = R.internal.isSolved(X, k.q), wide = O.wide(X, k.q);
    const internTakes = pol === 'check' && X.intern && (solved || wide);
    if (internTakes) continue;
    const t = String(k.q).startsWith('locked.') ? SPOT : solved ? KNOWN : SOLVE, secs = t + cost(where);
    if (k.askAt + R.T.askWait - X.time <= secs) continue;
    if (!best || k.askAt < best.k.askAt) best = { k, X, where, secs: t };
  }
  if (best) { const { k, X, where, secs } = best; go(where, secs, () => R.reply(X, k.id, true)); }
}

// An office chore (a tap upstairs) takes the player's hands for a moment, and brings them upstairs.
function tap(me, V) {
  const c = TAP + (me.room === 'main' ? 0 : SWITCH); me.room = 'main'; me.busy += c;
  if (me.task) me.task.at += c; else me.task = { at: V.time + c, done() {} };
}
const rows = [], bySeed = {};
for (const [name, b] of BUILDS) {
  const pol = (b.find(t => t.startsWith('p:')) || 'p:check').slice(2);
  const opt = k => { const x = b.find(t => t.startsWith(k + '=')); return x ? x.slice(k.length + 1) : null; };
  let wins = 0, spill = 0, time = 0, spills = [];
  const H = {};
  const add = (k, v) => { H[k] = (H[k] || 0) + v; };
  for (let s = 1; s <= N; s++) {
    const book = new Map(CELLAR.filter(id => !UNSOLVED.has(id)).map(id => [id, { id, solved: true, right: 1, wrong: 0, by: { player: { right: 1, wrong: 0 } }, last: null }]));
    const S = R.create(s, 'locked', ORDERS, process.env.SIM_COINS != null ? +process.env.SIM_COINS : 2, book), V = S.review, me = { task: null, busy: 0, room: 'main' };
    V.qpool = CELLAR.slice(); S.qpool = DESK.slice();
    for (const t of b) {
      if (['badge', 'pad', 'cache', 'param', 'safe', 'waiter'].includes(t)) R.place(S, t);
      else if (t === 'r:intern') { V.intern = true; V.internAt = 0; }
      else if (t.startsWith('r:')) R.place(V, t.slice(2).split('=')[0]);
    }
    if (opt('stamps')) { for (const st of O.STAMPS) O.setStamp(S, st, false); for (const st of opt('stamps').split(',')) O.setStamp(S, st, true); }
    if (opt('sign')) O.setSign(S, opt('sign'));
    if (opt('scope')) O.setInternScope(S, opt('scope'));
    if (opt('shred') === '0') O.shred(S);
    R.start(S);
    let firstPick = null, readDone = false, pickSeen = 0, keyTaps = [];
    const waiter = () => S.waiter && !S.waiterLapsed;
    while (!S.over && S.time < 300) {
      R.step(S, 1 / 30);
      for (const e of R.drain(V)) if (e.type === 'spill') add('w:c-' + e.why, 1);
      for (const e of R.drain(S)) {
        if (e.type === 'spill') add('w:' + e.why, 1);
        if (e.type === 'pickpocket') { pickSeen++; if (firstPick == null) firstPick = S.time; if (b.includes('keys')) keyTaps.push(S.time + 1); }
      }
      if (opt('shred') === '1' && firstPick != null && S.time >= firstPick + 1 && S.keyringLive) { if (O.shred(S) === '') tap(me, V); }
      if (keyTaps.length && S.time >= keyTaps[0]) { keyTaps.shift(); if (O.rotateKeys(S) === '') tap(me, V); }
      if (b.includes('+read') && !readDone && S.wave === 2 && O.canEdit(S)) { readDone = true; O.setStamp(S, 'read', true); tap(me, V); }
      if (opt('rot') && (S.secret === 'param' || S.safeLapsed) && O.comboAge(S) >= +opt('rot')) { O.rotate(S); tap(me, V); }
      player(S, pol, me, waiter);
    }
    if (S.over === 'win') wins++;
    spill += S.spill; time += S.time; spills.push(S.spill);
    ['grey', 'red', 'thiefSpill', 'forgedDone', 'streetIn', 'comboThefts', 'tooBig', 'boxThrottles', 'boxLost', 'refused', 'honestShred', 'cacheLeaks', 'upkeepMissed', 'handled'].forEach(c => add(c, S[c]));
    add('cellarSpill', V.spill); add('unanswered', V.unanswered + S.unanswered); add('missed', V.missed + S.missed); add('byIntern', V.byIntern + S.byIntern); add('byYou', V.byYou + S.byYou); add('busy', me.busy); add('asked', V.asked + S.asked);
  }
  const f = x => ((x || 0) / N).toFixed(1);
  bySeed[name] = spills.slice();
  spills.sort((a, c) => a - c);
  rows.push({ build: name, win: (100 * wins / N).toFixed(0) + '%', spill: f(spill), p10: spills[Math.floor(N * .1)], p90: spills[Math.floor(N * .9)], secs: f(time),
    grey: f(H.grey), red: f(H.red), thief: f(H.thiefSpill), forged: f(H.forgedDone), street: f(H.streetIn), combo: f(H.comboThefts), tooBig: f(H.tooBig), boxThr: f(H.boxThrottles), boxLost: f(H.boxLost),
    why: Object.keys(H).filter(k => k.startsWith('w:')).sort().map(k => k.slice(2) + ' ' + f(H[k])).join(', '),
    cacheLeak: f(H.cacheLeaks), cellar: f(H.cellarSpill), asked: f(H.asked), you: f(H.byYou), intern: f(H.byIntern), unans: f(H.unanswered), missed: f(H.missed), busy: f(H.busy) });
}
const cols = (process.env.SIM_COLS || '').split(',').filter(Boolean);
// Does one choice win on every seed? Each pair: seeds where the second build spilled less, the same, more.
const pairs = [['Intended A', 'Intended B: the safe'], ['Intended A', 'Intended C: A + key tin']];
for (const [a, b] of pairs) if (bySeed[a] && bySeed[b]) {
  let less = 0, same = 0, more = 0; bySeed[a].forEach((x, i) => { const y = bySeed[b][i]; if (y < x) less++; else if (y > x) more++; else same++; });
  console.log(`${b} vs ${a}: less spill on ${less} seeds, same on ${same}, more on ${more}`);
}
console.table(cols.length ? rows.map(r => Object.fromEntries(cols.map(c => [c, r[c]]))) : rows);
