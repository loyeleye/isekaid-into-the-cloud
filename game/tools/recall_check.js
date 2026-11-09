#!/usr/bin/env node
// Measures Type it first's matcher (js/recall.js) on short typed answers to real bank questions
// (tools/recall-answers.json): does the option it picks match the right answer, and how often is it sure?
// Two sets: answers phrased with the options' own words, and answers phrased as the principle in plain words. Both
// were written by Claude, not by players, so treat the numbers as a first check, not as field accuracy.
//   node tools/recall_check.js            both sets, with and without the on-device model
//   node tools/recall_check.js --strict   exit 1 if a sure match is wrong more than 5% of the time
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, SD: {} };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['js/embed.js', 'js/recall.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(f => /^bank-.*\.js$/.test(f) && !/-eli5\.js$/.test(f)).sort())
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: 'js/' + f });
const buf = fs.readFileSync(path.join(ROOT, 'assets/model/potion-base-8m.i8'));
const vocab = fs.readFileSync(path.join(ROOT, 'assets/model/vocab.txt'), 'utf8');
const { SD } = ctx, byId = new Map(SD.bank.map(q => [q.id, q]));
const sets = JSON.parse(fs.readFileSync(path.join(__dirname, 'recall-answers.json'), 'utf8'));
let worst = 0;
const run = (name, set, model) => {
  SD.embed.ready = false;
  if (model) SD.embed.init(vocab, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  let n = 0, top = 0, sure = 0, sureRight = 0; const misses = [];
  for (const [id, answers] of Object.entries(set)) {
    const q = byId.get(id); if (!q) { console.log('  no question ' + id); continue; }
    for (const t of answers) {
      n++; const r = SD.recall.match(t, q.opts);
      if (r.best === q.a) top++;
      if (r.sure) { sure++; if (r.best === q.a) sureRight++; else misses.push(`${id} "${t}" -> option ${r.best}`); }
    }
  }
  const pct = x => Math.round(x * 100) + '%';
  console.log(`${name}, ${model ? 'with the model' : 'words only'}: ${n} answers. Top pick right ${pct(top / n)}. Sure on ${pct(sure / n)}; right when sure ${sure ? pct(sureRight / sure) : '-'}.`);
  misses.forEach(m => console.log('  sure but wrong: ' + m));
  if (sure) worst = Math.max(worst, 1 - sureRight / sure);
};
for (const model of [true, false]) {
  run('Option words', sets.option_words, model);
  run('Principle words', sets.principle_words, model);
}
if (process.argv.includes('--strict') && worst > 0.05) process.exit(1);
