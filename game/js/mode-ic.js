// Incident Commander (design doc "Five game modes for exam prep", build spec v4, with the Nov 16 review's fixes): one
// on-call shift on the camp's pager board. Every incident is a bank question from Domain 4 (Troubleshooting) or Domain 1
// (Development) on a service of the request path (API Gateway, Lambda, DynamoDB, SQS, S3), plus about 1 in 4 due from
// other topics (SD.modes.pick). Stems with a symptom (an error, throttling, a timeout, latency) come first. The whole
// stem is free to read; the right answer is the fix.
//   - 3 waves of 4 incidents, then a closing major incident: 3 cards from the shift's misses and their twins.
//   - Clocks start at 2, 3 or 4 ticks. Answering costs every other open clock 1 tick, and so does each map action.
//     On the map, clocks start 3 ticks longer (5, 6 or 7), since every step costs a tick too. Opening a question
//     freezes everything: time is counted in answers and moves, never seconds.
//   - Each card shows its symptom sentence and its page cost (10, 15 or 25% budget, as SEV-3/2/1), rolled apart from
//     its clock, so "lowest clock first" is a trade-off, not a calculation.
//   - Right: resolved. Wrong: after the verdict it stays open as its twin, one retry right there (2 a shift); after
//     that, or without a twin, it's logged as missed and comes back in the major incident or through spaced review.
//   - A clock at zero pages: the card's page cost comes off the error budget, and it returns next wave as its twin.
//     A Sure miss costs 5%. The budget is only for survival; points come from the shared stake table (js/modes.js).
//   - Rules arrive one per night: shift 1 is the board; from shift 2, the request-path map; from shift 3, one free
//     pick between waves (Dutch, Coo or Bru).
//   - The map (shift 2 on): you stand on a node of the path. You can work only the incidents where you stand, and
//     walking one step costs a tick. The map hides where incidents are, never their words: a new card reads
//     "not located" until you walk to its node or look with a lens (Logs, Metrics, Trace, Config, Changes: CloudWatch,
//     X-Ray and CloudTrail as lenses, 1 tick each, each finding the cards of its kind). The runbook shelf off API
//     Gateway is a detour that locates the next wave and gives each of its clocks 3 more ticks before it lands. A timeout also costs the caller upstream a tick
//     on each of its clocks. At most 4 map actions per question (walking stays open when nothing here can be worked),
//     a "Map as list" view is one tap away, and it saves after every map action.
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
  const T = IC.T = { CLOCKS: [2, 3, 4], COSTS: [10, 15, 25], MAP_CLOCK: 3, CLUSTER: 1, FOG: 1, RUNBOOK_CLOCK: 3 };
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
  IC.nodeOf = q => (q && IC.NODES.find(n => n.topics.includes(q.topic))) || null;
  // Incidents: Domain 4 and Domain 1 questions on a request-path service.
  IC.match = q => [1, 4].includes(E().domainOf(q)) && !!IC.nodeOf(q);
  // The lenses: CloudWatch, X-Ray and CloudTrail, as ways of looking, not places. Each card is found by one of them,
  // from the words of its symptom sentence (the first match wins, Logs by default).
  IC.LENSES = [
    { id: 'changes', name: 'Changes', icon: '🕘', tool: 'CloudTrail', re: /\b(deploy|new version|recently|updated|changed|after (?:a|the)|rolled|release|migrat)/i },
    { id: 'config', name: 'Config', icon: '⚙', tool: 'resource settings', re: /\b(permission|role|polic|access denied|AccessDenied|configur|setting|environment variable|memory|encrypt|KMS|CORS)/i },
    { id: 'trace', name: 'Trace', icon: '🧵', tool: 'X-Ray', re: /\b(X-Ray|trace|downstream|upstream|end-to-end|calls? (?:a|an|the|another)|between services|microservice)/i },
    { id: 'metrics', name: 'Metrics', icon: '📈', tool: 'CloudWatch metrics', re: /\b(latency|throttl|spike|slow|duration|concurrency|CPU|count|increas|percent|capacity|ProvisionedThroughput)/i },
    { id: 'logs', name: 'Logs', icon: '📜', tool: 'CloudWatch Logs', re: /./ }
  ];
  const SYMPTOM = /\b(error|exception|fail|throttl|timeout|timed out|times out|latency|slow|denied|[45]\d\d\b|spike|increas|drop|lost|duplicate|missing|stale|not (?:being |)(?:receiv|deliver|invok|trigger|process|appear)|cannot|can't|unable|retr(?:y|ies))/i;
  const sentences = t => String(t || '').split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).filter(Boolean);
  // The card's symptom: the first scenario sentence that describes one, else the scenario's last sentence.
  IC.symptom = function (q) {
    const sp = M.split(q), ss = sentences(sp.scenario);
    const hit = ss.find(x => SYMPTOM.test(x)) || ss[ss.length - 1] || sp.ask;
    return hit.length > 180 ? hit.slice(0, 178).replace(/\s+\S*$/, '') + '…' : hit;
  };
  IC.hasSymptom = q => SYMPTOM.test(M.split(q).scenario || '');
  IC.lensOf = q => IC.LENSES.find(l => l.re.test(IC.symptom(q))).id;
  const lens = id => IC.LENSES.find(l => l.id === id);

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
  const shifts = () => (sv().modes && sv().modes.icShifts) | 0;
  IC.mapOn = () => shifts() >= 1;
  IC.picksOn = () => shifts() >= 2;

  const answerText = q => (q.type === 'mc' ? q.opts[q.a] : (q.items || []).filter(i => i.ok).map(i => i.t).join(' '));
  const find = id => (SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : E().find(id));
  const used = s => s.log.map(x => x.q).concat(s.board.map(x => x.q), s.queue.map(x => x.q), s.carry.map(x => x.q), s.seen || []);
  const twinOf = (s, id) => { const q = E().find(id); return q && SD.qtwin ? SD.qtwin(q, { avoid: used(s).concat(id) }) : null; };
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
      picksOn: opts.sim ? !!opts.picks : IC.picksOn(), map: opts.sim ? opts.map !== false : IC.mapOn(),
      at: 'apigw', acts: 0, mapActs: 0, runbook: 0, view: 'map', ranks: []
    };
    // On the map, each wave lands in one corner of the path: the shift's cards are ordered by node, so a wave of 4
    // spans one or two nodes (the order of the questions is the picker's within each node).
    if (s.map && T.CLUSTER) {
      const ix = it => IC.NODES.findIndex(n => n.id === homeOf(it.q));
      const backs = s.queue.filter(it => it.back), rest = s.queue.filter(it => !it.back);
      s.queue = backs.concat(rest.map((it, k) => [ix(it), k, it]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]));
    }
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
      const q = E().find(l.q), tw = q && SD.qtwin ? SD.qtwin(q, { avoid: avoid() }) : null;
      if (tw) take.push({ q: tw.id, orig: l.orig, other: l.other, major: why });
    };
    s.log.filter(l => !l.ok).forEach(l => add(l, 'missed'));
    s.log.filter(l => l.ok).forEach(l => add(l, 'twin'));
    while (take.length < MAJOR && s.queue.length) take.push(s.queue.shift());
    return take;
  }
  IC.land = function (s, rng) {
    const R = rng || Math.random;
    s.wave++;
    let take;
    if (isMajor(s)) take = majorCards(s);
    else { take = s.carry.splice(0); while (take.length < WAVES[s.wave - 1] && s.queue.length) take.push(s.queue.shift()); }
    const warned = s.map && s.runbook === s.wave - 1 && s.wave > 1 && !isMajor(s), located = !s.map || !T.FOG || warned;
    s.board = take.map(it => {
      const c = T.CLOCKS[Math.floor(R() * T.CLOCKS.length)] + (s.map ? T.MAP_CLOCK : 0) + (warned ? T.RUNBOOK_CLOCK : 0), cost = T.COSTS[Math.floor(R() * T.COSTS.length)], at = homeOf(it.q);
      return { q: it.q, orig: it.orig || it.q, other: it.other | 0, back: it.back | 0, clock: c, max: c, cost, at, found: located || at === s.at,
        tries: it.tries | 0, timeouts: it.timeouts | 0, dutch: 0, major: it.major || '' };
    });
    s.acts = 0;
    // Snapshot for "Retry this wave" (answers already given stay logged).
    s.waveStart = { board: JSON.parse(JSON.stringify(s.board)), queue: s.queue.slice(), budget: s.budget, perks: Object.assign({}, s.perks), reruns: s.reruns | 0, at: s.at };
    s.msg = isMajor(s) ? SAY.major : SAY.wave[s.wave - 1] || SAY.open;
    s.since = '';
  };
  const logOf = (s, b) => {
    let l = s.log.find(x => x.orig === b.orig);
    if (!l) s.log.push(l = { orig: b.orig, q: b.q, ok: 0, conf: -1, cost: b.cost, tries: 0, timeouts: 0, other: b.other });
    return l;
  };
  const nodeName = id => { const n = IC.nodeOf(E().find(id)); return n ? n.name : 'Elsewhere'; };
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
        s.carry.push({ q: tw ? tw.id : b.q, orig: b.orig, other: b.other, tries: b.tries, timeouts: b.timeouts });
        notes.push(`⏱ ${where(b)} paged: −${cost}% budget, back ${isMajor(s) ? 'next shift' : 'next wave'}`);
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
    M.note(s.tally, !!r.ok, conf);
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
  // ---- Map actions: walk one step, look with a lens, read the runbook. Each costs a tick on every clock. ----
  IC.canAct = function (s, kind) {
    if (s.phase !== 'board' || !s.map) return false;
    if (s.acts < MAP_CAP) return true;
    // Over the cap, walking stays open only when nothing here can be worked.
    return kind === 'walk' && !s.board.some(b => b.found && b.at === s.at);
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
    const found = s.board.filter(b => b.at === to && !b.found);
    found.forEach(b => { b.found = true; });
    if (to === 'runbook') s.runbook = s.wave;
    mapTick(s, `walked to ${place(to).name}${found.length ? `, found ${plural(found.length, 'incident')}` : ''}${to === 'runbook' ? ', read where the next wave lands' : ''}`, free);
    if (to === 'runbook') s.msg = SAY.runbook;
    return true;
  };
  IC.look = function (s, id) {
    if (!lens(id) || !IC.canAct(s, 'look')) return false;
    const found = s.board.filter(b => !b.found && IC.lensOf(E().find(b.q)) === id);
    found.forEach(b => { b.found = true; });
    mapTick(s, `${lens(id).icon} ${lens(id).name} found ${found.length ? found.map(where).join(', ') : 'nothing new'}`);
    return true;
  };
  // Where the next wave lands, as the runbook tells it: the timed-out cards and the queue's next cards.
  IC.nextLanding = function (s) {
    if (s.wave >= WAVES.length) return [];
    const take = s.carry.slice(); let i = 0;
    while (take.length < WAVES[s.wave] && i < s.queue.length) take.push(s.queue[i++]);
    return take.map(it => homeOf(it.q));
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
    s.perks = Object.assign({}, w.perks); s.reruns = w.reruns | 0; s.at = w.at || 'apigw'; s.acts = 0;
    s.phase = 'board'; s.zero = false; s.retries = (s.retries | 0) + 1;
    s.msg = 'Again. I\'ll pretend I didn\'t see that.'; s.since = '';
  };

  // ---- The board (shift 1) and the map (shift 2 on) ----
  const sev = c => (c >= 25 ? ['🔥', 'SEV-1'] : c >= 15 ? ['⚠', 'SEV-2'] : ['ⓘ', 'SEV-3']);
  const workable = (s, b) => !s.map || (b.found && b.at === s.at);
  function cardHtml(s, b, i) {
    const q = find(b.q);
    if (!q) return '';
    const sp = M.split(q), [ic, lv] = sev(b.cost), ln = lens(IC.lensOf(q));
    const pips = Array.from({ length: Math.max(b.max, b.clock) }, (_, k) => (k < b.clock ? '●' : '○')).join('');
    const loc = !s.map ? (IC.nodeOf(q) ? IC.nodeOf(q).name : String(q.topic || '').toUpperCase()) : b.found ? `📍 ${where(b)}` : '🌫 Not located';
    const can = workable(s, b);
    const why = can ? '' : b.found ? `Walk to ${where(b)} to work it (${plural(IC.dist(s.at, b.at), 'step')})` : `Walk to its node, or look with ${ln.icon} ${ln.name}`;
    return `<div class="ic-inc ic-${lv.toLowerCase()}"><button class="opt ic-card" data-inc="${i}"${can ? '' : ' aria-disabled="true"'} aria-label="Incident ${b.found || !s.map ? 'at ' + esc(where(b)) : 'not located yet'}, ${lv}, pages for ${b.cost}%, ${plural(b.clock, 'tick')} left. ${can ? 'Open it' : esc(why)}">
      <span class="ic-top"><b class="ic-sev">${ic} ${lv} · pages −${b.cost}%</b><b>${esc(loc)}</b><span class="small"><b>${plural(b.clock, 'tick')} left</b></span></span>
      <span class="ic-clock" aria-hidden="true">${pips}</span>
      <span class="ic-sym">${esc(IC.symptom(q))}</span>
      ${sp.qual ? `<span class="ic-qual">★ Asks for: <b>${esc(sp.qual)}</b></span>` : ''}${sp.pick ? `<span class="ic-qual">☰ ${esc(sp.pick)}</span>` : ''}
      <span class="muted small ic-tags">${b.major ? '🚨 Major incident · ' : ''}${b.other ? 'From another topic' : 'Request path'}${s.map && !b.found ? ` · ${ln.icon} ${ln.name} would find it` : ''}${b.back ? ' · back from last shift' : ''}${b.tries ? ' · ↻ new scenario after a miss' : ''}${b.timeouts ? ' · ⏱ paged before' : ''}${b.dutch ? ' · 🛡 Dutch is here' : ''}</span>
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
  // The request path, top to bottom: the runbook shelf and the gate, the forge, then the three stores side by side.
  function nodeBtn(s, n) {
    const here = s.at === n.id, open = s.board.filter(b => b.found && b.at === n.id), d = IC.dist(s.at, n.id);
    const can = !here && d === 1 && IC.canAct(s, 'walk');
    const nxt = s.runbook === s.wave ? IC.nextLanding(s).filter(x => x === n.id).length : 0;
    const low = open.length ? Math.min(...open.map(b => b.clock)) : 0;
    const state = [here ? '📍 You are here' : d === 1 ? '1 step' : `${d} steps`, open.length ? `🔔 ${open.length} open, lowest ${plural(low, 'tick')}` : n.id === 'runbook' ? '📖 next wave' : '✓ quiet', nxt ? `🎯 ${nxt} next wave` : ''].filter(Boolean);
    return `<button class="ic-node${here ? ' here' : ''}${open.length ? ' alarm' : ''}" data-walk="${n.id}"${can ? '' : ' disabled'} aria-label="${esc(n.name)}: ${esc(state.join(', '))}${can ? '. Walk here, 1 tick' : ''}">
      <b>${here ? '📍 ' : ''}${esc(n.name)}</b><span class="small">${esc(state.slice(here ? 1 : 0).join(' · ') || (here ? 'You are here' : ''))}</span>${can ? '<span class="small ic-go">Walk · 1 tick</span>' : ''}</button>`;
  }
  function mapHtml(s) {
    const fog = s.board.filter(b => !b.found).length, lensOk = IC.canAct(s, 'look');
    const path = s.view === 'list'
      ? `<ul class="ic-list">${PLACES.map(n => { const open = s.board.filter(b => b.found && b.at === n.id); const d = IC.dist(s.at, n.id), can = d === 1 && IC.canAct(s, 'walk');
          return `<li><b>${s.at === n.id ? '📍 ' : ''}${esc(n.name)}</b> <span class="small">(${esc(n.place)}) · ${s.at === n.id ? 'you are here' : plural(d, 'step')} · ${open.length ? `🔔 ${open.length} open: ${open.map(b => `${sev(b.cost)[1]}, ${plural(b.clock, 'tick')}`).join('; ')}` : n.id === 'runbook' ? '📖 where the next wave lands' : '✓ quiet'}</span>${can ? ` <button class="ghost ic-step" data-walk="${n.id}">Walk here · 1 tick</button>` : ''}</li>`; }).join('')}</ul>`
      : `<div class="ic-map" role="group" aria-label="The request path">
          <div class="ic-row">${nodeBtn(s, RUNBOOK)}${nodeBtn(s, place('apigw'))}</div><div class="ic-link" aria-hidden="true">│</div>
          <div class="ic-row">${nodeBtn(s, place('lambda'))}</div><div class="ic-link" aria-hidden="true">┌──┼──┐</div>
          <div class="ic-row">${nodeBtn(s, place('ddb'))}${nodeBtn(s, place('sqs'))}${nodeBtn(s, place('s3'))}</div></div>`;
    return `${path}
      <div class="row ic-tools"><button class="ghost" id="ic-view">${s.view === 'list' ? '🗺 Show the map' : '☰ Map as list'}</button></div>
      <p class="small ic-lens-l">${fog ? `🌫 ${plural(fog, 'incident')} not located. ` : ''}Look with a lens (1 tick): it finds every card of its kind, wherever it is.</p>
      <div class="ic-lenses">${IC.LENSES.map(l => `<button class="ghost ic-lens" data-look="${l.id}"${lensOk && fog ? '' : ' disabled'} aria-label="${l.name} lens (${esc(l.tool)}): find its incidents, 1 tick">${l.icon} ${l.name}</button>`).join('')}</div>
      ${s.acts >= MAP_CAP ? '<p class="small"><b>Four map actions since your last answer: work an incident here next.</b></p>' : `<p class="muted small">Map actions since your last answer: ${s.acts} of ${MAP_CAP}.</p>`}`;
  }
  IC.board = function () {
    const s = shift();
    if (!s) return;
    if (s.phase === 'pick') return pickPanel(s);
    if (s.phase === 'zero') return zeroPanel(s);
    if (s.phase === 'done') return results(s);
    const order = s.board.map((b, i) => i).sort((a, c) => (workable(s, s.board[c]) - workable(s, s.board[a])) || (s.board[a].clock - s.board[c].clock));
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.msg || SAY.open)}</p>
      ${s.since ? `<p class="small ic-since">${esc(s.since)}</p>` : ''}
      ${hud(s)}
      ${s.map ? mapHtml(s) : ''}
      <p class="small">${s.map ? `Work an incident where you stand (${esc(place(s.at).name)}). Every answer and every step ticks the other clocks by one.` : 'Pick an incident to work. Every answer ticks the other clocks by one.'} The board waits while you read.</p>
      <div class="ic-board">${order.map(i => cardHtml(s, s.board[i], i)).join('')}</div>
      <div class="row"><button class="ghost" id="ic-how">How to play</button><button class="ghost" id="ic-stop">Stop for now</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-inc]').forEach(el => el.onclick = () => { if (workable(s, s.board[+el.dataset.inc])) work(+el.dataset.inc); });
    b.querySelectorAll('[data-dutch]').forEach(el => el.onclick = () => { IC.useDutch(s, +el.dataset.dutch); save(s); IC.board(); });
    b.querySelectorAll('[data-walk]').forEach(el => el.onclick = () => { if (IC.walk(s, el.dataset.walk)) afterMap(s); });
    b.querySelectorAll('[data-look]').forEach(el => el.onclick = () => { if (IC.look(s, el.dataset.look)) afterMap(s); });
    const v = b.querySelector('#ic-view');
    if (v) v.onclick = () => { s.view = s.view === 'list' ? 'map' : 'list'; save(s); IC.board(); };
    b.querySelector('#ic-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-how').onclick = () => M.walk(ID, walkScreens(s)).then(IC.board);
  };
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
    const r = await M.ask(q, {
      title: TITLE, tally: s.tally, think: true, act: { label: `Apply a fix at ${where(inc)}`, icon: '🛠' },
      context: `Incident at ${where(inc)} · ${isMajor(s) ? 'major incident' : 'wave ' + s.wave} · pages −${inc.cost}% · ${plural(inc.clock, 'tick')} left${inc.tries ? ' · a new scenario of the same fault' : ''}`,
      progress: isMajor(s) ? 'Major incident' : `Wave ${s.wave}`, onStop: () => {}
    });
    if (r.stopped && !r.committed) return stopNow();
    if (r.closed) return IC.board();
    IC.settle(s, inc, r);
    if (IC.settleNotes(s)) U.system('PAGED', esc(s.since.replace(/^Since your last answer: /, '')), 'red');
    save(s);
    if (r.stopped) { s.phase = phaseAfter(s); save(s); return stopNow(); }
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
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(SAY.pick)}</p>
      ${hud(s)}
      <p class="small">Wave ${s.wave} cleared. Take one, free. It lasts until it's used.</p>
      <div class="opts">${IC.PICKS.map(p => `<button class="opt ic-pick" data-pick="${p.id}"><b>${esc(p.who)}:</b> ${esc(p.id === 'bru' ? (s.map ? 'One free step each wave' : 'Your next answer ticks no other clock') : p.what)}<br><span class="small"><i>"${esc(p.line)}"</i></span></button>`).join('')}</div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => { IC.applyPick(s, el.dataset.pick); s.phase = 'board'; save(s); IC.board(); });
  }

  // ---- 0% budget: retry the wave, or end the shift ----
  function zeroPanel(s) {
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(SAY.zero)}</p>
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
    const left = s.board.concat(s.carry).map(b => ({ q: b.q, other: b.other }));
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
    const topics = [...new Set(s.log.map(l => { const q = E().find(l.q); return q && q.topic ? String(q.topic).replace(/-/g, ' ') : null; }).filter(Boolean))];
    const clip = t => (t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, '') + '…' : t);
    // Open on the best fix: a Sure that was right, on the costliest card; else any right answer.
    const best = s.log.filter(l => l.ok).sort((a, b) => (b.conf - a.conf) || ((b.cost | 0) - (a.cost | 0)))[0];
    const bq = best && E().find(best.q);
    const rows = s.log.map(l => {
      const q = E().find(l.q);
      if (!q) return '';
      return `<li><b>${l.ok ? '✓ Resolved' : '✗ Missed'}</b> <span class="muted small">${esc(nodeName(l.q))} · ${esc(String(q.topic || '').replace(/-/g, ' '))}${l.timeouts ? ' · ⏱ paged' : ''}${l.tries > 1 ? ` · ${l.tries} tries` : ''}</span><br><span class="small">${esc(clip(answerText(q)))}</span></li>`;
    }).join('');
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.zero ? SAY.zero : SAY.end)}</p>
      ${bq ? `<div class="ic-best"><p class="small"><b>${best.conf === 2 ? '★ Your best fix tonight, and you were Sure' : '★ Your best fix tonight'}</b> · ${esc(nodeName(best.q))}${best.cost ? ` · a SEV-${best.cost >= 25 ? 1 : best.cost >= 15 ? 2 : 3}` : ''}</p><p class="small">${esc(clip(answerText(bq)))}</p></div>` : ''}
      <p class="td-big">${right} of ${s.log.length} incidents resolved.</p>
      <p class="small">${s.zero ? 'The error budget hit 0%, so the shift ended early.' : `Error budget left: <b>${s.budget}%</b>.`} Points: <b>${M.sgn(s.pts)}</b> from ${plural(n, 'answer')}.${sureMiss ? ` ${sureMiss === 1 ? 'One Sure miss' : sureMiss + ' Sure misses'} went up on the Wall.` : ''}</p>
      <p class="small ic-advice"><b>${esc(advice(s))}</b></p>
      ${s.left ? `<p class="small">⏱ ${plural(s.left, 'incident')} still open ${s.left === 1 ? 'starts' : 'start'} your next shift.</p>` : ''}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      <p class="muted small">${s.verified} of the shift's incidents were verified against AWS docs.${s.topped ? ` ${s.topped} unchecked ones filled in, marked "Not verified yet".` : ''} Topics: ${esc(topics.join(', ') || 'none')}.</p>
      <details class="ic-log"><summary class="q-ctx">Every incident's fix</summary><ul>${rows}</ul></details>
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="ic-done">Done</button><button class="ghost" id="ic-again">New shift</button></div>`, { title: TITLE, onClose: stopNow });
    M.pipWire(b, 'Incident Commander');
    b.querySelector('#ic-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-again').onclick = () => IC.start();
  }

  // ---- First run (and the map's first night) ----
  function walkScreens(s) {
    const first = s && s.board[0], q = first && find(first.q), sp = q ? M.split(q) : null;
    const screens = [
      { title: 'An incident', html: `<p><b>Uptima:</b> "${esc(SAY.open)}"</p>
        <p>Each incident is a real exam question about a service on the request path. Its card shows the symptom, so you can see what you're walking into:</p>
        ${q ? `<div class="md-eg"><p class="small">${esc(IC.symptom(q))}</p>${sp.qual ? `<p class="small">★ Asks for: <b>${esc(sp.qual)}</b></p>` : ''}</div>` : ''}
        <p class="small">Open it to read the whole question. The star line is the qualifier: MOST cost-effective and LEAST overhead pick different fixes.</p>` },
      { title: 'Apply a fix', html: `<p>Name the cause in your own words, then the fixes show. Apply one and say how sure you are:</p>
        ${M.stakeTable()}<p class="small">Right resolves it. Wrong: after the explanation, it stays open as the same fault in a new scenario, so you get one more try straight away. Miss that too, or run out of the shift's ${RERUNS} retries, and it comes back in the major incident.</p>` },
      { title: 'Clocks and pages', html: `<p>Every answer ticks every other incident's clock by one (●●○ is two ticks left). The board waits while you read: there's no real-time clock.</p>
        <p>A clock at zero pages: the card's cost (SEV-3 −10%, SEV-2 −15%, SEV-1 −25%) comes off the error budget, and it comes back next wave in a new disguise. A Sure miss costs ${SURE_MISS}%. So the card about to page and the card that pages hardest aren't always the same one.</p>
        <p class="small">${WAVES.length} waves, then a major incident made of tonight's misses. It saves after every answer: stop any time.</p>` }
    ];
    if (s && s.map) screens.push({ title: 'The request path', html: `<p>From tonight, you walk the request path: API Gateway, Lambda, then DynamoDB, SQS or S3. You can only fix what's where you stand, and each step ticks every clock, so clocks start 3 ticks longer.</p>
        <p>New incidents arrive <b>🌫 Not located</b>. Their words are all there; the map hides where they are. Walk to a node to find what's there, or look with a lens (📜 Logs, 📈 Metrics, 🧵 Trace, ⚙ Config, 🕘 Changes) to find every card of that kind, for one tick.</p>
        <p class="small">A page spreads upstream: the caller loses a tick on each clock. The 📖 Runbook shelf beside the gate shows where the next wave lands, and gives each of its clocks 3 more ticks. At most ${MAP_CAP} map actions per question, and ☰ Map as list is always one tap away.</p>` });
    return screens;
  }

  IC.start = async function () {
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
  // policy.route: 'near' never detours and works the lowest clock first; 'far' reads the runbook every wave and works
  // the costliest page first. policy.map: false plays the board without the map. policy.pick: which between-wave pick.
  IC.sim = async function (policy, rng) {
    const s = IC.newShift({ sim: true, rng, picks: !!policy.picks, map: policy.map !== false });
    const far = policy.route === 'far';
    let taps = 0, guard = 0;
    const score = b => (far ? -b.cost * 10 + b.clock : b.clock * 100 - b.cost);
    for (;;) {
      if (++guard > 400) break;
      if (s.phase === 'pick') { IC.applyPick(s, policy.pick || IC.PICKS[Math.floor(rng() * 3)].id, rng); taps++; s.phase = 'board'; continue; }
      if (s.phase === 'zero') { s.zero = true; break; }
      if (s.phase === 'done' || !s.board.length) { const n = IC.next(s, rng); s.phase = n; if (n === 'done') break; continue; }
      if (s.map) {
        const here = s.board.filter(b => b.found && b.at === s.at).sort((a, b) => score(a) - score(b));
        const found = s.board.filter(b => b.found).sort((a, b) => score(a) - score(b) || IC.dist(s.at, a.at) - IC.dist(s.at, b.at));
        let acted = false;
        if (far && s.runbook !== s.wave && s.wave < WAVES.length && IC.canAct(s, 'walk')) {
          const step = near(s.at).sort((a, b) => IC.dist(a, 'runbook') - IC.dist(b, 'runbook'))[0];
          if (!here.length || s.acts === 0) acted = IC.walk(s, step);
        }
        if (!acted && here.length && (!found.length || score(here[0]) <= score(found[0]) || !IC.canAct(s, 'walk'))) {
          const inc = here[0];
          taps++;
          IC.settle(s, inc, M.simAnswer(E().find(inc.q), policy, rng));
        } else if (!acted) {
          const fog = s.board.filter(b => !b.found);
          if (!found.length && fog.length && IC.canAct(s, 'look')) {
            // Look with the lens that finds the most.
            const best = IC.LENSES.map(l => [l.id, fog.filter(b => IC.lensOf(E().find(b.q)) === l.id).length]).sort((a, b) => b[1] - a[1])[0][0];
            IC.look(s, best);
          } else {
            const goal = found.length ? found[0].at : 'lambda';
            const step = near(s.at).sort((a, b) => IC.dist(a, goal) - IC.dist(b, goal))[0];
            if (!IC.walk(s, step)) { const any = s.board[0]; taps++; IC.settle(s, any, M.simAnswer(E().find(any.q), policy, rng)); }
          }
        }
      } else {
        const inc = s.board.slice().sort((a, b) => score(a) - score(b))[0];
        taps++;
        IC.settle(s, inc, M.simAnswer(E().find(inc.q), policy, rng));
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
    status: () => { const s = shift(); return s && s.v === 3 && s.phase !== 'done' ? `Resume · ${isMajor(s) ? 'major incident' : `wave ${s.wave} of ${waves()}`}, ${Math.max(0, s.budget)}% budget` : ''; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .ic-say { margin: 0 0 8px; }
    .ic-since { margin: 0 0 8px; padding: 6px 8px; border-left: 4px solid var(--ink, #222); overflow-wrap: anywhere; }
    .ic-hud { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 14px; }
    .ic-bar { margin: 4px 0 8px; }
    .ic-bar i { background: var(--mint, #5bc08a); }
    .ic-perks { margin: 0 0 6px; }
    .ic-map { display: flex; flex-direction: column; align-items: stretch; margin: 4px 0; }
    .ic-row { display: flex; gap: 6px; justify-content: center; }
    .ic-row > .ic-node { flex: 1 1 0; min-width: 0; }
    .ic-link { text-align: center; line-height: 1; font-family: monospace; opacity: .7; }
    .ic-node { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 56px; padding: 6px 4px; text-align: center; overflow-wrap: anywhere; border: 2px solid var(--ink, #222); border-radius: 6px; background: var(--paper, #fff); color: inherit; font: inherit; }
    .ic-node.here { border-width: 4px; border-style: double; }
    .ic-node:disabled { opacity: 1; cursor: default; }
    .ic-node .ic-go { text-decoration: underline; }
    .ic-list { padding-left: 18px; margin: 4px 0; }
    .ic-list li { margin: 6px 0; overflow-wrap: anywhere; }
    .ic-step { min-height: 44px; }
    .ic-tools { margin: 4px 0; }
    .ic-lens-l { margin: 4px 0; }
    .ic-lenses { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .ic-lens { min-height: 44px; flex: 1 1 30%; }
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
    .ic-log li { margin: 6px 0; overflow-wrap: anywhere; }`;
  document.head.appendChild(css);
})();
