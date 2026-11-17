// Headless check of Type it once (js/type-once.js) at phone width (375px): the shared typing step the Fire Drill,
// Look-Alike Cup, Monster Hunt, Exam Sprint, Policy Sorts and Architect's Draft use at their pauses. The token picked
// from a line of AWS text, the panel (the token blanked in its line, two misses show it faintly, case and quotes
// ignored), "Not now" (comes back), the phone buttons, older saves' typed terms, the panel underneath put back after,
// bind() on a mode's own blank, and every hand-picked answer actually sitting in its line. The Fire Drill's runbook is
// typed for real in tools/drill_check.js.
// Run from game/:  node tools/type_once_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'type-once-' + name + '.png'), fullPage: false }); };
  const txt = sel => page.textContent(sel);
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const submit = async v => { await page.fill('#panel .to-in', v); await page.click('#panel .to-card [type="submit"]'); };

  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');

  // ---- The token in a line ----
  const toks = await page.evaluate(() => [
    '"Condition": { "StringEquals": { "kms:ViaService": "s3.us-east-1.amazonaws.com" } }',
    'VisibilityTimeout: 60', 'ShardIteratorType: AFTER_SEQUENCE_NUMBER', 'ConditionExpression: attribute_not_exists(orderId)',
    'aws lambda update-function-configuration --memory-size 1024', 'retry_mode = standard', 'Turn on DynamoDB Streams in CloudWatch', 'A plain sentence.'
  ].map(l => SD.typeOnce.token(l)));
  check(JSON.stringify(toks) === JSON.stringify(['kms:ViaService', 'VisibilityTimeout', 'AFTER_SEQUENCE_NUMBER', 'attribute_not_exists', '--memory-size', 'retry_mode', '', '']),
    'token() picks the condition key, setting, constant, function, flag or snake_case key, and skips product names: ' + toks.join(' | '));
  check(await page.evaluate(() => SD.typeOnce.token('ShardIteratorType: AFTER_SEQUENCE_NUMBER', 'ShardIteratorType')) === 'ShardIteratorType', 'prefer wins when it is in the line');
  check(await page.evaluate(() => SD.typeOnce.match('  "VisibilityTimeout", ', 'visibilitytimeout') && !SD.typeOnce.match('Visibility', 'VisibilityTimeout') && !SD.typeOnce.match('', '')), 'match() ignores case, spaces and quotes, and nothing typed is never right');

  // ---- Every hand-picked answer sits in its line ----
  const bad = await page.evaluate(() => {
    const out = [];
    Object.entries(SD.policySorts || {}).forEach(([k, P]) => { if (P.type && !P.type.line.includes(P.type.ans)) out.push('sort ' + k); (P.reqs || []).forEach((x, i) => { if (x.by && !String(P.ev).includes(x.by)) out.push('sort ' + k + ' request ' + i + ': its deciding line is not in the policy'); }); });
    Object.entries((SD.table && SD.table.PINS) || {}).forEach(([k, p]) => { if (p.type ? !p.term.includes(p.type) : p.term && !SD.typeOnce.token(p.term) && !/^(pss|xmeta)$/.test(k)) out.push('pin ' + k + ' ("' + p.term + '")'); });
    return out;
  });
  check(!bad.length, 'every Policy Sort\'s typed part is in its line, and every Look-Alike Cup pin\'s term has a part to type (its type: in its term), but the two with nothing worth it' + (bad.length ? ': ' + bad.join(', ') : ''));

  // ---- The panel: blanked in its line, on top of what was open, put back after ----
  await page.evaluate(() => { SD.ui.panel('<p id="under">The bill underneath.</p>', { title: 'THE BILL' }); window.__r = null;
    SD.typeOnce.maybe('VisibilityTimeout: 60', { who: 'Kagemaru', say: 'Sign for it.', title: 'HIS LEDGER' }).then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-win .to-in');
  check(/HIS LEDGER/.test(await txt('#panel .win-h')) && /Kagemaru:/.test(await txt('#panel .to-say')) && (await txt('#panel .to-line')).trim() === ': 60', 'the panel blanks the token in its line, with who says it');
  await noHScroll('panel'); await shot('panel');
  await submit('VisibilityTime');
  check(/One more try/.test(await txt('#panel .to-note')) && !await page.getAttribute('#panel .to-in', 'placeholder'), 'one miss: one more try, nothing shown yet');
  await submit('visibility timeout x');
  check(await page.getAttribute('#panel .to-in', 'placeholder') === 'VisibilityTimeout' && await page.$('#panel .to-in.faint') && /faintly/.test(await txt('#panel .to-note')), 'two misses: it shows faintly in the blank, to copy');
  await shot('faint');
  await submit('visibilitytimeout');
  check(/Typed\. It's yours now/.test(await txt('#panel .to-note')) && /VisibilityTimeout: 60/.test(await txt('#panel .to-line.done')), 'typed: the whole line, filled in');
  await shot('typed');
  await page.click('#panel [data-go]');
  await page.waitForFunction(() => window.__r);
  const r1 = await page.evaluate(() => window.__r);
  check(r1.typed && r1.misses === 2 && !r1.skipped && await page.evaluate(() => !!SD.state.save.typed.visibilitytimeout), 'it resolves typed, with its misses, and the save keeps it');
  check(!!await page.$('#panel #under') && /THE BILL/.test(await txt('#panel .win-h')), 'what was open underneath is put back as it was');
  check(await page.evaluate(() => SD.typeOnce.maybe('VisibilityTimeout: 360', {})) === null, 'once typed, it is never asked again, in any mode');

  // ---- Not now comes back ----
  await page.evaluate(() => { window.__r = null; SD.typeOnce.maybe('MaximumBatchingWindowInSeconds: 5').then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-win [data-skip]');
  await page.click('#panel [data-skip]');
  await page.waitForFunction(() => window.__r);
  check(await page.evaluate(() => window.__r.skipped && SD.typeOnce.need('MaximumBatchingWindowInSeconds')), '"Not now" skips without marking it, so it comes back next time');

  // ---- Phone buttons ----
  await page.evaluate(() => { window.__r = null; SD.typeOnce.maybe('"Action": "kms:GenerateDataKey"', { choices: ['kms:Encrypt', 'kms:GenerateDataKey', 'kms:Decrypt'] }).then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-ch button');
  check(await page.$('#panel .to-in') === null && await page.$$eval('#panel .to-ch button', b => b.length) === 3, 'with choices: buttons in place of the text box');
  await shot('choices');
  await page.click('#panel [data-ch="kms:Encrypt"]');
  check(await page.$eval('#panel [data-ch="kms:Encrypt"]', b => b.disabled), 'a wrong pick is crossed off');
  await page.click('#panel [data-ch="kms:GenerateDataKey"]');
  await page.click('#panel [data-go]');
  await page.waitForFunction(() => window.__r);
  check(await page.evaluate(() => window.__r.typed && SD.typeOnce.learned('kms:GenerateDataKey')), 'a right pick marks it');

  // ---- Older saves and switches ----
  check(await page.evaluate(() => { SD.state.save.renoKeep = { typed: { 'dynamodb:LeadingKeys': 1 } }; SD.state.save.icTyped = { ReportBatchItemFailures: 1 }; return SD.typeOnce.learned('dynamodb:leadingkeys') && !SD.typeOnce.need('ReportBatchItemFailures'); }), 'terms typed in the Renovation or the Incident Commander count here too');
  check(await page.evaluate(async () => { SD.typeOnce.off = true; const r = await SD.typeOnce.maybe('BisectBatchOnFunctionError: true'); SD.typeOnce.off = false; return r === null && !document.querySelector('#panel .to-win'); }), 'off: maybe() asks nothing');

  // ---- bind(): a blank a mode draws itself ----
  const bd = await page.evaluate(() => {
    const i = document.createElement('input'); document.body.appendChild(i); const log = [];
    const h = SD.typeOnce.bind(i, 'FunctionResponseTypes', { onOk: m => log.push('ok' + m), onMiss: m => log.push('miss' + m) });
    i.value = 'Function'; h.check(); i.value = 'Responses'; h.check(); const ph = i.placeholder; i.value = 'functionresponsetypes'; h.check(); i.remove();
    return { log, ph, done: h.done, learned: SD.typeOnce.learned('FunctionResponseTypes') };
  });
  check(bd.log.join() === 'miss1,miss2,ok2' && bd.ph === 'FunctionResponseTypes' && bd.done && bd.learned, 'bind(): the same two-miss rule on a mode\'s own blank');

  // ---- Spaced recall: 1, 2, 4, 8 days; a miss starts over; pulled in to the day before the exam ----
  const sr = await page.evaluate(() => {
    const T = SD.typeOnce, DAY = 864e5, real = Date.now; let now = new Date('2026-11-01T09:00:00').getTime();
    Date.now = () => now; SD.state.save.examDate = '2026-11-30';
    const k = 'eventsourcemapping', t = 'EventSourceMapping', out = {};
    T.mark(t); out.first = SD.state.save.typedDue[k].n === 0 && !T.need(t);
    now += DAY - 60e3; out.notYet = !T.need(t);
    now += 120e3; out.dayOne = T.due(t) && T.need(t);
    T.mark(t, 0); out.two = (SD.state.save.typedDue[k].due - now) / DAY;
    now = SD.state.save.typedDue[k].due + 1; T.mark(t, 0); out.four = (SD.state.save.typedDue[k].due - now) / DAY;
    now = SD.state.save.typedDue[k].due + 1; T.mark(t, 1); out.missed = (SD.state.save.typedDue[k].due - now) / DAY;
    T.mark(t, 0); out.early = SD.state.save.typedDue[k].n === 0;   // typed again before it's due: no step up
    // Three days before the exam (Nov 27), every term typed before then is due again, once.
    now = new Date('2026-11-20T09:00:00').getTime(); SD.state.save.typedDue[k] = { n: 3, due: now - 1 }; T.mark(t, 0);   // next: Dec 6
    now = new Date('2026-11-26T20:00:00').getTime(); out.before = !T.due(t);
    now = new Date('2026-11-27T08:00:00').getTime(); out.reset = T.due(t);
    T.mark(t, 0); out.once = !T.due(t);
    // A retake: the exam date set on the main page moves the reset with it.
    SD.state.save.examDate = '2027-01-10';
    SD.state.save.typedDue[k].due = new Date('2027-02-01').getTime();   // a long gap by then
    now = new Date('2027-01-06T20:00:00').getTime(); const pre = !T.due(t);
    now = new Date('2027-01-07T08:00:00').getTime(); out.retake = pre && T.due(t);
    SD.state.save.examDate = '2026-11-30';
    // After the exam, the doubling carries on.
    now = new Date('2026-12-02T09:00:00').getTime(); SD.state.save.typedDue[k] = { n: 3, due: now - 1 }; T.mark(t, 0);
    out.after = Math.round((SD.state.save.typedDue[k].due - now) / DAY);
    // An older save's term (typed, no schedule yet) is due a day after it was typed.
    SD.state.save.typed.olderterm = now - 2 * DAY; out.older = T.due('OlderTerm');
    Date.now = real;
    return out;
  });
  check(sr.first && sr.notYet && sr.dayOne, 'a typed term is due again a day later, not before');
  check(Math.round(sr.two) === 2 && Math.round(sr.four) === 4, 'clean recalls double the gap: 2 days, then 4');
  check(Math.round(sr.missed) === 1 && sr.early, 'a recall with a miss starts over at 1 day; typing early doesn\'t step it up');
  check(sr.before && sr.reset && sr.once, 'three days before the exam every typed term is due again, once');
  check(sr.retake, 'a retake date set on the main page moves that reset with it');
  check(sr.after === 16 && sr.older, 'after the exam the doubling carries on (a retake); an older save\'s terms join the schedule');
  const rc = await page.evaluate(async () => {
    SD.state.save.typed.bisectbatchonfunctionerror = 1; SD.state.save.typedDue = SD.state.save.typedDue || {}; SD.state.save.typedDue.bisectbatchonfunctionerror = { n: 1, due: Date.now() - 1 };
    const p = SD.typeOnce.maybe('BisectBatchOnFunctionError: true', { title: 'X' });
    await new Promise(r => setTimeout(r, 50));
    const t = document.querySelector('#panel .to-say').textContent + '|' + document.querySelector('.win-t, #panel h2, #panel .win-title') ? (document.querySelector('#panel').textContent) : '';
    document.querySelector('#panel [data-skip]').click(); await p;
    return t;
  });
  check(/from memory/i.test(rc) && /FROM MEMORY/.test(rc), 'a due term comes back through maybe(), from memory');
  // ---- Monster Hunt's Track on code options: the key token, typed before the options show (js/quiz.js) ----
  const tq = await page.evaluate(() => {
    const all = SD.modes.pick({ match: q => q.type === 'mc' && SD.recall.codey(q.opts), n: 9999, verifiedOnly: true, mix: 0 }).items.map(i => SD.exam.find(i.q));
    const q = all.find(q => { const t = SD.typeOnce.token(q.opts[q.a]); return t && q.opts.filter(o => o.includes(t)).length === 1 && SD.typeOnce.need(t); });
    return q ? { id: q.id, tok: SD.typeOnce.token(q.opts[q.a]), n: all.length } : null;
  });
  check(!!tq, 'the bank has code-option questions whose right option holds a token no wrong option has' + (tq ? ` (${tq.n} code-option questions; this one: ${tq.tok})` : ''));
  if (tq) {
    await page.evaluate(id => { window.__r = null; SD.quiz.ask(SD.exam.find(id), { title: 'THE HUNT', typeFirst: true, noRecord: true }).then(r => { window.__r = r; }); }, tq.id);
    await page.waitForSelector('#panel .tf-tok #tf-in');
    check(!await page.$('#panel .opt, #panel [data-i]') && /turns on one/.test(await txt('#panel .tf-tok')), 'Track on code options asks for the one token first, options hidden');
    await noHScroll('track token'); await shot('track-token');
    for (const w of ['nope', 'still-nope']) { await page.fill('#tf-in', w); await page.click('#tf-go'); }
    check(await page.getAttribute('#tf-in', 'placeholder') === tq.tok && /faintly/.test(await txt('#panel .tf-note')), 'two misses show it faintly');
    await page.fill('#tf-in', tq.tok.toUpperCase()); await page.click('#tf-go');
    await page.waitForFunction(() => !document.querySelector('#panel #tf-in'));
    check(await page.evaluate(t => SD.typeOnce.learned(t), tq.tok), 'typed, the options show and the token counts as typed in every mode');
    await page.evaluate(() => SD.ui.closePanel());
  }

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  if (fails.length) { console.log(`\n${fails.length} FAILED`); process.exit(1); }
  console.log('\nAll Type it once checks pass.');
})().catch(e => { console.error(e); process.exit(1); });
