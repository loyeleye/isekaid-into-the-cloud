// Node check of Incident Commander's fix cards (js/ic-fix.js) against the DVA-C02 bank: every fix is complete, the
// matcher reads only the right answer, `only` fixes stay on their service, and how many request-path incidents get a
// card. Run from game/:  node tools/ic_fix_check.js     (add an id, e.g. dlq, to list the questions it matches)
const fs = require('fs'), vm = require('vm'), path = require('path');
const JS = path.resolve(__dirname, '../js') + '/';
global.window = global; global.SD = { bank: [] };
for (const f of fs.readdirSync(JS).filter(f => /^bank-dva/.test(f) && !/eli5/.test(f))) vm.runInThisContext(fs.readFileSync(JS + f, 'utf8'), { filename: f });
require(JS + 'ic-fix.js');
const F = SD.icFix, fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const NODE = { apigateway: 'apigw', lambda: 'lambda', dynamodb: 'ddb', dax: 'ddb', sqs: 'sqs', s3: 's3' };
const norm = t => String(t || '').toLowerCase().replace(/[\s_-]+/g, '');
const PICS = fs.readdirSync(path.resolve(__dirname, '../assets/img/ic')).filter(f => /^fix-/.test(f)).map(f => f.slice(4, -5));
check(F.FIXES.every(f => f.id && f.name && f.line && f.does && f.re instanceof RegExp), 'every fix has a name, a line, what it does and a matcher');
check(F.FIXES.every(f => PICS.includes(f.pic)), 'every fix has its painted picture (' + PICS.length + ')');
check(new Set(F.FIXES.map(f => f.id)).size === F.FIXES.length, 'fix ids are unique');
const mc = (right, wrong) => ({ type: 'mc', opts: [right, wrong], a: 0 });
check(F.fixOf(mc('Raise the visibility timeout.', 'Add a dead-letter queue.'), 'sqs').id === 'vis', 'only the right answer counts');
check(!F.fixOf(mc('Raise the timeout.', 'x'), 'sqs') && F.fixOf(mc('Raise the timeout.', 'x'), 'lambda').id === 'lambdatimeout', 'an "only" fix stays on its own service');
check(F.typed(F.FIXES.find(f => f.id === 'dlq'), '"maxReceiveCount":5') && !F.typed(F.FIXES.find(f => f.id === 'dlq'), '"MaxReceiveCount": 5'), 'typing ignores spaces, not case');
const qs = SD.bank.filter(q => NODE[norm(q.topic)] && /^[14]/.test(String(q.dva || '')));
const by = {};
qs.forEach(q => { const f = F.fixOf(q, NODE[norm(q.topic)]); if (f) (by[f.id] = by[f.id] || []).push(q.id); });
const hit = Object.values(by).reduce((a, l) => a + l.length, 0);
check(hit >= qs.length / 2, `at least half the request-path incidents get a fix card (${hit} of ${qs.length})`);
if (process.argv[2]) (by[process.argv[2]] || []).forEach(id => { const q = SD.bank.find(x => x.id === id); console.log('  ' + id + ': ' + F.rightText(q).slice(0, 140)); });
if (fails.length) { console.log(`\n${fails.length} failed`); process.exit(1); }
console.log('OK: the fix card checks pass.');
