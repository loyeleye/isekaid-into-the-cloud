#!/usr/bin/env node
// Question format check: loads js/fmt-*.js (SD.fmtItems) and checks every item against docs/question-formats.md:
// the fields every item has, the id pattern, tracks and exam-guide tasks, each type's own shape, doc links and
// no em dashes. Prints a count per type and per file, and exits 1 on any problem.
//
//   node tools/format_check.js           from game/
//   node tools/format_check.js --links   also request every doc URL and report any that don't answer 200
const fs = require('fs'), path = require('path'), vm = require('vm'), https = require('https');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);

const TYPES = ['compare', 'seq', 'predict', 'spot', 'recall', 'faded'];
const TRACKS = ['DVA-C02', 'SAA-C03'];
// Task ids from the official exam guides (same lists as tools/bank_check.js).
const TASKS = {
  dva: ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '4.1', '4.2', '4.3'],
  saa: ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2', '3.3', '3.4', '3.5', '4.1', '4.2', '4.3', '4.4']
};
const TRACK_KEY = { 'DVA-C02': 'dva', 'SAA-C03': 'saa' };
const DOC = /^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//;

function load() {
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => /^fmt-.*\.js$/.test(f)).sort();
  const ctx = { console };
  ctx.window = ctx; vm.createContext(ctx);
  const fileOf = new Map(), loadErr = [];
  for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: 'js/' + f }); }
    catch (e) { loadErr.push(`js/${f}: ${e.message}`); }
    for (const q of (ctx.SD && ctx.SD.fmtItems) || []) if (!fileOf.has(q)) fileOf.set(q, f);
  }
  return { items: (ctx.SD && ctx.SD.fmtItems) || [], files, fileOf, loadErr };
}

const str = v => typeof v === 'string' && v.trim().length > 0;
const int = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
const strArr = (v, min) => Array.isArray(v) && v.length >= (min || 1) && v.every(str);
// `no` lines: one per option, null at the right answer, a reason at every other.
function noLines(p, no, n, a, what) {
  if (!Array.isArray(no) || no.length !== n) return p.push(`no needs ${n} entries, one per ${what}`);
  no.forEach((x, i) => { if (i === a ? x !== null : !str(x)) p.push(i === a ? `no[${i}] should be null (the right ${what})` : `no[${i}] needs a reason`); });
}
function walkStrings(v, fn, at) {
  if (typeof v === 'string') fn(v, at);
  else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, fn, `${at}[${i}]`));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) walkStrings(v[k], fn, at ? `${at}.${k}` : k);
}
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(amazon|aws) /, '');

