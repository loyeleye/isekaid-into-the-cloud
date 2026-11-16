// Checks js/aws-sim.js, the shared request-path rules, one documented AWS behaviour at a time (links in its header).
// Run from game/:  node tools/aws_sim_check.js
const AS = require('../js/aws-sim.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const tk = (id, o) => Object.assign({ id, tag: 'any', work: 1 }, o || {});
const many = (p, n, o) => Array.from({ length: n }, (_, i) => tk(p + i, o));
const run = (w, waves, extra) => { const ev = []; for (let i = 0; i < (extra || 8) + waves.length; i++) ev.push(...AS.tick(w, waves[i] || [])); return ev; };
const count = (ev, type) => ev.filter(e => e.type === type).length;

// Lambda concurrency: a direct call over the stools is throttled (429) and the caller retries, 3 attempts at most.
{
  const w = AS.world();
  const ev = AS.tick(w, many('a', 5));
  check(count(ev, 'done') === 2 && count(ev, 'throttled') === 3, 'two stools: 2 handled, 3 throttled');
  const all = ev.concat(run(w, []));
  check(count(all, 'done') + count(all, 'gaveUp') === 5, 'every throttled call is retried until handled or given up');
}
// Retries: immediate retries pile onto the next turn; backoff with jitter spreads them.
{
  const a = AS.world(), b = AS.world(); b.retry.backoff = true;
  AS.tick(a, many('r', 6)); AS.tick(b, many('r', 6));
  const ea = AS.tick(a, []), eb = AS.tick(b, []);
  check(count(eb, 'throttled') + count(eb, 'done') < count(ea, 'throttled') + count(ea, 'done'), 'backoff and jitter: fewer retries land on the very next turn');
}
// SQS standard: a burst waits in the queue instead of being throttled, and drains over turns.
{
  const w = AS.world(); AS.addQueue(w, false);
  const ev = run(w, [many('q', 8)]);
  check(count(ev, 'throttled') === 0 && count(ev, 'done') === 8, 'a queue absorbs a burst of 8 with no 429s');
  check(AS.idle(w), 'the queue drains');
}
// A queued caller doesn't get the answer.
{
  const w = AS.world(); AS.addQueue(w, false);
  const ev = run(w, [[tk('s', { sync: true })]]);
  check(count(ev, 'unanswered') === 1, 'a synchronous caller behind a queue goes unanswered');
}
// At-least-once delivery: a duplicate is handled twice, unless the write is conditional.
{
  const w = AS.world(); AS.addQueue(w, false);
  const ev = run(w, [[tk('d', { dup: true })]]);
  check(count(ev, 'dupe') === 1, 'standard queue: a duplicate copy is handled twice');
  const v = AS.world(); AS.addQueue(v, false); v.idem = true;
  const e2 = run(v, [[tk('d', { dup: true })]]);
  check(count(e2, 'dupe') === 0 && count(e2, 'dupeBlocked') === 1, 'conditional write: the second write changes nothing');
  const f = AS.world(); AS.addQueue(f, true);
  const e3 = run(f, [[tk('d', { dup: true })]]);
  check(count(e3, 'deduped') === 1 && count(e3, 'dupe') === 0, 'FIFO: the repeat is dropped within the deduplication interval');
}
// Visibility timeout shorter than the work: the message shows again and is handled twice.
{
  const w = AS.world(); AS.addQueue(w, false); w.queue.vis = 1;
  const ev = run(w, [[tk('h', { work: 2 })]]);
  check(count(ev, 'dupe') === 1, 'visibility timeout 1 under 2 turns of work: handled twice');
  const v = AS.world(); AS.addQueue(v, false); v.queue.vis = 2;
  const e2 = run(v, [[tk('h', { work: 2 })]]);
  check(count(e2, 'dupe') === 0 && count(e2, 'done') === 1, 'visibility timeout 2: handled once');
}
// Batches: one poison message brings its whole batch back, unless partial batch responses are on.
{
  const w = AS.world(); AS.addQueue(w, false); w.desks[0].batch = 2; w.desks[0].base = 1;
  const ev = run(w, [[tk('ok1'), tk('bad', { poison: true })]], 4);
  check(count(ev, 'dupe') >= 1, 'no partial batch response: the good message in a failed batch is handled again');
  const v = AS.world(); AS.addQueue(v, false); v.desks[0].batch = 2; v.desks[0].base = 1; v.desks[0].partial = true;
  const e2 = run(v, [[tk('ok1'), tk('bad', { poison: true })]], 4);
  check(count(e2, 'dupe') === 0, 'partial batch response: only the failed message comes back');
}
// Dead-letter queue: after maxReceiveCount (3) failed receives the poison message leaves; without one it keeps failing.
{
  const w = AS.world(); AS.addQueue(w, false); w.queue.dlq = true;
  const ev = run(w, [[tk('p', { poison: true })]], 10);
  check(count(ev, 'fail') === 3 && count(ev, 'dlq') === 1 && AS.idle(w), 'DLQ: 3 failed receives, then into the bin');
  const v = AS.world(); AS.addQueue(v, false);
  const e2 = run(v, [[tk('p', { poison: true })]], 10);
  check(count(e2, 'fail') > 3 && !AS.idle(v), 'no DLQ: the poison message keeps coming back');
  const n = AS.redrive(w, true), e3 = run(w, []);
  check(n === 1 && count(e3, 'done') === 1, 'redrive after the fix: the message is handled');
}
// FIFO: order within a group holds; a standard queue can break it when work runs long.
{
  const g = [tk('l1', { group: 'A', n: 1, work: 2 }), tk('l2', { group: 'A', n: 2 }), tk('l3', { group: 'A', n: 3 })];
  const w = AS.world(); AS.addQueue(w, false); w.queue.vis = 2; w.desks[0].batch = 1;
  check(count(run(w, [g.map(x => Object.assign({}, x))]), 'order') > 0, 'standard queue: a long first message lets later ones finish first');
  const f = AS.world(); AS.addQueue(f, true); f.queue.vis = 2; f.desks[0].batch = 1;
  const ef = run(f, [g.map(x => Object.assign({}, x))]);
  check(count(ef, 'order') === 0 && count(ef, 'done') === 3, 'FIFO: the group is handled in order');
  const c = AS.world({ desks: [{ id: 'main', base: 4 }] }); AS.addQueue(c, true); c.desks[0].batch = 1;
  const e1 = AS.tick(c, [tk('x1', { group: 'A', n: 1 }), tk('x2', { group: 'A', n: 2 }), tk('y1', { group: 'B', n: 1 })]);
  check(count(e1, 'done') === 2, 'FIFO: one stool per message group (2 groups, 4 stools: 2 handled this turn)');
}
// Reserved concurrency: guaranteed against a noisy neighbour, and a ceiling too.
{
  const w = AS.world({ pool: { total: 6, neighbour: 4 } });
  check(AS.stools(w).main === 2, 'noisy neighbour takes 4 of 6: 2 stools left');
  AS.reserve(w, 'main', 4);
  check(AS.stools(w).main === 4, 'reserved 4: guaranteed 4');
  const ev = AS.tick(w, many('z', 6));
  check(count(ev, 'throttled') === 2, 'reserved 4 is also the most: 6 calls, 2 throttled');
}
// SNS fan-out, filter policies and EventBridge rules.
{
  const desks = [{ id: 'mira', takes: 'thornwick' }, { id: 'seo', takes: 'peak' }];
  const mk = () => { const w = AS.world({ desks }); return w; };
  const t = () => [tk('m1', { tag: 'thornwick' }), tk('p1', { tag: 'peak' })];
  const none = mk(), e0 = AS.tick(none, t());
  check(count(e0, 'rejected') === 1, 'no router: everything goes to the first desk, which rejects what is not its own');
  const sns = mk(); sns.router = { kind: 'sns', filter: false };
  const e1 = AS.tick(sns, t());
  check(count(e1, 'done') === 2 && count(e1, 'rejected') === 2, 'SNS: every subscriber gets a copy');
  const fil = mk(); fil.router = { kind: 'sns', filter: true };
  const e2 = AS.tick(fil, t());
  check(count(e2, 'done') === 2 && count(e2, 'rejected') === 0, 'SNS filter policy: each subscriber gets only its own');
  const eb = mk(); eb.router = { kind: 'eb' };
  const e3 = AS.tick(eb, t());
  check(count(e3, 'done') === 2 && count(e3, 'rejected') === 0, 'EventBridge rule: matching events go to their target');
  const all = mk(); all.router = { kind: 'sns', filter: true };
  check(count(AS.tick(all, [tk('a1', { tag: 'any' })]), 'done') === 2, 'a message for everyone reaches every desk');
}
// IAM: implicit deny, Allow *, explicit deny.
{
  const w = AS.world();
  const e0 = AS.tick(w, [tk('f1', { forbidden: true })]);
  check(count(e0, 'leak') === 1, 'no policy work: a forbidden call gets through');
  const lp = AS.world(); lp.door.leastPriv = true;
  const e1 = AS.tick(lp, [tk('f1', { forbidden: true }), tk('f2', { forbidden: true, badge: true })]);
  check(count(e1, 'denied') === 1 && count(e1, 'leak') === 1, 'least privilege: implicitly denied, but Allow * still gets through');
  const ed = AS.world(); ed.door.leastPriv = true; ed.door.explicitDeny = true;
  check(count(AS.tick(ed, [tk('f2', { forbidden: true, badge: true })]), 'denied') === 1, 'explicit deny beats Allow *');
}
// Determinism.
{
  const a = AS.world(), b = AS.world();
  const x = JSON.stringify(run(a, [many('k', 7)])), y = JSON.stringify(run(b, [many('k', 7)]));
  check(x === y, 'the same world and arrivals give the same events');
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll aws-sim checks pass.');
process.exit(fails.length ? 1 : 0);
