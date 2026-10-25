#!/usr/bin/env node
// Exam check (ExamPrepDemo, Oct 23; both exams, Oct 25): exam mode (js/exam.js) keeps its promises. Loads every script index.html loads
// (in a stubbed browser, as the vector build, so chapters 2 to 6 are in), with the clock set before the exam, and checks:
//   1. No held-out question (js/exam-heldout.js) is reachable: not from S.questionsFor on any concept (exam mode on or
//      off), not from any SD.qpick pool (a quoted bank id in a chapter's script), not in SD.questions.
//   2. No held-out question is a near-duplicate of a reachable one: the same stem once normalized (its first 100
//      characters; at 60, two different questions that open with the same setup sentence match), or word sets with a
//      Jaccard similarity above 0.8. The closest pair is printed either way.
//   3. For each exam, DVA-C02 and SAA-C03, every task has a reviewable concept with at least 5 questions on it in exam
//      mode, and the reachable questions by task and domain are printed (the coverage audit).
//   4. The forms: half 33, A 65, B 65, split by domain 10/9/8/6 and 21/17/15/12, only mc and multi, every id a DVA
//      bank question, none on two forms.
//   5. In exam mode, for each exam, S.questionsFor returns no question only on the other exam for a concept that has
//      anything else to ask, and SD.exam.swap turns the other exam's bank questions into ones on the chosen exam.
//   6. SD.exam.capDue never schedules a review after the exam, from 60 days out to the last minute before it.
//   7. The standard game: with no exam date, with exam prep off, or after the exam, exam mode is off, the exam-task
//      concepts aren't reviewable, and reviews and chapters ask both exams' questions.
//   8. A practice mock for each exam has 65 questions on that exam only, split by the guide's weights, mc and multi only.
//
//   node tools/exam_check.js          print a summary, exit 1 if any check fails
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DAY = 86400000;

function load() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).filter(s => s.startsWith('js/'));
  const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : noop, apply: () => noop, construct: () => noop });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: noop, navigator: { userAgent: '' },
    Image: function () {}, Audio: function () {}, location: { search: '?vector', hash: '', href: '' }, addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }), fetch: () => new Promise(() => {}), SD_VECTOR: true
  };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  // The game's clock, so the checks run as if before the exam whatever today is.
  vm.runInContext('(function () { const real = Date.now; Date.now = () => (globalThis.__now != null ? globalThis.__now : real()); })();', ctx);
  const errors = [];
  for (const s of srcs) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), ctx, { filename: s }); } catch (e) { errors.push(`${s}: ${e.message}`); }
  }
  return { ctx, SD: ctx.SD, errors, srcs };
}

const { ctx, SD, errors, srcs } = load();
const E = SD.exam, S = SD.state;
const fails = [], lines = [];
const check = (n, name, bad, detail) => {
  lines.push(`${bad.length ? 'FAIL' : 'ok  '} ${n}. ${name}${detail ? ': ' + detail : ''}`);
  bad.slice(0, 15).forEach(b => lines.push('       ' + b));
  if (bad.length > 15) lines.push(`       ... and ${bad.length - 15} more`);
  if (bad.length) fails.push(n);
};
if (!E) { console.log('No SD.exam: js/exam.js did not load.'); errors.forEach(e => console.log('load error: ' + e)); process.exit(1); }
ctx.__now = E.when() - 30 * DAY;   // a month before the exam
const setMode = on => { S.save.examMode = on; };
const setTrack = t => { S.save.examTrack = t; };
S.save.examDate = E.TRACKS.DVA.DEFAULT_DATE;
setMode(true);

const bankById = new Map(SD.bank.map(q => [q.id, q]));
const held = new Set(SD.examHeldOut || []);
const concepts = Object.keys(SD.concepts);

