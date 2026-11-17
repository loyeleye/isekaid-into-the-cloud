// The Rush (prototype, rush.html): the Sorting Floor as a real-time game. Design: project files
// game-modes/lost-and-found-real/real-game/v3 (sketch and storyboard, approved by Ladi on Nov 16: "go").
// These are the rules only, with no drawing, so tools/rush_sim.js can run them headless. js/rush.js draws them.
//
// The AWS behind each rule (DVA-C02), kept true to the docs:
//   - Stools are concurrent executions. Six in the account; the Night Clerk's function takes up to four of them, so
//     Mira's function gets what's left. A synchronous caller who finds no free stool gets a 429 (throttled) and
//     retries with backoff; after three throttles it gives up, and that request is lost (spill).
//   - Reserved stools are reserved concurrency: four are Mira's, nobody else can use them, and she can't use more.
//   - The rack is an SQS standard queue with Lambda polling it: tickets wait instead of bouncing, and delivery is at
//     least once, so now and then the same ticket arrives twice.
//   - The bin is a dead-letter queue on the rack (a redrive policy, maxReceiveCount 3). A poison ticket fails every
//     time; after a failure it stays hidden for the visibility timeout, then comes back. With no bin it never leaves.
//   - The tank is the error budget. Lost requests fill it; when it's full the claim fails.
//   - Claim 2, the Bell: ribboned tickets must reach Mira's function and the Reports function, which sits at the Night
//     Clerk's stools tonight. Without the bell, Mira copies each one out for Reports herself (her stool is held twice
//     as long: the producer calling every consumer itself). The bell is an SNS topic with both as subscribers: one
//     ring and each gets its own copy. SNS invokes Lambda asynchronously, so Reports' copies wait in Lambda's own
//     event queue (the tray) until a Reports stool is free, instead of bouncing.
//   - Claim 3, the Double-claimer: nervous callers resend the same ticket (a client retrying after a timeout), and
//     the rack's at-least-once twins are back. Doing the same ticket twice pays out twice, and that's a lost request
//     in the tank. The ledger is an idempotency record in DynamoDB: before the work, Mira writes the ticket's key
//     with a conditional write (attribute_not_exists). A repeat fails the condition and is dropped at once.
//   - Night Orders (one of two picked before each claim, and they stack): optional twists on these rules.
//     Each has a catch and an upside.
//       cold:   a stool nobody has used for a few seconds is cold, and its next ticket takes three times as long.
//               That's a Lambda cold start (a new execution environment starts before your code runs). Upside: a
//               coin at the start of every wave from wave 2 (Lambda only bills while it runs, so idle is savings).
//       herd:   bounced callers all retry at the same moment instead of on their own backoff. That's a thundering
//               herd; real clients add jitter (a random wait) to spread their retries out. Upside: they try 4 times
//               before giving up, not 3 (SDKs let you set the number of attempts). The bite: every four retries
//               that land together bring a new caller (a retry storm adds load on top of the load).
//       batch:  each stool takes two tickets off the rack per trip and does them in a bit more than the time of one
//               (Lambda's batch size on an SQS trigger). Catch: if either fails, both go back (a batch fails as a
//               whole unless the function reports partial batch failures).
//       shelf:  a ticket left on the rack too long expires and is lost. That's the queue's message retention period
//               (1 minute to 14 days in SQS; seconds here). Upside: the rack is free (SQS's free tier).
//     Letters (questions between waves), stakes and the timeout are Night Orders too, but they're about the
//     questions, so they live in js/rush.js.
(function (root) {
  const SD = root.SD = root.SD || {};
  const T = {
    slide: 0.9, walk: 0.5, work: 1.4, done: 0.7, bounce: 0.9, splat: 0.6, tobin: 0.8, back: 0.5, hidden: 1.6,
    backoff: [0.6, 1.4], gap: 3, clog: 6, drop: 0.45, coldAfter: 2, coldX: 3, herd: 2.5, retain: 20,
    // The Slow Courier: heavy parcels take longer; the rack hides a taken ticket for vis seconds (visHourglass with
    // the hourglass); the stopwatch cuts any job off at fnTimeout. Batching does two tickets in batchX of the time.
    heavy: 4, vis: 3, visHourglass: 9, fnTimeout: 6, stuckSay: 7, batchX: 1.5
  };
  const STOOLS = 6, CLERK_MAX = 4, RESERVE = 4, CAP = 12, MAX_THROTTLES = 3, MAX_RECEIVES = 3, TWIN_P = 0.1;
  // Each wave: how many tickets, over how many seconds, and how many of them are poison.
  const WAVES = [
    { n: 10, secs: 4, poison: 0 },
    { n: 14, secs: 5, poison: 0 },
    { n: 12, secs: 5, poison: 3 },
    { n: 24, secs: 6, poison: 2 }
  ];
  // The claims, played in order. A claim's locked tools show on the belt as "next claim".
  const CLAIMS = {
    rush: { name: 'THE RUSH', title: 'the Rush', waves: WAVES, locked: ['bell'], next: 'bell', close: 95, clerk: 'papers' },
    bell: {
      name: 'THE BELL', title: 'the Bell', locked: [], next: 'double', close: 70, clerk: 'reports',
      waves: [
        { n: 10, secs: 5, poison: 0, ribbon: 0.8 },
        { n: 14, secs: 5, poison: 0, ribbon: 0.8 },
        { n: 14, secs: 5, poison: 2, ribbon: 0.7 },
        { n: 20, secs: 6, poison: 1, ribbon: 0.8 }
      ]
    }
  };
  CLAIMS.double = {
    name: 'THE DOUBLE-CLAIMER', title: 'the Double-claimer', locked: [], next: null, close: 80, clerk: 'papers',
    belt: ['rack', 'reserve', 'bin', 'ledger'], resend: 0.35, twiceCosts: true,
    waves: [
      { n: 10, secs: 5, poison: 0 },
      { n: 12, secs: 5, poison: 0 },
      { n: 12, secs: 5, poison: 1 },
      { n: 16, secs: 6, poison: 1 }
    ]
  };
  // Claim 4: some parcels are heavy and some never finish. The rack is already up, and it hides a taken ticket for
  // only 3 seconds: a job that runs longer reappears on the rack, someone else does it too, and it pays out twice.
  // The hourglass is the queue's visibility timeout (longer than any honest job); the stopwatch is the function's
  // timeout (it cuts a stuck job off so it fails, goes back and, with the bin, ends up there). It needs both, the
  // stopwatch shorter than the hourglass: AWS says set the visibility timeout to at least 6 times the function's.
  CLAIMS.slow = {
    name: 'THE SLOW COURIER', title: 'the Slow Courier', locked: [], next: null, close: 85, clerk: 'papers',
    belt: ['reserve', 'bin', 'hourglass', 'stopwatch'], rackUp: true, visibility: true, twiceCosts: true,
    waves: [
      { n: 8, secs: 5, poison: 0, heavy: 0.4 },
      { n: 10, secs: 5, poison: 1, heavy: 0.4 },
      { n: 10, secs: 5, poison: 1, heavy: 0.4 },
      { n: 12, secs: 6, poison: 1, heavy: 0.4 }
    ]
  };
  CLAIMS.double.next = 'slow';
  const TOOLS = {
    rack: { name: 'Rack', aws: 'SQS standard queue', cost: 1 },
    reserve: { name: 'Bolted stools', aws: 'Reserved concurrency', cost: 1 },
    bin: { name: 'Dead-letter bin', aws: 'Dead-letter queue', cost: 1 },
    bell: { name: 'Bell', aws: 'SNS topic (fan-out)', cost: 1 },
    ledger: { name: 'Ledger', aws: 'DynamoDB conditional write (idempotency)', cost: 1 },
    hourglass: { name: 'Hourglass', aws: 'Visibility timeout', cost: 1 },
    stopwatch: { name: 'Stopwatch', aws: 'Function timeout', cost: 1 }
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // coins: what's left over from the last claim, on top of the usual 2.
  function create(seed, claim, orders, coins) {
    const C = CLAIMS[claim] || CLAIMS.rush;
    const S = {
      claim: CLAIMS[claim] ? claim : 'rush', name: C.name, locked: C.locked.slice(), next: C.next, close: C.close,
      orders: new Set(orders || []), maxThrottles: (orders || []).includes('herd') ? MAX_THROTTLES + 1 : MAX_THROTTLES, saved: 0, storm: 0, lastFree: Array(STOOLS).fill(-99), colds: 0, expired: 0, herds: 0,
      clerk: C.clerk, twiceCosts: !!C.twiceCosts, belt: (C.belt || ['rack', 'reserve', 'bin', 'bell']).slice(), ledger: false, keys: new Set(), paidTwice: 0, dropped: 0, resends: 0,
      seed: seed >>> 0, rand: rng(seed || 1), time: 0, started: false, over: null, tray: [], reports: 0, rings: 0,
      wave: 0, spawns: [], nextId: 1, tickets: [], queue: [],
      rack: !!C.rackUp, reserve: false, bin: false, hourglass: false, stopwatch: false, visibility: !!C.visibility, reappeared: 0, timedOut: 0, batches: 0, batchFails: 0,
      coins: 2 + (coins || 0), bonusGiven: false,
      spill: 0, cap: CAP, handled: 0, binned: 0, twins: 0, throttles: 0, lost: 0,
      placed: [], events: [], clogT: 0, allSpawned: false
    };
    // Spawn times: each wave spreads its tickets over its seconds, with a little jitter, poison mixed in.
    let t = 0.4;
    C.waves.forEach((w, wi) => {
      const poisonAt = new Set();
      while (poisonAt.size < w.poison) poisonAt.add(2 + Math.floor(S.rand() * (w.n - 2)));
      for (let i = 0; i < w.n; i++) {
        const poison = poisonAt.has(i);
        const at = t + (i / w.n) * w.secs + S.rand() * 0.25, key = 'k' + S.spawns.length;
        S.spawns.push({ t: at, wave: wi + 1, poison, stuck: poison && !!C.visibility, ribbon: !poison && S.rand() < (w.ribbon || 0), heavy: !poison && !!w.heavy && S.rand() < w.heavy, key });
        // A nervous caller sends the same ticket again a moment later.
        if (!poison && C.resend && S.rand() < C.resend) S.spawns.push({ t: at + 0.8 + S.rand() * 1.6, wave: wi + 1, poison: false, ribbon: false, key, resend: true });
      }
      t += w.secs + T.gap;
    });
    S.spawns.sort((a, b) => a.t - b.t);
    return S;
  }
  // Which stools are whose. Index 0 is next to Mira's desk.
  function owners(S) {
    const mira = S.reserve ? RESERVE : STOOLS - CLERK_MAX;
    return Array.from({ length: STOOLS }, (_, i) => (i < mira ? 'mira' : 'clerk'));
  }
  function seats(S) {
    const own = owners(S), busy = new Set(S.tickets.filter(k => k.stool != null).map(k => k.stool));
    return own.map((o, i) => ({ owner: o, ticket: busy.has(i) ? S.tickets.find(k => k.stool === i).id : null }));
  }
  // In the Rush the Night Clerk's papers hold his stools; in the Bell they're the Reports function's.
  // A stool counts as warm while it's in use (a ticket was just freed from it this frame).
  function busySince(S, i) { return S.lastFree[i] >= S.time; }
  function freeStool(S, owner) {
    const s = seats(S), o = owner || 'mira';
    if (o === 'clerk' && S.clerk === 'papers') return -1;
    for (let i = 0; i < s.length; i++) if (s[i].owner === o && s[i].ticket == null) return i;
    return -1;
  }
  const ev = (S, type, data) => S.events.push(Object.assign({ type, t: S.time }, data || {}));
  // Shelf life's upside: the rack is free.
  function costOf(S, tool) { return tool === 'rack' && S.orders.has('shelf') ? 0 : TOOLS[tool].cost; }
  function canPlace(S, tool) {
    const d = TOOLS[tool];
    if (!d) return 'unknown';
    if (S.locked.includes(tool) || !S.belt.includes(tool)) return 'locked';
    if (S[tool]) return 'placed';
    if (S.coins < costOf(S, tool)) return 'coins';
    if (S.over) return 'over';
    return '';
  }
  function place(S, tool) {
    const why = canPlace(S, tool);
    if (why) return why;
    S[tool] = true; S.coins -= costOf(S, tool); S.placed.push(tool);
    // Tickets already waiting their turn to retry walk onto the new rack.
    ev(S, 'place', { tool });
    return '';
  }
  function start(S) { if (!S.started && !S.over) { S.started = true; ev(S, 'lever'); } }
  function go(k, phase, dur) { k.phase = phase; k.t = 0; k.dur = dur; }
  function spawn(S, sp) {
    if (sp.resend) { S.resends++; ev(S, 'resend', { key: sp.key }); }
    const k = { id: S.nextId++, key: sp.key, wave: sp.wave, poison: sp.poison, stuck: !!sp.stuck, heavy: !!sp.heavy, ribbon: sp.ribbon, desk: 'mira', twin: !!sp.resend, throttles: 0, receives: 0, stool: null, from: 'chute', phase: '', t: 0, dur: 0 };
    go(k, 'slide', T.slide);
    S.tickets.push(k);
  }
  // Onto the rack. Retention counts from when the ticket was first sent, not each time it comes back.
  function enqueue(S, k) { go(k, 'shelf', 0); if (k.queuedAt == null) k.queuedAt = S.time; S.queue.push(k.id); }
  function free(S, k) { if (k.stool != null) S.lastFree[k.stool] = S.time; k.stool = null; }
  function remove(S, k) { S.tickets = S.tickets.filter(x => x !== k); }
  // The ticket reaches the bottom of the chute.
  function arrive(S, k) {
    // The bell rings once and Reports gets its own copy, which waits in the tray.
    if (k.ribbon && S.bell) {
      k.ribbon = false; S.rings++;
      const c = { id: S.nextId++, wave: k.wave, poison: false, ribbon: false, desk: 'reports', twin: false, throttles: 0, receives: 0, stool: null, from: 'tray', phase: '', t: 0, dur: 0 };
      go(c, 'tray', 0); S.tickets.push(c); S.tray.push(c.id);
      ev(S, 'ring', { id: k.id, copy: c.id });
    }
    if (S.rack) { enqueue(S, k); return; }
    const i = freeStool(S);
    if (i >= 0) { k.stool = k.seat = i; k.from = 'chute'; go(k, 'walk', T.walk); return; }
    k.throttles++; S.throttles++;
    ev(S, 'throttle', { id: k.id, n: k.throttles });
    if (k.throttles >= S.maxThrottles) { go(k, 'splat', T.splat); return; }
    go(k, 'bounce', T.bounce);
  }
  function workOf(k) { return k.stuck ? Infinity : k.heavy ? T.heavy : k.ribbon ? T.work * 2 : T.work; }
  // Batching: the tickets riding along with this one.
  function riders(S, k) { return (k.riders || []).map(id => S.tickets.find(x => x.id === id)).filter(Boolean); }
  // A failed ticket off the rack goes back (and with the bin, into it after MAX_RECEIVES).
  function failBack(S, k) {
    if (S.bin && k.receives >= MAX_RECEIVES) { go(k, 'tobin', T.tobin); return; }
    go(k, 'back', T.back);
  }
  function finishWork(S, k) {
    const viaRack = k.from === 'rack', rs = riders(S, k);
    free(S, k);
    if (k.cutOff) { S.timedOut++; ev(S, 'timedOut', { id: k.id }); }
    // A batch succeeds or fails together: one bad ticket sends the whole batch back.
    if (rs.length) {
      const all = [k].concat(rs), bad = all.some(x => x.poison || k.cutOff);
      for (const r of rs) { r.seat = k.seat; r.host = null; }
      k.riders = null;
      if (bad) {
        S.batchFails++; ev(S, 'batchFail', { id: k.id, n: all.length });
        for (const x of all) { if (x.poison) ev(S, 'poisonFail', { id: x.id, receives: x.receives }); failBack(S, x); }
        return;
      }
      for (const r of rs) go(r, 'done', T.done);
    }
    if (k.cutOff && !k.poison) { failBack(S, k); return; }
    if (k.desk === 'reports') { go(k, 'done', T.done); return; }
    if (!k.poison) {
      go(k, 'done', T.done);
      // At-least-once delivery: now and then the rack hands the same ticket over again.
      if (viaRack && !k.twin && S.rand() < TWIN_P) {
        const tw = { id: S.nextId++, key: k.key, wave: k.wave, poison: false, twin: true, throttles: 0, receives: 0, stool: null, from: 'rack', phase: '', t: 0, dur: 0 };
        S.tickets.push(tw); enqueue(S, tw); S.twins++;
        ev(S, 'twin', { id: tw.id, of: k.id });
      }
      return;
    }
    // Poison fails every time.
    ev(S, 'poisonFail', { id: k.id, receives: k.receives });
    if (!viaRack) { go(k, 'splat', T.splat); return; }
    failBack(S, k);
  }
  function lose1(S, k, why) {
    S.spill++; S.lost++; ev(S, 'spill', { id: k.id, why });
    if (S.spill >= S.cap && !S.over) { S.over = 'lose'; ev(S, 'lose'); }
  }
  function step(S, dt) {
    if (!S.started || S.over) return;
    S.time += dt;
    const tt = S.time;
    // Waves and the bonus coin after wave 2.
    while (S.spawns.length && S.spawns[0].t <= tt) {
      const sp = S.spawns.shift();
      if (sp.wave !== S.wave) { S.wave = sp.wave; ev(S, 'wave', { wave: sp.wave }); if (sp.wave === 3 && !S.bonusGiven) { S.bonusGiven = true; S.coins++; ev(S, 'coin'); }
        // Cold stools' upside: idle stools cost nothing, and the savings come back as a coin each wave.
        if (sp.wave >= 2 && S.orders.has('cold')) { S.coins++; S.saved++; ev(S, 'saved'); } }
      spawn(S, sp);
    }
    if (!S.spawns.length) S.allSpawned = true;
    // Advance every ticket.
    for (const k of S.tickets.slice()) {
      k.t += dt;
      // A stuck job with nothing to cut it off: say so once.
      if (k.stuck && k.phase === 'work' && !k.saidStuck && k.t > T.stuckSay) { k.saidStuck = true; ev(S, 'stuck', { id: k.id }); }
      if (k.phase === 'shelf' || k.phase === 'tray' || k.phase === 'ride' || k.t < k.dur) continue;
      switch (k.phase) {
        case 'slide': arrive(S, k); break;
        case 'walk':
          // The ledger: write this ticket's key only if it isn't there. A repeat fails the condition and is dropped.
          if (S.ledger && k.desk === 'mira' && !k.poison) {
            if (S.keys.has(k.key)) {
              for (const r of riders(S, k)) { r.host = null; enqueue(S, r); }
              k.riders = null; go(k, 'drop', T.drop); S.dropped++; ev(S, 'dropped', { id: k.id }); break;
            }
            S.keys.add(k.key);
          }
          {
            let w = workOf(k);
            // Batching: two tickets in one trip, done in a bit more than the time of the longer one.
            for (const r of riders(S, k)) w = Math.max(w, workOf(r)) * T.batchX;
            // Cold start: this stool hasn't been used for a while.
            if (S.orders.has('cold') && S.time - S.lastFree[k.stool] > T.coldAfter && !busySince(S, k.stool)) { w *= T.coldX; S.colds++; ev(S, 'cold', { id: k.id, stool: k.stool }); }
            // The stopwatch cuts off any job longer than the function's timeout.
            if (S.stopwatch && w > T.fnTimeout) { k.cutOff = true; w = T.fnTimeout; }
            go(k, 'work', w);
          }
          break;
        case 'drop': free(S, k); remove(S, k); break;
        case 'work': finishWork(S, k); break;
        case 'done':
          if (k.desk === 'reports') S.reports++;
          else {
            S.handled++; if (k.ribbon) S.reports++;
            // Without the ledger, a key done before means this one paid out twice.
            if (S.twiceCosts && !S.ledger && k.key) { if (S.keys.has(k.key)) { S.paidTwice++; remove(S, k); lose1(S, k, 'twice'); break; } S.keys.add(k.key); }
          }
          remove(S, k); ev(S, 'handled', { id: k.id, twin: k.twin, desk: k.desk, copied: !!k.ribbon }); break;
        case 'bounce':
          // A herd: everyone waits for the same moment instead of their own backoff.
          if (S.orders.has('herd')) go(k, 'wait', T.herd - (S.time % T.herd) + 0.05);
          else go(k, 'wait', T.backoff[k.throttles - 1] || 1);
          break;
        case 'wait': go(k, 'slide', T.slide); break;
        case 'splat': remove(S, k); lose1(S, k, k.poison ? 'error' : 'throttled'); break;
        case 'tobin': remove(S, k); S.binned++; ev(S, 'binned', { id: k.id }); break;
        case 'back': go(k, 'hidden', T.hidden); break;
        case 'hidden': enqueue(S, k); break;
      }
      if (S.over) return;
    }
    // Shelf life: a ticket on the rack too long expires.
    if (S.orders.has('shelf') && S.queue.length) {
      for (const id of S.queue.slice()) {
        const k = S.tickets.find(x => x.id === id);
        if (k && S.time - k.queuedAt > T.retain) { S.queue = S.queue.filter(x => x !== id); remove(S, k); S.expired++; ev(S, 'expired', { id }); lose1(S, k, 'expired'); if (S.over) return; }
      }
    }
    // A herd lands: count how many retries came back down together this frame.
    if (S.orders.has('herd')) { const n = S.tickets.filter(k => k.phase === 'slide' && k.t === 0 && k.throttles).length; if (n >= 3) {
      S.herds++; ev(S, 'herd', { n });
      // A retry storm draws a crowd: every four retries landing together bring a new caller with them.
      for (let i = 0; i < Math.floor(n / 4); i++) { spawn(S, { wave: S.wave, poison: false, ribbon: false, key: 'storm' + S.nextId }); S.storm++; }
    } }
    // Lambda polls the rack: each free stool of Mira's takes the oldest ticket.
    if (S.rack) {
      let i;
      while (S.queue.length && (i = freeStool(S)) >= 0) {
        const id = S.queue.shift(), k = S.tickets.find(x => x.id === id);
        if (!k) continue;
        k.receives++; k.stool = k.seat = i; k.from = 'rack'; k.takenAt = S.time; go(k, 'walk', T.walk);
        // Batching: the stool takes a second ticket off the rack in the same trip.
        if (S.orders.has('batch') && S.queue.length) {
          const r = S.tickets.find(x => x.id === S.queue[0]);
          if (r) { S.queue.shift(); r.receives++; r.seat = i; r.from = 'rack'; r.takenAt = S.time; r.host = k.id; go(r, 'ride', 0); k.riders = [r.id]; S.batches++; }
        }
      }
    }
    // Visibility timeout: a ticket taken off the rack is hidden for vis seconds. Still being worked after that, it
    // shows up on the rack again for someone else (same key, so doing both pays out twice).
    if (S.visibility) {
      const vis = S.hourglass ? T.visHourglass : T.vis;
      for (const k of S.tickets.slice()) {
        if (k.takenAt == null || k.reappearedAt === k.takenAt || !['walk', 'work', 'ride'].includes(k.phase) || S.time - k.takenAt <= vis) continue;
        k.reappearedAt = k.takenAt;
        const c = { id: S.nextId++, key: k.key, wave: k.wave, poison: k.poison, stuck: k.stuck, heavy: k.heavy, twin: true, throttles: 0, receives: k.receives, stool: null, from: 'rack', phase: '', t: 0, dur: 0 };
        S.tickets.push(c); enqueue(S, c); S.reappeared++;
        ev(S, 'reappear', { id: c.id, of: k.id });
      }
    }
    // Reports takes copies from its tray at its own stools.
    let j;
    while (S.tray.length && (j = freeStool(S, 'clerk')) >= 0) {
      const id = S.tray.shift(), k = S.tickets.find(x => x.id === id);
      if (!k) continue;
      k.stool = k.seat = j; go(k, 'walk', T.walk);
    }
    // Shutters down: whatever is still in the room at closing time is lost.
    if (S.close && S.time >= S.close) {
      const left = S.tickets.slice();
      ev(S, 'close', { n: left.length });
      for (const k of left) { remove(S, k); lose1(S, k, 'closed'); if (S.over) return; }
      S.over = 'win'; ev(S, 'win'); return;
    }
    // The end: every ticket resolved. Poison going round and round with no bin never resolves; after a while the
    // night calls it, and each one counts as two lost requests (it held up a stool every lap).
    if (S.allSpawned) {
      const left = S.tickets;
      if (!left.length) { S.over = 'win'; ev(S, 'win'); return; }
      if (!S.bin && left.every(k => k.poison && k.from === 'rack')) {
        S.clogT += dt;
        if (S.clogT >= T.clog) {
          ev(S, 'clog', { n: left.length });
          for (const k of left.slice()) { remove(S, k); lose1(S, k, 'clog'); lose1(S, k, 'clog'); if (S.over) return; }
          S.over = 'win'; ev(S, 'win');
        }
      } else S.clogT = 0;
    }
  }
  function drain(S) { const e = S.events; S.events = []; return e; }
  const ORDERS = ['letters', 'cold', 'herd', 'shelf', 'batch', 'stakes', 'timeout'];
  SD.rushCore = { T, WAVES, CLAIMS, TOOLS, ORDERS, STOOLS, CAP, MAX_THROTTLES, MAX_RECEIVES, create, step, start, place, canPlace, costOf, seats, owners, drain };
  if (typeof module !== 'undefined') module.exports = SD.rushCore;
})(typeof window !== 'undefined' ? window : globalThis);
