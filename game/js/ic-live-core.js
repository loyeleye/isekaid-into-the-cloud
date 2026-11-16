// Incident Commander's Live shift, the rules (design: "Incident Commander: live request path design", Nov 16, approved
// by Ladi: a Live shift inside Incident Commander). An incident is a broken request path: you predict what it does,
// read its evidence, turn at most two knobs, and run a minute of traffic through js/aws-sim.js (the shared AWS rules,
// with their docs links). The SLO decides it; the bank question comes after, as the debrief (js/ic-live.js).
// Pure: no DOM, no randomness, no saves. Loads in the browser (SD.icLive.core) and in Node (tools/ic_live_check.js).
//   - A turn is 30 seconds of traffic. A minute of traffic is a few turns of arrivals, then turns for the path to drain.
//   - Every knob shows its real unit (stools are concurrent executions; seconds for the visibility timeout); the game
//     numbers are small, and nothing here teaches a false rule.
//   - Stamps (up to 3 an incident): the SLO met; at most two knobs changed (the smallest correct change); and the
//     incident's own documented setting (the concurrency maths, maxReceiveCount of at least 5, a visibility timeout of
//     at least six times the function timeout).
(function (root) {
  const AS = (root && root.SD && root.SD.awsSim) || (typeof require === 'function' ? require('./aws-sim.js') : null);
  const L = {};
  L.TURN_SECS = 30;
  L.MAX_CHANGES = 2;
  const tk = (id, o) => Object.assign({ id, tag: 'any', work: 1 }, o || {});
  const many = (p, n, o) => Array.from({ length: n }, (_, i) => tk(p + i, o));

  // ---- The three incidents of the first slice ----
  // knobs: id -> { part, name, unit, values: [{ v, label }], start, teach }; build(k) -> { world, waves, drain }
  // judge(sum, k) -> { slo: bool, sloLine, rule: bool, ruleLine }; predict: the question and how its answer is counted.
  L.INCIDENTS = [
    {
      id: 'launch', name: 'Launch night', sev: 1,
      page: 'Checkout is spinning for customers on launch night. Some orders never go through.',
      parts: ['apigw', 'orders', 'pool', 'reports'],
      evidence: {
        apigw: 'POST /orders → 502 for some callers. The integration (orders-fn) is answering "Rate Exceeded".',
        orders: 'orders-fn  Invoke → TooManyRequestsException (429). About 4 orders arrive every 30 seconds, and each takes about 30 seconds.',
        pool: 'Account concurrency: 10 in this Region (a small test account; the default is 1,000). No function has reserved concurrency.',
        reports: 'reports-job (a nightly batch) is running 8 concurrent executions right now.'
      },
      knobs: {
        reserve: { part: 'orders', name: 'Reserved concurrency (orders-fn)', unit: 'concurrent executions',
          values: [{ v: 0, label: 'None' }, { v: 2, label: '2' }, { v: 4, label: '4' }, { v: 6, label: '6' }, { v: 8, label: '8' }], start: 0,
          teach: 'Reserved concurrency is both a floor and a ceiling for one function, carved out of the account\'s pool.' },
        queue: { part: 'apigw', name: 'Put an SQS queue in front of orders-fn', unit: '',
          values: [{ v: 0, label: 'No' }, { v: 1, label: 'Yes' }], start: 0,
          teach: 'A queue answers the caller with a message ID, not the result: a caller that waits for its order can\'t use one.' },
        backoff: { part: 'apigw', name: 'Client retries', unit: '',
          values: [{ v: 0, label: 'Immediate' }, { v: 1, label: 'Backoff + jitter' }], start: 0,
          teach: 'Backoff with jitter spreads retries out. It doesn\'t add any concurrency.' }
      },
      need: 4,   // concurrency = 4 requests per 30 s turn x 1 turn each
      build(k) {
        const w = AS.world({ desks: [{ id: 'orders', name: 'orders-fn', base: 10 }], pool: { total: 10, neighbour: 8 } });
        w.retry.backoff = !!k.backoff;
        if (k.reserve) AS.reserve(w, 'orders', k.reserve);
        if (k.queue) AS.addQueue(w, false);
        return { world: w, waves: [0, 1, 2, 3].map(t => many('o' + t + '-', 4, { sync: true })), drain: 6 };
      },
      judge(s, k) {
        const total = 16, ok = s.answered;
        const slo = ok === total;
        const rule = k.reserve >= 4 && k.reserve <= 4 + 2 && !k.queue;
        return {
          slo, sloLine: `${ok} of ${total} customers got their order confirmed.`,
          rule, ruleLine: rule ? `Reserved ${k.reserve}: covers what the maths says, 4 orders every 30 s × 30 s each = 4 concurrent executions, without starving reports-job.` : 'The maths: concurrency = requests per second × duration. Here 4 every 30 s × 30 s each = 4.'
        };
      },
      predict: { q: 'Before you touch anything: of the next 16 orders, how many customers get a confirmation?', count: s => s.answered }
    },
    {
      id: 'poison', name: 'The order that wouldn\'t die', sev: 2,
      page: 'The order queue keeps growing, and some customers got two confirmation emails.',
      parts: ['queue', 'worker', 'dlq'],
      evidence: {
        queue: 'orders-queue (standard): ApproximateNumberOfMessagesVisible keeps rising. One message has been received 9 times.',
        worker: 'worker-fn: "Cannot parse order: unexpected token" for the same message ID on every batch. Batch size 3.',
        dlq: 'No dead-letter queue is set on orders-queue (no redrive policy).'
      },
      knobs: {
        partial: { part: 'worker', name: 'Partial batch responses (ReportBatchItemFailures)', unit: '',
          values: [{ v: 0, label: 'Off' }, { v: 1, label: 'On' }], start: 0,
          teach: 'Without partial batch responses, one failure brings the whole batch back, the ones that worked included.' },
        dlq: { part: 'dlq', name: 'Redrive policy to a dead-letter queue: maxReceiveCount', unit: 'receives',
          values: [{ v: 0, label: 'No DLQ' }, { v: 1, label: '1' }, { v: 3, label: '3' }, { v: 5, label: '5' }], start: 0,
          teach: 'After maxReceiveCount receives, SQS moves the message to the dead-letter queue instead of handing it out again.' },
        batch: { part: 'worker', name: 'Batch size', unit: 'messages',
          values: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }], start: 3,
          teach: 'A smaller batch means less comes back with a failure, but the bad message still comes back.' }
      },
      build(k) {
        const w = AS.world({ desks: [{ id: 'worker', name: 'worker-fn', base: 2 }] });
        AS.addQueue(w, false);
        w.queue.vis = 1;
        w.desks[0].batch = k.batch;
        w.desks[0].partial = !!k.partial;
        if (k.dlq) { w.queue.dlq = true; w.queue.maxReceive = k.dlq; }
        const waves = [0, 1, 2, 3].map(t => many('m' + t + '-', 3));
        waves[0][1] = tk('bad', { poison: true });
        return { world: w, waves, drain: 12 };
      },
      judge(s, k) {
        const good = 11, once = s.doneOnce, slo = once === good && s.dupes === 0 && s.parked === 1 && s.stuck === 0;
        return {
          slo, sloLine: `${once} of ${good} good orders processed exactly once · ${s.dupes} processed twice · bad message ${s.parked ? 'parked in the dead-letter queue' : s.stuck ? 'still going round' : 'gone'}.`,
          rule: k.dlq >= 5, ruleLine: k.dlq >= 5 ? 'maxReceiveCount 5: the Lambda guide recommends at least 5, so a message that only failed by bad luck gets more tries.' : 'The Lambda guide recommends a maxReceiveCount of at least 5 for a queue Lambda reads.'
        };
      },
      predict: { q: 'Before you touch anything: of the next 11 good orders, how many are processed exactly once?', count: s => s.doneOnce }
    },
    {
      id: 'twice', name: 'Charged twice', sev: 1,
      page: 'Customers are being charged twice for one order.',
      parts: ['queue', 'worker', 'table'],
      evidence: {
        queue: 'payments-queue (standard): visibility timeout 30 s. Some message IDs are received twice, about 30 seconds apart.',
        worker: 'charge-fn: timeout 60 s. Each charge takes about 60 seconds to finish (a slow payment provider).',
        table: 'Payments table: two items for the same order ID. Writes are plain PutItem, with no condition.'
      },
      knobs: {
        vis: { part: 'queue', name: 'Visibility timeout (payments-queue)', unit: 'seconds',
          values: [{ v: 30, label: '30 s' }, { v: 60, label: '60 s' }, { v: 360, label: '360 s' }], start: 30,
          teach: 'A received message is hidden for the visibility timeout. If it isn\'t deleted by then, it shows again, even while it is still being worked.' },
        idem: { part: 'table', name: 'Conditional write: attribute_not_exists(orderId)', unit: '',
          values: [{ v: 0, label: 'Off' }, { v: 1, label: 'On' }], start: 0,
          teach: 'A standard queue delivers at least once, so a copy can arrive twice. A conditional write makes the second one change nothing.' },
        batch: { part: 'worker', name: 'Batch size', unit: 'messages',
          values: [{ v: 1, label: '1' }, { v: 2, label: '2' }], start: 1,
          teach: 'Batch size changes how many messages one invocation takes, not how long they stay hidden.' }
      },
      fnTimeout: 60,
      build(k) {
        const w = AS.world({ desks: [{ id: 'worker', name: 'charge-fn', base: 3 }] });
        AS.addQueue(w, false);
        w.queue.vis = Math.max(1, Math.round(k.vis / L.TURN_SECS));
        w.desks[0].batch = k.batch;
        w.idem = !!k.idem;
        return { world: w, waves: [0, 1, 2].map(t => many('p' + t + '-', 2, { work: 2 })), drain: 8 };
      },
      judge(s, k) {
        const total = 6, slo = s.charged === total && s.dupes === 0;
        const rule = k.vis >= 6 * this.fnTimeout;
        return {
          slo, sloLine: `${s.charged} of ${total} orders charged · ${s.dupes} charged twice${s.blocked ? ` · ${s.blocked} second charge${s.blocked === 1 ? '' : 's'} blocked by the condition` : ''}.`,
          rule, ruleLine: rule ? 'Visibility timeout 360 s: AWS advises at least six times the function timeout (60 s) for a queue Lambda reads.' : 'AWS advises a visibility timeout of at least six times the function timeout: here 6 × 60 s = 360 s.'
        };
      },
      predict: { q: 'Before you touch anything: of the next 6 orders, how many are charged twice?', count: s => s.dupes }
    }
  ];
  L.get = id => L.INCIDENTS.find(x => x.id === id) || null;
  L.startKnobs = inc => { const k = {}; Object.keys(inc.knobs).forEach(id => { k[id] = inc.knobs[id].start; }); return k; };
  L.changes = (inc, k) => Object.keys(inc.knobs).filter(id => k[id] !== inc.knobs[id].start);

  // ---- One minute of traffic: the waves arrive, then the path drains ----
  L.run = function (inc, k) {
    const b = inc.build(k), w = b.world, turns = [];
    const n = b.waves.length + b.drain;
    for (let t = 0; t < n; t++) turns.push(AS.tick(w, b.waves[t] || []));
    const ev = [].concat.apply([], turns), c = type => ev.filter(e => e.type === type).length;
    const doneIds = {};
    ev.filter(e => e.type === 'done').forEach(e => { doneIds[e.id] = (doneIds[e.id] | 0) + 1; });
    const dupeIds = new Set(ev.filter(e => e.type === 'dupe').map(e => e.id));
    const q = w.queue;
    const sum = {
      turns: turns.map(t => { const x = {}; t.forEach(e => { x[e.type] = (x[e.type] | 0) + 1; }); return x; }),
      done: c('done'), throttled: c('throttled'), gaveUp: c('gaveUp'), unanswered: c('unanswered'), dupes: dupeIds.size,
      blocked: c('dupeBlocked'), fails: c('fail'), parked: c('dlq'),
      stuck: q ? q.items.filter(m => m.tk.poison).length : 0,
      backlog: q ? q.items.length : 0
    };
    // Synchronous callers get an answer only from a direct call that was handled.
    const unans = new Set(ev.filter(e => e.type === 'unanswered').map(e => e.id));
    sum.answered = Object.keys(doneIds).filter(id => !unans.has(id)).length;
    sum.doneOnce = Object.keys(doneIds).filter(id => !dupeIds.has(id)).length;
    sum.charged = Object.keys(doneIds).length;
    const j = inc.judge(sum, k);
    const changed = L.changes(inc, k);
    sum.slo = j.slo; sum.sloLine = j.sloLine;
    sum.stamps = { slo: j.slo, small: j.slo && changed.length <= L.MAX_CHANGES, rule: j.slo && j.rule };
    sum.ruleLine = j.ruleLine;
    sum.changed = changed;
    return sum;
  };

  // The prediction's choices: the true count from the broken path, and three others near it, in order.
  L.predictChoices = function (inc) {
    const truth = inc.predict.count(L.run(inc, L.startKnobs(inc)));
    const max = inc.id === 'launch' ? 16 : inc.id === 'poison' ? 11 : 6;
    const pool = [];
    for (let d = 1; pool.length < 3 && d <= max; d++) {
      [truth - d, truth + d].forEach(v => { if (pool.length < 3 && v >= 0 && v <= max) pool.push(v); });
    }
    return { truth, choices: pool.concat(truth).sort((a, b) => a - b) };
  };

  // Reference fixes and decoys, for the check (tools/ic_live_check.js).
  L.REF = {
    launch: { fix: { reserve: 4 }, decoys: [{ queue: 1 }, { backoff: 1 }, { reserve: 2 }], also: [{ reserve: 6 }] },
    poison: { fix: { partial: 1, dlq: 5 }, decoys: [{ partial: 1 }, { dlq: 5 }, { batch: 1 }], also: [{ batch: 1, dlq: 5 }] },
    twice: { fix: { vis: 360, idem: 1 }, decoys: [{ batch: 2 }], also: [{ vis: 60 }, { vis: 360 }, { idem: 1 }] }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  if (root && root.SD) { root.SD.icLive = root.SD.icLive || {}; root.SD.icLive.core = L; }
})(typeof window !== 'undefined' ? window : globalThis);
