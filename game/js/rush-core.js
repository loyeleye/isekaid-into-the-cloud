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
(function (root) {
  const SD = root.SD = root.SD || {};
  const T = {
    slide: 0.9, walk: 0.5, work: 1.4, done: 0.7, bounce: 0.9, splat: 0.6, tobin: 0.8, back: 0.5, hidden: 1.6,
    backoff: [0.6, 1.4], gap: 3, clog: 6
  };
  const STOOLS = 6, CLERK_MAX = 4, RESERVE = 4, CAP = 12, MAX_THROTTLES = 3, MAX_RECEIVES = 3, TWIN_P = 0.1;
  // Each wave: how many tickets, over how many seconds, and how many of them are poison.
  const WAVES = [
    { n: 10, secs: 4, poison: 0 },
    { n: 14, secs: 5, poison: 0 },
    { n: 12, secs: 5, poison: 3 },
    { n: 24, secs: 6, poison: 2 }
  ];
  const TOOLS = {
    rack: { name: 'Rack', aws: 'SQS standard queue', cost: 1 },
    reserve: { name: 'Bolted stools', aws: 'Reserved concurrency', cost: 1 },
    bin: { name: 'Dead-letter bin', aws: 'Dead-letter queue', cost: 1 },
    bell: { name: 'Bell', aws: 'SNS fan-out', cost: 1, locked: true }
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function create(seed) {
    const S = {
      seed: seed >>> 0, rand: rng(seed || 1), time: 0, started: false, over: null,
      wave: 0, spawns: [], nextId: 1, tickets: [], queue: [],
      rack: false, reserve: false, bin: false, coins: 2, bonusGiven: false,
      spill: 0, cap: CAP, handled: 0, binned: 0, twins: 0, throttles: 0, lost: 0,
      placed: [], events: [], clogT: 0, allSpawned: false
    };
    // Spawn times: each wave spreads its tickets over its seconds, with a little jitter, poison mixed in.
    let t = 0.4;
    WAVES.forEach((w, wi) => {
      const poisonAt = new Set();
      while (poisonAt.size < w.poison) poisonAt.add(2 + Math.floor(S.rand() * (w.n - 2)));
      for (let i = 0; i < w.n; i++) S.spawns.push({ t: t + (i / w.n) * w.secs + S.rand() * 0.25, wave: wi + 1, poison: poisonAt.has(i) });
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
  function freeStool(S) {
    const s = seats(S);
    for (let i = 0; i < s.length; i++) if (s[i].owner === 'mira' && s[i].ticket == null) return i;
    return -1;
  }
  const ev = (S, type, data) => S.events.push(Object.assign({ type, t: S.time }, data || {}));
  function canPlace(S, tool) {
    const d = TOOLS[tool];
    if (!d) return 'unknown';
    if (d.locked) return 'locked';
    if (S[tool]) return 'placed';
    if (S.coins < d.cost) return 'coins';
    if (S.over) return 'over';
    return '';
  }
  function place(S, tool) {
    const why = canPlace(S, tool);
    if (why) return why;
    S[tool] = true; S.coins -= TOOLS[tool].cost; S.placed.push(tool);
    // Tickets already waiting their turn to retry walk onto the new rack.
    ev(S, 'place', { tool });
    return '';
  }
  function start(S) { if (!S.started && !S.over) { S.started = true; ev(S, 'lever'); } }
  function go(k, phase, dur) { k.phase = phase; k.t = 0; k.dur = dur; }
  function spawn(S, sp) {
    const k = { id: S.nextId++, wave: sp.wave, poison: sp.poison, twin: false, throttles: 0, receives: 0, stool: null, from: 'chute', phase: '', t: 0, dur: 0 };
    go(k, 'slide', T.slide);
    S.tickets.push(k);
  }
  function remove(S, k) { S.tickets = S.tickets.filter(x => x !== k); }
  // The ticket reaches the bottom of the chute.
  function arrive(S, k) {
    if (S.rack) { go(k, 'shelf', 0); S.queue.push(k.id); return; }
    const i = freeStool(S);
    if (i >= 0) { k.stool = k.seat = i; k.from = 'chute'; go(k, 'walk', T.walk); return; }
    k.throttles++; S.throttles++;
    ev(S, 'throttle', { id: k.id, n: k.throttles });
    if (k.throttles >= MAX_THROTTLES) { go(k, 'splat', T.splat); return; }
    go(k, 'bounce', T.bounce);
  }
  function finishWork(S, k) {
    const viaRack = k.from === 'rack';
    k.stool = null;
    if (!k.poison) {
      go(k, 'done', T.done);
      // At-least-once delivery: now and then the rack hands the same ticket over again.
      if (viaRack && !k.twin && S.rand() < TWIN_P) {
        const tw = { id: S.nextId++, wave: k.wave, poison: false, twin: true, throttles: 0, receives: 0, stool: null, from: 'rack', phase: '', t: 0, dur: 0 };
        go(tw, 'shelf', 0); S.tickets.push(tw); S.queue.push(tw.id); S.twins++;
        ev(S, 'twin', { id: tw.id, of: k.id });
      }
      return;
    }
    // Poison fails every time.
    ev(S, 'poisonFail', { id: k.id, receives: k.receives });
    if (!viaRack) { go(k, 'splat', T.splat); return; }
    if (S.bin && k.receives >= MAX_RECEIVES) { go(k, 'tobin', T.tobin); return; }
    go(k, 'back', T.back);
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
      if (sp.wave !== S.wave) { S.wave = sp.wave; ev(S, 'wave', { wave: sp.wave }); if (sp.wave === 3 && !S.bonusGiven) { S.bonusGiven = true; S.coins++; ev(S, 'coin'); } }
      spawn(S, sp);
    }
    if (!S.spawns.length) S.allSpawned = true;
    // Advance every ticket.
    for (const k of S.tickets.slice()) {
      k.t += dt;
      if (k.phase === 'shelf' || k.t < k.dur) continue;
      switch (k.phase) {
        case 'slide': arrive(S, k); break;
        case 'walk': go(k, 'work', T.work); break;
        case 'work': finishWork(S, k); break;
        case 'done': S.handled++; remove(S, k); ev(S, 'handled', { id: k.id, twin: k.twin }); break;
        case 'bounce': go(k, 'wait', T.backoff[k.throttles - 1] || 1); break;
        case 'wait': go(k, 'slide', T.slide); break;
        case 'splat': remove(S, k); lose1(S, k, k.poison ? 'error' : 'throttled'); break;
        case 'tobin': remove(S, k); S.binned++; ev(S, 'binned', { id: k.id }); break;
        case 'back': go(k, 'hidden', T.hidden); break;
        case 'hidden': go(k, 'shelf', 0); S.queue.push(k.id); break;
      }
      if (S.over) return;
    }
    // Lambda polls the rack: each free stool of Mira's takes the oldest ticket.
    if (S.rack) {
      let i;
      while (S.queue.length && (i = freeStool(S)) >= 0) {
        const id = S.queue.shift(), k = S.tickets.find(x => x.id === id);
        if (!k) continue;
        k.receives++; k.stool = k.seat = i; k.from = 'rack'; go(k, 'walk', T.walk);
      }
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
  SD.rushCore = { T, WAVES, TOOLS, STOOLS, CAP, MAX_THROTTLES, MAX_RECEIVES, create, step, start, place, canPlace, seats, owners, drain };
  if (typeof module !== 'undefined') module.exports = SD.rushCore;
})(typeof window !== 'undefined' ? window : globalThis);
