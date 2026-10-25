// The Exam Hall (ExamPrepDemo): a timed mock of the chosen exam (DVA-C02 or SAA-C03) that plays like the real one. Questions from SD.exam.mockFor
// (js/exam.js), no feedback until you submit, answers you can change, flags, a question grid and a review screen.
// It doesn't go through SD.quiz.ask, so say it first and the confidence buttons never apply here.
// Progress is saved after every answer to S.save.examInProgress; the clock only runs while the hall is open and the
// tab is showing. Misses go on S.save.wall for the Today card; mock answers never touch spaced review.
(function () {
  const H = SD.examHall = {};
  const U = SD.ui, E = SD.exam;
  const S = () => SD.state;
  const PASS = 720;
  const MIN = 60000;

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clock = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  };
  const formName = f => f === 'half' ? 'Baseline half mock' : f ? 'Mock exam, form ' + f : 'Practice mock';
  const limitFor = full => (full ? E.MOCK_MIN : E.MOCK_MIN / 2) * MIN;   // 130 minutes for 65 questions, 65 for the half
  const need = q => q.items.filter(it => it.ok).length;
  const stem = q => q.type === 'multi' ? q.q.replace(/\s*\((select|choose)\s+\w+\.?\)\s*$/i, '') + ` (Choose ${need(q)})` : q.q;
  const scaled = pct => Math.max(100, Math.min(1000, Math.round(pct * 1000)));
  const answered = (q, a) => q.type === 'multi' ? Array.isArray(a) && a.length === need(q) : a != null;

  let run = null;    // the session in progress: { qs, ord, ans, flags, at, form, practice, full, base, since, limit }
  let view = null;   // 'intro' | 'q' | 'grid' | 'review' | 'result'
  let body = null, done = null, tick = null, note = '';

  // ---- Time ----
  const elapsed = () => run ? run.base + (run.since ? Date.now() - run.since : 0) : 0;
  function pause() { if (run && run.since) { run.base += Date.now() - run.since; run.since = 0; } }
  function resume() { if (run && !run.since && !document.hidden) run.since = Date.now(); }
  function onVis() {
    if (!run || view === 'result') return;
    if (document.hidden) { pause(); persist(); } else resume();
  }
  function onTick() {
    if (!run || view === 'result' || view === 'intro') return;
    const left = run.limit - elapsed();
    const el = body && body.querySelector('#xh-clock');
    if (el) { el.textContent = clock(left); el.classList.toggle('low', left < 5 * MIN); }
    if (left <= 0) submit(true);
  }

  // ---- Saving ----
  function persist() {
    if (!run) return;
    S().save.examInProgress = { form: run.form, practice: run.practice, full: run.full, ids: run.qs.map(q => q.id), exam: run.exam,
      ord: run.ord, ans: run.ans, flags: run.flags, at: run.at, ms: elapsed(), t: run.t };
    S().persist();
  }
  function restore(p) {
    const qs = (p.ids || []).map(id => E.find(id));
    if (!qs.length || qs.some(q => !q)) return null;
    return { qs, ord: p.ord, ans: p.ans || qs.map(() => null), flags: p.flags || qs.map(() => false), at: p.at || 0,
      form: p.form, practice: !!p.practice, full: !!p.full, exam: p.exam || 'DVA', base: p.ms || 0, since: 0, limit: limitFor(!!p.full), t: p.t || Date.now() };
  }
  function fresh(m) {
    return { qs: m.qs, ord: m.qs.map(q => shuffle((q.type === 'multi' ? q.items : q.opts).map((x, i) => i))),
      ans: m.qs.map(() => null), flags: m.qs.map(() => false), at: 0, form: m.form, practice: m.practice, full: m.full, exam: E.track(),
      base: 0, since: 0, limit: limitFor(m.full), t: Date.now() };
  }

  // ---- Scoring ----
  function score() {
    const dom = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
    let right = 0;
    const ok = run.qs.map((q, i) => {
      const r = E.correct(q, run.ans[i]), d = dom[E.domainOf(q, run.exam)];
      if (r) right++;
      if (d) { d[1]++; if (r) d[0]++; }
      return r;
    });
    return { ok, right, dom };
  }
  function record(isDone, timedOut) {
    const s = score(), ms = Math.min(elapsed(), run.limit);
    const m = { t: Date.now(), n: run.qs.length, right: s.right, mins: Math.round(ms / 6000) / 10, full: run.full,
      form: run.form, practice: run.practice, done: isDone, dom: s.dom, ids: run.qs.map(q => q.id), exam: run.exam };
    if (isDone) m.score = scaled(s.right / run.qs.length);
    if (timedOut) m.timedOut = true;
    delete S().save.examInProgress;
    if (isDone) {
      const wall = S().save.wall = S().save.wall || [];
      run.qs.forEach((q, i) => { if (!s.ok[i] && !wall.some(w => w.id === q.id)) wall.push({ id: q.id, t: m.t, rights: [] }); });
    }
    E.recordMock(m);   // persists
    return { m, s };
  }

  // ---- Screens ----
  // U.panel builds a new window each call; the hall keeps one and redraws inside it.
  function shell() {
    body = U.panel('', { title: 'EXAM HALL', noClose: true, cls: 'quiz exam-hall' });
    return body;
  }
  function draw(h, keep) {
    if (!body || !body.isConnected) shell();
    const top = body.scrollTop;
    body.innerHTML = h;
    body.scrollTop = keep ? top : 0;
    return body;
  }

  function intro(m) {
    view = 'intro';
    const n = m.qs.length, mins = limitFor(m.full) / MIN;
    const b = draw(`<div class="xh-intro">
      <div class="q-ctx">${U.esc(E.NAME)} · ${U.esc(formName(m.form))}</div>
      ${m.practice ? `<p class="xh-practice">Practice: from the bank, questions you haven\'t answered first</p>` : ''}
      <dl class="xh-facts"><dt>Questions</dt><dd>${n}</dd><dt>Time</dt><dd>${mins} minutes</dd><dt>Pass line</dt><dd>${PASS} of 1000</dd></dl>
      <p class="small">Like the real exam: no feedback until you submit, you can change any answer, and you can flag questions to come back to. Multiple response questions say how many to choose and score only when every pick is right.</p>
      <p class="muted small">The clock pauses when you leave the tab or the hall, and your answers are saved as you go.</p>
      </div><div class="q-foot xh-foot"><button class="ghost" id="xh-later">Not now</button><button class="primary" id="xh-start">Start</button></div>`);
    b.querySelector('#xh-later').onclick = () => finish(null);
    b.querySelector('#xh-start').onclick = () => { run = fresh(m); resume(); persist(); question(); };
    b.querySelector('#xh-start').focus();
  }

  function offer(p, form) {
    view = 'intro';
    const r = restore(p);
    const n = (p.ids || []).length, got = (p.ans || []).filter(a => a != null && !(Array.isArray(a) && !a.length)).length;
    const b = draw(`<div class="q-ctx">Mock in progress</div>
      <p><b>${U.esc(formName(p.form))}</b>: ${got} of ${n} answered, ${clock(limitFor(!!p.full) - (p.ms || 0))} left.</p>
      ${r ? '' : '<p class="warn small">Some of its questions are missing from this build, so it can only be abandoned.</p>'}
      <p class="muted small">Abandoning records it as unfinished. Its questions stay held out for a later mock.</p>
      <div class="q-foot xh-foot"><button class="danger" id="xh-abandon">Abandon</button><button class="primary" id="xh-resume" ${r ? '' : 'disabled'}>Resume</button></div>`);
    b.querySelector('#xh-resume').onclick = () => { run = r; resume(); question(); };
    b.querySelector('#xh-abandon').onclick = () => {
      if (r) { run = r; record(false); run = null; }
      else { delete S().save.examInProgress; E.recordMock({ t: Date.now(), n, right: 0, mins: Math.round((p.ms || 0) / 6000) / 10, full: !!p.full, form: p.form, practice: !!p.practice, done: false, dom: {}, ids: p.ids || [], exam: p.exam || 'DVA' }); }
      intro(E.mockFor(form));
    };
    (r ? b.querySelector('#xh-resume') : b.querySelector('#xh-abandon')).focus();
  }

  function question(keep) {
    view = 'q';
    const i = run.at, q = run.qs[i], a = run.ans[i], ord = run.ord[i], n = run.qs.length;
    const multi = q.type === 'multi', sel = multi ? new Set(a || []) : null;
    const opts = ord.map((k, pos) => {
      const on = multi ? sel.has(k) : a === k;
      const label = multi ? q.items[k].t : q.opts[k];
      return `<button class="opt xh-opt${on ? ' on' : ''}" data-k="${k}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}"><span class="xh-key" aria-hidden="true">${multi ? (on ? '☑' : '☐') : String.fromCharCode(65 + pos)}</span><span>${U.esc(label)}</span></button>`;
    }).join('');
    const b = draw(`<div class="xh-top">
        <span class="xh-n">Q ${i + 1} / ${n}</span>
        <button class="ghost xh-flag${run.flags[i] ? ' on' : ''}" id="xh-flag" aria-pressed="${!!run.flags[i]}" title="Flag for review (F)">⚑ ${run.flags[i] ? 'Flagged' : 'Flag'}</button>
        <span class="xh-clock" id="xh-clock" aria-label="Time left">${clock(run.limit - elapsed())}</span>
      </div>
      ${q.ev ? `<pre class="q-ev">${U.esc(q.ev)}</pre>` : ''}<p class="q-q xh-stem">${U.esc(stem(q))}</p>
      <div class="opts xh-opts" role="${multi ? 'group' : 'radiogroup'}">${opts}</div>
      <p class="muted small xh-note" aria-live="polite">${U.esc(note)}</p>
      <div class="q-foot xh-foot xh-nav">
        <button class="ghost" id="xh-back" ${i ? '' : 'disabled'}>‹ Back</button>
        <button class="ghost xh-gridb" id="xh-grid" aria-label="Question grid">▦ ${run.ans.filter((x, k) => answered(run.qs[k], x)).length}/${n}</button>
        <button class="primary" id="xh-next">${i === n - 1 ? 'Review' : 'Next ›'}</button>
      </div>`, keep);
    note = '';
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => choose(+el.dataset.k));
    b.querySelector('#xh-flag').onclick = flag;
    b.querySelector('#xh-back').onclick = () => go(i - 1);
    b.querySelector('#xh-next').onclick = () => i === n - 1 ? review() : go(i + 1);
    b.querySelector('#xh-grid').onclick = grid;
    onTick();
  }
  function choose(k) {
    const i = run.at, q = run.qs[i];
    if (q.type === 'multi') {
      const sel = new Set(run.ans[i] || []), max = need(q);
      if (sel.has(k)) sel.delete(k);
      else if (sel.size >= max) note = `Choose ${max}. Unselect one to change your pick.`;
      else sel.add(k);
      run.ans[i] = sel.size ? [...sel].sort((x, y) => x - y) : null;
    } else run.ans[i] = k;
    persist();
    question(true);
  }
  function flag() { run.flags[run.at] = !run.flags[run.at]; persist(); if (view === 'q') question(true); }
  function go(i) {
    if (i < 0 || i >= run.qs.length) return;
    run.at = i; persist(); question();
  }

  function tiles(list) {
    return list.map(i => {
      const st = answered(run.qs[i], run.ans[i]) ? 'done' : 'empty';
      return `<button class="xh-tile ${st}${run.flags[i] ? ' flagged' : ''}${i === run.at ? ' cur' : ''}" data-j="${i}" aria-label="Question ${i + 1}, ${st === 'done' ? 'answered' : 'not answered'}${run.flags[i] ? ', flagged' : ''}">${i + 1}${run.flags[i] ? '<i aria-hidden="true">⚑</i>' : ''}</button>`;
    }).join('');
  }
  function grid() {
    view = 'grid';
    const all = run.qs.map((q, i) => i);
    const b = draw(`<div class="xh-top"><span class="xh-n">Question grid</span><span class="xh-clock" id="xh-clock">${clock(run.limit - elapsed())}</span></div>
      <div class="xh-legend small"><span><b class="xh-sw done"></b>Answered</span><span><b class="xh-sw flagged"></b>Flagged</span><span><b class="xh-sw empty"></b>Not answered</span></div>
      <div class="xh-grid">${tiles(all)}</div>
      <button class="ghost xh-leave" id="xh-leave">Save and leave (the clock stops)</button>
      <div class="q-foot xh-foot"><button class="ghost" id="xh-ret">Back to Q ${run.at + 1}</button><button class="primary" id="xh-rev">Review and submit</button></div>`);
    b.querySelectorAll('[data-j]').forEach(el => el.onclick = () => go(+el.dataset.j));
    b.querySelector('#xh-ret').onclick = question;
    b.querySelector('#xh-rev').onclick = () => review();
    b.querySelector('#xh-leave').onclick = () => { pause(); persist(); run = null; finish(null); };
    onTick();
  }

  function review(confirming) {
    view = 'review';
    const all = run.qs.map((q, i) => i);
    const empty = all.filter(i => !answered(run.qs[i], run.ans[i])), flagged = all.filter(i => run.flags[i]);
    const b = draw(`<div class="xh-top"><span class="xh-n">Review</span><span class="xh-clock" id="xh-clock">${clock(run.limit - elapsed())}</span></div>
      <p>${run.qs.length - empty.length} of ${run.qs.length} answered.</p>
      <div class="q-ctx">Not answered (${empty.length})</div>
      ${empty.length ? `<div class="xh-grid">${tiles(empty)}</div>` : '<p class="muted small">None. Every question has an answer.</p>'}
      <div class="q-ctx">Flagged (${flagged.length})</div>
      ${flagged.length ? `<div class="xh-grid">${tiles(flagged)}</div>` : '<p class="muted small">None flagged.</p>'}
      ${empty.length ? '<p class="small">An unanswered question scores the same as a wrong one, so a guess costs nothing.</p>' : ''}
      <div class="q-foot xh-foot">${confirming
        ? `<p class="xh-confirm"><b>Submit the exam?</b> You can't change answers after this.${empty.length ? ` ${empty.length} unanswered.` : ''}</p><button class="ghost" id="xh-no">Keep working</button><button class="primary" id="xh-yes">Yes, submit</button>`
        : `<button class="ghost" id="xh-ret">Back to Q ${run.at + 1}</button><button class="primary" id="xh-submit">Submit</button>`}</div>`);
    b.querySelectorAll('[data-j]').forEach(el => el.onclick = () => go(+el.dataset.j));
    if (confirming) {
      b.querySelector('#xh-no').onclick = () => review(false);
      b.querySelector('#xh-yes').onclick = () => submit(false);
      b.querySelector('#xh-no').focus();
    } else {
      b.querySelector('#xh-ret').onclick = question;
      b.querySelector('#xh-submit').onclick = () => review(true);
    }
    onTick();
  }

  function submit(timedOut) {
    if (!run || view === 'result') return;
    pause();
    const r = run, { m, s } = record(true, timedOut);
    run = null;
    result(r, m, s);
  }

  // What you answered against the right answer, as js/quiz.js shows it after a question.
  function recapOf(q, a, ord) {
    if (q.type === 'mc') {
      return `<ul class="qr-opts">${ord.map(k => {
        const isA = k === q.a, mine = k === a;
        const tag = isA ? (mine ? 'Your pick · right' : 'Right answer') : mine ? 'Your pick' : '';
        return `<li class="qr-o${isA ? ' right' : ''}${mine && !isA ? ' wrong' : ''}"><span class="qr-m" aria-hidden="true">${isA ? '✓' : mine ? '✗' : ''}</span><span>${U.esc(q.opts[k])}${tag ? ` <em class="qr-tag">${tag}</em>` : ''}</span></li>`;
      }).join('')}</ul>${a == null ? '<p class="muted small">No answer.</p>' : ''}${a != null && a !== q.a && q.no && q.no[a]
        ? `<div class="nots"><div class="mypick"><div class="q-ctx">Why your pick doesn't fit</div><p>${U.esc(q.no[a])}</p></div></div>` : ''}`;
    }
    const sel = new Set(a || []);
    const nots = ord.filter(k => sel.has(k) && !q.items[k].ok && q.items[k].no);
    return `<ul class="qr-opts">${ord.map(k => {
      const it = q.items[k], mine = sel.has(k);
      const tag = mine ? (it.ok ? 'You picked · belongs' : 'You picked · doesn\'t belong') : it.ok ? 'Belongs · you missed it' : '';
      return `<li class="qr-o${it.ok ? (mine ? ' right' : ' missed') : mine ? ' wrong' : ''}"><span class="qr-m" aria-hidden="true">${it.ok ? '✓' : mine ? '✗' : ''}</span><span>${U.esc(it.t)}${tag ? ` <em class="qr-tag">${tag}</em>` : ''}</span></li>`;
    }).join('')}</ul>${sel.size ? '' : '<p class="muted small">No answer.</p>'}${nots.length
      ? `<div class="nots"><div class="mypick"><div class="q-ctx">Why your pick doesn't fit</div>${nots.map(k => `<p><b>${U.esc(q.items[k].t)}</b><br>${U.esc(q.items[k].no)}</p>`).join('')}</div></div>` : ''}`;
  }

  function result(r, m, s) {
    view = 'result';
    const pct = m.right / m.n, est = m.score, pass = est >= PASS;
    if (SD.audio) SD.audio.sfx(pass ? 'right' : 'wrong');
    const DOM = E.cfg(m.exam).DOMAINS;
    const doms = Object.keys(DOM).filter(d => s.dom[d][1]).map(d => {
      const [got, of] = s.dom[d];
      return `<li><span class="xh-dn">${d}. ${U.esc(DOM[d])}</span><span class="xh-dv">${got} of ${of} (${Math.round(got / of * 100)}%)${of < 10 ? ' <em class="xh-early">early read</em>' : ''}</span>
        <span class="xh-bar" aria-hidden="true"><i style="width:${Math.round(got / of * 100)}%"></i></span></li>`;
    }).join('');
    const items = r.qs.map((q, i) => `<details class="q-recap xh-item ${s.ok[i] ? 'ok' : 'bad'}" data-ok="${s.ok[i] ? 1 : 0}">
      <summary><span class="xh-mk" aria-label="${s.ok[i] ? 'Right' : 'Wrong'}">${s.ok[i] ? '✓' : '✗'}</span><span class="qr-lbl">Q${i + 1}${r.flags[i] ? ' ⚑' : ''}</span><span class="qr-peek">${U.esc(q.q)}</span></summary>
      <div class="qr-body">${q.ev ? `<pre class="q-ev">${U.esc(q.ev)}</pre>` : ''}<p class="q-q">${U.esc(stem(q))}</p>${recapOf(q, r.ans[i], r.ord[i])}
      <div class="why"><p>${U.esc(q.why || '')}</p></div>${q.doc ? `<p class="small xh-doc"><a href="${U.esc(q.doc)}" target="_blank" rel="noopener noreferrer">AWS docs ↗</a></p>` : ''}</div></details>`).join('');
    const missed = s.ok.filter(x => !x).length;
    const b = draw(`<div class="q-ctx">${U.esc(E.cfg(m.exam).name)} · ${U.esc(formName(m.form))}</div>
      ${m.practice ? '<p class="xh-practice">Practice: from the bank, questions you haven\'t answered first</p>' : ''}
      ${m.timedOut ? '<p class="warn small">Time ran out, so the exam was submitted as it stood.</p>' : ''}
      <div class="xh-score ${pass ? 'pass' : 'fail'}"><span class="xh-big">${est}</span><span class="xh-of">/ 1000 <em>estimate</em></span>
        <span class="verdict ${pass ? 'ok' : 'bad'}">${pass ? 'PASS' : 'NOT YET'}</span></div>
      <p class="small">${m.right} of ${m.n} right (${Math.round(pct * 100)}%). The pass line is ${PASS}. The real exam scales its score, so this is a rough read, not a promise.</p>
      <p class="small">Time used: ${clock(Math.round(m.mins * MIN))} of ${clock(limitFor(m.full))}</p>
      <div class="q-ctx">By domain</div><ul class="xh-doms">${doms}</ul>
      ${missed ? `<p class="small">${missed} missed question${missed === 1 ? '' : 's'} went up on your wall for review.</p>` : ''}
      <div class="xh-rh"><div class="q-ctx">Every question</div><label class="small"><input type="checkbox" id="xh-missed"> Missed only</label></div>
      <div class="xh-items">${items}</div>
      <div class="q-foot xh-foot"><button class="primary" id="xh-done">Done</button></div>`);
    b.querySelector('#xh-missed').onchange = e => b.querySelectorAll('.xh-item').forEach(d => { d.hidden = e.target.checked && d.dataset.ok === '1'; });
    b.querySelector('#xh-done').onclick = () => finish(m);
  }

  // ---- Keys on a laptop: 1-6 pick an option, arrows move, F flags ----
  function onKey(e) {
    if (!run || view !== 'q' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, select')) return;
    const k = e.key;
    let hit = true;
    if (/^[1-6]$/.test(k)) { const ord = run.ord[run.at], p = +k - 1; if (p < ord.length) choose(ord[p]); }
    else if (k === 'ArrowRight') { if (run.at < run.qs.length - 1) go(run.at + 1); else review(); }
    else if (k === 'ArrowLeft') go(run.at - 1);
    else if (k === 'f' || k === 'F') flag();
    else hit = false;
    // Captured on document, so walkable chapter scenes underneath don't also get the arrows.
    if (hit) { e.preventDefault(); e.stopPropagation(); }
  }

  function finish(m) {
    clearInterval(tick); tick = null;
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pagehide', onHide);
    U.closePanel();
    body = null; view = null;
    const d = done; done = null;
    if (d) d(m || null);
  }
  function onHide() { pause(); persist(); }

  // open(form?): form is 'half', 'A' or 'B', or null for a practice mock; left out, the next form not taken yet.
  // Resolves with the mock record, or null if you leave before submitting.
  let pending = null;
  H.open = function (form) {
    if (done) return pending;
    pending = new Promise(resolve => {
      done = resolve;
      shell();
      document.addEventListener('visibilitychange', onVis);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('pagehide', onHide);
      clearInterval(tick); tick = setInterval(onTick, 1000);
      const p = S().save.examInProgress;
      if (p && p.ids && p.ids.length) offer(p, form);
      else {
        const m = E.mockFor(form);
        if (!m.qs.length) { draw('<p>No questions are available for a mock right now.</p><div class="q-foot xh-foot"><button class="primary" id="xh-done">Close</button></div>').querySelector('#xh-done').onclick = () => finish(null); return; }
        intro(m);
      }
    });
    return pending;
  };
  H.active = () => !!run;

  // Tests: answer every question, the first fractionRight of them right, the rest wrong, and show the review screen.
  H._debugAnswerAll = function (fractionRight) {
    if (!run) return 0;
    const n = run.qs.length, good = Math.round(n * (fractionRight == null ? 1 : fractionRight));
    run.qs.forEach((q, i) => {
      const ok = i < good;
      if (q.type === 'mc') run.ans[i] = ok ? q.a : (q.a + 1) % q.opts.length;
      else {
        const right = q.items.map((it, k) => it.ok ? k : -1).filter(k => k >= 0), wrong = q.items.map((it, k) => it.ok ? -1 : k).filter(k => k >= 0);
        run.ans[i] = (ok || !wrong.length ? right : right.slice(0, -1).concat(wrong[0])).sort((x, y) => x - y);
      }
    });
    persist();
    review();
    return n;
  };
})();
