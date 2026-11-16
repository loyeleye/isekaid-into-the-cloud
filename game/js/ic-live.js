// Incident Commander's Live shift (design "Incident Commander: live request path design", Nov 16; Ladi chose "a Live
// shift in Incident Commander"). Three incidents on a live request path, each played on the machine itself:
//   1. The page arrives: Uptima's pager line and the machine (its parts, their settings). Nothing else.
//   2. Predict: what does the broken path do with the next minute's traffic? A number, committed with Guess, Think so or
//      Sure on the shared stake table. Then the minute runs and the machine shows what happened (L9: state on the parts).
//   3. Fix: tap a part for its evidence (log line or metric) and its knobs. Each knob is taught the first time you turn
//      it, with one line (once per save), never a walkthrough screen. Run the minute again; one more try if the SLO
//      isn't met.
//   4. Debrief: one verified bank question on the rule you just used ("why did that work?"), on the plain exam screen
//      with the shared stake table (SD.modes.ask). A Sure miss goes on the Wall.
//   - Stamps (js/ic-live-core.js): the SLO met, at most two knobs changed, the incident's documented setting.
//   - Saves after every step (S.save.icLive); Stop for now any time. Pay once a day under its own id (ic-live).
// Rules: js/ic-live-core.js on js/aws-sim.js. Opened from Incident Commander's start (js/mode-ic.js).
(function () {
  if (!SD.modes || !SD.icLive || !SD.icLive.core) return;
  const M = SD.modes, U = SD.ui, S = SD.state, L = SD.icLive.core, IL = SD.icLive;
  const ID = 'ic-live', TITLE = 'LIVE SHIFT';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().icLive || null;
  const save = s => { sv().icLive = s; S.persist(); };
  const taught = () => (sv().icLiveTaught = sv().icLiveTaught || {});
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  const SAY = {
    open: 'Live shift. The request path is right here on the board, running. Tonight you fix it by touching it.',
    right: 'Called it.',
    wrong: 'Not what it did. Remember what it did instead.',
    met: 'Green. Leave it alone now.',
    unmet: 'Still red. One more change.',
    end: 'Three pages, three fixes. Go to sleep.'
  };
  const NAMES = {
    apigw: 'API Gateway', orders: 'orders-fn', pool: 'Account concurrency', reports: 'reports-job', queue: 'SQS queue',
    worker: 'worker', dlq: 'Dead-letter queue', table: 'DynamoDB table'
  };
  const partName = (inc, p) => (p === 'worker' ? (inc.id === 'twice' ? 'charge-fn' : 'worker-fn') : p === 'queue' ? (inc.id === 'twice' ? 'payments-queue' : 'orders-queue') : NAMES[p]);
  // The bank question each incident's debrief draws from: the rule it used.
  const DEBRIEF = {
    launch: /reserved concurrency|concurrency limit|TooManyRequests|throttl/i,
    poison: /dead-letter|maxReceiveCount|ReportBatchItemFailures|partial batch|batch item failure/i,
    twice: /visibility timeout|idempoten|attribute_not_exists|conditional write|at-least-once/i
  };
  const say = (line, cls) => `<p class="ic-say${cls ? ' ' + cls : ''}" data-vo="${esc('uptima|' + line)}"><b>Uptima:</b> ${esc(line)}</p>`;
  const panel = (html, o) => U.panel(`<div class="icl">${html}</div>`, Object.assign({ title: TITLE, onClose: stopNow }, o || {}));
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }

  IL.inProgress = () => { const s = cur(); return !!(s && s.v === 1 && s.phase !== 'done'); };
  IL.status = () => { const s = cur(); return IL.inProgress() ? `Live shift · incident ${s.i + 1} of ${L.INCIDENTS.length}` : ''; };
  IL.start = function () {
    let s = cur();
    if (!IL.inProgress()) {
      s = { v: 1, i: 0, phase: 'page', k: null, runs: 0, pred: null, last: null, open: null, tally: M.newTally(), pts: 0, stamps: [], log: [], t0: Date.now() };
      newIncident(s);
    }
    save(s); draw(s);
  };
  const inc = s => L.INCIDENTS[s.i];
  function newIncident(s) {
    const x = inc(s);
    s.k = L.startKnobs(x); s.runs = 0; s.pred = null; s.last = null; s.before = null; s.open = null; s.phase = 'page'; s.teach = null;
  }
  function draw(s) {
    ({ page: pageScreen, fix: fixScreen, result: resultScreen, debrief: debriefScreen, done: endScreen }[s.phase] || pageScreen)(s);
  }

  // ---- The machine: the incident's parts in request order, each with its settings and what it did last minute ----
  function partState(x, p, s, sum) {
    const k = s.k, out = [];
    if (p === 'orders' && x.knobs.reserve) out.push(k.reserve ? `Reserved: ${k.reserve}` : 'No reservation');
    if (p === 'apigw' && x.knobs.queue && k.queue) out.push('SQS queue in front');
    if (p === 'apigw' && x.knobs.backoff) out.push(k.backoff ? 'Retries: backoff + jitter' : 'Retries: immediate');
    if (p === 'pool') out.push('10 concurrent executions');
    if (p === 'reports') out.push('Wants 8');
    if (p === 'queue' && x.knobs.vis) out.push(`Visibility timeout ${k.vis} s`);
    if (p === 'worker' && x.knobs.batch) out.push(`Batch ${k.batch}`);
    if (p === 'worker' && x.knobs.partial) out.push(k.partial ? 'Partial batch responses on' : 'Partial batch responses off');
    if (p === 'worker' && x.fnTimeout) out.push(`Timeout ${x.fnTimeout} s`);
    if (p === 'dlq') out.push(k.dlq ? `maxReceiveCount ${k.dlq}` : 'Not set');
    if (p === 'table' && x.knobs.idem) out.push(k.idem ? 'Conditional write on' : 'Plain PutItem');
    const did = [];
    if (sum) {
      if (p === 'orders' && sum.throttled) did.push(`⛔ 429 × ${sum.throttled}`);
      if (p === 'apigw' && sum.gaveUp) did.push(`✗ ${plural(sum.gaveUp, 'caller')} gave up`);
      if (p === 'apigw' && sum.unanswered) did.push(`✉ ${plural(sum.unanswered, 'caller')} got a message ID, not an order`);
      if (p === 'reports' && x.knobs.reserve) did.push(k.reserve > 6 ? '⚠ starved' : 'Running');
      if (p === 'queue' && sum.backlog) did.push(`📥 ${sum.backlog} still waiting`);
      if (p === 'worker' && sum.fails) did.push(`⚠ ${plural(sum.fails, 'failure')}`);
      if ((p === 'worker' && x.id === 'poison' || p === 'table') && sum.dupes) did.push(`×2 ${plural(sum.dupes, 'order')} done twice`);
      if (p === 'table' && sum.blocked) did.push(`🛡 ${sum.blocked} blocked`);
      if (p === 'dlq' && sum.parked) did.push(`🪦 ${sum.parked} parked`);
      if (p === 'orders' && !sum.throttled && x.id === 'launch') did.push('✓ No throttles');
    }
    return { out, did };
  }
  function machine(s, x, sum, open) {
    const parts = x.parts.map((p, i) => {
      const st = partState(x, p, s, sum), knobs = Object.keys(x.knobs).filter(id => x.knobs[id].part === p);
      const tappable = s.phase === 'fix';
      const label = `${partName(x, p)}: ${st.out.join(', ')}${st.did.length ? '. Last minute: ' + st.did.join(', ') : ''}`;
      const arrow = i < x.parts.length - 1 && !(p === 'pool' || p === 'reports') ? '<span class="icl-arrow" aria-hidden="true">↓</span>' : '';
      return `<div class="icl-part${open === p ? ' open' : ''}${st.did.some(d => /⛔|⚠|×2|✗|✉|📥/.test(d)) ? ' hot' : ''}">
        <button class="icl-ph" data-part="${p}" ${tappable ? '' : 'disabled'} aria-expanded="${open === p}" aria-label="${esc(label)}">
          <b>${esc(partName(x, p))}</b>${st.out.map(o => `<span class="icl-set">${esc(o)}</span>`).join('')}
          ${st.did.map(d => `<span class="icl-did">${esc(d)}</span>`).join('')}
          ${tappable ? `<span class="icl-tap small">${open === p ? 'Close' : knobs.length ? 'Evidence and settings' : 'Evidence'}</span>` : ''}</button>
        ${open === p ? partOpen(s, x, p, knobs) : ''}</div>${arrow}`;
    }).join('');
    return `<div class="icl-machine" role="group" aria-label="The request path">${parts}</div>`;
  }
  function partOpen(s, x, p, knobs) {
    const ev = x.evidence[p];
    return `<div class="icl-open">${ev ? `<pre class="icl-ev">${esc(ev)}</pre>` : ''}
      ${knobs.map(id => {
        const kn = x.knobs[id];
        return `<div class="icl-knob" role="group" aria-label="${esc(kn.name)}"><span class="small"><b>${esc(kn.name)}</b>${kn.unit ? ` (${esc(kn.unit)})` : ''}</span>
          <span class="icl-vals">${kn.values.map(v => `<button class="${s.k[id] === v.v ? 'on' : ''}" data-knob="${id}" data-v="${v.v}" aria-pressed="${s.k[id] === v.v}">${esc(v.label)}</button>`).join('')}</span></div>`;
      }).join('')}</div>`;
  }
  // The minute, turn by turn (30 s each), in words and icons.
  function strip(sum) {
    const W = [['done', '✓'], ['throttled', '⛔'], ['gaveUp', '✗'], ['dupe', '×2'], ['dupeBlocked', '🛡'], ['fail', '⚠'], ['dlq', '🪦']];
    const cells = sum.turns.map((t, i) => {
      const bits = W.filter(([k]) => t[k]).map(([k, g]) => `${g}${t[k]}`);
      if (!bits.length) return '';
      return `<li><span class="icl-tt">${(i + 1) * L.TURN_SECS} s</span> ${bits.join(' ')}</li>`;
    }).filter(Boolean).join('');
    return `<details class="icl-strip"><summary class="small">The minute, 30 s at a time</summary><ul>${cells}</ul>
      <p class="muted small">✓ handled · ⛔ throttled (429) · ✗ caller gave up · ×2 done again · 🛡 second write blocked · ⚠ failed · 🪦 moved to the dead-letter queue</p></details>`;
  }
  function hud(s) {
    return `<p class="icl-hud small"><b>Incident ${s.i + 1} of ${L.INCIDENTS.length}</b> · ${esc(inc(s).name)} · SEV-${inc(s).sev} · Points ${M.sgn(s.pts)}</p>`;
  }

  // ---- 1 and 2: the page, then the prediction ----
  function pageScreen(s) {
    const x = inc(s), pc = L.predictChoices(x);
    const first = s.i === 0;
    const b = panel(`${hud(s)}${say(first ? SAY.open : 'Next page.')}
      <p class="icl-page">📟 <b>${esc(x.page)}</b></p>
      ${machine(s, x, null, null)}
      <div class="icl-pred"><p><b>${esc(x.predict.q)}</b></p>
        <div class="icl-vals" role="group" aria-label="Your prediction">${pc.choices.map(v => `<button class="${s.pred && s.pred.v === v ? 'on' : ''}" data-pred="${v}" aria-pressed="${!!(s.pred && s.pred.v === v)}">${v}</button>`).join('')}</div>
        ${s.pred ? `<p class="small">How sure are you?</p><div class="row icl-conf">${M.CONF.map((c, i) => `<button class="ghost" data-conf="${i}">${c} <span class="small">✓${M.sgn(M.STAKES[i][0])} ✗${M.sgn(M.STAKES[i][1])}</span></button>`).join('')}</div>` : '<p class="muted small">Pick a number first. Nothing is shown until you commit.</p>'}</div>
      <div class="row"><button class="ghost" id="icl-stop">Stop for now</button></div>`);
    b.querySelectorAll('[data-pred]').forEach(el => el.onclick = () => { s.pred = { v: +el.dataset.pred }; save(s); pageScreen(s); });
    b.querySelectorAll('[data-conf]').forEach(el => el.onclick = () => {
      const conf = +el.dataset.conf, ok = s.pred.v === pc.truth;
      const pts = M.stake(ok, conf);
      M.note(s.tally, ok, conf);
      s.pts += pts;
      s.before = L.run(x, s.k);
      s.predOut = { ok, conf, pts, truth: pc.truth, v: s.pred.v };
      s.log.push({ inc: x.id, kind: 'predict', ok, conf, pts });
      s.phase = 'fix';
      save(s); draw(s);
    });
    b.querySelector('#icl-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- 3: fix it on the machine ----
  function fixScreen(s) {
    const x = inc(s), sum = s.last || s.before, p = s.predOut;
    const changed = L.changes(x, s.k);
    const top = !s.runs && p
      ? `${say(p.ok ? SAY.right : SAY.wrong)}<p class="icl-verdict small">You said <b>${p.v}</b>, it was <b>${p.truth}</b> (${M.CONF[p.conf]}, ${M.sgn(p.pts)}). The machine shows the minute it just ran.</p>`
      : say(SAY.unmet);
    const teach = s.teach ? `<p class="icl-teach small">💡 ${esc(s.teach)}</p>` : '';
    const b = panel(`${hud(s)}${top}
      <p class="icl-page">📟 ${esc(x.page)}</p>
      ${machine(s, x, sum, s.open)}
      ${teach}
      ${strip(sum)}
      <p class="small icl-changes">${changed.length ? `Changed: ${changed.map(id => esc(x.knobs[id].name)).join('; ')}.` : 'Nothing changed yet. Tap a part for its evidence and settings.'} ${changed.length > L.MAX_CHANGES ? '<b>More than two changes: the smallest-change stamp is off.</b>' : `The smallest correct change is two knobs or fewer.`}</p>
      <div class="row"><button class="primary" id="icl-run"${changed.length ? '' : ' disabled'}>▶ Run the next minute</button><button class="ghost" id="icl-stop">Stop for now</button></div>`);
    b.querySelectorAll('[data-part]').forEach(el => el.onclick = () => { s.open = s.open === el.dataset.part ? null : el.dataset.part; s.teach = null; save(s); fixScreen(s); });
    b.querySelectorAll('[data-knob]').forEach(el => el.onclick = () => {
      const id = el.dataset.knob, v = +el.dataset.v;
      s.k[id] = v;
      const key = x.id + ':' + id;
      s.teach = !taught()[key] ? x.knobs[id].teach : null;
      taught()[key] = 1;
      save(s); fixScreen(s);
    });
    b.querySelector('#icl-run').onclick = () => {
      s.last = L.run(x, s.k); s.runs++; s.open = null; s.teach = null; s.phase = 'result';
      save(s); draw(s);
    };
    b.querySelector('#icl-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The result of a run ----
  function resultScreen(s) {
    const x = inc(s), sum = s.last, st = sum.stamps, more = !sum.slo && s.runs < 2;
    const stamp = (on, label) => `<li class="${on ? 'on' : ''}">${on ? '✓' : '○'} ${esc(label)}</li>`;
    const b = panel(`${hud(s)}${say(sum.slo ? SAY.met : more ? SAY.unmet : 'It\'s still red, and the shift goes on. The debrief says why.')}
      ${machine(s, x, sum, null)}
      <p class="icl-slo"><b>${sum.slo ? '✓ SLO met' : '✗ SLO not met'}:</b> ${esc(sum.sloLine)}</p>
      ${strip(sum)}
      <ul class="icl-stamps">${stamp(st.slo, 'SLO met')}${stamp(st.small, 'Two knobs or fewer')}${stamp(st.rule, 'The documented setting')}</ul>
      <p class="small">${esc(sum.ruleLine)}</p>
      <div class="row">${more ? '<button class="primary" id="icl-again">One more change</button><button class="ghost" id="icl-on">Leave it red, go to the debrief</button>' : '<button class="primary" id="icl-on">Debrief</button>'}</div>`);
    const again = b.querySelector('#icl-again');
    if (again) again.onclick = () => { s.phase = 'fix'; save(s); draw(s); };
    b.querySelector('#icl-on').onclick = () => {
      s.stamps[s.i] = st;
      s.log.push({ inc: x.id, kind: 'fix', slo: sum.slo, changed: sum.changed, stamps: st });
      s.phase = 'debrief'; save(s); draw(s);
    };
  }

  // ---- 4: the debrief question ----
  async function debriefScreen(s) {
    const x = inc(s), rx = DEBRIEF[x.id];
    const text = q => [q.q].concat(q.opts || [], (q.items || []).map(it => it.t || it.text || '')).join(' ');
    const r = M.pick({ match: q => rx.test(text(q)), n: 1, mix: 0, avoid: s.log.filter(l => l.q).map(l => l.q) });
    const it = r.items[0];
    const q = it && (SD.today && SD.today.resolveItem ? SD.today.resolveItem(it) : SD.exam.find(it.q));
    if (!q) return nextIncident(s);
    const res = await M.ask(q, { tally: s.tally, onStop: () => {} });
    if (res.closed || res.skipped || (res.stopped && !res.committed)) { stopNow(); return; }
    s.pts += res.pts | 0;
    s.log.push({ inc: x.id, kind: 'debrief', q: q.id, ok: !!res.ok, conf: res.conf, pts: res.pts | 0 });
    nextIncident(s, !res.stopped);
  }
  function nextIncident(s, show) {
    s.i++;
    if (s.i >= L.INCIDENTS.length) { s.phase = 'done'; s.paid = M.pay(ID); }
    else newIncident(s);
    save(s);
    if (show !== false) draw(s); else stopNow();
  }

  // ---- The end of the shift: ends on the stamps, then calibration ----
  function endScreen(s) {
    const total = s.stamps.reduce((a, st) => a + (st ? (st.slo ? 1 : 0) + (st.small ? 1 : 0) + (st.rule ? 1 : 0) : 0), 0);
    const rows = L.INCIDENTS.map((x, i) => { const st = s.stamps[i] || {}; return `<li><b>${esc(x.name)}</b>: ${st.slo ? '✓ SLO' : '✗ SLO'} · ${st.small ? '✓ small change' : '○ small change'} · ${st.rule ? '✓ documented setting' : '○ documented setting'}</li>`; }).join('');
    const b = panel(`${say(SAY.end)}
      <p class="icl-total"><b>${total} of ${L.INCIDENTS.length * 3} stamps</b> · Points ${M.sgn(s.pts)}${s.paid ? ` · ${esc(s.paid)}` : ''}</p>
      <ul class="icl-stamps">${rows}</ul>
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="icl-done">Done</button><button class="ghost" id="icl-new">New live shift</button></div>`);
    M.pipWire(b, 'Incident Commander live shift');
    b.querySelector('#icl-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#icl-new').onclick = () => { sv().icLive = null; IL.start(); };
  }

  const css = document.createElement('style');
  css.textContent = `
    .icl-hud { margin: 0 0 6px; }
    .icl-page { margin: 6px 0; overflow-wrap: anywhere; }
    .icl-machine { display: flex; flex-direction: column; align-items: stretch; gap: 2px; margin: 8px 0; }
    .icl-part { border: 2px solid var(--ink, #222); border-radius: 8px; background: var(--paper, #fff); }
    .icl-part.hot { border-color: #a8322a; box-shadow: 0 0 0 2px rgba(168, 50, 42, .35); }
    .icl-ph { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; width: 100%; min-height: 44px; padding: 6px 8px; text-align: left; background: none; border: 0; color: inherit; font: inherit; }
    .icl-ph:disabled { cursor: default; opacity: 1; }
    .icl-set { font-size: 13px; padding: 1px 6px; border: 1px solid var(--line, #999); border-radius: 10px; }
    .icl-did { font-size: 13px; font-weight: 700; }
    .icl-tap { margin-left: auto; text-decoration: underline; }
    .icl-arrow { text-align: center; line-height: 1; opacity: .7; }
    .icl-open { padding: 4px 8px 8px; }
    .icl-ev { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; margin: 4px 0 8px; padding: 6px 8px; border-left: 4px solid var(--ink, #222); background: rgba(0, 0, 0, .06); }
    .icl-knob { display: flex; flex-direction: column; gap: 4px; margin: 6px 0; }
    .icl-vals { display: flex; flex-wrap: wrap; gap: 6px; }
    .icl-vals button { min-width: 44px; min-height: 40px; padding: 4px 10px; border: 2px solid var(--ink, #222); border-radius: 6px; background: var(--paper, #fff); color: inherit; font: inherit; }
    .icl-vals button.on { border-width: 3px; border-style: double; font-weight: 800; }
    .icl-vals button.on::before { content: '● '; }
    .icl-pred { margin: 8px 0; }
    .icl-conf button { flex: 1 1 0; min-width: 0; }
    .icl-teach { margin: 6px 0; padding: 6px 8px; border: 2px dashed var(--ink, #222); border-radius: 6px; overflow-wrap: anywhere; }
    .icl-strip ul { padding-left: 18px; margin: 4px 0; }
    .icl-strip li { margin: 2px 0; }
    .icl-tt { display: inline-block; min-width: 46px; font-variant-numeric: tabular-nums; }
    .icl-stamps { list-style: none; padding: 0; margin: 6px 0; }
    .icl-stamps li { margin: 4px 0; overflow-wrap: anywhere; }
    .icl-stamps li.on { font-weight: 700; }
    .icl-slo, .icl-verdict, .icl-changes { overflow-wrap: anywhere; }`;
  document.head.appendChild(css);
})();
