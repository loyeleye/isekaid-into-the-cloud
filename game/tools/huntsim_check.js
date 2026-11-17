// Checks Monster Hunt's boards (js/hunt-core.js) and the rules they add to js/aws-sim.js, headless.
//   - Each new rule, one documented AWS behaviour at a time (links in js/aws-sim.js).
//   - Every board, over many seeds: winnable within its budget, nothing wins with no cards, every winning plan holds
//     the board's fix, refused cards are refused for AWS's reason, and the same seed always plays the same.
//   - Every card used on a board has its text, its "what it really does" line and a cost; every monster has a ladder.
// Run from game/:  node tools/huntsim_check.js
const AS = require('../js/aws-sim.js');
const HC = require('../js/hunt-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

// ---- The rules ----
{
  const b = AS.bucket(2, 3);
  const took = [AS.take(b), AS.take(b), AS.take(b), AS.take(b)];
  check(took.join() === 'true,true,true,false', 'token bucket: a full bucket of 3 lets 3 through, and the 4th gets 429');
  AS.refill(b);
  check(b.tokens === 2, 'token bucket: it refills at the rate');
  AS.refill(b); AS.refill(b);
  check(b.tokens === 3, 'token bucket: it never holds more than the burst');
}
{
  check(AS.retryWait(1, false, 'a') === 1 && AS.retryWait(2, false, 'a') === 1, 'retries with no backoff come straight back');
  const w = [1, 2, 3].map(n => AS.retryWait(n, true, 'x'));
  check(w[1] > w[0] && w[2] > w[1], 'exponential backoff: each wait is longer than the last');
  const spread = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(id => AS.retryWait(1, true, id)));
  check(spread.size > 1, 'jitter: neighbours retry at different times');
}
{
  const ws = Array.from({ length: 9 }, (_, i) => ({ id: 'o' + i }));
  const hot = AS.writeTurn(ws, 'hot', 3, 2);
  check(hot.ok.length === 2 && hot.throttled.length === 7, 'one key value: every write lands on one partition, which takes only its cap');
  const sh = AS.writeTurn(ws, 'shard', 3, 3);
  check(sh.load.every(n => n > 0), 'write sharding: a suffix spreads the writes across partitions');
  const un = AS.writeTurn(ws, 'unique', 3, 3);
  check(un.load.every(n => n > 0), 'a high-cardinality key spreads the writes too');
}
{
  const e = AS.iamEval;
  check(!e({}).allowed && e({}).why === 'implicit', 'IAM: nothing allows it, so it\'s implicitly denied');
  check(e({ idAllow: true }).allowed && e({ resAllow: true }).allowed, 'IAM: in one account, an identity or a resource Allow is enough');
  check(!e({ cross: true, idAllow: true }).allowed && e({ cross: true, idAllow: true, resAllow: true }).allowed, 'IAM: across accounts, both sides must allow');
  check(!e({ deny: true, idAllow: true, resAllow: true }).allowed && e({ deny: true, idAllow: true }).why === 'deny', 'IAM: an explicit Deny beats every Allow');
  check(!e({ assume: true, idAllow: true }).allowed && e({ assume: true, idAllow: true }).why === 'trust', 'IAM: AssumeRole needs the role\'s trust policy, an identity Allow alone isn\'t enough');
  check(e({ assume: true, trust: true }).allowed, 'IAM: in one account, a trust policy naming the caller is enough');
}

// ---- The boards ----
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
HC.BOARDS.forEach(b => {
  let winnable = 0, noneWins = 0, fixMissing = 0, replay = true, parIds = new Set();
  SEEDS.forEach(seed => {
    const par = HC.par(b, seed);
    if (par) { winnable++; parIds.add(par.ids.join('+')); }
    if (HC.run(b, seed, []).won) noneWins++;
    HC.plans(b, seed).forEach(ids => {
      const r = HC.run(b, seed, ids);
      if (r.won && !b.fix.every(g => g.some(id => ids.includes(id)))) fixMissing++;
    });
    const a = HC.run(b, seed, b.hand.slice(0, 2)), c = HC.run(b, seed, b.hand.slice(0, 2));
    if (JSON.stringify(a) !== JSON.stringify(c)) replay = false;
  });
  check(winnable === SEEDS.length, `${b.id}: winnable within its budget on every seed (${winnable}/${SEEDS.length})`);
  check(!noneWins, `${b.id}: no seed is won with no cards`);
  check(!fixMissing, `${b.id}: every winning plan holds the fix (${b.fix.map(g => g.join(' or ')).join(', then ')})${fixMissing ? `: ${fixMissing} plans win without it` : ''}`);
  check(replay, `${b.id}: the same seed plays the same`);
  check(HC.costOf(b.hand) > b.budget, `${b.id}: the budget can't buy the whole hand`);
  check(b.mons.every(m => HC.MONSTERS[m]) && b.tiles.every(t => ['callers', 'door', 'gate', 'queue', 'fn', 'table'].includes(t)), `${b.id}: its monsters and tiles exist`);
  check(b.hand.every(id => HC.CARDS[id] && b.tiles.includes(HC.CARDS[id].tile)), `${b.id}: every card in its hand goes on a tile it has`);
});

