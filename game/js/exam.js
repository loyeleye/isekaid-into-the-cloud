// Exam mode (ExamPrepDemo, Oct 23; one build with the full game, Oct 25): with an exam date set, the whole game
// prepares for one exam, DVA-C02 or SAA-C03 (S.save.examTrack, DVA by default), and nothing else.
//   - Reviews draw from every concept with a question on that exam, whatever chapter you've reached (S.reviewable asks
//     SD.exam.reviewable).
//   - The other exam's questions are never asked: SD.qpick skips them while its pool has others, and SD.quiz.ask swaps
//     one for a question on the same concept or topic (SD.exam.swap). A chapter's own question tagged only for the other
//     exam (exam: 'SAA' on an inline question its story sets up) is skipped with a note from Kyu instead, and counts as
//     passed.
//   - The held-out questions (js/exam-heldout.js, three DVA-C02 forms) are only ever asked by the Exam Hall
//     (js/exam-hall.js). SAA-C03 has no fixed forms: its mocks are practice mocks, questions you've never answered first.
//   - Exam-task concepts, one per task statement of each exam (x11 to x43 for DVA-C02, s11 to s44 for SAA-C03), carry
//     the bank questions, so spaced review covers the whole bank for the chosen exam. Their Huh??? lines are in
//     js/exam-help.js.
//   - No review falls due later than two days before the exam (SD.exam.capDue, called by S.recordAnswer), so
//     everything you've learned comes back in the last week.
// With no date set, with exam prep off, or after the exam date, it's the standard game: story-paced reviews that mix
// SAA and DVA questions. The Today card's exam settings change the exam, the date and the switch (S.save.examTrack,
// S.save.examDate, S.save.examMode).
(function () {
  const E = SD.exam = {};
  const DAY = 86400000;
  // Domains, weights and task statements from the official exam guides (DVA-C02 v2.1, SAA-C03). Both exams: 65
  // questions (50 scored), 130 minutes, pass at 720 of 1000.
  E.TRACKS = {
    DVA: {
      id: 'DVA', key: 'dva', prefix: 'x', name: 'DVA-C02', title: 'AWS Certified Developer - Associate',
      DEFAULT_DATE: '2026-11-30',          // the last day DVA-C02 can be taken; DVA-C03 starts Dec 1
      WEIGHTS: { 1: 0.32, 2: 0.26, 3: 0.24, 4: 0.18 },
      MOCK: { 1: 21, 2: 17, 3: 15, 4: 12 }, // 65 questions, rounded from the guide's weights
      DOMAINS: { 1: 'Development with AWS Services', 2: 'Security', 3: 'Deployment', 4: 'Troubleshooting and Optimization' },
      TASKS: {
        '1.1': 'Develop code for applications hosted on AWS',
        '1.2': 'Develop code for AWS Lambda',
        '1.3': 'Use data stores in application development',
        '2.1': 'Implement authentication and authorization',
        '2.2': 'Implement encryption by using AWS services',
        '2.3': 'Manage sensitive data in application code',
        '3.1': 'Prepare application artifacts to be deployed',
        '3.2': 'Test applications in development environments',
        '3.3': 'Automate deployment testing',
        '3.4': 'Deploy code by using AWS CI/CD services',
        '4.1': 'Assist in a root cause analysis',
        '4.2': 'Instrument code for observability',
        '4.3': 'Optimize applications by using AWS services and features'
      }
    },
    SAA: {
      id: 'SAA', key: 'saa', prefix: 's', name: 'SAA-C03', title: 'AWS Certified Solutions Architect - Associate',
      DEFAULT_DATE: '',                    // no retirement announced: the date picker suggests eight weeks out
      WEIGHTS: { 1: 0.30, 2: 0.26, 3: 0.24, 4: 0.20 },
      MOCK: { 1: 20, 2: 17, 3: 15, 4: 13 }, // 65 questions, rounded from the guide's weights
      DOMAINS: { 1: 'Design Secure Architectures', 2: 'Design Resilient Architectures', 3: 'Design High-Performing Architectures', 4: 'Design Cost-Optimized Architectures' },
      TASKS: {
        '1.1': 'Design secure access to AWS resources',
        '1.2': 'Design secure workloads and applications',
        '1.3': 'Determine appropriate data security controls',
        '2.1': 'Design scalable and loosely coupled architectures',
        '2.2': 'Design highly available and/or fault-tolerant architectures',
        '3.1': 'Determine high-performing and/or scalable storage solutions',
        '3.2': 'Design high-performing and elastic compute solutions',
        '3.3': 'Determine high-performing database solutions',
        '3.4': 'Determine high-performing and/or scalable network architectures',
        '3.5': 'Determine high-performing data ingestion and transformation solutions',
        '4.1': 'Design cost-optimized storage solutions',
        '4.2': 'Design cost-optimized compute solutions',
        '4.3': 'Design cost-optimized database solutions',
        '4.4': 'Design cost-optimized network architectures'
      }
    }
  };
  E.MOCK_MIN = 130;

  const S = () => SD.state;
  const save = () => (SD.state && SD.state.save) || {};

  // ---- Which exam ----
  E.track = () => (save().examTrack === 'SAA' ? 'SAA' : 'DVA');
  E.cfg = t => E.TRACKS[t || E.track()];
  // The chosen exam's tables, read as SD.exam.WEIGHTS and so on, so callers follow a change of exam.
  ['WEIGHTS', 'MOCK', 'DOMAINS', 'TASKS', 'DEFAULT_DATE'].forEach(k => Object.defineProperty(E, k, { get: () => E.cfg()[k], enumerable: true }));
  Object.defineProperty(E, 'NAME', { get: () => E.cfg().name, enumerable: true });
  E.setTrack = function (t) {
    if (!E.TRACKS[t] || t === E.track()) return false;
    save().examTrack = t; domCache = {}; E.recapDue(); S().persist(); return true;
  };

  // ---- The date and the switch ----
  E.hasDate = () => !!save().examDate;
  E.date = () => save().examDate || E.DEFAULT_DATE || E.suggestDate();
  // Eight weeks from today, for an exam with no last day.
  E.suggestDate = () => { const d = new Date(Date.now() + 56 * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // The exam's start, local time, 9 am (only the day matters).
  E.when = () => { const [y, m, d] = E.date().split('-').map(Number); return new Date(y, m - 1, d, 9).getTime(); };
  // Exam prep needs a date: no date, or the switch off, or the day after the exam, and it's the standard game.
  E.on = () => E.hasDate() && save().examMode !== false && Date.now() < E.when() + DAY;
  E.daysLeft = () => Math.max(0, Math.ceil((E.when() - Date.now()) / DAY));
  E.setDate = function (iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    save().examDate = iso; E.recapDue(); S().persist(); return true;
  };
  E.clearDate = function () { delete save().examDate; S().persist(); };
  E.setMode = function (on) { save().examMode = !!on; if (on) E.recapDue(); S().persist(); };

  // ---- Questions ----
  // Held out until a mock has scored it once; after that it's an ordinary review question (it was fresh when scored).
  let held = null, heldN = -1;
  E.heldOut = function () {
    const n = E.mocks().length;
    if (held && heldN === n) return held;
    const used = new Set(E.mocks().filter(m => m.done).flatMap(m => m.ids || []));
    heldN = n; unused = {};
    return (held = new Set((SD.examHeldOut || []).filter(id => !used.has(id))));
  };
  E.isHeld = q => !!q && E.heldOut().has(q.id);
  E.isSaa = q => !!q && q.exam === 'SAA';
  E.isDva = q => !!q && (q.exam === 'DVA' || q.exam === 'both');
  // On the chosen exam (or on both). Untagged questions (a chapter's own) are on neither, and never off-track.
  E.inTrack = (q, t) => !!q && (q.exam === 'both' || q.exam === (t || E.track()));
  E.offTrack = (q, t) => !!q && !!q.exam && q.exam !== 'both' && q.exam !== (t || E.track());
  // A question the exam layer allows in reviews, quizzes and chapters: not held out, and not on the other exam only
  // while exam mode is on.
  E.allowed = q => !!q && !E.isHeld(q) && !(E.on() && E.offTrack(q));
  E.taskOf = (q, t) => (q ? q[E.cfg(t).key] : undefined);
  E.domainOf = (q, t) => { const k = E.taskOf(q, t); return k ? +String(k)[0] : 0; };
  const bankById = () => E._byId || (E._byId = new Map((SD.bank || []).map(q => [q.id, q])));
  E.find = id => bankById().get(id) || (SD.questions || []).find(q => q.id === id);
  // A bank question (js/bank-*.js, or a chapter's copy of one) keeps its bank id. A chapter's own question, written
  // inline after a line of its story that sets it up, has none.
  E.inBank = q => !!q && !!q.id && bankById().has(q.id);
  // A chapter's own question tagged for the other exam isn't swapped (that would break the line before it): in exam
  // mode SD.quiz.ask skips it with Kyu's note and counts it as passed, so nothing it gates is blocked.
  E.skips = q => E.on() && E.offTrack(q) && !E.inBank(q);
  E.SKIP_NOTE = 'Kyu left a sticky note: \'Not on your test. Skip it. — K.\'';

  // Exam-task concepts: 'x11' for DVA-C02 task 1.1, 's11' for SAA-C03 task 1.1, and so on. Zone 97 keeps them out of
  // the story's own reviews and lists.
  E.taskConcept = (t, tr) => E.cfg(tr).prefix + t.replace('.', '');
  E.isTaskConcept = id => /^[xs]\d\d$/.test(id) && !!(SD.concepts[id] && SD.concepts[id].task);
  E.isTrackTask = id => E.isTaskConcept(id) && SD.concepts[id].exam === E.track();
  let unused = {};
  // Bank questions on an exam (not held out, not typed answers), by task. Computed once per exam, after every script
  // has loaded, so chapter files that add to the bank later still count.
  function unusedByTask(tr) {
    E.heldOut();   // first, since a new mock resets this cache
    if (unused[tr]) return unused[tr];
    const out = unused[tr] = {}, key = E.cfg(tr).key;
    (SD.bank || []).filter(q => E.inTrack(q, tr) && !E.isHeld(q) && q.type !== 'explain')
      .forEach(q => (out[q[key]] = out[q[key]] || []).push(q));
    return out;
  }
  E.taskQuestions = function (id) {
    const c = SD.concepts[id];
    if (!c || !c.task) return [];
    return (unusedByTask(c.exam)[c.task] || []).map(q => Object.assign({}, q, { c: id }));
  };
  // Register every exam's task concepts now; their questions are looked up when asked.
  Object.keys(E.TRACKS).forEach(tr => {
    const T = E.TRACKS[tr];
    Object.keys(T.TASKS).forEach(t => {
      SD.concepts[E.taskConcept(t, tr)] = {
        name: T.id + ' ' + t + ': ' + T.TASKS[t], zone: 97, task: t, domain: +t[0], exam: tr,
        gist: 'Exam practice for ' + T.name + ' task ' + t + ' (' + T.TASKS[t].toLowerCase() + '), in the exam\'s own plain wording.',
        page: 'Task ' + t + ' of the exam guide. Read the stem twice; one requirement decides it.'
      };
    });
  });

  // A concept's domain on the chosen exam: from its task, or the most common task among its questions.
  let domCache = {};
  E.conceptDomain = function (id) {
    const k = E.track() + id;
    if (domCache[k] != null) return domCache[k];
    const c = SD.concepts[id];
    if (c && c.domain) return (domCache[k] = c.exam === E.track() ? c.domain : 0);
    const n = { 1: 0, 2: 0, 3: 0, 4: 0 };
    (SD.questions || []).filter(q => q.c === id && E.inTrack(q)).forEach(q => { const d = E.domainOf(q); if (n[d] != null) n[d]++; });
    const best = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return (domCache[k] = n[best] ? +best : 0);
  };
  E.conceptQuestions = function (id) {
    if (E.isTaskConcept(id)) return E.taskQuestions(id);
    return (SD.questions || []).filter(q => q.c === id && E.allowed(q));
  };
  // A concept counts for the chosen exam if it has at least one question on it the exam layer allows.
  E.isTrackConcept = id => E.isTaskConcept(id) ? E.isTrackTask(id) && E.taskQuestions(id).length > 0
    : (SD.questions || []).some(q => q.c === id && E.inTrack(q) && !E.isHeld(q));
  E.isDvaConcept = E.isTrackConcept;   // the name today.js and the checks first used

  // S.reviewable while exam mode is on: every concept on the chosen exam, whatever the chapter. Side quests (98) and
  // the Isles (99) keep their own rules.
  E.reviewable = function (id) {
    const c = SD.concepts[id];
    if (!c) return false;
    if (c.zone === 98 || c.zone === 99) return null;   // let state.js decide
    return E.isTrackConcept(id);
  };

  // ---- Swapping a question from the other exam for one on the chosen exam ----
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // Only bank questions are swapped; a chapter's own SAA-only question is skipped instead (E.skips).
  E.swap = function (q) {
    if (!q || !E.on() || !E.offTrack(q) || !E.inBank(q)) return q;
    // Same concept first, then the same topic in the bank, then any due concept on the exam.
    const same = (SD.questions || []).filter(x => x.c && x.c === q.c && E.inTrack(x) && !E.isHeld(x) && x.type !== 'explain');
    if (same.length) return Object.assign({}, pick(same), { swappedFrom: q.id });
    const topic = (SD.bank || []).filter(x => q.topic && x.topic === q.topic && E.inTrack(x) && !E.isHeld(x));
    if (topic.length) return Object.assign({}, pick(topic), { c: q.c && SD.concepts[q.c] ? q.c : undefined, swappedFrom: q.id });
    const St = S();
    if (St && St.pickConcepts) {
      const pool = Object.keys(SD.concepts).filter(id => St.reviewable(id) && St.questionsFor(id).length);
      const c = St.pickConcepts(1, pool)[0];
      const alt = c && St.pickQuestion(c);
      if (alt && E.allowed(alt)) return Object.assign({}, alt, { swappedFrom: q.id });
    }
    return q;
  };

  // ---- Spacing that knows the exam date ----
  // No gap longer than a quarter of the days left (at least a day), with a little jitter so the reviews don't all land
  // on the same day; nothing falls due after the day before the exam. In its last day, nothing falls due after the
  // exam itself (and on the day, once it has started, everything is due now).
  E.capDue = function (due) {
    if (!E.on()) return due;
    const now = Date.now(), left = E.when() - now;
    const gap = Math.max(DAY, Math.floor(left / 4 / DAY) * DAY * (0.85 + Math.random() * 0.3));
    return Math.min(due, Math.max(now, Math.min(now + gap, Math.max(now + DAY, E.when() - DAY), E.when())));
  };
  // Every question's last answer: S.save.qlog[qid] = [time, right]. Task concepts climb a box only as their answers
  // spread: one review box per two different questions answered right, so two lucky answers can't hide a whole task.
  const qlog = () => (save().qlog = save().qlog || {});
  E.noteAnswer = function (cid, qid, ok) {
    if (qid) qlog()[qid] = [Date.now(), ok ? 1 : 0];
  };
  E.boxCap = function (cid) {
    if (!E.isTaskConcept(cid)) return 99;
    const log = qlog(), right = E.taskQuestions(cid).filter(q => log[q.id] && log[q.id][1]).length;
    return 1 + Math.floor(right / 2);
  };
  // Inside a task concept: a question never answered first, then the one answered longest ago.
  E.pickTask = function (list) {
    const log = qlog(), t = q => (log[q.id] ? log[q.id][0] : 0) + Math.random() * 1000;
    return list.slice().sort((a, b) => t(a) - t(b))[0];
  };

  // Pull in reviews already scheduled past the cap (after the date changes or exam mode comes back on).
  E.recapDue = function () {
    const cs = save().concepts || {};
    Object.keys(cs).forEach(id => { if (cs[id].due) cs[id].due = E.capDue(cs[id].due); });
  };

  // ---- Readiness ----
  // Review accuracy by domain: answers in the last 21 days on concepts in that domain.
  E.reviewAccuracy = function () {
    const out = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] }, since = Date.now() - 21 * DAY, cs = save().concepts || {};
    Object.keys(cs).forEach(id => {
      const d = E.conceptDomain(id);
      if (!out[d]) return;
      (cs[id].hist || []).forEach(h => { if (h.t >= since) { out[d][1]++; if (h.ok) out[d][0]++; } });
    });
    return out;
  };
  // Mocks: S.save.mocks = [{ t, n, right, mins, full, dom: {1: [right, of], ...}, ids, exam }], newest last, every
  // exam's together (a mock with no exam is DVA-C02's: the first mocks had none). trackMocks are the chosen exam's.
  E.mocks = () => (save().mocks = save().mocks || []);
  E.mockExam = m => m.exam || 'DVA';
  E.trackMocks = () => E.mocks().filter(m => E.mockExam(m) === E.track());
  E.lastMock = () => E.trackMocks().filter(m => m.done).slice(-1)[0] || null;
  E.recordMock = function (m) { if (!m.exam) m.exam = E.track(); E.mocks().push(m); S().persist(); };

  // ---- Drawing a mock ----
  // The held-out questions are three fixed DVA-C02 forms (js/exam-heldout.js): the baseline half mock, then A, then B.
  // The next mock is the first form not taken yet; once all three are taken, or for SAA-C03, which has no forms, a mock
  // is practice, drawn from the chosen exam's bank.
  E.FORMS = ['half', 'A', 'B'];
  E.nextForm = function () {
    if (E.track() !== 'DVA') return null;
    const taken = new Set(E.trackMocks().filter(m => m.done).map(m => m.form));
    return E.FORMS.find(f => !taken.has(f) && ((SD.examForms || {})[f] || []).length) || null;
  };
  // A mock: { form, full, practice, qs }. A form's questions you've already had (a mock left unfinished) still count;
  // they were held out until then.
  E.mockFor = function (form) {
    const f = form === undefined ? E.nextForm() : form;
    if (f) {
      const qs = SD.examForms[f].map(id => bankById().get(id)).filter(Boolean);
      for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
      return { form: f, full: f !== 'half', practice: false, qs };
    }
    return { form: null, full: true, practice: true, qs: E.drawMock(true) };
  };
  // Held-out questions first (DVA-C02 only), ones you haven't had in an earlier mock before ones you have, stratified
  // by task; then, if a domain runs short, bank questions on the exam: never answered first, then the ones answered
  // longest ago. full: 65, else a 33-question half.
  E.drawMock = function (full) {
    const want = {};
    Object.keys(E.MOCK).forEach(d => { want[d] = full ? E.MOCK[d] : Math.round(E.MOCK[d] / 2); });
    if (!full) want[1] = 33 - want[2] - want[3] - want[4];
    const had = new Set(E.mocks().flatMap(m => m.ids || []));
    const log = qlog(), last = q => (log[q.id] ? log[q.id][0] : 0) + Math.random() * DAY;
    const fresh = q => had.has(q.id) ? 1 : 0;
    const out = [];
    Object.keys(want).forEach(d => {
      const hq = E.track() !== 'DVA' ? [] : [...E.heldOut()].map(id => bankById().get(id)).filter(q => q && E.domainOf(q) === +d);
      const shuffled = hq.map(q => ({ q, k: fresh(q) + Math.random() * 0.5 })).sort((a, b) => a.k - b.k).map(x => x.q);
      // Spread across the domain's tasks: deal one per task in turn.
      const byTask = {};
      shuffled.forEach(q => (byTask[q.dva] = byTask[q.dva] || []).push(q));
      const dealt = [];
      while (dealt.length < shuffled.length) Object.keys(byTask).forEach(t => { const q = byTask[t].shift(); if (q) dealt.push(q); });
      const mine = dealt.filter(q => !had.has(q.id)).concat(dealt.filter(q => had.has(q.id))).slice(0, want[d]);
      if (mine.length < want[d]) {
        const pool = (SD.bank || []).filter(q => E.inTrack(q) && !E.isHeld(q) && E.domainOf(q) === +d && !mine.includes(q) && (q.type === 'mc' || q.type === 'multi'));
        const keyed = pool.map(q => ({ q, k: last(q) + (had.has(q.id) ? 400 * DAY : 0) })).sort((a, b) => a.k - b.k).map(x => x.q);
        // Spread across the domain's tasks here too.
        const bt = {};
        keyed.forEach(q => (bt[E.taskOf(q)] = bt[E.taskOf(q)] || []).push(q));
        const extra = [];
        while (extra.length < keyed.length) Object.keys(bt).forEach(t => { const q = bt[t].shift(); if (q) extra.push(q); });
        mine.push(...extra.slice(0, want[d] - mine.length));
      }
      out.push(...mine);
    });
    // Interleave the domains, as the real exam does.
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };

  // Multiple response on the exam has no partial credit: every right item and no wrong one.
  E.correct = function (q, answer) {
    if (q.type === 'mc') return answer === q.a;
    if (q.type === 'multi') {
      const set = new Set(answer || []);
      return q.items.every((it, i) => !!it.ok === set.has(i));
    }
    return false;
  };
})();
