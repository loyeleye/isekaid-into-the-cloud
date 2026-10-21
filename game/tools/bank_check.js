#!/usr/bin/env node
// Question bank check: loads js/bank-*.js (SD.bank) and checks every question's shape and tags, then prints how the
// bank is spread across each exam's domains next to the official weights.
//
//   node tools/bank_check.js            schema problems plus the spread
//   node tools/bank_check.js --links    also request every doc URL and report any that don't answer 200
//   node tools/bank_check.js --md FILE  write the whole bank as a readable Markdown file
//   node tools/bank_check.js --strict   exit 1 on any problem (for the build)
//   node tools/bank_check.js --tells    also list the questions behind each file's "longest" and "shortest" counts
//
// It also checks for a length tell (tools/length_tell.js): a right answer, or a Select TWO pair of right items, that is
// clearly longer or clearly shorter than the wrong ones counts as a problem, and the spread lists, per file, how often
// the right answer is the longest and the shortest option.
const fs = require('fs'), path = require('path'), vm = require('vm'), https = require('https');
const T = require('./length_tell');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const mdOut = flag('--md') ? args[args.indexOf('--md') + 1] : null;

// Domains, weights and task ids from the official exam guides (DVA-C02 v2.1, SAA-C03).
const EXAMS = {
  DVA: { name: 'DVA-C02', weights: { 1: 32, 2: 26, 3: 24, 4: 18 }, tasks: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '4.1', '4.2', '4.3'] },
  SAA: { name: 'SAA-C03', weights: { 1: 30, 2: 26, 3: 24, 4: 20 }, tasks: ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2', '3.3', '3.4', '3.5', '4.1', '4.2', '4.3', '4.4'] }
};

function load() {
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /^bank-.*\.js$/.test(f)).sort();
  const ctx = { console };
  ctx.window = ctx; vm.createContext(ctx);
  const fileOf = new Map();
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: 'js/' + f });
    for (const q of ctx.SD.bank || []) if (!fileOf.has(q)) fileOf.set(q, f);
  }
  return { bank: ctx.SD.bank || [], files, fileOf };
}

