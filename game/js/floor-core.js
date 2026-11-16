// The Sorting Floor's rules (design: project files game-modes/lost-and-found-real/design.md, approved by Ladi Nov 16).
// A claim is a workload: its tickets come down Dutch's chute each turn, and you clear it by getting every ticket
// handled right. Cards are the services between the chute and the clerks, and a played piece stays on the floor for
// the rest of the claim, so the deck you build is the architecture you run. The AWS behaviour itself lives in
// js/aws-sim.js (shared with Incident Commander); this file is the game around it: cards, claims, the budget, the night.
// Pure: no DOM, no randomness, no saves. js/mode-floor.js draws it; tools/floor_sim.js plays it headless.
//   - A turn: draw 5, 3 Capacity, play pieces and one-shot cards, then pull the lever (AS.tick with this turn's wave).
//   - Spills from the error budget: see COST. Guard catches 3 of this turn's spill. 0% ends the night.
//   - A claim ends once its waves are in and the floor is quiet, or at its turn limit. Tickets never handled cost 2
//     each; tickets parked in the dead-letter bin cost 1 (parked isn't done) unless redriven.
//   - Each rule's first appearance carries one line from Dutch (TEACH), once per save (L9: taught by first use).
(function (root) {
  const AS = (root.SD && root.SD.awsSim) || (typeof require !== 'undefined' ? require('./aws-sim.js') : null);
  const F = {};
  F.CAP = 3; F.HAND = 5; F.BUDGET = 100; F.GUARD = 3;

  // ---- Spills: what each event costs the error budget ----
  F.COST = { throttled: 1, gaveUp: 3, unanswered: 3, dupe: 2, order: 2, rejected: 1, fail: 1, leak: 4, lost: 2, parked: 1 };

  // ---- Cards. kind: 'piece' stays on the floor for the claim; 'act' is used up. needs: 'queue' = only with a queue.
  // q: the bank pattern its debrief question is picked by. Every rule is in js/aws-sim.js with its AWS docs link.
  F.CARDS = {
    patch: { name: 'Overtime', who: 'basic', kind: 'act', cost: 1, icon: 'spanner',
      text: '+1 stool at the busiest desk this turn.' },
    guard: { name: 'Mop', who: 'basic', kind: 'act', cost: 1, icon: 'broom',
      text: 'Catch 3 of this turn\'s spill.' },
    stdq: { name: 'Standard Queue', who: 'Mira', kind: 'piece', cost: 1, icon: 'mailbox', slot: 'queue',
      text: 'Tickets wait in the rack for a free stool instead of bouncing. Order isn\'t promised, and a copy can arrive twice.',
      back: 'SQS standard: at-least-once delivery, best-effort order, nearly unlimited throughput.',
      q: /\bSQS\b|\bqueue\b/i },
    fifo: { name: 'FIFO Queue', who: 'Mira', kind: 'piece', cost: 2, icon: 'stack', slot: 'queue',
      text: 'Keeps each colour in order and drops a repeat inside its timer. One stool per colour at a time.',
      back: 'SQS FIFO: order within a message group, exactly-once processing, 5-minute deduplication. Lambda\'s concurrency is capped by the number of groups.',
      q: /FIFO|message group|deduplication/i },
    dlq: { name: 'Dead-Letter Bin', who: 'Dutch', kind: 'piece', cost: 1, icon: 'swap-bag', needs: 'queue',
      text: 'A ticket that fails its 3rd pull drops in the bin and stops blocking the line.',
      back: 'maxReceiveCount moves a message to the dead-letter queue. A FIFO queue needs a FIFO DLQ.',
      q: /dead-letter|\bDLQ\b|maxReceiveCount|redrive/i },
    partial: { name: 'Partial Batch Response', who: 'Kai', kind: 'piece', cost: 1, icon: 'checkbox-tree', needs: 'queue',
      text: 'One bad ticket no longer sends its whole batch back. Only the bad one returns.',
      back: 'ReportBatchItemFailures: only the reported message IDs are retried. Without it the whole batch comes back, successes too.',
      q: /ReportBatchItemFailures|partial batch|batch item failure|batchItemFailures/i },
    condwrite: { name: 'Conditional Write', who: 'Kai', kind: 'piece', cost: 1, icon: 'open-book',
      text: 'Kai\'s ledger: a ticket handled twice spills nothing the second time.',
      back: 'DynamoDB attribute_not_exists in a condition expression stops the overwrite (ConditionalCheckFailedException).',
      q: /ConditionExpression|condition expression|conditional (write|put|update)|attribute_not_exists|idempoten/i },
    sns: { name: 'Fan-Out', who: 'Mira', kind: 'piece', cost: 1, icon: 'ringing-bell', slot: 'router',
      text: 'Ring the bell: every desk gets its own copy of every ticket.', upText: 'Ring the bell: each desk gets a copy of only its own tickets (filter policy).',
      back: 'SNS: every subscriber gets every message unless a filter policy (attributes or body) narrows it.',
      q: /\bSNS\b|fan-?out|filter polic/i },
    filter: { name: 'Filter Policy', who: 'Mira', kind: 'piece', cost: 1, icon: 'funnel', needs: 'sns',
      text: 'Tie a tag to each desk\'s bell: it only rings for that desk\'s own tickets.',
      back: 'An SNS subscription filter policy, on message attributes or the body, so a subscriber gets only what matches.',
      q: /filter polic|\bSNS\b/i },
    eb: { name: 'EventBridge Rule', who: 'Dutch', kind: 'piece', cost: 2, icon: 'direction-signs', slot: 'router',
      text: 'Chalk a rule per desk: each ticket goes only to the desk whose pattern it matches.',
      back: 'EventBridge: a rule matches an event pattern and sends to up to 5 targets.',
      q: /EventBridge|event pattern|event bus/i },
    reserve: { name: 'Reserved Concurrency', who: 'Kai', kind: 'piece', cost: 1, icon: 'padlock',
      text: 'Bolt 4 stools to each of your desks. The Night Clerk can\'t take them, and you can\'t go over them.',
      back: 'Reserved concurrency is both a floor and a ceiling for one function, carved from the account pool.',
      q: /reserved concurrency|provisioned concurrency|concurrency limit|throttl/i },
    backoff: { name: 'Backoff and Jitter', who: 'Seo-yeon', kind: 'piece', cost: 1, icon: 'hourglass',
      text: 'Bounced callers wait 1, then 2 turns, spread apart, instead of all coming straight back.',
      back: 'SDK standard retries: exponential backoff with jitter, 3 attempts by default.',
      q: /backoff|jitter|retr(y|ies)/i },
    leastpriv: { name: 'Least Privilege', who: 'Seo-yeon', kind: 'piece', cost: 1, icon: 'key', slot: 'door',
      text: 'Only what\'s allowed gets past the door. Anything nobody allowed is turned back.',
      back: 'IAM: everything is implicitly denied unless a policy allows it.',
      q: /least privilege|implicit(ly)? den|IAM polic/i },
    deny: { name: 'Explicit Deny', who: 'Seo-yeon', kind: 'piece', cost: 1, icon: 'stop-sign', slot: 'door',
      text: 'Nail a Deny to the door. Even a ticket carrying Allow * is turned back.',
      back: 'IAM: an explicit deny overrides any allow.',
      q: /explicit deny|"Effect": ?"Deny"|\bDeny\b/i },
    redrive: { name: 'Redrive', who: 'Mira', kind: 'act', cost: 1, icon: 'return-arrow', needs: 'bin',
      text: 'Fix the clerk, then send the bin\'s tickets back to the rack. They\'re handled this time.',
      back: 'Messages can be moved out of a dead-letter queue back to their source once the bug is fixed.',
      q: /redrive|dead-letter/i }
  };
  const C = F.CARDS;
  F.STARTER = ['patch', 'patch', 'guard', 'guard', 'stdq', 'sns', 'condwrite', 'leastpriv', 'backoff', 'dlq'];
  F.cost = e => (e.up && C[e.id].kind === 'piece' ? Math.max(0, C[e.id].cost - 1) : C[e.id].cost);
  F.cardText = e => (e.up && C[e.id].upText ? C[e.id].upText : C[e.id].text) + (e.up && !C[e.id].upText && C[e.id].kind === 'piece' ? ' (Proven: costs 1 less.)' : '');

  // ---- Claims: who brings what. Ticket traits are stamped on the tickets themselves. ----
  // desks: the clerks (takes: the homeland whose tickets they handle). pool: the account's stools and the Night Clerk.
  const T = (id, o) => Object.assign({ id, tag: 'any', work: 1 }, o || {});
  const plain = (p, n, o) => Array.from({ length: n }, (_, i) => T(p + i, o));
  F.CLAIMS = {
    rush: { name: 'The Rush', home: 'thornwick', lead: 'Mira', sprite: 'mailstorm', says: 'Everyone at once!',
      desks: [{ id: 'main', name: 'Mira\'s desk', base: 2 }], pool: { total: 6, neighbour: 4 },
      waves: () => [plain('r1-', 8), plain('r2-', 2), plain('r3-', 2)], limit: 7,
      lesson: ['stdq', 'reserve', 'backoff'], reward: ['reserve', 'partial'],
      cleared: ['mira', 'smile', 'Ten people, two stools, and not one of them bounced. I\'m framing that rack.'] },
    bell: { name: 'The Bell-ringer', home: 'thornwick', lead: 'Mira', sprite: 'mailstorm', says: 'I\'ll wait. Right here.',
      desks: [{ id: 'main', name: 'Mira\'s desk', base: 4 }], pool: { total: 6, neighbour: 4 },
      waves: () => [plain('b1-', 4, { sync: true }), plain('b2-', 4, { sync: true }), plain('b3-', 4, { sync: true }), plain('b4-', 2, { sync: true })], limit: 8,
      lesson: ['reserve', 'backoff', 'stdq'], reward: ['reserve', 'filter'],
      cleared: ['mira', 'warm', 'They wanted answers, not ticket numbers. They got answers.'] },
    poison: { name: 'The Poison Pen', home: 'arcanum', lead: 'Dutch', sprite: 'hotshard', says: 'Read me again. And again.',
      desks: [{ id: 'main', name: 'Dutch\'s desk', base: 2 }], pool: { total: 6, neighbour: 4 },
      waves: () => [plain('p1-', 3).concat([T('p1-x', { poison: true })]), plain('p2-', 3), plain('p3-', 2).concat([T('p3-x', { poison: true })]), plain('p4-', 2)], limit: 8,
      lesson: ['dlq', 'partial', 'redrive'], reward: ['partial', 'redrive'],
      cleared: ['dutch', 'neutral', 'Two bad letters, in the bin where I can read them. The line kept moving.'] },
    double: { name: 'The Double-claimer', home: 'halcyon', lead: 'Kai', sprite: 'vaultgolem', says: 'Did you get it? Sending again.',
      desks: [{ id: 'main', name: 'Kai\'s desk', base: 2 }], pool: { total: 6, neighbour: 4 },
      waves: () => [[T('d1-0', { dup: true }), T('d1-1', { dup: true }), T('d1-2')], [T('d2-0', { work: 2 }), T('d2-1'), T('d2-2', { dup: true })],
        [T('d3-0', { dup: true }), T('d3-1', { work: 2 }), T('d3-2')], [T('d4-0', { dup: true }), T('d4-1')]], limit: 9,
      lesson: ['condwrite', 'fifo', 'stdq'], reward: ['eb', 'fifo'],
      cleared: ['kai', 'smile', 'Every grain counted once. Once! Do you know how rare that is?'] },
    ledger: { name: 'The Ledger', home: 'halcyon', lead: 'Kai', sprite: 'tilehoarder', says: 'One, two, three. In that order.',
      desks: [{ id: 'main', name: 'Kai\'s desk', base: 3 }], pool: { total: 7, neighbour: 4 },
      waves: () => {
        const g = (grp, from, n, heavy) => Array.from({ length: n }, (_, i) => T(`l${grp}${from + i}`, { group: grp, n: from + i, work: heavy === from + i ? 2 : 1 }));
        return [g('A', 1, 2, 1).concat(g('B', 1, 2)), g('A', 3, 2).concat(g('B', 3, 2, 3)), g('A', 5, 1).concat(g('B', 5, 1))];
      }, limit: 9,
      lesson: ['fifo', 'stdq'], reward: ['fifo', 'eb'],
      cleared: ['kai', 'neutral', 'Columns add up. Columns always add up when you let them go in order.'] },
    crowd: { name: 'The Crowd', home: 'peak', lead: 'Seo-yeon', sprite: 'shadowhero', says: 'We\'re all together. Mostly.',
      desks: [{ id: 'mira', name: 'Mira\'s desk', takes: 'thornwick', base: 2 }, { id: 'seo', name: 'Seo-yeon\'s desk', takes: 'peak', base: 2 }], pool: { total: 8, neighbour: 4 },
      waves: () => {
        const mix = (w, n) => Array.from({ length: n }, (_, i) => T(`c${w}-${i}`, { tag: i % 2 ? 'peak' : 'thornwick' }));
        return [mix(1, 4), mix(2, 4), mix(3, 4), mix(4, 2)];
      }, limit: 8,
      lesson: ['sns', 'filter', 'eb'], reward: ['eb', 'deny'],
      cleared: ['seoyeon', 'neutral', 'Each desk did its own paperwork. As it should. As it always should.'] },
    alibi: { name: 'Hooded Alibi', home: 'peak', lead: 'Seo-yeon', sprite: 'shadowhero', says: 'I\'m allowed. Probably.',
      desks: [{ id: 'main', name: 'Seo-yeon\'s desk', base: 2 }], pool: { total: 6, neighbour: 4 },
      waves: () => [plain('a1-', 2).concat([T('a1-f', { forbidden: true })]), plain('a2-', 1).concat([T('a2-f', { forbidden: true }), T('a2-s', { forbidden: true, badge: true })]),
        plain('a3-', 1).concat([T('a3-s', { forbidden: true, badge: true })]), plain('a4-', 2)], limit: 7,
      lesson: ['leastpriv', 'deny'], reward: ['deny', 'filter'],
      cleared: ['seoyeon', 'tired', 'Alibi withdrawn. File it under "nobody". Twice.'] },
    hunch: { name: 'The Hunch', home: 'arcanum', lead: 'Dutch', sprite: null, boss: true, says: 'Trust me',
      desks: [{ id: 'mira', name: 'Mira\'s desk', takes: 'thornwick', base: 2 }, { id: 'seo', name: 'Seo-yeon\'s desk', takes: 'peak', base: 2 }], pool: { total: 8, neighbour: 4 },
      waves: () => {
        const tg = i => (i % 2 ? 'peak' : 'thornwick');
        const w = (n, k, extra) => Array.from({ length: k }, (_, i) => T(`h${n}-${i}`, Object.assign({ tag: tg(i) }, extra && extra(i))));
        return [w(1, 6), w(2, 3, i => (i === 0 ? { dup: true } : {})).concat([T('h2-x', { tag: 'thornwick', poison: true })]),
          w(3, 3, i => (i === 1 ? { work: 2 } : {})).concat([T('h3-f', { tag: 'peak', forbidden: true })]),
          w(4, 4, i => (i === 2 ? { dup: true } : {})), w(5, 2)];
      }, limit: 10,
      lesson: ['sns', 'stdq', 'dlq', 'condwrite', 'leastpriv'], reward: [],
      cleared: ['dutch', 'smile', 'Huh. Smaller than it sounded.'] }
  };
  // The map: one row per claim, then the Hunch. Night 1 is one path (L7); later nights fork in the first three rows.
  F.ROWS = [['rush', 'bell'], ['poison', 'alibi'], ['double', 'ledger'], ['crowd']];
  F.choices = (night, row) => (night <= 1 ? F.ROWS[row].slice(0, 1) : F.ROWS[row].slice());

  // ---- Dutch, the first time each rule shows (TEACH), and the claim lines ----
  F.TEACH = {
    throttled: 'Bounced. Two stools, more people than that. Do the sums.',
    gaveUp: 'Third time he\'s been bounced. He\'s gone home, and his claim went with him.',
    unanswered: 'You gave him a ticket number. He wanted an answer. A queue doesn\'t give answers.',
    dupe: 'Paid that one twice. Same ticket, two stamps.',
    dupeBlocked: 'Kai\'s ledger already had it. Second stamp, no harm done.',
    deduped: 'Same ticket again, inside the timer. The FIFO rack threw the copy out.',
    order: 'Number three before number two. The ledger doesn\'t add up now.',
    rejected: 'Wrong desk. That isn\'t this clerk\'s paperwork.',
    fail: 'That one blew up again. It\'ll be back when its timer runs out.',
    dlq: 'Third failure. Into the bin. It can\'t block the line from there.',
    leak: 'Nobody should have been allowed to do that. Now somebody has.',
    denied: 'Not on the list. Didn\'t get past the door.',
    parked: 'Still in the bin. Parked isn\'t done.',
    lost: 'Never got handled. Somebody\'s still waiting.'
  };
  F.SAY = {
    arrive: 'Freya deletes rooms, and the claims come down my chute. Every ticket gets handled, or it spills. Pull the lever when you\'re set.',
    again: 'Same chute. Different crowd.',
    zero: 'Budget\'s gone. We close the shutters.',
    won: 'Huh. Smaller than it sounded.',
    lost: 'It checked out. It always does, the first time.'
  };

  // ---- A night ----
  F.newNight = function (o) {
    o = o || {};
    return { v: 1, night: o.night || 1, budget: F.BUDGET, deck: (o.deck || F.STARTER.map(id => ({ id }))).map(e => Object.assign({}, e)),
      row: 0, path: [], phase: 'map', fight: null, cleared: 0, spilled: 0, carry: (o.carry || []).slice(), taught: o.taught || {},
      used: {}, debriefs: [], log: [] };
  };

  // Deterministic shuffle (a night's seed and the claim), so a saved claim replays the same.
  const rngFrom = seed => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  F.startClaim = function (s, id, seed) {
    const cl = F.CLAIMS[id];
    const w = AS.world({ desks: cl.desks, pool: cl.pool });
    const waves = cl.waves();
    s.fight = { claim: id, turn: 0, world: w, waves, all: [].concat.apply([], waves).map(t => t.id), pieces: [], seed: (seed || 7) + s.row * 101,
      draw: [], hand: [], discard: [], cap: F.CAP, guard: 0, spill: 0, last: [], lines: [], over: false };
    const f = s.fight;
    f.draw = shuffle(s.deck.map((e, i) => i), rngFrom(f.seed));
    s.phase = 'floor';
    newTurn(s);
    return f;
  };
  function newTurn(s) {
    const f = s.fight;
    f.discard = f.discard.concat(f.hand);
    f.hand = [];
    const rnd = rngFrom(f.seed + f.turn * 13 + 1);
    while (f.hand.length < F.HAND) {
      if (!f.draw.length) {
        const back = f.discard.filter(i => !f.pieces.some(p => p.i === i));
        if (!back.length) break;
        f.draw = shuffle(back, rnd); f.discard = [];
      }
      f.hand.push(f.draw.shift());
    }
    f.cap = F.CAP; f.guard = 0;
    f.world.desks.forEach(d => { d.extra = 0; });
  }
  F.wave = s => (s.fight.waves[s.fight.turn] || []);
  F.hasQueue = s => !!s.fight.world.queue;

  // Can this hand card be played now? Returns '' or the reason, in words for the card's face.
  F.why = function (s, h) {
    const f = s.fight, e = s.deck[f.hand[h]], c = C[e.id];
    if (F.cost(e) > f.cap) return 'Not enough Capacity';
    if (c.needs === 'queue' && !f.world.queue) return 'Needs a queue on the floor';
    if (c.needs === 'sns' && !(f.world.router && f.world.router.kind === 'sns')) return 'Needs Fan-Out on the floor';
    if (e.id === 'filter' && f.world.router && f.world.router.filter) return 'Already filtered';
    if (c.needs === 'bin' && !(f.world.queue && f.world.queue.bin.length)) return 'The bin is empty';
    if (c.kind === 'piece' && f.pieces.some(p => s.deck[p.i].id === e.id)) return 'Already on the floor';
    if (c.slot && c.slot !== 'door' && f.pieces.some(p => C[s.deck[p.i].id].slot === c.slot)) return c.slot === 'queue' ? 'The floor has its queue' : 'The floor has its router';
    if (e.id === 'reserve' && f.world.desks.every(d => d.reserved != null)) return 'Already reserved';
    return '';
  };
  F.play = function (s, h) {
    const f = s.fight;
    if (f.over || F.why(s, h)) return false;
    const i = f.hand[h], e = s.deck[i], c = C[e.id], w = f.world;
    f.cap -= F.cost(e);
    f.hand.splice(h, 1);
    s.used[e.id] = (s.used[e.id] | 0) + 1;
    switch (e.id) {
      case 'patch': {
        const back = d => (w.queue ? w.queue.items.filter(m => m.desk === d.id).length : 0);
        const d = w.desks.slice().sort((a, b) => back(b) - back(a))[0];
        d.extra++; break;
      }
      case 'guard': f.guard += F.GUARD; break;
      case 'stdq': AS.addQueue(w, false); break;
      case 'fifo': AS.addQueue(w, true); break;
      case 'dlq': w.queue.dlq = true; break;
      case 'partial': w.desks.forEach(d => { d.partial = true; }); break;
      case 'condwrite': w.idem = true; break;
      case 'sns': w.router = { kind: 'sns', filter: !!e.up }; break;
      case 'filter': w.router.filter = true; break;
      case 'eb': w.router = { kind: 'eb' }; break;
      case 'reserve': w.desks.forEach(d => AS.reserve(w, d.id, w.desks.length > 1 ? Math.floor(w.pool.total / w.desks.length) : 4)); break;
      case 'backoff': w.retry.backoff = true; break;
      case 'leastpriv': w.door.leastPriv = true; break;
      case 'deny': w.door.explicitDeny = true; w.door.leastPriv = true; break;
      case 'redrive': f.redriven = (f.redriven | 0) + AS.redrive(w, true); break;
    }
    if (c.kind === 'piece') f.pieces.push({ i, id: e.id }); else f.discard.push(i);
    return true;
  };
  // The knobs on the floor: the rack's visibility dial and each desk's batch size (free to turn, any time).
  F.setVis = (s, n) => { const q = s.fight.world.queue; if (q) q.vis = Math.max(1, Math.min(3, n)); };
  F.setBatch = (s, n) => { s.fight.world.desks.forEach(d => { d.batch = Math.max(1, Math.min(3, n)); }); };

  // Pull the lever: this turn's wave goes down the chute. Returns { events, spill, caught, lines, end }.
  F.lever = function (s) {
    const f = s.fight;
    if (f.over) return null;
    const wave = F.wave(s);
    const events = AS.tick(f.world, wave);
    f.turn++;
    let spill = 0;
    events.forEach(ev => { spill += F.COST[ev.type] || 0; });
    const out = { events, spill: 0, caught: 0, lines: [], end: null };
    // Claim over: waves done and the floor quiet (the bin aside), or the turn limit.
    const cl = F.CLAIMS[f.claim];
    const quiet = f.turn >= f.waves.length && AS.idle(f.world);
    let endSpill = 0, lost = [], parked = [];
    if (quiet || f.turn >= cl.limit) {
      const bin = f.world.queue ? f.world.queue.bin.map(m => m.tk.id) : [];
      parked = bin.filter((id, k) => bin.indexOf(id) === k);
      lost = f.all.filter(id => !f.world.resolved[id] && !parked.includes(id));
      // A dead-letter "resolved" ticket that is still in the bin is parked, not done.
      endSpill = lost.length * F.COST.lost + parked.length * F.COST.parked;
      out.end = { lost: lost.length, parked: parked.length, quiet };
    }
    const total = spill + endSpill;
    out.caught = Math.min(f.guard, total);
    out.spill = total - out.caught;
    f.spill += out.spill;
    s.spilled += out.spill;
    s.budget -= out.spill;
    // First-use lines (L9), once per save.
    const types = events.map(e => e.type).concat(lost.length ? ['lost'] : [], parked.length ? ['parked'] : []);
    types.forEach(t => { if (F.TEACH[t] && !s.taught[t] && !out.lines.includes(t)) { s.taught[t] = 1; out.lines.push(t); } });
    f.last = events; f.lastOut = { spill: out.spill, caught: out.caught, end: out.end, lines: out.lines };
    if (out.end || s.budget <= 0) {
      f.over = true;
      s.phase = s.budget <= 0 ? 'zero' : 'debrief';
      if (s.budget > 0) s.cleared++;
    } else newTurn(s);
    return out;
  };

  // The piece the debrief asks about: the lesson piece Ladi played (most useful first), else the claim's first lesson.
  F.debriefCard = function (s) {
    const f = s.fight, cl = F.CLAIMS[f.claim];
    const played = f.pieces.map(p => p.id).concat(f.redriven ? ['redrive'] : []);
    return cl.lesson.find(id => played.includes(id)) || played.find(id => C[id].q) || cl.lesson[0];
  };
  // After the debrief: right upgrades that card (proven: costs 1 less, Fan-Out gets its filter policy).
  F.settle = function (s, ok, cardId) {
    if (ok) { const e = s.deck.find(x => x.id === cardId && !x.up); if (e) e.up = 1; }
    s.phase = F.CLAIMS[s.fight.claim].boss ? 'end' : 'reward';
  };
  F.rewards = s => F.CLAIMS[s.fight.claim].reward.slice();
  F.take = function (s, id) {
    if (id && C[id]) s.deck.push({ id });
    s.row++;
    s.fight = null;
    s.phase = 'map';
  };
  F.atBoss = s => s.row >= F.ROWS.length;

  // Everything a claim's tickets show on their face (for drawing): stamps in words, never colour alone.
  F.stamps = function (tk) {
    const a = [];
    if (tk.sync) a.push(['bell', 'Waiting for an answer']);
    if (tk.group != null) a.push(['num', `${tk.group}${tk.n}: in order`]);
    if (tk.dup) a.push(['dup', 'Sent twice']);
    if (tk.work > 1) a.push(['heavy', 'Heavy: 2 turns of work']);
    if (tk.badge) a.push(['star', 'Carries Allow *']);
    else if (tk.forbidden) a.push(['lock', 'Not allowed']);
    if (tk.tag && tk.tag !== 'any') a.push(['tag', tk.tag === 'peak' ? 'From Burning Peak' : 'From Thornwick']);
    return a;
  };

  // ---- Headless play for tools/floor_sim.js: a whole claim with a fixed architecture, and a whole night ----
  // build: card ids to put on the floor before the first lever (Capacity ignored), knobs: { vis, batch }.
  F.simClaim = function (id, build, knobs, o) {
    const s = F.newNight({ deck: (build || []).map(x => ({ id: x, up: o && o.up ? 1 : 0 })) });
    F.startClaim(s, id, 7);
    const f = s.fight;
    (build || []).forEach((cid, i) => {
      f.hand = [i]; f.cap = 9;
      if (!F.why(s, 0)) F.play(s, 0);
    });
    f.hand = []; f.cap = 0;
    if (knobs && knobs.vis) F.setVis(s, knobs.vis);
    if (knobs && knobs.batch) F.setBatch(s, knobs.batch);
    let out, guard = 0;
    do { f.hand = []; out = F.lever(s); if (++guard > 30) break; } while (!f.over);
    const counts = {};
    f.world.log.forEach(e => { counts[e.type] = (counts[e.type] | 0) + 1; });
    return { spill: s.spilled, turns: f.turn, end: out && out.end, counts };
  };
  // A whole night with a simple policy: play what's playable, preferring the claim's lesson pieces, and pull.
  F.simNight = function (policy, o) {
    o = o || {};
    const s = F.newNight({ night: o.night || 1 });
    const pick = row => F.choices(s.night, row)[o.fork ? F.choices(s.night, row).length - 1 : 0];
    for (;;) {
      const id = F.atBoss(s) ? 'hunch' : pick(s.row);
      F.startClaim(s, id, o.seed || 7);
      const f = s.fight, cl = F.CLAIMS[id];
      let guard = 0;
      while (!f.over && guard++ < 40) {
        policy(s, cl);
        F.lever(s);
      }
      if (s.phase === 'zero') break;
      F.settle(s, (o.p || 0.7) > 0.5, F.debriefCard(s));
      if (s.phase === 'end') break;
      const r = F.rewards(s);
      F.take(s, r[0]);
    }
    return { budget: s.budget, cleared: s.cleared, spilled: s.spilled, phase: s.phase };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  if (root && root.SD) root.SD.floor = F;
})(typeof window !== 'undefined' ? window : globalThis);
