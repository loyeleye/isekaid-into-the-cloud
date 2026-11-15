// Monster Hunt (game modes design doc, Mode 3, Nov 15): every poster on the Wall (js/today.js) is a monster on Bru's
// bounty board, and a 10-minute hunt tracks down 3 of them, oldest first and from different topics, with three
// encounters each:
//   Track        the question that put the poster up, typed before the options show (Type it first, js/recall.js)
//   Fight        its twin (js/qpick.js SD.qtwin data): the same rule in a scenario you haven't seen, verified first
//   Pin it down  "Why doesn't this fit here?": the twin's closest wrong option with three reasons to pick from. The
//                right one is that option's own "why not" line; the others are another of its question's lines and
//                one from a different question on the same topic. No new text: every line is already in the bank.
// Outcome uses the Wall's own rule (two different questions right, on two different days, T.wallNote):
//   Captured  the poster comes down and the monster goes into the bestiary
//   Wounded   right today but not yet two days: back tomorrow, weaker (Track is skipped)
//   Escaped   a miss: its rights reset, and it comes back on a later day with Fight on a different twin
// A monster hunted today never comes back the same day, so a retry is always spaced.
// Sightings: after a practice test, "Report a sighting" logs only the topic of each miss (a topic-drill preset). Each
// spawns a wild monster: an unseen bank question on that topic, Fight and Pin it down. A wild miss goes on the Wall.
// Stakes, the verified source block, calibration and the first-run walkthrough come from the shared modes shell
// (js/modes.js, SD.modes); until it loads, hunt.js uses its own copies of the same rules (see `shell` below).
// State: S.save.hunt (the hunt in progress, saved after every encounter), S.save.huntMon (per poster: last day
// hunted, wounded, twins already used), S.save.bestiary, S.save.sightings.
(function () {
  const H = SD.hunt = {};
  const S = SD.state, U = SD.ui, E = () => SD.exam, TD = () => SD.today;
  const esc = s => U.esc(s);
  const TITLE = 'MONSTER HUNT';
  H.SIZE = 3;
  const STEP_NAME = { track: 'Track', fight: 'Fight', pin: 'Pin it down' };
  const today = () => new Date().toDateString();
  const sv = () => S.save;
  const wall = () => (Array.isArray(sv().wall) ? sv().wall : (sv().wall = []));
  const mons = () => (sv().huntMon = sv().huntMon || {});
  const beasts = () => (Array.isArray(sv().bestiary) ? sv().bestiary : (sv().bestiary = []));
  const sightings = () => (Array.isArray(sv().sightings) ? sv().sightings : (sv().sightings = []));
  const shuffle = a => SD.quiz.shuffle(a);
  const rand = a => a[Math.floor(Math.random() * a.length)];
  const isoDay = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d).getTime(); };

  // ---- The shared shell (js/modes.js), or the same rules here until it lands ----
  const STAKES = [[1, 0], [2, -1], [3, -3]];
  const CONF = ['Guess', 'Think so', 'Sure'];
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
  const local = {
    STAKES,
    stake: (ok, conf) => (STAKES[conf] || STAKES[0])[ok ? 0 : 1],
    newTally: () => ({ 0: [0, 0], 1: [0, 0], 2: [0, 0] }),
    // Same as SD.modes.ask: the verified source block, stakes, calibration into opts.tally, the Wall's rule on every
    // answer (opts.poster names the poster), and a Sure miss on the Wall unless opts.noWall.
    ask: async function (q, opts) {
      const r = await SD.quiz.ask(q, Object.assign({ source: true, noSwap: true }, opts));
      if (r && !r.closed && !r.skipped) settleAnswer(q, r.ok, r.conf, opts, r);
      return r;
    },
    calibHtml: function (t) {
      const BE = ['best below 50% sure', 'best from 50% to 67% sure', 'best above 67% sure'];
      const rows = [0, 1, 2].map(c => {
        const x = t[c] || [0, 0];
        return `<li><b>${CONF[c]}:</b> ${x[1] ? `${x[0]} of ${x[1]} right, ${Math.round(x[0] / x[1] * 100)}%` : 'not used'}. <span class="muted">${BE[c]}.</span></li>`;
      }).join('');
      return `<div class="hn-calib"><p class="td-head">How sure you were</p><ul>${rows}</ul></div>`;
    },
    walkFirst: function (id, screens) {
      const seen = sv().walked = sv().walked || {};
      if (seen[id]) return Promise.resolve();
      return local.walk(id, screens);
    },
    walk: function (id, screens) {
      return new Promise(done => {
        let k = 0;
        const draw = () => {
          const s = screens[k], last = k === screens.length - 1;
          const b = U.panel(`${s.html}<p class="muted small hn-dots" aria-label="Screen ${k + 1} of ${screens.length}">${screens.map((x, i) => (i === k ? '●' : '○')).join(' ')}</p>
            <div class="row">${k ? '<button class="ghost" id="hn-wback">Back</button>' : ''}<button class="primary" id="hn-wnext">${last ? 'Start' : 'Next'}</button></div>`, { title: s.title || 'HOW TO PLAY', noClose: true });
          const bk = b.querySelector('#hn-wback'); if (bk) bk.onclick = () => { k--; draw(); };
          b.querySelector('#hn-wnext').onclick = () => {
            if (!last) { k++; return draw(); }
            (sv().walked = sv().walked || {})[id] = Date.now(); S.persist();
            U.closePanel(); done();
          };
        };
        draw();
      });
    }
  };
  // Pay: XP and shards once a day per mode, the same as Today's set, so no mode pays better than reviewing. Marked in
  // S.save.modes.paid[id], where js/modes.js marks it, so the two never pay twice.
  local.pay = function (id) {
    const m = sv().modes = sv().modes || {}, paid = m.paid = m.paid || {};
    if (paid[id] === today()) return '';
    paid[id] = today();
    if (SD.run && SD.run.gainXp) SD.run.gainXp(20); else S.addXp(20);
    sv().shards = (sv().shards | 0) + 5;
    S.persist();
    return '+20 XP · +5 shards';
  };
  const pay = id => (SD.modes && SD.modes.pay ? SD.modes.pay(id) : local.pay(id));
  const shell = () => (SD.modes && SD.modes.ask ? SD.modes : local);
  const stake = (ok, conf) => (SD.modes && SD.modes.stake ? SD.modes.stake(ok, conf) : local.stake(ok, conf));
  const stakesOf = () => (SD.modes && SD.modes.STAKES) || STAKES;
  const newTally = () => (SD.modes && SD.modes.newTally ? SD.modes.newTally() : local.newTally());
  const calibHtml = t => (SD.modes && SD.modes.calibHtml ? SD.modes.calibHtml(t) : local.calibHtml(t));
  // What an answer does after it's committed: stakes, calibration, the Wall. Used by the local shell, and by Stop
  // for now when an answer was committed but its Continue never tapped.
  function settleAnswer(q, ok, conf, opts, r) {
    const pts = stake(ok, conf);
    if (r) r.pts = pts;
    if (opts.tally) { const t = opts.tally[conf] || (opts.tally[conf] = [0, 0]); t[1]++; if (ok) t[0]++; }
    const T = TD();
    if (T && T.wallNote) T.wallNote(q.id, ok, opts.poster || null);
    if (T && T.wallAdd && !ok && conf === 2 && !opts.noWall) T.wallAdd(q.id);
    return pts;
  }

  // ---- Questions ----
  const find = id => E().find(id);
  const verified = q => !!(q && SD.topicDrill && SD.topicDrill.isVerified(q));
  const qlog = () => sv().qlog || {};
  const lastAsked = q => (qlog()[q.id] ? qlog()[q.id][0] : 0);
  // The concept a bank question records under (as on the Wall): its own, else its exam task's.
  function withConcept(q) {
    if (!q) return null;
    let c = q.c && SD.concepts[q.c] ? q.c : null;
    if (!c) { const t = E().taskOf(q); c = t ? E().taskConcept(String(t)) : null; }
    return c ? Object.assign({}, q, { c }) : null;
  }
  const mine = w => { const q = find(w.id); return !!q && !E().offTrack(q) && E().allowed(q); };
  const topicOf = q => String((q && q.topic) || 'idea');
  H.name = q => (TD() && TD().posterName ? TD().posterName(q) : topicOf(q).toUpperCase());
  // Fight: a twin of the poster's question that this monster hasn't been fought with, verified first, then the one
  // answered longest ago. Null when the idea has no twin (the Wall then needs only two right days).
  function pickTwin(id, avoid) {
    const ids = (SD.twins && SD.twins[id]) || [];
    const all = ids.map(find).filter(q => q && E().allowed(q) && q.type !== 'explain');
    if (!all.length) return null;
    const fresh = all.filter(q => !avoid.includes(q.id)), notLast = all.filter(q => q.id !== avoid[avoid.length - 1]);
    const list = fresh.length ? fresh : notLast.length ? notLast : all;
    const ver = list.filter(verified), from = ver.length ? ver : list;
    return from.slice().sort((a, b) => lastAsked(a) + Math.random() - lastAsked(b) - Math.random())[0];
  }
  // A wild monster: a bank question on the sighting's topic that has never been answered, verified first.
  function pickWild(pid, used) {
    const D = SD.topicDrill, p = D && D.preset(pid);
    if (!p) return null;
    const pool = D.pool(p).filter(q => !qlog()[q.id] && !used.has(q.id) && (q.type === 'mc' || q.type === 'multi'));
    if (!pool.length) return null;
    const ver = pool.filter(verified);
    return rand(ver.length ? ver : pool);
  }

  // ---- Pin it down ----
  // A question's look-alike wrong answer and its "why not" line. mc: the closest wrong option (SD.recall.closest);
  // multi: a wrong item that has a line.
  function wrongOf(q) {
    if (q.type === 'mc' && Array.isArray(q.no)) {
      const i = SD.recall ? SD.recall.closest(q.opts, q.a, k => !!q.no[k]) : q.no.findIndex(Boolean);
      return i >= 0 && q.no[i] ? { i, opt: q.opts[i], no: q.no[i], others: q.no.filter((n, k) => n && k !== i) } : null;
    }
    if (q.type === 'multi' && Array.isArray(q.items)) {
      const bad = q.items.map((it, k) => ({ it, k })).filter(x => !x.it.ok && x.it.no);
      if (!bad.length) return null;
      const w = rand(bad);
      return { i: w.k, opt: w.it.t, no: w.it.no, others: bad.filter(x => x !== w).map(x => x.it.no) };
    }
    return null;
  }
  // A "why not" line from a different question on the same topic, so the three reasons aren't all about one scenario.
  function decoyLine(q, not) {
    const bank = (SD.bank || []).filter(x => x.id !== q.id && x.topic === q.topic && E().allowed(x) && x.type === 'mc' && Array.isArray(x.no));
    const lines = [];
    bank.forEach(x => x.no.forEach(n => { if (n && !not.includes(n)) lines.push(n); }));
    return lines.length ? rand(lines) : null;
  }
  // { q: the question's id, opt, reasons: [3 lines], a: index of the right one } or null when there's nothing to pin.
  function buildPin(q) {
    const w = q && wrongOf(q);
    if (!w) return null;
    const pool = [w.no];
    const other = w.others.length ? rand(w.others) : null;
    if (other) pool.push(other);
    const dec = decoyLine(q, pool);
    if (dec) pool.push(dec);
    while (pool.length < 3 && w.others.length > pool.length - 1) { const x = w.others.find(n => !pool.includes(n)); if (!x) break; pool.push(x); }
    if (pool.length < 3) return null;
    const reasons = shuffle(pool.slice(0, 3));
    return { q: q.id, opt: w.opt, reasons, a: reasons.indexOf(w.no) };
  }

  // ---- The board ----
  // Up to 3 monsters from the Wall, oldest first and from different topics (a second one from the same topic only when
  // there aren't enough topics), never one hunted today. Fewer than 3: sightings fill the rest.
  H.board = function () {
    const day = today(), M = mons();
    const up = wall().filter(mine).filter(w => !(M[w.id] && M[w.id].last === day)).sort((a, b) => a.t - b.t);
    const picks = [], topics = new Set();
    up.forEach(w => { const t = topicOf(find(w.id)); if (picks.length < H.SIZE && !topics.has(t)) { picks.push(w); topics.add(t); } });
    up.forEach(w => { if (picks.length < H.SIZE && !picks.includes(w)) picks.push(w); });
    return picks;
  };
  H.wildOpen = () => sightings().filter(s => !s.done && H.sightingsOn());
  // Sightings stop after the last practice test: the last 3 days before the exam are review only.
  H.sightingsOn = function () {
    const ex = E().hasDate() ? isoDay(E().date()) : 0;
    return !ex || Date.now() < ex - 2 * 86400000 - 1;
  };
  function newHunt() {
    const M = mons(), list = [], used = new Set();
    H.board().forEach(w => {
      const q = find(w.id), m = M[w.id] || {};
      const tw = pickTwin(w.id, m.twins || []);
      const steps = [];
      if (!m.wounded) steps.push('track');
      if (tw) steps.push('fight');
      else if (m.wounded) steps.push('track');   // no twin: the question itself is the only one there is
      steps.push('pin');
      list.push({ id: w.id, name: H.name(q), steps, k: 0, qs: { track: w.id, fight: tw ? tw.id : null }, res: {}, pin: null, out: null, wounded: !!m.wounded });
      used.add(w.id); if (tw) used.add(tw.id);
    });
    H.wildOpen().forEach(s => {
      if (list.length >= H.SIZE) return;
      const q = pickWild(s.p, used);
      if (!q) { s.done = true; return; }
      used.add(q.id);
      const p = SD.topicDrill.preset(s.p);
      list.push({ wild: s.p, sid: s.t, id: null, name: 'WILD · ' + (p ? p.name.toUpperCase() : 'SIGHTING'), steps: ['fight', 'pin'], k: 0, qs: { fight: q.id }, res: {}, pin: null, out: null });
    });
    return (sv().hunt = { day: today(), mons: list, i: 0, pts: 0, right: 0, wrong: 0, sureMiss: 0, tally: newTally(), done: false });
  }
  H._newHunt = newHunt;   // for tools/hunt_check.js
  H.current = () => { const h = sv().hunt; return h && Array.isArray(h.mons) && !h.done && h.mons.length ? h : null; };
  // For the mode picker: where a hunt in progress stands.
  H.status = function () {
    const h = H.current();
    if (!h) return '';
    const m = h.mons[h.i];
    return m ? `Resume · monster ${h.i + 1} of ${h.mons.length}, ${STEP_NAME[m.steps[m.k]] || ''}` : '';
  };

  // ---- Bru's lines (barks never state a number; the joke lands on the wrong answer, never on a person) ----
  const BRU = {
    board: ['Every answer you got wrong is a bounty on my board. Nothing in the Cloud is ever really deleted: your misses have been living in the scrap field behind a delete marker, and they\'ve grown. Ay, no.',
      'I know where everyone in this camp is. Your misses too. Especially your misses.',
      'Bounties are up. I checked the scrap field myself. I don\'t trust a heartbeat I can\'t see.'],
    empty: 'The board is clear. ¡Qué milagro! Sure misses and mock misses go up on the Wall, and I\'ll pin them here.',
    captured: ['¡Mira! CAPTURED.', '¡Eso! Stamped and filed.', 'CAPTURED. Into the book it goes.'],
    wounded: ['It\'s limping. Back tomorrow, and it won\'t get far.', 'Wounded. I\'ll leave the scrap field gate open for it.'],
    escaped: ['EHHH?! It was right there! ...Fine. I\'ll walk the scrap field tonight and check the doors myself.', '¡Ay! It slipped the marker. It\'ll be back, and so will you.'],
    wildOk: '¡Bien! Driven off before it could put down roots.',
    wildBad: 'It got away into the scrap field. It\'s on the Wall now, with the others.'
  };
  const PIP = ['Pip: "Sorry to be a bother. Why did that work?"', 'Pip: "I wrote down nothing, because I have no notebook. You should, though."', 'Pip: "So it wasn\'t luck. I hate luck."'];

  // ---- Running a hunt ----
  let live = null, watcher = null;
  H.live = () => live;
  // The progress count and Stop for now in the quiz window's title bar, as Today's sets have.
  function bar() {
    if (!live || live.inAsk || document.querySelector('#panel #md-stop')) return;
    const h = document.querySelector('#panel .win .win-h');
    if (!h || h.querySelector('#hn-stop') || !document.querySelector('#panel .win[data-title="' + TITLE + '"]')) return;
    const x = sv().hunt, el = document.createElement('span');
    el.className = 'td-qbar';
    el.innerHTML = `<b class="td-prog">${Math.min(x.i + 1, x.mons.length)} / ${x.mons.length}</b><button class="td-stop" id="hn-stop">Stop for now</button>`;
    h.appendChild(el);
    el.querySelector('#hn-stop').onclick = H.stop;
  }
  function record(h, m, step, ok, conf, pts) {
    m.res[step] = { ok: ok ? 1 : 0, conf };
    h.pts += pts | 0;
    if (ok) h.right++; else h.wrong++;
    if (!ok && conf === 2) h.sureMiss++;
    m.k++;
    S.persist();
  }
  async function runStep(h, m, tok) {
    const step = m.steps[m.k];
    const ctx = `${m.name} · ${STEP_NAME[step]} · ${m.k + 1}/${m.steps.length}`;
    if (step === 'pin') {
      if (!m.pin) {
        const src = (m.qs.fight && find(m.qs.fight)) || find(m.qs.track);
        m.pin = buildPin(src) || { none: true };
        S.persist();
      }
      if (m.pin.none) { m.k++; S.persist(); return; }
      const r = await pinIt(m, ctx);
      if (!live || live.tok !== tok || !r) return;
      if (h.tally) { const t = h.tally[r.conf] || (h.tally[r.conf] = [0, 0]); t[1]++; if (r.ok) t[0]++; }
      record(h, m, 'pin', r.ok, r.conf, stake(r.ok, r.conf));
      return;
    }
    const q = withConcept(find(m.qs[step]));
    if (!q) { m.k++; S.persist(); return; }
    S.seeConcept(q.c);
    live.q = q; live.t0 = Date.now(); live.opts = { poster: m.id || null, tally: h.tally, noWall: !!m.id };
    // With the shared shell, its own Stop for now (opts.onStop) runs while a question is up; hunt.js's runs on Pin it
    // down, and on everything when the shell isn't loaded.
    const shared = !!(SD.modes && SD.modes.ask);
    live.inAsk = shared;
    // Clues (SD.modes.ask opts.clues): the stem's scenario as tap-to-open tiles, and which ones were open is logged.
    // Track keeps Type it first, which shows the whole stem before you write, so clues are for Fight.
    const clues = shared && SD.modes.split && step !== 'track' ? { clues: true, act: ACT[step] } : shared && SD.modes.split ? { act: ACT[step] } : {};
    const r = await shell().ask(q, Object.assign({ title: TITLE, context: ctx, typeFirst: step === 'track' || null, progress: `${h.i + 1} / ${h.mons.length}` },
      clues, shared ? { onStop: () => {} } : {}, live.opts));
    if (live) live.inAsk = false;
    if (!live || live.tok !== tok || !r || r.closed) return;
    if (r.stopped && !r.committed) return stopHunt();
    logClues(h, q, r);
    record(h, m, step, r.ok, r.conf, r.pts != null ? r.pts : stake(r.ok, r.conf));
    // A wild miss goes on the Wall at any confidence: a practice-test topic you just missed again is a real gap.
    if (m.wild && !r.ok && TD().wallAdd) TD().wallAdd(q.id);
    if (r.stopped) stopHunt();
  }
  function stopHunt() {
    live = null;
    U.closePanel();
    S.persist();
    if (TD()) TD().render();
  }
  // The monster's outcome once its encounters are done.
  function outcome(m) {
    const missed = ['track', 'fight'].some(s => m.res[s] && !m.res[s].ok);
    if (m.wild) return missed ? 'gotaway' : 'driven';
    if (!wall().some(w => w.id === m.id)) return 'captured';
    return missed ? 'escaped' : 'wounded';
  }
  function close(h, m) {
    m.out = outcome(m);
    const M = mons(), rec = m.id ? (M[m.id] = M[m.id] || {}) : null;
    if (rec) {
      rec.last = today();
      rec.wounded = m.out === 'wounded';
      // Escaped: its rights reset, as a miss on the Wall does, even if a later encounter today was right.
      if (m.out === 'escaped') { const w = wall().find(x => x.id === m.id); if (w) w.rights = []; }
      if (m.out === 'escaped' && m.qs.fight) rec.twins = (rec.twins || []).concat(m.qs.fight).slice(-6);
      if (m.out === 'captured') { delete M[m.id]; addBeast(m); }
    }
    if (m.wild) { const s = sightings().find(x => x.t === m.sid); if (s) s.done = true; }
    h.i++;
    S.persist();
    const line = m.out === 'captured' ? rand(BRU.captured) : m.out === 'wounded' ? rand(BRU.wounded) : m.out === 'escaped' ? rand(BRU.escaped) : m.out === 'driven' ? BRU.wildOk : BRU.wildBad;
    U.system(OUT[m.out][1].toUpperCase(), esc(line), m.out === 'captured' || m.out === 'driven' ? 'gold' : m.out === 'wounded' ? '' : 'red', 4000);
  }
  // Outcome labels: a word and a shape, never colour alone.
  const OUT = {
    captured: ['✓', 'Captured', 'The poster comes down. It\'s in the bestiary.'],
    wounded: ['◐', 'Wounded · back tomorrow', 'Right today. One more day and it\'s caught.'],
    escaped: ['↺', 'Escaped · back next hunt', 'A miss resets it. Next time it fights with a different twin.'],
    driven: ['✓', 'Driven off', 'A wild one from a practice test, answered right.'],
    gotaway: ['↺', 'Got away · now on the Wall', 'It\'s a poster now, and a monster on the next hunt.']
  };
  H.OUT = OUT;
  function addBeast(m) {
    const fq = m.qs.fight ? find(m.qs.fight) : null, tq = find(m.id);
    const rec = SD.topicDrill && (SD.topicDrill.record(fq) || SD.topicDrill.record(tq));
    beasts().push({ id: m.id, name: m.name, on: Date.now(), twin: m.qs.fight || null,
      lesson: m.pin && !m.pin.none ? { opt: m.pin.opt, no: m.pin.reasons[m.pin.a] } : null,
      era: rec && rec.era ? rec.era : null, why: '' });
  }
  async function run(h) {
    const tok = {};
    live = { tok, q: null };
    if (!watcher && window.MutationObserver) { watcher = new MutationObserver(bar); watcher.observe(document.querySelector('#panel'), { childList: true }); }
    while (h.i < h.mons.length) {
      const m = h.mons[h.i];
      if (m.k >= m.steps.length) { close(h, m); continue; }
      await runStep(h, m, tok);
      if (!live || live.tok !== tok) return;
    }
    h.done = true;
    live = null;
    S.persist();
    results(h);
  }
  // Stop for now: an answer already committed counts; the encounter in progress is asked again on resume.
  H.stop = function () {
    if (!live) return;
    const h = sv().hunt, m = h && h.mons[h.i], q = live.q, l = q && qlog()[q.id];
    if (m && q && l && l[0] >= live.t0 && m.steps[m.k] !== 'pin') {
      const hist = sv().concepts[q.c] && sv().concepts[q.c].hist.slice(-1)[0];
      const conf = hist && hist.t >= live.t0 ? hist.conf : 0, ok = !!l[1];
      const pts = settleAnswer(q, ok, conf, live.opts);   // the shell's ask never got to settle it
      record(h, m, m.steps[m.k], ok, conf, pts);
      if (m.wild && !ok && TD().wallAdd) TD().wallAdd(q.id);
    }
    stopHunt();
  };

  // Options as actions where you corner the monster (SD.modes.ask opts.act).
  const ACT = { track: { label: 'Set a trap on its trail', icon: '🪤' }, fight: { label: 'Make your move', icon: '⚔️' } };
  // Stealth evidence (design doc, Choice and exploration): which clues were open when each answer was committed, in
  // S.save.huntLog (the last 200), and a running count on the hunt for its results screen.
  function logClues(h, q, r) {
    const c = r && r.clues;
    if (!c || !c.total) return;
    const opened = (c.opened || []).slice();
    h.clues = h.clues || [0, 0]; h.clues[0] += opened.length; h.clues[1] += c.total;
    const log = Array.isArray(sv().huntLog) ? sv().huntLog : (sv().huntLog = []);
    log.push({ t: Date.now(), q: q.id, opened, total: c.total, ok: r.ok ? 1 : 0, conf: r.conf });
    if (log.length > 200) log.splice(0, log.length - 200);
  }
  H._logClues = logClues;   // for tools/hunt_check.js

  // Pin it down: the option, three reasons, then a confidence to commit. The verdict is one line plus the real reason.
  function pinIt(m, ctx) {
    const p = m.pin, q = find(p.q);
    return new Promise(done => {
      let pick = null;
      const T = stakesOf();
      const draw = () => {
        const h = `<div class="q-ctx">${esc(ctx)}</div>
          <p class="q-q hn-pinq">Why doesn't this fit here?</p>
          <blockquote class="hn-opt">${esc(p.opt)}</blockquote>
          ${q ? `<details class="q-recap"><summary><span class="qr-lbl">The scenario</span><span class="qr-peek">${esc(q.q)}</span></summary><div class="qr-body">${q.ev ? `<pre class="q-ev">${esc(q.ev)}</pre>` : ''}<p class="q-q">${esc(q.q)}</p></div></details>` : ''}
          <div class="opts">${p.reasons.map((r, i) => `<button class="opt${pick === i ? ' on' : ''}" data-pr="${i}" aria-pressed="${pick === i}">${esc(r)}</button>`).join('')}</div>
          <div class="conf"><span class="muted small">Commit your answer. How sure are you?</span><div class="conf-b">
          ${CONF.map((t, i) => `<button data-pc="${i}" ${pick == null ? 'disabled' : ''}>${t}<small class="stake"><span class="up">${sgn(T[i][0])}</span> / <span class="dn">${sgn(T[i][1])}</span></small></button>`).join('')}</div></div>`;
        const b = U.panel(h, { title: TITLE, noClose: true, cls: 'quiz' });
        b.querySelectorAll('[data-pr]').forEach(el => el.onclick = () => { pick = +el.dataset.pr; draw(); });
        b.querySelectorAll('[data-pc]').forEach(el => el.onclick = () => verdict(+el.dataset.pc));
      };
      const verdict = conf => {
        const ok = pick === p.a, pts = stake(ok, conf);
        if (SD.audio) SD.audio.sfx(ok ? 'right' : 'wrong');
        const b = U.panel(`<div class="verdict-row"><div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? 'PINNED IT!' : 'NOT QUITE!'}</div><span class="hn-pts">${sgn(pts)} pts</span></div>
          <p class="hn-oneline"><b>${esc(p.opt)}</b><br>${esc(p.reasons[p.a])}</p>
          <button class="primary" id="hn-pnext">Continue</button>`, { title: TITLE, noClose: true, cls: 'quiz', keepScroll: false });
        b.querySelector('#hn-pnext').onclick = () => { U.closePanel(); done({ ok, conf }); };
      };
      draw();
    });
  }

  // ---- Screens ----
  function results(h) {
    const rows = h.mons.map(m => {
      const o = OUT[m.out] || OUT.escaped;
      return `<li class="hn-res hn-${esc(m.out || 'escaped')}"><span class="hn-ico" aria-hidden="true">${o[0]}</span><span><b>${esc(m.name)}</b><br><span class="hn-out">${esc(o[1])}</span> <span class="muted small">${esc(o[2])}</span></span></li>`;
    }).join('');
    const caught = h.mons.filter(m => m.out === 'captured').length;
    const topics = [...new Set(h.mons.map(m => m.name.split(' · ')[0]))];
    const draft = SD.draft && SD.draft.scaffoldFor ? h.mons.filter(m => m.out === 'captured').map(m => SD.draft.scaffoldFor(m.id)).filter(Boolean) : [];
    if (h.paid == null) { h.paid = pay('hunt') || ''; S.persist(); }
    const b = U.panel(`<p class="td-big">${h.right} right · ${h.wrong} wrong · ${sgn(h.pts)} pts</p>
      ${h.clues && h.clues[1] ? `<p class="muted small">You opened ${h.clues[0]} of ${h.clues[1]} clues before acting.</p>` : ''}
      ${h.paid ? `<p class="small">${esc(h.paid)}</p>` : '<p class="muted small">Today\'s pay is already taken: extra practice, all learning.</p>'}
      <ul class="hn-results">${rows}</ul>
      ${draft.map(d => `<p class="small">That capture finishes ${esc(d.building)} in the Quarter.</p>`).join('')}
      ${h.sureMiss ? `<p class="small">${h.sureMiss === 1 ? 'One Sure miss' : 'Sure misses'} went back on the Wall: those come back first.</p>` : ''}
      <p class="muted small">Topics: ${topics.map(esc).join(', ')}.</p>
      ${calibHtml(h.tally)}
      ${caught ? '<p class="small"><button class="td-link" id="hn-tobook">Pip has a question about your new bestiary card</button></p>' : ''}
      <p class="hn-pip">${esc(caught ? PIP[0] : rand(PIP.slice(1)))}</p>
      <div class="row"><button class="ghost" id="hn-board">Bounty board</button><button class="primary" id="hn-done">Done</button></div>`, { title: TITLE, onClose: () => TD().render() });
    b.querySelector('#hn-done').onclick = () => { U.closePanel(); TD().render(); };
    b.querySelector('#hn-board').onclick = H.open;
    const tb = b.querySelector('#hn-tobook'); if (tb) tb.onclick = H.bestiary;
    TD().render();
  }
  const stepMarks = m => m.steps.map((s, k) => {
    const r = m.res && m.res[s], st = r ? (r.ok ? '✓' : '✗') : k === m.k ? '▸' : '○';
    return `<span class="hn-step${r ? (r.ok ? ' ok' : ' bad') : ''}">${st} ${STEP_NAME[s]}</span>`;
  }).join('<span aria-hidden="true"> · </span>');
  // Bru's bounty board: the hunt in progress, or the next one.
  H.open = function () {
    const cur = H.current();
    const list = cur ? cur.mons : null;
    let rows;
    if (list) rows = list;
    else {
      const M = mons();
      rows = H.board().map(w => { const m = M[w.id] || {}; const tw = pickTwin(w.id, m.twins || []); return { id: w.id, name: H.name(find(w.id)), steps: (m.wounded ? [] : ['track']).concat(tw ? ['fight'] : m.wounded ? ['track'] : []).concat('pin'), k: -1, res: {}, wounded: !!m.wounded }; });
      H.wildOpen().slice(0, Math.max(0, H.SIZE - rows.length)).forEach(s => { const p = SD.topicDrill.preset(s.p); rows.push({ wild: s.p, name: 'WILD · ' + (p ? p.name.toUpperCase() : 'SIGHTING'), steps: ['fight', 'pin'], k: -1, res: {} }); });
    }
    const first = !beasts().length && !(sv().walked && sv().walked.hunt);
    const items = rows.map((m, i) => `<li class="td-poster hn-mon"><span class="td-wanted">${m.wild ? 'SIGHTED' : 'BOUNTY'}</span><b class="td-pn">${esc(m.name)}</b>
      <span class="hn-track">${stepMarks(m)}</span>${m.wounded ? '<span class="muted small">◐ Wounded: Track skipped.</span>' : ''}${m.out ? `<span class="small"><b>${esc((OUT[m.out] || OUT.escaped)[1])}</b></span>` : ''}</li>`).join('');
    const hunted = wall().filter(mine).length - H.board().length;
    const go = cur ? `Resume · monster ${cur.i + 1} of ${cur.mons.length}` : rows.length ? `Start the hunt · ${rows.length} ${rows.length === 1 ? 'monster' : 'monsters'}` : '';
    const b = U.panel(`<p class="hn-kyu"><span class="hn-pin" aria-hidden="true">📌</span> Two copies. Test them. — K.</p>
      <p class="td-head">${esc(rows.length ? (first ? 'Each poster on your Wall is a monster. Get it right three ways to catch it.' : rand(BRU.board)) : BRU.empty)}</p>
      ${rows.length ? `<ul class="td-wall hn-board">${items}</ul>` : ''}
      ${!cur && hunted > 0 ? `<p class="muted small">${hunted === 1 ? 'One more monster rests' : 'More monsters rest'} until tomorrow: nothing comes back the same day it was hunted.</p>` : ''}
      ${go ? `<button class="primary td-main" id="hn-go">${esc(go)}</button>` : ''}
      <div class="td-links"><button class="td-link" id="hn-book">Bestiary (${beasts().length})</button>${H.sightingsOn() ? '<button class="td-link" id="hn-sight">Report a sighting</button>' : ''}<button class="td-link" id="hn-how">How to play</button>${rows.length ? '' : '<button class="td-link" id="hn-wall">The Wall</button>'}</div>`, { title: 'BRU\'S BOUNTY BOARD', onClose: () => TD().render() });
    const on = (id, f) => { const el = b.querySelector('#' + id); if (el) el.onclick = f; };
    on('hn-go', () => H.start());
    on('hn-book', H.bestiary);
    on('hn-sight', H.sightPanel);
    on('hn-how', () => (SD.modes && SD.modes.walk ? SD.modes.walk : local.walk)('hunt', walkScreens()).then(H.open));
    on('hn-wall', () => TD().wallPanel());
  };
  function walkScreens(m) {
    const q = m ? find(m.qs.track || m.qs.fight) : (H.board()[0] ? find(H.board()[0].id) : null);
    return [
      { title: 'MONSTER HUNT · 1 OF 3', html: `<p class="td-head">${esc(BRU.board[0])}</p>${q ? `<p class="small">Here's one of yours: <b>${esc(H.name(q))}</b>.</p><blockquote class="hn-opt small">${esc(q.q)}</blockquote>` : ''}<p class="small">Each poster on your Wall is a monster. Get it right three ways to catch it.</p>` },
      { title: 'MONSTER HUNT · 2 OF 3', html: `<ol class="hn-how"><li><b>Track.</b> The question that put it up. Type your answer before the options show.</li><li><b>Fight.</b> Its twin: the same rule in a scenario you haven't seen.</li><li><b>Pin it down.</b> Why doesn't the look-alike answer fit? Pick the real reason.</li></ol>` },
      { title: 'MONSTER HUNT · 3 OF 3', html: `<p class="small">Commit every answer with <b>Guess</b> (+1 / ±0), <b>Think so</b> (+2 / −1) or <b>Sure</b> (+3 / −3). Say how sure you really are: that's how you score most.</p>
        <ul class="hn-how"><li><b>✓ Captured:</b> right on two different questions, on two different days, as on the Wall. It goes in the bestiary.</li><li><b>◐ Wounded:</b> right today. Back tomorrow, weaker.</li><li><b>↺ Escaped:</b> a miss. It comes back on a later day with a different twin.</li></ul>
        <p class="muted small">Kyu's note on the board: "Two copies. Test them."</p>` }
    ];
  }
  H.start = async function () {
    U.closePanel();
    let h = H.current();
    if (!h) { h = newHunt(); S.persist(); }
    if (!h.mons.length) { sv().hunt = null; S.persist(); return H.open(); }
    await (SD.modes && SD.modes.walkFirst ? SD.modes.walkFirst : local.walkFirst)('hunt', walkScreens(h.mons[0]));
    run(h);
  };

  // ---- Bestiary ----
  H.bestiary = function () {
    const list = beasts().slice().reverse();
    const fmt = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const cards = list.map((c, k) => {
      const tw = c.twin ? find(c.twin) : null;
      return `<li class="hn-card"><span class="hn-stamp" aria-hidden="true">CAPTURED</span><b class="td-pn">${esc(c.name)}</b><span class="muted small">Caught ${esc(fmt(c.on))}</span>
        ${tw ? `<details class="td-orig"><summary>The twin you beat it with</summary><p class="small">${esc(tw.q)}</p></details>` : ''}
        ${c.lesson ? `<p class="small"><b>Why not:</b> ${esc(c.lesson.opt)}</p><p class="small hn-why">${esc(c.lesson.no)}</p>` : ''}
        ${c.era ? `<p class="small src-era"><b>Heads up:</b> ${esc(c.era)}</p>` : ''}
        <p class="small hn-pipq">Pip: "Sorry to be a bother. Why did that work?"</p>
        ${c.why ? `<p class="small hn-why">${esc(c.why)}</p>` : `<form class="tf-row hn-whyf" data-k="${list.length - 1 - k}"><label class="sr" for="hn-why-${k}">Your answer to Pip</label><input id="hn-why-${k}" type="text" maxlength="200" autocomplete="off" placeholder="One sentence, in your words."><button class="primary" type="submit">Save</button></form>`}</li>`;
    }).join('');
    const b = U.panel(list.length ? `<p class="td-head">What each mistake taught.</p><ul class="td-wall hn-book">${cards}</ul>`
      : '<p class="muted">No captures yet. A monster you catch on the hunt gets a card here: its idea, the twin you beat it with, and its "why not" lesson.</p>', { title: 'BESTIARY', onClose: () => TD().render() });
    b.querySelectorAll('.hn-whyf').forEach(f => f.onsubmit = e => {
      e.preventDefault();
      const v = f.querySelector('input').value.trim();
      if (!v) return;
      beasts()[+f.dataset.k].why = v;
      S.persist();
      H.bestiary();
    });
  };

  // ---- Sightings ----
  // Only the topic of each practice-test miss is logged, never its text. At most one sighting per topic per test.
  H.TESTS = ['Practice test #2', 'Practice test #3', 'Practice test #4', 'Another practice test'];
  H.sightPanel = function () {
    const D = SD.topicDrill;
    if (!D) return;
    const pr = sv().sightTest && H.TESTS.includes(sv().sightTest) ? sv().sightTest : H.TESTS[0];
    const logged = p => sightings().some(s => s.p === p && s.test === pr);
    const groups = [];
    D.presets().filter(p => p.group !== 'Domains' && p.group !== 'Packs').forEach(p => {
      if (D.counts(p).n < 3) return;
      let g = groups.find(x => x.name === p.group);
      if (!g) groups.push(g = { name: p.group, rows: [] });
      const on = logged(p.id);
      g.rows.push(`<button class="opt td-topic${on ? ' on' : ''}" data-sp="${esc(p.id)}" aria-pressed="${on}"><span class="td-dn">${on ? '✓ ' : ''}${esc(p.name)}</span></button>`);
    });
    const open = sightings().filter(s => !s.done).length;
    const b = U.panel(`<p class="td-head">Which topics did you miss? Tap each one. Only the topic is logged, never the question.</p>
      <label class="td-date"><span>Test</span><select id="hn-test">${H.TESTS.map(t => `<option ${t === pr ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <p class="muted small">${open ? `${open === 1 ? 'One wild monster is' : open + ' wild monsters are'} waiting for the next hunt.` : 'Each topic you tap spawns a wild monster: a question on it you\'ve never seen.'}</p>
      ${groups.map(g => `<p class="td-head td-grp">${esc(g.name)}</p><div class="opts">${g.rows.join('')}</div>`).join('')}
      <div class="row"><button class="primary" id="hn-sdone">Done</button></div>`, { title: 'REPORT A SIGHTING', onClose: H.open });
    b.querySelector('#hn-test').onchange = e => { sv().sightTest = e.target.value; S.persist(); H.sightPanel(); };
    b.querySelectorAll('[data-sp]').forEach(el => el.onclick = () => {
      const p = el.dataset.sp, k = sightings().findIndex(s => s.p === p && s.test === pr);
      if (k >= 0) { if (!sightings()[k].done) sightings().splice(k, 1); }
      else sightings().push({ p, test: pr, t: Date.now(), done: false });
      S.persist();
      H.sightPanel();
    });
    b.querySelector('#hn-sdone').onclick = H.open;
  };

  // ---- Home: the shared Play button's mode picker, or a link on the Today card until it lands ----
  H.MODE = { id: 'hunt', name: 'Monster Hunt', blurb: 'Catch 3 ideas from your Wall, three ways each.', minutes: 10, host: 'Bru', start: () => H.open(), status: () => H.status() };
  const reg = () => { if (!H.registered && SD.modes && SD.modes.register) { H.registered = true; SD.modes.register(H.MODE); } };   // flag first: register() re-renders the Today card, which calls reg again
  reg();
  document.addEventListener('DOMContentLoaded', reg);
  const T = TD();
  if (T && T.render) {
    const render = T.render;
    T.render = function () {
      render.apply(this, arguments);
      reg();
      if (H.registered) return;
      const links = document.querySelector('#today-card .td-links');
      if (!links || !document.querySelector('#td-wallb') || links.querySelector('#td-hunt')) return;
      const el = document.createElement('button');
      el.className = 'td-link'; el.id = 'td-hunt';
      el.textContent = H.current() ? 'Monster Hunt · resume' : 'Monster Hunt';
      el.onclick = H.open;
      links.appendChild(el);
    };
  }

  const css = document.createElement('style');
  css.textContent = `
    .hn-kyu { margin: 0 0 8px; padding: 6px 10px; background: #ffe97a; color: #2b2340; border: 2px solid #0c0a10; font: italic 700 15px/1.3 var(--f-body); transform: rotate(-.6deg); }
    .hn-track { display: flex; flex-wrap: wrap; gap: 2px 4px; font-size: 13px; font-weight: 700; }
    .hn-step.ok { text-decoration: underline; text-underline-offset: 3px; }
    .hn-step.bad { text-decoration: line-through; }
    .hn-opt { margin: 8px 0; padding: 8px 10px; border-left: 4px solid var(--ink); background: #f6f3fa; overflow-wrap: anywhere; }
    .hn-pinq { font-weight: 800; }
    .hn-pts { font: 700 14px var(--f-body); padding: 2px 8px; border: 2px solid currentColor; border-radius: 999px; }
    .hn-oneline { margin: 8px 0 12px; overflow-wrap: anywhere; }
    .hn-results { list-style: none; padding: 0; margin: 8px 0; display: grid; gap: 8px; }
    .hn-res { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 8px; background: #fff; }
    .hn-res.hn-escaped, .hn-res.hn-gotaway { border-style: dashed; }
    .hn-ico { font: 700 22px/1 var(--f-head); width: 26px; flex: none; text-align: center; }
    .hn-out { font-weight: 800; }
    .hn-calib ul, .hn-how { margin: 4px 0 8px; padding-left: 18px; font-size: 14px; }
    .hn-calib li, .hn-how li { margin: 3px 0; }
    .hn-pip { font-style: italic; }
    .hn-card { position: relative; display: grid; gap: 4px; padding-top: 30px !important; }
    .hn-card p { margin: 0; }
    .hn-stamp { position: absolute; top: 6px; left: 10px; font: 800 11px/1 var(--f-head); letter-spacing: .08em; padding: 3px 6px; border: 2px solid #8a1f1f; color: #8a1f1f; transform: rotate(6deg); }
    .hn-why { padding-left: 8px; border-left: 3px solid var(--ink); }
    .hn-whyf { margin-top: 4px; }
    .hn-dots { text-align: center; letter-spacing: .3em; }
    .hn-board .td-poster, .hn-book .td-poster { transform: none; }`;
  document.head.appendChild(css);
})();