// ---- 1. Held-out questions are unreachable ----
const named = new Map();   // bank id -> the scripts that name it (SD.qpick pools and single asks)
for (const s of srcs.filter(s => !/^js\/(bank-|exam)/.test(s))) {
  for (const m of fs.readFileSync(path.join(ROOT, s), 'utf8').matchAll(/['"]((?:dva|saa)-\d-\d{2,3})['"]/g)) {
    if (!named.has(m[1])) named.set(m[1], new Set());
    named.get(m[1]).add(s);
  }
}
const reach = new Map();   // id -> question, everything a player can be asked outside the Exam Hall
const leaks = [];
for (const on of [true, false]) {
  setMode(on);
  for (const id of concepts) {
    for (const q of S.questionsFor(id)) {
      if (held.has(q.id)) leaks.push(`${q.id} via S.questionsFor('${id}') with exam mode ${on ? 'on' : 'off'}`);
      if (q.id) reach.set(q.id, q);
    }
  }
}
setMode(true);
for (const [id, files] of named) {
  if (held.has(id)) leaks.push(`${id} named in ${[...files].join(', ')} (an SD.qpick pool)`);
  if (bankById.has(id)) reach.set(id, bankById.get(id));
}
for (const q of SD.questions) {
  if (held.has(q.id)) leaks.push(`${q.id} in SD.questions (concept ${q.c})`);
  if (q.id) reach.set(q.id, q);
}
check(1, 'No held-out question is reachable', leaks, `${held.size} held out, ${reach.size} reachable questions`);

// ---- 2. No near-duplicates ----
const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const words = t => new Set(norm(t).split(' ').filter(Boolean));
const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1); };
const PREFIX = 100, JACCARD = 0.8;
const reachList = [...reach.values()].filter(q => !held.has(q.id) && q.type !== 'explain' && q.q)
  .map(q => ({ q, pre: norm(q.q).slice(0, PREFIX), w: words(q.q) }));
const dups = [];
let close = { j: 0 };
for (const id of held) {
  const h = bankById.get(id);
  if (!h) continue;
  const pre = norm(h.q).slice(0, PREFIX), w = words(h.q);
  for (const r of reachList) {
    const j = jaccard(w, r.w);
    if (j > close.j) close = { j, a: id, b: r.q.id };
    if (r.pre === pre || j > JACCARD) dups.push(`${id} ~ ${r.q.id} (${r.pre === pre ? 'same stem prefix' : 'Jaccard ' + j.toFixed(2)}): "${String(h.q).slice(0, 70)}"`);
  }
}
check(2, 'No held-out question is a near-duplicate of a reachable one', dups, `stem prefix ${PREFIX} chars, Jaccard > ${JACCARD}; closest ${close.a} ~ ${close.b} at ${close.j.toFixed(2)}`);

// ---- 3. Every task of each exam has a reviewable concept with 5+ questions ----
const audit = [];
for (const tr of ['DVA', 'SAA']) {
  setTrack(tr);
  const key = E.cfg(tr).key, thin = [], best = [], perTask = {}, perDom = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  for (const id of concepts) {
    if (!S.reviewable(id)) continue;
    for (const q of S.questionsFor(id)) if (q.id && E.allowed(q) && q[key]) { (perTask[q[key]] = perTask[q[key]] || new Set()).add(q.id); perDom[E.domainOf(q)].add(q.id); }
  }
  for (const t of Object.keys(E.TASKS)) {
    let top = null, n = 0;
    for (const id of concepts) {
      if (!S.reviewable(id)) continue;
      const k = S.questionsFor(id).filter(q => q[key] === t && E.allowed(q)).length;
      if (k > n) { n = k; top = id; }
    }
    best.push(`${t} ${top || '-'} ${n}`);
    if (n < 5) thin.push(`task ${t}: best is ${top || 'no concept'} with ${n} question${n === 1 ? '' : 's'}`);
  }
  const tot = [1, 2, 3, 4].reduce((a, d) => a + perDom[d].size, 0);
  audit.push(`     ${E.NAME} reachable by domain: ` + [1, 2, 3, 4].map(d => `D${d} ${perDom[d].size} (${Math.round(perDom[d].size / tot * 100)}%, guide ${Math.round(E.WEIGHTS[d] * 100)}%)`).join(', '));
  audit.push(`     ${E.NAME} reachable by task: ` + Object.keys(E.TASKS).map(t => `${t} ${(perTask[t] || new Set()).size}`).join(', '));
  check('3' + tr[0].toLowerCase(), `Every ${E.NAME} task has a reviewable concept with 5+ questions`, thin, best.join(', '));
}
setTrack('DVA');

