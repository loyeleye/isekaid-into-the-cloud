#!/usr/bin/env node
// Finds each bank question's twins and writes them to js/twins-data.js (SD.twins).
// A twin tests the same rule as another question in a different scenario, so a missed question can come back as a
// question the player hasn't seen (js/qpick.js SD.qtwin, the Wall in js/today.js). Two questions are twins when they
// share an exam task and a topic, and their right answers plus explanations mean nearly the same thing to the
// on-device model (js/embed.js): cosine TWIN or more. Below that, a question on the same task and topic usually
// tests a neighbouring rule, which wouldn't prove the missed one.
// Hand-written twins (a question's own `twin: ['id', ...]`, for new variants) are always kept, whatever the score.
//   node tools/twins.js          write js/twins-data.js and print how many questions have a twin
//   node tools/twins.js --dry    print only
//   node tools/twins.js ID       list ID's nearest same-task, same-topic questions with their scores
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const TWIN = 0.75;

const ctx = { console, SD: {} };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/embed.js'), 'utf8'), ctx, { filename: 'js/embed.js' });
const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /^bank-.*\.js$/.test(f) && !/-eli5\.js$/.test(f)).sort();
for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: 'js/' + f });
const buf = fs.readFileSync(path.join(ROOT, 'assets/model/potion-base-8m.i8'));
const E = ctx.SD.embed;
E.init(fs.readFileSync(path.join(ROOT, 'assets/model/vocab.txt'), 'utf8'), buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const bank = (ctx.SD.bank || []).filter(q => q.id && (q.type === 'mc' || q.type === 'multi'));
const right = q => q.type === 'mc' ? q.opts[q.a] : q.items.filter(i => i.ok).map(i => i.t).join(' ');
const vec = new Map(bank.map(q => [q.id, E.vec(right(q) + ' ' + (q.why || ''))]));
// Same task on either exam, and the same topic.
const near = (a, b) => a !== b && a.topic && a.topic === b.topic && ((a.dva && a.dva === b.dva) || (a.saa && a.saa === b.saa));
const score = (a, b) => E.cos(vec.get(a.id), vec.get(b.id));

const arg = process.argv[2];
if (arg && arg !== '--dry') {
  const q = bank.find(x => x.id === arg);
  if (!q) { console.log('No question ' + arg); process.exit(1); }
  console.log(arg + ': ' + right(q));
  bank.filter(x => near(q, x)).map(x => [score(q, x), x]).sort((a, b) => b[0] - a[0]).slice(0, 8)
    .forEach(([s, x]) => console.log(`  ${s.toFixed(2)}${s >= TWIN ? ' twin' : '     '}  ${x.id}  ${right(x).slice(0, 90)}`));
  process.exit(0);
}

const twins = {};
const add = (a, b) => { (twins[a] = twins[a] || new Set()).add(b); (twins[b] = twins[b] || new Set()).add(a); };
for (let i = 0; i < bank.length; i++) for (let j = i + 1; j < bank.length; j++) {
  const a = bank[i], b = bank[j];
  if (near(a, b) && score(a, b) >= TWIN) add(a.id, b.id);
}
const ids = new Set(bank.map(q => q.id));
let bad = 0;
for (const q of bank) for (const t of q.twin || []) {
  if (!ids.has(t)) { console.log(`${q.id}: twin ${t} is not in the bank`); bad++; continue; }
  add(q.id, t);
}
const out = {};
Object.keys(twins).sort().forEach(k => { out[k] = [...twins[k]].sort(); });
const dva = bank.filter(q => q.exam === 'DVA' || q.exam === 'both');
console.log(`${Object.keys(out).length} of ${bank.length} questions have a twin (DVA-C02: ${dva.filter(q => out[q.id]).length} of ${dva.length}).`);
if (bad) process.exitCode = 1;
if (process.argv.includes('--dry')) process.exit();
const body = Object.keys(out).map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])}`).join(',\n');
fs.writeFileSync(path.join(ROOT, 'js/twins-data.js'),
  `// Twins: questions that test the same rule in a different scenario. Written by tools/twins.js, don't edit by hand;\n` +
  `// give a new question a \`twin\` list instead and rerun the tool.\nwindow.SD = window.SD || {};\nSD.twins = {\n${body}\n};\n`);
console.log('Wrote js/twins-data.js');
