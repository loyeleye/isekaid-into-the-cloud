#!/usr/bin/env node
// Help check: every concept needs a "Huh???" line (SD.huh) and every question in SD.questions needs an "ELI5 🎮" line
// (SD.eli5), both in js/eli5.js. Without them the Huh??? panel opens empty and the ELI5 button doesn't show.
// Loads every script index.html loads (in a stubbed browser), once as the painted build and once as the vector build
// (index.html?vector, which adds chapter 2's concepts and questions). Also lists SD.huh and SD.eli5 keys that match
// no concept or question, and glossary entries whose matcher no question uses. Bank questions (js/bank-*.js) a chapter
// asks by id (a quoted id such as 'dva-1-601' in a chapter's script, as SD.qpick pools name them) need an ELI5 line
// too; a question a chapter asks inline can carry its own (q.eli5) instead.
//
//   node tools/help_check.js          report, exit 1 if anything is missing
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

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
  return { SD: ctx.SD, errors, srcs };
}

const concepts = new Set(), questions = new Map(), errors = [];
let SD;
for (const vector of [false, true]) {
  const r = load(vector);
  SD = r.SD; errors.push(...r.errors);
  Object.keys(SD.concepts).forEach(c => concepts.add(c));
  SD.questions.forEach(q => questions.set(q.id || '(no id) ' + q.q.slice(0, 50), q));
  for (const s of r.srcs.filter(s => !/^js\/bank-/.test(s))) {
    for (const m of fs.readFileSync(path.join(ROOT, s), 'utf8').matchAll(/['"]((?:dva|saa)-\d-\d{2,3})['"]/g)) {
      const q = (SD.bank || []).find(b => b.id === m[1]);
      if (q) questions.set(q.id, q);
    }
  }
}
const noHuh = [...concepts].filter(c => !SD.huh[c]);
const noEli = [...questions.keys()].filter(id => !SD.eli5[id] && !questions.get(id).eli5);
const strayHuh = Object.keys(SD.huh).filter(c => !concepts.has(c));
// Bank questions carry ELI5 lines too (the game shows them on any question), so a bank id isn't a stray key.
const strayEli = Object.keys(SD.eli5).filter(id => !questions.has(id) && !(SD.bank || []).some(b => b.id === id));
const texts = [...questions.values()].map(q => [q.q, q.why].concat(q.opts || [], (q.items || []).map(i => i.t || i)).join(' '));
const unusedGloss = SD.glossary.filter(g => !texts.some(t => g[1].test(t))).map(g => g[0]);

console.log(`${concepts.size} concepts, ${questions.size} questions (chapters' own and the bank questions they ask), ${SD.glossary.length} glossary terms`);
errors.forEach(e => console.log('load error: ' + e));
if (noHuh.length) console.log('Concepts with no Huh??? line (SD.huh): ' + noHuh.join(', '));
if (noEli.length) console.log('Questions with no ELI5 line (SD.eli5): ' + noEli.join(', '));
if (strayHuh.length) console.log('SD.huh keys with no concept: ' + strayHuh.join(', '));
if (strayEli.length) console.log('SD.eli5 keys with no question: ' + strayEli.join(', '));
if (unusedGloss.length) console.log('Glossary terms no question uses yet (fine, for later chapters): ' + unusedGloss.join(', '));
if (!noHuh.length && !noEli.length) console.log('Every concept has a Huh??? line and every question an ELI5 line.');
process.exit(noHuh.length || noEli.length ? 1 : 0);
