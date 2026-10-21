#!/usr/bin/env node
// Question lint: flags multiple choice questions whose right answer gives itself away by length.
// Loads every script index.html loads (in a stubbed browser), once as the painted build and once as the vector build
// (index.html?vector, which adds chapter 2's questions), then walks SD for anything with opts + a, and for every
// question with items (Select TWO and other multi questions).
//
//   node tools/question_lint.js            summary plus every flagged question
//   node tools/question_lint.js --bank     only SD.questions (the spaced-review bank)
//   node tools/question_lint.js --ids q1,q2  print those questions in full
//   node tools/question_lint.js --strict   exit 1 if anything in SD.questions is flagged (for the build)
//
// A single-answer question is flagged when:
//   - the right answer is clearly the longest: at least 15% and 10 characters longer than the longest wrong option
//     (or 40% and 6 characters, for short options), the margin a test-taker notices (tools/length_tell.js);
//   - the right answer is clearly the shortest, by the same margin the other way: the opposite tell;
//   - the right answer is more than 25% longer than the longest wrong option (the older, looser rule);
//   - or a wrong option lacks a "why not" line (q.no[i]) in a question that has any.
// A multi question is flagged when its right items are clearly longer, or clearly shorter, than its wrong ones.
// Across a fair set the right answer should be the longest option about 1 time in 4, and the shortest about as often.
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./length_tell');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const idsArg = args.includes('--ids') ? (args[args.indexOf('--ids') + 1] || '').split(',').filter(Boolean) : [];

function load(vector) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).filter(s => s.startsWith('js/'));
  const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : noop, apply: () => noop, construct: () => noop });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, performance: { now: () => 0 },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: noop, navigator: { userAgent: '' },
    Image: function () {}, Audio: function () {}, location: { search: vector ? '?vector' : '', hash: '', href: '' }, addEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {} }), fetch: () => new Promise(() => {}), SD_VECTOR: vector
  };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  const errors = [];
  for (const s of srcs) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), ctx, { filename: s }); } catch (e) { errors.push(`${vector ? 'vector ' : ''}${s}: ${e.message}`); }
  }
  return { SD: ctx.SD, errors };
}

const isMC = o => o && Array.isArray(o.opts) && typeof o.a === 'number' && o.opts.every(x => typeof x === 'string');
const isMulti = o => o && Array.isArray(o.items) && o.items.length > 2 && o.items.every(i => i && typeof i.t === 'string' && 'ok' in i) && o.items.some(i => i.ok) && o.items.some(i => !i.ok);

// Every MC or multi question reachable from SD, with a path for the ones that have no id.
function collect(SD, bankOnly) {
  const out = [], seen = new Set();
  if (bankOnly) return (SD.questions || []).filter(q => isMC(q) || isMulti(q)).map(q => ({ q, where: 'SD.questions' }));
  (function walk(o, p, depth) {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 12) return;
    seen.add(o);
    if (isMC(o) || isMulti(o)) out.push({ q: o, where: p });
    for (const k of Object.keys(o)) { try { walk(o[k], p + '.' + k, depth + 1); } catch (e) { /* getters */ } }
  })(SD, 'SD', 0);
  return out;
}

function check(q) {
  const problems = [];
  if (isMulti(q)) {
    const r = T.multi(q.items);
    if (r.clear) problems.push(`right items clearly longer: ${r.note}`);
    if (r.clearShort) problems.push(`right items clearly shorter: ${r.note}`);
    if (q.items.some(i => !i.ok && !i.no) && q.items.some(i => i.no)) problems.push('a wrong item has no "why not"');
    return { kind: 'multi', r, problems };
  }
  const r = T.mc(q.opts, q.a);
  if (r.clear) problems.push(`right answer clearly longest: ${r.note}`);
  else if (r.right > r.maxWrong * 1.25) problems.push(`right answer ${r.right} chars vs longest wrong ${r.maxWrong}`);
  if (r.clearShort) problems.push(`right answer clearly shortest: right ${r.right} chars vs shortest wrong ${r.minWrong}`);
  if (Array.isArray(q.no)) {
    q.opts.forEach((o, i) => { if (i !== q.a && !q.no[i]) problems.push(`option ${i} has no "why not"`); });
    if (q.no.length !== q.opts.length) problems.push('q.no length does not match opts');
  }
  return { kind: 'mc', r, problems };
}

const loads = [load(false), load(true)];
const errors = loads.flatMap(l => l.errors);
if (errors.length) console.log('Load errors (content after these may be missing):\n  ' + errors.join('\n  '));
// One entry per question: the vector build repeats the painted build's questions, so keep the first of each.
const all = [], keys = new Set();
for (const { SD } of loads) for (const item of collect(SD, flag('--bank') || flag('--strict'))) {
  const key = (item.q.id || item.where) + '|' + JSON.stringify(item.q.opts || item.q.items);
  if (!keys.has(key)) { keys.add(key); all.push(Object.assign(item, { SD })); }
}

if (idsArg.length) {
  for (const { q, where } of all) if (idsArg.includes(q.id)) console.log(where, JSON.stringify(q, null, 1));
  process.exit(0);
}

const zoneOf = (SD, q) => (q.c && SD.concepts[q.c] ? SD.concepts[q.c].zone : '-');
const byZone = {}, mcs = [], multis = [];
let flagged = [], withNo = 0;
for (const item of all) {
  const res = check(item.q);
  const z = zoneOf(item.SD, item.q);
  byZone[z] = byZone[z] || { n: 0, flagged: 0 };
  byZone[z].n++;
  (res.kind === 'mc' ? mcs : multis).push(res.r);
  if (Array.isArray(item.q.no)) withNo++;
  if (res.problems.length) { flagged.push({ item, res }); byZone[z].flagged++; }
}
const t = T.tally(mcs), tm = T.tally(multis);
console.log(`${all.length} multiple choice questions (${mcs.length} single-answer, ${multis.length} multi). ${withNo} have "why not" lines. ${flagged.length} flagged.`);
console.log(`  Length tell, ${T.mcLine(t)}. A fair set is near 25% longest and 25% shortest, with none clearly either.`);
if (multis.length) console.log(`  Length tell, ${T.multiLine(tm)}.`);
console.log('By chapter (zone): ' + Object.entries(byZone).map(([z, v]) => `${z}: ${v.flagged}/${v.n} flagged`).join(', '));
if (!flag('--quiet')) for (const { item, res } of flagged) console.log(`  ${item.q.id || item.where} [${item.q.c || ''}] ${res.problems.join('; ')}`);
if (flag('--strict') && flagged.length) process.exit(1);