// Refused for AWS's reason, and placing them anyway changes nothing.
{
  const fifo = HC.board('p-fifo'), std = HC.board('p-teach');
  check(/FIFO dead-letter/.test(HC.refused(fifo, 1, 'dlq')) && !HC.refused(fifo, 1, 'dlqfifo'), 'a FIFO queue refuses a standard DLQ and takes a FIFO one');
  check(/standard dead-letter/.test(HC.refused(std, 1, 'dlqfifo')) && !HC.refused(std, 1, 'dlq'), 'a standard queue refuses a FIFO DLQ and takes a standard one');
  check(/can't change/.test(HC.refused(HC.board('g-teach'), 1, 'burstup')), 'the account-level burst can\'t be raised');
  check(JSON.stringify(HC.run(fifo, 3, ['dlq']).counts) === JSON.stringify(HC.run(fifo, 3, []).counts), 'a refused card has no effect on the run');
}
// The look-alikes do what AWS does, which isn't the fix.
{
  const t = HC.board('p-teach');
  const none = HC.run(t, 1, []), vl = HC.run(t, 1, ['vislong']), dq = HC.run(t, 1, ['dlq']);
  check((vl.counts.fail | 0) < (none.counts.fail | 0) && !vl.contained.poison, 'a longer visibility timeout: the poison message fails less often, and it\'s still in the queue');
  check(dq.counts.dlq === 1 && dq.contained.poison, 'a DLQ: after 3 failed receives it moves to the dead-letter queue');
  const pg = HC.run(t, 1, ['purge']);
  check((pg.counts.lost | 0) > 0, 'purge: good messages are lost with the bad one');
  const e = HC.board('p-echo');
  check((HC.run(e, 1, []).counts.dupe | 0) > 0 && !(HC.run(e, 1, ['vis6x']).counts.dupe | 0), 'Lambda consumer: a visibility timeout shorter than the work makes duplicates; 6x the function timeout stops them');
  check((HC.run(e, 1, ['condwrite']).counts.dupeBlocked | 0) > 0 && !(HC.run(e, 1, ['condwrite']).counts.dupe | 0), 'a conditional write: duplicates still arrive, but change nothing');
  const h = HC.board('h-teach'), hn = HC.run(h, 1, []);
  ['wcuup', 'ondemand', 'dax'].forEach(id => check(HC.run(h, 1, [id]).counts.wthrottle === hn.counts.wthrottle, `${HC.CARDS[id].name} doesn't lift the per-partition cap on a hot key`));
  check(!(HC.run(h, 1, ['shard']).counts.wthrottle | 0), 'write sharding: no throttled writes');
  const g = HC.board('g-teach');
  check((HC.run(g, 1, ['backoff']).counts.gaveUp | 0) < (HC.run(g, 1, []).counts.gaveUp | 0), 'backoff with jitter: fewer callers give up');
  check(JSON.stringify(HC.run(g, 1, ['lambdaconc']).counts) === JSON.stringify(HC.run(g, 1, []).counts), 'Lambda concurrency doesn\'t change a gate\'s 429s');
  const wd = HC.board('w-deny');
  check(!HC.run(wd, 1, ['admin']).won && !HC.run(wd, 1, ['resallow']).won, 'AdministratorAccess and another Allow both lose to the explicit Deny');
  check((HC.run(HC.board('w-teach'), 1, ['admin']).counts.leak | 0) === 1, 'AdministratorAccess also lets the stale script through');
  const c = HC.board('c-gate-hydra');
  check((HC.run(c, 1, ['backoff']).counts.wthrottle | 0) > (HC.run(c, 1, []).counts.wthrottle | 0), 'combo: fixing the gate sends more traffic onto the hot key');
  // The Phantom: one symptom, three causes. Only the clue's own fix holds, and the look-alikes change nothing.
  [['x-teach', 'tmo15', 'timeout'], ['x-oom', 'mem1g', 'oom'], ['x-throttle', 'rcup', 'throttled']].forEach(([id, fix, type]) => {
    const pb = HC.board(id), pn = HC.run(pb, 1, []);
    check((pn.counts[type] | 0) > 0 && !pn.won && HC.run(pb, 1, [fix]).won, `${id}: ${type} errors until ${HC.CARDS[fix].name}`);
    pb.hand.filter(x => x !== fix).forEach(x => check(JSON.stringify(HC.run(pb, 1, [x]).counts) === JSON.stringify(pn.counts), `${id}: ${HC.CARDS[x].name} changes nothing here`));
  });
  check(/reserved concurrency/.test(HC.refused(HC.board('x-throttle'), 1, 'provconc')) && !HC.refused(HC.board('x-teach'), 1, 'provconc'), 'provisioned concurrency is refused above the reserved concurrency');
  const two = HC.board('x-two');
  check(!HC.run(two, 1, ['tmo15']).won && !HC.run(two, 1, ['rcup']).won && HC.run(two, 1, ['tmo15', 'rcup']).won, 'two clues: each fix alone isn\'t enough, both together hold');
}
// Cards and ladders.
Object.entries(HC.CARDS).forEach(([id, c]) => {
  if (!HC.BOARDS.some(b => b.hand.includes(id))) return;
  check(c.name && c.text && c.cost >= 0 && (c.back || c.refuse), `card ${id}: name, setting, cost and what it really does`);
});
Object.keys(HC.MONSTERS).forEach(m => {
  const l = HC.ladder(m);
  check(l.length >= 2 && HC.board(l[0]).tier === 'teach', `${m}: a ladder starting on a teach board (${l.join(', ')})`);
});
check(HC.stars(true, 1, 10, { score: 10 }) === 3 && HC.stars(true, 1, 9, { score: 10 }) === 2 && HC.stars(true, 2, 99, { score: 1 }) === 1 && HC.stars(false, 1, 99, null) === 0, 'stars: 3 at par on the first deploy, 2 caught first time, 1 caught later');

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
