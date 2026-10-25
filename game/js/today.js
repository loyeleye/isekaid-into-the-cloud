// The Today card (ExamPrepDemo, Oct 23): the daily front door on the title screen, after PRESS START.
// One short practice set a day for the chosen exam, DVA-C02 or SAA-C03 (S.save.todaySet), readiness by domain, the
// wall of misses (S.save.wall) and the next mock. Its exam settings pick the exam, the date and the switch; with no
// date or exam prep off, the card only offers them, and the game mixes both exams' questions (js/exam.js). Kyu leaves it as a sticky note until Uptima joins the camp (chapter 2, part 2), then she hosts it.
// main.js calls SD.today.mount(started) from the title. Mocks are the Exam Hall's (SD.examHall.open, if loaded).
(function () {
  const T = SD.today = {};
  const S = SD.state, U = SD.ui, E = () => SD.exam;
  const DAY = 86400000;
  const XP = 20, SHARDS = 5;             // one won fight (js/run.js rewards: a normal fight)
  const PASS = 0.8;                      // a tape for 80% or better, once a day
  // Suggested mocks for a Nov 30 exam planned from Oct 20 (the study plan's start): days before the exam, scaled to
  // other dates by the plan's length.
  const PLAN_FROM = '2026-10-20', REF_SPAN = 41, MOCK_AT = [['half', 35], ['A', 15], ['B', 6]];
  const FORM_NAME = { half: 'The baseline', A: 'Mock A', B: 'Mock B' };
  const TITLE = { daily: 'TODAY\'S SET', drill: 'DOMAIN DRILL', wall: 'THE WALL' };

  const sv = () => S.save;
  const today = () => new Date().toDateString();
  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const isoDay = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const calDays = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY);
  const qlog = () => (sv().qlog = sv().qlog || {});
  const wall = () => (Array.isArray(sv().wall) ? sv().wall : (sv().wall = []));
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const esc = s => U.esc(s);

  // ---- Numbers ----
  T.daysLeft = () => calDays(Date.now(), isoDay(E().date()));
  T.uptima = function () {
    const s = sv();
    return !!(s.flags && s.flags.uptima) || !!(s.c2x && s.c2x.f && s.c2x.f.uptima) || ['c3', 'c4', 'c5', 'c6'].some(k => s[k]);
  };
  T.mockDates = function () {
    const ex = isoDay(E().date());
    let from = isoDay(PLAN_FROM);
    if (from >= ex || ex - from > 120 * DAY) from = ex - REF_SPAN * DAY;
    const span = Math.round((ex - from) / DAY);
    return MOCK_AT.map(([form, d]) => ({ form, t: ex - Math.max(1, Math.round(d * span / REF_SPAN)) * DAY }));
  };
  T.nextMock = function () {
    const f = E().nextForm();
    const m = f && T.mockDates().find(x => x.form === f);
    return m ? { form: f, t: m.t, days: calDays(Date.now(), m.t) } : null;
  };
  const examStyle = q => q && (q.type === 'mc' || q.type === 'multi');
  // Reviewable concepts on the chosen exam that have exam-style questions.
  function trackConcepts() {
    return Object.keys(SD.concepts).filter(id => S.reviewable(id) && E().isTrackConcept(id) && S.questionsFor(id).some(examStyle));
  }
  const isDue = id => { const c = sv().concepts[id]; return !!(c && c.seen && c.due <= Date.now()); };
  T.dueList = () => trackConcepts().filter(isDue);

  // How much a domain needs work, 0..1: the latest mock's score, else review accuracy, else unknown (0.5).
  function score(d) {
    const m = E().lastMock(), dm = m && m.dom && m.dom[d];
    if (dm && dm[1] >= 3) return dm[0] / dm[1];
    const r = E().reviewAccuracy()[d];
    return r && r[1] >= 5 ? r[0] / r[1] : 0.5;
  }
  function needs() {
    const out = {};
    [1, 2, 3, 4].forEach(d => { out[d] = E().WEIGHTS[d] * (1.6 - score(d)); });
    out[0] = 0.05;
    return out;
  }
  // n picks from list without replacement, each by weight w(x).
  function weighted(list, w, n) {
    const pool = list.map(x => ({ x, w: Math.max(1e-4, w(x)) })), out = [];
    while (out.length < n && pool.length) {
      let r = Math.random() * pool.reduce((a, p) => a + p.w, 0), i = 0;
      while (i < pool.length - 1 && (r -= pool[i].w) > 0) i++;
      out.push(pool.splice(i, 1)[0].x);
    }
    return out;
  }
  const shuffle = a => SD.quiz.shuffle(a);

  // A concept's next exam-style question: never asked first, then the one asked longest ago.
  function pickQ(c, used) {
    const all = S.questionsFor(c).filter(q => q.id && E().allowed(q) && !used.has(q.id));
    const list = all.filter(examStyle).length ? all.filter(examStyle) : all.filter(q => q.type !== 'explain');
    if (!list.length) return null;
    if (E().isTaskConcept(c)) return E().pickTask(list);
    const log = qlog(), t = q => (log[q.id] ? log[q.id][0] : 0) + Math.random() * DAY;
    return list.slice().sort((a, b) => t(a) - t(b))[0];
  }
  // The concept a bank question records under when asked on its own (the wall): its own, else its exam task's.
  function conceptOf(q) {
    if (q.c && SD.concepts[q.c]) return q.c;
    const t = E().taskOf(q);
    return t ? E().taskConcept(String(t)) : null;
  }
  function resolve(it) {
    let q = null;
    if (it.c && SD.concepts[it.c]) q = S.questionsFor(it.c).find(x => x.id === it.q);
    if (!q) { const b = E().find(it.q); if (b) q = Object.assign({}, b, { c: it.c && SD.concepts[it.c] ? it.c : conceptOf(b) }); }
    return q && q.c ? q : null;
  }

  // ---- Building sets ----
  // Two thirds due concepts on the exam (any reviewable one when not enough are due), one third questions never
  // answered from the exam-task concepts, weighted toward the weakest domains and the exam's weights.
  T.build = function (n, light) {
    const N = needs(), log = qlog(), used = new Set(), items = [];
    if (!light) {
      const fresh = [];
      Object.keys(E().TASKS).forEach(t => E().taskQuestions(E().taskConcept(t)).forEach(q => { if (!log[q.id] && examStyle(q)) fresh.push(q); }));
      weighted(fresh, q => N[E().domainOf(q)] || N[0], Math.round(n / 3)).forEach(q => { items.push({ c: q.c, q: q.id, fresh: 1 }); used.add(q.id); });
    }
    const all = trackConcepts(), due = all.filter(isDue), want = n - items.length;
    const w = id => (N[E().conceptDomain(id)] || N[0]);
    let cs = weighted(due, w, want);
    if (cs.length < want) cs = cs.concat(weighted(all.filter(id => !cs.includes(id)), id => w(id) * (isDue(id) ? 2 : 1), want - cs.length));
    cs.forEach(c => { const q = pickQ(c, used); if (q) { items.push({ c, q: q.id }); used.add(q.id); } });
    return shuffle(items);
  };
  T.size = () => (window.innerWidth >= 900 ? 25 : 15);
  function newDaily(light) {
    const n = light ? 10 : T.size();
    return (sv().todaySet = { day: today(), kind: 'daily', items: T.build(n, light), i: 0, right: 0, base: 0, paid: false, light: !!light });
  }
  // Today's set, if one was started today.
  T.set = () => { const s = sv().todaySet; return s && s.day === today() && Array.isArray(s.items) ? s : null; };
  function drillSet(d) {
    const pool = trackConcepts().filter(id => E().conceptDomain(id) === d), used = new Set(), items = [];
    for (let pass = 0; pass < 3 && items.length < 10 && pool.length; pass++) {
      S.pickConcepts(10 - items.length, pool).forEach(c => { const q = pickQ(c, used); if (q && items.length < 10) { items.push({ c, q: q.id }); used.add(q.id); } });
    }
    return { kind: 'drill', dom: d, items: shuffle(items), i: 0, right: 0 };
  }
  function wallSet() {
    // Only the chosen exam's posters (and untagged ones): the other exam's wait on the wall until you switch back.
    const mine = w => { const q = E().find(w.id); return !q || !E().offTrack(q); };
    const items = wall().filter(mine).sort((a, b) => a.t - b.t).slice(0, 10).map(w => ({ q: w.id, wall: 1 })).filter(it => resolve(it));
    return { kind: 'wall', items, i: 0, right: 0 };
  }

  // ---- The wall ----
  const days = rights => new Set((rights || []).map(t => new Date(t).toDateString())).size;
  T.wallNote = function (qid, ok) {
    const list = wall(), k = list.findIndex(w => w.id === qid);
    if (k < 0) return null;
    const w = list[k];
    if (!ok) { w.rights = []; return 'reset'; }
    w.rights = (w.rights || []).concat(Date.now());
    if (days(w.rights) >= 2) { list.splice(k, 1); return 'down'; }
    return 'up';
  };
  T.wallAdd = function (qid) {
    const w = wall().find(x => x.id === qid);
    if (w) w.rights = []; else wall().push({ id: qid, t: Date.now(), rights: [] });
  };

  // ---- Running a set ----
  let live = null, watcher = null;
  T.current = () => (live ? live.q : null);
  // The progress count and Stop for now, in the quiz window's title bar while a set runs.
  function bar() {
    if (!live) return;
    const h = document.querySelector('#panel .win.quiz .win-h');
    if (!h || h.querySelector('#td-stop')) return;
    const s = live.set, el = document.createElement('span');
    el.className = 'td-qbar';
    el.innerHTML = `<b class="td-prog">${Math.min(s.i + 1, s.items.length)} / ${s.items.length}</b><button class="td-stop" id="td-stop">Stop for now</button>`;
    h.appendChild(el);
    el.querySelector('#td-stop').onclick = T.stop;
  }
  function settle(s, it, ok, conf) {
    it.ok = ok ? 1 : 0; if (conf != null) it.conf = conf;
    if (ok) s.right++;
    const note = T.wallNote(it.q, ok);
    // Sure and wrong goes up on the wall.
    if (!ok && conf === 2 && s.kind !== 'wall') T.wallAdd(it.q);
    if (note === 'down') U.system('POSTER DOWN', 'Right on two different days. It comes off the wall.', 'gold');
    s.i++;
    if (s.kind === 'daily') sv().todayLast = today();
    S.persist();
  }
  async function run(s) {
    const tok = {};
    live = { set: s, tok, q: null };
    if (!watcher && window.MutationObserver) { watcher = new MutationObserver(bar); watcher.observe(document.querySelector('#panel'), { childList: true }); }
    while (s.i < s.items.length) {
      const it = s.items[s.i], q = resolve(it);
      if (!q) { s.items.splice(s.i, 1); continue; }
      S.seeConcept(q.c);
      live.q = q; live.t0 = Date.now();
      const name = SD.concepts[q.c] ? SD.concepts[q.c].name : E().NAME;
      const r = await SD.quiz.ask(q, { title: TITLE[s.kind], context: `${name} · ${s.i + 1}/${s.items.length}`, noSwap: true });
      if (!live || live.tok !== tok) return;
      settle(s, it, r.ok, r.conf);
    }
    live = null;
    finish(s);
  }
  // Stop for now: an answer already committed counts; the rest waits for the next open.
  T.stop = function () {
    if (!live) return;
    const s = live.set, q = live.q, it = s.items[s.i], l = q && qlog()[q.id];
    const h = q && sv().concepts[q.c] && sv().concepts[q.c].hist.slice(-1)[0];
    if (it && l && l[0] >= live.t0) settle(s, it, !!l[1], h && h.t >= live.t0 ? h.conf : null);
    live = null;
    U.closePanel();
    S.persist();
    T.render();
  };
  function pay(s) {
    s.paid = true; s.base = s.items.length;
    if (SD.run && SD.run.gainXp) SD.run.gainXp(XP); else S.addXp(XP);
    sv().shards = (sv().shards | 0) + SHARDS;
    let tape = '';
    if (s.right / s.base >= PASS && SD.tapes) {
      SD.tapes.count();
      // Its own day marker: S.save.tapes.day is the tape shop's "used today", and the set shouldn't close the shop.
      if (sv().todayTapeDay !== today()) {
        sv().todayTapeDay = today();
        SD.tapes.add(1, 'TAPE EARNED', `${s.right} of ${s.base} on today's set.`);
        tape = ' · +1 tape';
      }
    }
    S.persist();
    return `+${XP} XP · +${SHARDS} shards${tape}`;
  }
  function finish(s) {
    let h, more = false;
    if (s.kind === 'daily') {
      const first = !s.paid, got = first ? pay(s) : 'Extra practice: no pay, all learning.';
      h = `<p class="td-big">${s.right} of ${s.items.length} right.</p><p>${esc(got)}</p>`;
      more = true;
    } else if (s.kind === 'drill') {
      h = `<p class="td-big">${s.right} of ${s.items.length} right.</p><p class="muted small">Domain ${s.dom}: ${esc(E().DOMAINS[s.dom])}.</p>`;
    } else {
      h = `<p class="td-big">${s.right} of ${s.items.length} right.</p><p class="muted small">${plural(wall().length, 'poster')} still up. Each comes down after two right answers on different days.</p>`;
    }
    const b = U.panel(`${h}<div class="row">${more ? '<button class="primary" id="td-again">+10 more</button>' : ''}<button class="ghost" id="td-done">Done</button></div>`, { title: TITLE[s.kind], onClose: T.render });
    b.querySelector('#td-done').onclick = () => { U.closePanel(); T.render(); };
    const m = b.querySelector('#td-again'); if (m) m.onclick = T.more;
    S.persist();
    T.render();
  }
  T.more = function () {
    const s = T.set();
    if (!s) return T.start();
    const used = new Set(s.items.map(it => it.q));
    s.items.push(...T.build(10).filter(it => !used.has(it.q)));
    U.closePanel();
    run(s);
  };
  T.start = function (light) {
    U.closePanel();
    const s = T.set() && T.set().i < T.set().items.length ? T.set() : newDaily(light);
    S.persist();
    run(s);
  };
  T.drill = d => { U.closePanel(); const s = drillSet(d); if (s.items.length) run(s); else T.render(); };
  T.drillWall = () => { U.closePanel(); const s = wallSet(); if (s.items.length) run(s); else T.render(); };

  // ---- Panels ----
  const NOTE = {
    DVA: 'DVA-C02\'s last day is Nov 30, 2026; DVA-C03 starts Dec 1.',
    SAA: 'SAA-C03 has no announced last day.'
  };
  // Exam settings: which exam, its date, and exam prep on or off. Clearing the date goes back to the standard game.
  T.datePicker = function () {
    const tr = E().track(), on = sv().examMode !== false;
    const opt = t => `<label class="td-pick"><input type="radio" name="td-track" value="${t}" ${t === tr ? 'checked' : ''}><span><b>${esc(E().TRACKS[t].name)}</b> ${esc(E().TRACKS[t].title)}</span></label>`;
    const b = U.panel(`<p>Which exam are you preparing for?</p>
      <div class="td-picks" role="radiogroup" aria-label="Exam">${opt('DVA')}${opt('SAA')}</div>
      <label class="td-date"><span>Exam date</span><input type="date" id="td-date-in" value="${esc(E().date())}"></label>
      <p class="muted small" id="td-note">${esc(NOTE[tr])}</p>
      <label class="td-pick"><input type="checkbox" id="td-mode" ${on ? 'checked' : ''}><span><b>Exam prep</b> Only this exam's questions, with every review spaced to land before the date.</span></label>
      <p class="muted small">With no date set, or exam prep off, the game asks both exams' questions, paced by the story.</p>
      <div class="row">${E().hasDate() ? '<button class="ghost" id="td-date-clear">Clear date</button>' : ''}<button class="primary" id="td-date-ok">Save</button></div>`, { title: 'EXAM SETTINGS', onClose: T.render });
    const pick = () => (b.querySelector('input[name="td-track"]:checked') || {}).value || tr;
    b.querySelectorAll('input[name="td-track"]').forEach(r => r.onchange = () => {
      const t = pick();
      b.querySelector('#td-note').textContent = NOTE[t];
      if (!E().hasDate()) b.querySelector('#td-date-in').value = E().TRACKS[t].DEFAULT_DATE || E().suggestDate();
    });
    b.querySelector('#td-date-ok').onclick = () => {
      const iso = b.querySelector('#td-date-in').value;
      if (iso && !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      E().setTrack(pick());
      if (iso) E().setDate(iso); else E().clearDate();
      E().setMode(b.querySelector('#td-mode').checked);
      U.closePanel(); T.render();
    };
    const c = b.querySelector('#td-date-clear');
    if (c) c.onclick = () => { E().clearDate(); U.closePanel(); T.render(); };
  };
  // Seen X of N: questions on the chosen exam answered at least once, of every one reviews can reach.
  T.seen = function () {
    const ids = new Set();
    (SD.questions || []).forEach(q => { if (q.id && E().inTrack(q) && !E().isHeld(q) && q.type !== 'explain') ids.add(q.id); });
    Object.keys(E().TASKS).forEach(t => E().taskQuestions(E().taskConcept(t)).forEach(q => ids.add(q.id)));
    const log = qlog();
    return { x: [...ids].filter(id => log[id]).length, n: ids.size };
  };
  T.board = function () {
    const m = E().lastMock(), acc = E().reviewAccuracy(), pooled = { 1: 0, 2: 0, 3: 0, 4: 0 };
    E().mocks().filter(x => x.done && x.dom).forEach(x => [1, 2, 3, 4].forEach(d => { pooled[d] += (x.dom[d] || [0, 0])[1]; }));
    const seen = T.seen();
    const rows = [1, 2, 3, 4].map(d => {
      const dm = m && m.dom && m.dom[d], a = acc[d];
      const main = dm ? `${dm[0]} of ${dm[1]}` : 'No mock yet';
      const early = pooled[d] < 10 ? ' <span class="td-early">early read</span>' : '';
      const rev = a[1] ? `Reviews: ${Math.round(a[0] / a[1] * 100)}% of ${a[1]} in 21 days` : 'Reviews: none in 21 days';
      return `<button class="opt td-dom" data-d="${d}"><span class="td-dn">${d}. ${esc(E().DOMAINS[d])} <span class="muted small">${Math.round(E().WEIGHTS[d] * 100)}%</span></span>
        <span class="td-ds"><b>${main}</b>${early}</span><span class="muted small td-dr">${rev} · tap for 10</span></button>`;
    }).join('');
    const pct = seen.n ? Math.round(seen.x / seen.n * 100) : 0;
    const b = U.panel(`<p class="td-head">Reviews: what feels true · Mock: what is true</p>
      <div class="opts">${rows}</div>
      <div class="td-seen"><span>Seen ${seen.x} of ${seen.n} ${esc(E().NAME)} questions</span><div class="bar"><i style="width:${pct}%;background:var(--mint)"></i></div></div>`, { title: 'READINESS', onClose: T.render });
    b.querySelectorAll('[data-d]').forEach(el => el.onclick = () => T.drill(+el.dataset.d));
  };
  T.wallPanel = function () {
    const list = wall().slice().sort((a, b) => a.t - b.t);
    const clip = t => (t.length > 110 ? t.slice(0, 108).replace(/\s+\S*$/, '') + '…' : t);
    const rows = list.map(w => {
      const q = E().find(w.id);
      return `<li class="td-poster"><span>${esc(q ? clip(q.q) : w.id)}</span><span class="muted small">Up since ${new Date(w.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${days(w.rights)} of 2 right days</span></li>`;
    }).join('');
    const b = U.panel(`<p class="td-head">The only honest posters in the Cloud</p>
      ${list.length ? `<ul class="td-wall">${rows}</ul>` : '<p class="muted">Nothing on the wall. Mock misses and sure-but-wrong answers go up here.</p>'}
      <p class="muted small">A poster comes down after two right answers on different days.</p>
      <div class="row">${list.length ? '<button class="primary" id="td-wall-go">Drill the wall</button>' : ''}</div>`, { title: 'THE WALL', onClose: T.render });
    const g = b.querySelector('#td-wall-go'); if (g) g.onclick = T.drillWall;
  };
  function hall(form) {
    if (!SD.examHall || !SD.examHall.open) { U.system('EXAM HALL', 'Exam Hall coming soon.'); return; }
    Promise.resolve(SD.examHall.open(form)).catch(() => {}).then(() => T.render());
  }

  // ---- The card ----
  const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const word = n => { const w = n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n); return w[0].toUpperCase() + w.slice(1); };
  // The card's state: first, off, eve, mock, resume, done, back, due.
  T.state = function () {
    const s = sv(), set = T.set(), left = T.daysLeft();
    if (!E().hasDate()) return 'first';
    if (s.examMode === false) return 'off';
    if (!E().lastMock() && E().nextForm() === 'half' && !s.todayLast && !set && !s.todaySkip) return 'first';
    if (set && set.i < set.items.length && set.i > 0) return 'resume';
    if (set && set.i >= set.items.length) return 'done';
    if (left === 0 || left === 1) return 'eve';
    const nm = T.nextMock();
    if (nm && nm.days <= 0 && left > 0) return 'mock';
    if (s.todayLast && calDays(new Date(s.todayLast).getTime(), Date.now()) >= 2) return 'back';
    return 'due';
  };
  function lines(st, n) {
    const up = T.uptima(), nm = T.nextMock(), mockName = nm ? FORM_NAME[nm.form] : '';
    const mockIn = nm ? (nm.days <= 0 ? `${mockName} today` : `${mockName} in ${plural(nm.days, 'day')}`) : '';
    if (!up) {
      return {
        first: 'When\'s the exam? Write it down. — K.',
        off: 'Exam prep is off. The story asks both exams. Fine. — K.',
        base: 'Thirty-three questions. Find out what you don\'t know. — K.',
        due: `${n.due} due · ${n.wall} on the wall${mockIn ? ' · ' + mockIn : ''}. Test them. — K.`,
        resume: `${n.done} of ${n.total} done. Finish it. — K.`,
        done: 'Done. Don\'t redo it. Sleep. — K.',
        mock: `${mockName} today. Untested is broken. — K.`,
        back: 'You were gone. Fine. Start with today\'s set. — K.',
        eve: T.daysLeft() === 0 ? 'Today. You tested it. Go. — K.' : 'Light review. Sleep beats cramming. — K.'
      }[st];
    }
    const pile = n.due >= 30 ? `${word(n.due)}? I had ten thousand years of these. Start with the top one.`
      : n.due ? `${plural(n.due, 'prayer')} waiting for an answer. I read mine at night. You read yours now.`
        : 'No prayers waiting. Suspicious. Read the wall.';
    return {
      first: 'When is your trial? Tell me the day and I\'ll count down. I\'m good at waiting.',
      off: 'No trial on the calendar for now. The story still asks both kinds of prayer.',
      base: 'Thirty-three questions first. Even gods get audited.',
      due: pile,
      resume: `${n.done} of ${n.total} answered. The rest are still praying.`,
      done: 'Answered, all of them. I\'d bless you, but I\'m out of grants.',
      mock: `${mockName} today. I was tested once. Do better than I did.`,
      back: 'You were away. I was away ten thousand years. Start with today\'s set.',
      eve: T.daysLeft() === 0 ? 'Today. Read the stem twice. You\'ve done the work.' : 'Light review tonight. Sleep beats cramming. Even I napped.'
    }[st];
  }
  T.render = function () {
    const card = document.querySelector('#today-card');
    if (!card || card.hidden) return;
    const s = sv(), set = T.set(), st = T.state(), up = T.uptima();
    const n = { due: T.dueList().length, wall: wall().length, done: set ? set.i : 0, total: set ? set.items.length : T.size() };
    const nm = T.nextMock(), left = T.daysLeft(), hasHall = !!(SD.examHall && SD.examHall.open);
    const ex = new Date(isoDay(E().date())).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const chip = !E().hasDate() ? 'No exam date' : st === 'off' ? `${E().NAME} · prep off`
      : `${E().NAME} · ${ex} · ${left > 0 ? plural(left, 'day') : left === 0 ? 'today' : 'done'}`;
    const base = st === 'first' && E().hasDate();
    let main, line = lines(base ? 'base' : st, n), extra = '', alt = '';
    if (st === 'first' && !base) {
      const tr = E().track(), opt = t => `<option value="${t}" ${t === tr ? 'selected' : ''}>${esc(E().TRACKS[t].name)}</option>`;
      extra = `<label class="td-date"><span>Exam</span><select id="td-track-first">${opt('DVA')}${opt('SAA')}</select></label>
        <label class="td-date"><span>Exam date</span><input type="date" id="td-date-first" value="${esc(E().date())}"></label>`;
      main = ['td-setdate', 'Set my exam date'];
    } else if (st === 'off') {
      main = ['td-on', `Turn exam prep on · ${E().NAME}`];
    } else if (base) {
      main = ['td-base', 'Take the 33-question baseline'];
      alt = `<button class="td-link" id="td-skip">Start today's set instead</button>`;
      if (!hasHall) extra = '<p class="td-soon">Exam Hall coming soon</p>';
    } else if (st === 'mock') {
      main = ['td-mock', nm.form === 'half' ? 'Take the 33-question baseline' : `Sit ${FORM_NAME[nm.form]} (65 questions)`];
      alt = `<button class="td-link" id="td-go">Today's set instead</button>`;
      if (!hasHall) extra = '<p class="td-soon">Exam Hall coming soon</p>';
    } else if (st === 'eve') main = ['td-light', 'Light review · 10'];
    else if (st === 'resume') main = ['td-go', `Resume · ${set.i} / ${set.items.length}`];
    else if (st === 'done') main = ['td-more', '+10 more'];
    else main = ['td-go', `Start today's set · ${T.size()}`];
    const nums = st === 'first' || st === 'off' ? ['Both exams in the story'] : [`${n.due} due`, `${n.wall} on the wall`];
    if (nm && st !== 'first' && st !== 'off') nums.push(nm.days <= 0 ? `${FORM_NAME[nm.form]} today` : `${FORM_NAME[nm.form]} in ${plural(nm.days, 'day')}`);
    if (set && st !== 'resume') nums.push(`today ${set.i} / ${set.items.length}`);
    card.className = 'td-card ' + (up ? 'td-uptima' : 'td-kyu');
    card.dataset.state = st;
    card.innerHTML = `<div class="td-top"><span class="td-who">${up ? 'Uptima' : 'A note from Kyu'}</span><button class="td-chip" id="td-date" aria-label="Exam date: ${esc(chip)}. Change it">${esc(chip)}</button></div>
      <p class="td-line">${esc(line).replace(/ — K\.$/, '\u00a0—\u00a0K.')}</p>
      <div class="td-nums">${nums.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      ${extra}
      <button class="primary td-main" id="${main[0]}">${esc(main[1])}</button>
      <div class="td-links">${alt}${st === 'first' || st === 'off' ? '<button class="td-link" id="td-settings">Exam settings</button>'
        : `${!nm && hasHall && st !== 'mock' ? '<button class="td-link" id="td-practice">Practice mock</button>' : ''}<button class="td-link" id="td-ready">Readiness</button><button class="td-link" id="td-wallb">Wall (${n.wall})</button>`}</div>`;
    const on = (id, f) => { const el = card.querySelector('#' + id); if (el) el.onclick = f; };
    on('td-date', T.datePicker);
    on('td-setdate', () => {
      E().setTrack(card.querySelector('#td-track-first').value);
      if (E().setDate(card.querySelector('#td-date-first').value)) { if (sv().examMode === false) E().setMode(true); T.render(); }
    });
    const tf = card.querySelector('#td-track-first');
    if (tf) tf.onchange = () => { card.querySelector('#td-date-first').value = E().TRACKS[tf.value].DEFAULT_DATE || E().suggestDate(); };
    on('td-on', () => { E().setMode(true); T.render(); });
    on('td-settings', T.datePicker);
    on('td-practice', () => hall());
    on('td-base', () => hall('half'));
    on('td-skip', () => { s.todaySkip = true; S.persist(); T.start(); });
    on('td-mock', () => hall(nm.form));
    on('td-go', () => T.start());
    on('td-light', () => T.start(true));
    on('td-more', T.more);
    on('td-ready', T.board);
    on('td-wallb', T.wallPanel);
  };
  // From the title: hidden on the press-start screen, shown above Continue and New game after it.
  T.mount = function (started) {
    const box = document.querySelector('#title-actions');
    if (!box) return;
    let card = document.querySelector('#today-card');
    if (!card) {
      card = document.createElement('section');
      card.id = 'today-card';
      box.parentNode.insertBefore(card, box);
    }
    card.hidden = !started;
    document.querySelector('#screen-title').classList.toggle('has-today', !!started);
    if (started) T.render();
  };

  const css = document.createElement('style');
  css.textContent = `
    #screen-title.has-today { overflow-x: hidden; overflow-y: auto; justify-content: safe center; padding-top: calc(12px + env(safe-area-inset-top, 0px)); padding-bottom: 6vh; }
    #screen-title.has-today .logo { font-size: clamp(34px, 9.5vw, 86px); margin-top: 8px; }
    #screen-title.has-today #title-actions { margin-top: 14px; }
    /* Short landscape phones: the title on the left over the four on the ridge, Kyu's note and the buttons on the
       right, so New game is on screen without scrolling. */
    @media (orientation: landscape) and (max-height: 420px) {
      #screen-title.has-today { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 400px); grid-template-rows: auto auto auto; column-gap: 20px; row-gap: 8px; align-content: safe center; justify-items: center; padding-top: calc(8px + env(safe-area-inset-top, 0px)); padding-bottom: 8px; }
      #screen-title.has-today .t-ribbon { grid-area: 1 / 1; align-self: end; }
      #screen-title.has-today .logo { grid-area: 2 / 1; align-self: start; font-size: min(14vh, 6.5vw); margin-top: 6px; }
      #screen-title.has-today #today-card { grid-area: 1 / 2 / 3 / 3; margin: 0; }
      #screen-title.has-today #title-actions { grid-area: 3 / 2; margin-top: 0; gap: 8px; flex-wrap: nowrap; }
      #screen-title.has-today #title-actions button { font-size: 15px; padding-inline: 14px; white-space: nowrap; }
      #screen-title.has-today .snd { right: auto; left: max(16px, env(safe-area-inset-left, 0px)); }
      #screen-title.has-today .t-halo { width: min(30vw, 200px); }
      #screen-title.has-today :is(.t-foot, .pcl.near) { display: none; }
      #screen-title.has-today :is(.t-leads, .t-halo) { left: calc(max(16px, env(safe-area-inset-left, 0px)) + (100% - 452px) / 2); }
      #screen-title.has-today .td-line { margin: 6px 0 4px; }
      #screen-title.has-today .td-nums { margin-bottom: 6px; }
      #screen-title.has-today .td-date { margin-bottom: 6px; }
    }
    .td-card { position: relative; z-index: 2; width: min(440px, 100%); margin: 14px auto 0; padding: 12px 14px 10px; text-align: left; border-radius: 6px; flex: none; }
    .td-kyu { background: #ffe97a; color: #2b2340; border: 2px solid #0c0a10; box-shadow: 0 4px 0 #0c0a10, 0 10px 24px rgba(0,0,0,.45); transform: rotate(-.6deg); }
    .td-uptima { background: linear-gradient(180deg, #2d2838, #221e2b); color: #ece4d2; border: 2px solid #d6b254; border-radius: 12px; box-shadow: 0 0 18px rgba(214,178,84,.25), 0 4px 0 #0c0a10; }
    .td-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .td-who { font: 700 12px/1.2 var(--f-head); letter-spacing: .1em; text-transform: uppercase; opacity: .8; }
    .td-uptima .td-who { color: #e0b453; opacity: 1; }
    /* The chip and the links are 44px to tap, drawn and laid out at their old size (the pill is the ::before). */
    .td-chip { position: relative; font: 700 12px/1 var(--f-body); padding: 6px 12px; min-height: 44px; margin: -7px 0; border: 0; background: transparent; white-space: nowrap; }
    .td-chip::before { content: ""; position: absolute; inset: 7px 0; border: 2px solid currentColor; border-radius: 20px; pointer-events: none; }
    .td-line { margin: 8px 0 6px; font: 600 16px/1.35 var(--f-head); }
    .td-kyu .td-line { font: italic 700 17px/1.35 var(--f-body); }
    .td-nums { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; font-weight: 700; opacity: .85; margin-bottom: 10px; }
    .td-main { width: 100%; font-size: 16px !important; }
    .td-uptima .td-main { background: #d6b254 !important; color: #1b1722 !important; border-color: #0c0a10; }
    .td-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 14px; margin-top: 6px; }
    .td-link { background: none; border: 0; padding: 8px 4px; min-height: 44px; margin: -4px 0; font: 700 13px/1 var(--f-body); text-decoration: underline; text-underline-offset: 3px; }
    .td-date { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; font-weight: 700; font-size: 14px; }
    .td-picks { display: grid; gap: 6px; margin: 0 0 10px; }
    .td-pick { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 8px; background: #fff; cursor: pointer; margin: 0 0 8px; }
    .td-pick input { margin-top: 3px; width: 18px; height: 18px; flex: none; }
    .td-pick b { display: block; }
    .td-date select { flex: 1; min-width: 0; font: 600 15px var(--f-body); padding: 6px 8px; border: 2px solid #2b2340; border-radius: 8px; background: #fff; color: #2b2340; }
    .td-date input { flex: 1; min-width: 0; font: 600 15px var(--f-body); padding: 6px 8px; border: 2px solid #2b2340; border-radius: 8px; background: #fff; color: #2b2340; }
    .td-soon { margin: 0 0 8px; font-size: 12px; font-weight: 700; opacity: .8; }
    .td-qbar { display: flex; align-items: center; gap: 8px; margin-left: auto; }
    .td-prog { font: 700 14px var(--f-body); white-space: nowrap; }
    .td-stop { background: #fff; color: var(--ink); border: 2px solid var(--ink); border-radius: 14px; padding: 3px 10px; font: 700 12px var(--f-body); white-space: nowrap; }
    .td-big { font: 700 22px var(--f-head); margin: 0 0 6px !important; }
    .td-head { font-weight: 800; }
    .td-dom { display: flex; flex-direction: column; gap: 2px; }
    .td-dn { font-weight: 700; }
    .td-ds b { font: 700 18px var(--f-head); }
    .td-early { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; padding: 1px 6px; border-radius: 8px; background: #fff0b8; border: 1px solid var(--ink); margin-left: 6px; }
    .td-seen { margin-top: 14px; display: grid; gap: 6px; font-weight: 700; font-size: 14px; }
    .td-wall { list-style: none; padding: 0; margin: 0 0 10px; display: grid; gap: 8px; }
    .td-poster { display: grid; gap: 2px; padding: 8px 10px; background: #fff; border: 2px solid var(--ink); border-radius: 4px; box-shadow: 2px 3px 0 rgba(43,35,64,.6); overflow-wrap: anywhere; }
    @media (min-width: 900px) { .td-card { padding: 14px 18px 12px; } }`;
  document.head.appendChild(css);
})();
