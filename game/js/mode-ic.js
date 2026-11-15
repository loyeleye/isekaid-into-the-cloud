// Incident Commander (design doc "Five game modes for exam prep", mode 2): one on-call shift of 5 waves on a pager
// board. Every incident is a bank question shown as its symptom (the stem's scenario sentences, with its MOST/LEAST
// qualifier), and the right answer is the fix. Aimed at Troubleshooting (the Troubleshooting pack, Domain 4), with
// about 1 in 4 incidents due from other topics (SD.modes.pick).
//   - Pick which incident to work: the one about to blow, or the one you're surest of. Say it first is on.
//   - Every answer advances every other open incident's clock by one tick. Time is counted in answers, never seconds.
//   - Right: resolved (Sure and right also pays budget). Wrong: it stays open as its twin when it has one (the same
//     cause, a scenario you haven't seen), else it's handed to the next wave. A clock at zero costs error budget and the
//     incident comes back next wave, so every question gets answered. Left over at the end: first thing next shift.
//   - Between waves, the config shop (Throttle Defense): standing fixes from the camp vendors, each with its real
//     trade-off, each bought by answering a verified question on that feature. A fix adds 2 ticks to the first
//     incident it matches in each later wave.
//   - Saves after every incident (S.save.ic). Host: Uptima, the secondary pager (Story review: Kyu held the pager).
(function () {
  if (!SD.modes) return;
  const M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam, D = () => SD.topicDrill;
  const esc = s => U.esc(s);
  const ID = 'ic', TITLE = 'INCIDENT COMMANDER', PRESET = 'pack-trouble';
  const WAVES = [2, 3, 3, 3, 3];          // incidents landing in each wave: 14 in all
  const OVERTIME = 2;                     // extra waves after wave 5 for carried and still-waiting incidents; open ones wait for next shift
  const TIMEOUT = 20, SURE_MISS = 10, SURE_PAY = 5;   // error budget, in %
  const FIX_COST = 3, FIX_TICKS = 2;      // a fix costs 3 points and adds 2 ticks
  const IC = SD.ic = {};
  const sv = () => S.save;
  const shift = () => sv().ic || null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---- Uptima's lines (barks: no numbers, no AWS claims) ----
  const SAY = {
    open: 'Kyu held the Cloud\'s pager for ten thousand years. I\'m the secondary. Tonight it\'s yours. Wake me if the error budget hits zero. Don\'t wake me.',
    wave: [null, 'Wave two. I\'m asleep. This is a recording of me being asleep.',
      'Wave three. Halfway. Kyu did this every night. Every. Night.', 'Wave four. If anyone asks, I was supervising.', 'Last wave. Close these and the pager goes back in the drawer.'],
    overtime: 'Overtime. The ones that got away came back. They always come back.',
    sureRight: 'Resolved, and you were Sure. I\'m writing that in the postmortem. In gold.',
    right: 'Resolved. One less red light. I like fewer red lights.',
    wrong: 'Still open. Read the stem again. The stem is always telling on someone.',
    sureMiss: 'You were Sure. I was Sure once. I was a goddess. Look at me now.',
    timeout: 'That one paged twice. It goes to the next wave. They always come back.',
    shop: 'Between waves. The vendors are awake, which is more than I can say for me.',
    zero: 'I am risen! Thy goddess is... oh. Oh no. Kyu never woke me. Not once in ten thousand years.',
    end: 'Shift over. Hand me the pager. ...Actually, keep it till morning.'
  };

  // ---- Fixes (the config shop). Trade-offs as the AWS docs state them; no numbers. ----
  const answerText = q => (q.type === 'mc' ? q.opts[q.a] : (q.items || []).filter(i => i.ok).map(i => i.t).join(' '));
  const stemText = q => [q.q].concat(q.opts || [], (q.items || []).map(i => i.t)).join(' ');
  IC.FIXES = [
    { id: 'rc', name: 'Reserved concurrency', vendor: 'Kai', line: 'Six burners. Nobody else gets them. And I never light a seventh.',
      trade: 'Guarantees a function that much concurrency and also caps it there, so above the cap it throttles.',
      hits: q => /concurren|throttl|\b429\b|TooManyRequests/i.test(q.q), about: q => /reserved concurrency/i.test(answerText(q)) },
    { id: 'apic', name: 'API Gateway cache', vendor: 'Wen', line: 'A lunch box is a cache, dear.',
      trade: 'Caches responses for REST APIs only; HTTP APIs have no cache. Repeated requests skip the backend until the entry expires.',
      hits: q => /API Gateway/i.test(q.q) && /latenc|slow|backend|repeat|cach/i.test(q.q), about: q => /cach/i.test(answerText(q)) && /API Gateway|stage/i.test(answerText(q) + ' ' + q.q) },
    { id: 'dax', name: 'DAX', vendor: 'Wen', line: 'The bowls people ask for most, I keep by the door. Ask for one fresh from the pot and you still wait for the pot.',
      trade: 'Speeds up eventually consistent reads. Strongly consistent reads and writes go through to DynamoDB, no faster.',
      hits: q => /DynamoDB/.test(q.q) && /read|latenc|hot|throttl/i.test(q.q), about: q => /\bDAX\b/.test(answerText(q)) },
    { id: 'sqs', name: 'SQS buffer', vendor: 'Coo', line: 'Coo. Every letter held until a clerk is free. Delivered at least once. Repeats are your concern.',
      trade: 'A queue holds a burst until consumers are free. Standard queues deliver at least once, so consumers must handle repeats.',
      hits: q => /spike|burst|overwhelm|\bSQS\b|queue|asynchron/i.test(q.q), about: q => /\bSQS\b|queue/i.test(answerText(q)) && /spike|burst|buffer|decouple|absorb|overwhelm|peak|backlog|at least once|duplicate|idempoten/i.test(q.q + ' ' + answerText(q)) },
    { id: 'back', name: 'Retries with backoff', vendor: 'Doug', line: 'Kevin waits. Then he waits longer. Then longer again, a bit random. It\'s very boring. Nothing falls over.',
      trade: 'Spaces out retries, with random jitter, so clients don\'t retry in lockstep. It doesn\'t raise any limit.',
      hits: q => /throttl|retr|\b429\b|\b503\b|ThrottlingException|ProvisionedThroughputExceeded|backoff/i.test(q.q), about: q => /backoff|jitter/i.test(answerText(q)) }
  ];
  const fix = id => IC.FIXES.find(f => f.id === id);
  // The verified questions a fix can be bought with (Rule 1: verified only; no verified question, no fix yet).
  IC.fixQuestions = f => D().base().filter(q => (q.type === 'mc' || q.type === 'multi') && D().isVerified(q) && f.about(q));
  IC.shopOpen = () => !!(SD.verified && Object.keys(SD.verified).length) && IC.FIXES.some(f => IC.fixQuestions(f).length);

  // ---- The incident card: the question line and its qualifier; the scenario is clues (SD.modes.split) ----
  IC.CLUES = ['Logs', 'Metrics', 'Traces', 'Config'];
  IC.split = q => M.split(q, IC.CLUES);
  const find = id => (SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : E().find(id));
  const rollClock = () => 3 + Math.floor(Math.random() * 3);

  // ---- A shift ----
  function newShift() {
    const back = (sv().icBacklog || []).filter(it => E().find(it.q)).slice(0, 6);
    const want = WAVES.reduce((a, b) => a + b, 0) - back.length;
    const r = M.pick({ preset: PRESET, n: Math.max(0, want), avoid: back.map(it => it.q) });
    sv().icBacklog = [];
    const s = sv().ic = {
      v: 1, t: Date.now(), wave: 0, phase: 'board', budget: 100, pts: 0, tally: M.newTally(),
      queue: back.map(it => ({ q: it.q, other: it.other | 0, back: 1 })).concat(r.items.map(it => ({ q: it.q, other: it.other }))),
      board: [], carry: [], log: [], fixes: [], shopAt: 0, bought: 0, verified: r.verified, topped: r.topped, msg: ''
    };
    landWave(s);
    S.persist();
    return s;
  }
  const lastWave = s => s.wave >= WAVES.length + OVERTIME || (s.wave >= WAVES.length && !s.carry.length && !s.queue.length);
  function landWave(s) {
    s.wave++;
    // Carried incidents land first, so a wave with carries brings fewer new ones; overtime lands what's still waiting.
    const size = s.wave <= WAVES.length ? WAVES[s.wave - 1] : 3;
    const take = s.carry.splice(0);
    while (take.length < size && s.queue.length) take.push(s.queue.shift());
    s.board = take.map(it => ({ q: it.q, orig: it.orig || it.q, other: it.other | 0, back: it.back | 0, clock: rollClock(), max: 0, tries: it.tries | 0, timeouts: it.timeouts | 0, fix: '' }));
    // Each fix bought adds ticks to the first incident it matches in each later wave.
    s.fixes.forEach(fid => {
      const f = fix(fid), inc = f && s.board.find(b => !b.fix && f.hits(E().find(b.q) || {}));
      if (inc) { inc.clock += FIX_TICKS; inc.fix = fid; }
    });
    s.board.forEach(b => { b.max = b.clock; });
    s.msg = s.wave <= WAVES.length ? SAY.wave[s.wave - 1] || SAY.open : SAY.overtime;
  }
  const logOf = (s, b) => {
    let l = s.log.find(x => x.orig === b.orig);
    if (!l) s.log.push(l = { orig: b.orig, q: b.q, ok: 0, tries: 0, timeouts: 0, other: b.other });
    return l;
  };

  // ---- The board ----
  const sev = c => (c <= 1 ? ['🔥', 'SEV-1'] : c === 2 ? ['⚠', 'SEV-2'] : ['ⓘ', 'SEV-3']);
  function cardHtml(b, i) {
    const q = find(b.q);
    if (!q) return '';
    const sp = IC.split(q), [ic, lv] = sev(b.clock);
    const pips = Array.from({ length: Math.max(b.max, b.clock) }, (_, k) => (k < b.clock ? '●' : '○')).join('');
    const topic = String(q.topic || '').replace(/-/g, ' ').toUpperCase();
    const f = b.fix && fix(b.fix);
    return `<button class="opt ic-card ic-${lv.toLowerCase()}" data-inc="${i}" aria-label="Incident ${i + 1}, ${lv}, ${plural(b.clock, 'tick')} left">
      <span class="ic-top"><b class="ic-sev">${ic} ${lv}</b><span class="ic-clock" aria-hidden="true">${pips}</span><span class="small"><b>${plural(b.clock, 'tick')} left</b></span></span>
      <span class="ic-sym">${esc(sp.ask)}</span>
      ${sp.items.length ? `<span class="small ic-cl">🔎 ${plural(sp.items.length, 'clue')} to read: ${esc(sp.items.map(c => c.label).join(', '))}</span>` : ''}
      ${sp.qual ? `<span class="ic-qual">★ Asks for: <b>${esc(sp.qual)}</b></span>` : ''}${sp.pick ? `<span class="ic-qual">☰ ${esc(sp.pick)}</span>` : ''}
      <span class="muted small ic-tags">${esc(topic || 'INCIDENT')}${b.other ? ' · from another topic' : ''}${b.back ? ' · back from last shift' : ''}${b.tries ? ` · ✗ ${b.tries === 1 ? 'one failed fix' : plural(b.tries, 'failed fix')}` : ''}${b.timeouts ? ' · ⏱ paged before' : ''}${f ? ` · 🛠 ${esc(f.name)} +${FIX_TICKS}` : ''}</span></button>`;
  }
  function budgetHtml(s) {
    const b = Math.max(0, s.budget);
    return `<div class="ic-hud"><span><b>Wave ${Math.min(s.wave, WAVES.length)}${s.wave > WAVES.length ? ' · overtime' : ''}</b> of ${WAVES.length}</span>
      <span>Error budget <b>${b}%</b></span><span>Points <b>${M.sgn(s.pts)}</b></span></div>
      <div class="bar ic-bar" role="img" aria-label="Error budget ${b}%"><i style="width:${b}%"></i></div>`;
  }
  IC.board = function () {
    const s = shift();
    if (!s) return;
    if (s.phase === 'shop') return shopPanel(s);
    if (s.phase === 'done') return results(s);
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.msg || SAY.open)}</p>
      ${budgetHtml(s)}
      <p class="small">Pick an incident to work. Every answer ticks the others' clocks.</p>
      <div class="opts ic-board">${s.board.map(cardHtml).join('')}</div>
      <div class="row"><button class="ghost" id="ic-how">How to play</button><button class="ghost" id="ic-stop">Stop for now</button></div>`, { title: TITLE, onClose: stopNow });
    b.querySelectorAll('[data-inc]').forEach(el => el.onclick = () => work(+el.dataset.inc));
    b.querySelector('#ic-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-how').onclick = () => M.walk(ID, walkScreens(s)).then(IC.board);
  };
  function stopNow() { S.persist(); if (SD.today) SD.today.render(); }

  async function work(i) {
    const s = shift(), inc = s && s.board[i];
    if (!inc) return;
    const q = find(inc.q);
    if (!q) { s.board.splice(i, 1); S.persist(); return after(s); }
    const sp = IC.split(q);
    const r = await M.ask(q, {
      title: TITLE, tally: s.tally, clues: true, clueLabels: IC.CLUES, act: { label: 'Apply a fix', icon: '🛠' },
      context: `Incident · wave ${Math.min(s.wave, WAVES.length)} · ${plural(inc.clock, 'tick')} left${sp.qual ? ' · asks for ' + sp.qual : ''}`,
      progress: `Wave ${Math.min(s.wave, WAVES.length)}`, onStop: () => {}
    });
    if (r.stopped && !r.committed) return stopNow();
    if (r.closed) return IC.board();
    settle(s, inc, r);
    if (r.stopped) return stopNow();
    after(s);
  }
  function settle(s, inc, r) {
    const l = logOf(s, inc), conf = [0, 1, 2].includes(r.conf) ? r.conf : 0;
    s.pts += r.pts || 0;
    l.tries++; l.q = inc.q;
    // Evidence from play (stealth assessment): how much of the scenario was read before each fix.
    if (r.clues) (l.ev = l.ev || []).push([r.clues.opened.length, r.clues.total, r.ok ? 1 : 0]);
    const idx = s.board.indexOf(inc);
    if (r.ok) {
      l.ok = 1;
      s.board.splice(idx, 1);
      if (conf === 2) s.budget = Math.min(100, s.budget + SURE_PAY);
      s.msg = conf === 2 ? SAY.sureRight : SAY.right;
    } else {
      inc.tries++;
      if (conf === 2) { s.budget -= SURE_MISS; s.msg = SAY.sureMiss; } else s.msg = SAY.wrong;
      // The same cause in a scenario you haven't seen stays on the board; without a twin it goes to the next wave.
      const orig = E().find(inc.orig), used = s.log.map(x => x.q).concat(s.board.map(x => x.q), s.queue.map(x => x.q));
      const tw = orig && SD.qtwin ? SD.qtwin(orig, { avoid: used.concat(inc.q) }) : null;
      if (tw) inc.q = tw.id;
      else { s.board.splice(idx, 1); s.carry.push({ q: inc.q, orig: inc.orig, other: inc.other, tries: inc.tries, timeouts: inc.timeouts }); }
    }
    // Every answer ticks every other open incident.
    s.board.filter(b => b !== inc).forEach(b => { b.clock--; });
    const out = s.board.filter(b => b.clock <= 0);
    out.forEach(b => {
      s.budget -= TIMEOUT; b.timeouts++;
      logOf(s, b).timeouts++;
      s.board.splice(s.board.indexOf(b), 1);
      s.carry.push({ q: b.q, orig: b.orig, other: b.other, tries: b.tries, timeouts: b.timeouts });
    });
    if (out.length) { s.msg = SAY.timeout; U.system('PAGED', `${out.length === 1 ? 'An incident' : plural(out.length, 'incident')} timed out: −${TIMEOUT * out.length}% error budget. ${out.length === 1 ? 'It comes' : 'They come'} back next wave.`, 'red'); }
    s.budget = Math.max(0, s.budget);
    S.persist();
  }
  function after(s) {
    if (s.budget <= 0) return end(s, true);
    if (s.board.length) return IC.board();
    if (lastWave(s)) return end(s, false);
    // Between waves: the shop, once per break, after waves 1 to 4.
    if (s.wave < WAVES.length && IC.shopOpen() && s.shopAt < s.wave) { s.phase = 'shop'; S.persist(); return shopPanel(s); }
    landWave(s); S.persist();
    IC.board();
  }

  // ---- The config shop ----
  // A fix's verified questions not already in tonight's shift, longest unasked first.
  function shopQs(s, f) {
    const asked = new Set(s.log.map(x => x.q).concat(s.queue.map(x => x.q), s.board.map(x => x.q), s.carry.map(x => x.q), s.shopQs || []));
    const log = sv().qlog || {};
    return IC.fixQuestions(f).filter(q => !asked.has(q.id)).sort((a, b) => (log[a.id] ? log[a.id][0] : 0) - (log[b.id] ? log[b.id][0] : 0));
  }
  function shopPanel(s) {
    const rows = IC.FIXES.map(f => {
      const owned = s.fixes.includes(f.id), all = IC.fixQuestions(f).length, n = shopQs(s, f).length;
      const why = owned ? '✓ Installed' : !all ? 'Closed: no verified question on it yet' : !n ? 'Closed tonight: its verified questions are already on your shift' : s.pts < FIX_COST ? `Needs ${FIX_COST} points` : `Answer one verified question · ${FIX_COST} points`;
      const can = !owned && n && s.pts >= FIX_COST;
      return `<div class="ic-fix${owned ? ' on' : ''}"><p><b>${esc(f.name)}</b> <span class="muted small">from ${esc(f.vendor)}</span></p>
        <p class="small"><i>${esc(f.vendor)}: "${esc(f.line)}"</i></p>
        <p class="small"><b>Trade-off:</b> ${esc(f.trade)}</p>
        ${can ? `<button class="primary" data-fix="${f.id}">Buy · ${esc(why)}</button>` : `<p class="small ic-fs"><b>${esc(why)}</b></p>`}</div>`;
    }).join('');
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(SAY.shop)}</p>
      ${budgetHtml(s)}
      <p class="small">One fix per break. A fix adds ${FIX_TICKS} ticks to the first incident it matches in each later wave. You buy it by answering a verified question on it: right installs it for ${FIX_COST} points, wrong costs nothing extra.</p>
      ${rows}
      <div class="row"><button class="ghost" id="ic-skip">Back on call</button></div>`, { title: 'CONFIG SHOP', onClose: stopNow });
    b.querySelector('#ic-skip').onclick = () => leaveShop(s);
    b.querySelectorAll('[data-fix]').forEach(el => el.onclick = () => buy(s, fix(el.dataset.fix)));
  }
  function leaveShop(s) { s.shopAt = s.wave; s.phase = 'board'; landWave(s); S.persist(); IC.board(); }
  async function buy(s, f) {
    const list = shopQs(s, f), q = list[0] && find(list[0].id);
    if (!q) return shopPanel(s);
    const r = await M.ask(q, { title: 'CONFIG SHOP', tally: s.tally, context: `${f.name}, from ${f.vendor}`, progress: 'Shop', onStop: () => {} });
    if (r.stopped && !r.committed) return stopNow();
    s.shopQs = (s.shopQs || []).concat(q.id);
    s.pts += r.pts || 0;
    if (r.ok) { s.pts -= FIX_COST; s.fixes.push(f.id); U.system('FIX INSTALLED', `${esc(f.name)}: +${FIX_TICKS} ticks on the first matching incident in each later wave.`, 'gold'); }
    else U.system('NOT INSTALLED', `${esc(f.vendor)} keeps the ${esc(f.name)} for now. Read why, then try another break.`);
    s.bought++;
    s.shopAt = s.wave; s.phase = 'board';
    landWave(s);
    S.persist();
    if (r.stopped) return stopNow();
    IC.board();
  }

  // ---- The end of a shift ----
  function end(s, zero) {
    const left = s.board.concat(s.carry).map(b => ({ q: b.q, other: b.other }));
    sv().icBacklog = left;
    s.phase = 'done'; s.zero = !!zero; s.left = left.length; s.board = []; s.carry = [];
    s.paid = M.pay(ID);
    S.persist();
    results(s);
  }
  function results(s) {
    const right = s.log.filter(l => l.ok).length, sure = [0, 1, 2].reduce((a, c) => a + (s.tally[c] || [0, 0])[1], 0);
    const sureMiss = (s.tally[2] || [0, 0])[1] - (s.tally[2] || [0, 0])[0];
    const topics = [...new Set(s.log.map(l => { const q = E().find(l.q); return q && q.topic ? String(q.topic).replace(/-/g, ' ') : null; }).filter(Boolean))];
    const clip = t => (t.length > 120 ? t.slice(0, 118).replace(/\s+\S*$/, '') + '…' : t);
    const rows = s.log.map(l => {
      const q = E().find(l.q);
      if (!q) return '';
      return `<li><b>${l.ok ? '✓ Resolved' : '✗ Still open'}</b> <span class="muted small">${esc(String(q.topic || '').replace(/-/g, ' '))}${l.timeouts ? ' · ⏱ timed out' : ''}${l.tries > 1 ? ` · ${l.tries} tries` : ''}</span><br><span class="small">${esc(clip(answerText(q)))}</span></li>`;
    }).join('');
    const b = U.panel(`<p class="ic-say"><b>Uptima:</b> ${esc(s.zero ? SAY.zero : SAY.end)}</p>
      <p class="td-big">${right} of ${s.log.length} incidents resolved.</p>
      <p class="small">${s.zero ? 'The error budget hit 0%, so the shift ended early.' : `Error budget left: <b>${s.budget}%</b>.`} Points: <b>${M.sgn(s.pts)}</b> from ${plural(sure, 'answer')}.${sureMiss ? ` ${sureMiss === 1 ? 'One Sure miss' : sureMiss + ' Sure misses'} went up on the Wall.` : ''}${s.fixes.length ? ` Fixes: ${s.fixes.map(id => esc(fix(id).name)).join(', ')}.` : ''}</p>
      ${s.left ? `<p class="small">⏱ ${plural(s.left, 'incident')} still open ${s.left === 1 ? 'starts' : 'start'} your next shift.</p>` : ''}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      <p class="muted small">${s.verified} of tonight's ${plural(s.log.length, 'incident')} were verified against AWS docs before the shift.${s.topped ? ` ${s.topped} unchecked ones filled in, marked "Not verified yet".` : ''} Topics: ${esc(topics.join(', ') || 'none')}.</p>
      <details class="ic-log" open><summary class="q-ctx">Every incident's fix</summary><ul>${rows}</ul></details>
      ${evidenceHtml(s)}
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="ic-again">New shift</button><button class="ghost" id="ic-done">Done</button></div>`, { title: TITLE, onClose: stopNow });
    M.pipWire(b, 'Incident Commander');
    b.querySelector('#ic-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#ic-again').onclick = () => { newShift(); IC.board(); };
  }

  // Investigate or act: fixes made after reading every clue against fixes made with clues still closed.
  function evidenceHtml(s) {
    const all = [].concat(...s.log.map(l => l.ev || [])).filter(e => e[1] > 0);
    if (!all.length) return '';
    const full = all.filter(e => e[0] >= e[1]), part = all.filter(e => e[0] < e[1]);
    const row = (name, l) => `<tr><th scope="row">${name}</th><td>${l.length ? `${l.filter(e => e[2]).length} of ${l.length} right` : 'none'}</td></tr>`;
    const opened = all.reduce((a, e) => a + e[0], 0), total = all.reduce((a, e) => a + e[1], 0);
    return `<div class="md-cal"><p class="td-head">Investigate or act</p>
      <table class="md-calt"><caption class="sr">Fixes by how many clues were open</caption><tbody>${row('🔎 Read every clue first', full)}${row('⚡ Fixed with clues closed', part)}</tbody></table>
      <p class="muted small">You opened ${opened} of ${total} clues before your fixes.</p></div>`;
  }

  // ---- First run ----
  function walkScreens(s) {
    const first = s && s.board[0], q = first && find(first.q), sp = q ? IC.split(q) : null;
    return [
      { title: 'An incident', html: `<p><b>Uptima:</b> "${esc(SAY.open)}"</p>
        <p>Each incident is a real exam question. The card shows what's being asked; the details are clues in its logs, metrics and traces. Here's one from tonight's first wave:</p>
        ${sp ? `<div class="md-eg"><p class="small"><b>${esc(sp.ask)}</b></p>${sp.qual ? `<p class="small">★ Asks for: <b>${esc(sp.qual)}</b></p>` : ''}${sp.items[0] ? `<p class="small">🔎 ${esc(sp.items[0].label)}: ${esc(sp.items[0].text)}</p>` : ''}</div>` : ''}
        <p class="small">The star line is the qualifier. MOST cost-effective and LEAST overhead pick different fixes, so it never hides.</p>` },
      { title: 'Work it', html: `<p>Tap a card. Open as many clues as you need, then apply a fix and say how sure you are:</p>
        ${M.stakeTable()}<p class="small">A right answer resolves it. A wrong one keeps it open as the same cause in a new scenario, or hands it to the next wave.</p>` },
      { title: 'Clocks and budget', html: `<p>Every answer ticks every other incident's clock (●●○ means 2 ticks left). There's no real-time clock.</p>
        <p>A clock at zero costs ${TIMEOUT}% error budget, and the incident comes back next wave. A Sure miss costs ${SURE_MISS}% more; Sure and right pays ${SURE_PAY}% back.</p>
        <p class="small">${WAVES.length} waves. Between waves, the config shop sells standing fixes, each bought with a verified question. It saves after every incident: stop any time.</p>` }
    ];
  }

  IC.start = async function () {
    let s = shift();
    if (!s || s.phase === 'done') {
      s = newShift();
      if (!s.board.length) { U.system(TITLE, 'No Troubleshooting questions on this exam yet.'); return; }
      await M.walkFirst(ID, walkScreens(s));
    }
    IC.board();
  };
  M.register({
    id: ID, name: 'Incident Commander', minutes: '15 to 20', host: 'Uptima, the secondary pager',
    blurb: 'One on-call shift: 5 waves of incidents on a pager board. The right answer is the fix. Troubleshooting first.',
    start: IC.start,
    status: () => { const s = shift(); return s && s.phase !== 'done' ? `Resume · wave ${Math.min(s.wave, WAVES.length)} of ${WAVES.length}, ${Math.max(0, s.budget)}% budget` : ''; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .ic-say { margin: 0 0 8px; }
    .ic-hud { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 14px; }
    .ic-bar { margin: 4px 0 8px; }
    .ic-bar i { background: var(--mint, #5bc08a); }
    .ic-card { display: flex; flex-direction: column; align-items: stretch; gap: 4px; text-align: left; }
    .ic-top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
    .ic-sev { font-size: 13px; letter-spacing: .04em; }
    .ic-clock { letter-spacing: 2px; }
    .ic-sev-1 { border-width: 3px; border-style: double; }
    .ic-sym { font-size: 14px; line-height: 1.35; overflow-wrap: anywhere; }
    .ic-qual { font-size: 14px; }
    .ic-cl { overflow-wrap: anywhere; }
    .ic-tags { overflow-wrap: anywhere; }
    .ic-fix { border: 2px solid var(--ink, #222); border-radius: 8px; padding: 8px 10px; margin: 8px 0; }
    .ic-fix.on { border-style: double; border-width: 4px; }
    .ic-fix p { margin: 2px 0; overflow-wrap: anywhere; }
    .ic-log ul { padding-left: 18px; margin: 4px 0; }
    .ic-log li { margin: 6px 0; overflow-wrap: anywhere; }`;
  document.head.appendChild(css);
})();