// ---- 4. The forms ----
const WANT = { half: { n: 33, d: { 1: 10, 2: 9, 3: 8, 4: 6 } }, A: { n: 65, d: { 1: 21, 2: 17, 3: 15, 4: 12 } }, B: { n: 65, d: { 1: 21, 2: 17, 3: 15, 4: 12 } } };
const formBad = [], onForm = new Map(), sizes = [];
for (const f of Object.keys(WANT)) {
  const ids = (SD.examForms || {})[f] || [];
  sizes.push(`${f} ${ids.length}`);
  if (ids.length !== WANT[f].n) formBad.push(`${f}: ${ids.length} questions, want ${WANT[f].n}`);
  const dom = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of ids) {
    const q = bankById.get(id);
    if (!q) { formBad.push(`${f}: ${id} isn't in the bank`); continue; }
    if (!E.isDva(q)) formBad.push(`${f}: ${id} is exam '${q.exam}', not DVA`);
    if (q.type !== 'mc' && q.type !== 'multi') formBad.push(`${f}: ${id} is type '${q.type}'`);
    if (onForm.has(id)) formBad.push(`${id} is on ${onForm.get(id)} and ${f}`);
    onForm.set(id, f);
    dom[E.domainOf(q)] = (dom[E.domainOf(q)] || 0) + 1;
  }
  const split = [1, 2, 3, 4].map(d => dom[d] || 0);
  if (split.join('/') !== [1, 2, 3, 4].map(d => WANT[f].d[d]).join('/')) formBad.push(`${f}: domains ${split.join('/')}, want ${[1, 2, 3, 4].map(d => WANT[f].d[d]).join('/')}`);
}
if (held.size !== onForm.size) formBad.push(`SD.examHeldOut has ${held.size} ids, the forms ${onForm.size}`);
check(4, 'The forms are 33/65/65, split by domain, mc and multi only', formBad, sizes.join(', '));

// ---- 5. No question only on the other exam where a concept has others, and swaps land on the chosen exam ----
setMode(true);
for (const tr of ['DVA', 'SAA']) {
  setTrack(tr);
  const left = [];
  let withAlt = 0, swaps = 0, stuck = 0;
  for (const id of concepts) {
    const alt = SD.questions.some(q => q.c === id && !E.offTrack(q) && !E.isHeld(q));
    if (!alt) continue;
    withAlt++;
    const off = S.questionsFor(id).filter(q => E.offTrack(q));
    if (off.length) left.push(`${id}: ${off.map(q => q.id).join(', ')}`);
  }
  for (const q of SD.questions.filter(q => E.offTrack(q) && E.inBank(q))) {
    swaps++;
    const r = E.swap(q);
    if (E.offTrack(r)) stuck++;
    if (E.isHeld(r)) left.push(`swap of ${q.id} gave held-out ${r.id}`);
  }
  if (stuck) left.push(`${stuck} of ${swaps} swaps stayed on the other exam`);
  check('5' + tr[0].toLowerCase(), `In ${E.NAME} mode, no question only on the other exam where a concept has others; swaps land on ${E.NAME}`, left, `${withAlt} concepts with something else, ${swaps} swaps`);
}
setTrack('DVA');

// ---- 6. capDue never lands after the exam ----
const late = [];
const when = E.when();
const nows = [60 * DAY, 30 * DAY, 7 * DAY, 2 * DAY, DAY + 3600000, DAY, 20 * 3600000, 3600000, 60000].map(x => when - x);
const dues = [0, 3600000, DAY, 3 * DAY, 30 * DAY, 400 * DAY];
for (const now of nows) {
  ctx.__now = now;
  for (const d of dues) {
    for (let i = 0; i < 40; i++) {
      const out = E.capDue(now + d);
      if (out > when) { late.push(`${((when - now) / DAY).toFixed(2)} days out, due in ${(d / DAY).toFixed(2)} days: capped to ${((out - when) / 3600000).toFixed(1)} hours after the exam`); break; }
    }
  }
}
ctx.__now = when - 30 * DAY;
check(6, 'SD.exam.capDue never schedules a review after the exam', late, `${nows.length} clocks x ${dues.length} due dates`);

