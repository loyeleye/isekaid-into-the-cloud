// Headless balance check for the Rush prototype (js/rush-core.js): plays every build with the 2 starting coins
// (and the third coin from wave 3, where it buys something) over many seeds, and prints win rates and spill.
// node tools/rush_sim.js [seeds] [claim: rush | bell | double | slow | picky | hot] [orders, comma-separated: cold,herd,shelf]
const R = require('../js/rush-core.js');
const N = +process.argv[2] || 200, CLAIM = process.argv[3] || 'rush', ORDERS = (process.argv[4] || '').split(',').filter(Boolean);
const SLOW = [[], ['hourglass'], ['stopwatch'], ['hourglass', 'stopwatch'], ['hourglass', 'stopwatch', '+bin'], ['hourglass', 'bin'], ['stopwatch', 'bin'], ['hourglass', 'reserve'], ['hourglass', 'stopwatch', '+reserve'], ['hourglass', 'stopwatch', '+bin', '+reserve'], ['reserve', 'bin']];
const PICKY = [[], ['filter'], ['rack'], ['reserve'], ['rack', 'reserve'], ['filter', 'rack'], ['filter', 'reserve'], ['filter', 'rack', '+reserve'], ['filter', 'rack', '+bin'], ['rack', 'reserve', '+filter'], ['rack', 'reserve', '+bin'], ['filter', 'bin'], ['@10:filter', '@10:rack']];
// The Hot Shelf (3 coins to start, a 4th at wave 3). The suffix stamp is the vault's fix; the on-demand dial is the
// trap. The cellar runs alongside as review: r: places a piece there (the rack and the bin are its fix, the intern
// its helper). p: is how the player handles the review questions: solve (answers every one, the default), check
// (lets the intern answer what it can and checks its work), ignore (hires the intern and leaves it be), none.
const HOT = [[], ['shard'], ['ondemand'], ['shard', 'rack'], ['shard', 'ondemand', 'rack'],
  ['r:rack', 'r:reserve', 'r:bin'],
  ['shard', 'r:rack', '+r:bin'], ['shard', 'r:rack', 'r:reserve'], ['shard', 'r:rack'], ['shard', 'rack', 'ondemand', '+r:rack'],
  ['ondemand', 'r:rack', 'r:bin'], ['ondemand', 'rack', 'r:rack', '+r:bin'],
  ['shard', 'r:rack', 'r:bin', 'p:none'],
  ['shard', 'r:rack', 'r:intern', '+r:bin', 'p:check'], ['shard', 'r:rack', 'r:intern', '+r:bin', 'p:ignore'],
  ['shard', 'r:intern', 'r:rack', '+r:reserve', 'p:check'], ['shard', 'r:rack', 'r:bin', '+r:intern', 'p:check'], ['shard', 'r:rack', 'r:bin', '+r:intern', 'p:ignore'],
  ['ondemand', 'r:rack', 'r:intern', '+r:bin', 'p:check']];
