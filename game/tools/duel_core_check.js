// Checks js/duel-core.js, the Counterfeit Table's rules: the content is complete and consistent, each set's key
// AWS rules give the right test results, the Dupli-Queue tests agree with the shared request-path rules in
// js/aws-sim.js, and the board, his stock, the bill and the Counterfeit Rack behave as the design says.
// Run from game/:  node tools/duel_core_check.js
const T = require('../js/duel-core.js');
const AS = require('../js/aws-sim.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const job = (...needs) => ({ set: T.NEEDS[needs[0]].set, needs, w: needs.map(() => 0) });
const holds = (pin, ...needs) => T.test(pin, job(...needs)).ok;

// ---- Content ----
Object.values(T.NEEDS).forEach(n => {
  const pins = T.pinsOf(n.set);
  check(n.w.length === 3 && n.w.every(w => w.length > 10), `${n.id}: three wordings`);
  check(n.ok.length > 0 && n.ok.every(p => pins.includes(p)), `${n.id}: holders are pins of its set`);
  check(n.lure.length > 0 && n.lure.every(p => pins.includes(p) && !n.ok.includes(p)), `${n.id}: lures are look-alikes of its set that fail`);
  check(pins.every(p => typeof n.why[p] === 'string' && n.why[p].length > 8), `${n.id}: every pin of the set has a test line`);
  check(n.ok.length < pins.length, `${n.id}: not every pin holds`);
  // No wording names a pin outright.
  const names = pins.map(p => T.PINS[p].name.toLowerCase());
  check(n.w.every(w => !names.some(nm => w.toLowerCase().includes(nm))), `${n.id}: no wording names a pin`);
});
Object.keys(T.PINS).forEach(p => {
  const P = T.PINS[p];
  check(!!T.SETS[P.set] && P.back.length > 20 && P.q instanceof RegExp, `${p}: set, back and bill pattern`);
  check(T.needsOf(P.set).some(n => T.holds(p, n)), `${p}: holds at least one job of its set`);
});
Object.keys(T.SETS).forEach(set => {
  check(T.pairs(set).length >= 1, `${T.SETS[set].name}: at least one two-need job with a real look-alike`);
  // No pin holds more than 60% of its set's needs, so "one pin everywhere" loses.
  T.pinsOf(set).forEach(p => {
    const ns = T.needsOf(set), share = ns.filter(n => T.holds(p, n)).length / ns.length;
    check(share <= 0.6, `${T.SETS[set].name}: ${T.PINS[p].name} holds ${Math.round(share * 100)}% of its set's needs (60% at most)`);
  });
});

// ---- The rules, one documented behaviour at a time ----
// SQS: one consumer takes each message; SNS, EventBridge and Kinesis give every consumer its copy.
check(!holds('sqs', 'fan') && !holds('fifo', 'fan') && holds('sns', 'fan') && holds('eb', 'fan') && holds('kds', 'fan'), 'fan-out: SNS, EventBridge and Kinesis hold; queues fail');
check(holds('sqs', 'one') && holds('fifo', 'one') && !holds('sns', 'one') && !holds('kds', 'one'), 'one consumer per message: queues hold; topic and stream fail');
// Replay: Kinesis retention and the EventBridge archive; standard SNS has no archive (FIFO topics only).
check(holds('kds', 'replay') && holds('eb', 'replay') && !holds('sns', 'replay') && !holds('sqs', 'replay'), 'replay: Kinesis and the EventBridge archive hold; standard SNS and SQS fail');
// Order: FIFO groups and Kinesis shards; standard queue and topic are best-effort.
check(holds('fifo', 'order') && holds('kds', 'order') && !holds('sqs', 'order') && !holds('sns', 'order') && !holds('eb', 'order'), 'order per key: FIFO and Kinesis hold');
check(holds('fifo', 'dedup') && !holds('sqs', 'dedup') && !holds('kds', 'dedup'), 'deduplication: FIFO only');
check(holds('eb', 'route') && holds('sns', 'route') && !holds('sqs', 'route'), 'content routing: EventBridge patterns and SNS filter policies hold');
check(holds('sqs', 'wait') && holds('kds', 'wait') && !holds('sns', 'wait') && !holds('eb', 'wait'), 'consumer pulls at its own pace: queue and stream hold; pushers fail');
// KMS Encrypt's 4 KB limit, data keys for large data.
check(!holds('enc', 'big') && holds('dkey', 'big') && holds('enc', 'small') && !holds('dkey', 'small'), 'KMS: Encrypt for 4 KB, a data key for large data');
check(holds('sm', 'rotate') && !holds('pss', 'rotate') && !holds('psa', 'rotate') && !holds('enc', 'rotate'), 'rotation of a password: Secrets Manager only');
check(holds('sm', 'region') && !holds('psa', 'region'), 'cross-Region replication: Secrets Manager');
check(holds('pss', 'free') && !holds('psa', 'free') && !holds('sm', 'free'), 'no extra charge: standard parameters only');
check(holds('psa', 'warn') && !holds('pss', 'warn'), 'parameter policies: advanced only');
check(holds('enc', 'keyrot') && holds('dkey', 'keyrot') && !holds('sm', 'keyrot'), 'KMS key material rotation');
// Deployments.
check(holds('canary', 'lcan') && !holds('linear', 'lcan') && holds('linear', 'llin') && holds('allat', 'lall'), 'CodeDeploy for Lambda: canary, linear, all at once');
check(['canary', 'linear', 'allat'].every(p => !holds(p, 'full') && !holds(p, 'ebcan')), 'Lambda configs never hold a Beanstalk job');
check(['ebAll', 'rolling', 'rollb', 'immut', 'split'].every(p => !holds(p, 'lcan')), 'Beanstalk policies never hold a Lambda job');
check(!holds('rolling', 'full') && !holds('ebAll', 'full') && holds('rollb', 'full') && holds('immut', 'full'), 'full capacity: additional batch and immutable hold; rolling and all at once fail');
check(holds('rolling', 'noNew') && !holds('rollb', 'noNew') && !holds('immut', 'noNew'), 'no new instances: rolling holds');
check(holds('immut', 'drop') && !holds('rollb', 'drop'), 'old instances untouched: immutable holds; additional batch updates in place');
check(holds('split', 'ebcan') && !holds('immut', 'ebcan'), 'canary on Beanstalk: traffic splitting');
check(holds('ebAll', 'fast') && !holds('immut', 'fast'), 'fastest: all at once');
// Watchers.
check(holds('trail', 'who') && !holds('alarm', 'who') && !holds('xann', 'who'), 'who made a call: CloudTrail');
check(!holds('trail', 'read') && holds('trailD', 'read'), 'object reads: data events, off by default');
check(holds('xann', 'slow') && !holds('alarm', 'slow'), 'slow hop: X-Ray');
check(holds('xann', 'find') && !holds('xmeta', 'find'), 'search traces: annotations are indexed, metadata isn\'t');
check(holds('alarm', 'page') && !holds('logs', 'page'), 'notify on a threshold: alarm');
check(holds('logs', 'query') && !holds('alarm', 'query'), 'search log lines: Logs Insights');
// Kettles and aliases.
check(holds('prov', 'cold') && !holds('resv', 'cold'), 'cold starts: provisioned, not reserved');
check(holds('resv', 'cap') && !holds('prov', 'cap') && holds('resv', 'nofee') && !holds('prov', 'nofee'), 'reserved: floor and ceiling, no charge');
check(holds('walias', 'pct') && !holds('ver', 'pct') && holds('ver', 'fixed') && !holds('latest', 'fixed') && holds('latest', 'edit'), 'versions and aliases');
// A two-need job needs a pin that does both.
check(holds('kds', 'replay', 'order') && !holds('eb', 'replay', 'order') && !holds('fifo', 'replay', 'order'), 'two needs: only a pin doing both holds');

// ---- Agreement with js/aws-sim.js (the Sorting Floor's queue rules) ----
{
  const desks = [{ id: 'a', base: 2 }, { id: 'b', base: 2 }, { id: 'c', base: 2 }];
  const tk = id => ({ id, tag: 'any', work: 1 });
  const ran = w => { const ev = []; for (let i = 0; i < 6; i++) ev.push(...AS.tick(w, i ? [] : [tk('o1')])); return ev.filter(e => e.type === 'done').map(e => e.desk); };
  const q = AS.world({ desks }); AS.addQueue(q, false);
  const topic = AS.world({ desks }); topic.router = { kind: 'sns', filter: false };
  const bus = AS.world({ desks }); bus.router = { kind: 'eb' };
  check(new Set(ran(q)).size === 1, 'aws-sim agrees: one order in a queue is handled by one desk');
  check(new Set(ran(topic)).size === 3 && T.holds('sns', 'fan'), 'aws-sim agrees: SNS gives each of 3 desks a copy');
  void bus;
  const fq = AS.world(); AS.addQueue(fq, true);
  const ev = [];
  for (let i = 0; i < 8; i++) ev.push(...AS.tick(fq, i ? [] : [1, 2, 3, 4].map(n => ({ id: 'g' + n, tag: 'any', work: 1, n, group: 'r' })))) ;
  check(!ev.some(e => e.type === 'order') && T.holds('fifo', 'order'), 'aws-sim agrees: a FIFO group comes out in order');
}

// ---- The board ----
{
  const s = T.newNight({ night: 4, seed: 7 });
  T.startBoard(s, 'kr');
  const b = s.b;
  check(b.jobs.length === 9 && T.HARD.every(i => b.jobs[i].needs.length === 2) && [1, 3, 5, 7].every(i => b.jobs[i].needs.length === 1), 'nine jobs: two needs on the centre and corners, one on the edges');
  check(b.jobs.filter(j => j.set === 'kr').length === 5 && b.jobs.filter(j => j.set === 'dq').length === 4, 'a board mixes the lead set (5) and its partner (4)');
  check(b.jobs.every(j => T.holders(j).length > 0), 'every job has a pin that does it');
  check(b.stock.every((x, i) => x.real === T.test(x.pin, b.jobs[i]).ok), 'his stock: genuine pins hold and look-alikes crack');
  check(b.open >= 0 && b.cells[b.open] === 'him' && b.state[b.open] === 'open', 'he lays the first pin, face up');
  check(b.hand.length === T.HAND && new Set(b.hand).size === T.HAND, 'a hand of 4 different pins');
  // Calling his pin: a fake cracks and the square is yours; a genuine one holds and stays his.
  const sq = b.open, real = b.stock[sq].real;
  const r = T.act(s, { call: true });
  check(r.ok === !real && b.cells[sq] === (real ? 'him' : 'me'), 'a call: a fake cracks to you, a genuine pin stays his');
  // Same seed, same night.
  const s2 = T.newNight({ night: 4, seed: 7 }); T.startBoard(s2, 'kr');
  check(JSON.stringify(s2.b.jobs) === JSON.stringify(b.jobs) && JSON.stringify(s2.b.stock) === JSON.stringify(b.stock), 'the same seed deals the same board');
}
// Night 1: Dupli-Queue alone.
{
  const s = T.newNight({ night: 1, seed: 3 });
  check(JSON.stringify(T.offers(s)) === '["dq"]', 'night 1 offers Dupli-Queue');
  T.startBoard(s, 'dq');
  check(s.b.jobs.every(j => j.set === 'dq') && !s.b.partner, 'night 1: every job is Dupli-Queue');
}
// Nights 4 and 5: the weakest set is offered first; after a won Cup he opens on the centre.
{
  const s4 = T.newNight({ night: 4, seed: 2, weak: ['tw', 'kr'] });
  check(T.offers(s4)[0] === 'tw', 'night 4: your weakest set (by the bill) is always offered');
  const s3 = T.newNight({ night: 3, seed: 2, weak: ['tw'] });
  check(T.offers(s3).length === 2, 'night 3: two rivals by the seed');
  const s5 = T.newNight({ night: 5, seed: 2, edge: true }); T.startBoard(s5, 'sc');
  check(s5.b.cells[4] === 'him' && s5.b.stock[4].real && s5.b.open !== 4 && s5.b.open >= 0, 'night 5, after a won Cup: he opens on the centre with a genuine pin, then lays another');
  const s5b = T.newNight({ night: 5, seed: 2, edge: false }); T.startBoard(s5b, 'sc');
  check(!s5b.b.edge, 'no edge after a lost Cup');
}
// His line waits for your answer: you may still call it.
{
  const s = T.newNight({ night: 4, seed: 11 });
  T.startBoard(s, 'dq');
  const b = s.b;
  b.cells = ['him', 'him', null, null, null, null, null, null, null];
  b.state = ['stood', 'stood', null, null, null, null, null, null, null];
  b.open = -1; b.next = -1;
  const sq = T.hisMove(s);
  check(sq === 2 && T.decide(s) === null, 'his third in a line doesn\'t win before you answer it');
  b.stock[2] = T.stockFor(b.jobs[2], () => 0.99, 0);
  b.pins[2] = b.stock[2].pin;
  T.act(s, { call: true });
  check(b.cells[2] === 'me' && T.decide(s) !== 'him', 'calling a fake in his line breaks it');
}
// The bill: wrong calls first, at most 3.
{
  const s = T.newNight({ night: 4, seed: 5 });
  T.startBoard(s, 'tw');
  s.owed = [{ pin: 'trail', job: job('read'), why: 'place' }, { pin: 'alarm', job: job('who'), why: 'stood' }, { pin: 'xann', job: job('slow'), why: 'call' }, { pin: 'logs', job: job('page'), why: 'place' }];
  T.endBoard(s, 'him');
  check(s.phase === 'bill' && s.bill.items.length === 3 && s.bill.items[0].why === 'call', 'the bill: up to 3, a wrong call first');
}
// The Counterfeit Rack: marking all one way can't win.
{
  for (let seed = 1; seed < 40; seed++) {
    const s = T.newNight({ night: 4, seed }); s.boards = [{ lead: 'dq' }, { lead: 'kr' }]; s.score = [1, 1];
    T.startRack(s);
    const reals = s.rack.stock.filter(x => x.real).length;
    if (reals !== 2) { check(false, "rack seed " + seed + ": half genuine"); break; }
  }
  check(true, 'the Rack is always half genuine');
  const s = T.newNight({ night: 4, seed: 9 }); s.boards = [{ lead: 'dq' }, { lead: 'sc' }]; s.score = [1, 1];
  T.startRack(s);
  const truth = s.rack.jobs.map((j, i) => T.test(s.rack.stock[i].pin, j).ok);
  const r = T.settleRack(s, truth);
  check(r.won && s.phase === 'done' && T.cupWon(s), 'the Rack: marking the truth wins the Cup');
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
