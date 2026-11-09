#!/usr/bin/env node
// Picks the Exam Hall's held-out questions and writes them to js/exam-heldout.js (ExamPrepDemo, Oct 23).
// A held-out question is a DVA-C02 bank question (exam DVA or both) that no chapter asks: it isn't in SD.questions
// and no chapter script names its id. Reviews, quizzes and chapters never ask these (js/exam.js), so the Exam Hall's
// score measures new wording, not memory of an item. They make three fixed forms: a 33-question baseline half mock
// and two full 65-question mocks (A and B), each split by domain as the real exam is and spread across every task.
// Only multiple choice and multiple response, the exam's two formats, and only services on the exam guide's in-scope list.
// Inside each domain, every form gets each task in proportion to the form's size (Nov 9: the old fixed A, B, half
// rotation gave each form a single task wherever a domain had three).
// The forms are frozen in tools/exam_forms.lock.json once picked, so later bank additions can't move a question between
// forms, or between held out and reachable, after Ladi has taken one. A run copies every locked form as it is; only the
// forms named with --rebuild are picked again, from questions on no kept form. Rebuild a form only before it's taken.
//   node tools/exam_heldout.js                  write js/exam-heldout.js from the lock and print the counts
//   node tools/exam_heldout.js --dry            print only
//   node tools/exam_heldout.js --rebuild A,B    pick those forms again (all: --rebuild half,A,B), then update the lock
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
for (const s of srcs.filter(s => !/^js\/(bank-|exam|twins-data)/.test(s))) {
  for (const m of fs.readFileSync(path.join(ROOT, s), 'utf8').matchAll(/['"]((?:dva|saa)-\d-\d{2,3})['"]/g)) named.add(m[1]);
}
const inGame = new Set(SD.questions.map(q => q.id));
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const dva = SD.bank.filter(q => q.exam === 'DVA' || q.exam === 'both');
// Not on the DVA-C02 guide v2.1 in-scope services list (checked Nov 9, 2026): v2.1 removed CodeGuru, and Verified
// Permissions and the Serverless Application Repository were never listed. Variants (variant: true) are written for
// sibling retries, so they stay reachable.
const OUT_OF_SCOPE = new Set(['codeguru', 'verifiedpermissions', 'sar']);
const free = q => !inGame.has(q.id) && !named.has(q.id) && (q.type === 'mc' || q.type === 'multi') && !OUT_OF_SCOPE.has(q.topic) && !q.variant;
// Each form's questions per domain: the real exam's 65 split 21/17/15/12 (32/26/24/18%), and half of that for the
// baseline.
const FORMS = { half: { 1: 10, 2: 9, 3: 8, 4: 6 }, A: { 1: 21, 2: 17, 3: 15, 4: 12 }, B: { 1: 21, 2: 17, 3: 15, 4: 12 } };
const LOCK = path.join(__dirname, 'exam_forms.lock.json');
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : { forms: {} };
const arg = process.argv.indexOf('--rebuild');
const rebuild = new Set(arg > 0 ? String(process.argv[arg + 1] || '').split(',').filter(Boolean) : []);
for (const f of rebuild) if (!FORMS[f]) { console.log(`--rebuild: no form '${f}' (forms: ${Object.keys(FORMS).join(', ')})`); process.exit(1); }
for (const f of Object.keys(FORMS)) if (!lock.forms[f]) rebuild.add(f);
const kept = Object.keys(FORMS).filter(f => !rebuild.has(f)), picking = Object.keys(FORMS).filter(f => rebuild.has(f));
const keptIds = new Set(kept.flatMap(f => lock.forms[f]));
const forms = {}, rows = [];
Object.keys(FORMS).forEach(f => { forms[f] = kept.includes(f) ? lock.forms[f].map(id => SD.bank.find(q => q.id === id) || { id, dva: '?' }) : []; });
for (const d of picking.length ? [1, 2, 3, 4] : []) {
  const need = picking.reduce((n, f) => n + FORMS[f][d], 0);
  const tasks = [...new Set(dva.filter(q => +q.dva[0] === d).map(q => q.dva))].sort();
  const pool = {}, take = {};
  tasks.forEach(t => { pool[t] = dva.filter(q => q.dva === t && free(q) && !keptIds.has(q.id)).sort((a, b) => hash(a.id) - hash(b.id)); take[t] = 0; });
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
  // Split each task's picks across the forms in proportion to the forms' sizes: round each share down, then give the
  // leftover places one at a time to the form and task furthest below their share, keeping every form's domain count
  // and every task's total exact.
  const ideal = (f, t) => take[t] * FORMS[f][d] / need, cell = {};
  picking.forEach(f => { cell[f] = {}; tasks.forEach(t => { cell[f][t] = Math.floor(ideal(f, t)); }); });
  const rowLeft = f => FORMS[f][d] - tasks.reduce((n, t) => n + cell[f][t], 0);
  const colLeft = t => take[t] - picking.reduce((n, f) => n + cell[f][t], 0);
  for (;;) {
    let best = null;
    for (const f of picking) for (const t of tasks) {
      if (rowLeft(f) <= 0 || colLeft(t) <= 0) continue;
      const gap = ideal(f, t) - cell[f][t];
      if (!best || gap > best.gap) best = { f, t, gap };
    }
    if (!best) break;
    cell[best.f][best.t]++;
  }
  // Deal each task's picks (in hash order) round the forms that still have room for that task.
  for (const t of tasks) {
    let k = 0;
    for (const q of pool[t].slice(0, take[t])) {
      while (!cell[picking[k % picking.length]][t]) k++;
      const f = picking[k++ % picking.length];
      cell[f][t]--; forms[f].push(q);
    }
  }
  const dealt = tasks.reduce((n, t) => n + take[t], 0);
  rows.push(`Domain ${d}: ${dealt} of ${need} (` + tasks.map(t => `${t}: ${take[t]}/${pool[t].length}`).join(', ') + ')');
}
// Each form's questions by task, so a skewed form shows at a glance.
const allTasks = [...new Set(dva.map(q => q.dva))].sort();
for (const f of Object.keys(FORMS)) rows.push(`${f.padEnd(4)} ${kept.includes(f) ? 'kept ' : 'new  '}` + allTasks.map(t => `${t} ${forms[f].filter(q => q.dva === t).length}`).join('  '));
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
if (picking.length) {
  const next = { note: 'The Exam Hall forms, frozen: tools/exam_heldout.js copies these as they are. Only --rebuild changes a form; do that only before Ladi has taken it.', forms: {} };
  Object.keys(FORMS).forEach(f => { next.forms[f] = forms[f].map(q => q.id); });
  next.picked = Object.assign({}, lock.picked || {});
  picking.forEach(f => { next.picked[f] = new Date().toISOString().slice(0, 10); });
  const list = o => '{\n' + Object.keys(o).map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(o[k]).replace(/","/g, '", "')}`).join(',\n') + '\n  }';
  fs.writeFileSync(LOCK, `{\n  "note": ${JSON.stringify(next.note)},\n  "picked": ${list(next.picked)},\n  "forms": ${list(next.forms)}\n}\n`);
  console.log(`Picked ${picking.join(', ')}; wrote tools/exam_forms.lock.json`);
}
console.log('Wrote js/exam-heldout.js');
