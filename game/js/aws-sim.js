// The request path, simulated: the AWS rules shared by the Sorting Floor (js/floor-core.js) and, later, Incident
// Commander (agreed between the two design threads, Nov 16). Pure rules, no DOM and no randomness: the same world and
// the same arrivals always give the same events. Loads in the browser (SD.awsSim) and in Node (require).
//
// Every rule below was checked against the current AWS docs on Nov 16, 2026. Game time is in turns and game numbers
// are small; the comments give the real values, and nothing here should teach a false rule.
//   - Standard queue: at-least-once delivery (a copy can arrive twice), best-effort ordering, nearly unlimited
//     throughput. https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
//   - FIFO queue: strict order within a message group, exactly-once processing, a 5-minute deduplication interval.
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
//     Lambda reads a group in order, and its concurrency is capped by the number of message group IDs.
//     https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html
//   - Visibility timeout: a received message is hidden, and comes back if it isn't deleted in time (default 30 s,
//     max 12 h). https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
//     AWS advises at least 6x the function timeout. https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
//   - Dead-letter queue: after maxReceiveCount receives a message moves to the DLQ; a FIFO queue needs a FIFO DLQ;
//     messages can be moved out again (redrive).
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
//   - Batches: without ReportBatchItemFailures a failed batch comes back whole, successes included; with it, only the
//     reported IDs. Batch size default 10 (max 10,000 standard, 10 FIFO).
//     https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
//   - Concurrency: reserved concurrency is both a floor and a ceiling for one function, carved from the account pool;
//     over the limit, Invoke returns TooManyRequestsException (429).
//     https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html  https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
//   - Retries: SDK standard mode uses exponential backoff with jitter, 3 attempts by default.
//     https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
//   - SNS: every subscriber gets every message by default; a filter policy (attributes or body) narrows it.
//     https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
//   - EventBridge: a rule matches an event pattern and sends to up to 5 targets.
//     https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html
//   - DynamoDB: a condition expression such as attribute_not_exists stops an overwrite (ConditionalCheckFailedException).
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
//   - IAM: everything is implicitly denied unless allowed, and an explicit deny beats any allow.
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
//
// A ticket (one request or event): { id, tag, sync, work, poison, dup, n, group, forbidden, badge }
//   tag: its source, which desk should handle it ('any' for every desk) · sync: the caller waits for the answer
//   work: turns of processing (1, or 2 for a heavy one) · poison: fails every time · dup: the producer sends it twice
//   n, group: its place in an ordered group · forbidden: an action nobody should be allowed · badge: it carries Allow *
// The world (see AS.world): door, router, queue, desks, pool, retry, idem, plus the running state.
// Events (AS.tick's result): { type, id, desk } with type one of
//   denied, done, dupe, dupeBlocked, order, leak, rejected, fail, throttled, gaveUp, unanswered, dlq, deduped
(function (root) {
  const AS = {};

  AS.world = function (o) {
    o = o || {};
    return {
      t: 0,
      door: { leastPriv: false, explicitDeny: false },
      router: null,                      // null | { kind: 'sns', filter: bool } | { kind: 'eb' }
      queue: null,                       // AS.addQueue
      desks: (o.desks || [{ id: 'main', takes: 'any', base: 2 }]).map(d => ({
        id: d.id, name: d.name || '', takes: d.takes || 'any', base: d.base == null ? 2 : d.base, reserved: null, batch: 2, partial: false,
        busy: [], extra: 0
      })),
      pool: o.pool || null,              // { total, neighbour }: an account pool shared with a noisy neighbour
      retry: { backoff: false, max: 3 },
      idem: false,                       // conditional writes: a second write of the same ticket changes nothing
      pending: [],                       // [{ tk, at }] retries waiting for their turn
      done: {}, last: {}, seen: {},      // tickets handled, last n per group, deliveries per ticket
      resolved: {},                      // tickets settled for good (handled by the right desk, or denied)
      log: []
    };
  };
  AS.addQueue = function (w, fifo) {
    w.queue = { fifo: !!fifo, vis: 1, dlq: false, maxReceive: 3, items: [], bin: [], dedup: {} };
    return w.queue;
  };

  // Stools (concurrency) per desk this turn. Reserved desks get exactly their reservation; the noisy neighbour then
  // takes what it wants of the rest, and unreserved desks share what's left (each up to its base).
  AS.stools = function (w) {
    const out = {};
    const pool = w.pool;
    if (!pool) { w.desks.forEach(d => { out[d.id] = (d.reserved != null ? d.reserved : d.base) + d.extra; }); return out; }
    let left = pool.total;
    w.desks.forEach(d => { if (d.reserved != null) { out[d.id] = d.reserved; left -= d.reserved; } });
    left -= Math.min(pool.neighbour, Math.max(0, left));
    w.desks.forEach(d => { if (d.reserved == null) { const n = Math.max(0, Math.min(d.base, left)); out[d.id] = n; left -= n; } });
    w.desks.forEach(d => { out[d.id] += d.extra; });
    return out;
  };
  AS.reserve = function (w, deskId, n) {
    const d = w.desks.find(x => x.id === deskId);
    if (!d) return false;
    const others = w.desks.reduce((a, x) => a + (x !== d && x.reserved != null ? x.reserved : 0), 0);
    if (w.pool && others + n > w.pool.total) return false;
    d.reserved = n;
    return true;
  };

  const ev = (w, type, tk, desk) => { const e = { type, id: tk ? tk.id : null, desk: desk || null, t: w.t }; w.log.push(e); return e; };
  const deskFor = (w, id) => w.desks.find(d => d.id === id);
  const fits = (d, tk) => d.takes === 'any' || tk.tag === 'any' || d.takes === tk.tag;

  // The door: least privilege denies what nobody was allowed; Allow * gets through unless an explicit deny says no.
  function door(w, tk, out) {
    if (!tk.forbidden) return true;
    if (w.door.explicitDeny || (w.door.leastPriv && !tk.badge)) { out.push(ev(w, 'denied', tk)); w.resolved[tk.id] = 1; return false; }
    return true;
  }
  // The router: which desks get a copy. No router: the first desk. SNS: every desk (a filter policy: only those that
  // take its tag). EventBridge: the desks whose rule matches its tag (built in, up to 5 targets).
  function route(w, tk) {
    if (!w.router) return [w.desks[0]];
    if (w.router.kind === 'sns' && !w.router.filter) return w.desks.slice();
    const m = w.desks.filter(d => fits(d, tk));
    return w.router.kind === 'eb' ? m.slice(0, 5) : m;
  }

  // Handling one delivery at a desk: the side effect happens here.
  function handle(w, d, tk, out) {
    if (!fits(d, tk)) { out.push(ev(w, 'rejected', tk, d.id)); return 'rejected'; }
    if (tk.poison) { out.push(ev(w, 'fail', tk, d.id)); return 'fail'; }
    const key = tk.id + '@' + (tk.tag === 'any' ? d.id : 'x');
    if (w.done[key]) { out.push(ev(w, w.idem ? 'dupeBlocked' : 'dupe', tk, d.id)); return 'ok'; }
    w.done[key] = 1;
    if (tk.group != null) {
      const prev = w.last[tk.group] || 0;
      if (tk.n !== prev + 1) out.push(ev(w, 'order', tk, d.id));
      w.last[tk.group] = Math.max(prev, tk.n);
    }
    if (tk.forbidden) out.push(ev(w, 'leak', tk, d.id));
    else out.push(ev(w, 'done', tk, d.id));
    w.resolved[tk.id] = 1;
    return 'ok';
  }

  // A direct (synchronous) call that found no free stool: 429, and the caller retries.
  function throttle(w, tk, out) {
    out.push(ev(w, 'throttled', tk));
    tk.attempts = (tk.attempts | 0) + 1;
    if (tk.attempts >= w.retry.max) { out.push(ev(w, 'gaveUp', tk)); w.resolved[tk.id] = 1; return; }
    // Immediate retry: next turn, on top of the new arrivals. Backoff: 1 then 2 turns, with jitter spreading
    // neighbours apart (deterministic: odd ids one turn later).
    const wait = w.retry.backoff ? Math.pow(2, tk.attempts - 1) + (idNum(tk) % 2) : 1;
    w.pending.push({ tk, at: w.t + wait });
  }
  const idNum = tk => { let h = 0; String(tk.id).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) | 0; }); return Math.abs(h); };

  function enqueue(w, d, tk, out) {
    const q = w.queue;
    if (tk.sync) out.push(ev(w, 'unanswered', tk, d.id));   // a queued caller gets a message ID, not the answer
    const copies = tk.dup ? 2 : 1;
    for (let i = 0; i < copies; i++) {
      if (q.fifo) {
        const k = tk.id + '@' + d.id;
        if (q.dedup[k] != null && w.t - q.dedup[k] < 5) { out.push(ev(w, 'deduped', tk, d.id)); continue; }
        q.dedup[k] = w.t;
      }
      q.seq = (q.seq | 0) + 1;
      q.items.push({ mid: q.seq, tk, desk: d.id, hide: 0, recv: 0, seq: q.seq });
    }
  }

  // One turn: arrivals (and retries due) go through the door and the router, into the queue or straight to a desk;
  // then the desks work, the queue's hidden messages tick down, and stools poll the queue.
  AS.tick = function (w, arrivals) {
    w.t++;
    const out = [];
    const due = w.pending.filter(p => p.at <= w.t);
    w.pending = w.pending.filter(p => p.at > w.t);
    const incoming = (arrivals || []).map(tk => Object.assign({ attempts: 0 }, tk)).concat(due.map(p => p.tk));
    const st = AS.stools(w);
    const free = {};
    w.desks.forEach(d => { free[d.id] = st[d.id] - d.busy.length; });

    // 1. Work in progress first: stools that finish this turn free up for new work.
    w.desks.forEach(d => {
      const still = [];
      d.busy.forEach(b => {
        b.left--;
        if (b.left > 0) { still.push(b); return; }
        finish(w, d, b, out);
      });
      d.busy = still;
      free[d.id] = st[d.id] - d.busy.length;
    });
    // 2. Hidden messages tick; a message whose visibility timeout runs out shows again, even mid-work.
    if (w.queue) w.queue.items.forEach(m => { if (m.hide > 0) m.hide--; });

    // 3. Arrivals.
    incoming.forEach(tk => {
      if (!door(w, tk, out)) return;
      // A retry goes back to the desk it was calling, not through the router again.
      const to = tk.toDesk ? [deskFor(w, tk.toDesk)].filter(Boolean) : route(w, tk);
      to.forEach(d => {
        if (w.queue) return enqueue(w, d, tk, out);
        // Direct: a producer that sends twice calls twice (only a FIFO queue's deduplication would catch it).
        for (let i = 0; i < (tk.dup && !tk.attempts ? 2 : 1); i++) {
          if (free[d.id] > 0) { free[d.id]--; startDirect(w, d, tk, out); } else throttle(w, Object.assign({}, tk, { dup: false, toDesk: d.id }), out);
        }
      });
    });

    // 4. Stools poll the queue.
    if (w.queue) poll(w, free, out);
    return out;
  };

  function startDirect(w, d, tk, out) {
    tk = Object.assign({}, tk, { toDesk: d.id, dup: false });
    if (tk.work > 1) d.busy.push({ msgs: [{ tk, direct: true }], left: tk.work });
    else { const r = handle(w, d, tk, out); if (r === 'fail') throttleFail(w, tk, out); }
  }
  // A direct call that errored: the caller retries it like a throttle (and gives up after 3 attempts).
  function throttleFail(w, tk, out) {
    tk = Object.assign({}, tk);
    tk.attempts = (tk.attempts | 0) + 1;
    if (tk.attempts >= w.retry.max) { out.push(ev(w, 'gaveUp', tk)); w.resolved[tk.id] = 1; return; }
    const wait = w.retry.backoff ? Math.pow(2, tk.attempts - 1) + (idNum(tk) % 2) : 1;
    w.pending.push({ tk, at: w.t + wait });
  }

  function poll(w, free, out) {
    const q = w.queue;
    w.desks.forEach(d => {
      const usedGroups = new Set();   // FIFO: one batch per message group per turn, so groups cap the stools
      while (free[d.id] > 0) {
        let vis = q.items.filter(m => m.desk === d.id && m.hide === 0);
        if (q.fifo) {
          // The group's oldest visible message, and only if nothing of that group is still hidden (in flight).
          const inFlight = new Set(q.items.filter(m => m.desk === d.id && m.hide > 0).map(gkey));
          usedGroups.forEach(g => inFlight.add(g));
          const g = vis.map(gkey).find(k => !inFlight.has(k));
          if (g == null) break;
          vis = vis.filter(m => gkey(m) === g).sort((a, b) => a.seq - b.seq);
          usedGroups.add(g);
        }
        if (!vis.length) break;
        const batch = vis.slice(0, Math.max(1, d.batch));
        batch.forEach(m => { m.recv++; m.hide = q.vis; w.seen[m.tk.id] = (w.seen[m.tk.id] | 0) + 1; });
        const work = Math.max.apply(null, batch.map(m => m.tk.work || 1));
        const b = { msgs: batch, left: work };
        free[d.id]--;
        if (work <= 1) finish(w, d, b, out); else d.busy.push(b);
      }
    });
  }
  const gkey = m => (m.tk.group != null ? m.tk.group : '#' + m.seq);

  // A batch is done: handle each message; then delete what succeeded, and return what failed (or the whole batch).
  function finish(w, d, b, out) {
    const q = w.queue;
    const res = b.msgs.map(m => handle(w, d, m.tk, out));
    if (b.msgs[0].direct) {
      if (res[0] === 'fail') throttleFail(w, b.msgs[0].tk, out);
      return;
    }
    const anyFail = res.includes('fail');
    // Looked up by id, not by reference, so a saved and reloaded world behaves the same.
    const at = m => q.items.findIndex(x => x.mid === m.mid);
    b.msgs.forEach((m, i) => {
      const k = at(m);
      if (k < 0) return;                 // already deleted (a copy that showed again finished first)
      const failed = res[i] === 'fail' || (anyFail && !d.partial);
      if (!failed) { q.items.splice(k, 1); return; }
      // It stays and comes back when its visibility timeout runs out; a poison message past maxReceiveCount goes
      // to the dead-letter queue instead.
      const live = q.items[k];
      if (q.dlq && live.recv >= q.maxReceive && res[i] === 'fail') {
        q.items.splice(k, 1); q.bin.push(live); out.push(ev(w, 'dlq', live.tk, d.id)); w.resolved[live.tk.id] = 1;
      }
    });
  }

  // Redrive: move the bin's messages back to the queue (after the bug is fixed, they're no longer poison).
  AS.redrive = function (w, fixed) {
    const q = w.queue;
    if (!q || !q.bin.length) return 0;
    const n = q.bin.length;
    q.bin.forEach(m => { m.recv = 0; m.hide = 0; if (fixed) m.tk = Object.assign({}, m.tk, { poison: false }); q.items.push(m); delete w.resolved[m.tk.id]; });
    q.bin = [];
    return n;
  };

  // Anything still moving: queued messages, stools at work, retries waiting.
  AS.idle = w => !w.pending.length && w.desks.every(d => !d.busy.length) && !(w.queue && w.queue.items.length);

  // ---- Added for Monster Hunt's boards (js/hunt-core.js, design: project files game-modes/monster-hunt/real-game-design.md) ----
  // The client's wait before retry number `attempts` (1, 2, ...): the same rule as throttle() above. Immediate: next
  // turn. Backoff: 1, 2, 4 ... turns, plus jitter that spreads neighbours apart (deterministic: odd ids one turn later).
  AS.retryWait = (attempts, backoff, id) => (backoff ? Math.pow(2, attempts - 1) + (idNum({ id }) % 2) : 1);
  AS.idNum = id => idNum({ id });

  // API Gateway throttling: a token bucket. The bucket holds up to `burst` tokens and refills at `rate` per turn; each
  // request takes one, and a request that finds the bucket empty gets 429 Too Many Requests. Real quotas: 10,000
  // requests per second with a burst of 5,000 per account per Region (2,500 / 1,250 in some newer Regions), and AWS
  // sets the account-level burst; customers can't change it.
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
  // https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
  AS.bucket = (rate, burst) => ({ rate, burst, tokens: burst });
  AS.refill = b => { b.tokens = Math.min(b.burst, b.tokens + b.rate); return b.tokens; };
  AS.take = b => { if (b.tokens > 0) { b.tokens--; return true; } return false; };

  // DynamoDB partitions: items with the same partition key value live in one partition, and each partition supports up
  // to 3,000 RCU and 1,000 WCU whatever the capacity mode (so neither more table capacity nor on-demand lifts it). Write
  // sharding adds a random or calculated suffix to the key so the writes spread across partitions.
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
  // keyMode: 'hot' (one low-cardinality value, such as status = ACTIVE), 'shard' (value + suffix) or 'unique' (a
  // high-cardinality key, such as orderId). Returns the partition each write lands on.
  // Its own name: js/aws-sim-ops.js (the Fire Drill) defines AS.partitionOf with other arguments and loads later.
  const writePartition = AS.writePartition = (keyMode, id, parts) => (keyMode === 'hot' ? 0 : idNum({ id: keyMode + ':' + id }) % parts);
  // One turn of writes: [{ id }] against `parts` partitions of `cap` writes each. Returns { ok: [ids], throttled: [ids],
  // load: [writes per partition] }. A throttled write is a throttling error the SDK retries.
  AS.writeTurn = function (writes, keyMode, parts, cap) {
    const load = Array.from({ length: parts }, () => 0), ok = [], throttled = [];
    writes.forEach(x => { const p = writePartition(keyMode, x.id, parts); if (load[p] < cap) { load[p]++; ok.push(x.id); } else { load[p]++; throttled.push(x.id); } });
    return { ok, throttled, load };
  };

  // IAM policy evaluation for one request. Everything starts implicitly denied; an explicit Deny in any applicable
  // policy beats every Allow. In one account, an Allow in either the identity-based or the resource-based policy is
  // enough (for S3); across accounts both sides must allow. Assuming a role: the role's trust policy is its
  // resource-based policy, and it must allow the caller (an identity Allow for sts:AssumeRole alone is not enough).
  // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
  // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
  // p: { deny, idAllow, resAllow, cross, assume, trust }. Returns { allowed, why: 'deny' | 'implicit' | 'trust' | 'allow' }.
  // Here an assume's trust names the caller's own ARN, so in one account it needs nothing else.
  AS.iamEval = function (p) {
    if (p.deny) return { allowed: false, why: 'deny' };
    if (p.assume) { const ok = !!p.trust && (!p.cross || !!p.idAllow); return { allowed: ok, why: ok ? 'allow' : p.trust ? 'implicit' : 'trust' }; }
    const allowed = p.cross ? !!(p.idAllow && p.resAllow) : !!(p.idAllow || p.resAllow);
    return { allowed, why: allowed ? 'allow' : 'implicit' };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AS;
  if (root && root.SD) root.SD.awsSim = AS;
})(typeof window !== 'undefined' ? window : globalThis);