const builds = CLAIM === 'slow' ? SLOW : CLAIM === 'picky' ? PICKY : CLAIM === 'hot' ? HOT : [[], ['rack'], ['reserve'], ['bin'], ['rack', 'reserve'], ['rack', 'bin'], ['reserve', 'bin'], ['rack', 'bin', '+reserve'], ['rack', 'reserve', '+bin'], ['@8:rack'], ['@8:reserve'], ['@8:rack', '@8:reserve'], ['@15:rack', '@15:reserve'], ['bell'], ['bell', 'rack'], ['bell', 'reserve'], ['bell', 'rack', '+bin'], ['@10:bell'], ['rack', 'reserve', '+bin'], ['reserve', 'rack', '+bell'], ['ledger'], ['ledger', 'rack'], ['ledger', 'reserve'], ['ledger', 'rack', '+bin'], ['ledger', 'reserve', '+rack'], ['@10:ledger', '@10:reserve']];
// The player, for review questions: one thing at a time. Answering a question means reading all of it (SOLVE
// seconds); checking one of the intern's answers is a glance (CHECK). They take a moment to notice each one, and
// they're right about questions they've solved before (the sim's pool is all solved).
const SOLVE = 6, CHECK = 1.5, NOTICE = 0.5, POOL = Array.from({ length: 12 }, (_, i) => 'L' + i);
function player(S2, pol, me) {
  if (pol === 'none' || pol === 'ignore') return;
  if (me.task) {
    if (S2.time < me.task.at) return;
    const t = me.task; me.task = null;
    if (t.kind === 'reply') R.reply(S2, t.id, true); else R.check(S2, t.id, t.wrong ? 'wrong' : 'ok');
  }
  const waiting = k => S2.time - (k.phase === 'ask' ? k.askAt : k.stampAt) >= NOTICE;
  if (pol === 'check') {
    const k = S2.tickets.find(x => x.quiz && (x.phase === 'stamped' || x.phase === 'leak') && waiting(x));
    if (k) { me.task = { kind: 'check', id: k.id, wrong: !k.internRight, at: S2.time + CHECK }; me.busy += CHECK; return; }
  }
  // Answer the oldest question there's still time to finish; with the intern on (and checked), only the ones it can't take.
  const k = S2.tickets.find(x => x.quiz && x.phase === 'ask' && waiting(x) && x.askAt + R.T.askWait - S2.time > SOLVE && (pol === 'solve' || !S2.intern));
  if (k) { me.task = { kind: 'reply', id: k.id, at: S2.time + SOLVE }; me.busy += SOLVE; }
}
const rows = [];
for (const b of builds) {
  const pol = (b.find(t => t.startsWith('p:')) || 'p:solve').slice(2), tools = b.filter(t => !t.startsWith('p:'));
  let wins = 0, spill = 0, time = 0, twins = 0, reports = 0, twice = 0, colds = 0, expired = 0, herds = 0, reap = 0, cut = 0, bfail = 0, aged = 0, tossed = 0, dedup = 0;
  const H = { wthr: 0, wlost: 0, stale: 0, rspill: 0, asked: 0, you: 0, intern: 0, caught: 0, missed: 0, leaked: 0, unans: 0, busy: 0 };
  for (let s = 1; s <= N; s++) {
    const book = new Map(POOL.map(id => [id, { id, solved: true, right: 1, wrong: 0, by: { player: { right: 1, wrong: 0 } }, last: null }]));
    const S = R.create(s, CLAIM, ORDERS, 0, book), me = { task: null, busy: 0 };
    if (S.review) S.review.qpool = POOL.slice();
    // A tool name with r: goes in the second room (the Hot Shelf's cellar).
    const put = t => t.startsWith('r:') ? R.place(S.review, t.slice(2)) : R.place(S, t);
    tools.filter(t => !'+@'.includes(t[0])).forEach(put);
    R.start(S);
    while (!S.over && S.time < 300) {
      R.step(S, 1 / 30);
      tools.filter(t => t[0] === '+').forEach(t => { if (S.coins) put(t.slice(1)); });
      tools.filter(t => t[0] === '@').forEach(t => { const [at, tool] = t.slice(1).split(/:(.*)/); if (S.time >= +at) put(tool); });
      if (S.review) player(S.review, pol, me);
      R.drain(S); if (S.review) R.drain(S.review);
    }
    if (S.over === 'win') wins++;
    spill += S.spill; time += S.time; twins += S.twins; reports += S.reports; twice += S.paidTwice; colds += S.colds; expired += S.expired; herds += S.herds; reap += S.reappeared; cut += S.timedOut; bfail += S.batchFails; aged += S.aged; tossed += S.tossed; dedup += S.deduped;
    H.wthr += S.hotThrottles; H.wlost += S.writeLost; H.stale += S.stale; H.busy += me.busy;
    const V = S.review;
    if (V) { H.rspill += V.spill; H.asked += V.asked; H.you += V.byYou; H.intern += V.byIntern; H.caught += V.caught; H.missed += V.missed; H.leaked += V.leaked; H.unans += V.unanswered; }
  }
  const f = x => (x / N).toFixed(1);
  if (CLAIM === 'hot') {
    rows.push({ build: b.join(' ') || '(nothing)', win: (100 * wins / N).toFixed(0) + '%', spill: f(spill), secs: (time / N).toFixed(0), writeThrottled: f(H.wthr), writeLost: f(H.wlost), stale: f(H.stale), cellarSpill: f(H.rspill),
      asked: f(H.asked), byYou: f(H.you), byIntern: f(H.intern), caught: f(H.caught), missed: f(H.missed), leaked: f(H.leaked), unanswered: f(H.unans), yourSecs: f(H.busy) });
    continue;
  }
  rows.push({ build: b.join(' ') || '(nothing)', win: (100 * wins / N).toFixed(0) + '%', spill: (spill / N).toFixed(1), secs: (time / N).toFixed(0), twins: (twins / N).toFixed(1), reports: (reports / N).toFixed(1), twice: (twice / N).toFixed(1), colds: (colds / N).toFixed(1), expired: (expired / N).toFixed(1), herds: (herds / N).toFixed(1), reappeared: (reap / N).toFixed(1), cutOff: (cut / N).toFixed(1), batchFails: (bfail / N).toFixed(1), aged: (aged / N).toFixed(1), tossed: (tossed / N).toFixed(1), deduped: (dedup / N).toFixed(1) });
}
console.table(rows);
