// Incident Commander (design doc "Five game modes for exam prep", build spec v4): one on-call shift of 4 waves on the
// camp's pager board. Every incident is a bank question from Domain 4 (Troubleshooting) or Domain 1 (Development) on
// a service of the request path (API Gateway, Lambda, DynamoDB, SQS, S3), plus about 1 in 4 due from other topics
// (SD.modes.pick). The whole stem is free to read; the right answer is the fix.
//   - Clocks start at 5, 7 or 9 ticks. Answering an incident costs every other open clock 1 tick. Opening a question
//     freezes the board: time is counted in answers, never seconds.
//   - Right: resolved. Wrong: after the verdict it stays open as its twin (the same cause in a scenario you haven't
//     seen), one retry right there; after a second miss, or without a twin, it's logged as missed and comes back through spaced review.
//   - A clock at zero pages: 15% of the error budget, and the incident returns next wave as its twin. A Sure miss
//     costs 5%. The error budget is only for survival; points come from the shared stake table (js/modes.js).
//   - Between waves, from the second shift on (one new rule per night): one free pick from Dutch, Coo or Bru.
//   - At 0% the shift stops, and "Retry this wave" restarts the wave in one tap; answers already given stay logged.
//   - Saves after every answer and every pick (S.save.ic). Host: Uptima, the secondary pager (Story review: Kyu held
//     the pager). The request-path map with Logs, Metrics, Trace, Config and Changes lenses comes next (Nov 19).
(function () {
  if (!SD.modes) return;
  const M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam;
  const esc = s => U.esc(s);
  const ID = 'ic', TITLE = 'INCIDENT COMMANDER';
  const WAVES = [3, 3, 3, 3];             // incidents landing in each wave: 12 in all
  const OVERTIME = 1;                     // one extra wave after wave 4 for incidents that timed out in it
  const CLOCKS = [5, 7, 9];
  const TIMEOUT = 15, SURE_MISS = 5;      // error budget, in %
  const IC = SD.ic = {};
  const sv = () => S.save;
  const shift = () => sv().ic || null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---- The request path: the services incidents land on (the map's nodes from Nov 19) ----
  IC.NODES = [
    { id: 'apigw', name: 'API Gateway', topics: ['apigateway'] },
    { id: 'lambda', name: 'Lambda', topics: ['lambda'] },
    { id: 'ddb', name: 'DynamoDB', topics: ['dynamodb', 'dax'] },
    { id: 'sqs', name: 'SQS', topics: ['sqs'] },
    { id: 's3', name: 'S3', topics: ['s3'] }
  ];
  IC.nodeOf = q => (q && IC.NODES.find(n => n.topics.includes(q.topic))) || null;
  // Incidents: Domain 4 and Domain 1 questions on a request-path service.
  IC.match = q => [1, 4].includes(E().domainOf(q)) && !!IC.nodeOf(q);

  // ---- Lines (barks: no numbers, no AWS claims) ----
  const SAY = {
    open: 'Kyu held the Cloud\'s pager for ten thousand years. I\'m the secondary. Tonight it\'s yours. Wake me if the error budget hits zero. Don\'t wake me.',
    wave: [null, 'Wave two. I\'m asleep. This is a recording of me being asleep.', 'Wave three. Kyu did this every night. Every. Night.', 'Last wave. Close these and the pager goes back in the drawer.'],
    overtime: 'Overtime. The ones that got away came back. They always come back.',
    sureRight: 'Resolved, and you were Sure. I\'m writing that in the postmortem. In gold.',
    right: 'Resolved. One less red light. I like fewer red lights.',
    wrong: 'Still open. Same fault, different symptoms. Read it all again. The stem is always telling on someone.',
    missed: 'That one got away. It\'ll page you again some other night. They always do.',
    sureMiss: 'You were Sure. I was Sure once. I was a goddess. Look at me now.',
    timeout: 'That one paged twice. It comes back next wave, in a new disguise.',
    pick: 'Between waves. Somebody\'s offering to help. Take it. I never did.',
    zero: 'I am risen! Thy goddess is... oh. Oh no. Kyu never woke me. Not once in ten thousand years.',
    end: 'Shift over. Hand me the pager. ...Actually, keep it till morning.'
  };
  // Between-wave picks (spec v4): incomparable, one per break, from the second shift on.
  IC.PICKS = [
    { id: 'dutch', who: 'Dutch', what: '+2 ticks on one clock you choose', line: 'Point at a door. Nobody pages through it while I\'m standing there.' },
    { id: 'coo', who: 'Coo', what: 'The next timeout costs half', line: 'Coo. The next letter that goes astray, I\'ll catch half of it.' },
    { id: 'bru', who: 'Bru', what: 'Your next answer ticks no other clock', line: 'I\'ll walk the doors myself while you work. Go. ¡Ándale!' }
  ];
  const pickDef = id => IC.PICKS.find(p => p.id === id);
  IC.picksOn = () => ((sv().modes && sv().modes.icShifts) | 0) >= 1;

  const answerText = q => (q.type === 'mc' ? q.opts[q.a] : (q.items || []).filter(i => i.ok).map(i => i.t).join(' '));
  const find = id => (SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : E().find(id));
  const twinOf = (s, id) => {
    const q = E().find(id), used = s.log.map(x => x.q).concat(s.board.map(x => x.q), s.queue.map(x => x.q), s.carry.map(x => x.q), s.seen || []);
    return q && SD.qtwin ? SD.qtwin(q, { avoid: used.concat(id) }) : null;
  };

  // ---- The shift: a state machine the board UI and the simulator (tools/modes_sim.js) share ----
  IC.newShift = function (opts) {
    opts = opts || {};
    const back = opts.sim ? [] : (sv().icBacklog || []).filter(it => E().find(it.q)).slice(0, 4);
    const want = WAVES.reduce((a, b) => a + b, 0) - back.length;
    const r = M.pick({ match: IC.match, n: Math.max(0, want), avoid: back.map(it => it.q) });
    const s = {
      v: 2, t: Date.now(), sim: !!opts.sim, rng: undefined, wave: 0, phase: 'board', budget: 100, pts: 0, tally: M.newTally(),
      queue: back.map(it => ({ q: it.q, other: it.other | 0, back: 1 })).concat(r.items.map(it => ({ q: it.q, other: it.other }))),
      board: [], carry: [], log: [], seen: [], perks: {}, picked: [], verified: r.verified, topped: r.topped, msg: '', since: '', answers: 0,
      picksOn: opts.sim ? !!opts.picks : IC.picksOn()
    };
    if (!opts.sim) { sv().icBacklog = []; sv().ic = s; }
    IC.land(s, opts.rng);
    save(s);
    return s;
  };
  const save = s => { if (!s.sim) S.persist(); };
  const lastWave = s => s.wave >= WAVES.length + OVERTIME || (s.wave >= WAVES.length && !s.carry.length && !s.queue.length);
  IC.land = function (s, rng) {
    const R = rng || Math.random;
    s.wave++;
    const size = s.wave <= WAVES.length ? WAVES[s.wave - 1] : 3;
    const take = s.carry.splice(0);
    while (take.length < size && s.queue.length) take.push(s.queue.shift());
    s.board = take.map(it => {
      const c = CLOCKS[Math.floor(R() * CLOCKS.length)];
      return { q: it.q, orig: it.orig || it.q, other: it.other | 0, back: it.back | 0, clock: c, max: c, tries: it.tries | 0, timeouts: it.timeouts | 0, dutch: 0 };
    });
    // Snapshot for "Retry this wave" (answers already given stay logged).
    s.waveStart = { board: JSON.parse(JSON.stringify(s.board)), carry: [], queue: s.queue.slice(), budget: s.budget, perks: Object.assign({}, s.perks) };
    s.msg = s.wave <= WAVES.length ? SAY.wave[s.wave - 1] || SAY.open : SAY.overtime;
    s.since = '';
  };
  const logOf = (s, b) => {
    let l = s.log.find(x => x.orig === b.orig);
    if (!l) s.log.push(l = { orig: b.orig, q: b.q, ok: 0, tries: 0, timeouts: 0, other: b.other });
    return l;
  };
  const nodeName = id => { const n = IC.nodeOf(E().find(id)); return n ? n.name : 'Elsewhere'; };
  // One answer: r = { ok, conf, pts }. Returns what changed, for the "Since your last answer" line.
  IC.settle = function (s, inc, r) {
    const l = logOf(s, inc), conf = [0, 1, 2].includes(r.conf) ? r.conf : 0, notes = [];
    s.pts += r.pts || 0; s.answers++;
    l.tries++; l.q = inc.q;
    s.seen.push(inc.q);
    const idx = s.board.indexOf(inc);
    if (r.ok) {
      l.ok = 1;
      s.board.splice(idx, 1);
      s.msg = conf === 2 ? SAY.sureRight : SAY.right;
      notes.push(`✓ ${nodeName(inc.q)} resolved`);
    } else {
      inc.tries++;
      if (conf === 2) { s.budget -= SURE_MISS; notes.push(`Sure miss −${SURE_MISS}% budget`); }
      const tw = inc.tries <= 1 ? twinOf(s, inc.q) : null;   // one retry on the twin, then it's logged as missed
      if (tw) { inc.q = tw.id; s.msg = conf === 2 ? SAY.sureMiss : SAY.wrong; notes.push(`↻ ${nodeName(inc.q)} still open, as a new scenario`); }
      else { s.board.splice(idx, 1); s.msg = conf === 2 ? SAY.sureMiss : SAY.missed; notes.push(`✗ ${nodeName(inc.q)} missed: it comes back in review`); }
    }
    // Every answer ticks every other open clock, unless Bru is covering this one.
    if (s.perks.bru) { s.perks.bru = 0; notes.push('Bru covered the other clocks'); }
    else s.board.filter(b => b !== inc).forEach(b => { b.clock--; });
    const out = s.board.filter(b => b.clock <= 0);
    out.forEach(b => {
      let cost = TIMEOUT;
      if (s.perks.coo) { s.perks.coo = 0; cost = Math.ceil(TIMEOUT / 2); }
      s.budget -= cost; b.timeouts++;
      logOf(s, b).timeouts++;
      s.board.splice(s.board.indexOf(b), 1);
      // It comes back next wave as its twin (the same question when it has none: it was never answered).
      const tw = twinOf(s, b.q);
      s.carry.push({ q: tw ? tw.id : b.q, orig: b.orig, other: b.other, tries: b.tries, timeouts: b.timeouts });
      notes.push(`⏱ ${nodeName(b.q)} paged: −${cost}% budget, back next wave`);
    });
    if (out.length) s.msg = SAY.timeout;
    const ticked = s.board.filter(b => b !== inc && !out.includes(b)).map(b => `${nodeName(b.q)} ${b.clock}`);
    if (ticked.length && !notes.some(n => /Bru/.test(n))) notes.push('clocks: ' + ticked.join(', '));
    s.budget = Math.max(0, s.budget);
    s.since = 'Since your last answer: ' + notes.join(' · ') + '.';
    return out.length;
  };
  // What comes after an answer or a pick: 'zero', 'board', 'pick', or 'done'.
  IC.next = function (s, rng) {
    if (s.budget <= 0) return 'zero';
    if (s.board.length) return 'board';
    if (lastWave(s)) return 'done';
    if (s.picksOn && s.wave < WAVES.length && s.picked.length < s.wave) return 'pick';
    IC.land(s, rng);
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
    s.since = `Dutch is standing at ${nodeName(b.q)}: +2 ticks.`;
    return true;
  };
  IC.retryWave = function (s) {
    const w = s.waveStart;
    s.board = JSON.parse(JSON.stringify(w.board)); s.carry = []; s.queue = w.queue.slice(); s.budget = Math.max(w.budget, TIMEOUT + 1);
    s.perks = Object.assign({}, w.perks); s.phase = 'board'; s.zero = false; s.retries = (s.retries | 0) + 1;
    s.msg = 'Again. I\'ll pretend I didn\'t see that.'; s.since = '';
  };

  // ---- The board ----
  const sev = c => (c <= 2 ? ['🔥', 'SEV-1'] : c <= 4 ? ['⚠', 'SEV-2'] : ['ⓘ', 'SEV-3']);
  function cardHtml(s, b, i) {
    const q = find(b.q);
    if (!q) return '';
    const sp = M.split(q), [ic, lv] = sev(b.clock), node = IC.nodeOf(q);
    const pips = Array.from({ length: Math.max(b.max, b.clock) }, (_, k) => (k < b.clock ? '●' : '○')).join('');
    return `<div class="ic-inc ic-${lv.toLowerCase()}"><button class="opt ic-card" data-inc="${i}" aria-label="Incident at ${esc(node ? node.name : 'another service')}, ${lv}, ${plural(b.clock, 'tick')} left. Open it">
      <span class="ic-top"><b class="ic-sev">${ic} ${lv}</b><b>${esc(node ? node.name : String(q.topic || '').toUpperCase())}</b><span class="small"><b>${plural(b.clock, 'tick')} left</b></span></span>
      <span class="ic-clock" aria-hidden="true">${pips}</span>
      <span class="ic-sym">${esc(sp.ask)}</span>
      ${sp.qual ? `<span class="ic-qual">★ Asks for: <b>${esc(sp.qual)}</b></span>` : ''}${sp.pick ? `<span class="ic-qual">☰ ${esc(sp.pick)}</span>` : ''}
      <span class="muted small ic-tags">${b.other ? 'From another topic' : 'Request path'}${b.back ? ' · back from last shift' : ''}${b.tries ? ' · ↻ new scenario after a miss' : ''}${b.timeouts ? ' · ⏱ paged before' : ''}${b.dutch ? ' · 🛡 Dutch is here' : ''}</span></button>
      ${s.perks.dutch ? `<button class="ghost ic-dutch" data-dutch="${i}">🛡 Send Dutch here (+2 ticks)</button>` : ''}</div>`;
  }
  function hud(s) {
    const b = Math.max(0, s.budget);
    const perks = [s.perks.coo ? '🪶 Coo: next timeout costs half' : '', s.perks.bru ? '🚪 Bru: next answer ticks no clock' : '', s.perks.dutch ? '🛡 Dutch: +2 on one clock' : ''].filter(Boolean);
    return `<div class="ic-hud"><span><b>Wave ${Math.min(s.wave, WAVES.length)}${s.wave > WAVES.length ? ' · overtime' : ''}</b> of ${WAVES.length}</span>
      <span>Error budget <b>${b}%</b></span><span>Points <b>${M.sgn(s.pts)}</b></span></div>
      <div class="bar ic-bar" role="img" aria-label="Error budget ${b}%"><i style="width:${b}%"></i></div>
      ${perks.length ? `<p class="small ic-perks">${perks.map(esc).join(' · ')}</p>` : ''}`;
  }
  IC.board = function () {
    const s = shift();
    if (!s) return;
    if (s.phase === 'pick') return pickPanel(s);
    if (s.phase === 'zero') return zeroPanel(s);
    if (s.phase === 'done') return results(s);
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.msg || SAY.open)}</p>
      ${s.since ? `<p class="small ic-since">${esc(s.since)}</p>` : ''}
      ${hud(s)}
      <p class="small">Pick an incident to work. Every answer ticks the other clocks by one. The board waits while you read.</p>
      <div class="ic-board">${s.board.map((x, i) => cardHtml(s, x, i)).join('')}</div>
      <div class="row"><button class="ghost" id="ic-how">How to play</button><button class="ghost" id="ic-stop">Stop for now</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-inc]').forEach(el => el.onclick = () => work(+el.dataset.inc));
    b.querySelectorAll('[data-dutch]').forEach(el => el.onclick = () => { IC.useDutch(s, +el.dataset.dutch); save(s); IC.board(); });
    b.querySelector('#ic-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-how').onclick = () => M.walk(ID, walkScreens(s)).then(IC.board);
  };
  function stopNow() { S.persist(); if (SD.today) SD.today.render(); }

  async function work(i) {
    const s = shift(), inc = s && s.board[i];
    if (!inc) return;
    const q = find(inc.q);
    if (!q) { s.board.splice(i, 1); save(s); return after(s); }
    const node = IC.nodeOf(q);
    const r = await M.ask(q, {
      title: TITLE, tally: s.tally, think: true, act: { label: `Apply a fix${node ? ' at ' + node.name : ''}`, icon: '🛠' },
      context: `Incident${node ? ' at ' + node.name : ''} · wave ${Math.min(s.wave, WAVES.length)} · ${plural(inc.clock, 'tick')} left${inc.tries ? ' · a new scenario of the same fault' : ''}`,
      progress: `Wave ${Math.min(s.wave, WAVES.length)}`, onStop: () => {}
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
      <div class="opts">${IC.PICKS.map(p => `<button class="opt ic-pick" data-pick="${p.id}"><b>${esc(p.who)}:</b> ${esc(p.what)}<br><span class="small"><i>"${esc(p.line)}"</i></span></button>`).join('')}</div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-pick]').forEach(el => el.onclick = () => { IC.applyPick(s, el.dataset.pick); s.phase = 'board'; save(s); IC.board(); });
  }

  // ---- 0% budget: retry the wave, or end the shift ----
  function zeroPanel(s) {
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(SAY.zero)}</p>
      ${hud(s)}
      <p>The error budget hit 0% in wave ${Math.min(s.wave, WAVES.length)}. Your answers so far are logged.</p>
      <div class="row"><button class="primary" id="ic-retry">Retry this wave</button><button class="ghost" id="ic-end">End the shift</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelector('#ic-retry').onclick = () => { IC.retryWave(s); save(s); IC.board(); };
    b.querySelector('#ic-end').onclick = () => { s.zero = true; end(s); };
  }

  // ---- The end of a shift ----
  function end(s) {
    const left = s.board.concat(s.carry).map(b => ({ q: b.q, other: b.other }));
    sv().icBacklog = left;
    s.phase = 'done'; s.left = left.length; s.board = []; s.carry = [];
    const st = sv().modes = sv().modes || {};
    st.icShifts = (st.icShifts | 0) + 1;
    s.paid = M.pay(ID);
    save(s);
    results(s);
  }
  // One thing to do differently (Extra Credits, "When Difficult Is Fun").
  function advice(s) {
    const t = s.tally, rate = c => (t[c] && t[c][1] ? t[c][0] / t[c][1] : null);
    const timeouts = s.log.reduce((a, l) => a + l.timeouts, 0);
    if (rate(2) !== null && t[2][1] >= 3 && rate(2) < 2 / 3) return 'Next shift: press Sure only when you\'d bet on it. Your Sure answers were right less than 2 times in 3, and each miss costs 3.';
    if (timeouts) return 'Next shift: work the lowest clock first. A page costs more budget than a slow answer.';
    if (rate(1) !== null && t[1][1] >= 3 && rate(1) >= 2 / 3) return 'Next shift: you were right on most Think so answers. Some of those were Sure.';
    if (rate(0) !== null && t[0][1] >= 3 && rate(0) >= 0.5) return 'Next shift: your guesses were right half the time or more. Say Think so on those.';
    return 'Next shift: keep it up, and read every line of the stem before you apply a fix.';
  }
  function results(s) {
    const right = s.log.filter(l => l.ok).length, n = [0, 1, 2].reduce((a, c) => a + (s.tally[c] || [0, 0])[1], 0);
    const sureMiss = (s.tally[2] || [0, 0])[1] - (s.tally[2] || [0, 0])[0];
    const topics = [...new Set(s.log.map(l => { const q = E().find(l.q); return q && q.topic ? String(q.topic).replace(/-/g, ' ') : null; }).filter(Boolean))];
    const clip = t => (t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, '') + '…' : t);
    const rows = s.log.map(l => {
      const q = E().find(l.q);
      if (!q) return '';
      return `<li><b>${l.ok ? '✓ Resolved' : '✗ Missed'}</b> <span class="muted small">${esc(nodeName(l.q))} · ${esc(String(q.topic || '').replace(/-/g, ' '))}${l.timeouts ? ' · ⏱ paged' : ''}${l.tries > 1 ? ` · ${l.tries} tries` : ''}</span><br><span class="small">${esc(clip(answerText(q)))}</span></li>`;
    }).join('');
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.zero ? SAY.zero : SAY.end)}</p>
      <p class="td-big">${right} of ${s.log.length} incidents resolved.</p>
      <p class="small">${s.zero ? 'The error budget hit 0%, so the shift ended early.' : `Error budget left: <b>${s.budget}%</b>.`} Points: <b>${M.sgn(s.pts)}</b> from ${plural(n, 'answer')}.${sureMiss ? ` ${sureMiss === 1 ? 'One Sure miss' : sureMiss + ' Sure misses'} went up on the Wall.` : ''}</p>
      <p class="small ic-advice"><b>${esc(advice(s))}</b></p>
      ${s.left ? `<p class="small">⏱ ${plural(s.left, 'incident')} still open ${s.left === 1 ? 'starts' : 'start'} your next shift.</p>` : ''}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      <p class="muted small">${s.verified} of the shift's incidents were verified against AWS docs.${s.topped ? ` ${s.topped} unchecked ones filled in, marked "Not verified yet".` : ''} Topics: ${esc(topics.join(', ') || 'none')}.</p>
      <details class="ic-log" open><summary class="q-ctx">Every incident's fix</summary><ul>${rows}</ul></details>
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="ic-again">New shift</button><button class="ghost" id="ic-done">Done</button></div>`, { title: TITLE, onClose: stopNow });
    M.pipWire(b, 'Incident Commander');
    b.querySelector('#ic-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-again').onclick = () => { IC.newShift(); IC.board(); };
  }

  // ---- First run ----
  function walkScreens(s) {
    const first = s && s.board[0], q = first && find(first.q), sp = q ? M.split(q) : null, node = q && IC.nodeOf(q);
    return [
      { title: 'An incident', html: `<p><b>Uptima:</b> "${esc(SAY.open)}"</p>
        <p>Each incident is a real exam question about a service on the request path. Here's one from tonight's first wave${node ? `, at ${esc(node.name)}` : ''}:</p>
        ${sp ? `<div class="md-eg"><p class="small"><b>${esc(sp.ask)}</b></p>${sp.qual ? `<p class="small">★ Asks for: <b>${esc(sp.qual)}</b></p>` : ''}</div>` : ''}
        <p class="small">Open it to read the whole question. The star line is the qualifier: MOST cost-effective and LEAST overhead pick different fixes.</p>` },
      { title: 'Apply a fix', html: `<p>Name the cause in your own words, then the fixes show. Apply one and say how sure you are:</p>
        ${M.stakeTable()}<p class="small">Right resolves it. Wrong: after the explanation, it stays open as the same fault in a new scenario, so you can try again straight away.</p>` },
      { title: 'Clocks and budget', html: `<p>Every answer ticks every other incident's clock by one (●●○ is two ticks left). The board waits while you read: there's no real-time clock.</p>
        <p>A clock at zero pages: ${TIMEOUT}% error budget, and the incident comes back next wave in a new disguise. A Sure miss costs ${SURE_MISS}%. Points come from the table, budget is just for surviving.</p>
        <p class="small">${WAVES.length} waves. It saves after every answer: stop any time.</p>` }
    ];
  }

  IC.start = async function () {
    let s = shift();
    if (!s || s.phase === 'done' || s.v !== 2) {
      s = IC.newShift();
      if (!s.board.length) { U.system(TITLE, 'No request-path questions on this exam yet.'); return; }
      await M.walkFirst(ID, walkScreens(s));
    }
    IC.board();
  };

  // ---- Simulator hook (tools/modes_sim.js): plays a whole shift on the real state machine, no UI, no saves ----
  // policy.route: 'near' works the lowest clock first, 'far' the highest; policy.pick: which between-wave pick.
  IC.sim = async function (policy, rng) {
    const s = IC.newShift({ sim: true, rng, picks: !!policy.picks });
    let map = 0, guard = 0;
    for (;;) {
      if (++guard > 200) break;
      if (s.phase === 'pick') { IC.applyPick(s, policy.pick || IC.PICKS[Math.floor(rng() * 3)].id, rng); map++; s.phase = 'board'; continue; }
      if (s.phase === 'zero') { s.zero = true; break; }
      if (s.phase === 'done' || !s.board.length) { const n = IC.next(s, rng); s.phase = n; if (n === 'done') break; continue; }
      const order = s.board.map((b, i) => [b.clock, i]).sort((a, b) => (policy.route === 'far' ? b[0] - a[0] : a[0] - b[0]));
      const inc = s.board[order[0][1]];
      map++;   // tapping the card
      const q = E().find(inc.q);
      const r = M.simAnswer(q, policy, rng);
      IC.settle(s, inc, r);
      s.phase = IC.next(s, rng);
      if (s.phase === 'done') break;
    }
    const qs = s.answers, secs = qs * M.SIM_Q_SECS + map * M.SIM_MAP_SECS;
    return { pts: s.pts, budget: s.budget, minutes: secs / 60, mapShare: (map * M.SIM_MAP_SECS) / secs, questions: qs, zero: !!s.zero, resolved: s.log.filter(l => l.ok).length };
  };

  M.register({
    id: ID, name: 'Incident Commander', minutes: '15 to 20', host: 'Uptima, the secondary pager',
    blurb: 'One on-call shift: 4 waves of incidents on the request path. The right answer is the fix.',
    start: IC.start, sim: IC.sim,
    status: () => { const s = shift(); return s && s.v === 2 && s.phase !== 'done' ? `Resume · wave ${Math.min(s.wave, WAVES.length)} of ${WAVES.length}, ${Math.max(0, s.budget)}% budget` : ''; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .ic-say { margin: 0 0 8px; }
    .ic-since { margin: 0 0 8px; padding: 6px 8px; border-left: 4px solid var(--ink, #222); overflow-wrap: anywhere; }
    .ic-hud { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 14px; }
    .ic-bar { margin: 4px 0 8px; }
    .ic-bar i { background: var(--mint, #5bc08a); }
    .ic-perks { margin: 0 0 6px; }
    .ic-board { display: flex; flex-direction: column; gap: 10px; }
    .ic-inc { display: flex; flex-direction: column; gap: 4px; }
    .ic-card { display: flex; flex-direction: column; align-items: stretch; gap: 4px; text-align: left; width: 100%; }
    .ic-top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
    .ic-sev { font-size: 13px; letter-spacing: .04em; }
    .ic-clock { letter-spacing: 2px; }
    .ic-sev-1 .ic-card { border-width: 3px; border-style: double; }
    .ic-sym { font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; }
    .ic-qual { font-size: 14px; }
    .ic-tags { overflow-wrap: anywhere; }
    .ic-dutch { min-height: 44px; }
    .ic-pick { text-align: left; }
    .ic-log ul { padding-left: 18px; margin: 4px 0; }
    .ic-log li { margin: 6px 0; overflow-wrap: anywhere; }`;
  document.head.appendChild(css);
})();