function check(q, ids) {
  const p = [];
  if (!/^(dva|saa)-\d-\d{2,3}$/.test(q.id || '')) p.push('id should look like dva-1-01 or dva-1-101');
  if (ids.has(q.id)) p.push('duplicate id'); ids.add(q.id);
  if (!['DVA', 'SAA', 'both'].includes(q.exam)) p.push('exam must be DVA, SAA or both');
  for (const ex of ['DVA', 'SAA']) {
    const key = ex.toLowerCase(), needed = q.exam === ex || q.exam === 'both';
    if (needed && !EXAMS[ex].tasks.includes(q[key])) p.push(`${key} task "${q[key]}" is not a ${EXAMS[ex].name} task`);
    if (!needed && q[key]) p.push(`${key} task set but exam is ${q.exam}`);
  }
  if (!q.topic) p.push('no topic');
  if (!q.q || !q.why) p.push('needs q and why');
  if (!Array.isArray(q.doc) || !q.doc.length || !q.doc.every(u => /^https:\/\/docs\.aws\.amazon\.com\//.test(u))) p.push('doc must list docs.aws.amazon.com pages');
  if (q.type === 'mc') {
    if (!Array.isArray(q.opts) || q.opts.length !== 4) p.push('mc needs 4 options');
    else {
      if (!(q.a >= 0 && q.a < 4)) p.push('a out of range');
      if (!Array.isArray(q.no) || q.no.length !== 4 || q.no[q.a] !== null || q.no.some((n, i) => i !== q.a && !n)) p.push('no needs a line per wrong option and null at a');
      const L = q.opts.map(o => o.length), maxWrong = Math.max(...L.filter((_, i) => i !== q.a));
      if (L[q.a] > maxWrong * 1.25) p.push(`right answer gives itself away by length (${L[q.a]} vs ${maxWrong})`);
      else if (q.opts.every(o => typeof o === 'string')) {
        const r = T.mc(q.opts, q.a);
        if (r.clear) p.push(`right answer is clearly the longest (${r.right} vs longest wrong ${r.maxWrong})`);
        if (r.clearShort) p.push(`right answer is clearly the shortest (${r.right} vs shortest wrong ${r.minWrong})`);
      }
    }
  } else if (q.type === 'multi') {
    const items = q.items || [], right = items.filter(i => i.ok);
    if (items.length < 5) p.push('multi needs 5 or more items');
    if (q.hint !== 'Select TWO.' || right.length !== 2) p.push('multi should be "Select TWO." with exactly 2 right items');
    if (items.some(i => !i.ok && !i.no)) p.push('every wrong item needs a no line');
    if (!q.q.includes('(Select TWO.)')) p.push('stem should end with (Select TWO.)');
    if (right.length && right.length < items.length && items.every(i => typeof i.t === 'string')) {
      const r = T.multi(items);
      if (r.clear) p.push(`right items are clearly longer (${r.note})`);
      if (r.clearShort) p.push(`right items are clearly shorter (${r.note})`);
    }
  } else p.push(`type ${q.type} is not mc or multi`);
  return p;
}

function spread(bank) {
  const out = [];
  for (const ex of ['DVA', 'SAA']) {
    const qs = bank.filter(q => q.exam === ex || q.exam === 'both');
    if (!qs.length) continue;
    const key = ex.toLowerCase(), E = EXAMS[ex];
    const doms = Object.keys(E.weights).map(d => {
      const n = qs.filter(q => (q[key] || '')[0] === d).length;
      return `D${d} ${n} (${Math.round(100 * n / qs.length)}%, guide ${E.weights[d]}%)`;
    });
    const multi = qs.filter(q => q.type === 'multi').length;
    const mcs = qs.filter(q => q.type === 'mc');
    const longest = mcs.filter(q => q.opts[q.a].length === Math.max(...q.opts.map(o => o.length))).length;
    const pos = [0, 1, 2, 3].map(i => mcs.filter(q => q.a === i).length);
    const untouched = E.tasks.filter(t => !qs.some(q => q[key] === t));
    out.push(`${E.name}: ${qs.length} questions (${qs.filter(q => q.exam === 'both').length} shared). ${doms.join(', ')}.`);
    out.push(`  Select TWO: ${multi} (${Math.round(100 * multi / qs.length)}%). Right answer longest in ${longest} of ${mcs.length} single-answer questions. Tasks with no question yet: ${untouched.join(', ') || 'none'}.`);
    out.push(`  Right answer position as written (the game shuffles): ${pos.join(' / ')}`);
  }
  return out.join('\n');
}

// Per bank file: how often the right answer is the longest and the shortest, and how often by a clear margin.
function tells(bank, files, fileOf) {
  const out = ['Length tell by file (single-answer: longest / shortest / clearly either; Select TWO: both right are the two longest / two shortest / clearly either):'];
  const row = (name, qs) => {
    const m = T.tally(qs.filter(q => q.type === 'mc').map(q => T.mc(q.opts, q.a)));
    const u = T.tally(qs.filter(q => q.type === 'multi').map(q => T.multi(q.items)));
    return `  ${name.padEnd(17)} mc ${String(m.n).padStart(3)}: longest ${String(m.longest).padStart(3)} (${T.pct(m.longest, m.n).padStart(4)}), shortest ${String(m.shortest).padStart(3)} (${T.pct(m.shortest, m.n).padStart(4)}), clear ${m.clear}/${m.clearShort}` +
      `   two ${String(u.n).padStart(3)}: top two ${String(u.topK).padStart(2)} (${T.pct(u.topK, u.n).padStart(4)}), bottom two ${String(u.bottomK).padStart(2)} (${T.pct(u.bottomK, u.n).padStart(4)}), clear ${u.clear}/${u.clearShort}`;
  };
  for (const f of files) out.push(row(f.replace(/^bank-|\.js$/g, ''), bank.filter(q => fileOf.get(q) === f)));
  for (const ex of ['DVA', 'SAA']) out.push(row(EXAMS[ex].name + ' total', bank.filter(q => q.exam === ex || q.exam === 'both')));
  out.push(row('whole bank', bank));
  out.push('  A fair bank is near 25% longest and 25% shortest for four options, and near 10% top two for five items, with no clear tells.');
  if (flag('--tells')) for (const q of bank.filter(q => q.type === 'mc')) {
    const r = T.mc(q.opts, q.a);
    if (r.longest || r.shortest) out.push(`    ${q.id} ${r.longest ? 'longest' : 'shortest'}: right ${r.right}, wrong ${r.minWrong} to ${r.maxWrong}`);
  }
  return out.join('\n');
}

function head(url) {
  return new Promise(res => {
    const req = https.request(url, { method: 'GET', headers: { 'User-Agent': 'bank-check' } }, r => {
      r.resume();
      // AWS docs answer a missing page with a redirect to the guide's front page, so a redirect counts as broken.
      res(r.statusCode >= 300 && r.statusCode < 400 ? `${r.statusCode} to ${r.headers.location}, from` : r.statusCode);
    });
    req.on('error', e => res(e.code || 'error'));
    req.setTimeout(20000, () => { req.destroy(); res('timeout'); });
    req.end();
  });
}

function markdown(bank) {
  const L = ['# Question bank', '', 'Generated from `game/js/bank-*.js` by `node tools/bank_check.js --md`. Answers are under each question: right ones are marked ✅, and each wrong option says why not. Options are shuffled, as in the game.', ''];
  for (const q of bank) {
    const tags = [q.dva && `DVA ${q.dva}`, q.saa && `SAA ${q.saa}`, q.topic].filter(Boolean).join(' · ');
    L.push(`## ${q.id}`, '', `*${tags}*`, '', q.q, '');
    // Right answers are written first; shuffle by a seed from the id, as the game shuffles, so the file doesn't give them away.
    let seed = [...q.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rand = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
    const opts = (q.type === 'mc' ? q.opts.map((t, i) => ({ t, ok: i === q.a, no: q.no[i] })) : q.items.slice())
      .map(o => [rand(), o]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    opts.forEach((o, i) => L.push(`${String.fromCharCode(65 + i)}. ${o.ok ? '✅ ' : ''}${o.t}${o.ok ? '' : `  \n   *Why not:* ${o.no}`}`));
    L.push('', `**Why:** ${q.why}`, '', 'Docs: ' + q.doc.map(u => `<${u}>`).join(', '), '');
  }
  return L.join('\n');
}

(async () => {
  const { bank, files, fileOf } = load();
  const ids = new Set();
  let problems = 0;
  for (const q of bank) {
    const p = check(q, ids);
    if (p.length) { problems += p.length; console.log(`  ${q.id}: ${p.join('; ')}`); }
  }
  console.log(`${bank.length} questions from ${files.join(', ')}. ${problems} problems.`);
  console.log(spread(bank));
  console.log(tells(bank, files, fileOf));
  if (flag('--links')) {
    const urls = [...new Set(bank.flatMap(q => q.doc || []))];
    const bad = [];
    for (let i = 0; i < urls.length; i += 8) {
      const codes = await Promise.all(urls.slice(i, i + 8).map(head));
      codes.forEach((c, j) => { if (c !== 200) bad.push(`${c} ${urls[i + j]}`); });
    }
    console.log(`${urls.length} doc links, ${bad.length} not answering 200.` + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
    problems += bad.length;
  }
  if (mdOut) { fs.writeFileSync(mdOut, markdown(bank)); console.log('Wrote ' + mdOut); }
  if (flag('--strict') && problems) process.exit(1);
})();
