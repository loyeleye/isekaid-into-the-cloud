#!/usr/bin/env node
// Exam check (ExamPrepDemo, Oct 23): exam mode (js/exam.js) keeps its promises. Loads every script index.html loads
// (in a stubbed browser, as the vector build, so chapters 2 to 6 are in), with the clock set before the exam, and checks:
//   1. No held-out question (js/exam-heldout.js) is reachable: not from S.questionsFor on any concept (exam mode on or
//      off), not from any SD.qpick pool (a quoted bank id in a chapter's script), not in SD.questions.
//   2. No held-out question is a near-duplicate of a reachable one: the same stem once normalized (its first 100
//      characters; at 60, two different questions that open with the same setup sentence match), or word sets with a
//      Jaccard similarity above 0.8. The closest pair is printed either way.
//   3. Every DVA-C02 task (1.1 to 4.3) has a reviewable concept with at least 5 questions on it in exam mode.
//   4. The forms: half 33, A 65, B 65, split by domain 10/9/8/6 and 21/17/15/12, only mc and multi, every id a DVA
//      bank question, none on two forms.
//   5. In exam mode, S.questionsFor returns no SAA-only question for a concept that has anything else to ask.
//   6. SD.exam.capDue never schedules a review after the exam, from 60 days out to the last minute before it.
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

// ---- 3. Every task has a reviewable concept with 5+ questions ----
const thin = [], best = [];
for (const t of Object.keys(E.TASKS)) {
  let top = null, n = 0;
  for (const id of concepts) {
    if (!S.reviewable(id)) continue;
    const k = S.questionsFor(id).filter(q => q.dva === t && E.allowed(q)).length;
    if (k > n) { n = k; top = id; }
  }
  best.push(`${t} ${top || '-'} ${n}`);
  if (n < 5) thin.push(`task ${t}: best is ${top || 'no concept'} with ${n} question${n === 1 ? '' : 's'}`);
}
check(3, 'Every DVA task has a reviewable concept with 5+ questions', thin, best.join(', '));

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

// ---- 5. No SAA-only question where a concept has others ----
setMode(true);
const saaLeft = [];
let withAlt = 0;
for (const id of concepts) {
  const alt = SD.questions.some(q => q.c === id && !E.isSaa(q) && !E.isHeld(q));
  if (!alt) continue;
  withAlt++;
  const saa = S.questionsFor(id).filter(E.isSaa);
  if (saa.length) saaLeft.push(`${id}: ${saa.map(q => q.id).join(', ')}`);
}
check(5, 'In exam mode, S.questionsFor returns no SAA-only question where a concept has others', saaLeft, `${withAlt} concepts with something besides SAA`);

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

console.log(`Exam mode for DVA-C02 on ${E.date()}: ${SD.bank.length} bank questions, ${SD.questions.length} in the chapters, ${concepts.length} concepts`);
errors.forEach(e => console.log('load error: ' + e));
lines.forEach(l => console.log(l));
console.log(fails.length || errors.length ? `${fails.length} check${fails.length === 1 ? '' : 's'} failed${errors.length ? `, ${errors.length} load error${errors.length === 1 ? '' : 's'}` : ''}.` : 'All six exam checks pass.');
process.exit(fails.length || errors.length ? 1 : 0);
