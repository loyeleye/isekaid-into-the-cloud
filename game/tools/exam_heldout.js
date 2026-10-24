#!/usr/bin/env node
// Picks the Exam Hall's held-out questions and writes them to js/exam-heldout.js (ExamPrepDemo, Oct 23).
// A held-out question is a DVA-C02 bank question (exam DVA or both) that no chapter asks: it isn't in SD.questions
// and no chapter script names its id. Reviews, quizzes and chapters never ask these (js/exam.js), so the Exam Hall's
// score measures new wording, not memory of an item. They make three fixed forms: a 33-question baseline half mock
// and two full 65-question mocks (A and B), each split by domain as the real exam is and spread across every task.
// Only multiple choice and multiple response, the exam's two formats. Picks are by a hash of the id, so a rerun keeps
// the same forms unless the bank changes.
//   node tools/exam_heldout.js            write js/exam-heldout.js and print the counts
//   node tools/exam_heldout.js --dry      print only
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

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
  for (const s of srcs) {
    if (s === 'js/exam-heldout.js') continue;
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), ctx, { filename: s }); } catch (e) { /* the checks report load errors */ }
  }
  return { SD: ctx.SD, srcs };
}

const { SD, srcs } = load();
const named = new Set();
for (const s of srcs.filter(s => !/^js\/(bank-|exam)/.test(s))) {
  for (const m of fs.readFileSync(path.join(ROOT, s), 'utf8').matchAll(/['"]((?:dva|saa)-\d-\d{2,3})['"]/g)) named.add(m[1]);
}
const inGame = new Set(SD.questions.map(q => q.id));
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const dva = SD.bank.filter(q => q.exam === 'DVA' || q.exam === 'both');
const free = q => !inGame.has(q.id) && !named.has(q.id) && (q.type === 'mc' || q.type === 'multi');
// Each form's questions per domain: the real exam's 65 split 21/17/15/12 (32/26/24/18%), and half of that for the
// baseline.
const FORMS = { half: { 1: 10, 2: 9, 3: 8, 4: 6 }, A: { 1: 21, 2: 17, 3: 15, 4: 12 }, B: { 1: 21, 2: 17, 3: 15, 4: 12 } };
const forms = { half: [], A: [], B: [] }, rows = [];
for (const d of [1, 2, 3, 4]) {
  const need = Object.values(FORMS).reduce((n, f) => n + f[d], 0);
  const tasks = [...new Set(dva.filter(q => +q.dva[0] === d).map(q => q.dva))].sort();
  const pool = {}, take = {};
  tasks.forEach(t => { pool[t] = dva.filter(q => q.dva === t && free(q)).sort((a, b) => hash(a.id) - hash(b.id)); take[t] = 0; });
  // Share the domain's count across its tasks by how many bank questions each task has (a stand-in for how much of
  // the exam it is), never more than a task has unused; what a task can't give goes to the others.
  const size = t => dva.filter(q => q.dva === t).length, total = tasks.reduce((n, t) => n + size(t), 0);
  tasks.forEach(t => { take[t] = Math.min(pool[t].length, Math.floor(need * size(t) / total)); });
  let left = need - tasks.reduce((n, t) => n + take[t], 0);
  while (left > 0) {
    const t = tasks.filter(t => take[t] < pool[t].length).sort((a, b) => (take[a] / size(a)) - (take[b] / size(b)))[0];
    if (!t) break;
    take[t]++; left--;
  }
  // Deal the picks one task at a time across the forms, so each form spreads over every task.
  const dealt = [];
  const queues = tasks.map(t => pool[t].slice(0, take[t]));
  while (queues.some(q => q.length)) queues.forEach(q => { if (q.length) dealt.push(q.shift()); });
  const order = ['A', 'B', 'half'];
  let i = 0;
  for (const q of dealt) {
    for (let k = 0; k < 3; k++) {
      const f = order[(i + k) % 3];
      if (forms[f].filter(x => +x.dva[0] === d).length < FORMS[f][d]) { forms[f].push(q); i = (i + k + 1) % 3; break; }
    }
  }
  rows.push(`Domain ${d}: ${dealt.length} of ${need} (` + tasks.map(t => `${t}: ${take[t]}/${pool[t].length}`).join(', ') + ')');
}
const held = [...forms.half, ...forms.A, ...forms.B].map(q => q.id);
console.log(rows.join('\n'));
console.log(`Forms: half ${forms.half.length}, A ${forms.A.length}, B ${forms.B.length}; ${held.length} held out of ${dva.length} DVA questions (${Math.round(held.length / dva.length * 100)}%).`);
if (process.argv.includes('--dry')) process.exit(0);
const out = `// The Exam Hall's held-out DVA-C02 questions: written by tools/exam_heldout.js, don't edit by hand.
// Reviews, quizzes and chapters never ask these (js/exam.js), so the Exam Hall's score measures new wording.
window.SD = window.SD || {};
SD.examForms = {
${Object.keys(forms).map(f => `  ${f}: ${JSON.stringify(forms[f].map(q => q.id)).replace(/","/g, '", "')}`).join(',\n')}
};
SD.examHeldOut = [].concat(SD.examForms.half, SD.examForms.A, SD.examForms.B);
`;
fs.writeFileSync(path.join(ROOT, 'js/exam-heldout.js'), out);
console.log('Wrote js/exam-heldout.js');