function check(q, ids) {
  const p = [];
  if (!q || typeof q !== 'object') return ['not an object'];
  // Fields every item has.
  if (!TYPES.includes(q.type)) p.push(`type "${q.type}" is not one of ${TYPES.join(', ')}`);
  const m = /^fmt-([a-z]+)-(\d{2,3})$/.exec(q.id || '');
  if (!m) p.push('id should look like fmt-<type>-<nn>');
  else if (m[1] !== q.type) p.push(`id prefix "${m[1]}" doesn't match type "${q.type}"`);
  if (ids.has(q.id)) p.push('duplicate id'); ids.add(q.id);
  if (!Array.isArray(q.tracks) || !q.tracks.length) p.push('tracks must list at least one exam');
  else {
    for (const t of q.tracks) if (!TRACKS.includes(t)) p.push(t === 'DVA-C03' ? 'DVA-C03 is not allowed until its guide is out and the item is checked against it' : `track "${t}" is not one of ${TRACKS.join(', ')}`);
    if (new Set(q.tracks).size !== q.tracks.length) p.push('tracks has duplicates');
  }
  if (!q.task || typeof q.task !== 'object' || Array.isArray(q.task) || !Object.keys(q.task).length) p.push('task must be an object such as { dva: \'3.2\' }');
  else {
    for (const k of Object.keys(q.task)) {
      if (!TASKS[k]) p.push(`task key "${k}" must be dva or saa`);
      else if (!TASKS[k].includes(q.task[k])) p.push(`task ${k} "${q.task[k]}" is not an exam-guide task`);
    }
    for (const t of q.tracks || []) if (TRACK_KEY[t] && !q.task[TRACK_KEY[t]]) p.push(`track ${t} needs a task.${TRACK_KEY[t]}`);
    for (const k of Object.keys(q.task)) if (TASKS[k] && !(q.tracks || []).some(t => TRACK_KEY[t] === k)) p.push(`task.${k} set but tracks doesn't include its exam`);
  }
  if (!str(q.topic) || q.topic !== q.topic.toLowerCase()) p.push('topic must be a lower-case string');
  if (q.c != null && !str(q.c)) p.push('c, when set, must be a concept key');
  if (q.practice != null && typeof q.practice !== 'boolean') p.push('practice, when set, must be true or false');
  for (const f of ['title', 'q', 'why', 'eli5']) if (!str(q[f])) p.push(`needs ${f}`);
  if (!Array.isArray(q.doc) || !q.doc.length) p.push('doc must list AWS documentation URLs');
  else q.doc.forEach(u => { if (!DOC.test(u || '')) p.push(`doc URL must be on https://docs.aws.amazon.com/ or aws.amazon.com: ${u}`); });
  walkStrings(q, (s, at) => { if (s.includes('—')) p.push(`em dash in ${at}`); }, '');

  // Each type's own shape.
  if (q.type === 'compare') {
    const nc = (q.cols || []).length, nr = (q.rows || []).length;
    if (!strArr(q.cols) || nc !== 3) p.push('compare needs exactly 3 cols');
    if (!strArr(q.rows, 2)) p.push('compare needs 2 or more rows');
    if (!Array.isArray(q.cells) || q.cells.length !== nr || !q.cells.every(r => Array.isArray(r) && r.length === 3 && r.every(str))) p.push(`cells must be rows x 3 (${nr} rows of 3 strings)`);
    if (!int(q.a, 3)) p.push('a must be a column index (0 to 2)');
    if (!int(q.key, nr)) p.push(`key must be a row index (0 to ${nr - 1})`);
    if (q.alsoOk != null && (!Array.isArray(q.alsoOk) || !q.alsoOk.every(i => int(i, 3) && i !== q.a))) p.push('alsoOk must list other column indexes');
    noLines(p, q.no, 3, q.a, 'column');
  } else if (q.type === 'seq') {
    if (!strArr(q.steps, 3)) p.push('seq needs 3 or more steps');
    else if (new Set(q.steps).size !== q.steps.length) p.push('steps must be unique');
    if (!Array.isArray(q.decoys) || !q.decoys.length) p.push('seq needs at least one decoy');
    else q.decoys.forEach((d, i) => {
      if (!d || !str(d.t) || !str(d.no)) p.push(`decoys[${i}] needs t and no`);
      else if ((q.steps || []).includes(d.t)) p.push(`decoys[${i}] "${d.t}" is also a step`);
    });
    if (q.topic === 'codedeploy' || /hook/i.test(q.title + ' ' + q.q)) {
      if (!str(q.platform)) p.push('deployment hooks need a platform');
      else if (!(q.platform.split('/')[0]).split(/\s+/).some(w => (q.q || '').includes(w))) p.push(`stem must name the platform (${q.platform})`);
    }
  } else if (q.type === 'predict') {
    if (!str(q.setup)) p.push('predict needs setup');
    if (!strArr(q.opts) || q.opts.length !== 3) p.push('predict needs exactly 3 opts');
    if (!int(q.a, 3)) p.push('a must be an option index (0 to 2)');
    noLines(p, q.no, (q.opts || []).length, q.a, 'option');
    if (!str(q.reveal)) p.push('predict needs reveal');
    if (q.anim != null && !str(q.anim)) p.push('anim, when set, must be a string');
  } else if (q.type === 'spot') {
    const n = (q.lines || []).length;
    if (!Array.isArray(q.lines) || !n || !q.lines.every(l => typeof l === 'string')) p.push('spot needs lines');
    if (n > 16) p.push(`spot has ${n} lines (16 at most)`);
    (q.lines || []).forEach((l, i) => { if (typeof l === 'string' && l.length > 60) p.push(`lines[${i}] is ${l.length} characters (60 at most)`); });
    if (!int(q.bad, n)) p.push(`bad must be a line index (0 to ${n - 1})`);
    if (!strArr(q.reasons, 2)) p.push('spot needs 2 or more reasons');
    if (!int(q.a, (q.reasons || []).length)) p.push('a must be a reason index');
    noLines(p, q.no, (q.reasons || []).length, q.a, 'reason');
    if (typeof q.fix !== 'string') p.push('spot needs fix');
    else if (q.fix.length > 60) p.push(`fix is ${q.fix.length} characters (60 at most)`);
    else if (int(q.bad, n) && q.fix === q.lines[q.bad]) p.push('fix is the same as the bad line');
  } else if (q.type === 'recall') {
    const ans = q.answers || [];
    if (!Array.isArray(q.answers) || !ans.length) p.push('recall needs answers');
    ans.forEach((a, i) => {
      if (!a || !str(a.t)) p.push(`answers[${i}] needs t`);
      if (a && a.alt != null && (!Array.isArray(a.alt) || !a.alt.every(str))) p.push(`answers[${i}].alt must be a list of strings`);
    });
    if (!Number.isInteger(q.need) || q.need < 1 || q.need > ans.length) p.push(`need must be 1 to ${ans.length} (the number of answers)`);
    if (!Array.isArray(q.decoys) || !q.decoys.length) p.push('recall needs at least one decoy for the word bank');
    else {
      const names = new Set(ans.flatMap(a => [a.t].concat(a.alt || [])).map(norm));
      q.decoys.forEach((d, i) => {
        if (!d || !str(d.t) || !str(d.no)) p.push(`decoys[${i}] needs t and no`);
        else if (names.has(norm(d.t))) p.push(`decoys[${i}] "${d.t}" matches an answer`);
      });
    }
  } else if (q.type === 'faded') {
    if (!Array.isArray(q.steps) || q.steps.length < 2) p.push('faded needs 2 or more steps');
    (q.steps || []).forEach((s, i) => {
      if (!s || !str(s.t)) return p.push(`steps[${i}] needs t`);
      if (!str(s.why)) p.push(`steps[${i}] needs why`);
      if (!strArr(s.opts, 2)) return p.push(`steps[${i}] needs 2 or more opts`);
      const n = s.opts.filter(o => o === s.t).length;
      if (n !== 1) p.push(`steps[${i}].opts contains its t ${n} times (needs exactly once)`);
      if (new Set(s.opts).size !== s.opts.length) p.push(`steps[${i}].opts has duplicates`);
      if (s.no != null) {
        const right = s.opts.indexOf(s.t);
        if (!Array.isArray(s.no) || s.no.length !== s.opts.length) p.push(`steps[${i}].no needs ${s.opts.length} entries, one per opt`);
        else s.no.forEach((x, k) => { if (k === right ? x !== null : !str(x)) p.push(k === right ? `steps[${i}].no[${k}] should be null (the right opt)` : `steps[${i}].no[${k}] needs a reason`); });
      }
    });
    if (q.fade != null && !int(q.fade, 4)) p.push('fade, when set, must be 0 to 3');
  }
  return p;
}

