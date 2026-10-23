// Exam mode (ExamPrepDemo, Oct 23): until the exam date, the whole game prepares for DVA-C02 and nothing else.
//   - Reviews draw from every DVA concept whatever chapter you've reached (S.reviewable asks SD.exam.reviewable).
//   - SAA-only questions are never asked: SD.qpick skips them while its pool has others, and SD.quiz.ask swaps one
//     for a DVA question on the same concept or topic (SD.exam.swap). A chapter's own SAA-only question (exam: 'SAA'
//     on an inline question its story sets up) is skipped with a note from Kyu instead, and counts as passed.
//   - The held-out questions (js/exam-heldout.js) are only ever asked by the Exam Hall (js/exam-hall.js).
//   - Thirteen exam-task concepts, one per DVA-C02 task statement, carry the bank questions no chapter asks yet, so
//     spaced review covers the whole DVA bank. Their Huh??? lines are in js/exam-help.js.
//   - No review falls due later than two days before the exam (SD.exam.capDue, called by S.recordAnswer), so
//     everything you've learned comes back in the last week.
// After the exam date the game goes back to its story-paced reviews. Menu > Exam settings changes the date or turns
// exam mode off (S.save.examDate, S.save.examMode).
(function () {
  const E = SD.exam = {};
  const DAY = 86400000;
  E.DEFAULT_DATE = '2026-11-30';           // the last day DVA-C02 can be taken; DVA-C03 starts Dec 1
  E.WEIGHTS = { 1: 0.32, 2: 0.26, 3: 0.24, 4: 0.18 };
  E.MOCK = { 1: 21, 2: 17, 3: 15, 4: 12 }; // 65 questions, rounded from the guide's weights
  E.MOCK_MIN = 130;
  E.DOMAINS = { 1: 'Development with AWS Services', 2: 'Security', 3: 'Deployment', 4: 'Troubleshooting and Optimization' };
  E.TASKS = {
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
  };

  const S = () => SD.state;
  const save = () => (SD.state && SD.state.save) || {};

  // ---- The date and the switch ----
  E.date = () => save().examDate || E.DEFAULT_DATE;
  // The exam's start, local time, 9 am (only the day matters).
  E.when = () => { const [y, m, d] = E.date().split('-').map(Number); return new Date(y, m - 1, d, 9).getTime(); };
  E.on = () => save().examMode !== false && Date.now() < E.when() + DAY;
  E.daysLeft = () => Math.max(0, Math.ceil((E.when() - Date.now()) / DAY));
  E.setDate = function (iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    save().examDate = iso; E.recapDue(); S().persist(); return true;
  };
  E.setMode = function (on) { save().examMode = !!on; if (on) E.recapDue(); S().persist(); };

  // ---- Questions ----
  // Held out until a mock has scored it once; after that it's an ordinary review question (it was fresh when scored).
  let held = null, heldN = -1;
  E.heldOut = function () {
    const n = E.mocks().length;
    if (held && heldN === n) return held;
    const used = new Set(E.mocks().filter(m => m.done).flatMap(m => m.ids || []));
    heldN = n; unused = null;
    return (held = new Set((SD.examHeldOut || []).filter(id => !used.has(id))));
  };
  E.isHeld = q => !!q && E.heldOut().has(q.id);
  E.isSaa = q => !!q && q.exam === 'SAA';
  E.isDva = q => !!q && (q.exam === 'DVA' || q.exam === 'both');
  // A question the exam layer allows in reviews, quizzes and chapters: not held out, and not SAA-only while exam mode is on.
  E.allowed = q => !!q && !E.isHeld(q) && !(E.on() && E.isSaa(q));
  E.domainOf = q => (q && q.dva ? +String(q.dva)[0] : 0);
  const bankById = () => E._byId || (E._byId = new Map((SD.bank || []).map(q => [q.id, q])));
  E.find = id => bankById().get(id) || (SD.questions || []).find(q => q.id === id);
  // A bank question (js/bank-*.js, or a chapter's copy of one) keeps its bank id. A chapter's own question, written
  // inline after a line of its story that sets it up, has none.
  E.inBank = q => !!q && !!q.id && bankById().has(q.id);
  // A chapter's own question marked exam: 'SAA' isn't swapped (that would break the line before it): in exam mode
  // SD.quiz.ask skips it with Kyu's note and counts it as passed, so nothing it gates is blocked.
  E.skips = q => E.on() && E.isSaa(q) && !E.inBank(q);
  E.SKIP_NOTE = 'Kyu left a sticky note: \'Not on your test. Skip it. — K.\'';

  // Exam-task concepts: 'x11' for task 1.1, and so on. Zone 97 keeps them out of the story's own reviews and lists.
  E.taskConcept = t => 'x' + t.replace('.', '');
  E.isTaskConcept = id => /^x\d\d$/.test(id) && !!(SD.concepts[id] && SD.concepts[id].task);
  let unused = null;
  // Bank questions that no chapter asks (not in SD.questions, not held out), by task. Computed once, after every
  // script has loaded, so chapter files that add to SD.questions later still count.
  function unusedByTask() {
    if (unused) return unused;
    unused = {};
    (SD.bank || []).filter(q => E.isDva(q) && !E.isHeld(q) && q.type !== 'explain')
      .forEach(q => (unused[q.dva] = unused[q.dva] || []).push(q));
    return unused;
  }
  E.taskQuestions = function (id) {
    const c = SD.concepts[id];
    if (!c || !c.task) return [];
    return (unusedByTask()[c.task] || []).map(q => Object.assign({}, q, { c: id }));
  };
  // Register the thirteen concepts now; their questions are looked up when asked.
  Object.keys(E.TASKS).forEach(t => {
    SD.concepts[E.taskConcept(t)] = {
      name: 'DVA ' + t + ': ' + E.TASKS[t], zone: 97, task: t, domain: +t[0],
      gist: 'Exam practice for DVA-C02 task ' + t + ' (' + E.TASKS[t].toLowerCase() + '), in the exam\'s own plain wording.',
      page: 'Task ' + t + ' of the exam guide. Read the stem twice; one requirement decides it.'
    };
  });

  // A concept's DVA domain: from its task, or the most common task among its questions.
  const domCache = {};
  E.conceptDomain = function (id) {
    if (domCache[id] != null) return domCache[id];
    const c = SD.concepts[id];
    if (c && c.domain) return (domCache[id] = c.domain);
    const n = { 1: 0, 2: 0, 3: 0, 4: 0 };
    (SD.questions || []).filter(q => q.c === id && E.isDva(q)).forEach(q => { const d = E.domainOf(q); if (n[d] != null) n[d]++; });
    const best = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return (domCache[id] = n[best] ? +best : 0);
  };
  // A concept counts for DVA if it has at least one DVA question the exam layer allows.
  E.conceptQuestions = function (id) {
    if (E.isTaskConcept(id)) return E.taskQuestions(id);
    return (SD.questions || []).filter(q => q.c === id && E.allowed(q));
  };
  E.isDvaConcept = id => E.isTaskConcept(id) ? E.taskQuestions(id).length > 0
    : (SD.questions || []).some(q => q.c === id && E.isDva(q) && !E.isHeld(q));

  // S.reviewable while exam mode is on: every DVA concept, whatever the chapter. Side quests (98) and the Isles (99)
  // keep their own rules.
  E.reviewable = function (id) {
    const c = SD.concepts[id];
    if (!c) return false;
    if (c.zone === 98 || c.zone === 99) return null;   // let state.js decide
    return E.isDvaConcept(id);
  };

  // ---- Swapping an SAA question for a DVA one ----
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // Only bank questions are swapped; a chapter's own SAA-only question is skipped instead (E.skips).
  E.swap = function (q) {
    if (!q || !E.on() || !E.isSaa(q) || !E.inBank(q)) return q;
    // Same concept first, then the same topic in the bank, then any due DVA concept.
    const same = (SD.questions || []).filter(x => x.c && x.c === q.c && E.isDva(x) && !E.isHeld(x) && x.type !== 'explain');
    if (same.length) return Object.assign({}, pick(same), { swappedFrom: q.id });
    const topic = (SD.bank || []).filter(x => q.topic && x.topic === q.topic && E.isDva(x) && !E.isHeld(x));
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
  // Mocks: S.save.mocks = [{ t, n, right, mins, full, dom: {1: [right, of], ...}, ids }], newest last.
  E.mocks = () => (save().mocks = save().mocks || []);
  E.lastMock = () => E.mocks().filter(m => m.done).slice(-1)[0] || null;
  E.recordMock = function (m) { E.mocks().push(m); S().persist(); };

  // ---- Drawing a mock ----
  // The held-out questions are three fixed forms (js/exam-heldout.js): the baseline half mock, then A, then B. The next
  // mock is the first form not taken yet; once all three are taken, a mock is practice, drawn from the DVA bank.
  E.FORMS = ['half', 'A', 'B'];
  E.nextForm = function () {
    const taken = new Set(E.mocks().filter(m => m.done).map(m => m.form));
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
  // Held-out questions first, ones you haven't had in an earlier mock before ones you have, stratified by task;
  // then, if a domain runs short, DVA bank questions you've seen least recently. full: 65, else a 33-question half.
  E.drawMock = function (full) {
    const want = {};
    Object.keys(E.MOCK).forEach(d => { want[d] = full ? E.MOCK[d] : Math.round(E.MOCK[d] / 2); });
    if (!full) want[1] = 33 - want[2] - want[3] - want[4];
    const had = new Set(E.mocks().flatMap(m => m.ids || []));
    const seen = save().qseen || [];
    const fresh = q => had.has(q.id) ? 1 : 0;
    const out = [];
    Object.keys(want).forEach(d => {
      const hq = [...E.heldOut()].map(id => bankById().get(id)).filter(q => q && E.domainOf(q) === +d);
      const shuffled = hq.map(q => ({ q, k: fresh(q) + Math.random() * 0.5 })).sort((a, b) => a.k - b.k).map(x => x.q);
      // Spread across the domain's tasks: deal one per task in turn.
      const byTask = {};
      shuffled.forEach(q => (byTask[q.dva] = byTask[q.dva] || []).push(q));
      const dealt = [];
      while (dealt.length < shuffled.length) Object.keys(byTask).forEach(t => { const q = byTask[t].shift(); if (q) dealt.push(q); });
      const mine = dealt.filter(q => !had.has(q.id)).concat(dealt.filter(q => had.has(q.id))).slice(0, want[d]);
      if (mine.length < want[d]) {
        const extra = (SD.bank || []).filter(q => E.isDva(q) && E.domainOf(q) === +d && !mine.includes(q) && q.type !== 'explain')
          .sort((a, b) => seen.indexOf(a.id) - seen.indexOf(b.id));
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
