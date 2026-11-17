// Incident Commander (design doc "Five game modes for exam prep", build spec v4, with the Nov 16 review's fixes and map
// version B): one
// on-call shift on the camp's pager board. Every incident is a bank question from Domain 4 (Troubleshooting) or Domain 1
// (Development) on a service of the request path (API Gateway, Lambda, DynamoDB, SQS, S3), plus about 1 in 4 due from
// other topics (SD.modes.pick). Stems with a symptom (an error, throttling, a timeout, latency) come first. The whole
// stem is free to read; the right answer is the fix.
//   - 3 waves of 4 incidents, then a closing major incident: 3 cards from the shift's misses and their twins.
//   - Clocks start at 2, 3 or 4 ticks. Answering costs every other open clock 1 tick, and so does each map action.
//     On the map, clocks start 2 ticks longer (4, 5 or 6), since every step costs a tick too. Opening a question
//     freezes everything: time is counted in answers and moves, never seconds.
//   - Each card shows its symptom sentence and its page cost (10, 15 or 25% budget, as SEV-3/2/1), rolled apart from
//     its clock, so "lowest clock first" is a trade-off, not a calculation.
//   - Right: resolved. Wrong: after the verdict it stays open as its twin, one retry right there (2 a shift); after
//     that, or without a twin, it's logged as missed and comes back in the major incident or through spaced review.
//   - A clock at zero pages: the card's page cost comes off the error budget, and it returns next wave as its twin.
//     A Sure miss costs 5%. The budget is only for survival; points come from the shared stake table (js/modes.js).
//   - Rules arrive one per night: shift 1 is the board; from shift 2, the request-path map; from shift 3, one free
//     pick between waves (Dutch, Coo or Bru).
//   - The map (shift 2 on, design "version B", Nov 16): you stand on a node of the path, API Gateway, Lambda, then
//     DynamoDB, SQS or S3. You can work only the incidents where you stand, and walking one step costs a tick on every
//     clock, so map clocks start 2 longer (4, 5 or 6). Each wave is 2 bank questions and 1 format item (js/qformats.js), on three
//     different nodes: a Predict item on Lambda, Spot the line elsewhere. A format item is an incident of its own, never
//     evidence before a bank question; it starts 1 tick higher, and missing it makes that node's next bank incident
//     arrive 1 tick shorter. A timeout also costs the caller upstream a tick on each of its clocks. The runbook shelf
//     off API Gateway is a detour that shows where the next wave lands and gives its clocks 3 more ticks. At most 4 map
//     actions per question (walking stays open when nothing here can be worked), "Map as list" is one tap away, and
//     it saves after every map action.
//   - At 0% the shift stops, and "Retry this wave" restarts the wave in one tap; answers already given stay logged.
//   - Saves after every answer, pick and map action (S.save.ic). Host: Uptima, the secondary pager (Kyu held it).
//   - Hypothesis (Nov 16 review, L5): working the board lifts request-path accuracy over 3 shifts. Each shift logs
//     request-path and other-topic accuracy and the clock rank of every card worked (S.save.modes.icStats). If
//     request-path accuracy isn't above other-topic accuracy by shift 3, the board isn't teaching and should change.
(function () {
  if (!SD.modes) return;
  const M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam;
  const esc = s => U.esc(s);
  const ID = 'ic', TITLE = 'INCIDENT COMMANDER';
  const WAVES = [4, 4, 4];               // incidents landing in each wave: 12 in all
  const MAJOR = 3;                        // the closing major incident, from the shift's misses and twins
  const IC = SD.ic = {};
  // Tuning (tools/modes_sim.js reads and may vary these): clocks, page costs, and the extra clock ticks the map gives.
  const T = IC.T = { CLOCKS: [2, 3, 4], COSTS: [10, 15, 25], MAP_CLOCK: 2, RUNBOOK_CLOCK: 3, FMT_CLOCK: 1, MAP_BANK: 2 };
  const RERUNS = 2;                       // twin retries per shift: keeps a shift under 20 minutes
  const SURE_MISS = 5;                    // error budget %
  const MAP_CAP = 4;                      // map actions per question
  const sv = () => S.save;
  const shift = () => sv().ic || null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const waves = () => WAVES.length + 1;   // the major incident is the last wave
  const isMajor = s => s.wave > WAVES.length;

  // ---- The request path: the services incidents land on ----
  IC.NODES = [
    { id: 'apigw', name: 'API Gateway', topics: ['apigateway'], up: null, place: 'the camp gate' },
    { id: 'lambda', name: 'Lambda', topics: ['lambda'], up: 'apigw', place: 'the forge' },
    { id: 'ddb', name: 'DynamoDB', topics: ['dynamodb', 'dax'], up: 'lambda', place: 'the ledger hall' },
    { id: 'sqs', name: 'SQS', topics: ['sqs'], up: 'lambda', place: 'the letter post' },
    { id: 's3', name: 'S3', topics: ['s3'], up: 'lambda', place: 'the storehouse' }
  ];
  const RUNBOOK = { id: 'runbook', name: 'Runbook shelf', up: 'apigw', place: 'Uptima\'s shelf' };
  const PLACES = IC.NODES.concat([RUNBOOK]);
  const place = id => PLACES.find(n => n.id === id);
  const near = id => PLACES.filter(n => n.up === id || place(id).up === n.id).map(n => n.id);
  IC.dist = function (a, b) {
    const seen = { [a]: 0 }, todo = [a];
    while (todo.length) { const x = todo.shift(); if (x === b) return seen[x]; near(x).forEach(y => { if (!(y in seen)) { seen[y] = seen[x] + 1; todo.push(y); } }); }
    return 9;
  };
  // Topic keys differ between the bank and the format items ("apigateway", "api gateway"): compare them normalised.
  const norm = t => String(t || '').toLowerCase().replace(/[\s_-]+/g, '');
  IC.norm = norm;
  IC.nodeOf = q => (q && IC.NODES.find(n => n.topics.includes(norm(q.topic)))) || null;
  // Incidents: Domain 4 and Domain 1 questions on a request-path service.
  IC.match = q => [1, 4].includes(E().domainOf(q)) && !!IC.nodeOf(q);
  const SYMPTOM = /\b(error|exception|fail|throttl|timeout|timed out|times out|latency|slow|denied|[45]\d\d\b|spike|increas|drop|lost|duplicate|missing|stale|not (?:being |)(?:receiv|deliver|invok|trigger|process|appear)|cannot|can't|unable|retr(?:y|ies))/i;
  const sentences = t => String(t || '').split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).filter(Boolean);
  // The card's symptom: the first scenario sentence that describes one, else the scenario's last sentence.
  IC.symptom = function (q) {
    const sp = M.split(q), ss = sentences(sp.scenario);
    const hit = ss.find(x => SYMPTOM.test(x)) || ss[ss.length - 1] || sp.ask;
    return hit.length > 180 ? hit.slice(0, 178).replace(/\s+\S*$/, '') + '…' : hit;
  };
  IC.hasSymptom = q => SYMPTOM.test(M.split(q).scenario || '');
  // Format items for the map: Predict on Lambda, Spot the line elsewhere (DVA-C02 items, on the node's service).
  const fmtFor = node => (SD.fmtItems || []).filter(it => (node === 'lambda' ? it.type === 'predict' : it.type === 'spot') &&
    (!it.tracks || it.tracks.includes('DVA-C02')) && IC.nodeOf(it) && IC.nodeOf(it).id === node);
  IC.fmtFor = fmtFor;
  const isFmt = id => /^fmt-/.test(String(id));
  const qOf = id => (isFmt(id) ? M.fmtItem(id) : E().find(id));

  // ---- Lines (barks: no numbers, no AWS claims) ----
  const SAY = {
    open: 'Kyu held the Cloud\'s pager since before the first server booted. I\'m the secondary. Tonight it\'s yours. Wake me if the error budget hits zero. Don\'t wake me.',
    wave: [null, 'Next wave. I\'m asleep. This is a recording of me being asleep.', 'Still going. Kyu did this every night. Every. Night.'],
    major: 'Major incident. Everything that got away tonight came back at once. They always come back.',
    sureRight: 'Resolved, and you were Sure. I\'m writing that in the postmortem. In gold.',
    right: 'Resolved. One less red light. I like fewer red lights.',
    wrong: 'Still open. Same fault, different symptoms. Read it all again. The stem is always telling on someone.',
    missed: 'That one got away. It\'ll page you again before morning. They always do.',
    sureMiss: 'You were Sure. I was Sure once. I was a goddess. Look at me now.',
    timeout: 'That one paged. It comes back next wave, in a new disguise.',
    pick: 'Between waves. Somebody\'s offering to help. Take it. I never did.',
    runbook: 'My runbook. Mostly coffee rings. But it says where the next ones land.',
    zero: 'I am risen! Thy goddess is... oh. Oh no. Kyu never woke me. Not once.',
    end: 'Shift over. Hand me the pager. ...Actually, keep it till morning.'
  };
  // Between-wave picks (spec v4): incomparable, one per break, from the third shift on.
  IC.PICKS = [
    { id: 'dutch', who: 'Dutch', what: '+2 ticks on one clock you choose', line: 'Point at a door. Nobody pages through it while I\'m standing there.' },
    { id: 'coo', who: 'Coo', what: 'The next timeout costs half', line: 'Coo. The next letter that goes astray, I\'ll catch half of it.' },
    { id: 'bru', who: 'Bru', what: 'One free step each wave (on the board: your next answer ticks no other clock)', line: 'I\'ll walk the doors myself while you work. Go. ¡Ándale!' }
  ];
  const pickDef = id => IC.PICKS.find(p => p.id === id);
  // The voice key of the line on the board (js/vo-modes.js): a helper's line after a pick is in the helper's voice.
  const voOf = m => { const p = IC.PICKS.find(x => m === `${x.who}: ${x.line}`); return p ? p.id + '|' + p.line : 'uptima|' + m; };
  const shifts = () => (sv().modes && sv().modes.icShifts) | 0;
  IC.mapOn = () => shifts() >= 1;
  IC.picksOn = () => shifts() >= 2;

  const answerText = q => (q.type === 'spot' ? `${(q.lines[q.bad] || '').trim()}: ${q.reasons[q.a]}` : q.type === 'predict' ? q.opts[q.a] : q.type === 'mc' ? q.opts[q.a] : (q.items || []).filter(i => i.ok).map(i => i.t).join(' '));
  const find = id => (isFmt(id) ? M.fmtItem(id) : SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : E().find(id));
  const used = s => s.log.map(x => x.q).concat(s.board.map(x => x.q), s.queue.map(x => x.q), s.carry.map(x => x.q), s.seen || []);
  const twinOf = (s, id) => { const q = isFmt(id) ? null : E().find(id); return q && SD.qtwin ? SD.qtwin(q, { avoid: used(s).concat(id) }) : null; };
  // Where a card lands: its service's node, or (another topic) a node picked from its id, so it stays put on resume.
  const homeOf = IC.homeOf = id => {
    const n = IC.nodeOf(E().find(id));
    if (n) return n.id;
    let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return IC.NODES[Math.abs(h) % IC.NODES.length].id;
  };

  // ---- The shift: a state machine the board UI and the simulator (tools/modes_sim.js) share ----
  IC.newShift = function (opts) {
    opts = opts || {};
    const map = opts.sim ? opts.map !== false : IC.mapOn();
    const back = opts.sim ? [] : (sv().icBacklog || []).filter(it => E().find(it.q)).slice(0, 4);
    const want = Math.max(0, WAVES.reduce((a, b) => a + b, 0) - back.length), avoid = back.map(it => it.q);
    // Stems with a symptom first; plain ones only when that pool runs short.
    let r = M.pick({ match: q => IC.match(q) && IC.hasSymptom(q), n: want, avoid });
    if (r.items.length < want) {
      const more = M.pick({ match: IC.match, n: want - r.items.length, avoid: avoid.concat(r.items.map(it => it.q)) });
      r = { items: r.items.concat(more.items), verified: r.verified + more.verified, topped: r.topped + more.topped };
    }
    const s = {
      v: 3, t: Date.now(), sim: !!opts.sim, wave: 0, phase: 'board', budget: 100, pts: 0, tally: M.newTally(),
      queue: back.map(it => ({ q: it.q, other: it.other | 0, back: 1 })).concat(r.items.map(it => ({ q: it.q, other: it.other }))),
      board: [], carry: [], log: [], seen: [], perks: {}, picked: [], verified: r.verified, topped: r.topped, msg: '', since: '', answers: 0,
      picksOn: opts.sim ? !!opts.picks : IC.picksOn(), map, debt: {}, fmtUsed: [],
      at: 'apigw', acts: 0, mapActs: 0, runbook: 0, view: 'map', ranks: []
    };
    if (!opts.sim) { sv().icBacklog = []; sv().ic = s; }
    IC.land(s, opts.rng);
    save(s);
    return s;
  };
  const save = s => { if (!s.sim) S.persist(); };
  // The major incident: whatever timed out in wave 3, then twins of tonight's misses, then twins of what you resolved.
  function majorCards(s) {
    const take = s.carry.splice(0), have = () => take.map(t => t.orig || t.q);
    const avoid = () => used(s).concat(take.map(t => t.q));
    const add = (l, why) => {
      if (take.length >= MAJOR || have().includes(l.orig)) return;
      const q = isFmt(l.q) ? null : E().find(l.q), tw = q && SD.qtwin ? SD.qtwin(q, { avoid: avoid() }) : null;
      if (tw) take.push({ q: tw.id, orig: l.orig, other: l.other, major: why });
    };
    s.log.filter(l => !l.ok).forEach(l => add(l, 'missed'));
    s.log.filter(l => l.ok).forEach(l => add(l, 'twin'));
    while (take.length < MAJOR && s.queue.length) take.push(s.queue.shift());
    return take;
  }
  // A map wave: the timed-out cards, then bank questions up to 2 on nodes not used yet this wave (the queue holds 12, so
  // there's room to choose; the rest stay unseen and come back through spaced review), then 1 format item
  // on a node none of them is on (Lambda first in turn, rotating by wave). Pure, so the runbook can show it early.
  const ROTA = ['lambda', 's3', 'sqs', 'ddb', 'apigw'];
  function plan(s, wave) {
    const bank = s.carry.slice(), nodes = () => bank.map(it => homeOf(it.q)), q = s.queue.slice();
    while (bank.length < T.MAP_BANK && q.length) {
      const k = q.findIndex(it => !nodes().includes(homeOf(it.q)));
      bank.push(q.splice(k < 0 ? 0 : k, 1)[0]);
    }
    // Not this shift's, and not one any mode asked in the last 7 days (the shared record, js/qformats.js).
    const seen = new Set((s.fmtUsed || []).concat(s.sim || !SD.qf || !SD.qf.recent ? [] : [...SD.qf.recent(7)]));
    const rota = ROTA.slice(wave % ROTA.length).concat(ROTA.slice(0, wave % ROTA.length));
    let fmt = null;
    for (const node of rota.filter(n => !nodes().includes(n)).concat(rota)) {
      const pool = fmtFor(node);
      if (!pool.length) continue;
      const item = pool.find(it => !seen.has(it.id)) || pool.slice().sort((a, b) => (seen.has(a.id) ? 1 : 0) - (seen.has(b.id) ? 1 : 0))[0];
      fmt = { q: item.id, at: node, fmt: 1 };
      break;
    }
    return { bank, fmt, rest: q };
  }
  IC.nextLanding = function (s) {
    if (!s.map || s.wave >= WAVES.length) return [];
    const p = plan(s, s.wave + 1);
    return p.bank.map(it => homeOf(it.q)).concat(p.fmt ? [p.fmt.at] : []);
  };
  IC.land = function (s, rng) {
    const R = rng || Math.random;
    s.wave++;
    let take;
    if (isMajor(s)) take = majorCards(s);
    else if (s.map) {
      const p = plan(s, s.wave);
      s.carry = []; s.queue = p.rest;
      take = p.bank.concat(p.fmt ? [p.fmt] : []);
      if (p.fmt) s.fmtUsed.push(p.fmt.q);
    } else { take = s.carry.splice(0); while (take.length < WAVES[s.wave - 1] && s.queue.length) take.push(s.queue.shift()); }
    const warned = s.map && s.runbook === s.wave - 1 && s.wave > 1 && !isMajor(s);
    s.board = take.map(it => {
      const at = it.at || homeOf(it.q), fmt = !!it.fmt;
      let c = T.CLOCKS[Math.floor(R() * T.CLOCKS.length)] + (s.map ? T.MAP_CLOCK : 0) + (warned ? T.RUNBOOK_CLOCK : 0) + (fmt ? T.FMT_CLOCK : 0);
      // Missing a node's format item: its next bank incident arrives a tick shorter.
      let shaken = 0;
      if (!fmt && s.debt && s.debt[at]) { c = Math.max(1, c - 1); shaken = 1; delete s.debt[at]; }
      const cost = T.COSTS[Math.floor(R() * T.COSTS.length)];
      return { q: it.q, orig: it.orig || it.q, other: it.other | 0, back: it.back | 0, clock: c, max: c, cost, at, fmt: fmt ? 1 : 0, shaken,
        tries: it.tries | 0, timeouts: it.timeouts | 0, dutch: 0, major: it.major || '' };
    });
    // The 4-action cap counts per answer, so a new wave landing doesn't reset it.
    // Snapshot for "Retry this wave" (answers already given stay logged).
    s.waveStart = { board: JSON.parse(JSON.stringify(s.board)), queue: s.queue.slice(), budget: s.budget, perks: Object.assign({}, s.perks), reruns: s.reruns | 0, at: s.at, debt: Object.assign({}, s.debt) };
    s.msg = isMajor(s) ? SAY.major : SAY.wave[s.wave - 1] || SAY.open;
    s.since = '';
  };
  const logOf = (s, b) => {
    let l = s.log.find(x => x.orig === b.orig);
    if (!l) s.log.push(l = { orig: b.orig, q: b.q, ok: 0, conf: -1, cost: b.cost, tries: 0, timeouts: 0, other: b.other });
    return l;
  };
  const nodeName = id => { const n = IC.nodeOf(qOf(id)); return n ? n.name : 'Elsewhere'; };
  const where = b => place(b.at).name;
  // Every clock but the one being worked drops a tick; anything at zero pages. Shared by answers and map actions.
  function tick(s, skip, notes) {
    s.board.filter(b => b !== skip).forEach(b => { b.clock--; });
    const paged = [];
    for (let pass = 0; pass < 2; pass++) {
      const out = s.board.filter(b => b.clock <= 0);
      out.forEach(b => {
        let cost = b.cost;
        if (s.perks.coo) { s.perks.coo = 0; cost = Math.ceil(cost / 2); notes.push('Coo caught half'); }
        s.budget -= cost; b.timeouts++;
        logOf(s, b).timeouts++;
        s.board.splice(s.board.indexOf(b), 1);
        paged.push(b);
        // It comes back next wave as its twin (the same question when it has none: it was never answered). In the
        // major incident there's no next wave, so it opens the next shift.
        const tw = twinOf(s, b.q);
        if (b.fmt) { s.debt[b.at] = 1; } else s.carry.push({ q: tw ? tw.id : b.q, orig: b.orig, other: b.other, tries: b.tries, timeouts: b.timeouts });
        notes.push(b.fmt ? `⏱ the check at ${where(b)} paged: −${cost}% budget, and its next incident comes in a tick shorter` : `⏱ ${where(b)} paged: −${cost}% budget, back ${isMajor(s) ? 'next shift' : 'next wave'}`);
        // On the map, a page spreads upstream: the caller's clocks each drop a tick.
        const up = s.map && place(b.at).up;
        if (up && pass === 0) {
          const hit = s.board.filter(x => x.at === up);
          hit.forEach(x => { x.clock--; });
          if (hit.length) notes.push(`it spread upstream to ${place(up).name}: −1 tick there`);
        }
      });
      if (!out.length) break;
    }
    if (paged.length) s.msg = SAY.timeout;
    s.budget = Math.max(0, s.budget);
    return paged;
  }
  // One answer: r = { ok, conf, pts }. Returns how many paged, and sets the "Since your last answer" line.
  IC.settle = function (s, inc, r) {
    const l = logOf(s, inc), conf = [0, 1, 2].includes(r.conf) ? r.conf : 0, notes = [];
    const rank = 1 + s.board.filter(b => b !== inc && b.clock < inc.clock).length;
    s.ranks.push(rank);
    s.pts += r.pts || 0; s.answers++; s.acts = 0;
    l.tries++; l.q = inc.q;
    s.seen.push(inc.q);
    if (r.scored !== false) M.note(s.tally, !!r.ok, conf);
    const idx = s.board.indexOf(inc);
    if (r.ok) {
      l.ok = 1; l.conf = conf;
      s.board.splice(idx, 1);
      s.msg = conf === 2 ? SAY.sureRight : SAY.right;
      notes.push(`✓ ${where(inc)} resolved`);
    } else {
      inc.tries++;
      if (conf === 2) { s.budget -= SURE_MISS; notes.push(`Sure miss −${SURE_MISS}% budget`); }
      const tw = inc.tries <= 1 && (s.reruns | 0) < RERUNS ? twinOf(s, inc.q) : null;   // one retry on the twin, while the shift has retries
      if (tw) { s.reruns = (s.reruns | 0) + 1; inc.q = tw.id; s.msg = conf === 2 ? SAY.sureMiss : SAY.wrong; notes.push(`↻ ${where(inc)} still open, as a new scenario`); }
      else if (inc.fmt) { s.board.splice(idx, 1); s.debt[inc.at] = 1; s.msg = conf === 2 ? SAY.sureMiss : SAY.missed; notes.push(`✗ the check at ${where(inc)} missed: its next incident comes in a tick shorter`); }
      else { s.board.splice(idx, 1); s.msg = conf === 2 ? SAY.sureMiss : SAY.missed; notes.push(`✗ ${where(inc)} missed: ${isMajor(s) ? 'it comes back in review' : 'it comes back in the major incident'}`); }
    }
    // Every answer ticks every other open clock, unless Bru is covering this one (the board, without a map).
    let paged;
    if (!s.map && s.perks.bru) { s.perks.bru = 0; notes.push('Bru covered the other clocks'); paged = []; }
    else paged = tick(s, inc, notes);
    const left = s.board.map(b => `${where(b)} ${b.clock}`);
    if (left.length && !paged.length) notes.push('clocks: ' + left.join(', '));
    s.since = 'Since your last answer: ' + notes.join(' · ') + '.';
    return paged.length;
  };
  // ---- Map actions: walk one step (the runbook shelf is a step off API Gateway). Each costs a tick on every clock. ----
  IC.canAct = function (s, kind) {
    if (s.phase !== 'board' || !s.map) return false;
    if (s.acts < MAP_CAP) return true;
    // Over the cap, walking stays open only when nothing here can be worked.
    return kind === 'walk' && !s.board.some(b => b.at === s.at);
  };
  function mapTick(s, what, free) {
    const notes = [what];
    s.acts++; s.mapActs++;
    const paged = free ? [] : tick(s, null, notes);
    if (free) notes.push('Bru walked it with you: no tick');
    s.since = 'Since your last move: ' + notes.join(' · ') + '.';
    return paged.length;
  }
  IC.walk = function (s, to) {
    if (!near(s.at).includes(to) || !IC.canAct(s, 'walk')) return false;
    const free = !!s.perks.bru && s.bruWave !== s.wave;
    if (free) s.bruWave = s.wave;
    s.at = to;
    if (to === 'runbook') s.runbook = s.wave;
    mapTick(s, `walked to ${place(to).name}${to === 'runbook' ? ', read where the next wave lands' : ''}`, free);
    if (to === 'runbook') s.msg = SAY.runbook;
    return true;
  };
  // What comes after an answer, a pick or a map action: 'zero', 'board', 'pick', or 'done'.
  IC.next = function (s, rng) {
    if (s.budget <= 0) return 'zero';
    if (s.board.length) return 'board';
    if (s.wave >= waves()) return 'done';
    if (s.picksOn && s.wave < waves() && s.picked.length < s.wave) return 'pick';
    IC.land(s, rng);
    if (!s.board.length) return s.wave >= waves() ? 'done' : IC.next(s, rng);
    return 'board';
  };
  IC.applyPick = function (s, id, rng) {
    s.picked.push(id);
    if (id === 'coo') s.perks.coo = 1;
    if (id === 'bru') s.perks.bru = 1;
    if (id === 'dutch') s.perks.dutch = 1;
    IC.land(s, rng);
    s.msg = `${pickDef(id).who}: ${pickDef(id).line}`;
  };
  IC.useDutch = function (s, i) {
    const b = s.board[i];
    if (!s.perks.dutch || !b) return false;
    s.perks.dutch = 0; b.clock += 2; b.max = Math.max(b.max, b.clock); b.dutch = 1;
    s.since = `Dutch is standing at ${where(b)}: +2 ticks.`;
    return true;
  };
  IC.retryWave = function (s) {
    const w = s.waveStart;
    s.board = JSON.parse(JSON.stringify(w.board)); s.carry = []; s.queue = w.queue.slice(); s.budget = Math.max(w.budget, 26);
    s.perks = Object.assign({}, w.perks); s.reruns = w.reruns | 0; s.at = w.at || 'apigw'; s.acts = 0; s.debt = Object.assign({}, w.debt || {});
    s.phase = 'board'; s.zero = false; s.retries = (s.retries | 0) + 1;
    s.msg = 'Again. I\'ll pretend I didn\'t see that.'; s.since = '';
  };

  // ---- The board (shift 1) and the map (shift 2 on) ----
  const sev = c => (c >= 25 ? ['🔥', 'SEV-1'] : c >= 15 ? ['⚠', 'SEV-2'] : ['ⓘ', 'SEV-3']);
  const workable = (s, b) => !s.map || b.at === s.at;
  const FMT_NAME = { spot: 'Spot the line', predict: 'Predict' };
  function cardHtml(s, b, i) {
    const q = find(b.q);
    if (!q) return '';
    const fmt = !!b.fmt, sp = fmt ? { qual: '', pick: '' } : M.split(q), [ic, lv] = sev(b.cost);
    const pips = Array.from({ length: Math.max(b.max, b.clock) }, (_, k) => (k < b.clock ? '●' : '○')).join('');
    const loc = !s.map ? (IC.nodeOf(q) ? IC.nodeOf(q).name : String(q.topic || '').toUpperCase()) : `📍 ${where(b)}`;
    const can = workable(s, b);
    const why = can ? '' : `Walk to ${where(b)} to work it (${plural(IC.dist(s.at, b.at), 'step')})`;
    // A format item's card shows its title and setup; a bank incident's shows its symptom sentence.
    const sym = fmt ? `${q.title ? q.title + ': ' : ''}${q.setup || q.q || ''}` : IC.symptom(q);
    return `<div class="ic-inc ic-${lv.toLowerCase()}${fmt ? ' ic-fmt' : ''}"><button class="opt ic-card" data-inc="${i}"${can ? '' : ' aria-disabled="true"'} aria-label="${fmt ? esc(FMT_NAME[q.type]) + ' check' : 'Incident'} at ${esc(where(b))}, ${lv}, pages for ${b.cost}%, ${plural(b.clock, 'tick')} left. ${can ? 'Open it' : esc(why)}">
      <span class="ic-top"><b class="ic-sev">${ic} ${lv} · pages −${b.cost}%</b><b>${esc(loc)}</b><span class="small"><b>${plural(b.clock, 'tick')} left</b></span></span>
      <span class="ic-clock" aria-hidden="true">${pips}</span>
      ${fmt ? `<span class="ic-qual"><b>${q.type === 'spot' ? '🔎' : '🔮'} ${esc(FMT_NAME[q.type])}</b> · a check of its own</span>` : ''}
      <span class="ic-sym">${esc(sym)}</span>
      ${sp.qual ? `<span class="ic-qual">★ Asks for: <b>${esc(sp.qual)}</b></span>` : ''}${sp.pick ? `<span class="ic-qual">☰ ${esc(sp.pick)}</span>` : ''}
      <span class="muted small ic-tags">${b.major ? '🚨 Major incident · ' : ''}${fmt ? 'Miss it and this node\'s next incident comes in a tick shorter' : b.other ? 'From another topic' : 'Request path'}${b.shaken ? ' · ↓ a tick shorter: the last check here was missed' : ''}${b.back ? ' · back from last shift' : ''}${b.tries ? ' · ↻ new scenario after a miss' : ''}${b.timeouts ? ' · ⏱ paged before' : ''}${b.dutch ? ' · 🛡 Dutch is here' : ''}</span>
      ${can ? '' : `<span class="small ic-why">→ ${esc(why)}</span>`}</button>
      ${s.perks.dutch ? `<button class="ghost ic-dutch" data-dutch="${i}">🛡 Send Dutch here (+2 ticks)</button>` : ''}</div>`;
  }
  function hud(s) {
    const b = Math.max(0, s.budget);
    const perks = [s.perks.coo ? '🪶 Coo: next timeout costs half' : '', s.perks.bru ? (s.map ? `🚪 Bru: one free step a wave${s.bruWave === s.wave ? ' (used this wave)' : ''}` : '🚪 Bru: next answer ticks no clock') : '', s.perks.dutch ? '🛡 Dutch: +2 on one clock' : ''].filter(Boolean);
    return `<div class="ic-hud"><span><b>${isMajor(s) ? '🚨 Major incident' : `Wave ${s.wave}`}</b> of ${waves()}</span>
      <span>Error budget <b>${b}%</b></span><span>Points <b>${M.sgn(s.pts)}</b></span><span>↻ Retries left <b>${Math.max(0, RERUNS - (s.reruns | 0))}</b></span></div>
      <div class="bar ic-bar" role="img" aria-label="Error budget ${b}%"><i style="width:${b}%"></i></div>
      ${perks.length ? `<p class="small ic-perks">${perks.map(esc).join(' · ')}</p>` : ''}`;
  }
  // ---- The camp at night (Ladi, Nov 17: "keep the old version and remove the boxes"; "the camp at night is to show
  // what's happening"). The request path is the camp's road, painted edge to edge (assets/img/ic/camp-night.webp): the
  // gate (API Gateway), the forge (Lambda), the post (SQS), the ledger hall (DynamoDB) and the vault (S3), with
  // Uptima's runbook on the grass by the gate. An open incident is happening on its building: smoke over the roof,
  // its trouble at the door, and one candle on the roof per incident, its wax the clock (it burns down a tick with
  // every answer and step) and its colour the page cost (white SEV-3, amber SEV-2, red SEV-1). The error budget is
  // the oil in the lamp. Rules and words are unchanged: every state the scene shows is also in each building's label,
  // and "Map as list" is one tap away. Shift 1 has no walking: tapping a building shows its pager slips.
  // Where each building stands in the painting (% of its width and height): centre x, roof top, door bottom, width.
  const CAMP = {
    runbook: { x: 19.5, top: 80, base: 97, w: 7 },
    apigw: { x: 10.8, top: 51, base: 78, w: 16 },
    lambda: { x: 29.4, top: 44, base: 76, w: 12 },
    sqs: { x: 45.4, top: 53, base: 78, w: 15 },
    ddb: { x: 65.8, top: 29, base: 79, w: 19 },
    s3: { x: 87.8, top: 50, base: 81, w: 17 }
  };
  IC.CAMP = CAMP;
  // The road between them, as walked (viewBox of the painting, 1344 by 768): the forge is the crossroads.
  const ROAD = {
    'runbook-apigw': 'M262 720 Q200 690 145 610', 'apigw-lambda': 'M145 610 Q270 600 395 590',
    'lambda-sqs': 'M395 590 Q500 625 610 605', 'lambda-ddb': 'M395 590 Q620 700 885 615', 'lambda-s3': 'M395 590 Q760 760 1180 625'
  };
  // What each building's trouble looks like at its door (assets/img/ic-live envelopes: the Live shift's orders).
  const TROUBLE = { apigw: ['env-429', 'env-429', 'env-429'], lambda: ['env', 'env'], sqs: ['env-poison', 'env-poison'], ddb: ['env-twice', 'env-twice'], s3: ['env-429', 'env'] };
  const PLACE_OF = { apigw: 'the gate', lambda: 'the forge', sqs: 'the post', ddb: 'the ledger hall', s3: 'the vault', runbook: 'Uptima\'s runbook' };
  const wax = b => (b.cost >= 25 ? 'sev1' : b.cost >= 15 ? 'sev2' : 'sev3');
  function candles(list) {
    return `<span class="ic-cdls" aria-hidden="true">${list.map(b => `<span class="ic-cdl ${wax(b)}${b.fmt ? ' fmt' : ''}" style="--h:${Math.max(.12, b.clock / Math.max(b.max, b.clock, 1)).toFixed(2)}"><i></i><b>${b.clock}</b></span>`).join('')}</span>`;
  }
  // A building: on the map you walk to it (one step) or stand at it; on the board, a tap shows its slips.
  function building(s, id) {
    const n = place(id), c = CAMP[id], here = s.map && s.at === id, d = s.map ? IC.dist(s.at, id) : 0;
    const open = s.board.filter(b => b.at === id), can = s.map && !here && d === 1 && IC.canAct(s, 'walk');
    const nxt = s.map && s.runbook === s.wave ? IC.nextLanding(s).filter(x => x === id).length : 0;
    const low = open.length ? Math.min(...open.map(b => b.clock)) : 0;
    const state = [here ? '📍 You are here' : s.map ? (d === 1 ? '1 step' : `${d} steps`) : '', open.length ? `🔔 ${open.length} open, lowest ${plural(low, 'tick')}` : id === 'runbook' ? '📖 next wave' : '✓ quiet', nxt ? `🎯 ${nxt} next wave` : ''].filter(Boolean);
    const cls = `${s.map ? 'ic-node' : 'ic-bld'} ic-b-${id}${here ? ' here' : ''}${open.length ? ' alarm' : ''}${can ? ' reach' : ''}${open.some(b => b.cost >= 25) ? ' sev1' : ''}`;
    const attr = s.map ? `data-walk="${id}"${can || here ? '' : ' disabled'}` : `data-bld="${id}"${open.length ? '' : ' disabled'}`;
    const tr = open.length && TROUBLE[id] ? `<span class="ic-trouble" aria-hidden="true">${TROUBLE[id].map((t, k) => `<img src="assets/img/ic-live/${t}.webp" alt="" style="--k:${k}" draggable="false">`).join('')}</span>` : '';
    return `<button class="${cls}" ${attr} style="--x:${c.x}%;--top:${c.top}%;--base:${c.base}%;--w:${c.w}%" aria-label="${esc(n.name)}, ${esc(PLACE_OF[id])}: ${esc(state.join(', '))}${can ? '. Walk here, 1 tick' : ''}">
      ${open.length ? '<span class="ic-smoke" aria-hidden="true"></span>' + candles(open) : ''}${tr}
      ${id === 'runbook' ? '<img class="ic-book" src="assets/img/ic/fix-glass.webp" alt="" draggable="false">' : ''}
      ${here ? '<img class="ic-me" src="assets/img/ic/fix-lantern.webp" alt="" draggable="false">' : ''}
      <span class="ic-tag"><b>${here ? '📍 ' : ''}${esc(n.name)}</b>${nxt ? ` <span>🎯 ${nxt}</span>` : ''}${can ? '<span class="ic-go">Walk · 1 tick</span>' : ''}</span></button>`;
  }
  function campHtml(s) {
    const b = Math.max(0, s.budget);
    const ids = s.map ? PLACES.map(n => n.id) : IC.NODES.map(n => n.id);
    const lit = k => s.map && k.split('-').includes(s.at);
    const road = Object.keys(ROAD).filter(k => s.map || !k.startsWith('runbook')).map(k => `<path d="${ROAD[k]}" class="${lit(k) ? 'lit' : ''}"/>`).join('');
    const perks = [s.perks.coo ? '🪶 Coo: next timeout costs half' : '', s.perks.bru ? (s.map ? `🚪 Bru: one free step a wave${s.bruWave === s.wave ? ' (used this wave)' : ''}` : '🚪 Bru: next answer ticks no clock') : '', s.perks.dutch ? '🛡 Dutch: +2 on one clock' : ''].filter(Boolean);
    return `<div class="ic-camp${s.map ? ' ic-map' : ''}" role="group" aria-label="${s.map ? 'The request path' : 'The camp'}">
        <img class="ic-camp-bg" src="assets/img/ic/camp-night.webp" alt="" draggable="false">
        <svg class="ic-road" viewBox="0 0 1344 768" preserveAspectRatio="none" aria-hidden="true">${road}</svg>
        <div class="ic-hud"><span><b>${isMajor(s) ? '🚨 Major incident' : `Wave ${s.wave}`}</b> of ${waves()}</span><span>Points <b>${M.sgn(s.pts)}</b></span><span>↻ Retries left <b>${Math.max(0, RERUNS - (s.reruns | 0))}</b></span></div>
        <div class="ic-lamp" role="img" aria-label="Error budget ${b}%"><i style="height:${b}%"></i><b>${b}%</b><span>budget</span></div>
        ${ids.map(id => building(s, id)).join('')}
      </div>${perks.length ? `<p class="small ic-perks">${perks.map(esc).join(' · ')}</p>` : ''}`;
  }
  function listHtml(s) {
    return `<ul class="ic-list">${PLACES.map(n => { const open = s.board.filter(b => b.at === n.id); const d = IC.dist(s.at, n.id), can = d === 1 && IC.canAct(s, 'walk');
      return `<li><b>${s.at === n.id ? '📍 ' : ''}${esc(n.name)}</b> <span class="small">(${esc(n.place)}) · ${s.at === n.id ? 'you are here' : plural(d, 'step')} · ${open.length ? `🔔 ${open.length} open: ${open.map(b => `${sev(b.cost)[1]}, ${plural(b.clock, 'tick')}`).join('; ')}` : n.id === 'runbook' ? '📖 where the next wave lands' : '✓ quiet'}</span>${can ? ` <button class="ghost ic-step" data-walk="${n.id}">Walk here · 1 tick</button>` : ''}</li>`; }).join('')}</ul>
      <div class="ic-hud"><span><b>${isMajor(s) ? '🚨 Major incident' : `Wave ${s.wave}`}</b> of ${waves()}</span><span>Error budget <b>${Math.max(0, s.budget)}%</b></span><span>Points <b>${M.sgn(s.pts)}</b></span><span>↻ Retries left <b>${Math.max(0, RERUNS - (s.reruns | 0))}</b></span></div>`;
  }
  function mapTools(s) {
    return `<div class="row ic-tools"><button class="ghost" id="ic-view">${s.view === 'list' ? '🗺 Show the map' : '☰ Map as list'}</button></div>
      ${s.acts >= MAP_CAP ? '<p class="small"><b>Four map actions since your last answer: work an incident here next.</b></p>' : `<p class="muted small">Map actions since your last answer: ${s.acts} of ${MAP_CAP}.</p>`}`;
  }
  IC.board = function () {
    const s = shift();
    if (!s) return;
    if (s.phase === 'pick') return pickPanel(s);
    if (s.phase === 'zero') return zeroPanel(s);
    if (s.phase === 'done') return results(s);
    const order = s.board.map((b, i) => i).sort((a, c) => (workable(s, s.board[c]) - workable(s, s.board[a])) || (s.board[a].clock - s.board[c].clock));
    const scene = s.map && s.view === 'list' ? listHtml(s) : campHtml(s);
    const b = U.panel(`<p class="ic-say" data-vo="${esc(voOf(s.msg || SAY.open))}"><b>Uptima:</b> ${esc(s.msg || SAY.open)}</p>
      ${s.since ? `<p class="small ic-since">${esc(s.since)}</p>` : ''}
      ${scene}
      ${s.map ? mapTools(s) : ''}
      <p class="small ic-how">${s.map ? `Work an incident where you stand (${esc(place(s.at).name)}). Every answer and every step burns the other candles down a tick.` : 'Pick an incident to work. Every answer burns the other candles down a tick.'} The camp waits while you read.</p>
      <div class="ic-board">${order.map(i => cardHtml(s, s.board[i], i)).join('')}</div>
      <div class="row"><button class="ghost" id="ic-how">How to play</button><button class="ghost" id="ic-stop">Stop for now</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-inc]').forEach(el => el.onclick = () => { if (workable(s, s.board[+el.dataset.inc])) work(+el.dataset.inc); });
    b.querySelectorAll('[data-dutch]').forEach(el => el.onclick = () => { IC.useDutch(s, +el.dataset.dutch); save(s); IC.board(); });
    // Tapping where you stand, or a building on the board, brings its slips into view.
    const show = id => { const i = s.board.findIndex(x => x.at === id); const el = i >= 0 && b.querySelector(`[data-inc="${i}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('ic-flash'); setTimeout(() => el.classList.remove('ic-flash'), 900); } };
    b.querySelectorAll('[data-walk]').forEach(el => el.onclick = () => { if (el.dataset.walk === s.at) return show(s.at); if (IC.walk(s, el.dataset.walk)) afterMap(s); });
    b.querySelectorAll('[data-bld]').forEach(el => el.onclick = () => show(el.dataset.bld));
    const v = b.querySelector('#ic-view');
    if (v) v.onclick = () => { s.view = s.view === 'list' ? 'map' : 'list'; save(s); IC.board(); };
    b.querySelector('#ic-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-how').onclick = () => M.walk(ID, walkScreens(s)).then(IC.board);
  };

  // ---- The fix, shown where it happened (Ladi, Nov 17): a picture of the mechanism, the exact AWS name or config line,
  // and what it does (js/ic-fix.js). After a right answer, or a miss that's gone for good: never while the twin retry
  // is still open, since the twin is the same fault and the card would give it away. The first time a config line
  // turns up in a save, you type its key token into the line yourself, with the shared type-it-once rules
  // (js/type-once.js): keyed by the token across modes, two misses show it faintly, and "Not now" brings it back later.
  IC.fixFor = function (inc, q) {
    if (!SD.icFix || !q || inc.fmt || isFmt(inc.q)) return null;
    const n = IC.nodeOf(q);
    return SD.icFix.fixOf(q, n ? n.id : inc.at);
  };
  IC.showFix = (s, inc, f, ok) => showFix(s, inc, f, ok);
  function showFix(s, inc, f, ok) {
    return new Promise(done => {
      const c = CAMP[inc.at] || CAMP.lambda, T = SD.icFix.once(), term = SD.icFix.termOf(f);
      const at = term ? f.line.indexOf(term) : -1, first = at >= 0 && T.need(term);
      const pre = first ? f.line.slice(0, at) : '', post = first ? f.line.slice(at + term.length) : '';
      const head = ok ? `✓ Resolved at ${esc(PLACE_OF[inc.at] || where(inc))}` : `✗ The fix at ${esc(PLACE_OF[inc.at] || where(inc))} was`;
      const b = U.panel(`<div class="ic-fix${ok ? ' ok' : ' miss'}" data-fix="${esc(f.id)}">
          <div class="ic-camp ic-zoom" style="--zx:${c.x}%;--zy:${(c.top + c.base) / 2}%" aria-hidden="true">
            <img class="ic-camp-bg" src="assets/img/ic/camp-night.webp" alt="" draggable="false">
            <img class="ic-fixpic" src="assets/img/ic/fix-${f.pic}.webp" alt="" draggable="false">
          </div>
          <div class="ic-fixnote">
            <p class="ic-fixh">${head}</p>
            <p class="ic-fixname">${esc(f.name)}</p>
            ${first ? `<p class="ic-wl">First time this one's come up: type the missing part yourself, the way AWS spells it.</p>
              <code class="ic-line ic-blank"><span>${esc(pre)}</span><input id="ic-type" class="ic-type" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the missing part" aria-describedby="ic-typeh" size="${Math.max(6, Math.min(32, term.length + 1))}"><span>${esc(post)}</span></code>
              <p class="small ic-typeh" id="ic-typeh" aria-live="polite">Two misses and it shows faintly to copy.</p>` : `<code class="ic-line">${esc(f.line)}</code>`}
            <p class="ic-does">${first ? esc(f.does).split(esc(term)).join('<b class="ic-gap">____</b>') : esc(f.does)}</p>
            <div class="row"><button class="primary" id="ic-fixgo"${first ? ' disabled' : ''}>${first ? 'Type it to go on' : 'Back to the camp'}</button>${first ? '<button class="ghost" id="ic-fixlater">Not now</button>' : ''}</div>
          </div></div>`, { title: TITLE, onClose: () => done() });
      const go = b.querySelector('#ic-fixgo'), inp = b.querySelector('#ic-type'), hint = b.querySelector('#ic-typeh');
      if (inp) {
        // The shared rule (js/type-once.js): Enter or leaving the box checks it; two misses show it faintly.
        const h = T.bind(inp, term, {
          onOk: m => { b.querySelectorAll('.ic-gap').forEach(g => { g.textContent = term; }); const later = b.querySelector('#ic-fixlater'); if (later) later.hidden = true; go.disabled = false; go.textContent = 'Typed. Back to the camp'; hint.textContent = m ? '✓ It\'s yours now.' : '✓ First try.'; s.wrote = (s.wrote || []).concat(f.id); save(s); try { go.focus(); } catch (e) { /* no focus */ } },
          onMiss: m => { hint.textContent = m >= 2 ? 'Here it is, faintly. Copy it in.' : 'Not quite. One more try, then it shows faintly.'; }
        });
        // Typing the exact token checks it at once, without needing Enter.
        inp.addEventListener('input', () => { if (T.match(inp.value, term)) h.check(); });
        setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }, 60);
        b.querySelector('#ic-fixlater').onclick = () => done();
      }
      go.onclick = () => done();
    });
  }

  function stopNow() { S.persist(); if (SD.today) SD.today.render(); }
  function afterMap(s) {
    if (/paged/.test(s.since)) U.system('PAGED', esc(s.since.replace(/^Since your last move: /, '')), 'red');
    after(s);
  }

  async function work(i) {
    const s = shift(), inc = s && s.board[i];
    if (!inc) return;
    const q = find(inc.q);
    if (!q) { s.board.splice(i, 1); save(s); return after(s); }
    if (inc.fmt) {
      const fr = await M.askFormat(q, { title: TITLE, context: `${FMT_NAME[q.type]} · a check at ${where(inc)} · pages −${inc.cost}% · ${plural(inc.clock, 'tick')} left` });
      if (!fr) { s.board.splice(i, 1); save(s); return after(s); }
      IC.settle(s, inc, fr);
      if (IC.settleNotes(s)) U.system('PAGED', esc(s.since.replace(/^Since your last answer: /, '')), 'red');
      save(s);
      return after(s);
    }
    const r = await M.ask(q, {
      title: TITLE, tally: s.tally, think: true, act: { label: `Apply a fix at ${where(inc)}`, icon: '🛠' },
      context: `Incident at ${where(inc)} · ${isMajor(s) ? 'major incident' : 'wave ' + s.wave} · pages −${inc.cost}% · ${plural(inc.clock, 'tick')} left${inc.tries ? ' · a new scenario of the same fault' : ''}`,
      progress: isMajor(s) ? 'Major incident' : `Wave ${s.wave}`, onStop: () => {}
    });
    if (r.stopped && !r.committed) return stopNow();
    if (r.closed) return IC.board();
    const asked = q;
    IC.settle(s, inc, r);
    save(s);
    if (r.stopped) { s.phase = phaseAfter(s); save(s); return stopNow(); }
    // The fix, once the incident is settled for good (resolved, or missed with no retry left).
    const f = r.ok || !s.board.includes(inc) ? IC.fixFor(inc, asked) : null;
    if (f) await showFix(s, inc, f, !!r.ok);
    if (IC.settleNotes(s)) U.system('PAGED', esc(s.since.replace(/^Since your last answer: /, '')), 'red');
    after(s);
  }
  IC.settleNotes = s => /paged/.test(s.since || '');
  function phaseAfter(s) {
    const n = IC.next(s);
    return n === 'zero' ? 'zero' : n === 'done' ? 'done' : n === 'pick' ? 'pick' : 'board';
  }
  function after(s) {
    s.phase = phaseAfter(s);
    if (s.phase === 'done') return end(s);
    save(s);
    IC.board();
  }

  // ---- Between waves: one free pick ----
  function pickPanel(s) {
    const b = U.panel(`<p class="ic-say" data-vo="${esc('uptima|' + SAY.pick)}"><b>Uptima:</b> ${esc(SAY.pick)}</p>
      ${hud(s)}
      <p class="small">Wave ${s.wave} cleared. Take one, free. It lasts until it's used.</p>
      <div class="opts">${IC.PICKS.map(p => `<button class="opt ic-pick" data-pick="${p.id}"><b>${esc(p.who)}:</b> ${esc(p.id === 'bru' ? (s.map ? 'One free step each wave' : 'Your next answer ticks no other clock') : p.what)}<br><span class="small"><i>"${esc(p.line)}"</i></span></button>`).join('')}</div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => { IC.applyPick(s, el.dataset.pick); s.phase = 'board'; save(s); IC.board(); });
  }

  // ---- 0% budget: retry the wave, or end the shift ----
  function zeroPanel(s) {
    const b = U.panel(`<p class="ic-say" data-vo="${esc('uptima|' + SAY.zero)}"><b>Uptima:</b> ${esc(SAY.zero)}</p>
      ${hud(s)}
      <p>The error budget hit 0% in ${isMajor(s) ? 'the major incident' : 'wave ' + s.wave}. Your answers so far are logged.</p>
      <div class="row"><button class="primary" id="ic-retry">Retry this wave</button><button class="ghost" id="ic-end">End the shift</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelector('#ic-retry').onclick = () => { IC.retryWave(s); save(s); IC.board(); };
    b.querySelector('#ic-end').onclick = () => { s.zero = true; end(s); };
  }

  // ---- The end of a shift ----
  function stats(s) {
    const acc = f => s.log.filter(f).reduce((a, l) => [a[0] + l.ok, a[1] + 1], [0, 0]);
    return { d: SD.today && SD.today.dayKey ? SD.today.dayKey() : new Date().toISOString().slice(0, 10), map: !!s.map, rp: acc(l => !l.other), other: acc(l => l.other), ranks: s.ranks.slice(), budget: s.budget, mapActs: s.mapActs | 0 };
  }
  function end(s) {
    // Open bank incidents start the next shift; an open format check doesn't (a fresh one lands each wave).
    const left = s.board.concat(s.carry).filter(b => !b.fmt && !isFmt(b.q)).map(b => ({ q: b.q, other: b.other }));
    sv().icBacklog = left;
    s.phase = 'done'; s.left = left.length; s.board = []; s.carry = [];
    const st = sv().modes = sv().modes || {};
    st.icShifts = (st.icShifts | 0) + 1;
    st.icStats = (st.icStats || []).concat([stats(s)]).slice(-30);
    s.paid = M.pay(ID);
    save(s);
    results(s);
  }
  // One thing to do differently (Extra Credits, "When Difficult Is Fun").
  function advice(s) {
    const t = s.tally, rate = c => (t[c] && t[c][1] ? t[c][0] / t[c][1] : null);
    const timeouts = s.log.reduce((a, l) => a + l.timeouts, 0);
    if (rate(2) !== null && t[2][1] >= 3 && rate(2) < 2 / 3) return 'Next shift: press Sure only when you\'d bet on it. Your Sure answers were right less than 2 times in 3, and each miss costs 3.';
    if (timeouts >= 3) return 'Next shift: weigh the clock against the page cost. A SEV-1 about to page costs more than a SEV-3 that already has.';
    if (rate(1) !== null && t[1][1] >= 3 && rate(1) >= 2 / 3) return 'Next shift: you were right on most Think so answers. Some of those were Sure.';
    if (rate(0) !== null && t[0][1] >= 3 && rate(0) >= 0.5) return 'Next shift: your guesses were right half the time or more. Say Think so on those.';
    return 'Next shift: keep it up, and read every line of the stem before you apply a fix.';
  }
  function results(s) {
    const right = s.log.filter(l => l.ok).length, n = [0, 1, 2].reduce((a, c) => a + (s.tally[c] || [0, 0])[1], 0);
    const sureMiss = (s.tally[2] || [0, 0])[1] - (s.tally[2] || [0, 0])[0];
    const topics = [...new Set(s.log.map(l => { const q = qOf(l.q); return q && q.topic ? String(q.topic).replace(/-/g, ' ') : null; }).filter(Boolean))];
    const clip = t => (t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, '') + '…' : t);
    // Open on the best fix: a Sure that was right, on the costliest card; else any right answer.
    const best = s.log.filter(l => l.ok).sort((a, b) => (b.conf - a.conf) || ((b.cost | 0) - (a.cost | 0)))[0];
    const bq = best && qOf(best.q);
    const rows = s.log.map(l => {
      const q = qOf(l.q);
      if (!q) return '';
      return `<li><b>${l.ok ? '✓ Resolved' : '✗ Missed'}</b> <span class="muted small">${isFmt(l.q) ? esc(FMT_NAME[q.type] || 'Check') + ' · ' : ''}${esc(nodeName(l.q))} · ${esc(String(q.topic || '').replace(/-/g, ' '))}${l.timeouts ? ' · ⏱ paged' : ''}${l.tries > 1 ? ` · ${l.tries} tries` : ''}</span><br><span class="small">${esc(clip(answerText(q)))}</span></li>`;
    }).join('');
    const b = U.panel(`<p class="ic-say" data-vo="${esc('uptima|' + (s.zero ? SAY.zero : SAY.end))}"><b>Uptima:</b> ${esc(s.zero ? SAY.zero : SAY.end)}</p>
      ${bq ? `<div class="ic-best"><p class="small"><b>${best.conf === 2 ? '★ Your best fix tonight, and you were Sure' : '★ Your best fix tonight'}</b> · ${esc(nodeName(best.q))}${best.cost ? ` · a SEV-${best.cost >= 25 ? 1 : best.cost >= 15 ? 2 : 3}` : ''}</p><p class="small">${esc(clip(answerText(bq)))}</p></div>` : ''}
      <p class="td-big">${right} of ${s.log.length} incidents resolved.</p>
      <p class="small">${s.zero ? 'The error budget hit 0%, so the shift ended early.' : `Error budget left: <b>${s.budget}%</b>.`} Points: <b>${M.sgn(s.pts)}</b> from ${plural(n, 'answer')}.${sureMiss ? ` ${sureMiss === 1 ? 'One Sure miss' : sureMiss + ' Sure misses'} went up on the Wall.` : ''}</p>
      <p class="small ic-advice"><b>${esc(advice(s))}</b></p>
      ${(s.wrote || []).length ? `<p class="small ic-wrote">✍ Written out by hand tonight: ${s.wrote.map(id => { const f = SD.icFix.FIXES.find(x => x.id === id); return f ? `<code>${esc(f.line)}</code>` : ''; }).join(', ')}</p>` : ''}
      ${s.left ? `<p class="small">⏱ ${plural(s.left, 'incident')} still open ${s.left === 1 ? 'starts' : 'start'} your next shift.</p>` : ''}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      <p class="muted small">${s.verified} of the shift's incidents were verified against AWS docs.${s.topped ? ` ${s.topped} unchecked ones filled in, marked "Not verified yet".` : ''} Topics: ${esc(topics.join(', ') || 'none')}.</p>
      <details class="ic-log"><summary class="q-ctx">Every incident's fix</summary><ul>${rows}</ul></details>
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="ic-done">Done</button><button class="ghost" id="ic-again">New shift</button></div>`, { title: TITLE, onClose: stopNow });
    M.pipWire(b, 'Incident Commander');
    b.querySelector('#ic-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-again').onclick = () => IC.startBoard();
  }

  // ---- First run (and the map's first night) ----
  function walkScreens(s) {
    const first = s && s.board[0], q = first && find(first.q), sp = q ? M.split(q) : null;
    const screens = [
      { title: 'An incident', html: `<p data-vo="${esc('uptima|' + SAY.open)}"><b>Uptima:</b> "${esc(SAY.open)}"</p>
        <p>Each incident is a real exam question about a service on the request path. Its card shows the symptom, so you can see what you're walking into:</p>
        ${q ? `<div class="md-eg"><p class="small">${esc(IC.symptom(q))}</p>${sp.qual ? `<p class="small">★ Asks for: <b>${esc(sp.qual)}</b></p>` : ''}</div>` : ''}
        <p class="small">Open it to read the whole question. The star line is the qualifier: MOST cost-effective and LEAST overhead pick different fixes.</p>` },
      { title: 'Apply a fix', html: `<p>Name the cause in your own words, then the fixes show. Apply one and say how sure you are:</p>
        ${M.stakeTable()}<p class="small">Right resolves it. Wrong: after the explanation, it stays open as the same fault in a new scenario, so you get one more try straight away. Miss that too, or run out of the shift's ${RERUNS} retries, and it comes back in the major incident.</p>` },
      { title: 'Clocks and pages', html: `<p>Every answer ticks every other incident's clock by one (●●○ is two ticks left). The board waits while you read: there's no real-time clock.</p>
        <p>A clock at zero pages: the card's cost (SEV-3 −10%, SEV-2 −15%, SEV-1 −25%) comes off the error budget, and it comes back next wave in a new disguise. A Sure miss costs ${SURE_MISS}%. So the card about to page and the card that pages hardest aren't always the same one.</p>
        <p class="small">${WAVES.length} waves, then a major incident made of tonight's misses. It saves after every answer: stop any time.</p>` }
    ];
    if (s && s.map) screens.push({ title: 'The request path', html: `<p>From tonight, you walk the request path: API Gateway, Lambda, then DynamoDB, SQS or S3. You can only fix what's where you stand, and each step ticks every clock, so clocks start 2 ticks longer.</p>
        <p>Each wave is two incidents and one check, on three different nodes. A check is a new kind of question: 🔮 Predict on Lambda (what happens next?) and 🔎 Spot the line everywhere else (which line of this config is wrong?). It starts a tick higher, and missing it makes that node's next incident arrive a tick shorter.</p>
        <p class="small">A page spreads upstream: the caller loses a tick on each clock. The 📖 Runbook shelf beside the gate shows where the next wave lands, and gives each of its clocks 3 more ticks. At most ${MAP_CAP} map actions per question, and ☰ Map as list is always one tap away.</p>` });
    return screens;
  }

  // Two kinds of shift (Ladi, Nov 16: "a Live shift in Incident Commander"): the pager board, or the live request
  // path (js/ic-live.js). A shift in progress of either kind can be resumed from here.
  IC.start = function () {
    const live = SD.icLive && SD.icLive.start;
    if (!live) return IC.startBoard();
    const s = shift(), resume = s && s.v === 3 && s.phase !== 'done';
    const b = U.panel(`<p class="ic-say" data-vo="${esc(voOf(SAY.open))}"><b>Uptima:</b> ${esc(SAY.open)}</p>
      <div class="opts">
        <button class="opt md-mode" id="ic-pager"><span class="md-n">📋 ${resume ? 'Resume the pager board' : 'Pager board shift'}</span><span class="small">Exam questions as incidents on the board, against the clocks.${resume ? ` Wave ${s.wave}, ${Math.max(0, s.budget)}% budget.` : ''}</span></button>
        <button class="opt md-mode" id="ic-live"><span class="md-n">🖥 ${SD.icLive.inProgress() ? 'Resume the live shift' : 'Live shift: the request path'}</span><span class="small">Three outages on a running request path. Predict what it does, turn the real settings, run the minute.${SD.icLive.inProgress() ? ' ' + esc(SD.icLive.status()) + '.' : ''}</span></button>
      </div>`, { title: TITLE, onClose: stopNow });
    b.querySelector('#ic-pager').onclick = () => IC.startBoard();
    b.querySelector('#ic-live').onclick = () => SD.icLive.start();
  };
  IC.startBoard = async function () {
    let s = shift();
    if (!s || s.phase === 'done' || s.v !== 3) {
      s = IC.newShift();
      if (!s.board.length) { U.system(TITLE, 'No request-path questions on this exam yet.'); return; }
      await M.walkFirst(ID, walkScreens(s));
      if (s.map && !(sv().modes && sv().modes.icMapSeen)) { (sv().modes = sv().modes || {}).icMapSeen = 1; S.persist(); await M.walk(ID, walkScreens(s).slice(3)); }
    }
    IC.board();
  };

  // ---- Simulator hook (tools/modes_sim.js): plays a whole shift on the real state machine, no UI, no saves ----
  // policy.route: 'near' stays put while there's work here, lowest clock first; 'far' also detours for the runbook
  // whenever it's a step away (on the board without a map, 'far' works the costliest page first). policy.map: false plays the board without the map. policy.pick: which between-wave pick.
  IC.sim = async function (policy, rng) {
    const s = IC.newShift({ sim: true, rng, picks: !!policy.picks, map: policy.map !== false });
    const far = policy.route === 'far';
    let taps = 0, guard = 0;
    const score = b => (far && !s.map ? -b.cost * 10 + b.clock : b.clock * 100 - b.cost);
    for (;;) {
      if (++guard > 400) break;
      if (s.phase === 'pick') { IC.applyPick(s, policy.pick || IC.PICKS[Math.floor(rng() * 3)].id, rng); taps++; s.phase = 'board'; continue; }
      if (s.phase === 'zero') { s.zero = true; break; }
      if (s.phase === 'done' || !s.board.length) { const n = IC.next(s, rng); s.phase = n; if (n === 'done') break; continue; }
      if (s.map) {
        // near: work what's where you stand (lowest clock first), and walk only when nothing is here.
        // far: the same, plus detours: the runbook when it's a step away and unread this wave, and a SEV-1 a step away.
        // Both work a card here first when it's about to page (2 ticks or fewer).
        const here = s.board.filter(b => b.at === s.at).sort((a, b) => score(a) - score(b));
        const all = s.board.slice().sort((a, b) => score(a) - score(b) || IC.dist(s.at, a.at) - IC.dist(s.at, b.at));
        const urgent = here.some(b => b.clock <= 2);
        const goal = urgent ? s.at : far && s.runbook !== s.wave && s.wave < WAVES.length && IC.dist(s.at, 'runbook') <= 1 && IC.canAct(s, 'walk') ? 'runbook'
          : far && (s.board.find(b => b.cost >= 25 && IC.dist(s.at, b.at) === 1) || {}).at || (here.length ? s.at : all.sort((a, b) => IC.dist(s.at, a.at) - IC.dist(s.at, b.at) || score(a) - score(b))[0].at);
        if (goal === s.at && here.length || (!IC.canAct(s, 'walk') && here.length)) {
          const inc = here[0];
          taps++;
          IC.settle(s, inc, M.simAnswer(qOf(inc.q), policy, rng));
        } else {
          const step = near(s.at).sort((a, b) => IC.dist(a, goal) - IC.dist(b, goal))[0];
          if (!IC.walk(s, step)) { const any = s.board[0]; taps++; IC.settle(s, any, M.simAnswer(qOf(any.q), policy, rng)); }
        }
      } else {
        const inc = s.board.slice().sort((a, b) => score(a) - score(b))[0];
        taps++;
        IC.settle(s, inc, M.simAnswer(qOf(inc.q), policy, rng));
      }
      s.phase = IC.next(s, rng);
      if (s.phase === 'done') break;
    }
    const map = taps + (s.mapActs | 0), qs = s.answers, secs = qs * M.SIM_Q_SECS + map * M.SIM_MAP_SECS;
    return { pts: s.pts, budget: s.budget, minutes: secs / 60, mapShare: (map * M.SIM_MAP_SECS) / secs, questions: qs, zero: !!s.zero, resolved: s.log.filter(l => l.ok).length, timeouts: s.log.reduce((a, l) => a + l.timeouts, 0), mapActs: s.mapActs | 0 };
  };

  M.register({
    id: ID, name: 'Incident Commander', minutes: '15 to 20', host: 'Uptima, the secondary pager',
    blurb: 'One on-call shift: 3 waves of incidents on the request path, then a major incident. The right answer is the fix.',
    start: IC.start, sim: IC.sim,
    status: () => { const s = shift(); return s && s.v === 3 && s.phase !== 'done' ? `Resume · ${isMajor(s) ? 'major incident' : `wave ${s.wave} of ${waves()}`}, ${Math.max(0, s.budget)}% budget` : SD.icLive && SD.icLive.status ? SD.icLive.status() : ''; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .ic-say { margin: 0 0 8px; }
    .ic-since { margin: 0 0 8px; padding: 6px 8px; border-left: 4px solid var(--ink, #222); overflow-wrap: anywhere; }
    .ic-hud { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 14px; }
    .ic-bar { margin: 4px 0 8px; }
    .ic-bar i { background: var(--mint, #5bc08a); }
    .ic-perks { margin: 0 0 6px; }
    .ic-list { padding-left: 18px; margin: 4px 0; }
    .ic-list li { margin: 6px 0; overflow-wrap: anywhere; }
    .ic-step { min-height: 44px; }
    .ic-tools { margin: 4px 0; }
    .ic-fmt .ic-card { border-style: double; }
    .ic-board { display: flex; flex-direction: column; gap: 10px; }
    .ic-inc { display: flex; flex-direction: column; gap: 4px; }
    .ic-card { display: flex; flex-direction: column; align-items: stretch; gap: 4px; text-align: left; width: 100%; }
    .ic-card[aria-disabled="true"] { border-style: dashed; }
    .ic-top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
    .ic-sev { font-size: 13px; letter-spacing: .04em; }
    .ic-clock { letter-spacing: 2px; }
    .ic-sev-1 .ic-card { border-width: 3px; border-style: double; }
    .ic-sym { font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; }
    .ic-qual { font-size: 14px; }
    .ic-tags, .ic-why { overflow-wrap: anywhere; }
    .ic-best { margin: 0 0 8px; padding: 6px 8px; border: 2px solid var(--ink, #222); border-radius: 6px; }
    .ic-best p { margin: 2px 0; }
    .ic-dutch { min-height: 44px; }
    .ic-pick { text-align: left; }
    .ic-log ul { padding-left: 18px; margin: 4px 0; }
    .ic-log li { margin: 6px 0; overflow-wrap: anywhere; }
    /* ---- The camp at night (see campHtml) ---- */
    .ic-camp { position: relative; width: min(100%, calc(62vh * 16 / 9)); aspect-ratio: 16 / 9; margin: 4px auto 10px; border-radius: 6px; overflow: hidden; background: #0d1426; box-shadow: 0 6px 18px rgba(0, 0, 0, .6); container-type: inline-size; }
    .ic-camp-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; user-select: none; }
    .ic-road { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .ic-road path { fill: none; stroke: #ffd98a; stroke-width: 5; stroke-dasharray: 14 12; stroke-linecap: round; opacity: .32; }
    .ic-road path.lit { opacity: .85; filter: drop-shadow(0 0 6px rgba(255, 210, 120, .9)); }
    body.in-mode[data-stage="ic"] #panel .ic-camp .ic-hud { position: absolute; left: 1.5%; top: 2.5%; display: flex; flex-wrap: wrap; gap: 0 10px; max-width: 70%; padding: 0; background: none; box-shadow: none; border-radius: 0;
      color: #f6ead0; font-size: clamp(11px, 2.6cqi, 15px); text-shadow: 0 1px 3px #000, 0 0 8px #000; }
    .ic-lamp { position: absolute; right: 2%; top: 4%; width: clamp(26px, 6cqi, 46px); height: 38%; border: 2px solid #c9a24e; border-radius: 10px 10px 6px 6px; background: rgba(20, 14, 8, .7); overflow: hidden; box-shadow: 0 0 12px rgba(255, 190, 90, .35); }
    .ic-lamp i { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(#ffd27a, #e08a1e); box-shadow: 0 0 10px rgba(255, 170, 60, .7); transition: height .5s ease; }
    .ic-lamp b { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-size: clamp(9px, 2.1cqi, 13px); color: #fff; text-shadow: 0 1px 2px #000; }
    .ic-lamp span { position: absolute; left: 0; right: 0; bottom: 2px; text-align: center; font-size: clamp(7px, 1.5cqi, 10px); color: #2a1a06; font-weight: 700; }
    .ic-camp :is(.ic-node, .ic-bld) { position: absolute; left: calc(var(--x) - var(--w) / 2); top: var(--top); width: var(--w); height: calc(var(--base) - var(--top)); min-height: 0; padding: 0; margin: 0;
      display: block; border: 0; border-radius: 8px; background: none; box-shadow: none; color: #fff; font: inherit; cursor: default; }
    body.in-mode[data-stage="ic"] #panel .ic-camp :is(.ic-node, .ic-bld) { background: none !important; border: 0 !important; box-shadow: none !important; filter: none !important; }
    .ic-camp :is(.ic-node, .ic-bld):disabled { opacity: 1; }
    .ic-camp :is(.ic-node.reach, .ic-node.here, .ic-bld.alarm) { cursor: pointer; }
    body.in-mode[data-stage="ic"] #panel .ic-camp .ic-node.reach, .ic-camp .ic-node.reach { box-shadow: 0 0 0 2px rgba(255, 217, 138, .75), 0 0 18px rgba(255, 210, 120, .55) !important; animation: icreach 2.4s ease-in-out infinite; }
    @keyframes icreach { 50% { box-shadow: 0 0 0 2px rgba(255, 217, 138, .35), 0 0 8px rgba(255, 210, 120, .25); } }
    .ic-camp :is(.ic-node, .ic-bld):focus-visible { outline: 3px dashed #ffe9b0; outline-offset: 3px; }
    .ic-tag { position: absolute; left: 50%; bottom: -2px; transform: translate(-50%, 100%); white-space: nowrap; display: flex; flex-direction: column; align-items: center; gap: 0;
      font-size: clamp(8px, 1.9cqi, 13px); line-height: 1.15; color: #fbeccc; text-shadow: 0 1px 2px #000, 0 0 6px #000; pointer-events: none; }
    .ic-tag b { font-weight: 800; }
    .ic-node.here .ic-tag b { color: #ffe08a; }
    .ic-go { color: #ffd98a; text-decoration: underline; }
    .ic-b-ddb .ic-tag, .ic-b-runbook .ic-tag { bottom: 0; }
    .ic-b-runbook .ic-tag { left: auto; right: 100%; bottom: 4%; transform: none; align-items: flex-end; }
    .ic-b-apigw .ic-tag { left: 4%; transform: translate(0, 100%); align-items: flex-start; }
    .ic-book { position: absolute; left: 10%; bottom: 8%; width: 80%; filter: drop-shadow(0 2px 3px #000); }
    .ic-me { position: absolute; left: -14%; bottom: -6%; width: 30%; max-width: 40px; filter: drop-shadow(0 0 10px rgba(255, 200, 100, .9)); }
    /* Trouble: smoke over the roof, red for a SEV-1; what's going wrong piles up at the door. */
    .ic-smoke { position: absolute; left: 15%; right: 15%; top: -35%; height: 60%; border-radius: 50%; background: radial-gradient(closest-side, rgba(150, 150, 160, .55), transparent); filter: blur(4px); animation: icsmoke 3.2s ease-in-out infinite; pointer-events: none; }
    .sev1 > .ic-smoke { background: radial-gradient(closest-side, rgba(220, 60, 40, .6), transparent); }
    @keyframes icsmoke { 0% { transform: translateY(10%) scale(.85); opacity: .55; } 60% { opacity: .9; } 100% { transform: translateY(-18%) scale(1.15); opacity: .4; } }
    .alarm::before { content: ''; position: absolute; inset: 15% 10% 0; border-radius: 40%; background: radial-gradient(closest-side, rgba(255, 120, 60, .28), transparent); animation: icglow 1.8s ease-in-out infinite; pointer-events: none; }
    @keyframes icglow { 50% { opacity: .35; } }
    .ic-trouble { position: absolute; left: 50%; bottom: 2%; transform: translateX(-50%); display: flex; gap: 1px; pointer-events: none; }
    .ic-trouble img { width: clamp(10px, 2.4cqi, 22px); image-rendering: pixelated; filter: drop-shadow(0 1px 1px #000); animation: ictrouble 1.6s ease-in-out infinite; animation-delay: calc(var(--k) * -.5s); }
    .ic-b-sqs .ic-trouble { bottom: auto; top: -10%; } .ic-b-sqs .ic-trouble img { animation-name: iccircle; }
    @keyframes ictrouble { 50% { transform: translateY(-25%); } }
    @keyframes iccircle { 0% { transform: translate(0, 0); } 25% { transform: translate(40%, -40%); } 50% { transform: translate(0, -70%); } 75% { transform: translate(-40%, -40%); } 100% { transform: translate(0, 0); } }
    /* The clock: one candle per incident on the roof. Its wax is the ticks left; its colour, how hard it pages. */
    .ic-cdls { position: absolute; left: 50%; top: -6%; transform: translate(-50%, -100%); display: flex; gap: clamp(3px, .9cqi, 8px); align-items: flex-end; pointer-events: none; }
    .ic-cdl { position: relative; display: block; width: clamp(5px, 1.2cqi, 10px); height: calc(var(--h) * clamp(16px, 5cqi, 40px)); border-radius: 2px 2px 1px 1px; background: linear-gradient(90deg, #e9dfc8, #fffaf0 45%, #d8ccb0); box-shadow: 0 0 6px rgba(255, 200, 120, .5); }
    .ic-cdl.sev2 { background: linear-gradient(90deg, #d99a2b, #ffd27a 45%, #c48420); }
    .ic-cdl.sev1 { background: linear-gradient(90deg, #a5281e, #e8574a 45%, #8e1f17); }
    .ic-cdl i { position: absolute; left: 50%; bottom: 100%; width: 140%; height: clamp(7px, 1.8cqi, 14px); transform: translateX(-50%); border-radius: 50% 50% 45% 45%; background: radial-gradient(circle at 50% 70%, #fff6c8, #ffc23d 50%, rgba(255, 120, 20, 0) 75%); animation: icflame .9s ease-in-out infinite alternate; }
    .ic-cdl b { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); font-size: clamp(8px, 1.8cqi, 12px); color: #fff; text-shadow: 0 1px 2px #000; }
    @keyframes icflame { to { transform: translateX(-50%) scale(.85, 1.12); } }
    .ic-flash .ic-card, .ic-flash.ic-card { outline: 3px solid #ffd98a; outline-offset: 2px; }
    /* The fix: zoomed in on the building, the prop, then the exact line. */
    .ic-fix { display: flex; flex-direction: column; gap: 10px; max-width: 760px; margin: 0 auto; }
    .ic-zoom .ic-camp-bg { transform-origin: var(--zx) var(--zy); transform: scale(2.2); animation: iczoom .6s ease-out; }
    @keyframes iczoom { from { transform: scale(1); } }
    .ic-fixpic { position: absolute; left: 50%; top: 50%; width: 38%; max-width: 220px; transform: translate(-50%, -50%); filter: drop-shadow(0 0 18px rgba(255, 220, 140, .85)) drop-shadow(0 6px 8px #000); animation: icpop .5s .3s ease-out both; }
    .ic-fix.miss .ic-fixpic { filter: drop-shadow(0 0 14px rgba(255, 120, 100, .7)) drop-shadow(0 6px 8px #000); }
    @keyframes icpop { from { transform: translate(-50%, -30%) scale(.6); opacity: 0; } }
    .ic-fixnote { position: relative; padding: 14px 16px 12px; color: #2a2018; background: linear-gradient(#f8f1df, #ecdfc2); border-radius: 2px; box-shadow: 0 4px 10px rgba(0, 0, 0, .55);
      --ink: #2a2018; --muted: #6a5a48; --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --line: #b9a780; }
    .ic-fixnote p { margin: 0 0 6px; }
    .ic-fixh { font-size: 13px; font-weight: 700; color: #2f6b3f; }
    .ic-fix.miss .ic-fixh { color: #9e3a34; }
    .ic-fixname { font-family: var(--f-head, serif); font-size: 20px; font-weight: 800; }
    .ic-line, .ic-wrote code { display: block; margin: 0 0 8px; padding: 8px 10px; border-radius: 4px; background: #1b1f27; color: #bff0c8; font: 600 15px/1.35 ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; white-space: pre-wrap; }
    .ic-wrote code { display: inline; padding: 1px 5px; font-size: 13px; }
    .ic-does { font-size: 15px; line-height: 1.4; }
    .ic-wl { display: block; margin: 8px 0 4px; font-weight: 700; }
    .ic-type { font: inherit; font-size: 16px; color: #ffe58a; background: #2c2838; border: 0; border-bottom: 2px solid #ffe58a; border-radius: 3px; padding: 0 4px; min-width: 6ch; max-width: 100%; }
    .ic-type.faint::placeholder { color: rgba(255, 229, 138, .38); }
    .ic-type.ok { color: #bff0c8; border-bottom-color: #7fd890; }
    .ic-gap { font-family: ui-monospace, Menlo, Consolas, monospace; }
    .ic-typeh { margin-top: 4px; color: #5a4a38; }
    @media (prefers-reduced-motion: reduce) { .ic-smoke, .alarm::before, .ic-trouble img, .ic-cdl i, .ic-node.reach, .ic-zoom .ic-camp-bg, .ic-fixpic { animation: none !important; } }`;
  document.head.appendChild(css);
})();
