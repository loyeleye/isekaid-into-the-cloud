// Game modes (Nov 15, design doc "Five game modes for exam prep"): the shared shell every mode builds on.
//   - One Play button on the Today card (js/today.js) opens the mode picker (SD.modes.open).
//   - One stake table for every mode (Rule 4): a right answer pays 1, 2 or 3 for Guess, Think so or Sure, a wrong one
//     costs 0, 1 or 3, and a Sure miss goes on the Wall. Guess pays best below 50% sure, Think so from 50% to 67% and
//     Sure above 67%, so always pressing Sure is not rewarded: honest confidence is the winning strategy.
//   - A first-run walkthrough (3 screens, a real question in the first) and a calibration readout for results screens,
//     with every state in words and icons, never colour alone.
//   - Question picking: a topic-drill preset (js/topic-drill.js), verified-only with its fallback, due and never-asked
//     first, and about 1 in 4 a due item from another topic (Rule 5).
//
// API (the modes in js/mode-*.js and the sibling threads' files use only this):
//   SD.modes.register({ id, name, blurb, minutes, host, start(opts), status() })   status(): an optional picker line
//   SD.modes.open()                       the picker; SD.modes.list() the registered modes
//   SD.modes.STAKES, SD.modes.stake(ok, conf)      [[right, wrong]] by conf (0 Guess, 1 Think so, 2 Sure); the delta
//   SD.modes.ask(q, opts)                 SD.quiz.ask plus: stakes on the buttons, the verified source block, calibration
//                                         into opts.tally, the Wall (a Sure miss goes up unless opts.noWall; opts.poster
//                                         names the poster an answer counts toward), Stop for now (opts.onStop), r.pts.
//                                         Same result shape as SD.quiz.ask: { ok, conf, ms, score, recall, closed }.
//                                         r.stopped when Stop for now was pressed before an answer was committed.
//   SD.modes.ask(q, { clues: true, clueLabels, onClue(i, clue), opened, clueCost, act: { label, icon } })   the stem as
//                                         tap-to-open clues (SD.modes.split) with r.clues = { opened, total, before },
//                                         and options shown as actions in the world
//   SD.modes.note(tally, ok, conf), SD.modes.sureMiss(qid)   for modes that judge answers themselves (per-slot drafts)
//   SD.modes.newTally(), SD.modes.calibHtml(tally)           the calibration readout
//   SD.modes.walkFirst(id, screens), SD.modes.walk(id, screens)   screens: [{ title, html }]; Promises
//   SD.modes.pay(id)                      XP and shards once a day per mode, the same as Today's set; returns the line
//   SD.modes.pick({ preset, n, verifiedOnly, mix, filter, avoid })   { items: [{ q, c, other, v }], verified, topped, avail }
//   SD.modes.pipHtml(), SD.modes.pipWire(panelBody, topic)   Pip's "Why did that work?" line for a results screen
//                                         (Story review), saved to S.save.pipNotes
(function () {
  const M = SD.modes = {};
  const U = SD.ui, S = SD.state;
  const esc = s => U.esc(s);
  const sv = () => S.save;
  const modes = [];

  M.STAKES = [[1, 0], [2, -1], [3, -3]];
  M.CONF = ['Guess', 'Think so', 'Sure'];
  M.STAKE_HELP = 'Guess ✓+1 ✗0 · Think so ✓+2 ✗−1 · Sure ✓+3 ✗−3. Sure only pays when you\'d be right more than 2 times in 3.';
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
  M.sgn = sgn;
  M.stake = (ok, conf) => (M.STAKES[conf] || M.STAKES[0])[ok ? 0 : 1];

  // ---- Registry and picker ----
  M.register = function (def) {
    if (!def || !def.id || typeof def.start !== 'function') return;
    const i = modes.findIndex(m => m.id === def.id);
    if (i >= 0) modes[i] = def; else modes.push(def);
    if (SD.today && SD.today.render) SD.today.render();
  };
  M.list = () => modes.slice();
  M.get = id => modes.find(m => m.id === id) || null;
  const store = () => (sv().modes = sv().modes || { seen: {}, cal: M.newTally() });

  M.open = function () {
    const rows = modes.map(m => {
      let st = '';
      try { st = m.status ? m.status() || '' : ''; } catch (e) { st = ''; }
      return `<button class="opt md-mode" data-mode="${esc(m.id)}"><span class="md-n">${esc(m.name)}</span>
        ${m.blurb ? `<span class="small">${esc(m.blurb)}</span>` : ''}
        <span class="muted small">${[m.minutes ? `About ${esc(m.minutes)} minutes` : '', m.host ? `Host: ${esc(m.host)}` : ''].filter(Boolean).join(' · ')}</span>
        ${st ? `<span class="small md-st">▶ ${esc(st)}</span>` : ''}</button>`;
    }).join('');
    const b = U.panel(`<p class="td-head">Every answer is the move. Say how sure you are: it sets the stakes.</p>
      ${stakeTable()}
      <div class="opts">${rows || '<p class="muted">No game modes yet.</p>'}</div>
      ${calibAll()}`, { title: 'PLAY', onClose: () => SD.today && SD.today.render() });
    b.querySelectorAll('[data-mode]').forEach(el => el.onclick = () => {
      const m = M.get(el.dataset.mode);
      U.closePanel();
      if (m) m.start({});
    });
  };
  function stakeTable() {
    return `<table class="md-stakes"><caption class="sr">Points for each answer</caption>
      <thead><tr><th scope="col">You say</th><th scope="col">✓ Right</th><th scope="col">✗ Wrong</th></tr></thead>
      <tbody>${M.CONF.map((c, i) => `<tr><th scope="row">${c}</th><td>${sgn(M.STAKES[i][0])}</td><td>${sgn(M.STAKES[i][1])}${i === 2 ? ' and the Wall' : ''}</td></tr>`).join('')}</tbody></table>`;
  }
  M.stakeTable = stakeTable;

  // ---- Calibration ----
  M.newTally = () => ({ 0: [0, 0], 1: [0, 0], 2: [0, 0] });
  M.note = function (t, ok, conf) {
    const c = [0, 1, 2].includes(conf) ? conf : 0;
    [t, store().cal].forEach(x => { if (!x) return; x[c] = x[c] || [0, 0]; x[c][1]++; if (ok) x[c][0]++; });
  };
  M.sureMiss = qid => { if (SD.today && SD.today.wallAdd) SD.today.wallAdd(qid); S.persist(); };
  M.points = t => [0, 1, 2].reduce((a, c) => a + (t[c] ? t[c][0] * M.STAKES[c][0] + (t[c][1] - t[c][0]) * M.STAKES[c][1] : 0), 0);
  // Each button: how often it was right, against the range where it pays best.
  const BAND = [[0, 0.5], [0.5, 2 / 3], [2 / 3, 1.01]];
  M.calibHtml = function (t, title) {
    const rows = [0, 1, 2].map(c => {
      const [r, n] = t[c] || [0, 0];
      if (!n) return `<tr><th scope="row">${M.CONF[c]}</th><td>not used</td><td></td></tr>`;
      const p = r / n, pc = Math.round(p * 100);
      let read;
      if (n < 3) read = '· too few to read';
      else if (p < BAND[c][0]) read = c === 2 ? '↓ Too sure: each miss costs 3' : '↓ Too high: these were guesses';
      else if (p >= BAND[c][1] && c < 2) read = c === 0 ? '↑ You knew more: try Think so' : '↑ Try Sure on these';
      else read = '✓ On target';
      return `<tr><th scope="row">${M.CONF[c]}</th><td>${r} of ${n} right (${pc}%)</td><td>${read}</td></tr>`;
    }).join('');
    return `<div class="md-cal"><p class="td-head">${esc(title || 'How sure you were')}</p>
      <table class="md-calt"><caption class="sr">Calibration: how often each button was right</caption><tbody>${rows}</tbody></table>
      <p class="muted small">Pays best: Guess under 50% right, Think so 50% to 67%, Sure over 67%.</p></div>`;
  };
  function calibAll() {
    const t = store().cal, n = [0, 1, 2].reduce((a, c) => a + ((t[c] || [0, 0])[1]), 0);
    return n ? `<details class="md-all"><summary class="small">Your calibration across every mode (${n} answers)</summary>${M.calibHtml(t, 'All modes')}</details>` : '';
  }

  // ---- Asking ----
  // Stop for now in the quiz window's title bar (as Today's sets have it), while opts.onStop is set.
  let stopWatch = null, stopFn = null, cur = null;
  M.current = () => cur;   // the question SD.modes.ask is showing (headless checks)
  function stopBar() {
    if (!stopFn) return;
    const h = document.querySelector('#panel .win.quiz .win-h');
    if (!h || h.querySelector('#md-stop')) return;
    const el = document.createElement('span');
    el.className = 'td-qbar';
    el.innerHTML = `${M.prog ? `<b class="td-prog">${esc(M.prog)}</b>` : ''}<button class="td-stop" id="md-stop">Stop for now</button>`;
    h.appendChild(el);
    el.querySelector('#md-stop').onclick = () => { if (stopFn) stopFn(); };
  }
  // ---- Clues: the stem as a place to explore (Nov 15 revision) ----
  // The scenario sentences (and q.ev) become clues; the question line, its MOST/LEAST qualifier and any "Select TWO"
  // hint stay visible. labels: names for the clues in order (cycled), e.g. ['Logs', 'Metrics', 'Traces'].
  M.split = function (q, labels) {
    const hint = /\s*\((?:Select|Choose) [A-Z]+\.?\)\s*$/i;
    const parts = String(q.q || '').trim().replace(hint, '').split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/);
    const ask = parts.length > 1 ? parts.pop() : '';
    const m = /\b(MOST|LEAST|most|least|quickest|fastest|fewest|simplest|cheapest|lowest|best)\b[^?.,;]*/.exec(ask);
    const qual = m ? m[0].replace(/^\w+/, w => w.toUpperCase()) : '';
    const L = Array.isArray(labels) && labels.length ? labels : null;
    const texts = (q.ev ? [q.ev] : []).concat(ask ? parts : []);
    const items = texts.map((text, i) => ({ label: L ? L[i % L.length] + (i >= L.length ? ' ' + (Math.floor(i / L.length) + 1) : '') : (q.ev && !i ? 'Evidence' : 'Clue ' + (i + 1 - (q.ev ? 1 : 0))), text }));
    return { items, ask: ask || q.q, qual, pick: q.type === 'multi' ? (q.hint || 'Select all that apply.') : '', scenario: parts.join(' ') };
  };

  M.ask = async function (q, opts) {
    opts = Object.assign({ source: true, noSwap: true, stakes: M.STAKES, stakeHelp: M.STAKE_HELP }, opts || {});
    if (q && !q.c && SD.today && SD.today.resolveItem) q = SD.today.resolveItem({ q: q.id }) || q;
    if (opts.clues === true) opts.clues = M.split(q, opts.clueLabels);
    if (opts.clues) opts.noThink = true;
    if (q.c) S.seeConcept(q.c);
    cur = q;
    const t0 = Date.now();
    // opts.tally here is the mode's calibration tally, not js/quiz.js's Trust Policy switch of the same name.
    const tally = opts.tally || null, qo = Object.assign({}, opts);
    delete qo.tally;
    let r;
    if (opts.onStop) {
      M.prog = opts.progress || '';
      if (!stopWatch && window.MutationObserver) { stopWatch = new MutationObserver(stopBar); stopWatch.observe(document.querySelector('#panel'), { childList: true }); }
      r = await new Promise(res => {
        stopFn = () => {
          // An answer already committed counts; otherwise nothing was answered.
          const l = sv().qlog && sv().qlog[q.id], c = q.c && sv().concepts[q.c], h = c && c.hist && c.hist.slice(-1)[0];
          stopFn = null;
          U.closePanel();
          res(l && l[0] >= t0 ? { ok: !!l[1], conf: h && h.t >= t0 ? h.conf : 0, stopped: true, committed: true } : { stopped: true });
        };
        SD.quiz.ask(q, qo).then(res);
        stopBar();
      });
      stopFn = null;
    } else r = await SD.quiz.ask(q, qo);
    if (r.closed || r.skipped || (r.stopped && !r.committed)) { if (r.stopped) opts.onStop(); return r; }
    const conf = [0, 1, 2].includes(r.conf) ? r.conf : 0;
    r.pts = M.stake(r.ok, conf);
    r.sureMiss = !r.ok && conf === 2 && !opts.noWall;
    M.note(tally, r.ok, conf);
    if (SD.today && SD.today.wallSettle) r.wall = SD.today.wallSettle(q.id, r.ok, conf, opts.poster || null, !!opts.noWall);
    S.persist();
    if (r.stopped) opts.onStop(r);
    return r;
  };

  // ---- Pay ----
  // XP and shards like Today's set (Ladi, Nov 15): the same amount, once a day per mode, so no mode pays better than
  // reviewing. Returns the line to show, or '' when that mode's pay is already taken today (S.save.modes.paid[id]).
  M.XP = 20; M.SHARDS = 5;
  M.pay = function (id) {
    const day = new Date().toDateString(), paid = store().paid = store().paid || {};
    if (paid[id] === day) return '';
    paid[id] = day;
    if (SD.run && SD.run.gainXp) SD.run.gainXp(M.XP); else S.addXp(M.XP);
    sv().shards = (sv().shards | 0) + M.SHARDS;
    S.persist();
    return `+${M.XP} XP · +${M.SHARDS} shards (once a day)`;
  };

  // ---- First-run walkthrough ----
  M.walk = function (id, screens) {
    return new Promise(done => {
      let i = 0;
      const show = () => {
        const s = screens[i], last = i === screens.length - 1;
        const b = U.panel(`<p class="md-step small"><b>Step ${i + 1} of ${screens.length}</b>${s.title ? ` · ${esc(s.title)}` : ''}</p>
          <div class="md-walk">${s.html}</div>
          <div class="row">${i ? '<button class="ghost" id="md-back">Back</button>' : ''}<button class="primary" id="md-next">${last ? 'Start' : 'Next'}</button></div>`,
        { title: 'HOW TO PLAY', onClose: () => { mark(); done(); } });
        b.querySelector('#md-next').onclick = () => { if (last) { U.closePanel(); mark(); done(); } else { i++; show(); } };
        const bk = b.querySelector('#md-back'); if (bk) bk.onclick = () => { i--; show(); };
        b.querySelector('#md-next').focus();
      };
      const mark = () => { store().seen[id] = Date.now(); S.persist(); };
      show();
    });
  };
  M.seen = id => !!store().seen[id];
  M.walkFirst = (id, screens) => (M.seen(id) ? Promise.resolve() : M.walk(id, screens));

  // ---- Picking questions ----
  const DAY = 86400000;
  const examStyle = q => q && (q.type === 'mc' || q.type === 'multi');
  const isDue = c => { const x = sv().concepts[c]; return !!(x && x.seen && x.due <= Date.now()); };
  // Due concept first, then never asked, then asked longest ago, with a little shuffle.
  function rank(list) {
    const log = sv().qlog || {}, cOf = q => (q.c || (SD.today && SD.today.conceptOf ? SD.today.conceptOf(q) : null));
    const k = q => (cOf(q) && isDue(cOf(q)) ? 0 : DAY * 3650) + (log[q.id] ? log[q.id][0] : 0) + Math.random() * DAY;
    return list.map(q => [k(q), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }
  // Verified-only with js/topic-drill.js's fallback: below MIN_VERIFIED verified, top up with unchecked ones.
  function choose(list, n, verifiedOnly, D) {
    if (!verifiedOnly) return { picks: rank(list).slice(0, n), topped: 0 };
    const ver = list.filter(D.isVerified);
    if (ver.length >= D.MIN_VERIFIED) return { picks: rank(ver).slice(0, n), topped: 0 };
    const rest = rank(list.filter(q => !D.isVerified(q))).slice(0, Math.max(0, n - ver.length));
    return { picks: rank(ver).concat(rest).slice(0, n), topped: rest.length };
  }
  M.pick = function (o) {
    const D = SD.topicDrill, E = SD.exam;
    o = Object.assign({ n: 10, verifiedOnly: true, mix: 0.25, filter: examStyle, avoid: [] }, o || {});
    const p = D.preset(o.preset);
    const avoid = new Set(o.avoid), keep = q => q && q.id && !avoid.has(q.id) && o.filter(q);
    const mine = p ? D.pool(p).filter(keep) : [];
    const nOther = p ? Math.round(o.n * o.mix) : o.n, nMine = o.n - nOther;
    const a = choose(mine, nMine, o.verifiedOnly, D);
    const used = new Set(a.picks.map(q => q.id));
    // Others: a question from each due concept outside the preset, then the longest-unasked outside it.
    const outside = q => keep(q) && !used.has(q.id) && (!p || !D.matches(p, q));
    const base = D.base().filter(outside);
    const due = SD.today ? SD.today.dueList() : [];
    const fromDue = [];
    due.forEach(c => {
      const qs = base.filter(q => (q.c || (SD.today.conceptOf && SD.today.conceptOf(q))) === c);
      if (qs.length) fromDue.push(qs);
    });
    let others = [];
    SD.quiz.shuffle(fromDue).forEach(qs => {
      if (others.length >= nOther) return;
      const ver = qs.filter(D.isVerified), v = rank(o.verifiedOnly && ver.length ? ver : qs)[0];
      if (v && !used.has(v.id)) { others.push(v); used.add(v.id); }
    });
    if (others.length < nOther) {
      const b = choose(base.filter(q => !used.has(q.id)), nOther - others.length, o.verifiedOnly, D);
      others = others.concat(b.picks);
    }
    // Not enough elsewhere: fill from the preset.
    let picks = a.picks.concat(others);
    if (picks.length < o.n && p) picks = picks.concat(choose(mine.filter(q => !picks.includes(q)), o.n - picks.length, o.verifiedOnly, D).picks);
    const items = SD.quiz.shuffle(picks.map(q => ({ q: q.id, c: q.c || (SD.today && SD.today.conceptOf ? SD.today.conceptOf(q) : null), other: others.includes(q) ? 1 : 0, v: D.isVerified(q) ? 1 : 0 })));
    return { items, verified: items.filter(it => it.v).length, topped: a.topped, avail: { n: mine.length, v: mine.filter(D.isVerified).length }, name: p ? p.name : (E ? E.NAME : '') };
  };

  // ---- Results ----
  // Pip's last word on every results screen (Story review): one typed sentence, kept in S.save.pipNotes.
  M.pipHtml = function () {
    return `<form class="md-pip"><label for="md-pip-in"><b>Pip:</b> "Sorry to be a bother. Why did that work?"</label>
      <div class="tf-row"><input id="md-pip-in" type="text" maxlength="200" autocomplete="off" placeholder="One sentence, in your words"><button class="ghost" type="submit">Save</button></div>
      <p class="small md-pip-ok" hidden>✓ Saved. Pip writes it down.</p></form>`;
  };
  M.pipWire = function (b, topic) {
    const f = b && b.querySelector('.md-pip');
    if (!f) return;
    f.onsubmit = e => {
      e.preventDefault();
      const v = f.querySelector('input').value.trim();
      if (!v) return;
      const list = sv().pipNotes = sv().pipNotes || [];
      list.push({ t: Date.now(), topic: topic || '', text: v });
      if (list.length > 60) list.shift();
      S.persist();
      f.querySelector('.md-pip-ok').hidden = false;
    };
  };

  const css = document.createElement('style');
  css.textContent = `
    .td-play { font-weight: 800; }
    .md-mode { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; text-align: left; }
    .md-n { font-weight: 800; font-size: 16px; }
    .md-st { font-weight: 700; }
    .md-stakes, .md-calt { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 14px; }
    .md-stakes th, .md-stakes td, .md-calt th, .md-calt td { border: 1px solid var(--ink, #222); padding: 4px 6px; text-align: left; vertical-align: top; }
    .md-calt td:last-child { font-size: 13px; }
    .md-cal { margin: 8px 0; }
    .md-step { margin: 0 0 6px; }
    .md-walk { overflow-wrap: anywhere; }
    .md-walk .md-eg { border: 2px dashed var(--ink, #222); border-radius: 8px; padding: 8px 10px; margin: 8px 0; background: #fffdf6; }
    .md-pip { margin: 10px 0; padding: 8px 10px; border: 2px solid var(--ink, #222); border-radius: 8px; }
    .md-pip .tf-row { display: flex; gap: 6px; margin-top: 6px; }
    .md-pip input { flex: 1; min-width: 0; min-height: 40px; font-size: 16px; }
    .mode-note { margin: 4px 0; }
    .q-clues { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 8px; }
    .clue { text-align: left; min-height: 44px; padding: 8px 10px; border: 2px dashed var(--ink, #222); border-radius: 8px; background: #fffdf6; font: inherit; overflow-wrap: anywhere; }
    .clue.on { border-style: solid; background: #fff; font-size: 15px; line-height: 1.4; }
    .q-qual { margin: 2px 0 6px; }
    .act-l { margin: 8px 0 2px; }
    .opt.act { border-style: solid; border-left-width: 6px; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }`;
  document.head.appendChild(css);
})();