function head(u) {
  return new Promise(res => {
    const req = https.get(u, { headers: { 'User-Agent': 'format_check' } }, r => { r.resume(); res(r.statusCode >= 300 && r.statusCode < 400 && r.headers.location ? head(new URL(r.headers.location, u).href) : r.statusCode); });
    req.on('error', e => res(e.code || 'error'));
    req.setTimeout(15000, () => { req.destroy(); res('timeout'); });
  });
}

(async () => {
  const { items, files, fileOf, loadErr } = load();
  const ids = new Set();
  let bad = 0;
  for (const e of loadErr) { console.log('LOAD ' + e); bad++; }
  for (const q of items) {
    const p = check(q, ids);
    if (p.length) { bad += p.length; console.log(`${(q && q.id) || '(no id)'} (js/${fileOf.get(q) || '?'}):\n  - ${p.join('\n  - ')}`); }
  }
  if (args.includes('--links')) {
    const urls = [...new Set(items.flatMap(q => (q && q.doc) || []))];
    for (const u of urls) { const s = await head(u); if (s !== 200) { bad++; console.log(`doc link ${u} answered ${s}`); } }
    console.log(`Checked ${urls.length} doc links.`);
  }
  console.log(`\n${items.length} items in ${files.length} files (${files.join(', ') || 'none'})`);
  const row = (name, list) => `  ${name.padEnd(22)}${TYPES.map(t => String(list.filter(q => q && q.type === t).length).padStart(9)).join('')}${String(list.length).padStart(8)}`;
  console.log(`  ${''.padEnd(22)}${TYPES.map(t => t.padStart(9)).join('')}${'total'.padStart(8)}`);
  for (const f of files) console.log(row('js/' + f, items.filter(q => fileOf.get(q) === f)));
  console.log(row('all', items));
  for (const t of TRACKS) console.log(`  ${t}: ${items.filter(q => q && (q.tracks || []).includes(t)).length} items`);
  console.log(bad ? `\n${bad} problem${bad === 1 ? '' : 's'}.` : '\nNo problems.');
  process.exit(bad ? 1 : 0);
})();