// ---- 7. The standard game when exam prep is off ----
const std = [];
const standard = why => {
  if (E.on()) { std.push(`${why}: exam mode still on`); return; }
  const tasks = concepts.filter(id => E.isTaskConcept(id) && S.reviewable(id));
  if (tasks.length) std.push(`${why}: exam-task concepts reviewable: ${tasks.join(', ')}`);
  const kinds = new Set();
  for (const id of concepts) for (const q of S.questionsFor(id)) { if (E.isSaa(q)) kinds.add('SAA'); if (q.exam === 'DVA') kinds.add('DVA'); }
  if (!kinds.has('SAA') || !kinds.has('DVA')) std.push(`${why}: reviews ask only ${[...kinds].join(', ') || 'nothing'}`);
  const saaQ = SD.questions.find(q => E.isSaa(q) && E.inBank(q));
  if (saaQ && E.swap(saaQ) !== saaQ) std.push(`${why}: an SAA question was swapped`);
  if (SD.questions.some(q => E.skips(q))) std.push(`${why}: a chapter question would be skipped`);
};
for (const tr of ['DVA', 'SAA']) {
  setTrack(tr);
  delete S.save.examDate; standard(`${tr}, no date`);
  S.save.examDate = '2026-11-30'; setMode(false); standard(`${tr}, exam prep off`);
  setMode(true); ctx.__now = E.when() + 2 * DAY; standard(`${tr}, after the exam`);
  ctx.__now = E.when() - 30 * DAY;
  if (!E.on()) std.push(`${tr}: with a date and exam prep on, exam mode is off`);
}
setTrack('DVA'); S.save.examDate = E.TRACKS.DVA.DEFAULT_DATE; setMode(true); ctx.__now = E.when() - 30 * DAY;
check(7, 'No date, exam prep off or after the exam: the standard game, both exams', std, 'each exam, three ways');

// ---- 8. A practice mock of each exam ----
const mockBad = [], mockSizes = [];
for (const tr of ['DVA', 'SAA']) {
  setTrack(tr);
  const qs = E.drawMock(true), dom = { 1: 0, 2: 0, 3: 0, 4: 0 };
  qs.forEach(q => { dom[E.domainOf(q)] = (dom[E.domainOf(q)] || 0) + 1; if (!E.inTrack(q)) mockBad.push(`${tr}: ${q.id} is exam ${q.exam}`); if (q.type !== 'mc' && q.type !== 'multi') mockBad.push(`${tr}: ${q.id} is ${q.type}`); });
  const split = [1, 2, 3, 4].map(d => dom[d]).join('/'), want = [1, 2, 3, 4].map(d => E.MOCK[d]).join('/');
  if (qs.length !== 65 || split !== want) mockBad.push(`${tr}: ${qs.length} questions, domains ${split}, want 65 at ${want}`);
  if (new Set(qs.map(q => q.id)).size !== qs.length) mockBad.push(`${tr}: a question appears twice`);
  if (tr === 'SAA' && E.nextForm()) mockBad.push('SAA-C03 offered a DVA-C02 form');
  mockSizes.push(`${E.NAME} ${split}`);
}
setTrack('DVA');
check(8, 'A practice mock of each exam: 65 of its own questions, split by its guide', mockBad, mockSizes.join(', '));

console.log(`Exam mode for DVA-C02 and SAA-C03 on ${E.date()}: ${SD.bank.length} bank questions, ${SD.questions.length} in the chapters, ${concepts.length} concepts`);
errors.forEach(e => console.log('load error: ' + e));
lines.forEach(l => console.log(l));
console.log('Coverage audit:');
audit.forEach(l => console.log(l));
console.log(fails.length || errors.length ? `${fails.length} check${fails.length === 1 ? '' : 's'} failed${errors.length ? `, ${errors.length} load error${errors.length === 1 ? '' : 's'}` : ''}.` : `All ${lines.filter(l => /^ok/.test(l)).length} exam checks pass.`);
process.exit(fails.length || errors.length ? 1 : 0);
